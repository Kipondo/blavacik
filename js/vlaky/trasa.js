// Trasa vlaku ako lomená čiara s dĺžkou po oblúku: bod a smer v danej vzdialenosti, úseky v tuneli.
// Body z data/vlaky/trate.json: [x, z, tunel] (tunel = 1 → úsek, ktorý sa končí v tomto bode, je v tuneli).

export class Trasa {
  /** body: [[x, z, tunel], …]; viac častí sa spojí (spoločný bod sa nezdvojí). */
  constructor(...casti) {
    this.x = []; this.z = []; this.t = []; this.s = [];
    this.hranice = [];       // dĺžka na konci každej časti (bod zastavenia = koniec prvej časti)
    for (const c of casti) {
      for (const [x, z, t] of c) {
        const n = this.x.length;
        if (n && Math.abs(this.x[n - 1] - x) < 0.01 && Math.abs(this.z[n - 1] - z) < 0.01) continue;
        const s = n ? this.s[n - 1] + Math.hypot(x - this.x[n - 1], z - this.z[n - 1]) : 0;
        this.x.push(x); this.z.push(z); this.t.push(t ? 1 : 0); this.s.push(s);
      }
      this.hranice.push(this.s[this.s.length - 1] ?? 0);
    }
    this.dlzka = this.s[this.s.length - 1] ?? 0;
  }

  _index(s) {
    let lo = 0, hi = this.s.length - 1;
    while (hi - lo > 1) {
      const m = (lo + hi) >> 1;
      if (this.s[m] <= s) lo = m; else hi = m;
    }
    return lo;
  }

  /** Bod vo vzdialenosti s (orezané na trasu) → out { x, z, tunel }. */
  bod(s, out = {}) {
    const ss = Math.max(0, Math.min(this.dlzka, s));
    const i = this._index(ss);
    const j = Math.min(i + 1, this.s.length - 1);
    const d = this.s[j] - this.s[i] || 1;
    const u = (ss - this.s[i]) / d;
    out.x = this.x[i] + (this.x[j] - this.x[i]) * u;
    out.z = this.z[i] + (this.z[j] - this.z[i]) * u;
    out.tunel = this.t[j] === 1;
    out.mimo = s < 0 || s > this.dlzka;
    return out;
  }
}
