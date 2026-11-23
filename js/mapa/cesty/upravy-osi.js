// Úprava osí ciest dlaždice pred stavbou – pravidlá ulice (#136): jednoduché a jasné tvary.
//   – zjednodušenie (Douglas–Peucker, 0,4 m): rovná ulica je rovná, bez cikcaku z kreslenia v OSM,
//   – zaoblenie lomov: v lome osi sa namiesto ostrého rohu vloží krátky plynulý oblúk (kvadratická krivka,
//     odsek najviac 4 m a najviac štvrtina susedných úsekov) – oblúk je oblúk, nie lomená čiara.
// Body zdieľané s inou cestou (križovatky, napojenia) a konce ostávajú presne na mieste – na nich sa stretajú
// pásy ciest, chodníky aj značenie (kľúč x,z v js/mapa/cesty/krizovatky.js) a dlaždice na hranici.
// Bez Three.js – volá sa pri načítaní dlaždice (js/mapa/dlazdice/sprava-dlazdic.js) aj v kontrolách
// (tools/kontrola/regresie/data.js), aby všetci videli tú istú cestu.

const TOLERANCIA = 0.4;     // m – zjednodušenie
const MAX_ODSEK = 4.0;      // m – najdlhší odsek pri zaoblení lomu
const MIN_UHOL = 0.12;      // rad (~7°) – menší lom sa nezaobľuje

function vzdialenostOdUsecky(p, a, b) {
  const dx = b[0] - a[0], dz = b[1] - a[1], L2 = dx * dx + dz * dz;
  if (L2 < 1e-12) return Math.hypot(p[0] - a[0], p[1] - a[1]);
  const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dz) / L2));
  return Math.hypot(p[0] - a[0] - dx * t, p[1] - a[1] - dz * t);
}

/** Douglas–Peucker (konce ostávajú). */
function zjednodus(body, tol) {
  if (body.length < 3) return body;
  const ponechat = new Uint8Array(body.length);
  ponechat[0] = ponechat[body.length - 1] = 1;
  const zasobnik = [[0, body.length - 1]];
  while (zasobnik.length) {
    const [a, b] = zasobnik.pop();
    let max = 0, idx = -1;
    for (let i = a + 1; i < b; i++) {
      const d = vzdialenostOdUsecky(body[i], body[a], body[b]);
      if (d > max) { max = d; idx = i; }
    }
    if (max > tol) { ponechat[idx] = 1; zasobnik.push([a, idx], [idx, b]); }
  }
  return body.filter((_, i) => ponechat[i]);
}

/** Zaoblenie vnútorných lomov (konce ostávajú). */
function zaobli(body) {
  if (body.length < 3) return body;
  const out = [body[0]];
  for (let i = 1; i < body.length - 1; i++) {
    const p = body[i - 1], v = body[i], n = body[i + 1];
    const l1 = Math.hypot(v[0] - p[0], v[1] - p[1]), l2 = Math.hypot(n[0] - v[0], n[1] - v[1]);
    if (l1 < 1e-6 || l2 < 1e-6) continue;
    const ux = (v[0] - p[0]) / l1, uz = (v[1] - p[1]) / l1, wx = (n[0] - v[0]) / l2, wz = (n[1] - v[1]) / l2;
    const uhol = Math.acos(Math.max(-1, Math.min(1, ux * wx + uz * wz)));
    if (uhol < MIN_UHOL) { out.push(v); continue; }
    const d = Math.min(MAX_ODSEK, l1 / 4, l2 / 4);
    const a = [v[0] - ux * d, v[1] - uz * d], b = [v[0] + wx * d, v[1] + wz * d];
    const k = Math.max(2, Math.ceil(uhol / 0.35));      // ~20° na úsek oblúka
    for (let j = 0; j <= k; j++) {
      const t = j / k, s = 1 - t;
      out.push([s * s * a[0] + 2 * s * t * v[0] + t * t * b[0], s * s * a[1] + 2 * s * t * v[1] + t * t * b[1]]);
    }
  }
  out.push(body[body.length - 1]);
  return out;
}

/** Upraví osi ciest na mieste (c.body). Body zdieľané s inou cestou a konce ostávajú. */
export function upravOsiCiest(cesty) {
  if (!cesty?.length) return cesty;
  const pocet = new Map();
  for (const c of cesty) for (const [x, z] of c.body ?? []) { const k = `${x},${z}`; pocet.set(k, (pocet.get(k) ?? 0) + 1); }
  for (const c of cesty) {
    const b = c.body;
    if (!b || b.length < 3 || c.upravene) continue;
    const out = [b[0]];
    let a = 0;
    for (let i = 1; i < b.length; i++) {
      const pevny = i === b.length - 1 || pocet.get(`${b[i][0]},${b[i][1]}`) > 1;
      if (!pevny) continue;
      const usek = zaobli(zjednodus(b.slice(a, i + 1), TOLERANCIA));
      for (let j = 1; j < usek.length - 1; j++) out.push([Math.round(usek[j][0] * 100) / 100, Math.round(usek[j][1] * 100) / 100]);
      out.push(b[i]);       // pevný bod presne (kľúč križovatky)
      a = i;
    }
    c.body = out;
    c.upravene = true;
  }
  return cesty;
}
