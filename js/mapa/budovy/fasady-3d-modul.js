// Modul: diely 3D fasád historických budov (js/mapa/budovy/fasady-3d.js) sa stavajú a rušia podľa
// vzdialenosti od kamery. Plán dielov pripraví stavba dlaždice (skupina „fasady3d“ v dlaždici);
// tu sa stavia vždy najbližší chýbajúci diel (najviac ROZPOCET ms za snímok, po stenách), vzdialené sa zrušia.
// Ďalej od kamery stačia okná nakreslené v atlase fasád (rozdiel 20 cm z diaľky nevidno).

import { postavDiel } from './fasady-3d.js';

const UKAZ = 250;            // m od kamery k stredu dielu – diel je viditeľný
const POSTAV = 290;          // m – diel sa postaví
const ZRUS = 380;            // m – diel sa zruší (uvoľní pamäť)
const ROZPOCET = 3;          // ms na snímok na stavbu

export default {
  nazov: 'fasady3d',
  poradie: 9,

  init(hra) {
    this.skupiny = new WeakMap();   // objekt dlaždice → skupina fasady3d (alebo null)
    this.stavba = null;             // { g, diel, gen } – rozostavaný diel
  },

  updateVzdy(dt, hra) {
    const aktivne = hra.mapa?.dlazdice?.aktivne;
    if (!aktivne) return;
    const k = hra.kamera.position;
    let najblizsi = null, min = POSTAV;
    for (const a of aktivne.values()) {
      if (a.uroven !== 'detail') continue;
      let g = this.skupiny.get(a.objekt);
      if (g === undefined) {
        g = a.objekt.getObjectByName('fasady3d') ?? null;
        this.skupiny.set(a.objekt, g);
      }
      if (!g) continue;
      for (const diel of g.userData.plan.diely.values()) {
        const d = Math.hypot(diel.x - k.x, diel.z - k.z);
        if (diel.mesh) {
          if (d > ZRUS) {
            g.remove(diel.mesh);
            diel.mesh.geometry.dispose();
            diel.mesh = null;
          } else {
            diel.mesh.visible = d < UKAZ;
          }
        } else if (!diel.prazdny && d < min && this.stavba?.diel !== diel) {
          min = d;
          najblizsi = [g, diel];
        }
      }
    }
    if (!this.stavba && najblizsi) {
      const [g, diel] = najblizsi;
      this.stavba = { g, diel, gen: postavDiel(diel) };
    }
    const koniec = performance.now() + ROZPOCET;
    while (this.stavba && performance.now() < koniec) {
      const { g, diel, gen } = this.stavba;
      const r = gen.next();
      if (!r.done) continue;
      this.stavba = null;
      if (!g.parent) break;                       // dlaždica medzitým zmizla
      diel.mesh = r.value;
      if (diel.mesh) { diel.mesh.visible = Math.hypot(diel.x - k.x, diel.z - k.z) < UKAZ; g.add(diel.mesh); }
      else diel.prazdny = true;
    }
  },
};

