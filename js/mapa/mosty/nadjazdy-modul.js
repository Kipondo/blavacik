// Modul: chôdza a jazda po nadjazdoch, lávkach a nadchodoch.
// Mostovky stavia dlaždica (js/mapa/mosty/nadjazdy.js) a ich profily (výška po 2 m) dá do objekt.userData.nadjazdy.
// Iné moduly môžu pridať vlastné profily udalosťou 'pochodzne-plochy' { kluc, profily } (prázdne = odobrať).
// Zverejní:
//   hra.mosty.vyska(x, z, y) → výška mostovky, ak je bod na moste a výška y je blízko nej (hráč alebo auto ide
//                              po moste), inak null – pod mostom ostáva terén
// Používa ho js/chodec/hrac.js a js/auto/auto.js (jeden riadok, bez modulu sa správajú ako predtým).

import { vyskaNaMoste } from './nadjazdy.js';

const BUNKA = 64;

export default {
  nazov: 'nadjazdy',
  poradie: 6,

  init(hra) {
    this.dlazdice = new Map();   // kluc → profily
    this.mriezka = new Map();    // "i,j" → [profil]
    const pridaj = (kluc, objekt) => {
      const pr = objekt?.userData?.nadjazdy;
      if (pr?.length) this.dlazdice.set(kluc, pr); else this.dlazdice.delete(kluc);
      this.preindexuj();
    };
    for (const [kluc, a] of hra.mapa?.dlazdice?.aktivne ?? []) if (a.uroven === 'detail') pridaj(kluc, a.objekt);
    hra.na('dlazdica-nacitana', ({ kluc, uroven, objekt }) => { if (uroven === 'detail') pridaj(kluc, objekt); else { this.dlazdice.delete(kluc); this.preindexuj(); } });
    hra.na('dlazdica-uvolnena', ({ kluc, nahrada }) => { if (!nahrada) { this.dlazdice.delete(kluc); this.preindexuj(); } });
    // pochôdzne plochy mimo dlaždíc (napr. lávky a schodiská Átriakov, js/mapa/atriaky/): rovnaký tvar profilov
    hra.na('pochodzne-plochy', ({ kluc, profily }) => {
      if (profily?.length) this.dlazdice.set(`plochy:${kluc}`, profily); else this.dlazdice.delete(`plochy:${kluc}`);
      this.preindexuj();
    });
    hra.mosty = { vyska: (x, z, y) => this.vyska(x, z, y) };
  },

  /** Mriežka profilov podľa obálky osi (rýchle hľadanie mosta pod bodom). */
  preindexuj() {
    this.mriezka.clear();
    for (const profily of this.dlazdice.values()) {
      for (const pr of profily) {
        let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
        for (const p of pr.body) { x0 = Math.min(x0, p.x); x1 = Math.max(x1, p.x); z0 = Math.min(z0, p.z); z1 = Math.max(z1, p.z); }
        const r = pr.sirka / 2 + 1;
        for (let i = Math.floor((x0 - r) / BUNKA); i <= Math.floor((x1 + r) / BUNKA); i++) {
          for (let j = Math.floor((z0 - r) / BUNKA); j <= Math.floor((z1 + r) / BUNKA); j++) {
            const k = `${i},${j}`;
            if (!this.mriezka.has(k)) this.mriezka.set(k, []);
            this.mriezka.get(k).push(pr);
          }
        }
      }
    }
  },

  vyska(x, z, y) {
    const zoznam = this.mriezka.get(`${Math.floor(x / BUNKA)},${Math.floor(z / BUNKA)}`);
    if (!zoznam) return null;
    let naj = null;
    for (const pr of zoznam) {
      const h = vyskaNaMoste(pr, x, z);
      if (h === null) continue;
      // na most sa vychádza zo zeme pri konci (rampa), spod mosta sa naň nedá „vyskočiť“
      if (y < h - 1.6 || y > h + 4) continue;
      if (naj === null || Math.abs(h - y) < Math.abs(naj - y)) naj = h;
    }
    return naj;
  },
};
