// Sieť ciest pre NPC premávku – skladá sa za behu z ciest načítaných podrobných dlaždíc mesta.
// Každý úsek lomenej čiary cesty = jedna smerová hrana (pri obojsmernej ceste dve).
// Uzly sa spájajú podľa súradníc (cesty na hranici dlaždíc zdieľajú body).

// typy ciest, po ktorých jazdia autá, a hustota premávky (m dĺžky pruhu na jedno auto)
export const HUSTOTA = {
  motorway: 40, trunk: 26, primary: 20, secondary: 22, tertiary: 30,
  motorway_link: 50, trunk_link: 40, primary_link: 35, secondary_link: 40, tertiary_link: 50,
  unclassified: 55, residential: 60, living_street: 150,
};
const SIRKA_PRUHU = 3.3;

const klucBodu = (x, z) => `${Math.round(x * 10)},${Math.round(z * 10)}`;

export class SietCiest {
  constructor() {
    this.uzly = new Map();      // kľúč → { x, z, von: [hrana], dnu: [hrana], ramena, polomer, rezervacia }
    this.dlazdice = new Map();  // kľúč dlaždice → [hrany]
    this.hrany = new Set();
  }

  _uzol(x, z) {
    const k = klucBodu(x, z);
    let u = this.uzly.get(k);
    if (!u) { u = { k, x, z, von: [], dnu: [], ramena: 0, polomer: 0, rezervacia: null, rezDo: 0 }; this.uzly.set(k, u); }
    return u;
  }

  pridajDlazdicu(kluc, cesty) {
    if (this.dlazdice.has(kluc)) this.odoberDlazdicu(kluc);
    const hrany = [];
    for (const c of cesty ?? []) {
      const hustota = HUSTOTA[c.typ];
      if (!hustota || c.body.length < 2) continue;
      const spolu = Math.max(1, c.pruhy ?? 2);
      const pruhy = c.jednosmerka ? spolu : Math.max(1, Math.floor(spolu / 2));
      const sirkaPruhu = Math.min(SIRKA_PRUHU, (c.sirka ?? 7) / (c.jednosmerka ? spolu : Math.max(2, spolu)));
      // posun stredu pruhu i doprava od osi cesty
      const posuny = [];
      for (let i = 0; i < pruhy; i++) {
        posuny.push(c.jednosmerka ? (i + 0.5) * sirkaPruhu - (pruhy * sirkaPruhu) / 2 : (i + 0.5) * sirkaPruhu);
      }
      const max = Math.min(c.max ?? 50, 90) / 3.6;
      for (let i = 0; i < c.body.length - 1; i++) {
        const [ax, az] = c.body[i], [bx, bz] = c.body[i + 1];
        const dlzka = Math.hypot(bx - ax, bz - az);
        if (dlzka < 0.05) continue;
        const A = this._uzol(ax, az), B = this._uzol(bx, bz);
        A.ramena++; B.ramena++;
        A.polomer = Math.max(A.polomer, (c.sirka ?? 7) / 2);
        B.polomer = Math.max(B.polomer, (c.sirka ?? 7) / 2);
        // nadjazd = cesta leží na mostovke nadjazdu (tools/mesto/nadjazdy.mjs) – auto ide po mostovke (vyska-vozidla.js)
        const spolocne = { typ: c.typ, hustota, pruhy, posuny, max, dlazdica: kluc, sirka: c.sirka ?? 7, nadjazd: !!c.nadjazd };
        const smery = c.jednosmerka ? [[A, B]] : [[A, B], [B, A]];
        for (const [u, v] of smery) {
          const h = {
            ...spolocne, a: u, b: v, dlzka,
            ux: (v.x - u.x) / dlzka, uz: (v.z - u.z) / dlzka,
            auta: [], zmazana: false,
          };
          u.von.push(h); v.dnu.push(h);
          hrany.push(h);
          this.hrany.add(h);
        }
      }
    }
    // spätné hrany (na zákaz otáčania sa na mieste)
    for (const h of hrany) h.spatna = h.b.von.find((x) => x.b === h.a) ?? null;
    this.dlazdice.set(kluc, hrany);
  }

  odoberDlazdicu(kluc) {
    const hrany = this.dlazdice.get(kluc);
    if (!hrany) return;
    for (const h of hrany) {
      h.zmazana = true;
      this.hrany.delete(h);
      h.a.von.splice(h.a.von.indexOf(h), 1);
      h.b.dnu.splice(h.b.dnu.indexOf(h), 1);
      h.a.ramena--; h.b.ramena--;
      for (const u of [h.a, h.b]) if (!u.von.length && !u.dnu.length) this.uzly.delete(u.k);
    }
    this.dlazdice.delete(kluc);
  }
}

/** Je uzol križovatka (aspoň 3 ramená)? */
export const jeKrizovatka = (u) => u.ramena >= 3;
