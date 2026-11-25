// Ostatné mosty ponad rieky (Malý Dunaj, Chorvátske rameno, prístav, D4 Lužný most, Čunovo…) → data/mapa/mosty-rieky.json.
//
// V dlaždiciach sú cesty a koľaje s OSM bridge=* ponad rieku označené ako most, ale v hre pod nimi mostovka nebola:
// index.json má len pomenované mosty (os z PCA všetkých úsekov s menom – často vedľa cesty) a nadjazdy z dlaždíc
// úseky ponad rieku vynechávajú (tools/mesto/nadjazdy.mjs). Autá aj električky tam išli do vody.
// Tu sa každý taký most nájde priamo z ciest a koľají v dlaždiciach:
//   – reťaz úsekov s most=true (spojené cez hranice dlaždíc), ktorá ide ponad rieku a nie je na moste cez Dunaj
//     (tools/mesto/mosty-dunaj.mjs) → os mosta = os cesty, šírka podľa cesty,
//   – výška mostovky z laseru DMP (INSPIRE WMS ÚGKK) po 8 m; keď most v laseri nie je (D4 je novší ako sken),
//     odhad: nad Dunajom 17 m nad vodou, nad menšími tokmi 3 m, rampy so sklonom cesty (4 %) alebo trate (1,5 %),
//   – koniec na zemi (opora) alebo napojený na nadjazd / iný most (výška z laseru, nadjazd sa naň napojí),
//   – podjazdy (cesty a koľaje pod mostom – tam piliere nestoja).
//
// Spustenie (z koreňa repozitára, potrebuje internet na laser): node tools/mesto/mosty-rieky.mjs
// Laserové body sa pamätajú v .cache/mesto/dmp-mosty.json (ďalší beh je rýchly).

import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { KOREN, VYSTUP, VYSKA_NULA } from './spolocne.mjs';
import { r1, r2, teren, podjazdy, vytvorOs, laserBody, ulozPamat } from './mosty-spolocne.mjs';
import { vytvorMostyVyskopisu } from '../../js/mapa/teren/mosty-vyskopisu.js';

const AUTA = new Set(['motorway', 'motorway_link', 'trunk', 'trunk_link', 'primary', 'primary_link', 'secondary', 'secondary_link',
  'tertiary', 'tertiary_link', 'unclassified', 'residential', 'service', 'living_street', 'track', 'road']);
const KROK = 8;

const index = JSON.parse(readFileSync(join(VYSTUP, 'index.json'), 'utf8'));
const rieky = index.voda.filter((v) => v.reka !== false && v.body?.length > 2).map((v) => {
  let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9;
  for (const [x, z] of v.body) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); z0 = Math.min(z0, z); z1 = Math.max(z1, z); }
  return { ...v, x0, x1, z0, z1 };
});
const vPoly = (x, z, b) => {
  let c = false;
  for (let i = 0, j = b.length - 1; i < b.length; j = i++) {
    const [xi, zi] = b[i], [xj, zj] = b[j];
    if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) c = !c;
  }
  return c;
};
const rieka = (x, z) => rieky.find((r) => x >= r.x0 && x <= r.x1 && z >= r.z0 && z <= r.z1 && vPoly(x, z, r.body)) ?? null;

// mosty cez Dunaj s presnými údajmi – ich cesty sa tu nerátajú
const dunaj = JSON.parse(readFileSync(join(KOREN, 'data', 'mapa', 'mosty-dunaj.json'), 'utf8')).mosty
  .map((m) => ({ ...m, o: vytvorOs(m.os ?? [m.od, m.do]) }));
function blizkoOsi(o, x, z) {
  let naj = Infinity, sNaj = 0;
  for (let i = 1; i < o.body.length; i++) {
    const [ax, az] = o.body[i - 1], [bx, bz] = o.body[i];
    const dx = bx - ax, dz = bz - az, l2 = dx * dx + dz * dz || 1;
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / l2));
    const d = Math.hypot(ax + dx * t - x, az + dz * t - z);
    if (d < naj) { naj = d; sNaj = o.S[i - 1] + t * Math.sqrt(l2); }
  }
  return { d: naj, s: sNaj };
}
const naDunaji = (x, z) => dunaj.some((m) => blizkoOsi(m.o, x, z).d <= m.sirka / 2 + 3);

