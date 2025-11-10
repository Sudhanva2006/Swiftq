// ===== SwiftQ+ Prototype (local SPA) =====
// Single-file behaviour: data stored in memory for demo
// Save as "app.js"

(() => {
  // --- Sample doctors (predefined) ---
  const doctors = [
    { id: 'd1', name: 'Dr. Mehtaa', dept: 'General', code: 'G', counter: 0, queue: [] },
    { id: 'd2', name: 'Dr. Sheshadri Iyer', dept: 'ENT', code: 'E', counter: 0, queue: [] },
    { id: 'd3', name: 'Dr. Varun Rao', dept: 'Pediatrics', code: 'P', counter: 0, queue: [] },
    { id: 'd4', name: 'Dr. Sonakshi Sen', dept: 'Cardiology', code: 'C', counter: 0, queue: [] },
    { id: 'd5', name: 'Dr. Farukh Samm', dept: 'Neurology', code: 'N', counter: 0, queue: [] }
  ];

  // patients storage
  let patients = []; // {id, name, dept, phone, doctorId|null, token|null, priority, status, ts}

  // simple id generator
  const uid = (p='p') => p + Math.random().toString(36).slice(2,8);

  // DOM refs
  const form = document.getElementById('patient-form');
  const pName = document.getElementById('p-name');
  const pDept = document.getElementById('p-dept');
  const pPhone = document.getElementById('p-phone');
  const pEmergency = document.getElementById('p-emergency');
  const patientInfo = document.getElementById('patient-info');

  const unassignedList = document.getElementById('unassigned-list');
  const assignPatient = document.getElementById('assign-patient');
  const assignDoctor = document.getElementById('assign-doctor');
  const assignBtn = document.getElementById('assign-btn');
  const assignEmergency = document.getElementById('assign-emergency');

  const doctorsContainer = document.getElementById('doctors-container');
  const displayCurrent = document.getElementById('display-current');
  const displayNext = document.getElementById('display-next');

  const notifs = document.getElementById('notifs');

  // ---------- Utilities ----------
  function notify(type, text, meta = {}) {
    // type: 'sms' | 'wh' | 'sys' | 'em'
    const el = document.createElement('div');
    el.className = 'notif ' + (type==='em' ? 'em' : (type==='sms'? 'sms' : (type==='wh' ? 'wh' : '')));
    el.innerText = text;
    notifs.prepend(el);
    // also console log
    console.log(`[${type.toUpperCase()}] ${text}`, meta);
  }

  function renderUnassigned() {
    unassignedList.innerHTML = '';
    const unassigned = patients.filter(p => !p.doctorId);
    if (unassigned.length === 0) {
      unassignedList.innerHTML = '<li style="color:var(--muted)">No waiting registrations</li>';
    } else {
      unassigned.forEach(p => {
        const li = document.createElement('li');
        li.innerHTML = `<div><strong>${p.name}</strong> · ${p.dept} ${p.priority==='emergency' ? ' · 🔴EM' : ''}</div>
                        <div class="meta">${new Date(p.ts).toLocaleTimeString()}</div>`;
        li.dataset.pid = p.id;
        unassignedList.appendChild(li);
      });
    }

    // update assign select
    assignPatient.innerHTML = '';
    const optEmpty = document.createElement('option'); optEmpty.value=''; optEmpty.innerText='Select patient';
    assignPatient.appendChild(optEmpty);
    unassigned.forEach(p => {
      const o = document.createElement('option');
      o.value = p.id;
      o.innerText = `${p.name} — ${p.dept}${p.priority==='emergency'?' (EM)':''}`;
      assignPatient.appendChild(o);
    });

    // update assign doctor select
    assignDoctor.innerHTML = '';
    doctors.forEach(d => {
      const o = document.createElement('option');
      o.value = d.id;
      o.innerText = `${d.name} • ${d.dept}`;
      assignDoctor.appendChild(o);
    });
  }

  function renderDoctors() {
    doctorsContainer.innerHTML = '';
    doctors.forEach(d => {
      const card = document.createElement('div');
      card.className = 'doctor-card';
      card.innerHTML = `
        <div class="doc-head">
          <div><strong>${d.name}</strong><div class="meta">${d.dept}</div></div>
          <div><small>Token: ${d.counter}</small></div>
        </div>
        <div>
          <button data-doc="${d.id}" class="call-next">Call Next</button>
          <button data-doc="${d.id}" class="simulate-em">Sim. Emergency</button>
        </div>
        <div class="queue-list" id="ql-${d.id}"></div>
      `;
      doctorsContainer.appendChild(card);

      const qlist = card.querySelector(`#ql-${d.id}`);
      if (d.queue.length === 0) {
        qlist.innerHTML = '<div style="color:var(--muted);padding:8px">No patients</div>';
      } else {
        d.queue.forEach((pid, idx) => {
          const p = patients.find(x => x.id === pid);
          if (!p) return;
          const qit = document.createElement('div');
          qit.className = 'queue-item';
          qit.innerHTML = `
            <div>
              <div><strong>${p.token}</strong> · ${p.name} ${p.priority==='emergency' ? '🔴' : ''}</div>
              <div class="meta">${p.status} · ${p.phone||'no-phone'}</div>
            </div>
            <div>
              <button data-pid="${p.id}" class="mark-em">EM</button>
              <button data-pid="${p.id}" class="remove-p">X</button>
            </div>
          `;
          qlist.appendChild(qit);
        });
      }
    });
    updateDisplayBoard();
  }

  function updateDisplayBoard() {
    // Show the doctor who is calling right now (simplified: show first doctor that has queue)
    const any = doctors.find(d => d.queue.length > 0);
    if (!any) {
      displayCurrent.innerText = 'Now Serving: —';
      displayNext.innerText = 'Up Next: —';
      return;
    }
    const currentDoctor = any;
    const curPid = currentDoctor.queue[0];
    const nextPid = currentDoctor.queue[1];

    const curP = patients.find(p => p.id === curPid);
    const nextP = patients.find(p => p.id === nextPid);

    displayCurrent.innerText = curP ? `Now Serving: ${curP.token} — ${curP.name} ( ${currentDoctor.name} )` : 'Now Serving: —';
    displayNext.innerText = nextP ? `Up Next: ${nextP.token} — ${nextP.name}` : 'Up Next: —';
  }

  // ---------- Core actions ----------
  function registerPatient(name, dept, phone, emergency) {
    const p = {
      id: uid(),
      name: name || 'Guest',
      dept,
      phone: phone || '',
      doctorId: null,
      token: null,
      priority: emergency ? 'emergency' : 'normal',
      status: 'registered',
      ts: Date.now()
    };
    patients.push(p);
    notify('sys', `New registration: ${p.name} (${p.dept})${p.priority==='emergency' ? ' [EM]' : ''}`, p);
    renderUnassigned();
    return p;
  }

  function assignPatientToDoctor(pid, did, markEmergency=false) {
    const p = patients.find(x => x.id === pid);
    const d = doctors.find(x => x.id === did);
    if (!p || !d) return;

    p.doctorId = d.id;
    if (markEmergency) p.priority = 'emergency';
    // generate token
    d.counter += 1;
    p.token = `${d.code}-${String(d.counter).padStart(2,'0')}`;
    p.status = 'waiting';

    // place into queue: emergencies go to front, else end
    if (p.priority === 'emergency') {
      d.queue.unshift(p.id);
      // notify affected patients that queue updated
      notify('em', `Emergency added: ${p.name} is prioritized for ${d.name}. Queue updated.`, {doctor:d.name});
      // inform all waiting patients (simulate)
      d.queue.slice(1).forEach(pid2 => {
        const p2 = patients.find(x => x.id === pid2);
        if (p2) sendNotification(p2, `Queue updated: ${p.name} got emergency priority. Your position may change.`);
      });
    } else {
      d.queue.push(p.id);
    }

    // send token notification
    sendNotification(p, `Token generated: ${p.token} for ${d.name} (${d.dept}).`);
    renderUnassigned();
    renderDoctors();
  }

  function markEmergency(pid) {
    const p = patients.find(x => x.id === pid);
    if (!p || !p.doctorId) return;
    const d = doctors.find(x => x.id === p.doctorId);
    if (!d) return;
    // If not already emergency, move to front
    if (p.priority !== 'emergency') {
      p.priority = 'emergency';
      // remove from queue and unshift
      d.queue = d.queue.filter(x => x !== p.id);
      d.queue.unshift(p.id);
      notify('em', `${p.name} marked emergency and moved to front of ${d.name}'s queue.`, p);
      // notify affected
      d.queue.slice(1).forEach(pid2 => {
        const p2 = patients.find(x => x.id === pid2);
        if (p2) sendNotification(p2, `Queue updated: ${p.name} got emergency priority. Your position may change.`);
      });
      renderDoctors();
    }
  }

  function doctorCallNext(did) {
    const d = doctors.find(x => x.id === did);
    if (!d) return;
    if (d.queue.length === 0) {
      notify('sys', `${d.name}: No patients to call.`);
      return;
    }
    const pid = d.queue.shift();
    const p = patients.find(x => x.id === pid);
    if (!p) return;
    p.status = 'attended';
    notify('sys', `${d.name} is attending ${p.token} — ${p.name}`, p);
    // simulate final notification
    sendNotification(p, `Please proceed. ${d.name} is ready for you. (Token ${p.token})`);
    renderDoctors();
    renderUnassigned();
  }

  function removePatientFromQueue(pid) {
    const p = patients.find(x => x.id === pid);
    if (!p) return;
    if (p.doctorId) {
      const d = doctors.find(x => x.id === p.doctorId);
      if (d) d.queue = d.queue.filter(x => x !== pid);
    }
    p.status = 'removed';
    notify('sys', `${p.name} removed from queue .`);
    renderDoctors();
    renderUnassigned();
  }

  function sendNotification(p, message) {
    // For prototype, we simulate: show in UI log; choose SMS or WhatsApp simulation based on phone length
    const via = p.phone && p.phone.length >= 6 ? (Math.random() > 0.3 ? 'wh' : 'sms') : 'sms';
    notify(via, `To ${p.name} (${p.phone||'no-phone'}): ${message}`, p);
  }

  // ---------- Event bindings ----------
  form.addEventListener('submit', (ev) => {
    ev.preventDefault();
    const name = pName.value.trim();
    const dept = pDept.value;
    const phone = pPhone.value.trim();
    const emergency = pEmergency.checked;
    const p = registerPatient(name, dept, phone, emergency);
    // show patient info immediately
    patientInfo.innerHTML = `
      <div><strong>${p.name}</strong> · ${p.dept} ${p.priority==='emergency' ? '· 🔴EM':''}</div>
      <div class="meta">Status: ${p.status}</div>
      <div style="margin-top:8px;color:var(--muted)">Wait for admin to assign a doctor & generate token.</div>
    `;
    form.reset();
  });

  assignBtn.addEventListener('click', () => {
    const pid = assignPatient.value;
    const did = assignDoctor.value;
    const em = assignEmergency.checked;
    if (!pid || !did) {
      alert('Pick a patient and a doctor to assign.');
      return;
    }
    assignPatientToDoctor(pid, did, em);
  });

  // doctor buttons (call next / emergency simulate)
  doctorsContainer.addEventListener('click', (ev) => {
    const callBtn = ev.target.closest('.call-next');
    const simEmBtn = ev.target.closest('.simulate-em');
    const markEmBtn = ev.target.closest('.mark-em');
    const removeBtn = ev.target.closest('.remove-p');

    if (callBtn) {
      doctorCallNext(callBtn.dataset.doc);
    } else if (simEmBtn) {
      // simulate new emergency walk-in assigned to that doctor
      const docId = simEmBtn.dataset.doc;
      const p = registerPatient('ER-Patient', doctors.find(d=>d.id===docId).dept, 'n/a', true);
      assignPatientToDoctor(p.id, docId, true);
    } else if (markEmBtn) {
      markEmergency(markEmBtn.dataset.pid);
    } else if (removeBtn) {
      removePatientFromQueue(removeBtn.dataset.pid);
    }
  });

  // ---------- Init render ----------
  function initUI() {
    renderUnassigned();
    // fill assign doctor select initially
    assignDoctor.innerHTML = '';
    doctors.forEach(d => {
      const o = document.createElement('option'); o.value = d.id; o.innerText = `${d.name} • ${d.dept}`;
      assignDoctor.appendChild(o);
    });

    renderDoctors();
    notify('sys', 'System initialized. Ready for demo.');
  }

  initUI();

  // Expose for testing on console (optional)
  window._swiftq = { doctors, patients, registerPatient, assignPatientToDoctor, doctorCallNext, notify };

})();
