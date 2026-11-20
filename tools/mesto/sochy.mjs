// Sochy, busty a pamätníky z OSM → data/mapa/sochy.json (pre js/mapa/vybavenie/sochy-modul.js).
//   historic=memorial + memorial=statue|bust|sculpture, tourism=artwork + artwork_type=statue|sculpture|bust,
//   aj ako plochy (stred). Jazdecké sochy (statue=equestrian), Čumil (artwork v kanáli – man_made=manhole).
// Pohlavie postavy sa háda z mena (ženské mená a priezviská na -ová), materiál z tagu material.
// Spustenie: cd tools/mesto && node --max-old-space-size=8000 sochy.mjs
import { writeFileSync } from 'node:fs';
import { nacitajPbf } from './pbf.mjs';
import { naMetre } from './spolocne.mjs';

const db = await nacitajPbf('../../.cache/mesto/bratislavsky.osm.pbf');
const H = { minX: -12500, maxX: 13600, minZ: -14000, maxZ: 15700 };
const r1 = (v) => Math.round(v * 10) / 10;
const ZENY = /(ová\b|Mária|Alžbet|Terézi|Bosork|Marína|dievč|žena|matk|Materstvo|Madon|Panna|Anna|Margit|Oľga|Ester|Eva\b|Dievča|kráľovn)/i;

function zaznam(t, x, z) {
  if (x < H.minX || x > H.maxX || z < H.minZ || z > H.maxZ) return null;
  const mem = t.memorial, art = t.artwork_type;
  let typ = null;
  if (t.statue === 'equestrian') typ = 'jazdecka';
  else if (t.man_made === 'manhole' && (art === 'statue' || t.tourism === 'artwork')) typ = 'cumil';
  else if (mem === 'bust' || art === 'bust') typ = 'busta';
  else if (mem === 'statue' || art === 'statue') typ = 'socha';
  else if (mem === 'sculpture' || art === 'sculpture') typ = 'skulptura';
  if (!typ) return null;
  if (t.support === 'wall_mount' || t.support === 'wall_mounted') return null;   // na fasáde – nevidno
  const meno = t.name ?? t['name:sk'] ?? '';
  const material = /bronz|bronze|metal|iron|steel|alumin|kov/i.test(t.material ?? '') ? 'bronz' : (t.material ? 'kamen' : (t.tourism === 'artwork' ? 'bronz' : 'kamen'));
  const vyska = parseFloat(t.height);
  return {
    x: r1(x), z: r1(z), typ, nazov: meno || null,
    zena: ZENY.test(`${meno} ${t.subject ?? ''} ${t.inscription ?? ''}`.slice(0, 120)),
    material,
    // pouličné sochy (tourism=artwork bez historic) stoja na zemi bez podstavca
    podstavec: !!t.historic && typ !== 'cumil',
    vyska: Number.isFinite(vyska) ? vyska : null,
    smer: t.direction && /^\d+$/.test(t.direction) ? +t.direction : null,
  };
}

const out = [];
for (const [, u] of db.uzly) {
  if (!u.t) continue;
  const [x, z] = naMetre(u.lon, u.lat);
  const r = zaznam(u.t, x, z);
  if (r) out.push(r);
}
for (const [, w] of db.cesty) {
  const t = w.t;
  if (!t || !(t.historic === 'memorial' || t.tourism === 'artwork') || t.building) continue;
  const p = w.nd.map((n) => db.uzly.get(n)).filter(Boolean).map((u) => naMetre(u.lon, u.lat));
  if (p.length < 3) continue;
  const x = p.reduce((s, q) => s + q[0], 0) / p.length, z = p.reduce((s, q) => s + q[1], 0) / p.length;
  const r = zaznam(t, x, z);
  if (r) out.push(r);
}
const pocty = {};
for (const s of out) pocty[s.typ] = (pocty[s.typ] ?? 0) + 1;
console.log(out.length, 'sôch', pocty);
writeFileSync('../../data/mapa/sochy.json', JSON.stringify({
  popis: 'VYGENEROVANÉ z OpenStreetMap (tools/mesto/sochy.mjs): sochy, busty a pamätníky. © prispievatelia OpenStreetMap, ODbL.',
  sochy: out,
}));
