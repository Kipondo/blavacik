// Kontroly mostov a lávok: mólá nad nábrežím sú vodorovné (data/mapa/mola.json, js/mapa/mosty/mola.js).

import { profilMosta } from '../../../js/mapa/mosty/nadjazdy.js';
import { oznacMola } from '../../../js/mapa/mosty/mola.js';
import { teren } from './cesty.js';

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
];
