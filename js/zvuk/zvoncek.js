// Zvonček električky: dve kovové cinknutia (neharmonické alikvoty s rýchlym doznievaním).

export function zvoncek(z, poz = null) {
  if (!z.miesto(1.2)) return;
  const c = z.ctx, out = z.vystup(poz, 'zvuky', 4);
  for (const posun of [0, 0.32]) {
    const t = c.currentTime + posun;
    for (const [k, a] of [[1, 0.2], [2.76, 0.1], [5.4, 0.05], [8.9, 0.025]]) {
      const o = c.createOscillator(), g = c.createGain();
      o.frequency.value = 1180 * k;
      g.gain.setValueAtTime(a, t); g.gain.exponentialRampToValueAtTime(0.0008, t + 0.9 / Math.sqrt(k));
      o.connect(g); g.connect(out); o.start(t); o.stop(t + 1);
    }
  }
}
