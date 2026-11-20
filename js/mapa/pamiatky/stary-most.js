// Starý most – oceľový priehradový most (električka, chodci, cyklisti).
// Priehradové nosníky sa postavia nad časťou mosta, ktorá je nad Dunajom.

import * as THREE from 'three';
import { tramy } from './pomocne.js';

const FARBA = '#5b7b86';

export default function postav(p, { vyskopis }) {
  const g = new THREE.Group();
  const [ax, az] = p.most.od, [bx, bz] = p.most.do;
  const L = Math.hypot(bx - ax, bz - az);
  const ux = (bx - ax) / L, uz = (bz - az) / L, nx = -uz, nz = ux;
  const pol = (p.most.sirka ?? 12) / 2 + 0.3;

  // úsek nad vodou
  let t0 = null, t1 = null;
  for (let t = 0; t <= L; t += 2) {
    if (vyskopis.jeVoVode(ax + ux * t, az + uz * t) || vyskopis.vyskaTerenu(ax + ux * t, az + uz * t) < -2) {
      t0 ??= t; t1 = t;
    }
  }
  if (t0 === null) { t0 = 40; t1 = L - 40; }
  const pocetPoli = Math.max(2, Math.round((t1 - t0) / 70));
  const dlzkaPola = (t1 - t0) / pocetPoli;
  const useky = [];
  for (const s of [1, -1]) {
    const bod = (t, y) => {
      const x = ax + ux * t + nx * s * pol, z = az + uz * t + nz * s * pol;
      return [x, vyskopis.vyska(ax + ux * t, az + uz * t) + y, z];
    };
    for (let k = 0; k < pocetPoli; k++) {
      const zac = t0 + k * dlzkaPola;
      const n = 8;
      for (let i = 0; i < n; i++) {
        const ta = zac + (i / n) * dlzkaPola, tb = zac + ((i + 1) / n) * dlzkaPola;
        // horný pás má tvar oblúka (vyšší v strede poľa)
        const ha = 3 + Math.sin((i / n) * Math.PI) * 7, hb = 3 + Math.sin(((i + 1) / n) * Math.PI) * 7;
        useky.push([bod(ta, 0.3), bod(tb, 0.3)]);         // dolný pás
        useky.push([bod(ta, ha), bod(tb, hb)]);             // horný pás
        useky.push([bod(ta, 0.3), bod(ta, ha)]);            // zvislica
        useky.push([bod(i % 2 ? ta : tb, 0.3), bod(i % 2 ? tb : ta, i % 2 ? hb : ha)]); // diagonála
      }
      useky.push([bod(zac + dlzkaPola, 0.3), bod(zac + dlzkaPola, 3)]);
    }
  }
  g.add(tramy(useky, 0.45, FARBA, { kov: 0.6, lesk: 0.3 }));
  // priečne stužidlá navrchu
  const priecne = [];
  for (let t = t0; t <= t1; t += dlzkaPola / 4) {
    const k = ((t - t0) % dlzkaPola) / dlzkaPola;
    const h = 3 + Math.sin(k * Math.PI) * 7;
    if (h < 6) continue;
    const y = vyskopis.vyska(ax + ux * t, az + uz * t) + h;
    priecne.push([[ax + ux * t + nx * pol, y, az + uz * t + nz * pol], [ax + ux * t - nx * pol, y, az + uz * t - nz * pol]]);
  }
  if (priecne.length) g.add(tramy(priecne, 0.35, FARBA, { kov: 0.6 }));
  return { objekt: g };
}
