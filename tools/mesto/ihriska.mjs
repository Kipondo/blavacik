// Športoviská z OSM → data/mapa/ihriska.json: ihriská (leisure=pitch) so športom a povrchom,
// bežecké dráhy (leisure=track), vonkajšie bazény (leisure=swimming_pool) a fontány (amenity=fountain). Hra ich kreslí do textúry zeme (js/mapa/teren/ihriska.js):
// antuka, tartan, umelá tráva, asfalt, piesok a biele čiary – predtým boli všetky ihriská len zelené.
// Spustenie: cd tools/mesto && node --max-old-space-size=8000 ihriska.mjs
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { nacitajPbf } from './pbf.mjs';
import { CACHE, naMetre } from './spolocne.mjs';

const r1 = (v) => Math.round(v * 10) / 10;
const db = await nacitajPbf(join(CACHE, 'bratislavsky.osm.pbf'));
const body = (nd) => nd.map((n) => db.uzly.get(n)).filter(Boolean).map((u) => naMetre(u.lon, u.lat)).map(([x, z]) => [r1(x), r1(z)]);

const vystup = [];
const pridaj = (t, b, typ) => {
  if (b.length < 2) return;
  const z = { t: typ, b };
  if (t.sport) z.s = t.sport.split(';')[0];
  if (t.surface) z.p = t.surface;
  const sirka = parseFloat(t.width);
  if (typ === 'track' && sirka > 0 && sirka < 20) z.w = sirka;
  vystup.push(z);
};

for (const w of db.cesty.values()) {
  const t = w.t;
  if (t.leisure === 'pitch') {
    const b = body(w.nd);
    if (b.length >= 4 && w.nd[0] === w.nd[w.nd.length - 1]) pridaj(t, b.slice(0, -1), 'pitch');
  } else if ((t.leisure === 'swimming_pool' && !['yes'].includes(t.indoor) && !['indoor', 'roof'].includes(t.location))
    || t.amenity === 'fountain') {
    const b = body(w.nd);
    if (b.length >= 4 && w.nd[0] === w.nd[w.nd.length - 1]) pridaj(t, b.slice(0, -1), t.amenity === 'fountain' ? 'fontana' : 'bazen');
  } else if (t.leisure === 'track') {
    const b = body(w.nd);
    // dráha ako plocha (area=yes) alebo ako čiara stredom dráhy (bežné)
    if (t.area === 'yes' && w.nd[0] === w.nd[w.nd.length - 1]) pridaj(t, b.slice(0, -1), 'pitch');
    else pridaj(t, b, 'track');
  }
}
// multipolygóny ihrísk – len vonkajšie obrysy
for (const r of db.relacie.values()) {
  const t = r.t ?? {};
  if (t.leisure !== 'pitch' && t.leisure !== 'track') continue;
  for (const c of r.cleny) {
    if (c.typ !== 'way' || (c.rola && c.rola !== 'outer')) continue;
    const w = db.cesty.get(c.ref);
    if (!w || w.nd[0] !== w.nd[w.nd.length - 1]) continue;
    const b = body(w.nd);
    if (b.length >= 4) pridaj({ ...w.t, ...t }, b.slice(0, -1), 'pitch');
  }
}
const pocty = {};
for (const z of vystup) { const k = `${z.t}:${z.s ?? '-'}`; pocty[k] = (pocty[k] ?? 0) + 1; }
console.log(vystup.length, 'športovísk', Object.entries(pocty).sort((a, b) => b[1] - a[1]).slice(0, 12));
writeFileSync(join(CACHE, '..', '..', 'data', 'mapa', 'ihriska.json'), JSON.stringify({
  popis: 'VYGENEROVANÉ z OpenStreetMap (tools/mesto/ihriska.mjs): ihriská a bežecké dráhy – t typ, s šport, p povrch, w šírka dráhy, b body. © prispievatelia OpenStreetMap, ODbL.',
  ihriska: vystup,
}));
