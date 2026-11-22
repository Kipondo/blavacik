// Cestovný poriadok vlakov na Hlavnej stanici (úloha A3) – čisté výpočty bez three.js:
//   - ktoré vlaky jazdia v daný herný deň (služby z GTFS ako bitové masky dní, data/vlaky/poriadok.json),
//   - meškania (~75 % načas, 15 % 5–20 min, 7 % 20–60 min, 3 % 60–180 min; vlaky z/do Košíc meškajú 2× častejšie),
//   - obraty súprav (vlak, ktorý tu končí, odchádza späť ako iný vlak – meškanie sa prenesie na odchod),
//   - pridelenie koľají (jedna súprava na koľaji naraz; diaľkové vlaky pri budove, regionálne ďalej).
// Výsledok dňa je zoznam „pobytov“ súprav na koľajach – modul js/vlaky/modul.js podľa nich hýbe vlakmi
// a plní tabule odchodov a príchodov.

/** Deň hry ako index do bitových masiek služieb; mimo platnosti poriadku sa vezme rovnaký deň v týždni. */
export function indexDna(data, datum) {
  const od = new Date(+data.od.slice(0, 4), +data.od.slice(4, 6) - 1, +data.od.slice(6));
  const doD = new Date(+data.do.slice(0, 4), +data.do.slice(4, 6) - 1, +data.do.slice(6));
  const den = new Date(datum.getFullYear(), datum.getMonth(), datum.getDate());
  const pocet = Math.round((doD - od) / 864e5) + 1;
  let i = Math.round((den - od) / 864e5);
  // mimo platnosti (napr. po decembrovej zmene, kým sa poriadok nepregeneruje): posun o celé týždne dovnútra
  if (i >= pocet) i -= Math.ceil((i - pocet + 1) / 7) * 7;
  if (i < 0) i += Math.ceil(-i / 7) * 7;
  return Math.max(0, Math.min(pocet - 1, i));
}

/** Jazdí služba v deň s indexom i? (maska je hex reťazec, bit 0 = prvý deň platnosti) */
function jazdi(maska, i) {
  const n = maska.length;
  const znak = n - 1 - Math.floor(i / 4);
  if (znak < 0) return false;
  return ((parseInt(maska[znak], 16) >> (i % 4)) & 1) === 1;
}

/** Deterministické „náhodné“ číslo 0–1 podľa textu (rovnaký deň a vlak = rovnaké meškanie). */
export function nahoda(text) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 16777619); }
  h ^= h >>> 13; h = Math.imul(h, 0x5bd1e995); h ^= h >>> 15;
  return (h >>> 0) / 4294967296;
}

const kosicky = (v) => /Košice/.test(`${v.z} ${v.do}`);

/** Meškanie v minútach podľa rozdelenia zo zadania. Vlak, ktorý v Bratislave začína, odchádza skoro vždy načas –
 *  meškanie dostane až od súpravy, ktorá prišla neskoro (obrat). */
export function meskanie(v, klucDna, zacina = false) {
  const u = nahoda(`${klucDna}|${v.kat}${v.cislo}`), w = nahoda(`${klucDna}|${v.cislo}|m`);
  if (zacina) return u < 0.08 ? Math.round(1 + w * 4) : 0;
  const k = kosicky(v) ? 2 : 1;            // Košice: 2× častejšie meškajú (načas 50 %)
  const p3 = 0.03 * k, p7 = 0.07 * k, p15 = 0.15 * k;
  if (u < p3) return Math.round(60 + w * 120);
  if (u < p3 + p7) return Math.round(20 + w * 40);
  if (u < p3 + p7 + p15) return Math.round(5 + w * 15);
  return 0;
}

// koľaje podľa nástupíšť (data/vlaky/trate.json) – poradie = preferencia
const KOLAJE = {
  dialkove: ['1', '2', '4', '10', '14', '16', '18'],
  zapad: ['16', '18', '20', '22', '14', '10', '4', '2'],
  vychod: ['14', '10', '18', '16', '20', '22', '4', '2', '1c'],
};
const PRIBLIZENIE = 4;      // min – súprava je na trase pred príchodom (blokuje koľaj)
const OBRAT_MIN = 12;       // min – najkratší obrat súpravy
const OBRAT_MAX = 150;      // min – dlhší obrat už nie je tá istá súprava (iná z depa)
const OBRAT_NA_KOLAJI = 45; // min – kratší obrat čaká pri nástupišti, dlhší v depe
const PRISTAVENIE = 18;     // min – súprava bez obratu príde z depa pred odchodom
const ODSTAVENIE = 12;      // min – súprava bez obratu odíde do depa po príchode

