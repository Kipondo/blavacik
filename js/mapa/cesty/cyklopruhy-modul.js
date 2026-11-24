// Modul: červené cyklopruhy na cestách (data/mapa/cyklopruhy.json z OSM, tools/mesto/cyklopruhy.mjs), issue #52.
// Pruh 1,5 m pri okraji asfaltu s bielou čiarou na strane áut a piktogramom bicykla každých 20 m.
// Stavia sa spolu s detailnou dlaždicou mesta (udalosť 'dlazdica-nacitana'), keď je už načítaný detailný terén;
// sieť je súčasťou objektu dlaždice, takže sa uvoľní spolu s ňou.
// Pruh je súvislý pás s pokosom v lomoch (pridajPas z cesty.js, #136) – predtým bol každý úsek samostatný
// štvoruholník a v zákrutách sa susedné úseky prekrývali (blikanie) alebo medzi nimi ostala medzera.

import { NAD_TERENOM, pridajPas, zjemni } from './cesty.js';

const SIRKA = 1.5;
const OPAKOVANIE = 20;     // m – dĺžka textúry s jedným piktogramom
const KROK = 4;            // m – delenie pruhu, aby kopíroval terén

function texturaPruhu(THREE) {
  const c = document.createElement('canvas');
  c.width = 64; c.height = 512;
  const g = c.getContext('2d');
  g.fillStyle = '#b8473c';
  g.fillRect(0, 0, 64, 512);
  // jemný šum, aby farba nebola plochá
  for (let i = 0; i < 900; i++) {
    g.fillStyle = `rgba(${Math.random() < 0.5 ? '0,0,0' : '255,255,255'},${0.04 + Math.random() * 0.05})`;
    g.fillRect(Math.random() * 64, Math.random() * 512, 2, 2);
  }
  // biela čiara na strane áut (u = 0)
  g.fillStyle = '#eeeeea';
  g.fillRect(0, 0, 6, 512);
  // piktogram bicykla
  g.strokeStyle = '#f2f2ee';
  g.lineWidth = 4;
  const kruh = (x, y, r) => { g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.stroke(); };
  kruh(34, 210, 13);
  kruh(34, 290, 13);
  g.beginPath();
  g.moveTo(34, 210); g.lineTo(34, 250); g.lineTo(46, 275); g.lineTo(34, 290);
  g.moveTo(34, 250); g.lineTo(22, 262); g.moveTo(46, 275); g.lineTo(52, 268);
  g.stroke();
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 8;
  return t;
}

/** Os pruhu: línia posunutá od osi cesty o d (vpravo +) s pokosom v lomoch (ako okraj pásu cesty). */
export function posunutaLinia(body, d) {
  const out = [];
  const n = body.length;
  for (let i = 0; i < n; i++) {
    const [x, z] = body[i];
    const prev = body[Math.max(0, i - 1)], next = body[Math.min(n - 1, i + 1)];
    let ax = x - prev[0], az = z - prev[1], bx = next[0] - x, bz = next[1] - z;
    const la = Math.hypot(ax, az), lb = Math.hypot(bx, bz);
    // najprv jednotkové smery, až potom náhrada chýbajúceho (v prvom bode sa predtým dosadil nenormovaný smer
    // a pás sa na začiatku každej cesty zúžil – šikmé čiary a cyklopruhy krížom cez cestu)
    if (la >= 1e-6) { ax /= la; az /= la; }
    if (lb >= 1e-6) { bx /= lb; bz /= lb; }
    if (la < 1e-6) { ax = bx; az = bz; }
    if (lb < 1e-6) { bx = ax; bz = az; }
    if (la < 1e-6 && lb < 1e-6) continue;
    let nx = -(az + bz), nz = ax + bx;           // vpravo v smere kreslenia (ako js/mapa/cesty/cesty.js)
    const ln = Math.hypot(nx, nz) || 1;
    nx /= ln; nz /= ln;
    const kos = Math.max(0.5, nx * -az + nz * ax);
    out.push([x + nx * d / kos, z + nz * d / kos]);
  }
  return out;
}

