// Kde smie stáť strom: nie na vozovke, na koľajach, na parkovisku pri ceste ani v dome.
// Stromy z laserového skenovania majú polohu podľa stredu koruny – koruna nad cestou by inak dala
// kmeň doprostred jazdného pruhu. Taký strom sa posunie kolmo z vozovky na okraj (chodník, zeleň),
// najviac o 4 m (alebo o polomer koruny); ak sa nedá (križovatka, široká cesta), strom sa vynechá.
// Rovnako sa vynechajú stromy v pôdoryse budovy a na električkových koľajach.
// Ďalej sa vynechajú stromy na mostoch a nadjazdoch (laser „vidí“ mostovku s lampami a zábradlím ako korunu –
// strom by prerástol cez Most SNP) a stromy hlbšie vo vode (Dunaj, jazerá; ostrovy hra nemá, breh necháva).
// Regresné kontroly: tools/kontrola/regresie/kontroly.js (stromy-na-mostoch, stromy-vo-vode, stromy-na-vozovke).

const BUNKA = 25;
const OKRAJ = 0.9;          // m – kmeň aspoň takto ďaleko od okraja vozovky
const OKRAJ_MOSTA = 1.0;    // m – za okrajom mostovky ešte nie (koruna by zasahovala do zábradlia)
const HLBKA_VODY = 2.0;     // m – strom do 2 m od brehu ostáva (koruna nad vodou), hlbšie vo vode nie

/** Mriežka po BUNKA m, orezaná na obálku stromov `ram` (veľké plochy – Dunaj – sa nevkladajú do tisícov buniek). */
function mriezka(ram) {
  const m = new Map();
  return {
    pridaj(minX, maxX, minZ, maxZ, o) {
      if (maxX < ram.minX || minX > ram.maxX || maxZ < ram.minZ || minZ > ram.maxZ) return;
      minX = Math.max(minX, ram.minX); maxX = Math.min(maxX, ram.maxX);
      minZ = Math.max(minZ, ram.minZ); maxZ = Math.min(maxZ, ram.maxZ);
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

function odOkraja(x, z, b) {
  let d = Infinity;
  for (let i = 0, j = b.length - 1; i < b.length; j = i++) {
    const [ax, az] = b[j], [bx, bz] = b[i];
    const dx = bx - ax, dz = bz - az, l2 = dx * dx + dz * dz || 1e-9;
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / l2));
    d = Math.min(d, Math.hypot(x - ax - t * dx, z - az - t * dz));
  }
  return d;
}

/**
 * Vráti zoznam stromov v rovnakom tvare ([x, z, mierka, výška, polomer]) bez stromov na vozovke,
 * koľajach, v budovách, na mostoch a hlbšie vo vode; stromy kúsok na vozovke posunie na okraj.
 *   mosty – [{ body: [[x, z], …], sirka }] (mosty z mapy, nadjazdy dlaždice), voda – polygóny [[x, z], …]
 */
export function stromyMimoCiest(stromy, { cesty = [], kolajnice = [], budovy = [], sluzobne = [], mosty = [], voda = [] } = {}) {
  if (!stromy?.length) return stromy;
  // obálka stromov (+ posun na okraj vozovky) – mriežky sa robia len tu
  const ram = { minX: Infinity, maxX: -Infinity, minZ: Infinity, maxZ: -Infinity };
  for (const [x, z] of stromy) { ram.minX = Math.min(ram.minX, x); ram.maxX = Math.max(ram.maxX, x); ram.minZ = Math.min(ram.minZ, z); ram.maxZ = Math.max(ram.maxZ, z); }
  ram.minX -= 10; ram.maxX += 10; ram.minZ -= 10; ram.maxZ += 10;
  const pasy = mriezka(ram), domy = mriezka(ram), mostovky = mriezka(ram), vody = mriezka(ram);
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
  const pridajPolygon = (m, body) => {
    let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
    for (const [x, z] of body) { minX = Math.min(minX, x); maxX = Math.max(maxX, x); minZ = Math.min(minZ, z); maxZ = Math.max(maxZ, z); }
    m.pridaj(minX, maxX, minZ, maxZ, { body, minX, maxX, minZ, maxZ });
  };
  for (const b of budovy) if (b.body?.length > 2) pridajPolygon(domy, b.body);
  for (const v of voda) if (v?.length > 2) pridajPolygon(vody, v);
  for (const m of mosty) {
    const b = m.body;
    if (!(b?.length > 1)) continue;
    const pol = (m.sirka ?? 8) / 2 + OKRAJ_MOSTA;
    for (let i = 1; i < b.length; i++) {
      const [ax, az] = b[i - 1], [bx, bz] = b[i];
      mostovky.pridaj(Math.min(ax, bx) - pol, Math.max(ax, bx) + pol, Math.min(az, bz) - pol, Math.max(az, bz) + pol, { ax, az, bx, bz, pol });
    }
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
  const naMoste = (x, z) => mostovky.okolo(x, z).some((p) => {
    const dx = p.bx - p.ax, dz = p.bz - p.az, l2 = dx * dx + dz * dz || 1;
    const t = Math.max(0, Math.min(1, ((x - p.ax) * dx + (z - p.az) * dz) / l2));
    return Math.hypot(x - p.ax - dx * t, z - p.az - dz * t) < p.pol;
  });
  const voVode = (x, z) => vody.okolo(x, z).some((v) => x >= v.minX && x <= v.maxX && z >= v.minZ && z <= v.maxZ
    && vnutri(x, z, v.body) && odOkraja(x, z, v.body) > HLBKA_VODY);

  const out = [];
  for (const s of stromy) {
    let [x, z] = s;
    if (naMoste(x, z) || voVode(x, z)) continue;
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
