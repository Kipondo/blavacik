// Výška kolies vozidiel bez hráča (NPC premávka, MHD) – rovnako ako auto hráča (js/auto/auto.js): mostovka
// nadjazdu (hra.mosty – js/mapa/mosty/nadjazdy-modul.js), ak na nej vozidlo je, inak terén s povrchom ciest.
// Predtým NPC autá a autobusy brali len terén: na nadjazde išli po zemi pod mostovkou (cez cestu pod mostom)
// a pri koncoch mostov z OSM, ktoré začínajú až za oporou, zapadli do jamy pod rampou (#54).

/**
 * x, z = bod kolesa, y = výška vozidla v predošlom snímku (null = ešte nevieme), naNadjazde = vozidlo ide po ceste,
 * ktorá leží na nadjazde (hrana siete premávky) – vtedy si mostovku nájde aj nad zemou (práve sa objavilo).
 */
export function vyskaVozidla(hra, x, z, y = null, naNadjazde = false) {
  const zem = hra.mapa.vyska(x, z);
  const mosty = hra.mosty;
  if (!mosty) return zem;
  // na mostovku sa vchádza zo zeme pri konci (rampa) a po nej sa pokračuje; spod mosta sa naň „nevyskočí“
  let m = y === null || y === undefined ? null : mosty.vyska(x, z, y);
  if ((m === null || m === undefined) && naNadjazde) {
    for (const dy of [0, 2, 4, 6, 8, 10, 12]) {
      m = mosty.vyska(x, z, zem + dy);
      if (m !== null && m !== undefined) break;
    }
  }
  return m ?? zem;
}
