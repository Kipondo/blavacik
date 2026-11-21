// Gong pred hlásením (vlak, stanica): tri mäkké tóny zostupne.

export function gong(z) {
  if (!z.miesto(2.5)) return;
  const c = z.ctx, out = z.vystup();
  [[784, 0], [659, 0.42], [523, 0.84]].forEach(([f, d]) => {
    const t = c.currentTime + d;
    for (const [k, a] of [[1, 0.16], [2, 0.04], [3, 0.015]]) {
      const o = c.createOscillator(), g = c.createGain();
      o.frequency.value = f * k;
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(a, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0008, t + 1.4);
      o.connect(g); g.connect(out); o.start(t); o.stop(t + 1.5);
    }
  });
}
