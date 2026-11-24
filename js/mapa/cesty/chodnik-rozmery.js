// Rozmery zvýšeného chodníka s obrubníkom popri mestských cestách – spoločné pre rovné chodníky (chodniky.js),
// rohy chodníkov pri križovatkách (rohy-chodnikov.js) a mapu povrchu pre chodcov a autá (povrch-modul.js).

export const SIRKA = 2.6;          // m – šírka chodníka od okraja vozovky
export const OBRUBNIK = 0.16;      // m – šírka vrchu obrubníka
export const VYSKA = 0.28;         // m nad terénom (vozovka je na +0,12)
/** Typy ciest, ktoré majú chodník s obrubníkom (mosty nie – tie majú vlastný chodník na mostovke). */
export const S_CHODNIKOM = new Set(['primary', 'secondary', 'tertiary', 'residential', 'unclassified', 'living_street',
  'primary_link', 'secondary_link', 'tertiary_link']);
export const sChodnikom = (c) => S_CHODNIKOM.has(c?.typ) && !c.most && !c.nadjazd;
