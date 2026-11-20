// 3D fasády historických budov (issue #31, etapa G2): okná sú naozaj zapustené v murive, pod nimi kamenné
// parapety, nad nimi nadokenné rímsy alebo trojuholníkové frontóny, medzi podlažiami podlažné rímsy
// a pod strechou vystupujúca hlavná rímsa. Slnko v nich vrhá skutočné tiene.
//
// Ako to funguje: pred stenu (s oknami nakreslenými v atlase fasád) sa postaví „plášť“ hrubý HRUBKA m
// s otvormi presne tam, kde atlas kreslí okno (rovnaké rozloženie – budovy.js rozlozenieBudovy). Plášť
// používa ten istý materiál a UV ako stena, takže omietka, šambrány a okenice nadväzujú; okno nakreslené
// na stene je potom HRUBKA m za lícom fasády. Ostenia (boky otvorov) a spodky ríms sú stmavené vo farbe
// vrcholov – „zapečené“ zatienenie kútov (AO), ktoré funguje aj na nízkej kvalite bez efektov.
//
// Len obvodové steny historických budov (štýl „stare“), nie spoločné steny so susedom ani dvory.
// Pri stavbe dlaždice sa pripraví len plán (ktoré steny, v ktorom diele DIEL × DIEL m); geometriu dielov
// stavia a ruší modul fasady-3d-modul.js podľa vzdialenosti od kamery – ďalej stačia okná z atlasu.

import * as THREE from 'three';
import { bodVPolygone } from '../geometria.js';
import { STYLY } from './fasady.js';
import { rozlozenieBudovy, ziskajMaterialy } from './budovy.js';

export const HRUBKA = 0.2;   // m – o koľko je líce fasády pred oknom
export const DIEL = 64;      // m – veľkosť dielu plášťa
const KAMEN = new THREE.Color('#d8d1c4');

// Okno v bunke atlasu (fasady.js, štýl 0) v súradniciach bunky: x zľava, y zdola (= 1 − y zhora v atlase).
// riadok 0 = podlažie (šambrána, nadokenná rímsa), riadok 3 = variant (frontón, okenice).
const OKNO = {
  0: { x0: 0.308, x1: 0.692, y0: 0.188, y1: 0.772, parapet: [0.29, 0.71], rimsa: { x0: 0.24, x1: 0.76, y0: 0.82, y1: 0.865 } },
  3: { x0: 0.318, x1: 0.682, y0: 0.188, y1: 0.762, parapet: [0.31, 0.69], rimsa: { x0: 0.27, x1: 0.73, y0: 0.80, y1: 0.83 }, fronton: 0.93 },
};

/** Riadok atlasu pre podlažie – rovnaké pravidlo ako shader fasád (fasady.js). */
function riadokPodlazia(seedInt, podI) {
  let riadok = seedInt % 2 === 1 ? 3 : 0;
  if (podI === 1 && seedInt % 3 !== 0) riadok = 3;
  return riadok;
}

/** Zberač geometrie: plochy so 4 (alebo 3) vrcholmi, indexované, normála na plochu. */
class Zberac {
  constructor() {
    this.poz = []; this.nor = []; this.uv = []; this.farba = []; this.typ = []; this.metre = []; this.znaky = []; this.ind = [];
  }
  plocha(body, uv, metre, f, typ, znaky) {
    const n = body.length, i0 = this.poz.length / 3;
    const [a, b, c] = body;
    const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2];
    const vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
    let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    const l = Math.hypot(nx, ny, nz) || 1; nx /= l; ny /= l; nz /= l;
    for (let i = 0; i < n; i++) {
      this.poz.push(...body[i]); this.nor.push(nx, ny, nz); this.uv.push(...uv[i]); this.metre.push(...metre[i]);
      this.farba.push(f.r, f.g, f.b); this.typ.push(typ); this.znaky.push(znaky);
    }
    if (n === 3) this.ind.push(i0, i0 + 1, i0 + 2);
    else this.ind.push(i0, i0 + 1, i0 + 2, i0, i0 + 2, i0 + 3);
  }
  get pocet() { return this.poz.length / 3; }
  geometria() {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.poz, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.nor, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(this.uv, 2));
    g.setAttribute('color', new THREE.Float32BufferAttribute(this.farba, 3));
    g.setAttribute('aTyp', new THREE.Float32BufferAttribute(this.typ, 1));
    g.setAttribute('aMetre', new THREE.Float32BufferAttribute(this.metre, 2));
    g.setAttribute('aZnaky', new THREE.Float32BufferAttribute(this.znaky, 1));
    g.setIndex(this.pocet > 65535 ? new THREE.Uint32BufferAttribute(this.ind, 1) : new THREE.Uint16BufferAttribute(this.ind, 1));
    g.computeBoundingSphere();
    return g;
  }
}

