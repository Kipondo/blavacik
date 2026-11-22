// Kolízie s budovami, pamiatkami a stromami.
// Prekážky sú polygóny (pôdorysy) alebo kruhy, uložené v priestorovej mriežke.
//
//   kolizie.pridajPolygon(body)       – pôdorys [[x,z], ...]
//   kolizie.pridajObdlznik(x,z,w,d,u) – otočený obdĺžnik
//   kolizie.pridajKruh(x, z, r)
//   kolizie.vytlac(x, z, r, y) → { x, z, nx, nz, zasah } – posunie kruh von z prekážok
// Prekážka môže mať výškový rozsah info.vyska = [od, do] (zábradlie lávky, dom s terasou): platí len pre toho,
// kto je v tej výške (y = výška chodidiel, postava ~1,8 m) – tak sa dá prejsť pod lávkou a chodiť po terase.
// Bez y (autá, NPC) platí len taká, ktorá siaha až po zem (info.zem = true), ostatné sa preskočia.

import { bodVPolygone, najblizsiNaUsecke, ohranicenie, obdlznik } from './geometria.js';

export class Kolizie {
  constructor(velkostBunky = 40) {
    this.bunka = velkostBunky;
    this.mriezka = new Map();
    this.skupiny = new Map();
  }

  _kluc(i, j) { return i * 100003 + j; }

  _vloz(p) {
    const i0 = Math.floor(p.minX / this.bunka), i1 = Math.floor(p.maxX / this.bunka);
    const j0 = Math.floor(p.minZ / this.bunka), j1 = Math.floor(p.maxZ / this.bunka);
    for (let i = i0; i <= i1; i++) {
      for (let j = j0; j <= j1; j++) {
        const k = this._kluc(i, j);
        if (!this.mriezka.has(k)) this.mriezka.set(k, []);
        this.mriezka.get(k).push(p);
      }
    }
    // prekážky dlaždice sa dajú naraz odstrániť (streamovanie mesta)
    const sk = p.info?.dlazdica ?? '';
    if (!this.skupiny.has(sk)) this.skupiny.set(sk, []);
    this.skupiny.get(sk).push(p);
    return p;
  }

  /** Odstráni všetky prekážky, ktoré patria k dlaždici (info.dlazdica). */
  odstranDlazdicu(kluc) {
    const zoznam = this.skupiny.get(kluc);
    if (!zoznam) return;
    const zmazat = new Set(zoznam);
    const bunky = new Set();
    for (const p of zoznam) {
      for (let i = Math.floor(p.minX / this.bunka); i <= Math.floor(p.maxX / this.bunka); i++) {
        for (let j = Math.floor(p.minZ / this.bunka); j <= Math.floor(p.maxZ / this.bunka); j++) bunky.add(this._kluc(i, j));
      }
    }
    for (const b of bunky) {
      const z = this.mriezka.get(b);
      if (z) this.mriezka.set(b, z.filter((p) => !zmazat.has(p)));
    }
    this.skupiny.delete(kluc);
  }

  /** Pohľad na kolízie, ktorý všetko pridané označí ako súčasť dlaždice. */
  preDlazdicu(kluc) {
    const k = this;
    return {
      pridajPolygon: (b, info = {}) => k.pridajPolygon(b, { ...info, dlazdica: kluc }),
      pridajObdlznik: (x, z, w, d, u = 0, info = {}) => k.pridajObdlznik(x, z, w, d, u, { ...info, dlazdica: kluc }),
      pridajKruh: (x, z, r, info = {}) => k.pridajKruh(x, z, r, { ...info, dlazdica: kluc }),
      vytlac: (...a) => k.vytlac(...a),
      jeVolne: (...a) => k.jeVolne(...a),
    };
  }

  pridajPolygon(body, info = {}) {
    if (!body || body.length < 3) return null;
    return this._vloz({ typ: 'polygon', body, ...ohranicenie(body), info });
  }

  pridajObdlznik(x, z, sirka, hlbka, natocenie = 0, info = {}) {
    return this.pridajPolygon(obdlznik(x, z, sirka, hlbka, natocenie), info);
  }

  pridajKruh(x, z, r, info = {}) {
    return this._vloz({ typ: 'kruh', x, z, r, minX: x - r, maxX: x + r, minZ: z - r, maxZ: z + r, info });
  }

  /** Prekážky v okolí bodu. */
  vOkoli(x, z, r) {
    const vysledok = new Set();
    const i0 = Math.floor((x - r) / this.bunka), i1 = Math.floor((x + r) / this.bunka);
    const j0 = Math.floor((z - r) / this.bunka), j1 = Math.floor((z + r) / this.bunka);
    for (let i = i0; i <= i1; i++) {
      for (let j = j0; j <= j1; j++) {
        const zoznam = this.mriezka.get(this._kluc(i, j));
        if (zoznam) for (const p of zoznam) vysledok.add(p);
      }
    }
    return vysledok;
  }

  /**
   * Vytlačí kruh (x, z, r) von z prekážok.
   * Vracia novú polohu, normálu posledného nárazu a či vôbec došlo k nárazu.
   */
  vytlac(x, z, r, y) {
    let zasah = false, nx = 0, nz = 0;
    for (let opakovanie = 0; opakovanie < 3; opakovanie++) {
      let posunute = false;
      for (const p of this.vOkoli(x, z, r)) {
        if (x + r < p.minX || x - r > p.maxX || z + r < p.minZ || z - r > p.maxZ) continue;
        const v0 = p.info?.vyska;
        if (v0 && (y === undefined ? !p.info.zem : y > v0[1] - 0.35 || y + 1.8 < v0[0])) continue;
        const v = p.typ === 'kruh' ? vytlacZKruhu(x, z, r, p) : vytlacZPolygonu(x, z, r, p.body);
        if (v) {
          x += v.x; z += v.z;
          const d = Math.hypot(v.x, v.z) || 1;
          nx = v.x / d; nz = v.z / d;
          zasah = posunute = true;
        }
      }
      if (!posunute) break;
    }
    return { x, z, nx, nz, zasah };
  }

  /** Je miesto voľné? */
  jeVolne(x, z, r, y) {
    return !this.vytlac(x, z, r, y).zasah;
  }
}

function vytlacZKruhu(x, z, r, k) {
  const dx = x - k.x, dz = z - k.z;
  const d = Math.hypot(dx, dz);
  const min = r + k.r;
  if (d >= min) return null;
  if (d < 1e-6) return { x: min, z: 0 };
  return { x: (dx / d) * (min - d), z: (dz / d) * (min - d) };
}

function vytlacZPolygonu(x, z, r, body) {
  // najbližší bod na okraji polygónu
  let najlepsi = null;
  for (let i = 0, j = body.length - 1; i < body.length; j = i++) {
    const n = najblizsiNaUsecke(x, z, body[j][0], body[j][1], body[i][0], body[i][1]);
    if (!najlepsi || n.d2 < najlepsi.d2) najlepsi = n;
  }
  const vnutri = bodVPolygone(x, z, body);
  const d = Math.sqrt(najlepsi.d2);
  if (!vnutri && d >= r) return null;
  let dx = x - najlepsi.x, dz = z - najlepsi.z;
  if (d < 1e-6) return null;
  dx /= d; dz /= d;
  if (vnutri) {
    // sme vnútri – treba ísť na opačnú stranu okraja
    return { x: -dx * (d + r), z: -dz * (d + r) };
  }
  return { x: dx * (r - d), z: dz * (r - d) };
}
