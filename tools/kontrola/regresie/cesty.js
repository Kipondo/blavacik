// Kontroly ciest: pás vozovky sa v zákrutách neprekrúti (js/mapa/cesty/cesty.js), terén pod cestami
// v laserovom výreze je pozdĺžne vyhladený (tools/mesto/laser/cesty_teren.py → data/mapa/mesto/t/*.bin)
// susedné dlaždice podrobného terénu majú na spoločnej hrane rovnakú výšku (tools/mesto/laser/svy_terenu.py)
// a zvýšený chodník neleží na vozovke (js/mapa/cesty/chodniky.js, vozovky.js).

import { vytvorCesty } from '../../../js/mapa/cesty/cesty.js';
import { vytvorChodniky } from '../../../js/mapa/cesty/chodniky.js';
import { najdiKrizovatky } from '../../../js/mapa/cesty/krizovatky.js';
import { mriezkaVozoviek } from '../../../js/mapa/cesty/vozovky.js';

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
    popis: 'Pás vozovky sa v ostrých zákrutách neprekrúti – najviac 15 otočených trojuholníkov na milión '
      + '(23. 11. 2026: 8 na milión – zostali vlásenky; 22. 11.: 26 na milión, pôvodný kód ~300 na milión)',
    oprava: 'c6c47a7 Cesty: … pokos v zákrutách (vnútorný okraj ostrej zákruty sa nevracia späť) + test prevrátených trojuholníkov a zdvojených bodov (#136, časť 3)',
    tolerancia: 0,
    naMilion: 15,
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
  {
    id: 'chodniky-mimo-vozovky',
    popis: 'Zvýšený chodník neleží na vozovke cesty (rozdelené cesty mali chodník v protismernom páse) – najviac 200 miest',
    oprava: 'feature/chodniky-plochy – chodniky.js: jednosmerka vpravo (bolo vľavo) a prerušenie na cudzej vozovke (#136); 23 150 → 113',
    tolerancia: 200,
    spusti(ctx) {
      const chyby = [];
      let n = 0;
      for (const [kluc, d] of ctx.dlazdice) {
        const cesty = (d.cesty ?? []).filter((c) => !c.nadjazd && c.body?.length > 1);
        if (!cesty.length) continue;
        const { krizovatky } = najdiKrizovatky(cesty);
        const g = vytvorChodniky(cesty, krizovatky, ROVINA);
        const vozovky = mriezkaVozoviek(cesty);
        const videne = new Set();
        const p = g.children[0].geometry.getAttribute('position').array;
        for (let t = 0; t < p.length; t += 9) {
          n++;
          const x = (p[t] + p[t + 3] + p[t + 6]) / 3, z = (p[t + 2] + p[t + 5] + p[t + 8]) / 3;
          if (!vozovky.naVozovke(x, z, null, 0.5)) continue;
          const id = `${Math.round(x / 3)}|${Math.round(z / 3)}`;
          if (videne.has(id)) continue;
          videne.add(id);
          chyby.push({ x: +x.toFixed(1), z: +z.toFixed(1), dlazdica: kluc, text: 'chodník na vozovke' });
        }
        g.traverse((o) => o.geometry?.dispose());
      }
      return { skontrolovane: n, chyby };
    },
  },
  {
    id: 'rychle-cesty-bez-skokov',
    popis: 'Rýchle cesty mimo podrobného terénu (diaľnice, cesty I.–III. triedy) bez úsekov strmších ako 22 % na 10 m '
      + 'v hrubom teréne – najviac 30 (23. 11. 2026: 57 len na diaľniciach → 13)',
    oprava: 'fix/teren-mosty-dialnice – tools/mesto/laser/cesty_teren_hruby.py (prepady pri koncoch mostov, #54); spúšťať po teren.py',
    tolerancia: 30,
    async spusti(ctx) {
      const meta = await (await fetch('data/mapa/mesto/teren.json')).json();
      const v = new Int16Array(await (await fetch('data/mapa/mesto/teren.bin')).arrayBuffer());
      const { sirka: W, hlbka: D, krok: K, minX, minZ } = meta;
      const h = (x, z) => {
        const fx = Math.min(W - 1.0001, Math.max(0, (x - minX) / K)), fz = Math.min(D - 1.0001, Math.max(0, (z - minZ) / K));
        const i = Math.floor(fx), j = Math.floor(fz), tx = fx - i, tz = fz - j;
        return ((v[j * W + i] * (1 - tx) + v[j * W + i + 1] * tx) * (1 - tz) + (v[(j + 1) * W + i] * (1 - tx) + v[(j + 1) * W + i + 1] * tx) * tz) / 10;
      };
      const RYCHLE = new Set(['motorway', 'motorway_link', 'trunk', 'trunk_link', 'primary', 'primary_link', 'secondary', 'secondary_link']);
      const detail = new Set(ctx.index.terenDetail?.dlazdice ?? []);
      const chyby = [];
      let n = 0;
      for (const [kluc, d] of ctx.dlazdice) {
        if (detail.has(kluc)) continue;
        for (const c of d.cesty ?? []) {
          if (!RYCHLE.has(c.typ) || c.most || c.nadjazd || !(c.body?.length > 1)) continue;
          const body = [];
          for (let i = 1; i < c.body.length; i++) {
            const [ax, az] = c.body[i - 1], [bx, bz] = c.body[i];
            const k = Math.max(1, Math.round(Math.hypot(bx - ax, bz - az) / 5));
            for (let q = 0; q < k; q++) body.push([ax + (bx - ax) * q / k, az + (bz - az) * q / k]);
          }
          body.push(c.body.at(-1));
          let posledny = -1e9;
          for (let i = 2; i < body.length; i++) {
            const [ax, az] = body[i - 2], [bx, bz] = body[i];
            const L = Math.hypot(bx - ax, bz - az);
            if (L < 8) continue;
            n++;
            if (Math.abs(h(bx, bz) - h(ax, az)) / L > 0.22 && i - posledny > 4) {
              posledny = i;
              chyby.push({ x: +body[i - 1][0].toFixed(1), z: +body[i - 1][1].toFixed(1), dlazdica: kluc, text: `${c.typ}: skok v hrubom teréne` });
            }
          }
        }
      }
      return { skontrolovane: n, chyby };
    },
  },
  {
    id: 'teren-bez-svov',
    popis: 'Susedné dlaždice podrobného terénu sa na spoločnej hrane nelíšia o viac ako 0,3 m (schod v teréne a na ceste)',
    oprava: 'fix/teren-nabrezie – tools/mesto/laser/svy_terenu.py zošil 19 švov až do 6,9 m (#54); spúšťať po cesty_teren.py',
    tolerancia: 0,
    async spusti(ctx) {
      const chyby = [];
      const detail = new Set(ctx.index.terenDetail?.dlazdice ?? []);
      const cache = new Map();
      const daj = async (k) => { if (!cache.has(k)) cache.set(k, await teren(k)); return cache.get(k); };
      let n = 0;
      for (const kluc of detail) {
        const [i, j] = kluc.split('_').map(Number);
        const a = await daj(kluc);
        if (!a) continue;
        for (const [di, dj] of [[1, 0], [0, 1]]) {
          const sused = `${i + di}_${j + dj}`;
          if (!detail.has(sused)) continue;
          const b = await daj(sused);
          if (!b || b.n !== a.n) continue;
          n++;
          let max = 0;
          for (let s = 0; s < a.n; s++) {
            const ha = di ? a.H[s * a.n + a.n - 1] : a.H[(a.n - 1) * a.n + s];
            const hb = di ? b.H[s * b.n] : b.H[s];
            max = Math.max(max, Math.abs(ha - hb));
          }
          if (max > 0.3) chyby.push({ dlazdica: kluc, text: `šev ${kluc} | ${sused}: ${max.toFixed(2)} m` });
        }
      }
      return { skontrolovane: n, chyby };
    },
  },
];
