// Hľadanie najlacnejšej cesty v sieti (A*) medzi dvoma bodmi prichytenými na úseky.
// Prichytenie = { a, b, t, x, z } – bod na úseku a→b v pomere t.

/** Jednoduchá binárna halda (min) pre A*. */
class Halda {
  constructor() { this.h = []; }
  get size() { return this.h.length; }
  push(prio, v) {
    const h = this.h; h.push([prio, v]);
    let i = h.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (h[p][0] <= h[i][0]) break;
      [h[p], h[i]] = [h[i], h[p]]; i = p;
    }
  }
  pop() {
    const h = this.h, top = h[0], last = h.pop();
    if (h.length) {
      h[0] = last;
      let i = 0;
      for (;;) {
        const l = 2 * i + 1, r = l + 1;
        let m = i;
        if (l < h.length && h[l][0] < h[m][0]) m = l;
        if (r < h.length && h[r][0] < h[m][0]) m = r;
        if (m === i) break;
        [h[m], h[i]] = [h[i], h[m]]; i = m;
      }
    }
    return top;
  }
}

/** Cena prejdenia časti úseku od bodu prichytenia k uzlu a alebo b. */
function cenaUseku(siet, p, kUzlu) {
  const [, , tam, spat] = siet.useky[p.u];
  const d = Math.hypot(siet.x[p.b] - siet.x[p.a], siet.z[p.b] - siet.z[p.a]);
  return kUzlu === p.b ? (1 - p.t) * d * tam : p.t * d * spat;
}

/**
 * Najlacnejšia cesta z prichytenia S do prichytenia T.
 * Vráti { cena, dlzka, body: [[x, z], …] } alebo null.
 */
export function najdiCestu(siet, S, T, maxCena = 20000) {
  // Rovnaký úsek – priamo, ak to smer dovolí
  if (S.u === T.u) {
    const [, , tam, spat] = siet.useky[S.u];
    const d = Math.hypot(siet.x[S.b] - siet.x[S.a], siet.z[S.b] - siet.z[S.a]) * Math.abs(T.t - S.t);
    const f = T.t >= S.t ? tam : spat;
    if (f < Infinity && f <= 2) return { cena: d * f, dlzka: d, body: [[S.x, S.z], [T.x, T.z]] };
  }
  const ciel = new Map([[T.a, cenaUseku(siet, T, T.a)], [T.b, cenaUseku(siet, T, T.b)]]);
  const g = new Map(), pred = new Map(), halda = new Halda();
  const h = (i) => Math.hypot(siet.x[i] - T.x, siet.z[i] - T.z) * 0.9;
  for (const uzol of [S.a, S.b]) {
    const c = cenaUseku(siet, S, uzol);
    if (c < Infinity && c < (g.get(uzol) ?? Infinity)) { g.set(uzol, c); pred.set(uzol, -1); halda.push(c + h(uzol), uzol); }
  }
  let najlepsia = Infinity, koniec = -1;
  while (halda.size) {
    const [f, i] = halda.pop();
    if (f >= najlepsia || f > maxCena) break;
    const gi = g.get(i);
    if (f - h(i) > gi + 1e-6) continue; // zastaraný záznam
    if (ciel.has(i) && gi + ciel.get(i) < najlepsia) { najlepsia = gi + ciel.get(i); koniec = i; }
    for (const [j, , c] of siet.susedia[i]) {
      const n = gi + c;
      if (n < (g.get(j) ?? Infinity)) { g.set(j, n); pred.set(j, i); halda.push(n + h(j), j); }
    }
  }
  if (koniec < 0) return null;
  const uzly = [];
  for (let i = koniec; i !== -1; i = pred.get(i)) uzly.push(i);
  uzly.reverse();
  const body = [[S.x, S.z], ...uzly.map((i) => [siet.x[i], siet.z[i]]), [T.x, T.z]];
  let dlzka = 0;
  for (let i = 1; i < body.length; i++) dlzka += Math.hypot(body[i][0] - body[i - 1][0], body[i][1] - body[i - 1][1]);
  return { cena: najlepsia, dlzka, body };
}
