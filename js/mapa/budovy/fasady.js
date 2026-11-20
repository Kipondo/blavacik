// Fasády budov: okná s rámom, sklom, parapetom a šambránou, rímsy, výklady a dvere na prízemí.
//
// Atlas sa kreslí v prehliadači (žiadne cudzie textúry okien): bunka = jedna okenná os × jedno podlažie.
//   stĺpce = štýl (0 historická, 1 obytná, 2 kancelárie, 3 jednoduchá)
//   riadky = 0 podlažie, 1 prízemie s výkladom, 2 prízemie s dverami, 3 podlažie – druhý variant (podľa budovy)
// Tri textúry: farba + maska omietky (A = 1 → nefarbí sa farbou budovy), normálová mapa, (drsnosť, tieň).
// Jemná štruktúra omietky je CC0 textúra Plaster001 z ambientCG (assets/textury/omietka).
//
// UV steny (počíta budovy.js):
//   u = okenné osi (celé čísla na rohoch steny, okná sa nerežú),
//   v = podlažia: v < 0 sokel, 0–1 prízemie, 1…1+f poschodia, v ≥ 100 atika s hlavnou rímsou (100 + 0…1); u ≥ 200 slepá stena bez okien.
// aMetre = (metre pozdĺž steny, výška v m) pre omietku; aTyp = štýl + 0,9·náhoda budovy.

import * as THREE from 'three';

export const STYLY = { stare: 0, obytne: 1, kancelarie: 2, jednoduche: 3 };
// šírka okennej osi, výška prízemia a podlažia (m) podľa štýlu
export const PARAMETRE = [
  { os: 3.3, prizemie: 4.4, podlazie: 3.7 },
  { os: 3.0, prizemie: 3.1, podlazie: 2.9 },
  { os: 2.7, prizemie: 4.4, podlazie: 3.7 },
  { os: 3.1, prizemie: 3.3, podlazie: 3.1 },
];

const C = 384;               // pixelov na bunku
const STLPCE = 4, RIADKY = 4;

// --- kreslenie do štyroch plátien naraz -------------------------------------------------
function platna() {
  const vytvor = (farba) => {
    const c = document.createElement('canvas');
    c.width = C * STLPCE; c.height = C * RIADKY;
    const g = c.getContext('2d', { willReadFrequently: true });
    g.fillStyle = farba; g.fillRect(0, 0, c.width, c.height);
    return g;
  };
  return {
    farba: vytvor('#ffffff'),      // farba nefarbených prvkov (sklo, rámy, kameň)
    maska: vytvor('#000000'),      // 1 = prvok má vlastnú farbu, 0 = omietka vo farbe budovy
    normal: vytvor('rgb(128,128,255)'),
    drsnost: vytvor('#e6e6e6'),    // R = drsnosť
    tien: vytvor('#ffffff'),       // R = zatienenie (AO)
  };
}

const NORM = {
  hore: 'rgb(128,214,214)', dole: 'rgb(128,42,214)', vlavo: 'rgb(42,128,214)', vpravo: 'rgb(214,128,214)', rovno: 'rgb(128,128,255)',
};

