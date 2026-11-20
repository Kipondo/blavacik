// Prevedie geometriu z OSM na dáta mapy hry (formát ako data/mapa/zakladna.json + rozšírenia).

import {
  bodVPolygone, ohranicenie, plochaPolygonu, stredBodov, vzdialenostOdCiary, nahodne, najblizsiNaUsecke,
} from '../../js/mapa/geometria.js';
import { spojRetazce } from './zostav.mjs';

const r1 = (v) => Math.round(v * 10) / 10;
const bodR = ([x, z]) => [r1(x), r1(z)];

// --- cesty ---------------------------------------------------------------
const CESTY_PRE_AUTA = {
  motorway: { sirka: 15, pruhy: 4 }, motorway_link: { sirka: 7, pruhy: 1 },
  trunk: { sirka: 15, pruhy: 4 }, trunk_link: { sirka: 7, pruhy: 1 },
  primary: { sirka: 14, pruhy: 4 }, primary_link: { sirka: 7, pruhy: 1 },
  secondary: { sirka: 12, pruhy: 2 }, secondary_link: { sirka: 7, pruhy: 1 },
  tertiary: { sirka: 10, pruhy: 2 }, tertiary_link: { sirka: 6, pruhy: 1 },
  unclassified: { sirka: 8, pruhy: 2 }, residential: { sirka: 8, pruhy: 2 },
  living_street: { sirka: 6, pruhy: 1 }, service: { sirka: 5, pruhy: 1 },
};
const PESIE = { footway: 2.5, path: 2, steps: 2.5, cycleway: 2.5, pedestrian: 6, track: 3, corridor: 2, platform: 3 };

// --- pokrývka zeme (kreslí sa do textúry terénu) --------------------------
function kategoriaPokryvky(t) {
  const lu = t.landuse, le = t.leisure, na = t.natural, am = t.amenity;
  if (['forest'].includes(lu) || ['wood', 'scrub', 'heath'].includes(na) || t.landcover === 'trees') return 'les';
  if (['grass', 'meadow', 'village_green', 'recreation_ground', 'greenfield', 'grassland', 'flowerbed', 'allotments', 'orchard', 'vineyard'].includes(lu)
    || ['park', 'garden', 'dog_park', 'golf_course'].includes(le) || ['grassland', 'shrubbery'].includes(na)) return 'trava';
  if (lu === 'cemetery' || am === 'grave_yard') return 'cintorin';
  if (['pitch', 'playground', 'track', 'sports_centre', 'fitness_station', 'schoolyard'].includes(le)) return 'ihrisko';
  if (am === 'parking' || t.parking) return 'parkovisko';
  if (t.place === 'square' || (t.highway === 'pedestrian') || t['area:highway'] === 'pedestrian' || am === 'marketplace' || t.highway === 'footway') return 'dlazba';
  if (na === 'beach' || na === 'sand' || le === 'beach_resort') return 'piesok';
  if (lu === 'railway') return 'zeleznica';
  if (lu === 'construction' || lu === 'brownfield') return 'stavenisko';
  return null;
}

// --- farby budov ---------------------------------------------------------
const MENA_FARIEB = {
  white: '#f4f2ec', yellow: '#efd98f', beige: '#e3d3b0', grey: '#a9a9a6', gray: '#a9a9a6', red: '#b9533f',
  brown: '#8a6447', pink: '#f0c4bb', orange: '#e8a160', green: '#a9c79a', blue: '#9db7cf', cream: '#f2e6c8',
  lightgrey: '#cfcfcb', lightgray: '#cfcfcb', darkgrey: '#6b6b69', darkgray: '#6b6b69', black: '#3a3a3a',
  ochre: '#d3a85a', tan: '#d2b48c', ivory: '#f6f1df', maroon: '#7a3a30', silver: '#c0c4c8', gold: '#d9b04a',
};
const PALETY = {
  stare: ['#ecd9a3', '#f1e3c6', '#e8c4a0', '#f3d1c4', '#d9e4c8', '#f4efe4', '#e6cf8f', '#d8c3a5', '#e9d4bd', '#f6e7b8'],
  mesto: ['#d6d0c2', '#c9c6bd', '#e0dbd0', '#c2b59b', '#d8cbb4', '#bfc4c0', '#e4ddcf'],
  moderne: ['#8fa7b8', '#a3b9c7', '#c8d3da', '#9ea7ad', '#d5d8d6', '#b6c2c8'],
  panelaky: ['#f2f0ea', '#e9e5da', '#f6d28b', '#a8d0e6', '#f4a6a6', '#b8e0b0', '#d9c2f0', '#ffd8a8', '#fff2a8'],
  vily: ['#f4efe4', '#ece2cf', '#e6d6bf', '#f0e6d8', '#dfe6e0'],
};
const STRECHY = { stare: ['#9c3d2b', '#8a4b33', '#a5523a', '#7a3b2c', '#6d5547'], ostatne: ['#5a4a42', '#6b6b69', '#7a3b2c', '#4f5a5e'] };

