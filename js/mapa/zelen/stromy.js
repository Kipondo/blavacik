// Stromy ako InstancedMesh, rozdelené do štvorcov (chunkov), aby sa vzdialené
// a neviditeľné skupiny stromov vôbec nevykresľovali.
// Formát v dátach: "stromy": [[x, z, mierka], ...] alebo z laserového skenovania
// [[x, z, mierka, výška, polomer koruny], ...] – strom má potom skutočnú výšku a šírku koruny.

import * as THREE from 'three';

const CHUNK = 250;
const DOHLAD = 650; // ďalej ako toto sa stromy skryjú (aj tak sú v hmle)
const CHUNK_BOHATE = 100;   // stromy z lasera: menšie skupiny kvôli LOD
const LOD_BLIZKO = 170;     // m – bližšie členitá koruna, ďalej jednoduchá

export function vytvorStromy(stromy, vyskopis, kolizie) {
  const skupina = new THREE.Group();
  skupina.name = 'stromy';
  if (!stromy?.length) return skupina;

  // stromy z lasera (výrez s detailom) dostanú členitejšiu korunu, ostatné jednoduchšiu (lesy majú tisíce stromov)
  const bohate = stromy[0]?.length >= 5;
  const { listnaty, ihlicnaty, kmenGeo } = geometrieStromov(bohate);
  const jednoduche = bohate ? geometrieStromov(false) : null;
  const matKmen = new THREE.MeshStandardMaterial({ color: '#5b4632', roughness: 1 });
  const matKoruna = materialKoruny(bohate);
  const matKorunaDaleko = bohate ? materialKoruny(false) : null;
  const velkostChunku = bohate ? CHUNK_BOHATE : CHUNK;

  const chunky = new Map();
  stromy.forEach((s, i) => {
    const k = `${Math.floor(s[0] / velkostChunku)},${Math.floor(s[1] / velkostChunku)}`;
    if (!chunky.has(k)) chunky.set(k, []);
    chunky.get(k).push([s, i]);
  });

  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const os = new THREE.Vector3(0, 1, 0);
  const farba = new THREE.Color();
  for (const zoznam of chunky.values()) {
    // ihličnany: z lasera podľa tvaru (úzka vysoká koruna), inak ~1/12 stromov (v meste prevládajú listnaté)
    const druhy = zoznam.map(([s, i]) => (s.length >= 5 ? (s[3] / (2 * s[4]) > 2.6 ? 1 : 0) : (i * 7919) % 12 === 0 ? 1 : 0));
    const pocetIhl = druhy.filter((d) => d).length;
    const kmene = new THREE.InstancedMesh(kmenGeo, matKmen, zoznam.length);
    const koruny = new THREE.InstancedMesh(listnaty, matKoruna, zoznam.length - pocetIhl);
    const ihlice = new THREE.InstancedMesh(ihlicnaty, matKoruna, Math.max(1, pocetIhl));
    ihlice.count = pocetIhl;
    // vzdialená úroveň (len pri stromoch z lasera): rovnaké stromy, jednoduchšia koruna
    const korunyD = jednoduche ? new THREE.InstancedMesh(jednoduche.listnaty, matKorunaDaleko, Math.max(1, zoznam.length - pocetIhl)) : null;
    // blízka úroveň: karty s listami okolo jadra koruny
    const listy = jednoduche ? new THREE.InstancedMesh(geometrieStromov(true).karty, materialListov(), Math.max(1, zoznam.length - pocetIhl)) : null;
    let sx = 0, sz = 0, kl = 0, ki = 0;
    zoznam.forEach(([[x, z, s = 1, h, r], i], j) => {
      const y = vyskopis.vyskaTerenu(x, z);
      q.setFromAxisAngle(os, (i * 2.399) % (Math.PI * 2));
      // laser: skutočná výška a polomer koruny (základný model: výška 7,4 m, polomer koruny 2,6 m)
      const mv = h ? h / 7.4 : s * (0.9 + (i % 5) * 0.06), mh = r ? r / 2.6 : s;
      m.compose(new THREE.Vector3(x, y, z), q, new THREE.Vector3(mh, mv, mh));
      kmene.setMatrixAt(j, m);
      if (druhy[j]) {
        farba.setHSL(0.33 + (i % 5) * 0.01, 0.35, 0.2 + (i % 4) * 0.02);
        ihlice.setMatrixAt(ki, m); ihlice.setColorAt(ki++, farba);
      } else {
        farba.setHSL(0.2 + (i % 7) * 0.015, 0.36 + (i % 3) * 0.07, 0.22 + (i % 5) * 0.025);
        if (korunyD) { korunyD.setMatrixAt(kl, m); korunyD.setColorAt(kl, farba); listy.setMatrixAt(kl, m); listy.setColorAt(kl, farba.clone().multiplyScalar(1.45)); }
        koruny.setMatrixAt(kl, m); koruny.setColorAt(kl++, farba);
      }
      kolizie?.pridajKruh(x, z, 0.45 * Math.min(1.6, Math.sqrt(mh * mv)), { typ: 'strom' });
      sx += x; sz += z;
    });
    const pripravit = (im) => { im.castShadow = true; im.receiveShadow = im !== kmene; im.computeBoundingSphere(); return im; };
    let chunk;
    if (korunyD) {
      // THREE.LOD prepína úrovne podľa vzdialenosti kamery od stredu skupiny
      korunyD.count = kl; listy.count = kl;
      const cx = sx / zoznam.length, cz = sz / zoznam.length;
      chunk = new THREE.LOD();
      chunk.position.set(cx, 0, cz);
      const blizko = new THREE.Group(), daleko = new THREE.Group();
      blizko.position.set(-cx, 0, -cz); daleko.position.set(-cx, 0, -cz);
      for (const im of [kmene, koruny, ihlice, listy]) if (pripravit(im).count) blizko.add(im);
      const kmeneD = new THREE.InstancedMesh(kmenGeo, matKmen, zoznam.length);
      kmeneD.instanceMatrix.copy(kmene.instanceMatrix);
      for (const im of [kmeneD, korunyD, ihlice.clone()]) if (pripravit(im).count) daleko.add(im);
      chunk.addLevel(blizko, 0);
      chunk.addLevel(daleko, LOD_BLIZKO);
    } else {
      chunk = new THREE.Group();
      for (const im of [kmene, koruny, ihlice]) if (pripravit(im).count) chunk.add(im);
    }
    chunk.userData.dohlad = { x: sx / zoznam.length, z: sz / zoznam.length, max: DOHLAD };
    skupina.add(chunk);
  }
  return skupina;
}

