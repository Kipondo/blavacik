// Jednostopové vozidlo na jazdu (kolobežka, bicykel): stav + jednoduchá fyzika (issue #97).
// Rozhranie ako auto (js/auto/auto.js), aby fungovala kamera, HUD a riadenie hráčom:
//   pozicia, uhol, vx, vz, smer, rychlostDopredu, rychlostKmh, ovladanie { plyn, zatacanie, rucna }, vodic, mesh.
// Navyše: typ, kamera { vzdialenost, vyska, ciel }, napoveda, polDlzka / polSirka (zrazenie chodca), sprint.
// Nie je v hra.auta (nemá preliačiny, NPC autá ho nemusia obchádzať, keď stojí) – spravuje ho js/mikromobilita/modul.js.

import * as THREE from 'three';
import { TYPY } from './typy.js';

export class Jednostopove {
  constructor({ typ = 'kolobezka', x = 0, z = 0, uhol = 0, y = 0, farba } = {}) {
    const T = TYPY[typ];
    this.typ = typ;
    this.K = T;
    this.pozicia = new THREE.Vector3(x, y, z);
    this.uhol = uhol;
    this.vF = 0;
    this.vx = 0;
    this.vz = 0;
    this.zatocenie = 0;
    this.naklon = T.STOJAN;
    this.otacanie = 0;
    this.faza = 0;          // uhol kľúk (bicykel)
    this.sprint = false;    // Shift (bicykel)
    this.ovladanie = { plyn: 0, zatacanie: 0, rucna: false };
    this.vodic = null;
    this.znicene = false;
    this.kamera = T.kamera;
    this.napoveda = T.napoveda;
    this.polDlzka = T.polDlzka;
    this.polSirka = T.polSirka;
    this.farba = farba;
    this.mesh = T.model(farba);
    this.mesh.rotation.order = 'YXZ';
    this.mesh.userData.vozidlo = this;
    this._aktualizujModel(0);
  }

  get smer() { return { x: Math.sin(this.uhol), z: Math.cos(this.uhol) }; }
  get rychlostDopredu() { return this.vF; }
  get rychlostKmh() { return Math.abs(this.vF) * 3.6; }

