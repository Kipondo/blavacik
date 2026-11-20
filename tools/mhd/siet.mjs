// Dopravné siete z dlaždíc mapy (len čítanie data/mapa/mesto/d/*.json):
//   - koľajová sieť električiek (kolajnice typ 'elektricka'),
//   - cestná sieť pre autobusy a trolejbusy (cesty, s ohľadom na jednosmerky).
// Každý bod lomenej čiary je uzol; body na rovnakom mieste (križovatky, okraje dlaždíc) sa zlúčia.
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DLAZDICE } from './spolocne.mjs';

// Násobok ceny podľa typu cesty – autobus uprednostní hlavné cesty pred obslužnými
const CENA_CESTY = {
  motorway: 0.9, motorway_link: 1, trunk: 0.9, trunk_link: 1, primary: 1, primary_link: 1,
  secondary: 1, secondary_link: 1, tertiary: 1.05, tertiary_link: 1.05, unclassified: 1.2,
  residential: 1.2, living_street: 1.8, service: 2.5,
};
const PROTI_JEDNOSMERKE = 8; // jazda proti jednosmerke (výnimky pre MHD v OSM sa v mape nezachovali)

/** Načíta cesty a koľaje zo všetkých dlaždíc. */
export function nacitajDlazdice() {
  const cesty = [], kolaje = [];
  for (const subor of readdirSync(DLAZDICE)) {
    if (!subor.endsWith('.json')) continue;
    const d = JSON.parse(readFileSync(join(DLAZDICE, subor), 'utf8'));
    for (const c of d.cesty ?? []) {
      cesty.push(c);
      // Koľaje na ceste (napr. spoločný koridor električky a autobusov v Petržalke)
      if (c.elektricka) kolaje.push({ typ: 'elektricka', naCeste: true, body: c.body });
    }
    for (const k of d.kolajnice ?? []) if (k.typ === 'elektricka') kolaje.push(k);
  }
  return { cesty, kolaje };
}

/** Graf: uzly (x, z) a hrany so vzdialenosťou a cenou v oboch smeroch. */
export class Siet {
  constructor() {
    this.x = []; this.z = [];
    this.susedia = [];          // uzol → [[cieľ, dĺžka, cena], …]
    this.useky = [];            // [a, b] – pre hľadanie najbližšieho úseku
    this.kluce = new Map();
    this.mriezka = new Map();   // bunka 40 m → indexy úsekov
  }

  uzol(x, z) {
    const k = `${Math.round(x * 2)},${Math.round(z * 2)}`; // zlúčenie bodov bližších ako ~0,5 m
    let i = this.kluce.get(k);
    if (i === undefined) {
      i = this.x.length;
      this.kluce.set(k, i);
      this.x.push(x); this.z.push(z); this.susedia.push([]);
    }
    return i;
  }

  /** Pridá lomenú čiaru. cenaTam/cenaSpat = násobok dĺžky (Infinity = zakázané). */
  pridajCiaru(body, cenaTam = 1, cenaSpat = 1) {
    let a = this.uzol(body[0][0], body[0][1]);
    for (let i = 1; i < body.length; i++) {
      const b = this.uzol(body[i][0], body[i][1]);
      if (a === b) continue;
      const d = Math.hypot(this.x[b] - this.x[a], this.z[b] - this.z[a]);
      if (cenaTam < Infinity) this.susedia[a].push([b, d, d * cenaTam]);
      if (cenaSpat < Infinity) this.susedia[b].push([a, d, d * cenaSpat]);
      this._doMriezky(this.useky.length, a, b);
      this.useky.push([a, b, cenaTam, cenaSpat]);
      a = b;
    }
  }

  _doMriezky(u, a, b) {
    const x0 = Math.floor(Math.min(this.x[a], this.x[b]) / 40), x1 = Math.floor(Math.max(this.x[a], this.x[b]) / 40);
    const z0 = Math.floor(Math.min(this.z[a], this.z[b]) / 40), z1 = Math.floor(Math.max(this.z[a], this.z[b]) / 40);
    for (let i = x0; i <= x1; i++) for (let j = z0; j <= z1; j++) {
      const k = `${i},${j}`;
      if (!this.mriezka.has(k)) this.mriezka.set(k, []);
      this.mriezka.get(k).push(u);
    }
  }