const cacheGeo = {};
/** Geometrie stromov: listnatý (zhluk nepravidelných gúľ) a ihličnatý (dva kužele). */
function geometrieStromov(bohate) {
  if (cacheGeo[bohate]) return cacheGeo[bohate];
  const kmenGeo = new THREE.CylinderGeometry(0.18, 0.3, 3.2, 7);
  kmenGeo.translate(0, 1.6, 0);

  const casti = [];
  // koruna zo zhlukov listov: väčšie jadro a menšie chumáče po obvode (členitejší obrys)
  const gule = bohate
    ? [[0, 5.0, 0, 1.8], [1.3, 4.5, 0.5, 1.15], [-1.2, 4.6, -0.6, 1.2], [0.3, 6.2, -0.3, 1.1], [-0.5, 4.3, 1.3, 1.05],
      [0.7, 4.4, -1.3, 1.0], [1.5, 5.6, -0.4, 0.9], [-1.4, 5.7, 0.6, 0.9], [-0.2, 3.8, -0.2, 1.25], [0.9, 6.5, 0.8, 0.75]]
    : [[0, 4.9, 0, 2.3], [1.3, 4.3, 0.6, 1.6], [-1.1, 4.4, -0.7, 1.7], [0.2, 6.1, -0.4, 1.5]];
  gule.forEach(([x, y, z, r], k) => {
    const g = new THREE.IcosahedronGeometry(r, bohate ? 1 : 0);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      // nepravidelnosť – aby to nebola dokonalá guľa
      const n = Math.sin(p.getX(i) * 3.1 + k) * Math.cos(p.getZ(i) * 2.7 - k) * 0.22 * r;
      p.setXYZ(i, p.getX(i) * (1 + n / r) + x, p.getY(i) * 0.9 + y, p.getZ(i) * (1 + n / r) + z);
    }
    casti.push(g);
  });
  const listnaty = spojGeometrie(casti, 3.2, 7.4);
  // stromy z lasera: okolo jadra karty s listami (CC0 listy, assets/textury/listy) – rozstrapkaný obrys koruny
  const karty = bohate ? kartyListov() : null;

  const k1 = new THREE.ConeGeometry(2.3, 4.2, 8).toNonIndexed(); k1.translate(0, 4.2, 0);
  const k2 = new THREE.ConeGeometry(1.6, 3.4, 8).toNonIndexed(); k2.translate(0, 6.4, 0);
  const ihlicnaty = spojGeometrie([k1, k2], 2.4, 8);

  for (const g of [listnaty, ihlicnaty, kmenGeo, karty]) if (g) g.userData.zdielane = true;
  cacheGeo[bohate] = { listnaty, ihlicnaty, kmenGeo, karty };
  return cacheGeo[bohate];
}