// --- 1. úseky s most=true z dlaždíc ---------------------------------------------------------------------------------
const kusy = [];
const konceNadjazdov = [];
for (const f of readdirSync(join(VYSTUP, 'd'))) {
  const d = JSON.parse(readFileSync(join(VYSTUP, 'd', f), 'utf8'));
  for (const n of d.nadjazdy ?? []) if (n.body?.length > 1) konceNadjazdov.push(n.body[0], n.body.at(-1));
  for (const c of d.cesty ?? []) if (c.most && !c.nadjazd && c.body?.length > 1) kusy.push({ druh: AUTA.has(c.typ) ? 'cesta' : 'chodnik', typ: c.typ, nazov: c.nazov ?? '', sirka: c.sirka ?? 6, body: c.body });
  // cesta pre autá bez mosta, ktorá v OSM vedie cez vodnú plochu (koruna hrádze, prepad) – v hre by bola pod
  // hladinou (koryto sa vyhĺbi podľa polygónu rieky); stavia sa ako násyp vo výške z laseru
  for (const c of d.cesty ?? []) {
    if (c.most || c.nadjazd || c.tunel || !AUTA.has(c.typ) || !(c.body?.length > 1)) continue;
    let vo = 0;
    for (let i = 1; i < c.body.length; i++) {
      const [ax, az] = c.body[i - 1], [bx, bz] = c.body[i];
      const L = Math.hypot(bx - ax, bz - az), k = Math.max(1, Math.ceil(L / 3));
      for (let j = 0; j < k; j++) if (rieka(ax + (bx - ax) * (j + 0.5) / k, az + (bz - az) * (j + 0.5) / k)) vo += L / k;
    }
    if (vo >= 15) kusy.push({ druh: 'cesta', typ: c.typ, nazov: c.nazov ?? '', sirka: c.sirka ?? 6, body: c.body, hradza: true });
  }
  for (const k of d.kolajnice ?? []) if (k.most && k.body?.length > 1) kusy.push({ druh: 'kolaj', typ: k.typ, nazov: '', sirka: k.typ === 'elektricka' ? 7 : 6, body: k.body });
}

// --- 2. reťaze cez hranice dlaždíc (rovnaký druh, typ a meno, spoločný koncový bod) ---------------------------------
const rovnaky = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]) < 0.6;
const retaze = [];
const zostatok = kusy.slice();
while (zostatok.length) {
  const r = zostatok.pop();
  let body = r.body.slice();
  for (let zmena = true; zmena;) {
    zmena = false;
    for (let i = zostatok.length - 1; i >= 0; i--) {
      const k = zostatok[i];
      if (k.druh !== r.druh || k.typ !== r.typ || k.nazov !== r.nazov || !!k.hradza !== !!r.hradza) continue;
      const b = k.body;
      if (rovnaky(body.at(-1), b[0])) body = [...body, ...b.slice(1)];
      else if (rovnaky(body.at(-1), b.at(-1))) body = [...body, ...b.slice(0, -1).reverse()];
      else if (rovnaky(body[0], b.at(-1))) body = [...b.slice(0, -1), ...body];
      else if (rovnaky(body[0], b[0])) body = [...b.slice(1).reverse(), ...body];
      else continue;
      zostatok.splice(i, 1);
      zmena = true;
    }
  }
  retaze.push({ ...r, body });
}

// --- 3. len reťaze ponad rieku, mimo mostov cez Dunaj --------------------------------------------------------------
const mostyRieky = [];
for (const r of retaze) {
  const o = vytvorOs(r.body);
  if (o.L < 3) continue;
  const vzorky = [];
  for (let s = 0; s <= o.L + 0.01; s += 2) vzorky.push(o.bod(Math.min(s, o.L)));
  const nadVodou = vzorky.filter(([x, z]) => rieka(x, z));
  if (!nadVodou.length) continue;
  if (vzorky.every(([x, z]) => naDunaji(x, z))) continue;
  mostyRieky.push({ ...r, o, riekaNazov: rieka(...nadVodou[Math.floor(nadVodou.length / 2)])?.nazov ?? '' });
}
console.log(`reťazí s mostom: ${retaze.length}, ponad rieku mimo Dunaja: ${mostyRieky.length}`);

// mostovky mostov cez Dunaj (rovnaký výpočet ako v hre) – na trať pod Prístavným mostom
const presne = vytvorMostyVyskopisu(dunaj, { vyskaTerenu: teren, jeVRieke: (x, z) => !!rieka(x, z) });

// --- 4. výškový profil ---------------------------------------------------------------------------------------------
// koniec napojený na nadjazd z dlaždice alebo na iný most (napr. ďalší úsek estakády D4) – nie je na zemi
const napojeny = (p, ja) => konceNadjazdov.some((q) => rovnaky(p, q))
  || retaze.some((r) => r !== ja && (rovnaky(p, r.body[0]) || rovnaky(p, r.body.at(-1))))
  || dunaj.some((d) => blizkoOsi(d.o, p[0], p[1]).d <= d.sirka / 2 + 1);
