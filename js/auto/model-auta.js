// Model osobného auta: zaoblená karoséria z profilu (extrúzia so zaoblením),
// sklenená kabína, kolesá s diskami, svetlá a ŠPZ. Predok smeruje na +z.
// Typy: 'sedan', 'hatchback', 'suv' (vyberá sa podľa farby/id, alebo parametrom).

import * as THREE from 'three';
import { KONFIG } from '../config.js';

const SIRKA = 1.72;

// bočné profily (z = dĺžka, y = výška); spodná línia ide rovno
export const PROFILY = {
  sedan: {
    spodok: [[-2.22, 0.32], [-2.28, 0.72], [-2.05, 0.95], [-1.35, 1.0], [1.12, 1.0], [2.0, 0.86], [2.28, 0.62], [2.22, 0.32]],
    kabina: [[-1.38, 0.98], [-0.72, 1.44], [0.42, 1.46], [1.12, 0.98]],
  },
  hatchback: {
    spodok: [[-1.9, 0.32], [-1.98, 0.75], [-1.92, 1.0], [1.0, 1.0], [1.85, 0.86], [2.05, 0.62], [2.0, 0.32]],
    kabina: [[-1.9, 0.98], [-1.75, 1.45], [0.3, 1.48], [1.0, 0.98]],
  },
  suv: {
    spodok: [[-2.15, 0.42], [-2.22, 0.9], [-2.1, 1.12], [1.05, 1.12], [2.0, 1.0], [2.22, 0.72], [2.15, 0.42]],
    kabina: [[-2.1, 1.1], [-1.95, 1.72], [0.5, 1.74], [1.05, 1.1]],
  },
};

const geoCache = new Map();
function extruzia(body, hlbka, zaoblenie) {
  const tvar = new THREE.Shape(body.map(([z, y]) => new THREE.Vector2(z, y)));
  const geo = new THREE.ExtrudeGeometry(tvar, {
    depth: hlbka, bevelEnabled: zaoblenie > 0, bevelThickness: zaoblenie, bevelSize: zaoblenie, bevelSegments: 3, curveSegments: 4,
  });
  // tvar je v rovine XY (x = dĺžka) → otočíme, aby dĺžka bola v osi z
  geo.translate(0, 0, -hlbka / 2);
  geo.rotateY(-Math.PI / 2);
  geo.computeVertexNormals();
  return geo;
}

export function geometrie(typ) {
  if (geoCache.has(typ)) return geoCache.get(typ);
  const p = PROFILY[typ];
  const kabina = p.kabina;
  // strecha = tenký pás navrchu kabíny
  const strecha = [
    [kabina[1][0] + 0.06, kabina[1][1] - 0.04], [kabina[1][0] + 0.02, kabina[1][1] + 0.02],
    [kabina[2][0] - 0.02, kabina[2][1] + 0.02], [kabina[2][0] - 0.06, kabina[2][1] - 0.04],
  ];
  const g = {
    telo: extruzia(p.spodok, SIRKA - 0.16, 0.08),
    sklo: extruzia(kabina, SIRKA - 0.2, 0.04),
    strecha: extruzia(strecha, SIRKA - 0.22, 0.03),
    dlzka: Math.max(...p.spodok.map((b) => b[0])) - Math.min(...p.spodok.map((b) => b[0])),
    predok: Math.max(...p.spodok.map((b) => b[0])),
    zadok: Math.min(...p.spodok.map((b) => b[0])),
    vyskaSvetiel: (p.spodok[1][1] + p.spodok[2][1]) / 2,
  };
  geoCache.set(typ, g);
  return g;
}

const geoPneu = new THREE.CylinderGeometry(0.36, 0.36, 0.26, 18); geoPneu.rotateZ(Math.PI / 2);
const geoDisk = new THREE.CylinderGeometry(0.23, 0.23, 0.28, 10); geoDisk.rotateZ(Math.PI / 2);
const geoStred = new THREE.CylinderGeometry(0.07, 0.07, 0.3, 6); geoStred.rotateZ(Math.PI / 2);
const matPneu = new THREE.MeshStandardMaterial({ color: '#151515', roughness: 0.92 });
const matDisk = new THREE.MeshStandardMaterial({ color: '#c5c9cd', roughness: 0.3, metalness: 0.85 });
const matSklo = new THREE.MeshStandardMaterial({ color: '#16202a', roughness: 0.05, metalness: 0.6, envMapIntensity: 1.5 });
const matSvetlo = new THREE.MeshStandardMaterial({ color: '#fffbe8', emissive: '#fff4cc', emissiveIntensity: 0.8, roughness: 0.1 });
const matZadne = new THREE.MeshStandardMaterial({ color: '#8a0f0f', emissive: '#7a0000', emissiveIntensity: 0.6, roughness: 0.2 });
const matCierna = new THREE.MeshStandardMaterial({ color: '#1d1f21', roughness: 0.7 });
let matSpz = null;

