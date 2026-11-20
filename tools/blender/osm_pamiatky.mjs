// Vytiahne z OSM historické budovy Starého Mesta podľa mien (zoznam významných budov) aj s ich
// časťami (building:part) pre generátor tools/blender/historicke/ → tools/blender/data/pamiatky-sm.json
// Spustenie: cd tools/mesto && node --max-old-space-size=8000 ../blender/osm_pamiatky.mjs
import { writeFileSync } from 'node:fs';
import { nacitajPbf } from '../mesto/pbf.mjs';
import { naMetre } from '../mesto/spolocne.mjs';

const MENA = [
  ['dom-sv-martina', /^(Dóm|Katedrála) sv(ätého|\.) Martina/i],
  ['stara-radnica', /^Stará radnica/i],
  ['primacialny-palac', /^Primaciálny palác/i],
  ['grasalkovicov-palac', /Grasalkovičov palác|Prezidentský palác/i],
  ['letny-arcibiskupsky-palac', /Letný arcibiskupský palác|Úrad vlády/i],
  ['snd', /^(Historická budova SND|Slovenské národné divadlo)$/i],
  ['reduta', /^Reduta/i],
  ['modry-kostolik', /Kostol sv(ätej|\.) Alžbety|Modrý kostol/i],
  ['frantiskansky-kostol', /Františkánsk|Zvestovania Pána/i],
  ['kostol-klarisiek', /klarisiek/i],
  ['jezuitsky-kostol', /Jezuitský kostol|Najsvätejšieho Spasiteľa/i],
  ['kapucinsky-kostol', /Kapucínsky kostol|kostol sv(ätého|\.) Štefana/i],
  ['ursulinsky-kostol', /Uršulínsk/i],
  ['kostol-milosrdnych-bratov', /milosrdných bratov/i],
  ['kostol-trinitarov', /trinitárov|Jána z Mathy/i],
  ['evanjelicky-kostol', /Veľký evanjelický kostol/i],
  ['palffyho-palac', /^Pálffyho palác/i],
  ['mirbachov-palac', /^Mirbachov palác/i],
  ['esterhazyho-palac', /^Esterházyho palác/i],
  ['apponyiho-palac', /^Apponyiho palác/i],
  ['kutscherfeldov-palac', /^Kutscherfeldov palác/i],
  ['univerzitna-kniznica', /Univerzitná knižnica|Uhorská kráľovská komora/i],
  ['academia-istropolitana', /Academia Istropolitana/i],
  ['dom-u-dobreho-pastiera', /Dobrého pastiera/i],
  ['stara-trznica', /^Stará tržnica/i],
  ['univerzita-komenskeho', /^(Univerzita Komenského|Rektorát Univerzity Komenského)/i],
  ['carlton', /Carlton/i],
  ['snm', /Slovenské národné múzeum/i],
  ['slavin', /^Slavín|Pamätník Slavín/i],
  ['aspremontov-palac', /Aspremont/i],
  ['erdodyho-palac', /Erdődy/i],
  ['zichyho-palac', /^Zichyho palác/i],
  ['jesenakov-palac', /Jesenák/i],
  ['balassov-palac', /Balass/i],
  ['keglevicov-palac', /Keglevič/i],
  ['palugyayov-palac', /Palugyay/i],
  ['michalska-veza', /^Michalská veža/i],
  ['vodarenske-muzeum', /./, ['69233624']],
  // 2. dávka (zoznam významných budov): Devín, Rusovce, kostoly, synagóga, galérie, múzeá
  ['kostol-sv-kriza-devin', /^Kostol sv\. Kríža$/i, ['59424102']],
  ['kastiel-rusovce', /Rusovský kaštieľ/i],
  ['mauzoleum-chatama-sofera', /Mauzóleum Chatama Sofera/i],
  ['ursulinsky-kostol-2', /./, ['444325135']],
  ['notre-dame', /./, ['56305243']],
  ['blumental', /./, ['75219636']],
  ['kostol-sv-rodiny', /^Kostol Svätej rodiny/i],
  ['synagoga', /^Ortodoxná synagóga/i],
  ['nedbalka', /^Galéria Nedbalka/i],
  ['greckokatolicka-katedrala', /Katedrálny chrám povýšenia/i],
];
const OHR = { minX: -12500, maxX: 13600, minZ: -14000, maxZ: 15700 };
// časti, ktoré v OSM ležia mimo hlavného obrysu (napr. veža Dómu)
const EXTRA = { 'dom-sv-martina': ['243293986'] };
const db = await nacitajPbf('../../.cache/mesto/bratislavsky.osm.pbf');
const r1 = (v) => Math.round(v * 100) / 100;
const body = (w) => w.nd.map((n) => db.uzly.get(n)).filter(Boolean).map((u) => naMetre(u.lon, u.lat).map(r1));
const vPol = (x, z, b) => { let c = false; for (let i = 0, j = b.length - 1; i < b.length; j = i++) { const [xi, zi] = b[i], [xj, zj] = b[j]; if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) c = !c; } return c; };
const stred = (b) => [b.reduce((s, p) => s + p[0], 0) / b.length, b.reduce((s, p) => s + p[1], 0) / b.length];
const vnutri = (b) => b.some(([x, z]) => x > OHR.minX && x < OHR.maxX && z > OHR.minZ && z < OHR.maxZ);
// časti budov v mriežke 50 m
const casti = [];
for (const [id, w] of db.cesty) if (w.t['building:part'] && w.t['building:part'] !== 'no') { const b = body(w); if (b.length > 2 && vnutri(b)) casti.push({ id, t: w.t, body: b, s: stred(b) }); }
const out = {};
const obrysy = [];
const IDY = new Set(MENA.flatMap((m) => m[2] ?? []));
for (const [id, w] of db.cesty) if (w.t.building && (w.t.name || IDY.has(id))) obrysy.push({ id, t: { name: w.t.name ?? w.t.alt_name ?? '', ...w.t }, b: () => body(w) });
// spojí členy relácie (úseky ciest) do uzavretých kruhov podľa spoločných koncových uzlov
function kruhy(cleny) {
  const useky = cleny.map((c) => db.cesty.get(c.ref)?.nd.slice()).filter((nd) => nd && nd.length > 1);
  const out = [];
  while (useky.length) {
    let kruh = useky.shift();
    let zmena = true;
    while (kruh[0] !== kruh.at(-1) && zmena) {
      zmena = false;
      for (let i = 0; i < useky.length; i++) {
        const u = useky[i];
        if (u[0] === kruh.at(-1)) kruh = kruh.concat(u.slice(1));
        else if (u.at(-1) === kruh.at(-1)) kruh = kruh.concat(u.slice(0, -1).reverse());
        else if (u.at(-1) === kruh[0]) kruh = u.slice(0, -1).concat(kruh);
        else if (u[0] === kruh[0]) kruh = u.slice(1).reverse().concat(kruh);
        else continue;
        useky.splice(i, 1);
        zmena = true;
        break;
      }
    }
    const b = kruh.map((n) => db.uzly.get(n)).filter(Boolean).map((u) => naMetre(u.lon, u.lat).map(r1));
    if (b.length > 3) out.push(b);
  }
  return out;
}
const plocha = (b) => Math.abs(b.reduce((s, p, i) => { const q = b[(i + 1) % b.length]; return s + p[0] * q[1] - q[0] * p[1]; }, 0) / 2);
for (const [id, r] of db.relacie) if (r.t.building && r.t.name) obrysy.push({ id, t: r.t,
  b: () => { const v = kruhy(r.cleny.filter((c) => c.typ === 'way' && c.rola === 'outer')); v.sort((a, b) => plocha(b) - plocha(a)); return v[0] ?? []; },
  diery: () => kruhy(r.cleny.filter((c) => c.typ === 'way' && c.rola === 'inner')) });
for (const [kluc, re, idy] of MENA) {
  const najdene = obrysy.filter((o) => (idy ? idy.includes(o.id) : re.test(o.t.name)));
  for (const o of najdene) {
    const b = o.b();
    if (b.length < 3 || !vnutri(b)) continue;
    const c = casti.filter((p) => vPol(p.s[0], p.s[1], b) || (EXTRA[kluc] ?? []).includes(p.id)).map(({ id, t, body }) => ({ id, t, body }));
    (out[kluc] ??= []).push({ id: o.id, t: o.t, body: b, diery: o.diery ? o.diery() : [], casti: c });
  }
  const v = out[kluc] ?? [];
  console.log(kluc.padEnd(28), v.map((x) => `${x.id} "${x.t.name}" ${x.t.building} h=${x.t.height ?? ''} lv=${x.t['building:levels'] ?? ''} roof=${x.t['roof:shape'] ?? ''} časti=${x.casti.length}`).join(' | ') || '—');
}
writeFileSync('../blender/data/pamiatky-sm.json', JSON.stringify(out));
