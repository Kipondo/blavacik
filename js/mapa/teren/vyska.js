// Výškopis: kopce, koryto Dunaja a mosty.
// Výška terénu sa predpočíta do mriežky (KONFIG.TEREN_KROK) a medzi bodmi sa interpoluje.
// Bez Three.js – dá sa použiť aj v nástrojoch.

import { bodVPolygone, ohranicenie, najblizsiNaUsecke } from '../geometria.js';

const plynulo = (t) => t * t * (3 - 2 * t);

/** Výška kopcov v bode (analyticky – hladké). */
function vyskaKopcov(x, z, kopce) {
  let h = 0;
  for (const k of kopce) {
    const d = Math.hypot(x - k.x, z - k.z);
    if (d >= k.polomer) continue;
    const plato = k.plato ?? 0.3;
    const t = Math.min(1, (k.polomer - d) / (k.polomer * (1 - plato)));
    h += k.vyska * plynulo(t);
  }
  return h;
}

/**
 * Vytvorí výškopis.
 * @param {object} data  zlúčené dáta mapy (kopce, voda, mosty, svahy)
 * @param {object} KONFIG
 */
export function vytvorVyskopis(data, KONFIG) {
  const H = KONFIG.HRANICE;
  const krok = KONFIG.TEREN_KROK;
  const sirka = Math.ceil((H.maxX - H.minX) / krok) + 1;
  const hlbka = Math.ceil((H.maxZ - H.minZ) / krok) + 1;
  const kopce = data.kopce ?? [];
  const svahy = data.svahy ?? [];
  // len rieky vyrezávajú koryto; fontány a jazierka sú len plochy na zemi
  const voda = (data.voda ?? []).filter((v) => v.reka !== false).map((v) => ({ ...v, ohr: ohranicenie(v.body) }));
  const mosty = (data.mosty ?? []).map(pripravMost);

  // 1) maska vody (1 = voda) – riadkové vypĺňanie polygónov (rýchle aj pre veľké polygóny)
  const maska = new Uint8Array(sirka * hlbka);
  for (const v of voda) vyplnPolygon(maska, sirka, hlbka, v.body, H, krok);
  // zúženie o 1 bunku: svah koryta je celý vo vode, nábrežný múr stojí presne na okraji
  const zuzena = maska.slice();
  for (let j = 1; j < hlbka - 1; j++) {
    for (let i = 1; i < sirka - 1; i++) {
      const k = j * sirka + i;
      if (maska[k] && !(maska[k - 1] && maska[k + 1] && maska[k - sirka] && maska[k + sirka])) zuzena[k] = 0;
    }
  }
  maska.set(zuzena);

  // 2) výšky: kopce + mierne svahy, koryto (strmé nábrežné múry = bez rozmazania)
  const dno = KONFIG.HLBKA_KORYTA;
  const mriezka = new Float32Array(sirka * hlbka);
  for (let j = 0; j < hlbka; j++) {
    const z = H.minZ + j * krok;
    for (let i = 0; i < sirka; i++) {
      const x = H.minX + i * krok;
      const idx = j * sirka + i;
      mriezka[idx] = maska[idx] > 0 ? dno : vyskaKopcov(x, z, kopce) + vyskaSvahov(x, z, svahy);
    }
  }

  /** Výška terénu bez mostov (bilineárna interpolácia mriežky). */
  function vyskaTerenu(x, z) {
    let fx = (x - H.minX) / krok;
    let fz = (z - H.minZ) / krok;
    fx = Math.max(0, Math.min(sirka - 1.001, fx));
    fz = Math.max(0, Math.min(hlbka - 1.001, fz));
    const i = Math.floor(fx), j = Math.floor(fz);
    const tx = fx - i, tz = fz - j;
    const a = mriezka[j * sirka + i];
    const b = mriezka[j * sirka + i + 1];
    const c = mriezka[(j + 1) * sirka + i];
    const d = mriezka[(j + 1) * sirka + i + 1];
    return (a * (1 - tx) + b * tx) * (1 - tz) + (c * (1 - tx) + d * tx) * tz;
  }

  /** Ak je bod na moste, vráti výšku vozovky, inak null. */
  function vyskaMostu(x, z) {
    for (const m of mosty) {
      const n = najblizsiNaUsecke(x, z, m.ax, m.az, m.bx, m.bz);
      if (n.d2 > m.polSirka2) continue;
      const s = n.t * m.dlzka;               // vzdialenosť od začiatku mosta
      const odKonca = Math.min(s, m.dlzka - s);
      const hKonca = s < m.dlzka / 2 ? m.hA : m.hB;
      if (odKonca >= m.nabeh) return m.vyska;
      return hKonca + (m.vyska - hKonca) * plynulo(odKonca / m.nabeh);
    }
    return null;
  }

  function pripravMost(m) {
    const [ax, az] = m.od, [bx, bz] = m.do;
    return {
      ...m, ax, az, bx, bz,
      dlzka: Math.hypot(bx - ax, bz - az),
      polSirka2: (m.sirka / 2) ** 2,
      nabeh: m.nabeh ?? 30,
      hA: 0, hB: 0, // doplní sa nižšie, keď už existuje vyskaTerenu
    };
  }
  for (const m of mosty) {
    m.hA = vyskaTerenu(m.ax, m.az);
    m.hB = vyskaTerenu(m.bx, m.bz);
  }

  /** Výška povrchu, po ktorom sa chodí/jazdí (most má prednosť). */
  function vyska(x, z) {
    const hm = vyskaMostu(x, z);
    return hm !== null ? hm : vyskaTerenu(x, z);
  }

  /** Je bod vo vode (a nie na moste)? */
  function jeVoVode(x, z) {
    if (vyskaMostu(x, z) !== null) return false;
    for (const v of voda) {
      if (x < v.ohr.minX || x > v.ohr.maxX || z < v.ohr.minZ || z > v.ohr.maxZ) continue;
      if (bodVPolygone(x, z, v.body)) return true;
    }
    return false;
  }

  return { vyska, vyskaTerenu, vyskaMostu, jeVoVode, mosty, voda };
}

