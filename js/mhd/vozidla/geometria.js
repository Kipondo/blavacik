// Geometria vozidiel MHD – procedurálne, bez súborov. Každý článok má tri časti:
//   karoseria (farby vo vrcholoch), sklo (okná, čelné sklo, otvory dverí), svetla (svietiace).
// Plus spoločné krídlo dverí (posúva sa pri otvorení – vykreslenie.js).
//
// Lokálne osi článku: +z = dopredu (smer jazdy), y = hore (0 = koľaj/cesta), pravá strana vozidla je −x.
// Stred článku je v strede jeho dĺžky.

import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { MEDZERA } from './typy.js';

// farby (vlastná schéma inšpirovaná červeno-bielou Bratislavou, bez značiek)
const F = {
  cervena: 0xc8102e, biela: 0xf2f2ef, strecha: 0xd3d7da, tmava: 0x26292c, mech: 0x1c1e20,
  koleso: 0x151617, disk: 0x9aa0a6, sedaZlta: 0xf0b323, stlpik: 0x3a3f44,
  svetloPredne: 0xfff3d1, svetloZadne: 0xff2414, smerovka: 0xffa21a,
};

const farba = new THREE.Color();

/** Zbiera kúsky geometrie jednej časti (všetky bez indexu, s normálami a farbami). */
class Diel {
  constructor() { this.kusy = []; }

  pridaj(geo, hex, matica) {
    let g = geo.index ? geo.toNonIndexed() : geo;
    g.deleteAttribute('uv');
    if (matica) g.applyMatrix4(matica);
    if (!g.getAttribute('normal')) g.computeVertexNormals();
    const n = g.getAttribute('position').count;
    const c = new Float32Array(n * 3);
    farba.setHex(hex); // setHex prevedie zo sRGB do lineárneho priestoru
    for (let i = 0; i < n; i++) { c[i * 3] = farba.r; c[i * 3 + 1] = farba.g; c[i * 3 + 2] = farba.b; }
    g.setAttribute('color', new THREE.BufferAttribute(c, 3));
    this.kusy.push(g);
    return g;
  }

  /** Kváder so stredom (cx, cy, cz). */
  kvader(sx, sy, sz, cx, cy, cz, hex, natocenie) {
    const g = new THREE.BoxGeometry(sx, sy, sz);
    const m = new THREE.Matrix4();
    if (natocenie) m.makeRotationFromEuler(natocenie);
    m.setPosition(cx, cy, cz);
    return this.pridaj(g, hex, m);
  }

  /** Valec s osou pozdĺž x (koleso). */
  koleso(r, sirka, cx, cy, cz, hex) {
    const g = new THREE.CylinderGeometry(r, r, sirka, 14);
    const m = new THREE.Matrix4().makeRotationZ(Math.PI / 2).setPosition(cx, cy, cz);
    return this.pridaj(g, hex, m);
  }

  /** Tyč z bodu a do bodu b (štvorcový prierez). */
  tyc(a, b, hrubka, hex) {
    const d = new THREE.Vector3().subVectors(b, a);
    const g = new THREE.BoxGeometry(hrubka, hrubka, d.length());
    const m = new THREE.Matrix4().lookAt(new THREE.Vector3(), d, new THREE.Vector3(0, 1, 0));
    m.setPosition(a.clone().add(b).multiplyScalar(0.5));
    return this.pridaj(g, hex, m);
  }

  hotovo() {
    if (!this.kusy.length) return new THREE.BufferGeometry();
    const g = mergeGeometries(this.kusy, false);
    g.computeBoundingSphere();
    return g;
  }
}

