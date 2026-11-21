// Modul: vozidlá MHD jazdia podľa skutočného cestovného poriadku (etapa b z issue #14).
//
// Každý spoj z poriadku, ktorý je práve na ceste v okolí hráča, sa ukáže ako električka,
// trolejbus alebo autobus. Poloha sa počíta priamo z poriadku (jazda.js), takže vozidlá prídu
// na zastávku a odídu presne podľa cestovného poriadku – aj po preskočení času.
//
// Pre ostatné moduly zverejňuje hra.mhd.vozidla:
//   [{ kluc, linka, typ, ciel, x, z, smerX, smerZ, rychlost (m/s), stoji, dlzka, sirka,
//      clanky: [{ x, y, z, sx, sz, d, s, vx, vz }] }]   (len vozidlá do VIDITELNOST m)
//
// Vozidlo nejde cez autá ani ľudí (prekazky.js): keď mu niečo stojí na trase, spomalí a počká – jeho čas
// v cestovnom poriadku sa posunie o meškanie (this.meskanie), takže potom pokračuje s meškaním.

import * as THREE from 'three';
import { aktivneSluzby, naKod } from '../kalendar.js';
import { typVozidla, MEDZERA } from './typy.js';
import { stavSpoja, PRED_ODCHODOM } from './jazda.js';
import { VykreslenieVozidiel } from './vykreslenie.js';
import { Displeje } from './displeje.js';
import { riesKolizie } from './kolizie.js';
import { prekazkaPred } from './prekazky.js';
import { spojeVOkne } from './okno-spojov.js';

const OKOLIE_LINIEK = 1600;  // m – linky so zastávkou v tomto okolí sa sledujú
const VIDITELNOST = 1200;    // m – vozidlá ďalej sa nekreslia
const DOSAH_DVERI = 140;     // m – krídla dverí len zblízka
const DOSAH_DISPLEJOV = 110; // m
const OBNOVA = 1;            // s – ako často sa prepočíta zoznam spojov na ceste

const _m = new THREE.Matrix4(), _md = new THREE.Matrix4(), _q = new THREE.Quaternion();
const _e = new THREE.Euler(0, 0, 0, 'YXZ'), _v = new THREE.Vector3(), _j = new THREE.Vector3(1, 1, 1);

/** Bod a smer na trase vo vzdialenosti km; za koncami pokračuje rovno (aby zadné články nenaskočili na seba). */
function bodTrasy(tr, km, out) {
  if (!tr._dlzky) {
    tr._dlzky = new Float64Array(tr.body.length);
    for (let i = 1; i < tr.body.length; i++) {
      tr._dlzky[i] = tr._dlzky[i - 1] + Math.hypot(tr.body[i][0] - tr.body[i - 1][0], tr.body[i][1] - tr.body[i - 1][1]);
    }
  }
  const d = tr._dlzky, n = d.length;
  let lo = 0, hi = n - 1;
  if (km <= 0) hi = 1;
  else if (km >= d[n - 1]) lo = n - 2;
  else while (hi - lo > 1) { const m = (lo + hi) >> 1; if (d[m] <= km) lo = m; else hi = m; }
  const [ax, az] = tr.body[lo], [bx, bz] = tr.body[hi];
  const l = d[hi] - d[lo] || 1;
  const f = (km - d[lo]) / l;
  out.x = ax + (bx - ax) * f;
  out.z = az + (bz - az) * f;
  out.dx = (bx - ax) / l;
  out.dz = (bz - az) / l;
  return out;
}

const _bodZvuk = {};
const sekundyDnaPresne = (d) => d.getHours() * 3600 + d.getMinutes() * 60 + d.getSeconds() + d.getMilliseconds() / 1000;

