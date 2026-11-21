// Modul: vonkajšie schody ako 3D stupne (OSM highway=steps z dlaždíc mesta, issue #73 – priechodnosť).
// Stupne idú po teréne: výška každého stupňa sa zaokrúhli na násobok výšky schodu (15 cm), takže na strmom svahu
// vznikne pravidelné schodisko a na rovine podesta. Stupeň je vždy celý nad terénom (zem ho neprerazí),
// pri dlhšom schodisku je po oboch stranách kovové zábradlie.
// Stavia sa spolu s detailnou dlaždicou (udalosť 'dlazdica-nacitana'); sieť patrí objektu dlaždice
// a uvoľní sa s ňou. Schody na mostoch a lávkach (nadjazd) a schody do podchodov (zdieľajú bod s data.podchody)
// sa nekreslia – majú vlastnú stavbu.

const STUPEN = 0.3;        // m – dĺžka stupňa (nástupnica)
const VYSKA = 0.15;        // m – výška schodu
const SPODOK = 0.35;       // m – o koľko pod terén ide bok schodiska
const ZABRADLIE = 0.95;    // m – výška madla nad stupňom
const MIN_SCHODOV = 4;     // zábradlie až od toľkých schodov

/** Bod a smer na lomenej čiare vo vzdialenosti s od začiatku. */
function naCiare(body, dlzky, s) {
  let i = 0;
  while (i < dlzky.length - 2 && dlzky[i + 1] < s) i++;
  const [ax, az] = body[i], [bx, bz] = body[i + 1];
  const L = dlzky[i + 1] - dlzky[i] || 1;
  const t = Math.max(0, Math.min(1, (s - dlzky[i]) / L));
  return [ax + (bx - ax) * t, az + (bz - az) * t, (bx - ax) / L, (bz - az) / L];
}

/** Pridá štvoruholník (a, b, c, d proti smeru hodín pri pohľade zvonka) so svetovými UV a farbou. */
function stvoruholnik(o, a, b, c, d, svetlost, uvOs) {
  const z = o.poz.length / 3;
  for (const p of [a, b, c, d]) {
    o.poz.push(p[0], p[1], p[2]);
    // UV: vodorovné plochy podľa x, z; zvislé podľa vodorovnej osi a výšky
    if (uvOs === 'xz') o.uv.push(p[0] * 0.5, p[2] * 0.5);
    else o.uv.push((p[0] + p[2]) * 0.5, p[1] * 0.5);
    o.farby.push(svetlost, svetlost, svetlost);
  }
  o.idx.push(z, z + 1, z + 2, z, z + 2, z + 3);
}

