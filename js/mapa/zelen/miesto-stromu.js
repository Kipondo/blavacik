// Kde smie stáť strom: nie na vozovke, na koľajach, na parkovisku pri ceste ani v dome.
// Stromy z laserového skenovania majú polohu podľa stredu koruny – koruna nad cestou by inak dala
// kmeň doprostred jazdného pruhu. Taký strom sa posunie kolmo z vozovky na okraj (chodník, zeleň),
// najviac o 4 m (alebo o polomer koruny); ak sa nedá (križovatka, široká cesta), strom sa vynechá.
// Rovnako sa vynechajú stromy v pôdoryse budovy a na električkových koľajach.

const BUNKA = 25;
const OKRAJ = 0.9;          // m – kmeň aspoň takto ďaleko od okraja vozovky

function mriezka() {
  const m = new Map();
  return {
    pridaj(minX, maxX, minZ, maxZ, o) {
      for (let i = Math.floor(minX / BUNKA); i <= Math.floor(maxX / BUNKA); i++) {
        for (let j = Math.floor(minZ / BUNKA); j <= Math.floor(maxZ / BUNKA); j++) {
          const k = `${i},${j}`;
          if (!m.has(k)) m.set(k, []);
          m.get(k).push(o);
        }
      }
    },
    okolo(x, z) { return m.get(`${Math.floor(x / BUNKA)},${Math.floor(z / BUNKA)}`) ?? []; },
  };
}

function vnutri(x, z, b) {
  let c = false;
  for (let i = 0, j = b.length - 1; i < b.length; j = i++) {
    const [xi, zi] = b[i], [xj, zj] = b[j];
    if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) c = !c;
  }
  return c;
}

/**
 * Vráti zoznam stromov v rovnakom tvare ([x, z, mierka, výška, polomer]) bez stromov na vozovke,
 * koľajach a v budovách; stromy kúsok na vozovke posunie na okraj.
 */
export function stromyMimoCiest(stromy, { cesty = [], kolajnice = [], budovy = [], sluzobne = [] } = {}) {
  if (!stromy?.length) return stromy;
  const pasy = mriezka(), domy = mriezka();
  const pridajPas = (body, pol) => {
    for (let i = 1; i < body.length; i++) {
      const [ax, az] = body[i - 1], [bx, bz] = body[i];
      const r = pol + OKRAJ;
      pasy.pridaj(Math.min(ax, bx) - r, Math.max(ax, bx) + r, Math.min(az, bz) - r, Math.max(az, bz) + r, { ax, az, bx, bz, pol });
    }
  };
  for (const c of cesty) if (c.body?.length > 1) pridajPas(c.body, (c.sirka ?? 7) / 2);
  for (const c of sluzobne) if (c.body?.length > 1) pridajPas(c.body, (c.sirka ?? 4) / 2);
  for (const k of kolajnice) if (k.body?.length > 1) pridajPas(k.body, 1.6);
  for (const b of budovy) {
    if (!(b.body?.length > 2)) continue;
    let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
    for (const [x, z] of b.body) { minX = Math.min(minX, x); maxX = Math.max(maxX, x); minZ = Math.min(minZ, z); maxZ = Math.max(maxZ, z); }
    domy.pridaj(minX, maxX, minZ, maxZ, { body: b.body, minX, maxX, minZ, maxZ });
  }

  /** Najhlbší zásah do vozovky: { hlbka, nx, nz } (normála von z vozovky) alebo null. */
  const naVozovke = (x, z) => {
    let naj = null;
    for (const p of pasy.okolo(x, z)) {
      const dx = p.bx - p.ax, dz = p.bz - p.az, l2 = dx * dx + dz * dz || 1;
      const t = Math.max(0, Math.min(1, ((x - p.ax) * dx + (z - p.az) * dz) / l2));
      const qx = p.ax + dx * t, qz = p.az + dz * t;
      const d = Math.hypot(x - qx, z - qz);
      const hlbka = p.pol + OKRAJ - d;
      if (hlbka <= 0 || (naj && hlbka < naj.hlbka)) continue;
      // smer von: od osi cesty (na osi kolmo na ňu)
      let nx = x - qx, nz = z - qz;
      if (d < 1e-3) { const l = Math.sqrt(l2); nx = -dz / l; nz = dx / l; } else { nx /= d; nz /= d; }
      naj = { hlbka, nx, nz };
    }
    return naj;
  };
  const vDome = (x, z) => domy.okolo(x, z).some((d) => x >= d.minX && x <= d.maxX && z >= d.minZ && z <= d.maxZ && vnutri(x, z, d.body));

  const out = [];
  for (const s of stromy) {
    let [x, z] = s;
    const r = s[4] ?? 2.6 * (s[2] ?? 1);
    let ok = true;
    for (let pokus = 0; pokus < 3; pokus++) {
      const v = naVozovke(x, z);
      if (!v) break;
      if (v.hlbka > Math.max(1.5, Math.min(4, r))) { ok = false; break; }
      x += v.nx * (v.hlbka + 0.05); z += v.nz * (v.hlbka + 0.05);
      if (pokus === 2 && naVozovke(x, z)) ok = false;
    }
    if (!ok || vDome(x, z)) continue;
    out.push(x === s[0] && z === s[1] ? s : [Math.round(x * 10) / 10, Math.round(z * 10) / 10, ...s.slice(2)]);
  }
  return out;
}
