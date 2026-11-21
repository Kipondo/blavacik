// Verejné služby a dôležité miesta z OSM → data/mapa/sluzby.json (pre js/mapa/vybavenie/oznacenia-modul.js
// a js/ui/lokality.js): stanice, autobusová stanica, letisko, prístav, polícia, hasiči, nemocnice, pošty,
// školy, vysoké školy, ministerstvá a úrady, obchodné centrá. Pri budove aj jej obrys (na tabuľu na fasáde).
// Názvy obchodných reťazcí sa nahradia všeobecným názvom (v hre nie sú značky firiem).
// Spustenie: cd tools/mesto && node --max-old-space-size=8000 sluzby.mjs
import { writeFileSync } from 'node:fs';
import { nacitajPbf } from './pbf.mjs';
import { naMetre } from './spolocne.mjs';

const db = await nacitajPbf('../../.cache/mesto/bratislavsky.osm.pbf');
const H = { minX: -12500, maxX: 13600, minZ: -14000, maxZ: 15700 };
const r1 = (v) => Math.round(v * 10) / 10;
const RETAZCE = /\b(IKEA|Tesco|Kaufland|Lidl|Billa|Penny|OBI|Hornbach|Decathlon|Max|Metro|Baumax|Möbelix|Asko|Kika|Jysk|Shopping Park|Retail Park|Avion|Vivo!?|Polus|AGEL|Medissimo|Penta|Svet zdravia)\b/i;

function typ(t) {
  if (t.railway === 'station' && (t.train === 'yes' || t.station === 'train' || !t.station) && t.station !== 'light_rail' && t.station !== 'subway') return 'stanica';
  if (t.amenity === 'bus_station') return 'autobusova';
  if (t.aeroway === 'terminal' || t.aeroway === 'aerodrome') return 'letisko';
  if (t.amenity === 'ferry_terminal') return 'pristav';
  if (t.amenity === 'police') return 'policia';
  if (t.amenity === 'fire_station') return 'hasici';
  if (t.amenity === 'hospital') return 'nemocnica';
  if (t.amenity === 'post_office') return 'posta';
  if (t.amenity === 'school') return 'skola';
  if (t.amenity === 'university' || t.amenity === 'college') return 'univerzita';
  if (t.office === 'government' || t.government === 'ministry' || /^(Ministerstvo|Úrad vlády|Magistrát|Bratislavský samosprávny kraj)/i.test(t.name ?? '')) return 'urad';
  if (t.shop === 'mall') return 'obchodne-centrum';
  return null;
}

function meno(t, druh) {
  let n = t.name ?? t['name:sk'] ?? t.official_name ?? '';
  // bez právnej formy (s. r. o., a. s., n. o.) a bez obchodných značiek
  n = n.replace(/,?\s*(s\.\s?r\.\s?o\.|a\.\s?s\.|n\.\s?o\.)\s*,?$/i, '').trim();
  if (RETAZCE.test(n)) n = druh === 'nemocnica' ? 'Nemocnica' : druh === 'obchodne-centrum' ? 'Obchodné centrum' : n.replace(RETAZCE, '').trim();
  if (!n) n = { stanica: 'Železničná stanica', autobusova: 'Autobusová stanica', letisko: 'Letisko', pristav: 'Prístav',
    policia: 'Polícia', hasici: 'Hasiči', nemocnica: 'Nemocnica', posta: 'Pošta', skola: 'Škola', univerzita: 'Vysoká škola',
    urad: 'Úrad', 'obchodne-centrum': 'Obchodné centrum' }[druh];
  return n.replace(/\s+/g, ' ').trim();
}

const out = [];
const vnutri = (x, z) => x > H.minX && x < H.maxX && z > H.minZ && z < H.maxZ;
for (const [, u] of db.uzly) {
  if (!u.t) continue;
  const druh = typ(u.t);
  if (!druh) continue;
  const [x, z] = naMetre(u.lon, u.lat);
  if (vnutri(x, z)) out.push({ typ: druh, nazov: meno(u.t, druh), x: r1(x), z: r1(z) });
}
for (const [, w] of db.cesty) {
  const druh = typ(w.t);
  if (!druh) continue;
  const p = w.nd.map((n) => db.uzly.get(n)).filter(Boolean).map((u) => naMetre(u.lon, u.lat));
  if (p.length < 3) continue;
  const x = p.reduce((s, q) => s + q[0], 0) / p.length, z = p.reduce((s, q) => s + q[1], 0) / p.length;
  if (!vnutri(x, z)) continue;
  const z_ = { typ: druh, nazov: meno(w.t, druh), x: r1(x), z: r1(z) };
  if (w.t.building) z_.budova = p.map(([a, b]) => [r1(a), r1(b)]).slice(0, -1);
  else z_.areal = p.map(([a, b]) => [r1(a), r1(b)]).slice(0, -1);
  out.push(z_);
}
// zlúč duplicity (uzol + obrys toho istého miesta): rovnaký typ a meno do 80 m – nechaj ten s budovou
const vysledok = [];
for (const s of out.sort((a, b) => (b.budova ? 2 : b.areal ? 1 : 0) - (a.budova ? 2 : a.areal ? 1 : 0))) {
  if (vysledok.some((v) => v.typ === s.typ && v.nazov === s.nazov && Math.hypot(v.x - s.x, v.z - s.z) < 80)) continue;
  vysledok.push(s);
}
const pocty = {};
for (const s of vysledok) pocty[s.typ] = (pocty[s.typ] ?? 0) + 1;
console.log(vysledok.length, 'miest', pocty);
writeFileSync('../../data/mapa/sluzby.json', JSON.stringify({
  popis: 'VYGENEROVANÉ z OpenStreetMap (tools/mesto/sluzby.mjs): verejné služby a dôležité miesta. © prispievatelia OpenStreetMap, ODbL.',
  sluzby: vysledok,
}));
