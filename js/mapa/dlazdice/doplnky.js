// Doplnkové dáta dlaždice z laserového skenovania (len pre dlaždice uvedené v index.json):
//   t/<i>_<j>.bin       – detailný terén (mriežka 2 m, uint16 (výška − 100 m)·100, po riadkoch rozdiely, gzip)
//   strechy/<i>_<j>.json – strechy budov ako roviny (LOD2) + štíty
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

export async function nacitajDoplnky(kluc, index) {
  const td = index.terenDetail, sl = index.strechyLod2 ?? [];
  const [teren, strechy] = await Promise.all([
    td?.dlazdice?.includes(kluc) ? nacitajTeren(kluc, td).catch(() => null) : null,
    sl.includes(kluc) ? fetch(`data/mapa/mesto/strechy/${kluc}.json`).then((r) => (r.ok ? r.json() : null)).catch(() => null) : null,
  ]);
  return { teren, strechy };
}
