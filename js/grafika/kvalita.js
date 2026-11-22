// Modul: kvalita grafiky (#58) – výber v menu (nízka / stredná / vysoká / ultra / auto) a dohľad.
//   – hodnoty predvolieb sú v js/grafika/predvolby.js; aktívne zverejní v hra.stav.grafika a hra.stav.kvalita
//     (pri voľbe „auto“ je v hra.stav.kvalita skutočná úroveň) a pri zmene pošle udalosť 'kvalita' (hra.stav.grafika),
//   – dohľad: hmla končí pri dohľade, plne podrobné dlaždice len v okruhu „detail“, jednoduché bloky budov
//     po koniec hmly, za ňou sa nestavia nič (pamiatky a skupiny stromov za hmlou skryje js/kamera/dohlad.js),
//   – keď hra dlhšie nestíha ani pri najnižšom automatickom rozlíšení (js/grafika/rozlisenie.js), dohľad sa skráti
//     o 15 % (zaokrúhlené na 5 m, najviac na 55 %); keď je rezerva, pomaly sa vráti,
//   – „auto“: prvý odhad podľa grafickej karty, potom podľa plynulosti o stupeň nižšie (alebo vyššie).
// hra.stav.dohlad = aktuálny dohľad v m (po skrátení).

import { PREDVOLBY, UROVNE, urovenPreVolbu } from './predvolby.js';
import { nacitajKvalitu, vlozKvalituDoMenu, NAZOV_UROVNE } from '../ui/nastavenia-grafiky.js';

const POMALE_MS = 24;      // medián času snímky nad týmto (pri najnižšom rozlíšení) → skrátiť dohľad
const RYCHLE_MS = 14;      // pod týmto → vrátiť dohľad
const OKIEN_DOLE = 3;      // koľko meraní (po 1,5 s) za sebou musí byť pomalých
const OKIEN_HORE = 6;
const NAJKRATSI = 0.55;    // podiel dohľadu predvoľby, kratší sa nespraví
const AUTO_DOLE_MS = 30;   // auto: aj pri najkratšom dohľade takto pomalé → nižšia kvalita
const AUTO_HORE_MS = 9;    // auto: takto rýchle pri plnom rozlíšení a dohľade 30 s → vyššia kvalita
const zaokruhli5 = (m) => Math.round(m / 5) * 5;

export default {
  nazov: 'kvalita',
  poradie: 0,

  init(hra) {
    this.volba = nacitajKvalitu('auto');
    this.neuspesne = new Set();   // auto: úrovne, z ktorých sme už museli zísť (nevraciame sa na ne)
    this.pomalych = 0; this.rychlych = 0; this.autoRychle = 0;
    this.poslednyZaznam = -1;

    this.popis = vlozKvalituDoMenu(this.volba, (v) => this.zmenVolbu(hra, v));
    this.nastavUroven(hra, urovenPreVolbu(this.volba, hra.renderer?.getContext()));
  },

  zmenVolbu(hra, volba) {
    this.volba = volba;
    this.neuspesne.clear();
    this.nastavUroven(hra, urovenPreVolbu(volba, hra.renderer?.getContext()));
  },

  nastavUroven(hra, uroven) {
    this.uroven = uroven;
    this.predvolba = PREDVOLBY[uroven];
    hra.stav.kvalita = uroven;
    hra.stav.grafika = { ...this.predvolba };
    this.pomalych = 0; this.rychlych = 0; this.autoRychle = 0;
    this.nastavDohlad(hra, this.predvolba.dohlad);
    hra.posli('kvalita', hra.stav.grafika);
  },

  /** Dohľad = koniec hmly = okraj jednoduchých dlaždíc. */
  nastavDohlad(hra, m) {
    const p = this.predvolba;
    this.dohlad = m;
    hra.stav.dohlad = m;
    hra.stav.grafika.dohlad = m;
    const hmla = hra.scena.fog;
    if (hmla?.isFog) { hmla.near = p.dohlad * p.hmlaOd; hmla.far = m; }
    const sprava = hra.mapa?.dlazdice;
    sprava?.nastavPolomery?.(Math.min(p.detail, m), m);
    hra.mapa?.horizont?.userData.nastavPolomer?.(Math.min(p.detail, m) * 0.65);
    this.ukazStav();
  },

  ukazStav() {
    const auto = this.volba === 'auto' ? `auto: ${NAZOV_UROVNE[this.uroven]} · ` : '';
    const skratene = this.dohlad < this.predvolba.dohlad ? ' (skrátený – hra nestíhala)' : '';
    this.popis?.(`${auto}dohľad ${this.dohlad} m${skratene}`);
  },

  updateVzdy(dt, hra) {
    // nové meranie z automatického rozlíšenia (každých ~1,5 s)
    const m = hra.stav.meranieSnimok;
    if (!m || m.poradie === this.poslednyZaznam) return;
    this.poslednyZaznam = m.poradie;
    if (hra.stav.pauza) return;
    const p = this.predvolba;
    const najkratsi = Math.max(p.detail + 50, zaokruhli5(p.dohlad * NAJKRATSI));

    if (m.medianMs > POMALE_MS && m.naMinime) {
      this.rychlych = 0;
      if (++this.pomalych >= OKIEN_DOLE) {
        this.pomalych = 0;
        if (this.dohlad > najkratsi) this.nastavDohlad(hra, Math.max(najkratsi, zaokruhli5(this.dohlad * 0.85)));
        else if (this.volba === 'auto' && m.medianMs > AUTO_DOLE_MS) this._autoDole(hra);
      }
    } else if (m.medianMs < RYCHLE_MS) {
      this.pomalych = 0;
      if (this.dohlad < p.dohlad && ++this.rychlych >= OKIEN_HORE) {
        this.rychlych = 0;
        this.nastavDohlad(hra, Math.min(p.dohlad, zaokruhli5(this.dohlad / 0.85)));
      }
    } else {
      this.pomalych = 0; this.rychlych = 0;
    }

    // auto: veľká rezerva pri plnom rozlíšení a plnom dohľade → skúsiť vyššiu kvalitu
    if (this.volba === 'auto') {
      const plne = m.podiel >= 1 && this.dohlad >= p.dohlad;
      this.autoRychle = plne && m.medianMs < AUTO_HORE_MS ? this.autoRychle + 1 : 0;
      if (this.autoRychle >= 20) this._autoHore(hra);
    }
  },

  _autoDole(hra) {
    const i = UROVNE.indexOf(this.uroven);
    if (i <= 0) return;
    this.neuspesne.add(this.uroven);
    this.nastavUroven(hra, UROVNE[i - 1]);
    hra.ui?.sprava?.(`Grafika: ${NAZOV_UROVNE[this.uroven]} (automaticky)`, 3);
  },

  _autoHore(hra) {
    this.autoRychle = 0;
    const dalsia = UROVNE[UROVNE.indexOf(this.uroven) + 1];
    if (!dalsia || this.neuspesne.has(dalsia)) return;
    this.nastavUroven(hra, dalsia);
    hra.ui?.sprava?.(`Grafika: ${NAZOV_UROVNE[this.uroven]} (automaticky)`, 3);
  },
};
