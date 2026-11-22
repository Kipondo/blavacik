// Modul: kamera za postavou alebo autom.
// Na PC pešo ovláda smer pohľadu len myš (mys.js) a postava chodí tam, kam sa pozerá kamera
// (hra.stav.smerKamery). V aute a na mobile sa kamera drží za hráčom – myšou / prstom sa dá
// rozhliadnuť a po chvíli sa sama vráti späť.

import * as THREE from 'three';
import { KONFIG } from '../config.js';
import { volnyPodiel } from './kolizia-kamery.js';

const K = KONFIG.KAMERA;

export default {
  nazov: 'kamera',
  poradie: 50, // po pohybe hráča a áut

  init(hra) {
    this.uhol = hra.stav.uhol + Math.PI;
    this.posunUhla = 0;
    this.sklon = 0.18;
    this.ciel = new THREE.Vector3();
    this.poz = new THREE.Vector3();
    this.prvy = true;
    this.dosah = 1;              // podiel vzdialenosti ku kamere, ktorý nie je zakrytý budovou
    this.skutocna = new THREE.Vector3();
    this.pohlad = new THREE.Vector3();
    this.skrylHraca = false;
    // presun hráča (js/ladenie/teleport.js) – kamera skočí hneď za neho, nepreletí cez pol mesta
    hra.na('teleport', () => { this.prvy = true; });
  },

  updateVzdy(dt, hra) {
    if (!hra.hrac) return;
    const vAute = !!hra.stav.auto;
    const objekt = vAute ? hra.stav.auto : hra.hrac;
    dt = Math.min(dt, 0.1);

    // pešo na PC: voľný pohľad myšou (bez návratu za postavu)
    const volnyPohlad = !vAute && !hra.vstup.dotyk;

    // otočenie hráčom
    const { dx, dy } = hra.vstup.kameraPosun();
    this.posunUhla -= dx * 0.005;
    this.sklon = THREE.MathUtils.clamp(this.sklon + dy * 0.003, volnyPohlad ? -0.45 : -0.1, volnyPohlad ? 1.05 : 0.9);

    const smer = objekt.uhol;
    if (this.prvy) this.uhol = smer + Math.PI;
    if (volnyPohlad) {
      // posun myšou sa pripočíta natrvalo, kamera sa za postavou neotáča
      this.uhol += this.posunUhla;
      this.posunUhla = 0;
    } else {
      // návrat za hráča
      if (performance.now() - hra.vstup.poslednyPohybKamery > K.NAVRAT_PO * 1000) {
        this.posunUhla *= Math.exp(-dt * 2.5);
        this.sklon += ((vAute ? 0.16 : 0.2) - this.sklon) * Math.min(1, dt * 1.5);
      }
      // kamera sa plynulo otáča za smerom objektu
      let rozdiel = smer + Math.PI - this.uhol;
      rozdiel = Math.atan2(Math.sin(rozdiel), Math.cos(rozdiel));
      this.uhol += rozdiel * Math.min(1, dt * (vAute ? 4 : 3));
    }

    // vozidlo môže mať vlastnú vzdialenosť a výšku kamery (kolobežka – js/mikromobilita/kolobezka.js)
    const vzd = vAute ? (objekt.kamera?.vzdialenost ?? K.AUTO_VZDIALENOST) + Math.min(4, objekt.rychlostKmh / 30) : K.PESO_VZDIALENOST;
    const vys = vAute ? objekt.kamera?.vyska ?? K.AUTO_VYSKA : K.PESO_VYSKA;
    const u = this.uhol + this.posunUhla;
    // smer, ktorým sa kamera pozerá (0 = na juh, rovnako ako hra.stav.uhol) – podľa neho chodí postava
    hra.stav.smerKamery = Math.atan2(Math.sin(u + Math.PI), Math.cos(u + Math.PI));
    const horiz = Math.cos(this.sklon) * vzd;

    this.ciel.set(objekt.pozicia.x, objekt.pozicia.y + (vAute ? objekt.kamera?.ciel ?? 1.4 : 1.6), objekt.pozicia.z);
    const cielovaPoz = new THREE.Vector3(
      this.ciel.x + Math.sin(u) * horiz,
      this.ciel.y + Math.sin(this.sklon) * vzd + vys - 1.5,
      this.ciel.z + Math.cos(u) * horiz,
    );

    // kamera nesmie ísť pod terén (v podchode ju drží v chodbe pod stropom – js/mapa/podchody/,
    // v izbe internátu pod stropom izby – js/mapa/atriaky/internat.js)
    if (!hra.podchody?.kamera(cielovaPoz, this.ciel, objekt.pozicia) && !hra.interier?.kamera(cielovaPoz, this.ciel, objekt.pozicia)) {
      const zem = hra.mapa.vyska(cielovaPoz.x, cielovaPoz.z) + 1.2;
      if (cielovaPoz.y < zem) cielovaPoz.y = zem;
    }

    if (this.prvy) { this.poz.copy(cielovaPoz); this.prvy = false; }
    this.poz.lerp(cielovaPoz, Math.min(1, dt * K.PLYNULOST));

    // budovy sú plné bloky: kamera sa pred stenou zastaví (hneď), späť sa vzďaľuje plynulo
    const podiel = volnyPodiel(hra.mapa.kolizie, this.ciel, this.poz, (x, z) => hra.mapa.vyska(x, z));
    if (podiel < this.dosah) this.dosah = podiel;
    else this.dosah += (podiel - this.dosah) * Math.min(1, dt * 2.5);
    this.skutocna.copy(this.poz).sub(this.ciel).multiplyScalar(this.dosah).add(this.ciel);
    hra.kamera.position.copy(this.skutocna);
    // pozerá sa po tej istej priamke (bod za cieľom) – funguje aj vtedy, keď je kamera až pri hlave
    this.pohlad.copy(this.ciel).sub(this.poz).normalize().multiplyScalar(10).add(this.ciel);
    hra.kamera.lookAt(this.pohlad);

    // kamera tesne pri hlave – postavu skryjeme, aby nezakrývala celý obraz
    const blizko = !vAute && this.skutocna.distanceTo(this.ciel) < 0.9;
    if (blizko && hra.hrac.mesh.visible) { hra.hrac.mesh.visible = false; this.skrylHraca = true; }
    else if (!blizko && this.skrylHraca) { if (!vAute) hra.hrac.mesh.visible = true; this.skrylHraca = false; }

    // širší uhol pri vysokej rýchlosti
    const fov = 62 + (vAute ? Math.min(14, objekt.rychlostKmh / 10) : 0);
    if (Math.abs(hra.kamera.fov - fov) > 0.1) {
      hra.kamera.fov += (fov - hra.kamera.fov) * Math.min(1, dt * 3);
      hra.kamera.updateProjectionMatrix();
    }
  },
};
