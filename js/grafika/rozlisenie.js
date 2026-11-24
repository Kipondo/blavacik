// Modul: automatické rozlíšenie. Meria skutočný čas snímok a keď grafická karta nestíha
// (menej ako ~50 snímok za sekundu), zníži rozlíšenie kreslenia (pixel ratio) po krokoch až na minimum predvoľby.
// Keď je rezerva, pomaly ho vráti späť. Krátke zaseknutia (načítanie dlaždice) sa nerátajú – rozhoduje medián.
// Ak zníženie nepomohlo (brzdí procesor, nie grafická karta), vráti sa späť a chvíľu to neskúša
// (pol minúty, pri ďalšom neúspechu dvakrát dlhšie, najviac 5 minút).
// Rozsah pomeru pixelov je podľa kvality grafiky (hra.stav.grafika.pixel = [min, max], js/grafika/predvolby.js).
// Ustálenie: rozlíšenie sa hľadá len prvých USTALENIE_S sekúnd (od štartu a od zmeny kvality). Potom sa už nemení,
// aby obraz nekolísal medzi ostrým a rozmazaným – len keď hra dlhšie naozaj nestíha (NUDZA_MS), zníži sa o krok.
// Pre ostatné moduly: hra.stav.rozlisenie = aktuálny podiel (0 – 1),
//   hra.stav.meranieSnimok = { poradie, medianMs, podiel, naMinime } – posledné meranie (každých 1,5 s);
//   naMinime = rozlíšenie už nejde znížiť alebo znižovanie nepomáha (js/grafika/kvalita.js potom skráti dohľad).

import { KONFIG } from '../config.js';

const OKNO = 1.5;            // s – dĺžka merania
const POMALE_MS = 20;        // medián nad týmto → znížiť
const RYCHLE_MS = 13.5;      // medián pod týmto (po 3 oknách) → zvýšiť
const MIN = 0.55, KROK_DOLE = 0.1, KROK_HORE = 0.05;   // MIN = bez predvoľby kvality
const USTALENIE_S = 45;      // s – potom sa rozlíšenie už nehľadá
const NUDZA_MS = 34;         // medián nad týmto ...
const NUDZA_OKIEN = 4;       // ... toľko meraní za sebou (6 s) → núdzové zníženie aj po ustálení

export default {
  nazov: 'rozlisenie',
  poradie: 1,

  init(hra) {
    this.nastavRozsah(hra);
    this.podiel = 1;
    this.poradie = 0;
    this.casy = [];
    this.posledny = performance.now();
    this.okno = 0;
    this.dobrych = 0;
    this.skuska = null;          // { pred: medián pred znížením, podiel: podiel pred znížením }
    this.blokDo = 0;
    this.blokTrvanie = 30000;
    hra.stav.rozlisenie = 1;
    // po zmene veľkosti okna (main.js nastaví veľkosť) ostane naše rozlíšenie
    window.addEventListener('resize', () => this._nastav(hra));
    this.zaciatok = performance.now();
    this.nudza = 0;
    hra.na('kvalita', () => { this.nastavRozsah(hra); this.podiel = Math.max(this.min, Math.min(1, this.podiel)); this.zaciatok = performance.now(); this._nastav(hra); });
    this._nastav(hra);
  },

  /** Rozsah pomeru pixelov podľa predvoľby: základ = min(pomer obrazovky, max), najmenší podiel = min / základ. */
  nastavRozsah(hra) {
    const [pMin, pMax] = hra.stav.grafika?.pixel ?? [0, KONFIG.MAX_PIXEL_RATIO];
    this.zaklad = Math.min(window.devicePixelRatio || 1, KONFIG.MAX_PIXEL_RATIO, pMax);
    this.min = pMin ? Math.min(1, pMin / this.zaklad) : MIN;
  },

  updateVzdy(dt, hra) {
    const teraz = performance.now();
    const ms = teraz - this.posledny;
    this.posledny = teraz;
    // pozastavená karta / skrytá stránka – neráta sa
    if (ms > 500 || document.hidden) { this.casy.length = 0; this.okno = 0; return; }
    this.casy.push(ms);
    this.okno += ms / 1000;
    if (this.okno < OKNO) return;

    const zoradene = this.casy.sort((a, b) => a - b);
    const median = zoradene[zoradene.length >> 1];
    this.casy = [];
    this.okno = 0;
    const ustalene = teraz - this.zaciatok > USTALENIE_S * 1000;
    hra.stav.meranieSnimok = {
      poradie: ++this.poradie, medianMs: median, podiel: this.podiel,
      naMinime: this.podiel <= this.min + 1e-3 || teraz < this.blokDo || ustalene,
    };
    if (ustalene) {
      // po ustálení len núdzovo nižšie (dlhšie veľmi pomalé snímky), nikdy späť hore
      this.skuska = null;
      this.nudza = median > NUDZA_MS ? this.nudza + 1 : 0;
      if (this.nudza >= NUDZA_OKIEN && this.podiel > this.min + 1e-3) {
        this.nudza = 0;
        this.podiel = Math.max(this.min, this.podiel - KROK_DOLE);
        this._nastav(hra);
      }
      return;
    }
    // pomohlo posledné zníženie?
    if (this.skuska) {
      const { pred, podiel } = this.skuska;
      this.skuska = null;
      if (median > pred * 0.92) {
        this.podiel = podiel; this._nastav(hra);
        this.blokDo = teraz + this.blokTrvanie;
        this.blokTrvanie = Math.min(300000, this.blokTrvanie * 2);
        return;
      }
      this.blokTrvanie = 30000;
    }
    if (median > POMALE_MS && this.podiel > this.min && teraz > this.blokDo) {
      this.skuska = { pred: median, podiel: this.podiel };
      this.podiel = Math.max(this.min, this.podiel - KROK_DOLE);
      this.dobrych = 0;
      this._nastav(hra);
    } else if (median < RYCHLE_MS && this.podiel < 1) {
      if (++this.dobrych >= 3) {
        this.podiel = Math.min(1, this.podiel + KROK_HORE);
        this.dobrych = 0;
        this._nastav(hra);
      }
    } else {
      this.dobrych = 0;
    }
  },

  _nastav(hra) {
    const r = Math.round(this.zaklad * this.podiel * 100) / 100;
    if (Math.abs(hra.renderer.getPixelRatio() - r) > 0.001) hra.renderer.setPixelRatio(r);
    hra.stav.rozlisenie = this.podiel;
  },
};