  update(dt, mapa, hra) {
    const K = this.K, o = this.ovladanie;
    let v = this.vF;
    const max = this.sprint ? K.SPRINT : K.MAX_RYCHLOST;
    // plyn / brzda (dozadu sa necúva – S a Medzerník brzdia); nad max. rýchlosťou (z kopca, po šprinte) len dobieha
    this.slapanie = false;
    if (o.plyn > 0.05 && this.vodic) {
      if (v < max) v = Math.min(max, v + K.ZRYCHLENIE * o.plyn * (1 - (v / max) ** 2 * 0.5) * dt);
      else v -= Math.min(v - max, K.VALIVY_ODPOR * 2 * dt);
      this.slapanie = true;
    } else if (o.plyn < -0.05 || o.rucna) {
      v = Math.max(0, v - K.BRZDA * Math.max(-o.plyn, o.rucna ? 1 : 0) * dt);
    } else {
      v = Math.max(0, v - K.VALIVY_ODPOR * dt);
    }
    // do kopca pomalšie, z kopca rýchlejšie (zložka tiaže pozdĺž svahu)
    const s = this.smer;
    const vy = (x, z) => hra?.mosty?.vyska(x, z, this.pozicia.y) ?? mapa.vyska(x, z, this.pozicia.y);
    const [oP, oZ] = K.OSI;
    const hP = vy(this.pozicia.x + s.x * oP, this.pozicia.z + s.z * oP);
    const hZ = vy(this.pozicia.x + s.x * oZ, this.pozicia.z + s.z * oZ);
    const sklon = Math.max(-0.3, Math.min(0.3, (hP - hZ) / (oP - oZ)));
    if (v > 0.1 || sklon < -0.03) v = Math.max(0, v - 9.81 * sklon * K.SVAH * dt);

    // riadenie: menší uhol riadidiel pri vyššej rýchlosti; pri státí sa otáča pomaly „na mieste“
    const maxZat = K.MAX_ZATOCENIE / (1 + v / 2.5);
    this.zatocenie += (-o.zatacanie * maxZat - this.zatocenie) * Math.min(1, dt * 7);
    this.otacanie = v > 0.3 ? (v / K.RAZVOR) * Math.tan(this.zatocenie) : -o.zatacanie * 1.1 * (this.vodic ? 1 : 0);
    this.uhol += this.otacanie * dt;

    // pohyb v smere jazdy (jednostopové vozidlo sa nešmýka do boku)
    const fx = Math.sin(this.uhol), fz = Math.cos(this.uhol);
    const staraX = this.pozicia.x, staraZ = this.pozicia.z;
    this.pozicia.x += fx * v * dt;
    this.pozicia.z += fz * v * dt;

    // steny a budovy: vytlačí sa a ostane len rýchlosť pozdĺž steny
    const r = mapa.kolizie.vytlac(this.pozicia.x, this.pozicia.z, K.POLOMER);
    if (r.zasah) {
      this.pozicia.x = r.x; this.pozicia.z = r.z;
      const naraz = -(fx * r.nx + fz * r.nz);   // 1 = čelne do steny
      if (naraz > 0) {
        if (naraz > 0.75 && v > 3.5) hra?.posli('zvuk', { meno: 'naraz', x: this.pozicia.x, y: this.pozicia.y + 0.5, z: this.pozicia.z, sila: v / 7 });
        v *= Math.max(0, 1 - naraz * 1.2);
      }
    }
    // autá: malé vozidlo sa od nich odrazí (auto je oveľa ťažšie)
    for (const a of hra?.auta ?? []) {
      if (Math.abs(a.pozicia.x - this.pozicia.x) > 5 || Math.abs(a.pozicia.z - this.pozicia.z) > 5) continue;
      for (const k of a.kruhy()) {
        const dx = this.pozicia.x - k.x, dz = this.pozicia.z - k.z, d = Math.hypot(dx, dz);
        const min = (a.K?.POLOMER ?? 1.1) + K.POLOMER;
        if (d < min && d > 1e-4) {
          this.pozicia.x += (dx / d) * (min - d); this.pozicia.z += (dz / d) * (min - d);
          v *= 0.4;
        }
      }
    }
    // voda a okraj mapy – zastaví sa
    if (mapa.jeVoVode(this.pozicia.x, this.pozicia.z) || mapa.jeMimo(this.pozicia.x, this.pozicia.z)) {
      this.pozicia.x = staraX; this.pozicia.z = staraZ; v = 0;
    }
    this.vF = v;
    this.vx = fx * v; this.vz = fz * v;

    // výška: priemer pod kolesami, obrubník sa prejde plynulo
    const cielY = (vy(this.pozicia.x + fx * oP, this.pozicia.z + fz * oP) + vy(this.pozicia.x + fx * oZ, this.pozicia.z + fz * oZ)) / 2;
    if (Math.abs(cielY - this.pozicia.y) > 2.5) this.pozicia.y = cielY;
    else this.pozicia.y += (cielY - this.pozicia.y) * Math.min(1, dt * 18);
    this.klopenie = Math.atan2(hZ - hP, oP - oZ);

    // náklon: v jazde do zákruty (v·ω/g), odstavené na stojane
    const cielNaklon = this.vodic
      ? Math.max(-K.MAX_NAKLON, Math.min(K.MAX_NAKLON, -Math.atan(v * this.otacanie / 9.81)))
      : K.STOJAN;
    this.naklon += (cielNaklon - this.naklon) * Math.min(1, dt * (this.vodic ? 6 : 3));
    // kľuky: pri šliapaní ~5,3 m na otáčku (stredný prevod), pri dobiehaní stoja (voľnobeh)
    if (this.slapanie) this.faza += (v * dt / 5.3) * Math.PI * 2 + (v < 0.3 && o.plyn > 0.05 ? dt * 3 : 0);
    this._aktualizujModel(dt);
  }

  _aktualizujModel(dt) {
    const m = this.mesh;
    m.position.copy(this.pozicia);
    m.rotation.set(this.klopenie ?? 0, this.uhol, this.naklon);
    for (const [koleso, r] of m.userData.kolesa) koleso.rotation.x += (this.vF * dt) / r;
    if (m.userData.kluky) m.userData.kluky.rotation.x = this.faza;
  }
}
