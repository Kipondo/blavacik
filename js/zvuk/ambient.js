// Ambient mesta: hukot dopravy (hnedý šum, podľa áut v okolí a dennej doby) a vietor (pri Dunaji a vo výške).

export class Ambient {
  constructor(z) {
    this.z = z;
    const c = z.ctx;
    this.doprava = z.zdrojSumu(z.hnedy);
    this.dF = c.createBiquadFilter(); this.dF.type = 'lowpass'; this.dF.frequency.value = 320;
    this.dG = c.createGain(); this.dG.gain.value = 0;
    this.doprava.connect(this.dF); this.dF.connect(this.dG); this.dG.connect(z.vystup());
    this.vietor = z.zdrojSumu();
    this.vF = c.createBiquadFilter(); this.vF.type = 'bandpass'; this.vF.Q.value = 0.6; this.vF.frequency.value = 500;
    this.vG = c.createGain(); this.vG.gain.value = 0;
    this.vietor.connect(this.vF); this.vF.connect(this.vG); this.vG.connect(z.vystup());
    this.doprava.start(); this.vietor.start();
  }

  /** doprava 0–1, vietor 0–1 */
  update(doprava, vietor) {
    const c = this.z.ctx, t = c.currentTime;
    this.dG.gain.setTargetAtTime(0.05 + doprava * 0.16, t, 0.8);
    this.dF.frequency.setTargetAtTime(220 + doprava * 260, t, 0.8);
    // nárazy vetra
    const naraz = 0.6 + 0.4 * Math.sin(t * 0.37) * Math.sin(t * 0.23 + 1);
    this.vG.gain.setTargetAtTime(vietor * 0.09 * naraz, t, 0.6);
    this.vF.frequency.setTargetAtTime(380 + 420 * naraz, t, 0.9);
  }
}
