// Textúra zeme kreslená do plátna: trávniky, parky, lesy, chodníky, dlažba námestí,
// parkoviská, koľaje… Jedna veľká textúra sa natiahne na celý terén (lacné na výkon).
// Cesty pre autá sa kreslia zvlášť ako 3D pásy (js/mapa/cesty/).

import * as THREE from 'three';
import { dieryPodchodov } from '../podchody/tuby.js';

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
  return dokonci(krokyTexturyDlazdice(d, rieky, rect, px));
}

/** To isté po krokoch (generátor) – správca dlaždíc to rozloží do viacerých snímok. */
export function* krokyTexturyDlazdice(d, rieky, rect, px = 512) {
  const c = document.createElement('canvas');
  c.width = c.height = px;
  // plátno v pamäti (nie na grafickej karte) – čítanie pixelov (šum, maska trávy) nečaká na kartu
  const g = c.getContext('2d', { willReadFrequently: true });
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
    if (ch.nadjazd) continue;            // lávka / nadchod – kreslí sa ako most (js/mapa/mosty/nadjazdy.js)
    g.strokeStyle = FARBY_CHODNIKOV[ch.typ] ?? FARBY_CHODNIKOV.footway;
    g.lineWidth = Math.max(1, ch.sirka * mierka);
    cesta(ch.body, false);
    g.stroke();
  }
  for (const k of d.kolajnice ?? []) {
    if (k.nadjazd) continue;
    g.strokeStyle = '#7a7268';
    g.lineWidth = Math.max(1, 3.4 * mierka);
    cesta(k.body, false);
    g.stroke();
  }
  yield;
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
  // jamy schodísk do podchodov (js/mapa/podchody/)
  for (const d_ of dieryPodchodov(d.podchody)) {
    cesta(d_, true);
    g.fill();
  }
  g.globalCompositeOperation = 'source-over';

  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.flipY = false;
  t.anisotropy = 8;
  return t;
}

// Trieda povrchu pre materiál zeme (kanál R; G = zatienenie pri budovách, B = asfaltový chodník):
// 0 = iný povrch (farba z textúry pokrývky), 0,25 = tráva,
// 0,5 = chodník z kamenných dlaždíc, 0,75 = veľké svetlé kamenné dosky (námestia a pešia zóna),
// 1 = drobné žulové kocky (uličky a dvory historického jadra); 0,63 = veľké svetlé betónové dlaždice (moderné
// námestia a pešie zóny mimo historického jadra, napr. Kamenné námestie).
const BETON = 160, DOSKY = 192, KOCKY = 255;
const TRIEDA_POKRYVKY = { dlazba: DOSKY, zaklad: 128, trava: 64, ihrisko: 64, cintorin: 64 };
// približný obrys historického jadra (Michalská brána – Hlavné nám. – Dóm – Hviezdoslavovo nám.)
const JADRO = { x: -60, z: 40, rx: 330, rz: 280, uhol: 0.35 };
/** Je bod v historickom jadre? (tam sú aj obslužné uličky vydláždené kockami) */
export function vJadre(x, z) {
  const c = Math.cos(JADRO.uhol), s = Math.sin(JADRO.uhol), dx = x - JADRO.x, dz = z - JADRO.z;
  const a = (dx * c + dz * s) / JADRO.rx, b = (-dx * s + dz * c) / JADRO.rz;
  return a * a + b * b < 1;
}
const TRIEDA_CHODNIKOV = { pedestrian: DOSKY, footway: 128, steps: 128, corridor: 128, platform: 128, cycleway: 128 };

/** Mapa tried povrchu dlaždice (pre dlažbu z CC0 textúr v detailných dlaždiciach). */
export function vytvorTriedyDlazdice(d, rect, px = 1024, vyskopis = null) {
  return dokonci(krokyTriedDlazdice(d, rect, px, vyskopis));
}

/**
 * To isté po krokoch (generátor). Kanály sa skladajú bez čítania pixelov: trieda sa kreslí len do R,
 * zatienenie (G) a maska asfaltu (B) sa prefarbia násobením a pripočítajú („lighter“).
 */
