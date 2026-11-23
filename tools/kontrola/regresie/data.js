// Spoločné načítanie dát mesta pre kontroly v prehliadači (regresie.html, kontrola-mapy.html):
// index, všetky dlaždice a voliteľne výškový model hry (rovnaký ako v hre, aj s podrobným terénom z lasera).

import { vytvorVyskopisMesta } from '../../../js/mapa/teren/vyska-mesto.js';
import { nacitajDoplnky } from '../../../js/mapa/dlazdice/doplnky.js';
import { KONFIG } from '../../../js/config.js';

export async function nacitajIndex() {
  return (await fetch('data/mapa/mesto/index.json')).json();
}

/** Všetky dlaždice mesta (Map kluc → dáta), po dávkach; stav = funkcia na hlásenie priebehu. */
export async function nacitajDlazdice(index, stav = () => {}) {
  const dlazdice = new Map();
  const kluce = index.dlazdice.map(([i, j]) => `${i}_${j}`);
  for (let a = 0; a < kluce.length; a += 64) {
    const davka = kluce.slice(a, a + 64);
    const data = await Promise.all(davka.map((k) => fetch(`data/mapa/mesto/d/${k}.json`).then((r) => (r.ok ? r.json() : null)).catch(() => null)));
    davka.forEach((k, i) => { if (data[i]) dlazdice.set(k, data[i]); });
    stav(`Načítavam dlaždice… ${dlazdice.size} / ${kluce.length}`);
  }
  // výrez s detailným terénom (ako js/mapa/dlazdice/sprava-dlazdic.js)
  for (const k of index.terenDetail?.dlazdice ?? []) { const d = dlazdice.get(k); if (d) d._detailTerenu = true; }
  return dlazdice;
}

/** Výškový model hry (js/mapa/teren/vyska-mesto.js) s podrobným terénom všetkých laserových dlaždíc. */
export async function nacitajVyskopis(index, stav = () => {}) {
  const meta = await (await fetch('data/mapa/mesto/teren.json')).json();
  const vysky = new Int16Array(await (await fetch('data/mapa/mesto/teren.bin')).arrayBuffer());
  const vyskopis = vytvorVyskopisMesta({ meta, vysky }, { voda: index.voda, mosty: index.mosty }, { ...KONFIG, HRANICE: index.hranice });
  const detail = index.terenDetail?.dlazdice ?? [];
  let n = 0;
  for (const kluc of detail) {
    const { teren } = await nacitajDoplnky(kluc, index);
    const [i, j] = kluc.split('_').map(Number);
    if (teren) vyskopis.pridajDetail?.(i, j, teren.v, teren.n, teren.krok);
    stav(`Podrobný terén… ${++n} / ${detail.length}`);
  }
  return vyskopis;
}
