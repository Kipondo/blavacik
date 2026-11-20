// Realistická postava (Ďoďo, neskôr NPC): okamžite vráti THREE.Group, model z .glb sa doň dočíta.
// Kým sa model načítava, zobrazí sa jednoduchá náhradná postava. Rozhranie je kompatibilné so starým
// modelom: group.userData.animuj(dt, rychlost, voVzduchu).

import * as THREE from 'three';
import { vytvorInstanciu, nacitajGlb } from './nacitaj-postavu.js';
import { Animacie } from './animacie.js';
import { nacitajSatnik, oblec } from './satnik.js';
import { nastavVzhlad, nastavMorph, Mimika } from './vzhlad.js';
import { vytvorModelPostavy } from '../model-postavy.js';

export const URL_DODO = new URL('../../../assets/postavy/dodo.glb', import.meta.url).href;

/**
 * @param {object} o
 * @param {string} [o.url]        .glb s postavou
 * @param {string} [o.oblecenie]  id oblečenia zo satnik.json (napr. 'klasicky', 'oblek')
 * @param {object} [o.vzhlad]     pozri vzhlad.js
 */
export function vytvorRealistickuPostavu({ url = URL_DODO, oblecenie = 'klasicky', vzhlad = null, klipy = null } = {}) {
  const g = new THREE.Group();
  g.name = 'postava';
  const nahradna = vytvorModelPostavy({ tricko: '#e8e8e8', nohavice: '#1d2230', vlasy: '#2b1d14' });
  g.add(nahradna);

  let inst = null, anim = null, mimika = null, satnik = null;
  const ud = g.userData;
  ud.opity = false;
  ud.voVode = false; // nastavuje hráč (plavanie.js) – prepne na animácie plávania
  ud.efektyOblecenia = {};

  ud.pripravena = Promise.all([vytvorInstanciu(url), nacitajSatnik(), klipy ? nacitajGlb(klipy) : null]).then(([i, s, k]) => {
    if (k) i.animacie = k.animations; // náhradné animácie (ladenie)
    inst = i; satnik = s;
    g.remove(nahradna);
    g.add(inst.koren);
    anim = new Animacie(inst.koren, inst.animacie);
    mimika = new Mimika(inst);
    ud.instancia = inst;
    ud.mixer = anim.mixer;
    ud.animacie = anim;
    ud.nastavOblecenie(oblecenie);
    ud.nastavVzhlad(vzhlad || s.predvolenyVzhlad || {});
    anim.hraj('stoj', 0);
    return g;
  }).catch((e) => {
    console.warn('Realistickú postavu sa nepodarilo načítať, ostáva náhradná:', e);
    return g;
  });

  /** Oblečenie podľa id zo satnik.json alebo zoznam kusov. */
  ud.nastavOblecenie = (id, farby) => {
    if (!inst) return;
    const kusy = Array.isArray(id) ? id : satnik.oblecenia[id]?.kusy;
    if (!kusy) return console.warn('Neznáme oblečenie:', id);
    ud.oblecenie = id;
    ud.efektyOblecenia = oblec(inst, satnik, kusy, farby || satnik.oblecenia[id]?.farby);
  };
  ud.nastavVzhlad = (v) => { if (inst) ud.vzhlad = nastavVzhlad(inst, v); };
  ud.nastavMorph = (meno, h) => inst && nastavMorph(inst, meno, h);
  /** Spustí konkrétnu animáciu (napr. 'sedenie', 'nastup_auto'); null = späť na automatiku. */
  ud.nastavAnimaciu = (meno, prechod = 0.25) => { ud.vynutena = meno; anim?.hraj(meno, prechod); };

  ud.animuj = (dt, rychlost = 0, voVzduchu = false) => {
    if (!inst) { nahradna.userData.animuj(dt, rychlost, voVzduchu); return; }
    if (!ud.vynutena) anim.podlaPohybu(rychlost, voVzduchu, ud.opity, ud.voVode);
    anim.update(dt);
    mimika.update(dt);
  };
  return g;
}
