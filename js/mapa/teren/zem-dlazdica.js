// Zem jednej dlaždice mesta (500 × 500 m, sieť po 5 m, s detailným terénom z lasera po 2 m) s vlastnou textúrou pokrývky.
// Stavia sa po krokoch (generátor): textúry, výšky po pásoch riadkov, normály – správca dlaždíc to rozloží
// do viacerých snímok, aby hra pri načítaní dlaždice nesekala.

import * as THREE from 'three';
import { krokyTexturyDlazdice, krokyTriedDlazdice } from './textura-zeme.js';
import { dokonci } from '../kroky.js';
import { materialZeme } from './material-zeme.js';

const KROK = 5, KROK_DETAIL = 2;
const RIADKOV_NA_KROK = 30;   // koľko riadkov siete sa spočíta naraz (potom sa vráti riadenie hre)
const SUKNA = 2;              // m – o koľko nižšie ide „sukňa“ na okraji dlaždice
// Úrovne detailu po blokoch (#110): dlaždica sa delí na bloky BLOK × BLOK buniek (100 m pri sieti 2 m) a každý blok
// má tri úrovne nad tými istými vrcholmi – každý 1., 2. a 5. uzol (2 / 4 / 10 m). Úroveň bloku podľa vzdialenosti
// od hráča nastavuje js/mapa/dlazdice/lod-zeme.js a index siete sa poskladá nanovo (jedno volanie kreslenia
// na dlaždicu ostáva). Kde susedia bloky s rôznou úrovňou, škáru prekryjú „závesy“ – zvislé pásy o SUKNA nižšie
// pod hranou z jemnej aj z hrubej strany (ako sukňa na okraji dlaždice).
const KROKY_LOD = [1, 2, 5];
const BLOK = 50;

export function vytvorZemDlazdice(d, rect, vyskopis, rieky) {
  return dokonci(krokyZemeDlazdice(d, rect, vyskopis, rieky));
}

