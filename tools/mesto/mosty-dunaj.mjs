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

import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { KOREN, VYSTUP, VYSKA_NULA } from './spolocne.mjs';
import { r1, r2, teren, podjazdy, vytvorOs } from './mosty-spolocne.mjs';

// --- prieskum (napady/pamiatky-podklady.md, časť „Mosty cez Dunaj“) ----------------------------------------------
// s = metre pozdĺž osi od bodu „od“ v index.json (záporné = za ním), výšky v m n. m. (hra: y = v − 139).
// rozsah = kde most podľa OSM začína a končí; profil = [s, výška | 'zem']; piliere = polohy riečnych a pobrežných
// pilierov (s); podjazdy dopočíta skript z ciest a koľají v dlaždiciach.
import { MOSTY } from './mosty-dunaj-data.mjs';

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
