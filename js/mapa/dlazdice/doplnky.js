// Doplnkové dáta dlaždice z laserového skenovania (len pre dlaždice uvedené v index.json):
//   t/<i>_<j>.bin       – detailný terén (mriežka 2 m, uint16 (výška − 100 m)·100, po riadkoch rozdiely, gzip)
//   strechy/<i>_<j>.bin – strechy budov ako roviny (LOD2) + štíty + komíny (binárne, gzip – formát v
//                          tools/mesto/laser/budovy.py → zapis_strechy)
// Vracia { teren: { v: Float32Array, n, krok } | null, strechy: object | null }.

const NULA = 139;

async function rozbal(buf) {
  const b = new Uint8Array(buf);
  // GitHub Pages súbor niekedy pošle už rozbalený – gzip spoznáme podľa hlavičky
  if (b[0] !== 0x1f || b[1] !== 0x8b) return buf;
  const prud = new Blob([buf]).stream().pipeThrough(new DecompressionStream('gzip'));
  return await new Response(prud).arrayBuffer();
}

async function nacitajTeren(kluc, info) {
  const r = await fetch(`data/mapa/mesto/t/${kluc}.bin`);
  if (!r.ok) return null;
  const surove = new Uint16Array(await rozbal(await r.arrayBuffer()));
  const n = info.uzly, v = new Float32Array(n * n);
  for (let j = 0; j < n; j++) {
    let a = 0;
    for (let i = 0; i < n; i++) {
      a = (a + surove[j * n + i]) & 0xffff;   // súčet rozdielov po riadku
      v[j * n + i] = a / 100 + 100 - NULA;
    }
  }
  return { v, n, krok: info.krok };
}

const DRUHY = ['sikme', 'ploche', 'steny'];
const doLin = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const LIN = Float32Array.from({ length: 256 }, (_, i) => doLin(i / 255));

/** Rozbalí binárne strechy na { sikme|ploche|steny: { p, uv, c, i }, kominy }. */
function citajStrechy(buf) {
  const dv = new DataView(buf);
  if (String.fromCharCode(...new Uint8Array(buf, 0, 4)) !== 'STR2') return null;
  const x0 = dv.getFloat32(4, true), z0 = dv.getFloat32(8, true), n = dv.getUint32(12, true);
  let o = 16;
  const out = {};
  for (let s = 0; s < n; s++) {
    const kod = dv.getUint8(o), nV = dv.getUint32(o + 4, true), nI = dv.getUint32(o + 8, true);
    o += 12;
    const q = new Uint16Array(buf, o, nV * 3); o += nV * 6;
    const u = new Int16Array(buf, o, nV * 2); o += nV * 4;
    const c = new Uint8Array(buf, o, nV * 3); o += nV * 3; o += (4 - (o % 4)) % 4;
    const velke = nV > 65535;
    const idx = velke ? new Uint32Array(buf, o, nI) : new Uint16Array(buf, o, nI);
    o += nI * (velke ? 4 : 2); o += (4 - (o % 4)) % 4;
    const p = new Float32Array(nV * 3), uv = new Float32Array(nV * 2), farba = new Float32Array(nV * 3);
    for (let k = 0; k < nV; k++) {
      p[k * 3] = q[k * 3] / 50 - 20 + x0; p[k * 3 + 1] = q[k * 3 + 1] / 50 - 60; p[k * 3 + 2] = q[k * 3 + 2] / 50 - 20 + z0;
      uv[k * 2] = u[k * 2] / 100; uv[k * 2 + 1] = u[k * 2 + 1] / 100;
      farba[k * 3] = LIN[c[k * 3]]; farba[k * 3 + 1] = LIN[c[k * 3 + 1]]; farba[k * 3 + 2] = LIN[c[k * 3 + 2]];
    }
    out[DRUHY[kod]] = { p, uv, c: farba, i: idx };
  }
  const nk = dv.getUint32(o, true); o += 4;
  const k = new Float32Array(buf, o, nk * 7);
  out.kominy = Array.from({ length: nk }, (_, i) => Array.from(k.subarray(i * 7, i * 7 + 7)));
  return out;
}

async function nacitajStrechy(kluc) {
  const r = await fetch(`data/mapa/mesto/strechy/${kluc}.bin`);
  if (!r.ok) return null;
  return citajStrechy(await rozbal(await r.arrayBuffer()));
}

export async function nacitajDoplnky(kluc, index) {
  const td = index.terenDetail, sl = index.strechyLod2 ?? [];
  const [teren, strechy] = await Promise.all([
    td?.dlazdice?.includes(kluc) ? nacitajTeren(kluc, td).catch(() => null) : null,
    sl.includes(kluc) ? nacitajStrechy(kluc).catch(() => null) : null,
  ]);
  return { teren, strechy };
}
