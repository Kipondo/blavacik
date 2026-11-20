// Hustá výsadba veľkých stromov v historických parkoch, kde laser nie je (data/mapa/husta-zelen.json).
// Porovnanie so skutočnosťou (etapa 5): Sad Janka Kráľa je hustý park so starými mohutnými stromami,
// ktoré tvoria súvislú klenbu – nie trávnik s riedkymi malými stromami.
// Stromy sa pridajú do d.stromy vo formáte z lasera [x, z, 1, výška, polomer koruny], mimo chodníkov a budov.

import { bodVPolygone } from '../geometria.js';

let data = null;
export function nacitajHustuZelen() {
  data ??= fetch('data/mapa/husta-zelen.json').then((r) => (r.ok ? r.json() : { oblasti: [] })).then((j) => j.oblasti ?? []).catch(() => []);
  return data;
}

/** Pseudonáhoda podľa polohy (rovnaký park vyzerá vždy rovnako). */
const hash = (x, z, k) => { const s = Math.sin(x * 12.9898 + z * 78.233 + k * 37.719) * 43758.5453; return s - Math.floor(s); };

function odUsecky(px, pz, [ax, az], [bx, bz]) {
  const dx = bx - ax, dz = bz - az, l = dx * dx + dz * dz || 1;
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (pz - az) * dz) / l));
  return Math.hypot(ax + dx * t - px, az + dz * t - pz);
}

/** Doplní stromy do dát dlaždice (rect = { minX, minZ, maxX, maxZ }). */
export function doplnHustuZelen(d, rect, oblasti = []) {
  if (!oblasti.length || d.stromyZLasera) return;
  const cesty = [...(d.chodniky ?? []), ...(d.cesty ?? [])];
  for (const o of oblasti) {
    const [a, b] = o.rozostup ? [o.rozostup, o.rozostup] : [10, 10];
    const minX = Math.max(rect.minX, Math.min(...o.body.map((p) => p[0])));
    const maxX = Math.min(rect.maxX, Math.max(...o.body.map((p) => p[0])));
    const minZ = Math.max(rect.minZ, Math.min(...o.body.map((p) => p[1])));
    const maxZ = Math.min(rect.maxZ, Math.max(...o.body.map((p) => p[1])));
    if (minX >= maxX || minZ >= maxZ) continue;
    const nove = [];
    for (let x = Math.ceil(minX / a) * a; x < maxX; x += a) {
      for (let z = Math.ceil(minZ / b) * b; z < maxZ; z += b) {
        const px = x + (hash(x, z, 1) - 0.5) * a * 0.8, pz = z + (hash(x, z, 2) - 0.5) * b * 0.8;
        if (px < rect.minX || px >= rect.maxX || pz < rect.minZ || pz >= rect.maxZ) continue;
        if (!bodVPolygone(px, pz, o.body)) continue;
        if (hash(x, z, 3) < (o.medzery ?? 0.12)) continue;                         // občas čistinka
        if ((d.budovy ?? []).some((bu) => bodVPolygone(px, pz, bu.body))) continue;
        if ((d.voda ?? []).some((v) => bodVPolygone(px, pz, v.body))) continue;
        // nie na chodníku (kmeň aspoň 2,5 m od osi cesty)
        let blizko = false;
        for (const c of cesty) {
          const r = (c.sirka ?? 3) / 2 + 2.5;
          for (let i = 0; i < c.body.length - 1 && !blizko; i++) if (odUsecky(px, pz, c.body[i], c.body[i + 1]) < r) blizko = true;
          if (blizko) break;
        }
        if (blizko) continue;
        const h = o.vyska[0] + (o.vyska[1] - o.vyska[0]) * hash(x, z, 4);
        const r = o.koruna[0] + (o.koruna[1] - o.koruna[0]) * hash(x, z, 5);
        nove.push([+px.toFixed(1), +pz.toFixed(1), 1, +h.toFixed(1), +r.toFixed(1)]);
      }
    }
    if (!nove.length) continue;
    // formát z lasera musí byť prvý (podľa prvého stromu sa volí podrobnejšia koruna)
    d.stromy = [...nove, ...(d.stromy ?? []).map((s) => (s.length >= 5 ? s : [s[0], s[1], s[2] ?? 1, 7.4 * (s[2] ?? 1), 2.6 * (s[2] ?? 1)]))];
  }
}
