// Strechy budov z laserového skenovania (LOD2): roviny striech, ploché časti a štíty.
// Dáta: data/mapa/mesto/strechy/<i>_<j>.bin (vyrába tools/mesto/laser/budovy.py, číta js/mapa/dlazdice/doplnky.js)
//   { sikme: {p, uv, c, i}, ploche: {…}, steny: {…}, kominy } – p v súradniciach hry, uv v metroch,
//   c = lineárny odtieň (násobí textúru), i = indexy trojuholníkov (vrcholy sa medzi plochami nezdieľajú).
// Materiály sú CC0 textúry z ambientCG (assets/textury/LICENSE.md).

import * as THREE from 'three';

const TEXTURY = {
  sikme: { priecinok: 'skridla', velkost: 2.2, drsnost: 0.85 },
  ploche: { priecinok: 'strk', velkost: 1.6, drsnost: 0.95 },
  steny: { priecinok: 'omietka', velkost: 3.0, drsnost: 0.9 },
};

let materialy = null;
function ziskajMaterialy() {
  if (materialy) return materialy;
  const loader = new THREE.TextureLoader();
  const nacitaj = (cesta, velkost, srgb) => {
    const t = loader.load(cesta);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(1 / velkost, 1 / velkost);
    t.anisotropy = 8;
    if (srgb) t.colorSpace = THREE.SRGBColorSpace;
    return t;
  };
  materialy = {};
  for (const [druh, { priecinok, velkost, drsnost }] of Object.entries(TEXTURY)) {
    const z = `assets/textury/${priecinok}/`;
    materialy[druh] = new THREE.MeshStandardMaterial({
      map: nacitaj(z + 'farba.jpg', velkost, true),
      normalMap: nacitaj(z + 'normal.jpg', velkost, false),
      roughnessMap: nacitaj(z + 'drsnost.jpg', velkost, false),
      roughness: drsnost,
      vertexColors: true,
      side: THREE.DoubleSide,   // štíty a hrany striech vidno z oboch strán
    });
  }
  materialy.sikme.normalScale.set(1.2, 1.2);
  return materialy;
}

let kominGeo = null, kominMat = null;
const FARBY_KOMINOV = ['#b07a62', '#9c6b56', '#c9bfb2', '#a39a8e', '#8d5a47'].map((c) => new THREE.Color(c));

/** Komíny (nájdené laserom ako malé výstupky nad strechou) – jedna inštancovaná sieť na dlaždicu. */
function vytvorKominy(kominy) {
  if (!kominGeo) {
    // telo komína + mierne širšia hlava
    const telo = new THREE.BoxGeometry(1, 1, 1); telo.translate(0, 0.5, 0);
    const hlava = new THREE.BoxGeometry(1.18, 0.12, 1.18); hlava.translate(0, 0.96, 0);
    const spoj = (a, b) => {
      const g = new THREE.BufferGeometry();
      for (const k of ['position', 'normal', 'uv']) {
        g.setAttribute(k, new THREE.Float32BufferAttribute([...a.toNonIndexed().attributes[k].array, ...b.toNonIndexed().attributes[k].array], a.attributes[k].itemSize));
      }
      return g;
    };
    kominGeo = spoj(telo, hlava);
    kominGeo.userData.zdielane = true;
    kominMat = new THREE.MeshStandardMaterial({ roughness: 0.9 });
  }
  const m = new THREE.InstancedMesh(kominGeo, kominMat, kominy.length);
  const mat = new THREE.Matrix4(), q = new THREE.Quaternion(), os = new THREE.Vector3(0, 1, 0);
  kominy.forEach(([x, z, y0, y1, w, d, uhol], i) => {
    q.setFromAxisAngle(os, -uhol);
    mat.compose(new THREE.Vector3(x, y0, z), q, new THREE.Vector3(w, Math.max(0.5, y1 - y0), d));
    m.setMatrixAt(i, mat);
    m.setColorAt(i, FARBY_KOMINOV[(Math.abs(Math.round(x * 3 + z * 7))) % FARBY_KOMINOV.length]);
  });
  m.castShadow = true; m.receiveShadow = true;
  m.name = 'kominy';
  return m;
}

/** Sieť striech jednej dlaždice (skupina troch sietí podľa materiálu). */
export function vytvorStrechyLod2(data) {
  const skupina = new THREE.Group();
  skupina.name = 'strechy-lod2';
  if (!data) return skupina;
  const mat = ziskajMaterialy();
  for (const druh of ['sikme', 'ploche', 'steny']) {
    const d = data[druh];
    if (!d?.p?.length) continue;
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(d.p, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(d.uv, 2));
    g.setAttribute('color', new THREE.Float32BufferAttribute(d.c, 3));
    if (d.i) g.setIndex(new THREE.BufferAttribute(d.i, 1));
    g.computeVertexNormals();
    g.computeBoundingSphere();
    const m = new THREE.Mesh(g, mat[druh]);
    m.castShadow = true;
    m.receiveShadow = true;
    m.name = `strechy-${druh}`;
    skupina.add(m);
  }
  if (data.kominy?.length) skupina.add(vytvorKominy(data.kominy));
  return skupina;
}
