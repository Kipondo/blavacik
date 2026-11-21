// Pískanie pneumatík pri šmyku (ručná brzda, prudké zatáčanie, brzdenie z rýchlosti).

export class Smyk {
  constructor(z) {
    this.z = z;
    const c = z.ctx;
    this.s = z.zdrojSumu();
    this.f = c.createBiquadFilter(); this.f.type = 'bandpass'; this.f.frequency.value = 1300; this.f.Q.value = 6;
    this.g = c.createGain(); this.g.gain.value = 0;
    this.s.connect(this.f); this.f.connect(this.g); this.g.connect(z.vystup());
    this.s.start();
  }

  /** sila 0–1 (bočná rýchlosť / brzdenie) */
  update(sila) {
    const t = this.z.ctx.currentTime;
    this.g.gain.setTargetAtTime(Math.min(1, sila) * 0.22, t, 0.06);
    this.f.frequency.setTargetAtTime(1100 + sila * 500 + Math.random() * 150, t, 0.05);
  }

  stop() {
    const t = this.z.ctx.currentTime;
    this.g.gain.setTargetAtTime(0, t, 0.05);
    this.s.stop(t + 0.4);
  }
}
