// Modul: trakčné vedenie električiek a trolejbusov – drôty, stĺpy s ramenami (js/mapa/trakcia/vedenie.js).
// Stavia sa s každou podrobnou dlaždicou (udalosť 'dlazdica-nacitana'), patrí objektu dlaždice a uvoľní sa s ňou.
// Električky: koľaje typu 'elektricka' z dát dlaždice. Trolejbusy: trasy denných liniek typu 'trolejbus'
// z data/mhd/ (index.json + trasy/*.json) – načítajú sa raz pri štarte, dlaždice čakajúce na ne sa postavia potom.

import { postavVedenie } from './vedenie.js';
import { bodVPolygone } from '../geometria.js';

const BUNKA = 250;          // m – mriežka úsekov trás trolejbusov
const VELKOST_DLAZDICE = 500;

export default {
  nazov: 'trakcia',
  poradie: 61,

  init(hra) {
    this.hra = hra;
    this.trolej = new Map();     // "i,j" → [{ ax, az, bx, bz }]
    this.nacitane = false;
    this.cakajuce = new Set();
    const sprava = hra.mapa?.dlazdice;
    if (!sprava) return;
    const pridaj = ({ kluc, uroven, data, objekt }) => {
      if (uroven !== 'detail' || !objekt || !data || objekt.getObjectByName('trakcia')) return;
      if (!this.nacitane) { this.cakajuce.add(kluc); return; }
      try { this.postav(kluc, data, objekt); } catch (e) { console.warn('Trakcia:', e); }
    };
    for (const [kluc, a] of sprava.aktivne) pridaj({ kluc, uroven: a.uroven, data: a.data, objekt: a.objekt });
    hra.na('dlazdica-nacitana', pridaj);
    this.nacitajTrasy().finally(() => {
      this.nacitane = true;
      for (const kluc of this.cakajuce) {
        const a = sprava.aktivne.get(kluc);
        if (a) pridaj({ kluc, uroven: a.uroven, data: a.data, objekt: a.objekt });
      }
      this.cakajuce.clear();
    });
  },

  /** Úseky trás trolejbusov (denné linky – nočné „N“ jazdia aj autobusom tam, kde vedenie nie je). */
  async nacitajTrasy() {
    try {
      const index = await (await fetch('data/mhd/index.json')).json();
      const linky = (index.linky ?? []).filter((l) => l.typ === 'trolejbus' && !/^N/.test(l.linka));
      const subory = await Promise.all(linky.map((l) => fetch(`data/mhd/trasy/${l.subor}.json`)
        .then((r) => (r.ok ? r.json() : null)).catch(() => null)));
      for (const s of subory) {
        for (const t of s?.trasy ?? []) {
          for (let i = 1; i < (t.body?.length ?? 0); i++) {
            const [ax, az] = t.body[i - 1], [bx, bz] = t.body[i];
            const u = { ax, az, bx, bz };
            const bunky = new Set();
            const l = Math.hypot(bx - ax, bz - az);
            for (let d = 0; d <= l; d += BUNKA / 4) {
              const x = ax + (bx - ax) * (l ? d / l : 0), z = az + (bz - az) * (l ? d / l : 0);
              bunky.add(`${Math.floor(x / BUNKA)},${Math.floor(z / BUNKA)}`);
            }
            bunky.add(`${Math.floor(bx / BUNKA)},${Math.floor(bz / BUNKA)}`);
            for (const k of bunky) {
              if (!this.trolej.has(k)) this.trolej.set(k, []);
              this.trolej.get(k).push(u);
            }
          }
        }
      }
    } catch (e) {
      console.warn('Trakcia: trasy trolejbusov sa nepodarilo načítať', e);
    }
  },

  postav(kluc, data, objekt) {
    const hra = this.hra;
    let rect = null;
    objekt.traverse((o) => { if (!rect && o.name === 'zem' && o.userData.rect) rect = o.userData.rect; });
    if (!rect) {
      const [i, j] = kluc.split('_').map(Number);
      rect = { minX: i * VELKOST_DLAZDICE, maxX: (i + 1) * VELKOST_DLAZDICE, minZ: j * VELKOST_DLAZDICE, maxZ: (j + 1) * VELKOST_DLAZDICE };
    }
    // úseky trolejbusov v bunkách, ktoré dlaždica prekrýva (bez duplikátov)
    const trolej = new Set();
    for (let i = Math.floor(rect.minX / BUNKA); i <= Math.floor((rect.maxX - 0.01) / BUNKA); i++) {
      for (let j = Math.floor(rect.minZ / BUNKA); j <= Math.floor((rect.maxZ - 0.01) / BUNKA); j++) {
        for (const u of this.trolej.get(`${i},${j}`) ?? []) trolej.add(u);
      }
    }
    const kol = hra.mapa.kolizie;
    const vDome = (x, z) => {
      for (const p of kol?.vOkoli(x, z, 0.3) ?? []) {
        if (p.typ !== 'polygon' || (p.info?.typ !== 'budova' && p.info?.typ !== 'pamiatka')) continue;
        if (x < p.minX || x > p.maxX || z < p.minZ || z > p.maxZ) continue;
        if (bodVPolygone(x, z, p.body)) return true;
      }
      return false;
    };
    const mostovka = (x, z) => {
      const t = hra.mapa.vyska(x, z);
      for (const dy of [2, 5, 8, 11]) { const m = hra.mosty?.vyska(x, z, t + dy); if (m !== null && m !== undefined) return m; }
      return null;
    };
    const g = postavVedenie({
      data, trolej: [...trolej], rect,
      vyska: (x, z) => hra.mapa.vyska(x, z), mostovka, vDome,
      kolizie: kol?.preDlazdicu?.(kluc) ?? null,
    });
    if (g) objekt.add(g);
  },
};
