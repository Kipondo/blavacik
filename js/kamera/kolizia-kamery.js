// Kamera nesmie vojsť do budovy ani pamiatky: lúč od hráča ku kamere sa pretne s pôdorysmi
// prekážok (kolízne polygóny dlaždíc) a kamera sa zastaví kúsok pred prvou stenou.
// Budovy majú v kolíziách `info.vrch` (výška strechy) – nad nízkym domom kamera prejde.
// Stromy (kruhy) kameru nezastavujú.

import { bodVPolygone } from '../mapa/geometria.js';

const ODSTUP = 0.6;              // m pred stenou (blízka rovina kamery je 0.3 m)
const VRCH_PAMIATKY = 30;        // m nad terénom, ak pamiatka nemá zadanú výšku

/** Priesečník úsečiek AB a CD v 2D – vracia parameter t na AB alebo -1. */
function priesecnik(ax, az, bx, bz, cx, cz, dx, dz) {
  const rx = bx - ax, rz = bz - az, sx = dx - cx, sz = dz - cz;
  const m = rx * sz - rz * sx;
  if (Math.abs(m) < 1e-9) return -1;
  const qx = cx - ax, qz = cz - az;
  const t = (qx * sz - qz * sx) / m;
  const u = (qx * rz - qz * rx) / m;
  return t >= 0 && t <= 1 && u >= 0 && u <= 1 ? t : -1;
}

/**
 * Vráti najväčší podiel (0..1) cesty od cieľa (hráča) ku kamere, ktorý je voľný.
 * ciel, poz: {x, y, z}; vyskaTerenu(x, z) pre pamiatky bez zadanej výšky.
 */
export function volnyPodiel(kolizie, ciel, poz, vyskaTerenu) {
  if (!kolizie) return 1;
  const dx = poz.x - ciel.x, dy = poz.y - ciel.y, dz = poz.z - ciel.z;
  const dlzka = Math.hypot(dx, dz);
  if (dlzka < 0.05) return 1;
  let tMin = 1;
  const mx = (ciel.x + poz.x) / 2, mz = (ciel.z + poz.z) / 2;
  for (const p of kolizie.vOkoli(mx, mz, dlzka / 2 + 1)) {
    if (p.typ !== 'polygon') continue;
    const t0 = p.info?.typ;
    if (t0 !== 'budova' && t0 !== 'pamiatka') continue;
    if (Math.max(ciel.x, poz.x) < p.minX || Math.min(ciel.x, poz.x) > p.maxX ||
        Math.max(ciel.z, poz.z) < p.minZ || Math.min(ciel.z, poz.z) > p.maxZ) continue;
    // hráč stojí v pôdoryse (napr. podchod, pasáž) – túto prekážku ignorujeme
    if (bodVPolygone(ciel.x, ciel.z, p.body)) continue;
    let vrch = p.info.vrch;
    if (vrch === undefined) vrch = vyskaTerenu(p.body[0][0], p.body[0][1]) + VRCH_PAMIATKY;
    const b = p.body;
    for (let i = 0, j = b.length - 1; i < b.length; j = i++) {
      const t = priesecnik(ciel.x, ciel.z, poz.x, poz.z, b[j][0], b[j][1], b[i][0], b[i][1]);
      if (t < 0 || t >= tMin) continue;
      if (ciel.y + dy * t < vrch) tMin = t;           // stena pod strechou
    }
    // lúč klesá a strechu pretne zhora (kamera pod hráčom je zriedkavá, ale nech nevojde do strechy)
    if (dy < 0 && ciel.y > vrch && poz.y < vrch) {
      const t = (vrch - ciel.y) / dy;
      if (t < tMin && bodVPolygone(ciel.x + dx * t, ciel.z + dz * t, b)) tMin = t;
    }
  }
  if (tMin >= 1) return 1;
  return Math.max(0, tMin - ODSTUP / dlzka);
}
