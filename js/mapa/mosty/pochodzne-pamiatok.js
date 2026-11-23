// Pochôdzne plochy modelov pamiatok (schodisko pred vstupom, terasa) – zoznam ako js/mapa/pamiatky/nahradene-budovy.js.
// Pamiatka pri stavbe (js/mapa/pamiatky/vyskova-budova.js, "plochy" v <subor>.json) pridá profily v tvare
// js/mapa/mosty/nadjazdy-modul.js ({ body: [{ x, z, h }, …], sirka }, h = absolútna výška); modul nadjazdov ich
// zaradí ako ďalšie pochôdzne plochy – hráč aj chodci po nich idú hore a dolu ako po moste.

const plochy = new Map();
let posluchac = null;

/** Pridá alebo nahradí profily pamiatky (kluc = jej meno a poloha); prázdne pole = odobrať. */
export function pridajPochodzne(kluc, profily) {
  if (profily?.length) plochy.set(kluc, profily); else plochy.delete(kluc);
  posluchac?.(kluc, profily ?? []);
}

/** Modul nadjazdov sa prihlási na odber (dostane aj plochy pridané skôr). */
export function sledujPochodzne(fn) {
  posluchac = fn;
  for (const [k, p] of plochy) fn(k, p);
}