/** Stupne jedného schodiska (OSM cesta) – pridá do polí o; vracia počet schodov. */
function schodisko(c, vyska, o, zabradlie) {
  const body = c.body;
  if (body.length < 2) return 0;
  const dlzky = [0];
  for (let i = 1; i < body.length; i++) dlzky.push(dlzky[i - 1] + Math.hypot(body[i][0] - body[i - 1][0], body[i][1] - body[i - 1][1]));
  const L = dlzky[dlzky.length - 1];
  if (L < 0.8) return 0;
  const w = Math.max(1.2, Math.min(4, c.sirka ?? 2.5)) / 2;
  const n = Math.max(2, Math.round(L / STUPEN));
  // výšky terénu na okrajoch stupňov (stred a oba boky – stupeň nesmie byť pod zemou nikde)
  const okraje = [];
  for (let k = 0; k <= n; k++) {
    const [x, z, dx, dz] = naCiare(body, dlzky, (k / n) * L);
    const nx = -dz, nz = dx;
    const h = Math.max(vyska(x, z), vyska(x + nx * w, z + nz * w), vyska(x - nx * w, z - nz * w));
    const hMin = Math.min(vyska(x, z), vyska(x + nx * w, z + nz * w), vyska(x - nx * w, z - nz * w));
    okraje.push({ x, z, nx, nz, h, hMin });
  }
  const h0 = Math.min(okraje[0].h, okraje[n].h);
  if (Math.abs(okraje[n].h - okraje[0].h) < VYSKA * 1.5) return 0;   // takmer rovina – ostane chodník v textúre
  // horná plocha stupňa: najbližší násobok výšky schodu nad terénom
  const vrchy = [];
  for (let k = 0; k < n; k++) {
    const hm = Math.max(okraje[k].h, okraje[k + 1].h);
    vrchy.push(h0 + Math.ceil((hm - h0) / VYSKA - 0.15) * VYSKA + 0.03);
  }
  // rovnako vysoké susedné stupne sa zlúčia do podesty
  const kusy = [];
  for (let k = 0; k < n; k++) {
    const p = kusy[kusy.length - 1];
    if (p && Math.abs(p.vrch - vrchy[k]) < 0.01) p.k1 = k + 1;
    else kusy.push({ k0: k, k1: k + 1, vrch: vrchy[k] });
  }
  for (let q = 0; q < kusy.length; q++) {
    const { k0, k1, vrch } = kusy[q];
    let dno = Infinity;
    for (let k = k0; k <= k1; k++) dno = Math.min(dno, okraje[k].hMin);
    dno -= SPODOK;
    const A = okraje[k0], B = okraje[k1];
    const aL = [A.x + A.nx * w, vrch, A.z + A.nz * w], aP = [A.x - A.nx * w, vrch, A.z - A.nz * w];
    const bL = [B.x + B.nx * w, vrch, B.z + B.nz * w], bP = [B.x - B.nx * w, vrch, B.z - B.nz * w];
    const dol = (p) => [p[0], dno, p[2]];
    // nástupnica (hore), čelá (začiatok a koniec kusu), boky; poradie vrcholov podľa smeru normály
    const svetla = 0.92 + ((k0 * 37) % 7) * 0.012;
    stvoruholnik(o, aL, bL, bP, aP, svetla, 'xz');
    stvoruholnik(o, aP, dol(aP), dol(aL), aL, 0.7, 'x');
    stvoruholnik(o, bL, dol(bL), dol(bP), bP, 0.7, 'x');
    stvoruholnik(o, bL, aL, dol(aL), dol(bL), 0.78, 'z');
    stvoruholnik(o, aP, bP, dol(bP), dol(aP), 0.78, 'z');
  }
  // zábradlie: madlo nad stredmi stupňov po oboch stranách (vyhladené – nie zubaté ako stupne), stĺpiky každé ~2 m
  const schodov = kusy.length - 1;
  if (schodov >= MIN_SCHODOV) {
    const R = 3;
    const madlo = vrchy.map((_, k) => {
      let sum = 0, m = 0;
      for (let q = Math.max(0, k - R); q <= Math.min(n - 1, k + R); q++) { sum += vrchy[q]; m++; }
      // madlo nesmie byť nižšie ako ZABRADLIE − 5 cm nad žiadnym stupňom
      return Math.max(sum / m + ZABRADLIE, vrchy[k] + ZABRADLIE - 0.05);
    });
    for (const strana of [1, -1]) {
      const body3 = [];
      for (let k = 0; k < n; k++) {
        const P = okraje[k], Q = okraje[k + 1];
        const x = (P.x + Q.x) / 2 + ((P.nx + Q.nx) / 2) * (w - 0.08) * strana;
        const z = (P.z + Q.z) / 2 + ((P.nz + Q.nz) / 2) * (w - 0.08) * strana;
        body3.push([x, madlo[k], z, vrchy[k]]);
      }
      zabradlie.push(body3);
    }
  }
  return schodov;
}

