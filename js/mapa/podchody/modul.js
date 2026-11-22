// Modul: podchody – chôdza hráča a kamera pod zemou.
// Geometriu stavia dlaždica (js/mapa/dlazdice/postav-dlazdicu.js → geometria.js), tu sa z dát dlaždíc
// pripravia „tuby“ (tuby.js) a zverejní sa:
//   hra.podchody.vyska(x, z, y)        → výška podlahy (schody, chodba pod zemou) alebo null = bežný terén
//   hra.podchody.jePodZemou(poz)       → hráč je v podchode (pod povrchom)
//   hra.podchody.oprav(sx, sz, x, z, y, r) → { x, z } – pod zemou drží hráča v chodbách (kĺže po stenách)
//   hra.podchody.kamera(poz, ciel, hrac) → true, ak kameru upravil (pod zemou ju drží v chodbe pod stropom)
// Používa ich js/chodec/hrac.js a js/kamera/kamera.js (jeden riadok, bez modulu sa správajú ako predtým).

import { pripravTuby, voTube, najdiTubu, VYSKA } from './tuby.js';
import { vytvorPodchody } from './geometria.js';

const POD_ZEMOU = 1.2;      // m pod terénom – odtiaľ je hráč „v podchode“

export default {
  nazov: 'podchody',
  poradie: 6,

  init(hra) {
    this.dlazdice = new Map();        // kluc → tuby
    this.data = new Map();            // kluc → dáta dlaždice (na prepočet pri zmene pochôdznych plôch)
    this.vsetky = [];
    // horný koniec schodov: na pochôdznej ploche tesne nad terénom (nástupište, js/mapa/stanica/) končia schody v jej
    // výške – z podchodu sa na nástupište vyjde plynulo, bez schodíka na hrane
    const vyskaVrchu = (x, z) => {
      const t = hra.mapa.vyskaTerenu(x, z);
      const m = hra.mosty?.vyska(x, z, t + 0.3);
      return m !== null && m !== undefined && m > t && m - t < 0.9 ? m : t;
    };
    const pridaj = (kluc, data, objekt) => {
      if (data?.podchody?.length) {
        const tuby = pripravTuby(data.podchody, hra.mapa.vyskaTerenu, vyskaVrchu);
        this.dlazdice.set(kluc, tuby);
        this.data.set(kluc, data);
        // dlaždica postavila schody po terén – ak niektoré vychádzajú na nástupište, prestavia sa ich geometria
        if (tuby.some((t) => (t.nad ?? 0) > 0.02)) this.prestavGeometriu(hra, kluc, tuby, objekt);
      } else { this.dlazdice.delete(kluc); this.data.delete(kluc); }
      this.vsetky = [...this.dlazdice.values()].flat();
    };
    for (const [kluc, a] of hra.mapa?.dlazdice?.aktivne ?? []) if (a.uroven === 'detail') pridaj(kluc, a.data, a.objekt);
    hra.na('dlazdica-nacitana', ({ kluc, uroven, data, objekt }) => { if (uroven === 'detail') pridaj(kluc, data, objekt); });
    hra.na('dlazdica-uvolnena', ({ kluc, nahrada }) => { if (!nahrada) { this.dlazdice.delete(kluc); this.data.delete(kluc); this.vsetky = [...this.dlazdice.values()].flat(); } });
    // pribudli/zmenili sa pochôdzne plochy (nástupištia) – schody sa prepočítajú (nadjazdy-modul ich už má)
    hra.na('pochodzne-plochy', () => setTimeout(() => { for (const [k, d] of this.data) pridaj(k, d); }, 0));

    const M = this;
    hra.podchody = {
      vyska: (x, z, y) => M.vyska(hra, x, z, y),
      jePodZemou: (p) => M.jePodZemou(hra, p.x, p.z, p.y),
      oprav: (sx, sz, x, z, y, r) => M.oprav(hra, sx, sz, x, z, y, r),
      kamera: (poz, ciel, hrac) => M.kamera(hra, poz, ciel, hrac),
    };
  },

  /** Nahradí skupinu 'podchody' v dlaždici novou geometriou z tub (zábradlie má kolízie už z prvej stavby). */
  prestavGeometriu(hra, kluc, tuby, objekt) {
    objekt ??= hra.mapa?.dlazdice?.aktivne?.get(kluc)?.objekt;
    const stara = objekt?.getObjectByName('podchody');
    if (!stara?.parent) return;
    const nova = vytvorPodchody(tuby, hra.mapa.vyskaTerenu, null).skupina;
    const vzor = stara.children[0];
    nova.traverse((o) => {
      if (!o.isMesh || !vzor) return;
      o.castShadow = vzor.castShadow; o.receiveShadow = vzor.receiveShadow; o.layers.mask = vzor.layers.mask;
    });
    stara.parent.add(nova);
    stara.parent.remove(stara);
    // materiály sú spoločné (geometria.js) – uvoľní sa len geometria
    stara.traverse((o) => o.geometry?.dispose());
  },

  /** Tuby v okolí (bez filtra – v dlaždici ich je málo). */
  blizke(x, z) {
    return this.vsetky.filter((t) => Math.abs(x - (t.ax + t.bx) / 2) < t.dlzka / 2 + t.h + 5 && Math.abs(z - (t.az + t.bz) / 2) < t.dlzka / 2 + t.h + 5);
  },

  jePodZemou(hra, x, z, y) {
    return this.vsetky.length > 0 && y < hra.mapa.vyskaTerenu(x, z) - POD_ZEMOU && (najdiTubu(this.blizke(x, z), x, z, 0)?.okraj ?? Infinity) < 0.5;
  },

  vyska(hra, x, z, y) {
    if (!this.vsetky.length) return null;
    const blizke = this.blizke(x, z);
    if (!blizke.length) return null;
    // schody: len medzi hornou a dolnou hranou (nie v polkruhu pred nimi)
    let naj = null;
    for (const t of blizke) {
      if (t.typ !== 'schody') continue;
      const s = (x - t.ax) * t.ex + (z - t.az) * t.ez;
      if (s < 0 || s > t.dlzka) continue;
      const v = voTube(t, x, z);
      if (v.d > t.h) continue;
      if (naj === null || Math.abs(v.y - y) < Math.abs(naj - y)) naj = v.y;
    }
    if (naj !== null) return naj;
    if (y > hra.mapa.vyskaTerenu(x, z) - POD_ZEMOU) return null;
    const n = najdiTubu(blizke, x, z, 0);
    return n && n.okraj < 0.5 ? n.v.y : null;
  },

  oprav(hra, sx, sz, x, z, y, r) {
    if (!this.vsetky.length || y > hra.mapa.vyskaTerenu(sx, sz) - POD_ZEMOU) return { x, z };
    const blizke = this.blizke(x, z);
    let n = najdiTubu(blizke, x, z, r);
    if (!n) return { x: sx, z: sz };
    if (n.okraj <= 0) return { x, z };
    // kĺzanie po stene: posun k osi najbližšej tuby
    const { t, v } = n;
    const k = (t.h - r) / Math.max(1e-4, v.d);
    const nx = v.qx + (x - v.qx) * k, nz = v.qz + (z - v.qz) * k;
    n = najdiTubu(blizke, nx, nz, r);
    return n && n.okraj <= 0.01 ? { x: nx, z: nz } : { x: sx, z: sz };
  },

  kamera(hra, poz, ciel, hrac) {
    if (!this.vsetky.length || !this.jePodZemou(hra, hrac.x, hrac.z, hrac.y)) return false;
    const blizke = this.blizke(hrac.x, hrac.z);
    for (let t = 1; t >= 0.15; t -= 0.05) {
      const x = ciel.x + (poz.x - ciel.x) * t, y = ciel.y + (poz.y - ciel.y) * t, z = ciel.z + (poz.z - ciel.z) * t;
      const n = najdiTubu(blizke, x, z, 0.35);
      if (!n || n.okraj > 0) continue;
      const strop = n.t.typ === 'schody' ? Infinity : n.v.y + VYSKA - 0.3;
      const yy = Math.min(y, strop);
      if (yy < n.v.y + 0.4) continue;
      poz.set(x, yy, z);
      return true;
    }
    poz.set(ciel.x, Math.min(ciel.y + 0.3, hrac.y + VYSKA - 0.3), ciel.z);
    return true;
  },
};
