// Výškopis celej Bratislavy: výškový model (Copernicus DEM, data/mapa/mesto/teren.bin)
// + vyrezané koryto riek + mosty. Rovnaké rozhranie ako js/mapa/teren/vyska.js.

import { bodVPolygone, ohranicenie, najblizsiNaUsecke } from '../geometria.js';

const plynulo = (t) => t * t * (3 - 2 * t);
const KROK_MASKY = 6; // m – rozlíšenie masky koryta

/**
 * @param {{ meta, vysky: Int16Array }} teren  – z teren.json + teren.bin
 * @param {object} data   – voda (rieky), mosty
 */
export function vytvorVyskopisMesta(teren, data, KONFIG) {
  const { meta, vysky } = teren;
  const W = meta.sirka, D = meta.hlbka, K = meta.krok;

  function vyskaDem(x, z) {
    let fx = (x - meta.minX) / K, fz = (z - meta.minZ) / K;
    fx = Math.max(0, Math.min(W - 1.001, fx));
    fz = Math.max(0, Math.min(D - 1.001, fz));
    const i = Math.floor(fx), j = Math.floor(fz), tx = fx - i, tz = fz - j;
    const a = vysky[j * W + i], b = vysky[j * W + i + 1], c = vysky[(j + 1) * W + i], d = vysky[(j + 1) * W + i + 1];
    return ((a * (1 - tx) + b * tx) * (1 - tz) + (c * (1 - tx) + d * tx) * tz) / 10;
  }

  // --- maska koryta riek (len v obdĺžniku, ktorý rieky pokrývajú v rámci mapy) ---
  const H = KONFIG.HRANICE;
  const rieky = (data.voda ?? []).filter((v) => v.reka !== false).map((v) => ({ ...v, ohr: ohranicenie(v.body) }));
  let mx0 = Infinity, mz0 = Infinity, mx1 = -Infinity, mz1 = -Infinity;
  for (const r of rieky) {
    mx0 = Math.min(mx0, r.ohr.minX); mz0 = Math.min(mz0, r.ohr.minZ);
    mx1 = Math.max(mx1, r.ohr.maxX); mz1 = Math.max(mz1, r.ohr.maxZ);
  }
  mx0 = Math.max(mx0, H.minX); mz0 = Math.max(mz0, H.minZ); mx1 = Math.min(mx1, H.maxX); mz1 = Math.min(mz1, H.maxZ);
  const mw = rieky.length ? Math.ceil((mx1 - mx0) / KROK_MASKY) + 1 : 0;
  const md = rieky.length ? Math.ceil((mz1 - mz0) / KROK_MASKY) + 1 : 0;
  const maska = new Uint8Array(Math.max(0, mw * md));
  for (const r of rieky) vyplnPolygon(maska, mw, md, r.body, mx0, mz0, KROK_MASKY);
  // zúženie o 1 bunku – svah koryta je celý vo vode
  const zuz = maska.slice();
  for (let j = 1; j < md - 1; j++) {
    for (let i = 1; i < mw - 1; i++) {
      const k = j * mw + i;
      if (maska[k] && !(maska[k - 1] && maska[k + 1] && maska[k - mw] && maska[k + mw])) zuz[k] = 0;
    }
  }
  function hlbkaKoryta(x, z) {
    // 0 = súš, 1 = plne v koryte (bilineárne medzi bunkami masky)
    let fx = (x - mx0) / KROK_MASKY, fz = (z - mz0) / KROK_MASKY;
    if (fx < 0 || fz < 0 || fx >= mw - 1 || fz >= md - 1) return 0;
    const i = Math.floor(fx), j = Math.floor(fz), tx = fx - i, tz = fz - j;
    const a = zuz[j * mw + i], b = zuz[j * mw + i + 1], c = zuz[(j + 1) * mw + i], d = zuz[(j + 1) * mw + i + 1];
    return (a * (1 - tx) + b * tx) * (1 - tz) + (c * (1 - tx) + d * tx) * tz;
  }

  // --- hladina riek: odhad z výškového modelu (nad vodou meria povrch hladiny) po 500 m ---
  const HK = 500;
  const hw = Math.ceil((H.maxX - H.minX) / HK) + 1, hd = Math.ceil((H.maxZ - H.minZ) / HK) + 1;
  const hladiny = new Float32Array(hw * hd).fill(NaN);
  for (let j = 0; j < hd; j++) {
    for (let i = 0; i < hw; i++) {
      const vzorky = [];
      for (let a = 0; a < 10; a++) {
        for (let b = 0; b < 10; b++) {
          const x = H.minX + (i - 0.5 + (a + 0.5) / 10) * HK, z = H.minZ + (j - 0.5 + (b + 0.5) / 10) * HK;
          if (hlbkaKoryta(x, z) > 0.99) vzorky.push(vyskaDem(x, z));
        }
      }
      if (vzorky.length >= 4) {
        vzorky.sort((p, q) => p - q);
        hladiny[j * hw + i] = vzorky[Math.floor(vzorky.length * 0.25)] - 0.3;
      }
    }
  }
  // doplnenie prázdnych buniek susedmi (aby sa dalo interpolovať pri brehoch)
  for (let opak = 0; opak < 6; opak++) {
    const kopia = hladiny.slice();
    for (let j = 0; j < hd; j++) {
      for (let i = 0; i < hw; i++) {
        if (!Number.isNaN(kopia[j * hw + i])) continue;
        let s = 0, n = 0;
        for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const ii = i + a, jj = j + b;
          if (ii < 0 || jj < 0 || ii >= hw || jj >= hd) continue;
          const v = kopia[jj * hw + ii];
          if (!Number.isNaN(v)) { s += v; n++; }
        }
        if (n) hladiny[j * hw + i] = s / n;
      }
    }
  }
  function hladina(x, z) {
    const fx = Math.max(0, Math.min(hw - 1.001, (x - H.minX) / HK)), fz = Math.max(0, Math.min(hd - 1.001, (z - H.minZ) / HK));
    const i = Math.floor(fx), j = Math.floor(fz), tx = fx - i, tz = fz - j;
    const v = (a, b) => { const h = hladiny[b * hw + a]; return Number.isNaN(h) ? KONFIG.HLADINA : h; };
    return (v(i, j) * (1 - tx) + v(i + 1, j) * tx) * (1 - tz) + (v(i, j + 1) * (1 - tx) + v(i + 1, j + 1) * tx) * tz;
  }

  function vyskaTerenu(x, z) {
    const h = vyskaDem(x, z);
    const k = hlbkaKoryta(x, z);
    if (k <= 0) return h;
    const dno = hladina(x, z) + (KONFIG.HLBKA_KORYTA - KONFIG.HLADINA);
    return h * (1 - k) + Math.min(dno, h) * k;
  }

  // --- mosty ---
  const mosty = (data.mosty ?? []).map((m) => {
    const [ax, az] = m.od, [bx, bz] = m.do;
    const p = { ...m, ax, az, bx, bz, dlzka: Math.hypot(bx - ax, bz - az), polSirka2: (m.sirka / 2) ** 2, nabeh: m.nabeh ?? 30 };
    p.hA = vyskaTerenu(ax, az);
    p.hB = vyskaTerenu(bx, bz);
    // mostovka je o m.vyska nad vyšším koncom
    p.vrch = Math.max(p.hA, p.hB) + (m.vyska ?? 4);
    p.ohr = { minX: Math.min(ax, bx) - m.sirka, maxX: Math.max(ax, bx) + m.sirka, minZ: Math.min(az, bz) - m.sirka, maxZ: Math.max(az, bz) + m.sirka };
    return p;
  });

  function vyskaMostu(x, z) {
    for (const m of mosty) {
      if (x < m.ohr.minX || x > m.ohr.maxX || z < m.ohr.minZ || z > m.ohr.maxZ) continue;
      const n = najblizsiNaUsecke(x, z, m.ax, m.az, m.bx, m.bz);
      if (n.d2 > m.polSirka2) continue;
      const s = n.t * m.dlzka;
      const odKonca = Math.min(s, m.dlzka - s);
      const hKonca = s < m.dlzka / 2 ? m.hA : m.hB;
      if (odKonca >= m.nabeh) return m.vrch;
      return hKonca + (m.vrch - hKonca) * plynulo(odKonca / m.nabeh);
    }
    return null;
  }

  function vyska(x, z) {
    const hm = vyskaMostu(x, z);
    return hm !== null ? hm : vyskaTerenu(x, z);
  }

  function jeVoVode(x, z) {
    if (vyskaMostu(x, z) !== null) return false;
    for (const v of rieky) {
      if (x < v.ohr.minX || x > v.ohr.maxX || z < v.ohr.minZ || z > v.ohr.maxZ) continue;
      if (bodVPolygone(x, z, v.body)) return true;
    }
    return false;
  }

  return { vyska, vyskaTerenu, vyskaMostu, jeVoVode, hladina, mosty, voda: rieky };
}

function vyplnPolygon(maska, w, d, body, x0, z0, krok) {
  const n = body.length;
  for (let j = 0; j < d; j++) {
    const z = z0 + j * krok;
    const xs = [];
    for (let a = 0, b = n - 1; a < n; b = a++) {
      const [xa, za] = body[a], [xb, zb] = body[b];
      if ((za > z) !== (zb > z)) xs.push(xa + ((z - za) * (xb - xa)) / (zb - za));
    }
    xs.sort((p, q) => p - q);
    for (let k = 0; k + 1 < xs.length; k += 2) {
      const i0 = Math.max(0, Math.ceil((xs[k] - x0) / krok));
      const i1 = Math.min(w - 1, Math.floor((xs[k + 1] - x0) / krok));
      for (let i = i0; i <= i1; i++) maska[j * w + i] = 1;
    }
  }
}
