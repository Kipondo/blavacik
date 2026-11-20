// Načítanie dát MHD (data/mhd/). Trasy a poriadky liniek sa načítavajú až keď treba (lenivo).

const KOREN = 'data/mhd/';
const json = (cesta) => fetch(KOREN + cesta).then((r) => {
  if (!r.ok) throw new Error(`MHD: nepodarilo sa načítať ${cesta}`);
  return r.json();
});

export class DataMhd {
  constructor(index, zastavky) {
    this.index = index;                       // linky, kalendár, zdroj, licencia
    this.zastavky = zastavky;                 // [{ id, nazov, pasmo, nastupistia: [...] }]
    this.linky = new Map(index.linky.map((l) => [l.linka, l]));
    this.nastupistia = new Map();             // id nástupišťa → { ...nástupište, zastavka }
    for (const z of zastavky) for (const n of z.nastupistia) this.nastupistia.set(n.id, { ...n, zastavka: z });
    this._trasy = new Map();
    this._poriadky = new Map();
  }

  static async nacitaj() {
    const [index, z] = await Promise.all([json('index.json'), json('zastavky.json')]);
    return new DataMhd(index, z.zastavky);
  }

  /** Trasy linky (geometria po cestách/koľajach, poradie zastávok, km). */
  trasy(linka) {
    const l = this.linky.get(linka);
    if (!l) return Promise.resolve(null);
    if (!this._trasy.has(linka)) this._trasy.set(linka, json(`trasy/${l.subor}.json`));
    return this._trasy.get(linka);
  }

  /**
   * Trasy aj poriadok linky, ak sú už načítané; inak spustí načítanie a vráti null.
   * (Synchrónne – pre výpočty v každom snímku.)
   */
  nacitane(linka) {
    if (!this._hotove) this._hotove = new Map();
    const h = this._hotove.get(linka);
    if (h) return h;
    if (!this._hotove.has(linka)) {
      this._hotove.set(linka, null);
      Promise.all([this.trasy(linka), this.poriadok(linka)]).then(([trasy, poriadok]) => {
        if (trasy && poriadok) this._hotove.set(linka, { trasy, poriadok });
      });
    }
    return null;
  }

  /** Cestovný poriadok linky (spoje, jazdné doby, ciele). */
  poriadok(linka) {
    const l = this.linky.get(linka);
    if (!l) return Promise.resolve(null);
    if (!this._poriadky.has(linka)) this._poriadky.set(linka, json(`poriadky/${l.subor}.json`));
    return this._poriadky.get(linka);
  }
}
