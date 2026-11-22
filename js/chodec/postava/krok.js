// Zmeranie kroku v klipe chôdze/behu: akou rýchlosťou sa chodidlo na zemi posúva dozadu (= „prirodzená“
// rýchlosť klipu, pri ktorej nohy nekĺžu) a kde začína a končí slučka. Meria sa raz pre každý klip
// (NPC rovnakého modelu zdieľajú klipy), v súradniciach koreňa postavy – mierka postavy sa prenásobí neskôr.

import * as THREE from 'three';

const pamat = new WeakMap();   // klip → { v, od, perioda }
const VZORKY = 36;

/** Najskorší čas kľúča v klipe (exporty z Blenderu začínajú až druhým snímkom, 1/30 s). */
export function zaciatokKlipu(klip) {
  let t0 = Infinity;
  for (const t of klip.tracks) if (t.times.length > 1) t0 = Math.min(t0, t.times[0]);
  return Number.isFinite(t0) && t0 < klip.duration ? t0 : 0;
}

/**
 * Zmeria klip na danej postave. akcia = AnimationAction toho klipu (mixér postavy), koren = koreň kostry.
 * Vráti { v (m/s v súradniciach koreňa) | null, od (s), perioda (s) }.
 */
export function zmerajKrok(mixer, akcia, koren, kosti) {
  const klip = akcia.getClip();
  if (pamat.has(klip)) return pamat.get(klip);
  const od = zaciatokKlipu(klip);
  const perioda = Math.max(0.05, klip.duration - od);
  const vysl = { v: null, od, perioda };
  pamat.set(klip, vysl);
  const nohy = [['foot_l', 'ball_l'], ['foot_r', 'ball_r']].map((p) => p.map((m) => kosti[m]));
  if (nohy.some((p) => !p[1])) return vysl;

  // dočasne prehrá len tento klip a odčíta polohy chodidiel
  const ine = mixer._actions.filter((a) => a !== akcia && a.isRunning());
  for (const a of ine) a.enabled = false;
  const bolaZapnuta = akcia.isRunning();
  akcia.enabled = true;
  akcia.setEffectiveWeight(1);
  akcia.play();
  const inv = new THREE.Matrix4(), p = new THREE.Vector3();
  const vzorky = [];
  for (let i = 0; i <= VZORKY; i++) {
    akcia.time = od + perioda * i / VZORKY;
    mixer.update(0);
    koren.updateMatrixWorld(true);
    inv.copy(koren.matrixWorld).invert();
    vzorky.push(nohy.map(([, spicka]) => {
      const b = spicka.getWorldPosition(p).applyMatrix4(inv);
      return [b.y, b.z];
    }));
  }
  if (!bolaZapnuta) akcia.stop();
  for (const a of ine) a.enabled = true;

  // chodidlo na zemi = špička do 6 cm nad zemou; v najdlhšom súvislom úseku na zemi sa zmeria,
  // o koľko sa posunie dozadu (−z, postava hľadí na +z) – priemerná rýchlosť oporného chodidla
  const rychlosti = [];
  const dt = perioda / VZORKY;
  for (let n = 0; n < 2; n++) {
    const y = vzorky.slice(0, VZORKY).map((s) => s[n][0]);
    // „zem“ = 15. percentil výšky špičky (najnižší bod býva kúsok pod zemou a líši sa pre ľavú a pravú nohu)
    const zemY = [...y].sort((a, b) => a - b)[Math.floor(VZORKY * 0.15)];
    const naZemi = y.map((h) => h < zemY + 0.06);
    if (naZemi.every(Boolean)) continue;
    // začiatok hľadáme za prvou snímkou vo vzduchu (slučka – úsek môže prechádzať cez koniec klipu)
    const start = naZemi.indexOf(false);
    let najOd = -1, najDlzka = 0;
    for (let i = 0, zac = -1; i <= VZORKY; i++) {
      const k = (start + i) % VZORKY;
      if (i < VZORKY && naZemi[k]) { if (zac < 0) zac = i; continue; }
      if (zac >= 0 && i - zac > najDlzka) { najDlzka = i - zac; najOd = zac; }
      zac = -1;
    }
    if (najDlzka < 3) continue;
    const z = (i) => vzorky[(start + i) % VZORKY][n][1];
    rychlosti.push((z(najOd) - z(najOd + najDlzka - 1)) / ((najDlzka - 1) * dt));
  }
  if (rychlosti.length) {
    const v = rychlosti.reduce((a, b) => a + b, 0) / rychlosti.length;
    if (v > 0.2 && v < 12) vysl.v = v;
  }
  return vysl;
}
