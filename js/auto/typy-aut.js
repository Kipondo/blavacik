// Typy osobných a úžitkových áut (issue #97) – všetky podľa jedného „receptu“, aby k sebe ladili:
// bočný profil (karoséria po pás, skleník, strecha v laku) vysunutý na šírku, rovnaké kolesá, sklo a svetlá.
// Parametre typu: L dĺžka, W šírka, H strecha, P spodok okien, kap kapota, kuf kufor, sk skleník
// [zadok-spodok, zadok-hore, predok-hore, predok-spodok] v podiele dĺžky, kr polomer kolesa;
// skrina = nákladný priestor až po strechu (dodávka), korba = otvorená korba (pickup).
// Zastúpenie v premávke, farby, taxíky a jazdné vlastnosti sú dáta: data/doprava/vozidla.json
// (načíta ich modul js/doprava/vozidla-data.js); bez nich platia rozumné predvolené hodnoty.

export const TYPY = {
  mestske:   { nazov: 'mestské', L: 3.6, W: 1.65, H: 1.5, P: 0.95, kap: 0.82, kuf: 0.9, sk: [0.03, 0.08, 0.62, 0.78], kr: 0.29 },
  hatchback: { nazov: 'hatchback', L: 4.1, W: 1.78, H: 1.47, P: 0.95, kap: 0.82, kuf: 0.92, sk: [0.03, 0.1, 0.6, 0.76], kr: 0.31 },
  sedan:     { nazov: 'sedan', L: 4.65, W: 1.8, H: 1.44, P: 0.93, kap: 0.8, kuf: 0.9, sk: [0.2, 0.3, 0.62, 0.76], kr: 0.32 },
  kombi:     { nazov: 'kombi', L: 4.7, W: 1.8, H: 1.48, P: 0.93, kap: 0.8, kuf: 0.93, sk: [0.02, 0.05, 0.64, 0.77], kr: 0.32 },
  suv:       { nazov: 'SUV', L: 4.5, W: 1.86, H: 1.66, P: 1.1, kap: 0.98, kuf: 1.08, sk: [0.03, 0.08, 0.62, 0.76], kr: 0.36 },
  suvlux:    { nazov: 'luxusné SUV', L: 4.95, W: 1.95, H: 1.74, P: 1.14, kap: 1.04, kuf: 1.1, sk: [0.03, 0.07, 0.63, 0.76], kr: 0.39 },
  mpv:       { nazov: 'osobná dodávka', L: 4.9, W: 1.9, H: 1.92, P: 1.08, kap: 0.98, kuf: 1.05, sk: [0.02, 0.03, 0.72, 0.84], kr: 0.33 },
  dodavka:   { nazov: 'dodávka', L: 5.9, W: 2.0, H: 2.5, P: 1.25, kap: 1.05, kuf: 2.45, sk: [0.72, 0.72, 0.8, 0.88], kr: 0.36, skrina: true },
  pickup:    { nazov: 'pickup', L: 5.3, W: 1.9, H: 1.82, P: 1.12, kap: 1.08, kuf: 1.08, sk: [0.36, 0.38, 0.66, 0.78], kr: 0.38, korba: true },
  sport:     { nazov: 'športové', L: 4.4, W: 1.88, H: 1.22, P: 0.82, kap: 0.7, kuf: 0.8, sk: [0.18, 0.32, 0.56, 0.74], kr: 0.33 },
  muscle:    { nazov: 'muscle', L: 4.85, W: 1.9, H: 1.32, P: 0.88, kap: 0.86, kuf: 0.84, sk: [0.18, 0.3, 0.54, 0.66], kr: 0.34 },
};

/**
 * Bočné profily typu pre model (z = dĺžka, y = výška, predok na +z): karoséria (spodok), skleník (kabina),
 * strecha, šírka, kolesá { r, predne, zadne } a výška svetiel.
 */
export function profilTypu(typ) {
  const T = TYPY[typ] ?? TYPY.sedan;
  const { L, H, P } = T;
  const z = (f) => -L / 2 + f * L;
  const dno = Math.max(0.24, T.kr * 0.75);
  const s = T.sk;
  let spodok;
  if (T.skrina) {
    // nákladný priestor až po strechu, vpredu kabína s kapotou
    spodok = [[z(0.005), dno], [z(0), H - 0.3], [z(0.02), H - 0.05], [z(s[0]), H - 0.05], [z(s[0]), P], [z(s[3]), P],
      [z(0.965), T.kap], [z(1), T.kap - 0.16], [z(0.995), dno]];
  } else {
    spodok = [[z(0.005), dno], [z(0), (dno + T.kuf) / 2 + 0.05], [z(0.025), T.kuf], [z(s[0]), P], [z(s[3]), P],
      [z(0.965), T.kap], [z(1), T.kap - 0.16], [z(0.995), dno]];
  }
  const hs = T.skrina ? H - 0.12 : H - 0.06;
  const kabina = [[z(s[0]) + 0.04, P - 0.02], [z(s[1]) + 0.04, hs], [z(s[2]) - 0.04, hs], [z(s[3]) - 0.04, P - 0.02]];
  const strecha = [[z(s[1]) + 0.02, hs - 0.02], [z(s[1]) + 0.05, H], [z(s[2]) - 0.05, H], [z(s[2]) - 0.02, hs - 0.02]];
  const predne = L / 2 - Math.max(0.78, L * 0.19), zadne = -L / 2 + Math.max(0.72, L * 0.18);
  return {
    T, spodok, kabina, strecha, sirka: T.W, dlzka: L, vyska: H,
    predok: L / 2, zadok: -L / 2, vyskaSvetiel: T.kap - 0.2, vyskaZadnych: T.skrina ? 1.0 : T.kuf - 0.18,
    kolesa: { r: T.kr, predne, zadne },
    korba: T.korba ? { z0: z(0.03), z1: z(s[0]), y: P - 0.02 } : null,
  };
}

