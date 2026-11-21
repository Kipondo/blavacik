// Modul: keď hráč príde k pamiatke alebo do pomenovanej oblasti, ukáže jej názov.

export default {
  nazov: 'lokality',
  poradie: 95,

  init(hra) {
    this.aktualna = null;
    this.casKontroly = 0;
    const el = document.createElement('div');
    el.className = 'ui-lokalita';
    el.hidden = true;
    hra.ui.vrstva.appendChild(el);
    this.el = el;
  },

  update(dt, hra) {
    this.casKontroly -= dt;
    if (this.casKontroly > 0) return;
    this.casKontroly = 0.5;

    const { x, z } = hra.stav.pozicia;
    let naj = null, min = Infinity;
    // pamiatky a pomenované miesta + verejné služby (stanice, nemocnice, úrady…) z modulu označení
    for (const p of hra.stav.miestaSluzieb?.length ? [...hra.mapa.pamiatky, ...hra.stav.miestaSluzieb] : hra.mapa.pamiatky) {
      if (!p.nazov || !p.dosah) continue;
      const d = Math.hypot(p.x - x, p.z - z);
      if (d < p.dosah && d / p.dosah < min) { min = d / p.dosah; naj = p; }
    }
    if (naj !== this.aktualna) {
      this.aktualna = naj;
      if (naj) {
        this.el.textContent = naj.nazov;
        this.el.hidden = false;
        this.el.classList.remove('animuj');
        void this.el.offsetWidth;
        this.el.classList.add('animuj');
        clearTimeout(this.casovac);
        this.casovac = setTimeout(() => { this.el.hidden = true; }, 3500);
      }
    }
  },
};
