// Spoločné pomôcky pre modely pamiatok (low-poly).

import * as THREE from 'three';
import { texturaOkien, OKNO_SIRKA, OKNO_VYSKA } from '../budovy/textura-okien.js';

const cacheMaterialov = new Map();

/** Materiál podľa farby (zdieľaný). okna = true → fasáda s oknami. */
export function material(farba, { okna = false, lesk = 0, kov = 0, priehladnost = 1 } = {}) {
  const kluc = `${farba}|${okna}|${lesk}|${kov}|${priehladnost}`;
  if (!cacheMaterialov.has(kluc)) {
    cacheMaterialov.set(kluc, new THREE.MeshStandardMaterial({
      color: farba,
      map: okna ? texturaOkien() : null,
      roughness: 1 - lesk,
      metalness: kov,
      transparent: priehladnost < 1,
      opacity: priehladnost,
    }));
  }
  return cacheMaterialov.get(kluc);
}

/** Kváder s oknami – UV sú v metroch, takže okná majú všade rovnakú veľkosť. */
export function kvaderSOknami(sirka, vyska, hlbka, farba, moznosti = {}) {
  const geo = new THREE.BoxGeometry(sirka, vyska, hlbka);
  const uv = geo.attributes.uv;
  // BoxGeometry: 6 stien po 4 vrcholy v poradí +x, -x, +y, -y, +z, -z
  const rozmery = [[hlbka, vyska], [hlbka, vyska], [sirka, hlbka], [sirka, hlbka], [sirka, vyska], [sirka, vyska]];
  for (let s = 0; s < 6; s++) {
    const [w, h] = rozmery[s];
    const strecha = s === 2 || s === 3;
    for (let k = 0; k < 4; k++) {
      const i = s * 4 + k;
      if (strecha) uv.setXY(i, 0.99, 0.99); // biely roh textúry
      else uv.setXY(i, (uv.getX(i) * w) / (OKNO_SIRKA * 4), (uv.getY(i) * h) / (OKNO_VYSKA * 4));
    }
  }
  const mesh = new THREE.Mesh(geo, material(farba, { okna: true, ...moznosti }));
  mesh.castShadow = mesh.receiveShadow = true;
  return mesh;
}

/** Jednoduchý kváder bez okien. */
export function kvader(sirka, vyska, hlbka, farba, moznosti = {}) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(sirka, vyska, hlbka), material(farba, moznosti));
  mesh.castShadow = mesh.receiveShadow = true;
  return mesh;
}

/** Ihlanová strecha (4-boká) s podstavou sirka × hlbka. */
export function ihlan(sirka, vyska, hlbka, farba) {
  const geo = new THREE.ConeGeometry(Math.SQRT1_2, 1, 4, 1);
  geo.rotateY(Math.PI / 4);
  geo.scale(sirka, vyska, hlbka);
  geo.translate(0, vyska / 2, 0);
  const mesh = new THREE.Mesh(geo, material(farba));
  mesh.castShadow = true;
  return mesh;
}

/** Valec / kužeľ. */
export function valec(rHore, rDole, vyska, farba, segmenty = 12, moznosti = {}) {
  const geo = new THREE.CylinderGeometry(rHore, rDole, vyska, segmenty);
  geo.translate(0, vyska / 2, 0);
  const mesh = new THREE.Mesh(geo, material(farba, moznosti));
  mesh.castShadow = mesh.receiveShadow = true;
  return mesh;
}

