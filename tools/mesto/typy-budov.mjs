// Kontrola triedenia budov: koľko budov každého typu vyjde z dlaždíc (js/mapa/budovy/typ-budovy.js).
// Spustenie (z koreňa projektu): node tools/mesto/typy-budov.mjs [štvrť]
//   štvrť: voliteľný obdĺžnik minX,minZ,maxX,maxZ v metroch hry (napr. Petržalka: -2500,800,4000,5000)

import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { typizujBudovu } from '../../js/mapa/budovy/typ-budovy.js';
import { stredBodov } from '../../js/mapa/geometria.js';

const KOREN = join(dirname(fileURLToPath(import.meta.url)), '../..');
const D = join(KOREN, 'data/mapa/mesto/d');
const vyrez = process.argv[2]?.split(',').map(Number);

const pocty = {}, vysky = {};
let spolu = 0, zmenenaVyska = 0;
for (const f of readdirSync(D)) {
  if (!f.endsWith('.json')) continue;
  for (const b of JSON.parse(readFileSync(join(D, f), 'utf8')).budovy ?? []) {
    if (vyrez) {
      const [x, z] = stredBodov(b.body);
      if (x < vyrez[0] || z < vyrez[1] || x > vyrez[2] || z > vyrez[3]) continue;
    }
    const pred = b.vyska;
    typizujBudovu(b);
    if (b.vyska !== pred) zmenenaVyska++;
    pocty[b.typ] = (pocty[b.typ] ?? 0) + 1;
    (vysky[b.typ] ??= []).push(b.vyska);
    spolu++;
  }
}
console.log(`Budov: ${spolu}, opravená odhadnutá výška: ${zmenenaVyska}`);
for (const [t, n] of Object.entries(pocty).sort((a, b) => b[1] - a[1])) {
  const v = vysky[t].sort((a, b) => a - b);
  console.log(`${t.padEnd(12)} ${String(n).padStart(6)}  ${((100 * n) / spolu).toFixed(1).padStart(5)} %   výška medián ${v[v.length >> 1]} m`);
}
