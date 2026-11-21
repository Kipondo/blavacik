// Doplní do hotových dlaždíc (data/mapa/mesto/d/*.json) vyvýšené časti budov z OSM, ktoré generátor
// dlaždíc vynechal: building:part s min_height > 3 m alebo building:min_level > 0 (veža hotela Kyjev nad
// podnožou, horné poschodia obchodného domu na Kamennom námestí, presklené lávky medzi budovami…).
// V dátach dostanú "minVyska" (spodok časti nad terénom, m) a "cast": 1; hra ich kreslí od minVyska
// po vyska (js/mapa/budovy/budovy.js), hráč pod nimi môže prejsť.
// Opakované spustenie najprv odstráni časti z predchádzajúceho behu.
// Spustenie: cd tools/mesto && node --max-old-space-size=8000 casti-budov.mjs   (číta .cache/mesto/bratislavsky.osm.pbf)

import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { nacitajPbf } from './pbf.mjs';
import { CACHE, VYSTUP, naMetre } from './spolocne.mjs';
import { farbaBudovy } from '../osm/klasifikuj.mjs';

const DLAZDICA = 500;
const cislo = (v) => { const n = parseFloat(String(v ?? '').replace(',', '.')); return Number.isFinite(n) ? n : 0; };
const r1 = (v) => Math.round(v * 10) / 10;

function plocha(body) {
  let a = 0;
  for (let i = 0, j = body.length - 1; i < body.length; j = i++) a += (body[j][0] - body[i][0]) * (body[j][1] + body[i][1]);
  return a / 2;
}

// pamiatky majú vlastné modely (data/mapa/pamiatky.json) – ich časti nepridávame
const pamiatky = JSON.parse(readFileSync(join(VYSTUP, '..', 'pamiatky.json'), 'utf8')).pamiatky ?? [];
const vPamiatke = (x, z) => pamiatky.some((p) => p.model && Math.hypot(p.x - x, p.z - z) < (p.zaber?.kruh ?? 25) + 5);

console.log('Načítavam OSM…');
const db = await nacitajPbf(join(CACHE, 'bratislavsky.osm.pbf'));
const casti = new Map();   // kluc dlaždice → [budova]
let spolu = 0;
for (const w of db.cesty.values()) {
  const t = w.t;
  const cast = t['building:part'];
  if (!cast || cast === 'no' || cast === 'roof') continue;
  const minH = cislo(t.min_height) || cislo(t['building:min_level']) * 3.2;
  if (minH <= 3) continue;                                   // nízke časti generátor už má
  const lev = cislo(t['building:levels']);
  const h = cislo(t.height) || (lev > 0 ? (cislo(t['building:min_level']) + lev) * 3.2 + 1 : 0);
  if (h <= minH + 1) continue;
  const body = [];
  for (const id of w.nd) {
    const u = db.uzly.get(id);
    if (u) body.push(naMetre(u.lon, u.lat).map(r1));
  }
  if (body.length > 3 && body[0][0] === body.at(-1)[0] && body[0][1] === body.at(-1)[1]) body.pop();
  if (body.length < 3 || Math.abs(plocha(body)) < 12) continue;
  let sx = 0, sz = 0;
  for (const [x, z] of body) { sx += x; sz += z; }
  const cx = sx / body.length, cz = sz / body.length;
  if (vPamiatke(cx, cz)) continue;
  const b = { body, vyska: Math.round(h * 10) / 10, minVyska: Math.round(minH * 10) / 10, zdrojVysky: 'osm', cast: 1 };
  const f = farbaBudovy(t);
  if (f) b.farba = f;
  if (cast !== 'yes') b.typOsm = cast;
  if (t.name) b.nazov = t.name;
  if (/glass/i.test(t['building:material'] ?? '')) b.sklo = true;
  const kluc = `${Math.floor(cx / DLAZDICA)}_${Math.floor(cz / DLAZDICA)}`;
  if (!casti.has(kluc)) casti.set(kluc, []);
  casti.get(kluc).push(b);
  spolu++;
}
console.log(`vyvýšených častí budov: ${spolu}`);

const dir = join(VYSTUP, 'd');
let pridane = 0, dlazdic = 0;
for (const subor of readdirSync(dir)) {
  if (!subor.endsWith('.json')) continue;
  const kluc = subor.replace('.json', '');
  const cesta = join(dir, subor);
  const d = JSON.parse(readFileSync(cesta, 'utf8'));
  const povodne = d.budovy ?? [];
  const bez = povodne.filter((b) => !b.cast);
  const nove = casti.get(kluc) ?? [];
  if (bez.length === povodne.length && !nove.length) continue;
  // farba podľa budovy pod časťou (ak OSM farbu nemá), aby veža nadväzovala na podnož
  for (const b of nove) {
    if (b.farba) continue;
    const [x, z] = b.body[0];
    const pod = bez.find((o) => o.body.some(([ox, oz]) => Math.hypot(ox - x, oz - z) < 25));
    b.farba = pod?.farba ?? '#d6d0c2';
  }
  d.budovy = [...bez, ...nove];
  writeFileSync(cesta, JSON.stringify(d));
  pridane += nove.length; dlazdic++;
}
console.log(`pridané do ${dlazdic} dlaždíc: ${pridane} častí`);
