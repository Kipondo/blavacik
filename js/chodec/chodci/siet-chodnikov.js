// Sieť chodníkov pre chodcov – skladá sa za behu z načítaných podrobných dlaždíc
// (chodníky, pešie zóny, schody z OSM) + námestia (plochy dlažby), po ktorých sa dá voľne prechádzať.
// Chodci nechodia po vozovke ani cez domy: úsek chodníka, ktorý vedie pozdĺž vozovky (nie cez ňu – to je
// prechod) alebo cez dom, sa do siete nepridá; náhodné body na námestiach musia byť mimo vozovky a domov.
// Podchody (data.podchody dlaždice): chodby pod zemou sú v sieti ako hrany „podzem“, schody do nich ako „podchod“
// (výšku dá hra.podchody). Chodník, ktorý ide ponad jamu schodiska (napr. os nástupišťa), má „obchádzku“ – chodec
// ju obíde bokom. Múry modelov (napr. stanica, udalosť 'steny-chodcov') hrany pretínať nesmú – dnu sa ide dverami.

const PRE_CHODCOV = new Set(['footway', 'pedestrian', 'path', 'steps', 'platform']);
const OKRAJ_JAMY = 0.8;       // m – odstup od okraja jamy schodiska (zábradlie) pri obchádzke
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
    this.steny = new Map();    // kľúč → [{ body, minX, maxX, minZ, maxZ }] – múry modelov, cez ktoré sa nechodí
    this.jamyDlazdic = new Map(); // kľúč dlaždice → jamy schodísk do podchodu
    this.dnaSchodov = new Set();  // kľúče dolných bodov schodov do podchodu (tam sa nepripája nič z povrchu)
    this.modely = new Map();      // kľúč modelu → hrany jeho pešich čiar (nastavCiary)
  }

  /** Nová hrana a–b (alebo null, ak je príliš krátka alebo pretína múr). Jamy = obchádzky pre hrany na povrchu. */
  _hrana([ax, az], [bx, bz], sirka, typ, extra = {}, jamy = []) {
    const dlzka = Math.hypot(bx - ax, bz - az);
    if (dlzka < 0.1) return null;
    // múr modelu (stanica) – pod zemou nevadí
    if (!extra.podzem && this.cezStenu(ax, az, bx, bz)) return null;
    const a = this._uzol(ax, az), b = this._uzol(bx, bz);
    const h = { a, b, dlzka, sirka, typ, ux: (bx - ax) / dlzka, uz: (bz - az) / dlzka, zmazana: false, ...extra };
    if (!h.podzem && !h.podchod && jamy.length) {
      const o = obchadzky(h, jamy);
      if (o.length) h.jamy = o;
    }
    a.hrany.push(h); b.hrany.push(h);
    this.hrany.add(h);
    return h;
  }

  /** Pešie čiary modelu `kluc` (napr. osi nástupíšť stanice): [{ body, sirka, typ }]. Pridajú sa do siete
   *  a koncové body siete do 6 m (horné konce schodov z podchodu, krátke chodníky) sa k nim pripoja spojkou. */
  nastavCiary(kluc, ciary) {
    for (const h of this.modely.get(kluc) ?? []) this._odober(h);
    const hrany = [];
    this.modely.set(kluc, hrany);
    hrany.ciary = ciary ?? [];
    for (const c of hrany.ciary) {
      for (let i = 0; i < c.body.length - 1; i++) {
        const h = this._hrana(c.body[i], c.body[i + 1], c.sirka ?? 2.5, c.typ ?? 'platform');
        if (h) { h.model = true; hrany.push(h); }
      }
    }
    this._pripojModely();
  }

  /** Obchádzky jám a spojky k čiaram modelov – znova po každej dlaždici (schody a jamy prichádzajú s dlaždicami;
   *  hrany čiar sa nemenia, chodci na nich ostávajú). */
  _pripojModely() {
    if (!this.modely.size) return;
    const jamy = [...this.jamyDlazdic.values()].flat();
    for (const hrany of this.modely.values()) {
      for (const h of hrany) {
        if (!h.model || h.zmazana) continue;
        const o = jamy.length ? obchadzky(h, jamy) : [];
        h.jamy = o.length ? o : undefined;
      }
      const vrcholy = hrany.ciary.flatMap((c) => c.body);
      if (!vrcholy.length) continue;
      const vModeli = new Set(hrany.flatMap((h) => [h.a, h.b]));
      for (const u of [...this.uzly.values()]) {
        if (u.hrany.length !== 1 || vModeli.has(u) || this.dnaSchodov.has(u.k)) continue;
        const e = u.hrany[0];
        if (e.podzem) continue;
        // najbližší vrchol čiary do 6 m, nie „späť“ po vlastnej hrane (spojka nejde ponad schody)
        const o = e.a === u ? e.b : e.a, dx = u.x - o.x, dz = u.z - o.z, dl = Math.hypot(dx, dz) || 1;
        let naj = null, nd = 6;
        for (const [x, z] of vrcholy) {
          const d = Math.hypot(x - u.x, z - u.z);
          if (d < nd && ((x - u.x) * dx + (z - u.z) * dz) / dl > -0.5) { nd = d; naj = [x, z]; }
        }
        // spojka od horného konca schodov ide od jamy preč – obchádzku nepotrebuje
        if (naj) { const h = this._hrana([u.x, u.z], naj, 2.0, 'spojka'); if (h) hrany.push(h); }
      }
    }
  }

  /** Múry (mnohouholníky) modelu `kluc` – hrany, ktoré ich pretínajú, zmiznú (aj z neskôr načítaných dlaždíc). */
  nastavSteny(kluc, polygony) {
    const p = (polygony ?? []).filter((b) => b?.length >= 3).map((body) => {
      let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
      for (const [x, z] of body) { minX = Math.min(minX, x); maxX = Math.max(maxX, x); minZ = Math.min(minZ, z); maxZ = Math.max(maxZ, z); }
      return { body, minX, maxX, minZ, maxZ };
    });
    if (p.length) this.steny.set(kluc, p); else this.steny.delete(kluc);
    for (const h of [...this.hrany]) if (!h.podzem && this.cezStenu(h.a.x, h.a.z, h.b.x, h.b.z)) this._odober(h);
  }

  /** Pretína úsečka niektorý múr? */
  cezStenu(ax, az, bx, bz) {
    if (!this.steny.size) return false;
    const x0 = Math.min(ax, bx), x1 = Math.max(ax, bx), z0 = Math.min(az, bz), z1 = Math.max(az, bz);
    for (const zoz of this.steny.values()) {
      for (const s of zoz) {
        if (x1 < s.minX || x0 > s.maxX || z1 < s.minZ || z0 > s.maxZ) continue;
        if (vnutri(s.body, ax, az) || vnutri(s.body, bx, bz)) return true;
        for (let i = 0, j = s.body.length - 1; i < s.body.length; j = i++) {
          if (useckyPretinaju(ax, az, bx, bz, s.body[j][0], s.body[j][1], s.body[i][0], s.body[i][1])) return true;
        }
      }
    }
    return false;
  }

  /** Odstráni hranu zo siete (chodci na nej zmiznú – modul ich zruší). */
  _odober(h) {
    if (h.zmazana) return;
    h.zmazana = true;
    this.hrany.delete(h);
    for (const u of [h.a, h.b]) {
      const i = u.hrany.indexOf(h);
      if (i >= 0) u.hrany.splice(i, 1);
      if (!u.hrany.length) this.uzly.delete(u.k);
    }
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

  /** Smie tu chodec stáť? (nie na vozovke, nie v dome, nie v múre modelu – napr. pri okraji dverí stanice) */
  jePesie(x, z) {
    return !this.naVozovke(x, z) && !vBudove(this.kolizie, x, z) && !this.vStene(x, z);
  }

  /** Je bod v múre modelu (steny z 'steny-chodcov')? */
  vStene(x, z) {
    for (const zoz of this.steny.values()) {
      for (const s of zoz) if (x >= s.minX && x <= s.maxX && z >= s.minZ && z <= s.maxZ && vnutri(s.body, x, z)) return true;
    }
    return false;
  }

  _uzol(x, z) {
    const k = klucBodu(x, z);
    let u = this.uzly.get(k);
    if (!u) { u = { k, x, z, hrany: [] }; this.uzly.set(k, u); }
    return u;
  }

  pridajDlazdicu(kluc, chodniky, pokryvka, cesty, podchody = []) {
    if (this.dlazdice.has(kluc)) this.odoberDlazdicu(kluc);
    const hrany = [], namestia = [];
    const vozovka = this._vozovka(cesty);
    this.dlazdice.set(kluc, { hrany, namestia, vozovka });
    // body podchodov (rovnaký uzol OSM = rovnaké súradnice) – schody, ktoré ich zdieľajú, vedú pod zem;
    // jamy schodísk do podchodu (obdĺžnik okolo schodov) – chodníky po povrchu ich obchádzajú
    const podZemou = new Set();
    const jamy = [];
    for (const p of podchody ?? []) {
      for (const b of p.body ?? []) podZemou.add(klucBodu(b[0], b[1]));
      if (p.typ === 'schody' && p.body?.length >= 2) {
        const a = p.body[0], b = p.body.at(-1), l = Math.hypot(b[0] - a[0], b[1] - a[1]);
        if (l > 0.3) jamy.push({ ax: a[0], az: a[1], ex: (b[0] - a[0]) / l, ez: (b[1] - a[1]) / l, l, h: Math.max(1, (p.sirka ?? 3) / 2) });
        const dno = p.dole === 0 ? p.body[0] : p.body.at(-1);
        this.dnaSchodov.add(klucBodu(dno[0], dno[1]));
      }
    }
    this.jamyDlazdic.set(kluc, jamy);
    const pridajHranu = (ax, az, bx, bz, sirka, typ, extra = {}) => {
      const h = this._hrana([ax, az], [bx, bz], sirka, typ, extra, jamy);
      if (h) hrany.push(h);
    };
    for (const c of chodniky ?? []) {
      if (!PRE_CHODCOV.has(c.typ) || c.body.length < 2) continue;
      const sirka = Math.max(1.2, c.sirka ?? 2.5);
      const podchod = c.typ === 'steps' && c.body.some((b) => podZemou.has(klucBodu(b[0], b[1])));
      const most = !!(c.most || c.nadjazd);
      for (let i = 0; i < c.body.length - 1; i++) {
        const [ax, az] = c.body[i], [bx, bz] = c.body[i + 1];
        const dlzka = Math.hypot(bx - ax, bz - az);
        if (dlzka < 0.1) continue;
        // pozdĺž vozovky nie (cez ňu áno – prechod), cez dom nie
        const mx = (ax + bx) / 2, mz = (az + bz) / 2;
        const v = this.naVozovke(mx, mz, 0.5);
        if (v && !most && Math.abs(((bx - ax) * v.ux + (bz - az) * v.uz) / dlzka) > 0.75) continue;
        if (vBudove(this.kolizie, mx, mz) && vBudove(this.kolizie, ax * 0.75 + bx * 0.25, az * 0.75 + bz * 0.25)) continue;
        pridajHranu(ax, az, bx, bz, sirka, c.typ, { podchod, most });
      }
    }
    // chodby podchodov pod zemou (na schody nadväzujú v spoločných bodoch)
    for (const p of podchody ?? []) {
      if (p.typ !== 'chodba' || !(p.body?.length >= 2)) continue;
      const sirka = Math.max(1.6, p.sirka ?? 4);
      for (let i = 0; i < p.body.length - 1; i++) {
        pridajHranu(p.body[i][0], p.body[i][1], p.body[i + 1][0], p.body[i + 1][1], sirka, 'podchod', { podzem: true });
      }
    }
    if (jamy.length || hrany.length) this._pripojModely();
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
    this.jamyDlazdic.delete(kluc);
    for (const h of d.hrany) this._odober(h);
    for (const n of d.namestia) { n.zmazana = true; this.namestia.delete(n); }
    this.dlazdice.delete(kluc);
  }
}