/** Kreslenie na jednu stenu: súradnice (s pozdĺž steny, y výška, o odsadenie von) → svet. */
function stena(p, e, n, zb, typ, znaky) {
  const bod = (s, y, o) => [p[0] + e[0] * s + n[0] * o, y, p[1] + e[1] * s + n[1] * o];
  // plochy sú zapísané pre stenu, ktorej vonkajšia strana je vľavo od smeru p → q; inak je všetko zrkadlovo
  const obrat = n[0] * -e[1] + n[1] * e[0] < 0;
  /** Štvoruholník a→b→c→d proti smeru hodinových ručičiek pri pohľade na jeho prednú stranu. */
  const stvor = (a, b, c, d, ua, ub, uc, ud, ma, mb, mc, md, f) => {
    if (obrat) zb.plocha([a, d, c, b], [ua, ud, uc, ub], [ma, md, mc, mb], f, typ, znaky);
    else zb.plocha([a, b, c, d], [ua, ub, uc, ud], [ma, mb, mc, md], f, typ, znaky);
  };
  const troj = (a, b, c, ua, ub, uc, ma, mb, mc, f) => {
    if (obrat) zb.plocha([a, c, b], [ua, uc, ub], [ma, mc, mb], f, typ, znaky);
    else zb.plocha([a, b, c], [ua, ub, uc], [ma, mb, mc], f, typ, znaky);
  };
  const SLEPA = (v) => [200.5, v];          // UV slepej steny: len omietka (shader nekreslí okná)
  return {
    /** Plocha líca (o = konšt.) s UV bunky: s0..s1, y0..y1, u0..u1, v0..v1. */
    lice(s0, s1, y0, y1, o, u0, u1, v0, v1, f) {
      if (s1 - s0 < 0.005 || y1 - y0 < 0.005) return;
      stvor(bod(s0, y0, o), bod(s1, y0, o), bod(s1, y1, o), bod(s0, y1, o),
        [u0, v0], [u1, v0], [u1, v1], [u0, v1], [s0, y0], [s1, y0], [s1, y1], [s0, y1], f);
    },
    /** Kváder pred stenou (rímsa, parapet): s0..s1, y0..y1, o0..o1. */
    kvader(s0, s1, y0, y1, o0, o1, f, v, { boky = true, spodok = 0.7 } = {}) {
      const uv = SLEPA(v);
      const fs = f.clone().multiplyScalar(spodok);
      stvor(bod(s0, y0, o1), bod(s1, y0, o1), bod(s1, y1, o1), bod(s0, y1, o1), uv, uv, uv, uv, [s0, y0], [s1, y0], [s1, y1], [s0, y1], f);
      stvor(bod(s0, y1, o1), bod(s1, y1, o1), bod(s1, y1, o0), bod(s0, y1, o0), uv, uv, uv, uv, [s0, y1], [s1, y1], [s1, y1 + 0.2], [s0, y1 + 0.2], f);
      stvor(bod(s0, y0, o0), bod(s1, y0, o0), bod(s1, y0, o1), bod(s0, y0, o1), uv, uv, uv, uv, [s0, y0], [s1, y0], [s1, y0 + 0.2], [s0, y0 + 0.2], fs);
      if (boky) {
        stvor(bod(s0, y0, o0), bod(s0, y0, o1), bod(s0, y1, o1), bod(s0, y1, o0), uv, uv, uv, uv, [s0, y0], [s0 + 0.2, y0], [s0 + 0.2, y1], [s0, y1], f);
        stvor(bod(s1, y0, o1), bod(s1, y0, o0), bod(s1, y1, o0), bod(s1, y1, o1), uv, uv, uv, uv, [s1, y0], [s1 + 0.2, y0], [s1 + 0.2, y1], [s1, y1], f);
      }
    },
    /** Ostenie otvoru: štyri plochy z líca (o = HRUBKA) dozadu ku stene (o = 0), stmavené. */
    ostenie(s0, s1, y0, y1, v, f) {
      const uv = SLEPA(v), H = HRUBKA;
      const fb = f.clone().multiplyScalar(0.74), fh = f.clone().multiplyScalar(0.6), fd = f.clone().multiplyScalar(0.9);
      stvor(bod(s0, y1, 0), bod(s0, y1, H), bod(s0, y0, H), bod(s0, y0, 0), uv, uv, uv, uv, [s0, y1], [s0 + H, y1], [s0 + H, y0], [s0, y0], fb);
      stvor(bod(s1, y1, H), bod(s1, y1, 0), bod(s1, y0, 0), bod(s1, y0, H), uv, uv, uv, uv, [s1, y1], [s1 + H, y1], [s1 + H, y0], [s1, y0], fb);
      stvor(bod(s0, y1, 0), bod(s1, y1, 0), bod(s1, y1, H), bod(s0, y1, H), uv, uv, uv, uv, [s0, y1], [s1, y1], [s1, y1 + H], [s0, y1 + H], fh);
      stvor(bod(s0, y0, H), bod(s1, y0, H), bod(s1, y0, 0), bod(s0, y0, 0), uv, uv, uv, uv, [s0, y0], [s1, y0], [s1, y0 + H], [s0, y0 + H], fd);
    },
    /** Trojuholníkový frontón nad oknom: čelo + dve šikmé strechy. */
    fronton(s0, s1, y0, y1, o0, o1, f, v) {
      const uv = SLEPA(v), sm = (s0 + s1) / 2;
      troj(bod(s0, y0, o1), bod(s1, y0, o1), bod(sm, y1, o1), uv, uv, uv, [s0, y0], [s1, y0], [sm, y1], f);
      stvor(bod(sm, y1, o1), bod(s1, y0, o1), bod(s1, y0, o0), bod(sm, y1, o0), uv, uv, uv, uv, [sm, y1], [s1, y0], [s1, y0 + 0.2], [sm, y1 + 0.2], f);
      stvor(bod(s0, y0, o1), bod(sm, y1, o1), bod(sm, y1, o0), bod(s0, y0, o0), uv, uv, uv, uv, [s0, y0], [sm, y1], [sm, y1 + 0.2], [s0, y0 + 0.2], f);
    },
    /** Zvislé zakončenie plášťa na konci steny (s = konšt.), pozerá v smere sm (−1 / +1). */
    koniec(s, y0, y1, sm, f, v) {
      const uv = SLEPA(v), H = HRUBKA;
      if (sm < 0) stvor(bod(s, y0, 0), bod(s, y0, H), bod(s, y1, H), bod(s, y1, 0), uv, uv, uv, uv, [s, y0], [s + H, y0], [s + H, y1], [s, y1], f);
      else stvor(bod(s, y0, H), bod(s, y0, 0), bod(s, y1, 0), bod(s, y1, H), uv, uv, uv, uv, [s, y0], [s + H, y0], [s + H, y1], [s, y1], f);
    },
    /** Spodok plášťa (pozerá dole). */
    spodok(s0, s1, y, f, v) {
      const uv = SLEPA(v), H = HRUBKA;
      stvor(bod(s0, y, 0), bod(s1, y, 0), bod(s1, y, H), bod(s0, y, H), uv, uv, uv, uv, [s0, y], [s1, y], [s1, y + H], [s0, y + H], f);
    },
  };
}

