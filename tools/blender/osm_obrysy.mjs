// Vytiahne z OSM obrysy (a časti budov) vybraných stavieb pre generátory v Blenderi:
// tools/blender/data/obrysy.json – súradnice v metroch hry (x východ, z juh), výšky z OSM.
// Spustenie: cd tools/mesto && node --max-old-space-size=8000 ../blender/osm_obrysy.mjs
import { writeFileSync } from 'node:fs';
import { nacitajPbf } from '../mesto/pbf.mjs';
import { naMetre } from '../mesto/spolocne.mjs';

const CIELE = {
  'nivy-tower': { cesta: '662313148' },
  'nbs': { cesta: '10158374' },
  'panorama-city': { cesty: ['379651987', '379651985'] },
  'sky-park': { cesty: ['551521352', '551521351', '551521353', '1105367502', '739656752'] },
  'twin-city-tower': { cesta: '551523685' },
  'tower-115': { cesta: '671692344' },
  'eurovea-tower': { relacia: '21708459' },
  'kamzik-veza': { cesta: '230944086' },
  // druhá dávka (zoznam významných budov): všeobecný generátor z tagov OSM (vyskove/z_osm.py)
  'cbc-1': { cesta: '77937663' },
  'vub': { relacia: '1270596' },
  'gloria': { cesta: '61398274' },
  'millennium-tower': { cesty: ['128405266', '229676250'] },
  'aupark-tower': { cesta: '53778785' },
  'technopol': { cesty: ['135885927', '135885929'] },
  'incheba': { cesta: '1153991739' },
  'matadorka': { cesta: '884231657' },
  'central': { cesta: '365111959' },
  'lakeside-park': { cesta: '553359037' },
  'manderla': { cesta: '38507136' },
  // tretia dávka: významné budovy (prerobené staré modely a nové)
  'nove-snd': { cesta: '223471545' },
  'rozhlas': { cesta: '5215475' },
  'nr-sr': { cesta: '5131402' },
  'nivy': { cesta: '829898609' },
  'sng': { cesty: ['56341128', '245884765', '56341126'] },
  'stadion-tehelne-pole': { cesta: '678498215' },
  'zimny-stadion': { cesta: '15104547' },
  'istropolis': { cesty: ['1038324193', '1472519457'] },
};
const db = await nacitajPbf('../../.cache/mesto/bratislavsky.osm.pbf');
const r1 = (v) => Math.round(v * 100) / 100;
const obrysCesty = (id) => {
  const w = db.cesty.get(id);
  if (!w) return null;
  const b = w.nd.map((n) => db.uzly.get(n)).filter(Boolean).map((u) => naMetre(u.lon, u.lat).map(r1));
  if (b.length > 3 && b[0][0] === b.at(-1)[0] && b[0][1] === b.at(-1)[1]) b.pop();
  return { id, t: w.t, body: b };
};
const obrysRelacie = (id) => {
  const r = db.relacie.get(id);
  if (!r) return null;
  // vonkajšie členy spojíme do jedného obrysu (stačí najdlhší)
  const vonk = r.cleny.filter((c) => c.typ === 'way' && (c.rola === 'outer' || !c.rola)).map((c) => obrysCesty(String(c.ref))).filter(Boolean);
  vonk.sort((a, b) => b.body.length - a.body.length);
  return vonk.length ? { id, t: r.t, body: vonk[0].body } : null;
};
const plocha = (b) => { let a = 0; for (let i = 0, j = b.length - 1; i < b.length; j = i++) a += (b[j][0] - b[i][0]) * (b[j][1] + b[i][1]); return Math.abs(a / 2); };
const vPolygone = (x, z, b) => { let c = false; for (let i = 0, j = b.length - 1; i < b.length; j = i++) { const [xi, zi] = b[i], [xj, zj] = b[j]; if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) c = !c; } return c; };
const vystup = {};
for (const [meno, c] of Object.entries(CIELE)) {
  const hlavne = c.relacia ? [obrysRelacie(c.relacia)] : (c.cesty ?? [c.cesta]).map(obrysCesty);
  const casti = [];
  for (const h of hlavne.filter(Boolean)) {
    // časti budov (building:part) vnútri obrysu
    for (const [id, w] of db.cesty) {
      if (!w.t['building:part'] || id === h.id) continue;
      const o = obrysCesty(id);
      if (!o || o.body.length < 3) continue;
      const sx = o.body.reduce((s, p) => s + p[0], 0) / o.body.length, sz = o.body.reduce((s, p) => s + p[1], 0) / o.body.length;
      if (vPolygone(sx, sz, h.body)) casti.push({ id, t: o.t, body: o.body, plocha: Math.round(plocha(o.body)) });
    }
  }
  vystup[meno] = { hlavne: hlavne.filter(Boolean).map((h) => ({ id: h.id, t: h.t, body: h.body, plocha: Math.round(plocha(h.body)) })), casti };
  console.log(meno, vystup[meno].hlavne.map((h) => [h.id, h.plocha, h.body.length, h.t.height, h.t['building:levels']]), 'častí', casti.length, casti.map((c) => [c.t['building:part'], c.t.height, c.t.min_height, c.plocha]).slice(0, 8));
}
writeFileSync('../blender/data/obrysy.json', JSON.stringify(vystup));
