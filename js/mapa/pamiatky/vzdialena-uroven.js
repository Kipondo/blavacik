// Vzdialená úroveň modelov z Blendera (#110): model má jednu sieť na materiál (gltfpack), takže veľká stavba
// (Eurovea, univerzita, výškové budovy) aj zo 600 m kreslila desiatky volaní. Zďaleka sa farba materiálu zapečie
// do farieb vrcholov (spolu so zapečeným zatienením AO) a nepriehľadné časti s podobným povrchom sa spoja
// do jednej siete – namiesto 30–50 volaní na stavbu len pár.
//   – drobné prvky (materiály „detail…“) sa zďaleka vynechajú ako doteraz,
//   – sklo („sklo…“) sa spojí zvlášť (nočné okná – js/mapa/pamiatky/sklo-noc.js),
//   – svetlá (emisívne), textúrované a priehľadné materiály ostávajú samostatné siete s pôvodným materiálom.

import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { nocneSkloModelu } from './sklo-noc.js';

const jeDetail = (m) => (m.name ?? '').startsWith('detail');
const jeSklo = (m) => (m.name ?? '').startsWith('sklo');

/** Materiál, ktorý sa nedá nahradiť farbou vo vrcholoch (textúra, priehľadnosť, svetlo). */
function samostatny(m) {
  return !m.isMeshStandardMaterial || !!m.map || m.transparent || m.alphaTest > 0 || (m.emissive && m.emissive.getHex() !== 0);
}

/** Skupina spájaných sietí: sklo zvlášť, ostatné podľa kovovosti, drsnosti a strany (zďaleka stačí približne). */
function skupinaMaterialu(m) {
  if (jeSklo(m)) return `sklo|${m.side}`;
  return `${m.metalness >= 0.35 ? 1 : 0}|${m.roughness >= 0.45 ? 1 : 0}|${m.side}`;
}

/** Geometria siete v súradniciach koreňa modelu (Float32 bez kvantovania): poloha, normála a farba = farba materiálu × AO. */
function zapecenaGeometria(o, m, matica) {
  const g0 = o.geometry;
  const p = g0.getAttribute('position'), n = g0.getAttribute('normal');
  const c = m.vertexColors ? g0.getAttribute('color') : null;
  const N = p.count;
  const P = new Float32Array(N * 3), Nr = n ? new Float32Array(N * 3) : null, C = new Float32Array(N * 3);
  const { r, g, b } = m.color;
  for (let i = 0; i < N; i++) {
    const k = i * 3;
    P[k] = p.getX(i); P[k + 1] = p.getY(i); P[k + 2] = p.getZ(i);
    if (Nr) { Nr[k] = n.getX(i); Nr[k + 1] = n.getY(i); Nr[k + 2] = n.getZ(i); }
    C[k] = r * (c ? c.getX(i) : 1); C[k + 1] = g * (c ? c.getY(i) : 1); C[k + 2] = b * (c ? c.getZ(i) : 1);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(P, 3));
  if (Nr) geo.setAttribute('normal', new THREE.BufferAttribute(Nr, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(C, 3));
  if (g0.index) geo.setIndex(new THREE.BufferAttribute(Uint32Array.from(g0.index.array), 1));
  else geo.setIndex(new THREE.BufferAttribute(Uint32Array.from({ length: N }, (_, i) => i), 1));
  geo.applyMatrix4(matica);
  if (!Nr) geo.computeVertexNormals();
  return geo;
}

/** Materiál spojenej skupiny: farba je vo vrcholoch, povrch je priemer členov (sklo = kópia prvého skla s nočnými oknami). */
function materialSkupiny(clenovia) {
  const vzor = clenovia[0];
  if (jeSklo(vzor)) {
    const m = vzor.clone();
    m.name = 'sklo-zdiaľky';
    m.vertexColors = true;
    m.color.setRGB(1, 1, 1);
    delete m.userData.noc;
    nocneSkloModelu(m);
    return m;
  }
  const priemer = (k) => clenovia.reduce((s, x) => s + x[k], 0) / clenovia.length;
  return new THREE.MeshStandardMaterial({
    name: 'zdiaľky', vertexColors: true, side: vzor.side,
    roughness: priemer('roughness'), metalness: priemer('metalness'), envMapIntensity: priemer('envMapIntensity'),
  });
}

/**
 * Vzdialená úroveň modelu (THREE.Group v súradniciach koreňa modelu): spojené siete so zapečenou farbou
 * a samostatné siete, ktoré sa spojiť nedajú. Siete s materiálmi „detail…“ vynechá.
 */
export function vzdialenaUroven(model) {
  model.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(model.matrixWorld).invert();
  const vystup = new THREE.Group();
  vystup.name = 'zdiaľky';
  const skupiny = new Map();
  model.traverse((o) => {
    if (!o.isMesh || !o.geometry?.getAttribute('position') || o.userData.tienovyZastupca) return;
    const mats = Array.isArray(o.material) ? o.material : [o.material];
    if (mats.every(jeDetail)) return;
    const matica = new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld);
    if (mats.length > 1 || samostatny(mats[0])) {
      const k = new THREE.Mesh(o.geometry, o.material);
      matica.decompose(k.position, k.quaternion, k.scale);
      k.castShadow = k.receiveShadow = true;
      vystup.add(k);
      return;
    }
    const kluc = skupinaMaterialu(mats[0]);
    if (!skupiny.has(kluc)) skupiny.set(kluc, { geo: [], mat: [] });
    const s = skupiny.get(kluc);
    s.geo.push(zapecenaGeometria(o, mats[0], matica));
    if (!s.mat.includes(mats[0])) s.mat.push(mats[0]);
  });
  for (const { geo, mat } of skupiny.values()) {
    const spojena = geo.length === 1 ? geo[0] : mergeGeometries(geo, false);
    if (geo.length > 1) for (const g of geo) g.dispose();
    if (!spojena) continue;
    const m = new THREE.Mesh(spojena, materialSkupiny(mat));
    m.castShadow = m.receiveShadow = true;
    vystup.add(m);
  }
  return vystup;
}