// ---------- dáta (váhy, farby, taxíky, fyzika) ----------

let DATA = null;

/** Nastaví dáta z data/doprava/vozidla.json (volá js/doprava/vozidla-data.js). */
export function nastavDataVozidiel(d) { DATA = d; }

const PREDVOLENE_VAHY = { hatchback: 18, sedan: 13, kombi: 14, mestske: 18, suv: 9, mpv: 4, dodavka: 4, pickup: 3, sport: 2, muscle: 1 };
const PREDVOLENE_FARBY = [
  { podiel: 23, odtiene: ['#6B7075', '#4D5257', '#8A8F93'] }, { podiel: 22, odtiene: ['#EDEFEF', '#E2E4E1'] },
  { podiel: 20, odtiene: ['#17191C', '#22252A'] }, { podiel: 12, odtiene: ['#B7BCC1', '#A4AAB0'] },
  { podiel: 10, odtiene: ['#1F3B6E', '#35609A', '#14233F'] }, { podiel: 7, odtiene: ['#A11B20', '#7A1A22'] },
  { podiel: 6, odtiene: ['#2F5640', '#6B5542', '#B8A685', '#E0A21B', '#5A1B2C'] },
];

function vazeny(pary, r = Math.random()) {
  const sum = pary.reduce((a, [, w]) => a + w, 0);
  let x = r * sum;
  for (const [k, w] of pary) { if ((x -= w) < 0) return k; }
  return pary[0][0];
}

/** Náhodný typ podľa váh ('premavka' alebo 'zaparkovane'); noc = násobky váh v noci. */
export function nahodnyTyp(skupina = 'premavka', noc = false) {
  const v = { ...(DATA?.[skupina]?.vahy ?? PREDVOLENE_VAHY) };
  if (noc) for (const [k, n] of Object.entries(DATA?.premavka?.noc ?? {})) if (k in v) v[k] *= n;
  return vazeny(Object.entries(v).filter(([k]) => TYPY[k]));
}

/** Farba laku podľa skutočného zastúpenia (dodávky sú častejšie biele). */
export function nahodnaFarba(typ) {
  if (typ === 'dodavka' && Math.random() < (DATA?.dodavkyBiele ?? 0.6)) return '#EDEFEF';
  const f = vazeny((DATA?.farby ?? PREDVOLENE_FARBY).map((q) => [q, q.podiel]));
  return f.odtiene[Math.floor(Math.random() * f.odtiene.length)];
}

/** Taxík alebo kuriérske auto (alebo null) pre auto v premávke; noc = viac taxíkov a kuriérov. */
export function nahodnaSluzba(noc = false) {
  const p = DATA?.premavka ?? { taxi: 0.05, kurier: 0.04 };
  const taxi = noc ? p.noc?.taxi ?? p.taxi : p.taxi, kurier = noc ? p.noc?.kurier ?? p.kurier : p.kurier;
  const r = Math.random();
  if (r < taxi && DATA?.taxiky?.length) return { druh: 'taxi', ...vazeny(DATA.taxiky.map((t) => [t, t.vaha ?? 1])) };
  if (r < taxi + kurier && DATA?.kurieri?.length) return { druh: 'kurier', ...vazeny(DATA.kurieri.map((t) => [t, t.vaha ?? 1])) };
  return null;
}

/** Jazdné vlastnosti typu: { maxKmh, zrychlenie, zatacanie, prilnavost, hmotnost } (násobky základu). */
export function fyzikaTypu(typ) {
  const f = DATA?.fyzika?.[typ];
  return { maxKmh: 165, zrychlenie: 1, zatacanie: 1, prilnavost: 1, hmotnost: 1400, ...(f && typeof f === 'object' ? f : {}) };
}

/** Typ z farby (staršie uložené autá bez typu) – stabilne, aby to isté auto vyzeralo vždy rovnako. */
export function typPodlaFarby(farba) {
  const h = parseInt(String(farba).slice(1), 16) || 0;
  return ['hatchback', 'sedan', 'kombi', 'mestske', 'suv'][h % 5];
}
