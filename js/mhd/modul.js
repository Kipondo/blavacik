// Modul MHD – mestská hromadná doprava Bratislavy podľa skutočného cestovného poriadku (GTFS).
// Etapa a): dáta + zastávky na mape (prístrešky, označníky, tabule odchodov).
//
// Pre ostatné moduly zverejňuje hra.mhd:
//   hra.mhd.data                     – zastávky, linky, kalendár; data.trasy(linka), data.poriadok(linka)
//   hra.mhd.teraz()                  – herný dátum a čas, podľa ktorého jazdí MHD
//   hra.mhd.najblizsiaZastavka(x, z, max) → nástupište alebo null
//   hra.mhd.odchody(idNastupista, pocet)  → Promise([{ linka, typ, ciel, cas, znamenie }])
//   hra.mhd.typDna()                 – 'pracovny' | 'prazdniny' | 'sobota' | 'nedela'
//   hra.mhd.spojeNablizku            – spoje na ceste v okolí hráča [{ linka, typ, ciel, x, z, dx, dz, km, … }]
// Herným hodinám (hra.hodiny) hlási vzdialenosť najbližšieho spoja – pri MHD beží čas 1:1.
// Herný čas: ak iný modul zapisuje hra.stav.datumCas (Date), MHD sa riadi ním (pozri js/mhd/cas.js).
import { DataMhd } from './data.js';
import { HodinyMhd } from './cas.js';
import { SpravaZastavok } from './zastavky/sprava.js';
import { najblizsieOdchody } from './odchody.js';
import { typDna } from './kalendar.js';
import { PolohySpojov } from './spoje/polohy.js';

const OKOLIE_LINIEK = 1500; // m – linky so zastávkou v tomto okolí sa počítajú
const OBNOVA_SPOJOV = 0.25; // s

export default {
  nazov: 'mhd',
  poradie: 60,

  async init(hra) {
    const data = await DataMhd.nacitaj();
    const hodiny = new HodinyMhd();
    this.hodiny = hodiny;
    this.zastavky = new SpravaZastavok(hra, data, hodiny);
    this.polohy = new PolohySpojov(data);
    this.najblizsiSpoj = Infinity;
    this.dalsiaObnova = 0;
    hra.mhd = {
      data,
      teraz: () => hodiny.teraz(hra),
      najblizsiaZastavka: (x, z, max) => this.zastavky.najblizsie(x, z, max),
      odchody: (id, pocet = 6) => najblizsieOdchody(data, id, hodiny.teraz(hra), pocet),
      typDna: () => typDna(data.index, hodiny.teraz(hra)),
      spojeNablizku: [],
    };
    console.info(`MHD: ${data.index.linky.length} liniek, ${data.zastavky.length} zastávok (${data.index.zdroj}, ${data.index.licencia})`);
  },

  update(dt, hra) {
    this.hodiny?.update(dt, hra);
    this.zastavky?.update(dt);
    if (!this.polohy) return;
    this.dalsiaObnova -= dt;
    if (this.dalsiaObnova <= 0) {
      this.dalsiaObnova = OBNOVA_SPOJOV;
      this.obnovSpoje(hra);
    }
    hra.hodiny?.blizko('mhd', this.najblizsiSpoj);
  },

  /** Spoje na ceste v okolí hráča (podľa poriadku) a vzdialenosť najbližšieho. */
  obnovSpoje(hra) {
    const { x, z } = hra.stav.pozicia;
    const linky = new Set();
    for (const n of this.zastavky.vOkoli(x, z, OKOLIE_LINIEK)) for (const l of n.linky) linky.add(l);
    const spoje = this.polohy.naCeste(linky, this.hodiny.teraz(hra));
    let naj = Infinity;
    for (const s of spoje) {
      s.vzdialenost = Math.hypot(s.x - x, s.z - z);
      if (s.vzdialenost < naj) naj = s.vzdialenost;
    }
    this.najblizsiSpoj = naj;
    hra.mhd.spojeNablizku = spoje;
  },
};
