// Cyklopruhy na cestách z OSM (issue #52): cesty pre autá s cycleway=lane / opposite_lane,
// cycleway:left / :right / :both = lane. Samostatné cyklotrasy (highway=cycleway) kreslí už textúra zeme.
// Šírka cesty sa počíta rovnako ako v tools/osm/klasifikuj.mjs, aby pruh sedel na okraji asfaltu.
// Výstup data/mapa/cyklopruhy.json: { pruhy: [{ s: šírka cesty, l: 1?, p: 1?, body: [[x, z], …] }] }.
// Spustenie: cd tools/mesto && node --max-old-space-size=8000 cyklopruhy.mjs
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { nacitajPbf } from './pbf.mjs';
import { CACHE, VYSTUP, naMetre } from './spolocne.mjs';

// rovnaká tabuľka ako CESTY_PRE_AUTA v tools/osm/klasifikuj.mjs
const ZAKLAD = {
  motorway: { sirka: 15, pruhy: 4 }, motorway_link: { sirka: 7, pruhy: 1 },
  trunk: { sirka: 15, pruhy: 4 }, trunk_link: { sirka: 7, pruhy: 1 },
  primary: { sirka: 14, pruhy: 4 }, primary_link: { sirka: 7, pruhy: 1 },
  secondary: { sirka: 12, pruhy: 2 }, secondary_link: { sirka: 7, pruhy: 1 },
  tertiary: { sirka: 10, pruhy: 2 }, tertiary_link: { sirka: 6, pruhy: 1 },
  unclassified: { sirka: 8, pruhy: 2 }, residential: { sirka: 8, pruhy: 2 },
  living_street: { sirka: 6, pruhy: 1 }, service: { sirka: 5, pruhy: 1 },
};
const cislo = (v) => { const n = parseFloat(String(v ?? '').replace(',', '.')); return Number.isFinite(n) ? n : 0; };
const r1 = (v) => Math.round(v * 10) / 10;
const pruh = (v) => v === 'lane' || v === 'opposite_lane';

const db = await nacitajPbf(join(CACHE, 'bratislavsky.osm.pbf'));
const out = [];
for (const w of db.cesty.values()) {
  const t = w.t;
  const zaklad = ZAKLAD[t.highway];
  // mosty vynecháme – mostovky nadjazdov majú vlastnú výšku, pruh by ostal na teréne pod nimi
  if (!zaklad || t.tunnel === 'yes' || t.area === 'yes' || (t.bridge && t.bridge !== 'no')) continue;
  const oba = t['cycleway:both'];
  let l = pruh(t['cycleway:left']) || pruh(oba);
  let p = pruh(t['cycleway:right']) || pruh(oba);
  const jednosmerka = t.oneway === 'yes' || t.oneway === '1' || t.junction === 'roundabout';
  if (t.cycleway === 'lane') { if (jednosmerka) p = true; else { l = true; p = true; } }
  if (t.cycleway === 'opposite_lane') l = true;
  if (!l && !p) continue;
  const pruhy = parseInt(t.lanes) || zaklad.pruhy;
  let sirka = cislo(t.width) || (t.lanes ? pruhy * 3.3 + 1 : zaklad.sirka);
  if (jednosmerka && !t.lanes && !t.width) sirka = Math.min(sirka, Math.max(5, pruhy * 3.6));
  const body = w.nd.map((n) => db.uzly.get(n)).filter(Boolean).map((u) => naMetre(u.lon, u.lat).map(r1));
  if (body.length < 2) continue;
  const z = { s: r1(sirka), body };
  if (l) z.l = 1;
  if (p) z.p = 1;
  out.push(z);
}
writeFileSync(join(VYSTUP, '..', 'cyklopruhy.json'), JSON.stringify({
  popis: 'Cyklopruhy na cestách z OSM (cycleway=lane…), s = šírka cesty, l/p = pruh vľavo/vpravo v smere kreslenia. Vyrába tools/mesto/cyklopruhy.mjs. © prispievatelia OpenStreetMap (ODbL)',
  pruhy: out,
}));
console.log('cyklopruhov', out.length, '| km', Math.round(out.reduce((s, z) => s + z.body.slice(1).reduce((a, b, i) => a + Math.hypot(b[0] - z.body[i][0], b[1] - z.body[i][1]), 0) * ((z.l ? 1 : 0) + (z.p ? 1 : 0)), 0) / 1000));
