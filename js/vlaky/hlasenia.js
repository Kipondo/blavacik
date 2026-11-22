// Hlásenia staničného rozhlasu (A3): gong (syntetizovaný, js/zvuk/gong.js) a titulky podľa šablón
// z data/dialogy/stanica-hlasenia.json – príchod, odchod, meškanie a občas vtip. Len keď je hráč pri stanici,
// najviac jedno hlásenie za MEDZERA sekúnd; staré udalosti (hráč bol inde) sa nehlásia dodatočne.

import { hhmm, nahoda } from './poriadok.js';

const MEDZERA = 40;          // s skutočného času medzi hláseniami
const DOSAH = 220;           // m od stredu nástupíšť
const VTIP = 0.35;           // pravdepodobnosť vtipu po hlásení meškania

export class Hlasenia {
  constructor(hra) {
    this.hra = hra;
    this.data = null;
    this.hotove = new Set();
    this.posledne = -1e9;
    fetch('data/dialogy/stanica-hlasenia.json').then((r) => r.json()).then((d) => { this.data = d; }).catch(() => {});
  }

  nazovVlaku(v) {
    const kat = this.data?.kategorie?.[v.kat] ?? 'Vlak';
    return `${kat} ${v.kat} ${v.cislo}${v.nazov ? ' ' + v.nazov : ''}`;
  }

  text(druh, p, v, kluc) {
    const s = this.data?.sablony?.[druh];
    if (!s?.length) return null;
    const t = s[Math.floor(nahoda(kluc) * s.length)];
    return t.replace(/\{(\w+)\}/g, (_, k) => ({
      vlak: this.nazovVlaku(v), z: v.z, do: v.do, nastupiste: p.nastupiste, kolaj: p.kolaj,
      cas: hhmm(v.cas), meskanie: v.meskanie,
    })[k] ?? '');
  }

  /** Zavolať každý snímok: t = herná minúta dňa, vzdialenost = hráč ↔ stred nástupíšť (m). */
  krok(pobyty, t, vzdialenost, stred) {
    if (!this.data || !pobyty) return;
    const teraz = performance.now() / 1000;
    const udalosti = [];
    for (const p of pobyty) {
      if (p.scena) continue;
      if (p.prichod) {
        if (p.prichod.meskanie >= 5) udalosti.push(['meskanie', p, p.prichod, p.prichod.cas, `m${p.prichod.cislo}`]);
        udalosti.push(['prichod', p, p.prichod, p.tPri - 1, `p${p.prichod.cislo}`]);
      }
      if (p.odchod) {
        if (p.odchod.meskanie >= 5 && !p.prichod) udalosti.push(['meskanie', p, p.odchod, p.odchod.cas, `n${p.odchod.cislo}`]);
        udalosti.push(['odchod', p, p.odchod, p.tOdch - 2, `o${p.odchod.cislo}`]);
      }
    }
    for (const [druh, p, v, kedy, id] of udalosti) {
      const kluc = `${Math.floor(kedy / 1440)}|${id}|${druh}`;
      if (this.hotove.has(kluc) || t < kedy) continue;
      // len čerstvé udalosti (do 1 min) a len pri stanici; ostatné sa označia ako vybavené
      if (t - kedy > 1 || vzdialenost > DOSAH || this.hra.titulky?.bezi || teraz - this.posledne < MEDZERA) {
        if (t - kedy > 1 || vzdialenost > DOSAH) this.hotove.add(kluc);
        continue;
      }
      this.hotove.add(kluc);
      const repliky = [{ kto: 'rozhlas', text: this.text(druh, p, v, kluc) }];
      if (druh === 'meskanie' && nahoda(kluc + 'v') < VTIP) repliky.push({ kto: 'rozhlas', text: this.text('vtip', p, v, kluc + 'vt') });
      if (!repliky[0].text) continue;
      this.posledne = teraz;
      this.hra.posli('zvuk', { meno: 'gong', x: stred.x, y: stred.y + 8, z: stred.z, sila: 0.8 });
      setTimeout(() => this.hra.titulky?.prehraj({ postavy: this.data.postavy, repliky: repliky.filter((r) => r.text) }), 1400);
      break;
    }
  }
}