export function* krokyZemeDlazdice(d, rect, vyskopis, rieky) {
  // dlažba, chodníky a tráva z CC0 materiálov podľa mapy tried povrchu; v laserovom výreze ostrejšia textúra
  // aj inde 1024 px (0,5 m – ostré okraje chodníkov a trávnikov; hra je len pre PC)
  const mapa = yield* krokyTexturyDlazdice(d, rieky, rect, 1024);
  yield;
  const triedy = yield* krokyTriedDlazdice(d, rect, 1024, vyskopis);
  yield;

  const w = rect.maxX - rect.minX, h = rect.maxZ - rect.minZ;
  const n = Math.round(w / (d._detailTerenu ? KROK_DETAIL : KROK));
  const v = n + 1, pocet = v * v;
  const krokX = w / n, krokZ = h / n;
  // bloky úrovní detailu: hranice v uzloch siete (násobky 10 – delia sa krokmi 2 aj 5)
  const nb = Math.max(1, Math.round(n / BLOK));
  const hranice = Array.from({ length: nb + 1 }, (_, k) => Math.round((k * n) / nb / 10) * 10);
  hranice[nb] = n;
  // vrcholy siete (riadok j = z, stĺpec i = x) + 4 okraje „sukne“ + kópie vnútorných hraníc blokov (závesy)
  const vsetky = pocet + 4 * v + 2 * (nb - 1) * v;
  const P = new Float32Array(vsetky * 3), N = new Float32Array(vsetky * 3), U = new Float32Array(vsetky * 2);
  const voda = new Uint8Array(pocet), vys = new Float32Array(pocet);
  for (let j = 0; j < v; j++) {
    const z = rect.minZ + j * krokZ;
    for (let i = 0; i < v; i++) {
      const x = rect.minX + i * krokX, k = j * v + i;
      vys[k] = vyskopis.vyskaTerenu(x, z);
      voda[k] = vyskopis.jeVoVode(x, z) ? 1 : 0;
      P[k * 3] = x; P[k * 3 + 2] = z;
      U[k * 2] = i / n; U[k * 2 + 1] = j / n;
    }
    if (j % RIADKOV_NA_KROK === RIADKOV_NA_KROK - 1) yield;
  }
  // vrcholy vo vode pri brehu dostanú výšku brehu (zem pri múre neklesá)
  for (let j = 0; j < v; j++) {
    for (let i = 0; i < v; i++) {
      const k = j * v + i;
      let y = vys[k];
      if (voda[k]) {
        let max = -Infinity;
        for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) {
          const ii = i + a, jj = j + b;
          if (ii < 0 || jj < 0 || ii >= v || jj >= v) continue;
          if (!voda[jj * v + ii]) max = Math.max(max, vys[jj * v + ii]);
        }
        if (max > -Infinity) y = max;
      }
      P[k * 3 + 1] = y;
    }
  }
  yield;
  // normály z rozdielov výšok susedov (na okraji jednostranne)
  for (let j = 0; j < v; j++) {
    const j0 = Math.max(0, j - 1), j1 = Math.min(n, j + 1);
    for (let i = 0; i < v; i++) {
      const i0 = Math.max(0, i - 1), i1 = Math.min(n, i + 1);
      const dx = (P[(j * v + i1) * 3 + 1] - P[(j * v + i0) * 3 + 1]) / ((i1 - i0) * krokX);
      const dz = (P[(j1 * v + i) * 3 + 1] - P[(j0 * v + i) * 3 + 1]) / ((j1 - j0) * krokZ);
      const l = Math.hypot(dx, 1, dz), k = (j * v + i) * 3;
      N[k] = -dx / l; N[k + 1] = 1 / l; N[k + 2] = -dz / l;
    }
  }
  // sukňa okolo dlaždice (vždy v plnom rozlíšení) a kópie vnútorných hraníc blokov o SUKNA nižšie
  const sukne = new Uint32Array(4 * (v - 1) * 12);
  pridajSukne(P, N, U, sukne, 0, v, pocet);
  const zaciatokHranic = pocet + 4 * v;
  for (let k = 1; k < nb; k++) {
    for (let t = 0; t < v; t++) {
      kopiaNizsie(P, N, U, t * v + hranice[k], zaciatokHranic + (k - 1) * v + t);              // zvislá čiara i = hranice[k]
      kopiaNizsie(P, N, U, hranice[k] * v + t, zaciatokHranic + (nb - 1 + k - 1) * v + t);    // vodorovná čiara j = hranice[k]
    }
  }
  const lodBloky = blokyUrovni(v, nb, hranice, pocet, zaciatokHranic, sukne, rect, krokX, krokZ);
  yield;

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(P, 3));
  geo.setAttribute('normal', new THREE.BufferAttribute(N, 3));
  geo.setAttribute('uv', new THREE.BufferAttribute(U, 2));
  geo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(vsetky * 3).fill(1), 3));
  geo.setIndex(lodBloky.index);
  geo.setDrawRange(0, lodBloky.dlzka);
  lodBloky.geo = geo;
  geo.computeBoundingSphere();
  geo.computeBoundingBox();

  const mesh = new THREE.Mesh(geo, materialZeme(mapa, triedy));
  mesh.receiveShadow = true;
  mesh.name = 'zem';
  mesh.userData.rect = rect;   // pre trávu zblízka (js/mapa/zelen/trava-modul.js číta mapu tried a pokrývky)
  mesh.userData.lodBloky = lodBloky;   // úrovne detailu po blokoch – nastavuje js/mapa/dlazdice/lod-zeme.js
  return mesh;
}

/** Kópia vrcholu k o SUKNA nižšie na pozíciu ciel (sukne a závesy). */
function kopiaNizsie(P, N, U, k, ciel) {
  P[ciel * 3] = P[k * 3]; P[ciel * 3 + 1] = P[k * 3 + 1] - SUKNA; P[ciel * 3 + 2] = P[k * 3 + 2];
  N[ciel * 3] = N[k * 3]; N[ciel * 3 + 1] = N[k * 3 + 1]; N[ciel * 3 + 2] = N[k * 3 + 2];
  U[ciel * 2] = U[k * 2]; U[ciel * 2 + 1] = U[k * 2 + 1];
}

/** Uzly od a po b s krokom s (posledný je vždy b). */
function ciary(a, b, s) {
  const c = [];
  for (let k = a; k < b; k += s) c.push(k);
  c.push(b);
  return c;
}

