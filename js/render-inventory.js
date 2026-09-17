/* ==========================================================================
   VIEW: Station inventory — current stock, consumption rate, and a
   depletion forecast measured against that station's next scheduled
   resupply. This is the "runs out before the ship comes back" check.
   ========================================================================== */

Views.inventory = function (root) {
  const station = Store.data.selectedStation;
  const untilResupply = nextResupplyMonths(station);

  root.innerHTML =
    '<div class="view__head"><div>' +
      '<div class="view__kicker">STATION INVENTORY</div>' +
      '<h1>' + station + '</h1>' +
    '</div><button class="btn btn--primary" id="btn-add-inventory" type="button">Add inventory item</button></div>' +
    '<p class="view__intro">Next scheduled resupply for ' + station + ' is in ~' + untilResupply.toFixed(1) + ' months. Anything projected to run out before then is marked critical; anything close to that line is marked to watch.</p>' +
    '<div id="inventory-table-wrap"></div>';

  document.getElementById('btn-add-inventory').addEventListener('click', () => openInventoryForm(station));
  renderInventoryTable(station);
};

function renderInventoryTable(station) {
  const wrap = document.getElementById('inventory-table-wrap');
  const items = Store.data.inventory.filter(i => i.station === station);

  if (items.length === 0) {
    wrap.innerHTML = '<div class="empty-state"><strong>No inventory on file for ' + station + '</strong>Add an item manually, or deliver cargo to this station from the Cargo &amp; manifest module.</div>';
    return;
  }

  wrap.innerHTML =
    '<div class="panel"><div class="table-wrap"><table><thead><tr>' +
      '<th>Item</th><th>Category</th><th>Stock</th><th>Monthly use</th><th>Forecast</th><th>Status</th><th>Updated</th><th></th>' +
    '</tr></thead><tbody>' +
    items.map(i => {
      const { remaining, untilResupply, status } = inventoryStatus(i);
      const rowCls = status === 'critical' ? 'row-critical' : (status === 'watch' ? 'row-watch' : '');
      const pct = isFinite(remaining) ? Math.max(0, Math.min(100, (remaining / (untilResupply * 2)) * 100)) : 100;
      const label = status === 'critical' ? 'Critical' : (status === 'watch' ? 'Watch' : 'Nominal');
      return (
        '<tr class="' + rowCls + '">' +
          '<td>' + Ui.escapeHtml(i.itemName) + '</td>' +
          '<td>' + Ui.escapeHtml(i.category) + '</td>' +
          '<td class="num">' + i.currentStock.toLocaleString('en-IN') + ' ' + Ui.escapeHtml(i.unit) + '</td>' +
          '<td class="num">' + i.monthlyRate.toLocaleString('en-IN') + ' / mo</td>' +
          '<td>' +
            '<div class="depletion">' +
              '<div class="depletion__track"><div class="depletion__fill ' + (status === 'critical' ? 'is-critical' : status === 'watch' ? 'is-watch' : '') + '" style="width:' + pct + '%"></div></div>' +
              '<span class="depletion__label">' + (isFinite(remaining) ? remaining.toFixed(1) + ' mo' : '—') + '</span>' +
            '</div>' +
          '</td>' +
          '<td>' + Ui.chip(status, label) + '</td>' +
          '<td class="small muted mono">' + fmtDate(i.lastLogged) + '</td>' +
          '<td>' +
            '<button class="btn btn--sm" data-log-usage="' + i.id + '" type="button">Log month\'s usage</button> ' +
            '<button class="btn btn--sm" data-edit-inv="' + i.id + '" type="button">Edit</button>' +
          '</td>' +
        '</tr>'
      );
    }).join('') +
    '</tbody></table></div></div>';

  wrap.querySelectorAll('[data-log-usage]').forEach(btn =>
    btn.addEventListener('click', () => {
      const item = Store.data.inventory.find(i => i.id === btn.dataset.logUsage);
      item.currentStock = Math.max(0, item.currentStock - item.monthlyRate);
      item.lastLogged = todayISO();
      Store.save();
      Ui.toast('Logged one month of usage for ' + item.itemName + '.');
      renderCurrentView();
    })
  );
  wrap.querySelectorAll('[data-edit-inv]').forEach(btn =>
    btn.addEventListener('click', () => openInventoryForm(Store.data.selectedStation, Store.data.inventory.find(i => i.id === btn.dataset.editInv)))
  );
}

function openInventoryForm(station, existing) {
  const isEdit = !!existing;
  const i = existing || {};

  const body =
    '<form id="inventory-form">' +
      '<div class="form-grid">' +
        field('Item name', 'itemName', 'text', i.itemName, true) +
        '<div class="field"><label>Category</label><select name="category">' +
          Object.entries(CATEGORY_LABEL).map(([k, v]) => '<option value="' + k + '" ' + (i.category === k ? 'selected' : '') + '>' + v + '</option>').join('') +
        '</select></div>' +
      '</div>' +
      '<div class="form-grid">' +
        field('Current stock', 'currentStock', 'number', i.currentStock, true) +
        field('Unit', 'unit', 'text', i.unit, true) +
        field('Monthly consumption rate', 'monthlyRate', 'number', i.monthlyRate, true) +
      '</div>' +
      '<div class="form-actions">' +
        '<button type="submit" class="btn btn--primary">' + (isEdit ? 'Save changes' : 'Add item') + '</button>' +
        '<button type="button" class="btn" id="cancel-inventory">Cancel</button>' +
      '</div>' +
    '</form>';

  Ui.openModal((isEdit ? 'Edit inventory — ' : 'Add inventory — ') + station, body, (modal) => {
    modal.querySelector('#cancel-inventory').addEventListener('click', () => Ui.closeModal());
    modal.querySelector('#inventory-form').addEventListener('submit', (ev) => {
      ev.preventDefault();
      const fd = new FormData(ev.target);
      const record = {
        id: isEdit ? i.id : uid('inv'),
        station,
        itemName: fd.get('itemName').trim(),
        category: fd.get('category'),
        currentStock: Number(fd.get('currentStock')),
        unit: fd.get('unit').trim(),
        monthlyRate: Number(fd.get('monthlyRate')),
        lastLogged: todayISO()
      };
      if (isEdit) {
        Store.data.inventory = Store.data.inventory.map(x => x.id === i.id ? record : x);
      } else {
        Store.data.inventory.push(record);
      }
      Store.save();
      Ui.closeModal();
      Ui.toast(isEdit ? 'Inventory item updated.' : 'Inventory item added.');
      renderCurrentView();
    });
  });
}
