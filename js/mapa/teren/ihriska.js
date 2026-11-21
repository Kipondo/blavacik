// Športoviská v textúre zeme (data/mapa/ihriska.json z tools/mesto/ihriska.mjs): povrch podľa OSM
// (surface, inak podľa športu) a biele čiary – antukové kurty, tartanové dráhy, umelá tráva, asfaltové
// ihriská, piesok; vonkajšie bazény a fontány (tyrkysová voda s obrubou). Porovnanie so satelitnou
// snímkou ukázalo, že ihriská boli všetky len zelené a bazény v záhradách chýbali.
// Súbor sa načíta hneď pri štarte; dlaždice postavené skôr ho nemajú (stáva sa len výnimočne).

let zoznam = [];
fetch('data/mapa/ihriska.json')
  .then((r) => (r.ok ? r.json() : { ihriska: [] }))
  .then((d) => {
    zoznam = (d.ihriska ?? []).map((z) => {
      let minX = Infinity, minZ = Infinity, maxX = -Infinity, maxZ = -Infinity;
      for (const [x, y] of z.b) { minX = Math.min(minX, x); maxX = Math.max(maxX, x); minZ = Math.min(minZ, y); maxZ = Math.max(maxZ, y); }
      const okraj = (z.w ?? 8) / 2;
      let plocha = 0;
      for (let i = 0, j = z.b.length - 1; i < z.b.length; j = i++) plocha += (z.b[j][0] - z.b[i][0]) * (z.b[j][1] + z.b[i][1]);
      return { ...z, plocha: Math.abs(plocha / 2), ohr: { minX: minX - okraj, maxX: maxX + okraj, minZ: minZ - okraj, maxZ: maxZ + okraj } };
    })
      // väčšie plochy najprv – ihrisko vnútri atletického oválu sa nakreslí navrch
      .sort((a, b) => b.plocha - a.plocha);
  })
  .catch(() => {});

const FARBY = {
  clay: '#b4613f', tartan: '#a3473b', rubber: '#a3473b', acrylic: '#3e6c8c', plastic: '#3e6c8c', hard: '#3e6c8c',
  asphalt: '#6e6d6a', concrete: '#8a8781', paved: '#7a7975', artificial_turf: '#4b8a3c', grass: '#5e8c40',
  sand: '#d6c49a', gravel: '#a59a83', fine_gravel: '#a8987a', ground: '#8c7b5e', dirt: '#8c7b5e', compacted: '#9a8c72',
};
// povrch, keď ho OSM neuvádza (podľa bežných ihrísk v Bratislave)
const PODLA_SPORTU = {
  tennis: 'clay', soccer: 'grass', basketball: 'asphalt', beachvolleyball: 'sand', multi: 'asphalt',
  field_hockey: 'artificial_turf', equestrian: 'sand', volleyball: 'asphalt', boules: 'fine_gravel', athletics: 'tartan',
  skateboard: 'concrete', handball: 'asphalt', table_tennis: 'concrete', golf: 'grass', american_football: 'grass',
};
// športy s čiarami (obrys, stredová čiara, prípadne stredový kruh v metroch)
const CIARY = { soccer: 9.15, basketball: 1.8, tennis: 0, multi: 1.8, handball: 3, volleyball: 0, field_hockey: 0, futsal: 3, athletics: 0 };

const prekryva = (o, rect) => !(o.maxX < rect.minX || o.minX > rect.maxX || o.maxZ < rect.minZ || o.minZ > rect.maxZ);
const povrch = (z) => (z.t === 'bazen' || z.t === 'fontana' ? 'voda'
  : z.p && FARBY[z.p] ? z.p : PODLA_SPORTU[z.s] ?? (z.t === 'track' ? 'tartan' : null));

/** Športoviská v obdĺžniku dlaždice. */
export function ihriskaVObdlzniku(rect) {
  return zoznam.filter((z) => prekryva(z.ohr, rect) && povrch(z));
}

/** Je pôdorys skoro obdĺžnik? Vráti stred, os dlhšej strany a rozmery, inak null. */
function obdlznik(b) {
  if (b.length !== 4) return null;
  const s = (i) => Math.hypot(b[(i + 1) % 4][0] - b[i][0], b[(i + 1) % 4][1] - b[i][1]);
  const [a, c, e, f] = [s(0), s(1), s(2), s(3)];
  if (Math.abs(a - e) > 0.15 * Math.max(a, e) || Math.abs(c - f) > 0.15 * Math.max(c, f)) return null;
  const cx = (b[0][0] + b[1][0] + b[2][0] + b[3][0]) / 4, cz = (b[0][1] + b[1][1] + b[2][1] + b[3][1]) / 4;
  const dlhaPrva = a >= c;
  const [p, q] = dlhaPrva ? [b[0], b[1]] : [b[1], b[2]];
  const L = Math.hypot(q[0] - p[0], q[1] - p[1]);
  return { cx, cz, ux: (q[0] - p[0]) / L, uz: (q[1] - p[1]) / L, dlzka: dlhaPrva ? a : c, sirka: dlhaPrva ? c : a };
}