/** Obdĺžnik v bunke: x, y, w, h v podieloch bunky (y zhora); hlbka > 0 vystupuje, < 0 je zapustený. */
function prvok(P, ox, oy, { x, y, w, h, farba = null, drsnost = 0.9, hlbka = 0, hrana = 4, tien = 1 }) {
  const X = Math.round(ox + x * C), Y = Math.round(oy + y * C), Wd = Math.round(w * C), Hd = Math.round(h * C);
  if (farba) {
    P.farba.fillStyle = farba; P.farba.fillRect(X, Y, Wd, Hd);
    P.maska.fillStyle = '#ffffff'; P.maska.fillRect(X, Y, Wd, Hd);
  }
  const r = Math.round(drsnost * 255);
  P.drsnost.fillStyle = `rgb(${r},${r},${r})`; P.drsnost.fillRect(X, Y, Wd, Hd);
  if (tien < 1) { const t = Math.round(tien * 255); P.tien.fillStyle = `rgb(${t},${t},${t})`; P.tien.fillRect(X, Y, Wd, Hd); }
  P.normal.fillStyle = NORM.rovno; P.normal.fillRect(X, Y, Wd, Hd);
  if (hlbka !== 0) {
    const e = Math.min(hrana, Wd / 2, Hd / 2), von = hlbka > 0;
    P.normal.fillStyle = von ? NORM.hore : NORM.dole; P.normal.fillRect(X, Y, Wd, e);
    P.normal.fillStyle = von ? NORM.dole : NORM.hore; P.normal.fillRect(X, Y + Hd - e, Wd, e);
    P.normal.fillStyle = von ? NORM.vlavo : NORM.vpravo; P.normal.fillRect(X, Y + e, e, Hd - 2 * e);
    P.normal.fillStyle = von ? NORM.vpravo : NORM.vlavo; P.normal.fillRect(X + Wd - e, Y + e, e, Hd - 2 * e);
  }
}

/** Tieň pod vystupujúcim prvkom (na omietke). */
function tienPod(P, ox, oy, x, y, w, h, sila = 0.55) {
  const X = Math.round(ox + x * C), Y = Math.round(oy + y * C), Wd = Math.round(w * C), Hd = Math.round(h * C);
  const gr = P.tien.createLinearGradient(0, Y, 0, Y + Hd);
  const t = Math.round(sila * 255);
  gr.addColorStop(0, `rgb(${t},${t},${t})`); gr.addColorStop(1, 'rgb(255,255,255)');
  P.tien.fillStyle = gr; P.tien.fillRect(X, Y, Wd, Hd);
}

/** Okno: ostenie (zapustenie), rám, krídla so sklom a priečkami. */
function okno(P, ox, oy, { x, y, w, h, ram = '#f2efe8', sklo = '#1d2a33', priecky = 'kriz', hlbkaOstenia = 0.035, ramHr = 0.022 }) {
  // ostenie – tmavší zapustený pás okolo rámu (vidieť hrúbku muriva)
  prvok(P, ox, oy, { x: x - 0.012, y: y - 0.012, w: w + 0.024, h: h + 0.024, farba: '#b9b2a6', drsnost: 0.9, hlbka: -1, hrana: 5, tien: 0.55 });
  prvok(P, ox, oy, { x, y, w, h, farba: ram, drsnost: 0.45, hlbka: 1, hrana: 3 });
  const sx = x + ramHr, sy = y + ramHr, sw = w - 2 * ramHr, sh = h - 2 * ramHr;
  // sklo: jemný prechod (odraz oblohy dodá materiál, tu len hĺbka miestnosti)
  prvok(P, ox, oy, { x: sx, y: sy, w: sw, h: sh, farba: sklo, drsnost: 0.06, hlbka: -1, hrana: 3, tien: 0.9 });
  const g = P.farba;
  const X = Math.round(ox + sx * C), Y = Math.round(oy + sy * C), Wd = Math.round(sw * C), Hd = Math.round(sh * C);
  const gr = g.createLinearGradient(0, Y, 0, Y + Hd);
  gr.addColorStop(0, 'rgba(255,255,255,0.10)'); gr.addColorStop(0.5, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,0.25)');
  g.fillStyle = gr; g.fillRect(X, Y, Wd, Hd);
  // priečky (krídla)
  const pr = ramHr * 0.75;
  if (priecky === 'kriz' || priecky === 'stlpik') prvok(P, ox, oy, { x: x + w / 2 - pr / 2, y: sy, w: pr, h: sh, farba: ram, drsnost: 0.45, hlbka: 1, hrana: 2 });
  if (priecky === 'kriz') prvok(P, ox, oy, { x: sx, y: y + h * 0.3, w: sw, h: pr, farba: ram, drsnost: 0.45, hlbka: 1, hrana: 2 });
  if (priecky === 'paska') for (let k = 1; k < 4; k++) prvok(P, ox, oy, { x: x + (w * k) / 4 - pr / 2, y: sy, w: pr, h: sh, farba: ram, drsnost: 0.4, hlbka: 1, hrana: 2 });
}