function farba(t) {
  const c = (t['building:colour'] || t.colour || '').toLowerCase().trim();
  if (/^#[0-9a-f]{6}$/.test(c)) return c;
  if (/^#[0-9a-f]{3}$/.test(c)) return '#' + [...c.slice(1)].map((x) => x + x).join('');
  return MENA_FARIEB[c.replace(/[\s_-]/g, '')] ?? null;
}

function stvrt(x, z) {
  if (x > -300 && x < 420 && z > -420 && z < 440) return 'stare';
  if (z > 800) return 'panelaky';
  if (x < -350 && z < 300) return 'vily';
  if (x > 800) return 'moderne';
  return 'mesto';
}

function cislo(v) {
  if (v === undefined) return NaN;
  return parseFloat(String(v).replace(',', '.'));
}

/** Zdroj výšky budovy: 'osm' (značka height alebo building:levels), inak 'odhad' podľa typu. */
function zdrojVysky(t) {
  return cislo(t.height) > 0 || cislo(t['building:levels']) > 0 ? 'osm' : 'odhad';
}

function vyskaBudovy(t) {
  const h = cislo(t.height);
  if (h > 0) return h;
  const lev = cislo(t['building:levels']);
  const roof = cislo(t['roof:levels']) || 0;
  if (lev > 0) return lev * 3.2 + roof * 2.2 + 1;
  const typ = t.building || t['building:part'];
  const predvolene = {
    house: 7, detached: 7, garage: 3, garages: 3, shed: 3, kiosk: 3, hut: 3, roof: 0, service: 4,
    church: 18, chapel: 9, cathedral: 25, apartments: 17, residential: 14, commercial: 15, office: 18,
    retail: 8, industrial: 9, warehouse: 9, school: 12, university: 16, hospital: 18, hotel: 18,
    civic: 14, public: 14, train_station: 10, transportation: 8, construction: 10,
  };
  return predvolene[typ] ?? 12;
}

/** Zjednoduší lomenú čiaru (Douglas–Peucker). */
export function zjednodus(body, tolerancia, chranene = null) {
  if (body.length < 3) return body;
  const zachovaj = new Uint8Array(body.length);
  zachovaj[0] = zachovaj[body.length - 1] = 1;
  // chránené body (napr. križovatky) zostanú vždy – zjednodušujeme len medzi nimi
  if (chranene) {
    const idx = [0];
    for (let i = 1; i < body.length - 1; i++) if (chranene(i)) { zachovaj[i] = 1; idx.push(i); }
    idx.push(body.length - 1);
    if (idx.length > 2) {
      const out = [];
      for (let k = 0; k < idx.length - 1; k++) {
        const cast = zjednodus(body.slice(idx[k], idx[k + 1] + 1), tolerancia);
        out.push(...(k ? cast.slice(1) : cast));
      }
      return out;
    }
  }
  const zasobnik = [[0, body.length - 1]];
  while (zasobnik.length) {
    const [a, b] = zasobnik.pop();
    let max = 0, idx = -1;
    for (let i = a + 1; i < b; i++) {
      const n = najblizsiNaUsecke(body[i][0], body[i][1], body[a][0], body[a][1], body[b][0], body[b][1]);
      if (n.d2 > max) { max = n.d2; idx = i; }
    }
    if (idx > 0 && max > tolerancia * tolerancia) {
      zachovaj[idx] = 1;
      zasobnik.push([a, idx], [idx, b]);
    }
  }
  return body.filter((_, i) => zachovaj[i]);
}

function vnutriHranic(body, H, okraj = 50) {
  const o = ohranicenie(body);
  return o.maxX > H.minX - okraj && o.minX < H.maxX + okraj && o.maxZ > H.minZ - okraj && o.minZ < H.maxZ + okraj;
}

// --- hlavná funkcia ------------------------------------------------------
export function klasifikuj(geo, moznosti) {
  const { hranice: H, pamiatky = [], styly = [], seed = 1 } = moznosti;
  const rnd = nahodne(seed);
  const vynimky = pamiatky.filter((p) => p.model && p.zaber).map((p) => ({
    x: p.x, z: p.z, r: p.zaber.kruh ?? null, w: p.zaber.obdlznik?.[0], d: p.zaber.obdlznik?.[1],
    c: Math.cos(p.natocenie ?? 0), s: Math.sin(p.natocenie ?? 0),
  }));
  // bod v kruhu alebo v otočenom obdĺžniku (natočenie ako v js/mapa/geometria.js → obdlznik)
  const vPamiatke = (x, z) => vynimky.some((v) => {
    if (v.r !== null) return Math.hypot(x - v.x, z - v.z) < v.r;
    const dx = x - v.x, dz = z - v.z;
    const lx = dx * v.c - dz * v.s, lz = dx * v.s + dz * v.c;
    return Math.abs(lx) < v.w / 2 && Math.abs(lz) < v.d / 2;
  });
  const stylPodlaMena = new Map(styly.map((s) => [s.nazov, s]));

  const out = {
    budovy: [], cesty: [], chodniky: [], kolajnice: [], pokryvka: [], voda: [], mosty: [], stromy: [],
    prvky: { semafory: [], prechody: [], stop: [], prednost: [], lampy: [], zastavky: [], lavicky: [] },
    nazvy: {},
  };

  // rieky (na vynechanie budov na vode – botely, pontóny)
  const riekyPolygony = geo.polygony.filter((p) => p.t.natural === 'water' && ['river', 'harbour'].includes(p.t.water)).map((p) => ({ body: p.body, o: ohranicenie(p.body) }));

  // --- budovy (časti budov majú prednosť pred obrysom celej budovy) ---
  const casti = geo.polygony.filter((p) => p.t['building:part'] && p.t['building:part'] !== 'no');
  // stredy častí budov v mriežke (rýchle hľadanie aj pre celé mesto)
  const mriezkaCasti = new Map();
  for (const p of casti) {
    const [x, z] = stredBodov(p.body);
    const k = `${Math.floor(x / 100)},${Math.floor(z / 100)}`;
    if (!mriezkaCasti.has(k)) mriezkaCasti.set(k, []);
    mriezkaCasti.get(k).push([x, z]);
  }
  const maCasti = (body) => {
    const o = ohranicenie(body);
    for (let i = Math.floor(o.minX / 100); i <= Math.floor(o.maxX / 100); i++) {
      for (let j = Math.floor(o.minZ / 100); j <= Math.floor(o.maxZ / 100); j++) {
        for (const [x, z] of mriezkaCasti.get(`${i},${j}`) ?? []) if (bodVPolygone(x, z, body)) return true;
      }
    }
    return false;
  };
  for (const p of geo.polygony) {
    const t = p.t;
    const jeCast = t['building:part'] && t['building:part'] !== 'no';
    if (!jeCast && (!t.building || t.building === 'no' || t.building === 'roof')) continue;
    if (p.neuplny || p.body.length < 3 || !vnutriHranic(p.body, H, 0)) continue;
    if ((cislo(t.min_height) || 0) > 3 || t.location === 'underground') continue;
    const plocha = Math.abs(plochaPolygonu(p.body));
    if (plocha < 15) continue;
    const [cx, cz] = stredBodov(p.body);
    if (vPamiatke(cx, cz)) continue;
    if (riekyPolygony.some((r) => cx >= r.o.minX && cx <= r.o.maxX && cz >= r.o.minZ && cz <= r.o.maxZ && bodVPolygone(cx, cz, r.body))) continue;
    if (!jeCast && maCasti(p.body)) continue;

    const st = stvrt(cx, cz);
    const i = Math.abs(Math.round(cx * 7 + cz * 13));
    const b = {
      body: zjednodus(p.body, 0.3).map(bodR),
      vyska: Math.max(3, Math.round(vyskaBudovy(t))),
      zdrojVysky: zdrojVysky(t),
      farba: farba(t) ?? PALETY[st][i % PALETY[st].length],
    };
    // vnútorné dvory (vnútorné obrysy multipolygónu)
    const diery = (p.diery ?? []).filter((d) => d.length >= 3 && Math.abs(plochaPolygonu(d)) >= 15).map((d) => zjednodus(d, 0.3).map(bodR));
    if (diery.length) b.diery = diery;
    if (t['roof:shape']) b.tvarOsm = t['roof:shape'];
    const tvar = t['roof:shape'];
    const sikma = ['gabled', 'hipped', 'pyramidal', 'half-hipped', 'mansard', 'gambrel'].includes(tvar)
      || (!tvar && (st === 'stare' || st === 'vily') && b.vyska < 25);
    if (sikma) {
      const rc = (t['roof:colour'] || '').toLowerCase();
      b.strecha = /^#[0-9a-f]{6}$/.test(rc) ? rc : MENA_FARIEB[rc] ?? (st === 'stare' || st === 'vily' ? STRECHY.stare : STRECHY.ostatne)[i % 4];
    }
    if (t.name) b.nazov = t.name;
    const styl = stylPodlaMena.get(t.name);
    if (styl) {
      if (styl.farba) b.farba = styl.farba;
      if (styl.vyska) b.vyska = styl.vyska;
      if (styl.sklo) { b.sklo = true; delete b.strecha; }
    }
    out.budovy.push(b);
  }

  // --- voda: rieky (vyrezávajú koryto) a menšie nádrže ---
  for (const p of geo.polygony) {
    const t = p.t;
    if (!(t.natural === 'water' || t.waterway === 'riverbank' || t.water || t.landuse === 'reservoir' || t.landuse === 'basin')) continue;
    if (!vnutriHranic(p.body, H)) continue;
    const reka = ['river', 'harbour', 'canal', 'oxbow'].includes(t.water) || t.waterway === 'riverbank' || t.water === undefined && p.neuplny;
    const plocha = Math.abs(plochaPolygonu(p.body));
    if (!reka && plocha < 20) continue;
    out.voda.push({
      nazov: t.name ?? (reka ? 'Dunaj' : 'voda'),
      reka: !!reka,
      body: zjednodus(p.body, reka ? 1 : 0.3).map(bodR),
    });
  }

  // --- cesty, chodníky, koľaje ---
  // uzly zdieľané viacerými cestami pre autá (križovatky) – pri zjednodušovaní sa nesmú stratiť
  const pouzitieUzlov = new Map();
  for (const c of geo.ciary) {
    if (!c.t.highway || !CESTY_PRE_AUTA[c.t.highway] || !c.nd) continue;
    for (const id of new Set(c.nd)) pouzitieUzlov.set(id, (pouzitieUzlov.get(id) ?? 0) + 1);
  }
  const ciaryPreAuta = [];
  for (const c of geo.ciary) {
    const t = c.t;
    if (!vnutriHranic(c.body, H)) continue;
    if (t.tunnel === 'yes' || (t.covered === 'yes' && !t.highway)) continue;
    if (t.highway && CESTY_PRE_AUTA[t.highway] && t.area !== 'yes') {
      if (t.highway === 'service' && ['parking_aisle', 'driveway', 'drive-through'].includes(t.service)) {
        out.chodniky.push({ typ: 'sluzobna', sirka: 4, body: zjednodus(c.body, 0.4).map(bodR) });
        continue;
      }
      if (t.tunnel === 'yes') continue;
      const zaklad = CESTY_PRE_AUTA[t.highway];
      const pruhy = parseInt(t.lanes) || zaklad.pruhy;
      const jednosmerka = t.oneway === 'yes' || t.oneway === '1' || t.junction === 'roundabout' || t.highway.endsWith('motorway');
      let sirka = cislo(t.width) || (t.lanes ? pruhy * 3.3 + 1 : zaklad.sirka);
      if (jednosmerka && !t.lanes && !t.width) sirka = Math.min(sirka, Math.max(5, pruhy * 3.6));
      const cesta = {
        nazov: t.name ?? '',
        typ: t.highway,
        sirka: r1(sirka),
        pruhy,
        body: zjednodus(c.body, 0.3, (i) => (pouzitieUzlov.get(c.nd?.[i]) ?? 0) > 1).map(bodR),
      };
      if (jednosmerka) cesta.jednosmerka = true;
      if (t.maxspeed) cesta.max = parseInt(t.maxspeed) || undefined;
      if (t.bridge && t.bridge !== 'no') cesta.most = true;
      if (t.railway === 'tram' || t.embedded_rails === 'tram') cesta.elektricka = true;
      out.cesty.push(cesta);
      ciaryPreAuta.push(cesta);
      if (t.name) out.nazvy[t.name] = (out.nazvy[t.name] ?? 0) + 1;
    } else if (t.highway && PESIE[t.highway] && t.area !== 'yes') {
      out.chodniky.push({ typ: t.highway, sirka: cislo(t.width) || PESIE[t.highway], body: zjednodus(c.body, 0.4).map(bodR) });
    } else if (t.railway === 'tram' || t.railway === 'rail' || t.railway === 'light_rail') {
      if (t.tunnel === 'yes') continue;
      out.kolajnice.push({ typ: t.railway === 'tram' ? 'elektricka' : 'zeleznica', most: t.bridge === 'yes' || undefined, body: zjednodus(c.body, 0.3).map(bodR) });
    } else if (t.natural === 'tree_row') {
      // stromoradie – strom každých ~8 m
      for (let i = 0; i < c.body.length - 1; i++) {
        const [ax, az] = c.body[i], [bx, bz] = c.body[i + 1];
        const d = Math.hypot(bx - ax, bz - az);
        for (let s = 0; s < d; s += 8) out.stromy.push([r1(ax + ((bx - ax) * s) / d), r1(az + ((bz - az) * s) / d), 1]);
      }
    }
  }

  // --- pokrývka zeme ---
  for (const p of geo.polygony) {
    const k = kategoriaPokryvky(p.t);
    if (!k || p.neuplny || !vnutriHranic(p.body, H)) continue;
    if (p.t.building) continue;
    out.pokryvka.push({ k, body: zjednodus(p.body, 0.6).map(bodR) });
  }
  // väčšie plochy kreslíme skôr (menšie sú navrchu)
  out.pokryvka.sort((a, b) => Math.abs(plochaPolygonu(b.body)) - Math.abs(plochaPolygonu(a.body)));

  // --- body: stromy, semafory, prechody, značky, lampy, zastávky ---
  for (const b of geo.body) {
    const t = b.t;
    if (b.x < H.minX || b.x > H.maxX || b.z < H.minZ || b.z > H.maxZ) continue;
    const p = [r1(b.x), r1(b.z)];
    if (t.natural === 'tree') out.stromy.push([...p, 1]);
    if (t.highway === 'traffic_signals' || t.crossing === 'traffic_signals' && t.highway === 'crossing') out.prvky.semafory.push(p);
    if (t.highway === 'crossing' || t.railway === 'crossing') out.prvky.prechody.push(p);
    if (t.highway === 'stop') out.prvky.stop.push(p);
    if (t.highway === 'give_way') out.prvky.prednost.push(p);
    if (t.highway === 'street_lamp') out.prvky.lampy.push(p);
    if (t.highway === 'bus_stop' || t.railway === 'tram_stop' || (t.public_transport === 'platform' && t.name)) {
      out.prvky.zastavky.push({ x: p[0], z: p[1], nazov: t.name ?? '' });
    }
    if (t.amenity === 'bench') out.prvky.lavicky.push(p);
  }

  // --- stromy v lesoch a parkoch (ak ich OSM nemá jednotlivo) ---
  const prekazky = vytvorMriezkuPrekazok(out, 20);
  const hustota = { les: 1 / (moznosti.riedkyLes ?? 70), trava: 1 / 450, cintorin: 1 / 200 };
  for (const p of out.pokryvka) {
    const h = hustota[p.k];
    if (!h) continue;
    const o = ohranicenie(p.body);
    const pocet = Math.min(4000, Math.round(Math.abs(plochaPolygonu(p.body)) * h));
    for (let i = 0; i < pocet; i++) {
      const x = o.minX + rnd() * (o.maxX - o.minX), z = o.minZ + rnd() * (o.maxZ - o.minZ);
      if (!bodVPolygone(x, z, p.body)) continue;
      if (prekazky.blizko(x, z, 3)) continue;
      out.stromy.push([r1(x), r1(z), Math.round((0.8 + rnd() * 0.6) * 100) / 100]);
    }
  }
  // stromy nesmú stáť na ceste ani v budove
  out.stromy = out.stromy.filter(([x, z]) => !prekazky.blizko(x, z, 1.5));

  // --- mosty cez rieku ---
  out.mosty = najdiMosty(geo, out.voda.filter((v) => v.reka));

  return out;
}

/** Mriežka budov a ciest na rýchle testy „je tu niečo blízko?“. */
function vytvorMriezkuPrekazok(out, bunka) {
  const m = new Map();
  const vloz = (minX, minZ, maxX, maxZ, o) => {
    for (let i = Math.floor(minX / bunka); i <= Math.floor(maxX / bunka); i++) {
      for (let j = Math.floor(minZ / bunka); j <= Math.floor(maxZ / bunka); j++) {
        const k = i * 100003 + j;
        if (!m.has(k)) m.set(k, []);
        m.get(k).push(o);
      }
    }
  };
  for (const b of out.budovy) { const o = ohranicenie(b.body); vloz(o.minX, o.minZ, o.maxX, o.maxZ, { typ: 'b', body: b.body }); }
  for (const c of [...out.cesty, ...out.chodniky.filter((c) => c.typ !== 'footway' && c.typ !== 'path'), ...out.kolajnice]) {
    for (let i = 0; i < c.body.length - 1; i++) {
      const [ax, az] = c.body[i], [bx, bz] = c.body[i + 1];
      const r = (c.sirka ?? 3) / 2;
      vloz(Math.min(ax, bx) - r, Math.min(az, bz) - r, Math.max(ax, bx) + r, Math.max(az, bz) + r, { typ: 'c', body: [c.body[i], c.body[i + 1]], r });
    }
  }
  return {
    blizko(x, z, okraj) {
      const z0 = m.get(Math.floor(x / bunka) * 100003 + Math.floor(z / bunka));
      if (!z0) return false;
      for (const o of z0) {
        if (o.typ === 'b' && bodVPolygone(x, z, o.body)) return true;
        if (o.typ === 'c' && vzdialenostOdCiary(x, z, o.body) < o.r + okraj) return true;
      }
      return false;
    },
  };
}

/** Pomenované mosty, ktoré idú ponad rieku → mostovky so stúpaním (od/do/šírka). */
function najdiMosty(geo, rieky) {
  const skupiny = new Map();
  for (const c of geo.ciary) {
    const t = c.t;
    if (!t.bridge || t.bridge === 'no' || !t.name) continue;
    if (!(CESTY_PRE_AUTA[t.highway] || t.railway === 'tram')) continue;
    if (!skupiny.has(t.name)) skupiny.set(t.name, []);
    skupiny.get(t.name).push(c.body);
  }
  const mosty = [];
  for (const [nazov, ciary] of skupiny) {
    const body = ciary.flat();
    // hlavná os (PCA)
    let sx = 0, sz = 0;
    for (const [x, z] of body) { sx += x; sz += z; }
    sx /= body.length; sz /= body.length;
    let xx = 0, xz = 0, zz = 0;
    for (const [x, z] of body) { const dx = x - sx, dz = z - sz; xx += dx * dx; xz += dx * dz; zz += dz * dz; }
    const uhol = 0.5 * Math.atan2(2 * xz, xx - zz);
    const ux = Math.cos(uhol), uz = Math.sin(uhol);
    let tMin = Infinity, tMax = -Infinity, sMin = Infinity, sMax = -Infinity;
    for (const [x, z] of body) {
      const t = (x - sx) * ux + (z - sz) * uz, s = -(x - sx) * uz + (z - sz) * ux;
      tMin = Math.min(tMin, t); tMax = Math.max(tMax, t); sMin = Math.min(sMin, s); sMax = Math.max(sMax, s);
    }
    // úsek osi, ktorý je nad riekou
    let vodaOd = Infinity, vodaDo = -Infinity;
    for (let t = tMin; t <= tMax; t += 2) {
      const x = sx + ux * t, z = sz + uz * t;
      if (rieky.some((r) => bodVPolygone(x, z, r.body))) { vodaOd = Math.min(vodaOd, t); vodaDo = Math.max(vodaDo, t); }
    }
    if (vodaOd > vodaDo) continue; // most nejde ponad rieku
    const nabeh = 45;
    const t0 = Math.max(tMin, vodaOd - nabeh), t1 = Math.min(tMax, vodaDo + nabeh);
    const os = (sMin + sMax) / 2;
    const ox = sx - uz * os, oz = sz + ux * os;
    mosty.push({
      nazov,
      od: bodR([ox + ux * t0, oz + uz * t0]),
      do: bodR([ox + ux * t1, oz + uz * t1]),
      sirka: r1(Math.min(40, sMax - sMin + 8)),
      vyska: 4,
      nabeh,
    });
  }
  return mosty;
}

export { spojRetazce };