/** Valbová (sedlová so zrezanými koncami) strecha na obdĺžnik sirka × hlbka. */
export function valbovaStrecha(sirka, vyska, hlbka, farba) {
  const dlha = Math.max(sirka, hlbka), kratka = Math.min(sirka, hlbka);
  const pol = Math.max(0, dlha / 2 - kratka / 2);
  const hw = sirka / 2, hd = hlbka / 2;
  const pozdlzX = sirka >= hlbka;
  const r1 = pozdlzX ? [-pol, vyska, 0] : [0, vyska, -pol];
  const r2 = pozdlzX ? [pol, vyska, 0] : [0, vyska, pol];
  const A = [-hw, 0, -hd], B = [hw, 0, -hd], C = [hw, 0, hd], D = [-hw, 0, hd];
  const troj = pozdlzX
    ? [[A, r1, r2], [A, r2, B], [C, r2, r1], [C, r1, D], [B, r2, C], [D, r1, A]]
    : [[A, r1, B], [B, r1, r2], [B, r2, C], [C, r2, D], [D, r2, r1], [D, r1, A]];
  const poz = [];
  for (const [a, b, c] of troj) {
    // normála von od stredu
    const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2];
    const vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
    const nx = uy * vz - uz * vy, nz = ux * vy - uy * vx;
    const mx = (a[0] + b[0] + c[0]) / 3, mz = (a[2] + b[2] + c[2]) / 3;
    if (nx * mx + nz * mz >= 0) poz.push(...a, ...b, ...c);
    else poz.push(...a, ...c, ...b);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(poz, 3));
  geo.computeVertexNormals();
  const mesh = new THREE.Mesh(geo, material(farba));
  mesh.castShadow = true;
  return mesh;
}

/** Najnižšia výška terénu pod obdĺžnikom (aby stavba nevisela vo vzduchu). */
export function zakladna(vyskopis, x, z, sirka, hlbka) {
  let min = Infinity;
  for (const [dx, dz] of [[0, 0], [-1, -1], [1, -1], [1, 1], [-1, 1]]) {
    min = Math.min(min, vyskopis.vyskaTerenu(x + (dx * sirka) / 2, z + (dz * hlbka) / 2));
  }
  return min;
}

// --- rozšírené pomôcky (fasády s rôznymi oknami, rímsy, stĺpy, kupoly) ---
import { texturaKlasickychOkien, texturaSkla } from './textury.js';

const cacheFasad = new Map();
function materialFasady(farba, druh) {
  const kluc = `${farba}|${druh}`;
  if (!cacheFasad.has(kluc)) {
    const map = druh === 'sklo' ? texturaSkla() : druh === 'klasicke' ? texturaKlasickychOkien() : texturaOkien();
    cacheFasad.set(kluc, new THREE.MeshStandardMaterial({
      color: farba, map,
      roughness: druh === 'sklo' ? 0.15 : 0.85,
      metalness: druh === 'sklo' ? 0.55 : 0,
    }));
  }
  return cacheFasad.get(kluc);
}

/**
 * Kváder s fasádou: druh = 'klasicke' (barokové okná), 'sklo' (sklenená fasáda), 'okna' (bežné).
 * okno = [šírka, výška] jednej dlaždice v metroch. Strecha (vrch) má farbu `strecha`.
 */
export function fasada(sirka, vyska, hlbka, farba, { druh = 'klasicke', okno = [3.6, 4.2], strecha = '#8a8780' } = {}) {
  const geo = new THREE.BoxGeometry(sirka, vyska, hlbka);
  const uv = geo.attributes.uv;
  const rozmery = [[hlbka, vyska], [hlbka, vyska], [sirka, hlbka], [sirka, hlbka], [sirka, vyska], [sirka, vyska]];
  for (let s = 0; s < 6; s++) {
    const [w, h] = rozmery[s];
    for (let k = 0; k < 4; k++) {
      const i = s * 4 + k;
      uv.setXY(i, Math.max(1, Math.round(w / okno[0])) * uv.getX(i), Math.max(1, Math.round(h / okno[1])) * uv.getY(i));
    }
  }
  const stena = materialFasady(farba, druh);
  const vrch = material(strecha);
  const mesh = new THREE.Mesh(geo, [stena, stena, vrch, vrch, stena, stena]);
  mesh.castShadow = mesh.receiveShadow = true;
  return mesh;
}

