// Modul (DOČASNÝ – na prezeranie mesta): presun na miesto kliknuté na veľkej mape.
// Veľká mapa (M, js/ui/minimapa/) pri kliknutí pošle udalosť 'mapa-klik' { x, z }; hráč (alebo auto,
// v ktorom sedí) sa presunie na zem na tom mieste. Ostatným modulom pošle 'teleport' { x, y, z }
// (kamera sa presunie hneď, lietanie si zachová výšku nad zemou).
// Mesto okolo nového miesta sa načíta za pár sekúnd; keď hráč skončí v dome, kolízie ho vytlačia von.

export default {
  nazov: 'teleport',
  poradie: 12,

  init(hra) {
    hra.na('mapa-klik', ({ x, z }) => this.presun(hra, x, z));
  },

  presun(hra, x, z) {
    if (!Number.isFinite(x) || !Number.isFinite(z)) return;
    if (hra.mapa.jeMimo?.(x, z)) { hra.ui.sprava('Tam sa nedá – mimo mapy', 2); return; }
    const y = hra.mapa.vyska(x, z);
    const auto = hra.stav.auto;
    if (auto) {
      auto.pozicia.set(x, y, z);
      auto.vx = 0; auto.vz = 0;
    }
    const h = hra.hrac;
    h.pozicia.set(x, y, z);
    h.vy = 0;
    hra.stav.pozicia.set(x, y, z);
    hra.posli('teleport', { x, y, z });
    hra.ui.sprava('Presun na mapu – mesto sa dočítava…', 2);
  },
};
