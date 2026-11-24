// Mólá a vyhliadkové lávky nad nábrežím (#131, Eurovea – nábrežie). V OSM sú to obyčajné lávky (bridge=yes) a hra
// ich stavia ako nadjazdy (js/mapa/mosty/nadjazdy.js): mostovka by išla od terénu na brehu k terénu pri vode, teda
// 6–7 m dolu svahom k rieke. Skutočné mólá (Inessa Hansch) sú vodorovné vo výške terasy nad promenádou, na brehu
// majú pár schodov a koniec visí nad vodou. Lávky zo zoznamu data/mapa/mola.json sa pri načítaní dlaždice označia
// (m.molo) a profilMosta() ich postaví vodorovne; postavMost() im dá drevenú mostovku a oceľ.
// Bez Three.js – volá sa v js/mapa/dlazdice/sprava-dlazdic.js aj v kontrolách.

let mola = null;

/** Zoznam mól (raz za hru). */
export function nacitajMola() {
  mola ??= fetch('data/mapa/mola.json')
    .then((r) => (r.ok ? r.json() : { mola: [] }))
    .then((j) => j.mola ?? [])
    .catch(() => []);
  return mola;
}

const blizko = (a, b, r = 3) => Math.hypot(a[0] - b[0], a[1] - b[1]) < r;

/** Označí lávky dlaždice, ktoré sú mólami: m.molo = { nad, brehNaKonci, nazov }, m.sirka. */
export function oznacMola(nadjazdy, zoznam) {
  if (!nadjazdy?.length || !zoznam?.length) return;
  for (const m of nadjazdy) {
    if (m.druh !== 'chodnik' || !(m.body?.length > 1)) continue;
    const a = m.body[0], b = m.body.at(-1);
    for (const o of zoznam) {
      const naKonci = blizko(b, o.breh) && blizko(a, o.voda);
      if (!naKonci && !(blizko(a, o.breh) && blizko(b, o.voda))) continue;
      m.molo = { nad: o.nad ?? 0.8, brehNaKonci: naKonci, nazov: o.nazov };
      if (o.sirka) m.sirka = o.sirka;
      break;
    }
  }
}
