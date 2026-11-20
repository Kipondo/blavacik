// Doplní do hotových dlaždíc (data/mapa/mesto/d/*.json) podchody z OSM: pešie chodby pod zemou
// (highway=footway/pedestrian/path/cycleway s tunnel=yes, layer < 0 alebo level < 0) a schody / eskalátory,
// ktoré do nich vedú z povrchu (aj zahĺbené vstupy, napr. eskalátor na Kamennom námestí do podzemného podlažia).
//
// Do dlaždice pribudne "podchody": [{ typ: 'chodba' | 'schody', body: [[x,z],…], sirka, dole?: 0|1, vestibul?: 1 }]
//   chodba   – podzemná chodba (podlaha ~3,8 m pod terénom),
//   schody   – schody z povrchu do chodby; dole = index konca (0 = prvý bod, 1 = posledný), ktorý je dole,
//   vestibul – schody nevedú do zmapovanej chodby (vstup do podzemného podlažia budovy) – hra pridá krátku
//              krytú chodbu s dverami.
// Za podchod sa považuje len súvislá sieť podzemných chodieb, do ktorej vedú schody alebo rampa – chodník
// s tunnel=yes bez schodov je priechod pod násypom v úrovni terénu a ostáva na povrchu.
// Zodpovedajúce chodníky na povrchu sa z dlaždice odstránia (aby sa nekreslili nad podchodom).
// Opakované spustenie najprv odstráni podchody z predchádzajúceho behu (chodníky sa vrátia pregenerovaním).
// Spustenie: cd tools/mesto && node --max-old-space-size=8000 podchody.mjs

import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { nacitajPbf } from './pbf.mjs';
import { CACHE, VYSTUP, naMetre } from './spolocne.mjs';

const DLAZDICA = 500;
const PESIE = new Set(['footway', 'pedestrian', 'path', 'cycleway', 'corridor', 'steps']);
const cislo = (v) => { const n = parseFloat(String(v ?? '').split(';')[0].replace(',', '.')); return Number.isFinite(n) ? n : 0; };
const urovne = (v) => String(v ?? '').split(';').map((s) => parseFloat(s)).filter(Number.isFinite);
const r1 = (v) => Math.round(v * 10) / 10;

console.log('Načítavam OSM…');
const db = await nacitajPbf(join(CACHE, 'bratislavsky.osm.pbf'));

const jePodzemna = (t) => t.tunnel === 'yes' || t.tunnel === 'culvert' || cislo(t.layer) < 0
  || (urovne(t.level).length && Math.max(...urovne(t.level)) < 0 && t.indoor !== 'yes');
const vedieDole = (t) => t.highway === 'steps' && (urovne(t.level).some((l) => l < 0) || cislo(t.layer) < 0 || t.tunnel === 'yes');

// 1. podzemné pešie cesty a schody
const podzemne = new Map();     // id → way
const schody = new Map();
const uzlyPodzemne = new Map(); // uzol → počet podzemných ciest
for (const [id, w] of db.cesty) {
  const t = w.t;
  if (!PESIE.has(t.highway) || t.tunnel === 'building_passage' || t.tunnel === 'no') continue;
  if (t.highway === 'steps') {
    if (vedieDole(t) || t.conveying) schody.set(id, w);
    if (!jePodzemna(t)) continue;
  }
  if (!jePodzemna(t) || t.highway === 'steps') continue;
  podzemne.set(id, w);
  for (const n of w.nd) uzlyPodzemne.set(n, (uzlyPodzemne.get(n) ?? 0) + 1);
}
// schody bez podzemnej úrovne, ktoré sa ale napájajú na podzemnú chodbu (vchody do podchodu)
for (const [id, w] of db.cesty) {
  const t = w.t;
  if (t.highway !== 'steps' || schody.has(id)) continue;
  if (uzlyPodzemne.has(w.nd[0]) || uzlyPodzemne.has(w.nd.at(-1))) schody.set(id, w);
}

// 2. súvislé siete chodieb – podchod len ak do siete vedú schody
const sused = new Map();
for (const [id, w] of podzemne) for (const n of w.nd) { if (!sused.has(n)) sused.set(n, []); sused.get(n).push(id); }
const uzlySchodov = new Set();
for (const w of schody.values()) for (const n of [w.nd[0], w.nd.at(-1)]) uzlySchodov.add(n);
const platne = new Set();
const navstivene = new Set();
for (const id of podzemne.keys()) {
  if (navstivene.has(id)) continue;
  const komp = [], fronta = [id];
  navstivene.add(id);
  while (fronta.length) {
    const c = fronta.pop(); komp.push(c);
    for (const n of podzemne.get(c).nd) for (const d of sused.get(n) ?? []) if (!navstivene.has(d)) { navstivene.add(d); fronta.push(d); }
  }
  const maSchody = komp.some((c) => podzemne.get(c).nd.some((n) => uzlySchodov.has(n)) || /down|up/.test(podzemne.get(c).t.incline ?? ''));
  if (maSchody) for (const c of komp) platne.add(c);
}

