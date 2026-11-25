// Výška kolies vozidiel bez hráča (NPC premávka, MHD) – rovnako ako auto hráča (js/auto/auto.js): mostovka
// nadjazdu (hra.mosty – js/mapa/mosty/nadjazdy-modul.js), ak na nej vozidlo je, inak terén s povrchom ciest.
// Predtým NPC autá a autobusy brali len terén: na nadjazde išli po zemi pod mostovkou (cez cestu pod mostom)
// a pri koncoch mostov z OSM, ktoré začínajú až za oporou, zapadli do jamy pod rampou (#54).

import { bodNaOsi } from './os-mosta.js';

/**
 * x, z = bod kolesa, y = výška vozidla v predošlom snímku (null = ešte nevieme), naNadjazde = vozidlo ide po ceste,
 * ktorá leží na nadjazde (hrana siete premávky) – vtedy si mostovku nájde aj nad zemou (práve sa objavilo).
 */
export function vyskaVozidla(hra, x, z, y = null, naNadjazde = false, smer = null) {
  const zem = hra.mapa.vyska(x, z);
  const mosty = hra.mosty;
  if (!mosty) return zem;
  // vozidlo sa práve objavilo (MHD po trase z GTFS nevie, či je cesta na moste): ak ide pozdĺž veľkého mosta
  // ponad rieku nad ním, je na mostovke (pod mostom cesty mosta krížia – autobusy na nábreží pod Mostom SNP)
  if ((y === null || y === undefined) && !naNadjazde && smer) {
    const r = hra.mapa.mostovka?.(x, z);
    if (r?.m?.os && r.h - zem > 3) {
      const t = bodNaOsi(r.m.os, r.s);
      if (Math.abs(t.tx * smer[0] + t.tz * smer[1]) > 0.9) return r.h;
    }
  }
  // na mostovku sa vchádza zo zeme pri konci (rampa) a po nej sa pokračuje; spod mosta sa naň „nevyskočí“
  let m = y === null || y === undefined ? null : mosty.vyska(x, z, y);
  if ((m === null || m === undefined) && naNadjazde) {
    for (const dy of [0, 2, 4, 6, 8, 10, 12]) {
      m = mosty.vyska(x, z, zem + dy);
      if (m !== null && m !== undefined) break;
    }
    // veľký most ponad rieku vysoko nad zemou (estakáda Mosta Apollo nad nábrežím ~14 m, D4) – cesta je na moste,
    // takže mostovka platí v akejkoľvek výške (js/mapa/teren/mosty-vyskopisu.js)
    if (m === null || m === undefined) m = hra.mapa.mostovka?.(x, z)?.h ?? null;
  }
  return m ?? zem;
}
