// Celá Bratislava: výškový model, rieky, mosty a pamiatky sú globálne,
// budovy, cesty a ostatné sa streamujú po dlaždiciach okolo hráča (js/mapa/dlazdice/).
// Vracia rovnaké rozhranie hra.mapa ako postavMapu (js/mapa/mapa.js) + hra.mapa.dlazdice.

import * as THREE from 'three';
import { vytvorVyskopisMesta } from './teren/vyska-mesto.js';
import { vytvorHorizont } from './teren/horizont.js';
import { Kolizie } from './kolizie.js';
import { vytvorVodu } from './voda/voda.js';
import { vytvorNabrezneMury } from './voda/nabrezne-mury.js';
import { vytvorMosty } from './mosty/mosty.js';
import { nacitajPamiatky } from './pamiatky/nacitaj-pamiatky.js';
import { SpravaDlazdic } from './dlazdice/sprava-dlazdic.js';
import { rozmiestniAuta } from './spawn-aut.js';
import { PREDVOLBY, urovenPreVolbu } from '../grafika/predvolby.js';
import { nacitajKvalitu } from '../ui/nastavenia-grafiky.js';

export async function postavMesto(data, scena, KONFIG, priebeh = () => {}, posli = () => {}) {
  priebeh('Modelujem terén Bratislavy…');
  const vyskopis = vytvorVyskopisMesta(data.teren, data, KONFIG);
  const kolizie = new Kolizie(40);
  const H = KONFIG.HRANICE;

  // okruhy dlaždíc a hmla podľa kvality grafiky (js/grafika/predvolby.js) – nastavia sa už pred stavbou okolia,
  // aby sa na štarte nestavalo zbytočne veľa; za behu ich mení modul js/grafika/kvalita.js
  const kvalita = PREDVOLBY[urovenPreVolbu(nacitajKvalitu())];
  // hmla končí na hranici dohľadu – čo je za ňou, sa nestavia ani nekreslí (kopce na obzore ostanú ako obrys v opare)
  scena.fog = new THREE.Fog(scena.fog?.color ?? new THREE.Color('#cfe0ea'), kvalita.dohlad * kvalita.hmlaOd, kvalita.dohlad);

  const svet = new THREE.Group();
  svet.name = 'mapa';
  scena.add(svet);

  const horizont = vytvorHorizont(vyskopis, KONFIG, data.mestoIndex.dlazdica);
  svet.add(horizont);
  svet.add(vytvorVodu(data.voda, KONFIG, vyskopis));
  svet.add(vytvorNabrezneMury(data.voda, vyskopis, KONFIG));
  // mosty s podrobným modelom z Blendera (pamiatka „nahradzaMost“) stavia js/mapa/pamiatky/most-glb.js
  const sModelom = new Set((data.pamiatky ?? []).map((p) => p.nahradzaMost).filter(Boolean));
  svet.add(vytvorMosty((data.mosty ?? []).filter((m) => !sModelom.has(m.nazov)), vyskopis, KONFIG));

  priebeh('Staviam pamiatky…');
  const pamiatky = await nacitajPamiatky(data.pamiatky ?? [], { vyskopis, kolizie, KONFIG });
  svet.add(pamiatky);

  const sprava = new SpravaDlazdic({ index: data.mestoIndex, scena: svet, vyskopis, kolizie, KONFIG, posli });
  sprava.nastavPolomery(kvalita.detail, kvalita.dohlad);
  const start = data.spawn?.hrac ?? { x: 0, z: 0 };
  priebeh('Staviam mesto okolo teba…');
  await sprava.nacitajOkolie(start.x, start.z, priebeh);
  // horizont sa nekreslí pod postavenými podrobnými dlaždicami (ďalej ich sleduje js/mapa/dlazdice/modul.js)
  for (const [kluc, a] of sprava.aktivne) horizont.userData.nastavDetail(kluc, a.uroven === 'detail');
  // zaparkované autá na uliciach v okolí štartu
  const blizke = sprava.cestyOkolia().filter((c) => Math.hypot(c.body[0][0] - start.x, c.body[0][1] - start.z) < 600);
  data.spawn = { ...data.spawn, auta: rozmiestniAuta(blizke, data.spawn?.ulice ?? []) };

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
    hladina: vyskopis.hladina,
    jeMimo: (x, z) => x < H.minX + 2 || x > H.maxX - 2 || z < H.minZ + 2 || z > H.maxZ - 2,
    miesto(m) {
      if (!m) return null;
      if (typeof m === 'string') return miesta[m] ? { x: miesta[m].x, z: miesta[m].z } : null;
      return { x: m.x, z: m.z };
    },
    update(cas) { for (const o of animovane) o.userData.update(cas); },
    dlazdice: sprava,
    horizont,
    objekt: svet,
  };
}
