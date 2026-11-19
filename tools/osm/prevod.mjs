// Prevedie OSM dáta na mapu hry: data/mapa/osm.json
//
// Zdroj (jeden z nich):
//   node tools/osm/prevod.mjs                              – dlaždice z .osm-cache/ (stiahni.mjs)
//   node tools/osm/prevod.mjs data/osm/bratislava.geojson  – GeoJSON export z overpass-turbo.eu
//
// Návod na export je v data/osm/README.md.

import { readFileSync, readdirSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parsujOsm } from './parser.mjs';
import { zostavGeometriu, vytvorProjekciu } from './zostav.mjs';
import { klasifikuj } from './klasifikuj.mjs';
import { KONFIG } from '../../js/config.js';

const koren = join(dirname(fileURLToPath(import.meta.url)), '../..');
const vstup = process.argv[2];

let geo;
if (vstup && vstup.endsWith('json')) {
  console.log(`Čítam GeoJSON ${vstup} …`);
  geo = geometriaZGeojson(JSON.parse(readFileSync(join(koren, vstup), 'utf8')), KONFIG.OSM_STRED);
} else {
  const cache = vstup ?? join(koren, '.osm-cache');
  if (!existsSync(cache)) {
    console.error('Chýbajú OSM dáta. Najprv spusti: node tools/osm/stiahni.mjs');
    process.exit(1);
  }
  const db = { uzly: new Map(), cesty: new Map(), relacie: new Map() };
  const subory = readdirSync(cache).filter((f) => f.endsWith('.osm'));
  console.log(`Čítam ${subory.length} dlaždíc z ${cache} …`);
  for (const f of subory) parsujOsm(readFileSync(join(cache, f), 'utf8'), db);
  console.log(`  ${db.uzly.size} uzlov, ${db.cesty.size} ciest, ${db.relacie.size} relácií`);
  geo = zostavGeometriu(db, KONFIG.OSM_STRED);
}

const { pamiatky, styly = [] } = JSON.parse(readFileSync(join(koren, 'data/mapa/pamiatky.json'), 'utf8'));
const mapa = klasifikuj(geo, { hranice: KONFIG.HRANICE, pamiatky, styly, seed: 20261119 });

const vystup = {
  popis: 'VYGENEROVANÉ z OpenStreetMap – needituj ručne. Spusti: node tools/osm/prevod.mjs',
  licencia: '© prispievatelia OpenStreetMap, licencia ODbL (https://www.openstreetmap.org/copyright)',
  stred: KONFIG.OSM_STRED,
  ...mapa,
};
const cesta = join(koren, 'data/mapa/osm.json');
writeFileSync(cesta, JSON.stringify(vystup));
const kb = Math.round(readFileSync(cesta).length / 1024);
console.log(`Hotovo → data/mapa/osm.json (${kb} kB)`);
for (const k of ['budovy', 'cesty', 'chodniky', 'kolajnice', 'pokryvka', 'voda', 'mosty', 'stromy']) {
  console.log(`  ${k}: ${mapa[k].length}`);
}
console.log(`  prvky: ${Object.entries(mapa.prvky).map(([k, v]) => `${k} ${v.length}`).join(', ')}`);
console.log(`  mosty: ${mapa.mosty.map((m) => m.nazov).join(', ')}`);

/** GeoJSON (overpass-turbo) → rovnaká geometria ako z OSM XML */
function geometriaZGeojson(gj, stred) {
  const proj = vytvorProjekciu(stred);
  const ciary = [], polygony = [], body = [];
  for (const f of gj.features ?? []) {
    const t = f.properties ?? {};
    const g = f.geometry;
    if (!g) continue;
    const id = f.id ?? t['@id'] ?? '';
    const pre = (c) => c.map(([lon, lat]) => proj(lon, lat));
    if (g.type === 'Point') { const [x, z] = proj(...g.coordinates); body.push({ id, t, x, z }); }
    else if (g.type === 'LineString') ciary.push({ id, t, body: pre(g.coordinates) });
    else if (g.type === 'MultiLineString') for (const c of g.coordinates) ciary.push({ id, t, body: pre(c) });
    else if (g.type === 'Polygon') polygony.push({ id, t, body: pre(g.coordinates[0]).slice(0, -1) });
    else if (g.type === 'MultiPolygon') for (const p of g.coordinates) polygony.push({ id, t, body: pre(p[0]).slice(0, -1) });
  }
  return { ciary, polygony, body };
}

// graf ciest pre NPC dopravu
await import('./graf.mjs');