function parapet(P, ox, oy, x, y, w, farba = '#d9d3c7') {
  prvok(P, ox, oy, { x: x - 0.03, y, w: w + 0.06, h: 0.03, farba, drsnost: 0.7, hlbka: 1, hrana: 4 });
  tienPod(P, ox, oy, x - 0.03, y + 0.03, w + 0.06, 0.05, 0.6);
}

function rimsa(P, ox, oy, y, h, svetla = true) {
  // podlažná rímsa cez celú šírku bunky (omietka, len tvar a tieň)
  prvok(P, ox, oy, { x: 0, y, w: 1, h, hlbka: 1, hrana: 4, drsnost: 0.85 });
  if (svetla) { P.tien.fillStyle = 'rgb(255,255,255)'; }
  tienPod(P, ox, oy, 0, y + h, 1, 0.045, 0.62);
}

// --- jednotlivé bunky -------------------------------------------------------------------
const BUNKY = {
  // 0 historická: vysoké okno so šambránou a nadokennou rímsou
  0: {
    variant(P, ox, oy) {                // klasicistické: trojuholníková nadokenná rímsa, bez šambrány, okenice
      rimsa(P, ox, oy, 0.955, 0.03);
      const X = Math.round(ox + 0.27 * C), Y = Math.round(oy + 0.07 * C), W2 = Math.round(0.46 * C), H2 = Math.round(0.1 * C);
      P.normal.fillStyle = NORM.hore; P.normal.beginPath(); P.normal.moveTo(X, Y + H2); P.normal.lineTo(X + W2 / 2, Y); P.normal.lineTo(X + W2, Y + H2); P.normal.closePath(); P.normal.fill();
      prvok(P, ox, oy, { x: 0.27, y: 0.17, w: 0.46, h: 0.03, hlbka: 1, hrana: 4 });
      tienPod(P, ox, oy, 0.27, 0.2, 0.46, 0.05, 0.55);
      okno(P, ox, oy, { x: 0.33, y: 0.25, w: 0.34, h: 0.55, priecky: 'kriz', ram: '#efeae0' });
      prvok(P, ox, oy, { x: 0.22, y: 0.25, w: 0.09, h: 0.55, farba: '#5f6b52', drsnost: 0.6, hlbka: 1, hrana: 3 });   // okenice
      prvok(P, ox, oy, { x: 0.69, y: 0.25, w: 0.09, h: 0.55, farba: '#5f6b52', drsnost: 0.6, hlbka: 1, hrana: 3 });
      parapet(P, ox, oy, 0.31, 0.8, 0.38);
    },
    podlazie(P, ox, oy) {
      rimsa(P, ox, oy, 0.955, 0.03);
      prvok(P, ox, oy, { x: 0.27, y: 0.2, w: 0.46, h: 0.64, hlbka: 1, hrana: 5 });               // šambrána (omietka)
      prvok(P, ox, oy, { x: 0.24, y: 0.135, w: 0.52, h: 0.045, hlbka: 1, hrana: 5 });             // nadokenná rímsa
      tienPod(P, ox, oy, 0.24, 0.18, 0.52, 0.06, 0.55);
      okno(P, ox, oy, { x: 0.32, y: 0.24, w: 0.36, h: 0.56, priecky: 'kriz' });
      parapet(P, ox, oy, 0.32, 0.8, 0.36);
    },
    vyklad(P, ox, oy) {
      for (let k = 0; k < 6; k++) prvok(P, ox, oy, { x: 0, y: 0.08 + k * 0.15, w: 1, h: 0.012, hlbka: -1, hrana: 2, tien: 0.8 }); // bosáž
      prvok(P, ox, oy, { x: 0.13, y: 0.22, w: 0.74, h: 0.78, farba: '#6e5b45', drsnost: 0.6, hlbka: 1, hrana: 4 });
      okno(P, ox, oy, { x: 0.17, y: 0.26, w: 0.66, h: 0.6, ram: '#3d3128', sklo: '#26343c', priecky: 'stlpik', ramHr: 0.018 });
      prvok(P, ox, oy, { x: 0.17, y: 0.88, w: 0.66, h: 0.1, farba: '#4f4237', drsnost: 0.6, hlbka: -1, hrana: 3 });
      prvok(P, ox, oy, { x: 0.1, y: 0.12, w: 0.8, h: 0.07, farba: '#2f3a33', drsnost: 0.5, hlbka: 1, hrana: 3 });  // štít obchodu (bez nápisu)
    },
    dvere(P, ox, oy) {
      for (let k = 0; k < 6; k++) prvok(P, ox, oy, { x: 0, y: 0.08 + k * 0.15, w: 1, h: 0.012, hlbka: -1, hrana: 2, tien: 0.8 });
      prvok(P, ox, oy, { x: 0.22, y: 0.18, w: 0.56, h: 0.82, farba: '#cfc6b6', drsnost: 0.8, hlbka: 1, hrana: 6 });     // kamenný portál
      prvok(P, ox, oy, { x: 0.29, y: 0.25, w: 0.42, h: 0.75, farba: '#4b3424', drsnost: 0.55, hlbka: -1, hrana: 5, tien: 0.7 });
      prvok(P, ox, oy, { x: 0.31, y: 0.28, w: 0.18, h: 0.7, farba: '#5a3f2b', drsnost: 0.5, hlbka: 1, hrana: 3 });
      prvok(P, ox, oy, { x: 0.51, y: 0.28, w: 0.18, h: 0.7, farba: '#5a3f2b', drsnost: 0.5, hlbka: 1, hrana: 3 });
    },
  },
  // 1 obytná: širšie okno s bielym plastovým rámom, parapet
  1: {
    variant(P, ox, oy) {                // balkón s plným zábradlím (každá os)
      okno(P, ox, oy, { x: 0.22, y: 0.2, w: 0.56, h: 0.56, ram: '#f4f4f2', sklo: '#22303a', priecky: 'stlpik', ramHr: 0.02 });
      prvok(P, ox, oy, { x: 0.08, y: 0.62, w: 0.84, h: 0.34, farba: '#d9d6cf', drsnost: 0.8, hlbka: 1, hrana: 6 });
      prvok(P, ox, oy, { x: 0.08, y: 0.6, w: 0.84, h: 0.03, farba: '#9a9892', drsnost: 0.6, hlbka: 1, hrana: 2 });
      tienPod(P, ox, oy, 0.08, 0.96, 0.84, 0.04, 0.5);
    },
    podlazie(P, ox, oy) {
      okno(P, ox, oy, { x: 0.2, y: 0.28, w: 0.6, h: 0.46, ram: '#f4f4f2', sklo: '#22303a', priecky: 'stlpik', ramHr: 0.02 });
      parapet(P, ox, oy, 0.2, 0.74, 0.6, '#cfcfcf');
    },
    vyklad(P, ox, oy) {
      okno(P, ox, oy, { x: 0.12, y: 0.3, w: 0.76, h: 0.5, ram: '#e8e8e6', sklo: '#26343c', priecky: 'paska', ramHr: 0.018 });
      parapet(P, ox, oy, 0.12, 0.8, 0.76, '#bdbdbd');
    },
    dvere(P, ox, oy) {
      prvok(P, ox, oy, { x: 0.18, y: 0.14, w: 0.64, h: 0.05, hlbka: 1, hrana: 4 });               // strieška
      tienPod(P, ox, oy, 0.18, 0.19, 0.64, 0.08, 0.5);
      okno(P, ox, oy, { x: 0.3, y: 0.24, w: 0.4, h: 0.76, ram: '#8a8f93', sklo: '#2a3740', priecky: 'stlpik', ramHr: 0.02 });
    },
  },
  // 2 kancelárie: pásové okná s hliníkovými stĺpikmi
  2: {
    variant(P, ox, oy) {                // samostatné štvorcové okná v betónovom ráme
      okno(P, ox, oy, { x: 0.12, y: 0.18, w: 0.76, h: 0.58, ram: '#4e555a', sklo: '#2b3d4a', priecky: 'stlpik', ramHr: 0.016 });
      prvok(P, ox, oy, { x: 0.08, y: 0.14, w: 0.84, h: 0.03, hlbka: 1, hrana: 3 });
    },
    podlazie(P, ox, oy) {
      prvok(P, ox, oy, { x: 0, y: 0.72, w: 1, h: 0.28, farba: '#c9cbcc', drsnost: 0.55, hlbka: 1, hrana: 3 });          // parapetný panel
      okno(P, ox, oy, { x: 0.01, y: 0.06, w: 0.98, h: 0.66, ram: '#7e868c', sklo: '#2b3d4a', priecky: 'stlpik', ramHr: 0.014 });
    },
    vyklad(P, ox, oy) {
      okno(P, ox, oy, { x: 0.01, y: 0.04, w: 0.98, h: 0.94, ram: '#5f676d', sklo: '#2b3d4a', priecky: 'stlpik', ramHr: 0.016 });
    },
    dvere(P, ox, oy) {
      okno(P, ox, oy, { x: 0.01, y: 0.04, w: 0.98, h: 0.94, ram: '#5f676d', sklo: '#2b3d4a', priecky: 'stlpik', ramHr: 0.016 });
      prvok(P, ox, oy, { x: 0.3, y: 0.3, w: 0.4, h: 0.68, farba: '#3f474c', drsnost: 0.4, hlbka: 1, hrana: 2 });
      prvok(P, ox, oy, { x: 0.33, y: 0.33, w: 0.34, h: 0.65, farba: '#2b3d4a', drsnost: 0.06, hlbka: -1, hrana: 2 });
    },
  },
  // 3 jednoduchá: okno s rámom a parapetom
  3: {
    variant(P, ox, oy) {                // dvojkrídlové okno bez priečky, tmavý rám
      okno(P, ox, oy, { x: 0.27, y: 0.22, w: 0.46, h: 0.56, ram: '#6b5a4a', priecky: 'stlpik' });
      parapet(P, ox, oy, 0.27, 0.78, 0.46, '#cfc8bb');
    },
    podlazie(P, ox, oy) {
      okno(P, ox, oy, { x: 0.29, y: 0.24, w: 0.42, h: 0.52, ram: '#ece8df', priecky: 'kriz' });
      parapet(P, ox, oy, 0.29, 0.76, 0.42);
    },
    vyklad(P, ox, oy) {
      okno(P, ox, oy, { x: 0.18, y: 0.26, w: 0.64, h: 0.56, ram: '#5b5048', sklo: '#26343c', priecky: 'stlpik' });
      parapet(P, ox, oy, 0.18, 0.82, 0.64);
    },
    dvere(P, ox, oy) {
      prvok(P, ox, oy, { x: 0.32, y: 0.25, w: 0.36, h: 0.75, farba: '#6b4a32', drsnost: 0.55, hlbka: -1, hrana: 4, tien: 0.75 });
      prvok(P, ox, oy, { x: 0.36, y: 0.3, w: 0.28, h: 0.3, farba: '#26343c', drsnost: 0.06, hlbka: -1, hrana: 2 });
    },
  },
};

