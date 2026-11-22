// Model auta: zaoblená karoséria z profilu (extrúzia so zaoblením), sklenená kabína, kolesá s diskami,
// svetlá a ŠPZ. Predok smeruje na +z. Tvar typu je z receptu v js/auto/typy-aut.js (mestské, hatchback,
// sedan, kombi, SUV, dodávka, pickup, športové…); typ sa vyberá parametrom, staré autá bez typu podľa farby.
// Taxík / kuriérske auto: prislusenstvo = { lampa, pismo, text, pruh, pruhText } (svetlo na streche, pruh na boku).

import * as THREE from 'three';
import { KONFIG } from '../config.js';
import { TYPY, profilTypu, typPodlaFarby } from './typy-aut.js';

// bočné profily typov (pre staršie moduly, ktoré ich čítajú priamo)
export const PROFILY = Object.fromEntries(Object.keys(TYPY).map((t) => {
  const p = profilTypu(t);
  return [t, { spodok: p.spodok, kabina: p.kabina }];
}));

const geoCache = new Map();

/** Doplní body na hranách profilu (aby sa plech pri náraze mohol preliačiť lokálne, nie celá strana). */
function zhusti(body, krok) {
  const out = [];
  for (let i = 0; i < body.length; i++) {
    const a = body[i], b = body[(i + 1) % body.length];
    const n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / krok));
    for (let k = 0; k < n; k++) out.push([a[0] + ((b[0] - a[0]) * k) / n, a[1] + ((b[1] - a[1]) * k) / n]);
  }
  return out;
}

function extruzia(body, hlbka, zaoblenie, kroky = 1) {
  const tvar = new THREE.Shape(body.map(([z, y]) => new THREE.Vector2(z, y)));
  const geo = new THREE.ExtrudeGeometry(tvar, {
    depth: hlbka, steps: kroky, bevelEnabled: zaoblenie > 0, bevelThickness: zaoblenie, bevelSize: zaoblenie, bevelSegments: 3, curveSegments: 4,
  });
  // tvar je v rovine XY (x = dĺžka) → otočíme, aby dĺžka bola v osi z
  geo.translate(0, 0, -hlbka / 2);
  geo.rotateY(-Math.PI / 2);
  geo.computeVertexNormals();
  return geo;
}

export function geometrie(typ) {
  if (geoCache.has(typ)) return geoCache.get(typ);
  const p = profilTypu(typ);
  const g = {
    telo: extruzia(zhusti(p.spodok, 0.4), p.sirka - 0.16, 0.08, 4),
    sklo: extruzia(zhusti(p.kabina, 0.5), p.sirka - 0.2, 0.04, 3),
    strecha: extruzia(p.strecha, p.sirka - 0.22, 0.03),
    korba: p.korba ? extruzia([[p.korba.z0, p.korba.y - 0.05], [p.korba.z1, p.korba.y - 0.05], [p.korba.z1, p.korba.y], [p.korba.z0, p.korba.y]], p.sirka - 0.3, 0) : null,
    dlzka: p.dlzka, predok: p.predok, zadok: p.zadok, sirka: p.sirka, vyska: p.vyska,
    vyskaSvetiel: p.vyskaSvetiel, vyskaZadnych: p.vyskaZadnych, kolesa: p.kolesa,
    zrkadloZ: p.kabina[3][0] - 0.15,
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

const cacheNapisov = new Map();
/** Materiál s nápisom (svetlo taxíka, pruh na boku). */
function materialNapisu(text, pozadie, pismo, pomer) {
  const k = `${text}|${pozadie}|${pismo}|${pomer}`;
  if (cacheNapisov.has(k)) return cacheNapisov.get(k);
  const c = document.createElement('canvas');
  c.width = 256; c.height = Math.max(16, Math.round(256 / pomer));
  const g = c.getContext('2d');
  g.fillStyle = pozadie; g.fillRect(0, 0, c.width, c.height);
  if (text) {
    g.fillStyle = pismo; g.font = `bold ${Math.round(c.height * 0.62)}px system-ui, sans-serif`;
    g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, c.width / 2, c.height * 0.54, c.width - 10);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  const m = new THREE.MeshStandardMaterial({ map: t, roughness: 0.5 });
  cacheNapisov.set(k, m);
  return m;
}

/** Svetlo na streche taxíka a pruhy na bokoch (taxík, kuriér) – do skupiny telo. */
export function pridajPrislusenstvo(telo, typ, prisl) {
  if (!prisl) return;
  const g = geometrie(typ);
  const T = TYPY[typ] ?? TYPY.sedan;
  const zs = -g.dlzka / 2 + ((T.sk[1] + T.sk[2]) / 2) * g.dlzka;
  if (prisl.lampa) {
    const bok = new THREE.MeshStandardMaterial({ color: prisl.lampa, emissive: prisl.lampa, emissiveIntensity: 0.25, roughness: 0.4 });
    const napis = materialNapisu(prisl.text ?? 'TAXI', prisl.lampa, prisl.pismo ?? '#111', 0.62 / 0.2);
    const lampa = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.2, 0.24), [bok, bok, bok, bok, napis, napis]);
    lampa.position.set(0, g.vyska + 0.1, zs);
    telo.add(lampa);
  }
  if (prisl.pruh) {
    const d = g.dlzka * 0.58;
    for (const x of [-1, 1]) {
      const p = new THREE.Mesh(new THREE.PlaneGeometry(d, 0.18), materialNapisu(prisl.pruhText ?? '', prisl.pruh, prisl.pismo ?? '#fff', d / 0.18));
      p.position.set(x * (g.sirka / 2 + 0.012), T.P - 0.26, 0.05);
      p.rotation.y = x * Math.PI / 2;
      telo.add(p);
    }
  }
}

