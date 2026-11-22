// Typy malých vozidiel (mikromobilita, issue #97): jazdné vlastnosti, model, kamera a nápoveda.

import { vytvorModelKolobezky, geometriaCela, materialKolobezky } from './model-kolobezky.js';
import { vytvorModelBicykla, geometriaCelaB, materialBicykla } from './model-bicykla.js';

export const TYPY = {
  kolobezka: {
    nazov: 'kolobežke (Fičák)',
    MAX_RYCHLOST: 6.95,   // m/s (25 km/h – obmedzovač ako pri zdieľaných kolobežkách)
    SPRINT: 6.95,
    ZRYCHLENIE: 2.6,      // m/s² – elektromotor, rýchly rozbeh
    BRZDA: 5.5,           // m/s²
    VALIVY_ODPOR: 0.35,   // m/s² – bez plynu dôjde
    SVAH: 0.35,           // ako veľmi spomalí kopec (elektromotor pomáha)
    RAZVOR: 0.82,         // m – vzdialenosť osí kolies
    MAX_ZATOCENIE: 0.62,  // rad – natočenie riadidiel pri malej rýchlosti
    POLOMER: 0.32,        // m – kolízia so stenami
    MAX_NAKLON: 0.42,     // rad (~24°) – náklon do zákruty
    STOJAN: -0.12,        // rad – odstavená stojí na stojane naklonená doľava (záporný náklon = doľava)
    OSI: [0.42, -0.4],    // z prednej a zadnej osi (výška podľa terénu)
    kamera: { vzdialenost: 4.6, vyska: 2.3, ciel: 1.5 },
    napoveda: 'E – zosadnúť · S alebo Medzerník – brzda',
    polDlzka: 0.45, polSirka: 0.3,
    jazdec: 'stoji',
    model: () => vytvorModelKolobezky(),
    geometria: () => geometriaCela(),
    material: () => materialKolobezky(),
  },
  bicykel: {
    nazov: 'bicykli',
    MAX_RYCHLOST: 6.4,    // m/s (23 km/h – bežná jazda po meste)
    SPRINT: 9.7,          // m/s (35 km/h so Shiftom)
    ZRYCHLENIE: 1.7,      // m/s² – šliapanie
    BRZDA: 5.0,
    VALIVY_ODPOR: 0.2,
    SVAH: 0.7,            // do kopca citeľne pomalší
    RAZVOR: 1.05,
    MAX_ZATOCENIE: 0.55,
    POLOMER: 0.42,
    MAX_NAKLON: 0.5,
    STOJAN: -0.1,
    OSI: [0.53, -0.52],
    kamera: { vzdialenost: 5.2, vyska: 2.4, ciel: 1.5 },
    napoveda: 'E – zosadnúť · Shift – šprint · S alebo Medzerník – brzda',
    polDlzka: 0.85, polSirka: 0.3,
    jazdec: 'sedi',
    model: (farba) => vytvorModelBicykla(farba),
    geometria: () => geometriaCelaB(),
    material: () => materialBicykla(),
  },
};

/** Farby rámov bicyklov (prevažne tlmené, občas výrazná). */
export const FARBY_BICYKLOV = ['#2f6db5', '#1f2326', '#e9e6df', '#8c1c22', '#3d6b45', '#b8b2a6', '#d9a521', '#5b4a8a'];
