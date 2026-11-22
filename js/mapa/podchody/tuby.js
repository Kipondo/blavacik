// Podchody – spoločný popis pre geometriu (geometria.js) aj pohyb hráča a kamery (modul.js).
// Dáta dlaždice (tools/mesto/podchody.mjs): podchody: [{ typ: 'chodba'|'schody', body, sirka, dole, vestibul }].
//
// Každá chodba aj schody sa rozložia na „tuby“: úsečky s polovičnou šírkou h a výškou podlahy na oboch
// koncoch. Priechodný priestor pod zemou = zjednotenie týchto kapsúl. Chodba má podlahu HLBKA m pod
// najnižším terénom nad svojou sieťou a strop VYSKA m nad podlahou; schody idú od terénu na hornom konci
// k podlahe chodby na dolnom.

export const HLBKA = 3.8;     // m – podlaha chodby pod terénom
export const VYSKA = 3.0;     // m – svetlá výška chodby
const VESTIBUL = 5;           // m – krytá chodba za schodmi do podzemného podlažia budovy

/**
 * Tuby dlaždice: [{ typ, ax, az, bx, bz, h, ya, yb, dlzka, ex, ez, stena?: { … } }]
 *   ya, yb – výška podlahy na začiatku a konci (pri schodoch: a = hore, b = dole).
 */
/** vyskaVrchu (voliteľné) = výška horného konca schodov (napr. nástupište nad terénom – js/mapa/podchody/modul.js),
 *  inak terén. */
export function pripravTuby(podchody = [], vyskaTerenu, vyskaVrchu = vyskaTerenu) {
  // siete: chodby a schody, ktoré sa dotýkajú (spoločný bod do 1 m), majú jednu rovnú podlahu – pod najnižším
  // miestom terénu nad chodbami (strop tak nikde nevytŕča z terénu, schody nadväzujú na podlahu)
  const polozky = podchody.filter((p) => p.body?.length >= 2);
  const rodic = polozky.map((_, i) => i);
  const koren = (i) => (rodic[i] === i ? i : (rodic[i] = koren(rodic[i])));
  const blizko = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]) < 1;
  for (let i = 0; i < polozky.length; i++) {
    for (let j = i + 1; j < polozky.length; j++) {
      const A = polozky[i].body, B = polozky[j].body;
      const konceA = [A[0], A.at(-1)], konceB = [B[0], B.at(-1)];
      if (konceA.some((a) => B.some((b) => blizko(a, b))) || konceB.some((b) => A.some((a) => blizko(a, b)))) rodic[koren(i)] = koren(j);
    }
  }
  const podlaha = new Map();
  for (let i = 0; i < polozky.length; i++) {
    const p = polozky[i], k = koren(i);
    let min = podlaha.get(k) ?? Infinity;
    const body = p.typ === 'schody' ? [p.dole === 0 ? p.body[0] : p.body.at(-1)] : p.body;
    for (let n = 0; n < body.length; n++) {
      min = Math.min(min, vyskaTerenu(body[n][0], body[n][1]));
      if (p.typ === 'schody' || n === 0) continue;
      const a = body[n - 1], b = body[n], l = Math.hypot(b[0] - a[0], b[1] - a[1]);
      for (let s = 2; s < l; s += 2) min = Math.min(min, vyskaTerenu(a[0] + (b[0] - a[0]) * s / l, a[1] + (b[1] - a[1]) * s / l));
    }
    podlaha.set(k, min);
  }

  const tuby = [];
  for (let i = 0; i < polozky.length; i++) {
    const p = polozky[i], b = p.body;
    const yp = podlaha.get(koren(i)) - HLBKA;
    const h = Math.max(1, (p.sirka ?? 4) / 2);
    if (p.typ === 'schody') {
      const hore = p.dole === 0 ? b.at(-1) : b[0], dole = p.dole === 0 ? b[0] : b.at(-1);
      const ya = vyskaVrchu(hore[0], hore[1]);
      const t = tuba('schody', hore, dole, h, ya, Math.min(yp, ya - 2.5));
      if (!t) continue;
      // o koľko je horný koniec nad terénom (nástupište) – geometria.js zdvihne obrubu a zábradlie na povrchu
      t.nad = Math.max(0, ya - vyskaTerenu(hore[0], hore[1]));
      tuby.push(t);
      if (p.vestibul) {
        // krytá chodba pokračujúca za schodmi (vstup do podzemného podlažia budovy, dvere na konci)
        const k = [dole[0] + t.ex * VESTIBUL, dole[1] + t.ez * VESTIBUL];
        const v = tuba('chodba', dole, k, h, t.yb, t.yb);
        if (v) { v.dvere = true; tuby.push(v); }
      }
      continue;
    }
    for (let n = 1; n < b.length; n++) {
      const t = tuba('chodba', b[n - 1], b[n], h, yp, yp);
      if (t) tuby.push(t);
    }
  }
  return tuby;
}

function tuba(typ, a, b, h, ya, yb) {
  const dx = b[0] - a[0], dz = b[1] - a[1], dlzka = Math.hypot(dx, dz);
  if (dlzka < 0.3) return null;
  return { typ, ax: a[0], az: a[1], bx: b[0], bz: b[1], h, ya, yb, dlzka, ex: dx / dlzka, ez: dz / dlzka };
}

/** Poloha bodu voči tube: t (0–1 pozdĺž), d (vzdialenosť od osi), y podlahy v tom mieste. */
export function voTube(t, x, z) {
  const px = x - t.ax, pz = z - t.az;
  const s = Math.max(0, Math.min(t.dlzka, px * t.ex + pz * t.ez));
  const qx = t.ax + t.ex * s, qz = t.az + t.ez * s;
  return { u: s / t.dlzka, d: Math.hypot(x - qx, z - qz), y: t.ya + (t.yb - t.ya) * (s / t.dlzka), qx, qz };
}

/** Je bod (s okrajom r) v priechodnom priestore niektorej tuby? Vráti najlepšiu tubu alebo null. */
export function najdiTubu(tuby, x, z, r = 0) {
  let naj = null, nd = Infinity;
  for (const t of tuby) {
    const v = voTube(t, x, z);
    const okraj = v.d - (t.h - r);
    if (okraj < nd) { nd = okraj; naj = { t, v, okraj }; }
  }
  return naj;
}

/** Obdĺžniky jám schodísk v teréne (vyrežú sa z textúry zeme; okraj zakryje obruba z geometria.js). */
export function dieryPodchodov(podchody = []) {
  const diery = [];
  for (const p of podchody) {
    if (p.typ !== 'schody' || !p.body || p.body.length < 2) continue;
    const a = p.body[0], b = p.body.at(-1);
    const dx = b[0] - a[0], dz = b[1] - a[1], l = Math.hypot(dx, dz);
    if (l < 0.3) continue;
    const ex = dx / l, ez = dz / l, nx = -ez, nz = ex;
    const D = Math.max(1, (p.sirka ?? 3) / 2) + 0.6;
    diery.push([
      [a[0] - ex * 0.6 + nx * D, a[1] - ez * 0.6 + nz * D], [b[0] + ex * 0.6 + nx * D, b[1] + ez * 0.6 + nz * D],
      [b[0] + ex * 0.6 - nx * D, b[1] + ez * 0.6 - nz * D], [a[0] - ex * 0.6 - nx * D, a[1] - ez * 0.6 - nz * D],
    ]);
  }
  return diery;
}
