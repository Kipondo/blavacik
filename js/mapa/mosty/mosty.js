// Všeobecný model mosta ponad rieku (mosty bez modelu z Blendera – data/mapa/mosty-rieky.json, záložne index.json):
// mostovka po osi mosta (aj v oblúku) vo výške z výškopisu (js/mapa/teren/mosty-vyskopisu.js – profil z laseru),
// rímsy s parapetom (cesta betónový, trať nízky okraj, lávka kovové zábradlie), podhľad, piliere mimo ciest a koľají
// pod mostom (s kolíziou), na koncoch opory a bočné steny až k terénu – medzi mostom a cestou na zemi nie je medzera.
// Úseky „bezModelu“ (trať na dolnom podlaží Prístavného mosta) stavia model z Blendera.

import * as THREE from 'three';
import { vytvorOs, bodNaOsi } from './os-mosta.js';

const KROK = 3;                   // m – vzorkovanie osi
const DETAIL_DO = 320;            // m – zábradlie a stĺpiky len zblízka

let MAT = null;
function materialy() {
  const S = THREE.DoubleSide;
  MAT ??= {
    beton: new THREE.MeshStandardMaterial({ color: '#a29e95', roughness: 0.88, side: S }),
    rimsa: new THREE.MeshStandardMaterial({ color: '#b6b2a9', roughness: 0.85, side: S }),
    ocel: new THREE.MeshStandardMaterial({ color: '#7d8783', roughness: 0.5, metalness: 0.55, side: S }),
    mostovka: new THREE.MeshStandardMaterial({ color: '#5a5856', roughness: 0.92, side: S }),
  };
  return MAT;
}

class Zberac {
  constructor() { this.p = []; }
  stvor(a, b, c, d) { this.p.push(...a, ...b, ...c, ...a, ...c, ...d); }
  /** Kváder so stredom podstavy (x, y0, z) do výšky y1, natočený podľa smeru (ux, uz). */
  kvader(x, y0, y1, z, sx, sz, ux, uz) {
    const nx = -uz, nz = ux;
    const r = (a, b) => [x + ux * a + nx * b, z + uz * a + nz * b];
    const k = [r(-sx / 2, -sz / 2), r(sx / 2, -sz / 2), r(sx / 2, sz / 2), r(-sx / 2, sz / 2)];
    for (let i = 0; i < 4; i++) {
      const [ax, az] = k[i], [bx, bz] = k[(i + 1) % 4];
      this.stvor([ax, y0, az], [bx, y0, bz], [bx, y1, bz], [ax, y1, az]);
    }
    this.stvor([k[0][0], y1, k[0][1]], [k[1][0], y1, k[1][1]], [k[2][0], y1, k[2][1]], [k[3][0], y1, k[3][1]]);
  }
  siet(mat, stred) {
    if (!this.p.length) return null;
    const g = new THREE.BufferGeometry();
    for (let i = 0; i < this.p.length; i += 3) { this.p[i] -= stred.x; this.p[i + 2] -= stred.z; }
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.p, 3));
    g.computeVertexNormals();
    const m = new THREE.Mesh(g, mat);
    m.castShadow = m.receiveShadow = true;
    return m;
  }
}

/** Hrúbka nosnej konštrukcie podľa druhu a dĺžky mosta. */
function hrubka(m, L) {
  if (m.druh === 'chodnik') return 0.55;
  if (m.druh === 'kolaj') return L < 60 ? 1.3 : 2.0;
  return L < 30 ? 0.9 : L < 120 ? 1.4 : 2.2;
}

/**
 * Postaví mosty (záznamy výškopisu s osou a profilom). kolizie = js/mapa/kolizie.js (piliere na zemi).
 * Vráti skupinu – každý most je samostatný LOD (zblízka so zábradlím, zďaleka len teleso).
 */
