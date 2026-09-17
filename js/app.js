/* ==========================================================================
   POLAR OPS — shell, router, shared UI helpers
   Each module file (render-*.js) registers a render function on `Views`.
   Navigating just swaps the contents of #view-root and calls that function.
   ========================================================================== */

const Views = {};

const ICONS = {
  overview: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="12" cy="12" r="9"/><path d="M12 3v3M12 18v3M3 12h3M18 12h3"/><circle cx="12" cy="12" r="2.2"/></svg>',
  planning: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="5" y="3" width="14" height="18" rx="1.5"/><path d="M9 3v2h6V3M8 10h8M8 14h8M8 18h5"/></svg>',
  cargo: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M3 8l9-4 9 4-9 4-9-4Z"/><path d="M3 8v8l9 4 9-4V8M12 12v8"/></svg>',
  inventory: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3.5" y="7" width="17" height="13" rx="1"/><path d="M3.5 11h17M8 7V5h8v2"/></svg>',
  personnel: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="9" cy="8" r="3"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6"/><circle cx="18" cy="9" r="2.3"/><path d="M15.5 20c.2-2.6 2-4.6 4.5-5"/></svg>',
  emergency: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M12 3 2 20h20L12 3Z"/><path d="M12 10v4M12 17h.01"/></svg>'
};

const NAV = [
  { id: 'overview', label: 'Overview' },
  { id: 'planning', label: 'Expedition planning' },
  { id: 'cargo', label: 'Cargo & manifest' },
  { id: 'inventory', label: 'Station inventory' },
  { id: 'personnel', label: 'Personnel' },
  { id: 'emergency', label: 'Emergency response' }
];

/* ---- small shared helpers --------------------------------------------- */

