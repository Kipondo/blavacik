// Animácie postavy (AnimationMixer): plynulé miešanie chôdze podľa rýchlosti a samostatné stavy s prechodom.
// Názvy klipov z .glb: stoj, chodza, klus, beh, skok, opita_chodza, plavanie, plavanie_stoj, sedenie,
// nastup_auto, vystup_auto, mavanie.
//
// Chôdza (issue #96): namiesto prepínania klipov podľa prahov rýchlosti hrajú stoj ↔ chôdza ↔ klus ↔ beh naraz
// s váhami podľa rýchlosti (blend space). Chôdza, klus a beh majú spoločnú fázu kroku (rovnaká noha na zemi
// v rovnakom okamihu) a krok sa zrýchľuje podľa skutočnej rýchlosti a dĺžky kroku zmeranej v klipe (krok.js),
// takže nohy nekĺžu. Váhy sa menia plynulo, žiadne skoky medzi pózami.
// Ostatné stavy (skok, plávanie, opitá chôdza, sedenie, nastupovanie…) hrajú samostatne s prechodom.

import * as THREE from 'three';
import { zmerajKrok } from './krok.js';

// náhradná prirodzená rýchlosť klipu (m/s), ak sa krok nedá zmerať (iná kostra)
const RYCHLOST_KLIPU = { chodza: 1.4, klus: 1.9, beh: 3.0, opita_chodza: 0.8, plavanie: 1.3 };
const JEDNORAZOVE = new Set(['skok', 'nastup_auto', 'vystup_auto', 'mavanie']);
// os blend space: klip a rozsah rýchlostí (m/s), v ktorom má plnú váhu; medzi rozsahmi sa mieša lineárne
const LOKOMOCIA = [['stoj', 0, 0], ['chodza', 0.85, 2.3], ['klus', 3.3, 3.8], ['beh', 5.2, Infinity]];
const KROKOVE = new Set(['chodza', 'klus', 'beh']);
// najväčšie zrýchlenie klipu: rýchlejšie kroky by pôsobili ako „cupitanie“, radšej nech noha mierne kĺže
// (klip behu má krátky krok – pri 6 m/s by nohy bez kĺzania museli kmitať ~360 krokov/min)
const MAX_ZRYCHLENIE = { chodza: 1.6, klus: 1.45, beh: 1.3 };
const MIN_ZRYCHLENIE = 0.55;
const PRECHOD_VAH = 0.16;     // s – vyhladenie váh pri chôdzi

export class Animacie {
  constructor(koren, klipy) {
    this.koren = koren;
    this.mixer = new THREE.AnimationMixer(koren);
    this.akcie = {};
    for (const k of klipy) {
      const a = this.mixer.clipAction(k);
      if (JEDNORAZOVE.has(k.name)) {
        a.setLoop(THREE.LoopOnce, 1);
        a.clampWhenFinished = true;
      }
      this.akcie[k.name] = a;
    }
    this.aktualna = null;        // klip s najväčšou váhou (pre ostatné moduly)
    this.samostatna = null;      // práve hraný samostatný stav (mimo blend space)
    this.vahy = new Map();       // akcia → aktuálna váha
    this.ciele = new Map();      // akcia → cieľová váha
    this.prechod = 0.25;         // s – prechod k samostatnému stavu
    this.faza = Math.random();   // spoločná fáza kroku 0…1 (náhodná – dav nepochoduje naraz)
    this.lokomocia = LOKOMOCIA.filter(([m]) => this.akcie[m]);
    this._dt = 0;
    // krok každého klipu (dĺžka slučky a rýchlosť chodidla na zemi)
    const kosti = {};
    for (const m of ['foot_l', 'ball_l', 'foot_r', 'ball_r']) kosti[m] = koren.getObjectByName(m);
    this.krok = {};
    for (const m of [...KROKOVE, 'opita_chodza']) {
      const a = this.akcie[m];
      if (!a) continue;
      const z = zmerajKrok(this.mixer, a, koren, kosti);
      this.krok[m] = { v: z.v ?? RYCHLOST_KLIPU[m], od: z.od, perioda: z.perioda };
    }
  }

  ma(meno) { return !!this.akcie[meno]; }

  /** Mierka postavy (NPC sú rôzne vysoké) – dlhšie nohy = dlhší krok. */
  get mierka() {
    return this.koren.scale.x * (this.koren.parent?.scale.x ?? 1);
  }

  /** Nastaví cieľové váhy (ostatné akcie idú k nule). */
  _ciele(mapa) {
    for (const a of this.vahy.keys()) if (!mapa.has(a)) this.ciele.set(a, 0);
    for (const [a, w] of mapa) {
      if (!this.vahy.has(a)) {
        a.reset();
        a.setEffectiveTimeScale(1);
        a.setEffectiveWeight(0);
        a.play();
        this.vahy.set(a, 0);
      }
      this.ciele.set(a, w);
    }
  }