/** Telo článku: vytiahnutý prierez so zaoblenou strechou, prefarbený po pásoch podľa výšky. */
function telo(diel, t, d) {
  const w = t.sirka / 2, y0 = t.podlaha, H = t.vyska, r = 0.42, rb = 0.06;
  const pas1 = y0 + 0.22, pas2 = t.typ === 'elektricka' ? 1.18 : 1.05;
  const s = new THREE.Shape();
  s.moveTo(-w + rb, y0);
  s.lineTo(w - rb, y0);
  s.quadraticCurveTo(w, y0, w, y0 + rb);
  s.lineTo(w, pas1); s.lineTo(w, pas2); s.lineTo(w, H - r);
  s.quadraticCurveTo(w, H, w - r, H);
  s.lineTo(-w + r, H);
  s.quadraticCurveTo(-w, H, -w, H - r);
  s.lineTo(-w, pas2); s.lineTo(-w, pas1); s.lineTo(-w, y0 + rb);
  s.quadraticCurveTo(-w, y0, -w + rb, y0);
  const g = new THREE.ExtrudeGeometry(s, { depth: d, bevelEnabled: false, curveSegments: 4, steps: 1 });
  g.translate(0, 0, -d / 2);
  const geo = diel.pridaj(g, F.biela);
  // prefarbenie po trojuholníkoch
  const pos = geo.getAttribute('position'), nor = geo.getAttribute('normal'), col = geo.getAttribute('color');
  const c = new THREE.Color();
  for (let i = 0; i < pos.count; i += 3) {
    const cy = (pos.getY(i) + pos.getY(i + 1) + pos.getY(i + 2)) / 3;
    const nz = Math.abs(nor.getZ(i)), ny = nor.getY(i);
    let hex;
    if (nz > 0.7) hex = F.cervena;                 // čelá (zakryje ich predok / mech)
    else if (ny > 0.55) hex = F.strecha;
    else if (ny < -0.55) hex = F.tmava;
    else if (cy < pas1) hex = F.tmava;
    else if (cy < pas2) hex = F.cervena;
    else hex = F.biela;
    c.setHex(hex);
    for (let k = 0; k < 3; k++) col.setXYZ(i + k, c.r, c.g, c.b);
  }
}

/** Okná po bokoch (pás skla) s prerušením pri dverách na pravej strane (−x). */
function okna(sklo, t, d, dvere, predok, zadok) {
  const w = t.sirka / 2 + 0.012;
  const y0 = t.typ === 'elektricka' ? 1.32 : 1.18, y1 = t.vyska - 0.5;
  const zMin = -d / 2 + (zadok ? 0.9 : 0.35), zMax = d / 2 - (predok ? 1.6 : 0.35);
  const sirkaDveri = 1.32;
  for (const strana of [-1, 1]) {
    // úseky bez dverí (dvere sú len vpravo)
    const prerusenia = strana < 0 ? dvere.map((z) => [z - sirkaDveri / 2 - 0.08, z + sirkaDveri / 2 + 0.08]) : [];
    prerusenia.sort((a, b) => a[0] - b[0]);
    let od = zMin;
    for (const [a, b] of [...prerusenia, [zMax, zMax]]) {
      const doo = Math.min(a, zMax);
      if (doo - od > 0.3) {
        // okno rozdelené na tabule po ~1,6 m tenkými stĺpikmi (stĺpiky = medzery)
        const n = Math.max(1, Math.round((doo - od) / 1.6));
        const dl = (doo - od) / n;
        for (let i = 0; i < n; i++) {
          sklo.kvader(0.02, y1 - y0, dl - 0.1, strana * w, (y0 + y1) / 2, od + dl * (i + 0.5), 0x3c4d5a);
        }
      }
      od = Math.max(od, b);
    }
  }
  // otvory dverí (tmavé, zakryjú ich krídla, keď sú zatvorené)
  for (const z of dvere) sklo.kvader(0.02, y1 - t.podlaha - 0.05, sirkaDveri, -w + 0.004, (y1 + t.podlaha + 0.05) / 2, z, 0x121314);
}

