// Os mosta ako lomená čiara (most cez Dunaj môže byť v oblúku – Most Apollo). s = metre pozdĺž osi od prvého bodu.
// Priamy most je os z dvoch bodov (od, do). Spoločné pre výškopis (js/mapa/teren/mosty-vyskopisu.js) aj model
// z Blendera (js/mapa/pamiatky/most-glb.js): model je postavený rovno pozdĺž x a do sveta sa ohne podľa osi.

/** @param {Array<[number, number]>} body  body osi [x, z] */
export function vytvorOs(body) {
  const s = [0];
  for (let i = 1; i < body.length; i++) s.push(s[i - 1] + Math.hypot(body[i][0] - body[i - 1][0], body[i][1] - body[i - 1][1]));
  let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
  for (const [x, z] of body) { minX = Math.min(minX, x); maxX = Math.max(maxX, x); minZ = Math.min(minZ, z); maxZ = Math.max(maxZ, z); }
  return { body, s, dlzka: s.at(-1), ohr: { minX, maxX, minZ, maxZ } };
}

/** Bod osi v polohe s: { x, z, tx, tz } (t = jednotkový smer osi; za koncami sa os predĺži rovno). */
export function bodNaOsi(os, s) {
  const B = os.body, S = os.s;
  let i = 1;
  while (i < B.length - 1 && s > S[i]) i++;
  const [ax, az] = B[i - 1], [bx, bz] = B[i];
  const l = S[i] - S[i - 1] || 1;
  const tx = (bx - ax) / l, tz = (bz - az) / l;
  const t = s - S[i - 1];
  return { x: ax + tx * t, z: az + tz * t, tx, tz };
}

/**
 * Najbližší bod osi k (x, z): { s, d2, n } – n = bočná vzdialenosť, kladná vľavo od smeru osi (ako Y v Blenderi:
 * vľavo = (tz, −tx) vo svete). Na koncoch sa s neorezáva (s < 0 alebo > dĺžka = za koncom mosta).
 */
export function najblizsiNaOsi(os, x, z) {
  const B = os.body, S = os.s;
  let naj = null;
  for (let i = 1; i < B.length; i++) {
    const [ax, az] = B[i - 1], [bx, bz] = B[i];
    const dx = bx - ax, dz = bz - az, l2 = dx * dx + dz * dz || 1;
    let t = ((x - ax) * dx + (z - az) * dz) / l2;
    if (i > 1) t = Math.max(0, t);
    if (i < B.length - 1) t = Math.min(1, t);
    const px = ax + dx * t, pz = az + dz * t;
    const d2 = (x - px) ** 2 + (z - pz) ** 2;
    if (naj === null || d2 < naj.d2) {
      const l = Math.sqrt(l2);
      naj = { s: S[i - 1] + t * l, d2, n: ((x - px) * dz - (z - pz) * dx) / l };
    }
  }
  return naj;
}

/** Svet → (s, n) a späť: bod modelu (x pozdĺž osi, y vľavo) do sveta. */
export function naSvet(os, x, y) {
  const p = bodNaOsi(os, x);
  return [p.x + p.tz * y, p.z - p.tx * y];
}
