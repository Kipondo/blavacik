// Podniky študentského mestečka Mlynská dolina z OSM → data/mapa/podniky.json (issue #73):
// kluby, bary, krčmy, kaviarne, bistrá, reštaurácie, obchody, práčovne, posilňovne.
// Formát je rovnaký ako data/mapa/sluzby.json, takže tabule stavia js/mapa/vybavenie/oznacenia-modul.js
// (na fasáde budovy nad vchodom, menšie ako tabule verejných služieb).
// Názvy len tie, čo sú v OSM; reťazce (tag brand alebo známe meno) dostanú len všeobecný nápis – v hre nie sú značky firiem.
// Obchody vnútri obchodného centra sa vynechajú (tabuľu má centrum samo).
// Spustenie: cd tools/mesto && node --max-old-space-size=8000 podniky.mjs
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { nacitajPbf } from './pbf.mjs';
import { CACHE, naMetre } from './spolocne.mjs';

// dlaždice Mlynskej doliny (rovnaké ako MLYNSKA_DOLINA v tools/mesto/laser/spolocne.py), 500 m
const DLAZDICE = [[-7, -4], [-6, -4], [-6, -3], [-6, -5], [-5, -4]];
const vMlynskej = (x, z) => DLAZDICE.some(([i, j]) => x >= i * 500 && x < (i + 1) * 500 && z >= j * 500 && z < (j + 1) * 500);
const r1 = (v) => Math.round(v * 10) / 10;
const RETAZCE = /\b(Billa|Lidl|Tesco|Kaufland|Terno|Kraj|COOP|Jednota|Fresh|dm|Rossmann|Teta|Dr\.Max|Benu|Martinus|Panta Rhei|Niké|Tipos|Fortuna|Geco|Ševt|McDonald'?s|KFC|Burger King|Subway|Starbucks|Costa|Bageterie|Yamamay|Inglot|Morgan|Café Coton|Pet Center|Loding|Specialized)\b/i;

// amenity / leisure → druh tabule (DRUHY v oznacenia-modul.js)
const AMENITY = { nightclub: 'klub', bar: 'bar', pub: 'krcma', cafe: 'kaviaren', fast_food: 'bistro', restaurant: 'restauracia', ice_cream: 'zmrzlina', biergarten: 'krcma' };
// shop=* → druh, prípadne vlastný nápis na tabuli
const OBCHODY = {
  supermarket: ['potraviny'], convenience: ['potraviny'], greengrocer: ['potraviny', 'OVOCIE A ZELENINA'],
  bakery: ['pekaren'], pastry: ['pekaren', 'CUKRÁREŇ'], confectionery: ['pekaren', 'CUKRÁREŇ'],
  laundry: ['pracovna'], dry_cleaning: ['pracovna', 'ČISTIAREŇ'],
  hairdresser: ['obchod', 'KADERNÍCTVO'], beauty: ['obchod', 'KOZMETIKA'], copyshop: ['obchod', 'KOPÍROVANIE'],
  stationery: ['obchod', 'PAPIERNÍCTVO'], books: ['obchod', 'KNIHY'], newsagent: ['obchod', 'TABAK A TLAČ'],
  tobacco: ['obchod', 'TABAK'], kiosk: ['obchod', 'STÁNOK'], florist: ['obchod', 'KVETINY'], wine: ['obchod', 'VÍNOTÉKA'],
  alcohol: ['obchod', 'NÁPOJE'], beverages: ['obchod', 'NÁPOJE'], computer: ['obchod', 'POČÍTAČE'], mobile_phone: ['obchod', 'MOBILY'],
  electronics: ['obchod', 'ELEKTRO'], chemist: ['obchod', 'DROGÉRIA'], optician: ['obchod', 'OPTIKA'], pharmacy: ['obchod', 'LEKÁREŇ'],
  clothes: ['obchod', 'OBLEČENIE'], shoes: ['obchod', 'OBUV'], bicycle: ['obchod', 'BICYKLE'], sports: ['obchod', 'ŠPORT'],
  bookmaker: ['obchod', 'STÁVKOVÁ KANCELÁRIA'], pet: ['obchod', 'CHOVATEĽSKÉ POTREBY'], kitchen: ['obchod', 'KUCHYNE'],
  car_repair: ['obchod', 'AUTOSERVIS'], car_parts: ['obchod', 'AUTODIELY'], medical_supply: ['obchod', 'ZDRAVOTNÍCKE POTREBY'],
  jewelry: ['obchod', 'ŠPERKY'], gift: ['obchod', 'DARČEKY'], toys: ['obchod', 'HRAČKY'], furniture: ['obchod', 'NÁBYTOK'],
  tea: ['obchod', 'ČAJ'], outdoor: ['obchod', 'OUTDOOR'], perfumery: ['obchod', 'PARFUMY'],
};

function druh(t) {
  if (AMENITY[t.amenity]) return [AMENITY[t.amenity]];
  if (t.amenity === 'pharmacy') return ['obchod', 'LEKÁREŇ'];
  if (t.leisure === 'fitness_centre') return ['fitness'];
  if (t.shop && t.shop !== 'vacant' && t.shop !== 'mall') return OBCHODY[t.shop] ?? ['obchod'];
  return null;
}

function meno(t) {
  let n = (t.name ?? '').replace(/,?\s*(s\.\s?r\.\s?o\.|a\.\s?s\.)\s*$/i, '').replace(/\s+/g, ' ').trim();
  if (t.brand || t['brand:wikidata'] || RETAZCE.test(n)) n = '';
  return n;
}

const bodVPolygone = (x, z, p) => {
  let in_ = false;
  for (let i = 0, j = p.length - 1; i < p.length; j = i++) {
    if ((p[i][1] > z) !== (p[j][1] > z) && x < ((p[j][0] - p[i][0]) * (z - p[i][1])) / (p[j][1] - p[i][1]) + p[i][0]) in_ = !in_;
  }
  return in_;
};

const db = await nacitajPbf(join(CACHE, 'bratislavsky.osm.pbf'));
const obrys = (w) => w.nd.map((n) => db.uzly.get(n)).filter(Boolean).map((u) => naMetre(u.lon, u.lat));
const centra = [];
for (const w of db.cesty.values()) if (w.t.shop === 'mall') centra.push(obrys(w));

const out = [];
const pridaj = (t, x, z, budova) => {
  const d = druh(t);
  if (!d || !vMlynskej(x, z)) return;
  if (!budova && centra.some((c) => bodVPolygone(x, z, c))) return;
  const s = { typ: d[0], nazov: meno(t), x: r1(x), z: r1(z) };
  if (d[1]) s.text = d[1];
  if (budova) s.budova = budova.map(([a, b]) => [r1(a), r1(b)]).slice(0, -1);
  out.push(s);
};
for (const u of db.uzly.values()) {
  if (!u.t || !(u.t.amenity || u.t.shop || u.t.leisure)) continue;
  const [x, z] = naMetre(u.lon, u.lat);
  pridaj(u.t, x, z, null);
}
for (const w of db.cesty.values()) {
  if (!(w.t.amenity || w.t.shop || w.t.leisure)) continue;
  const p = obrys(w);
  if (p.length < 4) continue;
  const x = p.reduce((s, q) => s + q[0], 0) / p.length, z = p.reduce((s, q) => s + q[1], 0) / p.length;
  // obrys len ak je to budova; areál (napr. posilňovňa vonku) dostane stojan v strede
  pridaj(w.t, x, z, w.t.building ? p : null);
}
// rovnaký podnik dvakrát (uzol aj obrys) – nechaj ten s budovou
const vysledok = [];
for (const s of out.sort((a, b) => (b.budova ? 1 : 0) - (a.budova ? 1 : 0))) {
  if (s.nazov && vysledok.some((v) => v.typ === s.typ && v.nazov === s.nazov && Math.hypot(v.x - s.x, v.z - s.z) < 40)) continue;
  vysledok.push(s);
}
const pocty = {};
for (const s of vysledok) pocty[s.typ] = (pocty[s.typ] ?? 0) + 1;
console.log(vysledok.length, 'podnikov', pocty);
writeFileSync(join(CACHE, '..', '..', 'data', 'mapa', 'podniky.json'), JSON.stringify({
  popis: 'VYGENEROVANÉ z OpenStreetMap (tools/mesto/podniky.mjs): podniky v Mlynskej doline. © prispievatelia OpenStreetMap, ODbL.',
  sluzby: vysledok,
}));
