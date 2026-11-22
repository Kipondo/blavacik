// Modul: dáta vozidiel (issue #97) – načíta data/doprava/vozidla.json (zastúpenie typov v premávke, farby podľa
// skutočnosti, taxíky a kuriéri, jazdné vlastnosti typov) a odovzdá ich js/auto/typy-aut.js.
// Beží skoro (poradie 4), aby zaparkované autá aj premávka už mali dáta. Bez súboru platia predvolené hodnoty.
// Pre ostatné moduly: hra.doprava.vozidla = načítané dáta.

import { nastavDataVozidiel } from '../auto/typy-aut.js';

export default {
  nazov: 'vozidla-data',
  poradie: 4,

  async init(hra) {
    try {
      const d = await (await fetch('data/doprava/vozidla.json')).json();
      nastavDataVozidiel(d);
      hra.doprava ??= {};
      hra.doprava.vozidla = d;
    } catch (e) {
      console.warn('Vozidlá: data/doprava/vozidla.json sa nenačítal, platia predvolené hodnoty.', e);
    }
  },
};
