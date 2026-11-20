// Typ budovy (panelák, rodinný dom, hala, garáž, meštiansky dom…) – podľa dát, ktoré dlaždice už majú.
//
// Dlaždice nenesú OSM značku `building`, ale odhadnutá výška ju prezrádza: tools/osm/klasifikuj.mjs dáva budove bez
// výšky predvolenú výšku podľa typu (house 7 m, garage 3 m, apartments 17 m, industrial 9 m…, neznámy typ 12 m).
// Pri neznámom type (~60 % budov) rozhoduje tvar pôdorysu (plocha, šírka, dĺžka, pravouhlosť), strecha a štvrť.
// Keď dlaždice raz budú mať `typOsm` (pridáva ho klasifikuj.mjs pri ďalšom pregenerovaní), použije sa priamo.
//
// typizujBudovu(b) doplní do budovy (raz, ďalšie volania nič nerobia):
//   b.typ       – 'historicka' | 'mestska' | 'bytovka' | 'panelak' | 'rodinny-dom' | 'garaz' | 'hala' | 'obchod' | 'kancelarie' | 'sklo'
//   b.styl      – stĺpec atlasu fasád (STYLY v fasady.js)
//   b.podlazia  – počet nadzemných podlaží, keď je známy z OSM (inak sa ráta z výšky)
// a pri budovách s odhadnutou výškou opraví výšku podľa typu (garáž nie je 12 m vysoká) a farbu z palety typu.
// Skutočnú výšku (laser, OSM) a skutočnú farbu (OSM building:colour) nemení.
//
// Bez Three.js – dá sa použiť aj v Node (kontrola rozdelenia: node tools/mesto/typy-budov.mjs).

import { plochaPolygonu, stredBodov } from '../geometria.js';

// stĺpce atlasu fasád (rovnaké čísla ako STYLY v fasady.js – tu kvôli Node bez Three.js)
const S = { stare: 0, obytne: 1, kancelarie: 2, jednoduche: 3, panelak: 4, dom: 5, hala: 6 };

// predvolené výšky z tools/osm/klasifikuj.mjs (vyskaBudovy) → typ
const PODLA_ODHADU = {
  3: 'garaz', 4: 'hala', 7: 'rodinny-dom', 8: 'obchod', 9: 'hala', 10: 'hala',
  14: 'bytovka', 15: 'kancelarie', 16: 'kancelarie', 17: 'bytovka', 18: 'kancelarie', 25: 'historicka',
};
const NEZNAMY_ODHAD = 12;

// OSM building=* → typ (pre dlaždice s typOsm)
const PODLA_OSM = {
  house: 'rodinny-dom', detached: 'rodinny-dom', semidetached_house: 'rodinny-dom', terrace: 'rodinny-dom', bungalow: 'rodinny-dom',
  villa: 'rodinny-dom', farm: 'rodinny-dom', cabin: 'rodinny-dom',
  garage: 'garaz', garages: 'garaz', shed: 'garaz', hut: 'garaz', kiosk: 'garaz', carport: 'garaz', greenhouse: 'garaz', roof: 'garaz',
  industrial: 'hala', warehouse: 'hala', manufacture: 'hala', service: 'hala', hangar: 'hala', storage_tank: 'hala',
  barn: 'hala', farm_auxiliary: 'hala', train_station: 'hala', transportation: 'hala', parking: 'hala', sports_hall: 'hala',
  retail: 'obchod', supermarket: 'obchod',
  apartments: 'bytovka', residential: 'bytovka', dormitory: 'bytovka',
  office: 'kancelarie', commercial: 'kancelarie', hotel: 'kancelarie', hospital: 'kancelarie', university: 'kancelarie',
  school: 'kancelarie', college: 'kancelarie', kindergarten: 'kancelarie', public: 'kancelarie', civic: 'kancelarie', government: 'kancelarie',
  church: 'historicka', cathedral: 'historicka', chapel: 'historicka', monastery: 'historicka', castle: 'historicka',
};

// výška (m) pre budovu s neznámym typom aj výškou – podľa typu, ktorý sme odhadli z pôdorysu
const VYSKA_PRE_NEZNAMU = { garaz: 3, 'rodinny-dom': 7, hala: 9 };