export function vytvorModelAuta(farba = '#c8102e', typ = null, prislusenstvo = null) {
  if (!typ || !TYPY[typ]) typ = typPodlaFarby(farba);
  const g = geometrie(typ);
  const SIRKA = g.sirka;
  const auto = new THREE.Group();
  const telo = new THREE.Group(); // nakláňa sa (pruženie), kolesá nie
  auto.add(telo);

  const matKaroseria = KONFIG.JE_DOTYKOVE
    ? new THREE.MeshStandardMaterial({ color: farba, roughness: 0.3, metalness: 0.4 })
    : new THREE.MeshPhysicalMaterial({ color: farba, roughness: 0.32, metalness: 0.35, clearcoat: 1, clearcoatRoughness: 0.08 });

  telo.add(new THREE.Mesh(g.telo, matKaroseria));
  telo.add(new THREE.Mesh(g.sklo, matSklo));
  telo.add(new THREE.Mesh(g.strecha, matKaroseria));
  if (g.korba) telo.add(new THREE.Mesh(g.korba, matCierna));

  // nárazníky, maska, svetlá, ŠPZ
  const zp = g.predok, zz = g.zadok, ys = g.vyskaSvetiel;
  const box = (w, h, d, mat, x, y, z) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z);
    telo.add(m);
    return m;
  };
  const yn = Math.max(0.36, g.kolesa.r + 0.06);
  box(SIRKA + 0.02, 0.18, 0.14, matCierna, 0, yn, zp + 0.02);
  box(SIRKA + 0.02, 0.18, 0.14, matCierna, 0, yn, zz - 0.02);
  box(0.62, 0.14, 0.04, matCierna, 0, ys - 0.06, zp + 0.06);                 // maska
  for (const x of [-1, 1]) {
    box(0.34, 0.11, 0.05, matSvetlo, x * (SIRKA / 2 - 0.27), ys, zp + 0.04);
    box(0.3, 0.12, 0.05, matZadne, x * (SIRKA / 2 - 0.24), g.vyskaZadnych, zz - 0.04);
    const zrkadlo = box(0.16, 0.1, 0.12, matKaroseria, x * (SIRKA / 2 + 0.08), TYPY[typ].P + 0.08, g.zrkadloZ);
    zrkadlo.castShadow = false;
  }
  const spz = new THREE.Mesh(new THREE.PlaneGeometry(0.52, 0.12), texturaSpz());
  spz.position.set(0, yn + 0.14, zz - 0.11);
  spz.rotation.y = Math.PI;
  telo.add(spz);
  const spzP = spz.clone();
  spzP.position.set(0, yn + 0.1, zp + 0.11);
  spzP.rotation.y = 0;
  telo.add(spzP);
  pridajPrislusenstvo(telo, typ, prislusenstvo);

  // kolesá – predné sú v otočnom kĺbe kvôli zatáčaniu
  const kolesa = [];
  const predneKlby = [];
  const r = g.kolesa.r, mierka = r / 0.36;
  const xk = SIRKA / 2 - 0.06;
  for (const [x, z] of [[-xk, g.kolesa.predne], [xk, g.kolesa.predne], [-xk, g.kolesa.zadne], [xk, g.kolesa.zadne]]) {
    const klb = new THREE.Group();
    klb.position.set(x, r, z);
    const koleso = new THREE.Group();
    koleso.scale.set(1, mierka, mierka);
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
  auto.userData = { telo, kolesa, predneKlby, matKaroseria, typ, dlzka: g.dlzka, predok: g.predok, zadok: g.zadok, polomerKolesa: r };
  return auto;
}
