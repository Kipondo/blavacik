// Chodníky pri križovatkách – pravidlá ulice (#136): chodník s obrubníkom obíde oblý roh križovatky a spojí chodníky
// oboch ciest; na rovnej strane priebežnej cesty (T-križovatka) chodník pokračuje bez prerušenia; na vonkajšej strane
// ohybu (aj kde jedna cesta končí a druhá pod uhlom začína) ide chodník po oblúku okolo uzla.
// Tvar rohu je z js/mapa/cesty/krizovatky-tvar.js (ten istý, aký má asfalt križovatky). Bez Three.js – geometriu
// stavia chodniky.js, mapu povrchu povrch-modul.js.

import { SIRKA, sChodnikom } from './chodnik-rozmery.js';
import { tvarKrizovatky, tvarSpoja, spojeCiest } from './krizovatky-tvar.js';

/** Vonkajšia normála (od uzla) v každom bode krivky. */
function normalyOdUzla(body, k) {
  return body.map((p, j) => {
    const a = body[Math.max(0, j - 1)], b = body[Math.min(body.length - 1, j + 1)];
    let nx = -(b[1] - a[1]), nz = b[0] - a[0];
    const L = Math.hypot(nx, nz) || 1;
    nx /= L; nz /= L;
    if (nx * (p[0] - k.x) + nz * (p[1] - k.z) < 0) { nx = -nx; nz = -nz; }
    return [nx, nz];
  });
}

/** Pás chodníka pozdĺž krivky (okraj vozovky): { vnutro, normaly, kriz } – von = vnutro + normála · SIRKA. */
function pas(vnutro, k) {
  return { vnutro, normaly: normalyOdUzla(vnutro, k), kriz: k };
}

/**
 * Rohy chodníkov: pásy pozdĺž oblých rohov križovatiek (obe cesty majú chodník) a pozdĺž oblúkov na vonkajšej strane
 * ohybov. cesty = to isté pole, z ktorého najdiKrizovatky našla križovatky.
 */
export function rohyChodnikov(cesty, krizovatky) {
  const out = [];
  for (const k of krizovatky.values()) {
    const t = tvarKrizovatky(k, cesty);
    if (!t) continue;
    const n = t.ramena.length;
    t.medzery.forEach((m, a) => {
      const r = t.ramena[a], s = t.ramena[(a + 1) % n];
      if (!sChodnikom(r.c) || !sChodnikom(s.c)) return;
      if (m.typ === 'roh') out.push(pas(m.roh, k));
      else if (m.typ === 'oblúk') out.push(pas(m.body, k));
    });
  }
  for (const k of spojeCiest(cesty, krizovatky)) {
    const t = tvarSpoja(k, cesty);
    if (t && t.ramena.every((r) => sChodnikom(r.c))) out.push(pas(t.obluk, k));
  }
  return out;
}

/**
 * Kde má rovný chodník pri križovatke skončiť: Map(cesta → [{ i, r: { [smer]: { [strana]: m } } }]).
 * i = index uzla v c.body, smer +1 = úsek za uzlom (ďalšie body), −1 = pred uzlom; strana = strana chodníka
 * (chodniky.js: +1 vľavo od smeru cesty). r = vzdialenosť po osi od uzla, do ktorej chodník nie je:
 *   oblý roh alebo zlúčené / rovné rohy – po koniec tvaru križovatky (d), ďalej ide roh chodníka;
 *   rovná strana priebežnej cesty a vonkajší oblúk – 0 (chodník pokračuje až k uzlu, resp. cez neho).
 * Pri križovatke bez tvaru (čudná geometria) ostáva pôvodné prerušenie (polomer + šírka chodníka + 1,5 m).
 */
export function preruseniaChodnikov(cesty, krizovatky) {
  const out = new Map();
  const pridaj = (c, i, smer, strana, r) => {
    if (!out.has(c)) out.set(c, []);
    const zoz = out.get(c);
    let u = zoz.find((q) => q.i === i);
    if (!u) { u = { i, r: { 1: { 1: 0, '-1': 0 }, '-1': { 1: 0, '-1': 0 } } }; zoz.push(u); }
    u.r[smer][strana] = Math.max(u.r[smer][strana], r);
  };
  for (const k of krizovatky.values()) {
    const t = tvarKrizovatky(k, cesty);
    if (!t) {
      const r = k.polomer + SIRKA + 1.5;
      for (const { ci, i } of k.cesty ?? []) for (const smer of [1, -1]) for (const strana of [1, -1]) pridaj(cesty[ci], i, smer, strana, r);
      continue;
    }
    const n = t.ramena.length;
    const dlzka = (m) => (m.typ === 'rovno' || m.typ === 'oblúk' ? 0 : t.d);
    t.ramena.forEach((rm, a) => {
      const plus = dlzka(t.medzery[a]), minus = dlzka(t.medzery[(a + n - 1) % n]);
      // strana +1 tvaru (k väčšiemu uhlu) = strana +1 chodníka pri smere +1, strana −1 chodníka pri smere −1
      if (rm.smer === 1) { pridaj(rm.c, rm.i, 1, 1, plus); pridaj(rm.c, rm.i, 1, -1, minus); }
      else { pridaj(rm.c, rm.i, -1, -1, plus); pridaj(rm.c, rm.i, -1, 1, minus); }
    });
  }
  return out;
}
