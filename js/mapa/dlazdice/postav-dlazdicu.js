// Postaví obsah jednej dlaždice mesta. Je to generátor – medzi krokmi vráti riadenie,
// aby správca dlaždíc mohol stavbu rozložiť do viacerých snímok (bez sekania hry).
//
//   uroven 'detail' – zem, cesty, chodníky, zebry, koľaje, budovy (+ strechy z lasera), stromy, značky, lampy, lavičky, kolízie
//   uroven 'lod'    – len jednoduché bloky budov (zem v diaľke kreslí horizont)

import * as THREE from 'three';
import { vytvorZemDlazdice } from '../teren/zem-dlazdica.js';
import { vytvorCesty } from '../cesty/cesty.js';
import { najdiKrizovatky } from '../cesty/krizovatky.js';
import { vytvorPlochyKrizovatiek } from '../cesty/plochy-krizovatiek.js';
import { vytvorChodniky } from '../cesty/chodniky.js';
import { vytvorPrechody } from '../cesty/prechody.js';
import { vytvorKolajnice } from '../cesty/kolajnice.js';
import { vytvorBudovy } from '../budovy/budovy.js';
import { vytvorBudovyLod } from '../budovy/lod.js';
import { vytvorStrechyLod2 } from '../budovy/strechy-lod2.js';
import { vytvorStromy } from '../zelen/stromy.js';
import { vytvorZnacky } from '../znacky/znacky.js';
import { vytvorTabuleUlic } from '../znacky/tabule-ulic.js';
import { vytvorLampy } from '../vybavenie/lampy.js';
import { vytvorLavicky } from '../vybavenie/lavicky.js';
import { vytvorVodu } from '../voda/voda.js';
import { cestyVJadre } from '../teren/textura-zeme.js';

export function* postavDlazdicu(kluc, d, rect, uroven, { vyskopis, kolizie, rieky, KONFIG }) {
  const g = new THREE.Group();
  g.name = `dlazdica ${kluc} ${uroven}`;

  if (uroven === 'lod') {
    g.add(vytvorBudovyLod(d.budovy ?? [], vyskopis));
    if (d._strechy) g.add(vytvorStrechyLod2(d._strechy));
    return g;
  }

  const k = kolizie.preDlazdicu(kluc);
  g.add(vytvorZemDlazdice(d, rect, vyskopis, rieky));
  yield;
  if (d.voda?.length) g.add(vytvorVodu(d.voda.map((v) => ({ ...v, reka: false })), KONFIG, vyskopis));
  // v detailnom výreze sú obslužné uličky historického jadra vydláždené (kreslí ich zem), nie asfaltové
  const dlazdene = d._detailTerenu ? new Set(cestyVJadre(d.cesty)) : null;
  const cesty = dlazdene?.size ? d.cesty.filter((c) => !dlazdene.has(c)) : d.cesty ?? [];
  const { krizovatky } = najdiKrizovatky(cesty);
  g.add(vytvorCesty(cesty, vyskopis));
  g.add(vytvorPlochyKrizovatiek(krizovatky, vyskopis));
  yield;
  g.add(vytvorChodniky(cesty, krizovatky, vyskopis));
  g.add(vytvorPrechody(d.prvky?.prechody, cesty, vyskopis));
  g.add(vytvorKolajnice(d.kolajnice, vyskopis));
  yield;
  for (const b of d.budovy ?? []) k.pridajPolygon(b.body, { typ: 'budova' });
  g.add(vytvorBudovy(d.budovy ?? [], vyskopis, KONFIG));
  if (d._strechy) g.add(vytvorStrechyLod2(d._strechy));
  yield;
  g.add(vytvorStromy(d.stromy, vyskopis, k));
  g.add(vytvorZnacky(d, krizovatky, vyskopis));
  g.add(vytvorTabuleUlic(cesty, krizovatky, vyskopis));
  g.add(vytvorLampy(d.prvky?.lampy, vyskopis, k));
  g.add(vytvorLavicky(d.prvky?.lavicky, [...(d.chodniky ?? []), ...cesty], vyskopis, k));
  g.userData.krizovatky = krizovatky;
  return g;
}

/** Uvoľní pamäť grafickej karty (geometrie a textúry dlaždice). */
export function uvolniObjekt(obj) {
  obj.traverse((o) => {
    if (o.geometry && !o.geometry.userData.zdielane) o.geometry.dispose();
    const mats = Array.isArray(o.material) ? o.material : o.material ? [o.material] : [];
    for (const m of mats) {
      // zdieľané materiály (budovy, cesty…) nemažeme – len textúry zeme, ktoré patria dlaždici
      if (o.name === 'zem') { m.map?.dispose(); m.userData.triedy?.dispose(); m.dispose(); }
    }
  });
}
