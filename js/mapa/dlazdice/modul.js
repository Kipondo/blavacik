// Modul: každý snímok posunie streamovanie dlaždíc mesta podľa polohy hráča.
// Hotovú dlaždicu pred ukázaním pripraví pre grafickú kartu (pripravit-dlazdicu.js), aby hra nesekala.
// Horizontu (vzdialený terén) oznamuje, kde stojí podrobná dlaždica so zemou – tam sa nekreslí; kde ešte nie je,
// ostáva horizont (žiadna diera do hmly po dlhom presune).

import { pripravNaKreslenie } from './pripravit-dlazdicu.js';

export default {
  nazov: 'dlazdice',
  poradie: 55,

  init(hra) {
    const sprava = hra.mapa?.dlazdice;
    if (sprava && hra.renderer) sprava.priprav = (objekt) => pripravNaKreslenie(hra.renderer, objekt, hra.kamera, hra.scena);
    // dlhý presun (teleport, MHD): podrobné dlaždice okolo nového miesta sa dostavajú hneď
    if (sprava) {
      hra.na('teleport', ({ x, z }) => {
        if (Math.hypot(x - sprava.stred.x, z - sprava.stred.z) > 400) sprava.dostavOkolie(x, z);
      });
    }
    const horizont = hra.mapa?.horizont;
    if (sprava && horizont?.userData.nastavDetail) {
      for (const [kluc, a] of sprava.aktivne) horizont.userData.nastavDetail(kluc, a.uroven === 'detail');
      hra.na('dlazdica-nacitana', ({ kluc, uroven }) => horizont.userData.nastavDetail(kluc, uroven === 'detail'));
      hra.na('dlazdica-uvolnena', ({ kluc, uroven }) => { if (uroven === 'detail') horizont.userData.nastavDetail(kluc, false); });
    }
  },

  updateVzdy(dt, hra) {
    const sprava = hra.mapa?.dlazdice;
    if (!sprava) return;
    const { x, z } = hra.stav.pozicia;
    sprava.update(x, z, performance.now() / 1000);
  },
};
