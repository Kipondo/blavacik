// Vozidlo MHD nejde cez autá ani ľudí: pozrie sa po svojej trase dopredu (do 30 m) a keď je na nej
// auto (premávka, hráčovo, zaparkované), hráč alebo chodec, spomalí až zastaví. Poloha sa ďalej počíta
// z cestovného poriadku, len s meškaním (modul.js), takže vozidlo po uvoľnení trate pokračuje a mešká.
// Keď stojí dlho (napr. auto čaká na neho a on na auto), po 10 s sa pohne (zatrúbi zvončekom skôr).

const DOPREDU = 30;   // m
const KROK = 2;       // m

/** Prekážky v okolí bodu (x, z) do r metrov: [{ x, z, r }]. */
export function prekazkyOkolo(hra, x, z, r) {
  const out = [];
  const blizko = (px, pz) => Math.abs(px - x) < r && Math.abs(pz - z) < r;
  for (const a of hra.doprava?.npcAuta ?? []) {
    if (!blizko(a.x, a.z)) continue;
    // auto = dva kruhy pozdĺž (predok a zadok)
    const dl = (a.dlzka ?? 4.4) / 2 - 0.9, sx = Math.sin(a.uhol ?? 0), sz = Math.cos(a.uhol ?? 0);
    out.push({ x: a.x + sx * dl, z: a.z + sz * dl, r: 1.0 }, { x: a.x - sx * dl, z: a.z - sz * dl, r: 1.0 });
  }
  for (const a of hra.auta ?? []) {
    if (!blizko(a.pozicia.x, a.pozicia.z)) continue;
    for (const k of a.kruhy?.() ?? [{ x: a.pozicia.x, z: a.pozicia.z }]) out.push({ x: k.x, z: k.z, r: 1.0 });
  }
  if (hra.hrac && !hra.stav.auto && blizko(hra.hrac.pozicia.x, hra.hrac.pozicia.z)) {
    out.push({ x: hra.hrac.pozicia.x, z: hra.hrac.pozicia.z, r: 0.45 });
  }
  for (const c of hra.chodci?.zoznam ?? []) if (blizko(c.x, c.z)) out.push({ x: c.x, z: c.z, r: 0.4 });
  return out;
}

/** Vzdialenosť (m) od čela vozidla k prvej prekážke na trase, alebo Infinity. bod(km, out) = bod trasy. */
export function prekazkaPred(hra, bod, km, sirka) {
  const b = {};
  bod(km, b);
  const okolo = prekazkyOkolo(hra, b.x, b.z, DOPREDU + 6);
  if (!okolo.length) return Infinity;
  for (let a = 0; a <= DOPREDU; a += KROK) {
    bod(km + a, b);
    for (const o of okolo) {
      if (Math.hypot(o.x - b.x, o.z - b.z) < sirka / 2 + o.r + 0.25) return a;
    }
  }
  return Infinity;
}
