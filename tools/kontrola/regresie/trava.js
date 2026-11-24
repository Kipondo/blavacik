// Kontroly trávy zblízka: modul hry js/mapa/zelen/trava-modul.js sa spustí nad mapou tried povrchu,
// ktorú kreslí js/mapa/teren/textura-zeme.js (rovnaký kód ako v hre), a overí sa, kde trsy trávy stoja.

import travaModul from '../../../js/mapa/zelen/trava-modul.js';
import { vytvorTexturuDlazdice, vytvorTriedyDlazdice, vJadre } from '../../../js/mapa/teren/textura-zeme.js';
import { bodVPolygone, vzdialenostOdCiary, vzdialenostOdOkraja, ohranicenie } from '../../../js/mapa/geometria.js';

const DOSAH = 30;          // m – ako na kvalite „vysoká“
const VOLNOST = 0.6;       // m – trs musí byť aspoň takto hlboko na ceste, aby sa rátal (raster tried 0,5 m)
const VOLNOST_DOM = 1.0;   // m – v dome: modul trávy si pamätá budovy po štvorcoch 1 m (stred štvorca), pri stene až ~0,7 m
const BODOV_NA_DLAZDICU = 6;

let pripravene = null;
/** Modul trávy s falošnou hrou (bez okna a WebGL) – init len raz. */
function modul(kolizie) {
  if (!pripravene) {
    const hra = {
      na() {}, posli() {}, scena: { add() {} }, stav: {},
      mapa: { dlazdice: { aktivne: [] }, kolizie: null, vyskaTerenu: () => 0, vyska: () => 0, hladina: null },
      kamera: { position: { x: 0, y: 0, z: 0 } },
    };
    travaModul.init(hra);
    pripravene = { hra };
  }
  pripravene.hra.mapa.kolizie = kolizie;
  return pripravene;
}

/** Kolízie budov dlaždice v tvare js/mapa/kolizie.js (tráva sa im vyhýba cez vOkoli). */
function koliziePreDlazdicu(d) {
  const polygony = (d.budovy ?? []).filter((b) => b.body?.length > 2 && !((b.minVyska ?? 0) > 2.5))
    .map((b) => ({ typ: 'polygon', body: b.body, ...ohranicenie(b.body), info: { typ: 'budova' } }));
  return {
    vOkoli: (x, z, r) => polygony.filter((p) => x + r >= p.minX && x - r <= p.maxX && z + r >= p.minZ && z - r <= p.maxZ),
  };
}

/** Trsy trávy okolo bodu (x, z) – pozície z inštancií modulu. */
function trsyOkolo(m, x, z) {
  m.prepocitaj(pripravene.hra, x, z, DOSAH);
  const out = [];
  // zblízka podrobné trsy a vo vonkajšom prstenci jednoduché (#110)
  for (const im of [m.trsy, m.trsyDaleko].filter(Boolean)) {
    const a = im.instanceMatrix.array;
    for (let i = 0; i < im.count; i++) out.push([a[i * 16 + 12], a[i * 16 + 14]]);
  }
  return out;
}

/** Dlaždice na kontrolu trávy: laserový výrez (kde sa hrá) + každá 15. ďalšia dlaždica. */
function dlazdiceNaTravu(ctx) {
  const detail = new Set(ctx.index.terenDetail?.dlazdice ?? []);
  const vyber = [];
  let i = 0;
  for (const kluc of ctx.dlazdice.keys()) if (detail.has(kluc) || i++ % 15 === 0) vyber.push(kluc);
  return ctx.rychlo ? vyber.slice(0, 12) : vyber;
}

const rieky = (ctx) => (ctx.index.voda ?? []).filter((v) => v.reka !== false).map((v) => ({ ...v, ohr: ohranicenie(v.body) }));

