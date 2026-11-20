// Zem jednej dlaždice mesta (500 × 500 m, sieť po 5 m) s vlastnou textúrou pokrývky.

import * as THREE from 'three';
import { vytvorTexturuDlazdice } from './textura-zeme.js';
import { materialZeme } from './material-zeme.js';

const KROK = 5;

export function vytvorZemDlazdice(d, rect, vyskopis, rieky) {
  const w = rect.maxX - rect.minX, h = rect.maxZ - rect.minZ;
  const n = Math.round(w / KROK);
  const geo = new THREE.PlaneGeometry(w, h, n, n);
  geo.rotateX(-Math.PI / 2);
  geo.translate(rect.minX + w / 2, 0, rect.minZ + h / 2);
  const poz = geo.attributes.position, uv = geo.attributes.uv;
  const voda = new Uint8Array(poz.count);
  for (let i = 0; i < poz.count; i++) {
    const x = poz.getX(i), z = poz.getZ(i);
    poz.setY(i, vyskopis.vyskaTerenu(x, z));
    uv.setXY(i, (x - rect.minX) / w, (z - rect.minZ) / h);
    voda[i] = vyskopis.jeVoVode(x, z) ? 1 : 0;
  }
  // vrcholy vo vode pri brehu dostanú výšku brehu (zem pri múre neklesá)
  const v = n + 1, povodne = Float32Array.from({ length: poz.count }, (_, i) => poz.getY(i));
  for (let j = 0; j < v; j++) {
    for (let i = 0; i < v; i++) {
      const k = j * v + i;
      if (!voda[k]) continue;
      let max = -Infinity;
      for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) {
        const ii = i + a, jj = j + b;
        if (ii < 0 || jj < 0 || ii >= v || jj >= v) continue;
        if (!voda[jj * v + ii]) max = Math.max(max, povodne[jj * v + ii]);
      }
      if (max > -Infinity) poz.setY(k, max);
    }
  }
  const farby = new Float32Array(poz.count * 3).fill(1);
  geo.setAttribute('color', new THREE.BufferAttribute(farby, 3));
  geo.computeVertexNormals();
  const mesh = new THREE.Mesh(geo, materialZeme(vytvorTexturuDlazdice(d, rieky, rect)));
  mesh.receiveShadow = true;
  mesh.name = 'zem';
  return mesh;
}