export function* krokyTriedDlazdice(d, rect, px = 1024, vyskopis = null) {
  const c = document.createElement('canvas');
  c.width = c.height = px;
  const g = c.getContext('2d', { willReadFrequently: true });
  const mierka = px / (rect.maxX - rect.minX);
  const sx = (x) => (x - rect.minX) * mierka, sz = (z) => (z - rect.minZ) * mierka;
  const cesta = (body, uzavriet) => {
    g.beginPath();
    body.forEach(([x, z], i) => (i ? g.lineTo(sx(x), sz(z)) : g.moveTo(sx(x), sz(z))));
    if (uzavriet) g.closePath();
  };
  const seda = (v) => `rgb(${v},0,0)`;   // trieda len v kanáli R (G a B sa doplnia na konci)
  // nezaradená plocha je chodník len v zástavbe (okolo budov a ciest), inde (svahy, okraje parkov) ostáva prírodná
  g.fillStyle = seda(0);
  g.fillRect(0, 0, px, px);
  g.lineCap = 'round';
  g.lineJoin = 'round';
  // kanál B: asfaltový chodník (mimo historického jadra sú chodníky popri cestách väčšinou asfaltové);
  // maska sa kreslí do zvláštneho plátna a pri námestiach, pešej zóne a jadre sa zmaže
  const m = document.createElement('canvas'); m.width = m.height = px;
  const gm = m.getContext('2d', { willReadFrequently: true });   // v pamäti ako hlavné plátno (rýchle drawImage)
  gm.fillStyle = '#000'; gm.fillRect(0, 0, px, px);
  gm.lineCap = 'round'; gm.lineJoin = 'round';
  const maska = (body, uzavriet, biela, sirka) => {
    gm.beginPath();
    body.forEach(([x, z], i) => (i ? gm.lineTo(sx(x), sz(z)) : gm.moveTo(sx(x), sz(z))));
    if (uzavriet) gm.closePath();
    gm.fillStyle = gm.strokeStyle = biela ? '#fff' : '#000';
    if (sirka) { gm.lineWidth = sirka; gm.stroke(); } else gm.fill();
  };
  // okolie budov (chodník pri dome zo sivej zámkovej dlažby) a ciest (chodník popri ceste – asfalt)
  // (jadro aj tak prekreslí elipsa dosiek nižšie)
  g.strokeStyle = g.fillStyle = seda(128);
  for (const b of d.budovy ?? []) {
    g.lineWidth = 8 * mierka;
    cesta(b.body, true);
    g.stroke();
    g.fill();
  }
  for (const c_ of d.cesty ?? []) {
    if (c_.nadjazd) continue;
    g.lineWidth = ((c_.sirka ?? 6) + 7) * mierka;
    cesta(c_.body, false);
    g.stroke();
    maska(c_.body, false, true, g.lineWidth);
  }
  // historické jadro (Staré Mesto v hradbách a okolie): pešia zóna je z veľkých svetlých dosiek
  // (porovnanie so skutočnosťou, docs/porovnanie/opravy.md), drobné kocky len v obslužných uličkách
  g.fillStyle = seda(DOSKY);
  g.beginPath();
  g.ellipse(sx(JADRO.x), sz(JADRO.z), JADRO.rx * mierka, JADRO.rz * mierka, JADRO.uhol, 0, Math.PI * 2);
  g.fill();
  gm.fillStyle = '#000';
  gm.beginPath();
  gm.ellipse(sx(JADRO.x), sz(JADRO.z), JADRO.rx * mierka, JADRO.rz * mierka, JADRO.uhol, 0, Math.PI * 2);
  gm.fill();
  for (const p of d.pokryvka ?? []) {
    let v = TRIEDA_POKRYVKY[p.k] ?? 0;
    // námestia mimo historického jadra sú z betónových dlaždíc, nie z kamenných dosiek
    if (v === DOSKY && !p.body.some(([x, z]) => vJadre(x, z))) v = BETON;
    g.fillStyle = seda(v);
    cesta(p.body, true);
    g.fill();
    maska(p.body, true, false);
  }
  // strmé svahy bez inej pokrývky (napr. Hradný kopec) sú zatrávnené, nie holá hlina
  // (porovnanie so skutočnosťou, etapa 4) – len tam, kde je zatiaľ „príroda“ (trieda 0)
  yield;
  // (štvorce strmého svahu sa vyplnia trávou cez „lighten“ – zmení sa len trieda 0, vyššie triedy ostanú)
  if (vyskopis) {
    const K = 4, n = Math.round((rect.maxX - rect.minX) / K);
    g.beginPath();
    for (let j = 0; j < n; j++) {
      for (let i = 0; i < n; i++) {
        const x = rect.minX + (i + 0.5) * K, z = rect.minZ + (j + 0.5) * K;
        const sx_ = vyskopis.vyskaTerenu(x + 2, z) - vyskopis.vyskaTerenu(x - 2, z);
        const sz_ = vyskopis.vyskaTerenu(x, z + 2) - vyskopis.vyskaTerenu(x, z - 2);
        if (Math.hypot(sx_, sz_) / 4 <= 0.28) continue;
        const x0 = Math.floor(i * K * mierka), x1 = Math.min(px, Math.ceil((i + 1) * K * mierka));
        const y0 = Math.floor(j * K * mierka), y1 = Math.min(px, Math.ceil((j + 1) * K * mierka));
        g.rect(x0, y0, x1 - x0, y1 - y0);
      }
    }
    g.globalCompositeOperation = 'lighten';
    g.fillStyle = seda(TRIEDA_POKRYVKY.trava);
    g.fill();
    g.globalCompositeOperation = 'source-over';
  }
  yield;
  g.lineCap = 'round';
  g.lineJoin = 'round';
  for (const ch of d.chodniky ?? []) {
    if (ch.nadjazd) continue;            // lávka / nadchod – kreslí sa ako most (js/mapa/mosty/nadjazdy.js)
    let v = TRIEDA_CHODNIKOV[ch.typ];
    if (v === undefined) continue;
    // v historickom jadre nie sú samostatné chodníky – celá ulica je z kamenných dosiek
    if (v === 128 && ch.body.every(([x, z]) => vJadre(x, z))) v = DOSKY;
    // pešie zóny mimo jadra – betónové dlaždice
    if (v === DOSKY && ch.typ === 'pedestrian' && !ch.body.some(([x, z]) => vJadre(x, z))) v = BETON;
    g.strokeStyle = seda(v);
    g.lineWidth = Math.max(1, ch.sirka * mierka);
    // chodník cez námestie nemá prekresliť krajšiu dlažbu (betón, dosky) – „lighten“ nechá vyššiu triedu
    g.globalCompositeOperation = v === 128 ? 'lighten' : 'source-over';
    cesta(ch.body, false);
    g.stroke();
    if (v !== 128) maska(ch.body, false, false, g.lineWidth);
  }
  g.globalCompositeOperation = 'source-over';
  // obslužné uličky v jadre (bez asfaltového pásu) – drobné kocky
  for (const c_ of cestyVJadre(d.cesty)) {
    g.strokeStyle = seda(KOCKY);
    g.lineWidth = Math.max(1, (c_.sirka ?? 4) * mierka);
    cesta(c_.body, false);
    g.stroke();
    maska(c_.body, false, false, g.lineWidth);
  }
  yield;
  // kanál G: zatienenie zeme pri budovách (mäkký tieň pri päte domov – ulice nepôsobia „vznášajúco“)
  // domy sa nakreslia do 4× menšieho plátna, to sa raz rozmaže a zväčší (rozmazanie pri každom dome zvlášť
  // trvalo v hustej zástavbe aj sekundy – hra pri načítaní dlaždice zamrzla)
  const t2 = document.createElement('canvas'); t2.width = t2.height = px;
  const g2 = t2.getContext('2d', { willReadFrequently: true });
  g2.imageSmoothingEnabled = true;
  g2.imageSmoothingQuality = 'high';
  g2.drawImage(rozmazaneBudovy(d.budovy, rect, px), 0, 0, px, px);
  // šedá → len zelený kanál; maska asfaltu → len modrý kanál; potom sa sčítajú s triedou (R)
  g2.globalCompositeOperation = 'multiply';
  g2.fillStyle = 'rgb(0,255,0)'; g2.fillRect(0, 0, px, px);
  gm.globalCompositeOperation = 'multiply';
  gm.fillStyle = 'rgb(0,0,255)'; gm.fillRect(0, 0, px, px);
  g.globalCompositeOperation = 'lighter';
  g.drawImage(t2, 0, 0);
  g.drawImage(m, 0, 0);
  g.globalCompositeOperation = 'source-over';
  const t = new THREE.CanvasTexture(c);
  t.flipY = false;
  t.colorSpace = THREE.NoColorSpace;
  return t;
}

