// Regresné kontroly: za každú opravenú chybu jedna kontrola (pravidlo v CLAUDE.md, sekcia „Zlučovanie“).
// Kontroly bežia v prehliadači (tools/kontrola/regresie.html, spúšťa tools/kontrola/regresie.py) a volajú
// priamo kód hry (filter stromov, triedy povrchu, modul trávy) nad skutočnými dátami – keď sa pri zlučovaní
// vráti stará verzia kódu alebo vygenerovaných dlaždíc, kontrola zlyhá.
//
// Nová kontrola = nový záznam v KONTROLY: { id, popis, oprava (commit / PR, ktorý chybu opravil), spusti(ctx) }.
// spusti vráti { skontrolovane, chyby: [{ x, z, dlazdica, text }] }; kontrola prejde, keď je chýb najviac `tolerancia`.

import { stromyDlazdice } from '../../../js/mapa/zelen/stromy-dlazdice.js';
import { bodVPolygone, vzdialenostOdCiary, vzdialenostOdOkraja, ohranicenie } from '../../../js/mapa/geometria.js';
import { kontrolyTravy } from './trava.js';
import { kontrolyCiest } from './cesty.js';
import { kontrolyDlazdic } from './dlazdice.js';
import { kontrolyMostov } from './mosty.js';
import { kontrolyGrafiky } from './grafika.js';
import { kontrolyPamiatok } from './pamiatky.js';
import { vytvorHorizont } from '../../../js/mapa/teren/horizont.js';

/** Stromy dlaždice presne tak, ako ich stavia hra (js/mapa/dlazdice/postav-dlazdicu.js → stromy-dlazdice.js). */
const cacheStromov = new WeakMap();
function stromyHry(ctx, d) {
  if (!cacheStromov.has(d)) {
    // mosty v tvare vyskopis.mosty (js/mapa/teren/vyska-mesto.js), voda = všetky vodné plochy mesta
    const mosty = (ctx.index.mosty ?? []).map((m) => ({ ax: m.od[0], az: m.od[1], bx: m.do[0], bz: m.do[1], sirka: m.sirka }));
    cacheStromov.set(d, stromyDlazdice(d, { mosty, voda: ctx.index.voda ?? [] }));
  }
  return cacheStromov.get(d);
}

/** Pás okolo lomenej čiary: { body, pol, ...ohranicenie } – na rýchle „je bod na moste“. */
function pas(body, pol) {
  const o = ohranicenie(body);
  return { body, pol, minX: o.minX - pol, maxX: o.maxX + pol, minZ: o.minZ - pol, maxZ: o.maxZ + pol };
}
const naPase = (x, z, p) => x >= p.minX && x <= p.maxX && z >= p.minZ && z <= p.maxZ && vzdialenostOdCiary(x, z, p.body) < p.pol;