/** Mriežka osí ciest dlaždice (bez vjazdov a peších ciest) – na zarovnanie pruhu k asfaltu. */
function mriezkaOsi(cesty) {
  if (!cesty?.length) return null;
  const B = 20, m = new Map();
  for (const c of cesty) {
    if (c.nadjazd || c.most || !(c.body?.length > 1) || !c.sirka) continue;
    for (let i = 1; i < c.body.length; i++) {
      const [ax, az] = c.body[i - 1], [bx, bz] = c.body[i];
      const u = { ax, az, bx, bz, c };
      for (let gi = Math.floor(Math.min(ax, bx) / B) - 1; gi <= Math.floor(Math.max(ax, bx) / B) + 1; gi++) {
        for (let gj = Math.floor(Math.min(az, bz) / B) - 1; gj <= Math.floor(Math.max(az, bz) / B) + 1; gj++) {
          const k = gi * 100003 + gj;
          if (!m.has(k)) m.set(k, []);
          m.get(k).push(u);
        }
      }
    }
  }
  /** Bod na osi súbežnej cesty do 2,5 m od (x, z) a jej polšírka, alebo null. */
  return (x, z, sx, sz) => {
    let naj = null;
    for (const u of m.get(Math.floor(x / B) * 100003 + Math.floor(z / B)) ?? []) {
      const dx = u.bx - u.ax, dz = u.bz - u.az, l2 = dx * dx + dz * dz || 1e-9, l = Math.sqrt(l2);
      if (Math.abs((dx * sx + dz * sz) / l) < 0.9) continue;
      const t = Math.max(0, Math.min(1, ((x - u.ax) * dx + (z - u.az) * dz) / l2));
      const px = u.ax + dx * t, pz = u.az + dz * t, d = Math.hypot(x - px, z - pz);
      if (d < 2.5 && (!naj || d < naj.d)) naj = { d, x: px, z: pz, pol: u.c.sirka / 2 };
    }
    return naj;
  };
}

/**
 * Os cyklopruhu na strane s (+1 vpravo, −1 vľavo): pri okraji asfaltu cesty, ktorú hra kreslí (upravená os
 * a šírka z dlaždice – súbežné pásy môžu byť zúžené, js/mapa/cesty/sirky-pasov.js); bez nej podľa OSM.
 */
function liniaPruhu(p, s, najdiCestu) {
  const os0 = Math.max(0.5, p.s / 2 - SIRKA / 2 - 0.15);
  if (!najdiCestu) return posunutaLinia(p.body, s * os0);
  const body = zjemni(p.body, KROK);
  const out = [];
  for (let i = 0; i < body.length; i++) {
    const a = body[Math.max(0, i - 1)], b = body[Math.min(body.length - 1, i + 1)];
    let sx = b[0] - a[0], sz = b[1] - a[1];
    const l = Math.hypot(sx, sz) || 1; sx /= l; sz /= l;
    const c = najdiCestu(body[i][0], body[i][1], sx, sz);
    const [x, z] = c ? [c.x, c.z] : body[i];
    const os = c ? Math.max(0.5, c.pol - SIRKA / 2 - 0.15) : os0;
    // vpravo v smere kreslenia (ako posunutaLinia)
    out.push([x - sz * s * os, z + sx * s * os]);
  }
  return out;
}

