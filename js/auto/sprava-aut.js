// Modul: správa všetkých áut – vytvorenie z mapy, fyzika, zrážky áut medzi sebou.
// Pridáva do hry: hra.pridajAuto({x, z, uhol, farba, typ, sluzba}) a hra.odstranAuto(auto) (typy: js/auto/typy-aut.js).

import { Auto } from './auto.js';
import { KONFIG } from '../config.js';
import { nahodnyTyp, nahodnaFarba } from './typy-aut.js';

export default {
  nazov: 'auta',
  poradie: 20,

  init(hra) {
    hra.pridajAuto = (moznosti) => {
      const auto = new Auto(moznosti, KONFIG);
      auto.pozicia.y = hra.mapa.vyska(auto.pozicia.x, auto.pozicia.z);
      auto._aktualizujModel(0, 0, 0);
      hra.scena.add(auto.mesh);
      hra.auta.push(auto);
      return auto;
    };
    hra.odstranAuto = (auto) => {
      if (hra.stav.auto === auto) return; // auto so šoférujúcim hráčom neodstraňujeme
      hra.scena.remove(auto.mesh);
      const i = hra.auta.indexOf(auto);
      if (i >= 0) hra.auta.splice(i, 1);
    };
    // zaparkované autá: typ a farba podľa skutočného zastúpenia (data/doprava/vozidla.json), ak nie sú dané
    for (const a of hra.mapa.data.spawn?.auta ?? []) {
      const typ = a.typ ?? nahodnyTyp('zaparkovane');
      hra.pridajAuto({ ...a, typ, farba: a.typ ? a.farba : nahodnaFarba(typ) });
    }
  },

  update(dt, hra) {
    for (const auto of hra.auta) {
      // auto bez šoféra postupne zastaví
      if (!auto.vodic) auto.ovladanie = { plyn: 0, zatacanie: 0, rucna: auto.rychlostKmh < 2 };
      auto.update(dt, hra.mapa, hra);
    }
    zrazkyAut(hra.auta, KONFIG.AUTO, hra);
  },
};

/** Jednoduché zrážky áut (každé auto = 2 kruhy). */
function zrazkyAut(auta, K, hra) {
  const r2 = K.POLOMER * 2;
  for (let i = 0; i < auta.length; i++) {
    const a = auta[i];
    for (let j = i + 1; j < auta.length; j++) {
      const b = auta[j];
      if (Math.abs(a.pozicia.x - b.pozicia.x) > 7 || Math.abs(a.pozicia.z - b.pozicia.z) > 7) continue;
      for (const ka of a.kruhy()) {
        for (const kb of b.kruhy()) {
          const dx = ka.x - kb.x, dz = ka.z - kb.z;
          const d = Math.hypot(dx, dz);
          if (d >= r2 || d < 1e-4) continue;
          const nx = dx / d, nz = dz / d, prekryv = (r2 - d) / 2;
          a.pozicia.x += nx * prekryv; a.pozicia.z += nz * prekryv;
          b.pozicia.x -= nx * prekryv; b.pozicia.z -= nz * prekryv;
          // výmena hybnosti v smere nárazu
          const va = a.vx * nx + a.vz * nz, vb = b.vx * nx + b.vz * nz;
          const rel = va - vb;
          if (rel < 0) {
            a.vx -= rel * nx * 0.8; a.vz -= rel * nz * 0.8;
            b.vx += rel * nx * 0.8; b.vz += rel * nz * 0.8;
            if (-rel > 4) hra.posli('naraz', { auto: a, ine: b, sila: -rel, nx, nz });
          }
        }
      }
    }
  }
}