export const KONTROLY = [
  {
    id: 'stromy-na-mostoch',
    popis: 'Žiadny strom na mostovke mosta ani nadjazdu (koruna by prerástla cez most – napr. Most SNP)',
    oprava: 'fix/poriadok-zlucovania – js/mapa/zelen/miesto-stromu.js (laser bral mostovku Mosta SNP a nájazdov za koruny)',
    spusti(ctx) {
      const mosty = (ctx.index.mosty ?? []).map((m) => pas([m.od, m.do], (m.sirka ?? 20) / 2));
      const chyby = [];
      let n = 0;
      for (const [kluc, d] of ctx.dlazdice) {
        const lokalne = [
          ...(d.nadjazdy ?? []).map((m) => pas(m.body, (m.sirka ?? 6) / 2)),
          ...(d.cesty ?? []).filter((c) => c.most || c.nadjazd).map((c) => pas(c.body, (c.sirka ?? 7) / 2)),
        ];
        for (const s of stromyHry(ctx, d)) {
          n++;
          const [x, z] = s;
          const most = mosty.find((p) => naPase(x, z, p)) ?? lokalne.find((p) => naPase(x, z, p));
          if (most) chyby.push({ x, z, dlazdica: kluc, text: 'strom na moste' });
        }
      }
      return { skontrolovane: n, chyby };
    },
  },
  {
    id: 'stromy-vo-vode',
    popis: 'Žiadny strom vo vode (Dunaj, jazerá, fontány) – viac ako 2 m od brehu (koruna nad vodou pri brehu je v poriadku)',
    oprava: 'fix/poriadok-zlucovania – js/mapa/zelen/miesto-stromu.js (stromy z lasera stáli v Dunaji pri nábreží a na ostrovoch)',
    spusti(ctx) {
      const voda = (ctx.index.voda ?? []).map((v) => ({ body: v.body, ...ohranicenie(v.body) }));
      const chyby = [];
      let n = 0;
      for (const [kluc, d] of ctx.dlazdice) {
        const lokalna = (d.voda ?? []).map((v) => ({ body: v.body, ...ohranicenie(v.body) }));
        for (const s of stromyHry(ctx, d)) {
          n++;
          const [x, z] = s;
          const vo = [...voda, ...lokalna].find((v) => x >= v.minX && x <= v.maxX && z >= v.minZ && z <= v.maxZ
            && bodVPolygone(x, z, v.body) && vzdialenostOdOkraja(x, z, v.body) > 2.05);
          if (vo) chyby.push({ x, z, dlazdica: kluc, text: 'strom vo vode' });
        }
      }
      return { skontrolovane: n, chyby };
    },
  },
  {
    id: 'stromy-na-vozovke',
    popis: 'Žiadny kmeň stromu na vozovke ani na koľajach (strom z lasera nad cestou sa posunie na okraj)',
    oprava: '6456945 Stromy nie na vozovke, koľajach ani v domoch',
    spusti(ctx) {
      const chyby = [];
      let n = 0;
      for (const [kluc, d] of ctx.dlazdice) {
        const pasy = [
          ...(d.cesty ?? []).filter((c) => !c.nadjazd && c.body?.length > 1).map((c) => pas(c.body, (c.sirka ?? 7) / 2)),
          ...(d.kolajnice ?? []).filter((k) => !k.nadjazd && k.body?.length > 1).map((k) => pas(k.body, 1.2)),
        ];
        for (const s of stromyHry(ctx, d)) {
          n++;
          const [x, z] = s;
          if (pasy.some((p) => naPase(x, z, p))) chyby.push({ x, z, dlazdica: kluc, text: 'kmeň na vozovke' });
        }
      }
      return { skontrolovane: n, chyby };
    },
  },
  {
    id: 'stromy-v-budovach',
    popis: 'Žiadny strom v pôdoryse budovy',
    oprava: '6456945 / c8fe90c (stromy z lasera nie v budovách)',
    spusti(ctx) {
      const chyby = [];
      let n = 0;
      for (const [kluc, d] of ctx.dlazdice) {
        const domy = (d.budovy ?? []).filter((b) => b.body?.length > 2 && !(b.minVyska > 2.5)).map((b) => ({ body: b.body, ...ohranicenie(b.body) }));
        for (const s of stromyHry(ctx, d)) {
          n++;
          const [x, z] = s;
          if (domy.some((b) => x >= b.minX && x <= b.maxX && z >= b.minZ && z <= b.maxZ && bodVPolygone(x, z, b.body))) chyby.push({ x, z, dlazdica: kluc, text: 'strom v budove' });
        }
      }
      return { skontrolovane: n, chyby };
    },
  },
  {
    id: 'horizont-pod-dlazdicami',
    popis: 'Horizont (vzdialený terén) sa vyrezáva len pod postavenými podrobnými dlaždicami (maska), nie kruhom okolo '
      + 'hráča – po dlhom presune nebola v kruhu kým sa dlaždice postavili diera do hmly (biela plocha)',
    oprava: 'fix/dlazdice-po-skoku – js/mapa/teren/horizont.js (maska dlaždíc), sprava-dlazdic.js dostavOkolie po teleporte',
    tolerancia: 0,
    spusti(ctx) {
      const chyby = [];
      try {
        const D = ctx.index.dlazdica;
        const H = { minX: -2000, maxX: 2000, minZ: -2000, maxZ: 2000 };
        const h = vytvorHorizont({ vyskaTerenu: () => 0 }, { HRANICE: H }, D);
        if (typeof h.userData.nastavDetail !== 'function') chyby.push({ text: 'horizont nemá nastavDetail (maska dlaždíc)' });
        else {
          h.userData.nastavDetail('0_0', true);
          const sh = { uniforms: {}, vertexShader: '#include <common>\n#include <begin_vertex>', fragmentShader: '#include <common>\nvoid main() {' };
          h.material.onBeforeCompile(sh);
          const maska = sh.uniforms.maskaDetailu?.value?.image?.data;
          if (!maska || !maska.some((v) => v === 255)) chyby.push({ text: 'maska dlaždíc sa po nastavDetail nezmenila' });
          if (sh.fragmentShader.includes('distance(vSvet')) chyby.push({ text: 'horizont sa znova vyrezáva kruhom okolo hráča' });
        }
        h.geometry.dispose();
      } catch (e) {
        chyby.push({ text: `chyba kontroly: ${e.message}` });
      }
      return { skontrolovane: 1, chyby };
    },
  },
  ...kontrolyTravy,
  ...kontrolyCiest,
  ...kontrolyDlazdic,
  ...kontrolyMostov,
  ...kontrolyGrafiky,
  ...kontrolyPamiatok,
];