function texturaSpz() {
  if (matSpz) return matSpz;
  const c = document.createElement('canvas');
  c.width = 128; c.height = 28;
  const g = c.getContext('2d');
  g.fillStyle = '#f4f4f0'; g.fillRect(0, 0, 128, 28);
  g.fillStyle = '#1f4fb4'; g.fillRect(0, 0, 14, 28);
  g.fillStyle = '#f2c14e'; g.font = 'bold 8px Arial'; g.fillText('SK', 2, 24);
  g.fillStyle = '#111'; g.font = 'bold 20px Arial, sans-serif'; g.textBaseline = 'middle';
  g.fillText('BA 420 BC', 18, 15);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  matSpz = new THREE.MeshStandardMaterial({ map: t, roughness: 0.5 });
  return matSpz;
}

export function vytvorModelAuta(farba = '#c8102e', typ = null) {
  if (!typ) {
    const h = parseInt(farba.slice(1), 16) || 0;
    typ = ['sedan', 'hatchback', 'sedan', 'suv'][h % 4];
  }
  const g = geometrie(typ);
  const auto = new THREE.Group();
  const telo = new THREE.Group(); // nakláňa sa (pruženie), kolesá nie
  auto.add(telo);

  const matKaroseria = KONFIG.JE_DOTYKOVE
    ? new THREE.MeshStandardMaterial({ color: farba, roughness: 0.3, metalness: 0.4 })
    : new THREE.MeshPhysicalMaterial({ color: farba, roughness: 0.32, metalness: 0.35, clearcoat: 1, clearcoatRoughness: 0.08 });

  telo.add(new THREE.Mesh(g.telo, matKaroseria));
  telo.add(new THREE.Mesh(g.sklo, matSklo));
  telo.add(new THREE.Mesh(g.strecha, matKaroseria));

  // nárazníky, maska, svetlá, ŠPZ
  const zp = g.predok, zz = g.zadok, ys = g.vyskaSvetiel;
  const box = (w, h, d, mat, x, y, z) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z);
    telo.add(m);
    return m;
  };
  box(SIRKA + 0.02, 0.18, 0.14, matCierna, 0, 0.42, zp + 0.02);
  box(SIRKA + 0.02, 0.18, 0.14, matCierna, 0, 0.42, zz - 0.02);
  box(0.62, 0.14, 0.04, matCierna, 0, ys - 0.06, zp + 0.08);                 // maska
  for (const x of [-0.6, 0.6]) {
    box(0.36, 0.12, 0.05, matSvetlo, x, ys, zp + 0.06);
    box(0.36, 0.11, 0.05, matZadne, x, ys + 0.04, zz - 0.06);
    const zrkadlo = box(0.16, 0.1, 0.12, matKaroseria, x * 1.55, 1.05, (PROFILY[typ].kabina[3][0]) - 0.15);
    zrkadlo.castShadow = false;
  }
  const spz = new THREE.Mesh(new THREE.PlaneGeometry(0.52, 0.12), texturaSpz());
  spz.position.set(0, 0.55, zz - 0.11);
  spz.rotation.y = Math.PI;
  telo.add(spz);
  const spzP = spz.clone();
  spzP.position.set(0, 0.5, zp + 0.11);
  spzP.rotation.y = 0;
  telo.add(spzP);

  // kolesá – predné sú v otočnom kĺbe kvôli zatáčaniu
  const kolesa = [];
  const predneKlby = [];
  const rozvor = Math.min(1.42, g.dlzka * 0.31);
  for (const [x, z] of [[-0.8, rozvor], [0.8, rozvor], [-0.8, -rozvor], [0.8, -rozvor]]) {
    const klb = new THREE.Group();
    klb.position.set(x, 0.36, z);
    const koleso = new THREE.Group();
    const disk = new THREE.Mesh(geoDisk, matDisk);
    const stred = new THREE.Mesh(geoStred, matCierna);
    koleso.add(new THREE.Mesh(geoPneu, matPneu), disk, stred);
    klb.add(koleso);
    auto.add(klb);
    kolesa.push(koleso);
    if (z > 0) predneKlby.push(klb);
  }

  // tieň pod autom (lacný „ambient occlusion“)
  const tien = new THREE.Mesh(
    new THREE.PlaneGeometry(SIRKA + 0.5, g.dlzka + 0.5),
    new THREE.MeshBasicMaterial({ color: '#000000', transparent: true, opacity: 0.35, depthWrite: false }),
  );
  tien.rotation.x = -Math.PI / 2;
  tien.position.y = 0.05;
  auto.add(tien);

  auto.traverse((o) => { if (o.isMesh && o !== tien) o.castShadow = true; });
  auto.userData = { telo, kolesa, predneKlby, matKaroseria, typ };
  return auto;
}