/** Či je bod v inej budove (spoločná stena so susedom). */
function vytvorTestSusedov(budovy) {
  const okraje = budovy.filter((b) => b.body?.length >= 3).map((b) => {
    let minX = Infinity, minZ = Infinity, maxX = -Infinity, maxZ = -Infinity;
    for (const [x, z] of b.body) { minX = Math.min(minX, x); maxX = Math.max(maxX, x); minZ = Math.min(minZ, z); maxZ = Math.max(maxZ, z); }
    return { b, minX, minZ, maxX, maxZ };
  });
  return (x, z, ja) => okraje.some((o) => o.b !== ja && x >= o.minX && x <= o.maxX && z >= o.minZ && z <= o.maxZ && bodVPolygone(x, z, o.b.body));
}

/** Predĺženie plášťa na rohu medzi stenami a → b (vypuklý roh = predĺžiť, dutý = skrátiť). */
function predlzenie(a, b, H, vonJeVlavo) {
  if (!a.ok || !b.ok) return 0;
  const kriz = a.e[0] * b.e[1] - a.e[1] * b.e[0];
  const cos = a.e[0] * b.e[0] + a.e[1] * b.e[1];
  const uhol = Math.atan2(Math.abs(kriz), cos);
  const vypukly = (vonJeVlavo ? -kriz : kriz) > 0;
  return (vypukly ? 1 : -1) * H * Math.min(2, Math.tan(uhol / 2));
}

