// Klaksón (dva tóny ako bežná dvojtónová húkačka, cez pásmovú priepust).

export class Klaxon {
  constructor(z, poz = null) {
    this.z = z;
    const c = z.ctx;
    this.g = c.createGain(); this.g.gain.value = 0;
    const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 900; f.Q.value = 1.2;
    f.connect(this.g); this.g.connect(z.vystup(poz, 'zvuky', 3));
    this.o = [415, 523].map((fr) => { const o = c.createOscillator(); o.type = 'square'; o.frequency.value = fr; o.connect(f); o.start(); return o; });
    this.zapnuty = false;
  }
  nastav(zapnuty) {
    if (zapnuty === this.zapnuty) return;
    this.zapnuty = zapnuty;
    this.g.gain.setTargetAtTime(zapnuty ? 0.16 : 0, this.z.ctx.currentTime, 0.015);
  }
  stop() {
    this.g.gain.setTargetAtTime(0, this.z.ctx.currentTime, 0.02);
    for (const o of this.o) o.stop(this.z.ctx.currentTime + 0.2);
  }
}
