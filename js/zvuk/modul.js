// Modul: zvuky hry (všetko syntetizované cez Web Audio) a hlasy postáv.
//   – kroky podľa povrchu (tráva / dlažba), skok a dopad,
//   – auto hráča: štart, motor podľa otáčok, pískanie pneumatík, klaksón (kláves H), dvere, nárazy,
//   – ambient mesta: hukot dopravy (podľa dennej doby a áut v okolí), vietor pri Dunaji a vo výške, holuby v centre,
//   – priestorový zvuk podľa kamery, hlasitosť v menu, klik v menu.
// Ostatné moduly môžu prehrať zvuk udalosťou:
//   hra.posli('zvuk', { meno: 'zvoncek' | 'gong' | 'naraz' | 'dvere' | 'holub' | 'klik', x, y, z, sila })
//   hra.posli('sirena', { id, x, y, z, zapnuta })      – siréna policajného auta (posúva sa s autom)
//   hra.posli('dialog-replika', { dialog, index, variant }), hra.posli('dialog-koniec') – hlasy (js/zvuk/hlasy.js)

import { Zvuk } from './zvuk.js';
import { vlozHlasitostDoMenu } from './nastavenia-zvuku.js';
import { krok } from './kroky.js';
import { skok, dopad } from './dopad.js';
import { Motor, startMotora } from './motor.js';
import { Smyk } from './smyk.js';
import { naraz, dvere } from './naraz.js';
import { Klaxon } from './klaxon.js';
import { zvoncek } from './zvoncek.js';
import { Sirena } from './sirena.js';
import { gong } from './gong.js';
import { klik } from './ui.js';
import { holub } from './holuby.js';
import { Ambient } from './ambient.js';
import { Hlasy } from './hlasy.js';
import { povrchPod } from './povrch.js';

