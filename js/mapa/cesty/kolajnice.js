// Električkové koľaje (rozchod 1 000 mm) – dve oceľové koľajnice nad vozovkou alebo zemou.

import * as THREE from 'three';
import { zjemni } from './cesty.js';

const ROZCHOD = 1.0;

export function vytvorKolajnice(kolajnice, vyskopis) {
  const poz = [];
  for (const k of kolajnice ?? []) {
    if (k.typ !== 'elektricka') continue;
    const body = zjemni(k.body, 3);
    for (const strana of [1, -1]) {
      for (let i = 0; i < body.length - 1; i++) {
        const [ax, az] = body[i], [bx, bz] = body[i + 1];
        const d = Math.hypot(bx - ax, bz - az) || 1;
        const nx = -(bz - az) / d * strana * ROZCHOD / 2, nz = (bx - ax) / d * strana * ROZCHOD / 2;
        const ox = -(bz - az) / d * 0.04, oz = (bx - ax) / d * 0.04;
        const ya = vyskopis.vyska(ax + nx, az + nz) + 0.24, yb = vyskopis.vyska(bx + nx, bz + nz) + 0.24;
        const A = [ax + nx - ox, ya, az + nz - oz], Bv = [bx + nx - ox, yb, bz + nz - oz];
        const C = [bx + nx + ox, yb, bz + nz + oz], D = [ax + nx + ox, ya, az + nz + oz];
        poz.push(...A, ...Bv, ...C, ...A, ...C, ...D);
      }
    }
  }
  const skupina = new THREE.Group();
  skupina.name = 'kolajnice';
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(poz, 3));
  geo.computeVertexNormals();
  skupina.add(new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: '#9aa0a4', metalness: 0.8, roughness: 0.35, side: THREE.DoubleSide })));
  return skupina;
}
