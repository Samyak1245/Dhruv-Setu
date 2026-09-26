# DHRUV SETU — Integrated Expedition Logistics & Asset Management

A working prototype for SIH-2026 Problem Statement PS26062: a single
platform covering expedition planning, cargo tracking, station inventory,
personnel movements, and emergency response for polar research expeditions
(modelled on India's Bharati, Maitri, and Himadri stations).

## Running it

No build step, no server, no dependencies. Just open the file:

1. Unzip / copy this folder anywhere on your computer.
2. Double-click **`index.html`** — it opens in your default browser.

That's it. If your browser is unusually strict about local files, run a
tiny local server instead from inside this folder and open the printed
address:

```bash
python3 -m http.server 8000
# then open http://localhost:8000 in your browser
```

Data is stored in your browser's `localStorage`, seeded on first load with
a sample scenario (one Antarctic expedition in planning, one Arctic
resupply already delivered). Nothing leaves your machine, and nothing is
sent to a server — this is a self-contained front-end prototype. Use
**Reset demo data** at the bottom of the sidebar at any point to start
over from the seeded scenario.

## What's in each module

- **Overview** — a cross-module status board: days to the next Goa cargo
  cutoff, cargo still awaiting a manifest, inventory items flagged, and
  personnel/emergency status at a glance.
- **Expedition planning** — create and edit expeditions with their three
  fixed dates (airlift cutoff, Goa cargo cutoff, departure) and which
  stations they cover. This is the one-shot-a-year constraint the real
  problem statement calls out: nothing here assumes a mid-season reorder.
- **Cargo & manifest** — log cargo items against an expedition (category,
  weight, hazmat class, destination, offload priority), generate the
  manifest as a numbered offload sequence, and mark items arrived — which
  moves them straight into that station's inventory.
- **Station inventory** — current stock and monthly consumption rate per
  item, with a depletion forecast measured against that station's next
  scheduled resupply. Items are flagged **watch** or **critical** using
  that comparison, not an arbitrary stock threshold. "Log month's usage"
  lets you simulate consumption to watch an item cross into critical.
- **Personnel** — roster per station with rotation dates and medical
  clearance, plus a timeline of upcoming rotation changes across all
  stations.
- **Emergency response** — one-click roll call (cycle a person through
  unconfirmed → safe → missing), an incident log, a standing rescue-plan
  checklist, and station-relevant emergency contacts.

## Notes on scope

This is a hackathon-grade prototype, not production software. A few
things are deliberately simplified so the whole flow is demonstrable in
one sitting:

- All data lives in the browser (`localStorage`). A real deployment would
  need a backend, a database, and offline sync for the very limited
  connectivity at actual polar stations — the UI and data model here are
  built so that swap is straightforward (each module talks to the
  `Store` object; only `js/data.js` would need to change to talk to a
  real API instead).
- Depletion forecasting is linear (stock ÷ monthly rate) rather than
  seasonal or weather-adjusted — enough to demonstrate the "this will run
  out before the ship comes back" alert the problem statement asks for.
- QR/RFID scanning, satellite-sync, and stowage-solver optimisation are
  called out as innovation opportunities in the brief but aren't built
  here; the cargo module's offload-priority field is the hook where a
  smarter loading algorithm would plug in later.

## File structure

```
DhruvSetu/
├── index.html              Page shell, loads styles and scripts
├── css/
│   └── styles.css          Full design system (colour, type, components)
├── js/
│   ├── data.js             Seed data + localStorage persistence
│   ├── app.js               Shell, router, shared UI helpers
│   ├── render-overview.js
│   ├── render-planning.js
│   ├── render-cargo.js
│   ├── render-inventory.js
│   ├── render-personnel.js
│   └── render-emergency.js
└── README.md
```

Each `render-*.js` file owns one module and registers itself on a shared
`Views` object — to add a module, add a new file, register `Views.yourId`,
and add it to the `NAV` array in `app.js`.
