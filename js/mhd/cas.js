// Herné hodiny pre MHD.
// Ak iný modul zverejní herný čas v hra.stav.datumCas (Date), MHD sa riadi ním.
// Inak MHD vedie vlastné hodiny: štart = skutočný miestny čas, plynú RYCHLOST × rýchlejšie.
// (Deň/noc a kalendár podľa dizajnu prídu neskôr – potom stačí, aby ich modul zapisoval do hra.stav.datumCas.)

export const RYCHLOST = 1; // 1 = herná sekunda za skutočnú sekundu

export class HodinyMhd {
  constructor() {
    this.vlastny = new Date();
  }

  update(dt, hra) {
    if (!(hra.stav.datumCas instanceof Date)) this.vlastny = new Date(this.vlastny.getTime() + dt * 1000 * RYCHLOST);
  }

  /** Aktuálny herný dátum a čas (Date). */
  teraz(hra) {
    return hra?.stav.datumCas instanceof Date ? hra.stav.datumCas : this.vlastny;
  }

  /** Posun času (napr. preskočenie jazdy) – len pri vlastných hodinách. */
  posun(sekundy) {
    this.vlastny = new Date(this.vlastny.getTime() + sekundy * 1000);
  }
}

/** Sekundy od polnoci daného dňa. */
export const sekundyDna = (d) => d.getHours() * 3600 + d.getMinutes() * 60 + d.getSeconds();

/** Sekundy → "H:MM". */
export const naHodiny = (s) => {
  const t = ((Math.floor(s / 60) % 1440) + 1440) % 1440;
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`;
};
