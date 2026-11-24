// Kontroly grafiky: automatické rozlíšenie sa po ustálení nemení (js/grafika/rozlisenie.js) – obraz nekolíše
// medzi ostrým a rozmazaným; len pri dlhom veľkom spomalení sa núdzovo zníži.

import rozlisenie from '../../../js/grafika/rozlisenie.js';

export const kontrolyGrafiky = [
  {
    id: 'rozlisenie-ustalene',
    popis: 'Automatické rozlíšenie sa hľadá len na začiatku (45 s); potom sa už nezvyšuje ani neznižuje '
      + '(okrem núdze pri dlhých veľmi pomalých snímkach) – predtým obraz stále kolísal',
    oprava: 'feature/stabilna-grafika – js/grafika/rozlisenie.js, kvalita.js (ustálenie)',
    tolerancia: 0,
    spusti() {
      const chyby = [];
      const povodne = performance.now;
      let t = 1000;
      performance.now = () => t;
      try {
        let pomer = 1;
        const hra = {
          stav: { grafika: { pixel: [0.5, 2] } },
          renderer: { getPixelRatio: () => pomer, setPixelRatio: (r) => { pomer = r; } },
          na() {},
        };
        const r = Object.create(rozlisenie);
        r.init(hra);
        // čas snímky: číslo (ms) alebo funkcia podielu rozlíšenia (brzdí grafická karta – menej pixelov = rýchlejšie)
        const bez = (ms, s) => {
          for (let uplynulo = 0; uplynulo < s * 1000;) {
            const d = typeof ms === 'function' ? ms(r.podiel) : ms;
            t += d; uplynulo += d;
            r.updateVzdy(d / 1000, hra);
          }
        };
        bez((p) => 28 * p * p, 50);        // hľadanie (prvých 45 s): grafická karta nestíha → rozlíšenie klesne
        const poHladani = r.podiel;
        if (!(poHladani < 1)) chyby.push({ text: `pri pomalých snímkach sa rozlíšenie nezníželo (${poHladani})` });
        bez(5, 90);                        // po ustálení rýchle snímky → nesmie stúpnuť
        if (r.podiel > poHladani + 1e-6) chyby.push({ text: `po ustálení rozlíšenie stúplo ${poHladani.toFixed(2)} → ${r.podiel.toFixed(2)}` });
        const pred = r.podiel;
        bez(25, 30);                       // mierne pomalé → po ustálení bez zmeny
        if (Math.abs(r.podiel - pred) > 1e-6) chyby.push({ text: 'po ustálení sa rozlíšenie zmenilo pri mierne pomalých snímkach' });
        bez(45, 12);                       // dlhá núdza → o krok nižšie
        if (!(r.podiel < pred - 1e-6) && pred > r.min + 1e-3) chyby.push({ text: 'pri dlhom veľkom spomalení sa rozlíšenie núdzovo neznížilo' });
      } catch (e) {
        chyby.push({ text: `chyba kontroly: ${e.message}` });
      } finally {
        performance.now = povodne;
      }
      return { skontrolovane: 1, chyby };
    },
  },
];
