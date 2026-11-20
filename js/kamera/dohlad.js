// Modul: skrýva vzdialené objekty (napr. skupiny stromov), aby sa zbytočne nevykresľovali.
// Objekt sa prihlási tak, že má userData.dohlad = { x, z, max } (stred a max. vzdialenosť v m).

export default {
  nazov: 'dohlad',
  poradie: 60,

  init(hra) {
    this.objekty = [];
    hra.scena.traverse((o) => { if (o.userData.dohlad) this.objekty.push(o); });
    this.cas = 0;
  },

  updateVzdy(dt, hra) {
    this.cas -= dt;
    if (this.cas > 0) return;
    this.cas = 0.25;
    const { x, z } = hra.kamera.position;
    for (const o of this.objekty) {
      const d = o.userData.dohlad;
      o.visible = Math.hypot(d.x - x, d.z - z) < d.max;
    }
  },
};
