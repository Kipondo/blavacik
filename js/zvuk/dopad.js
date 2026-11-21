// Skok (krátky nádych šumu) a dopad (úder a šuchot).

export function skok(z) {
  if (!z.miesto(0.2)) return;
  const c = z.ctx, t = c.currentTime;
  const s = z.zdrojSumu(), f = c.createBiquadFilter(), g = c.createGain();
  f.type = 'highpass'; f.frequency.value = 1500;
  g.gain.setValueAtTime(0.0, t); g.gain.linearRampToValueAtTime(0.06, t + 0.03); g.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
  s.connect(f); f.connect(g); g.connect(z.vystup());
  s.start(t, Math.random()); s.stop(t + 0.18);
}

export function dopad(z, sila = 1) {
  if (!z.miesto(0.3)) return;
  const c = z.ctx, t = c.currentTime;
  const o = c.createOscillator(), go = c.createGain();
  o.frequency.setValueAtTime(95, t); o.frequency.exponentialRampToValueAtTime(40, t + 0.12);
  go.gain.setValueAtTime(0.45 * sila, t); go.gain.exponentialRampToValueAtTime(0.001, t + 0.16);
  o.connect(go); go.connect(z.vystup());
  o.start(t); o.stop(t + 0.18);
  const s = z.zdrojSumu(), f = c.createBiquadFilter(), g = c.createGain();
  f.type = 'bandpass'; f.frequency.value = 1400; f.Q.value = 0.8;
  g.gain.setValueAtTime(0.18 * sila, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
  s.connect(f); f.connect(g); g.connect(z.vystup());
  s.start(t, Math.random()); s.stop(t + 0.15);
}