const body = (w) => w.nd.map((n) => db.uzly.get(n)).filter(Boolean).map((u) => naMetre(u.lon, u.lat).map(r1));
const kluc = (b) => {
  const [x, z] = b[Math.floor(b.length / 2)];
  return `${Math.floor(x / DLAZDICA)}_${Math.floor(z / DLAZDICA)}`;
};
const zaradenie = new Map();
const pridaj = (k, p) => { if (!zaradenie.has(k)) zaradenie.set(k, []); zaradenie.get(k).push(p); };
let nChodieb = 0, nSchodov = 0, nVestibulov = 0;
for (const id of platne) {
  const w = podzemne.get(id), b = body(w);
  if (b.length < 2) continue;
  const sirka = cislo(w.t.width) || (w.t.highway === 'pedestrian' ? 6 : 4);
  pridaj(kluc(b), { typ: 'chodba', body: b, sirka: Math.max(3, Math.min(12, sirka)) });
  nChodieb++;
}
for (const w of schody.values()) {
  const b = body(w);
  if (b.length < 2) continue;
  const prvyDole = uzlyPodzemne.has(w.nd[0]) && platne.size && [...(sused.get(w.nd[0]) ?? [])].some((c) => platne.has(c));
  const poslednyDole = [...(sused.get(w.nd.at(-1)) ?? [])].some((c) => platne.has(c));
  let dole;
  if (prvyDole && !poslednyDole) dole = 0;
  else if (poslednyDole && !prvyDole) dole = 1;
  else if (w.t.incline === 'up') dole = 0;                 // ide sa hore v smere cesty → prvý bod je dole
  else if (w.t.incline === 'down') dole = 1;
  else {
    // podľa úrovní: level "-1;0" bez smeru – nevieme; skúsime terén nevieme tu, zvolíme koniec bližšie k podzemnej chodbe
    dole = 1;
  }
  const doChodby = prvyDole || poslednyDole;
  if (!doChodby && !vedieDole(w.t) && !w.t.conveying) continue;
  if (!doChodby && !(vedieDole(w.t))) continue;
  const p = { typ: 'schody', body: b, sirka: Math.max(2, Math.min(8, cislo(w.t.width) || 3)), dole };
  if (!doChodby) { p.vestibul = 1; nVestibulov++; }
  pridaj(kluc(b), p);
  nSchodov++;
}
console.log(`podzemných chodieb ${nChodieb}, schodov ${nSchodov} (z toho vstupov do podzemných podlaží ${nVestibulov})`);

// 3. zápis do dlaždíc + odstránenie chodníkov na povrchu nad chodbami
const vzdialenostOdLomenej = (x, z, b) => {
  let m = Infinity;
  for (let i = 1; i < b.length; i++) {
    const [ax, az] = b[i - 1], [bx, bz] = b[i];
    const dx = bx - ax, dz = bz - az, l = dx * dx + dz * dz || 1;
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / l));
    m = Math.min(m, Math.hypot(ax + dx * t - x, az + dz * t - z));
  }
  return m;
};
const dir = join(VYSTUP, 'd');
let zapisane = 0, odstranene = 0;
const vsetkyChodby = [...zaradenie.values()].flat().filter((p) => p.typ === 'chodba');
for (const subor of readdirSync(dir)) {
  if (!subor.endsWith('.json')) continue;
  const k = subor.replace('.json', '');
  const cesta = join(dir, subor);
  const d = JSON.parse(readFileSync(cesta, 'utf8'));
  const nove = zaradenie.get(k) ?? [];
  if (!d.podchody && !nove.length) continue;
  // chodníky na povrchu, ktoré celé ležia nad podzemnou chodbou (aj zo susednej dlaždice)
  const [i, j] = k.split('_').map(Number);
  const blizke = vsetkyChodby.filter((c) => c.body.some(([x, z]) => x > i * DLAZDICA - 50 && x < (i + 1) * DLAZDICA + 50 && z > j * DLAZDICA - 50 && z < (j + 1) * DLAZDICA + 50));
  if (blizke.length) {
    const pred = d.chodniky?.length ?? 0;
    d.chodniky = (d.chodniky ?? []).filter((ch) => !blizke.some((c) => ch.body.every(([x, z]) => vzdialenostOdLomenej(x, z, c.body) < Math.max(1.5, c.sirka / 2))));
    odstranene += pred - d.chodniky.length;
  }
  if (nove.length) d.podchody = nove; else delete d.podchody;
  writeFileSync(cesta, JSON.stringify(d));
  zapisane++;
}
console.log(`zapísané do ${zapisane} dlaždíc, odstránených chodníkov na povrchu ${odstranene}`);
