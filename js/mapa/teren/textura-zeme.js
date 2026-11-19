// Textúra zeme kreslená do plátna: trávniky, parky, lesy, chodníky, dlažba námestí,
// parkoviská, koľaje… Jedna veľká textúra sa natiahne na celý terén (lacné na výkon).
// Cesty pre autá sa kreslia zvlášť ako 3D pásy (js/mapa/cesty/).

import * as THREE from 'three';

export const FARBY_POKRYVKY = {
  zaklad: '#8c887d',
  trava: '#6c9447',
  les: '#4b7234',
  cintorin: '#6a8a52',
  ihrisko: '#7f9f55',
  parkovisko: '#6b6b69',
  dlazba: '#bcb19c',
  piesok: '#d6c597',
  zeleznica: '#7b7166',
  stavenisko: '#9a8a6c',
  koryto: '#6f695f',
};

const FARBY_CHODNIKOV = {
  footway: '#c2b9a8', path: '#a89a7c', steps: '#9d9586', cycleway: '#b06a5a', pedestrian: '#c7bca6',
  track: '#9b8a6a', sluzobna: '#707070', corridor: '#c2b9a8', platform: '#b5b0a5',
};

export function vytvorTexturuZeme(data, KONFIG) {
  const H = KONFIG.HRANICE;
  const sirkaM = H.maxX - H.minX, hlbkaM = H.maxZ - H.minZ;
  const maxPx = KONFIG.JE_DOTYKOVE ? 2048 : 4096;
  const mierka = maxPx / Math.max(sirkaM, hlbkaM); // px na meter
  const c = document.createElement('canvas');
  c.width = Math.round(sirkaM * mierka);
  c.height = Math.round(hlbkaM * mierka);
  const g = c.getContext('2d');
  const px = (x) => (x - H.minX) * mierka;
  const pz = (z) => (z - H.minZ) * mierka;

  const polygon = (body) => {
    g.beginPath();
    body.forEach(([x, z], i) => (i ? g.lineTo(px(x), pz(z)) : g.moveTo(px(x), pz(z))));
    g.closePath();
  };
  const ciara = (body) => {
    g.beginPath();
    body.forEach(([x, z], i) => (i ? g.lineTo(px(x), pz(z)) : g.moveTo(px(x), pz(z))));
  };

  g.fillStyle = FARBY_POKRYVKY.zaklad;
  g.fillRect(0, 0, c.width, c.height);

  // ručná mapa: zóny a námestia
  for (const zn of data.zony ?? []) { g.fillStyle = zn.farba; polygon(zn.body); g.fill(); }

  for (const p of data.pokryvka ?? []) {
    g.fillStyle = FARBY_POKRYVKY[p.k] ?? FARBY_POKRYVKY.zaklad;
    polygon(p.body);
    g.fill();
  }

  // drobné nádrže a fontány (kreslíme ich ako vodu – sú plytké)
  g.fillStyle = '#4f7f8f';
  for (const v of data.voda ?? []) if (v.reka === false) { polygon(v.body); g.fill(); }

  // chodníky a cyklotrasy
  g.lineCap = 'round';
  g.lineJoin = 'round';
  for (const ch of data.chodniky ?? []) {
    g.strokeStyle = FARBY_CHODNIKOV[ch.typ] ?? FARBY_CHODNIKOV.footway;
    g.lineWidth = Math.max(1, ch.sirka * mierka);
    ciara(ch.body);
    g.stroke();
  }

  // železnica a samostatné električkové trate (štrkové lôžko)
  for (const k of data.kolajnice ?? []) {
    g.strokeStyle = '#7a7268';
    g.lineWidth = Math.max(1, 3.4 * mierka);
    ciara(k.body);
    g.stroke();
  }

  // jemný šum – zem nepôsobí ako jednoliata farba
  const obr = g.getImageData(0, 0, c.width, c.height);
  const d = obr.data;
  let seed = 12345;
  for (let i = 0; i < d.length; i += 4) {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    const n = ((seed >> 16) & 15) - 8;
    d[i] += n; d[i + 1] += n; d[i + 2] += n;
  }
  g.putImageData(obr, 0, 0);

  // rieka: v textúre „vyrežeme“ dieru (alfa = 0) – zem sa tam nevykreslí, vidno vodu
  g.globalCompositeOperation = 'destination-out';
  g.fillStyle = '#000';
  for (const v of data.voda ?? []) if (v.reka !== false) { polygon(v.body); g.fill(); }
  g.globalCompositeOperation = 'source-over';

  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.flipY = false;
  t.anisotropy = 8;
  t.generateMipmaps = true;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  return t;
}

