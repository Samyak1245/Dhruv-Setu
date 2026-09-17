/* ==========================================================================
   VIEW: Expedition planning — seasonal expeditions and their key deadlines.
   ========================================================================== */

Views.planning = function (root) {
  root.innerHTML =
    '<div class="view__head"><div>' +
      '<div class="view__kicker">PLANNING</div>' +
      '<h1>Expedition planning</h1>' +
    '</div><button class="btn btn--primary" id="btn-new-expedition" type="button">Plan new expedition</button></div>' +
    '<p class="view__intro">Every expedition carries three fixed dates: the Goa cargo cutoff, the airlift cutoff, and departure. Missing the cutoff means that cargo waits for next season — there is no mid-season reorder.</p>' +
    '<div id="expedition-list"></div>';

  document.getElementById('btn-new-expedition').addEventListener('click', () => openExpeditionForm());
  renderExpeditionList();
};

function renderExpeditionList() {
  const wrap = document.getElementById('expedition-list');
  const list = Store.data.expeditions.slice().sort((a, b) => a.departureDate.localeCompare(b.departureDate));

  if (list.length === 0) {
    wrap.innerHTML = '<div class="empty-state"><strong>No expeditions planned yet</strong>Plan one to start building a cargo manifest and inventory targets against it.</div>';
    return;
  }

  wrap.innerHTML = list.map(e => {
    const daysToGoa = daysBetween(todayISO(), e.goaCutoff);
    const daysToAirlift = daysBetween(todayISO(), e.airliftCutoff);
    return (
      '<div class="panel" data-exp-id="' + e.id + '">' +
        '<div class="flex-between">' +
          '<div><h2>' + Ui.escapeHtml(e.name) + '</h2>' +
          '<div class="small muted">Season ' + Ui.escapeHtml(e.season) + ' · Stations: ' + e.stations.join(', ') + '</div></div>' +
          Ui.chip(e.status === 'delivered' ? 'nominal' : (daysToGoa < 14 && daysToGoa >= 0 ? 'watch' : 'nominal'), e.status) +
        '</div>' +
        '<div class="stat-row" style="margin:16px 0 10px">' +
          miniStat('Airlift cutoff', fmtDate(e.airliftCutoff), daysToAirlift >= 0 ? daysToAirlift + ' days left' : 'passed') +
          miniStat('Goa cargo cutoff', fmtDate(e.goaCutoff), daysToGoa >= 0 ? daysToGoa + ' days left' : 'passed') +
          miniStat('Departure', fmtDate(e.departureDate), '') +
          miniStat('Arrival on station', fmtDate(e.arrivalDate), '') +
        '</div>' +
        '<div class="form-actions">' +
          '<button class="btn btn--sm" data-edit="' + e.id + '" type="button">Edit</button>' +
          '<button class="btn btn--sm btn--danger" data-delete="' + e.id + '" type="button">Delete</button>' +
        '</div>' +
      '</div>'
    );
  }).join('');

  wrap.querySelectorAll('[data-edit]').forEach(btn =>
    btn.addEventListener('click', () => openExpeditionForm(expeditionById(btn.dataset.edit)))
  );
  wrap.querySelectorAll('[data-delete]').forEach(btn =>
    btn.addEventListener('click', () => {
      if (!confirm('Delete this expedition? Cargo items linked to it stay on file but lose their expedition context.')) return;
      Store.data.expeditions = Store.data.expeditions.filter(e => e.id !== btn.dataset.delete);
      Store.save();
      Ui.toast('Expedition deleted.');
      renderExpeditionList();
    })
  );
}

function miniStat(label, value, meta) {
  return (
    '<div class="stat-card">' +
      '<div class="stat-card__label">' + Ui.escapeHtml(label) + '</div>' +
      '<div class="stat-card__value" style="font-size:16px">' + Ui.escapeHtml(value) + '</div>' +
      '<div class="stat-card__meta">' + Ui.escapeHtml(meta) + '</div>' +
    '</div>'
  );
}

function openExpeditionForm(existing) {
  const isEdit = !!existing;
  const e = existing || { stations: [] };

  const body =
    '<form id="expedition-form">' +
      '<div class="form-grid">' +
        field('Expedition name', 'name', 'text', e.name, true) +
        field('Season (e.g. 2027–28)', 'season', 'text', e.season, true) +
      '</div>' +
      '<div class="field" style="margin-bottom:14px">' +
        '<label>Stations covered</label>' +
        '<div class="flex gap-14">' +
          STATIONS.map(s =>
            '<label class="field--check"><input type="checkbox" name="stations" value="' + s + '" ' + (e.stations.includes(s) ? 'checked' : '') + '> ' + s + '</label>'
          ).join('') +
        '</div>' +
      '</div>' +
      '<div class="form-grid">' +
        field('Airlift cutoff', 'airliftCutoff', 'date', e.airliftCutoff, true) +
        field('Goa cargo cutoff', 'goaCutoff', 'date', e.goaCutoff, true) +
        field('Departure date', 'departureDate', 'date', e.departureDate, true) +
        field('Arrival on station', 'arrivalDate', 'date', e.arrivalDate, true) +
      '</div>' +
      '<div class="field" style="margin-bottom:6px">' +
        '<label>Status</label>' +
        '<select name="status">' +
          ['planning', 'cargo-loading', 'in-transit', 'delivered'].map(s =>
            '<option value="' + s + '" ' + (e.status === s ? 'selected' : '') + '>' + s + '</option>'
          ).join('') +
        '</select>' +
      '</div>' +
      '<div class="form-actions">' +
        '<button type="submit" class="btn btn--primary">' + (isEdit ? 'Save changes' : 'Create expedition') + '</button>' +
        '<button type="button" class="btn" id="cancel-expedition">Cancel</button>' +
      '</div>' +
    '</form>';

  Ui.openModal(isEdit ? 'Edit expedition' : 'Plan new expedition', body, (modal) => {
    modal.querySelector('#cancel-expedition').addEventListener('click', () => Ui.closeModal());
    modal.querySelector('#expedition-form').addEventListener('submit', (ev) => {
      ev.preventDefault();
      const fd = new FormData(ev.target);
      const stations = fd.getAll('stations');
      if (stations.length === 0) { Ui.toast('Select at least one station.', true); return; }

      const record = {
        id: isEdit ? e.id : uid('exp'),
        name: fd.get('name').trim(),
        season: fd.get('season').trim(),
        stations,
        airliftCutoff: fd.get('airliftCutoff'),
        goaCutoff: fd.get('goaCutoff'),
        departureDate: fd.get('departureDate'),
        arrivalDate: fd.get('arrivalDate'),
        status: fd.get('status')
      };

      if (isEdit) {
        Store.data.expeditions = Store.data.expeditions.map(x => x.id === e.id ? record : x);
      } else {
        Store.data.expeditions.push(record);
        Store.data.selectedExpeditionId = record.id;
      }
      Store.save();
      Ui.closeModal();
      Ui.toast(isEdit ? 'Expedition updated.' : 'Expedition created.');
      renderCurrentView();
    });
  });
}

function field(label, name, type, value, required) {
  return (
    '<div class="field">' +
      '<label for="f-' + name + '">' + Ui.escapeHtml(label) + '</label>' +
      '<input id="f-' + name + '" name="' + name + '" type="' + type + '" value="' + Ui.escapeHtml(value || '') + '" ' + (required ? 'required' : '') + '>' +
    '</div>'
  );
}
