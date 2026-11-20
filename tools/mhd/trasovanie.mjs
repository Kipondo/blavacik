// Trasa linky po skutočných cestách / koľajach.
// Zastávky v poradí → pre každú až 3 kandidáti prichytenia na sieť → Viterbi vyberie
// kombináciu s najlacnejšou celkovou cestou (aby autobus „nepreskočil“ na bočnú ulicu).
import { najdiCestu } from './hladanie.mjs';

const POKUTA_ODSTUPU = 3; // cena za každý meter, o ktorý je nástupište ďalej od cesty

export class Trasovac {
  constructor(siet, maxOdstup) {
    this.siet = siet;
    this.maxOdstup = maxOdstup;
    this.kandidati = new Map(); // id nástupišťa → kandidáti
    this.cesty = new Map();     // kľúč dvojice kandidátov → cesta
    this.nahradne = 0;          // počet úsekov bez cesty v sieti (priamka)
    this.chyby = new Map();     // "A → B" → počet úsekov bez spojenia v mape (na kontrolu)
    this.useky = 0;
    this.tvarom = 0;            // úseky doplnené tvarom z GTFS
  }

  kandidatiPre(z) {
    if (!this.kandidati.has(z.id)) {
      let k = this.siet.najblizsie(z.x, z.z, this.maxOdstup, 3);
      if (!k.length) k = this.siet.najblizsie(z.x, z.z, this.maxOdstup * 2.5, 1);
      this.kandidati.set(z.id, k);
    }
    return this.kandidati.get(z.id);
  }

  cesta(zA, iA, kA, zB, iB, kB) {
    const kluc = `${zA.id}#${iA}>${zB.id}#${iB}`;
    if (!this.cesty.has(kluc)) {
      const priamo = Math.hypot(kB.x - kA.x, kB.z - kA.z);
      let c = najdiCestu(this.siet, kA, kB, priamo * 4 + 3000);
      // Nezmyselná obchádzka = v sieti chýba spojenie
      if (c && c.dlzka > priamo * 3 + 600) c = null;
      this.cesty.set(kluc, c);
    }
    return this.cesty.get(kluc);
  }

  /** Kus GTFS tvaru medzi bodmi A a B (náhrada tam, kde v mape chýba spojenie – napr. tunel). */
  kusTvaru(tvar, A, B, odIndexu) {
    if (!tvar || tvar.length < 2) return null;
    const najblizsi = (p, od) => {
      let naj = Infinity, idx = od;
      for (let i = od; i < tvar.length; i++) {
        const d = Math.hypot(tvar[i][0] - p.x, tvar[i][1] - p.z);
        if (d < naj) { naj = d; idx = i; }
      }
      return [idx, naj];
    };
    const [iA, dA] = najblizsi(A, odIndexu);
    const [iB, dB] = najblizsi(B, iA);
    if (dA > 80 || dB > 80 || iB <= iA) return null;
    return { body: tvar.slice(iA, iB + 1), koniec: iB };
  }

  /** zastavky: [{id, x, z}] → { body, indexy (index bodu každej zastávky v body), bodyZastavok } */
  trasuj(zastavky, tvar = null) {
    const n = zastavky.length;
    const kand = zastavky.map((z) => {
      const k = this.kandidatiPre(z);
      // Bez siete v okolí: nástupište samo osebe ako „kandidát“
      return k.length ? k : [{ u: -1, x: z.x, z: z.z, d: 0, smer: 0 }];
    });
    // Viterbi
    const cena = [kand[0].map((k) => k.d * POKUTA_ODSTUPU)];
    const spat = [kand[0].map(() => -1)];
    for (let i = 1; i < n; i++) {
      cena.push([]); spat.push([]);
      kand[i].forEach((kB, jB) => {
        let naj = Infinity, odkial = 0;
        kand[i - 1].forEach((kA, jA) => {
          const c = kA.u < 0 || kB.u < 0 ? null : this.cesta(zastavky[i - 1], jA, kA, zastavky[i], jB, kB);
          const hodnota = cena[i - 1][jA] + (c ? c.cena : Math.hypot(kB.x - kA.x, kB.z - kA.z) * 50);
          if (hodnota < naj) { naj = hodnota; odkial = jA; }
        });
        cena[i].push(naj + kB.d * POKUTA_ODSTUPU);
        spat[i].push(odkial);
      });
    }
    // Spätný priechod
    const volba = new Array(n);
    volba[n - 1] = cena[n - 1].indexOf(Math.min(...cena[n - 1]));
    for (let i = n - 1; i > 0; i--) volba[i - 1] = spat[i][volba[i]];

    const body = [], indexy = [], bodyZastavok = [];
    const pridaj = (p) => {
      const posl = body[body.length - 1];
      if (posl && Math.hypot(p[0] - posl[0], p[1] - posl[1]) < 0.05) return;
      body.push(p);
    };
    let indexTvaru = 0;
    for (let i = 0; i < n; i++) {
      const k = kand[i][volba[i]];
      if (i === 0) pridaj([k.x, k.z]);
      else {
        const kA = kand[i - 1][volba[i - 1]];
        const c = kA.u < 0 || k.u < 0 ? null : this.cesta(zastavky[i - 1], volba[i - 1], kA, zastavky[i], volba[i], k);
        this.useky++;
        if (c) for (const p of c.body) pridaj(p);
        else {
          const kus = this.kusTvaru(tvar, kA, k, indexTvaru);
          const kluc = `${zastavky[i - 1].nazov} → ${zastavky[i].nazov}`;
          this.chyby.set(kluc, (this.chyby.get(kluc) ?? 0) + 1);
          if (kus) {
            this.tvarom++; indexTvaru = kus.koniec;
            for (const p of kus.body) pridaj(p);
          } else {
            this.nahradne++;
          }
          pridaj([k.x, k.z]);
        }
      }
      indexy.push(body.length - 1);
      bodyZastavok.push(k);
    }
    return { body, indexy, bodyZastavok };
  }
}
