// Holub: krátke „vrkútanie“ (sínus s klesajúcim tónom a chvením), priestorovo pri hráčovi.

export function holub(z, poz) {
  if (!z.miesto(1.2)) return;
  const c = z.ctx, out = z.vystup(poz, 'zvuky', 0.6);
  const n = 2 + Math.floor(Math.random() * 2);
  for (let i = 0; i < n; i++) {
    const t = c.currentTime + i * 0.34;
    const o = c.createOscillator(), g = c.createGain(), trem = c.createOscillator(), tg = c.createGain();
    o.frequency.setValueAtTime(520, t); o.frequency.linearRampToValueAtTime(610, t + 0.08); o.frequency.exponentialRampToValueAtTime(430, t + 0.28);
    trem.frequency.value = 28; tg.gain.value = 0.03;
    trem.connect(tg); tg.connect(g.gain);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.05, t + 0.05); g.gain.exponentialRampToValueAtTime(0.0008, t + 0.3);
    o.connect(g); g.connect(out); o.start(t); o.stop(t + 0.32); trem.start(t); trem.stop(t + 0.32);
  }
}
