// Auto: stav + arkádová fyzika. Šoféra (hráča alebo AI) predstavuje
// objekt `ovladanie`, ktorý sa nastavuje každý snímok:
//   auto.ovladanie = { plyn: -1..1, zatacanie: -1..1 (kladné = doprava), rucna: bool }
//
// Užitočné vlastnosti pre ostatné moduly:
//   auto.pozicia (Vector3), auto.uhol (rad), auto.rychlostDopredu (m/s), auto.rychlostKmh
//   auto.vodic – 'hrac' | 'ai' | null
//   auto.farba, auto.mesh, auto.znicene (rezervované pre budúce poškodenie)

import * as THREE from 'three';
import { vytvorModelAuta } from './model-auta.js';

let pocitadlo = 0;

export class Auto {
  constructor({ x = 0, z = 0, uhol = 0, farba = '#c8102e' } = {}, KONFIG) {
    this.id = ++pocitadlo;
    this.K = KONFIG.AUTO;
    this.farba = farba;
    this.pozicia = new THREE.Vector3(x, 0, z);
    this.uhol = uhol;
    this.vx = 0;
    this.vz = 0;
    this.zatocenie = 0;
    this.ovladanie = { plyn: 0, zatacanie: 0, rucna: false };
    this.vodic = null;
    this.znicene = false;
    this.naklonX = 0; // klopenie (dopredu/dozadu)
    this.naklonZ = 0; // náklon do strany
    this.mesh = vytvorModelAuta(farba);
    this.mesh.userData.auto = this;
  }

  get smer() { return { x: Math.sin(this.uhol), z: Math.cos(this.uhol) }; }
  get rychlostDopredu() { return this.vx * Math.sin(this.uhol) + this.vz * Math.cos(this.uhol); }
  get rychlostKmh() { return Math.abs(this.rychlostDopredu) * 3.6; }

  /** Stredy dvoch kolíznych kruhov (predok, zadok). */
  kruhy() {
    const s = this.smer, p = this.K.POSUN_KRUHU;
    return [
      { x: this.pozicia.x + s.x * p, z: this.pozicia.z + s.z * p },
      { x: this.pozicia.x - s.x * p, z: this.pozicia.z - s.z * p },
    ];
  }