/** Pretínajú sa úsečky a–b a c–d? */
function useckyPretinaju(ax, az, bx, bz, cx, cz, dx, dz) {
  const r1 = (bx - ax) * (cz - az) - (bz - az) * (cx - ax), r2 = (bx - ax) * (dz - az) - (bz - az) * (dx - ax);
  const r3 = (dx - cx) * (az - cz) - (dz - cz) * (ax - cx), r4 = (dx - cx) * (bz - cz) - (dz - cz) * (bx - cx);
  return r1 * r2 < 0 && r3 * r4 < 0;
}

/** Úseky hrany ponad jamy schodísk: [{ s0, s1, L }] – L = bočný posun (vpravo od smeru hrany a→b, v metroch),
 *  o ktorý chodec jamu obíde. Hrana naprieč jamou (nie pozdĺž) sa neobchádza – takú jamu nemá ako obísť. */
function obchadzky(h, jamy) {
  const out = [];
  const nx = -h.uz, nz = h.ux;     // vpravo od smeru a→b
  for (const j of jamy) {
    const kx = -j.ez, kz = j.ex;   // naprieč jamou
    const sk = nx * kx + nz * kz;
    if (Math.abs(sk) < 0.5) continue;
    let s0 = Infinity, s1 = -Infinity, q0 = 0, n = 0;
    for (let s = 0; s <= h.dlzka; s += 0.5) {
      const x = h.a.x + h.ux * s - j.ax, z = h.a.z + h.uz * s - j.az;
      const t = x * j.ex + z * j.ez, q = x * kx + z * kz;
      if (t < -OKRAJ_JAMY || t > j.l + OKRAJ_JAMY || Math.abs(q) > j.h + OKRAJ_JAMY) continue;
      s0 = Math.min(s0, s); s1 = Math.max(s1, s); q0 += q; n++;
    }
    if (!n) continue;
    q0 /= n;
    const strana = q0 >= -0.2 ? 1 : -1;
    // posun tak, aby os chodca bola mimo jamy (aj so zábradlím) na strane, kde už je
    const L = (strana * (j.h + OKRAJ_JAMY) - q0) / sk;
    out.push({ s0: s0 - 3, s1: s1 + 3, L });
  }
  return out;
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
