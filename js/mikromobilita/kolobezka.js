// Kolobežka na jazdu: stav + jednoduchá fyzika jednostopového vozidla (issue #97).
// Rozhranie ako auto (js/auto/auto.js), aby fungovala kamera, HUD a riadenie hráčom:
//   pozicia, uhol, vx, vz, smer, rychlostDopredu, rychlostKmh, ovladanie { plyn, zatacanie, rucna }, vodic, mesh.
// Nie je v hra.auta (nemá preliačiny, NPC autá ju nemusia obchádzať, keď stojí) – spravuje ju js/mikromobilita/modul.js.

import * as THREE from 'three';
import { vytvorModelKolobezky } from './model-kolobezky.js';

export const K_KOLOBEZKY = {
  MAX_RYCHLOST: 6.95,   // m/s (25 km/h – obmedzovač ako pri zdieľaných kolobežkách)
  ZRYCHLENIE: 2.6,      // m/s² – elektromotor, rýchly rozbeh
  BRZDA: 5.5,           // m/s²
  VALIVY_ODPOR: 0.35,   // m/s² – bez plynu dôjde
  RAZVOR: 0.82,         // m – vzdialenosť osí kolies
  MAX_ZATOCENIE: 0.62,  // rad – natočenie riadidiel pri malej rýchlosti
  POLOMER: 0.32,        // m – kolízia so stenami
  MAX_NAKLON: 0.42,     // rad (~24°) – náklon do zákruty
  STOJAN: -0.12,        // rad (~7°) – odstavená stojí na stojane naklonená doľava (záporný náklon = doľava)
};

export class Kolobezka {
  constructor({ x = 0, z = 0, uhol = 0, y = 0 } = {}) {
    this.typ = 'kolobezka';
    this.K = K_KOLOBEZKY;
    this.pozicia = new THREE.Vector3(x, y, z);
    this.uhol = uhol;
    this.vF = 0;
    this.vx = 0;
    this.vz = 0;
    this.zatocenie = 0;
    this.naklon = K_KOLOBEZKY.STOJAN;
    this.otacanie = 0;
    this.ovladanie = { plyn: 0, zatacanie: 0, rucna: false };
    this.vodic = null;
    this.znicene = false;
    // kamera bližšie a nižšie ako za autom (js/kamera/kamera.js); chodca zrazí len tesne pred sebou
    this.kamera = { vzdialenost: 4.6, vyska: 2.3, ciel: 1.5 };
    this.napoveda = 'E – zosadnúť · S alebo Medzerník – brzda';
    this.polDlzka = 0.45;
    this.polSirka = 0.3;
    this.mesh = vytvorModelKolobezky();
    this.mesh.rotation.order = 'YXZ';
    this.mesh.userData.kolobezka = this;
    this._aktualizujModel(0);
  }

  get smer() { return { x: Math.sin(this.uhol), z: Math.cos(this.uhol) }; }
  get rychlostDopredu() { return this.vF; }
  get rychlostKmh() { return Math.abs(this.vF) * 3.6; }

  update(dt, mapa, hra) {
    const K = this.K, o = this.ovladanie;
    let v = this.vF;
    // plyn / brzda (dozadu sa necúva – S a Medzerník brzdia)
    if (o.plyn > 0.05 && this.vodic) {
      if (v < K.MAX_RYCHLOST) v = Math.min(K.MAX_RYCHLOST, v + K.ZRYCHLENIE * o.plyn * (1 - (v / K.MAX_RYCHLOST) ** 2 * 0.5) * dt);
    } else if (o.plyn < -0.05 || o.rucna) {
      v = Math.max(0, v - K.BRZDA * Math.max(-o.plyn, o.rucna ? 1 : 0) * dt);
    } else {
      v = Math.max(0, v - K.VALIVY_ODPOR * dt);
    }
    // do kopca pomalšie, z kopca rýchlejšie (zložka tiaže pozdĺž svahu)
    const s = this.smer;
    const vy = (x, z) => hra?.mosty?.vyska(x, z, this.pozicia.y) ?? mapa.vyska(x, z, this.pozicia.y);
    const hP = vy(this.pozicia.x + s.x * 0.5, this.pozicia.z + s.z * 0.5);
    const hZ = vy(this.pozicia.x - s.x * 0.5, this.pozicia.z - s.z * 0.5);
    const sklon = Math.max(-0.3, Math.min(0.3, (hP - hZ) / 1.0));
    if (v > 0.1) v = Math.max(0, v - 9.81 * sklon * 0.35 * dt);

    // riadenie: menší uhol riadidiel pri vyššej rýchlosti; pri státí sa kolobežka otáča pomaly „na mieste“
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
    // autá: kolobežka sa od nich odrazí (auto je oveľa ťažšie)
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
    const cielY = (vy(this.pozicia.x + fx * 0.42, this.pozicia.z + fz * 0.42) + vy(this.pozicia.x - fx * 0.4, this.pozicia.z - fz * 0.4)) / 2;
    if (Math.abs(cielY - this.pozicia.y) > 2.5) this.pozicia.y = cielY;
    else this.pozicia.y += (cielY - this.pozicia.y) * Math.min(1, dt * 18);
    this.klopenie = Math.atan2(hZ - hP, 1.0);

    // náklon: v jazde do zákruty (v·ω/g), odstavená na stojane
    const cielNaklon = this.vodic
      ? Math.max(-K.MAX_NAKLON, Math.min(K.MAX_NAKLON, -Math.atan(v * this.otacanie / 9.81)))
      : K.STOJAN;
    this.naklon += (cielNaklon - this.naklon) * Math.min(1, dt * (this.vodic ? 6 : 3));
    this._aktualizujModel(dt);
  }

  _aktualizujModel(dt) {
    const m = this.mesh;
    m.position.copy(this.pozicia);
    m.rotation.set(this.klopenie ?? 0, this.uhol, this.naklon);
    for (const [koleso, r] of m.userData.kolesa) koleso.rotation.x += (this.vF * dt) / r;
  }
}
