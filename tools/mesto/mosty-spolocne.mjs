// Spoločné pomôcky generátorov mostov cez rieky (tools/mesto/mosty-dunaj.mjs, tools/mesto/mosty-rieky.mjs):
// terén z laseru (podrobný 2 m, inak mriežka 20 m), dlaždice, os mosta ako lomená čiara, podjazdy pod mostom,
// výška povrchu (DMP) a terénu (DMR) z INSPIRE WMS ÚGKK s vyrovnávacou pamäťou v .cache/mesto/dmp-mosty.json.

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { gunzipSync } from 'node:zlib';
import { CACHE, VYSTUP, VYSKA_NULA, DLAZDICA, naStupne } from './spolocne.mjs';

export const r1 = (v) => Math.round(v * 10) / 10;
export const r2 = (v) => Math.round(v * 100) / 100;

// --- terén (data/mapa/mesto/teren.bin – decimetre nad VYSKA_NULA, mriežka) ---------------------------------------
const meta = JSON.parse(readFileSync(join(VYSTUP, 'teren.json'), 'utf8'));
const vysky = new Int16Array(readFileSync(join(VYSTUP, 'teren.bin')).buffer.slice(0));
// podrobný terén 2 m z laseru (data/mapa/mesto/t/<i>_<j>.bin – formát v js/mapa/dlazdice/doplnky.js), kde je
const detaily = new Map();
function detail(i, j) {
  const k = `${i}_${j}`;
  if (!detaily.has(k)) {
    const p = join(VYSTUP, 't', `${k}.bin`);
    let v = null;
    if (existsSync(p)) {
      let buf = readFileSync(p);
      if (buf[0] === 0x1f && buf[1] === 0x8b) buf = gunzipSync(buf);
      const u = new Uint16Array(buf.buffer, buf.byteOffset, buf.length / 2);
      const n = UZLY;
      v = new Float32Array(n * n);
      for (let r = 0; r < n; r++) {
        let a = 0;
        for (let c = 0; c < n; c++) { a = (a + u[r * n + c]) & 0xffff; v[r * n + c] = a / 100 + 100 - VYSKA_NULA; }
      }
    }
    detaily.set(k, v);
  }
  return detaily.get(k);
}
const UZLY = 251, KROK_D = 2;
export function teren(x, z) {
  const i = Math.floor(x / DLAZDICA), j = Math.floor(z / DLAZDICA), v = detail(i, j);
  if (v) {
    const fx = Math.min(UZLY - 1.001, (x - i * DLAZDICA) / KROK_D), fz = Math.min(UZLY - 1.001, (z - j * DLAZDICA) / KROK_D);
    const a = Math.floor(fx), b = Math.floor(fz), tx = fx - a, tz = fz - b, n = UZLY;
    return (v[b * n + a] * (1 - tx) + v[b * n + a + 1] * tx) * (1 - tz) + (v[(b + 1) * n + a] * (1 - tx) + v[(b + 1) * n + a + 1] * tx) * tz;
  }
  return terenHruby(x, z);
}
function terenHruby(x, z) {
  let fx = (x - meta.minX) / meta.krok, fz = (z - meta.minZ) / meta.krok;
  fx = Math.max(0, Math.min(meta.sirka - 1.001, fx));
  fz = Math.max(0, Math.min(meta.hlbka - 1.001, fz));
  const i = Math.floor(fx), j = Math.floor(fz), tx = fx - i, tz = fz - j, W = meta.sirka;
  const a = vysky[j * W + i], b = vysky[j * W + i + 1], c = vysky[(j + 1) * W + i], d = vysky[(j + 1) * W + i + 1];
  return ((a * (1 - tx) + b * tx) * (1 - tz) + (c * (1 - tx) + d * tx) * tz) / 10;
}

