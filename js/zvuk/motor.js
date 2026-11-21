// Motor auta, v ktorom sedí hráč: otáčky podľa rýchlosti a prevodového stupňa, zaťaženie podľa plynu.
// Dva oscilátory (zapaľovanie štvorvalca = 2 × otáčky/s) cez skreslenie a dolnú priepust + šum sania.

const PREVODY = [0, 3.6, 2.1, 1.45, 1.1, 0.88];   // kde sa radí: rýchlosť (m/s) na stupeň ~ 9, 15, 22, 30
const RADENIE = [0, 9, 15, 22, 30, 99];

export class Motor {
  constructor(z) {
    this.z = z;
    const c = z.ctx;
    this.out = c.createGain(); this.out.gain.value = 0;
    this.out.connect(z.vystup());
    this.filter = c.createBiquadFilter(); this.filter.type = 'lowpass'; this.filter.Q.value = 2;
    this.skreslenie = c.createWaveShaper();
    const k = new Float32Array(256);
    for (let i = 0; i < 256; i++) { const x = i / 128 - 1; k[i] = Math.tanh(x * 2.2); }
    this.skreslenie.curve = k;
    this.o1 = c.createOscillator(); this.o1.type = 'sawtooth';
    this.o2 = c.createOscillator(); this.o2.type = 'square';
    const g2 = c.createGain(); g2.gain.value = 0.35;
    this.o1.connect(this.skreslenie); this.o2.connect(g2); g2.connect(this.skreslenie);
    this.skreslenie.connect(this.filter); this.filter.connect(this.out);
    // sanie / výfuk: šum cez pásmovú priepust
    this.sum = z.zdrojSumu();
    this.sumF = c.createBiquadFilter(); this.sumF.type = 'bandpass'; this.sumF.Q.value = 1.5;
    this.sumG = c.createGain(); this.sumG.gain.value = 0;
    this.sum.connect(this.sumF); this.sumF.connect(this.sumG); this.sumG.connect(this.out);
    this.o1.start(); this.o2.start(); this.sum.start();
    this.otacky = 850;
    this.stupen = 1;
  }

  /** v – rýchlosť (m/s, so znamienkom), plyn – −1…1 */
  update(dt, v, plyn) {
    const c = this.z.ctx, t = c.currentTime;
    const rv = Math.abs(v);
    while (this.stupen < 5 && rv > RADENIE[this.stupen]) this.stupen++;
    while (this.stupen > 1 && rv < RADENIE[this.stupen - 1] - 2) this.stupen--;
    const ciel = Math.min(6500, 850 + rv * PREVODY[this.stupen] * 160 + Math.max(0, plyn) * (rv < 1 ? 1600 : 500));
    this.otacky += (ciel - this.otacky) * Math.min(1, dt * 6);
    const f = (this.otacky / 60) * 2;
    this.o1.frequency.setTargetAtTime(f, t, 0.03);
    this.o2.frequency.setTargetAtTime(f / 2, t, 0.03);
    const zataz = Math.max(0.15, Math.abs(plyn));
    this.filter.frequency.setTargetAtTime(300 + zataz * 1400 + this.otacky * 0.12, t, 0.05);
    this.sumF.frequency.setTargetAtTime(f * 3, t, 0.05);
    this.sumG.gain.setTargetAtTime(0.05 + zataz * 0.12, t, 0.05);
    this.out.gain.setTargetAtTime(0.09 + zataz * 0.07, t, 0.08);
  }

  stop() {
    const t = this.z.ctx.currentTime;
    this.out.gain.setTargetAtTime(0, t, 0.15);
    for (const s of [this.o1, this.o2, this.sum]) s.stop(t + 0.8);
  }
}

/** Štartér a naskočenie motora. */
export function startMotora(z) {
  if (!z.miesto(1)) return;
  const c = z.ctx, t = c.currentTime;
  const o = c.createOscillator(), g = c.createGain(), f = c.createBiquadFilter();
  o.type = 'sawtooth'; f.type = 'lowpass'; f.frequency.value = 600;
  o.frequency.setValueAtTime(22, t); o.frequency.linearRampToValueAtTime(30, t + 0.5); o.frequency.exponentialRampToValueAtTime(70, t + 0.8);
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.12, t + 0.05); g.gain.setValueAtTime(0.12, t + 0.6); g.gain.exponentialRampToValueAtTime(0.001, t + 0.95);
  o.connect(f); f.connect(g); g.connect(z.vystup());
  o.start(t); o.stop(t + 1);
}
