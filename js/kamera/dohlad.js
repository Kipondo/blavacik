// Modul: skrýva vzdialené objekty (napr. skupiny stromov, pamiatky), aby sa zbytočne nevykresľovali.
// Objekt sa prihlási tak, že má userData.dohlad = { x, z, max, r } (stred, max. vzdialenosť v m, polomer objektu).
// Objekt sa skryje aj za koncom hmly (hra.stav.dohlad, js/grafika/kvalita.js) – to, čo je celé v hmle, netreba kresliť.
// Objekty v dlaždiciach mesta sa prihlásia pri načítaní dlaždice a odhlásia pri jej uvoľnení.

const zober = (koren, vynechaj) => {
  const z = [];
  const prejdi = (o) => {
    if (vynechaj?.has(o)) return;
    if (o.userData.dohlad) z.push(o);
    for (const c of o.children) prejdi(c);
  };
  prejdi(koren);
  return z;
};

export default {
  nazov: 'dohlad',
  poradie: 60,

  init(hra) {
    this.skupiny = new Map(); // kľúč dlaždice (globálne objekty: '') → objekty
    const aktivne = hra.mapa?.dlazdice?.aktivne ?? new Map();
    this.skupiny.set('', zober(hra.scena, new Set([...aktivne.values()].map((a) => a.objekt))));
    for (const [kluc, a] of aktivne) this.skupiny.set(kluc, zober(a.objekt));
    hra.na('dlazdica-nacitana', ({ kluc, objekt }) => this.skupiny.set(kluc, zober(objekt)));
    hra.na('dlazdica-uvolnena', ({ kluc }) => this.skupiny.delete(kluc));
    hra.na('kvalita', () => { this.cas = 0; });
    this.cas = 0;
  },

  updateVzdy(dt, hra) {
    this.cas -= dt;
    if (this.cas > 0) return;
    this.cas = 0.25;
    const { x, z } = hra.kamera.position;
    const hmla = hra.stav.dohlad ?? Infinity;
    for (const objekty of this.skupiny.values()) {
      for (const o of objekty) {
        const d = o.userData.dohlad;
        o.visible = Math.hypot(d.x - x, d.z - z) < Math.min(d.max ?? Infinity, hmla + (d.r ?? 40));
      }
    }
  },
};
