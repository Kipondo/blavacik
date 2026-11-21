// Zem jednej dlaždice mesta (500 × 500 m, sieť po 5 m, s detailným terénom z lasera po 2 m) s vlastnou textúrou pokrývky.

import * as THREE from 'three';
import { vytvorTexturuDlazdice, vytvorTriedyDlazdice } from './textura-zeme.js';
import { materialZeme } from './material-zeme.js';

const KROK = 5, KROK_DETAIL = 2;

export function vytvorZemDlazdice(d, rect, vyskopis, rieky) {
  const w = rect.maxX - rect.minX, h = rect.maxZ - rect.minZ;
  const n = Math.round(w / (d._detailTerenu ? KROK_DETAIL : KROK));
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
  pridajSukne(geo, v);
  // dlažba, chodníky a tráva z CC0 materiálov podľa mapy tried povrchu; v laserovom výreze ostrejšia textúra
  // aj inde 1024 px (0,5 m – ostré okraje chodníkov a trávnikov; hra je len pre PC)
  const mat = d._detailTerenu
    ? materialZeme(vytvorTexturuDlazdice(d, rieky, rect, 1024), vytvorTriedyDlazdice(d, rect, 1024, vyskopis))
    : materialZeme(vytvorTexturuDlazdice(d, rieky, rect, 1024), vytvorTriedyDlazdice(d, rect, 1024, vyskopis));
  const mesh = new THREE.Mesh(geo, mat);
  mesh.receiveShadow = true;
  mesh.name = 'zem';
  mesh.userData.rect = rect;   // pre trávu zblízka (js/mapa/zelen/trava-modul.js číta mapu tried a pokrývky)
  return mesh;
}

/**
 * „Sukňa“ okolo dlaždice: okrajové vrcholy sa zopakujú o 2 m nižšie. Keď susedná dlaždica vznikla
 * s iným terénom na hrane (napr. ešte bez laserového detailu), medzi dlaždicami nevznikne škára,
 * cez ktorú by bolo vidieť oblohu (pôsobila ako biela čiara cez námestie).
 */
function pridajSukne(geo, v) {
  const poz = geo.attributes.position, nor = geo.attributes.normal, uv = geo.attributes.uv, col = geo.attributes.color;
  const n0 = poz.count;
  const hrany = [
    Array.from({ length: v }, (_, i) => i),                     // horný okraj
    Array.from({ length: v }, (_, i) => (v - 1) * v + i),       // dolný okraj
    Array.from({ length: v }, (_, j) => j * v),                 // ľavý okraj
    Array.from({ length: v }, (_, j) => j * v + v - 1),         // pravý okraj
  ];
  const P = [], N = [], U = [], C = [], I = [];
  for (let k = 0; k < n0; k++) {
    P.push(poz.getX(k), poz.getY(k), poz.getZ(k)); N.push(nor.getX(k), nor.getY(k), nor.getZ(k));
    U.push(uv.getX(k), uv.getY(k)); C.push(col.getX(k), col.getY(k), col.getZ(k));
  }
  for (let k = 0; k < geo.index.count; k++) I.push(geo.index.getX(k));
  let dalsi = n0;
  for (const hrana of hrany) {
    const dole = hrana.map((k) => {
      P.push(poz.getX(k), poz.getY(k) - 2, poz.getZ(k)); N.push(nor.getX(k), nor.getY(k), nor.getZ(k));
      U.push(uv.getX(k), uv.getY(k)); C.push(col.getX(k), col.getY(k), col.getZ(k));
      return dalsi++;
    });
    for (let i = 0; i < hrana.length - 1; i++) {
      const a = hrana[i], b = hrana[i + 1], a2 = dole[i], b2 = dole[i + 1];
      I.push(a, b, b2, a, b2, a2, a, b2, b, a, a2, b2); // obe strany
    }
  }
  geo.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(N, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(U, 2));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(C, 3));
  geo.setIndex(I);
}
