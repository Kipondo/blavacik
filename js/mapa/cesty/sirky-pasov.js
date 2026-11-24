// Súbežné jazdné pásy rozdelenej cesty sa neprekrývajú (pravidlá ulice #136). V OSM má každý smer rozdelenej cesty
// vlastnú os; šírka sa často odhaduje z triedy (napr. 14 m pre jednosmerný pás hlavnej cesty) a pásy potom ležia
// na sebe – čiary pruhov jedného pásu idú cez pruhy druhého. Kde sú osi dvoch jednosmerných pásov bližšie, ako
// dovolí ich šírka, pásy sa zúžia tak, aby medzi nimi ostal aspoň deliaci pás (obrubník), a ubudne pruhov.
// Volá sa pri načítaní dlaždice po upravOsiCiest (js/mapa/dlazdice/sprava-dlazdic.js) aj v kontrolách.

const NIE = new Set(['service', 'living_street', 'track', 'unknown', 'footway', 'path', 'cycleway', 'steps', 'pedestrian']);
const DELIACI = 1.0;      // m – najužší deliaci pás medzi pásmi
const KROK = 5;           // m – vzorky pozdĺž osi
const OKRAJ = 15;         // m – pri koncoch sa pásy zbiehajú do križovatky, tam sa nemeria
const MIN_SIRKA = 5;      // m – užší pás sa už nezužuje
const BUNKA = 25;

/** Zúži prekrývajúce sa súbežné jednosmerné pásy (na mieste: c.sirka, c.pruhy). */
export function upravSirkyPasov(cesty) {
  const pasy = (cesty ?? []).filter((c) => c.jednosmerka && !NIE.has(c.typ) && !c.most && !c.nadjazd && c.body?.length > 1 && !c.sirkaUpravena);
  if (pasy.length < 2) return cesty;
  // mriežka úsekov
  const m = new Map();
  for (const c of pasy) {
    for (let i = 1; i < c.body.length; i++) {
      const [ax, az] = c.body[i - 1], [bx, bz] = c.body[i];
      const u = { ax, az, bx, bz, c };
      for (let gi = Math.floor(Math.min(ax, bx) / BUNKA) - 1; gi <= Math.floor(Math.max(ax, bx) / BUNKA) + 1; gi++) {
        for (let gj = Math.floor(Math.min(az, bz) / BUNKA) - 1; gj <= Math.floor(Math.max(az, bz) / BUNKA) + 1; gj++) {
          const k = gi * 100003 + gj;
          if (!m.has(k)) m.set(k, []);
          m.get(k).push(u);
        }
      }
    }
  }
  const faktor = new Map();
  for (const c of pasy) {
    // vzorky vnútri osi (bez OKRAJ m pri koncoch) so smerom
    const dl = [0];
    for (let i = 1; i < c.body.length; i++) dl.push(dl[i - 1] + Math.hypot(c.body[i][0] - c.body[i - 1][0], c.body[i][1] - c.body[i - 1][1]));
    const L = dl[dl.length - 1];
    if (L < 2 * OKRAJ + KROK) continue;
    const vzdialenosti = new Map();   // susedný pás → [vzdialenosť osí]
    let vzoriek = 0;
    for (let s = OKRAJ; s <= L - OKRAJ; s += KROK) {
      let i = 1;
      while (i < dl.length - 1 && dl[i] < s) i++;
      const [ax, az] = c.body[i - 1], [bx, bz] = c.body[i];
      const t = (s - dl[i - 1]) / ((dl[i] - dl[i - 1]) || 1);
      const x = ax + (bx - ax) * t, z = az + (bz - az) * t;
      const sl = Math.hypot(bx - ax, bz - az) || 1, sx = (bx - ax) / sl, sz = (bz - az) / sl;
      vzoriek++;
      let naj = null;
      for (const u of m.get(Math.floor(x / BUNKA) * 100003 + Math.floor(z / BUNKA)) ?? []) {
        if (u.c === c) continue;
        const dx = u.bx - u.ax, dz = u.bz - u.az, l2 = dx * dx + dz * dz || 1e-9, ul = Math.sqrt(l2);
        // súbežný (aj protismerný) úsek
        if (Math.abs((dx * sx + dz * sz) / ul) < 0.95) continue;
        const tt = ((x - u.ax) * dx + (z - u.az) * dz) / l2;
        if (tt < 0 || tt > 1) continue;
        const D = Math.hypot(x - u.ax - dx * tt, z - u.az - dz * tt);
        if (D < (c.sirka + u.c.sirka) / 2 + DELIACI && (!naj || D < naj.D)) naj = { D, c: u.c };
      }
      if (naj) {
        if (!vzdialenosti.has(naj.c)) vzdialenosti.set(naj.c, []);
        vzdialenosti.get(naj.c).push(naj.D);
      }
    }
    for (const [d, D] of vzdialenosti) {
      if (D.length < Math.max(2, vzoriek * 0.5)) continue;     // súbežné len na kúsku – nechať tak
      const med = [...D].sort((a, b) => a - b)[D.length >> 1];
      const f = Math.max(0, med - DELIACI) / ((c.sirka + d.sirka) / 2);
      if (f < 1) {
        faktor.set(c, Math.min(faktor.get(c) ?? 1, f));
        faktor.set(d, Math.min(faktor.get(d) ?? 1, f));
      }
    }
  }
  for (const [c, f] of faktor) {
    const nova = Math.max(MIN_SIRKA, Math.round(c.sirka * f * 10) / 10);
    if (nova >= c.sirka) continue;
    c.sirka = nova;
    // pruh má aspoň ~3 m (bez pruhov širších ako cesta)
    if (c.pruhy) c.pruhy = Math.max(1, Math.min(c.pruhy, Math.floor(nova / 3)));
    c.sirkaUpravena = true;
  }
  return cesty;
}
