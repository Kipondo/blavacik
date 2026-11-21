// Vytiahne z OSM všetko okolo Bratislavského hradu pre generátor v Blenderi (tools/blender/hrad/):
// budovy a ich časti, hradby a múry, brány, záhrady, schody a chodníky → tools/blender/data/hrad.json
// Spustenie: cd tools/mesto && node --max-old-space-size=8000 ../blender/osm_hrad.mjs
import { writeFileSync } from 'node:fs';
import { nacitajPbf } from '../mesto/pbf.mjs';
import { naMetre } from '../mesto/spolocne.mjs';

const STRED = [-563, 134], R = 330;
const db = await nacitajPbf('../../.cache/mesto/bratislavsky.osm.pbf');
const r1 = (v) => Math.round(v * 100) / 100;
const body = (w) => w.nd.map((n) => db.uzly.get(n)).filter(Boolean).map((u) => naMetre(u.lon, u.lat).map(r1));
const zaujimave = (t) => t.building || t['building:part'] || t.barrier === 'wall' || t.barrier === 'city_wall' || t.historic
  || t.leisure === 'garden' || t.leisure === 'park' || t.man_made || t.highway === 'steps' || t.highway === 'footway'
  || t.highway === 'pedestrian' || t.highway === 'path' || t.area === 'yes' || t.amenity === 'fountain' || t.natural === 'tree_row';
const out = { cesty: [], uzly: [] };
for (const [id, w] of db.cesty) {
  if (!zaujimave(w.t)) continue;
  const b = body(w);
  if (!b.length) continue;
  if (!b.some(([x, z]) => Math.hypot(x - STRED[0], z - STRED[1]) < R)) continue;
  out.cesty.push({ id, t: w.t, body: b, uzavrety: w.nd[0] === w.nd.at(-1) });
}
for (const [id, u] of db.uzly) {
  const t = u.t;
  if (!t || !(t.historic || t.natural === 'tree' || t.amenity === 'fountain' || t.tourism || t.man_made)) continue;
  const [x, z] = naMetre(u.lon, u.lat);
  if (Math.hypot(x - STRED[0], z - STRED[1]) < R) out.uzly.push({ id, t, x: r1(x), z: r1(z) });
}
writeFileSync('../blender/data/hrad.json', JSON.stringify(out));
console.log('cesty', out.cesty.length, 'uzly', out.uzly.length);
const pocty = {};
for (const c of out.cesty) { const k = c.t.building ? 'building' : c.t['building:part'] ? 'part' : c.t.barrier ? 'barrier:' + c.t.barrier : c.t.historic ? 'historic:' + c.t.historic : c.t.highway ? 'hw:' + c.t.highway : c.t.leisure ? 'leisure:' + c.t.leisure : 'iné'; pocty[k] = (pocty[k] || 0) + 1; }
console.log(pocty);
for (const c of out.cesty) if (c.t.name || c.t.historic || c.t['building:part']) console.log(c.id, c.t.name || '', c.t.building || c.t['building:part'] || '', c.t.historic || '', c.t.height || '', c.t['building:levels'] || '', c.t.barrier || '');
