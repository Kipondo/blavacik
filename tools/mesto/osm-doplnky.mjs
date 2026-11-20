// Doplní do hotových dlaždíc (data/mapa/mesto/d/*.json) údaje o budovách z OSM, ktoré sa po vygenerovaní
// dlaždíc ešte nepoužívali:
//   obchod: 1   – v budove je obchod / kaviareň / reštaurácia / banka… (OSM shop=*, amenity=…) → výklady na prízemí,
//                 ostatné budovy majú na prízemí obyčajné okná (porovnanie so skutočnosťou, docs/porovnanie/opravy.md)
//   typOsm      – OSM building=* (okrem yes), napr. church, castle, apartments (používa js/mapa/budovy/typ-budovy.js)
//   pamiatkaOsm: 1 – budova má historic=* alebo je kostol / hrad (bez obchodného prízemia, bez okeníc)
// Spustenie: cd tools/mesto && node --max-old-space-size=8000 osm-doplnky.mjs   (číta .cache/mesto/bratislavsky.osm.pbf)

import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { nacitajPbf } from './pbf.mjs';
import { CACHE, VYSTUP, naMetre } from './spolocne.mjs';

const AMENITY_OBCHOD = new Set(['cafe', 'restaurant', 'bar', 'pub', 'fast_food', 'ice_cream', 'bank', 'pharmacy',
  'bureau_de_change', 'biergarten', 'food_court', 'post_office', 'atm']);
const PAMIATKY = new Set(['church', 'cathedral', 'chapel', 'castle', 'monastery', 'basilica', 'synagogue', 'mosque', 'temple', 'shrine']);

const jeObchod = (t) => !!t && (t.shop || AMENITY_OBCHOD.has(t.amenity) || t.craft === 'bakery');

function vPolygone(x, z, body) {
  let dnu = false;
  for (let i = 0, j = body.length - 1; i < body.length; j = i++) {
    const [xi, zi] = body[i], [xj, zj] = body[j];
    if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) dnu = !dnu;
  }
  return dnu;
}

console.log('Načítavam OSM…');
const db = await nacitajPbf(join(CACHE, 'bratislavsky.osm.pbf'));
const obchody = [];      // [x, z]
const budovyOsm = [];    // [x, z, typ, pamiatka]
for (const u of db.uzly.values()) {
  if (jeObchod(u.t)) obchody.push(naMetre(u.lon, u.lat));
}
for (const w of db.cesty.values()) {
  const t = w.t;
  if (!t.building && !jeObchod(t)) continue;
  let sx = 0, sz = 0, n = 0;
  for (const id of w.nd) {
    const u = db.uzly.get(id);
    if (!u) continue;
    const [x, z] = naMetre(u.lon, u.lat);
    sx += x; sz += z; n++;
  }
  if (!n) continue;
  const stred = [sx / n, sz / n];
  if (jeObchod(t)) obchody.push(stred);
  if (t.building) {
    const pamiatka = !!t.historic || PAMIATKY.has(t.building) || t.amenity === 'place_of_worship';
    budovyOsm.push([...stred, t.building !== 'yes' ? t.building : null, pamiatka]);
  }
}
console.log(`obchodov ${obchody.length}, budov z OSM ${budovyOsm.length}`);

// mriežka 100 m na rýchle hľadanie
const mriezka = (body) => {
  const m = new Map();
  for (const b of body) {
    const k = `${Math.floor(b[0] / 100)},${Math.floor(b[1] / 100)}`;
    if (!m.has(k)) m.set(k, []);
    m.get(k).push(b);
  }
  return m;
};
const mObchody = mriezka(obchody), mBudovy = mriezka(budovyOsm);
const vOkoli = (m, minX, minZ, maxX, maxZ) => {
  const out = [];
  for (let i = Math.floor(minX / 100); i <= Math.floor(maxX / 100); i++) {
    for (let j = Math.floor(minZ / 100); j <= Math.floor(maxZ / 100); j++) out.push(...(m.get(`${i},${j}`) ?? []));
  }
  return out;
};

const dir = join(VYSTUP, 'd');
let sObchodom = 0, sTypom = 0, pamiatok = 0;
for (const subor of readdirSync(dir)) {
  if (!subor.endsWith('.json')) continue;
  const cesta = join(dir, subor);
  const d = JSON.parse(readFileSync(cesta, 'utf8'));
  let zmena = false;
  for (const b of d.budovy ?? []) {
    let minX = Infinity, minZ = Infinity, maxX = -Infinity, maxZ = -Infinity;
    for (const [x, z] of b.body) { minX = Math.min(minX, x); maxX = Math.max(maxX, x); minZ = Math.min(minZ, z); maxZ = Math.max(maxZ, z); }
    const obchod = vOkoli(mObchody, minX, minZ, maxX, maxZ).some(([x, z]) => x >= minX && x <= maxX && z >= minZ && z <= maxZ && vPolygone(x, z, b.body));
    const osm = vOkoli(mBudovy, minX, minZ, maxX, maxZ).find(([x, z]) => x >= minX && x <= maxX && z >= minZ && z <= maxZ && vPolygone(x, z, b.body));
    const pred = JSON.stringify([b.obchod, b.typOsm, b.pamiatkaOsm]);
    if (obchod) { b.obchod = 1; sObchodom++; } else delete b.obchod;
    if (osm?.[2]) { b.typOsm = osm[2]; sTypom++; }
    if (osm?.[3]) { b.pamiatkaOsm = 1; pamiatok++; } else delete b.pamiatkaOsm;
    if (JSON.stringify([b.obchod, b.typOsm, b.pamiatkaOsm]) !== pred) zmena = true;
  }
  if (zmena) writeFileSync(cesta, JSON.stringify(d));
}
console.log(`budov s obchodom ${sObchodom}, s typom z OSM ${sTypom}, pamiatok ${pamiatok}`);
