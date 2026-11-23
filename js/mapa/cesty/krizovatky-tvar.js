// Tvar križovatky – pravidlá ulice (#136): asfalt presne medzi okrajmi ciest, ktoré sa v križovatke stretajú,
// s oblými rohmi, namiesto kruhu, ktorý presahoval cez okraje ciest (rozliaty „halabala“ tvar na slučkách).
// Ramená = smery ciest od uzla. Na každom ramene sa vezmú okraje vo vzdialenosti d od uzla (polovica najširšej
// cesty + 1 m – tam končí aj značenie) a susedné ramená sa spoja krivkou s vrcholom v priesečníku ich okrajov
// (oblý roh obrubníka). Kde je medzi ramenami viac ako pol kruhu (druhá strana priebežnej cesty), roh nie je.
// Bez Three.js – stavia z toho js/mapa/cesty/plochy-krizovatiek.js (asfalt) a chodniky.js (rohy chodníkov).

const SEGMENTY_ROHU = 5;

/** Ramená križovatky k = { x, z, cesty: [{ ci, i }] } – zoradené podľa uhla. */
export function ramenaKrizovatky(k, cesty) {
  const ramena = [];
  for (const { ci, i } of k.cesty ?? []) {
    const c = cesty[ci];
    if (!c || c.nadjazd || !(c.body?.length > 1)) continue;
    for (const smer of [-1, 1]) {
      let q = i + smer;
      if (q < 0 || q >= c.body.length) continue;
      // smer ramena z bodu aspoň 3 m od uzla (krátky úsek pri uzle by smer pokazil)
      while (q + smer >= 0 && q + smer < c.body.length && Math.hypot(c.body[q][0] - k.x, c.body[q][1] - k.z) < 3) q += smer;
      const dx = c.body[q][0] - k.x, dz = c.body[q][1] - k.z, L = Math.hypot(dx, dz);
      if (L < 0.01) continue;
      ramena.push({ ux: dx / L, uz: dz / L, w: (c.sirka ?? 6) / 2, c, uhol: Math.atan2(dz, dx) });
    }
  }
  return ramena.sort((a, b) => a.uhol - b.uhol);
}

/**
 * Tvar križovatky: { obrys: [[x, z], …] okolo uzla (v poradí uhlov), rohy: [[[x, z], …], …] – oblé rohy medzi
 * susednými ramenami (od okraja jedného ramena po okraj druhého), d } alebo null.
 */
export function tvarKrizovatky(k, cesty) {
  const ramena = ramenaKrizovatky(k, cesty);
  if (ramena.length < 2) return null;
  const d = Math.max(...ramena.map((r) => r.w)) + 1;
  const okraj = (r, strana) => {
    // strana +1 = okraj smerom k väčšiemu uhlu (normála (−uz, ux)), −1 = k menšiemu
    const cx = k.x + r.ux * d, cz = k.z + r.uz * d;
    return [cx - r.uz * r.w * strana, cz + r.ux * r.w * strana];
  };
  const obrys = [];
  const rohy = [];
  const n = ramena.length;
  for (let a = 0; a < n; a++) {
    const r = ramena[a], s = ramena[(a + 1) % n];
    const E = okraj(r, 1), S = okraj(s, -1);
    obrys.push(okraj(r, -1), E);
    let medzera = s.uhol - r.uhol;
    if (a === n - 1) medzera += 2 * Math.PI;
    if (medzera >= Math.PI - 0.05) {
      // druhá strana priebežnej cesty alebo voľný priestor: bez rohu (okraj ide rovno / cez uzol)
      if (medzera > Math.PI + 0.05) obrys.push([k.x, k.z]);
      continue;
    }
    // priesečník okrajov: E + t·u_r = S + v·u_s
    const det = r.ux * -s.uz - r.uz * -s.ux;
    let roh = [E, S];
    if (Math.abs(det) > 1e-3) {
      const bx = S[0] - E[0], bz = S[1] - E[1];
      const t = (bx * -s.uz - bz * -s.ux) / det;
      const X = [E[0] + r.ux * t, E[1] + r.uz * t];
      const v = (r.ux * bz - r.uz * bx) / det;
      if (t < 0 && v < 0 && -t < 2 * d && -v < 2 * d) {
        roh = [];
        for (let j = 0; j <= SEGMENTY_ROHU; j++) {
          const u = j / SEGMENTY_ROHU, w = 1 - u;
          roh.push([w * w * E[0] + 2 * w * u * X[0] + u * u * S[0], w * w * E[1] + 2 * w * u * X[1] + u * u * S[1]]);
        }
      }
    }
    rohy.push(roh);
    for (let j = 1; j < roh.length - 1; j++) obrys.push(roh[j]);
  }
  return { obrys, rohy, d, ramena };
}
