// Model auta: zaoblená karoséria z profilu (extrúzia so zaoblením), sklenená kabína, kolesá s diskami,
// svetlá a ŠPZ. Predok smeruje na +z. Tvar typu je z receptu v js/auto/typy-aut.js (mestské, hatchback,
// sedan, kombi, SUV, dodávka, pickup, športové…); typ sa vyberá parametrom, staré autá bez typu podľa farby.
// Taxík / kuriérske auto: prislusenstvo = { lampa, pismo, text, pruh, pruhText } (svetlo na streche, pruh na boku).
//
// Detaily (lacné, bez spomalenia): skleník sa k streche zužuje, boky karosérie sú mierne vypuklé, čierne lemy
// blatníkov, škáry dverí, lišta pod oknami, kľučky, disky s lúčmi (textúra). Nehybné časti sú zlúčené podľa
// materiálu (karoséria, čierne diely, ŠPZ, koleso) – menej volaní kreslenia na auto než predtým.

import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { KONFIG } from '../config.js';
import { TYPY, profilTypu, typPodlaFarby } from './typy-aut.js';

const ZUZENIE_SKLENIKA = 0.13;   // o koľko je skleník pri streche užší ako pri páse (podiel šírky)
const VYPUKLOST = 0.035;         // bok karosérie v polovici výšky trochu širší ako pri prahu a páse

/** Zlúči geometrie (po transformácii) do jednej – rovnaké atribúty, bez indexov. */
function zluc(geos) {
  const ok = geos.filter(Boolean).map((g) => {
    const n = g.index ? g.toNonIndexed() : g;
    for (const a of Object.keys(n.attributes)) if (!['position', 'normal', 'uv'].includes(a)) n.deleteAttribute(a);
    return n;
  });
  return ok.length ? mergeGeometries(ok, false) : null;
}

/** Kváder ako geometria na mieste (x, y, z) – na zlúčenie. */
function kvader(w, h, d, x, y, z, rotY = 0) {
  const g = new THREE.BoxGeometry(w, h, d);
  if (rotY) g.rotateY(rotY);
  g.translate(x, y, z);
  return g;
}

/** Zúžený skleník a vypuklé boky: posun x podľa výšky y (geometria sa mení na mieste). */
function tvaruj(geo, fn) {
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) p.setX(i, p.getX(i) * fn(p.getY(i)));
  p.needsUpdate = true;
  geo.computeVertexNormals();
  return geo;
}

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
  const T = p.T, P = T.P, H = p.vyska, W = p.sirka;
  // skleník a strecha: k streche užšie (tumblehome); boky: mierne vypuklé medzi prahom a pásom
  const zuz = (y) => 1 - ZUZENIE_SKLENIKA * Math.min(1, Math.max(0, (y - P) / Math.max(0.2, H - P)));
  const dno = p.spodok[0][1];
  const vyp = (y) => {
    const t = Math.min(1, Math.max(0, (y - dno) / Math.max(0.2, P - dno)));
    return 1 + VYPUKLOST * Math.sin(Math.PI * t);
  };
  const telo = tvaruj(extruzia(zhusti(p.spodok, 0.4), W - 0.16, 0.08, 4), vyp);
  const sklo = tvaruj(extruzia(zhusti(p.kabina, 0.5), W - 0.2, 0.04, 3), zuz);
  const strecha = tvaruj(extruzia(p.strecha, W - 0.22, 0.03), zuz);
  const korba = p.korba ? extruzia([[p.korba.z0, p.korba.y - 0.05], [p.korba.z1, p.korba.y - 0.05], [p.korba.z1, p.korba.y], [p.korba.z0, p.korba.y]], W - 0.3, 0) : null;
  const zrkadloZ = p.kabina[3][0] - 0.15;
  const r = p.kolesa.r, yn = Math.max(0.36, r + 0.06), ys = p.vyskaSvetiel;
  const z = (f) => -p.dlzka / 2 + f * p.dlzka;

  // karoséria v laku: telo, strecha, zrkadlá, kľučky dverí
  const lak = [telo, strecha];
  const dvere = T.skrina ? [z(T.sk[3]) - 0.55] : T.sk[1] - T.sk[0] > 0.2 ? [z(T.sk[3]) - 0.55] : [z(T.sk[3]) - 0.55, (z(T.sk[1]) + z(T.sk[2])) / 2 - 0.35];
  for (const x of [-1, 1]) {
    lak.push(kvader(0.16, 0.1, 0.12, x * (W / 2 + 0.08), P + 0.08, zrkadloZ));
    for (const zd of dvere) lak.push(kvader(0.03, 0.035, 0.16, x * ((W / 2) * vyp(P - 0.16) + 0.01), P - 0.16, zd));
  }
  // čierne diely: nárazníky, maska, lemy blatníkov, škáry dverí, lišta pod oknami, korba
  const cierne = [
    kvader(W + 0.02, 0.18, 0.14, 0, yn, p.predok + 0.02),
    kvader(W + 0.02, 0.18, 0.14, 0, yn, p.zadok - 0.02),
    kvader(0.62, 0.14, 0.04, 0, ys - 0.06, p.predok + 0.06),
    korba,
  ];
  const zSkl0 = p.kabina[0][0] + 0.06, zSkl1 = p.kabina[3][0] - 0.06;
  const skary = [zSkl1 - 0.05, ...(T.sk[1] - T.sk[0] > 0.2 || T.skrina ? [] : [(z(T.sk[1]) + z(T.sk[2])) / 2]), ...(T.skrina || T.sk[1] - T.sk[0] > 0.2 ? [] : [zSkl0 + 0.12])];
  for (const x of [-1, 1]) {
    // lišta pod oknami (na páse je bok úzky) a škáry dverí (bok je v strede výšky vypuklý)
    cierne.push(kvader(0.02, 0.025, Math.max(0.2, zSkl1 - zSkl0), x * (W / 2 + 0.006), P - 0.015, (zSkl0 + zSkl1) / 2));
    const ys0 = yn + 0.12, ys1 = P - 0.06;
    for (const zs of skary) cierne.push(kvader(0.016, Math.max(0.2, ys1 - ys0), 0.016, x * ((W / 2) * vyp((ys0 + ys1) / 2) + 0.002), (ys0 + ys1) / 2, zs));
    for (const zk of [p.kolesa.predne, p.kolesa.zadne]) {
      // lem blatníka: polovica toru nad kolesom, na boku karosérie
      const lem = new THREE.TorusGeometry(r + 0.07, 0.045, 5, 14, Math.PI);
      lem.rotateY(Math.PI / 2);
      lem.translate(x * (W / 2 - 0.07), r, zk);
      cierne.push(lem);
    }
  }
  // ŠPZ vpredu a vzadu v jednej geometrii
  const spzZ = new THREE.PlaneGeometry(0.52, 0.12); spzZ.rotateY(Math.PI); spzZ.translate(0, yn + 0.14, p.zadok - 0.11);
  const spzP = new THREE.PlaneGeometry(0.52, 0.12); spzP.translate(0, yn + 0.1, p.predok + 0.11);

  const g = {
    karoseria: zluc(lak), sklo, cierne: zluc(cierne), spz: zluc([spzZ, spzP]),
    dlzka: p.dlzka, predok: p.predok, zadok: p.zadok, sirka: W, vyska: H,
    vyskaSvetiel: ys, vyskaZadnych: p.vyskaZadnych, kolesa: p.kolesa, zrkadloZ, yn,
  };
  geoCache.set(typ, g);
  return g;
}

