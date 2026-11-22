// Modely áut NPC premávky pre InstancedMesh: rovnaké tvary ako autá hráča (js/auto/model-auta.js, typy
// v js/auto/typy-aut.js), ale zlúčené do pár sietí na typ (lak, sklo, ostatné, svetlá), aby stovky áut boli lacné.
// Lak sa farbí po inštanciách (setColorAt). Taxíky a kuriérske autá majú navyše svetlo na streche a pruhy
// (jedna sieť na variant – js/doprava/premavka/modul.js).

import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { geometrie } from '../../auto/model-auta.js';
import { TYPY } from '../../auto/typy-aut.js';

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
  const T = TYPY[typ];
  const W = g.sirka, zp = g.predok, zz = g.zadok, ys = g.vyskaSvetiel, r = g.kolesa.r;
  const lak = [sFarbou(g.telo, 0xffffff), sFarbou(g.strecha, 0xffffff)];
  for (const x of [-1, 1]) lak.push(kvader(0.16, 0.1, 0.12, x * (W / 2 + 0.08), T.P + 0.08, g.zrkadloZ, 0xffffff));

  const sklo = [sFarbou(g.sklo, 0x1e2a35)];

  const yn = Math.max(0.36, r + 0.06);
  const ost = [
    kvader(W + 0.02, 0.18, 0.14, 0, yn, zp + 0.02, 0x1d1f21),
    kvader(W + 0.02, 0.18, 0.14, 0, yn, zz - 0.02, 0x1d1f21),
    kvader(0.62, 0.14, 0.04, 0, ys - 0.06, zp + 0.06, 0x1d1f21),
    kvader(0.52, 0.12, 0.02, 0, yn + 0.14, zz - 0.1, 0xf2f2f2),   // ŠPZ (bez textu)
    kvader(0.52, 0.12, 0.02, 0, yn + 0.1, zp + 0.1, 0xf2f2f2),
  ];
  if (g.korba) ost.push(sFarbou(g.korba, 0x1d1f21));
  const pneu = new THREE.CylinderGeometry(r, r, 0.26, 12); pneu.rotateZ(Math.PI / 2);
  const disk = new THREE.CylinderGeometry(r * 0.64, r * 0.64, 0.28, 8); disk.rotateZ(Math.PI / 2);
  const xk = W / 2 - 0.06;
  for (const [x, z] of [[-xk, g.kolesa.predne], [xk, g.kolesa.predne], [-xk, g.kolesa.zadne], [xk, g.kolesa.zadne]]) {
    const m = new THREE.Matrix4().makeTranslation(x, r, z);
    ost.push(sFarbou(pneu, 0x151515, m), sFarbou(disk, 0xb9bec3, m));
  }
  // mäkký tieň pod autom
  const tien = new THREE.PlaneGeometry(W + 0.3, g.dlzka + 0.3);
  tien.rotateX(-Math.PI / 2); tien.translate(0, 0.04, 0);
  ost.push(sFarbou(tien, 0x050505));

  const svetla = [];
  for (const x of [-1, 1]) {
    svetla.push(kvader(0.34, 0.11, 0.05, x * (W / 2 - 0.27), ys, zp + 0.05, 0xfff4d6));
    svetla.push(kvader(0.3, 0.12, 0.05, x * (W / 2 - 0.24), g.vyskaZadnych, zz - 0.05, 0xb01010));
  }
  const zluc = (pole) => { const m = mergeGeometries(pole, false); m.computeBoundingSphere(); return m; };
  return { lak: zluc(lak), sklo: zluc(sklo), ostatne: zluc(ost), svetla: zluc(svetla), dlzka: g.dlzka };
}

const cacheTextur = new Map();
function textura(text, pozadie, pismo, w, h) {
  const k = `${text}|${pozadie}|${pismo}|${w}|${h}`;
  if (cacheTextur.has(k)) return cacheTextur.get(k);
  const c = document.createElement('canvas');
  c.width = 256; c.height = Math.max(16, Math.round(256 * h / w));
  const g = c.getContext('2d');
  g.fillStyle = pozadie; g.fillRect(0, 0, c.width, c.height);
  if (text) {
    g.fillStyle = pismo; g.font = `bold ${Math.round(c.height * 0.62)}px system-ui, sans-serif`;
    g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, c.width / 2, c.height * 0.54, c.width - 10);
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  cacheTextur.set(k, t);
  return t;
}

/**
 * Svetlo na streche a pruhy na bokoch pre taxík / kuriérske auto (variant z data/doprava/vozidla.json).
 * Vráti { geo, mat } – jedna geometria so skupinami (bok lampy, nápis lampy, pruh) a pole materiálov.
 */
export function prislusenstvoNpc(sl) {
  const g = geometrie(sl.typ), T = TYPY[sl.typ];
  const kusy = [], skupiny = [];
  const mat = [];
  if (sl.lampa) {
    const zs = -g.dlzka / 2 + ((T.sk[1] + T.sk[2]) / 2) * g.dlzka;
    const bok = new THREE.MeshStandardMaterial({ color: sl.lampa, emissive: sl.lampa, emissiveIntensity: 0.25, roughness: 0.4 });
    const napis = new THREE.MeshStandardMaterial({ map: textura(sl.text ?? 'TAXI', sl.lampa, sl.pismo ?? '#111', 0.62, 0.2), roughness: 0.4 });
    mat.push(bok, napis);
    // lampa naprieč strechou, nápis dopredu a dozadu
    const box = new THREE.BoxGeometry(0.62, 0.2, 0.24);
    box.translate(0, g.vyska + 0.1, zs);
    // skupiny BoxGeometry: ±x, ±y (bok), ±z (nápis) – po 6 vrcholov na stenu
    kusy.push(box.toNonIndexed()); skupiny.push([[0, 24, 0], [24, 36, 1]]);
  }
  if (sl.pruh) {
    const d = g.dlzka * 0.58;
    const m = new THREE.MeshStandardMaterial({ map: textura(sl.pruhText ?? '', sl.pruh, sl.pismo ?? '#fff', d, 0.18), roughness: 0.5 });
    mat.push(m);
    for (const x of [-1, 1]) {
      const p = new THREE.PlaneGeometry(d, 0.18);
      p.rotateY(x * Math.PI / 2);
      p.translate(x * (g.sirka / 2 + 0.012), T.P - 0.26, 0.05);
      kusy.push(p.toNonIndexed()); skupiny.push([[0, 6, mat.length - 1]]);
    }
  }
  if (!kusy.length) return null;
  // zlúčenie so skupinami materiálov
  const geo = mergeGeometries(kusy.map((k) => { const c = k.clone(); c.clearGroups(); return c; }), false);
  geo.clearGroups();
  let start = 0;
  kusy.forEach((k, i) => {
    const n = k.getAttribute('position').count;
    for (const [a, b, mi] of skupiny[i]) geo.addGroup(start + a, b - a, mi);
    start += n;
  });
  geo.computeBoundingSphere();
  return { geo, mat };
}

