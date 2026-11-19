// Výškový model celej Bratislavy z Copernicus DEM GLO-30 (© DLR e.V. 2010-2014 a © Airbus Defence
// and Space GmbH 2014-2018, poskytnuté v rámci programu COPERNICUS Európskou úniou a ESA).
//
// Copernicus DEM je model povrchu (aj s budovami a stromami), preto ho „vyčistíme“:
// morfologické otvorenie (minimum → maximum v okne ~140 m) odstráni budovy a menšie skupiny stromov,
// potom jemné rozmazanie. Rieky a nábrežné múry rieši hra (koryto sa vyreže podľa OSM).
//
// Výstup: data/mapa/mesto/teren.bin  – Int16 výšky v decimetroch nad VYSKA_NULA (riadky po z, stĺpce po x)
//         data/mapa/mesto/teren.json – rozmery mriežky
//
// Spustenie (po dlazdice.mjs): node teren.mjs

import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fromFile } from 'geotiff';
import { CACHE, VYSTUP, naStupne, VYSKA_NULA } from './spolocne.mjs';

const KROK = 20;          // m
const OKNO = 3;           // polomer okna otvorenia v bunkách (3 → 7×7 = 140 m)

const index = JSON.parse(readFileSync(join(VYSTUP, 'index.json'), 'utf8'));
const H = index.hranice;
const sirka = Math.ceil((H.maxX - H.minX) / KROK) + 1;
const hlbka = Math.ceil((H.maxZ - H.minZ) / KROK) + 1;
console.log(`Mriežka terénu ${sirka} × ${hlbka} (${KROK} m)`);

// načítanie DEM dlaždíc
const dem = [];
for (const meno of ['dem_N48_E016.tif', 'dem_N48_E017.tif']) {
  const tiff = await fromFile(join(CACHE, meno));
  const obr = await tiff.getImage();
  const [lon0, lat0] = obr.getOrigin();
  const [dlon, dlat] = obr.getResolution();
  const [data] = await obr.readRasters();
  dem.push({ lon0, lat0, dlon, dlat, w: obr.getWidth(), h: obr.getHeight(), data });
  console.log(`  ${meno}: ${obr.getWidth()}×${obr.getHeight()}, lon ${lon0.toFixed(3)}, lat ${lat0.toFixed(3)}`);
}

function vyskaDem(lon, lat) {
  for (const d of dem) {
    const fx = (lon - d.lon0) / d.dlon - 0.5, fy = (lat - d.lat0) / d.dlat - 0.5;
    if (fx < 0 || fy < 0 || fx >= d.w - 1 || fy >= d.h - 1) continue;
    const x = Math.floor(fx), y = Math.floor(fy), tx = fx - x, ty = fy - y;
    const v = (i, j) => d.data[j * d.w + i];
    return (v(x, y) * (1 - tx) + v(x + 1, y) * tx) * (1 - ty) + (v(x, y + 1) * (1 - tx) + v(x + 1, y + 1) * tx) * ty;
  }
  return NaN;
}

let mriezka = new Float32Array(sirka * hlbka);
for (let j = 0; j < hlbka; j++) {
  for (let i = 0; i < sirka; i++) {
    const [lon, lat] = naStupne(H.minX + i * KROK, H.minZ + j * KROK);
    const h = vyskaDem(lon, lat);
    mriezka[j * sirka + i] = Number.isFinite(h) ? h : 135;
  }
}

// morfologické otvorenie: erózia (min) a dilatácia (max), oddeliteľne po riadkoch a stĺpcoch
function filter(vstup, fn) {
  const tmp = new Float32Array(vstup.length), out = new Float32Array(vstup.length);
  for (let j = 0; j < hlbka; j++) {
    for (let i = 0; i < sirka; i++) {
      let v = vstup[j * sirka + i];
      for (let k = -OKNO; k <= OKNO; k++) { const ii = Math.min(sirka - 1, Math.max(0, i + k)); v = fn(v, vstup[j * sirka + ii]); }
      tmp[j * sirka + i] = v;
    }
  }
  for (let j = 0; j < hlbka; j++) {
    for (let i = 0; i < sirka; i++) {
      let v = tmp[j * sirka + i];
      for (let k = -OKNO; k <= OKNO; k++) { const jj = Math.min(hlbka - 1, Math.max(0, j + k)); v = fn(v, tmp[jj * sirka + i]); }
      out[j * sirka + i] = v;
    }
  }
  return out;
}
mriezka = filter(filter(mriezka, Math.min), Math.max);

// rozmazanie 3×3 (dvakrát)
for (let opak = 0; opak < 2; opak++) {
  const out = new Float32Array(mriezka.length);
  for (let j = 0; j < hlbka; j++) {
    for (let i = 0; i < sirka; i++) {
      let s = 0, n = 0;
      for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) {
        const ii = i + a, jj = j + b;
        if (ii < 0 || jj < 0 || ii >= sirka || jj >= hlbka) continue;
        s += mriezka[jj * sirka + ii]; n++;
      }
      out[j * sirka + i] = s / n;
    }
  }
  mriezka = out;
}

const vystup = new Int16Array(sirka * hlbka);
let min = Infinity, max = -Infinity;
for (let k = 0; k < vystup.length; k++) {
  const v = Math.round((mriezka[k] - VYSKA_NULA) * 10);
  vystup[k] = v;
  min = Math.min(min, v); max = Math.max(max, v);
}
writeFileSync(join(VYSTUP, 'teren.bin'), Buffer.from(vystup.buffer));
writeFileSync(join(VYSTUP, 'teren.json'), JSON.stringify({
  popis: 'Výšky terénu (Int16, decimetre nad nábrežím = 139 m n. m.), zdroj Copernicus DEM GLO-30, spracované tools/mesto/teren.mjs',
  licencia: 'Copernicus DEM © DLR e.V. 2010-2014 a © Airbus Defence and Space GmbH 2014-2018, poskytnuté v rámci programu COPERNICUS Európskou úniou a ESA',
  minX: H.minX, minZ: H.minZ, krok: KROK, sirka, hlbka, nula: VYSKA_NULA,
}));
console.log(`Hotovo: teren.bin (${(vystup.byteLength / 1e6).toFixed(1)} MB), výšky ${(min / 10).toFixed(0)} až ${(max / 10).toFixed(0)} m vzhľadom na nábrežie`);
