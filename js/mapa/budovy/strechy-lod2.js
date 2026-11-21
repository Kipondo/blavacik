// Strechy budov z laserového skenovania (LOD2): roviny striech, ploché časti a štíty.
// Dáta: data/mapa/mesto/strechy/<i>_<j>.bin (vyrába tools/mesto/laser/budovy.py, číta js/mapa/dlazdice/doplnky.js)
//   { sikme: {p, uv, c, i}, ploche: {…}, steny: {…}, okna: {…}, kominy } – p v súradniciach hry, uv v metroch,
//   steny = štítové steny medzi budovami, okna = ustúpené podlažia a nadstavby (s oknami, okna-ustupenych.js),
//   c = lineárny odtieň (násobí textúru), i = indexy trojuholníkov (vrcholy sa medzi plochami nezdieľajú).
// Materiály sú CC0 textúry z ambientCG (assets/textury/LICENSE.md).

import * as THREE from 'three';
import { vNahradenom } from '../pamiatky/nahradene-budovy.js';
import { stenySOknami } from './okna-ustupenych.js';

const TEXTURY = {
  sikme: { priecinok: 'skridla', velkost: 2.2, drsnost: 0.85 },
  ploche: { priecinok: 'strk', velkost: 1.6, drsnost: 0.95 },
  steny: { priecinok: 'omietka', velkost: 3.0, drsnost: 0.9 },
  okna: { priecinok: 'omietka', velkost: 3.0, drsnost: 0.9 },
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

/**
 * Index trojuholníkov bez tých, ktorých stred leží v pôdoryse modelu pamiatky (Átriaky, Manderlák, obchodný dom…) –
 * laserová strecha by inak trčala z modelu. Vráti null, keď sa nič nevyhadzuje.
 */
function bezNahradenychTrojuholnikov(d) {
  const p = d.p;
  const pocet = d.i ? d.i.length / 3 : p.length / 9;
  const vrchol = (t, k) => (d.i ? d.i[t * 3 + k] : t * 3 + k);
  const ostava = [];
  let vyhodene = 0;
  for (let t = 0; t < pocet; t++) {
    const a = vrchol(t, 0), b = vrchol(t, 1), c = vrchol(t, 2);
    const x = (p[a * 3] + p[b * 3] + p[c * 3]) / 3, z = (p[a * 3 + 2] + p[b * 3 + 2] + p[c * 3 + 2]) / 3;
    if (vNahradenom(x, z)) { vyhodene++; continue; }
    ostava.push(a, b, c);
  }
  if (!vyhodene) return null;
  return p.length / 3 > 65535 ? new Uint32Array(ostava) : new Uint16Array(ostava);
}

/** Sieť striech jednej dlaždice (skupina troch sietí podľa materiálu). */
export function vytvorStrechyLod2(data) {
  const skupina = new THREE.Group();
  skupina.name = 'strechy-lod2';
  if (!data) return skupina;
  const mat = ziskajMaterialy();
  for (const druh of ['sikme', 'ploche', 'steny', 'okna']) {
    const d = data[druh];
    if (!d?.p?.length) continue;
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(d.p, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(d.uv, 2));
    g.setAttribute('color', new THREE.Float32BufferAttribute(d.c, 3));
    const index = bezNahradenychTrojuholnikov(d);
    if (index) g.setIndex(new THREE.BufferAttribute(index, 1));
    else if (d.i) g.setIndex(new THREE.BufferAttribute(d.i, 1));
    g.computeVertexNormals();
    g.computeBoundingSphere();
    // ustúpené podlažia a nadstavby dostanú okná – js/mapa/budovy/okna-ustupenych.js
    const m = druh === 'okna' ? stenySOknami(g, mat.okna) : new THREE.Mesh(g, mat[druh]);
    m.castShadow = true;
    m.receiveShadow = true;
    m.name = `strechy-${druh}`;
    skupina.add(m);
  }
  const kominy = (data.kominy ?? []).filter(([x, z]) => !vNahradenom(x, z));
  if (kominy.length) skupina.add(vytvorKominy(kominy));
  return skupina;
}
