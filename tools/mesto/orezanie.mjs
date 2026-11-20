// Orezanie čiar a polygónov na obdĺžnik (dlaždicu).

/** Lomená čiara → kúsky vnútri obdĺžnika (Liang–Barsky pre každý úsek, súvislé úseky sa spoja). */
export function orezCiaru(body, r) {
  const kusy = [];
  let aktualny = null;
  for (let k = 0; k < body.length - 1; k++) {
    const u = orezUsek(body[k], body[k + 1], r);
    if (!u) { aktualny = null; continue; }
    const [a, b] = u;
    if (aktualny && aktualny[aktualny.length - 1][0] === a[0] && aktualny[aktualny.length - 1][1] === a[1]) {
      aktualny.push(b);
    } else {
      aktualny = [a, b];
      kusy.push(aktualny);
    }
    // ak úsek opúšťa obdĺžnik, ďalší kus začne nanovo
    if (b[0] !== body[k + 1][0] || b[1] !== body[k + 1][1]) aktualny = null;
  }
  return kusy;
}

function orezUsek([ax, az], [bx, bz], r) {
  let t0 = 0, t1 = 1;
  const dx = bx - ax, dz = bz - az;
  const p = [-dx, dx, -dz, dz];
  const q = [ax - r.minX, r.maxX - ax, az - r.minZ, r.maxZ - az];
  for (let i = 0; i < 4; i++) {
    if (p[i] === 0) { if (q[i] < 0) return null; continue; }
    const t = q[i] / p[i];
    if (p[i] < 0) { if (t > t1) return null; if (t > t0) t0 = t; }
    else { if (t < t0) return null; if (t < t1) t1 = t; }
  }
  const a = t0 === 0 ? [ax, az] : [ax + dx * t0, az + dz * t0];
  const b = t1 === 1 ? [bx, bz] : [ax + dx * t1, az + dz * t1];
  return [a, b];
}

/** Polygón → orezaný polygón (Sutherland–Hodgman; na kreslenie plôch stačí). */
export function orezPolygon(body, r) {
  let vystup = body;
  const hrany = [
    (p) => p[0] >= r.minX, (p) => p[0] <= r.maxX, (p) => p[1] >= r.minZ, (p) => p[1] <= r.maxZ,
  ];
  const priesecnik = [
    (a, b) => [r.minX, a[1] + ((b[1] - a[1]) * (r.minX - a[0])) / (b[0] - a[0])],
    (a, b) => [r.maxX, a[1] + ((b[1] - a[1]) * (r.maxX - a[0])) / (b[0] - a[0])],
    (a, b) => [a[0] + ((b[0] - a[0]) * (r.minZ - a[1])) / (b[1] - a[1]), r.minZ],
    (a, b) => [a[0] + ((b[0] - a[0]) * (r.maxZ - a[1])) / (b[1] - a[1]), r.maxZ],
  ];
  for (let h = 0; h < 4; h++) {
    const vstup = vystup;
    vystup = [];
    if (!vstup.length) break;
    for (let i = 0; i < vstup.length; i++) {
      const a = vstup[(i + vstup.length - 1) % vstup.length], b = vstup[i];
      const aIn = hrany[h](a), bIn = hrany[h](b);
      if (bIn) {
        if (!aIn) vystup.push(priesecnik[h](a, b));
        vystup.push(b);
      } else if (aIn) {
        vystup.push(priesecnik[h](a, b));
      }
    }
  }
  return vystup;
}
