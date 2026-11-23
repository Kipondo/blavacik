// Poloha prechodov pre chodcov (OSM highway=crossing) na cestách dlaždice (#136).
// Každý prechod sa priradí najbližšej ceste (do 3 m od osi): bod na osi, smer úseku a vzdialenosť od začiatku
// cesty. Zebru podľa toho stavia js/mapa/cesty/prechody.js a značenie pruhov sa pod zebrou preruší (cesty.js).
// Bez Three.js.

import { najblizsiNaUsecke } from '../geometria.js';

const B = 30;
const MAX_D2 = 9;     // m² – prechod najviac 3 m od osi cesty

/**
 * @returns {Array<{ c, x, z, dx, dz, s }>}  c = cesta, (x, z) = bod na osi, (dx, dz) = jednotkový smer úseku,
 *   s = vzdialenosť bodu od začiatku cesty po osi (m)
 */
export function polohyPrechodov(prechody, cesty) {
  if (!prechody?.length || !cesty?.length) return [];
  // mriežka úsekov ciest na rýchle hľadanie
  const mriezka = new Map();
  for (const c of cesty) {
    if (c.most || c.nadjazd || !(c.body?.length > 1)) continue;
    let s = 0;
    for (let i = 0; i < c.body.length - 1; i++) {
      const [ax, az] = c.body[i], [bx, bz] = c.body[i + 1];
      const u = { c, ax, az, bx, bz, s0: s };
      s += Math.hypot(bx - ax, bz - az);
      for (let gx = Math.floor((Math.min(ax, bx) - 3) / B); gx <= Math.floor((Math.max(ax, bx) + 3) / B); gx++) {
        for (let gz = Math.floor((Math.min(az, bz) - 3) / B); gz <= Math.floor((Math.max(az, bz) + 3) / B); gz++) {
          const k = gx * 100003 + gz;
          if (!mriezka.has(k)) mriezka.set(k, []);
          mriezka.get(k).push(u);
        }
      }
    }
  }
  const out = [];
  for (const [x, z] of prechody) {
    const kandidati = mriezka.get(Math.floor(x / B) * 100003 + Math.floor(z / B)) ?? [];
    let naj = null;
    for (const u of kandidati) {
      const n = najblizsiNaUsecke(x, z, u.ax, u.az, u.bx, u.bz);
      if (n.d2 < MAX_D2 && (!naj || n.d2 < naj.d2)) naj = { ...n, u };
    }
    if (!naj) continue;
    const { u } = naj;
    const d = Math.hypot(u.bx - u.ax, u.bz - u.az) || 1;
    out.push({ c: u.c, x: naj.x, z: naj.z, dx: (u.bx - u.ax) / d, dz: (u.bz - u.az) / d, s: u.s0 + Math.hypot(naj.x - u.ax, naj.z - u.az) });
  }
  return out;
}
