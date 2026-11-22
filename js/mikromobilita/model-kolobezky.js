// Model elektrickej kolobežky (zdieľaná kolobežka vymyslenej firmy „Fičák“ – zelená, issue #97).
// Pár stoviek trojuholníkov, farby vo vrcholoch (jeden materiál). Kolobežka hľadí na +z, zem je y = 0.
//   telo()   – rám, doska, riadidlá, svetlo, blatník (bez kolies)
//   koleso() – koleso s osou v x (otáča sa pri jazde)
//   cela()   – telo + kolesá v jednej geometrii (odstavené kolobežky ako InstancedMesh)

import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export const ROZMERY = {
  doska: 0.155,          // m – horná plocha dosky nad zemou (tu stoja nohy)
  riadidla: 1.03,        // m – výška riadidiel
  riadidlaZ: 0.37,       // m – riadidlá pred stredom dosky
  sirkaRiadidiel: 0.5,
  kolesoP: { z: 0.42, r: 0.115 },
  kolesoZ: { z: -0.4, r: 0.1 },
};

const FARBY = {
  zelena: new THREE.Color('#2dbe6c'),
  tmava: new THREE.Color('#25282b'),
  guma: new THREE.Color('#141414'),
  kov: new THREE.Color('#8d9399'),
  biela: new THREE.Color('#e8ece9'),
  svetlo: new THREE.Color('#fff6d8'),
  odrazka: new THREE.Color('#c0262b'),
};

/** Geometria s farbou vrcholov. */
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

/** Valec medzi dvoma bodmi. */
function trubka(a, b, r, farba, segmenty = 8) {
  const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b);
  const d = B.clone().sub(A);
  const g = new THREE.CylinderGeometry(r, r, d.length(), segmenty, 1, true);
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.clone().normalize()));
  g.translate((A.x + B.x) / 2, (A.y + B.y) / 2, (A.z + B.z) / 2);
  return farebna(g, farba);
}

