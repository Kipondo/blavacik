// Vytiahne z OSM podklady pre Kamenné námestie (Staré Mesto):
//   kyjev  – Hotel Kyjev: obrys a časti (veža 12–65 m, podnož, presklené prízemie, obchodná časť)
//   prior  – obchodný dom na Kamennom námestí: obrys a časti (blok na stĺpoch 4–16 m, biela veža, presklené
//            prízemie), nižšia presklená budova (foodcourt) s časťami a presklená lávka medzi nimi
//   hodiny – poloha hodín na fasáde (amenity=clock), reliéf (artwork)
//   okolie – plochy okolo (tráva, múry) pre doplnky
// Značky firiem sa do hry nedávajú – berú sa len obrysy a výšky.
// Výstup tools/blender/data/kamenne.json (súradnice v metroch hry, x východ, z juh).
// Spustenie: cd tools/mesto && node --max-old-space-size=8000 ../blender/osm_kamenne.mjs
import { writeFileSync } from 'node:fs';
import { nacitajPbf } from '../mesto/pbf.mjs';
import { naMetre } from '../mesto/spolocne.mjs';

const db = await nacitajPbf('../../.cache/mesto/bratislavsky.osm.pbf');
const r2 = (v) => Math.round(v * 100) / 100;
const body = (w) => {
  const b = w.nd.map((n) => db.uzly.get(n)).filter(Boolean).map((u) => naMetre(u.lon, u.lat).map(r2));
  if (b.length > 3 && b[0][0] === b.at(-1)[0] && b[0][1] === b.at(-1)[1]) b.pop();
  return b;
};
const tagy = (t) => Object.fromEntries(Object.entries(t).filter(([k]) => /^(building|building:part|building:levels|building:min_level|building:material|building:colour|roof:|height|min_height|name|layer|landuse|barrier|artwork_type)/.test(k)));

const ID = {
  kyjev: { obrys: '64840374', casti: ['229586082', '1389655494', '1389655502', '1389655503', '243395272'] },
  prior: { obrys: '64840395', casti: ['1389655495', '1389655496', '1389655497'] },
  nizsia: { obrys: '64840354', casti: ['243395275', '1389655498', '1389655499'] },
  lavka: '168754269',
  relief: '494373805',
  zahon: '974143626',     // tráva na námestí – okrúhly vyvýšený záhon
};
const out = { kyjev: { obrys: null, casti: [] }, prior: { obrys: null, casti: [] }, nizsia: { obrys: null, casti: [] }, lavka: null, relief: null, hodiny: null, zahon: null };
for (const [id, w] of db.cesty) {
  for (const k of ['kyjev', 'prior', 'nizsia']) {
    if (id === ID[k].obrys) out[k].obrys = { id, body: body(w), t: tagy(w.t) };
    if (ID[k].casti.includes(id)) out[k].casti.push({ id, body: body(w), t: tagy(w.t) });
  }
  if (id === ID.lavka) out.lavka = { id, body: body(w), t: tagy(w.t) };
  if (id === ID.relief) out.relief = { id, body: body(w), t: tagy(w.t) };
  if (id === ID.zahon) out.zahon = { id, body: body(w), t: tagy(w.t) };
}
const h = db.uzly.get('5902471673');
if (h) out.hodiny = naMetre(h.lon, h.lat).map(r2);
writeFileSync('../blender/data/kamenne.json', JSON.stringify(out));
for (const k of ['kyjev', 'prior', 'nizsia']) {
  console.log(k, out[k].obrys?.body.length, out[k].casti.map((c) => `${c.id}:${c.t.min_height ?? 0}-${c.t.height ?? c.t['building:levels'] + 'lv'}`).join(' '));
}
console.log('lávka', !!out.lavka, 'reliéf', !!out.relief, 'hodiny', out.hodiny, 'záhon', out.zahon?.body.length);
