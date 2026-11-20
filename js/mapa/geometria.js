// Pomocné 2D geometrické funkcie (bez Three.js, aby fungovali aj v tools/ cez Node).
// Body sú polia [x, z].

/** Je bod (x, z) vnútri polygónu? (ray casting) */
export function bodVPolygone(x, z, body) {
  let vnutri = false;
  for (let i = 0, j = body.length - 1; i < body.length; j = i++) {
    const xi = body[i][0], zi = body[i][1];
    const xj = body[j][0], zj = body[j][1];
    if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) {
      vnutri = !vnutri;
    }
  }
  return vnutri;
}

/** Najbližší bod na úsečke a–b k bodu (x, z). Vracia {x, z, d2} */
export function najblizsiNaUsecke(x, z, ax, az, bx, bz) {
  const dx = bx - ax, dz = bz - az;
  const dlzka2 = dx * dx + dz * dz;
  let t = dlzka2 > 0 ? ((x - ax) * dx + (z - az) * dz) / dlzka2 : 0;
  t = Math.max(0, Math.min(1, t));
  const px = ax + dx * t, pz = az + dz * t;
  const ex = x - px, ez = z - pz;
  return { x: px, z: pz, d2: ex * ex + ez * ez, t };
}

/** Vzdialenosť bodu od lomenej čiary (polyline) */
export function vzdialenostOdCiary(x, z, body) {
  let min = Infinity;
  for (let i = 0; i < body.length - 1; i++) {
    const n = najblizsiNaUsecke(x, z, body[i][0], body[i][1], body[i + 1][0], body[i + 1][1]);
    if (n.d2 < min) min = n.d2;
  }
  return Math.sqrt(min);
}

/** Vzdialenosť bodu od okraja polygónu */
export function vzdialenostOdOkraja(x, z, body) {
  let min = Infinity;
  for (let i = 0, j = body.length - 1; i < body.length; j = i++) {
    const n = najblizsiNaUsecke(x, z, body[j][0], body[j][1], body[i][0], body[i][1]);
    if (n.d2 < min) min = n.d2;
  }
  return Math.sqrt(min);
}

/** Pretína úsečka a–b obdĺžnik (minX..maxX, minZ..maxZ)? (Liang–Barsky) */
export function usekaPretinaObdlznik(ax, az, bx, bz, minX, minZ, maxX, maxZ) {
  let t0 = 0, t1 = 1;
  const dx = bx - ax, dz = bz - az;
  const p = [-dx, dx, -dz, dz];
  const q = [ax - minX, maxX - ax, az - minZ, maxZ - az];
  for (let i = 0; i < 4; i++) {
    if (p[i] === 0) {
      if (q[i] < 0) return false;
    } else {
      const r = q[i] / p[i];
      if (p[i] < 0) { if (r > t1) return false; if (r > t0) t0 = r; }
      else { if (r < t0) return false; if (r < t1) t1 = r; }
    }
  }
  return true;
}

/** Ohraničujúci obdĺžnik bodov */
export function ohranicenie(body) {
  let minX = Infinity, minZ = Infinity, maxX = -Infinity, maxZ = -Infinity;
  for (const [x, z] of body) {
    if (x < minX) minX = x; if (x > maxX) maxX = x;
    if (z < minZ) minZ = z; if (z > maxZ) maxZ = z;
  }
  return { minX, minZ, maxX, maxZ };
}

/** Plocha polygónu so znamienkom (kladná = proti smeru hodín v rovine x/z) */
export function plochaPolygonu(body) {
  let s = 0;
  for (let i = 0, j = body.length - 1; i < body.length; j = i++) {
    s += (body[j][0] * body[i][1]) - (body[i][0] * body[j][1]);
  }
  return s / 2;
}

/** Ťažisko (priemer bodov – stačí na naše účely) */
export function stredBodov(body) {
  let x = 0, z = 0;
  for (const b of body) { x += b[0]; z += b[1]; }
  return [x / body.length, z / body.length];
}

/** Obdĺžnik ako polygón (stred, šírka v x, hĺbka v z, natočenie v radiánoch) */
export function obdlznik(cx, cz, sirka, hlbka, natocenie = 0) {
  const c = Math.cos(natocenie), s = Math.sin(natocenie);
  const hw = sirka / 2, hd = hlbka / 2;
  return [[-hw, -hd], [hw, -hd], [hw, hd], [-hw, hd]].map(([x, z]) => [
    cx + x * c + z * s,
    cz - x * s + z * c,
  ]);
}

/** Jednoduchý deterministický generátor náhodných čísel */
export function nahodne(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
