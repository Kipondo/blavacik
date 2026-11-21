// Vytiahne z OSM podklady pre pamiatky mimo historického jadra a drobné stavby (2. dávka):
//   devin   – hradby, múry, zrúcaniny a Panenská veža hradu Devín (barrier=wall/city_wall, historic=ruins/castle)
//   hradby  – zvyšky mestských hradieb v Starom Meste (barrier=city_wall)
//   bunkre  – bunkre československého opevnenia (building=bunker, military=bunker) v okolí mesta
//   gerulata – rímsky tábor Gerulata a Dom s hypokaustom (historic=archaeological_site)
//   body    – Brána slobody, Pamätník železnej opony, Rybárska brána, Maximiliánova (Rolandova) fontána
// Výstup tools/blender/data/pamiatky-2.json (súradnice v metroch hry, x východ, z juh).
// Spustenie: cd tools/mesto && node --max-old-space-size=8000 ../blender/osm_pamiatky2.mjs
import { writeFileSync } from 'node:fs';
import { nacitajPbf } from '../mesto/pbf.mjs';
import { naMetre } from '../mesto/spolocne.mjs';

const db = await nacitajPbf('../../.cache/mesto/bratislavsky.osm.pbf');
const r1 = (v) => Math.round(v * 100) / 100;
const body = (w) => w.nd.map((n) => db.uzly.get(n)).filter(Boolean).map((u) => naMetre(u.lon, u.lat).map(r1));
const stred = (b) => [b.reduce((s, p) => s + p[0], 0) / b.length, b.reduce((s, p) => s + p[1], 0) / b.length];
const blizko = (b, [cx, cz], r) => { const [x, z] = stred(b); return Math.hypot(x - cx, z - cz) < r; };
const uzavrety = (w) => w.nd.length > 3 && w.nd[0] === w.nd.at(-1);
const out = { devin: { mury: [], zruc: [], veza: null, studna: null }, hradby: [], bunkre: [], gerulata: [], body: {} };

const DEVIN = [-9560, -3380];
for (const [id, w] of db.cesty) {
  const t = w.t;
  if (!w.nd.length) continue;
  const b = body(w);
  if (b.length < 2) continue;
  // Devín: kamenné múry (aj plošné – area=yes), mestský múr, zrúcaniny
  if (blizko(b, DEVIN, 320)) {
    if ((t.barrier === 'wall' || t.barrier === 'city_wall') && t.wall !== 'flood_wall') {
      if (id === '723072067') out.devin.veza = { id, body: b, nazov: t.name };
      else out.devin.mury.push({ id, body: b, plocha: t.area === 'yes' && uzavrety(w), mesto: t.barrier === 'city_wall', nazov: t.name ?? null });
    } else if ((t.historic === 'ruins' || (t.historic === 'castle' && t.ruins === 'yes')) && uzavrety(w) && id !== '722938329') {
      out.devin.zruc.push({ id, body: b, nazov: t.name ?? null, typ: t.historic, budova: !!t.building });
    } else if (t.man_made === 'water_well') out.devin.studna = { id, body: b };
  }
  // mestské hradby v Starom Meste
  if (t.barrier === 'city_wall' && b.every(([x, z]) => Math.abs(x) < 1500 && Math.abs(z) < 1500)) out.hradby.push({ id, body: b, popis: t.description ?? null });
  // bunkre (obrys) – v dosahu mapy hry
  if ((t.building === 'bunker' || t.military === 'bunker') && uzavrety(w) && b.every(([x, z]) => x > -12500 && x < 13600 && z > -14000 && z < 15700)) {
    out.bunkre.push({ id, body: b, nazov: t.name ?? null, ref: t.ref ?? null, typ: t.bunker_type ?? null, opusteny: t.abandoned === 'yes' });
  }
  // Gerulata
  if (t.historic === 'archaeological_site' && blizko(b, [3000, 9700], 400)) out.gerulata.push({ id, body: b, nazov: t.name ?? null });
  // Maximiliánova fontána
  if (id === '182847616') out.body.fontana = { id, body: b, nazov: t.name };
}
const uzol = (id) => { const u = db.uzly.get(id); return u ? { id, xz: naMetre(u.lon, u.lat).map(r1), t: u.t } : null; };
out.body.branaSlobody = uzol('340488478');
out.body.zeleznaOpona = uzol('2580238844');
out.body.rybarskaBrana = uzol('2619282603');
// bunkre bez obrysu (len bod) v Petržalke – protitankové objekty
for (const [id, u] of db.uzly) {
  if (!u.t || !(u.t.military === 'bunker' || u.t.building === 'bunker')) continue;
  const [x, z] = naMetre(u.lon, u.lat);
  if (u.t.location === 'underground' || u.t.bunker_type === 'artillery_cavern' || u.t.bunker_type === 'cable') continue;
  if (x > -12500 && x < 13600 && z > -14000 && z < 15700) out.bunkre.push({ id, bod: [r1(x), r1(z)], nazov: u.t.name ?? null, typ: u.t.bunker_type ?? null });
}
console.log('Devín múry', out.devin.mury.length, 'zrúcaniny', out.devin.zruc.length, 'veža', !!out.devin.veza,
  '| hradby', out.hradby.length, '| bunkre', out.bunkre.length, '| Gerulata', out.gerulata.length, '| body', Object.keys(out.body).join(','));
for (const z of out.devin.zruc) console.log('  zrúc.', z.id, z.nazov, z.body.length);
for (const b of out.bunkre) console.log('  bunker', b.id, b.ref ?? '', b.nazov ?? '', b.typ ?? '', b.body ? b.body.length + ' bodov' : 'bod', (b.body ? stred(b.body) : b.bod).map(Math.round).join(','));
writeFileSync('../blender/data/pamiatky-2.json', JSON.stringify(out));
