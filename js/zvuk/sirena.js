// Siréna policajného auta (stúpanie a klesanie tónu). Priestorová – posúva sa s autom.

export class Sirena {
  constructor(z, poz) {
    this.z = z;
    const c = z.ctx;
    this.panner = z.vystup(poz, 'zvuky', 6);
    this.g = c.createGain(); this.g.gain.value = 0.15;
    this.o = c.createOscillator(); this.o.type = 'sawtooth';
    const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 2400;
    const lfo = c.createOscillator(), lfoG = c.createGain();
    lfo.frequency.value = 0.28; lfoG.gain.value = 330;
    this.o.frequency.value = 930;
    lfo.connect(lfoG); lfoG.connect(this.o.frequency);
    this.o.connect(f); f.connect(this.g); this.g.connect(this.panner);
    this.o.start(); lfo.start();
    this.lfo = lfo;
  }
  posun(x, y, z) {
    const p = this.panner;
    if (p.positionX) { const t = this.z.ctx.currentTime; p.positionX.setTargetAtTime(x, t, 0.05); p.positionY.setTargetAtTime(y, t, 0.05); p.positionZ.setTargetAtTime(z, t, 0.05); }
    else p.setPosition(x, y, z);
  }
  stop() {
    const t = this.z.ctx.currentTime;
    this.g.gain.setTargetAtTime(0, t, 0.1);
    this.o.stop(t + 0.6); this.lfo.stop(t + 0.6);
  }
}
