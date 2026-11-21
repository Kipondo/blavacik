// Doplní do hotových dlaždíc (data/mapa/mesto/d/*.json) nadjazdy, lávky a nadchody z OSM:
// cesty pre autá, chodníky, cyklotrasy, schody aj koľaje s bridge=* (okrem mostov cez Dunaj – tie sú
// pamiatky a mostovky v index.json). Laserový terén (DMR) most nemá – pod mostom je zem, na koncoch násyp,
// preto hra mostovku vedie od výšky terénu na jednom konci k druhému a nad cestou / koľajou ju zdvihne
// na podjazdnú výšku (js/mapa/mosty/nadjazdy.js).
//
// Do dlaždice (podľa stredu mosta) pribudne "nadjazdy": [{ druh, typ, sirka, body: [[x,z],…], pod: [[s0, s1, co], …], volne }]
//   druh – 'cesta' | 'chodnik' | 'kolaj'; typ – highway / railway z OSM; sirka v m
//   pod  – úseky (v m od začiatku), pod ktorými je cesta (co = 1), koľaj (2) alebo voda (3) – tam treba podjazdnú výšku
//   volne – [začiatok, koniec]: 1 = koniec sa napája na iný most (výšku neurčuje terén)
// Cesty, chodníky a koľaje dlaždíc, ktoré ležia na moste, dostanú "nadjazd": 1 – hra ich nekreslí na zem.
// Opakované spustenie najprv zmaže výsledok predchádzajúceho behu.
// Spustenie: cd tools/mesto && node --max-old-space-size=8000 nadjazdy.mjs

import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { nacitajPbf } from './pbf.mjs';
import { CACHE, VYSTUP, naMetre, DLAZDICA } from './spolocne.mjs';

const CESTY = {
  motorway: 15, motorway_link: 7, trunk: 15, trunk_link: 7, primary: 14, primary_link: 7, secondary: 12, secondary_link: 7,
  tertiary: 10, tertiary_link: 6, unclassified: 8, residential: 8, living_street: 6, service: 5,
};
const PESIE = { footway: 2.5, path: 2, steps: 2.5, cycleway: 2.5, pedestrian: 6, track: 3, bridleway: 2.5 };
const KOLAJE = new Set(['tram', 'rail', 'light_rail', 'narrow_gauge']);
const cislo = (v) => { const n = parseFloat(String(v ?? '').split(';')[0].replace(',', '.')); return Number.isFinite(n) ? n : 0; };
const r1 = (v) => Math.round(v * 10) / 10;

function druh(t) {
  if (t.highway && CESTY[t.highway] && t.area !== 'yes') return 'cesta';
  if (t.highway && PESIE[t.highway] && t.area !== 'yes') return 'chodnik';
  if (KOLAJE.has(t.railway)) return 'kolaj';
  return null;
}
function sirka(t, d) {
  if (d === 'cesta') {
    const w = cislo(t.width);
    if (w) return w;
    const pruhy = parseInt(t.lanes) || 0;
    return pruhy ? pruhy * 3.3 + 1 : CESTY[t.highway];
  }
  if (d === 'chodnik') return Math.max(1.5, Math.min(12, cislo(t.width) || PESIE[t.highway]));
  return Math.max(1, parseInt(t.tracks) || 1) * 4.5;
}

console.log('Načítavam OSM…');
const db = await nacitajPbf(join(CACHE, 'bratislavsky.osm.pbf'));
const index = JSON.parse(readFileSync(join(VYSTUP, 'index.json'), 'utf8'));
const riekyMena = new Set((index.mosty ?? []).map((m) => m.nazov));
const rieky = (index.voda ?? []).filter((v) => v.reka !== false && v.body?.length > 2);

const bodVPolygone = (x, z, b) => {
  let c = false;
  for (let i = 0, j = b.length - 1; i < b.length; j = i++) {
    const [xi, zi] = b[i], [xj, zj] = b[j];
    if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) c = !c;
  }
  return c;
};
const telo = (w) => w.nd.map((n) => db.uzly.get(n)).filter(Boolean).map((u) => naMetre(u.lon, u.lat));

