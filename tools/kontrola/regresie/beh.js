// Beh regresných kontrol v prehliadači: načíta index a dlaždice mesta, spustí KONTROLY, výsledok dá
// do window.vysledok (číta ho tools/kontrola/regresie.py) a vypíše tabuľku na stránku.
// Parametre v adrese: ?len=id1,id2 – len vybrané kontroly; ?rychlo – menej dlaždíc (na ladenie).

import { KONTROLY } from './kontroly.js';

const q = new URLSearchParams(location.search);
const len = q.get('len')?.split(',').filter(Boolean);
const stav = document.getElementById('stav');

async function nacitajDlazdice(index) {
  const dlazdice = new Map();
  const kluce = index.dlazdice.map(([i, j]) => `${i}_${j}`);
  for (let a = 0; a < kluce.length; a += 64) {
    const davka = kluce.slice(a, a + 64);
    const data = await Promise.all(davka.map((k) => fetch(`../../data/mapa/mesto/d/${k}.json`).then((r) => (r.ok ? r.json() : null)).catch(() => null)));
    davka.forEach((k, i) => { if (data[i]) dlazdice.set(k, data[i]); });
    stav.textContent = `Načítavam dlaždice… ${dlazdice.size} / ${kluce.length}`;
  }
  // výrez s detailným terénom (ako js/mapa/dlazdice/sprava-dlazdic.js)
  for (const k of index.terenDetail?.dlazdice ?? []) { const d = dlazdice.get(k); if (d) d._detailTerenu = true; }
  return dlazdice;
}

async function main() {
  const index = await (await fetch('../../data/mapa/mesto/index.json')).json();
  const ctx = { index, dlazdice: await nacitajDlazdice(index), rychlo: q.has('rychlo') };
  const vysledky = [];
  for (const k of KONTROLY) {
    if (len && !len.includes(k.id)) continue;
    stav.textContent = `Kontrola ${k.id}…`;
    await new Promise((r) => setTimeout(r, 0));
    const t0 = performance.now();
    let r;
    try {
      r = await k.spusti(ctx);
    } catch (e) {
      r = { skontrolovane: 0, chyby: [{ text: `výnimka: ${e?.message ?? e}` }] };
    }
    // tolerancia: pevný počet chýb, alebo pomer na milión skontrolovaných (napr. trojuholníky ciest)
    const tolerancia = k.naMilion ? Math.floor(r.skontrolovane * k.naMilion / 1e6) : (k.tolerancia ?? 0);
    vysledky.push({
      id: k.id, popis: k.popis, oprava: k.oprava, ok: r.chyby.length <= tolerancia,
      skontrolovane: r.skontrolovane, pocetChyb: r.chyby.length, tolerancia, priklady: r.chyby.slice(0, 8),
      sekundy: +((performance.now() - t0) / 1000).toFixed(1),
    });
  }
  const tab = document.getElementById('tab');
  tab.innerHTML = '<tr><th>kontrola</th><th>výsledok</th><th>skontrolované</th><th>príklady chýb</th></tr>' + vysledky.map((v) =>
    `<tr><td><b>${v.id}</b><br>${v.popis}<br><small>${v.oprava}</small></td><td class="${v.ok ? 'ok' : 'zle'}">${v.ok ? 'OK' : `CHYBA (${v.pocetChyb})`}</td>`
    + `<td>${v.skontrolovane}</td><td><small>${v.priklady.map((p) => `${p.text} [${p.dlazdica ?? ''}] ${p.x ?? ''} ${p.z ?? ''}`).join('<br>')}</small></td></tr>`).join('');
  stav.textContent = vysledky.every((v) => v.ok) ? 'Všetky kontroly prešli.' : 'Niektoré kontroly zlyhali.';
  window.vysledok = vysledky;
}

main().catch((e) => { stav.textContent = `Chyba: ${e?.message ?? e}`; window.vysledok = [{ id: 'beh', ok: false, pocetChyb: 1, priklady: [{ text: String(e?.stack ?? e) }] }]; });
