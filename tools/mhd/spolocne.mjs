// Spoločné nastavenia nástrojov MHD.
// Prevod súradníc sa NEKOPÍRUJE – berie sa z tools/mesto/spolocne.mjs (rovnaký stred a prevod ako mapa).
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

export { STRED, naMetre, DLAZDICA } from '../mesto/spolocne.mjs';

export const KOREN = join(dirname(fileURLToPath(import.meta.url)), '../..');
export const CACHE = join(KOREN, '.cache/mhd');
export const GTFS_ZIP = join(CACHE, 'GTFS_latest.zip');
export const VYSTUP = join(KOREN, 'data/mhd');
export const DLAZDICE = join(KOREN, 'data/mapa/mesto/d');

// Oficiálny zdroj: Cestovné poriadky MHD vo formáte GTFS (DPB / hl. m. Bratislava), licencia CC BY 4.0
// https://data.bratislava.sk/datasets/aba12fd2cbac4843bc7406151bc66106/about
export const GTFS_URL =
  'https://www.arcgis.com/sharing/rest/content/items/aba12fd2cbac4843bc7406151bc66106/data';

/** Zaokrúhlenie na decimetre (menšie súbory). */
export const r1 = (v) => Math.round(v * 10) / 10;

/** GTFS route_type → typ vozidla v hre. */
export function typLinky(routeType, cislo) {
  if (routeType === '0') return 'elektricka';
  if (routeType === '11' || routeType === '800') return 'trolejbus';
  return cislo.startsWith('N') ? 'nocny' : 'autobus';
}

/** Číslo linky → bezpečný názov súboru („Šk“ → „sk“). */
export const nazovSuboru = (cislo) =>
  cislo.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '_');

/** "25:03:00" → sekundy od polnoci (môže byť viac ako 24 h – nočné spoje). */
export function naSekundy(t) {
  const [h, m, s] = t.split(':').map(Number);
  return h * 3600 + m * 60 + (s || 0);
}
