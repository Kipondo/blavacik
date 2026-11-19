// Graf ciest pre NPC dopravu: uzly (križovatky a konce ciest) a hrany medzi nimi.
// Bez Three.js – používa ho nástroj tools/osm/graf.mjs aj hra.
//
// Formát (data/mapa/graf-ciest.json):
//   uzly:  [[x, z], ...]
//   hrany: [{ a, b, body: [[x,z],...], dlzka, pruhy, jednosmerka, max, nazov, typ }]
//          jednosmerka = premávka len z a do b
//   semafory: [index uzla, ...]  – uzly so semaforom (alebo semafor do 25 m od uzla)

import { najdiKrizovatky, kluc } from '../mapa/cesty/krizovatky.js';

export function postavGraf(cesty, semafory = []) {
  const { krizovatky } = najdiKrizovatky(cesty);
  const uzly = [];
  const indexUzla = new Map();
  const uzol = (x, z) => {
    const k = kluc(x, z);
    if (!indexUzla.has(k)) { indexUzla.set(k, uzly.length); uzly.push([x, z]); }
    return indexUzla.get(k);
  };

  const hrany = [];
  for (const c of cesty) {
    let zaciatok = 0;
    for (let i = 1; i < c.body.length; i++) {
      const koniec = i === c.body.length - 1 || krizovatky.has(kluc(...c.body[i]));
      if (!koniec) continue;
      const body = c.body.slice(zaciatok, i + 1);
      let dlzka = 0;
      for (let j = 0; j < body.length - 1; j++) dlzka += Math.hypot(body[j + 1][0] - body[j][0], body[j + 1][1] - body[j][1]);
      hrany.push({
        a: uzol(...body[0]), b: uzol(...body[body.length - 1]), body,
        dlzka: Math.round(dlzka * 10) / 10,
        pruhy: c.pruhy ?? 2,
        jednosmerka: !!c.jednosmerka,
        max: c.max ?? (c.typ === 'residential' || c.typ === 'living_street' ? 30 : 50),
        nazov: c.nazov ?? '',
        typ: c.typ ?? '',
      });
      zaciatok = i;
    }
  }

  // semafory priradíme k najbližšiemu uzlu
  const semUzly = new Set();
  for (const [x, z] of semafory) {
    let naj = -1, min = 25;
    uzly.forEach(([ux, uz], i) => {
      const d = Math.hypot(ux - x, uz - z);
      if (d < min) { min = d; naj = i; }
    });
    if (naj >= 0) semUzly.add(naj);
  }
  return { uzly, hrany, semafory: [...semUzly] };
}
