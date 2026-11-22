// Model mestského bicykla (issue #97): rám v kóde, kolesá s výpletom, sedlo, riadidlá, kľuky s pedálmi,
// blatníky a nosič. Farby vo vrcholoch (jeden materiál); rám je biely – farbu dá farba inštancie / farba rámu.
// Bicykel hľadí na +z, zem je y = 0.
//   telo(farba) – rám, vidlica, sedlo, riadidlá, blatníky, nosič (bez kolies a kľúk)
//   koleso()    – koleso s osou v x; klukyGeo() – stredová os, kľuky a pedále (otáčajú sa okolo osi x)
//   cela()      – všetko v jednej geometrii (odstavené bicykle ako InstancedMesh)

import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export const ROZMERY_B = {
  r: 0.34,                 // m – polomer kolesa (28")
  zadna: -0.52, predna: 0.53,
  stred: [0, 0.29, 0],     // stredová os (kľuky)
  kluka: 0.17,
  pedal: 0.105,            // m – pedál od stredu do strany
  sedlo: [0, 0.94, -0.2],  // vrch sedla
  riadidla: [0, 1.04, 0.36],
  sirkaRiadidiel: 0.58,
};

const F = {
  ram: new THREE.Color('#ffffff'),
  guma: new THREE.Color('#151515'),
  kov: new THREE.Color('#9aa0a6'),
  tmava: new THREE.Color('#2a2b2d'),
  sedlo: new THREE.Color('#3b2a20'),
  odrazka: new THREE.Color('#c0262b'),
  svetlo: new THREE.Color('#fff6d8'),
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
function trubka(a, b, r, farba, seg = 6) {
  const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b), d = B.clone().sub(A);
  const g = new THREE.CylinderGeometry(r, r, d.length(), seg, 1, true);
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.clone().normalize()));
  g.translate((A.x + B.x) / 2, (A.y + B.y) / 2, (A.z + B.z) / 2);
  return farebna(g, farba);
}

