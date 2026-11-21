// Klik v menu.

export function klik(z) {
  if (!z.miesto(0.1)) return;
  const c = z.ctx, t = c.currentTime;
  const o = c.createOscillator(), g = c.createGain();
  o.type = 'triangle';
  o.frequency.setValueAtTime(1500, t); o.frequency.exponentialRampToValueAtTime(900, t + 0.04);
  g.gain.setValueAtTime(0.12, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
  o.connect(g); g.connect(z.vystup()); o.start(t); o.stop(t + 0.07);
}
