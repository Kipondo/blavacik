// Most z Blendera: assets/pamiatky/<subor>.glb.gz + <subor>.json (generátory v tools/blender/mosty/).
// Model je v lokálnych súradniciach mosta: x pozdĺž osi od bodu „od“ po „do“ (z data/mapa/mesto/index.json),
// y = 0 je vrch mostovky. Postaví sa na výšku mostovky a v nábehoch (koncoch mosta) sa časti pri
// mostovke ohnú podľa výškového profilu (vyskopis.vyska) – vysoké časti (pylón, oblúk) ostanú rovné.
//
// Záznam v data/mapa/pamiatky.json:
//   { "model": "most-glb", "subor": "most-snp", "nahradzaMost": "Most SNP", "nazov": "Most SNP a UFO", "x": …, "z": …, "dosah": 170 }
// „nahradzaMost“ = meno mosta v index.json; jeho všeobecný model (js/mapa/mosty/mosty.js) sa nestavia
// (js/mapa/mesto.js). Keď sa model nenačíta, postaví sa ten všeobecný.

import * as THREE from 'three';
import { nacitajModelPamiatky } from './model-glb.js';
import { vytvorMosty } from '../mosty/mosty.js';

const OHYB_DO = 12;     // do tejto výšky nad mostovkou sa časti ohýbajú s nábehom celé
const OHYB_NAD = 22;    // od tejto výšky už vôbec (medzi tým plynulo)
const VZDIALENOST_DETAILU = 320;

/** Geometrie modelu prevedie do súradníc koreňa (bez kvantovania) a ohne ich podľa profilu. */
function ohni(model, posun) {
  model.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(model.matrixWorld).invert();
  const vystup = new THREE.Group();
  model.traverse((o) => {
    if (!o.isMesh) return;
    const m = new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld);
    const g = new THREE.BufferGeometry();
    for (const meno of ['position', 'normal', 'color']) {
      const a = o.geometry.getAttribute(meno);
      if (!a) continue;
      const v = new Float32Array(a.count * a.itemSize);
      for (let i = 0; i < a.count; i++) for (let k = 0; k < a.itemSize; k++) v[i * a.itemSize + k] = a.getComponent(i, k);
      g.setAttribute(meno, new THREE.BufferAttribute(v, a.itemSize));
    }
    if (o.geometry.index) g.setIndex(o.geometry.index.clone());
    g.applyMatrix4(m);
    const p = g.getAttribute('position');
    for (let i = 0; i < p.count; i++) {
      const y = p.getY(i);
      const w = y <= OHYB_DO ? 1 : y >= OHYB_NAD ? 0 : (OHYB_NAD - y) / (OHYB_NAD - OHYB_DO);
      if (w > 0) p.setY(i, y + w * posun(p.getX(i)));
    }
    g.computeBoundingSphere();
    const mesh = new THREE.Mesh(g, o.material);
    mesh.castShadow = mesh.receiveShadow = true;
    vystup.add(mesh);
  });
  return vystup;
}

function sUrovnami(model) {
  const daleko = new THREE.Group();
  for (const o of model.children) {
    const m = Array.isArray(o.material) ? o.material : [o.material];
    if (!m.every((x) => x.name.startsWith('detail'))) daleko.add(new THREE.Mesh(o.geometry, o.material));
  }
  daleko.traverse((o) => { if (o.isMesh) o.castShadow = o.receiveShadow = true; });
  const lod = new THREE.LOD();
  lod.addLevel(model, 0);
  lod.addLevel(daleko, VZDIALENOST_DETAILU);
  lod.autoUpdate = true;
  return lod;
}

export default async function postav(p, { vyskopis, kolizie, KONFIG }) {
  const m = vyskopis.mosty?.find((x) => x.nazov === p.nahradzaMost);
  if (!m) return null;
  const info = await fetch(`assets/pamiatky/${p.subor}.json`).then((r) => (r.ok ? r.json() : null)).catch(() => null);
  const ax = m.ax ?? m.od[0], az = m.az ?? m.od[1];
  const bx = m.bx ?? m.do[0], bz = m.bz ?? m.do[1];
  const L = Math.hypot(bx - ax, bz - az);
  const ux = (bx - ax) / L, uz = (bz - az) / L;
  const vrch = m.vrch ?? m.vyska;
  const g = new THREE.Group();
  g.position.set(ax, vrch, az);
  g.rotation.y = Math.atan2(-uz, ux);

  // kolízie (pylóny, piliere na brehu, kotvy): lokálne x pozdĺž, y doľava (Blender) → svet
  const svet = ([x, y]) => [ax + ux * x + uz * y, az + uz * x - ux * y];
  for (const k of info?.kolizie ?? []) kolizie.pridajPolygon(k.map(svet), { typ: 'pamiatka', nazov: p.nazov });

  const zalozny = () => g.add(vytvorMosty([m], vyskopis, KONFIG));
  if (!info) { zalozny(); g.position.set(0, 0, 0); g.rotation.y = 0; return { objekt: g }; }
  nacitajModelPamiatky(p.subor, { ao: false, gz: true }).then((model) => {
    if (!model) {
      g.position.set(0, 0, 0); g.rotation.y = 0;
      zalozny();
      return;
    }
    const posun = (s) => {
      const t = Math.max(0, Math.min(L, s));
      return vyskopis.vyska(ax + ux * t, az + uz * t) - vrch;
    };
    g.add(sUrovnami(ohni(model, posun)));
  });
  return { objekt: g };
}