const DLZKY = { 671: 79.2, reg: 63, 361: 0 };
/** Počet vozňov a dĺžka súpravy (m). */
export function suprava(v) {
  if (v.typ === '361') {
    const vozne = kosicky(v) || ['Ex', 'IC', 'EC', 'EN', 'rj', 'RJ'].includes(v.kat) ? 7 : 5;
    return { typ: '361', vozne, dlzka: 17.2 + vozne * 26.4 };
  }
  return { typ: v.typ, vozne: 3, dlzka: DLZKY[v.typ] ?? 63 };
}

/**
 * Plán dňa: pobyty súprav na koľajach Hlavnej stanice pre herný deň `datum`.
 * Časy sú v minútach od polnoci daného dňa (môžu byť záporné / > 1440 pre vlaky cez polnoc).
 * Pobyt: { kolaj, nastupiste, prichod: vlak|null, odchod: vlak|null, tPri, tOdch, zo, na, suprava }
 *   vlak = { kat, cislo, nazov, z, do, cas (podľa poriadku), meskanie }
 */
export function planDna(data, trate, datum, rezervacie = []) {
  const dnes = indexDna(data, datum);
  const kluc = `${datum.getFullYear()}-${datum.getMonth() + 1}-${datum.getDate()}`;
  const vcera = new Date(datum.getTime() - 864e5);
  const klucV = `${vcera.getFullYear()}-${vcera.getMonth() + 1}-${vcera.getDate()}`;
  const ivcera = indexDna(data, vcera);
  const vlaky = [];
  for (const v of data.vlaky) {
    const t = v.pri ?? v.odch;
    if (jazdi(data.sluzby[v.s], dnes)) vlaky.push({ v, posun: 0, kluc });
    // včerajšie vlaky po polnoci (časy > 24:00)
    if (t >= 1380 && jazdi(data.sluzby[v.s], ivcera)) vlaky.push({ v, posun: -1440, kluc: klucV });
  }
  const zaznam = ({ v, posun, kluc: k }, cas) => ({
    kat: v.kat, cislo: v.cislo, nazov: v.nazov, z: v.z, do: v.do, cas: cas + posun,
    meskanie: meskanie(v, k, v.pri == null), dialkovy: v.typ === '361',
  });

  // 1. príchody a odchody; prechádzajúce vlaky sú jeden pobyt
  const konciace = [], zacinajuce = [], pobyty = [];
  for (const x of vlaky) {
    const { v } = x;
    if (v.pri != null && v.odch != null) {
      const p = zaznam(x, v.pri), o = zaznam(x, v.odch);
      // prechádzajúci vlak: pobyt sa skráti najviac na 1 minútu, zvyšok meškania si odvezie
      o.meskanie = Math.max(0, p.meskanie - Math.max(0, v.odch - v.pri - 1));
      pobyty.push({ prichod: p, odchod: o, zo: v.zo, na: v.na, suprava: suprava(v), vlak: v });
    } else if (v.pri != null) konciace.push({ x, p: zaznam(x, v.pri) });
    else if (v.odch != null) zacinajuce.push({ x, o: zaznam(x, v.odch) });
  }
  // 2. obraty: končiaci vlak + najbližší začínajúci rovnakého typu späť na tú istú stranu
  konciace.sort((a, b) => a.p.cas - b.p.cas);
  zacinajuce.sort((a, b) => a.o.cas - b.o.cas);
  const pouzite = new Set();
  for (const k of konciace) {
    const pr = k.p.cas + k.p.meskanie;
    const z = zacinajuce.find((z) => !pouzite.has(z) && z.x.v.typ === k.x.v.typ && z.x.v.na === k.x.v.zo
      && z.o.cas - k.p.cas >= OBRAT_MIN && z.o.cas - k.p.cas <= OBRAT_MAX);
    if (z) {
      pouzite.add(z);
      // meškanie sa prenáša na spiatočný odchod (obrat aspoň OBRAT_MIN minút)
      z.o.meskanie = Math.max(z.o.meskanie, Math.round(pr + OBRAT_MIN - z.o.cas));
      if (z.o.cas + z.o.meskanie - pr <= OBRAT_NA_KOLAJI) {
        pobyty.push({ prichod: k.p, odchod: z.o, zo: k.x.v.zo, na: z.x.v.na, suprava: suprava(k.x.v), vlak: k.x.v });
      } else {
        // dlhý obrat: súprava medzitým čaká v depe (odíde a príde späť), meškanie sa už preniesol
        pobyty.push({ prichod: k.p, odchod: null, zo: k.x.v.zo, na: 'vychod', suprava: suprava(k.x.v), vlak: k.x.v });
        pobyty.push({ prichod: null, odchod: z.o, zo: 'vychod', na: z.x.v.na, suprava: suprava(z.x.v), vlak: z.x.v });
      }
    } else {
      pobyty.push({ prichod: k.p, odchod: null, zo: k.x.v.zo, na: 'vychod', suprava: suprava(k.x.v), vlak: k.x.v });
    }
  }
  for (const z of zacinajuce) {
    if (pouzite.has(z)) continue;
    pobyty.push({ prichod: null, odchod: z.o, zo: 'vychod', na: z.x.v.na, suprava: suprava(z.x.v), vlak: z.x.v });
  }
  // 3. skutočné časy na koľaji
  for (const p of pobyty) {
    p.tPri = p.prichod ? p.prichod.cas + p.prichod.meskanie : p.odchod.cas + p.odchod.meskanie - PRISTAVENIE;
    p.tOdch = p.odchod ? p.odchod.cas + p.odchod.meskanie : p.tPri + ODSTAVENIE;
    if (p.tOdch < p.tPri + 1) p.tOdch = p.tPri + 1;
  }
  // 4. koľaje: v poradí príchodov, prvá voľná z preferencií (koľaj musí mať trasu na obe strany pobytu)
  pobyty.sort((a, b) => a.tPri - b.tPri);
  const obsadene = new Map();  // koľaj → [[od, do], …]
  for (const r of rezervacie) obsadene.set(r.kolaj, [...(obsadene.get(r.kolaj) ?? []), [r.od, r.do]]);
  const volnaOd = (k, od, doT) => !(obsadene.get(k) ?? []).some(([a, b]) => a < doT && b > od);
  const uvolni = (k) => Math.max(-1e9, ...(obsadene.get(k) ?? []).map(([, b]) => b));
  for (const p of pobyty) {
    const pref = p.suprava.typ === '361' ? KOLAJE.dialkove : KOLAJE[p.zo === 'zapad' || p.na === 'zapad' ? 'zapad' : 'vychod'];
    const ok = (k) => {
      const t = trate.kolaje[k];
      return t && t[p.zo === 'zapad' ? 'z_zapadu' : 'z_vychodu'] && t[p.na === 'zapad' ? 'na_zapad' : 'na_vychod'];
    };
    const kandidati = pref.filter(ok);
    const od = p.tPri - PRIBLIZENIE, doT = p.tOdch + 3;
    let k = kandidati.find((k) => volnaOd(k, od, doT))
      ?? Object.keys(trate.kolaje).filter(ok).find((k) => volnaOd(k, od, doT));   // ktorákoľvek voľná
    if (!k) k = kandidati.reduce((a, b) => (uvolni(a) <= uvolni(b) ? a : b), kandidati[0]);
    p.kolaj = k;
    p.nastupiste = trate.kolaje[k]?.nastupiste ?? '';
    obsadene.set(k, [...(obsadene.get(k) ?? []), [od, doT]]);
  }
  return pobyty;
}

