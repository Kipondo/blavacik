// Modely áut NPC premávky pre InstancedMesh: rovnaké tvary ako autá hráča (js/auto/model-auta.js),
// ale zlúčené do pár sietí na typ (lak, sklo, ostatné, svetlá), aby stovky áut boli lacné.
// Lak sa farbí po inštanciách (setColorAt).

import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { geometrie, PROFILY } from '../../auto/model-auta.js';

export const TYPY_AUT = ['sedan', 'hatchback', 'suv'];
const SIRKA = 1.72;

/** Typ auta podľa farby – rovnako ako vytvorModelAuta, aby po „ukradnutí“ auto vyzeralo rovnako. */
export function typPodlaFarby(farba) {
  const h = parseInt(farba.slice(1), 16) || 0;
  return ['sedan', 'hatchback', 'sedan', 'suv'][h % 4];
}

const _c = new THREE.Color();
function sFarbou(geo, hex, matica) {
  const g = (geo.index ? geo.toNonIndexed() : geo.clone());
  g.deleteAttribute('uv');
  if (matica) g.applyMatrix4(matica);
  const n = g.getAttribute('position').count;
  const c = new Float32Array(n * 3);
  _c.setHex(hex);
  for (let i = 0; i < n; i++) { c[i * 3] = _c.r; c[i * 3 + 1] = _c.g; c[i * 3 + 2] = _c.b; }
  g.setAttribute('color', new THREE.BufferAttribute(c, 3));
  return g;
}

const kvader = (w, h, d, x, y, z, hex) => sFarbou(new THREE.BoxGeometry(w, h, d), hex, new THREE.Matrix4().makeTranslation(x, y, z));

/** { lak, sklo, ostatne, svetla } – BufferGeometry pre daný typ auta. */
export function geometrieNpc(typ) {
  const g = geometrie(typ);
  const zp = g.predok, zz = g.zadok, ys = g.vyskaSvetiel;
  const lak = [sFarbou(g.telo, 0xffffff), sFarbou(g.strecha, 0xffffff)];
  for (const x of [-0.6, 0.6]) lak.push(kvader(0.16, 0.1, 0.12, x * 1.55, 1.05, PROFILY[typ].kabina[3][0] - 0.15, 0xffffff));

  const sklo = [sFarbou(g.sklo, 0x1e2a35)];

  const ost = [
    kvader(SIRKA + 0.02, 0.18, 0.14, 0, 0.42, zp + 0.02, 0x1d1f21),
    kvader(SIRKA + 0.02, 0.18, 0.14, 0, 0.42, zz - 0.02, 0x1d1f21),
    kvader(0.62, 0.14, 0.04, 0, ys - 0.06, zp + 0.08, 0x1d1f21),
    kvader(0.52, 0.12, 0.02, 0, 0.55, zz - 0.1, 0xf2f2f2),   // ŠPZ (bez textu)
    kvader(0.52, 0.12, 0.02, 0, 0.5, zp + 0.1, 0xf2f2f2),
  ];
  const rozvor = Math.min(1.42, g.dlzka * 0.31);
  const pneu = new THREE.CylinderGeometry(0.36, 0.36, 0.26, 12); pneu.rotateZ(Math.PI / 2);
  const disk = new THREE.CylinderGeometry(0.23, 0.23, 0.28, 8); disk.rotateZ(Math.PI / 2);
  for (const [x, z] of [[-0.8, rozvor], [0.8, rozvor], [-0.8, -rozvor], [0.8, -rozvor]]) {
    const m = new THREE.Matrix4().makeTranslation(x, 0.36, z);
    ost.push(sFarbou(pneu, 0x151515, m), sFarbou(disk, 0xb9bec3, m));
  }
  // mäkký tieň pod autom
  const tien = new THREE.PlaneGeometry(SIRKA + 0.3, g.dlzka + 0.3);
  tien.rotateX(-Math.PI / 2); tien.translate(0, 0.04, 0);
  ost.push(sFarbou(tien, 0x050505));

  const svetla = [];
  for (const x of [-0.6, 0.6]) {
    svetla.push(kvader(0.36, 0.12, 0.05, x, ys, zp + 0.06, 0xfff4d6));
    svetla.push(kvader(0.36, 0.11, 0.05, x, ys + 0.04, zz - 0.06, 0xb01010));
  }
  const zluc = (pole) => { const m = mergeGeometries(pole, false); m.computeBoundingSphere(); return m; };
  return { lak: zluc(lak), sklo: zluc(sklo), ostatne: zluc(ost), svetla: zluc(svetla), dlzka: g.dlzka };
}

// Farby áut v uliciach (približne ako v skutočnosti: veľa bielej, sivej, čiernej, striebornej)
export const FARBY_NPC = [
  ['#f4f4f2', 22], ['#e9eaec', 6], ['#1b1c1e', 16], ['#9ea3a8', 14], ['#5d6268', 12], ['#c9ccd0', 6],
  ['#1f3a68', 6], ['#2c4f8a', 3], ['#a3161a', 6], ['#c8102e', 2], ['#3d5a3a', 2], ['#7a5b3a', 2],
  ['#e0b020', 1], ['#d86a1c', 1], ['#5b2a5e', 1],
];
const SUCET = FARBY_NPC.reduce((s, f) => s + f[1], 0);

export function nahodnaFarba(r = Math.random()) {
  let x = r * SUCET;
  for (const [f, w] of FARBY_NPC) { if (x < w) return f; x -= w; }
  return FARBY_NPC[0][0];
}