/** Mierne svahy (napr. stúpanie Starého Mesta): lineárny sklon v obdĺžniku s plynulým okrajom. */
function vyskaSvahov(x, z, svahy) {
  let h = 0;
  for (const s of svahy) {
    // s = { od: [x,z], do: [x,z], sirka, vyska } – stúpa od "od" (0) po "do" (vyska)
    const n = najblizsiNaUsecke(x, z, s.od[0], s.od[1], s.do[0], s.do[1]);
    const d = Math.sqrt(n.d2);
    const okraj = s.sirka / 2;
    if (d > okraj) continue;
    const zoslab = d < okraj * 0.6 ? 1 : 1 - (d - okraj * 0.6) / (okraj * 0.4);
    h += s.vyska * plynulo(n.t) * plynulo(Math.max(0, zoslab));
  }
  return h;
}

/** Vyplní polygón do mriežky (scanline). */
function vyplnPolygon(maska, sirka, hlbka, body, H, krok) {
  const n = body.length;
  for (let j = 0; j < hlbka; j++) {
    const z = H.minZ + j * krok;
    const xs = [];
    for (let a = 0, b = n - 1; a < n; b = a++) {
      const [xa, za] = body[a], [xb, zb] = body[b];
      if ((za > z) !== (zb > z)) xs.push(xa + ((z - za) * (xb - xa)) / (zb - za));
    }
    xs.sort((p, q) => p - q);
    for (let k = 0; k + 1 < xs.length; k += 2) {
      const i0 = Math.max(0, Math.ceil((xs[k] - H.minX) / krok));
      const i1 = Math.min(sirka - 1, Math.floor((xs[k + 1] - H.minX) / krok));
      for (let i = i0; i <= i1; i++) maska[j * sirka + i] = 1;
    }
  }
}
