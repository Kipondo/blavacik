// Modul: každý snímok posunie streamovanie dlaždíc mesta podľa polohy hráča
// a stred horizontu (vzdialený terén sa okolo hráča nevykresľuje).
// Hotovú dlaždicu pred ukázaním pripraví pre grafickú kartu (pripravit-dlazdicu.js), aby hra nesekala.

import { pripravNaKreslenie } from './pripravit-dlazdicu.js';

export default {
  nazov: 'dlazdice',
  poradie: 55,

  init(hra) {
    const sprava = hra.mapa?.dlazdice;
    if (sprava && hra.renderer) sprava.priprav = (objekt) => pripravNaKreslenie(hra.renderer, objekt, hra.kamera, hra.scena);
  },

  updateVzdy(dt, hra) {
    const sprava = hra.mapa?.dlazdice;
    if (!sprava) return;
    const { x, z } = hra.stav.pozicia;
    sprava.update(x, z, performance.now() / 1000);
    hra.mapa.horizont?.userData.nastavStred(x, z);
  },
};