/**
 * Plán 3D fasád dlaždice (rýchly, robí sa pri stavbe dlaždice): steny historických budov s plášťom,
 * rozdelené do dielov. Vracia { diely: Map(kluc → { x, z, steny: [...] }) } alebo null.
 */
export function planFasad3d(budovy, vyskopis) {
  const vInejBudove = vytvorTestSusedov(budovy);
  const diely = new Map();
  for (const b of budovy) {
    if (!(b.body?.length >= 3) || b.sklo) continue;
    const r = rozlozenieBudovy(b, vyskopis);
    if (r.typ !== STYLY.stare) continue;
    const obvod = r.kruhy[0];
    const info = obvod.steny.map(({ p, q, d, osi }) => {
      const e = [(q[0] - p[0]) / d, (q[1] - p[1]) / d];
      const lavo = [-e[1], e[0]];
      const n = obvod.vonJeVlavo ? lavo : [-lavo[0], -lavo[1]];
      let ok = osi > 0;
      if (ok) {
        for (const t of [0.25, 0.5, 0.75]) {
          if (vInejBudove(p[0] + e[0] * d * t + n[0] * 0.6, p[1] + e[1] * d * t + n[1] * 0.6, b)) { ok = false; break; }
        }
      }
      return { p, q, d, osi, e, n, ok };
    });
    const m = info.length;
    for (let i = 0; i < m; i++) {
      const w = info[i];
      if (!w.ok) continue;
      const pred = info[(i - 1 + m) % m], po = info[(i + 1) % m];
      const mx = w.p[0] + w.e[0] * w.d / 2, mz = w.p[1] + w.e[1] * w.d / 2;
      const kluc = `${Math.floor(mx / DIEL)},${Math.floor(mz / DIEL)}`;
      if (!diely.has(kluc)) diely.set(kluc, { x: (Math.floor(mx / DIEL) + 0.5) * DIEL, z: (Math.floor(mz / DIEL) + 0.5) * DIEL, steny: [] });
      diely.get(kluc).steny.push({
        r, w, predOk: pred.ok, poOk: po.ok,
        ex0: predlzenie(pred, w, HRUBKA, obvod.vonJeVlavo), ex1: predlzenie(w, po, HRUBKA, obvod.vonJeVlavo),
        exR0: predlzenie(pred, w, HRUBKA + 0.32, obvod.vonJeVlavo), exR1: predlzenie(w, po, HRUBKA + 0.32, obvod.vonJeVlavo),
      });
    }
  }
  return diely.size ? { diely } : null;
}

