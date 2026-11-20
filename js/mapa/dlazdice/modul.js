// Modul: každý snímok posunie streamovanie dlaždíc mesta podľa polohy hráča
// a stred horizontu (vzdialený terén sa okolo hráča nevykresľuje).

export default {
  nazov: 'dlazdice',
  poradie: 55,

  updateVzdy(dt, hra) {
    const sprava = hra.mapa?.dlazdice;
    if (!sprava) return;
    const { x, z } = hra.stav.pozicia;
    sprava.update(x, z, performance.now() / 1000);
    hra.mapa.horizont?.userData.nastavStred(x, z);
  },
};
