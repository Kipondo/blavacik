// Mosty cez Dunaj podľa skutočnosti → data/mapa/mosty-dunaj.json (hra ich zlúči so záznamami v index.json, #mosty).
//
// index.json má pre každý pomenovaný most cez rieku len úsek nad vodou ± 45 m s vodorovnou mostovkou 4 m nad brehom
// (tools/osm/klasifikuj.mjs). Skutočné mosty sú vyššie a na brehoch pokračujú estakádami (Most SNP ďalších ~175 m
// na Staré Mesto, Prístavný most takmer kilometer). Tu je pre každý most:
//   – celá dĺžka po os mosta (rozsah z OSM: man_made=bridge a úseky ciest s menom mosta),
//   – výškový profil mostovky (riadiace body v m n. m. z prieskumu – zdroje v napady/pamiatky-podklady.md, „Mosty
//     cez Dunaj“); koniec „zem“ = mostovka dosadá na terén (opora, násyp),
//   – šírka mostovky, polohy pilierov, podjazdy (cesty a koľaje pod mostom z dlaždíc – tam piliere nestoja),
//   – terén pod osou (pre dĺžku pilierov a opôr v modeli z Blendera).
//
// Spustenie (z koreňa repozitára): node tools/mesto/mosty-dunaj.mjs
// Potom modely: blender -b --factory-startup -P tools/blender/mosty_blender.py (tools/blender/mosty/*.py).

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { gunzipSync } from 'node:zlib';
import { KOREN, VYSTUP, VYSKA_NULA, DLAZDICA } from './spolocne.mjs';

const r1 = (v) => Math.round(v * 10) / 10;
const r2 = (v) => Math.round(v * 100) / 100;

// --- prieskum (napady/pamiatky-podklady.md, časť „Mosty cez Dunaj“) ----------------------------------------------
// s = metre pozdĺž osi od bodu „od“ v index.json (záporné = za ním), výšky v m n. m. (hra: y = v − 139).
// rozsah = kde most podľa OSM začína a končí; profil = [s, výška | 'zem']; piliere = polohy riečnych a pobrežných
// pilierov (s); podjazdy dopočíta skript z ciest a koľají v dlaždiciach.
import { MOSTY } from './mosty-dunaj-data.mjs';

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
function teren(x, z) {
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
function dlazdica(i, j) {
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
function podjazdy(os) {
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
function vytvorOs(body) {
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

// --- výstup -------------------------------------------------------------------------------------------------------
const index = JSON.parse(readFileSync(join(VYSTUP, 'index.json'), 'utf8'));
const vystup = { popis: 'Mosty cez Dunaj podľa skutočnosti – celá dĺžka s estakádami a výškový profil mostovky. Vyrába tools/mesto/mosty-dunaj.mjs (prieskum v napady/pamiatky-podklady.md).', mosty: [] };
for (const M of MOSTY) {
  const m = index.mosty.find((x) => x.nazov === M.nazov);
  if (!m) { console.warn(`${M.nazov}: nie je v index.json`); continue; }
  const [ax, az] = m.od, [bx, bz] = m.do;
  const L0 = Math.hypot(bx - ax, bz - az), ux = (bx - ax) / L0, uz = (bz - az) / L0;
  // os: lomená čiara z prieskumu (most v oblúku, s od jej začiatku) alebo úsečka na osi z index.json (s od „od“)
  let os, s0 = 0;
  if (M.os) os = vytvorOs(M.os);
  else {
    s0 = M.rozsah[0];
    const s1 = M.rozsah[1];
    os = vytvorOs([[ax + ux * s0, az + uz * s0], [ax + ux * s1, az + uz * s1]]);
  }
  const L = os.L;
  const y = (v) => v - VYSKA_NULA;
  const profil = M.profil.map(([s, v]) => {
    const ss = s - s0;
    if (v === 'zem') return [r1(ss), r2(teren(...os.bod(ss))), 1];
    return [r1(ss), r2(y(v))];
  });
  const terenOs = [];
  for (let s = 0; s <= L + 0.01; s += 5) terenOs.push([r1(s), r2(teren(...os.bod(s)))]);
  const pod = podjazdy(os);
  const zaznam = {
    nazov: M.nazov,
    od: os.body[0].map(r1), do: os.body.at(-1).map(r1),
    ...(M.os ? { os: os.body.map((b) => b.map(r1)) } : {}),
    sirka: M.sirka,
    vrch: r2(Math.max(...profil.map((p) => p[1]))),
    profil,
    piliere: (M.piliere ?? []).map((s) => r1(s - s0)),
    ...(M.lavky ? { lavky: M.lavky } : {}),
    // násypy medzi múrmi, ktoré laser nemá (pod nimi nie je voľný priestor – mostovka je povrchom pre všetko)
    ...(M.nasypy ? { nasypy: M.nasypy.map(([a, b]) => [r1(a - s0), r1(b - s0)]) } : {}),
    podjazdy: pod,
    teren: terenOs,
  };
  vystup.mosty.push(zaznam);
  const hm = Math.max(...profil.map((p) => p[1]));
  console.log(`${M.nazov}: ${L.toFixed(0)} m (predtým ${L0.toFixed(0)} m), mostovka najvyššie ${(hm + VYSKA_NULA).toFixed(1)} m n. m., podjazdov ${pod.length}`);
}
writeFileSync(join(KOREN, 'data', 'mapa', 'mosty-dunaj.json'), JSON.stringify(vystup));
console.log('Hotovo: data/mapa/mosty-dunaj.json');