/** Predok s čelným sklom, displejom a svetlami (na +z konci). */
function predok(diel, sklo, svetla, t, d) {
  const w = t.sirka / 2, z = d / 2;
  const el = t.typ === 'elektricka';
  const yS0 = el ? 1.05 : 0.95, yS1 = t.vyska - 0.55;
  // čelné sklo mierne naklonené dozadu
  sklo.kvader(t.sirka - 0.16, yS1 - yS0, 0.04, 0, (yS0 + yS1) / 2, z + 0.03, 0x36495a, new THREE.Euler(-0.08, 0, 0));
  // rám čelného skla
  diel.kvader(t.sirka - 0.02, 0.1, 0.06, 0, yS0 - 0.03, z + 0.02, F.tmava);
  for (const s of [-1, 1]) diel.kvader(0.1, yS1 - yS0, 0.06, s * (w - 0.04), (yS0 + yS1) / 2, z + 0.02, F.tmava);
  // displej nad sklom (text dopĺňa displeje.js)
  sklo.kvader(t.sirka - 0.5, 0.3, 0.05, 0, t.vyska - 0.33, z + 0.03, 0x050505);
  // bočné okná kabíny
  for (const s of [-1, 1]) sklo.kvader(0.02, yS1 - yS0 - 0.1, 1.2, s * (w + 0.012), (yS0 + yS1) / 2 + 0.05, z - 0.75, 0x36495a);
  // nárazník / spodná maska
  diel.kvader(t.sirka - 0.04, 0.32, 0.12, 0, t.podlaha + 0.18, z + 0.05, F.tmava);
  // svetlá
  for (const s of [-1, 1]) {
    svetla.kvader(0.36, 0.13, 0.05, s * (w - 0.38), el ? 0.82 : 0.72, z + 0.06, F.svetloPredne);
    svetla.kvader(0.12, 0.08, 0.05, s * (w - 0.14), el ? 0.82 : 0.72, z + 0.06, F.smerovka);
  }
  // spätné zrkadlá
  if (!el) for (const s of [-1, 1]) diel.kvader(0.08, 0.38, 0.22, s * (w + 0.22), t.vyska - 1.05, z - 0.25, F.tmava);
}

/** Zadok so zadným oknom a zadnými svetlami (na −z konci). */
function zadok(diel, sklo, svetla, t, d) {
  const w = t.sirka / 2, z = -d / 2;
  sklo.kvader(t.sirka - 0.5, 1.0, 0.04, 0, t.vyska - 1.2, z - 0.03, 0x36495a);
  sklo.kvader(t.sirka - 1.2, 0.22, 0.05, 0, t.vyska - 0.4, z - 0.03, 0x050505);
  diel.kvader(t.sirka - 0.04, 0.3, 0.1, 0, t.podlaha + 0.17, z - 0.04, F.tmava);
  for (const s of [-1, 1]) {
    svetla.kvader(0.2, 0.36, 0.05, s * (w - 0.16), 0.95, z - 0.05, F.svetloZadne);
    svetla.kvader(0.14, 0.12, 0.05, s * (w - 0.16), 1.25, z - 0.05, F.smerovka);
  }
}

/** Mech medzi článkami – na +z konci zadného článku. */
function mech(diel, t, d) {
  diel.kvader(t.sirka - 0.18, t.vyska - t.podlaha - 0.3, MEDZERA + 0.1, 0, (t.vyska + t.podlaha) / 2 - 0.05, d / 2 + MEDZERA / 2, F.mech);
}

function podvozokElektricky(diel, t, d) {
  // podvozky pod článkom (tmavé), kolesá skryté za krytmi
  diel.kvader(t.sirka - 0.5, 0.26, 2.0, 0, 0.15, 0, F.koleso);
  for (const s of [-1, 1]) diel.koleso(0.33, 0.12, s * (t.sirka / 2 - 0.42), 0.33, 0.6, F.koleso);
}

function kolesaAutobusu(diel, t, napravy) {
  for (const z of napravy) {
    for (const s of [-1, 1]) {
      diel.koleso(0.5, 0.3, s * (t.sirka / 2 - 0.2), 0.5, z, F.koleso);
      diel.koleso(0.26, 0.31, s * (t.sirka / 2 - 0.2), 0.5, z, F.disk);
    }
  }
}