/** Nakreslí športoviská do farebnej textúry dlaždice (g – 2D kontext, sx/sz – metre → px). */
export function kresliIhriska(g, rect, sx, sz, mierka) {
  const ihriska = ihriskaVObdlzniku(rect);
  if (!ihriska.length) return;
  const cesta = (body, uzavriet) => {
    g.beginPath();
    body.forEach(([x, z], i) => (i ? g.lineTo(sx(x), sz(z)) : g.moveTo(sx(x), sz(z))));
    if (uzavriet) g.closePath();
  };
  const ciara = Math.max(1, 0.12 * mierka);
  g.save();
  g.lineJoin = 'round';
  // najprv plochy, potom dráhy (dráha okolo futbalového ihriska je navrchu)
  for (const z of ihriska.filter((q) => q.t === 'pitch')) {
    g.fillStyle = FARBY[povrch(z)];
    cesta(z.b, true);
    g.fill();
    if (!(z.s in CIARY) || ['sand', 'gravel', 'fine_gravel'].includes(povrch(z))) continue;
    g.strokeStyle = 'rgba(245,245,240,0.8)';
    g.lineWidth = ciara;
    cesta(z.b, true);
    g.stroke();
    const o = obdlznik(z.b);
    if (!o) continue;
    // stredová čiara naprieč a stredový kruh
    const nx = -o.uz, nz = o.ux;
    g.beginPath();
    g.moveTo(sx(o.cx + nx * o.sirka / 2), sz(o.cz + nz * o.sirka / 2));
    g.lineTo(sx(o.cx - nx * o.sirka / 2), sz(o.cz - nz * o.sirka / 2));
    g.stroke();
    const r = Math.min(CIARY[z.s], o.sirka * 0.15);
    if (r > 0.5) { g.beginPath(); g.arc(sx(o.cx), sz(o.cz), r * mierka, 0, Math.PI * 2); g.stroke(); }
  }
  // bazény a fontány: obruba z dlažby a tyrkysová (fontána tmavšia) voda
  for (const z of ihriska.filter((q) => q.t === 'bazen' || q.t === 'fontana')) {
    g.strokeStyle = '#d9d4c6';
    g.lineWidth = Math.max(1, 0.8 * mierka);
    cesta(z.b, true);
    g.stroke();
    g.fillStyle = z.t === 'bazen' ? '#3aa3c2' : '#4d8c9c';
    g.fill();
  }
  g.lineCap = 'butt';
  for (const z of ihriska.filter((q) => q.t === 'track')) {
    const farba = FARBY[povrch(z)];
    const w = z.w ?? (/running|athletics/.test(z.s ?? 'running') ? 7.3 : 4);
    const uzavreta = z.b.length > 3 && z.b[0][0] === z.b[z.b.length - 1][0] && z.b[0][1] === z.b[z.b.length - 1][1];
    // dráhy: biela čiara po každých 1,22 m (súmerne okolo stredu dráhy v OSM)
    const atletika = /running|athletics/.test(z.s ?? 'running') && ['tartan', 'rubber'].includes(povrch(z));
    for (let k = 0; ; k++) {
      const s = w - 2 * k * 1.22;
      if (s < 0.4 || (!atletika && k > 0)) break;
      if (atletika) { g.strokeStyle = 'rgba(245,245,240,0.85)'; g.lineWidth = s * mierka; cesta(z.b, uzavreta); g.stroke(); }
      g.strokeStyle = farba; g.lineWidth = Math.max(1, (atletika ? s - 0.12 : s) * mierka); cesta(z.b, uzavreta); g.stroke();
    }
  }
  g.restore();
}

/** V mape tried povrchu: športoviská bez CC0 dlažby (trieda 0 = farba z textúry) a bez masky asfaltu. */
export function triedyIhrisk(g, gm, rect, sx, sz, mierka) {
  const ihriska = ihriskaVObdlzniku(rect);
  if (!ihriska.length) return;
  for (const kontext of [g, gm]) {
    kontext.save();
    kontext.fillStyle = kontext.strokeStyle = '#000';
    kontext.lineJoin = 'round';
    for (const z of ihriska) {
      kontext.beginPath();
      z.b.forEach(([x, y], i) => (i ? kontext.lineTo(sx(x), sz(y)) : kontext.moveTo(sx(x), sz(y))));
      if (z.t !== 'track') { kontext.closePath(); kontext.fill(); }
      else { kontext.lineWidth = (z.w ?? 7.3) * mierka; kontext.stroke(); }
    }
    kontext.restore();
  }
}