  update(dt, mapa, hra) {
    const K = this.K;
    const o = this.ovladanie;
    const fx = Math.sin(this.uhol), fz = Math.cos(this.uhol);
    const lx = Math.cos(this.uhol), lz = -Math.sin(this.uhol);
    let vF = this.vx * fx + this.vz * fz;
    let vL = this.vx * lx + this.vz * lz;

    // plyn / brzda / cúvanie
    if (o.plyn > 0.05) {
      if (vF < -0.5) vF += K.BRZDA * o.plyn * dt;
      else if (vF < K.MAX_RYCHLOST) vF += K.ZRYCHLENIE * o.plyn * (1 - (vF / K.MAX_RYCHLOST) * 0.6) * dt;
    } else if (o.plyn < -0.05) {
      if (vF > 0.5) vF -= K.BRZDA * -o.plyn * dt;
      else if (vF > -K.MAX_SPAT) vF -= K.ZRYCHLENIE * 0.6 * -o.plyn * dt;
    } else {
      const v = K.VALIVY_ODPOR * dt;
      vF = Math.abs(vF) <= v ? 0 : vF - Math.sign(vF) * v;
    }
    vF -= vF * K.ODPOR * dt;
    if (o.rucna) vF -= vF * 1.2 * dt;

    // zatáčanie – pri vyššej rýchlosti menší uhol kolies
    const maxZat = K.MAX_ZATOCENIE / (1 + Math.abs(vF) / 18);
    const cielZat = -o.zatacanie * maxZat;
    this.zatocenie += (cielZat - this.zatocenie) * Math.min(1, dt * 8);
    const otacanie = (vF / K.RAZVOR) * Math.tan(this.zatocenie) * (o.rucna ? 1.35 : 1);
    this.uhol += otacanie * dt;

    // bočný šmyk – ručná brzda = drift
    const prilnavost = o.rucna ? K.PRILNAVOST_RUCNA : K.PRILNAVOST;
    vL *= Math.exp(-prilnavost * dt);

    // nová rýchlosť v novom smere
    const nfx = Math.sin(this.uhol), nfz = Math.cos(this.uhol);
    const nlx = Math.cos(this.uhol), nlz = -Math.sin(this.uhol);
    this.vx = nfx * vF + nlx * vL;
    this.vz = nfz * vF + nlz * vL;

    // pohyb + kolízie
    const staraX = this.pozicia.x, staraZ = this.pozicia.z;
    this.pozicia.x += this.vx * dt;
    this.pozicia.z += this.vz * dt;
    this._kolizie(mapa, hra);

    // voda a okraj mapy – auto sa zastaví ako o neviditeľný múr
    for (const k of this.kruhy()) {
      if (mapa.jeVoVode(k.x, k.z) || mapa.jeMimo(k.x, k.z)) {
        this.pozicia.x = staraX; this.pozicia.z = staraZ;
        this.vx *= -0.2; this.vz *= -0.2;
        break;
      }
    }

    // výška a náklon podľa terénu
    const s = this.smer;
    const hP = mapa.vyska(this.pozicia.x + s.x * 1.4, this.pozicia.z + s.z * 1.4);
    const hZ = mapa.vyska(this.pozicia.x - s.x * 1.4, this.pozicia.z - s.z * 1.4);
    const hL = mapa.vyska(this.pozicia.x - s.z * 0.9, this.pozicia.z + s.x * 0.9);
    const hR = mapa.vyska(this.pozicia.x + s.z * 0.9, this.pozicia.z - s.x * 0.9);
    const cielY = (hP + hZ + hL + hR) / 4;
    this.pozicia.y += (cielY - this.pozicia.y) * Math.min(1, dt * 15);
    if (Math.abs(cielY - this.pozicia.y) > 3) this.pozicia.y = cielY;
    const cielKlopenie = Math.atan2(hZ - hP, 2.8);
    const cielBok = Math.atan2(hR - hL, 1.8); // hR je na lokálnej +x strane auta
    this.naklonX += (cielKlopenie - this.naklonX) * Math.min(1, dt * 10);
    this.naklonZ += (cielBok - this.naklonZ) * Math.min(1, dt * 10);

    this._aktualizujModel(dt, vF, vL);
  }

  _kolizie(mapa, hra) {
    const K = this.K;
    for (const k of this.kruhy()) {
      const r = mapa.kolizie.vytlac(k.x, k.z, K.POLOMER);
      if (!r.zasah) continue;
      this.pozicia.x += r.x - k.x;
      this.pozicia.z += r.z - k.z;
      // odrazíme rýchlosť od steny a stratíme časť energie
      const vn = this.vx * r.nx + this.vz * r.nz;
      if (vn < 0) {
        this.vx -= r.nx * vn * 1.3;
        this.vz -= r.nz * vn * 1.3;
        this.vx *= 0.8; this.vz *= 0.8;
        if (-vn > 4) hra?.posli('naraz', { auto: this, sila: -vn });
      }
    }
  }

  _aktualizujModel(dt, vF, vL) {
    const m = this.mesh;
    m.position.copy(this.pozicia);
    m.rotation.set(0, this.uhol, 0);
    const { telo, kolesa, predneKlby } = m.userData;
    // naklonenie celého auta podľa terénu (poradie: najprv smer, potom náklon)
    m.rotation.order = 'YXZ';
    m.rotation.x = this.naklonX;
    m.rotation.z = this.naklonZ;
    // pruženie karosérie pri šmyku a brzdení
    telo.rotation.z = THREE.MathUtils.clamp(-vL * 0.015, -0.08, 0.08);
    telo.rotation.x = THREE.MathUtils.clamp(-this.ovladanie.plyn * 0.02 * Math.sign(vF || 1), -0.04, 0.04);
    for (const k of kolesa) k.rotation.x += (vF * dt) / 0.36;
    for (const klb of predneKlby) klb.rotation.y = this.zatocenie;
  }
}
