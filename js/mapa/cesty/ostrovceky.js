// Dopravné ostrovčeky a stredné deliace pásy (pravidlá ulice #136): malé plochy, ktoré zo všetkých strán obkolesujú
// vozovky ciest pre autá a nie je v nich budova. V hre sú celé zelené (tráva aj tam, kde má OSM betón alebo dlažbu)
// a lemuje ich len obrubník – bez chodníka (js/mapa/cesty/chodniky.js), takže je jasne vidieť, kde je cesta a kde
// ostrovček (predtým ich zakryli chodníky okolitých ciest a ostala sivá plocha s fľakmi).
// Hľadajú sa ako steny rovinného grafu ciest (spoločné body = uzly); deliace pásy rozdelených ciest aj z dvojíc
// protismerných jednosmerných pásov (deliacePasy). Bez Three.js – používa ho aj kontrola mapy.

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
  if (!d._ostrovceky) d._ostrovceky = [...najdiOstrovceky(d.cesty ?? [], d.budovy ?? []), ...deliacePasy(d.cesty ?? [], d.budovy ?? [])];
  return d._ostrovceky;
}

const KROK_PASU = 5;       // m – vzorky pozdĺž jazdného pásu
const MAX_MEDZERA = 12;    // m – širší priestor medzi pásmi už nie je deliaci pás (park, parkovisko…)
const BUNKA = 25;
// rozdelené cesty s deliacim pásom (obytné jednosmerky nie – tie sú súbežné ulice, nie jazdné pásy jednej cesty)
const TRIEDY_PASOV = new Set(['motorway', 'trunk', 'primary', 'secondary', 'tertiary']);

/**
 * Deliace pásy rozdelených ciest: medzi jednosmerným pásom a protismerným pásom vľavo od neho (pravá premávka).
 * Nájdu sa aj tam, kde plocha medzi cestami nie je uzavretá v dlaždici (dlhé triedy cez hranicu dlaždíc).
 * Vráti polygóny [{ body, plocha, cista, … }] od vnútorného okraja jedného pásu po vnútorný okraj druhého.
 */
export function deliacePasy(cesty, budovy = []) {
  const pasy = cesty.filter((c) => c.jednosmerka && TRIEDY_PASOV.has(c.typ) && !c.most && !c.nadjazd && c.body?.length > 1);
  if (pasy.length < 2) return [];
  const domy = obalky(budovy);
  const m = new Map();
  for (const c of pasy) {
    for (let i = 1; i < c.body.length; i++) {
      const [ax, az] = c.body[i - 1], [bx, bz] = c.body[i];
      const u = { ax, az, bx, bz, c };
      for (let gi = Math.floor(Math.min(ax, bx) / BUNKA) - 1; gi <= Math.floor(Math.max(ax, bx) / BUNKA) + 1; gi++) {
        for (let gj = Math.floor(Math.min(az, bz) / BUNKA) - 1; gj <= Math.floor(Math.max(az, bz) / BUNKA) + 1; gj++) {
          const k = gi * 100003 + gj;
          if (!m.has(k)) m.set(k, []);
          m.get(k).push(u);
        }
      }
    }
  }
  const out = [];
  for (const c of pasy) {
    const pc = (c.sirka ?? 6) / 2;
    // body osi po KROK_PASU m so smerom
    const vz = [];
    for (let i = 0; i < c.body.length - 1; i++) {
      const [ax, az] = c.body[i], [bx, bz] = c.body[i + 1];
      const L = Math.hypot(bx - ax, bz - az);
      if (L < 0.01) continue;
      const n = Math.max(1, Math.ceil(L / KROK_PASU));
      for (let k = 0; k < n; k++) vz.push({ x: ax + ((bx - ax) * k) / n, z: az + ((bz - az) * k) / n, sx: (bx - ax) / L, sz: (bz - az) / L });
    }
    const [lx, lz] = c.body[c.body.length - 1];
    if (vz.length) vz.push({ x: lx, z: lz, sx: vz[vz.length - 1].sx, sz: vz[vz.length - 1].sz });
    let beh = [];
    const uzavri = () => {
      if (beh.length >= 3) {
        const body = [...beh.map((q) => q.a), ...beh.map((q) => q.b).reverse()];
        let A = 0;
        for (let i = 0; i < body.length; i++) { const a = body[i], b = body[(i + 1) % body.length]; A += a[0] * b[1] - b[0] * a[1]; }
        let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
        for (const [x, z] of body) { minX = Math.min(minX, x); maxX = Math.max(maxX, x); minZ = Math.min(minZ, z); maxZ = Math.max(maxZ, z); }
        // budova v páse = nie je to deliaci pás (dvor, blok medzi súbežnými ulicami)
        const dom = domy.some((b) => b.maxX > minX && b.minX < maxX && b.maxZ > minZ && b.minZ < maxZ
          && b.body.some(([x, z]) => x > minX && x < maxX && z > minZ && z < maxZ && bodVPolygone(x, z, body)));
        if (!dom) out.push({ body, plocha: Math.abs(A) / 2, cista: Math.abs(A) / 2, pas: true, minX, maxX, minZ, maxZ });
      }
      beh = [];
    };
    for (const v of vz) {
      // ľavá normála (stredný pás je pri pravej premávke vľavo od jednosmerného pásu)
      const nx = v.sz, nz = -v.sx;
      let naj = null;
      for (const u of m.get(Math.floor(v.x / BUNKA) * 100003 + Math.floor(v.z / BUNKA)) ?? []) {
        if (u.c === c) continue;
        const dx = u.bx - u.ax, dz = u.bz - u.az, L = Math.hypot(dx, dz) || 1e-9;
        if ((dx * v.sx + dz * v.sz) / L > -0.95) continue;          // len protismerný súbežný pás
        // priesečník ľavej normály s úsekom
        const den = nx * dz - nz * dx;
        if (Math.abs(den) < 1e-9) continue;
        const t = ((u.ax - v.x) * dz - (u.az - v.z) * dx) / den;     // vzdialenosť po normále
        const w = ((u.ax - v.x) * nz - (u.az - v.z) * nx) / den;     // poloha na úseku (0..1)
        if (t <= 0 || w < 0 || w > 1) continue;
        if (!naj || t < naj.t) naj = { t, pd: (u.c.sirka ?? 6) / 2 };
      }
      const medzera = naj ? naj.t - pc - naj.pd : -1;
      if (naj && medzera > 0.3 && medzera < MAX_MEDZERA) {
        beh.push({ a: [v.x + nx * pc, v.z + nz * pc], b: [v.x + nx * (naj.t - naj.pd), v.z + nz * (naj.t - naj.pd)] });
      } else uzavri();
    }
    uzavri();
  }
  return out;
}

/** Budovy s obálkou (na rýchle vylúčenie vzdialených). */
function obalky(budovy) {
  const out = [];
  for (const b of budovy ?? []) {
    if (!(b.body?.length > 2)) continue;
    let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
    for (const [x, z] of b.body) { minX = Math.min(minX, x); maxX = Math.max(maxX, x); minZ = Math.min(minZ, z); maxZ = Math.max(maxZ, z); }
    out.push({ body: b.body, minX, maxX, minZ, maxZ });
  }
  return out;
}

export function najdiOstrovceky(cesty, budovy = []) {
  const domy = obalky(budovy);
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
    const dom = domy.some((b) => b.maxX > minX && b.minX < maxX && b.maxZ > minZ && b.minZ < maxZ
      && b.body.some(([x, z]) => x > minX && x < maxX && z > minZ && z < maxZ && bodVPolygone(x, z, body)));
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