// koleso: pneumatika so zaobleným bokom a stredom v jednej geometrii, disk s lúčmi (textúra)
const geoPneu = (() => {
  const profil = [[0.24, -0.13], [0.33, -0.13], [0.36, -0.09], [0.36, 0.09], [0.33, 0.13], [0.24, 0.13]].map(([r, y]) => new THREE.Vector2(r, y));
  const g = new THREE.LatheGeometry(profil, 18);
  g.rotateZ(Math.PI / 2);
  const stred = new THREE.CylinderGeometry(0.07, 0.07, 0.3, 6); stred.rotateZ(Math.PI / 2);
  return zluc([g, stred]);
})();
const geoDisk = new THREE.CylinderGeometry(0.245, 0.245, 0.24, 14); geoDisk.rotateZ(Math.PI / 2);
const matPneu = new THREE.MeshStandardMaterial({ color: '#151515', roughness: 0.92, side: THREE.DoubleSide });
const matDisk = new THREE.MeshStandardMaterial({ color: '#ffffff', map: texturaDisku(), roughness: 0.3, metalness: 0.85 });

/** Disk s piatimi lúčmi: strieborný veniec a stred, medzi lúčmi tmavé otvory (na čelách valca). */
function texturaDisku() {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = '#c5c9cd'; g.fillRect(0, 0, 128, 128);
  g.fillStyle = '#2a2c2e';
  for (let k = 0; k < 5; k++) {
    const u0 = (k / 5) * Math.PI * 2 + 0.28, u1 = ((k + 1) / 5) * Math.PI * 2 - 0.28;
    g.beginPath();
    g.arc(64, 64, 50, u0, u1);
    g.arc(64, 64, 18, u1, u0, true);
    g.closePath();
    g.fill();
  }
  g.fillStyle = '#9aa0a5'; g.beginPath(); g.arc(64, 64, 9, 0, Math.PI * 2); g.fill();
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}
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

  // nehybné časti zlúčené podľa materiálu (geometrie sú spoločné pre typ – poškodenie si ich pri náraze skopíruje)
  telo.add(new THREE.Mesh(g.karoseria, matKaroseria));
  telo.add(new THREE.Mesh(g.sklo, matSklo));
  telo.add(new THREE.Mesh(g.cierne, matCierna));
  telo.add(new THREE.Mesh(g.spz, texturaSpz()));

  // svetlá – každé zvlášť (pri náraze sa rozbije len to na strane nárazu)
  const zp = g.predok, zz = g.zadok, ys = g.vyskaSvetiel;
  const box = (w, h, d, mat, x, y, z) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z);
    telo.add(m);
    return m;
  };
  for (const x of [-1, 1]) {
    box(0.34, 0.11, 0.05, matSvetlo, x * (SIRKA / 2 - 0.27), ys, zp + 0.04);
    box(0.3, 0.12, 0.05, matZadne, x * (SIRKA / 2 - 0.24), g.vyskaZadnych, zz - 0.04);
  }
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
    koleso.add(new THREE.Mesh(geoPneu, matPneu), new THREE.Mesh(geoDisk, matDisk));
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
