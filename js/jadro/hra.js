// Jadro hry – jediné spoločné rozhranie pre všetky moduly.
//
// Modul je obyčajný objekt:
//   export default {
//     nazov: 'policia',
//     poradie: 100,                 // nižšie = aktualizuje sa skôr (nepovinné)
//     init(hra) { ... },            // raz po načítaní mapy (môže byť async)
//     update(dt, hra) { ... },      // každý snímok (dt v sekundách); nevolá sa počas pauzy
//     updateVzdy(dt, hra) { ... },  // každý snímok aj počas pauzy (nepovinné)
//   };
// a zaregistruje sa v js/moduly.js.
//
// Čo modul v objekte `hra` nájde:
//   hra.THREE            – knižnica Three.js
//   hra.scena            – THREE.Scene
//   hra.kamera           – THREE.PerspectiveCamera
//   hra.mapa             – mapa: vyska(x,z), jeVoVode(x,z), kolizie, miesta, pamiatky, data
//   hra.vstup            – stav ovládania (klávesnica + dotyk)
//   hra.ui               – HUD: hra.ui.sprava(text, sek), hra.ui.napoveda(text), hra.ui.vrstva
//   hra.stav             – herný stav (pozri nižšie)
//   hra.hrac             – hráč (pešo)
//   hra.auta             – zoznam všetkých áut
//   hra.pridajAuto({x, z, uhol, farba}) → Auto
//   hra.odstranAuto(auto)
//   hra.na(udalost, fn) / hra.posli(udalost, data) – udalosti
//
// Udalosti: 'start', 'pauza', 'pokracuj', 'nastupil' (auto), 'vystupil' (auto),
//           'naraz' ({auto, sila}), 'skok'

export class Hra {
  constructor(THREE) {
    this.THREE = THREE;
    this.moduly = [];
    this.posluchaci = new Map();
    this.spustena = false;

    this.scena = null;
    this.kamera = null;
    this.renderer = null;
    this.mapa = null;
    this.vstup = null;
    this.ui = null;
    this.hrac = null;
    this.auta = [];

    // Herný stav – aktualizuje ho jadro každý snímok, ostatné moduly ho čítajú.
    this.stav = {
      rezim: 'pesi',        // 'pesi' alebo 'auto'
      pozicia: new THREE.Vector3(), // poloha hráča alebo auta, ktoré šoféruje
      uhol: 0,              // smer pohľadu/jazdy (rad), 0 = na juh (+z)
      rychlost: 0,          // m/s (pri aute so znamienkom: záporná = cúvanie)
      rychlostKmh: 0,
      auto: null,           // auto, v ktorom hráč sedí (alebo null)
      cas: 0,               // herný čas v sekundách
      pauza: true,
      peniaze: 0,
    };
  }

  /** Zaregistruje modul. Ak už hra beží, hneď ho inicializuje. */
  pridajModul(modul) {
    if (!modul) return modul;
    modul.poradie ??= 100;
    this.moduly.push(modul);
    this.moduly.sort((a, b) => a.poradie - b.poradie);
    if (this.spustena) Promise.resolve(modul.init?.(this)).catch((e) => this._chyba(modul, e));
    return modul;
  }

  /** Inicializuje všetky moduly (volá main.js po načítaní mapy). */
  async inicializujModuly() {
    for (const modul of [...this.moduly]) {
      try {
        await modul.init?.(this);
      } catch (e) {
        this._chyba(modul, e);
      }
    }
    this.spustena = true;
  }

  /** Zavolá update všetkých modulov. */
  aktualizuj(dt) {
    for (const modul of this.moduly) {
      try {
        if (!this.stav.pauza) modul.update?.(dt, this);
        modul.updateVzdy?.(dt, this);
      } catch (e) {
        this._chyba(modul, e);
      }
    }
  }

  /** Prihlásenie na udalosť. Vracia funkciu na odhlásenie. */
  na(udalost, fn) {
    if (!this.posluchaci.has(udalost)) this.posluchaci.set(udalost, new Set());
    this.posluchaci.get(udalost).add(fn);
    return () => this.posluchaci.get(udalost)?.delete(fn);
  }

  /** Pošle udalosť všetkým prihláseným. */
  posli(udalost, data) {
    for (const fn of this.posluchaci.get(udalost) ?? []) {
      try { fn(data, this); } catch (e) { console.error(`Chyba v udalosti ${udalost}:`, e); }
    }
  }

  pauza(zapnut) {
    if (this.stav.pauza === zapnut) return;
    this.stav.pauza = zapnut;
    this.posli(zapnut ? 'pauza' : 'pokracuj');
  }

  // Tieto funkcie doplní modul áut (js/auto/sprava-aut.js)
  pridajAuto() { throw new Error('Modul áut ešte nie je načítaný'); }
  odstranAuto() {}

  _chyba(modul, e) {
    // Chyba v jednom module nesmie zhodiť celú hru
    if (!modul._chybaHlasena) {
      console.error(`Chyba v module „${modul.nazov ?? '?'}“:`, e);
      modul._chybaHlasena = true;
    }
  }
}