export default {
  nazov: 'mhd-vozidla',
  poradie: 61, // po module mhd

  init(hra) {
    this.kresba = new VykreslenieVozidiel(hra.scena);
    this.displeje = new Displeje(this.kresba.skupina);
    this.spoje = [];          // spoje na ceste v okolí (obnova raz za sekundu)
    this.dvere = new Map();   // kľúč spoja → otvorenie dverí 0…1
    this.meskanie = new Map(); // kľúč spoja → meškanie v s (čakal na autá / ľudí na trati)
    this.cakanie = new Map();  // kľúč spoja → ako dlho už stojí pred prekážkou (s)
    this.casObnovy = 0;
    this.den = '';
    hra.na('casPreskoceny', () => { this.casObnovy = 0; });
  },

  _sluzby(teraz) {
    const kod = naKod(teraz);
    if (kod !== this.den) {
      const idx = this.hra.mhd.data.index;
      this.den = kod;
      this.dnes = aktivneSluzby(idx, teraz);
      this.vcera = aktivneSluzby(idx, new Date(teraz.getTime() - 86400000));
    }
  },

  /** Zoznam spojov, ktoré sú práve na ceste (alebo čakajú na výchozej) na linkách v okolí. */
  _obnovZoznam(hra, teraz) {
    const data = hra.mhd.data;
    const { x, z } = hra.stav.pozicia;
    const linky = new Set();
    for (const n of data.nastupistia.values()) {
      if (Math.abs(n.x - x) > OKOLIE_LINIEK || Math.abs(n.z - z) > OKOLIE_LINIEK) continue;
      for (const l of n.linky) linky.add(l);
    }
    this._sluzby(teraz);
    const sek = sekundyDnaPresne(teraz);
    let maxMesk = 0;
    for (const m of this.meskanie.values()) if (m > maxMesk) maxMesk = m;
    const spoje = [];
    for (const linka of linky) {
      const t = data.nacitane(linka);
      if (!t) continue;
      const info = data.linky.get(linka);
      const typ = typVozidla(info);
      const { trasy, poriadok } = t;
      // len spoje, ktoré môžu byť práve na ceste (dnešné a včerajšie po polnoci), nie všetky tisíce
      const kandidati = [
        ...spojeVOkne(poriadok, sek - maxMesk - 2, sek + PRED_ODCHODOM),
        ...spojeVOkne(poriadok, sek + 86400 - maxMesk - 2, sek + 86400 + PRED_ODCHODOM),
      ];
      for (const k of kandidati) {
        const [ti, pi, start, sluzba, ciel] = poriadok.spoje[k];
        const prof = poriadok.profily[pi];
        const koniec = start + prof[prof.length - 1] + 2;
        let zaciatok = null;
        const sm = sek - (this.meskanie.get(`${linka}:${k}`) ?? 0);
        if (this.dnes.has(sluzba) && sm >= start - PRED_ODCHODOM && sm <= koniec) zaciatok = start;
        else if (this.vcera.has(sluzba) && sm + 86400 >= start - PRED_ODCHODOM && sm + 86400 <= koniec) zaciatok = start - 86400;
        if (zaciatok === null) continue;
        const tr = trasy.trasy[ti];
        if (!tr || tr.km.length < 2) continue;
        spoje.push({
          kluc: `${linka}:${k}`, linka, typ, farba: info.farba, ciel: poriadok.ciele[ciel],
          tr, prof, km: tr.km.length === prof.length ? tr.km : tr.km.slice(0, prof.length), zaciatok,
        });
      }
    }
    this.spoje = spoje;
  },

  update(dt, hra) {
    if (!hra.mhd?.data) return;
    this.hra = hra;
    const teraz = hra.mhd.teraz();
    this.casObnovy -= dt;
    if (this.casObnovy <= 0) {
      this.casObnovy = OBNOVA;
      this._obnovZoznam(hra, teraz);
    }
    this._vykresli(hra, teraz, dt);
  },

  /** Spomalenie pred prekážkou: čas spoja sa zdrží (meškanie rastie) – pri 4 m stojí, od 26 m ďalej ide plne. */
  _prekazka(hra, s, st, t, dt) {
    const pos = t.posunVpravo ?? 0;
    const bod = (km, out) => {
      bodTrasy(s.tr, km, out);
      out.x -= out.dz * pos; out.z += out.dx * pos;
      return out;
    };
    const d = prekazkaPred(hra, bod, st.km + 0.5, t.sirka);
    let cak = this.cakanie.get(s.kluc) ?? 0;
    if (d === Infinity || cak > 10) {
      // voľno, alebo už čakal priveľmi dlho (aby sa nezasekli s autom, ktoré čaká naňho) – chvíľu ide
      this.cakanie.set(s.kluc, cak > 10 ? (cak > 13 ? 0 : cak + dt) : 0);
      return;
    }
    const f = Math.min(1, Math.max(0, 1 - (d - 4) / 22));
    this.meskanie.set(s.kluc, (this.meskanie.get(s.kluc) ?? 0) + dt * f);
    if (f > 0.9) {
      cak += dt;
      // zazvoní (električka) alebo zatrúbi – raz za chvíľu
      if (Math.floor(cak / 4) !== Math.floor((cak - dt) / 4) || cak === dt) {
        bodTrasy(s.tr, st.km, _bodZvuk);
        hra.posli('zvuk', { meno: t.typ === 'elektricka' ? 'zvoncek' : 'klaxon-kratky', x: _bodZvuk.x, z: _bodZvuk.z });
      }
    }
    this.cakanie.set(s.kluc, cak);
  },

  _vykresli(hra, teraz, dt) {
    const sek = sekundyDnaPresne(teraz);
    const p = hra.stav.pozicia;
    const kresba = this.kresba;
    kresba.zacni();
    this.displeje.zacni();
    const vozidla = [];
    const clankyKolizie = [];
    const blizke = [];
    const bod = {}, bodZ = {};
    let najblizsie = Infinity;
    const zive = new Set();

    for (const s of this.spoje) {
      const t = s.typ;
      const mesk = this.meskanie.get(s.kluc) ?? 0;
      const st = stavSpoja(s.prof, s.km, sek - s.zaciatok - mesk, t);
      if (!st) continue;
      bodTrasy(s.tr, st.km, bod);
      const vzd = Math.hypot(bod.x - p.x, bod.z - p.z);
      // prekážka na trase pred čelom (len v okolí hráča – inde nie sú autá ani ľudia) → spomalí, počká
      if (vzd < 450 && !st.stoji) this._prekazka(hra, s, st, t, dt);
      if (vzd < najblizsie) najblizsie = vzd;
      if (vzd > VIDITELNOST) continue;
      zive.add(s.kluc);

      // dvere: otvorené, keď stojí na zastávke
      let otv = this.dvere.get(s.kluc) ?? 0;
      const ciel = st.stoji ? 1 : 0;
      otv += Math.sign(ciel - otv) * Math.min(Math.abs(ciel - otv), dt * 1.6);
      this.dvere.set(s.kluc, otv);

      const v = { kluc: s.kluc, linka: s.linka, typ: t.typ, ciel: s.ciel, x: bod.x, z: bod.z, smerX: bod.dx, smerZ: bod.dz,
        rychlost: st.rychlost, stoji: st.stoji, sirka: t.sirka, dlzka: 0, clanky: [] };
      let km = st.km;
      const matice = [];
      for (const c of t.clanky) {
        bodTrasy(s.tr, km, bod);
        bodTrasy(s.tr, km - c.d, bodZ);
        // posun do pravého pruhu (autobusy idú po osi cesty)
        const o = t.posunVpravo;
        const fx = bod.x - bod.dz * o, fz = bod.z + bod.dx * o;
        const rx = bodZ.x - bodZ.dz * o, rz = bodZ.z + bodZ.dx * o;
        const dl = Math.hypot(fx - rx, fz - rz) || 1;
        const sx = (fx - rx) / dl, sz = (fz - rz) / dl;
        const yF = hra.mapa.vyska(fx, fz), yR = hra.mapa.vyska(rx, rz);
        const cx = (fx + rx) / 2, cz = (fz + rz) / 2, cy = (yF + yR) / 2;
        _e.set(-Math.atan2(yF - yR, dl), Math.atan2(sx, sz), 0);
        _q.setFromEuler(_e);
        _m.compose(_v.set(cx, cy, cz), _q, _j);
        kresba.clanok(c.varianta, _m);
        matice.push(_m.clone());
        const cl = { x: cx, y: cy, z: cz, sx, sz, d: c.d, s: t.sirka, vx: sx * st.rychlost, vz: sz * st.rychlost };
        v.clanky.push(cl);
        clankyKolizie.push(cl);

        // krídla dverí (zblízka)
        if (vzd < DOSAH_DVERI) {
          const vyska = t.vyska - 0.5 - t.podlaha - 0.05;
          for (const zd of c.dvere) {
            for (const strana of [-1, 1]) {
              // zasúvacie-výklopné: najprv von, potom do strany
              const von = Math.min(1, otv * 2) * 0.13;
              const doStrany = Math.max(0, otv * 2 - 1) * 0.6;
              _md.makeTranslation(-t.sirka / 2 - 0.03 - von, t.podlaha + 0.05, zd + strana * (0.33 + doStrany));
              kresba.kridlo(vyska, _m.clone().multiply(_md));
            }
          }
        }
        km -= c.d + MEDZERA;
      }
      v.dlzka = st.km - km - MEDZERA;
      vozidla.push(v);
      if (vzd < DOSAH_DISPLEJOV) blizke.push({ v, s, matice, vzd });
    }

    // displeje pre najbližšie vozidlá
    blizke.sort((a, b) => a.vzd - b.vzd);
    for (const { s, matice } of blizke) {
      const t = s.typ, c0 = t.clanky[0], cN = t.clanky[t.clanky.length - 1];
      this.displeje.pridaj(s.linka, s.ciel, s.farba, t, matice[0], c0.d, matice[matice.length - 1], cN.d);
    }
    this.displeje.dokonci();
    kresba.dokonci();

    for (const k of this.dvere.keys()) if (!zive.has(k)) this.dvere.delete(k);
    for (const k of this.meskanie.keys()) if (!zive.has(k) && !this.spoje.some((s) => s.kluc === k)) { this.meskanie.delete(k); this.cakanie.delete(k); }
    hra.mhd.vozidla = vozidla;
    hra.hodiny?.blizko('mhd', najblizsie);
    riesKolizie(hra, clankyKolizie);
  },
};
