// Modul: červené cyklopruhy na cestách (data/mapa/cyklopruhy.json z OSM, tools/mesto/cyklopruhy.mjs), issue #52.
// Pruh 1,5 m pri okraji asfaltu s bielou čiarou na strane áut a piktogramom bicykla každých 20 m.
// Stavia sa spolu s detailnou dlaždicou mesta (udalosť 'dlazdica-nacitana'), keď je už načítaný detailný terén;
// sieť je súčasťou objektu dlaždice, takže sa uvoľní spolu s ňou.

import { NAD_TERENOM } from './cesty.js';

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

/** Body pruhu posunuté od osi cesty (vpravo +, vľavo −) a rozdelené po KROK m. */
function posunutaLinia(body, posun) {
  const out = [];
  for (let i = 0; i < body.length - 1; i++) {
    const [ax, az] = body[i], [bx, bz] = body[i + 1];
    const d = Math.hypot(bx - ax, bz - az);
    if (d < 0.01) continue;
    const nx = -(bz - az) / d, nz = (bx - ax) / d;     // vpravo v smere kreslenia (ako js/mapa/cesty/cesty.js)
    const n = Math.max(1, Math.ceil(d / KROK));
    for (let k = 0; k < n; k++) {
      const t = k / n;
      out.push([ax + (bx - ax) * t + nx * posun, az + (bz - az) * t + nz * posun, nx, nz]);
    }
  }
  const [lx, lz] = body[body.length - 1], [px, pz] = body[body.length - 2] ?? body[0];
  const d = Math.hypot(lx - px, lz - pz) || 1;
  out.push([lx - (lz - pz) / d * posun, lz + (lx - px) / d * posun, -(lz - pz) / d, (lx - px) / d]);
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
    const pridaj = ({ kluc, uroven, objekt }) => {
      if (uroven !== 'detail' || objekt.getObjectByName('cyklopruhy')) return;
      const [i, j] = kluc.split('_').map(Number);
      const m = this.postavStvorec(hra, i * velkost, j * velkost, velkost);
      if (m) objekt.add(m);
    };
    for (const [kluc, a] of sprava.aktivne) pridaj({ kluc, uroven: a.uroven, objekt: a.objekt });
    hra.na('dlazdica-nacitana', pridaj);
  },

  /** Sieť pruhov, ktorých úseky začínajú v štvorci dlaždice (x0, z0, velkost). */
  postavStvorec(hra, x0, z0, velkost) {
    const T = hra.THREE;
    const x1 = x0 + velkost, z1 = z0 + velkost;
    // výška terénu (hra.mapa.vyska môže pripočítať vozovku – js/mapa/cesty/povrch-modul.js)
    const zem = hra.mapa.vyskaZeme ?? hra.mapa.vyska;
    const poz = [], uv = [], idx = [];
    for (const p of this.pruhy) {
      if (p.ohr.maxX < x0 - 20 || p.ohr.minX > x1 + 20 || p.ohr.maxZ < z0 - 20 || p.ohr.minZ > z1 + 20) continue;
      const strany = [];
      if (p.p) strany.push(1);
      if (p.l) strany.push(-1);
      for (const s of strany) {
        const os = Math.max(0.5, p.s / 2 - SIRKA / 2 - 0.15);
        const lin = posunutaLinia(p.body, s * os);
        let v = 0, predch = null;
        for (let k = 0; k < lin.length; k++) {
          const [x, z, nx, nz] = lin[k];
          if (predch) v += Math.hypot(x - predch[0], z - predch[1]) / OPAKOVANIE;
          const vnutri = x >= x0 && x < x1 && z >= z0 && z < z1;
          const dalsi = lin[k + 1];
          // úsek patrí štvorcu podľa svojho začiatku (aby sa na hranici nezdvojil)
          if (vnutri && dalsi) {
            const a = poz.length / 3;
            for (const [px, pz, q] of [[x, z, 0], [dalsi[0], dalsi[1], 1]]) {
              const vv = q ? v + Math.hypot(dalsi[0] - x, dalsi[1] - z) / OPAKOVANIE : v;
              // u = 0 na strane áut (bližšie k osi cesty)
              const ix = px - nx * s * SIRKA / 2, iz = pz - nz * s * SIRKA / 2;
              const ox = px + nx * s * SIRKA / 2, oz = pz + nz * s * SIRKA / 2;
              poz.push(ix, zem(ix, iz) + NAD_TERENOM + 0.04, iz, ox, zem(ox, oz) + NAD_TERENOM + 0.04, oz);
              uv.push(0, vv, 1, vv);
            }
            // normála nahor bez ohľadu na stranu
            if (s > 0) idx.push(a + 1, a + 3, a, a, a + 3, a + 2);
            else idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
          }
          predch = [x, z];
        }
      }
    }
    if (!idx.length) return null;
    const geo = new T.BufferGeometry();
    geo.setAttribute('position', new T.Float32BufferAttribute(poz, 3));
    geo.setAttribute('uv', new T.Float32BufferAttribute(uv, 2));
    geo.setIndex(idx);
    geo.computeVertexNormals();
    const m = new T.Mesh(geo, this.mat);
    m.name = 'cyklopruhy';
    m.receiveShadow = true;
    return m;
  },
};
