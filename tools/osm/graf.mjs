// Vyrobí graf ciest pre NPC dopravu z data/mapa/osm.json → data/mapa/graf-ciest.json
// Spustenie: node tools/osm/graf.mjs   (prevod.mjs ho spúšťa automaticky)

import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { postavGraf } from '../../js/doprava/graf-ciest.js';

const koren = join(dirname(fileURLToPath(import.meta.url)), '../..');
const osm = JSON.parse(readFileSync(join(koren, 'data/mapa/osm.json'), 'utf8'));
const graf = postavGraf(osm.cesty, osm.prvky?.semafory ?? []);
writeFileSync(join(koren, 'data/mapa/graf-ciest.json'), JSON.stringify({
  popis: 'VYGENEROVANÉ – graf ciest pre NPC dopravu (tools/osm/graf.mjs). Formát je popísaný v js/doprava/graf-ciest.js.',
  ...graf,
}));
console.log(`Graf ciest: ${graf.uzly.length} uzlov, ${graf.hrany.length} hrán, ${graf.semafory.length} uzlov so semaforom → data/mapa/graf-ciest.json`);
