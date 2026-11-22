// Vlak na obrazovke načítavania: lokomotíva (biela s modrým a červeným pásom) + 5 vozňov (červeno-sivé),
// bez loga a názvu dopravcu. Kreslí sa v SVG zboku; každý vozeň stojí na trati oboma koncami, takže sa vlak
// v zákrutách ohýba. Smer jazdy je vždy „dopredu“ (pri jazde na západ sa vozeň zrkadlí, strecha ostáva hore).

const NS = 'http://www.w3.org/2000/svg';
const MIERKA = 1.25;                // vozne sú kreslené v menšej mierke a zväčšené
const LOKO = 52, VOZEN = 47;        // dĺžky v mierke kreslenia
export const DLZKA_LOKO = LOKO * MIERKA;
export const DLZKA_VOZNA = VOZEN * MIERKA;
export const MEDZERA = 3 * MIERKA;
export const POCET_VOZNOV = 5;
/** Celá dĺžka vlaku po trati (súradnice SVG 1600 × 900). */
export const DLZKA_VLAKU = DLZKA_LOKO + POCET_VOZNOV * (DLZKA_VOZNA + MEDZERA);

const el = (meno, atr = {}, rodic) => {
  const e = document.createElementNS(NS, meno);
  for (const [k, v] of Object.entries(atr)) e.setAttribute(k, String(v));
  rodic?.appendChild(e);
  return e;
};

/** Vozeň: dlhá skrinka, sivá strecha, rad okien, červený pás dole, podvozky. Predok = +x. */
function vozen(g, L) {
  const p = -L / 2;
  el('rect', { x: p, y: -17, width: L, height: 19, rx: 3.5, class: 'vlak-vozen' }, g);
  el('rect', { x: p + 2, y: -19, width: L - 4, height: 4, rx: 2, class: 'vlak-strecha' }, g);
  el('rect', { x: p, y: -3, width: L, height: 5, class: 'vlak-cerveny' }, g);
  for (let i = 0; i < 6; i++) el('rect', { x: p + 5 + i * ((L - 10) / 6), y: -12, width: (L - 10) / 6 - 2, height: 6, rx: 1, class: 'vlak-okno' }, g);
  for (const x of [p + 7, p + 13, L / 2 - 13, L / 2 - 7]) el('circle', { cx: x, cy: 4, r: 2.6, class: 'vlak-koleso' }, g);
}

/** Lokomotíva: biela, šikmé čelo s oknom, modrý a červený pás, zberač na streche. Predok = +x. */
function lokomotiva(g, L) {
  const p = -L / 2, k = L / 2;
  el('path', { d: `M${p + 2} -17 H${k - 8} L${k} -9 V2 H${p} V-15 Z`, class: 'vlak-loko' }, g);
  el('path', { d: `M${k - 9} -15.5 L${k - 2.5} -9.5 H${k - 9} Z`, class: 'vlak-okno' }, g);
  el('rect', { x: p + 4, y: -12, width: 5, height: 5, rx: 1, class: 'vlak-okno' }, g);
  el('rect', { x: p, y: -6, width: L, height: 3.5, class: 'vlak-modry' }, g);
  el('rect', { x: p, y: -2.5, width: L, height: 3.5, class: 'vlak-cerveny' }, g);
  el('path', { d: `M${p + 12} -17 l6 -6 l6 6 M${p + 15} -23 h6`, class: 'vlak-zberac' }, g);
  el('circle', { cx: k - 1.5, cy: -3, r: 1.4, class: 'vlak-svetlo' }, g);
  for (const x of [p + 8, p + 15, k - 15, k - 8]) el('circle', { cx: x, cy: 4, r: 2.8, class: 'vlak-koleso' }, g);
}

/** Postaví skupinu s vlakom; vráti funkciu umiestni(trasa, sLoko), sLoko = poloha čela lokomotívy na trase
 *  (trasa = SVG cesta, po ktorej vozne idú; začiatok trasy môže byť schovaný za Košicami). */
export function vytvorVlak(rodic) {
  const g = el('g', { class: 'vlak' }, rodic);
  const casti = [];
  // vozne odzadu dopredu, aby lokomotíva bola navrchu
  for (let i = POCET_VOZNOV - 1; i >= 0; i--) {
    const v = el('g', {}, g);
    vozen(el('g', { transform: `scale(${MIERKA})` }, v), VOZEN);
    casti.unshift({ g: v, L: DLZKA_VOZNA });
  }
  const loko = el('g', {}, g);
  lokomotiva(el('g', { transform: `scale(${MIERKA})` }, loko), LOKO);
  casti.unshift({ g: loko, L: DLZKA_LOKO });

  return function umiestni(trasa, sLoko) {
    let s = sLoko;
    for (const c of casti) {
      const a = trasa.getPointAtLength(Math.max(0, s));
      const b = trasa.getPointAtLength(Math.max(0, s - c.L));
      const x = (a.x + b.x) / 2, y = (a.y + b.y) / 2;
      const uhol = Math.atan2(a.y - b.y, a.x - b.x) * 180 / Math.PI;
      // na západ: otočíme o 180° a zrkadlíme, nech je strecha hore a čelo vpredu
      const tr = Math.abs(uhol) > 90 ? `rotate(${uhol - 180}) scale(-1,1)` : `rotate(${uhol})`;
      c.g.setAttribute('transform', `translate(${x.toFixed(1)},${(y - 4 * MIERKA).toFixed(1)}) ${tr}`);
      s -= c.L + MEDZERA;
    }
    return trasa.getPointAtLength(Math.max(0, sLoko));
  };
}
