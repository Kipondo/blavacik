// Kde je spoj MHD v danej sekunde – čisto z cestovného poriadku, nič sa nesimuluje.
//
// Časy v GTFS sú odchody zo zastávok. Vozidlo preto na zastávku príde o chvíľu skôr, postojí
// s otvorenými dverami a odíde PRESNE v čase z poriadku. Medzi zastávkami sa rozbieha a brzdí
// s konštantným zrýchlením (lichobežníkový priebeh rýchlosti), takže príde presne na čas.

const PRED_ODCHODOM = 40;   // s – koľko stojí vozidlo na výchozej zastávke pred prvým odchodom
const MAX_PRIEMER = 15;     // m/s – pri akej priemernej rýchlosti sa už státie skracuje

/**
 * Stav spoja v čase `cas` (s od odchodu z prvej zastávky; môže byť aj záporný – čaká na výchozej).
 * prof = časy odchodov zo zastávok (s od prvého odchodu), km = poloha zastávok po trase (m).
 * Vráti { km, rychlost (m/s), stoji, zastavka (index zastávky, pri ktorej stojí, inak -1) } alebo null.
 */
export function stavSpoja(prof, km, cas, t) {
  const n = prof.length;
  if (cas < -PRED_ODCHODOM || cas > prof[n - 1]) return null;
  if (cas <= 0) return { km: km[0], rychlost: 0, stoji: true, zastavka: 0 };

  // úsek i: medzi zastávkou i a i+1
  let lo = 0, hi = n - 1;
  while (hi - lo > 1) { const m = (lo + hi) >> 1; if (prof[m] <= cas) lo = m; else hi = m; }
  const i = lo;
  const T = prof[i + 1] - prof[i], L = km[i + 1] - km[i];
  if (T <= 0 || L <= 0) return { km: km[i + 1], rychlost: 0, stoji: true, zastavka: i + 1 };

  // státie na zastávke i+1 pred odchodom (kratšie, ak je úsek „rýchly“)
  let D = Math.min(t.maxStanie, T * 0.3, Math.max(0, T - L / MAX_PRIEMER));
  if (i + 1 === n - 1) D = Math.min(D, 10); // na konečnej len vystúpia
  const Tm = T - D;
  const tau = cas - prof[i];
  if (tau >= Tm) return { km: km[i + 1], rychlost: 0, stoji: true, zastavka: i + 1 };

  const p = profilJazdy(L, Tm, t.zrychlenie);
  return { km: km[i] + p.s(tau), rychlost: p.v(tau), stoji: false, zastavka: -1 };
}

/**
 * Lichobežníkový priebeh: rozbeh so zrýchlením a, jazda rýchlosťou v, brzdenie.
 * Ak to so zrýchlením a nestihne, použije trojuholníkový priebeh s väčším zrýchlením.
 */
export function profilJazdy(L, Tm, a) {
  let v, acc;
  const disk = a * a * Tm * Tm - 4 * a * L;
  if (disk >= 0) { v = (a * Tm - Math.sqrt(disk)) / 2; acc = a; }
  else { acc = (4 * L) / (Tm * Tm); v = (acc * Tm) / 2; }
  const ta = v / acc;
  return {
    s(tau) {
      if (tau <= ta) return 0.5 * acc * tau * tau;
      if (tau >= Tm - ta) { const z = Tm - tau; return L - 0.5 * acc * z * z; }
      return 0.5 * acc * ta * ta + v * (tau - ta);
    },
    v(tau) {
      if (tau <= ta) return acc * tau;
      if (tau >= Tm - ta) return acc * (Tm - tau);
      return v;
    },
  };
}

export { PRED_ODCHODOM };
