// Vykreslenie vozidiel MHD cez InstancedMesh: jedna sieť na každú časť každého variantu článku
// (karoséria, sklo, svetlá) + krídla dverí. Celá MHD je tak len pár volaní kreslenia.

import * as THREE from 'three';
import { postavGeometrie, geometriaKridla } from './geometria.js';
import { VSETKY_TYPY } from './typy.js';

const MAX_CLANKOV = 160;   // na variant
const MAX_KRIDIEL = 1200;

export class VykreslenieVozidiel {
  constructor(scena) {
    this.skupina = new THREE.Group();
    this.skupina.name = 'mhd-vozidla';
    scena.add(this.skupina);

    this.matKaroseria = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.38, metalness: 0.15, envMapIntensity: 0.9 });
    this.matSklo = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.08, metalness: 0.3, envMapIntensity: 1.8 });
    this.matSvetla = new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false });

    this.varianty = new Map();
    for (const [meno, geo] of postavGeometrie(VSETKY_TYPY)) {
      const casti = [
        this._siet(geo.karoseria, this.matKaroseria, MAX_CLANKOV, true),
        this._siet(geo.sklo, this.matSklo, MAX_CLANKOV, false),
        this._siet(geo.svetla, this.matSvetla, MAX_CLANKOV, false),
      ];
      this.varianty.set(meno, { casti, pocet: 0 });
    }
    this.kridla = new Map(); // výška krídla → { siet, pocet }
  }

  _siet(geo, mat, max, tien) {
    const m = new THREE.InstancedMesh(geo, mat, max);
    m.count = 0;
    m.frustumCulled = false;   // inštancie sú po celom okolí
    m.castShadow = tien;
    m.receiveShadow = tien;
    m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.skupina.add(m);
    return m;
  }

  _sietKridiel(vyska) {
    const k = Math.round(vyska * 10) / 10;
    if (!this.kridla.has(k)) {
      const siet = this._siet(geometriaKridla(k), this.matKaroseria, MAX_KRIDIEL, false);
      this.kridla.set(k, { siet, pocet: 0 });
    }
    return this.kridla.get(k);
  }

  zacni() {
    for (const v of this.varianty.values()) v.pocet = 0;
    for (const k of this.kridla.values()) k.pocet = 0;
  }

  /** Pridá článok s maticou m (lokálne +z = dopredu). */
  clanok(varianta, m) {
    const v = this.varianty.get(varianta);
    if (!v || v.pocet >= MAX_CLANKOV) return;
    for (const c of v.casti) c.setMatrixAt(v.pocet, m);
    v.pocet++;
  }

  /** Pridá krídlo dverí (matica už zahŕňa polohu krídla). */
  kridlo(vyska, m) {
    const k = this._sietKridiel(vyska);
    if (k.pocet >= MAX_KRIDIEL) return;
    k.siet.setMatrixAt(k.pocet++, m);
  }

  dokonci() {
    for (const v of this.varianty.values()) {
      for (const c of v.casti) { c.count = v.pocet; if (v.pocet) c.instanceMatrix.needsUpdate = true; }
    }
    for (const k of this.kridla.values()) {
      k.siet.count = k.pocet;
      if (k.pocet) k.siet.instanceMatrix.needsUpdate = true;
    }
  }
}
