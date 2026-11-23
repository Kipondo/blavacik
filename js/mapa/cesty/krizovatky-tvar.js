// Tvar križovatky – pravidlá ulice (#136): asfalt presne medzi okrajmi ciest, ktoré sa v križovatke stretajú,
// s oblými rohmi, namiesto kruhu, ktorý presahoval cez okraje ciest (rozliaty „halabala“ tvar na slučkách).
// Ramená = cesty od uzla. Na každom ramene sa po osi cesty (aj keď sa hneď zatáča) prejde vzdialenosť d (polovica
// najširšej cesty + 1 m – tam končí aj značenie), vezmú sa okraje a susedné ramená sa spoja krivkou s vrcholom
// v priesečníku ich okrajov (oblý roh obrubníka). Na vonkajšej strane ohybu (medzi ramenami viac ako pol kruhu)
// je oblý spoj okolo uzla. Spoj dvoch ciest so zlomom (jedna končí, druhá začína) dostane len oblý spoj – inak by
// medzi rovnými koncami pásov ostal klin trávy.
// Bez Three.js – stavia z toho js/mapa/cesty/plochy-krizovatiek.js (asfalt), neskôr aj rohy chodníkov.

const SEGMENTY_ROHU = 5;
const KROK_OBLUKA = 0.3;    // rad na úsek oblého spoja

/** Bod a smer na osi ramena vo vzdialenosti s od uzla. */
function bodRamena(r, s) {
  const b = r.c.body;
  let q = r.i, zost = s;
  while (q + r.smer >= 0 && q + r.smer < b.length) {
    const a = b[q], n = b[q + r.smer];
    const L = Math.hypot(n[0] - a[0], n[1] - a[1]);
    if (L > 1e-6) {
      const tx = (n[0] - a[0]) / L, tz = (n[1] - a[1]) / L;
      if (zost <= L || q + 2 * r.smer < 0 || q + 2 * r.smer >= b.length) {
        const t = Math.min(zost, L);
        return { x: a[0] + tx * t, z: a[1] + tz * t, tx, tz };
      }
      zost -= L;
    }
    q += r.smer;
  }
  return { x: b[r.i][0] + r.ux * s, z: b[r.i][1] + r.uz * s, tx: r.ux, tz: r.uz };
}

/** Ramená uzla k = { x, z, cesty: [{ ci, i }] } – zoradené podľa uhla (smer z bodu aspoň 3 m od uzla). */
export function ramenaKrizovatky(k, cesty) {
  const ramena = [];
  for (const { ci, i } of k.cesty ?? []) {
    const c = cesty[ci];
    if (!c || c.nadjazd || !(c.body?.length > 1)) continue;
    for (const smer of [-1, 1]) {
      let q = i + smer;
      if (q < 0 || q >= c.body.length) continue;
      while (q + smer >= 0 && q + smer < c.body.length && Math.hypot(c.body[q][0] - k.x, c.body[q][1] - k.z) < 3) q += smer;
      const dx = c.body[q][0] - k.x, dz = c.body[q][1] - k.z, L = Math.hypot(dx, dz);
      if (L < 0.01) continue;
      ramena.push({ ux: dx / L, uz: dz / L, w: (c.sirka ?? 6) / 2, c, i, smer, uhol: Math.atan2(dz, dx) });
    }
  }
  return ramena.sort((a, b) => a.uhol - b.uhol);
}

/** Oblý spoj okolo uzla na vonkajšej strane medzi ramenom r a nasledujúcim s (medzera > π). */
function oblySpoj(k, r, s, medzera) {
  const body = [];
  const m = Math.max(2, Math.ceil((medzera - Math.PI) / KROK_OBLUKA));
  for (let j = 0; j <= m; j++) {
    const al = r.uhol + Math.PI / 2 + (medzera - Math.PI) * j / m, rr = r.w + (s.w - r.w) * j / m;
    body.push([k.x + Math.cos(al) * rr, k.z + Math.sin(al) * rr]);
  }
  return body;
}

/**
 * Tvar križovatky: { obrys: [[x, z], …] okolo uzla (v poradí uhlov), rohy: [[[x, z], …], …] – oblé rohy medzi
 * susednými ramenami (od okraja jedného ramena po okraj druhého), d } alebo null.
 */
