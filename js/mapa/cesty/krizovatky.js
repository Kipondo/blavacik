// Nájde križovatky ciest: bod, ktorý zdieľajú aspoň 3 „ramená“ ciest
// (napr. dve cesty, ktoré sa krížia = 4 ramená; T-križovatka = 3).
// Bez Three.js – používa ho aj nástroj na graf ciest (tools/osm/graf.mjs).

export const kluc = (x, z) => `${x},${z}`;

export function najdiKrizovatky(cesty) {
  const body = new Map();
  cesty.forEach((c, ci) => {
    c.body.forEach(([x, z], i) => {
      const k = kluc(x, z);
      if (!body.has(k)) body.set(k, { x, z, ramena: 0, cesty: [], typy: [], polomer: 0 });
      const b = body.get(k);
      b.ramena += i === 0 || i === c.body.length - 1 ? 1 : 2;
      b.cesty.push({ ci, i });
      b.typy.push(c.typ);
      b.polomer = Math.max(b.polomer, c.sirka / 2);
    });
  });
  const krizovatky = new Map();
  for (const [k, b] of body) if (b.ramena >= 3) krizovatky.set(k, b);
  return { krizovatky, body };
}