// Farby, ktoré klasifikuj.mjs vyberá z paliet (PALETY) – tie nie sú zo skutočnosti, smieme ich vymeniť za paletu typu.
const FARBY_Z_PALIET = new Set([
  '#ecd28f', '#f1e3c6', '#e9b98f', '#f0c4b4', '#cfdcae', '#f4efe4', '#e6c46f', '#d8c3a5', '#f2d6b0', '#f6e7a8', '#c9d6dc', '#e8a98c', '#f5f0e0', '#dcc89a',
  '#d6d0c2', '#c9c6bd', '#e0dbd0', '#c2b59b', '#d8cbb4', '#bfc4c0', '#e4ddcf',
  '#8fa7b8', '#a3b9c7', '#c8d3da', '#9ea7ad', '#d5d8d6', '#b6c2c8',
  '#f2f0ea', '#e9e5da', '#f6d28b', '#a8d0e6', '#f4a6a6', '#b8e0b0', '#d9c2f0', '#ffd8a8', '#fff2a8',
  '#ece2cf', '#e6d6bf', '#f0e6d8', '#dfe6e0',
]);
const PALETY_TYPOV = {
  // zateplené paneláky: pastelové aj výrazné farby, biela a béžová
  panelak: ['#f2f0ea', '#e9e5da', '#f6d28b', '#a8d0e6', '#f4b6a6', '#b8e0b0', '#d9c2f0', '#ffd8a8', '#fff2a8', '#e6e2d6', '#cfe3ea', '#f3c98b'],
  'rodinny-dom': ['#f4f1ea', '#efe6d2', '#f3e2b8', '#e9d2b4', '#f1d9c5', '#dcdcd6', '#f6efd9', '#e8c99a', '#d9e0d3', '#f0ead8', '#e6b98f'],
  hala: ['#c9cdd0', '#b8bec2', '#d6d8d6', '#a9b2b8', '#e2e2dc', '#9aa5ad', '#c4c8bf', '#b9c6cf'],
  garaz: ['#c8c4bb', '#b5b1a8', '#d4cfc4', '#a8a59e', '#beb8ab'],
};

// škridla a plech na strechách rodinných domov (tehlová, hnedá, antracit, sivá)
const STRECHY_DOMOV = ['#9c3d2b', '#8a4b33', '#7a3b2c', '#5a4a42', '#4a4b4f', '#6b6b69', '#a5523a'];

// Štvrte (súradnice hry: x na východ, z na juh, 0,0 ≈ Hviezdoslavovo námestie)
const vJadre = (x, z) => x > -300 && x < 420 && z > -420 && z < 440;                 // historické jadro (ako klasifikuj.mjs)
const voVnutornomMeste = (x, z) => z < 450 && ((x - 300) / 2100) ** 2 + ((z + 500) / 1400) ** 2 < 1; // činžiaky, staré bloky
const vPetrzalke = (x, z) => z > 800 && z < 5000 && x > -2500 && x < 4000;

/** Najmenší natočený obdĺžnik okolo pôdorysu (podľa smerov strán) → { dlzka, sirka, plocha }. */
export function obdlznikOkolo(body) {
  let naj = null;
  for (let i = 0; i < body.length; i++) {
    const p = body[i], q = body[(i + 1) % body.length];
    const dx = q[0] - p[0], dz = q[1] - p[1];
    const d = Math.hypot(dx, dz);
    if (d < 0.5) continue;
    const c = dx / d, s = dz / d;
    let u0 = Infinity, u1 = -Infinity, v0 = Infinity, v1 = -Infinity;
    for (const [x, z] of body) {
      const u = x * c + z * s, v = -x * s + z * c;
      if (u < u0) u0 = u; if (u > u1) u1 = u; if (v < v0) v0 = v; if (v > v1) v1 = v;
    }
    const A = (u1 - u0) * (v1 - v0);
    if (!naj || A < naj.plocha) naj = { plocha: A, dlzka: Math.max(u1 - u0, v1 - v0), sirka: Math.min(u1 - u0, v1 - v0) };
  }
  return naj ?? { plocha: 0, dlzka: 0, sirka: 0 };
}

/** Deterministická „náhoda“ 0…1 podľa polohy. */
function nahoda(x, z, k = 1) {
  const s = Math.sin(x * 12.9898 * k + z * 78.233) * 43758.5453;
  return s - Math.floor(s);
}

/** Počet podlaží z OSM výšky (klasifikuj.mjs: levels · 3,2 + 1), len keď výška prišla z OSM. */
function podlaziaZOsm(b) {
  const zdroj = b.zdrojOsm ?? b.zdrojVysky;
  const v = b.vyskaOsm ?? b.vyska;
  if (zdroj !== 'osm' || !(v > 0)) return undefined;
  const n = Math.round((v - 1) / 3.2);
  return n >= 1 && n <= 60 ? n : undefined;
}