/** Malá opakujúca sa textúra detailu (zrno), ktorá sa násobí s textúrou zeme. */
export function texturaDetailu() {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  const obr = g.createImageData(128, 128);
  let seed = 99;
  for (let i = 0; i < obr.data.length; i += 4) {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    const v = 118 + ((seed >> 16) % 20);
    obr.data[i] = obr.data[i + 1] = obr.data[i + 2] = v;
    obr.data[i + 3] = 255;
  }
  g.putImageData(obr, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

/**
 * Textúra zeme pre jednu dlaždicu mesta (rect = { minX, minZ, maxX, maxZ }).
 * rieky = globálne polygóny riek (vyrežú sa – alfa 0).
 */
export function vytvorTexturuDlazdice(d, rieky, rect, px = 512) {
  const c = document.createElement('canvas');
  c.width = c.height = px;
  const g = c.getContext('2d');
  const mierka = px / (rect.maxX - rect.minX);
  const sx = (x) => (x - rect.minX) * mierka, sz = (z) => (z - rect.minZ) * mierka;
  const cesta = (body, uzavriet) => {
    g.beginPath();
    body.forEach(([x, z], i) => (i ? g.lineTo(sx(x), sz(z)) : g.moveTo(sx(x), sz(z))));
    if (uzavriet) g.closePath();
  };

  g.fillStyle = FARBY_POKRYVKY.zaklad;
  g.fillRect(0, 0, px, px);
  for (const p of d.pokryvka ?? []) {
    g.fillStyle = FARBY_POKRYVKY[p.k] ?? FARBY_POKRYVKY.zaklad;
    cesta(p.body, true);
    g.fill();
  }
  g.fillStyle = '#4f7f8f';
  for (const v of d.voda ?? []) { cesta(v.body, true); g.fill(); }
  g.lineCap = 'round';
  g.lineJoin = 'round';
  for (const ch of d.chodniky ?? []) {
    g.strokeStyle = FARBY_CHODNIKOV[ch.typ] ?? FARBY_CHODNIKOV.footway;
    g.lineWidth = Math.max(1, ch.sirka * mierka);
    cesta(ch.body, false);
    g.stroke();
  }
  for (const k of d.kolajnice ?? []) {
    g.strokeStyle = '#7a7268';
    g.lineWidth = Math.max(1, 3.4 * mierka);
    cesta(k.body, false);
    g.stroke();
  }
  // jemný šum
  const obr = g.getImageData(0, 0, px, px);
  let seed = 12345 + Math.round(rect.minX * 7 + rect.minZ * 13);
  for (let i = 0; i < obr.data.length; i += 4) {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    const n = ((seed >> 16) & 15) - 8;
    obr.data[i] += n; obr.data[i + 1] += n; obr.data[i + 2] += n;
  }
  g.putImageData(obr, 0, 0);
  // rieky vyrežeme
  g.globalCompositeOperation = 'destination-out';
  g.fillStyle = '#000';
  for (const v of rieky ?? []) {
    const o = v.ohr;
    if (o && (o.maxX < rect.minX || o.minX > rect.maxX || o.maxZ < rect.minZ || o.minZ > rect.maxZ)) continue;
    cesta(v.body, true);
    g.fill();
  }
  g.globalCompositeOperation = 'source-over';

  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.flipY = false;
  t.anisotropy = 8;
  return t;
}
