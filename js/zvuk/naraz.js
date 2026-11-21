// Náraz auta: tupý úder, praskot plechu (šum) a niekoľko kovových zazvonení.

export function naraz(z, sila, poz) {
  if (!z.miesto(1.2)) return;
  const c = z.ctx, t = c.currentTime, k = Math.min(1, sila / 15);
  const out = z.vystup(poz, 'zvuky', 2);
  const o = c.createOscillator(), go = c.createGain();
  o.frequency.setValueAtTime(70, t); o.frequency.exponentialRampToValueAtTime(30, t + 0.25);
  go.gain.setValueAtTime(0.7 * k + 0.2, t); go.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
  o.connect(go); go.connect(out); o.start(t); o.stop(t + 0.32);
  const s = z.zdrojSumu(), f = c.createBiquadFilter(), g = c.createGain();
  f.type = 'lowpass'; f.frequency.value = 2500 + 3000 * k;
  g.gain.setValueAtTime(0.5 * k + 0.15, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.35 + 0.3 * k);
  s.connect(f); f.connect(g); g.connect(out); s.start(t, Math.random()); s.stop(t + 0.7);
  for (let i = 0; i < 3; i++) {
    const m = c.createOscillator(), gm = c.createGain(), t0 = t + 0.02 + Math.random() * 0.08;
    m.type = 'triangle'; m.frequency.value = 600 + Math.random() * 1800;
    gm.gain.setValueAtTime(0.08 * (k + 0.3), t0); gm.gain.exponentialRampToValueAtTime(0.001, t0 + 0.4);
    m.connect(gm); gm.connect(out); m.start(t0); m.stop(t0 + 0.45);
  }
}

/** Zabuchnutie dverí auta. */
export function dvere(z, poz = null) {
  if (!z.miesto(0.3)) return;
  const c = z.ctx, t = c.currentTime;
  const o = c.createOscillator(), go = c.createGain();
  o.frequency.setValueAtTime(140, t); o.frequency.exponentialRampToValueAtTime(55, t + 0.1);
  go.gain.setValueAtTime(0.35, t); go.gain.exponentialRampToValueAtTime(0.001, t + 0.14);
  o.connect(go); go.connect(z.vystup(poz)); o.start(t); o.stop(t + 0.16);
  const s = z.zdrojSumu(), f = c.createBiquadFilter(), g = c.createGain();
  f.type = 'bandpass'; f.frequency.value = 900;
  g.gain.setValueAtTime(0.12, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
  s.connect(f); f.connect(g); g.connect(z.vystup(poz)); s.start(t, Math.random()); s.stop(t + 0.1);
}