/** Plášť jednej steny. */
function plastSteny(zb, { r, w, predOk, poOk, ex0, ex1, exR0, exR1 }) {
  const { typ, seed, seedInt, farba: c, znaky, pasy, vrch } = r;
  const S = stena(w.p, w.e, w.n, zb, typ + seed, znaky);
  const cRimsa = c.clone().multiplyScalar(1.07);
  const sA = -ex0, sB = w.d + ex1;
  const sw = w.d / w.osi;
  let najvyssie = null, prvy = true;

  for (const [y0, y1, v0, v1] of pasy) {
    if (v0 < 1 || v1 > 99 || y1 - y0 < 0.5) continue;       // len poschodia (nie sokel, prízemie, atika)
    const F = Math.round(v1 - v0);
    if (F < 1) continue;
    const hf = (y1 - y0) / F;
    const vStred = v0 + 0.5;
    najvyssie = Math.max(najvyssie ?? -Infinity, y1);
    if (prvy) S.spodok(sA, sB, y0, c.clone().multiplyScalar(0.55), vStred);
    prvy = false;
    if (!predOk) S.koniec(sA, y0, y1, -1, c.clone().multiplyScalar(0.8), vStred);
    if (!poOk) S.koniec(sB, y0, y1, 1, c.clone().multiplyScalar(0.8), vStred);

    for (let j = 0; j < F; j++) {
      const vj = v0 + j, ya = y0 + j * hf;
      const ly = (l) => ya + l * hf;
      const O = OKNO[riadokPodlazia(seedInt, Math.floor(vj + 0.001))];
      const V = (l) => vj + Math.min(0.999, Math.max(0.001, l));
      // líce plášťa: pás pod oknami a nad oknami cez celú stenu, medzi oknami piliere (UV bunky = s / šírka osi)
      S.lice(sA, sB, ya, ly(O.y0), HRUBKA, sA / sw, sB / sw, V(0), V(O.y0), c);
      S.lice(sA, sB, ly(O.y1), ya + hf, HRUBKA, sA / sw, sB / sw, V(O.y1), V(1), c);
      for (let k = 0; k <= w.osi; k++) {
        const s0 = k === 0 ? sA : (k - 1 + O.x1) * sw, s1 = k === w.osi ? sB : (k + O.x0) * sw;
        S.lice(s0, s1, ly(O.y0), ly(O.y1), HRUBKA, s0 / sw, s1 / sw, V(O.y0), V(O.y1), c);
      }
      for (let k = 0; k < w.osi; k++) {
        const sx = (l) => (k + l) * sw;
        S.ostenie(sx(O.x0), sx(O.x1), ly(O.y0), ly(O.y1), vStred, c);
        S.kvader(sx(O.parapet[0]) - 0.04, sx(O.parapet[1]) + 0.04, ly(O.y0) - 0.085, ly(O.y0) + 0.005, HRUBKA, HRUBKA + 0.13, KAMEN, vStred, { spodok: 0.6 });
        const R = O.rimsa;
        S.kvader(sx(R.x0), sx(R.x1), ly(R.y0), ly(R.y1), HRUBKA, HRUBKA + 0.1, cRimsa, vStred, { spodok: 0.62 });
        if (O.fronton) S.fronton(sx(R.x0), sx(R.x1), ly(R.y1), ly(O.fronton), HRUBKA, HRUBKA + 0.08, cRimsa, vStred);
      }
      // podlažná rímsa na spodku podlažia (v atlase je nakreslená na rovnakom mieste)
      S.kvader(sA, sB, ya + 0.012 * hf, ya + 0.05 * hf, HRUBKA, HRUBKA + 0.07, cRimsa, vStred, { boky: false, spodok: 0.6 });
    }
  }

  // hlavná rímsa pod strechou (v páse atiky) – dvojstupňová, presahuje viac ako plášť
  if (najvyssie !== null && vrch - najvyssie > 0.25) {
    const ha = vrch - najvyssie;
    const boky = !(predOk && poOk);
    S.kvader(sA, sB, najvyssie, najvyssie + ha * 0.45, 0, HRUBKA + 0.1, cRimsa, 100.7, { boky, spodok: 0.6 });
    S.kvader(-exR0, w.d + exR1, najvyssie + ha * 0.45, vrch, 0, HRUBKA + 0.32, cRimsa, 100.7, { boky, spodok: 0.5 });
  }
}

/** Postaví sieť jedného dielu (steny z plánu) – generátor, vráti riadenie po každej stene; výsledok = sieť alebo null. */
export function* postavDiel(diel) {
  const zb = new Zberac();
  for (const s of diel.steny) { plastSteny(zb, s); yield; }
  if (!zb.pocet) return null;
  const mesh = new THREE.Mesh(zb.geometria(), ziskajMaterialy()[0]);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.name = 'fasada3d';
  return mesh;
}