let cache = null;
function geometrie() {
  if (cache) return cache;
  const R = ROZMERY;
  const casti = [];
  // doska (tmavá s gumenou vrchnou vrstvou) a zelený bočný pás
  casti.push(kvader(0.16, 0.045, 0.64, 0, R.doska - 0.03, -0.02, FARBY.tmava));
  casti.push(kvader(0.15, 0.008, 0.6, 0, R.doska - 0.004, -0.02, FARBY.guma));
  casti.push(kvader(0.165, 0.016, 0.56, 0, R.doska - 0.045, -0.02, FARBY.zelena));
  // zadný blatník s odrazkou
  casti.push(kvader(0.07, 0.012, 0.2, 0, R.kolesoZ.r * 2 + 0.02, R.kolesoZ.z + 0.02, FARBY.tmava));
  casti.push(kvader(0.05, 0.03, 0.012, 0, R.kolesoZ.r * 2 + 0.0, R.kolesoZ.z - 0.08, FARBY.odrazka));
  // krk dosky k stĺpiku
  casti.push(trubka([0, R.doska - 0.03, 0.28], [0, 0.2, R.kolesoP.z - 0.06], 0.03, FARBY.tmava));
  // stĺpik riadidiel (zelený, mierne naklonený k jazdcovi) a vidlica k prednému kolesu
  const hore = [0, R.riadidla, R.riadidlaZ], dole = [0, 0.2, R.kolesoP.z - 0.04];
  casti.push(trubka(dole, hore, 0.024, FARBY.zelena, 10));
  casti.push(trubka([0.03, R.kolesoP.r, R.kolesoP.z], [0.025, 0.24, R.kolesoP.z - 0.04], 0.012, FARBY.kov, 6));
  casti.push(trubka([-0.03, R.kolesoP.r, R.kolesoP.z], [-0.025, 0.24, R.kolesoP.z - 0.04], 0.012, FARBY.kov, 6));
  // predný blatník
  casti.push(kvader(0.06, 0.01, 0.16, 0, R.kolesoP.r * 2 + 0.02, R.kolesoP.z + 0.01, FARBY.tmava));
  // riadidlá s gripmi, displej a zvonček
  const s = R.sirkaRiadidiel / 2;
  casti.push(trubka([-s + 0.09, R.riadidla, R.riadidlaZ], [s - 0.09, R.riadidla, R.riadidlaZ], 0.014, FARBY.tmava));
  casti.push(trubka([-s, R.riadidla, R.riadidlaZ], [-s + 0.11, R.riadidla, R.riadidlaZ], 0.02, FARBY.guma));
  casti.push(trubka([s - 0.11, R.riadidla, R.riadidlaZ], [s, R.riadidla, R.riadidlaZ], 0.02, FARBY.guma));
  casti.push(kvader(0.07, 0.02, 0.05, 0, R.riadidla + 0.02, R.riadidlaZ - 0.01, FARBY.tmava));
  casti.push(kvader(0.05, 0.004, 0.032, 0, R.riadidla + 0.031, R.riadidlaZ - 0.01, FARBY.biela));
  // svetlo na stĺpiku a zelená tabuľka s číslom (biely pás)
  casti.push(kvader(0.05, 0.035, 0.03, 0, 0.86, R.riadidlaZ + 0.035, FARBY.svetlo));
  casti.push(kvader(0.07, 0.16, 0.012, 0, 0.6, R.riadidlaZ + 0.0, FARBY.zelena));
  casti.push(kvader(0.074, 0.03, 0.013, 0, 0.62, R.riadidlaZ + 0.0, FARBY.biela));
  const telo = mergeGeometries(casti);

  const koleso = (r) => {
    const pneu = farebna(new THREE.CylinderGeometry(r, r, 0.055, 14).rotateZ(Math.PI / 2), FARBY.guma);
    const disk = farebna(new THREE.CylinderGeometry(r * 0.62, r * 0.62, 0.06, 10).rotateZ(Math.PI / 2), FARBY.kov);
    return mergeGeometries([pneu, disk]);
  };
  const kolesoP = koleso(R.kolesoP.r), kolesoZ = koleso(R.kolesoZ.r);
  const cela = mergeGeometries([
    telo,
    kolesoP.clone().translate(0, R.kolesoP.r, R.kolesoP.z),
    kolesoZ.clone().translate(0, R.kolesoZ.r, R.kolesoZ.z),
  ]);
  for (const g of [telo, kolesoP, kolesoZ, cela]) { g.computeVertexNormals(); g.userData.zdielane = true; }
  cache = { telo, kolesoP, kolesoZ, cela };
  return cache;
}

let material = null;
export function materialKolobezky() {
  material ??= new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.55, metalness: 0.15 });
  return material;
}

/** Celá kolobežka v jednej geometrii (odstavené – InstancedMesh). */
export function geometriaCela() { return geometrie().cela; }

/**
 * Kolobežka na jazdu: skupina s telom a dvoma kolesami (userData.kolesa – otáčajú sa podľa rýchlosti).
 * Koreň je na zemi pod stredom dosky.
 */
export function vytvorModelKolobezky() {
  const g = geometrie();
  const mat = materialKolobezky();
  const skupina = new THREE.Group();
  skupina.name = 'kolobezka';
  const telo = new THREE.Mesh(g.telo, mat);
  const kp = new THREE.Mesh(g.kolesoP, mat), kz = new THREE.Mesh(g.kolesoZ, mat);
  kp.position.set(0, ROZMERY.kolesoP.r, ROZMERY.kolesoP.z);
  kz.position.set(0, ROZMERY.kolesoZ.r, ROZMERY.kolesoZ.z);
  for (const m of [telo, kp, kz]) { m.castShadow = true; m.receiveShadow = true; skupina.add(m); }
  skupina.userData.kolesa = [[kp, ROZMERY.kolesoP.r], [kz, ROZMERY.kolesoZ.r]];
  return skupina;
}
