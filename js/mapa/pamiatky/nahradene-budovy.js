// Budovy z dlaždíc mesta, ktoré nahrádza podrobný model pamiatky (výškové budovy, mosty…).
// Pamiatka pri stavbe zaregistruje svoj pôdorys (nahradBudovy) a správca dlaždíc z načítaných
// dát vyhodí každú bežnú budovu, ktorej stred leží v niektorom registrovanom pôdoryse
// (bezNahradenych). Pamiatky sa stavajú pred prvou dlaždicou, takže sa nič nezdvojí.

const zony = [];

/** Zaregistruje pôdorys [[x, z], …] (svet hry); okraj zväčší zónu o pár metrov. */
export function nahradBudovy(body, okraj = 1) {
  let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
  for (const [x, z] of body) {
    minX = Math.min(minX, x); maxX = Math.max(maxX, x);
    minZ = Math.min(minZ, z); maxZ = Math.max(maxZ, z);
  }
  zony.push({ body, okraj, minX: minX - okraj, maxX: maxX + okraj, minZ: minZ - okraj, maxZ: maxZ + okraj });
}

function vPolygone(x, z, body) {
  let c = false;
  for (let i = 0, j = body.length - 1; i < body.length; j = i++) {
    const [xi, zi] = body[i], [xj, zj] = body[j];
    if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) c = !c;
  }
  return c;
}

function vzdialenostOdHrany(x, z, body) {
  let d = Infinity;
  for (let i = 0, j = body.length - 1; i < body.length; j = i++) {
    const [ax, az] = body[j], [bx, bz] = body[i];
    const dx = bx - ax, dz = bz - az, l2 = dx * dx + dz * dz || 1e-9;
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / l2));
    d = Math.min(d, Math.hypot(x - ax - t * dx, z - az - t * dz));
  }
  return d;
}

/** Leží bod v niektorej nahradenej zóne (vrátane okraja)? */
export function jeNahradene(x, z) {
  for (const n of zony) {
    if (x < n.minX || x > n.maxX || z < n.minZ || z > n.maxZ) continue;
    if (vPolygone(x, z, n.body) || vzdialenostOdHrany(x, z, n.body) < n.okraj) return true;
  }
  return false;
}

/** Leží bod priamo v pôdoryse niektorej nahradenej zóny (bez okraja)? */
export function vNahradenom(x, z) {
  for (const n of zony) {
    if (x < n.minX || x > n.maxX || z < n.minZ || z > n.maxZ) continue;
    if (vPolygone(x, z, n.body)) return true;
  }
  return false;
}

/** Zoznam budov dlaždice bez tých, ktoré nahrádza model pamiatky. */
export function bezNahradenych(budovy) {
  if (!zony.length || !budovy?.length) return budovy;
  return budovy.filter((b) => {
    let x = 0, z = 0;
    for (const [bx, bz] of b.body) { x += bx; z += bz; }
    return !jeNahradene(x / b.body.length, z / b.body.length);
  });
}

// Najvyšší strom, ktorý berieme z lasera – vyššie „koruny“ sú strechy výškových budov (issue #71).
const MAX_VYSKA_STROMU = 30;

/**
 * Stromy dlaždice bez tých, ktoré ležia v pôdoryse modelu pamiatky (laser by z jej strechy a stien
 * spravil korunu – napr. 44 m strom v Manderláku) a bez nereálne vysokých stromov z lasera.
 * Formát stromu: [x, z, mierka] alebo z lasera [x, z, mierka, výška, polomer].
 */
export function bezStromovVNahradenych(stromy) {
  if (!stromy?.length) return stromy;
  return stromy.filter((s) => {
    if (s.length >= 4 && s[3] > MAX_VYSKA_STROMU) return false;
    for (const n of zony) {
      if (s[0] < n.minX || s[0] > n.maxX || s[1] < n.minZ || s[1] > n.maxZ) continue;
      // laser často „vidí“ strom aj tesne pri stene (okraj strechy) – berieme aj meter za hranou
      if (vPolygone(s[0], s[1], n.body) || vzdialenostOdHrany(s[0], s[1], n.body) < n.okraj + 1) return false;
    }
    return true;
  });
}
