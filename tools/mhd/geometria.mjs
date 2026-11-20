// Pomocná geometria lomených čiar (zjednodušenie, vzdialenosť po trase, smer).
import { r1 } from './spolocne.mjs';

/** Douglas–Peucker: zjednoduší čiaru s toleranciou tol (m). */
export function zjednodus(body, tol = 0.4) {
  if (body.length < 3) return body.slice();
  const drz = new Uint8Array(body.length);
  drz[0] = drz[body.length - 1] = 1;
  const zasobnik = [[0, body.length - 1]];
  while (zasobnik.length) {
    const [a, b] = zasobnik.pop();
    const [ax, az] = body[a], [bx, bz] = body[b];
    const dx = bx - ax, dz = bz - az, l = Math.hypot(dx, dz) || 1;
    let max = 0, idx = -1;
    for (let i = a + 1; i < b; i++) {
      const d = Math.abs((body[i][0] - ax) * dz - (body[i][1] - az) * dx) / l;
      if (d > max) { max = d; idx = i; }
    }
    if (max > tol) { drz[idx] = 1; zasobnik.push([a, idx], [idx, b]); }
  }
  return body.filter((_, i) => drz[i]);
}

/** Zjednoduší trasu po úsekoch medzi zastávkami (body zastávok ostanú). Vráti { body, km }. */
export function zjednodusTrasu(body, indexy) {
  const out = [], km = [];
  let dlzka = 0;
  for (let i = 0; i < indexy.length; i++) {
    if (i === 0) { out.push(body[indexy[0]]); km.push(0); continue; }
    const kus = zjednodus(body.slice(indexy[i - 1], indexy[i] + 1));
    for (let k = 1; k < kus.length; k++) {
      const p = out[out.length - 1];
      dlzka += Math.hypot(kus[k][0] - p[0], kus[k][1] - p[1]);
      out.push(kus[k]);
    }
    km.push(dlzka);
  }
  return { body: out.map(([x, z]) => [r1(x), r1(z)]), km: km.map(r1) };
}

/** Jednotkový smer trasy v mieste vzdialenosti km. */
export function smerNaKm(body, km) {
  let d = 0;
  for (let i = 1; i < body.length; i++) {
    const dx = body[i][0] - body[i - 1][0], dz = body[i][1] - body[i - 1][1];
    const l = Math.hypot(dx, dz);
    if (d + l >= km - 1e-6 && l > 0.5) return [dx / l, dz / l];
    d += l;
  }
  const n = body.length;
  const dx = body[n - 1][0] - body[Math.max(0, n - 2)][0], dz = body[n - 1][1] - body[Math.max(0, n - 2)][1];
  const l = Math.hypot(dx, dz) || 1;
  return [dx / l, dz / l];
}