export function tvarKrizovatky(k, cesty) {
  const ramena = ramenaKrizovatky(k, cesty);
  if (ramena.length < 2) return null;
  const d = Math.max(...ramena.map((r) => r.w)) + 1;
  for (const r of ramena) r.koniec = bodRamena(r, d);
  const okraj = (r, strana) => {
    // strana +1 = okraj smerom k väčšiemu uhlu (normála (−tz, tx)), −1 = k menšiemu
    const p = r.koniec;
    return [p.x - p.tz * r.w * strana, p.z + p.tx * r.w * strana];
  };
  const n = ramena.length;
  // medzery medzi susednými ramenami: roh (oblúk), rovný okraj, oblý spoj, alebo zlúčené ramená
  const medzery = [];
  for (let a = 0; a < n; a++) {
    const r = ramena[a], s = ramena[(a + 1) % n];
    const E = okraj(r, 1), S = okraj(s, -1);
    let medzera = s.uhol - r.uhol;
    if (a === n - 1) medzera += 2 * Math.PI;
    if (medzera >= Math.PI - 0.05) {
      // druhá strana priebežnej cesty: okraj ide rovno; vonkajšia strana ohybu: oblý spoj okolo uzla
      medzery.push({ body: medzera > Math.PI + 0.05 ? oblySpoj(k, r, s, medzera) : [] });
      continue;
    }
    // priesečník vnútorných okrajov: E + t·u_r = S + v·u_s (smery na konci ramien)
    const ur = [r.koniec.tx, r.koniec.tz], us = [s.koniec.tx, s.koniec.tz];
    const det = ur[0] * -us[1] - ur[1] * -us[0];
    if (Math.abs(det) <= 1e-3) { medzery.push({ body: [], roh: [E, S] }); continue; }
    const bx = S[0] - E[0], bz = S[1] - E[1];
    const t = (bx * -us[1] - bz * -us[0]) / det;
    const v = (ur[0] * bz - ur[1] * bx) / det;
    if (t > 0 && v > 0) {
      // ramená pod malým uhlom sa ešte za okrajom tvaru prekrývajú (vidlica) – vnútorné okraje sa vynechajú,
      // tvar ide po vonkajších okrajoch oboch ramien (inak by vznikli „háčiky“ cez seba)
      medzery.push({ zlucene: true, body: [] });
      continue;
    }
    if (!(t < 0 && v < 0 && -t < 2 * d && -v < 2 * d)) { medzery.push({ body: [], roh: [E, S] }); continue; }
    const X = [E[0] + ur[0] * t, E[1] + ur[1] * t];
    const roh = [];
    for (let j = 0; j <= SEGMENTY_ROHU; j++) {
      const u = j / SEGMENTY_ROHU, w = 1 - u;
      roh.push([w * w * E[0] + 2 * w * u * X[0] + u * u * S[0], w * w * E[1] + 2 * w * u * X[1] + u * u * S[1]]);
    }
    medzery.push({ body: roh.slice(1, -1), roh });
  }
  const obrys = [];
  for (let a = 0; a < n; a++) {
    const r = ramena[a];
    if (!medzery[(a + n - 1) % n].zlucene) obrys.push(okraj(r, -1));
    if (!medzery[a].zlucene) obrys.push(okraj(r, 1));
    obrys.push(...medzery[a].body);
  }
  const rohy = medzery.filter((m) => m.roh).map((m) => m.roh);
  return { obrys, rohy, d, ramena };
}

/**
 * Spoje ciest: bod, kde jedna cesta končí a druhá začína (nie križovatka) a smer sa zlomí. Vráti uzly
 * { x, z, cesty: [{ ci, i }] } – tvar im dá tvarSpoja.
 */
export function spojeCiest(cesty, krizovatky) {
  const konce = new Map();
  cesty.forEach((c, ci) => {
    if (c.nadjazd || !(c.body?.length > 1)) return;
    for (const i of [0, c.body.length - 1]) {
      const kl = `${c.body[i][0]},${c.body[i][1]}`;
      if (krizovatky?.has(kl)) continue;
      if (!konce.has(kl)) konce.set(kl, { x: c.body[i][0], z: c.body[i][1], cesty: [], spoj: true });
      konce.get(kl).cesty.push({ ci, i });
    }
  });
  const out = [];
  for (const k of konce.values()) {
    if (k.cesty.length !== 2) continue;
    const r = ramenaKrizovatky(k, cesty);
    if (r.length !== 2) continue;
    const zlom = Math.PI - Math.acos(Math.max(-1, Math.min(1, r[0].ux * r[1].ux + r[0].uz * r[1].uz)));
    if (zlom > 0.05) out.push(k);
  }
  return out;
}

/** Tvar spoja: výsek okolo uzla na vonkajšej strane ohybu { obrys: [uzol, …oblúk] } alebo null. */
export function tvarSpoja(k, cesty) {
  const ramena = ramenaKrizovatky(k, cesty);
  if (ramena.length !== 2) return null;
  let [r, s] = ramena;
  let medzera = s.uhol - r.uhol;
  if (medzera < Math.PI) { [r, s] = [s, r]; medzera = 2 * Math.PI - medzera; }
  if (medzera < Math.PI + 0.05) return null;
  return { obrys: [[k.x, k.z], ...oblySpoj(k, r, s, medzera)], rohy: [] };
}
