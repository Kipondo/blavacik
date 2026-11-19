// Spoločné pomôcky pre modely pamiatok (low-poly).

import * as THREE from 'three';
import { texturaOkien, OKNO_SIRKA, OKNO_VYSKA } from '../budovy/textura-okien.js';

const cacheMaterialov = new Map();

/** Materiál podľa farby (zdieľaný). okna = true → fasáda s oknami. */
export function material(farba, { okna = false, lesk = 0, kov = 0, priehladnost = 1 } = {}) {
  const kluc = `${farba}|${okna}|${lesk}|${kov}|${priehladnost}`;
  if (!cacheMaterialov.has(kluc)) {
    cacheMaterialov.set(kluc, new THREE.MeshStandardMaterial({
      color: farba,
      map: okna ? texturaOkien() : null,
      roughness: 1 - lesk,
      metalness: kov,
      transparent: priehladnost < 1,
      opacity: priehladnost,
    }));
  }
  return cacheMaterialov.get(kluc);
}

/** Kváder s oknami – UV sú v metroch, takže okná majú všade rovnakú veľkosť. */
export function kvaderSOknami(sirka, vyska, hlbka, farba, moznosti = {}) {
  const geo = new THREE.BoxGeometry(sirka, vyska, hlbka);
  const uv = geo.attributes.uv;
  // BoxGeometry: 6 stien po 4 vrcholy v poradí +x, -x, +y, -y, +z, -z
  const rozmery = [[hlbka, vyska], [hlbka, vyska], [sirka, hlbka], [sirka, hlbka], [sirka, vyska], [sirka, vyska]];
  for (let s = 0; s < 6; s++) {
    const [w, h] = rozmery[s];
    const strecha = s === 2 || s === 3;
    for (let k = 0; k < 4; k++) {
      const i = s * 4 + k;
      if (strecha) uv.setXY(i, 0.99, 0.99); // biely roh textúry
      else uv.setXY(i, (uv.getX(i) * w) / (OKNO_SIRKA * 4), (uv.getY(i) * h) / (OKNO_VYSKA * 4));
    }
  }
  const mesh = new THREE.Mesh(geo, material(farba, { okna: true, ...moznosti }));
  mesh.castShadow = mesh.receiveShadow = true;
  return mesh;
}

/** Jednoduchý kváder bez okien. */
export function kvader(sirka, vyska, hlbka, farba, moznosti = {}) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(sirka, vyska, hlbka), material(farba, moznosti));
  mesh.castShadow = mesh.receiveShadow = true;
  return mesh;
}

/** Ihlanová strecha (4-boká) s podstavou sirka × hlbka. */
export function ihlan(sirka, vyska, hlbka, farba) {
  const geo = new THREE.ConeGeometry(Math.SQRT1_2, 1, 4, 1);
  geo.rotateY(Math.PI / 4);
  geo.scale(sirka, vyska, hlbka);
  geo.translate(0, vyska / 2, 0);
  const mesh = new THREE.Mesh(geo, material(farba));
  mesh.castShadow = true;
  return mesh;
}

/** Valec / kužeľ. */
export function valec(rHore, rDole, vyska, farba, segmenty = 12, moznosti = {}) {
  const geo = new THREE.CylinderGeometry(rHore, rDole, vyska, segmenty);
  geo.translate(0, vyska / 2, 0);
  const mesh = new THREE.Mesh(geo, material(farba, moznosti));
  mesh.castShadow = mesh.receiveShadow = true;
  return mesh;
}

/** Valbová (sedlová so zrezanými koncami) strecha na obdĺžnik sirka × hlbka. */
export function valbovaStrecha(sirka, vyska, hlbka, farba) {
  const dlha = Math.max(sirka, hlbka), kratka = Math.min(sirka, hlbka);
  const pol = Math.max(0, dlha / 2 - kratka / 2);
  const hw = sirka / 2, hd = hlbka / 2;
  const pozdlzX = sirka >= hlbka;
  const r1 = pozdlzX ? [-pol, vyska, 0] : [0, vyska, -pol];
  const r2 = pozdlzX ? [pol, vyska, 0] : [0, vyska, pol];
  const A = [-hw, 0, -hd], B = [hw, 0, -hd], C = [hw, 0, hd], D = [-hw, 0, hd];
  const troj = pozdlzX
    ? [[A, r1, r2], [A, r2, B], [C, r2, r1], [C, r1, D], [B, r2, C], [D, r1, A]]
    : [[A, r1, B], [B, r1, r2], [B, r2, C], [C, r2, D], [D, r2, r1], [D, r1, A]];
  const poz = [];
  for (const [a, b, c] of troj) {
    // normála von od stredu
    const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2];
    const vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
    const nx = uy * vz - uz * vy, nz = ux * vy - uy * vx;
    const mx = (a[0] + b[0] + c[0]) / 3, mz = (a[2] + b[2] + c[2]) / 3;
    if (nx * mx + nz * mz >= 0) poz.push(...a, ...b, ...c);
    else poz.push(...a, ...c, ...b);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(poz, 3));
  geo.computeVertexNormals();
  const mesh = new THREE.Mesh(geo, material(farba));
  mesh.castShadow = true;
  return mesh;
}

/** Najnižšia výška terénu pod obdĺžnikom (aby stavba nevisela vo vzduchu). */
export function zakladna(vyskopis, x, z, sirka, hlbka) {
  let min = Infinity;
  for (const [dx, dz] of [[0, 0], [-1, -1], [1, -1], [1, 1], [-1, 1]]) {
    min = Math.min(min, vyskopis.vyskaTerenu(x + (dx * sirka) / 2, z + (dz * hlbka) / 2));
  }
  return min;
}
