// Prepínanie animácií postavy (AnimationMixer) s plynulým prechodom.
// Názvy klipov z .glb: stoj, chodza, beh, skok, opita_chodza, sedenie, nastup_auto, vystup_auto, mavanie.

import * as THREE from 'three';

// prirodzená rýchlosť klipu (m/s) – podľa nej sa zrýchľuje/spomaľuje prehrávanie, aby nohy „nekĺzali“
const RYCHLOST_KLIPU = { chodza: 1.45, beh: 4.6, opita_chodza: 1.1 };
const JEDNORAZOVE = new Set(['skok', 'nastup_auto', 'vystup_auto', 'mavanie']);

export class Animacie {
  constructor(koren, klipy) {
    this.mixer = new THREE.AnimationMixer(koren);
    this.akcie = {};
    for (const k of klipy) {
      const a = this.mixer.clipAction(k);
      if (JEDNORAZOVE.has(k.name)) {
        a.setLoop(THREE.LoopOnce, 1);
        a.clampWhenFinished = true;
      }
      this.akcie[k.name] = a;
    }
    this.aktualna = null;
  }

  ma(meno) { return !!this.akcie[meno]; }

  /** Prepne na animáciu s prechodom (s). Jednorazové sa spustia od začiatku. */
  hraj(meno, prechod = 0.25) {
    const nova = this.akcie[meno];
    if (!nova || nova === this.aktualna) return nova;
    nova.reset();
    nova.setEffectiveWeight(1);
    nova.setEffectiveTimeScale(1);
    nova.play();
    if (this.aktualna && prechod > 0) this.aktualna.crossFadeTo(nova, prechod, false);
    else if (this.aktualna) this.aktualna.stop();
    this.aktualna = nova;
    return nova;
  }

  /** Automatický výber podľa pohybu (hráč pešo, NPC chodci). */
  podlaPohybu(rychlost, voVzduchu, opity = false) {
    let meno;
    if (voVzduchu) meno = 'skok';
    else if (rychlost < 0.15) meno = 'stoj';
    else if (opity && this.ma('opita_chodza')) meno = 'opita_chodza';
    else meno = rychlost < 3.0 ? 'chodza' : 'beh';
    const a = this.hraj(meno, meno === 'skok' ? 0.12 : 0.25);
    const v = RYCHLOST_KLIPU[meno];
    if (a && v) a.setEffectiveTimeScale(THREE.MathUtils.clamp(rychlost / v, 0.5, 1.8));
  }

  update(dt) { this.mixer.update(dt); }
}