// --- atlas ------------------------------------------------------------------------------
let atlas = null;
function vytvorAtlas() {
  if (atlas) return atlas;
  const P = platna();
  for (let s = 0; s < STLPCE; s++) {
    const b = BUNKY[s];
    b.podlazie(P, s * C, 0);
    b.vyklad(P, s * C, C);
    b.dvere(P, s * C, 2 * C);
    b.variant(P, s * C, 3 * C);
  }
  const w = C * STLPCE, h = C * RIADKY;
  const citaj = (g) => g.getImageData(0, 0, w, h).data;
  const f = citaj(P.farba), m = citaj(P.maska), n = citaj(P.normal), r = citaj(P.drsnost), t = citaj(P.tien);
  const A = new Uint8Array(w * h * 4), N = new Uint8Array(w * h * 4), R = new Uint8Array(w * h * 4);
  // DataTexture: riadok 0 = spodok textúry → otočíme plátno (vrch plátna = vrch textúry)
  for (let y = 0; y < h; y++) {
    const zdroj = (h - 1 - y) * w * 4, ciel = y * w * 4;
    for (let x = 0; x < w * 4; x += 4) {
      const i = zdroj + x, o = ciel + x;
      A[o] = f[i]; A[o + 1] = f[i + 1]; A[o + 2] = f[i + 2]; A[o + 3] = m[i];
      N[o] = n[i]; N[o + 1] = n[i + 1]; N[o + 2] = n[i + 2]; N[o + 3] = 255;
      R[o] = t[i]; R[o + 1] = r[i]; R[o + 2] = 0; R[o + 3] = 255;   // R = tieň, G = drsnosť
    }
  }
  const tex = (data, srgb) => {
    const t_ = new THREE.DataTexture(data, w, h, THREE.RGBAFormat);
    t_.wrapS = t_.wrapT = THREE.ClampToEdgeWrapping;
    t_.magFilter = THREE.LinearFilter; t_.minFilter = THREE.LinearMipmapLinearFilter;
    t_.generateMipmaps = true; t_.anisotropy = 8;
    if (srgb) t_.colorSpace = THREE.SRGBColorSpace;
    t_.needsUpdate = true;
    return t_;
  };
  atlas = { farba: tex(A, true), normal: tex(N, false), parametre: tex(R, false) };
  return atlas;
}

