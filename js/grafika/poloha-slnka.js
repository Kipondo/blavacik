// Poloha slnka a mesiaca nad Bratislavou podľa dátumu a času (NOAA – zjednodušené vzorce, presnosť ~1°).
// Vracia jednotkový smer K slnku v súradniciach hry: x = východ, y = hore, z = juh.

const SIRKA = 48.15 * Math.PI / 180;     // zemepisná šírka Bratislavy
const DLZKA = 17.11;                       // zemepisná dĺžka (°)

/** Deklinácia a časová rovnica pre deň roka (zlomkový). */
function slnecneUdaje(datum) {
  const utc = datum.getTime();
  const zaciatok = Date.UTC(datum.getUTCFullYear(), 0, 1);
  const den = (utc - zaciatok) / 864e5;                  // 0 = 1. január 0:00 UTC
  const g = (2 * Math.PI / 365) * den;
  const dekl = 0.006918 - 0.399912 * Math.cos(g) + 0.070257 * Math.sin(g) - 0.006758 * Math.cos(2 * g)
    + 0.000907 * Math.sin(2 * g) - 0.002697 * Math.cos(3 * g) + 0.00148 * Math.sin(3 * g);
  const rovnica = 229.18 * (0.000075 + 0.001868 * Math.cos(g) - 0.032077 * Math.sin(g) - 0.014615 * Math.cos(2 * g) - 0.040849 * Math.sin(2 * g));
  const minutyUtc = datum.getUTCHours() * 60 + datum.getUTCMinutes() + datum.getUTCSeconds() / 60;
  const slnecnyCas = minutyUtc + rovnica + 4 * DLZKA;     // pravý slnečný čas v minútach
  const hodinovyUhol = (slnecnyCas / 4 - 180) * Math.PI / 180;
  return { dekl, hodinovyUhol };
}

function smer(dekl, h, ciel) {
  const vychod = -Math.cos(dekl) * Math.sin(h);
  const sever = Math.cos(SIRKA) * Math.sin(dekl) - Math.sin(SIRKA) * Math.cos(dekl) * Math.cos(h);
  const hore = Math.sin(SIRKA) * Math.sin(dekl) + Math.cos(SIRKA) * Math.cos(dekl) * Math.cos(h);
  ciel.set(vychod, hore, -sever).normalize();
  return ciel;
}

/** Smer k slnku (ciel: THREE.Vector3). Herný čas sa berie ako miestny čas hráča (Bratislava). */
export function smerSlnka(datum, ciel) {
  const { dekl, hodinovyUhol } = slnecneUdaje(datum);
  return smer(dekl, hodinovyUhol, ciel);
}

/** Mesiac – len približne: na opačnej strane oblohy ako slnko (okolo splnu), mierne posunutý. */
export function smerMesiaca(datum, ciel) {
  const { dekl, hodinovyUhol } = slnecneUdaje(datum);
  return smer(-dekl * 0.9, hodinovyUhol + Math.PI * 0.92, ciel);
}

/** Výška slnka nad obzorom v stupňoch. */
export function vyskaSlnka(smerK) {
  return Math.asin(Math.max(-1, Math.min(1, smerK.y))) * 180 / Math.PI;
}
