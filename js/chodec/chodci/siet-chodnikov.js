// Sieť chodníkov pre chodcov – skladá sa za behu z načítaných podrobných dlaždíc
// (chodníky, pešie zóny, schody z OSM) + námestia (plochy dlažby), po ktorých sa dá voľne prechádzať.
// Chodci nechodia po vozovke ani cez domy: úsek chodníka, ktorý vedie pozdĺž vozovky (nie cez ňu – to je
// prechod) alebo cez dom, sa do siete nepridá; náhodné body na námestiach musia byť mimo vozovky a domov.

const PRE_CHODCOV = new Set(['footway', 'pedestrian', 'path', 'steps', 'platform']);
const BUNKA = 25;
const klucBunky = (i, j) => i * 100003 + j;

/** Je bod v pôdoryse domu alebo pamiatky (z kolízií mapy; lampy, stromy a lavičky sa nerátajú)? */
export function vBudove(kolizie, x, z) {
  if (!kolizie) return false;
  // len bunka mriežky s bodom (dom je zapísaný vo všetkých bunkách, ktoré prekrýva) – bez nových objektov
  // (volá sa často; vOkoli by pri každom volaní vyrobilo novú množinu a zbytočne zaťažilo zber pamäte)
  const zoznam = kolizie.mriezka && kolizie._kluc
    ? kolizie.mriezka.get(kolizie._kluc(Math.floor(x / kolizie.bunka), Math.floor(z / kolizie.bunka))) ?? []
    : kolizie.vOkoli(x, z, 0.1);
  for (const p of zoznam) {
    if (p.typ !== 'polygon' || (p.info?.typ !== 'budova' && p.info?.typ !== 'pamiatka')) continue;
    if (x < p.minX || x > p.maxX || z < p.minZ || z > p.maxZ) continue;
    if (vnutri(p.body, x, z)) return true;
  }
  return false;
}
const klucBodu = (x, z) => `${Math.round(x * 10)},${Math.round(z * 10)}`;

export class SietChodnikov {
  constructor() {
    this.uzly = new Map();
    this.hrany = new Set();
    this.namestia = new Set();
    this.dlazdice = new Map(); // kľúč → { hrany, namestia, vozovka }
    this.kolizie = null;       // kolízie mapy (domy) – nastaví modul
  }

  /** Úseky vozoviek dlaždice v mriežke (os + polovica šírky). */
  _vozovka(cesty) {
    const m = new Map();
    for (const c of cesty ?? []) {
      const pol = (c.sirka ?? 7) / 2;
      for (let i = 1; i < (c.body?.length ?? 0); i++) {
        const [ax, az] = c.body[i - 1], [bx, bz] = c.body[i];
        const u = { ax, az, bx, bz, pol };
        for (let x = Math.floor((Math.min(ax, bx) - pol) / BUNKA); x <= Math.floor((Math.max(ax, bx) + pol) / BUNKA); x++) {
          for (let z = Math.floor((Math.min(az, bz) - pol) / BUNKA); z <= Math.floor((Math.max(az, bz) + pol) / BUNKA); z++) {
            const k = klucBunky(x, z);
            if (!m.has(k)) m.set(k, []);
            m.get(k).push(u);
          }
        }
      }
    }
    return m;
  }

  /**
   * Je bod na vozovke? Vracia smer úseku cesty { ux, uz } alebo null.
   * okraj > 0 = bod musí byť aspoň takto ďaleko od okraja, aby sa nerátal (chodník tesne pri obrubníku je OK).
   */
  naVozovke(x, z, okraj = 0.3) {
    const k = klucBunky(Math.floor(x / BUNKA), Math.floor(z / BUNKA));
    for (const d of this.dlazdice.values()) {
      for (const u of d.vozovka?.get(k) ?? []) {
        const dx = u.bx - u.ax, dz = u.bz - u.az, l2 = dx * dx + dz * dz || 1;
        const t = Math.max(0, Math.min(1, ((x - u.ax) * dx + (z - u.az) * dz) / l2));
        if (Math.hypot(u.ax + dx * t - x, u.az + dz * t - z) < u.pol - okraj) { const l = Math.sqrt(l2); return { ux: dx / l, uz: dz / l }; }
      }
    }
    return null;
  }

  /** Smie tu chodec stáť? (nie na vozovke, nie v dome) */
  jePesie(x, z) {
    return !this.naVozovke(x, z) && !vBudove(this.kolizie, x, z);
  }

  _uzol(x, z) {
    const k = klucBodu(x, z);
    let u = this.uzly.get(k);
    if (!u) { u = { k, x, z, hrany: [] }; this.uzly.set(k, u); }
    return u;
  }

  pridajDlazdicu(kluc, chodniky, pokryvka, cesty) {
    if (this.dlazdice.has(kluc)) this.odoberDlazdicu(kluc);
    const hrany = [], namestia = [];
    const vozovka = this._vozovka(cesty);
    this.dlazdice.set(kluc, { hrany, namestia, vozovka });
    for (const c of chodniky ?? []) {
      if (!PRE_CHODCOV.has(c.typ) || c.body.length < 2) continue;
      const sirka = Math.max(1.2, c.sirka ?? 2.5);
      for (let i = 0; i < c.body.length - 1; i++) {
        const [ax, az] = c.body[i], [bx, bz] = c.body[i + 1];
        const dlzka = Math.hypot(bx - ax, bz - az);
        if (dlzka < 0.1) continue;
        // pozdĺž vozovky nie (cez ňu áno – prechod), cez dom nie
        const mx = (ax + bx) / 2, mz = (az + bz) / 2;
        const v = this.naVozovke(mx, mz, 0.5);
        if (v && Math.abs(((bx - ax) * v.ux + (bz - az) * v.uz) / dlzka) > 0.75) continue;
        if (vBudove(this.kolizie, mx, mz) && vBudove(this.kolizie, ax * 0.75 + bx * 0.25, az * 0.75 + bz * 0.25)) continue;
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
      const n = { body: p.body, plocha, minX, maxX, minZ, maxZ, cx: (minX + maxX) / 2, cz: (minZ + maxZ) / 2, zmazana: false, siet: this };
      namestia.push(n); this.namestia.add(n);
    }
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

/** Náhodný bod na námestí – mimo vozovky a domov (alebo null). */
export function nahodnyBod(n, r = Math.random) {
  for (let k = 0; k < 16; k++) {
    const x = n.minX + (n.maxX - n.minX) * r(), z = n.minZ + (n.maxZ - n.minZ) * r();
    if (vnutri(n.body, x, z) && (!n.siet || n.siet.jePesie(x, z))) return [x, z];
  }
  return null;
}
