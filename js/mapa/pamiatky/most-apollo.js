// Most Apollo – oceľový oblúk nad Dunajom, z ktorého visia závesy k mostovke.

import * as THREE from 'three';
import { tramy } from './pomocne.js';

export default function postav(p, { vyskopis }) {
  const g = new THREE.Group();
  const [ax, az] = p.most.od, [bx, bz] = p.most.do;
  const L = Math.hypot(bx - ax, bz - az);
  const ux = (bx - ax) / L, uz = (bz - az) / L, nx = -uz, nz = ux;

  let t0 = null, t1 = null;
  for (let t = 0; t <= L; t += 2) {
    if (vyskopis.jeVoVode(ax + ux * t, az + uz * t)) { t0 ??= t; t1 = t; }
  }
  if (t0 === null) { t0 = L * 0.15; t1 = L * 0.85; }
  const VYSKA = 36;
  const n = 24;
  const oblukBod = (k, s) => {
    const t = t0 + (k / n) * (t1 - t0);
    const h = vyskopis.vyska(ax + ux * t, az + uz * t);
    return [ax + ux * t + nx * s * 1.5, h + Math.sin((k / n) * Math.PI) * VYSKA, az + uz * t + nz * s * 1.5];
  };
  const oblukUseky = [], zavesy = [];
  for (const s of [1, -1]) {
    for (let k = 0; k < n; k++) oblukUseky.push([oblukBod(k, s), oblukBod(k + 1, s)]);
  }
  for (let k = 1; k < n; k++) {
    const t = t0 + (k / n) * (t1 - t0);
    const h = vyskopis.vyska(ax + ux * t, az + uz * t);
    const vrch = oblukBod(k, 0);
    for (const s of [1, -1]) zavesy.push([vrch, [ax + ux * t + nx * s * 9, h + 0.5, az + uz * t + nz * s * 9]]);
  }
  g.add(tramy(oblukUseky, 2.6, '#e3e6e8', { kov: 0.5, lesk: 0.4 }));
  g.add(tramy(zavesy, 0.3, '#f2f4f5', { kov: 0.6 }));
  return { objekt: g };
}
