// Póza jazdca (Ďoďo) na malom vozidle: na kolobežke stojí na doske, na bicykli sedí v sedle a šliape.
// Po animácii státia sa ruky a nohy dotiahnu na riadidlá, dosku a pedále (IK dvoch kostí, ik.js).

import * as THREE from 'three';
import { ikDvochKosti, otocVoSvete } from '../chodec/postava/ik.js';
import { ROZMERY } from './model-kolobezky.js';
import { ROZMERY_B } from './model-bicykla.js';

const _v = new THREE.Vector3(), _q = new THREE.Quaternion(), _os = new THREE.Vector3();
const KOSTI_IK = ['spine_01', 'upperarm_l', 'lowerarm_l', 'upperarm_r', 'lowerarm_r', 'thigh_l', 'calf_l', 'thigh_r', 'calf_r'];

// Mixér zapíše kosť len vtedy, keď sa jej hodnota v animácii zmenila – úpravy IK by sa inak hromadili
// (a po zosadnutí by ostali). Preto sa pred animáciou vráti póza spred IK a po zosadnutí sa vráti celá.
function vratPozu(ud) {
  for (const [kost, q] of ud._ikZaloha ?? []) kost.quaternion.copy(q);
}
function zalohujPozu(ud, K) {
  ud._ikZaloha ??= new Map();
  for (const m of KOSTI_IK) if (K[m]) {
    if (!ud._ikZaloha.has(K[m])) ud._ikZaloha.set(K[m], new THREE.Quaternion());
    ud._ikZaloha.get(K[m]).copy(K[m].quaternion);
  }
}

/** Po zosadnutí: kosti späť do pózy z animácie (bez IK). */
export function uvolniJazdca(hrac) {
  const ud = hrac.mesh.userData;
  vratPozu(ud);
  ud._ikZaloha = null;
}

/** Položí hráča na vozidlo a nastaví pózu. */
export function polozJazdca(dt, hrac, voz) {
  const ud = hrac.mesh.userData;
  voz.mesh.updateMatrixWorld(true);
  hrac.mesh.visible = true;
  const sedi = voz.K.jazdec === 'sedi';
  // koreň postavy: na doske kolobežky; na bicykli tak, aby panva sedela v sedle (panva ~0,9 m nad koreňom)
  const koren = sedi ? [0, ROZMERY_B.sedlo[1] - 0.86, ROZMERY_B.sedlo[2] - 0.02] : [0, ROZMERY.doska, -0.06];
  hrac.mesh.position.copy(voz.mesh.localToWorld(_v.set(...koren)));
  hrac.mesh.quaternion.copy(voz.mesh.quaternion);
  vratPozu(ud);
  ud.animuj?.(dt, 0, false);
  const K = ud.instancia?.kosti;
  if (!K?.upperarm_l || !K.thigh_l) return;
  zalohujPozu(ud, K);
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
  } else {
    const R = ROZMERY, s = R.sirkaRiadidiel / 2 - 0.05;
    // ruky na gripoch (lakte von a dole), nohy na doske za sebou (kolená mierne dopredu)
    ikDvochKosti(K.upperarm_l, K.lowerarm_l, K.hand_l, svet(s, R.riadidla + 0.02, R.riadidlaZ - 0.03), smer(1, -0.6, -0.8));
    ikDvochKosti(K.upperarm_r, K.lowerarm_r, K.hand_r, svet(-s, R.riadidla + 0.02, R.riadidlaZ - 0.03), smer(-1, -0.6, -0.8));
    ikDvochKosti(K.thigh_l, K.calf_l, K.foot_l, svet(0.045, R.doska + 0.085, 0.1), smer(0.15, 0, 1));
    ikDvochKosti(K.thigh_r, K.calf_r, K.foot_r, svet(-0.045, R.doska + 0.085, -0.2), smer(-0.15, 0, 1));
  }
}