/** Pripraví modul trávy na dlaždicu (mapa tried a pokrývky ako v hre). */
function pripravDlazdicu(ctx, kluc) {
  const d = ctx.dlazdice.get(kluc);
  const [i, j] = kluc.split('_').map(Number);
  const rect = { minX: i * ctx.index.dlazdica, maxX: (i + 1) * ctx.index.dlazdica, minZ: j * ctx.index.dlazdica, maxZ: (j + 1) * ctx.index.dlazdica };
  const triedy = vytvorTriedyDlazdice(d, rect, 1024, null);
  const mapa = vytvorTexturuDlazdice(d, rieky(ctx), rect, 1024);
  const { hra } = modul(koliziePreDlazdicu(d));
  const m = travaModul;
  m.dlazdice = new Map([[kluc, { rect, zem: { material: { userData: { triedy }, map: mapa } }, maska: null }]]);
  m.bezTravy = new Map();
  m._budovy = new Map();
  m.posledna = null;
  triedy.dispose?.(); mapa.dispose?.();
  return { d, rect, hra, m };
}

export const kontrolyTravy = [
  {
    id: 'trava-na-cestach',
    popis: 'Trsy trávy zblízka nerastú na vozovke (ani keď park z OSM siaha po os cesty)',
    oprava: '78a3854 Tráva neprerastá cez cesty: pod vozovkou a chodníkom nie je trieda trávy',
    tolerancia: 0,
    spusti(ctx) {
      const chyby = [];
      let n = 0;
      for (const kluc of dlazdiceNaTravu(ctx)) {
        const { d, m } = pripravDlazdicu(ctx, kluc);
        const cesty = (d.cesty ?? []).filter((c) => !c.nadjazd && !c.most && c.body?.length > 1 && !c.body.every(([x, z]) => vJadre(x, z)));
        if (!cesty.length) continue;
        // body kontroly: stredy ciest, ktoré idú popri zeleni (prvé z každých niekoľkých ciest)
        const krok = Math.max(1, Math.floor(cesty.length / BODOV_NA_DLAZDICU));
        for (let c = 0; c < cesty.length; c += krok) {
          const b = cesty[c].body, s = b[Math.floor(b.length / 2)];
          const blizke = cesty.filter((q) => vzdialenostOdCiary(s[0], s[1], q.body) < DOSAH + 20);
          for (const [x, z] of trsyOkolo(m, s[0], s[1])) {
            n++;
            const q = blizke.find((q) => vzdialenostOdCiary(x, z, q.body) < (q.sirka ?? 6) / 2 - VOLNOST);
            if (q) chyby.push({ x: +x.toFixed(1), z: +z.toFixed(1), dlazdica: kluc, text: `tráva na ceste ${q.nazov || q.typ}` });
          }
        }
      }
      return { skontrolovane: n, chyby };
    },
  },
  {
    id: 'trava-v-budovach',
    popis: 'Trsy trávy nerastú v pôdorysoch budov (nepresvitajú cez podlahu, napr. v stanici a v Átriakoch)',
    oprava: 'cd7adad tráva nerastie v pôdorysoch budov',
    tolerancia: 0,
    spusti(ctx) {
      const chyby = [];
      let n = 0;
      for (const kluc of dlazdiceNaTravu(ctx)) {
        const { d, m } = pripravDlazdicu(ctx, kluc);
        const domy = (d.budovy ?? []).filter((b) => b.body?.length > 2 && !((b.minVyska ?? 0) > 2.5));
        if (!domy.length) continue;
        const krok = Math.max(1, Math.floor(domy.length / BODOV_NA_DLAZDICU));
        for (let k = 0; k < domy.length; k += krok) {
          const o = ohranicenie(domy[k].body);
          const cx = (o.minX + o.maxX) / 2, cz = (o.minZ + o.maxZ) / 2;
          const blizke = domy.map((b) => ({ b, ...ohranicenie(b.body) })).filter((b) => b.maxX > cx - DOSAH && b.minX < cx + DOSAH && b.maxZ > cz - DOSAH && b.minZ < cz + DOSAH);
          for (const [x, z] of trsyOkolo(m, cx, cz)) {
            n++;
            const dom = blizke.find((b) => x >= b.minX && x <= b.maxX && z >= b.minZ && z <= b.maxZ && bodVPolygone(x, z, b.b.body) && vzdialenostOdOkraja(x, z, b.b.body) > VOLNOST_DOM);
            if (dom) chyby.push({ x: +x.toFixed(1), z: +z.toFixed(1), dlazdica: kluc, text: 'tráva v budove' });
          }
        }
      }
      return { skontrolovane: n, chyby };
    },
  },
];
