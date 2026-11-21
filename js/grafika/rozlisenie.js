// Modul: automatické rozlíšenie. Meria skutočný čas snímok a keď grafická karta nestíha
// (menej ako ~50 snímok za sekundu), zníži rozlíšenie kreslenia (pixel ratio) po krokoch až na 55 %.
// Keď je rezerva, pomaly ho vráti späť. Krátke zaseknutia (načítanie dlaždice) sa nerátajú – rozhoduje medián.
// Ak zníženie nepomohlo (brzdí procesor, nie grafická karta), vráti sa späť a pol minúty to neskúša.
// Pre ostatné moduly: hra.stav.rozlisenie = aktuálny podiel (0,55 – 1).

import { KONFIG } from '../config.js';

const OKNO = 1.5;            // s – dĺžka merania
const POMALE_MS = 20;        // medián nad týmto → znížiť
const RYCHLE_MS = 13.5;      // medián pod týmto (po 3 oknách) → zvýšiť
const MIN = 0.55, KROK_DOLE = 0.1, KROK_HORE = 0.05;

export default {
  nazov: 'rozlisenie',
  poradie: 1,

  init(hra) {
    this.zaklad = Math.min(window.devicePixelRatio || 1, KONFIG.MAX_PIXEL_RATIO);
    this.podiel = 1;
    this.casy = [];
    this.posledny = performance.now();
    this.okno = 0;
    this.dobrych = 0;
    this.skuska = null;          // { pred: medián pred znížením, podiel: podiel pred znížením }
    this.blokDo = 0;
    hra.stav.rozlisenie = 1;
    // po zmene veľkosti okna (main.js nastaví veľkosť) ostane naše rozlíšenie
    window.addEventListener('resize', () => this._nastav(hra));
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
    // pomohlo posledné zníženie?
    if (this.skuska) {
      const { pred, podiel } = this.skuska;
      this.skuska = null;
      if (median > pred * 0.92) { this.podiel = podiel; this._nastav(hra); this.blokDo = teraz + 30000; return; }
    }
    if (median > POMALE_MS && this.podiel > MIN && teraz > this.blokDo) {
      this.skuska = { pred: median, podiel: this.podiel };
      this.podiel = Math.max(MIN, this.podiel - KROK_DOLE);
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
