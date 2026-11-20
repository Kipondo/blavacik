// Spracuje OSM celej Bratislavy do dlaždíc 500 × 500 m pre streamovanie v hre.
//
// Vstup:  .cache/mesto/bratislavsky.osm.pbf  (node stiahni.mjs)
// Výstup: data/mapa/mesto/index.json        – zoznam dlaždíc, hranica mesta, rieky, jazerá, mosty
//         data/mapa/mesto/d/<i>_<j>.json    – obsah dlaždice (budovy, cesty, chodníky, koľaje,
//                                             pokrývka zeme, stromy, semafory, prechody, značky…)
// Dlaždica (i, j) pokrýva x ∈ [i·500, (i+1)·500), z ∈ [j·500, (j+1)·500) v metroch od Hlavného námestia.
//
// Spustenie: cd tools/mesto && node --max-old-space-size=8000 dlazdice.mjs

import { readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { nacitajPbf } from './pbf.mjs';
import { zostavGeometriu, spojRetazce } from '../osm/zostav.mjs';
import { klasifikuj, zjednodus } from '../osm/klasifikuj.mjs';
import { orezCiaru, orezPolygon } from './orezanie.mjs';
import { bodVPolygone, ohranicenie, plochaPolygonu, stredBodov } from '../../js/mapa/geometria.js';
import { CACHE, VYSTUP, KOREN, STRED, DLAZDICA } from './spolocne.mjs';

const ID_MESTA = '1702499';          // relácia hranice mesta Bratislava v OSM
const MAX_STROMOV_NA_DLAZDICU = 1800;
const r1 = (v) => Math.round(v * 10) / 10;

console.time('spolu');
console.log('Čítam OSM …');
const db = await nacitajPbf(join(CACHE, 'bratislavsky.osm.pbf'));
console.log(`  ${db.uzly.size} uzlov, ${db.cesty.size} ciest, ${db.relacie.size} relácií`);

// --- hranica mesta ---------------------------------------------------------
const rel = db.relacie.get(ID_MESTA);
const proj = (id) => {
  const u = db.uzly.get(id);
  return u ? [(u.lon - STRED.lon) * 111320 * Math.cos((STRED.lat * Math.PI) / 180), -(u.lat - STRED.lat) * 111132] : null;
};
const vonkajsie = rel.cleny.filter((c) => c.typ === 'way' && c.rola === 'outer' && db.cesty.has(c.ref))
  .map((c) => db.cesty.get(c.ref).nd.map(proj).filter(Boolean).map(([x, z]) => [r1(x), r1(z)]));
const hranica = spojRetazce(vonkajsie).sort((a, b) => b.length - a.length)[0];
const oh = ohranicenie(hranica);
const H = { minX: Math.floor(oh.minX) - 500, maxX: Math.ceil(oh.maxX) + 500, minZ: Math.floor(oh.minZ) - 500, maxZ: Math.ceil(oh.maxZ) + 500 };
console.log(`Hranica mesta: ${hranica.length} bodov, plocha ${(Math.abs(plochaPolygonu(hranica)) / 1e6).toFixed(0)} km²`, H);

// --- geometria a triedenie (rovnaké pravidlá ako pre centrum) ---------------
console.log('Skladám geometriu …');
const geo = zostavGeometriu(db, STRED);
db.uzly.clear(); // uvoľnenie pamäte
console.log('Triedim (budovy, cesty, pokrývka, stromy, prvky) …');
const { pamiatky, styly = [] } = JSON.parse(readFileSync(join(KOREN, 'data/mapa/pamiatky.json'), 'utf8'));
const mapa = klasifikuj(geo, { hranice: H, pamiatky, styly, seed: 20261120, riedkyLes: 160 });
console.log(`  budovy ${mapa.budovy.length}, cesty ${mapa.cesty.length}, chodníky ${mapa.chodniky.length}, stromy ${mapa.stromy.length}`);

// --- dlaždice ---------------------------------------------------------------
const kluc = (i, j) => `${i}_${j}`;
const dlazdice = new Map();
const dlazdica = (i, j) => {
  const k = kluc(i, j);
  if (!dlazdice.has(k)) {
    dlazdice.set(k, {
      i, j, budovy: [], cesty: [], chodniky: [], kolajnice: [], pokryvka: [], stromy: [], voda: [],
      prvky: { semafory: [], prechody: [], stop: [], prednost: [], lampy: [], zastavky: [], lavicky: [] },
    });
  }
  return dlazdice.get(k);
};
const indexBodu = (x, z) => [Math.floor(x / DLAZDICA), Math.floor(z / DLAZDICA)];
const rect = (i, j) => ({ minX: i * DLAZDICA, minZ: j * DLAZDICA, maxX: (i + 1) * DLAZDICA, maxZ: (j + 1) * DLAZDICA });

// ktoré dlaždice patria k mestu (stred alebo roh v hranici, + okraj jednej dlaždice)
const vMeste = new Set();
for (let i = Math.floor(H.minX / DLAZDICA); i <= Math.floor(H.maxX / DLAZDICA); i++) {
  for (let j = Math.floor(H.minZ / DLAZDICA); j <= Math.floor(H.maxZ / DLAZDICA); j++) {
    const r = rect(i, j);
    const body = [[r.minX, r.minZ], [r.maxX, r.minZ], [r.maxX, r.maxZ], [r.minX, r.maxZ], [(r.minX + r.maxX) / 2, (r.minZ + r.maxZ) / 2]];
    if (body.some(([x, z]) => bodVPolygone(x, z, hranica))) {
      for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) vMeste.add(kluc(i + a, j + b));
    }
  }
}
console.log(`Dlaždíc v meste (s okrajom): ${vMeste.size}`);