// 1. mosty (cesty, chodníky, koľaje), bez mostov cez Dunaj
const mostne = new Map();
for (const [id, w] of db.cesty) {
  const t = w.t;
  if (!t.bridge || t.bridge === 'no' || t.tunnel === 'yes' || cislo(t.layer) < 0) continue;
  const d = druh(t);
  if (!d) continue;
  if (t.name && riekyMena.has(t.name)) continue;
  const b = telo(w);
  if (b.length < 2) continue;
  // most ponad rieku (Dunaj, Malý Dunaj, Morava) rieši index.json / pamiatky
  const nadRiekou = b.some(([x, z], i) => i > 0 && rieky.some((r) => bodVPolygone((x + b[i - 1][0]) / 2, (z + b[i - 1][1]) / 2, r.body)));
  if (nadRiekou && (d !== 'chodnik' || b.length > 2)) continue;
  mostne.set(id, { id, w, t, druh: d, b });
}
console.log(`mostných úsekov: ${mostne.size}`);

// 2. reťaze: úseky rovnakého druhu spojené v uzle, kde sa stretávajú práve dva mostné úseky
const vUzle = new Map();
for (const m of mostne.values()) for (const n of [m.w.nd[0], m.w.nd.at(-1)]) { if (!vUzle.has(n)) vUzle.set(n, []); vUzle.get(n).push(m); }
const pouzite = new Set();
const retaze = [];
for (const m of mostne.values()) {
  if (pouzite.has(m.id)) continue;
  pouzite.add(m.id);
  let uzly = [...m.w.nd];
  const pokracuj = (naKonci) => {
    for (;;) {
      const n = naKonci ? uzly.at(-1) : uzly[0];
      const kand = (vUzle.get(n) ?? []).filter((o) => !pouzite.has(o.id) && o.druh === m.druh);
      if ((vUzle.get(n) ?? []).length !== 2 || kand.length !== 1) return;
      const o = kand[0];
      pouzite.add(o.id);
      let nd = [...o.w.nd];
      if (naKonci ? nd[0] !== n : nd.at(-1) !== n) nd.reverse();
      uzly = naKonci ? [...uzly, ...nd.slice(1)] : [...nd.slice(0, -1), ...uzly];
    }
  };
  pokracuj(true);
  pokracuj(false);
  const b = uzly.map((n) => db.uzly.get(n)).filter(Boolean).map((u) => naMetre(u.lon, u.lat));
  // voľný koniec = v uzle sa stretáva s iným mostom (rampy mimoúrovňových križovatiek) – výšku tam neurčuje terén
  const volny = (n) => ((vUzle.get(n) ?? []).length > 1 ? 1 : 0);
  retaze.push({ druh: m.druh, typ: m.t.highway ?? m.t.railway, sirka: r1(sirka(m.t, m.druh)), body: b, nazov: m.t.name ?? '', volne: [volny(uzly[0]), volny(uzly.at(-1))] });
}
console.log(`mostov (reťazí): ${retaze.length}`);

// 3. čo je pod mostom: cesty a koľaje bez mosta a tunela, vodné toky
const usekyPod = [];
for (const w of db.cesty.values()) {
  const t = w.t;
  if (t.bridge && t.bridge !== 'no') continue;
  if (t.tunnel === 'yes') continue;
  let co = 0, pol = 0;
  if (t.highway && CESTY[t.highway] && t.area !== 'yes') { co = 1; pol = sirka(t, 'cesta') / 2; }
  else if (KOLAJE.has(t.railway)) { co = 2; pol = 2.5; }
  else if (['river', 'stream', 'canal', 'ditch', 'drain'].includes(t.waterway)) { co = 3; pol = cislo(t.width) / 2 || 2; }
  if (!co) continue;
  const b = telo(w);
  for (let i = 1; i < b.length; i++) usekyPod.push({ a: b[i - 1], b: b[i], co, pol });
}
const MRIEZKA = 50;
const mriezka = new Map();
for (const u of usekyPod) {
  const x0 = Math.floor(Math.min(u.a[0], u.b[0]) / MRIEZKA), x1 = Math.floor(Math.max(u.a[0], u.b[0]) / MRIEZKA);
  const z0 = Math.floor(Math.min(u.a[1], u.b[1]) / MRIEZKA), z1 = Math.floor(Math.max(u.a[1], u.b[1]) / MRIEZKA);
  for (let i = x0; i <= x1; i++) for (let j = z0; j <= z1; j++) {
    const k = `${i},${j}`;
    if (!mriezka.has(k)) mriezka.set(k, []);
    mriezka.get(k).push(u);
  }
}
const odUsecky = (x, z, [ax, az], [bx, bz]) => {
  const dx = bx - ax, dz = bz - az, l = dx * dx + dz * dz || 1;
  const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / l));
  return Math.hypot(ax + dx * t - x, az + dz * t - z);
};
// (ux, uz) = smer mosta; súbežné úseky (cesta, ktorá na most nadväzuje) sa nerátajú – pod mostom ide
// cesta vždy šikmo alebo kolmo
function coJePod(x, z, polSirka, ux, uz) {
  let co = 0;
  for (const u of mriezka.get(`${Math.floor(x / MRIEZKA)},${Math.floor(z / MRIEZKA)}`) ?? []) {
    if (odUsecky(x, z, u.a, u.b) >= u.pol + polSirka * 0.3 + 1.5) continue;
    const dx = u.b[0] - u.a[0], dz = u.b[1] - u.a[1], l = Math.hypot(dx, dz) || 1;
    if (Math.abs((dx * ux + dz * uz) / l) > 0.9) continue;
    co = co === 0 || u.co < co ? u.co : co;
  }
  return co;
}
for (const r of retaze) {
  const pod = [];
  let s = 0, akt = null;
  for (let i = 1; i < r.body.length; i++) {
    const [ax, az] = r.body[i - 1], [bx, bz] = r.body[i];
    const L = Math.hypot(bx - ax, bz - az);
    for (let u = 0; u < L; u += 2) {
      const x = ax + ((bx - ax) * u) / L, z = az + ((bz - az) * u) / L;
      const co = coJePod(x, z, r.sirka / 2, (bx - ax) / L, (bz - az) / L);
      if (co && akt && akt[2] === co) akt[1] = r1(s + u);
      else if (co) { akt = [r1(s + u), r1(s + u), co]; pod.push(akt); }
      else akt = null;
    }
    s += L;
  }
  r.dlzka = s;
  r.pod = pod.map(([a, b, co]) => [r1(Math.max(0, a - 2)), r1(Math.min(s, b + 2)), co]);
  r.body = r.body.map(([x, z]) => [r1(x), r1(z)]);
}

