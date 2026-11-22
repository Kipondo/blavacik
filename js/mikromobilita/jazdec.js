// Póza jazdca (Ďoďo) na malom vozidle: na kolobežke stojí na doske, na bicykli sedí v sedle a šliape.
// Po animácii státia sa ruky a nohy dotiahnu na riadidlá, dosku a pedále (IK dvoch kostí, ik.js).

import * as THREE from 'three';
import { ikDvochKosti, otocVoSvete, ZalohaPozy } from '../chodec/postava/ik.js';
import { ROZMERY } from './model-kolobezky.js';
import { ROZMERY_B } from './model-bicykla.js';
import { ROZMERY_D } from './model-dosky.js';

const _v = new THREE.Vector3(), _q = new THREE.Quaternion(), _os = new THREE.Vector3();
const KOSTI_IK = ['spine_01', 'upperarm_l', 'lowerarm_l', 'upperarm_r', 'lowerarm_r', 'thigh_l', 'calf_l', 'thigh_r', 'calf_r'];

// póza spred IK (mixér zapisuje kosť len pri zmene hodnoty – úpravy by sa hromadili a po zosadnutí ostali)
function zaloha(ud, K) {
  ud._zalohaJazdca ??= new ZalohaPozy(KOSTI_IK.map((m) => K[m]));
  return ud._zalohaJazdca;
}

/** Po zosadnutí: kosti späť do pózy z animácie (bez IK). */
export function uvolniJazdca(hrac) {
  const ud = hrac.mesh.userData;
  ud._zalohaJazdca?.zrus();
}

/**
 * Položí jazdca na vozidlo a nastaví pózu. hrac = { mesh } – mesh.userData má animuj(dt, …) a instancia.kosti
 * (hráč – realisticka-postava.js; NPC jazdci – npc-jazdci.js si ich doplnia).
 */
export function polozJazdca(dt, hrac, voz) {
  const ud = hrac.mesh.userData;
  voz.mesh.updateMatrixWorld(true);
  hrac.mesh.visible = true;
  const druh = voz.K.jazdec, sedi = druh === 'sedi';
  // koreň postavy: na doske kolobežky/hoverboardu/onewheelu; na bicykli tak, aby panva sedela v sedle
  // (panva ~0,9 m nad koreňom; NPC sú rôzne vysokí – panva je o mierku vyššie/nižšie)
  const koren = sedi ? [0, ROZMERY_B.sedlo[1] - 0.86 * hrac.mesh.scale.y, ROZMERY_B.sedlo[2] - 0.02]
    : druh === 'hoverboard' ? [0, ROZMERY_D.hoverboard.doska, 0]
    : druh === 'bokom' ? [0, ROZMERY_D.onewheel.doska - 0.03, 0]   // kolená mierne pokrčené
    : [0, ROZMERY.doska, -0.06];
  hrac.mesh.position.copy(voz.mesh.localToWorld(_v.set(...koren)));
  hrac.mesh.quaternion.copy(voz.mesh.quaternion);
  // na onewheeli stojí bokom (ľavá noha vpredu, pozerá na pravý bok dosky)
  if (druh === 'bokom') hrac.mesh.quaternion.multiply(_q.setFromAxisAngle(_os.set(0, 1, 0), -Math.PI / 2));
  const K = ud.instancia?.kosti;
  if (K?.upperarm_l) zaloha(ud, K).vrat();
  ud.animuj?.(dt, 0, false);
  if (!K?.upperarm_l || !K.thigh_l) return;
  zaloha(ud, K).zaloz();
  hrac.mesh.updateMatrixWorld(true);
  const svet = (x, y, z) => voz.mesh.localToWorld(new THREE.Vector3(x, y, z));
  const smer = (x, y, z) => new THREE.Vector3(x, y, z).applyQuaternion(voz.mesh.quaternion);

  if (sedi) {
    const R = ROZMERY_B;
    // predklon trupu k riadidlám (mestský bicykel – mierne, pri šprinte viac)
    if (K.spine_01) {
      _os.set(1, 0, 0).applyQuaternion(voz.mesh.quaternion);
      otocVoSvete(K.spine_01, _q.setFromAxisAngle(_os, voz.sprint && voz.vF > 6.5 ? 0.42 : 0.26));
    }
    const s = R.sirkaRiadidiel / 2 - 0.06, [, ry, rz] = R.riadidla;
    ikDvochKosti(K.upperarm_l, K.lowerarm_l, K.hand_l, svet(s, ry + 0.01, rz - 0.04), smer(1, -0.7, -0.6));
    ikDvochKosti(K.upperarm_r, K.lowerarm_r, K.hand_r, svet(-s, ry + 0.01, rz - 0.04), smer(-1, -0.7, -0.6));
    // nohy na pedáloch: ľavý pedál (+x) na uhle fáza, pravý o 180° ďalej; členok kúsok nad pedálom
    const [, sy, sz] = R.stred, k = R.kluka, f = voz.faza;
    const pedal = (strana, u) => svet(strana * (R.pedal + 0.02), sy - Math.cos(u) * k + 0.085, sz - Math.sin(u) * k - 0.04);
    ikDvochKosti(K.thigh_l, K.calf_l, K.foot_l, pedal(1, f), smer(0.12, 0.2, 1));
    ikDvochKosti(K.thigh_r, K.calf_r, K.foot_r, pedal(-1, f + Math.PI), smer(-0.12, 0.2, 1));
  } else if (druh === 'hoverboard') {
    // nohy na stúpadlách vedľa seba, ruky voľne (rovnováha)
    const H = ROZMERY_D.hoverboard;
    ikDvochKosti(K.thigh_l, K.calf_l, K.foot_l, svet(H.stopy, H.doska + 0.075, -0.02), smer(0.2, 0, 1));
    ikDvochKosti(K.thigh_r, K.calf_r, K.foot_r, svet(-H.stopy, H.doska + 0.075, -0.02), smer(-0.2, 0, 1));
  } else if (druh === 'bokom') {
    // onewheel: ľavá noha na prednom stúpadle, pravá na zadnom, kolená von a dopredu (smer pohľadu = −x dosky)
    const O = ROZMERY_D.onewheel;
    ikDvochKosti(K.thigh_l, K.calf_l, K.foot_l, svet(0.03, O.doska + 0.075, O.stopy), smer(-1, 0, 0.4));
    ikDvochKosti(K.thigh_r, K.calf_r, K.foot_r, svet(0.03, O.doska + 0.075, -O.stopy), smer(-1, 0, -0.4));
  } else {
    const R = ROZMERY, s = R.sirkaRiadidiel / 2 - 0.05;
    // ruky na gripoch (lakte von a dole), nohy na doske za sebou (kolená mierne dopredu)
    ikDvochKosti(K.upperarm_l, K.lowerarm_l, K.hand_l, svet(s, R.riadidla + 0.02, R.riadidlaZ - 0.03), smer(1, -0.6, -0.8));
    ikDvochKosti(K.upperarm_r, K.lowerarm_r, K.hand_r, svet(-s, R.riadidla + 0.02, R.riadidlaZ - 0.03), smer(-1, -0.6, -0.8));
    ikDvochKosti(K.thigh_l, K.calf_l, K.foot_l, svet(0.045, R.doska + 0.085, 0.1), smer(0.15, 0, 1));
    ikDvochKosti(K.thigh_r, K.calf_r, K.foot_r, svet(-0.045, R.doska + 0.085, -0.2), smer(-0.15, 0, 1));
  }
}
