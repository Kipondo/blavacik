// Mriežka vozoviek dlaždice: leží bod na vozovke niektorej (inej) cesty? (#136)
// Chodník s obrubníkom sa na cudzej vozovke preruší (js/mapa/cesty/chodniky.js) – inak pri súbežných cestách,
// rozdelených jazdných pásoch a cestách, ktoré sa stretnú bez spoločného bodu, stál zvýšený chodník cez vozovku.
// Bez Three.js – používa ho aj kontrolór mapy (tools/kontrola/mapa/kontroly-mapy.js).

const BUNKA = 20;
const kluc = (i, j) => i * 100003 + j;
// vjazdy do dvorov a parkovísk, obytné zóny – chodník cez ne v skutočnosti pokračuje (so zníženým obrubníkom)
export const VJAZDY = new Set(['service', 'living_street', 'track']);

/**
 * @param {Array} cesty  cesty dlaždice ({ typ, body, sirka, most, nadjazd })
 * Mosty a nadjazdy sa nerátajú (mostovka je nad terénom, chodník pod ňou môže byť), ani vjazdy (VJAZDY).
 */
export function mriezkaVozoviek(cesty) {
  const m = new Map();
  for (const c of cesty ?? []) {
    if (c.most || c.nadjazd || VJAZDY.has(c.typ) || !(c.body?.length > 1)) continue;
    const pol = (c.sirka ?? 6) / 2;
    for (let i = 1; i < c.body.length; i++) {
      const [ax, az] = c.body[i - 1], [bx, bz] = c.body[i];
      const u = { ax, az, bx, bz, pol, c };
      for (let gi = Math.floor((Math.min(ax, bx) - pol) / BUNKA); gi <= Math.floor((Math.max(ax, bx) + pol) / BUNKA); gi++) {
        for (let gj = Math.floor((Math.min(az, bz) - pol) / BUNKA); gj <= Math.floor((Math.max(az, bz) + pol) / BUNKA); gj++) {
          const k = kluc(gi, gj);
          if (!m.has(k)) m.set(k, []);
          m.get(k).push(u);
        }
      }
    }
  }
  /** Cesta, na ktorej vozovke leží bod (x, z) aspoň `rezerva` m od okraja (okrem cesty `okrem`), alebo null. */
  const vozovka = (x, z, okrem = null, rezerva = 0) => {
    const zoznam = m.get(kluc(Math.floor(x / BUNKA), Math.floor(z / BUNKA)));
    if (!zoznam) return null;
    for (const u of zoznam) {
      if (u.c === okrem) continue;
      const dx = u.bx - u.ax, dz = u.bz - u.az, L2 = dx * dx + dz * dz || 1e-9;
      const t = Math.max(0, Math.min(1, ((x - u.ax) * dx + (z - u.az) * dz) / L2));
      if (Math.hypot(x - u.ax - dx * t, z - u.az - dz * t) < u.pol - rezerva) return u.c;
    }
    return null;
  };
  return { vozovka, naVozovke: (x, z, okrem, rezerva) => vozovka(x, z, okrem, rezerva) !== null };
}