/** Madlá a stĺpiky zábradlia (tenké kvádre). */
function sietZabradlia(T, zabradlia) {
  const poz = [], idx = [];
  const kvader = (ax, ay, az, bx, by, bz, r) => {
    // hranol okolo úsečky a–b so štvorcovým prierezom 2r
    const dx = bx - ax, dy = by - ay, dz = bz - az;
    const L = Math.hypot(dx, dy, dz) || 1;
    let ux = -dz, uy = 0, uz = dx;
    let lu = Math.hypot(ux, uy, uz);
    if (lu < 1e-6) { ux = 1; uz = 0; lu = 1; }
    ux /= lu; uz /= lu;
    // v = smer × u
    const sx = dx / L, sy = dy / L, sz = dz / L;
    const vx = sy * uz - sz * uy, vy = sz * ux - sx * uz, vz = sx * uy - sy * ux;
    const z = poz.length / 3;
    for (const [px, py, pz] of [[ax, ay, az], [bx, by, bz]]) {
      for (const [a, b] of [[1, 1], [-1, 1], [-1, -1], [1, -1]]) poz.push(px + (ux * a + vx * b) * r, py + (uy * a + vy * b) * r, pz + (uz * a + vz * b) * r);
    }
    for (let s = 0; s < 4; s++) {
      const a = z + s, b = z + ((s + 1) % 4), c = a + 4, d = b + 4;
      idx.push(a, c, b, b, c, d);
    }
  };
  for (const b of zabradlia) {
    for (let i = 0; i < b.length - 1; i++) kvader(b[i][0], b[i][1], b[i][2], b[i + 1][0], b[i + 1][1], b[i + 1][2], 0.025);
    let od = 0;
    for (let i = 0; i < b.length; i++) {
      if (i > 0) od += Math.hypot(b[i][0] - b[i - 1][0], b[i][2] - b[i - 1][2]);
      if (i === 0 || i === b.length - 1 || od >= 2) {
        kvader(b[i][0], b[i][3], b[i][2], b[i][0], b[i][1], b[i][2], 0.022);
        od = 0;
      }
    }
  }
  if (!idx.length) return null;
  const g = new T.BufferGeometry();
  g.setAttribute('position', new T.Float32BufferAttribute(poz, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

export default {
  nazov: 'schody',
  poradie: 60,

  init(hra) {
    const sprava = hra.mapa.dlazdice;
    if (!sprava) return;
    const T = hra.THREE;
    const l = new T.TextureLoader();
    const tex = (cesta, srgb) => {
      const t = l.load(cesta);
      t.wrapS = t.wrapT = T.RepeatWrapping;
      t.anisotropy = 8;
      if (srgb) t.colorSpace = T.SRGBColorSpace;
      return t;
    };
    // kamenné dlaždice (ambientCG, CC0) – na stupňoch pôsobia ako betón / kameň
    this.mat = new T.MeshStandardMaterial({
      map: tex('assets/textury/chodnik/farba.jpg', true), normalMap: tex('assets/textury/chodnik/normal.jpg', false),
      color: '#d8d4cc', vertexColors: true, roughness: 0.9,
    });
    this.matZabradlie = new T.MeshStandardMaterial({ color: '#3d4247', roughness: 0.45, metalness: 0.7, side: T.DoubleSide });
    const pridaj = ({ uroven, data, objekt }) => {
      if (uroven !== 'detail' || !data?.chodniky || objekt.getObjectByName('schody')) return;
      const m = this.postav(hra, data.chodniky, data.podchody);
      if (m) objekt.add(m);
    };
    for (const [kluc, a] of sprava.aktivne) pridaj({ kluc, uroven: a.uroven, data: a.data, objekt: a.objekt });
    hra.na('dlazdica-nacitana', pridaj);
  },

  /** Skupina so schodiskami jednej dlaždice (alebo null). */
  postav(hra, chodniky, podchody = []) {
    const T = hra.THREE;
    // body podchodov (rovnaký uzol OSM = rovnaké súradnice) – schody, ktoré ich zdieľajú, vedú pod zem
    const kluc = ([x, z]) => `${Math.round(x * 10)},${Math.round(z * 10)}`;
    const podZemou = new Set();
    for (const p of podchody ?? []) for (const b of p.body ?? []) podZemou.add(kluc(b));
    const o = { poz: [], uv: [], farby: [], idx: [] };
    const zabradlia = [];
    // výška terénu (hra.mapa.vyska môže pripočítať vozovku a chodník – js/mapa/cesty/povrch-modul.js)
    const zem = hra.mapa.vyskaZeme ?? hra.mapa.vyska;
    const vyska = (x, z) => zem(x, z);
    for (const c of chodniky) {
      if (c.typ !== 'steps' || c.nadjazd || c.most) continue;
      if (podZemou.size && c.body.some((b) => podZemou.has(kluc(b)))) continue;
      schodisko(c, vyska, o, zabradlia);
    }
    if (!o.idx.length) return null;
    const geo = new T.BufferGeometry();
    geo.setAttribute('position', new T.Float32BufferAttribute(o.poz, 3));
    geo.setAttribute('uv', new T.Float32BufferAttribute(o.uv, 2));
    geo.setAttribute('color', new T.Float32BufferAttribute(o.farby, 3));
    geo.setIndex(o.idx);
    geo.computeVertexNormals();
    const g = new T.Group();
    g.name = 'schody';
    const m = new T.Mesh(geo, this.mat);
    m.castShadow = true; m.receiveShadow = true;
    g.add(m);
    const gz = sietZabradlia(T, zabradlia);
    if (gz) {
      const z = new T.Mesh(gz, this.matZabradlie);
      z.castShadow = true;
      g.add(z);
    }
    return g;
  },
};
