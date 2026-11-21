// Stanová (ihlanová) strecha pre neobdĺžnikový pôdorys – rodinné domy v tvare L, s výstupkami a pod.
// Porovnanie so satelitom: domy v predmestiach majú šikmé škridlové strechy, v hre boli ploché, lebo valbovú
// strechu vieme postaviť len na obdĺžniku. Vrchol je v ťažisku pôdorysu (alebo v inom vnútornom bode),
// z každej hrany ide k nemu trojuholník – pri hviezdicovom pôdoryse to pôsobí ako valbová strecha.

/** Bod, z ktorého je vidieť všetky hrany zvnútra (jadro mnohouholníka), alebo null. */
function vnutornyVrchol(body) {
  let plocha = 0, cx = 0, cz = 0;
  const n = body.length;
  for (let i = 0; i < n; i++) {
    const [x1, z1] = body[i], [x2, z2] = body[(i + 1) % n];
    const k = x1 * z2 - x2 * z1;
    plocha += k; cx += (x1 + x2) * k; cz += (z1 + z2) * k;
  }
  if (Math.abs(plocha) < 1e-6) return null;
  const s = Math.sign(plocha);
  const tazisko = [cx / (3 * plocha), cz / (3 * plocha)];
  let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity, ax = 0, az = 0;
  for (const [x, z] of body) { minX = Math.min(minX, x); maxX = Math.max(maxX, x); minZ = Math.min(minZ, z); maxZ = Math.max(maxZ, z); ax += x / n; az += z / n; }
  for (const c of [tazisko, [(minX + maxX) / 2, (minZ + maxZ) / 2], [ax, az]]) {
    let ok = true, minVzd = Infinity;
    for (let i = 0; i < n && ok; i++) {
      const [x1, z1] = body[i], [x2, z2] = body[(i + 1) % n];
      const L = Math.hypot(x2 - x1, z2 - z1) || 1;
      const vzd = (s * ((x2 - x1) * (c[1] - z1) - (z2 - z1) * (c[0] - x1))) / L;
      if (vzd < 0.5) ok = false;
      minVzd = Math.min(minVzd, vzd);
    }
    if (ok) return { c, minVzd };
  }
  return null;
}

/**
 * Postaví stanovú strechu nad pôdorysom vo výške y (troj = trojuholník otočený normálou nahor).
 * Vráti false, ak sa na pôdorys nedá (vtedy ostane plochá).
 */
export function stanovaStrecha(body, y, hreben, troj) {
  if (body.length < 5 || body.length > 24) return false;
  const v = vnutornyVrchol(body);
  if (!v) return false;
  // sklon ~40°: výška podľa vzdialenosti vrcholu od najbližšej hrany, z lasera najviac hrebeň
  const h = Math.min(hreben > 0.5 ? hreben : 4.5, v.minVzd * 0.85, 6);
  if (h < 0.8) return false;
  const vrchol = [v.c[0], y + h, v.c[1]];
  for (let i = 0; i < body.length; i++) {
    const [x1, z1] = body[i], [x2, z2] = body[(i + 1) % body.length];
    troj([x1, y, z1], [x2, y, z2], vrchol);
  }
  return true;
}