export function vytvorMosty(mosty, vyskopis, KONFIG, kolizie = null) {
  const skupina = new THREE.Group();
  skupina.name = 'mosty';
  const M = materialy();
  for (const m of mosty ?? []) {
    const os = m.os?.body ? m.os : vytvorOs(m.os ?? [m.od, m.do]);
    const L = os.dlzka;
    if (L < 2) continue;
    const h = (s) => (vyskopis.vyskaNaOsi ? vyskopis.vyskaNaOsi(m, s) : vyskopis.vyska(...(({ x, z }) => [x, z])(bodNaOsi(os, s))));
    const teren = (x, z) => (vyskopis.vyskaTerenu ?? vyskopis.vyska)(x, z);
    const W = m.sirka / 2, D = hrubka(m, L);
    const bez = m.bezModelu ?? [];
    const vynechat = (s) => bez.some(([a, b]) => s >= a && s <= b);
    const pod = (m.podjazdy ?? []).map(([a, b]) => [a - 3, b + 3]);

    // vzorky osi: poloha, smer, výška mostovky a terénu pod osou
    const n = Math.max(1, Math.ceil(L / KROK));
    const B = [];
    for (let i = 0; i <= n; i++) {
      const s = (i / n) * L;
      const p = bodNaOsi(os, s);
      // smer ako priemer okolia (plynulé rímsy v zákrute)
      const a = bodNaOsi(os, Math.max(0, s - 1.5)), b = bodNaOsi(os, Math.min(L, s + 1.5));
      const l = Math.hypot(b.x - a.x, b.z - a.z) || 1;
      B.push({ s, x: p.x, z: p.z, ux: (b.x - a.x) / l, uz: (b.z - a.z) / l, h: h(s), t: teren(p.x, p.z) });
    }
    const bod = (p, o, y) => [p.x + p.uz * o, y, p.z - p.ux * o];        // o > 0 vľavo (ako Y v Blenderi)

    const telo = new Zberac(), rimsa = new Zberac(), mostovka = new Zberac(), ocel = new Zberac();
    for (let i = 0; i < n; i++) {
      const p = B[i], q = B[i + 1];
      if (vynechat(p.s) || vynechat(q.s)) continue;
      // doska mostovky (tesne pod vozovkou z OSM), podhľad, boky
      mostovka.stvor(bod(p, W, p.h - 0.03), bod(q, W, q.h - 0.03), bod(q, -W, q.h - 0.03), bod(p, -W, p.h - 0.03));
      const Wd = W - 0.5;
      telo.stvor(bod(p, -Wd, p.h - D), bod(q, -Wd, q.h - D), bod(q, Wd, q.h - D), bod(p, Wd, p.h - D));
      for (const sg of [1, -1]) {
        // šikmý bok od okraja dosky k podhľadu
        telo.stvor(bod(p, sg * W, p.h - 0.35), bod(q, sg * W, q.h - 0.35), bod(q, sg * Wd, q.h - D), bod(p, sg * Wd, p.h - D));
        // rímsa (obrubník a parapet podľa druhu)
        const vys = m.druh === 'cesta' ? 0.8 : m.druh === 'kolaj' ? 0.55 : 0.15;
        const r0 = sg * W, r1 = sg * (W - 0.35);
        rimsa.stvor(bod(p, r0, p.h - 0.35), bod(q, r0, q.h - 0.35), bod(q, r0, q.h + vys), bod(p, r0, p.h + vys));
        rimsa.stvor(bod(p, r1, p.h - 0.02), bod(q, r1, q.h - 0.02), bod(q, r1, q.h + vys), bod(p, r1, p.h + vys));
        rimsa.stvor(bod(p, r0, p.h + vys), bod(q, r0, q.h + vys), bod(q, r1, q.h + vys), bod(p, r1, p.h + vys));
        // násyp pri konci: kde je mostovka nízko nad terénom, bok až do zeme (žiadna škára pod koncom mosta)
        if (m.hradza || p.h - p.t < 4 || q.h - q.t < 4) {
          telo.stvor(bod(p, sg * W, p.t - 1.0), bod(q, sg * W, q.t - 1.0), bod(q, sg * W, q.h - 0.35), bod(p, sg * W, p.h - 0.35));
        }
      }
    }
    // zábradlie (madlo a stĺpiky) na rímse
    const madlo = m.druh === 'chodnik' ? 1.1 : m.druh === 'cesta' ? 1.15 : 0.95;
    for (const sg of [1, -1]) {
      const o = sg * (W - 0.18);
      for (let i = 0; i < n; i++) {
        const p = B[i], q = B[i + 1];
        if (vynechat(p.s) || vynechat(q.s)) continue;
        const a = bod(p, o, p.h + madlo), b = bod(q, o, q.h + madlo);
        ocel.stvor([a[0], a[1] - 0.06, a[2]], [b[0], b[1] - 0.06, b[2]], [b[0], b[1], b[2]], [a[0], a[1], a[2]]);
        const [x, , z] = bod(p, o, 0);
        ocel.kvader(x, p.h, p.h + madlo, z, 0.06, 0.06, p.ux, p.uz);
      }
    }

    // piliere: kde je pod mostom voľný priestor; rozostup podľa druhu, mimo ciest a koľají pod mostom
    const rozostup = m.druh === 'chodnik' ? 18 : 30;
    const piliere = [];
    if (L > rozostup * 1.4 && !m.hradza) {
      const k = Math.round(L / rozostup);
      for (let i = 1; i < k; i++) {
        const s = (i / k) * L;
        if (vynechat(s) || pod.some(([a, b]) => s >= a && s <= b)) continue;
        const p = B[Math.round(s / L * n)];
        if (p.h - p.t < D + 2.5) continue;
        piliere.push(p);
      }
    }
    for (const p of piliere) {
      const dno = Math.min(p.t, KONFIG?.HLBKA_KORYTA ?? p.t) - 2;
      const hore = p.h - D;
      if (W > 7.5) {
        for (const sg of [1, -1]) {
          const [x, , z] = bod(p, sg * W * 0.45, 0);
          telo.kvader(x, dno, hore, z, 1.4, 1.8, p.ux, p.uz);
          kolizie?.pridajPolygon(stvorec(x, z, 1.6, 2.0, p.ux, p.uz), { typ: 'most', nazov: m.nazov });
        }
        telo.kvader(p.x, hore - 1.0, hore, p.z, 1.8, 2 * W - 1.0, p.ux, p.uz);
      } else {
        telo.kvader(p.x, dno, hore, p.z, 1.2, Math.max(2.5, 2 * W * 0.8), p.ux, p.uz);
        kolizie?.pridajPolygon(stvorec(p.x, p.z, 1.4, Math.max(2.7, 2 * W * 0.8 + 0.2), p.ux, p.uz), { typ: 'most', nazov: m.nazov });
      }
    }
    // opory: kde sa pod koncom mosta otvára priestor (mostovka vyššie ako konštrukcia nad terénom) – čelná stena
    for (const [i0, krok] of [[0, 1], [n, -1]]) {
      let i = i0;
      while (i > 0 && i < n && B[i].h - B[i].t < D + 0.4) i += krok;
      if (i <= 0 || i >= n || vynechat(B[i].s)) continue;
      const p = B[i];
      telo.kvader(p.x, p.t - 1.5, p.h - D + 0.05, p.z, 1.2, 2 * W + 0.4, p.ux, p.uz);
    }

    const stred = B[Math.floor(n / 2)];
    const lod = new THREE.LOD();
    const blizko = new THREE.Group(), daleko = new THREE.Group();
    for (const [z, mat] of [[telo, M.beton], [rimsa, M.rimsa], [mostovka, M.mostovka]]) {
      const s1 = z.siet(mat, stred);
      if (s1) { blizko.add(s1); daleko.add(new THREE.Mesh(s1.geometry, mat)); }
    }
    const zabr = ocel.siet(M.ocel, stred);
    if (zabr) blizko.add(zabr);
    lod.addLevel(blizko, 0);
    lod.addLevel(daleko, DETAIL_DO);
    lod.position.set(stred.x, 0, stred.z);
    lod.name = `most:${m.nazov}`;
    skupina.add(lod);
  }
  return skupina;
}

/** Obdĺžnik (pôdorys piliera) natočený podľa smeru mosta – pre kolízie. */
function stvorec(x, z, a, b, ux, uz) {
  const nx = -uz, nz = ux;
  return [[-a / 2, -b / 2], [a / 2, -b / 2], [a / 2, b / 2], [-a / 2, b / 2]].map(([p, q]) => [x + ux * p + nx * q, z + uz * p + nz * q]);
}
