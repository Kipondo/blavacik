// Kontrolór mapy celého mesta (#134): prejde všetky dlaždice data/mapa/mesto a nájde miesta, kde niečo stojí,
// kde nemá (s polohou x, z). Používa kód hry (filter stromov, stavba ciest, výškový model), takže hľadá to, čo
// hráč naozaj uvidí. Spúšťa tools/kontrola/kontrola-mapy.py; počty porovná so základom tools/kontrola/mapa-zaklad.json
// (viac chýb ako v základe = PR neprejde). Tráva sa kontroluje vzorkou v regresných kontrolách (trava-*).
//
// Nová kategória = nový záznam v KATEGORIE: { id, popis, spusti(ctx) → [{ x, z, dlazdica, text }] }.

import { stromyDlazdice } from '../../../js/mapa/zelen/stromy-dlazdice.js';
import { vytvorCesty } from '../../../js/mapa/cesty/cesty.js';
import { bodVPolygone, vzdialenostOdOkraja, ohranicenie } from '../../../js/mapa/geometria.js';

const BUNKA = 25;

/** Jednoduchá mriežka objektov s obálkou (minX…maxZ) po BUNKA m. */
function mriezka(polozky) {
  const m = new Map();
  for (const o of polozky) {
    for (let i = Math.floor(o.minX / BUNKA); i <= Math.floor(o.maxX / BUNKA); i++) {
      for (let j = Math.floor(o.minZ / BUNKA); j <= Math.floor(o.maxZ / BUNKA); j++) {
        const k = i * 100003 + j;
        if (!m.has(k)) m.set(k, []);
        m.get(k).push(o);
      }
    }
  }
  return (x, z) => m.get(Math.floor(x / BUNKA) * 100003 + Math.floor(z / BUNKA)) ?? [];
}

const vzdUsecka = (x, z, ax, az, bx, bz) => {
  const dx = bx - ax, dz = bz - az, l2 = dx * dx + dz * dz || 1e-9;
  const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / l2));
  return Math.hypot(x - ax - t * dx, z - az - t * dz);
};

/** Úseky ciest dlaždice (bez mostov a nadjazdov) s polšírkou. */
function useky(cesty, filter = () => true) {
  const out = [];
  for (const c of cesty ?? []) {
    if (c.most || c.nadjazd || !(c.body?.length > 1) || !filter(c)) continue;
    const pol = (c.sirka ?? 6) / 2;
    for (let i = 1; i < c.body.length; i++) {
      const [ax, az] = c.body[i - 1], [bx, bz] = c.body[i];
      out.push({ ax, az, bx, bz, pol, c, minX: Math.min(ax, bx) - pol, maxX: Math.max(ax, bx) + pol, minZ: Math.min(az, bz) - pol, maxZ: Math.max(az, bz) + pol });
    }
  }
  return out;
}

const polygony = (zoznam) => zoznam.filter((b) => b?.length > 2).map((body) => ({ body, ...ohranicenie(body) }));
const vnutri = (x, z, p, hlbka = 0) => x >= p.minX && x <= p.maxX && z >= p.minZ && z <= p.maxZ && bodVPolygone(x, z, p.body) && (hlbka <= 0 || vzdialenostOdOkraja(x, z, p.body) > hlbka);
const domyDlazdice = (d) => polygony((d.budovy ?? []).filter((b) => !((b.minVyska ?? 0) > 2.5) && !b.priechod && !b.priechody).map((b) => b.body));

/** Pripraví spoločné veci dlaždice (raz na dlaždicu, pre všetky kategórie). */
function pripravDlazdicu(ctx, d) {
  if (d._kontrola) return d._kontrola;
  const vsetkyUseky = useky(d.cesty);
  const vozovky = useky(d.cesty, (c) => !['footway', 'path', 'pedestrian', 'steps', 'cycleway', 'track', 'bridleway', 'corridor'].includes(c.typ));
  const domy = domyDlazdice(d);
  const voda = polygony([...(ctx.index.voda ?? []).map((v) => v.body), ...(d.voda ?? []).map((v) => v.body)]);
  d._kontrola = {
    useky: vsetkyUseky, vozovky, naVozovke: mriezka(vozovky), domy, vDome: mriezka(domy), voda,
  };
  return d._kontrola;
}

function naVozovke(k, x, z, rezerva) {
  return k.naVozovke(x, z).find((u) => vzdUsecka(x, z, u.ax, u.az, u.bx, u.bz) < u.pol - rezerva);
}
const vBudove = (k, x, z, hlbka) => k.vDome(x, z).find((p) => vnutri(x, z, p, hlbka));
const voVode = (k, x, z, hlbka) => k.voda.find((p) => vnutri(x, z, p, hlbka));

