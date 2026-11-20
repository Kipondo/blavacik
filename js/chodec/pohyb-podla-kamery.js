// Chôdza vzhľadom na kameru (PC): W = dopredu tam, kam sa pozerá kamera, S = ku kamere,
// A/D = úkrok doľava/doprava. Postava sa plynulo natočí do smeru pohybu.

const ZRYCHLENIE = 10;  // ako rýchlo sa rýchlosť priblíži k cieľovej (1/s)
const OTACANIE = 12;    // ako rýchlo sa postava natočí do smeru pohybu (1/s)

/**
 * Posunie hráča h podľa vstupu p = { x, y } (−1…1) a smeru kamery `smer` (rad, 0 = na juh).
 * Mení h.pozicia (x, z), h.uhol, h.rychlost (veľkosť rýchlosti) a h.vx / h.vz.
 */
export function pohybPodlaKamery(h, p, maxV, dt, smer) {
  // dopredu a doprava od smeru pohľadu (x = východ, z = juh)
  const fx = Math.sin(smer), fz = Math.cos(smer);
  const rx = -fz, rz = fx;
  let dx = fx * p.y + rx * p.x;
  let dz = fz * p.y + rz * p.x;
  const d = Math.hypot(dx, dz);
  if (d > 1) { dx /= d; dz /= d; }

  const k = Math.min(1, dt * ZRYCHLENIE);
  h.vx = (h.vx ?? 0) + (dx * maxV - (h.vx ?? 0)) * k;
  h.vz = (h.vz ?? 0) + (dz * maxV - (h.vz ?? 0)) * k;
  h.pozicia.x += h.vx * dt;
  h.pozicia.z += h.vz * dt;
  h.rychlost = Math.hypot(h.vx, h.vz);

  if (d > 0.05) {
    let r = Math.atan2(dx, dz) - h.uhol;
    r = Math.atan2(Math.sin(r), Math.cos(r));
    h.uhol += r * Math.min(1, dt * OTACANIE);
  }
}

/** Zastaví hráča (napr. po nastúpení do auta), aby po vystúpení „nedobiehal“. */
export function zastavPohyb(h) {
  h.vx = 0;
  h.vz = 0;
  h.rychlost = 0;
}