// --- cesty a koľaje pod mostom (z dlaždíc) ------------------------------------------------------------------------
const dlazdice = new Map();
export function dlazdica(i, j) {
  const k = `${i}_${j}`;
  if (!dlazdice.has(k)) {
    const p = join(VYSTUP, 'd', `${k}.json`);
    dlazdice.set(k, existsSync(p) ? JSON.parse(readFileSync(p, 'utf8')) : null);
  }
  return dlazdice.get(k);
}
const pretnutie = (a, b, c, d) => {
  // úsečky a–b (os mosta) a c–d: parameter t na a–b alebo null
  const r = [b[0] - a[0], b[1] - a[1]], q = [d[0] - c[0], d[1] - c[1]];
  const den = r[0] * q[1] - r[1] * q[0];
  if (Math.abs(den) < 1e-9) return null;
  const t = ((c[0] - a[0]) * q[1] - (c[1] - a[1]) * q[0]) / den;
  const u = ((c[0] - a[0]) * r[1] - (c[1] - a[1]) * r[0]) / den;
  return t >= 0 && t <= 1 && u >= 0 && u <= 1 ? t : null;
};
/** Úseky osi [s0, s1], kde pod mostom ide cesta (bez mosta) alebo koľaj – s rezervou podľa šírky a uhla. */
export function podjazdy(os) {
  const out = [];
  const tiles = new Set();
  for (let s = 0; s <= os.L; s += 50) {
    const [x, z] = os.bod(s);
    for (const [di, dj] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]]) tiles.add(`${Math.floor(x / DLAZDICA) + di}_${Math.floor(z / DLAZDICA) + dj}`);
  }
  for (const k of tiles) {
    const [i, j] = k.split('_').map(Number);
    const d = dlazdica(i, j);
    if (!d) continue;
    const prvky = [
      ...(d.cesty ?? []).filter((c) => !c.most && !c.nadjazd && !c.tunel).map((c) => ({ body: c.body, pol: (c.sirka ?? 6) / 2 + 1.5, co: c.typ })),
      ...(d.kolajnice ?? []).filter((c) => !c.most).map((c) => ({ body: c.body, pol: 3.5, co: c.typ })),
    ];
    for (const p of prvky) {
      for (let n = 1; n < (p.body?.length ?? 0); n++) {
        for (let u = 1; u < os.body.length; u++) {
          const A = os.body[u - 1], B = os.body[u], l = os.S[u] - os.S[u - 1];
          const t = pretnutie(A, B, p.body[n - 1], p.body[n]);
          if (t === null) continue;
          // šikmé križovanie – podjazd je dlhší
          const ux = (B[0] - A[0]) / l, uz = (B[1] - A[1]) / l;
          const [cx, cz] = p.body[n - 1], [dx, dz] = p.body[n];
          const cl = Math.hypot(dx - cx, dz - cz) || 1;
          const sin = Math.abs(ux * (dz - cz) / cl - uz * (dx - cx) / cl) || 1;
          const s = os.S[u - 1] + t * l, w = p.pol / Math.max(0.3, sin);
          out.push([r1(s - w), r1(s + w), p.co]);
        }
      }
    }
  }
  out.sort((a, b) => a[0] - b[0]);
  return out;
}

/** Os mosta: lomená čiara [x, z] s dĺžkami – bod(s) vráti bod na osi. */
export function vytvorOs(body) {
  const S = [0];
  for (let i = 1; i < body.length; i++) S.push(S[i - 1] + Math.hypot(body[i][0] - body[i - 1][0], body[i][1] - body[i - 1][1]));
  const bod = (s) => {
    let i = 1;
    while (i < body.length - 1 && s > S[i]) i++;
    const t = (s - S[i - 1]) / (S[i] - S[i - 1] || 1);
    return [body[i - 1][0] + (body[i][0] - body[i - 1][0]) * t, body[i - 1][1] + (body[i][1] - body[i - 1][1]) * t];
  };
  return { body, S, L: S.at(-1), bod };
}

// --- laser DMP/DMR cez INSPIRE WMS ÚGKK (verejná služba, © ÚGKK SR, CC BY 4.0) ---------------------------------
// Služba vracia elipsoidické výšky – posun na Bpv kalibrovaný proti lokálnemu DMR (napady/pamiatky-podklady.md).
export const POSUN_WMS = 43.8;
const URL_WMS = { dsm: 'https://inspirews.skgeodesy.sk/geoserver/el_dsm/ows', dtm: 'https://inspirews.skgeodesy.sk/geoserver/el/ows' };
const SUBOR_PAMATE = join(CACHE, 'dmp-mosty.json');
let pamat = null;
function nacitajPamat() {
  if (pamat) return pamat;
  pamat = existsSync(SUBOR_PAMATE) ? JSON.parse(readFileSync(SUBOR_PAMATE, 'utf8')) : {};
  return pamat;
}
export function ulozPamat() {
  if (!pamat) return;
  mkdirSync(CACHE, { recursive: true });
  writeFileSync(SUBOR_PAMATE, JSON.stringify(pamat));
}
/** Výška povrchu (druh 'dsm') alebo terénu ('dtm') v bode hry (x, z) v hre (y = m n. m. − VYSKA_NULA); null = nič. */
export async function laser(x, z, druh = 'dsm') {
  const p = nacitajPamat();
  const kluc = `${druh}|${x.toFixed(1)}|${z.toFixed(1)}`;
  if (kluc in p) return p[kluc];
  const [lon, lat] = naStupne(x, z);
  const dla = 0.00002, dlo = 0.00003;
  const q = `${URL_WMS[druh]}?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetFeatureInfo&LAYERS=EL.GridCoverage&QUERY_LAYERS=EL.GridCoverage`
    + `&CRS=EPSG:4326&BBOX=${lat - dla},${lon - dlo},${lat + dla},${lon + dlo}&WIDTH=11&HEIGHT=11&I=5&J=5&INFO_FORMAT=application/json&STYLES=`;
  for (let k = 0; k < 4; k++) {
    try {
      const r = await fetch(q, { headers: { 'User-Agent': 'blavacik-mapa/1.0' } });
      const f = (await r.json()).features ?? [];
      const v = f.length ? f[0].properties.GRAY_INDEX : null;
      const y = v === null || v === undefined || v < -1000 ? null : Math.round((v - POSUN_WMS - VYSKA_NULA) * 100) / 100;
      p[kluc] = y;
      return y;
    } catch {
      await new Promise((res) => setTimeout(res, 2000 * (k + 1)));
    }
  }
  return null;
}
/** Viac bodov naraz (najviac `naraz` súbežných dopytov). */
export async function laserBody(body, druh = 'dsm', naraz = 4) {
  const out = new Array(body.length);
  let i = 0;
  await Promise.all(Array.from({ length: naraz }, async () => {
    while (i < body.length) { const k = i++; out[k] = await laser(body[k][0], body[k][1], druh); }
  }));
  return out;
}
