// Doladenie pózy hráča po animácii (issue #96):
//   – nohy na teréne: chodidlo, ktoré je práve na zemi, sa položí na skutočnú výšku povrchu pod ním (svah, schod,
//     obrubník); keď je zem pod jednou nohou nižšie, celé telo sa o to zníži (IK dvoch kostí – ik.js),
//   – hlava sa mierne natáča tam, kam sa pozerá kamera (pri státí a pomalej chôdzi, nie za chrbát),
//   – keď hráč chvíľu stojí a nehýbe kamerou, rozhliada sa (pomaly vľavo, vpravo, občas hore).
// Volá js/chodec/hrac.js: predAnimaciou(h) pred animuj(), poAnimacii(h, …) po ňom.

import * as THREE from 'three';
import { ikDvochKosti, otocVoSvete, ZalohaPozy } from './ik.js';

const CLENOK = 0.07;        // m – výška členka nad zemou, keď chodidlo leží (zmerané na Ďoďovi)
const ZEM_DO = 0.13;        // m – chodidlo nižšie ako toto nad zemou sa považuje za položené
const MAX_POKLES = 0.3;     // m – o koľko najviac sa telo zníži (dlhší schod už nohy nedočiahnu)
const MAX_HLAVA = 1.0;      // rad – hlava sa otočí najviac o ~57°
const HORE = new THREE.Vector3(0, 1, 0);
const ROZHLIADANIE_PO = 4;  // s státia bez pohybu kamery, potom sa postava rozhliada

const _p = new THREE.Vector3(), _c = new THREE.Vector3(), _d = new THREE.Vector3(), _os = new THREE.Vector3();
const _q = new THREE.Quaternion(), _qc = new THREE.Quaternion(), _qr = new THREE.Quaternion();

const uhol = (a) => Math.atan2(Math.sin(a), Math.cos(a));

function kosti(h) {
  const ud = h.mesh.userData, K = ud.instancia?.kosti;
  if (!K?.thigh_l || !K.foot_l || !K.head) return null;
  ud._zalohaTela ??= new ZalohaPozy(['thigh_l', 'calf_l', 'foot_l', 'thigh_r', 'calf_r', 'foot_r', 'neck_01', 'head'].map((m) => K[m]));
  return K;
}

/** Hráč prestal chodiť (nastupuje, šoféruje): kosti späť do pózy z animácie, záloha neplatí. */
export function uvolniTelo(h) {
  const z = h.mesh.userData._zalohaTela;
  if (z?.platna) z.zrus();
  h.mesh.userData._pokles = 0;
}

/** Pred animáciou vráti kosti do pózy z animácie (bez úprav z minulého snímku). */
export function predAnimaciou(h) {
  if (kosti(h)) h.mesh.userData._zalohaTela.vrat();
}

/**
 * Po animácii: nohy na teréne a hlava za kamerou.
 * vyska(x, z, y) = výška povrchu (rovnaká ako pre chôdzu hráča), kamera = THREE.Camera, naZemi/pliva zo stavu hráča.
 */
