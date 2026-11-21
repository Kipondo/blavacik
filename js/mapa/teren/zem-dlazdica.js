// Zem jednej dlaždice mesta (500 × 500 m, sieť po 5 m, s detailným terénom z lasera po 2 m) s vlastnou textúrou pokrývky.
// Stavia sa po krokoch (generátor): textúry, výšky po pásoch riadkov, normály – správca dlaždíc to rozloží
// do viacerých snímok, aby hra pri načítaní dlaždice nesekala.

import * as THREE from 'three';
import { krokyTexturyDlazdice, krokyTriedDlazdice, dokonci } from './textura-zeme.js';
import { materialZeme } from './material-zeme.js';

const KROK = 5, KROK_DETAIL = 2;
const RIADKOV_NA_KROK = 50;   // koľko riadkov siete sa spočíta naraz (potom sa vráti riadenie hre)
const SUKNA = 2;              // m – o koľko nižšie ide „sukňa“ na okraji dlaždice

export function vytvorZemDlazdice(d, rect, vyskopis, rieky) {
  return dokonci(krokyZemeDlazdice(d, rect, vyskopis, rieky));
}

export function* krokyZemeDlazdice(d, rect, vyskopis, rieky) {
  // dlažba, chodníky a tráva z CC0 materiálov podľa mapy tried povrchu; v laserovom výreze ostrejšia textúra
  // aj inde 1024 px (0,5 m – ostré okraje chodníkov a trávnikov; hra je len pre PC)
  const mapa = yield* krokyTexturyDlazdice(d, rieky, rect, 1024);
  yield;
  const triedy = yield* krokyTriedDlazdice(d, rect, 1024, vyskopis);
  yield;

  const w = rect.maxX - rect.minX, h = rect.maxZ - rect.minZ;
  const n = Math.round(w / (d._detailTerenu ? KROK_DETAIL : KROK));
  const v = n + 1, pocet = v * v;
  const krokX = w / n, krokZ = h / n;
  // vrcholy siete (riadok j = z, stĺpec i = x) + 4 okraje „sukne“
  const vsetky = pocet + 4 * v;
  const P = new Float32Array(vsetky * 3), N = new Float32Array(vsetky * 3), U = new Float32Array(vsetky * 2);
  const voda = new Uint8Array(pocet), vys = new Float32Array(pocet);
  for (let j = 0; j < v; j++) {
    const z = rect.minZ + j * krokZ;
    for (let i = 0; i < v; i++) {
      const x = rect.minX + i * krokX, k = j * v + i;
      vys[k] = vyskopis.vyskaTerenu(x, z);
      voda[k] = vyskopis.jeVoVode(x, z) ? 1 : 0;
      P[k * 3] = x; P[k * 3 + 2] = z;
      U[k * 2] = i / n; U[k * 2 + 1] = j / n;
    }
    if (j % RIADKOV_NA_KROK === RIADKOV_NA_KROK - 1) yield;
  }
  // vrcholy vo vode pri brehu dostanú výšku brehu (zem pri múre neklesá)
  for (let j = 0; j < v; j++) {
    for (let i = 0; i < v; i++) {
      const k = j * v + i;
      let y = vys[k];
      if (voda[k]) {
        let max = -Infinity;
        for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) {
          const ii = i + a, jj = j + b;
          if (ii < 0 || jj < 0 || ii >= v || jj >= v) continue;
          if (!voda[jj * v + ii]) max = Math.max(max, vys[jj * v + ii]);
        }
        if (max > -Infinity) y = max;
      }
      P[k * 3 + 1] = y;
    }
  }
  yield;
  // normály z rozdielov výšok susedov (na okraji jednostranne)
  for (let j = 0; j < v; j++) {
    const j0 = Math.max(0, j - 1), j1 = Math.min(n, j + 1);
    for (let i = 0; i < v; i++) {
      const i0 = Math.max(0, i - 1), i1 = Math.min(n, i + 1);
      const dx = (P[(j * v + i1) * 3 + 1] - P[(j * v + i0) * 3 + 1]) / ((i1 - i0) * krokX);
      const dz = (P[(j1 * v + i) * 3 + 1] - P[(j0 * v + i) * 3 + 1]) / ((j1 - j0) * krokZ);
      const l = Math.hypot(dx, 1, dz), k = (j * v + i) * 3;
      N[k] = -dx / l; N[k + 1] = 1 / l; N[k + 2] = -dz / l;
    }
  }
  // trojuholníky siete (lícom nahor)
  const I = new Uint32Array(n * n * 6 + 4 * (v - 1) * 12);
  let o = 0;
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) {
      const a = j * v + i, b = a + v, c = a + 1, e = b + 1;
      I[o++] = a; I[o++] = b; I[o++] = c;
      I[o++] = c; I[o++] = b; I[o++] = e;
    }
  }
  o = pridajSukne(P, N, U, I, o, v, pocet);
  yield;

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(P, 3));
  geo.setAttribute('normal', new THREE.BufferAttribute(N, 3));
  geo.setAttribute('uv', new THREE.BufferAttribute(U, 2));
  geo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(vsetky * 3).fill(1), 3));
  geo.setIndex(new THREE.BufferAttribute(I, 1));
  geo.computeBoundingSphere();
  geo.computeBoundingBox();

  const mesh = new THREE.Mesh(geo, materialZeme(mapa, triedy));
  mesh.receiveShadow = true;
  mesh.name = 'zem';
  mesh.userData.rect = rect;   // pre trávu zblízka (js/mapa/zelen/trava-modul.js číta mapu tried a pokrývky)
  return mesh;
}

/**
 * „Sukňa“ okolo dlaždice: okrajové vrcholy sa zopakujú o 2 m nižšie. Keď susedná dlaždica vznikla
 * s iným terénom na hrane (napr. ešte bez laserového detailu), medzi dlaždicami nevznikne škára,
 * cez ktorú by bolo vidieť oblohu (pôsobila ako biela čiara cez námestie).
 * Vrcholy sukne idú do polí za vrcholy siete (od indexu `pocet`), trojuholníky za `o`; vracia nové `o`.
 */
function pridajSukne(P, N, U, I, o, v, pocet) {
  const hrany = [
    (t) => t,                     // okraj j = 0
    (t) => (v - 1) * v + t,       // okraj j = n
    (t) => t * v,                 // okraj i = 0
    (t) => t * v + v - 1,         // okraj i = n
  ];
  let dalsi = pocet;
  for (const hrana of hrany) {
    const prvy = dalsi;
    for (let t = 0; t < v; t++, dalsi++) {
      const k = hrana(t);
      P[dalsi * 3] = P[k * 3]; P[dalsi * 3 + 1] = P[k * 3 + 1] - SUKNA; P[dalsi * 3 + 2] = P[k * 3 + 2];
      N[dalsi * 3] = N[k * 3]; N[dalsi * 3 + 1] = N[k * 3 + 1]; N[dalsi * 3 + 2] = N[k * 3 + 2];
      U[dalsi * 2] = U[k * 2]; U[dalsi * 2 + 1] = U[k * 2 + 1];
    }
    for (let t = 0; t < v - 1; t++) {
      const a = hrana(t), b = hrana(t + 1), a2 = prvy + t, b2 = prvy + t + 1;
      // obe strany
      I[o++] = a; I[o++] = b; I[o++] = b2; I[o++] = a; I[o++] = b2; I[o++] = a2;
      I[o++] = a; I[o++] = b2; I[o++] = b; I[o++] = a; I[o++] = a2; I[o++] = b2;
    }
  }
  return o;
}
