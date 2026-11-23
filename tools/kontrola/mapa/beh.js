// Beh kontrolóra mapy v prehliadači: načíta dlaždice a výškový model, spustí KATEGORIE, výsledok dá do
// window.vysledok (číta ho tools/kontrola/kontrola-mapy.py – ten zapíše JSON, HTML mapu a porovná so základom).
// Parametre v adrese: ?len=id1,id2 – len vybrané kategórie.

import { KATEGORIE } from './kontroly-mapy.js';
import { nacitajIndex, nacitajDlazdice, nacitajVyskopis } from '../regresie/data.js';

const q = new URLSearchParams(location.search);
const len = q.get('len')?.split(',').filter(Boolean);
const stav = document.getElementById('stav');
const hlas = (s) => { stav.textContent = s; };
const MAX_BODOV = 4000;     // na kategóriu do výstupu (počet je vždy celý)

async function main() {
  const index = await nacitajIndex();
  const dlazdice = await nacitajDlazdice(index, hlas);
  const potrebujeVysky = KATEGORIE.some((k) => k.id === 'cesta-strma' && (!len || len.includes(k.id)));
  const vyskopis = potrebujeVysky ? await nacitajVyskopis(index, hlas) : null;
  const ctx = { index, dlazdice, vyskopis };
  const vysledok = [];
  for (const k of KATEGORIE) {
    if (len && !len.includes(k.id)) continue;
    hlas(`Kontrola ${k.id}…`);
    await new Promise((r) => setTimeout(r, 0));
    const t0 = performance.now();
    let body;
    try {
      body = await k.spusti(ctx);
    } catch (e) {
      body = [{ x: 0, z: 0, text: `výnimka: ${e?.message ?? e}` }];
    }
    vysledok.push({ id: k.id, popis: k.popis, ok: true, pocet: body.length, body: body.slice(0, MAX_BODOV),
      sekundy: +((performance.now() - t0) / 1000).toFixed(1) });
  }
  document.getElementById('tab').innerHTML = '<tr><th>kategória</th><th>počet</th></tr>'
    + vysledok.map((v) => `<tr><td><b>${v.id}</b> – ${v.popis}</td><td>${v.pocet}</td></tr>`).join('');
  hlas('Hotovo.');
  window.vysledok = vysledok;
}

main().catch((e) => { hlas(`Chyba: ${e?.message ?? e}`); window.vysledok = [{ id: 'beh', ok: false, pocet: 1, body: [{ text: String(e?.stack ?? e) }] }]; });
