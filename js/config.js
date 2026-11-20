// Spoločné konštanty hry. Meň len s jasným dôvodom (spomeň ho v PR).
// Súradnice sú v metroch: x = východ, z = juh (sever je -z), y = hore.
// Stred (0,0) je Hlavné námestie.

const jeDotykove = typeof window !== 'undefined' &&
  (window.matchMedia?.('(pointer: coarse)').matches || 'ontouchstart' in window);

export const KONFIG = {
  // Hranice hracej plochy
  HRANICE: { minX: -1300, maxX: 2000, minZ: -1250, maxZ: 1500 },

  // Terén
  TEREN_KROK: 4,          // rozlíšenie výškovej mriežky (m)
  TEREN_SIET: 10,         // rozlíšenie siete zeme na vykreslenie (m)
  HLADINA: -5,            // výška hladiny Dunaja (nábrežie je na 0)
  HLBKA_KORYTA: -10,      // dno koryta

  // OpenStreetMap – ak súbor existuje, použije sa namiesto ručnej mapy
  // (vyrába ho tools/osm/prevod.mjs, návod v data/osm/README.md)
  OSM_SUBOR: 'data/mapa/osm.json',
  OSM_STRED: { lat: 48.1435, lon: 17.1077 }, // Hlavné námestie

  // Grafika
  JE_DOTYKOVE: jeDotykove,
  TIENE: !jeDotykove,
  MAX_PIXEL_RATIO: jeDotykove ? 1.5 : 2,
  DOHLAD: 1100,           // vzdialenosť hmly (m)
  VELKOST_CHUNKU: 400,    // budovy sa zlučujú do štvorcov tejto veľkosti

  // Auto (arkádová fyzika)
  AUTO: {
    MAX_RYCHLOST: 42,     // m/s (~150 km/h)
    MAX_SPAT: 11,
    ZRYCHLENIE: 15,
    BRZDA: 32,
    ODPOR: 0.22,
    VALIVY_ODPOR: 2.5,
    PRILNAVOST: 9,
    PRILNAVOST_RUCNA: 1.3,
    MAX_ZATOCENIE: 0.6,   // rad
    RAZVOR: 2.6,          // vzdialenosť náprav (m)
    POLOMER: 1.15,        // polomer kolíznych kruhov (auto = 2 kruhy)
    POSUN_KRUHU: 1.2,     // posun kruhov dopredu/dozadu od stredu
  },

  // Hráč pešo
  HRAC: {
    CHODZA: 2.0,          // m/s – realistická svižná chôdza (animácie Ďoďa sú na ňu nastavené)
    BEH: 6.0,
    PLAVANIE: 1.3,
    PLAVANIE_RYCHLO: 2.1,
    OTACANIE: 2.8,
    SKOK: 6.5,
    GRAVITACIA: 20,
    POLOMER: 0.45,
    DOSAH_AUTA: 4.5,      // z akej vzdialenosti sa dá nastúpiť
  },

  // Kamera
  KAMERA: {
    PESO_VZDIALENOST: 6,
    PESO_VYSKA: 2.6,
    AUTO_VZDIALENOST: 10,
    AUTO_VYSKA: 3.8,
    PLYNULOST: 6,
    NAVRAT_PO: 1.8,       // po koľkých sekundách sa kamera vráti za hráča
  },
};
