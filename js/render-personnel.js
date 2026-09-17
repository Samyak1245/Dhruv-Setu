/* ==========================================================================
   VIEW: Personnel — who is where, when their rotation ends, and whether
   their medical clearance is current.
   ========================================================================== */

const MEDICAL_LABEL = { cleared: 'Cleared', pending: 'Pending', expired: 'Expired' };
const MEDICAL_STATUS = { cleared: 'nominal', pending: 'watch', expired: 'critical' };
const PERSONNEL_STATUS_LABEL = { 'at-station': 'At station', 'in-transit': 'In transit', departed: 'Departed' };

Views.personnel = function (root) {
  root.innerHTML =
    '<div class="view__head"><div>' +
      '<div class="view__kicker">PERSONNEL</div>' +
      '<h1>Roster &amp; rotations</h1>' +
    '</div><button class="btn btn--primary" id="btn-add-person" type="button">Add person</button></div>' +
    '<p class="view__intro">Every station\'s current roster, with rotation dates and medical clearance. Use the station selector at the top to jump between stations.</p>' +
    '<div id="personnel-table-wrap"></div>' +
    '<div class="section-head"><h2>Upcoming rotation changes</h2></div>' +
    '<div id="rotation-timeline-wrap"></div>';

  document.getElementById('btn-add-person').addEventListener('click', () => openPersonForm(Store.data.selectedStation));
  renderPersonnelTable(Store.data.selectedStation);
  renderRotationTimeline();
};

function renderPersonnelTable(station) {
  const wrap = document.getElementById('personnel-table-wrap');
  const people = Store.data.personnel.filter(p => p.station === station);

  if (people.length === 0) {
    wrap.innerHTML = '<div class="empty-state"><strong>No one on file for ' + station + '</strong>Add a person to build out the roster.</div>';
    return;
  }

  wrap.innerHTML =
    '<div class="panel"><div class="table-wrap"><table><thead><tr>' +
      '<th>Name</th><th>Role</th><th>Rotation</th><th>Medical</th><th>Status</th><th></th>' +
    '</tr></thead><tbody>' +
    people.map(p => (
      '<tr class="' + (p.medical === 'expired' ? 'row-critical' : p.medical === 'pending' ? 'row-watch' : '') + '">' +
        '<td>' + Ui.escapeHtml(p.name) + '</td>' +
        '<td>' + Ui.escapeHtml(p.role) + '</td>' +
        '<td class="mono small">' + fmtDate(p.rotationStart) + ' – ' + fmtDate(p.rotationEnd) + '</td>' +
        '<td>' + Ui.chip(MEDICAL_STATUS[p.medical], MEDICAL_LABEL[p.medical]) + '</td>' +
        '<td>' + PERSONNEL_STATUS_LABEL[p.status] + '</td>' +
        '<td>' +
          '<button class="btn btn--sm" data-edit-person="' + p.id + '" type="button">Edit</button> ' +
          '<button class="btn btn--sm btn--danger" data-remove-person="' + p.id + '" type="button">Remove</button>' +
        '</td>' +
      '</tr>'
    )).join('') +
    '</tbody></table></div></div>';

  wrap.querySelectorAll('[data-edit-person]').forEach(btn =>
    btn.addEventListener('click', () => openPersonForm(station, Store.data.personnel.find(p => p.id === btn.dataset.editPerson)))
  );
  wrap.querySelectorAll('[data-remove-person]').forEach(btn =>
    btn.addEventListener('click', () => {
      if (!confirm('Remove this person from the roster?')) return;
      Store.data.personnel = Store.data.personnel.filter(p => p.id !== btn.dataset.removePerson);
      Store.save();
      Ui.toast('Removed from roster.');
      renderCurrentView();
    })
  );
}

function renderRotationTimeline() {
  const wrap = document.getElementById('rotation-timeline-wrap');
  const upcoming = Store.data.personnel
    .filter(p => p.rotationEnd >= todayISO())
    .sort((a, b) => a.rotationEnd.localeCompare(b.rotationEnd))
    .slice(0, 8);

  if (upcoming.length === 0) {
    wrap.innerHTML = '<div class="empty-state"><strong>No rotation dates on file</strong></div>';
    return;
  }

  wrap.innerHTML =
    '<div class="panel"><ul class="timeline">' +
      upcoming.map(p => (
        '<li><span class="timeline__date">' + fmtDate(p.rotationEnd) + '</span>' +
        '<div><strong>' + Ui.escapeHtml(p.name) + '</strong> — ' + Ui.escapeHtml(p.role) + '<br>' +
        '<span class="small muted">' + p.station + ' · rotation ends, ' + daysBetween(todayISO(), p.rotationEnd) + ' days out</span></div></li>'
      )).join('') +
    '</ul></div>';
}

function openPersonForm(station, existing) {
  const isEdit = !!existing;
  const p = existing || {};

  const body =
    '<form id="person-form">' +
      '<div class="form-grid">' +
        field('Full name', 'name', 'text', p.name, true) +
        field('Role', 'role', 'text', p.role, true) +
      '</div>' +
      '<div class="form-grid">' +
        field('Rotation start', 'rotationStart', 'date', p.rotationStart, true) +
        field('Rotation end', 'rotationEnd', 'date', p.rotationEnd, true) +
      '</div>' +
      '<div class="form-grid">' +
        '<div class="field"><label>Medical clearance</label><select name="medical">' +
          Object.entries(MEDICAL_LABEL).map(([k, v]) => '<option value="' + k + '" ' + (p.medical === k ? 'selected' : '') + '>' + v + '</option>').join('') +
        '</select></div>' +
        '<div class="field"><label>Status</label><select name="status">' +
          Object.entries(PERSONNEL_STATUS_LABEL).map(([k, v]) => '<option value="' + k + '" ' + (p.status === k ? 'selected' : '') + '>' + v + '</option>').join('') +
        '</select></div>' +
      '</div>' +
      '<div class="form-actions">' +
        '<button type="submit" class="btn btn--primary">' + (isEdit ? 'Save changes' : 'Add to roster') + '</button>' +
        '<button type="button" class="btn" id="cancel-person">Cancel</button>' +
      '</div>' +
    '</form>';

  Ui.openModal((isEdit ? 'Edit — ' : 'Add person — ') + station, body, (modal) => {
    modal.querySelector('#cancel-person').addEventListener('click', () => Ui.closeModal());
    modal.querySelector('#person-form').addEventListener('submit', (ev) => {
      ev.preventDefault();
      const fd = new FormData(ev.target);
      const record = {
        id: isEdit ? p.id : uid('per'),
        name: fd.get('name').trim(),
        role: fd.get('role').trim(),
        station,
        rotationStart: fd.get('rotationStart'),
        rotationEnd: fd.get('rotationEnd'),
        medical: fd.get('medical'),
        status: fd.get('status'),
        safety: p.safety || 'unconfirmed'
      };
      if (isEdit) {
        Store.data.personnel = Store.data.personnel.map(x => x.id === p.id ? record : x);
      } else {
        Store.data.personnel.push(record);
      }
      Store.save();
      Ui.closeModal();
      Ui.toast(isEdit ? 'Roster entry updated.' : 'Added to roster.');
      renderCurrentView();
    });
  });
}
