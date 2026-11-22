// Jednoduché IK dvoch kostí (rameno–predlaktie, stehno–lýtko): jazdec na kolobežke/bicykli, nohy na teréne.
// Počíta sa vo svetových súradniciach po animácii (mixér), každý snímok znova.

import * as THREE from 'three';

const S = new THREE.Vector3(), E = new THREE.Vector3(), H = new THREE.Vector3();
const u = new THREE.Vector3(), w = new THREE.Vector3(), lakt = new THREE.Vector3();
const a = new THREE.Vector3(), b = new THREE.Vector3();
const q = new THREE.Quaternion(), qk = new THREE.Quaternion(), qr = new THREE.Quaternion();

/** Otočí kosť vo svete o q (zachová rodiča). */
export function otocVoSvete(kost, rot) {
  kost.getWorldQuaternion(qk);
  kost.parent.getWorldQuaternion(qr);
  qk.premultiply(rot);
  kost.quaternion.copy(qr.invert().multiply(qk));
  kost.updateMatrixWorld(true);
}

/**
 * Dvojkostrové IK: horna (rameno/stehno), dolna (predlaktie/lýtko), koniec (ruka/členok) → ciel (svet).
 * pol = smer (svet), kam sa má ohnúť lakeť/koleno.
 */
export function ikDvochKosti(horna, dolna, koniec, ciel, pol) {
  horna.getWorldPosition(S); dolna.getWorldPosition(E); koniec.getWorldPosition(H);
  const l1 = S.distanceTo(E), l2 = E.distanceTo(H);
  if (l1 < 1e-4 || l2 < 1e-4) return;
  u.subVectors(ciel, S);
  const d = THREE.MathUtils.clamp(u.length(), Math.abs(l1 - l2) + 1e-3, l1 + l2 - 1e-3);
  u.normalize();
  // poloha lakťa/kolena: zákon kosínusov, ohnuté smerom k pólu
  const cosA = THREE.MathUtils.clamp((l1 * l1 + d * d - l2 * l2) / (2 * l1 * d), -1, 1);
  const sinA = Math.sqrt(1 - cosA * cosA);
  w.copy(pol).addScaledVector(u, -pol.dot(u));
  if (w.lengthSq() < 1e-8) return;
  w.normalize();
  lakt.copy(S).addScaledVector(u, l1 * cosA).addScaledVector(w, l1 * sinA);
  // horná kosť: smer S→E na S→lakeť
  a.subVectors(E, S).normalize(); b.subVectors(lakt, S).normalize();
  otocVoSvete(horna, q.setFromUnitVectors(a, b));
  // dolná kosť: smer E→H na E→cieľ
  dolna.getWorldPosition(E); koniec.getWorldPosition(H);
  a.subVectors(H, E).normalize(); b.subVectors(ciel, E).normalize();
  otocVoSvete(dolna, q.setFromUnitVectors(a, b));
}

/**
 * Záloha pózy kostí pred úpravou (IK, natočenie hlavy). Mixér zapíše kosť len vtedy, keď sa jej hodnota
 * v animácii zmenila – úpravy by sa inak hromadili, preto sa pred ďalšou animáciou póza vráti (vrat),
 * po animácii sa zálohuje (zaloz) a až potom upraví.
 */
export class ZalohaPozy {
  constructor(kosti) { this.kosti = kosti.filter(Boolean); this.q = this.kosti.map(() => new THREE.Quaternion()); this.platna = false; }
  vrat() { if (this.platna) this.kosti.forEach((k, i) => k.quaternion.copy(this.q[i])); }
  zaloz() { this.kosti.forEach((k, i) => this.q[i].copy(k.quaternion)); this.platna = true; }
  zrus() { this.vrat(); this.platna = false; }
}
