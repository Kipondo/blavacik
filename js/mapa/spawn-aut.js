// Rozmiestnenie zaparkovaných áut na štarte – na skutočné ulice z OSM.
// V data/mapa/zakladna.json je zoznam ulíc ("spawn.ulice"), na každú príde jedno auto.

const FARBY = ['#c8102e', '#1f5fbf', '#f2c14e', '#e8e8e8', '#2e8b57', '#ff7f11', '#6a3d9a', '#111111', '#4dc3ff', '#9c9c9c', '#7a1f2b', '#2b4a6f'];

export function rozmiestniAuta(cesty, ulice) {
  const auta = [];
  ulice.forEach((nazov, i) => {
    const kandidati = cesty.filter((c) => c.nazov === nazov && !c.most);
    if (!kandidati.length) return;
    // najdlhší úsek ulice
    const c = kandidati.reduce((a, b) => (dlzka(b.body) > dlzka(a.body) ? b : a));
    const j = Math.floor((c.body.length - 1) / 2);
    const [ax, az] = c.body[j], [bx, bz] = c.body[j + 1];
    const d = Math.hypot(bx - ax, bz - az) || 1;
    const ux = (bx - ax) / d, uz = (bz - az) / d;
    // pravý jazdný pruh (v smere jazdy)
    const posun = c.jednosmerka ? 0 : c.sirka / 4;
    auta.push({
      x: (ax + bx) / 2 - uz * posun,
      z: (az + bz) / 2 + ux * posun,
      uhol: Math.atan2(ux, uz),
      farba: FARBY[i % FARBY.length],
    });
  });
  return auta;
}

function dlzka(body) {
  let s = 0;
  for (let i = 0; i < body.length - 1; i++) s += Math.hypot(body[i + 1][0] - body[i][0], body[i + 1][1] - body[i][1]);
  return s;
}
