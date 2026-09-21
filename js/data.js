/* ==========================================================================
   DHRUV SETU — data layer
   Everything persists to localStorage under one namespaced key. On first
   run (or after "Reset demo data") the store is seeded with a realistic
   scenario so every module has something to show.
   ========================================================================== */

const STORAGE_KEY = 'polarops_v1';

const STATIONS = ['Bharati', 'Maitri', 'Himadri'];

function uid(prefix) {
  return prefix + '_' + Math.random().toString(36).slice(2, 9);
}

function daysBetween(a, b) {
  const MS = 24 * 60 * 60 * 1000;
  return Math.round((new Date(b) - new Date(a)) / MS);
}

function fmtDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function addMonthsISO(iso, months) {
  const d = new Date(iso + 'T00:00:00');
  d.setMonth(d.getMonth() + months);
  return d.toISOString().slice(0, 10);
}

/* ---- seed scenario -------------------------------------------------- */

function buildSeed() {
  const today = todayISO();

  const expeditions = [
    {
      id: 'exp_2627',
      name: 'Antarctica Expedition 2026–27',
      season: '2026–27',
      stations: ['Bharati', 'Maitri'],
      goaCutoff: '2026-10-05',
      airliftCutoff: '2026-09-08',
      departureDate: '2026-11-02',
      arrivalDate: '2026-12-14',
      status: 'planning'
    },
    {
      id: 'exp_himadri26',
      name: 'Himadri Arctic Resupply 2026',
      season: '2026 (summer)',
      stations: ['Himadri'],
      goaCutoff: '2026-04-20',
      airliftCutoff: '2026-04-01',
      departureDate: '2026-05-10',
      arrivalDate: '2026-06-02',
      status: 'delivered'
    }
  ];

  const cargoItems = [
    { id: uid('cg'), expeditionId: 'exp_2627', name: 'Polar diesel fuel', category: 'fuel', quantity: 40000, unit: 'L', weightKg: 34000, hazmat: 'flammable', destination: 'Bharati', offloadPriority: 1, status: 'manifested' },
    { id: uid('cg'), expeditionId: 'exp_2627', name: 'Frozen ration packs', category: 'food', quantity: 2200, unit: 'kg', weightKg: 2200, hazmat: 'none', destination: 'Bharati', offloadPriority: 2, status: 'manifested' },
    { id: uid('cg'), expeditionId: 'exp_2627', name: 'Weather balloon helium cylinders', category: 'scientific', quantity: 30, unit: 'cylinders', weightKg: 1800, hazmat: 'other', destination: 'Maitri', offloadPriority: 3, status: 'indented' },
    { id: uid('cg'), expeditionId: 'exp_2627', name: 'Medical resupply kit', category: 'medical', quantity: 12, unit: 'crates', weightKg: 540, hazmat: 'none', destination: 'Bharati', offloadPriority: 4, status: 'indented' },
    { id: uid('cg'), expeditionId: 'exp_2627', name: 'Snow vehicle spare parts', category: 'general', quantity: 8, unit: 'crates', weightKg: 960, hazmat: 'none', destination: 'Maitri', offloadPriority: 5, status: 'indented' },
    { id: uid('cg'), expeditionId: 'exp_2627', name: 'Battery bank (lithium)', category: 'general', quantity: 6, unit: 'units', weightKg: 420, hazmat: 'corrosive', destination: 'Bharati', offloadPriority: 6, status: 'indented' }
  ];

  const inventory = [
    { id: uid('inv'), station: 'Bharati', itemName: 'Diesel fuel', category: 'fuel', currentStock: 9200, unit: 'L', monthlyRate: 3100, lastLogged: today },
    { id: uid('inv'), station: 'Bharati', itemName: 'Ration packs', category: 'food', currentStock: 640, unit: 'kg', monthlyRate: 210, lastLogged: today },
    { id: uid('inv'), station: 'Bharati', itemName: 'Cooking gas (LPG)', category: 'fuel', currentStock: 260, unit: 'kg', monthlyRate: 95, lastLogged: today },
    { id: uid('inv'), station: 'Maitri', itemName: 'Diesel fuel', category: 'fuel', currentStock: 5400, unit: 'L', monthlyRate: 2600, lastLogged: today },
    { id: uid('inv'), station: 'Maitri', itemName: 'Ration packs', category: 'food', currentStock: 410, unit: 'kg', monthlyRate: 190, lastLogged: today },
    { id: uid('inv'), station: 'Maitri', itemName: 'Medical oxygen cylinders', category: 'medical', currentStock: 14, unit: 'cylinders', monthlyRate: 6, lastLogged: today },
    { id: uid('inv'), station: 'Himadri', itemName: 'Diesel fuel', category: 'fuel', currentStock: 3100, unit: 'L', monthlyRate: 480, lastLogged: today },
    { id: uid('inv'), station: 'Himadri', itemName: 'Ration packs', category: 'food', currentStock: 220, unit: 'kg', monthlyRate: 60, lastLogged: today }
  ];

  const personnel = [
    { id: uid('per'), name: 'Cdr. A. Deshmukh', role: 'Station Leader', station: 'Bharati', rotationStart: '2026-01-10', rotationEnd: '2026-12-20', medical: 'cleared', status: 'at-station', safety: 'unconfirmed' },
    { id: uid('per'), name: 'Dr. R. Iyer', role: 'Atmospheric Scientist', station: 'Bharati', rotationStart: '2026-01-10', rotationEnd: '2026-11-30', medical: 'cleared', status: 'at-station', safety: 'unconfirmed' },
    { id: uid('per'), name: 'S. Bhattacharya', role: 'Communications Engineer', station: 'Bharati', rotationStart: '2026-11-02', rotationEnd: '2027-11-01', medical: 'pending', status: 'in-transit', safety: 'unconfirmed' },
    { id: uid('per'), name: 'Dr. N. Rao', role: 'Glaciologist', station: 'Maitri', rotationStart: '2026-02-01', rotationEnd: '2026-12-05', medical: 'cleared', status: 'at-station', safety: 'unconfirmed' },
    { id: uid('per'), name: 'K. Menon', role: 'Medical Officer', station: 'Maitri', rotationStart: '2026-02-01', rotationEnd: '2026-12-05', medical: 'cleared', status: 'at-station', safety: 'unconfirmed' },
    { id: uid('per'), name: 'P. Fernandes', role: 'Diesel Mechanic', station: 'Maitri', rotationStart: '2026-02-01', rotationEnd: '2026-11-20', medical: 'expired', status: 'at-station', safety: 'unconfirmed' },
    { id: uid('per'), name: 'Dr. L. Thomas', role: 'Research Lead', station: 'Himadri', rotationStart: '2026-05-10', rotationEnd: '2026-09-15', medical: 'cleared', status: 'at-station', safety: 'unconfirmed' }
  ];

  const contacts = [
    { id: uid('ct'), name: 'NCPOR Ops Control, Goa', role: 'Mission control', phone: '+91-832-2525-XXX', station: 'All' },
    { id: uid('ct'), name: 'Cdr. A. Deshmukh', role: 'Station Leader', phone: 'Sat-phone A1', station: 'Bharati' },
    { id: uid('ct'), name: 'Dr. N. Rao', role: 'Station Leader (acting)', phone: 'Sat-phone M1', station: 'Maitri' },
    { id: uid('ct'), name: 'Indian Coast Guard — Antarctic liaison', role: 'Search & rescue', phone: '+91-11-2338-XXXX', station: 'All' }
  ];

  const incidents = [];

  const checklist = [
    { id: uid('chk'), text: 'Confirm roll call for all personnel at the affected station', done: false },
    { id: uid('chk'), text: 'Establish contact with NCPOR Ops Control, Goa', done: false },
    { id: uid('chk'), text: 'Check medical clearance status of anyone involved', done: false },
    { id: uid('chk'), text: 'Verify fuel and medical inventory sufficient for extended isolation', done: false },
    { id: uid('chk'), text: 'Brief Indian Coast Guard liaison if evacuation may be required', done: false },
    { id: uid('chk'), text: 'Log incident timeline and actions taken', done: false }
  ];

  return {
    expeditions,
    cargoItems,
    inventory,
    personnel,
    contacts,
    incidents,
    checklist,
    selectedExpeditionId: 'exp_2627',
    selectedStation: 'Bharati'
  };
}

/* ---- persistence ------------------------------------------------------ */

const Store = {
  data: null,

  load() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        this.data = JSON.parse(raw);
        return this.data;
      } catch (e) {
        console.warn('Stored data was unreadable, reseeding.', e);
      }
    }
    this.data = buildSeed();
    this.save();
    return this.data;
  },

  save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
  },

  reset() {
    this.data = buildSeed();
    this.save();
  }
};
