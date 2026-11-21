// Stiahne zdrojové dáta pre celú Bratislavu do .cache/mesto/ (nie sú v gite):
//   - OpenStreetMap extrakt Bratislavského kraja (openstreetmap.fr, ~40 MB)
//   - výškový model Copernicus DEM GLO-30 (ESA, otvorená licencia), 2 dlaždice
//
// Spustenie: cd tools/mesto && npm install && node stiahni.mjs

import { mkdirSync, existsSync, createWriteStream } from 'node:fs';
import { Readable } from 'node:stream';
import { finished } from 'node:stream/promises';
import { CACHE } from './spolocne.mjs';

const SUBORY = [
  ['bratislavsky.osm.pbf', 'https://download.openstreetmap.fr/extracts/europe/slovakia/bratislavsky-latest.osm.pbf'],
  ['dem_N48_E016.tif', 'https://copernicus-dem-30m.s3.amazonaws.com/Copernicus_DSM_COG_10_N48_00_E016_00_DEM/Copernicus_DSM_COG_10_N48_00_E016_00_DEM.tif'],
  ['dem_N48_E017.tif', 'https://copernicus-dem-30m.s3.amazonaws.com/Copernicus_DSM_COG_10_N48_00_E017_00_DEM/Copernicus_DSM_COG_10_N48_00_E017_00_DEM.tif'],
];

mkdirSync(CACHE, { recursive: true });
for (const [meno, url] of SUBORY) {
  const ciel = `${CACHE}/${meno}`;
  if (existsSync(ciel) && !process.argv.includes('--znova')) { console.log(`✓ ${meno} (už je stiahnutý)`); continue; }
  process.stdout.write(`Sťahujem ${meno} … `);
  const r = await fetch(url, { headers: { 'User-Agent': 'Blavacik/1.0 (hra pre srandu)' } });
  if (!r.ok) throw new Error(`${url}: ${r.status}`);
  await finished(Readable.fromWeb(r.body).pipe(createWriteStream(ciel)));
  console.log('ok');
}
console.log('Hotovo. Ďalej: node teren.mjs && node dlazdice.mjs');
