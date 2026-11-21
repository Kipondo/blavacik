// Krok: krátky šum (dlažba ostrejšia, tráva tlmená a dlhšia) a tupý úder päty.

export function krok(z, { povrch = 'dlazba', sila = 1, poz = null } = {}) {
  if (!z.miesto(0.25)) return;
  const c = z.ctx, t = c.currentTime + 0.005;
  const out = z.vystup(poz);
  const g = c.createGain();
  g.connect(out);
  const s = z.zdrojSumu();
  const f = c.createBiquadFilter();
  const trava = povrch === 'trava';
  f.type = trava ? 'lowpass' : 'bandpass';
  f.frequency.value = (trava ? 900 : 2200) * (0.85 + Math.random() * 0.3);
  f.Q.value = trava ? 0.7 : 1.2;
  s.connect(f); f.connect(g);
  const dlzka = trava ? 0.16 : 0.07;
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(0.22 * sila, t + 0.004);
  g.gain.exponentialRampToValueAtTime(0.001, t + dlzka);
  s.start(t, Math.random() * 1.5); s.stop(t + dlzka + 0.02);
  // päta
  const o = c.createOscillator(), go = c.createGain();
  o.frequency.setValueAtTime(trava ? 70 : 110, t);
  o.frequency.exponentialRampToValueAtTime(45, t + 0.06);
  go.gain.setValueAtTime(0.25 * sila, t);
  go.gain.exponentialRampToValueAtTime(0.001, t + 0.07);
  o.connect(go); go.connect(out);
  o.start(t); o.stop(t + 0.09);
}
