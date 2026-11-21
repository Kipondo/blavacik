// Vytiahne z OSM cesty a chodníky, ktoré vedú popod budovu (tunnel=building_passage, covered=yes/arcade),
// pre tools/mesto/priechody.py. Výstup .cache/mesto/priechody.json (súradnice v metroch hry).
// Spustenie: cd tools/mesto && node --max-old-space-size=8000 priechody-osm.mjs
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { nacitajPbf } from './pbf.mjs';
import { CACHE, naMetre } from './spolocne.mjs';

const db = await nacitajPbf(join(CACHE, 'bratislavsky.osm.pbf'));
const r2 = (v) => Math.round(v * 100) / 100;
const sirka = (t) => {
  const w = parseFloat(String(t.width ?? '').replace(',', '.'));
  if (Number.isFinite(w) && w > 0.8) return w;
  return { service: 4.0, residential: 5.0, unclassified: 4.5, pedestrian: 4.0, living_street: 4.0, footway: 3.0, path: 2.5, steps: 2.5, cycleway: 3.0 }[t.highway] ?? 3.5;
};
const out = [];
for (const [id, w] of db.cesty) {
  const t = w.t;
  if (!t.highway) continue;
  const priechod = t.tunnel === 'building_passage' || (t.covered === 'yes' && t.tunnel !== 'yes') || t.covered === 'arcade';
  if (!priechod) continue;
  const body = w.nd.map((n) => db.uzly.get(n)).filter(Boolean).map((u) => naMetre(u.lon, u.lat).map(r2));
  if (body.length < 2) continue;
  out.push({ id, typ: t.highway, sirka: sirka(t), vyska: parseFloat(t.maxheight) || null, meno: t.name ?? null, body });
}
writeFileSync(join(CACHE, 'priechody.json'), JSON.stringify(out));
console.log('priechodov', out.length);
