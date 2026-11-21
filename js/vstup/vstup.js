// Spoločný stav ovládania. Klávesnica (klavesnica.js) aj dotyk (dotyk.js)
// zapisujú sem, herné moduly odtiaľto len čítajú.
//
//   hra.vstup.pohyb()          → { x, y }  x: -1 vľavo … 1 vpravo, y: -1 dozadu … 1 dopredu
//   hra.vstup.drzi('beh')      → true, kým je tlačidlo držané ('beh', 'skok', 'rucna')
//   hra.vstup.stlacil('akcia') → true raz po stlačení ('akcia', 'pauza', 'poloha', 'mapa', 'dalej')
//   hra.vstup.kameraPosun()    → { dx, dy } o koľko hráč otočil kameru (myš / prst)
//   hra.vstup.blokovane = true → hra nedostáva pohyb, držané tlačidlá ani otáčanie kamery
//                                (napr. otvorená veľká mapa – tá číta smer cez surovyPohyb())

export class Vstup {
  constructor() {
    this.klavesy = { hore: false, dole: false, vlavo: false, vpravo: false };
    this.joystick = { x: 0, y: 0 };
    this.drzane = new Set();
    this.stlacene = new Set();
    this.kamera = { dx: 0, dy: 0 };
    this.poslednyPohybKamery = -Infinity;
    this.blokovane = false;
  }

  pohyb() {
    if (this.blokovane) return { x: 0, y: 0 };
    return this.surovyPohyb();
  }

  /** Smer z klávesnice / joysticku aj pri blokovanom vstupe (pre UI, napr. posun mapy). */
  surovyPohyb() {
    let x = (this.klavesy.vpravo ? 1 : 0) - (this.klavesy.vlavo ? 1 : 0) + this.joystick.x;
    let y = (this.klavesy.hore ? 1 : 0) - (this.klavesy.dole ? 1 : 0) + this.joystick.y;
    x = Math.max(-1, Math.min(1, x));
    y = Math.max(-1, Math.min(1, y));
    return { x, y };
  }

  drzi(nazov) {
    return !this.blokovane && this.drzane.has(nazov);
  }

  /** Vráti true, ak bolo tlačidlo stlačené od posledného volania (a „spotrebuje“ ho). */
  stlacil(nazov) {
    // pri blokovanom vstupe len mapa a pauza (ostatné stlačenia sa zahodia na konci snímku)
    if (this.blokovane && nazov !== 'mapa' && nazov !== 'pauza') return false;
    if (this.stlacene.has(nazov)) {
      this.stlacene.delete(nazov);
      return true;
    }
    return false;
  }

  /** Bez spotrebovania – len pozrie, či čaká stlačenie. */
  caka(nazov) {
    return this.stlacene.has(nazov);
  }

  kameraPosun() {
    const p = this.blokovane ? { dx: 0, dy: 0 } : { dx: this.kamera.dx, dy: this.kamera.dy };
    this.kamera.dx = 0;
    this.kamera.dy = 0;
    return p;
  }

  // --- zápis (volajú klavesnica.js a dotyk.js) ---
  stlac(nazov) { this.stlacene.add(nazov); }
  drz(nazov, ano) { if (ano) this.drzane.add(nazov); else this.drzane.delete(nazov); }
  otocKameru(dx, dy) {
    if (this.blokovane) return;
    this.kamera.dx += dx;
    this.kamera.dy += dy;
    this.poslednyPohybKamery = performance.now();
  }

  /** Na konci snímku zahodí nespotrebované stlačenia, aby sa „nenazbierali“. */
  koniecSnimku() {
    this.stlacene.clear();
  }
}