export function poAnimacii(h, dt, { vyska, kamera, naZemi, pliva }) {
  const K = kosti(h);
  if (!K) return;
  const ud = h.mesh.userData;
  ud._zalohaTela.zaloz();
  const k = Math.min(1, dt * 12);

  // --- nohy na teréne ---
  let ciel = 0;
  const nohy = [];
  if (naZemi && !pliva) {
    h.mesh.updateMatrixWorld(true);
    const y0 = h.pozicia.y;
    for (const [stehno, lytko, clenok, spicka] of [[K.thigh_l, K.calf_l, K.foot_l, K.ball_l], [K.thigh_r, K.calf_r, K.foot_r, K.ball_r]]) {
      clenok.getWorldPosition(_p);
      const nad = _p.y - y0 - CLENOK;                         // výška chodidla nad zemou v animácii
      const w = THREE.MathUtils.clamp(1 - nad / ZEM_DO, 0, 1);  // 1 = chodidlo na zemi, 0 = vo vzduchu (krok)
      const g = vyska(_p.x, _p.z, y0 + 0.5);
      const posun = Number.isFinite(g) ? THREE.MathUtils.clamp(g - y0, -MAX_POKLES, MAX_POKLES) : 0;
      nohy.push({ stehno, lytko, clenok, spicka, posun: posun * w, w, g });
      ciel = Math.min(ciel, posun * w);
    }
  }
  ud._pokles = (ud._pokles ?? 0) + (ciel - (ud._pokles ?? 0)) * k;
  if (Math.abs(ud._pokles) > 1e-3 || nohy.some((n) => Math.abs(n.posun) > 0.01)) {
    h.mesh.position.y += ud._pokles;
    h.mesh.updateMatrixWorld(true);
    // koleno sa ohýba dopredu (smer postavy) a trochu von
    const fx = Math.sin(h.uhol), fz = Math.cos(h.uhol);
    for (const [i, n] of nohy.entries()) {
      const dopredu = n.posun - ud._pokles;                 // o koľko treba chodidlo posunúť hore voči telu
      if (Math.abs(dopredu) < 0.005) continue;
      n.clenok.getWorldPosition(_c);
      _c.y += dopredu;
      const von = i === 0 ? 1 : -1;
      _d.set(fx + Math.cos(h.uhol) * 0.15 * von, 0.1, fz - Math.sin(h.uhol) * 0.15 * von);
      // chodidlo si po IK zachová natočenie z animácie (inak by sa sklopilo s lýtkom)
      n.clenok.getWorldQuaternion(_qc);
      ikDvochKosti(n.stehno, n.lytko, n.clenok, _c, _d);
      n.clenok.parent.getWorldQuaternion(_qr);
      n.clenok.quaternion.copy(_qr.invert().multiply(_qc));
      n.clenok.updateMatrixWorld(true);
    }
    // chodidlo rovnobežne so svahom: špička hore do kopca, dole z kopca (len položené chodidlo)
    _os.set(Math.cos(h.uhol), 0, -Math.sin(h.uhol));
    for (const n of nohy) {
      if (!n.spicka || n.w < 0.05 || !Number.isFinite(n.g)) continue;
      n.clenok.getWorldPosition(_c); n.spicka.getWorldPosition(_p);
      const dl = Math.hypot(_p.x - _c.x, _p.z - _c.z);
      const gS = vyska(_p.x, _p.z, h.pozicia.y + 0.5);
      if (dl < 0.03 || !Number.isFinite(gS)) continue;
      const sklon = THREE.MathUtils.clamp(-Math.atan2(gS - n.g, dl), -0.5, 0.5) * n.w;
      if (Math.abs(sklon) > 0.01) otocVoSvete(n.clenok, _q.setFromAxisAngle(_os, sklon));
    }
  }

  // --- hlava za kamerou ---
  let cielYaw = 0, cielPitch = 0;
  if (kamera && !pliva) {
    kamera.getWorldDirection(_d);
    const d = uhol(Math.atan2(_d.x, _d.z) - h.uhol);
    // za chrbát sa hlava neotočí; pri behu sa pozerá skôr dopredu
    const tlm = THREE.MathUtils.clamp(1 - (Math.abs(h.rychlost ?? 0) - 1.5) / 3, 0.25, 1);
    if (Math.abs(d) < 2.0) cielYaw = THREE.MathUtils.clamp(d, -MAX_HLAVA, MAX_HLAVA) * tlm;
    // kamera za hráčom sa bežne pozerá dole na postavu (smer y ≈ −0,35) – hlava sa nakloní len o rozdiel
    cielPitch = THREE.MathUtils.clamp((-_d.y - 0.35) * 0.7, -0.3, 0.35) * tlm;
    // rozhliadanie pri státí: kamera aj postava sa chvíľu nehýbu → nový náhodný cieľ pohľadu každé 2–5 s
    const smerKam = Math.atan2(_d.x, _d.z);
    const stoji = Math.abs(h.rychlost ?? 0) < 0.1 && naZemi && Math.abs(uhol(smerKam - (ud._smerKam ?? smerKam))) < 0.002;
    ud._smerKam = smerKam;
    ud._statie = stoji ? (ud._statie ?? 0) + dt : 0;
    if (ud._statie > ROZHLIADANIE_PO) {
      ud._pohladCas = (ud._pohladCas ?? 0) - dt;
      if (ud._pohladCas <= 0) {
        ud._pohladCas = 2 + Math.random() * 3;
        ud._pohlad = Math.random() < 0.3 ? [0, 0] : [(Math.random() * 2 - 1) * 0.9, (Math.random() - 0.65) * 0.35];
      }
      cielYaw += ud._pohlad[0]; cielPitch += ud._pohlad[1];
      cielYaw = THREE.MathUtils.clamp(cielYaw, -MAX_HLAVA, MAX_HLAVA);
    } else ud._pohladCas = 0;
  }
  // pri rozhliadaní pomalší pohyb hlavy (ako keď si človek prezerá okolie)
  const kh = Math.min(1, dt * (ud._statie > ROZHLIADANIE_PO ? 1.6 : 6));
  ud._hlavaYaw = (ud._hlavaYaw ?? 0) + (cielYaw - (ud._hlavaYaw ?? 0)) * kh;
  ud._hlavaPitch = (ud._hlavaPitch ?? 0) + (cielPitch - (ud._hlavaPitch ?? 0)) * kh;
  if (Math.abs(ud._hlavaYaw) > 0.01 || Math.abs(ud._hlavaPitch) > 0.01) {
    h.mesh.updateMatrixWorld(true);
    if (K.neck_01) otocVoSvete(K.neck_01, _q.setFromAxisAngle(HORE, ud._hlavaYaw * 0.4));
    otocVoSvete(K.head, _q.setFromAxisAngle(HORE, ud._hlavaYaw * 0.6));
    const u = h.uhol + ud._hlavaYaw;
    _os.set(Math.cos(u), 0, -Math.sin(u));   // os doľava-doprava hlavy – kladný uhol = pohľad dole
    otocVoSvete(K.head, _q.setFromAxisAngle(_os, ud._hlavaPitch));
  }
}
