/* ==========================================================================
   VIEW: Cargo & manifest — indent → manifest → delivered, for the
   expedition currently selected at the top of the screen.
   ========================================================================== */

const HAZMAT_LABEL = { none: 'None', flammable: 'Flammable', corrosive: 'Corrosive', other: 'Other' };
const CATEGORY_LABEL = { food: 'Food', fuel: 'Fuel', scientific: 'Scientific gear', medical: 'Medical', general: 'General' };
const CARGO_STATUS_LABEL = { indented: 'Indented', manifested: 'Manifested', 'in-transit': 'In transit', delivered: 'Delivered' };

Views.cargo = function (root) {
  const exp = expeditionById(Store.data.selectedExpeditionId) || Store.data.expeditions[0];

  root.innerHTML =
    '<div class="view__head"><div>' +
      '<div class="view__kicker">CARGO &amp; MANIFEST</div>' +
      '<h1>' + Ui.escapeHtml(exp ? exp.name : 'No expedition selected') + '</h1>' +
    '</div><button class="btn btn--primary" id="btn-log-cargo" type="button">Log cargo item</button></div>' +
    '<p class="view__intro">Log every item against this expedition, then generate the manifest to fix the offload sequence. When cargo actually arrives at a station, mark it delivered to move it into that station\'s inventory.</p>' +
    '<div id="cargo-table-wrap"></div>' +
    '<div class="section-head"><h2>Manifest — offload sequence</h2>' +
      '<span class="small muted">Lowest number unloads first</span></div>' +
    '<div id="manifest-wrap"></div>';

  document.getElementById('btn-log-cargo').addEventListener('click', () => openCargoForm(exp.id));
  renderCargoTable(exp.id);
  renderManifest(exp.id);
};

function renderCargoTable(expId) {
  const wrap = document.getElementById('cargo-table-wrap');
  const items = Store.data.cargoItems.filter(c => c.expeditionId === expId);

  if (items.length === 0) {
    wrap.innerHTML = '<div class="empty-state"><strong>No cargo logged for this expedition yet</strong>Log an item to start building its manifest.</div>';
    return;
  }

  wrap.innerHTML =
    '<div class="panel"><div class="table-wrap"><table><thead><tr>' +
      '<th>Item</th><th>Category</th><th>Qty</th><th>Weight</th><th>Hazmat</th><th>Destination</th><th>Status</th><th></th>' +
    '</tr></thead><tbody>' +
    items.map(c => (
      '<tr>' +
        '<td>' + Ui.escapeHtml(c.name) + '</td>' +
        '<td>' + CATEGORY_LABEL[c.category] + '</td>' +
        '<td class="num">' + c.quantity + ' ' + Ui.escapeHtml(c.unit) + '</td>' +
        '<td class="num">' + c.weightKg.toLocaleString('en-IN') + ' kg</td>' +
        '<td>' + (c.hazmat !== 'none' ? Ui.chip('watch', HAZMAT_LABEL[c.hazmat]) : '<span class="small muted">None</span>') + '</td>' +
        '<td>' + c.destination + '</td>' +
        '<td>' + cargoStatusChip(c.status) + '</td>' +
        '<td>' + cargoActions(c) + '</td>' +
      '</tr>'
    )).join('') +
    '</tbody></table></div></div>';

  wrap.querySelectorAll('[data-mark-arrived]').forEach(btn =>
    btn.addEventListener('click', () => markArrived(btn.dataset.markArrived))
  );
  wrap.querySelectorAll('[data-set-manifested]').forEach(btn =>
    btn.addEventListener('click', () => {
      const item = Store.data.cargoItems.find(c => c.id === btn.dataset.setManifested);
      item.status = 'manifested';
      Store.save();
      Ui.toast('Added to manifest.');
      renderCurrentView();
    })
  );
  wrap.querySelectorAll('[data-delete-cargo]').forEach(btn =>
    btn.addEventListener('click', () => {
      if (!confirm('Remove this cargo entry?')) return;
      Store.data.cargoItems = Store.data.cargoItems.filter(c => c.id !== btn.dataset.deleteCargo);
      Store.save();
      Ui.toast('Cargo entry removed.');
      renderCurrentView();
    })
  );
}

function cargoStatusChip(status) {
  const status2color = { indented: 'watch', manifested: 'nominal', 'in-transit': 'nominal', delivered: 'nominal' };
  return Ui.chip(status2color[status] || 'nominal', CARGO_STATUS_LABEL[status]);
}

function cargoActions(c) {
  let btns = '';
  if (c.status === 'indented') {
    btns += '<button class="btn btn--sm" data-set-manifested="' + c.id + '" type="button">Add to manifest</button> ';
  }
  if (c.status === 'manifested' || c.status === 'in-transit') {
    btns += '<button class="btn btn--sm btn--primary" data-mark-arrived="' + c.id + '" type="button">Mark arrived</button> ';
  }
  if (c.status !== 'delivered') {
    btns += '<button class="btn btn--sm btn--danger" data-delete-cargo="' + c.id + '" type="button">Remove</button>';
  }
  return btns || '<span class="small muted">In station inventory</span>';
}

