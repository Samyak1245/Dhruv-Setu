/* ==========================================================================
   VIEW: Emergency response — roll call, contacts, an incident log, and a
   standing rescue-plan checklist. Built to be usable under stress: big
   counts, one click to change a roll-call status, nothing buried in menus.
   ========================================================================== */

const SAFETY_CYCLE = ['unconfirmed', 'safe', 'missing'];

Views.emergency = function (root) {
  const station = Store.data.selectedStation;

  root.innerHTML =
    '<div class="view__head"><div>' +
      '<div class="view__kicker">EMERGENCY RESPONSE</div>' +
      '<h1>' + station + '</h1>' +
    '</div></div>' +
    '<p class="view__intro">Click a card to cycle through unconfirmed, safe, and missing. This is the fastest path to a roll call during an incident — nothing here requires a form.</p>' +

    '<div class="section-head"><h2>Roll call</h2><span class="small muted" id="rollcall-summary"></span></div>' +
    '<div id="rollcall-wrap"></div>' +

    '<div class="section-head"><h2>Active incident</h2>' +
      '<button class="btn btn--sm" id="btn-new-incident" type="button">Log new incident</button></div>' +
    '<div id="incident-wrap"></div>' +

    '<div class="section-head"><h2>Rescue plan checklist</h2></div>' +
    '<div class="panel"><ul class="checklist" id="checklist-wrap"></ul></div>' +

    '<div class="section-head"><h2>Emergency contacts</h2></div>' +
    '<div id="contacts-wrap"></div>';

  document.getElementById('btn-new-incident').addEventListener('click', openIncidentForm);

  renderRollCall(station);
  renderIncidents();
  renderChecklist();
  renderContacts(station);
};

function renderRollCall(station) {
  const wrap = document.getElementById('rollcall-wrap');
  const people = Store.data.personnel.filter(p => p.station === station && p.status !== 'departed');

  if (people.length === 0) {
    wrap.innerHTML = '<div class="empty-state"><strong>No one on the roster for ' + station + '</strong></div>';
    document.getElementById('rollcall-summary').textContent = '';
    return;
  }

  const safe = people.filter(p => p.safety === 'safe').length;
  document.getElementById('rollcall-summary').textContent = safe + ' of ' + people.length + ' confirmed safe';

  wrap.innerHTML =
    '<div class="rollcall-grid">' +
      people.map(p => (
        '<div class="rollcall-card" data-person="' + p.id + '" data-status="' + p.safety + '" role="button" tabindex="0">' +
          '<div class="rollcall-card__name">' + Ui.escapeHtml(p.name) + '</div>' +
          '<div class="rollcall-card__role">' + Ui.escapeHtml(p.role) + '</div>' +
          '<div class="rollcall-card__status">' + p.safety + '</div>' +
        '</div>'
      )).join('') +
    '</div>';

  wrap.querySelectorAll('[data-person]').forEach(card => {
    const cycle = () => {
      const person = Store.data.personnel.find(p => p.id === card.dataset.person);
      const next = SAFETY_CYCLE[(SAFETY_CYCLE.indexOf(person.safety) + 1) % SAFETY_CYCLE.length];
      person.safety = next;
      Store.save();
      renderRollCall(station);
    };
    card.addEventListener('click', cycle);
    card.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); cycle(); } });
  });
}

function renderIncidents() {
  const wrap = document.getElementById('incident-wrap');
  const active = Store.data.incidents.filter(i => !i.resolved);
  const past = Store.data.incidents.filter(i => i.resolved);

  if (Store.data.incidents.length === 0) {
    wrap.innerHTML = '<div class="empty-state"><strong>No incidents logged</strong>That\'s the goal. Use "Log new incident" the moment something starts.</div>';
    return;
  }

  const row = (i) => (
    '<div class="panel" style="margin-bottom:10px">' +
      '<div class="flex-between">' +
        '<div><strong>' + Ui.escapeHtml(i.title) + '</strong><div class="small muted mono">' + fmtDate(i.startedAt) + '</div></div>' +
        Ui.chip(i.resolved ? 'nominal' : 'critical', i.resolved ? 'Resolved' : 'Active') +
      '</div>' +
      (i.notes ? '<p style="margin-top:8px">' + Ui.escapeHtml(i.notes) + '</p>' : '') +
      (!i.resolved ? '<button class="btn btn--sm" data-resolve="' + i.id + '" type="button">Mark resolved</button>' : '') +
    '</div>'
  );

  wrap.innerHTML = active.map(row).join('') + past.map(row).join('');

  wrap.querySelectorAll('[data-resolve]').forEach(btn =>
    btn.addEventListener('click', () => {
      Store.data.incidents.find(i => i.id === btn.dataset.resolve).resolved = true;
      Store.save();
      Ui.toast('Incident marked resolved.');
      renderIncidents();
    })
  );
}

function openIncidentForm() {
  const body =
    '<form id="incident-form">' +
      field('Incident title', 'title', 'text', '', true) +
      '<div class="field" style="margin:14px 0"><label for="f-notes">Notes</label><textarea id="f-notes" name="notes" rows="3"></textarea></div>' +
      '<div class="form-actions">' +
        '<button type="submit" class="btn btn--primary">Log incident</button>' +
        '<button type="button" class="btn" id="cancel-incident">Cancel</button>' +
      '</div>' +
    '</form>';

  Ui.openModal('Log new incident', body, (modal) => {
    modal.querySelector('#cancel-incident').addEventListener('click', () => Ui.closeModal());
    modal.querySelector('#incident-form').addEventListener('submit', (ev) => {
      ev.preventDefault();
      const fd = new FormData(ev.target);
      Store.data.incidents.push({
        id: uid('inc'),
        title: fd.get('title').trim(),
        notes: fd.get('notes').trim(),
        startedAt: todayISO(),
        resolved: false
      });
      Store.save();
      Ui.closeModal();
      Ui.toast('Incident logged.');
      renderCurrentView();
    });
  });
}

function renderChecklist() {
  const wrap = document.getElementById('checklist-wrap');
  wrap.innerHTML = Store.data.checklist.map(item => (
    '<li class="' + (item.done ? 'is-done' : '') + '">' +
      '<input type="checkbox" id="chk-' + item.id + '" ' + (item.done ? 'checked' : '') + '>' +
      '<label for="chk-' + item.id + '">' + Ui.escapeHtml(item.text) + '</label>' +
    '</li>'
  )).join('');

  wrap.querySelectorAll('input[type="checkbox"]').forEach(cb =>
    cb.addEventListener('change', () => {
      const id = cb.id.replace('chk-', '');
      const item = Store.data.checklist.find(c => c.id === id);
      item.done = cb.checked;
      Store.save();
      renderChecklist();
    })
  );
}

function renderContacts(station) {
  const wrap = document.getElementById('contacts-wrap');
  const contacts = Store.data.contacts.filter(c => c.station === station || c.station === 'All');

  wrap.innerHTML =
    '<div class="panel"><div class="table-wrap"><table><thead><tr><th>Name</th><th>Role</th><th>Contact</th><th>Coverage</th></tr></thead><tbody>' +
      contacts.map(c => (
        '<tr>' +
          '<td>' + Ui.escapeHtml(c.name) + '</td>' +
          '<td>' + Ui.escapeHtml(c.role) + '</td>' +
          '<td class="mono small">' + Ui.escapeHtml(c.phone) + '</td>' +
          '<td>' + c.station + '</td>' +
        '</tr>'
      )).join('') +
    '</tbody></table></div></div>';
}