let omietka = null;
function texturyOmietky() {
  if (omietka) return omietka;
  const l = new THREE.TextureLoader();
  const t = (meno, srgb) => {
    const x = l.load(`assets/textury/omietka/${meno}.jpg`);
    x.wrapS = x.wrapT = THREE.RepeatWrapping; x.anisotropy = 8;
    if (srgb) x.colorSpace = THREE.SRGBColorSpace;
    return x;
  };
  omietka = { farba: t('farba', true), normal: t('normal', false) };
  return omietka;
}

/** Materiál fasád (MeshStandardMaterial s vlastným výberom bunky atlasu). */
export function materialFasad() {
  const a = vytvorAtlas(), o = texturyOmietky();
  const mat = new THREE.MeshStandardMaterial({ map: a.farba, normalMap: a.normal, roughnessMap: a.parametre, vertexColors: true, roughness: 1, metalness: 0 });
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.omietkaFarba = { value: o.farba };
    sh.uniforms.omietkaNormal = { value: o.normal };
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nattribute float aTyp;\nattribute vec2 aMetre;\nvarying float vTyp;\nvarying vec2 vMetre;')
      .replace('#include <uv_vertex>', '#include <uv_vertex>\nvTyp = aTyp; vMetre = aMetre;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>
uniform sampler2D omietkaFarba; uniform sampler2D omietkaNormal;
varying float vTyp; varying vec2 vMetre;
float hashF(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }`)
      .replace('#include <map_fragment>', `
        // náhoda budovy zaokrúhlená – interpolácia atribútu dá drobné odchýlky, hash by z nich spravil šum
        float styl = floor(vTyp + 0.001), seed = floor(fract(vTyp + 0.0005) * 97.0 + 0.5);
        vec2 uvc = vMapUv;
        bool atika = uvc.y > 99.5;
        float vv = atika ? uvc.y - 100.0 : uvc.y;
        float osI = floor(uvc.x), podI = floor(vv);
        bool slepa = uvc.x > 199.5;
        vec2 lok = vec2(slepa ? 0.012 : fract(uvc.x), fract(vv));
        float hs = hashF(vec2(osI, podI) + seed);
        // riadok atlasu: 0 podlažie, 1 výklad, 2 dvere (prízemie: každá ~4. os má dvere)
        float riadok = mod(seed, 2.0) > 0.5 ? 3.0 : 0.0;
        if (vv >= 0.0 && vv < 1.0) riadok = hashF(vec2(osI, 7.0) + seed) < 0.28 ? 2.0 : 1.0;
        vec2 bunka = vec2(styl, ${RIADKY - 1}.0 - riadok);
        vec2 auv = (bunka + clamp(lok, 0.002, 0.998)) / vec2(${STLPCE}.0, ${RIADKY}.0);
        vec2 dx = dFdx(uvc) / vec2(${STLPCE}.0, ${RIADKY}.0), dy = dFdy(uvc) / vec2(${STLPCE}.0, ${RIADKY}.0);
        vec4 fa = textureGrad(map, auv, dx, dy);
        vec4 fp = textureGrad(roughnessMap, auv, dx, dy);
        vec3 fn = textureGrad(normalMap, auv, dx, dy).xyz;
        // omietka: jemná štruktúra (CC0), normalizovaná na strednú hodnotu
        vec2 muv = vMetre / 2.6;
        vec3 om = texture2D(omietkaFarba, muv).rgb / 0.82;
        vec3 farbaBudovy = vColor.rgb * mix(vec3(1.0), om, 0.55);
        float maska = fa.a;
        float tienF = fp.r, drsnF = fp.g;
        if (vv < 0.0) {                          // sokel (kameň, tmavší)
          maska = 1.0; fa.rgb = mix(vColor.rgb * 0.45, vec3(0.32, 0.30, 0.28), 0.6) * om; drsnF = 0.92; tienF = 1.0; fn = vec3(0.5, 0.5, 1.0);
          if (vv > -0.04) { fn = vec3(0.5, 0.85, 0.85); }
        } else if (atika) {                      // atika a hlavná rímsa
          maska = 0.0; drsnF = 0.88; fn = vec3(0.5, 0.5, 1.0); tienF = 1.0;
          if (lok.y > 0.55) { farbaBudovy *= 1.08; fn = lok.y > 0.9 ? vec3(0.5, 0.85, 0.85) : vec3(0.5, 0.5, 1.0); }
          else if (lok.y > 0.4) { tienF = 0.62; fn = vec3(0.5, 0.15, 0.85); }
        }
        // sklo: záclony, rolety alebo tmavá izba (náhodne podľa okna)
        if (drsnF < 0.1) {
          float h2 = hashF(vec2(osI * 1.7, podI * 2.3) + seed * 3.1);
          vec3 zaclona = mix(vec3(0.78, 0.74, 0.66), vec3(0.62, 0.64, 0.66), h2);
          float horna = smoothstep(0.35, 0.5, fract(vv) + (h2 - 0.5) * 0.3);
          fa.rgb = mix(fa.rgb * mix(0.8, 1.6, hs), zaclona * 0.55, hs < 0.45 ? horna * 0.85 : 0.0);
          // výklady na prízemí: osvetlený interiér obchodu
          if (riadok > 0.5 && riadok < 2.5) fa.rgb = mix(fa.rgb, vec3(0.62, 0.53, 0.40) * mix(0.6, 1.1, hs), 0.25 + 0.3 * hs);
          drsnF = hs < 0.45 ? mix(0.14, 0.3, horna) : 0.12;
        }
        diffuseColor.rgb = mix(farbaBudovy, fa.rgb, maska) * tienF;
        float fasDrsnost = drsnF;
        vec3 fasNormal = fn;
      `)
      .replace('#include <color_fragment>', '')
      .replace('#include <roughnessmap_fragment>', 'float roughnessFactor = roughness * fasDrsnost;')
      .replace('#include <normal_fragment_maps>', `
        vec3 mapN = fasNormal * 2.0 - 1.0;
        vec3 omN = texture2D(omietkaNormal, vMetre / 2.6).xyz * 2.0 - 1.0;
        mapN.xy += omN.xy * 0.35 * (fasDrsnost < 0.35 ? 0.0 : 1.0);
        mapN.xy *= normalScale;
        normal = normalize( tbn * mapN );
      `);
  };
  mat.customProgramCacheKey = () => 'fasady-v1';
  return mat;
}