export default {
  nazov: 'zvuk',
  poradie: 95,

  init(hra) {
    const z = new Zvuk();
    this.z = z;
    this.hlasy = new Hlasy(z);
    this.sireny = new Map();
    this.krokDraha = 0;
    this.naZemi = true;
    this.vy = 0;
    this.casAmbient = 0;
    this.casHolub = 8;
    hra.zvuk = z;

    // prehliadač pustí zvuk až po akcii hráča (na mobile po prvom dotyku)
    const odomkni = () => {
      z.odomkni();
      if (z.ctx && !this.ambient) this.ambient = new Ambient(z);
    };
    for (const u of ['pointerdown', 'keydown', 'touchstart']) window.addEventListener(u, odomkni, { passive: true });

    vlozHlasitostDoMenu(z.hlasitost, (k, v) => { odomkni(); z.nastavHlasitost(k, v); });
    document.addEventListener('click', (e) => { if (e.target.closest?.('.menu button, .menu a')) { odomkni(); klik(z); } });

    hra.na('skok', () => { if (z.pripraveny) skok(z); });
    hra.na('naraz', ({ auto, sila }) => {
      if (!z.pripraveny) return;
      const p = auto?.pozicia;
      naraz(z, sila ?? 6, p ? { x: p.x, y: p.y + 0.6, z: p.z } : null);
    });
    hra.na('nastupil', () => {
      if (!z.pripraveny) return;
      dvere(z);
      startMotora(z);
      this.motor?.stop();
      this.motor = new Motor(z);
      this.smyk = new Smyk(z);
      this.klaxon = new Klaxon(z);
    });
    hra.na('vystupil', () => {
      if (z.pripraveny) dvere(z);
      this.motor?.stop(); this.motor = null;
      this.smyk?.stop(); this.smyk = null;
      this.klaxon?.stop(); this.klaxon = null;
    });
    hra.na('zvuk', (u) => this.prehraj(u));
    hra.na('sirena', ({ id, x, y = 0, z: zz, zapnuta = true }) => {
      if (!z.pripraveny) return;
      let s = this.sireny.get(id);
      if (!zapnuta) { s?.stop(); this.sireny.delete(id); return; }
      if (!s) { s = new Sirena(z, { x, y: y + 1.5, z: zz }); this.sireny.set(id, s); }
      s.posun(x, y + 1.5, zz);
    });
    hra.na('dialog-replika', (u) => this.hlasy.prehraj(u));
    hra.na('dialog-koniec', () => this.hlasy.stop());
  },

  prehraj({ meno, x, y = 0, z: zz, sila = 1 } = {}) {
    const z = this.z;
    if (!z.pripraveny) return;
    const poz = Number.isFinite(x) && Number.isFinite(zz) ? { x, y: y + 1, z: zz } : null;
    if (meno === 'zvoncek') zvoncek(z, poz);
    else if (meno === 'gong') gong(z);
    else if (meno === 'naraz') naraz(z, sila * 10, poz);
    else if (meno === 'dvere') dvere(z, poz);
    else if (meno === 'holub' && poz) holub(z, poz);
    else if (meno === 'klik') klik(z);
  },

  updateVzdy(dt, hra) {
    const z = this.z;
    if (!z.pripraveny) return;
    hra.kamera.updateMatrixWorld();
    z.nastavPosluchaca(hra.kamera);
    // v pauze (menu) sa motor a šmyk stíšia
    if (hra.stav.pauza) { this.motor?.update(dt, 0, 0); this.smyk?.update(0); this.klaxon?.nastav(false); }
  },

  update(dt, hra) {
    const z = this.z;
    if (!z.pripraveny) return;
    const h = hra.hrac, auto = hra.stav.auto;

    // pešo: kroky podľa prejdenej dráhy, dopad po skoku
    if (!auto && h) {
      const v = Math.abs(hra.stav.rychlost ?? h.rychlost ?? 0);
      if (h.naZemi && v > 0.5) {
        this.krokDraha += v * dt;
        const dlzkaKroku = v > 4 ? 1.15 : 0.75;
        if (this.krokDraha > dlzkaKroku) {
          this.krokDraha = 0;
          krok(z, { povrch: povrchPod(hra, h.pozicia.x, h.pozicia.z), sila: v > 4 ? 1.2 : 0.85 });
        }
      }
      if (h.naZemi && !this.naZemi && this.vy < -3) dopad(z, Math.min(1.5, -this.vy / 8));
      this.naZemi = h.naZemi;
      this.vy = h.vy ?? 0;
    }

    // auto hráča: motor, šmyk, klaksón
    if (auto && this.motor) {
      const o = auto.ovladanie ?? {};
      const vF = auto.rychlostDopredu ?? 0;
      this.motor.update(dt, vF, o.plyn ?? 0);
      const s = Math.sin(auto.uhol ?? 0), c = Math.cos(auto.uhol ?? 0);
      const bocna = Math.abs((auto.vx ?? 0) * c - (auto.vz ?? 0) * s);
      const brzdenie = (o.plyn ?? 0) < -0.5 && vF > 8 ? 0.5 : 0;
      this.smyk.update(Math.max(0, (bocna - 2.5) / 6) + (o.rucna && Math.abs(vF) > 5 ? 0.4 : 0) + brzdenie);
      this.klaxon.nastav(hra.vstup.drzi('klaxon'));
    }

    // ambient: doprava podľa dennej doby a áut v okolí, vietor pri vode a vo výške, holuby v centre cez deň
    this.casAmbient -= dt;
    if (this.ambient && this.casAmbient <= 0) {
      this.casAmbient = 0.5;
      const p = hra.stav.pozicia;
      const hod = hra.stav.datumCas ? hra.stav.datumCas.getHours() + hra.stav.datumCas.getMinutes() / 60 : 12;
      const den = hod >= 6 && hod < 21 ? 1 : 0.35;
      let blizko = 0;
      for (const a of hra.auta ?? []) if (Math.hypot(a.pozicia.x - p.x, a.pozicia.z - p.z) < 120) blizko++;
      let voda = 0;
      for (let k = 0; k < 8; k++) {
        const u = (k / 8) * Math.PI * 2;
        if (hra.mapa.jeVoVode?.(p.x + Math.cos(u) * 60, p.z + Math.sin(u) * 60)) voda++;
      }
      const nadZemou = hra.kamera.position.y - hra.mapa.vyska(hra.kamera.position.x, hra.kamera.position.z);
      this.ambient.update(Math.min(1, den * 0.55 + blizko * 0.06), Math.min(1, voda / 4 + Math.max(0, nadZemou - 15) / 60 + 0.15));
      // holuby: cez deň v centre, pešo, raz za 8–20 s
      this.casHolub -= 0.5;
      if (this.casHolub <= 0 && !auto && den === 1 && Math.hypot(p.x, p.z) < 900) {
        this.casHolub = 8 + Math.random() * 12;
        const u = Math.random() * Math.PI * 2, r = 5 + Math.random() * 10;
        holub(z, { x: p.x + Math.cos(u) * r, y: hra.mapa.vyska(p.x, p.z) + 0.3, z: p.z + Math.sin(u) * r });
      }
    }
  },
};
