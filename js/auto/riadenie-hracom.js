// Modul: keď hráč sedí v aute, prenáša ovládanie (klávesnica / joystick) na auto.

export default {
  nazov: 'riadenie-hracom',
  poradie: 15, // pred fyzikou áut

  update(dt, hra) {
    const auto = hra.stav.auto;
    if (!auto) return;
    const p = hra.vstup.pohyb();
    auto.ovladanie = {
      plyn: p.y,
      zatacanie: p.x,
      rucna: hra.vstup.drzi('rucna'),
    };
  },
};