  /** Najbližšie úseky k bodu (najviac `pocet`, do vzdialenosti `max` m), každý úsek inej čiary/smeru. */
  najblizsie(x, z, max = 40, pocet = 3) {
    const kandidati = new Map();
    const r = Math.ceil(max / 40);
    const ci = Math.floor(x / 40), cj = Math.floor(z / 40);
    for (let i = ci - r; i <= ci + r; i++) for (let j = cj - r; j <= cj + r; j++) {
      for (const u of this.mriezka.get(`${i},${j}`) ?? []) {
        if (kandidati.has(u)) continue;
        const [a, b] = this.useky[u];
        const dx = this.x[b] - this.x[a], dz = this.z[b] - this.z[a];
        const l2 = dx * dx + dz * dz || 1;
        const t = Math.max(0, Math.min(1, ((x - this.x[a]) * dx + (z - this.z[a]) * dz) / l2));
        const px = this.x[a] + dx * t, pz = this.z[a] + dz * t;
        const d = Math.hypot(x - px, z - pz);
        if (d <= max) kandidati.set(u, { u, a, b, t, x: px, z: pz, d, smer: Math.atan2(dx, dz) });
      }
    }
    const zoradene = [...kandidati.values()].sort((p, q) => p.d - q.d);
    // Vyber rôzne smery (napr. hlavná cesta vs. bočná ulica), nie susedné úseky tej istej čiary
    const vyber = [];
    for (const k of zoradene) {
      if (vyber.some((v) => Math.abs(Math.sin(v.smer - k.smer)) < 0.35 && Math.hypot(v.x - k.x, v.z - k.z) < 15)) continue;
      vyber.push(k);
      if (vyber.length >= pocet) break;
    }
    return vyber;
  }
}

/**
 * Opraví prerušenia siete: zjednodušenie čiar v mape zmaže uzly v strede úsekov (výhybky,
 * napojenia ulíc), takže koniec jednej čiary „visí“ kúsok vedľa druhej.
 *   - koniec do maxT m od iného úseku → úsek sa rozdelí a koniec sa naň napojí (T-spoj),
 *   - inak koniec do maxK m od iného konca → spoja sa priamo (krátka medzera).
 */
Siet.prototype.spojKonce = function (maxT = 3, maxK = 25) {
  const stupen = (i) => new Set(this.susedia[i].map((e) => e[0])).size;
  const konce = [];
  for (let i = 0; i < this.x.length; i++) if (stupen(i) === 1) konce.push(i);
  let tSpoje = 0, medzery = 0;
  const volne = [];
  for (const i of konce) {
    const sused = this.susedia[i][0][0];
    const k = this.najblizsie(this.x[i], this.z[i], maxT, 6).find((p) => p.a !== i && p.b !== i && p.a !== sused && p.b !== sused);
    if (!k) { volne.push(i); continue; }
    const [, , tam, spat] = this.useky[k.u];
    const p = this.uzol(k.x, k.z);
    const dA = Math.hypot(k.x - this.x[k.a], k.z - this.z[k.a]), dB = Math.hypot(this.x[k.b] - k.x, this.z[k.b] - k.z);
    if (tam < Infinity) { this.susedia[k.a].push([p, dA, dA * tam]); this.susedia[p].push([k.b, dB, dB * tam]); }
    if (spat < Infinity) { this.susedia[k.b].push([p, dB, dB * spat]); this.susedia[p].push([k.a, dA, dA * spat]); }
    if (p !== i) { this.susedia[i].push([p, k.d, k.d]); this.susedia[p].push([i, k.d, k.d]); }
    tSpoje++;
  }
  const bunka = (x, z) => `${Math.floor(x / maxK)},${Math.floor(z / maxK)}`;
  const mriezka = new Map();
  for (const i of volne) {
    const k = bunka(this.x[i], this.z[i]);
    if (!mriezka.has(k)) mriezka.set(k, []);
    mriezka.get(k).push(i);
  }
  for (const i of volne) {
    let naj = maxK, j = -1;
    const ci = Math.floor(this.x[i] / maxK), cj = Math.floor(this.z[i] / maxK);
    const blizke = [];
    for (let a = ci - 1; a <= ci + 1; a++) for (let b = cj - 1; b <= cj + 1; b++) blizke.push(...(mriezka.get(`${a},${b}`) ?? []));
    for (const m of blizke) {
      if (m === i) continue;
      const d = Math.hypot(this.x[i] - this.x[m], this.z[i] - this.z[m]);
      if (d < naj) { naj = d; j = m; }
    }
    if (j >= 0 && !this.susedia[i].some((e) => e[0] === j)) {
      this.susedia[i].push([j, naj, naj * 1.5]); this.susedia[j].push([i, naj, naj * 1.5]);
      medzery++;
    }
  }
  return { konce: konce.length, tSpoje, medzery };
};

/** Koľajová sieť električiek (koľaje sú obojsmerné). */
export function sietElektriciek(kolaje) {
  const s = new Siet();
  for (const k of kolaje) s.pridajCiaru(k.body, 1, 1);
  s.oprava = s.spojKonce(3, 30);
  return s;
}

/** Cestná sieť pre autobusy a trolejbusy. */
export function sietCiest(cesty) {
  const s = new Siet();
  for (const c of cesty) {
    const f = CENA_CESTY[c.typ] ?? 1.5;
    s.pridajCiaru(c.body, f, c.jednosmerka ? f * PROTI_JEDNOSMERKE : f);
  }
  s.oprava = s.spojKonce(2, 8);
  return s;
}