function stromy(ctx, d) {
  if (!d._stromy) {
    const mosty = (ctx.index.mosty ?? []).map((m) => ({ ax: m.od[0], az: m.od[1], bx: m.do[0], bz: m.do[1], sirka: m.sirka }));
    d._stromy = stromyDlazdice(d, { mosty, voda: ctx.index.voda ?? [] });
  }
  return d._stromy;
}

/** Mostovky (mosty mapy, nadjazdy, cesty označené ako most) ako pásy. */
function mostovky(ctx, d) {
  const out = [];
  for (const m of ctx.index.mosty ?? []) out.push({ body: [m.od, m.do], pol: (m.sirka ?? 20) / 2 });
  for (const n of d.nadjazdy ?? []) out.push({ body: n.body, pol: (n.sirka ?? 6) / 2 });
  for (const c of d.cesty ?? []) if (c.most && c.body?.length > 1) out.push({ body: c.body, pol: (c.sirka ?? 6) / 2 });
  return out;
}
const naMoste = (pasy, x, z) => pasy.some((p) => p.body.some((a, i) => i > 0 && vzdUsecka(x, z, p.body[i - 1][0], p.body[i - 1][1], a[0], a[1]) < p.pol));

/** Objekty z OSM, ktoré hra stavia presne na polohe z OSM (js/mapa/vybavenie/lampy.js, lavicky.js).
 *  Semafory nie – hra ich posúva na okraj cesty (js/doprava/semafory.js), poloha v OSM je na osi. */
function objekty(d) {
  const p = d.prvky ?? {};
  return [
    ...(p.lampy ?? []).map(([x, z]) => ({ x, z, druh: 'lampa' })),
    ...(p.lavicky ?? []).map(([x, z]) => ({ x, z, druh: 'lavička' })),
  ];
}

/** Podrobný terén dlaždice (t/*.bin) – na švy medzi dlaždicami. */
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

