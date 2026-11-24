// Kontroly ručných opráv budov (data/mapa/opravy-budov.json, js/mapa/budovy/opravy.js): podlubia a arkiere (#64).

import { aplikujOpravy } from '../../../js/mapa/budovy/opravy.js';
import { bodVPolygone } from '../../../js/mapa/geometria.js';

const STRED = { lat: 48.1435, lon: 17.1077 };
const KX = 111320 * Math.cos((STRED.lat * Math.PI) / 180), KZ = 111132;
const naXZ = ([lat, lon]) => [(lon - STRED.lon) * KX, -(lat - STRED.lat) * KZ];

export const kontrolyBudov = [
  {
    id: 'podlubia-a-arkiere',
    popis: 'Podlubia (zapustené prízemie pod vyčnievajúcimi poschodiami) a predsadené arkiere z opráv budov sa naozaj '
      + 'postavia: prízemie je za líniou fasády, poschodia nad ním sú vyvýšená časť a arkier stojí pred fasádou '
      + '(Dunajská 4–8 pri Kamennom nám.)',
    oprava: 'fix/dunajska-arkiere (#64) – js/mapa/budovy/opravy.js, data/mapa/opravy-budov.json',
    tolerancia: 0,
    async spusti(ctx) {
      const chyby = [];
      const zoznam = ((await (await fetch('data/mapa/opravy-budov.json')).json()).budovy ?? []).map((o) => ({ ...o, xz: naXZ(o.bod) }));
      const s = zoznam.filter((o) => o.podlubie || o.arkiere?.length);
      if (!s.length) return { skontrolovane: 0, chyby: [{ text: 'v opravách nie je žiadne podlubie ani arkier' }] };
      let n = 0;
      for (const o of s) {
        const [x, z] = o.xz;
        const kluc = `${Math.floor(x / 500)}_${Math.floor(z / 500)}`;
        const d = ctx.dlazdice.get(kluc);
        if (!d) continue;
        // kópia budov dlaždice (opravy menia budovy na mieste)
        const budovy = (d.budovy ?? []).map((b) => ({ ...b, body: b.body.map((p) => [...p]) }));
        const pred = budovy.length;
        aplikujOpravy(budovy, [o]);
        const nove = budovy.slice(pred);
        n++;
        if (o.podlubie) {
          const prizemie = nove.find((b) => b.podlubie);
          if (!prizemie) { chyby.push({ x, z, dlazdica: kluc, text: `${o.miesto}: podlubie sa nepostavilo` }); continue; }
          // bod tesne za fasádou (pol hĺbky podlubia) nesmie byť v prízemí, ale v poschodiach nad ním áno
          const [a, b] = o.podlubie.fasada.map(naXZ);
          const m = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
          if (!budovy.some((b_) => b_.minVyska === o.podlubie.vyska)) chyby.push({ x, z, dlazdica: kluc, text: `${o.miesto}: poschodia nad podlubím nie sú vyvýšené` });
          let cx = 0, cz = 0;
          for (const [px, pz] of prizemie.body) { cx += px; cz += pz; }
          cx /= prizemie.body.length; cz /= prizemie.body.length;
          const L = Math.hypot(cx - m[0], cz - m[1]) || 1;
          const q = [m[0] + (cx - m[0]) / L * (o.podlubie.hlbka / 2), m[1] + (cz - m[1]) / L * (o.podlubie.hlbka / 2)];
          if (bodVPolygone(q[0], q[1], prizemie.body)) chyby.push({ x: q[0], z: q[1], dlazdica: kluc, text: `${o.miesto}: prízemie nie je ustúpené za fasádu` });
        }
        const arkiere = nove.filter((b) => b.arkier);
        if ((o.arkiere?.length ?? 0) !== arkiere.length) chyby.push({ x, z, dlazdica: kluc, text: `${o.miesto}: postavených arkierov ${arkiere.length} z ${o.arkiere?.length ?? 0}` });
      }
      if (!n) chyby.push({ text: 'žiadna oprava s podlubím/arkierom nie je v načítaných dlaždiciach' });
      return { skontrolovane: n, chyby };
    },
  },
];
