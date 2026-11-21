// Modul (DOČASNÝ – na prezeranie mesta): lietanie pešo.
//   2× rýchlo Medzerník = zapnúť / vypnúť lietanie,
//   Medzerník (držať) = hore, Shift (držať) = dole, W A S D = smerom kamery.
// Rýchlosť rastie s výškou nad zemou (pri zemi ~14 m/s, vysoko až 150 m/s). Bez kolízií – letí sa aj cez domy.
// Keď pri klesaní (Shift) dosadneš na zem, lietanie sa vypne; po vypnutí vo vzduchu postava spadne.
// Beží hneď po module hráča a jeho polohu (výšku, gravitáciu) prepíše vlastnou.
// Pre ostatné moduly: hra.stav.leti (true / false).

import * as THREE from 'three';

const DVOJKLIK = 0.32;          // s – dve stlačenia Medzerníka v tomto čase
const MAX_RYCHLOST = 150;       // m/s
const MAX_VYSKA = 2000;         // m nad zemou

export default {
  nazov: 'let',
  poradie: 11, // po hráčovi (10), pred kamerou

  init(hra) {
    this.leti = false;
    this.poz = new THREE.Vector3();
    this.v = new THREE.Vector3();
    this.cas = 0;
    this.drzalSkok = false;
    this.posledneStlacenie = -1;
    hra.stav.leti = false;
    // presun na mape (js/ladenie/teleport.js) – vo vzduchu sa zachová výška nad zemou
    hra.na('teleport', ({ x, y, z }) => {
      if (!this.leti) return;
      const nad = this.poz.y - hra.mapa.vyska(this.poz.x, this.poz.z);
      this.poz.set(x, y + Math.max(2, nad), z);
      this.v.set(0, 0, 0);
    });
  },

  update(dt, hra) {
    const h = hra.hrac;
    if (!h) return;
    this.cas += dt;

    // dvojité stlačenie Medzerníka (len pešo)
    const skok = hra.vstup.drzi('skok');
    if (skok && !this.drzalSkok && !hra.stav.auto && !h.akcia) {
      if (this.cas - this.posledneStlacenie < DVOJKLIK) {
        this._prepni(hra, !this.leti);
        this.posledneStlacenie = -1;
      } else {
        this.posledneStlacenie = this.cas;
      }
    }
    this.drzalSkok = skok;
    if (!this.leti) return;
    if (hra.stav.auto || h.akcia) { this._prepni(hra, false); return; }

    // pohyb: vodorovne smerom kamery, zvislo Medzerník / Shift
    const zem = hra.mapa.vyska(this.poz.x, this.poz.z);
    const rych = Math.min(MAX_RYCHLOST, 14 + Math.max(0, this.poz.y - zem) * 0.6);
    const p = hra.vstup.pohyb();
    const smer = hra.stav.smerKamery ?? h.uhol;
    const fx = Math.sin(smer), fz = Math.cos(smer), rx = -fz, rz = fx;
    let dx = fx * p.y + rx * p.x, dz = fz * p.y + rz * p.x;
    const d = Math.hypot(dx, dz);
    if (d > 1) { dx /= d; dz /= d; }
    const dy = (skok ? 1 : 0) - (hra.vstup.drzi('beh') ? 1 : 0);
    const k = Math.min(1, dt * 4);
    this.v.x += (dx * rych - this.v.x) * k;
    this.v.z += (dz * rych - this.v.z) * k;
    this.v.y += (dy * Math.max(8, rych * 0.6) - this.v.y) * k;
    this.poz.addScaledVector(this.v, dt);

    if (hra.mapa.jeMimo?.(this.poz.x, this.poz.z)) { this.poz.x -= this.v.x * dt; this.poz.z -= this.v.z * dt; }
    const zem2 = hra.mapa.vyska(this.poz.x, this.poz.z);
    if (this.poz.y <= zem2) {
      this.poz.y = zem2;
      if (dy < 0) this._prepni(hra, false);   // pristál
    }
    this.poz.y = Math.min(this.poz.y, zem2 + MAX_VYSKA);

    // prepíšeme hráča (modul hráča medzitým pridal gravitáciu a chôdzu)
    h.pozicia.copy(this.poz);
    h.vy = 0;
    h.vx = 0; h.vz = 0;
    h.naZemi = !this.leti;
    h.rychlost = Math.hypot(this.v.x, this.v.z);
    if (d > 0.05) {
      let r = Math.atan2(dx, dz) - h.uhol;
      r = Math.atan2(Math.sin(r), Math.cos(r));
      h.uhol += r * Math.min(1, dt * 8);
    }
    h.mesh.position.copy(h.pozicia);
    h.mesh.rotation.y = h.uhol;
  },

  _prepni(hra, zapni) {
    if (zapni === this.leti) return;
    this.leti = zapni;
    hra.stav.leti = zapni;
    const h = hra.hrac;
    if (zapni) {
      this.poz.copy(h.pozicia);
      this.poz.y += 0.5;
      this.v.set(0, 4, 0);
      hra.ui.sprava('Lietanie: Medzerník hore, Shift dole, 2× Medzerník vypne', 3);
    } else {
      h.vy = 0;
      hra.ui.sprava('Lietanie vypnuté', 1.2);
    }
  },
};
