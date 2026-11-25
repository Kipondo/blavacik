// Modul: dosah tieňov (výkon, issue #110). Kreslenie do tieňovej mapy bolo ~40 % volaní kreslenia a trojuholníkov
// (Šafárikovo nám., kvalita vysoká: 310 volaní, 1,45 mil. △). Bez viditeľnej zmeny:
//   – malé objekty (sochy, autá, chodci, kolobežky, semafory…) vrhajú tieň len do DOSAH_MALE metrov od hráča –
//     ďalej je ich tieň na pár pixeloch a v opare; vracajú sa len tie, ktorým tieň vypol tento modul,
//   – do tieňa sa kreslí aj vrstva VRSTVA_TIENA: zástupné koruny stromov (js/mapa/zelen/stromy.js), ktoré sa do
//     obrazu nekreslia – podrobné listy stromov vrhajú tieň len zblízka; aj tieňoví zástupcovia pamiatok, dlaždíc
//     a postáv (js/grafika/tienovy-zastupca.js) – ich pôvodné siete (userData.tienCezZastupcu) tento modul nezapína.
//     Three.js (r170) pri kreslení tieňa testuje vrstvy objektu voči HLAVNEJ kamere, nie kamere tieňa – preto sa
//     hlavnej kamere vrstva tieňa zapne len na čas kreslenia tieňových máp (vrstvaTienaPriKresleni). Zoznam toho,
//     čo sa kreslí do obrazu, sa zostaví ešte pred tieňmi, takže zástupcovia do obrazu nepreniknú. Predtým sa
//     zástupné koruny stromov do tieňa nekreslili vôbec (#110).
// Pre iné moduly: len vrstvaTienaPriKresleni (regresná kontrola).

import { VRSTVA_TIENA } from '../mapa/zelen/stromy.js';

const DOSAH_MALE = 45;     // m – malé objekty ďalej nevrhajú tieň
const MALY = 12;           // m – polomer, do ktorého je objekt „malý“ (budovy a celé dlaždice sú väčšie)
const KAZDYCH = 0.5;       // s

/**
 * Obalí renderer.shadowMap.render: počas kreslenia tieňových máp má kamera zapnutú vrstvu VRSTVA_TIENA
 * (three.js testuje vrstvy objektov voči hlavnej kamere). Volá sa raz; vráti true, ak sa obalilo.
 */
export function vrstvaTienaPriKresleni(renderer) {
  const sm = renderer?.shadowMap;
  if (!sm || sm.userData?.vrstvaTiena) return false;
  const povodne = sm.render;
  sm.render = function (svetla, scena, kamera) {
    const maska = kamera.layers.mask;
    kamera.layers.enable(VRSTVA_TIENA);
    try { return povodne.call(this, svetla, scena, kamera); } finally { kamera.layers.mask = maska; }
  };
  sm.userData = { ...(sm.userData ?? {}), vrstvaTiena: true };
  return true;
}

export default {
  nazov: 'dosah-tienov',
  poradie: 59,   // pred dohľadom (60) a kreslením

  init(hra) {
    vrstvaTienaPriKresleni(hra?.renderer);
    this.cas = 0;
    this.vypnute = new Set();     // objekty, ktorým tieň vypol tento modul
    this.svetla = new WeakSet();
  },

  updateVzdy(dt, hra) {
    this.cas -= dt;
    if (this.cas > 0) return;
    this.cas = KAZDYCH;
    const p = hra.hrac?.pozicia ?? hra.kamera.position;
    const d2max = DOSAH_MALE * DOSAH_MALE;
    hra.scena.traverse((o) => {
      if (o.isDirectionalLight && o.castShadow && !this.svetla.has(o)) {
        o.shadow.camera.layers.enable(VRSTVA_TIENA);
        this.svetla.add(o);
        return;
      }
      if (!o.isMesh || o.isInstancedMesh || o.isBatchedMesh || o.userData.tienCezZastupcu) return;
      const vypnuty = this.vypnute.has(o);
      if (!o.castShadow && !vypnuty) return;
      const g = o.geometry;
      if (!g.boundingSphere) g.computeBoundingSphere();
      const s = g.boundingSphere;
      const e = o.matrixWorld.elements;
      const mierka = Math.max(Math.hypot(e[0], e[1], e[2]), Math.hypot(e[8], e[9], e[10]));
      const r = s.radius * mierka;
      if (r > MALY) return;
      const cx = e[0] * s.center.x + e[4] * s.center.y + e[8] * s.center.z + e[12];
      const cz = e[2] * s.center.x + e[6] * s.center.y + e[10] * s.center.z + e[14];
      const daleko = (cx - p.x) ** 2 + (cz - p.z) ** 2 > d2max + r * r + 2 * DOSAH_MALE * r;
      if (daleko && o.castShadow) { o.castShadow = false; this.vypnute.add(o); }
      else if (!daleko && vypnuty) { o.castShadow = true; this.vypnute.delete(o); }
    });
    // objekty, ktoré medzitým zmizli zo scény, netreba sledovať
    if (this.vypnute.size > 4000) for (const o of this.vypnute) if (!o.parent) this.vypnute.delete(o);
  },
};
