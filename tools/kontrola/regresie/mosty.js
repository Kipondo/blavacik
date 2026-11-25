// Kontroly mostov a lávok: mólá nad nábrežím sú vodorovné (data/mapa/mola.json, js/mapa/mosty/mola.js),
// NPC autá a MHD idú po mostovke nadjazdu (js/mapa/mosty/vyska-vozidla.js).

import { profilMosta } from '../../../js/mapa/mosty/nadjazdy.js';
import { oznacMola } from '../../../js/mapa/mosty/mola.js';
import { teren } from './cesty.js';
import { vyskaVozidla } from '../../../js/mapa/mosty/vyska-vozidla.js';
import { vytvorMostyVyskopisu } from '../../../js/mapa/teren/mosty-vyskopisu.js';
import { vytvorOs, najblizsiNaOsi } from '../../../js/mapa/mosty/os-mosta.js';

const NULA = 139;                // y = 0 v hre (m n. m.)

export const kontrolyMostov = [
  {
    id: 'mola-vodorovne',
    popis: 'Mólá nad nábrežím (Eurovea, Inessa Hansch) sú vodorovné vo výške brehu so schodmi na brehu a koncom vysoko '
      + 'nad zemou pri vode – z OSM by išla lávka od terénu na brehu k terénu pri vode, 6–7 m dolu svahom k rieke',
    oprava: 'feature/eurovea-nabrezie (#131 časť 3) – data/mapa/mola.json, js/mapa/mosty/mola.js, nadjazdy.js profilMosta',
    tolerancia: 0,
    async spusti(ctx) {
      const chyby = [];
      const r = await fetch('data/mapa/mola.json');
      const zoznam = r.ok ? (await r.json()).mola ?? [] : [];
      if (!zoznam.length) return { skontrolovane: 0, chyby: [{ text: 'chýba data/mapa/mola.json' }] };
      const D = ctx.index.dlazdica;
      let n = 0;
      for (const o of zoznam) {
        const [i, j] = [Math.floor(o.breh[0] / D), Math.floor(o.breh[1] / D)];
        const kluc = `${i}_${j}`;
        const d = ctx.dlazdice.get(kluc), t = await teren(kluc);
        if (!d || !t) { chyby.push({ dlazdica: kluc, text: `${o.nazov}: chýba dlaždica alebo podrobný terén` }); continue; }
        const kopia = (d.nadjazdy ?? []).map((m) => ({ ...m }));
        oznacMola(kopia, [o]);
        const m = kopia.find((q) => q.molo);
        if (!m) { chyby.push({ x: o.breh[0], z: o.breh[1], dlazdica: kluc, text: `${o.nazov}: lávka v dlaždici nie je` }); continue; }
        n++;
        const krok = D / (t.n - 1);
        const vyska = (x, z) => {
          const fx = Math.max(0, Math.min(t.n - 1.001, (x - i * D) / krok)), fz = Math.max(0, Math.min(t.n - 1.001, (z - j * D) / krok));
          const a = Math.floor(fx), b = Math.floor(fz), tx = fx - a, tz = fz - b, H = t.H;
          return (H[b * t.n + a] * (1 - tx) + H[b * t.n + a + 1] * tx) * (1 - tz) + (H[(b + 1) * t.n + a] * (1 - tx) + H[(b + 1) * t.n + a + 1] * tx) * tz;
        };
        const pr = profilMosta(m, vyska);
        const paluba = pr.body.filter((p) => !p.predlzenie);
        const hs = paluba.map((p) => p.h);
        if (Math.max(...hs) - Math.min(...hs) > 0.05) chyby.push({ x: o.breh[0], z: o.breh[1], text: `${o.nazov}: mostovka nie je vodorovná (${(Math.max(...hs) - Math.min(...hs)).toFixed(1)} m)` });
        const koniec = m.molo.brehNaKonci ? paluba[0] : paluba.at(-1);
        if (koniec.h - koniec.teren < 3) chyby.push({ x: koniec.x, z: koniec.z, text: `${o.nazov}: koniec pri vode len ${(koniec.h - koniec.teren).toFixed(1)} m nad zemou` });
        if (!pr.body.some((p) => p.predlzenie === 'schody')) chyby.push({ x: o.breh[0], z: o.breh[1], text: `${o.nazov}: na brehu chýbajú schody` });
      }
      return { skontrolovane: n, chyby };
    },
  },
  {
    id: 'vozidla-na-nadjazde',
    popis: 'NPC autá a MHD idú po mostovke nadjazdu ako auto hráča: auto na nadjazde si mostovku nájde aj hneď po '
      + 'objavení, z rampy na ňu prejde plynule a ostane na nej; auto pod mostom ostane na zemi (predtým išli po '
      + 'zemi pod mostovkou a pri koncoch mostov zapadli do jamy pod rampou)',
    oprava: 'fix/najazdy-nadjazdov (#54) – js/mapa/mosty/vyska-vozidla.js, premavka/modul.js, mhd/vozidla/modul.js',
    tolerancia: 0,
    spusti() {
      const chyby = [];
      // falošná hra: zem 0 m, nadjazd pre x 0…60 m pri z = 0 – rampa z 0 na 6 m (x 0…10), ďalej 6 m;
      // pravidlo ako js/mapa/mosty/nadjazdy-modul.js: mostovka len keď je výška vozidla blízko (−1,6 … +4 m)
      const mostovka = (x, z) => (Math.abs(z) < 4 && x >= 0 && x <= 60 ? Math.min(6, x * 0.6) : null);
      const hra = {
        mapa: { vyska: () => 0 },
        mosty: { vyska: (x, z, y) => { const h = mostovka(x, z); return h === null || y < h - 1.6 || y > h + 4 ? null : h; } },
      };
      const blizko = (a, b) => Math.abs(a - b) < 0.01;
      if (!blizko(vyskaVozidla(hra, 30, 0, null, true), 6)) chyby.push({ text: 'auto objavené na nadjazde nie je na mostovke' });
      if (!blizko(vyskaVozidla(hra, 30, 0, 0, false), 0)) chyby.push({ text: 'auto pod mostom vyskočilo na mostovku' });
      let y = 0;
      for (let x = -5; x <= 40; x += 1) y = vyskaVozidla(hra, x, 0, y, false);
      if (!blizko(y, 6)) chyby.push({ text: `auto z rampy neprešlo na mostovku (výška ${y.toFixed(2)} namiesto 6)` });
      if (!blizko(vyskaVozidla(hra, 45, 0, 6, false), 6)) chyby.push({ text: 'autobus na mostovke z nej spadol na zem' });
      if (!blizko(vyskaVozidla(hra, 80, 0, 6, true), 0)) chyby.push({ text: 'za koncom mosta vozidlo neostalo na zemi' });
      // auto objavené na ceste veľkého mosta 14 m nad zemou (Most Apollo nad nábrežím) – nájde mostovku
      const hra2 = { mapa: { vyska: () => 0, mostovka: (x, z) => (Math.abs(z) < 8 ? { h: 14 } : null) }, mosty: { vyska: () => null } };
      if (!blizko(vyskaVozidla(hra2, 30, 0, null, true), 14)) chyby.push({ text: 'auto na vysokom moste ostalo na zemi pod ním' });
      return { skontrolovane: 6, chyby };
    },
  },
  {
    id: 'mosty-cez-dunaj-napojenie',
    popis: 'Mosty cez Dunaj sú po celej dĺžke aj s estakádami (data/mapa/mosty-dunaj.json): každá cesta s menom mosta '
      + 'leží na jeho pôdoryse (predtým most končil 45 m za brehom a ďalej išla vozovka po zemi – medzery pri napojení '
      + 'na breh), mostovka nad riekou je vysoko (≥ 14 m nad vodou, predtým 4 m nad brehom), konce na zemi a pod '
      + 'estakádou ostane zem (cesty, lampy, chodci), na násype medzi múrmi mostovka; rampy sa napoja na mostovku',
    oprava: 'feature/mosty-dunaj – tools/mesto/mosty-dunaj.mjs, js/mapa/teren/mosty-vyskopisu.js, js/mapa/mosty/nadjazdy.js',
    tolerancia: 0,
    spusti(ctx) {
      const chyby = [];
      let n = 0;
      const PAT = ['Most SNP', 'Starý most', 'Most Apollo', 'Prístavný most', 'Most Lanfranconi'];
      const presne = (ctx.index.mosty ?? []).filter((m) => m.profil && PAT.includes(m.nazov));
      for (const meno of PAT) {
        if (!presne.some((m) => m.nazov === meno)) chyby.push({ text: `${meno}: chýba v data/mapa/mosty-dunaj.json` });
      }
      for (const m of presne) {
        const os = vytvorOs(m.os ?? [m.od, m.do]);
        // 1. cesty a koľaje s menom mosta ležia na jeho pôdoryse
        for (const d of ctx.dlazdice.values()) {
          for (const c of [...(d.cesty ?? []), ...(d.kolajnice ?? [])]) {
            if (c.nazov !== m.nazov || !c.most) continue;
            for (const [x, z] of c.body ?? []) {
              n++;
              const p = najblizsiNaOsi(os, x, z);
              // za koncom na zemi (opora, násyp) pokračuje cesta po teréne – tam medzera nevzniká (do 15 m)
              const zaA = m.profil[0][2] ? 15 : 3, zaB = m.profil.at(-1)[2] ? 15 : 3;
              const mimo = p.s < -zaA || p.s > os.dlzka + zaB || Math.sqrt(p.d2) > m.sirka / 2 + 1;
              if (mimo) chyby.push({ x, z, text: `${m.nazov}: cesta mosta mimo jeho pôdorysu (s ${p.s.toFixed(0)}, bočne ${Math.sqrt(p.d2).toFixed(0)} m)` });
            }
          }
        }
        // 2. mostovka nad riekou aspoň 14 m nad vodou (~133 m n. m.)
        const vrch = Math.max(...m.profil.map((b) => b[1]));
        if (vrch + NULA < 133 + 14) chyby.push({ text: `${m.nazov}: mostovka len ${(vrch + NULA).toFixed(1)} m n. m.` });
        // 3. konce na zemi alebo napojené (Prístavný most – estakády ďalej sú nadjazdy)
        if (m.nazov !== 'Prístavný most' && !(m.profil[0][2] && m.profil.at(-1)[2])) chyby.push({ text: `${m.nazov}: koniec mosta nie je na teréne` });
      }
      // 4. pravidlá výšky (falošný terén 0, most 100 m, mostovka 8 m, násyp na 80 … 100 m)
      const [vyskopis] = [vytvorMostyVyskopisu([{ nazov: 't', od: [0, 0], do: [100, 0], sirka: 10, profil: [[0, 8], [100, 8]], nasypy: [[80, 100]] }],
        { vyskaTerenu: () => 0, jeVRieke: () => false })];
      const v = (x, z, y) => vyskopis.vyskaMostu(x, z, y);
      if (v(50, 0) !== null) chyby.push({ text: 'vec na povrchu pod estakádou je na mostovke (má byť na zemi)' });
      if (v(50, 0, 8) !== 8) chyby.push({ text: 'auto na estakáde nie je na mostovke' });
      if (v(50, 0, 0.5) !== null) chyby.push({ text: 'chodec pod estakádou vyskočil na mostovku' });
      if (v(90, 0) !== 8) chyby.push({ text: 'cesta na násype medzi múrmi nie je na mostovke' });
      if (vyskopis.mostovka(50, 0)?.h !== 8) chyby.push({ text: 'mostovka() nevráti výšku mostovky (rampy sa nenapoja)' });
      const r = profilMosta({ druh: 'cesta', body: [[100, 0], [140, 0]], sirka: 7 }, () => 0, [8, null]);
      if (Math.abs(r.body.find((b) => b.s === 0).h - 8) > 0.01) chyby.push({ text: 'rampa nadjazdu sa nenapojila na mostovku' });
      return { skontrolovane: n + 6, chyby };
    },
  },
  {
    id: 'cesty-nad-vodou-na-moste',
    popis: 'Žiadna cesta pre autá ani koľaj nevedie ponad rieku bez mostovky: každý jej bod vo vodnej ploche je na moste '
      + '(mosty cez Dunaj, data/mapa/mosty-rieky.json) alebo na nadjazde. Predtým mali most len pomenované mosty s osou '
      + 'vedľa cesty – na Moste Apollo, D4, mostoch cez Chorvátske rameno a Malý Dunaj autá a električky išli do vody',
    oprava: 'feature/mosty-dunaj – tools/mesto/mosty-rieky.mjs, js/mapa/mosty/mosty-dunaja.js, js/mapa/mosty/mosty.js',
    tolerancia: 0,
    spusti(ctx) {
      const AUTA = new Set(['motorway', 'motorway_link', 'trunk', 'trunk_link', 'primary', 'primary_link', 'secondary', 'secondary_link',
        'tertiary', 'tertiary_link', 'unclassified', 'residential', 'service', 'living_street']);
      const rieky = (ctx.index.voda ?? []).filter((v) => v.reka !== false && v.body?.length > 2).map((v) => ({ body: v.body, ...ohr(v.body) }));
      const mosty = (ctx.index.mosty ?? []).map((m) => ({ m, os: vytvorOs(m.os ?? [m.od, m.do]) }));
      const vRieke = (x, z) => rieky.some((r) => x >= r.minX && x <= r.maxX && z >= r.minZ && z <= r.maxZ && vPolygone(x, z, r.body));
      const naMoste = (x, z) => mosty.some(({ m, os }) => {
        const p = najblizsiNaOsi(os, x, z);
        return p.s >= -2 && p.s <= os.dlzka + 2 && Math.sqrt(p.d2) <= m.sirka / 2 + 0.5;
      });
      const chyby = [];
      let n = 0;
      for (const [kluc, d] of ctx.dlazdice) {
        const nadj = (d.nadjazdy ?? []).map((q) => ({ body: q.body, pol: q.sirka / 2 + 1 }));
        const naNadjazde = (x, z) => nadj.some((q) => vzdialenost(x, z, q.body) < q.pol);
        const prvky = [...(d.cesty ?? []).filter((c) => AUTA.has(c.typ) && !c.tunel), ...(d.kolajnice ?? [])];
        for (const c of prvky) {
          const b = c.body ?? [];
          for (let i = 1; i < b.length; i++) {
            const [ax, az] = b[i - 1], [bx, bz] = b[i];
            const k = Math.max(1, Math.ceil(Math.hypot(bx - ax, bz - az) / 4));
            for (let j = 0; j <= k; j++) {
              const x = ax + (bx - ax) * j / k, z = az + (bz - az) * j / k;
              if (!vRieke(x, z)) continue;
              n++;
              if (naMoste(x, z) || naNadjazde(x, z)) continue;
              chyby.push({ x: Math.round(x), z: Math.round(z), dlazdica: kluc, text: `${c.nazov || c.typ}: cesta ide do vody (bez mosta)` });
              j = k; i = b.length;            // jedna chyba na cestu
            }
          }
        }
      }
      // výnimka: jeden bod obslužnej cesty v Novom prístave (okraj móla v OSM leží 1 m vo vode)
      return { skontrolovane: n, chyby: chyby.filter((c) => !(c.dlazdica === '6_2' && c.text.startsWith('service'))) };
    },
  },
];

function ohr(body) {
  let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
  for (const [x, z] of body) { minX = Math.min(minX, x); maxX = Math.max(maxX, x); minZ = Math.min(minZ, z); maxZ = Math.max(maxZ, z); }
  return { minX, maxX, minZ, maxZ };
}
function vPolygone(x, z, b) {
  let c = false;
  for (let i = 0, j = b.length - 1; i < b.length; j = i++) {
    const [xi, zi] = b[i], [xj, zj] = b[j];
    if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) c = !c;
  }
  return c;
}
function vzdialenost(x, z, body) {
  let naj = Infinity;
  for (let i = 1; i < body.length; i++) {
    const [ax, az] = body[i - 1], [bx, bz] = body[i];
    const dx = bx - ax, dz = bz - az, l2 = dx * dx + dz * dz || 1;
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / l2));
    naj = Math.min(naj, Math.hypot(ax + dx * t - x, az + dz * t - z));
  }
  return naj;
}