function zberac(diel, t) {
  // jednoramenný zberač prúdu na streche stredného článku
  const y = t.vyska;
  diel.kvader(1.4, 0.16, 1.1, 0, y + 0.08, 0, F.tmava);
  const a = new THREE.Vector3(0, y + 0.2, -0.45), b = new THREE.Vector3(0, y + 0.75, 0.55), c = new THREE.Vector3(0, y + 1.25, -0.2);
  for (const s of [-0.25, 0.25]) diel.tyc(a.clone().setX(s), b.clone().setX(s * 0.4), 0.06, F.stlpik);
  diel.tyc(b, c, 0.05, F.stlpik);
  diel.kvader(1.6, 0.05, 0.12, 0, c.y, c.z, F.stlpik);
}

function tyceTrolejbusu(diel, t, d) {
  // dve tyče od strechy dozadu-hore k (pomyselnému) trolejovému vedeniu vo výške ~5,6 m
  const y = t.vyska;
  diel.kvader(1.2, 0.2, 1.6, 0, y + 0.1, -d / 2 + 1.6, F.tmava);
  for (const s of [-0.35, 0.35]) {
    const a = new THREE.Vector3(s, y + 0.25, -d / 2 + 1.9);
    const b = new THREE.Vector3(s * 1.15, 5.6, -d / 2 + 1.9 - 5.4);
    diel.tyc(a, b, 0.07, F.stlpik);
    diel.kvader(0.12, 0.1, 0.35, b.x, b.y, b.z, F.tmava);
  }
}

function strechaAutobusu(diel, t, d, dlzkaJednotky) {
  // klimatizácia / batérie na streche
  diel.kvader(t.sirka - 0.7, 0.28, Math.min(3.2, dlzkaJednotky), 0, t.vyska + 0.12, d / 2 - 2.6, F.strecha);
}

/** Postaví geometriu jedného článku. */
function postavClanok(t, c, index, pocet) {
  const kar = new Diel(), sklo = new Diel(), svetla = new Diel();
  const jePredok = index === 0, jeZadok = index === pocet - 1;
  telo(kar, t, c.d);
  okna(sklo, t, c.d, c.dvere, jePredok, jeZadok);
  if (jePredok) predok(kar, sklo, svetla, t, c.d);
  if (jeZadok) zadok(kar, sklo, svetla, t, c.d);
  if (!jePredok) mech(kar, t, c.d);
  if (t.typ === 'elektricka') {
    podvozokElektricky(kar, t, c.d);
    if (c.varianta === 'el-stredny') zberac(kar, t);
  } else {
    kolesaAutobusu(kar, t, t.napravy?.[c.varianta] ?? [c.d / 2 - 2.7, -c.d / 2 + 3.0]);
    if (c.varianta === 'trol-predny') tyceTrolejbusu(kar, t, c.d);
    else if (jePredok) strechaAutobusu(kar, t, c.d, 3);
  }
  return { karoseria: kar.hotovo(), sklo: sklo.hotovo(), svetla: svetla.hotovo() };
}

/** Krídlo dverí: dole biely panel, hore sklo (farby vo vrcholoch, materiál karosérie). */
export function geometriaKridla(vyska) {
  const d = new Diel();
  d.kvader(0.03, 0.9, 0.62, 0, 0.45, 0, F.biela);
  d.kvader(0.03, vyska - 0.9, 0.62, 0, 0.9 + (vyska - 0.9) / 2, 0, 0x2b3a46);
  d.kvader(0.035, 0.06, 0.62, 0, vyska - 0.03, 0, F.tmava);
  return d.hotovo();
}

/** Geometrie všetkých variantov článkov pre zoznam typov: Map(varianta → { karoseria, sklo, svetla }). */
export function postavGeometrie(typy) {
  const out = new Map();
  for (const t of typy) {
    t.clanky.forEach((c, i) => {
      if (!out.has(c.varianta)) out.set(c.varianta, postavClanok(t, c, i, t.clanky.length));
    });
  }
  return out;
}
