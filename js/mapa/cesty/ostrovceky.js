// Dopravné ostrovčeky a stredné deliace pásy (pravidlá ulice #136): malé plochy, ktoré zo všetkých strán obkolesujú
// vozovky ciest pre autá a nie je v nich budova. V hre sú celé zelené (tráva aj tam, kde má OSM betón alebo dlažbu)
// a lemuje ich len obrubník – bez chodníka (js/mapa/cesty/chodniky.js), takže je jasne vidieť, kde je cesta a kde
// ostrovček (predtým ich zakryli chodníky okolitých ciest a ostala sivá plocha s fľakmi).
// Hľadajú sa ako steny rovinného grafu ciest (spoločné body = uzly). Bez Three.js – používa ho aj kontrola mapy.

import { bodVPolygone } from '../geometria.js';

// cesty, ktoré tvoria okraj ostrovčeka (vjazdy, obytné zóny a pešie cesty nie – parkoviská a dvory nie sú ostrovčeky)
const NIE = new Set(['service', 'living_street', 'track', 'unknown', 'footway', 'path', 'cycleway', 'steps', 'pedestrian',
  'bridleway', 'corridor', 'platform']);
const MAX_PLOCHA = 1500;       // m² – ostrovček (plocha medzi osami ciest)
const MAX_SIRKA_PASU = 12;     // m – stredný deliaci pás (priemerná šírka medzi osami 2A/obvod) môže byť dlhý
const MAX_PLOCHA_PASU = 20000; // m²
const MIN_CISTA = 4;           // m² – po odpočítaní vozoviek musí ostať aspoň kúsok zelene

const kluc = (p) => `${p[0]},${p[1]}`;

/**
 * Ostrovčeky dlaždice: [{ body: obrys po osiach ciest, plocha, cista }]. Výsledok sa uloží do d._ostrovceky.
 * @param {{ cesty?: Array, budovy?: Array }} d  dáta dlaždice (osi ciest už upravené – upravOsiCiest)
 */
export function ostrovcekyDlazdice(d) {
  if (!d._ostrovceky) d._ostrovceky = najdiOstrovceky(d.cesty ?? [], d.budovy ?? []);
  return d._ostrovceky;
}

export function najdiOstrovceky(cesty, budovy = []) {
  const uzly = new Map();
  const hrany = [];
  const uzol = (p) => {
    const k = kluc(p);
    if (!uzly.has(k)) uzly.set(k, { p, von: [] });
    return uzly.get(k);
  };
  for (const c of cesty) {
    if (NIE.has(c.typ) || c.most || c.nadjazd || c.tunel || !(c.body?.length > 1)) continue;
    for (let i = 1; i < c.body.length; i++) {
      const a = uzol(c.body[i - 1]), b = uzol(c.body[i]);
      if (a === b) continue;
      const h1 = { od: a, do: b, c }, h2 = { od: b, do: a, c };
      h1.tw = h2; h2.tw = h1;
      a.von.push(h1); b.von.push(h2);
      hrany.push(h1, h2);
    }
  }
  for (const u of uzly.values()) {
    for (const h of u.von) h.uhol = Math.atan2(h.do.p[1] - u.p[1], h.do.p[0] - u.p[0]);
    u.von.sort((x, y) => x.uhol - y.uhol);
  }
  // steny: z hrany do uzla, ďalej po najbližšej hrane na jednu stranu (každá hrana patrí práve jednej stene)
  const videne = new Set();
  const out = [];
  for (const h0 of hrany) {
    if (videne.has(h0)) continue;
    const stena = [];
    let h = h0, n = 0;
    while (!videne.has(h) && n++ < 4000) {
      videne.add(h);
      stena.push(h);
      const u = h.do, i = u.von.indexOf(h.tw);
      h = u.von[(i - 1 + u.von.length) % u.von.length];
    }
    if (h !== h0 || stena.length < 3) continue;
    const body = stena.map((q) => q.od.p);
    let A = 0, P = 0, vozovky = 0;
    for (let i = 0; i < body.length; i++) {
      const a = body[i], b = body[(i + 1) % body.length];
      A += a[0] * b[1] - b[0] * a[1];
      const L = Math.hypot(b[0] - a[0], b[1] - a[1]);
      P += L;
      vozovky += L * (stena[i].c.sirka ?? 6) / 2;
    }
    A /= 2;
    if (A <= 0) continue;                  // vonkajšia stena (obíde graf z druhej strany)
    const sirka = (2 * A) / P;
    if (!(A < MAX_PLOCHA || (sirka < MAX_SIRKA_PASU && A < MAX_PLOCHA_PASU))) continue;
    const cista = A - vozovky;
    if (cista < MIN_CISTA) continue;
    // budova vnútri = blok domov, nie ostrovček
    let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
    for (const [x, z] of body) { minX = Math.min(minX, x); maxX = Math.max(maxX, x); minZ = Math.min(minZ, z); maxZ = Math.max(maxZ, z); }
    const dom = budovy.some((b) => b.body?.some(([x, z]) => x > minX && x < maxX && z > minZ && z < maxZ && bodVPolygone(x, z, body)));
    if (dom) continue;
    out.push({ body, plocha: A, cista, minX, maxX, minZ, maxZ });
  }
  return out;
}

/** Leží bod (x, z) v niektorom ostrovčeku? */
export function vOstrovceku(ostrovceky, x, z) {
  for (const o of ostrovceky ?? []) {
    if (x > o.minX && x < o.maxX && z > o.minZ && z < o.maxZ && bodVPolygone(x, z, o.body)) return true;
  }
  return false;
}