const vystup = { popis: 'Mosty ponad rieky okrem mostov cez Dunaj (tie sú v mosty-dunaj.json) – os a šírka z ciest v dlaždiciach, výška mostovky z laseru DMP ÚGKK. Vyrába tools/mesto/mosty-rieky.mjs.', mosty: [] };
let poradie = 0;
for (const m of mostyRieky) {
  const o = m.o;
  const sirka = m.druh === 'cesta' ? m.sirka + 2.5 : m.druh === 'kolaj' ? m.sirka : m.sirka + 1;
  const bocne = sirka > 9 ? [-sirka / 4, sirka / 4] : [0];
  const sy = [];
  for (let s = 0; s <= o.L + 0.01; s += KROK) sy.push(Math.min(s, o.L));
  if (sy.at(-1) < o.L - 0.5) sy.push(o.L);
  // body na osi a bočne (laser: najnižšia z bočných vzoriek = vozovka bez áut)
  const tangent = (s) => { const a = o.bod(Math.max(0, s - 1)), b = o.bod(Math.min(o.L, s + 1)); const l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1; return [(b[0] - a[0]) / l, (b[1] - a[1]) / l]; };
  const dotazy = [];
  for (const s of sy) {
    const [x, z] = o.bod(s), [tx, tz] = tangent(s);
    for (const n of bocne) dotazy.push([x + tz * n, z - tx * n]);
  }
  const dsm = await laserBody(dotazy, 'dsm');
  const zem = sy.map((s) => teren(...o.bod(s)));
  const voda = sy.map((s) => rieka(...o.bod(s)));
  const hl = sy.map((_, i) => {
    const v = dsm.slice(i * bocne.length, (i + 1) * bocne.length).filter((y) => y !== null);
    return v.length ? Math.min(...v) : null;
  });
  // trať pod mostom cez Dunaj (dolné podlažie Prístavného mosta): laser vidí diaľnicu nad ňou – výška koľaje je
  // pod mostovkou (model z Blendera, tools/blender/mosty/pristavny_most.py: koľaj ~10 m pod vozovkou), všeobecný
  // model sa tu nestavia (bezModelu)
  const podMostom = sy.map((s) => {
    const r = m.druh === 'kolaj' ? presne.mostovka(...o.bod(s)) : null;
    return r && r.m.nazov === 'Prístavný most' ? r.h - 10.0 : null;
  });
  podMostom.forEach((h, i) => { if (h !== null) hl[i] = h; });
  const bezModelu = [];
  for (let i = 0; i < sy.length; i++) {
    if (podMostom[i] === null) continue;
    let j = i;
    while (j + 1 < sy.length && podMostom[j + 1] !== null) j++;
    bezModelu.push([r1(sy[Math.max(0, i - 1)]), r1(sy[Math.min(sy.length - 1, j + 1)])]);
    i = j;
  }
  // je most v laseri? nad vodou musí byť povrch aspoň 1,5 m nad hladinou (inak laser vidí vodu – most je novší)
  const iVoda = sy.map((_, i) => i).filter((i) => voda[i]);
  const platne = iVoda.filter((i) => hl[i] !== null && hl[i] - zem[i] > 1.5);
  // cesta po hrádzi: vždy z laseru (koruna hrádze), najmenej 1 m nad vodou
  const zLasera = m.hradza || (iVoda.length > 0 && platne.length >= 0.6 * iVoda.length);
  if (m.hradza) hl.forEach((v, i) => { hl[i] = Math.max(v ?? zem[i], zem[i] + 1.0); });
  const ja = retaze.find((r) => r.body === m.body);
  const konce = [napojeny(o.body[0], ja), napojeny(o.body.at(-1), ja)];
  let profil;
  if (zLasera) {
    // dolná obálka (2. najnižšia v okne 3 vzoriek) – bez áut a stožiarov; neplatné body doplní lineárne
    const h = hl.map((v, i) => {
      const okno = [hl[i - 1], v, hl[i + 1]].filter((y) => y !== null && y > zem[i] - 1);
      okno.sort((a, b) => a - b);
      return okno.length ? okno[Math.min(1, okno.length - 1)] : null;
    });
    for (let i = 0; i < h.length; i++) {
      if (h[i] !== null) continue;
      let a = i - 1, b = i + 1;
      while (a >= 0 && h[a] === null) a--;
      while (b < h.length && h[b] === null) b++;
      h[i] = a >= 0 && b < h.length ? h[a] + (h[b] - h[a]) * (sy[i] - sy[a]) / (sy[b] - sy[a]) : (a >= 0 ? h[a] : b < h.length ? h[b] : zem[i]);
    }
    // trať má sklon najviac ~1 %: laser nad ňou vidí aj nadjazdy a diaľnicu, ktoré ju križujú – dolná obálka so
    // sklonom 1,2 % ich odstráni (skutočná niveleta trate pod ňu nikdy neklesne)
    if (m.druh === 'kolaj') {
      const h0 = h.slice();
      for (let i = 0; i < h.length; i++) for (let j = 0; j < h.length; j++) h[i] = Math.min(h[i], h0[j] + 0.012 * Math.abs(sy[i] - sy[j]));
    }
    profil = sy.map((s, i) => [r1(s), r2(h[i])]);
  } else {
    // odhad (most je novší ako laser – D4, nová električka): svetlá výška nad vodou podľa dĺžky premostenia vody
    // (≥ 200 m = splavný Dunaj 17 m, ≥ 60 m 6 m, inak 2,5 m) + konštrukcia, rampy so sklonom; konce na zemi
    const sklon = m.druh === 'kolaj' ? 0.015 : o.L > 300 ? 0.03 : 0.04;
    const dlzkaVody = iVoda.length * KROK;
    const svetla = dlzkaVody >= 200 ? 17 : dlzkaVody >= 60 ? 6 : 2.5;
    const konstr = m.druh === 'chodnik' ? 0.6 : m.druh === 'kolaj' ? 1.5 : 1.2;
    // dlhý most (D4 Lužný most – estakády ponad lužný les) ide aj nad zemou na pilieroch ~8 m vysoko; konce na zemi
    // pre oba jazdné pásy rovnako (napojený koniec by inak dal pásom rôznu výšku)
    const dlhy = o.L > 300;
    if (o.L > 1000) konce[0] = konce[1] = false;
    const potreba = sy.map((s, i) => (voda[i] ? zem[i] + svetla + konstr : zem[i] + (dlhy ? 8 : 0.3)));
    const hA = konce[0] ? null : zem[0], hB = konce[1] ? null : zem.at(-1);
    // krátky most nad úzkym tokom ostane takmer v rovine brehov: od konca na zemi stúpa najviac sklonom
    // (rampa 4 %, trať 1,5 %) – predtým mal 30 m mostík električky hrb 4 m
    const strop = (s) => Math.min(hA !== null ? hA + sklon * s : Infinity, hB !== null ? hB + sklon * (o.L - s) : Infinity);
    profil = sy.map((s, i) => {
      const zaklad = hA !== null && hB !== null ? hA + (hB - hA) * s / o.L : hA ?? hB ?? Math.max(...potreba);
      let h = zaklad;
      for (let j = 0; j < sy.length; j++) h = Math.max(h, potreba[j] - sklon * Math.abs(s - sy[j]));
      return [r1(s), r2(Math.max(zaklad, Math.min(h, strop(s))))];
    });
  }
  // koniec na zemi: výška terénu (hra ju vezme z podrobného terénu); napojený koniec drží výšku z profilu
  if (!konce[0]) profil[0] = [0, r2(zem[0]), 1];
  if (!konce[1]) profil[profil.length - 1] = [r1(o.L), r2(zem.at(-1)), 1];
  // riadiace body najviac po 16 m (krivka v hre je plynulá)
  const riedke = profil.filter((p, i) => i === 0 || i === profil.length - 1 || i % 2 === 0);
  const nazov = `${m.nazov || (m.hradza ? 'hrádza' : { motorway: 'diaľnica', kolaj: 'trať' }[m.typ] ?? (m.druh === 'kolaj' ? 'trať' : 'most'))} cez ${m.riekaNazov || 'rieku'} #${++poradie}`;
  vystup.mosty.push({
    nazov, druh: m.druh, typ: m.typ,
    od: o.body[0].map(r1), do: o.body.at(-1).map(r1), os: o.body.map((b) => b.map(r1)),
    sirka: r1(sirka), vrch: r2(Math.max(...riedke.map((p) => p[1]))), profil: riedke,
    zdroj: zLasera ? 'laser' : 'odhad', konce: konce.map((k) => (k ? 'napojeny' : 'zem')),
    ...(bezModelu.length ? { bezModelu } : {}),
    // cesta po hrádzi: pod ňou nie je voľný priestor – povrch pre všetko, model so stenami až do zeme
    ...(m.hradza ? { nasypy: [[0, r1(o.L)]], hradza: true } : {}),
    podjazdy: podjazdy(o),
  });
  console.log(`${nazov}: ${o.L.toFixed(0)} m, ${zLasera ? 'laser' : 'odhad'}, mostovka ${(Math.max(...riedke.map((p) => p[1])) + VYSKA_NULA).toFixed(1)} m n. m., konce ${konce.map((k) => (k ? 'napojený' : 'zem')).join('/')}`);
  ulozPamat();
}
writeFileSync(join(KOREN, 'data', 'mapa', 'mosty-rieky.json'), JSON.stringify(vystup));
console.log(`Hotovo: data/mapa/mosty-rieky.json (${vystup.mosty.length} mostov)`);
