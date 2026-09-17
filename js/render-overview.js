/* ==========================================================================
   VIEW: Overview — a status board across all five modules, so a duty
   officer can see the whole picture without opening every module.
   ========================================================================== */

Views.overview = function (root) {
  const exp = expeditionById(Store.data.selectedExpeditionId) || Store.data.expeditions[0];

  const pendingCargo = Store.data.cargoItems.filter(
    c => c.expeditionId === exp.id && c.status === 'indented'
  ).length;

  const invWithStatus = Store.data.inventory.map(i => ({ ...i, ...inventoryStatus(i) }));
  const watchCount = invWithStatus.filter(i => i.status === 'watch').length;
  const criticalCount = invWithStatus.filter(i => i.status === 'critical').length;

  const atStation = Store.data.personnel.filter(p => p.status === 'at-station').length;
  const pendingClearance = Store.data.personnel.filter(p => p.medical !== 'cleared').length;

  const openIncidents = Store.data.incidents.filter(i => !i.resolved).length;
  const missingCount = Store.data.personnel.filter(p => p.safety === 'missing').length;

  const goaDays = daysBetween(todayISO(), exp.goaCutoff);
  const goaMeta = goaDays >= 0 ? goaDays + ' days remaining' : 'Cutoff has passed';

  root.innerHTML =
    '<div class="view__head"><div>' +
      '<div class="view__kicker">MISSION OVERVIEW</div>' +
      '<h1>Where things stand</h1>' +
    '</div></div>' +
    '<p class="view__intro">A cross-module snapshot for ' + Ui.escapeHtml(exp.name) + '. Switch the expedition or station at the top of the screen to change what these numbers reflect.</p>' +

    '<div class="stat-row">' +
      statCard('Cargo cutoff, Goa', fmtDate(exp.goaCutoff), goaMeta, (goaDays >= 0 && goaDays < 14) ? 'watch' : 'nominal') +
      statCard('Cargo awaiting manifest', pendingCargo, pendingCargo === 0 ? 'All items manifested' : 'Needs manifest sequencing', pendingCargo > 0 ? 'watch' : 'nominal') +
      statCard('Inventory items flagged', watchCount + criticalCount, criticalCount + ' critical · ' + watchCount + ' to watch', criticalCount > 0 ? 'critical' : (watchCount > 0 ? 'watch' : 'nominal')) +
      statCard('Personnel at stations', atStation, pendingClearance + ' pending medical clearance', pendingClearance > 0 ? 'watch' : 'nominal') +
      statCard('Open emergency incidents', openIncidents, missingCount > 0 ? missingCount + ' unaccounted for' : 'No one currently unaccounted for', (openIncidents > 0 || missingCount > 0) ? 'critical' : 'nominal') +
    '</div>' +

    '<div class="panel">' +
      '<div class="flex-between"><h2>Station status</h2><span class="small muted">Based on current inventory forecasts</span></div>' +
      '<div class="table-wrap" style="margin-top:12px">' +
      '<table><thead><tr><th>Station</th><th>Personnel</th><th>Items to watch</th><th>Items critical</th><th>Next resupply</th></tr></thead><tbody>' +
      STATIONS.map(st => {
        const items = invWithStatus.filter(i => i.station === st);
        const w = items.filter(i => i.status === 'watch').length;
        const c = items.filter(i => i.status === 'critical').length;
        const people = Store.data.personnel.filter(p => p.station === st && p.status !== 'departed').length;
        const months = nextResupplyMonths(st);
        return '<tr class="' + (c > 0 ? 'row-critical' : (w > 0 ? 'row-watch' : '')) + '">' +
          '<td>' + st + '</td>' +
          '<td class="num">' + people + '</td>' +
          '<td class="num">' + w + '</td>' +
          '<td class="num">' + c + '</td>' +
          '<td class="mono small">~' + months.toFixed(1) + ' mo</td>' +
        '</tr>';
      }).join('') +
      '</tbody></table></div>' +
    '</div>' +

    '<div class="panel">' +
      '<div class="flex-between"><h2>Upcoming expeditions</h2></div>' +
      '<ul class="timeline" style="margin-top:10px">' +
        Store.data.expeditions
          .slice()
          .sort((a, b) => a.departureDate.localeCompare(b.departureDate))
          .map(e => (
            '<li><span class="timeline__date">' + fmtDate(e.departureDate) + '</span>' +
            '<div><strong>' + Ui.escapeHtml(e.name) + '</strong><br>' +
            '<span class="small muted">' + e.stations.join(', ') + ' · Goa cutoff ' + fmtDate(e.goaCutoff) + ' · status: ' + e.status + '</span></div></li>'
          )).join('') +
      '</ul>' +
    '</div>';
};

function statCard(label, value, meta, status) {
  const cls = status === 'critical' ? ' is-critical' : (status === 'watch' ? ' is-watch' : '');
  return (
    '<div class="stat-card' + cls + '">' +
      '<div class="stat-card__label">' + Ui.escapeHtml(label) + '</div>' +
      '<div class="stat-card__value">' + Ui.escapeHtml(String(value)) + '</div>' +
      '<div class="stat-card__meta">' + Ui.escapeHtml(String(meta)) + '</div>' +
    '</div>'
  );
}