let cache = null;
function geometrie() {
  if (cache) return cache;
  const R = ROZMERY_B, y = R.r;
  const zad = [0, y, R.zadna], pred = [0, y, R.predna], st = R.stred;
  const sedlovka = [0, 0.82, -0.16], hlavaH = [0, 0.86, 0.39], hlavaD = [0, 0.66, 0.44];
  const c = [];
  // rám (dámsky/mestský – nízka horná rúrka), vidlica, hlavová rúrka
  c.push(trubka(st, sedlovka, 0.019, F.ram));
  c.push(trubka(st, hlavaD, 0.022, F.ram));
  c.push(trubka([0, 0.55, -0.1], [0, 0.78, 0.41], 0.017, F.ram));
  c.push(trubka(hlavaD, hlavaH, 0.022, F.ram));
  for (const s of [1, -1]) {
    c.push(trubka([0.04 * s, y, R.zadna], [0.02 * s, st[1], -0.02], 0.011, F.ram));        // zadná stavba dole
    c.push(trubka([0.04 * s, y, R.zadna], [0.015 * s, 0.78, -0.15], 0.01, F.ram));        // zadná stavba hore
    c.push(trubka([0.035 * s, y, R.predna], [0.02 * s, 0.66, 0.44], 0.012, F.ram));       // vidlica
  }
  // sedlovka a sedlo
  c.push(trubka(sedlovka, [0, R.sedlo[1] - 0.04, R.sedlo[2] + 0.01], 0.012, F.kov));
  c.push(kvader(0.15, 0.05, 0.24, 0, R.sedlo[1] - 0.025, R.sedlo[2], F.sedlo));
  // predstavec a riadidlá (mierne zahnuté dozadu), gripy, zvonček
  const rh = R.riadidla, s2 = R.sirkaRiadidiel / 2;
  c.push(trubka(hlavaH, [0, rh[1], rh[2] + 0.03], 0.013, F.kov));
  c.push(trubka([-s2 + 0.1, rh[1], rh[2]], [s2 - 0.1, rh[1], rh[2]], 0.012, F.kov));
  for (const s of [1, -1]) c.push(trubka([s * (s2 - 0.12), rh[1], rh[2]], [s * s2, rh[1], rh[2] - 0.06], 0.018, F.guma));
  // blatníky, nosič, svetlo, odrazka
  c.push(kvader(0.07, 0.01, 0.5, 0, y + R.r + 0.03, R.zadna + 0.02, F.tmava));
  c.push(kvader(0.07, 0.01, 0.4, 0, y + R.r + 0.03, R.predna + 0.04, F.tmava));
  c.push(kvader(0.15, 0.015, 0.34, 0, 0.8, R.zadna + 0.08, F.tmava));
  for (const s of [1, -1]) c.push(trubka([0.06 * s, 0.8, R.zadna - 0.06], [0.04 * s, y, R.zadna], 0.008, F.tmava));
  c.push(kvader(0.07, 0.05, 0.04, 0, 0.82, 0.46, F.svetlo));
  c.push(kvader(0.06, 0.03, 0.012, 0, 0.78, R.zadna - 0.1, F.odrazka));
  // stojan (sklopený dozadu)
  c.push(trubka([0.04, 0.29, -0.1], [0.12, 0.02, -0.36], 0.009, F.kov));
  const telo = mergeGeometries(c);

  // koleso: plášť, ráfik, náboj a 8 výpletov
  const kolesoCasti = [
    farebna(new THREE.TorusGeometry(R.r - 0.018, 0.02, 6, 28).rotateY(Math.PI / 2), F.guma),
    farebna(new THREE.TorusGeometry(R.r - 0.045, 0.008, 4, 28).rotateY(Math.PI / 2), F.kov),
    farebna(new THREE.CylinderGeometry(0.025, 0.025, 0.09, 8).rotateZ(Math.PI / 2), F.kov),
  ];
  for (let i = 0; i < 8; i++) {
    const u = (i / 8) * Math.PI * 2;
    kolesoCasti.push(trubka([0, 0, 0], [0, Math.cos(u) * (R.r - 0.05), Math.sin(u) * (R.r - 0.05)], 0.003, F.kov, 3));
  }
  const koleso = mergeGeometries(kolesoCasti);

  // kľuky a pedále (stred v (0,0,0) – otáča sa okolo x), prevodník
  const k = R.kluka, p = R.pedal;
  const kluky = mergeGeometries([
    farebna(new THREE.CylinderGeometry(0.1, 0.1, 0.008, 16).rotateZ(Math.PI / 2).translate(-0.05, 0, 0), F.kov),
    trubka([0.07, 0, 0], [0.07, -k, 0], 0.012, F.tmava, 5),
    trubka([-0.07, 0, 0], [-0.07, k, 0], 0.012, F.tmava, 5),
    kvader(0.07, 0.02, 0.1, p, -k, 0, F.tmava),
    kvader(0.07, 0.02, 0.1, -p, k, 0, F.tmava),
  ]);
  const cela = mergeGeometries([
    telo,
    koleso.clone().translate(0, y, R.zadna),
    koleso.clone().translate(0, y, R.predna),
    kluky.clone().translate(...st),
  ]);
  for (const g of [telo, koleso, kluky, cela]) { g.computeVertexNormals(); g.userData.zdielane = true; }
  cache = { telo, koleso, kluky, cela };
  return cache;
}

let material = null;
function materialBicykla() {
  material ??= new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.5, metalness: 0.2 });
  return material;
}

/** Celý bicykel v jednej geometrii (odstavené – InstancedMesh, farba rámu = farba inštancie). */
export function geometriaCelaB() { return geometrie().cela; }
export { materialBicykla };

/** Bicykel na jazdu: telo (farba rámu cez materiál), kolesá a kľuky ako samostatné siete. */
export function vytvorModelBicykla(farba = '#2f6db5') {
  const g = geometrie();
  const R = ROZMERY_B;
  const skupina = new THREE.Group();
  skupina.name = 'bicykel';
  const matTelo = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.45, metalness: 0.25, color: farba });
  const telo = new THREE.Mesh(g.telo, matTelo);
  const mat = materialBicykla();
  const kz = new THREE.Mesh(g.koleso, mat), kp = new THREE.Mesh(g.koleso, mat), kl = new THREE.Mesh(g.kluky, mat);
  kz.position.set(0, R.r, R.zadna); kp.position.set(0, R.r, R.predna); kl.position.set(...R.stred);
  for (const m of [telo, kz, kp, kl]) { m.castShadow = true; m.receiveShadow = true; skupina.add(m); }
  skupina.userData.kolesa = [[kp, R.r], [kz, R.r]];
  skupina.userData.kluky = kl;
  return skupina;
}
