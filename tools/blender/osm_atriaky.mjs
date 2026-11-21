// Vytiahne z OSM podklady pre Átriové domky (Átriaky) v Mlynskej doline:
//   bloky  – časti AD-D … AD-U (building:part, štvorcové domy okolo átrií)
//   vratnica, turniket – vstup s turniketmi (barrier=full-height_turnstile) a vrátnica (building=guardhouse)
//   ploty  – ploty a múry okolo areálu (barrier=fence/wall)
// Výstup tools/blender/data/atriaky.json (súradnice v metroch hry, x východ, z juh).
// Spustenie: cd tools/mesto && node --max-old-space-size=8000 ../blender/osm_atriaky.mjs
import { writeFileSync } from 'node:fs';
import { nacitajPbf } from '../mesto/pbf.mjs';
import { naMetre } from '../mesto/spolocne.mjs';

const db = await nacitajPbf('../../.cache/mesto/bratislavsky.osm.pbf');
const r2 = (v) => Math.round(v * 100) / 100;
const body = (w) => {
  const b = w.nd.map((n) => db.uzly.get(n)).filter(Boolean).map((u) => naMetre(u.lon, u.lat).map(r2));
  if (b.length > 3 && b[0][0] === b.at(-1)[0] && b[0][1] === b.at(-1)[1]) b.pop();
  return b;
};
const stred = (b) => [b.reduce((s, p) => s + p[0], 0) / b.length, b.reduce((s, p) => s + p[1], 0) / b.length];
const v = (b, x0, z0, x1, z1) => { const [x, z] = stred(b); return x > x0 && x < x1 && z > z0 && z < z1; };
const OBLAST = [-3030, -1980, -2790, -1760];

const out = { bloky: [], vratnica: null, turniket: null, ploty: [] };
for (const [id, w] of db.cesty) {
  const t = w.t;
  if (!w.nd.length) continue;
  if (t['building:part'] && /^AD-/.test(t.name ?? '')) { out.bloky.push({ id, meno: t.name, body: body(w), podlazia: +(t['building:levels'] ?? 4) }); continue; }
  if (id === '636100036') { out.vratnica = { id, body: body(w) }; continue; }
  if ((t.barrier === 'fence' || t.barrier === 'wall') && v(body(w), ...OBLAST)) out.ploty.push({ id, druh: t.barrier, body: body(w) });
}
const tu = db.uzly.get('183716836');
if (tu) out.turniket = naMetre(tu.lon, tu.lat).map(r2);
out.bloky.sort((a, b) => a.meno.localeCompare(b.meno));
writeFileSync('../blender/data/atriaky.json', JSON.stringify(out));
console.log('bloky', out.bloky.map((b) => b.meno).join(' '), '| vrátnica', !!out.vratnica, '| turniket', out.turniket, '| ploty', out.ploty.length);