// budovy podľa ťažiska
for (const b of mapa.budovy) {
  const [cx, cz] = stredBodov(b.body);
  const [i, j] = indexBodu(cx, cz);
  if (vMeste.has(kluc(i, j))) dlazdica(i, j).budovy.push(b);
}

// čiary orezané na dlaždice
function rozdelCiary(zoznam, cielovyKluc) {
  for (const c of zoznam) {
    const o = ohranicenie(c.body);
    for (let i = Math.floor(o.minX / DLAZDICA); i <= Math.floor(o.maxX / DLAZDICA); i++) {
      for (let j = Math.floor(o.minZ / DLAZDICA); j <= Math.floor(o.maxZ / DLAZDICA); j++) {
        if (!vMeste.has(kluc(i, j))) continue;
        for (const kus of orezCiaru(c.body, rect(i, j))) {
          if (kus.length < 2) continue;
          dlazdica(i, j)[cielovyKluc].push({ ...c, body: kus.map(([x, z]) => [r1(x), r1(z)]) });
        }
      }
    }
  }
}
rozdelCiary(mapa.cesty, 'cesty');
rozdelCiary(mapa.chodniky, 'chodniky');
rozdelCiary(mapa.kolajnice, 'kolajnice');

// pokrývka zeme orezaná na dlaždice
for (const p of mapa.pokryvka) {
  const o = ohranicenie(p.body);
  for (let i = Math.floor(o.minX / DLAZDICA); i <= Math.floor(o.maxX / DLAZDICA); i++) {
    for (let j = Math.floor(o.minZ / DLAZDICA); j <= Math.floor(o.maxZ / DLAZDICA); j++) {
      if (!vMeste.has(kluc(i, j))) continue;
      const kus = orezPolygon(p.body, rect(i, j));
      if (kus.length >= 3 && Math.abs(plochaPolygonu(kus)) > 4) {
        dlazdica(i, j).pokryvka.push({ k: p.k, body: kus.map(([x, z]) => [r1(x), r1(z)]) });
      }
    }
  }
}

// body (stromy a prvky)
for (const s of mapa.stromy) {
  const [i, j] = indexBodu(s[0], s[1]);
  if (vMeste.has(kluc(i, j))) dlazdica(i, j).stromy.push(s);
}
for (const [druh, zoznam] of Object.entries(mapa.prvky)) {
  for (const p of zoznam) {
    const x = Array.isArray(p) ? p[0] : p.x, z = Array.isArray(p) ? p[1] : p.z;
    const [i, j] = indexBodu(x, z);
    if (vMeste.has(kluc(i, j))) dlazdica(i, j).prvky[druh].push(p);
  }
}

// voda: rieky a veľké jazerá sú globálne (index), malé nádrže a fontány v dlaždiciach
const vodaGlobalna = [];
for (const v of mapa.voda) {
  const plocha = Math.abs(plochaPolygonu(v.body));
  if (v.reka || plocha > 20000) { vodaGlobalna.push({ ...v, body: zjednodus(v.body, v.reka ? 1.5 : 1) }); continue; }
  const [cx, cz] = stredBodov(v.body);
  const [i, j] = indexBodu(cx, cz);
  if (vMeste.has(kluc(i, j))) dlazdica(i, j).voda.push(v);
}

// --- zápis ------------------------------------------------------------------
rmSync(join(VYSTUP, 'd'), { recursive: true, force: true });
mkdirSync(join(VYSTUP, 'd'), { recursive: true });
const zoznam = [];
let spoluBajtov = 0;
for (const d of dlazdice.values()) {
  // strop počtu stromov (lesy majú stromy aj v textúre zeme)
  if (d.stromy.length > MAX_STROMOV_NA_DLAZDICU) {
    const krok = d.stromy.length / MAX_STROMOV_NA_DLAZDICU;
    d.stromy = Array.from({ length: MAX_STROMOV_NA_DLAZDICU }, (_, k) => d.stromy[Math.floor(k * krok)]);
  }
  d.pokryvka.sort((a, b) => Math.abs(plochaPolygonu(b.body)) - Math.abs(plochaPolygonu(a.body)));
  const { i, j, ...obsah } = d;
  const json = JSON.stringify(obsah);
  writeFileSync(join(VYSTUP, 'd', `${kluc(i, j)}.json`), json);
  spoluBajtov += json.length;
  const maxVyska = d.budovy.reduce((m, b) => Math.max(m, b.vyska), 0);
  zoznam.push([i, j, d.budovy.length, Math.round(maxVyska)]);
}
const index = {
  popis: 'VYGENEROVANÉ z OpenStreetMap (tools/mesto/dlazdice.mjs) – needituj ručne.',
  licencia: '© prispievatelia OpenStreetMap, licencia ODbL (https://www.openstreetmap.org/copyright)',
  stred: STRED,
  dlazdica: DLAZDICA,
  hranice: H,
  hranica: zjednodus(hranica, 20),
  dlazdice: zoznam,            // [i, j, počet budov, max. výška]
  voda: vodaGlobalna,
  mosty: mapa.mosty,
};
writeFileSync(join(VYSTUP, 'index.json'), JSON.stringify(index));
console.log(`Hotovo: ${zoznam.length} dlaždíc, spolu ${(spoluBajtov / 1e6).toFixed(1)} MB, mosty: ${mapa.mosty.map((m) => m.nazov).join(', ')}`);
console.timeEnd('spolu');