export const KATEGORIE = [
  {
    id: 'strom-na-moste', popis: 'Strom na moste alebo nadjazde',
    spusti(ctx) {
      const out = [];
      for (const [kluc, d] of ctx.dlazdice) {
        const pasy = mostovky(ctx, d);
        for (const [x, z] of stromy(ctx, d)) if (naMoste(pasy, x, z)) out.push({ x, z, dlazdica: kluc, text: 'strom na moste' });
      }
      return out;
    },
  },
  {
    id: 'strom-vo-vode', popis: 'Strom vo vode (viac ako 2 m od brehu)',
    spusti(ctx) {
      const out = [];
      for (const [kluc, d] of ctx.dlazdice) {
        const k = pripravDlazdicu(ctx, d);
        for (const [x, z] of stromy(ctx, d)) if (voVode(k, x, z, 2.05)) out.push({ x, z, dlazdica: kluc, text: 'strom vo vode' });
      }
      return out;
    },
  },
  {
    id: 'strom-na-vozovke', popis: 'Kmeň stromu na vozovke',
    spusti(ctx) {
      const out = [];
      for (const [kluc, d] of ctx.dlazdice) {
        const k = pripravDlazdicu(ctx, d);
        for (const [x, z] of stromy(ctx, d)) if (naVozovke(k, x, z, 0.1)) out.push({ x, z, dlazdica: kluc, text: 'strom na vozovke' });
      }
      return out;
    },
  },
  {
    id: 'strom-v-budove', popis: 'Strom v pôdoryse budovy',
    spusti(ctx) {
      const out = [];
      for (const [kluc, d] of ctx.dlazdice) {
        const k = pripravDlazdicu(ctx, d);
        for (const [x, z] of stromy(ctx, d)) if (vBudove(k, x, z, 0)) out.push({ x, z, dlazdica: kluc, text: 'strom v budove' });
      }
      return out;
    },
  },
  {
    id: 'objekt-na-vozovke', popis: 'Lampa alebo lavička na vozovke (viac ako 0,3 m od okraja)',
    spusti(ctx) {
      const out = [];
      for (const [kluc, d] of ctx.dlazdice) {
        const k = pripravDlazdicu(ctx, d);
        for (const o of objekty(d)) {
          const u = naVozovke(k, o.x, o.z, 0.3);
          if (u) out.push({ x: o.x, z: o.z, dlazdica: kluc, text: `${o.druh} na ceste ${u.c.nazov || u.c.typ}` });
        }
      }
      return out;
    },
  },
  {
    id: 'objekt-vo-vode', popis: 'Lampa alebo lavička vo vode (viac ako 1 m od brehu)',
    spusti(ctx) {
      const out = [];
      for (const [kluc, d] of ctx.dlazdice) {
        const k = pripravDlazdicu(ctx, d);
        for (const o of objekty(d)) if (voVode(k, o.x, o.z, 1)) out.push({ x: o.x, z: o.z, dlazdica: kluc, text: `${o.druh} vo vode` });
      }
      return out;
    },
  },
  {
    id: 'objekt-v-budove', popis: 'Lampa alebo lavička v budove (viac ako 0,5 m od steny)',
    spusti(ctx) {
      const out = [];
      for (const [kluc, d] of ctx.dlazdice) {
        const k = pripravDlazdicu(ctx, d);
        for (const o of objekty(d)) if (vBudove(k, o.x, o.z, 0.5)) out.push({ x: o.x, z: o.z, dlazdica: kluc, text: `${o.druh} v budove` });
      }
      return out;
    },
  },
  {
    id: 'budova-cez-cestu', popis: 'Os cesty ide cez budovu viac ako 4 m (bez priechodu a vyvýšenej časti)',
    spusti(ctx) {
      const out = [];
      for (const [kluc, d] of ctx.dlazdice) {
        const k = pripravDlazdicu(ctx, d);
        for (const u of k.useky) {
          const L = Math.hypot(u.bx - u.ax, u.bz - u.az), n = Math.max(1, Math.round(L));
          const kandidati = new Set();
          for (let s = 0; s <= n; s += 4) for (const p of k.vDome(u.ax + (u.bx - u.ax) * s / n, u.az + (u.bz - u.az) * s / n)) kandidati.add(p);
          for (const p of kandidati) {
            let dnu = 0, sx = 0, sz = 0;
            for (let s = 0; s <= n; s++) {
              const x = u.ax + (u.bx - u.ax) * s / n, z = u.az + (u.bz - u.az) * s / n;
              if (vnutri(x, z, p)) { dnu += L / n; sx = x; sz = z; }
            }
            if (dnu > 4) out.push({ x: +sx.toFixed(1), z: +sz.toFixed(1), dlazdica: kluc, text: `${u.c.nazov || u.c.typ} cez budovu ${dnu.toFixed(0)} m` });
          }
        }
      }
      return out;
    },
  },
  {
    id: 'cesty-cez-seba', popis: 'Dve cesty sa križujú bez križovatky (bez spoločného bodu do 1,5 m, nie most)',
    spusti(ctx) {
      const out = [];
      for (const [kluc, d] of ctx.dlazdice) {
        const k = pripravDlazdicu(ctx, d);
        const najdi = mriezka(k.useky);
        const videne = new Set();
        for (const u of k.useky) {
          for (const v of najdi((u.ax + u.bx) / 2, (u.az + u.bz) / 2)) {
            if (v.c === u.c) continue;
            const rx = u.bx - u.ax, rz = u.bz - u.az, sx = v.bx - v.ax, sz = v.bz - v.az;
            const den = rx * sz - rz * sx;
            if (Math.abs(den) < 1e-9) continue;
            const t = ((v.ax - u.ax) * sz - (v.az - u.az) * sx) / den, w = ((v.ax - u.ax) * rz - (v.az - u.az) * rx) / den;
            if (t <= 0.02 || t >= 0.98 || w <= 0.02 || w >= 0.98) continue;
            const x = u.ax + rx * t, z = u.az + rz * t;
            const spolocny = [...u.c.body, ...v.c.body].some(([px, pz]) => Math.hypot(px - x, pz - z) < 1.5);
            if (spolocny) continue;
            const id = `${Math.round(x)}|${Math.round(z)}`;
            if (videne.has(id)) continue;
            videne.add(id);
            out.push({ x: +x.toFixed(1), z: +z.toFixed(1), dlazdica: kluc, text: `${u.c.nazov || u.c.typ} × ${v.c.nazov || v.c.typ}` });
          }
        }
      }
      return out;
    },
  },
  {
    id: 'cesta-strma', popis: 'Úsek cesty strmší ako 22 % na 10 m (výškový model hry, bez mostov)',
    spusti(ctx) {
      const out = [];
      if (!ctx.vyskopis) return out;
      for (const [kluc, d] of ctx.dlazdice) {
        for (const c of d.cesty ?? []) {
          if (c.most || c.nadjazd || !(c.body?.length > 1)) continue;
          const body = [];
          for (let i = 1; i < c.body.length; i++) {
            const [ax, az] = c.body[i - 1], [bx, bz] = c.body[i];
            const L = Math.hypot(bx - ax, bz - az), n = Math.max(1, Math.round(L / 5));
            for (let s = 0; s < n; s++) body.push([ax + (bx - ax) * s / n, az + (bz - az) * s / n]);
          }
          body.push(c.body.at(-1));
          let posledny = -1e9;
          for (let i = 2; i < body.length; i++) {
            const [ax, az] = body[i - 2], [bx, bz] = body[i];
            const L = Math.hypot(bx - ax, bz - az);
            if (L < 8) continue;
            const sklon = Math.abs(ctx.vyskopis.vyskaTerenu(bx, bz) - ctx.vyskopis.vyskaTerenu(ax, az)) / L;
            if (sklon > 0.22 && i - posledny > 4) {
              posledny = i;
              out.push({ x: +body[i - 1][0].toFixed(1), z: +body[i - 1][1].toFixed(1), dlazdica: kluc, text: `${c.nazov || c.typ}: ${(sklon * 100).toFixed(0)} %` });
            }
          }
        }
      }
      return out;
    },
  },
  {
    id: 'cesta-zlom', popis: 'Ostrý zlom cesty – trojuholník pásu vozovky otočený naruby (prekrížené okraje)',
    spusti(ctx) {
      const out = [];
      for (const [kluc, d] of ctx.dlazdice) {
        const cesty = (d.cesty ?? []).filter((c) => !c.nadjazd && c.body?.length > 1);
        if (!cesty.length) continue;
        const g = vytvorCesty(cesty, { vyska: () => 0, vyskaTerenu: () => 0 });
        const videne = new Set();
        g.traverse((o) => {
          if (!o.isMesh) return;
          const p = o.geometry.getAttribute('position').array, idx = o.geometry.index.array;
          for (let t = 0; t < idx.length; t += 3) {
            const a = idx[t] * 3, b = idx[t + 1] * 3, c = idx[t + 2] * 3;
            const ny = (p[b + 2] - p[a + 2]) * (p[c] - p[a]) - (p[b] - p[a]) * (p[c + 2] - p[a + 2]);
            if (ny >= -0.1) continue;
            const id = `${Math.round(p[a] / 3)}|${Math.round(p[a + 2] / 3)}`;
            if (videne.has(id)) continue;
            videne.add(id);
            out.push({ x: +p[a].toFixed(1), z: +p[a + 2].toFixed(1), dlazdica: kluc, text: 'prekrížené okraje pásu' });
          }
          o.geometry.dispose();
        });
      }
      return out;
    },
  },
  {
    id: 'budova-v-dunaji', popis: 'Budova stredom v rieke (Dunaj, ramená) – hausbóty a lode sa nerátajú',
    spusti(ctx) {
      const rieky = polygony((ctx.index.voda ?? []).filter((v) => v.reka !== false).map((v) => v.body));
      const out = [];
      for (const [kluc, d] of ctx.dlazdice) {
        for (const b of d.budovy ?? []) {
          if (!(b.body?.length > 2) || /houseboat|ship|boat/.test(`${b.tvarOsm ?? ''} ${b.typOsm ?? ''}`)) continue;
          const x = b.body.reduce((s, p) => s + p[0], 0) / b.body.length, z = b.body.reduce((s, p) => s + p[1], 0) / b.body.length;
          if (rieky.some((p) => vnutri(x, z, p, 1))) out.push({ x: +x.toFixed(1), z: +z.toFixed(1), dlazdica: kluc, text: `budova v rieke (${b.tvarOsm ?? b.typOsm ?? 'budova'})` });
        }
      }
      return out;
    },
  },
  {
    id: 'sev-terenu', popis: 'Šev medzi dlaždicami podrobného terénu – výška na spoločnej hrane sa líši o viac ako 0,3 m',
    async spusti(ctx) {
      const out = [];
      const detail = new Set(ctx.index.terenDetail?.dlazdice ?? []);
      const cache = new Map();
      const daj = async (k) => { if (!cache.has(k)) cache.set(k, await teren(k)); return cache.get(k); };
      const D = ctx.index.dlazdica;
      for (const kluc of detail) {
        const [i, j] = kluc.split('_').map(Number);
        const a = await daj(kluc);
        if (!a) continue;
        for (const [di, dj] of [[1, 0], [0, 1]]) {
          const sused = `${i + di}_${j + dj}`;
          if (!detail.has(sused)) continue;
          const b = await daj(sused);
          if (!b || b.n !== a.n) continue;
          let max = 0, kde = 0;
          for (let s = 0; s < a.n; s++) {
            const ha = di ? a.H[s * a.n + a.n - 1] : a.H[(a.n - 1) * a.n + s];
            const hb = di ? b.H[s * b.n] : b.H[s];
            if (Math.abs(ha - hb) > max) { max = Math.abs(ha - hb); kde = s; }
          }
          if (max > 0.3) {
            const t = kde / (a.n - 1) * D;
            out.push({ x: di ? (i + 1) * D : i * D + t, z: di ? j * D + t : (j + 1) * D, dlazdica: kluc, text: `šev ${kluc} | ${sused}: ${max.toFixed(2)} m` });
          }
        }
      }
      return out;
    },
  },
];