/** Karty s listami rozmiestnené po povrchu koruny (elipsoid okolo jadra), normály smerom od stredu koruny. */
function kartyListov() {
  const poz = [], nor = [], uv = [], farby = [];
  let a = 12345;
  const rnd = () => ((a = (a * 16807) % 2147483647) / 2147483647);
  const stred = new THREE.Vector3(0, 5.0, 0);
  const N = 30, VEL = 2.1;
  const q = new THREE.Quaternion(), e = new THREE.Euler();
  for (let k = 0; k < N; k++) {
    // bod na povrchu elipsoidu (rovnomerne podľa zlatého uhla), trochu dnu/von
    const y = 1 - (k + 0.5) / N * 1.7, r = Math.sqrt(Math.max(0, 1 - y * y)), u = k * 2.39996;
    const c = new THREE.Vector3(Math.cos(u) * r * 2.35, y * 1.85, Math.sin(u) * r * 2.35).multiplyScalar(0.8 + rnd() * 0.3).add(stred);
    e.set((rnd() - 0.5) * 1.6, rnd() * Math.PI * 2, (rnd() - 0.5) * 1.6); q.setFromEuler(e);
    const v = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([dx, dy]) => new THREE.Vector3(dx * VEL / 2, dy * VEL / 2, 0).applyQuaternion(q).add(c));
    for (const i of [0, 1, 2, 0, 2, 3]) {
      poz.push(v[i].x, v[i].y, v[i].z);
      const n = v[i].clone().sub(stred).normalize();
      nor.push(n.x, n.y, n.z);
      uv.push(i === 0 || i === 3 ? 0 : 1, i < 2 ? 0 : 1);
      const t = Math.min(1, Math.max(0, (v[i].y - 3.2) / 4.2));
      const jas = 0.62 + t * 0.5;
      farby.push(jas, jas, jas * 0.95);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(poz, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setAttribute('color', new THREE.Float32BufferAttribute(farby, 3));
  return g;
}

let matListy = null;
function materialListov() {
  if (matListy) return matListy;
  const t = new THREE.TextureLoader().load('assets/textury/listy/karta.png');
  t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  matListy = new THREE.MeshStandardMaterial({ map: t, alphaTest: 0.45, side: THREE.DoubleSide, vertexColors: true, roughness: 0.8 });
  // obe strany karty majú normálu „von z koruny“ (inak by zadné strany kariet boli čierne)
  matListy.onBeforeCompile = (sh) => {
    sh.fragmentShader = sh.fragmentShader.replace('#include <normal_fragment_begin>',
      THREE.ShaderChunk.normal_fragment_begin.replace('normal *= faceDirection;', ''));
  };
  matListy.customProgramCacheKey = () => 'listy-karty';
  return matListy;
}

/** Spojí geometrie a pridá farbu vrcholov: dole tmavšie (tieň v korune), hore svetlejšie. */
function spojGeometrie(geos, yMin, yMax) {
  const poz = [];
  for (const g of geos) poz.push(...g.attributes.position.array);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(poz, 3));
  const farby = [];
  for (let i = 1; i < poz.length; i += 3) {
    const t = Math.min(1, Math.max(0, (poz[i] - yMin) / (yMax - yMin)));
    const v = 0.55 + t * 0.55;
    farby.push(v, v, v * 0.95);
  }
  geo.setAttribute('color', new THREE.Float32BufferAttribute(farby, 3));
  geo.computeVertexNormals();
  return geo;
}

const materialy = {};
/** Materiál koruny: pri stromoch z lasera „listnatý“ šum (zhluky listov) vo farbe aj v normále. */
function materialKoruny(bohate) {
  if (materialy[bohate]) return materialy[bohate];
  const mat = new THREE.MeshStandardMaterial({ color: '#ffffff', vertexColors: true, roughness: 0.85, flatShading: !bohate });
  if (bohate) {
    mat.onBeforeCompile = (sh) => {
      sh.vertexShader = sh.vertexShader
        .replace('#include <common>', '#include <common>\nvarying vec3 vSvetK;')
        .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvSvetK = (modelMatrix * instanceMatrix * vec4(transformed, 1.0)).xyz;');
      sh.fragmentShader = sh.fragmentShader
        .replace('#include <common>', `#include <common>
varying vec3 vSvetK;
float hash3(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float sum3(vec3 x) {
  vec3 i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(hash3(i), hash3(i + vec3(1,0,0)), f.x), mix(hash3(i + vec3(0,1,0)), hash3(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(hash3(i + vec3(0,0,1)), hash3(i + vec3(1,0,1)), f.x), mix(hash3(i + vec3(0,1,1)), hash3(i + vec3(1,1,1)), f.x), f.y), f.z);
}`)
        .replace('#include <color_fragment>', `#include <color_fragment>
        float listy = sum3(vSvetK * 2.2) * 0.6 + sum3(vSvetK * 5.3) * 0.4;
        diffuseColor.rgb *= 0.62 + 0.62 * listy;`)
        .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
        vec3 e = vec3(0.12, 0.0, 0.0);
        vec3 grad = vec3(sum3((vSvetK + e.xyy) * 3.1) - sum3((vSvetK - e.xyy) * 3.1),
                         sum3((vSvetK + e.yxy) * 3.1) - sum3((vSvetK - e.yxy) * 3.1),
                         sum3((vSvetK + e.yyx) * 3.1) - sum3((vSvetK - e.yyx) * 3.1));
        normal = normalize(normal - (viewMatrix * vec4(grad, 0.0)).xyz * 1.6);`);
    };
    mat.customProgramCacheKey = () => 'koruna-listy';
  }
  materialy[bohate] = mat;
  return mat;
}
