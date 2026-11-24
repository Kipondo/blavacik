// Ručné opravy budov podľa porovnania so skutočnosťou (data/mapa/opravy-budov.json, docs/porovnanie/opravy.md).
// OSM sa podľa Google neupravuje – opravy sú len v dátach hry. Budova sa nájde podľa bodu (lat, lon) vnútri pôdorysu.
//
// Položka: { "miesto": "…", "bod": [lat, lon], "nazov": "meno budovy v OSM (nepovinné)", "farba": "#…", "okenice": true, "farbaOkenic": 0–3,
//            "vikiere": true|false, "obchod": true|false, "vyska": m, "strecha": "#…", "balkony": true, "stity": true,
//            "fasada": "stare"|"obytne"|"kancelarie"|"jednoduche"|"panelak"|"dom"|"hala" (štýl fasády namiesto odhadu z typu),
//            "podlubie": { "fasada": [[lat, lon], [lat, lon]], "hlbka": m, "vyska": m },
//            "arkiere": [{ "fasada": [[lat, lon], [lat, lon]], "od": m, "do": m, "presah": m, "sklo": true, "farba": "#…" }] }
// Podlubie (#64): prízemie je ustúpené o „hlbka“ za líniu fasády (úsečka „fasada“ po líci domu), poschodia nad ním
// vyčnievajú – budova sa rozdelí na zapustené prízemie (výklady) a vyvýšenú časť od výšky „vyska“ (so spodnou
// plochou, bez kolízie – pod ňou sa dá prejsť). Arkier: predsadená časť fasády od „od“ do „do“ m nad terénom,
// vysunutá o „presah“ pred úsečku „fasada“ (sklenená alebo vo farbe).

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

const POLIA = ['farba', 'okenice', 'farbaOkenic', 'vikiere', 'obchod', 'vyska', 'strecha', 'balkony', 'stity', 'fasada'];

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

/** Budova k oprave: podľa mena (v okolí bodu), inak tá, v ktorej bod leží (najvyššia), inak najbližšia do 4 m. */
function najdi(budovy, o) {
  const [x, z] = o.xz;
  if (o.nazov) {
    const b = budovy.find((b_) => b_.nazov === o.nazov && odObrysu(x, z, b_.body) < 60);
    if (b) return b;
  }
  // bod vo viacerých budovách (vyvýšená časť nad podnožou) → tá vyššia, ktorú vidno
  let b = null;
  for (const b_ of budovy) if (bodVPolygone(x, z, b_.body) && (!b || (b_.vyska ?? 0) > (b.vyska ?? 0))) b = b_;
  if (b) return b;
  let naj = null, min = 4;
  for (const b_ of budovy) { const d = odObrysu(x, z, b_.body); if (d < min) { min = d; naj = b_; } }
  return naj;
}

/** Úsečka fasády v metroch hry: začiatok, jednotkový smer, dĺžka a normála dnu do budovy b. */
function fasada(b, body) {
  const [ax, az] = naXZ(body[0]), [bx, bz] = naXZ(body[1]);
  const L = Math.hypot(bx - ax, bz - az) || 1;
  const ux = (bx - ax) / L, uz = (bz - az) / L;
  let nx = -uz, nz = ux;
  let cx = 0, cz = 0;
  for (const [x, z] of b.body) { cx += x; cz += z; }
  cx /= b.body.length; cz /= b.body.length;
  if ((cx - ax) * nx + (cz - az) * nz < 0) { nx = -nx; nz = -nz; }
  return { ax, az, ux, uz, L, nx, nz };
}

/** Podlubie: zapustené prízemie (nová budova) a vyvýšené poschodia (pôvodná budova od výšky p.vyska). */
export function podlubie(b, p) {
  if (!p?.fasada || (b.minVyska ?? 0) > 0) return null;
  const f = fasada(b, p.fasada);
  const hlbka = p.hlbka ?? 2.5, vyska = p.vyska ?? 4.2;
  let posun = 0;
  const body = b.body.map(([x, z]) => {
    const t = (x - f.ax) * f.ux + (z - f.az) * f.uz;
    const d = (x - f.ax) * f.nx + (z - f.az) * f.nz;
    if (t < -1 || t > f.L + 1 || Math.abs(d) > 1.5) return [x, z];
    posun++;
    return [x + f.nx * (hlbka - d), z + f.nz * (hlbka - d)];
  });
  if (!posun) return null;
  const prizemie = {
    body, diery: b.diery, vyska: vyska - 0.05, farba: b.farba, typOsm: b.typOsm, obchod: true, zdrojVysky: b.zdrojVysky,
    tvarStrechy: 'plocha', podlubie: true,
  };
  b.minVyska = vyska;
  return prizemie;
}

/** Arkier: predsadená časť fasády (vyvýšená, bez kolízie). */
export function arkier(b, a) {
  if (!a?.fasada) return null;
  const f = fasada(b, a.fasada);
  const presah = a.presah ?? 0.9;
  const A = [f.ax, f.az], B = [f.ax + f.ux * f.L, f.az + f.uz * f.L];
  const von = (p) => [p[0] - f.nx * presah, p[1] - f.nz * presah];
  return {
    body: [A, B, von(B), von(A)], minVyska: a.od ?? 7, vyska: a.do ?? 20, sklo: a.sklo ?? true,
    farba: a.farba ?? (a.sklo === false ? b.farba : '#8fa3ad'), typOsm: b.typOsm, cast: 1, arkier: true,
  };
}

/** Prepíše vlastnosti budov podľa opráv (bod lat/lon, prípadne meno budovy z OSM); podlubia a arkiere pridá. */
export function aplikujOpravy(budovy = [], zoznam = []) {
  if (!zoznam.length) return;
  const nove = [];
  for (const o of zoznam) {
    const b = najdi(budovy, o);
    if (!b) continue;
    for (const k of POLIA) if (o[k] !== undefined) b[k] = o[k];
    if (o.farba) b._farbaOprava = true;
    // tvarové úpravy len pre budovu, v ktorej bod naozaj leží (nie najbližšiu v susednej dlaždici)
    if (!(o.podlubie || o.arkiere) || !bodVPolygone(o.xz[0], o.xz[1], b.body)) continue;
    const p = podlubie(b, o.podlubie);
    if (p) nove.push(p);
    for (const a of o.arkiere ?? []) {
      const x = arkier(b, a);
      if (x) nove.push(x);
    }
  }
  budovy.push(...nove);
}
