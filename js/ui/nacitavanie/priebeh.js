// Odhad priebehu načítavania (0 … 1) z textov, ktoré posiela načítavanie hry (menu.priebeh v js/main.js,
// js/mapa/nacitaj-mapu.js, js/mapa/mesto.js, js/mapa/dlazdice/sprava-dlazdic.js).
// Každý text je míľnik s podielom; „Staviam mesto… n/N dlaždíc“ sa delí podľa počtu dlaždíc. Medzi míľnikmi
// sa zobrazený priebeh pomaly plazí k ďalšiemu míľniku (vlak nestojí), ale nikdy ho nepredbehne a pred koncom
// načítavania nedôjde do cieľa.

const MILNIKY = [
  [/^Načítavam .*\.json/, 0.04],
  [/^Hľadám mapu/, 0.07],
  [/^Načítavam výškový/, 0.1],
  [/^Načítavam mapu z OpenStreetMap/, 0.12],
  [/^Modelujem terén/, 0.18],
  [/^Staviam cesty/, 0.24],
  [/^Staviam budovy/, 0.3],
  [/^Osádzam/, 0.33],
  [/^Staviam pamiatky/, 0.22],
  [/^Staviam mesto okolo/, 0.3],
  [/^Staviam mesto…/, 0.3],
  [/^Pripravujem moduly/, 0.64],
  [/^Načítavam Ďoďa/, 0.9],
];
const DLAZDICE = [0.3, 0.62];        // podiel, ktorý pripadá na stavbu dlaždíc okolo štartu

export class PriebehNacitavania {
  constructor() {
    this.ciel = 0;          // posledný dosiahnutý míľnik
    this.dalsi = 0.04;      // kam sa dá plaziť
    this.zobrazeny = 0;
    this.odMilnika = 0;     // s od posledného míľnika
    this.hotovo = false;
  }

  /** Text z načítavania → nový míľnik (priebeh nikdy necúva). */
  text(t) {
    let p = null;
    const d = /(\d+)\s*\/\s*(\d+)\s*dlaždíc/.exec(t);
    if (d) p = DLAZDICE[0] + (DLAZDICE[1] - DLAZDICE[0]) * Math.min(1, Number(d[1]) / Math.max(1, Number(d[2])));
    else for (const [re, v] of MILNIKY) if (re.test(t)) { p = v; break; }
    if (p === null || p <= this.ciel) return;
    this.ciel = p;
    this.odMilnika = 0;
    this.dalsi = Math.min(0.97, ([...MILNIKY.map((m) => m[1]), DLAZDICE[1], 0.97].filter((v) => v > p).sort((a, b) => a - b)[0] ?? 0.97));
    if (d) this.dalsi = Math.min(this.dalsi, p + 0.06);
  }

  koniec() { this.hotovo = true; }

  /** Krok animácie; vracia zobrazený priebeh 0 … 1. */
  krok(dt) {
    this.odMilnika += dt;
    let ciel;
    if (this.hotovo) ciel = 1;
    else {
      // plazenie k ďalšiemu míľniku: rýchlo na začiatku, potom stále pomalšie (nedosiahne ho)
      const plaz = (this.dalsi - this.ciel) * 0.85 * (1 - Math.exp(-this.odMilnika / 5));
      ciel = Math.min(0.985, this.ciel + Math.max(0, plaz));
    }
    // vyhladenie: vlak sa rozbieha a brzdí plynulo, nikdy necúva
    const rychlost = this.hotovo ? 0.6 : 0.35;   // max podiel trasy za sekundu
    const krok = Math.min(rychlost * dt, Math.max(0, ciel - this.zobrazeny) * Math.min(1, dt * 2.2));
    this.zobrazeny = Math.min(1, this.zobrazeny + Math.max(krok, this.hotovo ? Math.min(ciel - this.zobrazeny, 0.04 * dt) : 0));
    if (this.hotovo && 1 - this.zobrazeny < 0.002) this.zobrazeny = 1;
    return this.zobrazeny;
  }
}
