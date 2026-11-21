// Vytiahne z OSM podklady pre Mladú gardu a okolie (Račianska, Nové Mesto):
//   garda    – časti internátu Mladá garda (building:part – bloky A … L, vstupná budova, veža, jedáleň, spojovacie chodby)
//   obchod   – supermarket na Račianskej 64A (obrys + časť so šikmou strechou)
//   bistro   – rýchle občerstvenie na Račianskej 62A (obrys)
//   veze     – trojica obytných domov za supermarketom (veže A a C, nižší blok B medzi nimi) a bunker pri nich
//   okolie   – plochy v okolí (tenisové kurty, parkoviská, zeleň) pre doplnky
// Značky firiem sa do hry nedávajú – berú sa len obrysy a výšky.
// Výstup tools/blender/data/garda.json (súradnice v metroch hry, x východ, z juh).
// Spustenie: cd tools/mesto && node --max-old-space-size=8000 ../blender/osm_garda.mjs
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
const stred = (b) => [b.reduce((s, p) => s + p[0], 0) / b.length, b.reduce((s, p) => s + p[1], 0) / b.length];
const vObdlzniku = (b, x0, z0, x1, z1) => { const [x, z] = stred(b); return x > x0 && x < x1 && z > z0 && z < z1; };
const tagy = (t) => Object.fromEntries(Object.entries(t).filter(([k]) => /^(building|building:part|building:levels|building:min_level|roof:|height|min_height|name|leisure|landuse|amenity|surface|sport|natural|highway|barrier|parking)/.test(k)));

const out = { garda: { obrys: null, casti: [] }, obchod: { obrys: null, casti: [] }, bistro: null, veze: [], bunker: null, okolie: [] };
for (const [id, w] of db.cesty) {
  const t = w.t;
  if (!w.nd.length) continue;
  if (id === '24030310') { out.garda.obrys = { id, body: body(w), t: tagy(t) }; continue; }
  if (id === '60802739') { out.obchod.obrys = { id, body: body(w), t: tagy(t) }; continue; }
  if (id === '556834456') { out.obchod.casti.push({ id, body: body(w), t: tagy(t) }); continue; }
  if (id === '60804453') { out.bistro = { id, body: body(w), t: tagy(t) }; continue; }
  if (['1136278191', '962310977', '1136278192'].includes(id)) { out.veze.push({ id, body: body(w), t: tagy(t) }); continue; }
  if (id === '1136278184') { out.bunker = { id, body: body(w), t: tagy(t) }; continue; }   // zachovaný bunker pri veži A
  const b = body(w);
  if (b.length < 3) continue;
  if (t['building:part'] && vObdlzniku(b, 1280, -3900, 1500, -3620)) out.garda.casti.push({ id, body: b, t: tagy(t) });
  else if ((t.leisure || t.landuse || t.amenity === 'parking' || t.natural || t.barrier === 'hedge') && vObdlzniku(b, 1250, -3950, 1720, -3600)) {
    out.okolie.push({ id, body: b, t: tagy(t) });
  }
}
writeFileSync('../blender/data/garda.json', JSON.stringify(out));
console.log('garda časti', out.garda.casti.length, '| obchod', !!out.obchod.obrys, out.obchod.casti.length, '| bistro', !!out.bistro, '| veže', out.veze.length, '| okolie', out.okolie.length);
for (const c of out.garda.casti) console.log('  ', c.id, c.t['building:part'], c.t['building:levels'] ?? '', c.t['roof:shape'] ?? '', c.t.name ?? '');
