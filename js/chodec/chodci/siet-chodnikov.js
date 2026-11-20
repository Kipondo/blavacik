// Sieť chodníkov pre chodcov – skladá sa za behu z načítaných podrobných dlaždíc
// (chodníky, pešie zóny, schody z OSM) + námestia (plochy dlažby), po ktorých sa dá voľne prechádzať.

const PRE_CHODCOV = new Set(['footway', 'pedestrian', 'path', 'steps', 'platform', 'living_street']);
const klucBodu = (x, z) => `${Math.round(x * 10)},${Math.round(z * 10)}`;

export class SietChodnikov {
  constructor() {
    this.uzly = new Map();
    this.hrany = new Set();
    this.namestia = new Set();
    this.dlazdice = new Map(); // kľúč → { hrany, namestia }
  }

  _uzol(x, z) {
    const k = klucBodu(x, z);
    let u = this.uzly.get(k);
    if (!u) { u = { k, x, z, hrany: [] }; this.uzly.set(k, u); }
    return u;
  }

  pridajDlazdicu(kluc, chodniky, pokryvka) {
    if (this.dlazdice.has(kluc)) this.odoberDlazdicu(kluc);
    const hrany = [], namestia = [];
    for (const c of chodniky ?? []) {
      if (!PRE_CHODCOV.has(c.typ) || c.body.length < 2) continue;
      const sirka = Math.max(1.2, c.sirka ?? 2.5);
      for (let i = 0; i < c.body.length - 1; i++) {
        const [ax, az] = c.body[i], [bx, bz] = c.body[i + 1];
        const dlzka = Math.hypot(bx - ax, bz - az);
        if (dlzka < 0.1) continue;
        const a = this._uzol(ax, az), b = this._uzol(bx, bz);
        const h = { a, b, dlzka, sirka, typ: c.typ, ux: (bx - ax) / dlzka, uz: (bz - az) / dlzka, zmazana: false };
        a.hrany.push(h); b.hrany.push(h);
        hrany.push(h); this.hrany.add(h);
      }
    }
    for (const p of pokryvka ?? []) {
      if (p.k !== 'dlazba' || p.body.length < 3) continue;
      let plocha = 0, minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
      for (let i = 0, j = p.body.length - 1; i < p.body.length; j = i++) {
        const [xi, zi] = p.body[i], [xj, zj] = p.body[j];
        plocha += (xj + xi) * (zj - zi);
        minX = Math.min(minX, xi); maxX = Math.max(maxX, xi); minZ = Math.min(minZ, zi); maxZ = Math.max(maxZ, zi);
      }
      plocha = Math.abs(plocha / 2);
      if (plocha < 150) continue;
      const n = { body: p.body, plocha, minX, maxX, minZ, maxZ, cx: (minX + maxX) / 2, cz: (minZ + maxZ) / 2, zmazana: false };
      namestia.push(n); this.namestia.add(n);
    }
    this.dlazdice.set(kluc, { hrany, namestia });
  }

  odoberDlazdicu(kluc) {
    const d = this.dlazdice.get(kluc);
    if (!d) return;
    for (const h of d.hrany) {
      h.zmazana = true;
      this.hrany.delete(h);
      for (const u of [h.a, h.b]) {
        u.hrany.splice(u.hrany.indexOf(h), 1);
        if (!u.hrany.length) this.uzly.delete(u.k);
      }
    }
    for (const n of d.namestia) { n.zmazana = true; this.namestia.delete(n); }
    this.dlazdice.delete(kluc);
  }
}

/** Je bod vnútri mnohouholníka? */
export function vnutri(body, x, z) {
  let dnu = false;
  for (let i = 0, j = body.length - 1; i < body.length; j = i++) {
    const [xi, zi] = body[i], [xj, zj] = body[j];
    if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) dnu = !dnu;
  }
  return dnu;
}

/** Náhodný bod na námestí (alebo null). */
export function nahodnyBod(n, r = Math.random) {
  for (let k = 0; k < 12; k++) {
    const x = n.minX + (n.maxX - n.minX) * r(), z = n.minZ + (n.maxZ - n.minZ) * r();
    if (vnutri(n.body, x, z)) return [x, z];
  }
  return null;
}
