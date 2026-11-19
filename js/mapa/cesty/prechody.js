// Prechody pre chodcov (zebry) na miestach z OSM (highway=crossing).
// Zebra sa natočí podľa najbližšej cesty a natiahne cez celú jej šírku.

import * as THREE from 'three';
import { texturaZebry } from './textura-cesty.js';
import { najblizsiNaUsecke } from '../geometria.js';

const DLZKA = 3.5;

export function vytvorPrechody(prechody, cesty, vyskopis) {
  // mriežka úsekov ciest na rýchle hľadanie
  const mriezka = new Map();
  const B = 30;
  cesty.forEach((c) => {
    for (let i = 0; i < c.body.length - 1; i++) {
      const [ax, az] = c.body[i], [bx, bz] = c.body[i + 1];
      for (let gx = Math.floor(Math.min(ax, bx) / B); gx <= Math.floor(Math.max(ax, bx) / B); gx++) {
        for (let gz = Math.floor(Math.min(az, bz) / B); gz <= Math.floor(Math.max(az, bz) / B); gz++) {
          const k = gx * 100003 + gz;
          if (!mriezka.has(k)) mriezka.set(k, []);
          mriezka.get(k).push({ c, ax, az, bx, bz });
        }
      }
    }
  });

  const poz = [], uv = [];
  for (const [x, z] of prechody ?? []) {
    const kandidati = mriezka.get(Math.floor(x / B) * 100003 + Math.floor(z / B)) ?? [];
    let naj = null;
    for (const u of kandidati) {
      const n = najblizsiNaUsecke(x, z, u.ax, u.az, u.bx, u.bz);
      if (n.d2 < 9 && (!naj || n.d2 < naj.d2)) naj = { ...n, u };
    }
    if (!naj || naj.u.c.most) continue;
    const { u } = naj;
    const d = Math.hypot(u.bx - u.ax, u.bz - u.az) || 1;
    const dx = (u.bx - u.ax) / d, dz = (u.bz - u.az) / d;
    const nx = -dz, nz = dx;
    const pol = u.c.sirka / 2, h = DLZKA / 2;
    const cx = naj.x, cz = naj.z;
    const roh = (s, t) => {
      const px = cx + nx * s * pol + dx * t * h, pz = cz + nz * s * pol + dz * t * h;
      return [px, vyskopis.vyska(px, pz) + 0.2, pz];
    };
    const A = roh(1, -1), Bb = roh(1, 1), C = roh(-1, 1), D = roh(-1, -1);
    // U = metre naprieč (perióda pruhov 1 m), normála nahor
    const w = u.c.sirka;
    poz.push(...A, ...Bb, ...D, ...Bb, ...C, ...D);
    uv.push(0, 0, 0, 1, w, 0, 0, 1, w, 1, w, 0);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(poz, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.computeVertexNormals();
  const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({
    map: texturaZebry(), roughness: 0.8, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4
  }));
  mesh.receiveShadow = true;
  mesh.name = 'prechody';
  return mesh;
}
