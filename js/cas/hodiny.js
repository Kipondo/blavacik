// Herné hodiny: jeden spoločný čas pre celú hru (MHD, deň/noc, misie…).
//
// Čas beží 1:1, keď je nablízku niečo, čo musí ísť v skutočnom čase (spoj MHD, zastávka, misia).
// Inak sa plynulo zrýchľuje až na MAX_RYCHLOST. Moduly to hlásia každý snímok:
//   hra.hodiny.blizko('mhd', 120)    // najbližší spoj je 120 m od hráča
//   hra.hodiny.blizko('misia', 0)    // napr. počas dialógu → vždy normálny čas
// Keď nikto nič nenahlási, čas beží najrýchlejšie.
import { NASTAVENIA_CASU as N } from './nastavenia.js';

/** Cieľová rýchlosť času podľa vzdialenosti (m). */
export function rychlostPodlaVzdialenosti(d) {
  const f = Math.min(1, Math.max(0, (d - N.BLIZKO) / (N.DALEKO - N.BLIZKO)));
  return 1 + (N.MAX_RYCHLOST - 1) * f;
}

export class Hodiny {
  constructor(hra) {
    this.hra = hra;
    const d = new Date();
    d.setHours(N.START_HODINA, N.START_MINUTA, 0, 0);
    this.ms = d.getTime();           // herný čas (ms od 1970, miestny čas prehliadača)
    this.rychlost = 1;               // aktuálna rýchlosť (×)
    this.hlasenia = new Map();       // kto → vzdialenosť (m), platí jeden snímok
    this.dovody = '';                // kto drží čas (na ladenie)
    this.zapis();
  }

  /** Modul hlási vzdialenosť k najbližšej veci, ktorá potrebuje skutočný čas. */
  blizko(kto, metre) {
    const p = this.hlasenia.get(kto);
    if (p === undefined || metre < p) this.hlasenia.set(kto, metre);
  }

  update(dt) {
    let d = Infinity, kto = '';
    for (const [k, m] of this.hlasenia) if (m < d) { d = m; kto = k; }
    this.hlasenia.clear();
    const ciel = rychlostPodlaVzdialenosti(d);
    // Plynulé priblíženie k cieľu; spomalenie je rýchlejšie ako zrýchlenie (aby spoj neprišiel „zrýchlený“)
    const k = ciel < this.rychlost ? 3 : 1;
    this.rychlost += (ciel - this.rychlost) * Math.min(1, (dt * k) / N.PLYNULOST);
    if (Math.abs(this.rychlost - ciel) < 0.01) this.rychlost = ciel;
    this.dovody = d < N.DALEKO ? kto : '';
    this.ms += dt * 1000 * this.rychlost;
    this.zapis();
  }

  zapis() {
    this.hra.stav.datumCas = new Date(this.ms);
    this.hra.stav.rychlostCasu = this.rychlost;
  }

  /** Aktuálny herný čas (Date). */
  teraz() {
    return new Date(this.ms);
  }

  /**
   * Preskočí čas: o počet sekúnd (číslo) alebo na najbližší daný čas ({ hodina, minuta }).
   * Pošle udalosť 'casPreskoceny' { od, do } – moduly si podľa nej prepočítajú stav (napr. polohy spojov).
   */
  preskoc(kam) {
    const od = this.teraz();
    if (typeof kam === 'number') this.ms += kam * 1000;
    else {
      const ciel = new Date(this.ms);
      ciel.setHours(kam.hodina ?? 0, kam.minuta ?? 0, 0, 0);
      if (ciel.getTime() <= this.ms) ciel.setDate(ciel.getDate() + 1); // zajtra
      this.ms = ciel.getTime();
    }
    this.rychlost = 1;
    this.zapis();
    this.hra.posli('casPreskoceny', { od, do: this.teraz() });
  }

  /** Nastaví presný dátum a čas (napr. začiatok kapitoly príbehu). */
  nastav(datum) {
    const od = this.teraz();
    this.ms = new Date(datum).getTime();
    this.zapis();
    this.hra.posli('casPreskoceny', { od, do: this.teraz() });
  }
}
