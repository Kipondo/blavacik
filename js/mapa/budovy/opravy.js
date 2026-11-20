// Ručné opravy budov podľa porovnania so skutočnosťou (data/mapa/opravy-budov.json, docs/porovnanie/opravy.md).
// OSM sa podľa Google neupravuje – opravy sú len v dátach hry. Budova sa nájde podľa bodu (lat, lon) vnútri pôdorysu.
//
// Položka: { "miesto": "…", "bod": [lat, lon], "nazov": "meno budovy v OSM (nepovinné)", "farba": "#…", "okenice": true, "farbaOkenic": 0–3,
//            "vikiere": true|false, "obchod": true|false, "vyska": m, "strecha": "#…" }

import { bodVPolygone } from '../geometria.js';

const STRED = { lat: 48.1435, lon: 17.1077 };
const KX = 111320 * Math.cos((STRED.lat * Math.PI) / 180), KZ = 111132;
const naXZ = ([lat, lon]) => [(lon - STRED.lon) * KX, -(lat - STRED.lat) * KZ];

let opravy = null;

/** Načíta opravy (raz). */
export function nacitajOpravyBudov() {
  if (!opravy) {
    opravy = fetch('data/mapa/opravy-budov.json')
      .then((r) => (r.ok ? r.json() : { budovy: [] }))
      .then((j) => (j.budovy ?? []).map((o) => ({ ...o, xz: naXZ(o.bod) })))
      .catch(() => []);
  }
  return opravy;
}

const POLIA = ['farba', 'okenice', 'farbaOkenic', 'vikiere', 'obchod', 'vyska', 'strecha', 'balkony', 'stity'];

/** Vzdialenosť bodu od obrysu budovy. */
function odObrysu(x, z, body) {
  let m = Infinity;
  for (let i = 0; i < body.length; i++) {
    const [ax, az] = body[i], [bx, bz] = body[(i + 1) % body.length];
    const dx = bx - ax, dz = bz - az, l = dx * dx + dz * dz || 1;
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / l));
    m = Math.min(m, Math.hypot(ax + dx * t - x, az + dz * t - z));
  }
  return m;
}

/** Budova k oprave: podľa mena (v okolí bodu), inak tá, v ktorej bod leží, inak najbližšia do 4 m. */
function najdi(budovy, o) {
  const [x, z] = o.xz;
  if (o.nazov) {
    const b = budovy.find((b_) => b_.nazov === o.nazov && odObrysu(x, z, b_.body) < 60);
    if (b) return b;
  }
  const b = budovy.find((b_) => bodVPolygone(x, z, b_.body));
  if (b) return b;
  let naj = null, min = 4;
  for (const b_ of budovy) { const d = odObrysu(x, z, b_.body); if (d < min) { min = d; naj = b_; } }
  return naj;
}

/** Prepíše vlastnosti budov podľa opráv (bod lat/lon, prípadne meno budovy z OSM). */
export function aplikujOpravy(budovy = [], zoznam = []) {
  if (!zoznam.length) return;
  for (const o of zoznam) {
    const b = najdi(budovy, o);
    if (!b) continue;
    for (const k of POLIA) if (o[k] !== undefined) b[k] = o[k];
    if (o.farba) b._farbaOprava = true;
  }
}
