// Modul: ovládanie pohľadu myšou bez držania tlačidla (Pointer Lock API).
//
// Po „Hrať“ / „Pokračovať“ alebo po kliknutí do hry sa kurzor zamkne a skryje, pohyb myši
// otáča kamerou (hra.vstup.otocKameru). Esc zámok uvoľní a hra sa pozastaví (menu).
// Citlivosť a invertovaná os Y sú v menu (js/ui/nastavenia-mysi.js), uložené v localStorage.
// Na dotykových zariadeniach sa nepoužíva – tam sa pohľad otáča ťahaním prsta (dotyk.js).

import { nacitajNastavenia, vlozNastaveniaDoMenu } from '../ui/nastavenia-mysi.js';

// pohyb myši v pixeloch → jednotky otocKameru (kamera.js násobí 0,005 rad vodorovne, 0,003 zvislo)
const ZAKLAD = 0.55;
const MAX_SKOK = 250; // ochrana pred občasnými obrovskými skokmi movementX v niektorých prehliadačoch

export default {
  nazov: 'mys',
  poradie: 5,

  init(hra) {
    if (hra.vstup.dotyk) return;
    this.hra = hra;
    this.platno = hra.renderer.domElement;
    this.nastavenia = nacitajNastavenia();
    vlozNastaveniaDoMenu(this.nastavenia, (n) => { this.nastavenia = n; });

    document.addEventListener('mousemove', (e) => {
      if (!this.zamknute()) return;
      const n = this.nastavenia;
      const dx = Math.max(-MAX_SKOK, Math.min(MAX_SKOK, e.movementX));
      const dy = Math.max(-MAX_SKOK, Math.min(MAX_SKOK, e.movementY));
      if (dx === 0 && dy === 0) return;
      hra.vstup.otocKameru(dx * ZAKLAD * n.citlivost, dy * ZAKLAD * n.citlivost * (n.invertovatY ? -1 : 1));
    });

    document.addEventListener('pointerlockchange', () => {
      hra.vstup.mysZamknuta = this.zamknute();
      if (!this.zamknute()) {
        // zámok skončil (Esc, prepnutie okna…) → pauza; Esc z klávesnice sa chvíľu ignoruje,
        // aby hneď znova nezavrel menu (klavesnica.js)
        hra.vstup.zamokSkoncil = performance.now();
        if (!hra.stav.pauza && hra.spustenaUdalost) hra.vstup.stlac('pauza');
      }
    });
    document.addEventListener('pointerlockerror', () => {
      hra.ui.sprava('Myš sa nepodarilo zamknúť – klikni do hry ešte raz.', 2.5);
    });

    // klik do hry počas hrania → zamknúť
    document.addEventListener('mousedown', (e) => {
      if (hra.stav.pauza || this.zamknute()) return;
      if (e.target.closest?.('.menu, button, a, input, select, label')) return;
      this.zamkni();
    });

    // „Hrať“ / „Pokračovať“ (volá sa ešte v obsluhe kliknutia alebo klávesy, takže prehliadač zámok dovolí)
    hra.na('pokracuj', () => this.zamkni());
    hra.na('pauza', () => { if (this.zamknute()) document.exitPointerLock(); });
  },

  zamknute() {
    return document.pointerLockElement === this.platno;
  },

  zamkni() {
    if (this.zamknute() || !this.platno.requestPointerLock) return;
    try {
      // surový pohyb myši bez zrýchlenia systému (ak to prehliadač vie)
      const p = this.platno.requestPointerLock({ unadjustedMovement: true });
      if (p?.catch) p.catch(() => { try { this.platno.requestPointerLock()?.catch?.(() => {}); } catch { /* nič */ } });
    } catch {
      try { this.platno.requestPointerLock(); } catch { /* prehliadač zámok nepodporuje */ }
    }
  },
};
