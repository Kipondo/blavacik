// Kontroly ciest: pás vozovky sa v zákrutách neprekrúti (js/mapa/cesty/cesty.js) a terén pod cestami
// v laserovom výreze je pozdĺžne vyhladený (tools/mesto/laser/cesty_teren.py → data/mapa/mesto/t/*.bin).

import { vytvorCesty } from '../../../js/mapa/cesty/cesty.js';

const ROVINA = { vyska: () => 0, vyskaTerenu: () => 0 };

/** Podrobný terén dlaždice z data/mapa/mesto/t/<kluc>.bin (gzip, rozdiely po riadkoch, cm nad 100 m). */
async function teren(kluc) {
  const r = await fetch(`data/mapa/mesto/t/${kluc}.bin`);
  if (!r.ok) return null;
  let buf = await r.arrayBuffer();
  const b = new Uint8Array(buf, 0, 2);
  if (b[0] === 0x1f && b[1] === 0x8b) buf = await new Response(new Blob([buf]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer();
  const dl = new Uint16Array(buf);
  const n = Math.round(Math.sqrt(dl.length));
  const H = new Float32Array(n * n);
  for (let j = 0; j < n; j++) {
    let s = 0;
    for (let i = 0; i < n; i++) { s = (s + dl[j * n + i]) & 0xffff; H[j * n + i] = s / 100 + 100; }
  }
  return { n, H };
}

const median = (a) => { const s = [...a].sort((x, y) => x - y); return s[s.length >> 1]; };

export const kontrolyCiest = [
  {
    id: 'cesty-bez-prekrutenia',
    popis: 'Pás vozovky sa v ostrých zákrutách neprekrúti – najviac 60 otočených trojuholníkov na milión '
      + '(22. 11. 2026: 26 na milión, zvyšok sú hrany dlaždíc; pôvodný kód pred opravou ~300 na milión)',
    oprava: 'c6c47a7 Cesty: … pokos v zákrutách (vnútorný okraj ostrej zákruty sa nevracia späť)',
    tolerancia: 0,
    naMilion: 60,
    spusti(ctx) {
      const chyby = [];
      let n = 0;
      for (const [kluc, d] of ctx.dlazdice) {
        const cesty = (d.cesty ?? []).filter((c) => !c.nadjazd && c.body?.length > 1);
        if (!cesty.length) continue;
        const g = vytvorCesty(cesty, ROVINA);
        g.traverse((o) => {
          if (!o.isMesh) return;
          // len asfalt (značenie je ten istý pás, len prerušený pri križovatkách – #136)
          if (o.name !== 'asfalt') { o.geometry.dispose(); return; }
          const p = o.geometry.getAttribute('position').array, idx = o.geometry.index.array;
          for (let t = 0; t < idx.length; t += 3) {
            const a = idx[t] * 3, b = idx[t + 1] * 3, c = idx[t + 2] * 3;
            const ux = p[b] - p[a], uz = p[b + 2] - p[a + 2], vx = p[c] - p[a], vz = p[c + 2] - p[a + 2];
            const ny = uz * vx - ux * vz;          // y zložka (b − a) × (c − a): + = normála hore
            n++;
            if (ny < -0.1) chyby.push({ x: +p[a].toFixed(1), z: +p[a + 2].toFixed(1), dlazdica: kluc, text: `prekrútený pás cesty (${(-ny / 2).toFixed(1)} m²)` });
          }
          o.geometry.dispose();
          o.material.map?.dispose?.();
        });
      }
      return { skontrolovane: n, chyby };
    },
  },
  {
    id: 'teren-pod-cestami',
    popis: 'Podrobný terén pod osami ciest je pozdĺžne vyhladený (cesta „neschodí“ na obrubníkoch a múrikoch z lasera)',
    oprava: 'c932c37 Terén pod cestami vyhladený (#54) – po pregenerovaní lasera spustiť tools/mesto/laser/cesty_teren.py',
    tolerancia: 0,
    async spusti(ctx) {
      const chyby = [];
      let n = 0;
      for (const kluc of ctx.index.terenDetail?.dlazdice ?? []) {
        const d = ctx.dlazdice.get(kluc), t = await teren(kluc);
        if (!d || !t) continue;
        const [i, j] = kluc.split('_').map(Number);
        const krok = ctx.index.dlazdica / (t.n - 1);
        const odch = [];
        for (const c of d.cesty ?? []) {
          if (c.most || c.nadjazd || !(c.body?.length > 1)) continue;
          const prof = [];
          for (let k = 1; k < c.body.length; k++) {
            const [ax, az] = c.body[k - 1], [bx, bz] = c.body[k];
            const L = Math.max(1, Math.floor(Math.hypot(bx - ax, bz - az) / 2));
            for (let s = 0; s < L; s++) {
              const u = (ax + (bx - ax) * s / L - i * ctx.index.dlazdica) / krok, v = (az + (bz - az) * s / L - j * ctx.index.dlazdica) / krok;
              if (u >= 0 && u < t.n - 1 && v >= 0 && v < t.n - 1) prof.push(t.H[Math.round(v) * t.n + Math.round(u)]);
            }
          }
          if (prof.length < 12) continue;
          let suma = 0;
          for (let k = 0; k < prof.length; k++) suma += Math.abs(prof[k] - median(prof.slice(Math.max(0, k - 3), k + 4)));
          odch.push(suma / prof.length);
        }
        if (!odch.length) continue;
        n++;
        const priemer = odch.reduce((a, b) => a + b, 0) / odch.length;
        if (priemer > 0.05) chyby.push({ dlazdica: kluc, text: `terén pod cestami nie je vyhladený (odchýlka ${priemer.toFixed(3)} m)` });
      }
      return { skontrolovane: n, chyby };
    },
  },
];