export default {
  nazov: 'cyklopruhy',
  poradie: 60,

  async init(hra) {
    this.pruhy = [];
    try {
      const r = await fetch('data/mapa/cyklopruhy.json');
      if (r.ok) this.pruhy = (await r.json()).pruhy ?? [];
    } catch { /* bez cyklopruhov */ }
    for (const p of this.pruhy) {
      let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
      for (const [x, z] of p.body) { minX = Math.min(minX, x); maxX = Math.max(maxX, x); minZ = Math.min(minZ, z); maxZ = Math.max(maxZ, z); }
      p.ohr = { minX, maxX, minZ, maxZ };
    }
    const T = hra.THREE;
    this.mat = new T.MeshStandardMaterial({
      map: texturaPruhu(T), roughness: 0.85,
      polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4,
    });
    const sprava = hra.mapa.dlazdice;
    if (!sprava || !this.pruhy.length) return;
    const velkost = sprava.velkost ?? 500;
    const pridaj = async ({ kluc, uroven, objekt }) => {
      if (uroven !== 'detail' || objekt.getObjectByName('cyklopruhy')) return;
      const [i, j] = kluc.split('_').map(Number);
      // cesty dlaždice (upravené osi a šírky) – pruh sa zarovná k okraju asfaltu, ktorý hra naozaj kreslí
      const d = await sprava.data?.get(kluc)?.catch?.(() => null);
      if (objekt.getObjectByName('cyklopruhy')) return;
      const m = this.postavStvorec(hra, i * velkost, j * velkost, velkost, d?.cesty);
      if (m) objekt.add(m);
    };
    for (const [kluc, a] of sprava.aktivne) pridaj({ kluc, uroven: a.uroven, objekt: a.objekt });
    hra.na('dlazdica-nacitana', pridaj);
  },

  /** Sieť pruhov, ktorých úseky začínajú v štvorci dlaždice (x0, z0, velkost). */
  postavStvorec(hra, x0, z0, velkost, cesty = null) {
    const T = hra.THREE;
    const x1 = x0 + velkost, z1 = z0 + velkost;
    // výška terénu (hra.mapa.vyska môže pripočítať vozovku – js/mapa/cesty/povrch-modul.js)
    const zem = hra.mapa.vyskaZeme ?? hra.mapa.vyska;
    const g = { poz: [], uv: [], idx: [] };
    const vyskopis = { vyska: zem };
    const najdiCestu = mriezkaOsi(cesty);
    for (const p of this.pruhy) {
      if (p.ohr.maxX < x0 - 20 || p.ohr.minX > x1 + 20 || p.ohr.maxZ < z0 - 20 || p.ohr.minZ > z1 + 20) continue;
      const strany = [];
      if (p.p) strany.push(1);
      if (p.l) strany.push(-1);
      for (const s of strany) {
        // u = 0 (biela čiara) na strane áut: pri pravom pruhu sa os otočí, aby strana áut bola „ľavým“ okrajom pásu
        let lin = zjemni(liniaPruhu(p, s, najdiCestu), KROK);
        if (s > 0) lin = lin.reverse();
        if (lin.length < 2) continue;
        // úsek patrí štvorcu podľa svojho začiatku (aby sa na hranici nezdvojil); tvar sa počíta z celej osi
        let od = -1;
        for (let k = 0; k < lin.length; k++) {
          const [x, z] = lin[k];
          const vnutri = x >= x0 && x < x1 && z >= z0 && z < z1 && k < lin.length - 1;
          if (vnutri && od < 0) od = k;
          if ((!vnutri || k === lin.length - 2) && od >= 0) {
            const po = vnutri ? k + 1 : k;
            if (po > od) pridajPas(g, lin, SIRKA / 2, NAD_TERENOM + 0.04, vyskopis, { od, po, dlzkaV: OPAKOVANIE });
            od = -1;
          }
        }
      }
    }
    if (!g.idx.length) return null;
    const geo = new T.BufferGeometry();
    geo.setAttribute('position', new T.Float32BufferAttribute(g.poz, 3));
    geo.setAttribute('uv', new T.Float32BufferAttribute(g.uv, 2));
    geo.setIndex(g.idx);
    geo.computeVertexNormals();
    const m = new T.Mesh(geo, this.mat);
    m.name = 'cyklopruhy';
    m.receiveShadow = true;
    return m;
  },
};
