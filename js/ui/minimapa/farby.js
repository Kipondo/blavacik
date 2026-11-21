// Farby a hrúbky čiar minimapy (tmavý podklad, aby bola čitateľná nad hrou).

export const FARBY = {
  zem: '#2a2e33',
  voda: '#2f6390',
  budova: '#4c525a',
  budovaOkraj: '#626973',
  okrajCesty: '#17191c',
  cesta: '#bdb9b0',
  hlavna: '#e2c072',      // primary, secondary, tertiary
  dialnica: '#e8975a',    // motorway, trunk
  pesia: '#8e897d',       // pešia zóna, nástupištia
  chodnik: '#6b675e',
  lesnaCesta: '#5d5a4c',  // track, path
  elektricka: '#a07a66',
  zeleznica: '#7a766e',
  hrac: '#ffffff',
  hracOkraj: '#15171a',
  sever: '#f2c14e',
  ciel: '#f2c14e',
  zastavkaElektricka: '#e0604f',
  zastavkaIna: '#4fa3e0',
};

/** Pokrývka zeme – poradie kreslenia (neskoršie prekryje skoršie) a farba. */
export const POKRYVKA = [
  ['les', '#2c4733'],
  ['trava', '#33503a'],
  ['cintorin', '#34493b'],
  ['ihrisko', '#3c5a40'],
  ['piesok', '#5b5440'],
  ['zeleznica', '#34363a'],
  ['parkovisko', '#383c42'],
  ['stavenisko', '#4a4438'],
  ['dlazba', '#5a554b'],
];

const DIALNICE = new Set(['motorway', 'motorway_link', 'trunk', 'trunk_link']);
const HLAVNE = new Set(['primary', 'primary_link', 'secondary', 'secondary_link', 'tertiary', 'tertiary_link']);

/** Farba a poradie cesty (vyššie poradie sa kreslí navrch). */
export function stylCesty(typ) {
  if (DIALNICE.has(typ)) return { farba: FARBY.dialnica, poradie: 3 };
  if (HLAVNE.has(typ)) return { farba: FARBY.hlavna, poradie: 2 };
  if (typ === 'service') return { farba: FARBY.cesta, poradie: 0 };
  return { farba: FARBY.cesta, poradie: 1 };
}

/** Chodníky a cestičky: farba, či sa kreslia aj v hrubej mierke, prerušovaná čiara. */
export function stylChodnika(typ) {
  switch (typ) {
    case 'pedestrian': return { farba: FARBY.pesia, vzdy: true };
    case 'platform': return { farba: FARBY.pesia, vzdy: true };
    case 'track':
    case 'path': return { farba: FARBY.lesnaCesta, prerusovana: true };
    case 'steps': return { farba: FARBY.chodnik, prerusovana: true };
    case 'corridor': return null; // chodby vo vnútri budov
    default: return { farba: FARBY.chodnik };
  }
}