/** Trojuholníky bloku [i0, i1] × [j0, j1] cez každý s-tý uzol (lícom nahor). */
function plochaBloku(v, i0, i1, j0, j1, s) {
  const ci = ciary(i0, i1, s), cj = ciary(j0, j1, s);
  const I = new Uint32Array((ci.length - 1) * (cj.length - 1) * 6);
  let o = 0;
  for (let jj = 0; jj < cj.length - 1; jj++) {
    for (let ii = 0; ii < ci.length - 1; ii++) {
      const a = cj[jj] * v + ci[ii], b = cj[jj + 1] * v + ci[ii];
      const c = cj[jj] * v + ci[ii + 1], e = cj[jj + 1] * v + ci[ii + 1];
      I[o++] = a; I[o++] = b; I[o++] = c;
      I[o++] = c; I[o++] = b; I[o++] = e;
    }
  }
  return I;
}

/** Obojstranný zvislý pás pod čiarou uzlov t0…t1 s krokom s: horny(t) = vrchol na povrchu, dolny(t) = jeho kópia nižšie. */
function zaves(horny, dolny, t0, t1, s) {
  const c = ciary(t0, t1, s);
  const I = new Uint32Array((c.length - 1) * 12);
  let o = 0;
  for (let k = 0; k < c.length - 1; k++) {
    const a = horny(c[k]), b = horny(c[k + 1]), a2 = dolny(c[k]), b2 = dolny(c[k + 1]);
    I[o++] = a; I[o++] = b; I[o++] = b2; I[o++] = a; I[o++] = b2; I[o++] = a2;
    I[o++] = a; I[o++] = b2; I[o++] = b; I[o++] = a; I[o++] = a2; I[o++] = b2;
  }
  return I;
}

function spoj(kusy) {
  const I = new Uint32Array(kusy.reduce((a, k) => a + k.length, 0));
  let o = 0;
  for (const k of kusy) { I.set(k, o); o += k.length; }
  return I;
}

/**
 * Kúsky indexu pre úrovne detailu po blokoch a skladanie indexu podľa úrovní blokov:
 *   – plocha každého bloku v troch úrovniach,
 *   – sukňa okolo dlaždice v plnom rozlíšení (vždy) a pri hrubšom bloku na okraji aj v jeho kroku,
 *   – závesy na hranici dvoch blokov s rôznou úrovňou (v kroku oboch) – škára medzi jemnou lomenou čiarou
 *     a hrubou priamkou je prekrytá z tej strany, ktorá je vyššie.
 * zostav() zapíše index do spoločného poľa (bez nového bufferu), nastaví rozsah kreslenia a vráti dĺžku.
 */
