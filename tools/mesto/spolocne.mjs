// Spoločné nastavenia nástrojov pre celé mesto.
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

export const KOREN = join(dirname(fileURLToPath(import.meta.url)), '../..');
export const CACHE = join(KOREN, '.cache/mesto');
export const VYSTUP = join(KOREN, 'data/mapa/mesto');

// Stredový bod (Hlavné námestie) – rovnaký ako KONFIG.OSM_STRED v hre
export const STRED = { lat: 48.1435, lon: 17.1077 };
export const KX = 111320 * Math.cos((STRED.lat * Math.PI) / 180);
export const KZ = 111132;
export const naMetre = (lon, lat) => [(lon - STRED.lon) * KX, -(lat - STRED.lat) * KZ];
export const naStupne = (x, z) => [STRED.lon + x / KX, STRED.lat - z / KZ];

// Veľkosť dlaždice v metroch
export const DLAZDICA = 500;

// Výška (m n. m.) nábrežia pri Starom Meste – v hre je to y = 0
export const VYSKA_NULA = 139;