  /** Samostatný stav s prechodom (s). Jednorazové sa spustia od začiatku. */
  hraj(meno, prechod = 0.25) {
    const nova = this.akcie[meno];
    if (!nova) return null;
    if (this.samostatna === nova) return nova;
    if (JEDNORAZOVE.has(meno) || !this.vahy.has(nova)) {
      nova.reset();
      nova.play();
      if (!this.vahy.has(nova)) this.vahy.set(nova, 0);
    }
    nova.setEffectiveTimeScale(1);
    this.samostatna = nova;
    this.prechod = Math.max(0.01, prechod);
    this._ciele(new Map([[nova, 1]]));
    if (prechod <= 0) for (const a of this.vahy.keys()) this.vahy.set(a, a === nova ? 1 : 0);
    this.aktualna = nova;
    return nova;
  }

  /** Automatický výber podľa pohybu (hráč pešo, NPC chodci). */
  podlaPohybu(rychlost, voVzduchu, opity = false, voVode = false) {
    let meno = null;
    if (voVode) meno = rychlost > 0.25 && this.ma('plavanie') ? 'plavanie' : 'plavanie_stoj';
    else if (voVzduchu && this.ma('skok')) meno = 'skok';
    else if (opity && rychlost >= 0.15 && this.ma('opita_chodza')) meno = 'opita_chodza';
    if (meno && this.ma(meno)) {
      const a = this.hraj(meno, meno === 'skok' ? 0.12 : 0.3);
      const v = this.krok[meno]?.v ?? RYCHLOST_KLIPU[meno];
      if (a && v) a.setEffectiveTimeScale(THREE.MathUtils.clamp(rychlost / (v * this.mierka), 0.6, 1.5));
      return;
    }
    this._chodza(rychlost);
  }

  /** Blend space stoj – chôdza – klus – beh so spoločnou fázou kroku. */
  _chodza(v) {
    const L = this.lokomocia;
    if (!L.length) return;
    this.samostatna = null;
    this.prechod = PRECHOD_VAH;
    // váhy: plná v rozsahu klipu, medzi susednými rozsahmi lineárny prechod
    const ciele = new Map();
    for (let i = 0; i < L.length; i++) {
      const [m, od, po] = L[i];
      if (v >= od && v <= po) { ciele.set(this.akcie[m], 1); break; }
      const dalsi = L[i + 1];
      if (dalsi && v > po && v < dalsi[1]) {
        const t = (v - po) / (dalsi[1] - po);
        ciele.set(this.akcie[m], 1 - t);
        ciele.set(this.akcie[dalsi[0]], t);
        break;
      }
    }
    if (!ciele.size) ciele.set(this.akcie[L[L.length - 1][0]], 1);
    this._ciele(ciele);
    // fáza kroku: frekvencia zmiešaná z klipov – každý sa zrýchli tak, aby chodidlo stálo na zemi
    const s = this.mierka;
    let frekv = 0, suma = 0;
    for (const m of KROKOVE) {
      const a = this.akcie[m], k = this.krok[m];
      const w = a ? this.vahy.get(a) ?? 0 : 0;
      if (!k || w <= 0) continue;
      const pomer = THREE.MathUtils.clamp(v / (k.v * s), MIN_ZRYCHLENIE, MAX_ZRYCHLENIE[m]);
      frekv += w * pomer / k.perioda;
      suma += w;
    }
    if (suma > 0) this.faza = (this.faza + this._dt * frekv / suma) % 1;
    let naj = null, najW = -1;
    for (const [m] of L) {
      const a = this.akcie[m];
      if (KROKOVE.has(m) && this.vahy.has(a)) {
        const k = this.krok[m];
        a.time = k.od + this.faza * k.perioda;
        a.setEffectiveTimeScale(0);    // čas riadi fáza, nie mixér
      }
      const w = ciele.get(a) ?? 0;
      if (w > najW) { najW = w; naj = a; }
    }
    this.aktualna = naj;
  }

  update(dt) {
    this._dt = dt;
    // váhy plynule k cieľom; akcie s nulovou váhou sa zastavia (nestoja výkon)
    const k = 1 - Math.exp(-dt / Math.max(0.01, this.prechod) * 3);
    for (const [a, w] of this.vahy) {
      const c = this.ciele.get(a) ?? 0;
      const nw = Math.abs(c - w) < 0.002 ? c : w + (c - w) * k;
      if (nw <= 0.0005 && c === 0) {
        a.stop();
        this.vahy.delete(a);
        this.ciele.delete(a);
        continue;
      }
      this.vahy.set(a, nw);
      a.setEffectiveWeight(nw);
    }
    this.mixer.update(dt);
  }
}
