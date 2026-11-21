// Modul: ukazovateľ výkonu (klávesa F3) – snímky za sekundu, priemerný a najhorší čas snímky,
// počet volaní kreslenia, trojuholníky a rozlíšenie kreslenia (automatické, js/grafika/rozlisenie.js).
// Pomáha zistiť, či hra seká stále (grafická karta) alebo len občas (načítanie mesta).

export default {
  nazov: 'vykon',
  poradie: 999,

  init(hra) {
    this.el = document.createElement('div');
    this.el.className = 'vykon';
    Object.assign(this.el.style, {
      position: 'fixed', left: '8px', bottom: '8px', zIndex: 50, display: 'none',
      font: '12px/1.4 ui-monospace, monospace', color: '#e8f0e8', background: 'rgba(0,0,0,0.55)',
      padding: '6px 9px', borderRadius: '6px', pointerEvents: 'none', whiteSpace: 'pre',
    });
    document.body.appendChild(this.el);
    this.casy = [];
    this.posledny = performance.now();
    this.cas = 0;
    window.addEventListener('keydown', (e) => {
      if (e.code !== 'F3') return;
      e.preventDefault();
      this.el.style.display = this.el.style.display === 'none' ? 'block' : 'none';
    });
  },

  updateVzdy(dt, hra) {
    const teraz = performance.now();
    this.casy.push(teraz - this.posledny);
    this.posledny = teraz;
    this.cas += dt;
    if (this.cas < 0.5 || this.el.style.display === 'none') { if (this.casy.length > 240) this.casy.splice(0, 120); return; }
    this.cas = 0;
    const c = this.casy.splice(0);
    const sucet = c.reduce((a, b) => a + b, 0), max = Math.max(...c);
    const info = hra.renderer.info.render;
    const rozl = Math.round((hra.stav.rozlisenie ?? 1) * 100);
    this.el.textContent =
      `${Math.round((1000 * c.length) / sucet)} snímok/s   ${(sucet / c.length).toFixed(1)} ms (najhorší ${max.toFixed(0)} ms)\n` +
      `kreslenia ${info.calls}   trojuholníky ${(info.triangles / 1e6).toFixed(2)} mil.   rozlíšenie ${rozl} %`;
  },
};
