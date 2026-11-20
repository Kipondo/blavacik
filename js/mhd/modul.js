// Modul MHD – mestská hromadná doprava Bratislavy podľa skutočného cestovného poriadku (GTFS).
// Etapa a): dáta + zastávky na mape (prístrešky, označníky, tabule odchodov).
//
// Pre ostatné moduly zverejňuje hra.mhd:
//   hra.mhd.data                     – zastávky, linky, kalendár; data.trasy(linka), data.poriadok(linka)
//   hra.mhd.teraz()                  – herný dátum a čas, podľa ktorého jazdí MHD
//   hra.mhd.najblizsiaZastavka(x, z, max) → nástupište alebo null
//   hra.mhd.odchody(idNastupista, pocet)  → Promise([{ linka, typ, ciel, cas, znamenie }])
//   hra.mhd.typDna()                 – 'pracovny' | 'prazdniny' | 'sobota' | 'nedela'
// Herný čas: ak iný modul zapisuje hra.stav.datumCas (Date), MHD sa riadi ním (pozri js/mhd/cas.js).
import { DataMhd } from './data.js';
import { HodinyMhd } from './cas.js';
import { SpravaZastavok } from './zastavky/sprava.js';
import { najblizsieOdchody } from './odchody.js';
import { typDna } from './kalendar.js';

export default {
  nazov: 'mhd',
  poradie: 60,

  async init(hra) {
    const data = await DataMhd.nacitaj();
    const hodiny = new HodinyMhd();
    this.hodiny = hodiny;
    this.zastavky = new SpravaZastavok(hra, data, hodiny);
    hra.mhd = {
      data,
      teraz: () => hodiny.teraz(hra),
      najblizsiaZastavka: (x, z, max) => this.zastavky.najblizsie(x, z, max),
      odchody: (id, pocet = 6) => najblizsieOdchody(data, id, hodiny.teraz(hra), pocet),
      typDna: () => typDna(data.index, hodiny.teraz(hra)),
    };
    console.info(`MHD: ${data.index.linky.length} liniek, ${data.zastavky.length} zastávok (${data.index.zdroj}, ${data.index.licencia})`);
  },

  update(dt, hra) {
    this.hodiny?.update(dt, hra);
    this.zastavky?.update(dt);
  },
};
