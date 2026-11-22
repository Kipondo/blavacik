// Rozmery a zloženie vozidiel MHD (električka, trolejbus, autobus). Všetko v metroch.
//
// Vozidlo = rad článkov za sebou (od predného). Medzi článkami je mech (MEDZERA).
// Článok: d = dĺžka, varianta = ktorá geometria sa použije (geometria.js),
//         dvere = poloha stredov dverí po dĺžke článku (z od stredu, + dopredu) na pravej strane.

export const MEDZERA = 0.6;

// nízkopodlažná päťčlánková električka (~32 m, obojsmerná): predný a zadný článok s kabínou a podvozkom,
// dva krátke zavesené články a stredný s podvozkom a zberačom
const ELEKTRICKA = {
  typ: 'elektricka',
  sirka: 2.46, vyska: 3.5, podlaha: 0.28,
  zrychlenie: 1.0,          // m/s²
  maxStanie: 22,            // s – najdlhšie státie na zastávke
  posunVpravo: 0,           // koľaje sú v dátach už pre každý smer zvlášť
  clanky: [
    { varianta: 'el-predny', d: 8.0, dvere: [1.9] },
    { varianta: 'el-kratky', d: 3.8, dvere: [0] },
    { varianta: 'el-stredny', d: 6.0, dvere: [0] },
    { varianta: 'el-kratky', d: 3.8, dvere: [0] },
    { varianta: 'el-zadny', d: 8.0, dvere: [-1.9] },
  ],
};

const KLBOVY = {
  sirka: 2.55, vyska: 3.05, podlaha: 0.32,
  zrychlenie: 1.2, maxStanie: 18, posunVpravo: 1.7,
  clanky: [
    { varianta: 'bus-predny', d: 11.3, dvere: [4.3, -1.6] },
    { varianta: 'bus-zadny', d: 6.8, dvere: [1.4] },
  ],
  napravy: { 'bus-predny': [3.0, -3.4], 'bus-zadny': [-1.9], 'trol-predny': [3.0, -3.4] },
};

const TROLEJBUS = {
  ...KLBOVY, typ: 'trolejbus', vyska: 3.1,
  clanky: [{ ...KLBOVY.clanky[0], varianta: 'trol-predny' }, KLBOVY.clanky[1]],
};

const AUTOBUS_KLBOVY = { ...KLBOVY, typ: 'autobus' };

const AUTOBUS_SOLO = {
  ...KLBOVY, typ: 'autobus',
  clanky: [{ varianta: 'bus-solo', d: 12.0, dvere: [4.9, 0.1, -4.2] }],
};

/** Typ vozidla pre linku (podľa typu linky a toho, aká je vyťažená). */
export function typVozidla(linka) {
  if (linka.typ === 'elektricka') return ELEKTRICKA;
  if (linka.typ === 'trolejbus') return TROLEJBUS;
  // hustejšie linky jazdia kĺbovými autobusmi, ostatné sólo (odhad, GTFS typ vozidla neuvádza)
  return linka.spojov >= 400 ? AUTOBUS_KLBOVY : AUTOBUS_SOLO;
}

/** Celková dĺžka vozidla. */
export function dlzkaVozidla(t) {
  return t.clanky.reduce((s, c) => s + c.d, 0) + MEDZERA * (t.clanky.length - 1);
}

export const VSETKY_TYPY = [ELEKTRICKA, TROLEJBUS, AUTOBUS_KLBOVY, AUTOBUS_SOLO];