function blokyUrovni(v, nb, hranice, pocet, zaciatokHranic, sukne, rect, krokX, krokZ) {
  const plochy = [], okraje = [], susedia = [];
  // okraje dlaždice: [horný vrchol, dolný vrchol] pre okraj (poradie ako v pridajSukne)
  const okraj = [
    [(t) => t, (t) => pocet + t],                                 // j = 0
    [(t) => (v - 1) * v + t, (t) => pocet + v + t],               // j = n
    [(t) => t * v, (t) => pocet + 2 * v + t],                     // i = 0
    [(t) => t * v + v - 1, (t) => pocet + 3 * v + t],             // i = n
  ];
  for (let bj = 0; bj < nb; bj++) {
    for (let bi = 0; bi < nb; bi++) {
      const i0 = hranice[bi], i1 = hranice[bi + 1], j0 = hranice[bj], j1 = hranice[bj + 1];
      plochy.push(KROKY_LOD.map((s) => plochaBloku(v, i0, i1, j0, j1, s)));
      // hrubá sukňa na okrajoch dlaždice, ktorých sa blok dotýka (úroveň 0 má len plnú sukňu)
      okraje.push(KROKY_LOD.map((s, u) => {
        if (!u) return new Uint32Array(0);
        const kusy = [];
        if (bj === 0) kusy.push(zaves(...okraj[0], i0, i1, s));
        if (bj === nb - 1) kusy.push(zaves(...okraj[1], i0, i1, s));
        if (bi === 0) kusy.push(zaves(...okraj[2], j0, j1, s));
        if (bi === nb - 1) kusy.push(zaves(...okraj[3], j0, j1, s));
        return spoj(kusy);
      }));
    }
  }
  // vnútorné hranice: zvislá čiara k (medzi blokmi bi = k-1 a k) a vodorovná čiara k (bj = k-1 a k)
  for (let k = 1; k < nb; k++) {
    const zv = [(t) => t * v + hranice[k], (t) => zaciatokHranic + (k - 1) * v + t];
    const vo = [(t) => hranice[k] * v + t, (t) => zaciatokHranic + (nb - 1 + k - 1) * v + t];
    for (let m = 0; m < nb; m++) {
      susedia.push({ a: m * nb + k - 1, b: m * nb + k, zavesy: KROKY_LOD.map((s) => zaves(...zv, hranice[m], hranice[m + 1], s)) });
      susedia.push({ a: (k - 1) * nb + m, b: k * nb + m, zavesy: KROKY_LOD.map((s) => zaves(...vo, hranice[m], hranice[m + 1], s)) });
    }
  }
  let kapacita = sukne.length;
  for (const p of plochy) kapacita += p[0].length;
  for (const o of okraje) kapacita += Math.max(...o.map((x) => x.length));
  for (const s of susedia) kapacita += s.zavesy.reduce((a, z) => a + z.length, 0);
  const pole = new Uint32Array(kapacita);
  const index = new THREE.BufferAttribute(pole, 1);
  index.setUsage(THREE.DynamicDrawUsage);
  const urovne = new Uint8Array(nb * nb);
  const vysledok = {
    nb, urovne, index, dlzka: 0, geo: null,
    // hranice blokov vo svetových súradniciach (vzdialenosť bloku od hráča)
    x: hranice.map((k) => rect.minX + k * krokX), z: hranice.map((k) => rect.minZ + k * krokZ),
    /** Poskladá index podľa urovne[] (0 = 2 m, 1 = 4 m, 2 = 10 m pri sieti 2 m); vráti počet indexov. */
    zostav() {
      let o = 0;
      const daj = (a) => { pole.set(a, o); o += a.length; };
      for (let b = 0; b < plochy.length; b++) daj(plochy[b][urovne[b]]);
      daj(sukne);
      for (let b = 0; b < okraje.length; b++) if (urovne[b]) daj(okraje[b][urovne[b]]);
      for (const s of susedia) {
        const ua = urovne[s.a], ub = urovne[s.b];
        if (ua !== ub) { daj(s.zavesy[ua]); daj(s.zavesy[ub]); }
      }
      this.dlzka = o;
      index.clearUpdateRanges();
      index.addUpdateRange(0, o);
      index.needsUpdate = true;
      this.geo?.setDrawRange(0, o);
      return o;
    },
  };
  vysledok.zostav();
  return vysledok;
}

/**
 * „Sukňa“ okolo dlaždice: okrajové vrcholy sa zopakujú o 2 m nižšie. Keď susedná dlaždica vznikla
 * s iným terénom na hrane (napr. ešte bez laserového detailu), medzi dlaždicami nevznikne škára,
 * cez ktorú by bolo vidieť oblohu (pôsobila ako biela čiara cez námestie).
 * Vrcholy sukne idú do polí za vrcholy siete (od indexu `pocet`), trojuholníky za `o`; vracia nové `o`.
 */
function pridajSukne(P, N, U, I, o, v, pocet) {
  const hrany = [
    (t) => t,                     // okraj j = 0
    (t) => (v - 1) * v + t,       // okraj j = n
    (t) => t * v,                 // okraj i = 0
    (t) => t * v + v - 1,         // okraj i = n
  ];
  let dalsi = pocet;
  for (const hrana of hrany) {
    const prvy = dalsi;
    for (let t = 0; t < v; t++, dalsi++) {
      const k = hrana(t);
      P[dalsi * 3] = P[k * 3]; P[dalsi * 3 + 1] = P[k * 3 + 1] - SUKNA; P[dalsi * 3 + 2] = P[k * 3 + 2];
      N[dalsi * 3] = N[k * 3]; N[dalsi * 3 + 1] = N[k * 3 + 1]; N[dalsi * 3 + 2] = N[k * 3 + 2];
      U[dalsi * 2] = U[k * 2]; U[dalsi * 2 + 1] = U[k * 2 + 1];
    }
    for (let t = 0; t < v - 1; t++) {
      const a = hrana(t), b = hrana(t + 1), a2 = prvy + t, b2 = prvy + t + 1;
      // obe strany
      I[o++] = a; I[o++] = b; I[o++] = b2; I[o++] = a; I[o++] = b2; I[o++] = a2;
      I[o++] = a; I[o++] = b2; I[o++] = b; I[o++] = a; I[o++] = a2; I[o++] = b2;
    }
  }
  return o;
}