const Ui = {
  escapeHtml(str) {
    return String(str ?? '').replace(/[&<>"']/g, (c) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
  },

  toast(message, isError) {
    const region = document.getElementById('toast-region');
    const el = document.createElement('div');
    el.className = 'toast' + (isError ? ' is-error' : '');
    el.textContent = message;
    region.appendChild(el);
    setTimeout(() => el.remove(), 3600);
  },

  openModal(title, bodyHtml, onMount) {
    this.closeModal();
    const backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop';
    backdrop.id = 'active-modal';
    backdrop.innerHTML =
      '<div class="modal">' +
        '<div class="modal__head"><h2>' + Ui.escapeHtml(title) + '</h2>' +
        '<button class="modal__close" aria-label="Close" type="button">&times;</button></div>' +
        '<div class="modal__body">' + bodyHtml + '</div>' +
      '</div>';
    backdrop.addEventListener('click', (e) => { if (e.target === backdrop) Ui.closeModal(); });
    backdrop.querySelector('.modal__close').addEventListener('click', () => Ui.closeModal());
    document.body.appendChild(backdrop);
    if (onMount) onMount(backdrop.querySelector('.modal'));
  },

  closeModal() {
    const el = document.getElementById('active-modal');
    if (el) el.remove();
  },

  statusFromMonths(monthsRemaining, monthsUntilResupply) {
    if (monthsRemaining == null || !isFinite(monthsRemaining)) return 'nominal';
    if (monthsRemaining <= monthsUntilResupply) return 'critical';
    if (monthsRemaining <= monthsUntilResupply + 1.5) return 'watch';
    return 'nominal';
  },

  chip(status, label) {
    const cls = { nominal: 'chip--nominal', watch: 'chip--watch', critical: 'chip--critical' }[status] || '';
    const pulse = status === 'critical' ? ' chip--pulse' : '';
    return '<span class="chip ' + cls + pulse + ' chip--dot">' + Ui.escapeHtml(label) + '</span>';
  }
};

/* ---- domain helpers shared across views -------------------------------- */

function monthsUntil(dateISO) {
  const days = daysBetween(todayISO(), dateISO);
  return days / 30.4;
}

function nextResupplyMonths(station) {
  const upcoming = Store.data.expeditions
    .filter(e => e.stations.includes(station) && e.arrivalDate >= todayISO())
    .sort((a, b) => a.arrivalDate.localeCompare(b.arrivalDate));
  if (upcoming.length === 0) return 11; // no scheduled resupply on file — assume a full annual cycle
  return Math.max(monthsUntil(upcoming[0].arrivalDate), 0.1);
}

function monthsRemaining(item) {
  if (!item.monthlyRate || item.monthlyRate <= 0) return Infinity;
  return item.currentStock / item.monthlyRate;
}

function inventoryStatus(item) {
  const untilResupply = nextResupplyMonths(item.station);
  const remaining = monthsRemaining(item);
  return { remaining, untilResupply, status: Ui.statusFromMonths(remaining, untilResupply) };
}

function expeditionById(id) {
  return Store.data.expeditions.find(e => e.id === id);
}

/* ---- shell rendering ---------------------------------------------------- */

function renderShell() {
  const shell = document.getElementById('app-shell');
  shell.innerHTML =
    '<nav class="sidenav">' +
      '<div class="sidenav__brand">' +
        '<span class="sidenav__brand-mark">NCPOR · OPS</span>' +
        '<span class="sidenav__brand-name">Polar Ops</span>' +
      '</div>' +
      '<ul class="sidenav__list">' +
        NAV.map(n =>
          '<li class="sidenav__item"><a href="#/' + n.id + '" data-nav="' + n.id + '">' +
            '<span class="sidenav__icon">' + ICONS[n.id] + '</span>' + n.label +
          '</a></li>'
        ).join('') +
      '</ul>' +
      '<div class="sidenav__foot">' +
        'Demo data, stored in this browser only.' +
        '<button type="button" id="btn-reset-data">Reset demo data</button>' +
      '</div>' +
    '</nav>' +
    '<div class="main-col">' +
      '<header class="topbar">' +
        '<div class="topbar__context">' +
          '<div><span class="topbar__label">Expedition&nbsp;</span>' +
            '<select id="ctx-expedition"></select></div>' +
          '<div><span class="topbar__label">Station&nbsp;</span>' +
            '<select id="ctx-station"></select></div>' +
        '</div>' +
        '<div class="topbar__clock" id="topbar-countdown"></div>' +
      '</header>' +
      '<main class="view" id="view-root"></main>' +
    '</div>' +
    '<div id="toast-region"></div>';

  document.getElementById('btn-reset-data').addEventListener('click', () => {
    if (confirm('Reset all demo data back to the seeded scenario? This cannot be undone.')) {
      Store.reset();
      Ui.toast('Demo data reset.');
      hydrateContextSelectors();
      renderCurrentView();
    }
  });

  hydrateContextSelectors();
  renderCountdown();
}

function hydrateContextSelectors() {
  const expSel = document.getElementById('ctx-expedition');
  expSel.innerHTML = Store.data.expeditions
    .map(e => '<option value="' + e.id + '">' + Ui.escapeHtml(e.name) + '</option>')
    .join('');
  expSel.value = Store.data.selectedExpeditionId;
  if (!expSel.dataset.wired) {
    expSel.addEventListener('change', () => {
      Store.data.selectedExpeditionId = expSel.value;
      Store.save();
      renderCurrentView();
    });
    expSel.dataset.wired = '1';
  }

  const stSel = document.getElementById('ctx-station');
  stSel.innerHTML = STATIONS.map(s => '<option value="' + s + '">' + s + '</option>').join('');
  stSel.value = Store.data.selectedStation;
  if (!stSel.dataset.wired) {
    stSel.addEventListener('change', () => {
      Store.data.selectedStation = stSel.value;
      Store.save();
      renderCurrentView();
    });
    stSel.dataset.wired = '1';
  }
}

function renderCountdown() {
  const el = document.getElementById('topbar-countdown');
  const upcoming = Store.data.expeditions
    .filter(e => e.goaCutoff >= todayISO())
    .sort((a, b) => a.goaCutoff.localeCompare(b.goaCutoff))[0];
  if (!upcoming) { el.textContent = 'No upcoming cargo cutoffs on file'; return; }
  const days = daysBetween(todayISO(), upcoming.goaCutoff);
  el.textContent = days + ' day' + (days === 1 ? '' : 's') + ' to Goa cargo cutoff — ' + upcoming.name;
}

/* ---- router --------------------------------------------------------- */

function currentViewId() {
  const hash = location.hash.replace('#/', '').trim();
  return NAV.some(n => n.id === hash) ? hash : 'overview';
}

function renderCurrentView() {
  const id = currentViewId();
  document.querySelectorAll('.sidenav__item a').forEach(a => {
    a.classList.toggle('is-active', a.dataset.nav === id);
  });
  const root = document.getElementById('view-root');
  root.innerHTML = '';
  renderCountdown();
  hydrateContextSelectors();
  if (Views[id]) {
    Views[id](root);
  } else {
    root.innerHTML = '<div class="empty-state">This module has not been built yet.</div>';
  }
}

window.addEventListener('hashchange', renderCurrentView);

document.addEventListener('DOMContentLoaded', () => {
  Store.load();
  if (!location.hash) location.hash = '#/overview';
  renderShell();
  renderCurrentView();
});
