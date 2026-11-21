// Tabule s názvami ulíc na rohoch križovatiek (modré s bielym písmom).
// Všetky názvy sú v jednom „atlase“ (veľké plátno), každá tabuľa si z neho
// berie svoj výrez cez vlastný atribút inštancie – celé je to jeden draw call.

import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { kluc } from '../cesty/krizovatky.js';

const STLPCE = 4, RIADKY = 64;           // 256 názvov v atlase
const SIRKA_PX = 512, VYSKA_PX = 64;
const SIRKA_M = 1.6, VYSKA_M = 0.22;

export function vytvorTabuleUlic(cesty, krizovatky, vyskopis) {
  // 1) pre každú križovatku s aspoň dvomi rôznymi menami ulíc – tabule na rohu
  const tabule = [];
  for (const k of krizovatky.values()) {
    const mena = new Map();
    for (const { ci, i } of k.cesty) {
      const c = cesty[ci];
      if (!c.nazov || c.typ === 'service') continue;
      // smer ulice v tomto bode
      const a = c.body[Math.max(0, i - 1)], b = c.body[Math.min(c.body.length - 1, i + 1)];
      const d = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
      if (!mena.has(c.nazov)) mena.set(c.nazov, { dx: (b[0] - a[0]) / d, dz: (b[1] - a[1]) / d, pol: c.sirka / 2 });
    }
    if (mena.size < 2) continue;
    let n = 0;
    for (const [nazov, s] of mena) {
      if (n++ > 1) break;
      // roh križovatky: kus pozdĺž ulice a kus nabok
      const r = k.polomer + 2.5;
      const x = k.x + s.dx * r + -s.dz * (s.pol + 1.8), z = k.z + s.dz * r + s.dx * (s.pol + 1.8);
      tabule.push({ nazov, x, z, uhol: Math.atan2(s.dx, s.dz) + Math.PI / 2 });
    }
  }
  const skupina = new THREE.Group();
  skupina.name = 'tabule-ulic';
  if (!tabule.length) return skupina;

  // 2) atlas názvov (ak je ich viac ako miesta v atlase, použijú sa najčastejšie)
  const pocty = new Map();
  for (const t of tabule) pocty.set(t.nazov, (pocty.get(t.nazov) ?? 0) + 1);
  const mena = [...pocty.keys()].sort((a, b) => pocty.get(b) - pocty.get(a)).slice(0, STLPCE * RIADKY);
  const index = new Map(mena.map((m, i) => [m, i]));
  const c = document.createElement('canvas');
  c.width = STLPCE * SIRKA_PX; c.height = RIADKY * VYSKA_PX;
  const g = c.getContext('2d');
  mena.forEach((m, i) => {
    const x = (i % STLPCE) * SIRKA_PX, y = Math.floor(i / STLPCE) * VYSKA_PX;
    g.fillStyle = '#ffffff'; g.fillRect(x, y, SIRKA_PX, VYSKA_PX);
    g.fillStyle = '#1d4e9e'; g.fillRect(x + 4, y + 4, SIRKA_PX - 8, VYSKA_PX - 8);
    g.fillStyle = '#ffffff';
    let velkost = 40;
    g.font = `bold ${velkost}px Arial, sans-serif`;
    while (g.measureText(m).width > SIRKA_PX - 30 && velkost > 18) { velkost -= 2; g.font = `bold ${velkost}px Arial, sans-serif`; }
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(m, x + SIRKA_PX / 2, y + VYSKA_PX / 2 + 2);
  });
  const atlas = new THREE.CanvasTexture(c);
  atlas.colorSpace = THREE.SRGBColorSpace;
  atlas.anisotropy = 4;

  // 3) inštancie s posunom v atlase
  const platne = tabule.filter((t) => index.has(t.nazov));
  const geo = new THREE.PlaneGeometry(SIRKA_M, VYSKA_M);
  // obojstranná tabuľa – druhá strana otočená
  const geo2 = geo.clone(); geo2.rotateY(Math.PI);
  const spojena = new THREE.BufferGeometry();
  const poz = [...geo.attributes.position.array, ...geo2.attributes.position.array];
  const uv = [...geo.attributes.uv.array, ...[...geo2.attributes.uv.array].map((v, i) => (i % 2 === 0 ? 1 - v : v))];
  const idx = [...geo.index.array, ...[...geo2.index.array].map((i) => i + 4)];
  spojena.setAttribute('position', new THREE.Float32BufferAttribute(poz, 3));
  spojena.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  spojena.setIndex(idx);
  spojena.computeVertexNormals();
  const posun = new Float32Array(platne.length * 2);
  platne.forEach((t, i) => {
    const j = index.get(t.nazov);
    posun[i * 2] = (j % STLPCE) / STLPCE;
    posun[i * 2 + 1] = 1 - (Math.floor(j / STLPCE) + 1) / RIADKY;
  });
  spojena.setAttribute('aPosun', new THREE.InstancedBufferAttribute(posun, 2));

  const mat = new THREE.MeshStandardMaterial({ map: atlas, roughness: 0.6 });
  mat.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nattribute vec2 aPosun;')
      .replace('#include <uv_vertex>', `#include <uv_vertex>\nvMapUv = vMapUv * vec2(${(1 / STLPCE).toFixed(6)}, ${(1 / RIADKY).toFixed(6)}) + aPosun;`);
  };
  const tabMesh = new THREE.InstancedMesh(spojena, mat, platne.length);
  // stĺpik je pri kraji tabule (nie v jej strede), končí tesne nad ňou; tabuľa drží na dvoch objímkach
  const stlpGeo = new THREE.CylinderGeometry(0.04, 0.04, 2.75 + VYSKA_M / 2 + 0.06, 6);
  stlpGeo.translate(0, (2.75 + VYSKA_M / 2 + 0.06) / 2, 0);
  const BOK = SIRKA_M / 2 + 0.06;
  const objimky = mergeGeometries([-1, 1].map((s) => {
    const g = new THREE.BoxGeometry(0.1, 0.03, 0.05);
    g.translate(-BOK + 0.03, s * VYSKA_M * 0.3, 0);
    return g;
  }));
  const matStlpa = new THREE.MeshStandardMaterial({ color: '#2d3236', metalness: 0.5 });
  const stlpy = new THREE.InstancedMesh(stlpGeo, matStlpa, platne.length);
  const objMesh = new THREE.InstancedMesh(objimky, matStlpa, platne.length);
  const o = new THREE.Object3D();
  platne.forEach((t, i) => {
    const y = vyskopis.vyska(t.x, t.z) + 0.25;
    o.position.set(t.x, y, t.z); o.rotation.set(0, 0, 0); o.updateMatrix();
    stlpy.setMatrixAt(i, o.matrix);
    // tabuľa posunutá bokom (v jej rovine), stĺpik je pri jej ľavom kraji
    const c = Math.cos(t.uhol), sn = Math.sin(t.uhol);
    o.position.set(t.x + c * BOK, y + 2.75, t.z - sn * BOK); o.rotation.set(0, t.uhol, 0); o.updateMatrix();
    tabMesh.setMatrixAt(i, o.matrix);
    objMesh.setMatrixAt(i, o.matrix);
  });
  tabMesh.computeBoundingSphere(); stlpy.computeBoundingSphere(); objMesh.computeBoundingSphere();
  skupina.add(tabMesh, stlpy, objMesh);
  return skupina;
}

export { kluc };
