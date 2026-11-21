// Zrážky vozidiel MHD s hráčom a autami. Vozidlá MHD idú podľa poriadku a nedajú sa odtlačiť –
// odtláča sa chodec alebo auto (článok = otočený obdĺžnik).

import { KONFIG } from '../../config.js';

const DOSAH = 30; // m – ďalej sa nekontroluje

/** Vytlačí kruh (x, z, r) z obdĺžnika článku; vráti { x, z, nx, nz } alebo null. */
function vytlacKruh(cl, x, z, r) {
  const dx = x - cl.x, dz = z - cl.z;
  // lokálne súradnice: u = pozdĺž (dopredu), w = naprieč
  const u = dx * cl.sx + dz * cl.sz;
  const w = dx * cl.sz - dz * cl.sx;
  const pu = cl.d / 2 + r - Math.abs(u), pw = cl.s / 2 + r - Math.abs(w);
  if (pu <= 0 || pw <= 0) return null;
  let nx, nz, o;
  if (pu < pw) { const z0 = Math.sign(u) || 1; nx = cl.sx * z0; nz = cl.sz * z0; o = pu; }
  else { const z0 = Math.sign(w) || 1; nx = cl.sz * z0; nz = -cl.sx * z0; o = pw; }
  return { x: x + nx * o, z: z + nz * o, nx, nz };
}

/** clanky: [{ x, z, sx, sz (smer), d (dĺžka), s (šírka) }] všetkých vozidiel v okolí. */
export function riesKolizie(hra, clanky) {
  const p = hra.stav.pozicia;
  const blizke = clanky.filter((c) => Math.abs(c.x - p.x) < DOSAH && Math.abs(c.z - p.z) < DOSAH);
  if (!blizke.length) return;

  // chodec
  const h = hra.hrac;
  if (h && !hra.stav.auto) {
    for (const c of blizke) {
      if (h.pozicia.y > c.y + 3.6) continue; // napr. na moste nad koľajou
      const r = vytlacKruh(c, h.pozicia.x, h.pozicia.z, KONFIG.HRAC.POLOMER);
      if (r) { h.pozicia.x = r.x; h.pozicia.z = r.z; }
    }
  }

  // autá (hráčovo aj zaparkované)
  const R = KONFIG.AUTO.POLOMER;
  for (const a of hra.auta) {
    if (Math.abs(a.pozicia.x - p.x) > DOSAH + 10 || Math.abs(a.pozicia.z - p.z) > DOSAH + 10) continue;
    for (const c of blizke) {
      if (Math.abs(a.pozicia.y - c.y) > 3) continue;
      for (const k of a.kruhy()) {
        const r = vytlacKruh(c, k.x, k.z, R);
        if (!r) continue;
        a.pozicia.x += r.x - k.x;
        a.pozicia.z += r.z - k.z;
        // odraz: rýchlosť auta voči vozidlu MHD
        const vx = (a.vx ?? 0) - c.vx, vz = (a.vz ?? 0) - c.vz;
        const vn = vx * r.nx + vz * r.nz;
        if (vn < 0 && a.vx !== undefined) {
          a.vx -= r.nx * vn * 1.4; a.vz -= r.nz * vn * 1.4;
          a.vx *= 0.7; a.vz *= 0.7;
          if (-vn > 4) hra.posli('naraz', { auto: a, sila: -vn, mhd: true });
        }
      }
    }
  }
}
