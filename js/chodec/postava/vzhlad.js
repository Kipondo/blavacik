// Vzhľad postavy: tvar tela a tváre (morph targety), účes, brada, farba pleti a vlasov.
// Tvar sa nastavuje na všetkých sieťach (telo aj oblečenie majú rovnaké morph targety, takže oblečenie sedí).

import * as THREE from 'three';

// predvolená farba pleti v textúre – farba v editore sa prepočíta ako násobok voči nej
const ZAKLAD_PLETE = new THREE.Color('#e8b493');

export const PREDVOLENY_VZHLAD = {
  tvar: {},            // { chudy: 0..1, pupkac: 0..1, nos_velky: 0..1, … }
  ucet: 'strapate',    // vlasy_<ucet> (ziadny = plešina)
  brada: 'strnisko',   // brada_<typ> (ziadna = oholený)
  plet: '#e8b493',
  vlasy: '#6e4c34',
};

/** Nastaví hodnotu morph targetu na všetkých sieťach, ktoré ho majú. */
export function nastavMorph(instancia, meno, hodnota) {
  for (const s of instancia.siete) {
    const i = s.morphTargetDictionary?.[meno];
    if (i !== undefined) s.morphTargetInfluences[i] = hodnota;
  }
}

export function nastavVzhlad(instancia, vzhlad) {
  const v = { ...PREDVOLENY_VZHLAD, ...vzhlad, tvar: { ...(vzhlad?.tvar || {}) } };
  // vynulujeme tvarové morphy (mimiku – usmev, zmurk, usta – necháme animáciám)
  const mimika = new Set(['usmev', 'zmurk', 'usta']);
  for (const s of instancia.siete) {
    if (!s.morphTargetDictionary) continue;
    for (const [meno, i] of Object.entries(s.morphTargetDictionary)) {
      if (!mimika.has(meno)) s.morphTargetInfluences[i] = v.tvar[meno] || 0;
    }
  }
  const plet = new THREE.Color(v.plet);
  const tint = new THREE.Color(plet.r / ZAKLAD_PLETE.r, plet.g / ZAKLAD_PLETE.g, plet.b / ZAKLAD_PLETE.b);
  const farbaVlasov = new THREE.Color(v.vlasy);
  instancia.ucet = v.ucet;
  for (const s of instancia.siete) {
    const obj = s.userData.objekt;
    if (obj === 'telo') s.material.color.copy(tint);
    if (obj.startsWith('vlasy_')) {
      s.visible = obj === 'vlasy_' + v.ucet && !instancia.skryteVlasy;
      s.material.color.copy(farbaVlasov);
    }
    if (obj.startsWith('brada_')) {
      s.visible = obj === 'brada_' + v.brada;
      s.material.color.copy(farbaVlasov);
    }
  }
  return v;
}

/** Žmurkanie a drobná mimika – volá sa každý snímok. */
export class Mimika {
  constructor(instancia) {
    this.inst = instancia;
    this.doZmurku = 2 + Math.random() * 3;
    this.faza = -1;
    this.usmev = 0.45; // Ďoďo je dobrák – jemný úsmev aj v pokoji
    nastavMorph(instancia, 'usmev', this.usmev);
  }
  update(dt) {
    this.doZmurku -= dt;
    if (this.doZmurku <= 0 && this.faza < 0) this.faza = 0;
    if (this.faza >= 0) {
      this.faza += dt / 0.16;
      const h = this.faza < 0.5 ? this.faza * 2 : Math.max(0, 2 - this.faza * 2);
      nastavMorph(this.inst, 'zmurk', h);
      if (this.faza >= 1) { this.faza = -1; this.doZmurku = 2 + Math.random() * 4; nastavMorph(this.inst, 'zmurk', 0); }
    }
  }
}
