// Stiahne OSM dáta oblasti hry z api.openstreetmap.org po menších dlaždiciach.
//
// Spustenie (z koreňa projektu):  node tools/osm/stiahni.mjs
// Dlaždice sa uložia do .osm-cache/ (nie je v gite). Potom spusti: node tools/osm/prevod.mjs
//
// Buď ohľaduplný – API je zdarma pre všetkých. Skript sťahuje pomaly (1 dlaždica za sekundu)
// a už stiahnuté dlaždice preskočí.

import { mkdirSync, existsSync, statSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const koren = join(dirname(fileURLToPath(import.meta.url)), '../..');
const cache = join(koren, '.osm-cache');
mkdirSync(cache, { recursive: true });

// Oblasť hry (lon/lat) – pokrýva KONFIG.HRANICE s rezervou
const OBLAST = { lon0: 17.088, lon1: 17.137, lat0: 48.129, lat1: 48.155 };
const KROK = { lon: 0.007, lat: 0.0045 };

const pockaj = (ms) => new Promise((r) => setTimeout(r, ms));

for (let lat = OBLAST.lat0; lat < OBLAST.lat1 - 1e-9; lat += KROK.lat) {
  for (let lon = OBLAST.lon0; lon < OBLAST.lon1 - 1e-9; lon += KROK.lon) {
    const subor = join(cache, `t_${lat.toFixed(4)}_${lon.toFixed(4)}.osm`);
    if (existsSync(subor) && statSync(subor).size > 500) continue;
    const bbox = [lon, lat, Math.min(lon + KROK.lon, OBLAST.lon1), Math.min(lat + KROK.lat, OBLAST.lat1)].map((v) => v.toFixed(4)).join(',');
    const url = `https://api.openstreetmap.org/api/0.6/map?bbox=${bbox}`;
    process.stdout.write(`Sťahujem ${bbox} … `);
    const r = await fetch(url, { headers: { 'User-Agent': 'BlavaCity/1.0 (hra pre srandu)' } });
    if (!r.ok) { console.log(`chyba ${r.status}`); await pockaj(5000); continue; }
    writeFileSync(subor, await r.text());
    console.log('ok');
    await pockaj(1000);
  }
}
console.log('Hotovo. Teraz spusti: node tools/osm/prevod.mjs');