// 4. zápis do dlaždíc: most do dlaždice podľa stredu, príznak "nadjazd" na cestách, chodníkoch a koľajach na moste
const kluc = (b) => {
  const [x, z] = b[Math.floor(b.length / 2)];
  return `${Math.floor(x / DLAZDICA)}_${Math.floor(z / DLAZDICA)}`;
};
const zaradenie = new Map();
for (const r of retaze) {
  const k = kluc(r.body);
  if (!zaradenie.has(k)) zaradenie.set(k, []);
  const { dlzka, ...zapis } = r;
  if (!zapis.nazov) delete zapis.nazov;
  if (!zapis.pod.length) delete zapis.pod;
  if (!zapis.volne[0] && !zapis.volne[1]) delete zapis.volne;
  zaradenie.get(k).push(zapis);
}
const odLomenej = (x, z, b) => { let m = Infinity; for (let i = 1; i < b.length; i++) m = Math.min(m, odUsecky(x, z, b[i - 1], b[i])); return m; };
const DRUH_POLOZIEK = { cesty: 'cesta', chodniky: 'chodnik', kolajnice: 'kolaj' };
const dir = join(VYSTUP, 'd');
let zapisane = 0;
const oznacene = { cesty: 0, chodniky: 0, kolajnice: 0 };
for (const subor of readdirSync(dir)) {
  if (!subor.endsWith('.json')) continue;
  const k = subor.replace('.json', '');
  const cesta = join(dir, subor);
  const d = JSON.parse(readFileSync(cesta, 'utf8'));
  const [i, j] = k.split('_').map(Number);
  const okolie = retaze.filter((r) => r.body.some(([x, z]) => x > i * DLAZDICA - 60 && x < (i + 1) * DLAZDICA + 60 && z > j * DLAZDICA - 60 && z < (j + 1) * DLAZDICA + 60));
  let zmena = !!d.nadjazdy;
  delete d.nadjazdy;
  for (const kl of Object.keys(DRUH_POLOZIEK)) for (const p of d[kl] ?? []) if (p.nadjazd) { delete p.nadjazd; zmena = true; }
  for (const kl of Object.keys(DRUH_POLOZIEK)) {
    for (const p of d[kl] ?? []) {
      const naMoste = okolie.some((r) => r.druh === DRUH_POLOZIEK[kl] && p.body.every(([x, z]) => odLomenej(x, z, r.body) < Math.max(1.2, r.sirka / 2)));
      if (naMoste) { p.nadjazd = 1; oznacene[kl]++; zmena = true; }
    }
  }
  const nove = zaradenie.get(k);
  if (nove?.length) { d.nadjazdy = nove; zmena = true; }
  if (!zmena) continue;
  writeFileSync(cesta, JSON.stringify(d));
  zapisane++;
}
console.log(`zapísané do ${zapisane} dlaždíc; na moste: ${oznacene.cesty} ciest, ${oznacene.chodniky} chodníkov, ${oznacene.kolajnice} koľají`);