/** Dokončí generátor naraz (pre volania mimo streamovania dlaždíc). */
export function dokonci(gen) {
  let r = gen.next();
  while (!r.done) r = gen.next();
  return r.value;
}

/** Pôdorysy budov (biela na čiernom) v plátne px/4 × px/4, rozmazané o 2,2 m – mäkké zatienenie pri päte domov. */
function rozmazaneBudovy(budovy, rect, px) {
  const mp = Math.max(64, px >> 2), mm = mp / (rect.maxX - rect.minX);
  const ostre = document.createElement('canvas'); ostre.width = ostre.height = mp;
  const go = ostre.getContext('2d', { willReadFrequently: true });
  go.fillStyle = '#000'; go.fillRect(0, 0, mp, mp);
  go.fillStyle = '#fff';
  for (const b of budovy ?? []) {
    go.beginPath();
    b.body.forEach(([x, z], i) => (i ? go.lineTo((x - rect.minX) * mm, (z - rect.minZ) * mm) : go.moveTo((x - rect.minX) * mm, (z - rect.minZ) * mm)));
    go.closePath(); go.fill();
  }
  const rozm = document.createElement('canvas'); rozm.width = rozm.height = mp;
  const gr = rozm.getContext('2d', { willReadFrequently: true });
  gr.fillStyle = '#000'; gr.fillRect(0, 0, mp, mp);
  gr.filter = `blur(${Math.max(0.5, 2.2 * mm)}px)`;
  gr.drawImage(ostre, 0, 0);
  return rozm;
}

/** Obslužné cesty v historickom jadre – kreslia sa ako dlažba, nie ako asfalt. */
export function cestyVJadre(cesty = []) {
  return cesty.filter((c) => (c.typ === 'service' || c.typ === 'living_street') && c.body.every(([x, z]) => vJadre(x, z)));
}
