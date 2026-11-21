// Obytná zástavba z OSM (landuse=residential) → data/mapa/zastavba.json. Hra v nej kreslí nezastavanú
// a nespevnenú zem ako záhrady / trávniky (js/mapa/teren/zahrady.js) – podľa satelitnej snímky sú
// sídliská aj rodinné domy zelené, v hre bola všade béžová „holá“ zem.
// Spustenie: cd tools/mesto && node --max-old-space-size=8000 zastavba.mjs
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { nacitajPbf } from './pbf.mjs';
import { CACHE, naMetre } from './spolocne.mjs';

const db = await nacitajPbf(join(CACHE, 'bratislavsky.osm.pbf'));
const body = (nd) => nd.map((n) => db.uzly.get(n)).filter(Boolean).map((u) => naMetre(u.lon, u.lat));

/** Douglas–Peucker (tolerancia v metroch) – menší súbor, tvar sa nezmení viditeľne. */
function zjednodus(b, tol = 1.5) {
  if (b.length < 4) return b;
  const vzd = (p, a, c) => {
    const dx = c[0] - a[0], dz = c[1] - a[1], L = dx * dx + dz * dz || 1;
    const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dz) / L));
    return Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dz);
  };
  const drz = new Uint8Array(b.length); drz[0] = drz[b.length - 1] = 1;
  const zas = [[0, b.length - 1]];
  while (zas.length) {
    const [i, j] = zas.pop();
    let m = -1, k = -1;
    for (let q = i + 1; q < j; q++) { const v = vzd(b[q], b[i], b[j]); if (v > m) { m = v; k = q; } }
    if (m > tol) { drz[k] = 1; zas.push([i, k], [k, j]); }
  }
  return b.filter((_, i) => drz[i]);
}
const r = (v) => Math.round(v * 2) / 2;

const vystup = [];
const pridaj = (nd) => {
  if (nd.length < 4 || nd[0] !== nd[nd.length - 1]) return;
  const b = zjednodus(body(nd)).slice(0, -1).map(([x, z]) => [r(x), r(z)]);
  if (b.length >= 3) vystup.push(b);
};
for (const w of db.cesty.values()) if (w.t.landuse === 'residential') pridaj(w.nd);
// multipolygóny – vonkajšie obrysy (aj poskladané z viacerých úsekov)
for (const rel of db.relacie.values()) {
  if (rel.t?.landuse !== 'residential') continue;
  const useky = rel.cleny.filter((c) => c.typ === 'way' && (c.rola === 'outer' || c.rola === '')).map((c) => db.cesty.get(c.ref)?.nd).filter(Boolean);
  const zvysok = useky.map((u) => [...u]);
  while (zvysok.length) {
    let kruh = zvysok.shift();
    let zmena = true;
    while (kruh[0] !== kruh[kruh.length - 1] && zmena) {
      zmena = false;
      for (let i = 0; i < zvysok.length; i++) {
        const u = zvysok[i], k = kruh[kruh.length - 1];
        if (u[0] === k) kruh = kruh.concat(u.slice(1));
        else if (u[u.length - 1] === k) kruh = kruh.concat([...u].reverse().slice(1));
        else continue;
        zvysok.splice(i, 1); zmena = true; break;
      }
    }
    pridaj(kruh);
  }
}
console.log(vystup.length, 'plôch obytnej zástavby,', vystup.reduce((s, b) => s + b.length, 0), 'bodov');
writeFileSync(join(CACHE, '..', '..', 'data', 'mapa', 'zastavba.json'), JSON.stringify({
  popis: 'VYGENEROVANÉ z OpenStreetMap (tools/mesto/zastavba.mjs): obrysy obytnej zástavby (landuse=residential). © prispievatelia OpenStreetMap, ODbL.',
  zastavba: vystup,
}));
