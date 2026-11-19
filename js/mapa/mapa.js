// Postaví celú mapu z načítaných dát a vráti objekt hra.mapa.
//
// hra.mapa:
//   vyska(x, z)        – výška povrchu (terén alebo most)
//   vyskaTerenu(x, z)  – výška terénu bez mostov
//   jeVoVode(x, z)     – true, ak je bod vo vode (a nie na moste)
//   jeMimo(x, z)       – true, ak je bod mimo hracej plochy
//   kolizie            – Kolizie (budovy, pamiatky, stromy)
//   miesta             – pomenované miesta { kluc: { nazov, x, z } }
//   pamiatky           – zoznam pamiatok/oblastí z pamiatky.json
//   miesto(kluc | {x,z}) → {x, z} alebo null
//   data               – surové dáta mapy

import * as THREE from 'three';
import { vytvorVyskopis } from './teren/vyska.js';
import { vytvorZem } from './teren/zem.js';
import { Kolizie } from './kolizie.js';
import { vytvorBudovy } from './budovy/budovy.js';
import { vytvorCesty } from './cesty/cesty.js';
import { vytvorPlochy } from './cesty/plochy.js';
import { vytvorVodu } from './voda/voda.js';
import { vytvorMosty } from './mosty/mosty.js';
import { vytvorStromy } from './zelen/stromy.js';
import { nacitajPamiatky } from './pamiatky/nacitaj-pamiatky.js';

export async function postavMapu(data, scena, KONFIG, priebeh = () => {}) {
  priebeh('Modelujem terén…');
  const vyskopis = vytvorVyskopis(data, KONFIG);
  const kolizie = new Kolizie(40);
  const H = KONFIG.HRANICE;

  const svet = new THREE.Group();
  svet.name = 'mapa';
  scena.add(svet);

  svet.add(vytvorZem(vyskopis, data, KONFIG));
  svet.add(vytvorVodu(data.voda, KONFIG));

  priebeh('Staviam cesty a mosty…');
  svet.add(vytvorCesty(data.cesty ?? [], vyskopis));
  svet.add(vytvorPlochy(data.plochy, vyskopis));
  svet.add(vytvorMosty(data.mosty, vyskopis, KONFIG));

  priebeh('Staviam budovy…');
  for (const b of data.budovy ?? []) kolizie.pridajPolygon(b.body, { typ: 'budova' });
  svet.add(vytvorBudovy(data.budovy ?? [], vyskopis, KONFIG));
  svet.add(vytvorStromy(data.stromy, vyskopis, kolizie));

  priebeh('Staviam pamiatky…');
  const pamiatky = await nacitajPamiatky(data.pamiatky ?? [], { vyskopis, kolizie, KONFIG });
  svet.add(pamiatky);

  const animovane = svet.children.filter((o) => o.userData.update);

  const miesta = { ...(data.miesta ?? {}) };
  delete miesta.popis;

  return {
    data,
    kolizie,
    miesta,
    pamiatky: data.pamiatky ?? [],
    vyska: vyskopis.vyska,
    vyskaTerenu: vyskopis.vyskaTerenu,
    jeVoVode: vyskopis.jeVoVode,
    jeMimo: (x, z) => x < H.minX + 2 || x > H.maxX - 2 || z < H.minZ + 2 || z > H.maxZ - 2,
    miesto(m) {
      if (!m) return null;
      if (typeof m === 'string') return miesta[m] ? { x: miesta[m].x, z: miesta[m].z } : null;
      return { x: m.x, z: m.z };
    },
    update(cas) { for (const o of animovane) o.userData.update(cas); },
    objekt: svet,
  };
}