function renderManifest(expId) {
  const wrap = document.getElementById('manifest-wrap');
  const items = Store.data.cargoItems
    .filter(c => c.expeditionId === expId && c.status !== 'delivered')
    .sort((a, b) => a.offloadPriority - b.offloadPriority);

  if (items.length === 0) {
    wrap.innerHTML = '<div class="empty-state"><strong>Nothing left to sequence</strong>Everything logged for this expedition has already been delivered, or nothing has been logged yet.</div>';
    return;
  }

  const totalWeight = items.reduce((s, c) => s + c.weightKg, 0);
  const hazCount = items.filter(c => c.hazmat !== 'none').length;

  wrap.innerHTML =
    '<div class="panel">' +
      '<div class="small muted" style="margin-bottom:10px">Total weight ' + totalWeight.toLocaleString('en-IN') + ' kg · ' + hazCount + ' hazmat item' + (hazCount === 1 ? '' : 's') + '</div>' +
      '<ol class="sequence-list">' +
        items.map(c => (
          '<li class="sequence-item">' +
            '<span class="sequence-item__pos">' + c.offloadPriority + '</span>' +
            '<div class="sequence-item__body">' +
              '<div class="sequence-item__title">' + Ui.escapeHtml(c.name) + '</div>' +
              '<div class="sequence-item__meta">' + c.destination + ' · ' + c.quantity + ' ' + Ui.escapeHtml(c.unit) + ' · ' + c.weightKg.toLocaleString('en-IN') + ' kg' + (c.hazmat !== 'none' ? ' · ' + HAZMAT_LABEL[c.hazmat] : '') + '</div>' +
            '</div>' +
          '</li>'
        )).join('') +
      '</ol>' +
    '</div>';
}

function markArrived(cargoId) {
  const c = Store.data.cargoItems.find(x => x.id === cargoId);
  if (!c) return;
  c.status = 'delivered';

  // fold this cargo into the destination station's inventory
  const existing = Store.data.inventory.find(
    i => i.station === c.destination && i.itemName.toLowerCase() === c.name.toLowerCase()
  );
  if (existing) {
    existing.currentStock += c.quantity;
    existing.lastLogged = todayISO();
  } else {
    Store.data.inventory.push({
      id: uid('inv'),
      station: c.destination,
      itemName: c.name,
      category: c.category,
      currentStock: c.quantity,
      unit: c.unit,
      monthlyRate: 0,
      lastLogged: todayISO()
    });
  }
  Store.save();
  Ui.toast(c.name + ' added to ' + c.destination + ' inventory.');
  renderCurrentView();
}

function openCargoForm(expId) {
  const exp = expeditionById(expId);
  const body =
    '<form id="cargo-form">' +
      '<div class="form-grid">' +
        field('Item name', 'name', 'text', '', true) +
        '<div class="field"><label>Category</label><select name="category">' +
          Object.entries(CATEGORY_LABEL).map(([k, v]) => '<option value="' + k + '">' + v + '</option>').join('') +
        '</select></div>' +
      '</div>' +
      '<div class="form-grid">' +
        field('Quantity', 'quantity', 'number', '', true) +
        field('Unit (kg, L, crates...)', 'unit', 'text', '', true) +
        field('Total weight (kg)', 'weightKg', 'number', '', true) +
        '<div class="field"><label>Hazmat class</label><select name="hazmat">' +
          Object.entries(HAZMAT_LABEL).map(([k, v]) => '<option value="' + k + '">' + v + '</option>').join('') +
        '</select></div>' +
      '</div>' +
      '<div class="form-grid">' +
        '<div class="field"><label>Destination station</label><select name="destination">' +
          exp.stations.map(s => '<option value="' + s + '">' + s + '</option>').join('') +
        '</select></div>' +
        field('Offload priority (1 = first off)', 'offloadPriority', 'number', nextPriority(expId), true) +
      '</div>' +
      '<div class="form-actions">' +
        '<button type="submit" class="btn btn--primary">Log item</button>' +
        '<button type="button" class="btn" id="cancel-cargo">Cancel</button>' +
      '</div>' +
    '</form>';

  Ui.openModal('Log cargo item — ' + exp.name, body, (modal) => {
    modal.querySelector('#cancel-cargo').addEventListener('click', () => Ui.closeModal());
    modal.querySelector('#cargo-form').addEventListener('submit', (ev) => {
      ev.preventDefault();
      const fd = new FormData(ev.target);
      Store.data.cargoItems.push({
        id: uid('cg'),
        expeditionId: expId,
        name: fd.get('name').trim(),
        category: fd.get('category'),
        quantity: Number(fd.get('quantity')),
        unit: fd.get('unit').trim(),
        weightKg: Number(fd.get('weightKg')),
        hazmat: fd.get('hazmat'),
        destination: fd.get('destination'),
        offloadPriority: Number(fd.get('offloadPriority')),
        status: 'indented'
      });
      Store.save();
      Ui.closeModal();
      Ui.toast('Cargo item logged.');
      renderCurrentView();
    });
  });
}

function nextPriority(expId) {
  const items = Store.data.cargoItems.filter(c => c.expeditionId === expId);
  return items.length ? Math.max(...items.map(c => c.offloadPriority)) + 1 : 1;
}
