// Modely hoverboardu a onewheelu (issue #97): pár stoviek trojuholníkov, farby vo vrcholoch, jeden materiál.
// Vozidlo hľadí na +z, zem je y = 0. Kolesá sú samostatné siete (otáčajú sa pri jazde).

import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export const ROZMERY_D = {
  hoverboard: { doska: 0.12, stopy: 0.16, r: 0.085, os: 0.27 },   // stopy = x chodidiel, os = x kolies
  onewheel: { doska: 0.2, stopy: 0.24, r: 0.145 },                 // stopy = z chodidiel (vpredu / vzadu)
};

const F = {
  telo: new THREE.Color('#f2f2f0'),
  tmava: new THREE.Color('#202224'),
  guma: new THREE.Color('#121212'),
  kov: new THREE.Color('#8d9399'),
  led: new THREE.Color('#7fe3ff'),
  oranzova: new THREE.Color('#ff7a1a'),
};

function farebna(geo, farba) {
  const g = geo.index ? geo.toNonIndexed() : geo;
  const n = g.attributes.position.count;
  const c = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { c[i * 3] = farba.r; c[i * 3 + 1] = farba.g; c[i * 3 + 2] = farba.b; }
  g.setAttribute('color', new THREE.BufferAttribute(c, 3));
  if (g.attributes.uv) g.deleteAttribute('uv');
  return g;
}
const kvader = (sx, sy, sz, x, y, z, farba) => farebna(new THREE.BoxGeometry(sx, sy, sz).translate(x, y, z), farba);
const koleso = (r, sirka, farbaDisku) => mergeGeometries([
  farebna(new THREE.CylinderGeometry(r, r, sirka, 16).rotateZ(Math.PI / 2), F.guma),
  farebna(new THREE.CylinderGeometry(r * 0.6, r * 0.6, sirka + 0.004, 10).rotateZ(Math.PI / 2), farbaDisku),
]);

let cache = null;
function geometrie() {
  if (cache) return cache;
  // hoverboard: dve stúpadlá s krytmi kolies, LED pás vpredu
  const H = ROZMERY_D.hoverboard;
  const hb = [];
  for (const s of [1, -1]) {
    hb.push(kvader(0.22, 0.07, 0.2, s * 0.13, H.doska - 0.035, 0, F.telo));
    hb.push(kvader(0.16, 0.008, 0.15, s * 0.13, H.doska + 0.002, 0, F.tmava));          // gumené stúpadlo
    hb.push(kvader(0.07, 0.1, 0.24, s * 0.255, H.r + 0.04, 0, F.telo));                 // kryt kolesa
    hb.push(kvader(0.004, 0.02, 0.16, s * 0.29, H.r + 0.02, 0, F.led));
  }
  hb.push(kvader(0.06, 0.06, 0.18, 0, H.doska - 0.04, 0, F.tmava));                     // stredový kĺb
  hb.push(kvader(0.36, 0.012, 0.006, 0, H.doska - 0.03, 0.101, F.led));
  const hoverTelo = mergeGeometries(hb);
  const hoverKoleso = koleso(H.r, 0.06, F.kov);

  // onewheel: doska s koleso v strede, blatníky, predné a zadné stúpadlo
  const O = ROZMERY_D.onewheel;
  const ow = [
    kvader(0.24, 0.035, 0.95, 0, O.doska - 0.02, 0, F.tmava),
    kvader(0.22, 0.008, 0.3, 0, O.doska + 0.001, 0.3, F.guma),       // predné stúpadlo (snímač)
    kvader(0.22, 0.008, 0.3, 0, O.doska + 0.001, -0.3, F.guma),      // zadné stúpadlo
    kvader(0.26, 0.04, 0.32, 0, O.doska + 0.02, 0, F.oranzova),      // blatník nad kolesom
    kvader(0.03, 0.08, 0.95, 0.125, O.doska - 0.05, 0, F.kov),       // bočnice
    kvader(0.03, 0.08, 0.95, -0.125, O.doska - 0.05, 0, F.kov),
    kvader(0.2, 0.03, 0.04, 0, O.doska - 0.02, 0.48, F.oranzova),    // nárazníky
    kvader(0.2, 0.03, 0.04, 0, O.doska - 0.02, -0.48, F.oranzova),
  ];
  const oneTelo = mergeGeometries(ow);
  const oneKoleso = koleso(O.r, 0.17, F.kov);

  const celyHover = mergeGeometries([hoverTelo, hoverKoleso.clone().translate(H.os, H.r, 0), hoverKoleso.clone().translate(-H.os, H.r, 0)]);
  const celyOne = mergeGeometries([oneTelo, oneKoleso.clone().translate(0, O.r, 0)]);
  for (const g of [hoverTelo, hoverKoleso, oneTelo, oneKoleso, celyHover, celyOne]) { g.computeVertexNormals(); g.userData.zdielane = true; }
  cache = { hoverTelo, hoverKoleso, oneTelo, oneKoleso, celyHover, celyOne };
  return cache;
}

let material = null;
export function materialDosky() {
  material ??= new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.45, metalness: 0.1 });
  return material;
}
export const geometriaHoverboardu = () => geometrie().celyHover;
export const geometriaOnewheelu = () => geometrie().celyOne;

function skupina(meno, telo, kolesa) {
  const g = new THREE.Group();
  g.name = meno;
  const mat = materialDosky();
  const t = new THREE.Mesh(telo, mat);
  t.castShadow = t.receiveShadow = true;
  g.add(t);
  g.userData.kolesa = kolesa.map(([geo, x, y, r]) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, 0);
    m.castShadow = true;
    g.add(m);
    return [m, r];
  });
  return g;
}

export function vytvorModelHoverboardu() {
  const g = geometrie(), H = ROZMERY_D.hoverboard;
  return skupina('hoverboard', g.hoverTelo, [[g.hoverKoleso, H.os, H.r, H.r], [g.hoverKoleso, -H.os, H.r, H.r]]);
}
export function vytvorModelOnewheelu() {
  const g = geometrie(), O = ROZMERY_D.onewheel;
  return skupina('onewheel', g.oneTelo, [[g.oneKoleso, 0, O.r, O.r]]);
}
