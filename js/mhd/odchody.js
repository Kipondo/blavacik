// Najbližšie odchody z nástupišťa podľa cestovného poriadku.
// Zohľadňuje nočné spoje (časy po polnoci patria k predchádzajúcemu prevádzkovému dňu).
import { aktivneSluzby } from './kalendar.js';
import { sekundyDna } from './cas.js';

/**
 * @returns [{ linka, typ, ciel, cas (s od polnoci dnešného dňa), znamenie }] zoradené podľa času
 */
export async function najblizsieOdchody(data, idNastupista, teraz, pocet = 6, okno = 3 * 3600) {
  const nast = data.nastupistia.get(idNastupista);
  if (!nast) return [];
  const sek = sekundyDna(teraz);
  const vcera = new Date(teraz.getTime() - 86400000);
  const dni = [
    { posun: 0, sluzby: aktivneSluzby(data.index, teraz) },
    { posun: -86400, sluzby: aktivneSluzby(data.index, vcera) }, // spoje „24:30“ zo včerajška
  ];
  const out = [];
  for (const linka of nast.linky) {
    const [trasy, poriadok] = await Promise.all([data.trasy(linka), data.poriadok(linka)]);
    if (!trasy || !poriadok) continue;
    // Na ktorom mieste trasy je toto nástupište (posledná zastávka = len príchod, nie odchod)
    const poloha = trasy.trasy.map((t) => t.zastavky.slice(0, -1).indexOf(idNastupista));
    for (const [t, p, start, sluzba, ciel] of poriadok.spoje) {
      const i = poloha[t];
      if (i < 0) continue;
      for (const den of dni) {
        if (!den.sluzby.has(sluzba)) continue;
        const cas = start + poriadok.profily[p][i] + den.posun;
        if (cas >= sek && cas <= sek + okno) {
          out.push({ linka, typ: trasy.typ, ciel: poriadok.ciele[ciel], cas, znamenie: trasy.trasy[t].znamenie[i] === 1 });
        }
      }
    }
  }
  return out.sort((a, b) => a.cas - b.cas).slice(0, pocet);
}