/** Určí typ budovy (bez zmeny dát). */
export function urciTyp(b) {
  if (b.sklo) return 'sklo';
  if (b.typOsm && PODLA_OSM[b.typOsm]) {
    const t = PODLA_OSM[b.typOsm];
    // v historickom jadre sú byty aj úrady v starých meštianskych domoch
    if ((t === 'bytovka' || t === 'kancelarie') && vJadre(...stredBodov(b.body))) return 'historicka';
    return t;
  }

  const odhad = (b.zdrojOsm ?? b.zdrojVysky) === 'odhad' ? Math.round(b.vyskaOsm ?? b.vyska) : null;
  const [cx, cz] = stredBodov(b.body);
  const plocha = Math.abs(plochaPolygonu(b.body));
  const { dlzka, sirka, plocha: obd } = obdlznikOkolo(b.body);
  const pravouhla = obd > 0 && plocha / obd > 0.82;
  const jadro = vJadre(cx, cz), mesto = voVnutornomMeste(cx, cz);
  const tabula = sirka >= 9 && sirka <= 17 && dlzka >= 28 && pravouhla && !b.strecha;        // doska paneláku
  const vezovy = sirka >= 14 && dlzka <= 40 && pravouhla && !b.strecha;                          // bodový panelák

  // typ z OSM prezradený odhadnutou výškou
  if (odhad !== null && odhad !== NEZNAMY_ODHAD && PODLA_ODHADU[odhad]) {
    const t = PODLA_ODHADU[odhad];
    if (t === 'bytovka') {
      if (jadro) return 'historicka';
      if (mesto) return 'mestska';
      if (tabula || (vezovy && !mesto)) return 'panelak';
    }
    if (t === 'rodinny-dom' && jadro) return 'historicka';
    return t;
  }

  const znamaVyska = odhad === null;
  const h = b.vyska;
  if (plocha < 40 && (!znamaVyska || h <= 6)) return 'garaz';
  if (jadro) return 'historicka';
  if (znamaVyska) {
    if (h >= 26) {
      if (sirka <= 20 && pravouhla) return 'panelak';
      return plocha > 1500 ? 'kancelarie' : nahoda(cx, cz) < 0.5 ? 'kancelarie' : 'panelak';
    }
    if (plocha > 1200 && h <= 14) return 'hala';
    if (h <= 10 && plocha < 260) return mesto ? 'mestska' : 'rodinny-dom';
    if (mesto) return 'mestska';
    if ((tabula || vezovy) && h >= 9) return 'panelak';
    return 'bytovka';
  }
  // neznámy typ aj výška: len pôdorys a štvrť
  if (plocha > 1500 || (plocha > 600 && sirka > 24)) return 'hala';
  if (mesto) return 'mestska';
  if (plocha <= 260 && sirka <= 16) return 'rodinny-dom';
  if (tabula || (vezovy && vPetrzalke(cx, cz))) return 'panelak';
  return 'bytovka';
}

/** Stĺpec atlasu fasád pre typ. */
function stylPreTyp(typ, b, cx, cz) {
  const r = nahoda(cx, cz, 3);
  switch (typ) {
    case 'historicka': return S.stare;
    case 'mestska': return r < 0.6 ? S.stare : S.jednoduche;
    case 'bytovka': return r < 0.55 ? S.obytne : S.jednoduche;
    case 'panelak': return S.panelak;
    case 'rodinny-dom': return S.dom;
    case 'garaz': case 'hala': return S.hala;
    case 'obchod': return S.jednoduche;
    case 'kancelarie': return r < 0.7 ? S.kancelarie : S.jednoduche;
    default: return S.jednoduche;
  }
}

/** Doplní typ, štýl a podlažia; pri odhadnutej výške a farbe ich prispôsobí typu. Volať pred stavbou geometrie. */
export function typizujBudovu(b) {
  if (b._typ || !b.body || b.body.length < 3) return b;
  const typ = urciTyp(b);
  const [cx, cz] = stredBodov(b.body);
  b._typ = true;
  b.typ = typ;
  b.styl = stylPreTyp(typ, b, cx, cz);
  const pod = podlaziaZOsm(b);
  if (pod) b.podlazia = pod;

  if (b.zdrojVysky === 'odhad' && Math.round(b.vyska) === NEZNAMY_ODHAD) {
    if (VYSKA_PRE_NEZNAMU[typ]) b.vyska = VYSKA_PRE_NEZNAMU[typ];
    else if (typ === 'panelak' && vPetrzalke(cx, cz)) b.vyska = 24;      // petržalské paneláky majú 8–13 podlaží, nie 4
  }
  const pal = PALETY_TYPOV[typ];
  if (pal && (!b.farba || FARBY_Z_PALIET.has(b.farba))) b.farba = pal[Math.floor(nahoda(cx, cz, 7) * pal.length) % pal.length];
  // rodinné domy majú väčšinou šikmú strechu – keď OSM ani laser nehovoria, že je plochá (asi 1/5 nechá plochú)
  if (typ === 'rodinny-dom' && !b.strecha && !b.lod2 && b.tvarOsm !== 'flat' && b.tvarStrechy !== 'plocha' && nahoda(cx, cz, 11) < 0.8) {
    b.strecha = STRECHY_DOMOV[Math.floor(nahoda(cx, cz, 13) * STRECHY_DOMOV.length) % STRECHY_DOMOV.length];
  }
  return b;
}

/** Typizuje celý zoznam (idempotentné). */
export function typizujBudovy(budovy) {
  for (const b of budovy ?? []) typizujBudovu(b);
  return budovy;
}