/** Rímsa – tenký presahujúci pás okolo kvádra. */
export function rimsa(sirka, hlbka, y, farba = '#f4f1ea', presah = 0.5, hrubka = 0.6) {
  const m = kvader(sirka + presah * 2, hrubka, hlbka + presah * 2, farba);
  m.position.y = y;
  return m;
}

/** Rad stĺpov pozdĺž osi x (napr. portikus). */
export function stlpy(pocet, rozostup, vyska, polomer, farba = '#f4f1ea') {
  const g = new THREE.Group();
  for (let i = 0; i < pocet; i++) {
    const s = valec(polomer, polomer * 1.1, vyska, farba, 12);
    s.position.x = (i - (pocet - 1) / 2) * rozostup;
    g.add(s);
  }
  return g;
}

/** Kupola (pologuľa), voliteľne s lucernou. */
export function kupola(polomer, farba, { vyskaPomer = 1, lucerna = true, farbaLucerny = '#e8e4da' } = {}) {
  const g = new THREE.Group();
  const geo = new THREE.SphereGeometry(polomer, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2);
  geo.scale(1, vyskaPomer, 1);
  const k = new THREE.Mesh(geo, material(farba, { lesk: 0.3, kov: 0.3 }));
  k.castShadow = true;
  g.add(k);
  if (lucerna) {
    const l = valec(polomer * 0.18, polomer * 0.2, polomer * 0.45, farbaLucerny, 8);
    l.position.y = polomer * vyskaPomer * 0.92;
    g.add(l);
    const h = valec(0.02, polomer * 0.2, polomer * 0.35, farba, 8);
    h.position.y = polomer * vyskaPomer * 0.92 + polomer * 0.45;
    g.add(h);
  }
  return g;
}

/** Trojuholníkový štít (tympanón) nad portikom. Šírka v x, hĺbka v z. */
export function stit(sirka, vyska, hlbka, farba = '#f4f1ea') {
  const tvar = new THREE.Shape([new THREE.Vector2(-sirka / 2, 0), new THREE.Vector2(sirka / 2, 0), new THREE.Vector2(0, vyska)]);
  const geo = new THREE.ExtrudeGeometry(tvar, { depth: hlbka, bevelEnabled: false });
  geo.translate(0, 0, -hlbka / 2);
  const m = new THREE.Mesh(geo, material(farba));
  m.castShadow = true;
  return m;
}

/** Skupina umiestnená na mape podľa záznamu pamiatky (poloha, natočenie, výška terénu). */
export function naMiesto(skupina, p, vyskopis, sirka = 10, hlbka = 10) {
  skupina.position.set(p.x, zakladna(vyskopis, p.x, p.z, sirka, hlbka), p.z);
  skupina.rotation.y = p.natocenie ?? 0;
  return skupina;
}

/** Tenký trám (kváder) medzi dvoma bodmi [x,y,z]. */
export function tram(a, b, hrubka, farba, moznosti = {}) {
  const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b);
  const d = A.distanceTo(B);
  const m = new THREE.Mesh(new THREE.BoxGeometry(hrubka, hrubka, d), material(farba, moznosti));
  m.position.copy(A).add(B).multiplyScalar(0.5);
  m.lookAt(B);
  m.castShadow = true;
  return m;
}

/** Veľa trámov naraz (InstancedMesh) – laná, priehradové nosníky. */
export function tramy(useky, hrubka, farba, moznosti = {}) {
  const im = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), material(farba, moznosti), useky.length);
  const o = new THREE.Object3D();
  useky.forEach(([a, b], i) => {
    const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b);
    o.position.copy(A).add(B).multiplyScalar(0.5);
    o.scale.set(hrubka, hrubka, A.distanceTo(B));
    o.lookAt(B);
    o.updateMatrix();
    im.setMatrixAt(i, o.matrix);
  });
  im.castShadow = true;
  im.computeBoundingSphere();
  return im;
}