/** Riadky tabule odchodov (najbližšie odchody, ešte neodišlé) – formát js/mapa/stanica/tabule.js. */
export function odchodyNaTabulu(pobyty, tMin, pocet = 7) {
  return pobyty.filter((p) => p.odchod && p.tOdch >= tMin - 0.5 && p.odchod.cas <= tMin + 240)
    .sort((a, b) => a.odchod.cas - b.odchod.cas)
    .slice(0, pocet)
    .map((p) => ({ cas: hhmm(p.odchod.cas), vlak: `${p.odchod.kat} ${p.odchod.cislo}`, nazov: p.odchod.nazov, smer: p.odchod.do, nastupiste: p.nastupiste, kolaj: p.kolaj, meskanie: p.odchod.meskanie }));
}

/** Riadky tabule príchodov (ešte neprišlé alebo práve prišlé). */
export function prichodyNaTabulu(pobyty, tMin, pocet = 7) {
  return pobyty.filter((p) => p.prichod && p.tPri >= tMin - 2 && p.prichod.cas <= tMin + 240)
    .sort((a, b) => a.prichod.cas - b.prichod.cas)
    .slice(0, pocet)
    .map((p) => ({ cas: hhmm(p.prichod.cas), vlak: `${p.prichod.kat} ${p.prichod.cislo}`, nazov: p.prichod.nazov, smer: p.prichod.z, nastupiste: p.nastupiste, kolaj: p.kolaj, meskanie: p.prichod.meskanie }));
}

export function hhmm(min) {
  const t = ((Math.round(min) % 1440) + 1440) % 1440;
  return `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`;
}
