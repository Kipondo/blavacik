// Rýchle hľadanie spojov linky podľa času odchodu: poriadok linky má tisíce spojov, ale na ceste je naraz
// len pár. Spoje sa raz zoradia podľa odchodu a potom sa binárnym vyhľadávaním vyberie len časové okno
// (namiesto prechádzania všetkých spojov všetkých liniek každú sekundu – to v centre trvalo aj 60 ms).

function index(poriadok) {
  if (poriadok._index) return poriadok._index;
  const n = poriadok.spoje.length;
  const poradie = Array.from({ length: n }, (_, k) => k).sort((a, b) => poriadok.spoje[a][2] - poriadok.spoje[b][2]);
  const starty = Float64Array.from(poradie, (k) => poriadok.spoje[k][2]);
  let maxTrvanie = 0;
  for (const p of poriadok.profily) maxTrvanie = Math.max(maxTrvanie, p[p.length - 1] ?? 0);
  return (poriadok._index = { poradie, starty, maxTrvanie });
}

/** Prvý index v zoradenom poli s hodnotou ≥ x. */
function dolnaHranica(pole, x) {
  let lo = 0, hi = pole.length;
  while (lo < hi) { const m = (lo + hi) >> 1; if (pole[m] < x) lo = m + 1; else hi = m; }
  return lo;
}

/** Indexy spojov s odchodom v intervale [od − najdlhšia jazda, do]. */
export function spojeVOkne(poriadok, od, do_) {
  const { poradie, starty, maxTrvanie } = index(poriadok);
  const out = [];
  for (let i = dolnaHranica(starty, od - maxTrvanie); i < starty.length && starty[i] <= do_; i++) out.push(poradie[i]);
  return out;
}
