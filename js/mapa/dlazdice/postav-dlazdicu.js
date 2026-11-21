// Postaví obsah jednej dlaždice mesta. Je to generátor – medzi krokmi vráti riadenie,
// aby správca dlaždíc mohol stavbu rozložiť do viacerých snímok (bez sekania hry).
// Každý krok má trvať najviac pár milisekúnd – ťažké časti (zem) sú samy generátory (yield*).
//
//   uroven 'detail' – zem, cesty, chodníky, zebry, koľaje, budovy (+ strechy z lasera), stromy, značky, lampy, lavičky, kolízie
//   uroven 'lod'    – len jednoduché bloky budov (zem v diaľke kreslí horizont)

import * as THREE from 'three';
import { bodVPolygone } from '../geometria.js';
import { krokyZemeDlazdice } from '../teren/zem-dlazdica.js';
import { vytvorCesty } from '../cesty/cesty.js';
import { najdiKrizovatky } from '../cesty/krizovatky.js';
import { vytvorPlochyKrizovatiek } from '../cesty/plochy-krizovatiek.js';
import { vytvorChodniky } from '../cesty/chodniky.js';
import { vytvorPrechody } from '../cesty/prechody.js';
import { vytvorKolajnice } from '../cesty/kolajnice.js';
import { krokyBudov } from '../budovy/budovy.js';
import { vytvorBudovyLod } from '../budovy/lod.js';
import { vytvorStrechyLod2 } from '../budovy/strechy-lod2.js';
import { vytvorVikiere } from '../budovy/vikiere.js';
import { planFasad3d } from '../budovy/fasady-3d.js';
import { pripravTuby } from '../podchody/tuby.js';
import { vytvorPodchody } from '../podchody/geometria.js';
import { vytvorStromy } from '../zelen/stromy.js';
import { vytvorZnacky } from '../znacky/znacky.js';
import { vytvorTabuleUlic } from '../znacky/tabule-ulic.js';
import { vytvorLampy } from '../vybavenie/lampy.js';
import { vytvorLavicky } from '../vybavenie/lavicky.js';
import { vytvorVodu } from '../voda/voda.js';
import { cestyVJadre } from '../teren/textura-zeme.js';
import { vytvorNadjazdy } from '../mosty/nadjazdy.js';

export function* postavDlazdicu(kluc, d, rect, uroven, { vyskopis, kolizie, rieky, KONFIG }) {
  const g = new THREE.Group();
  g.name = `dlazdica ${kluc} ${uroven}`;

  if (uroven === 'lod') {
    g.add(vytvorBudovyLod(d.budovy ?? [], vyskopis));
    if (d._strechy) g.add(vytvorStrechyLod2(d._strechy));
    return g;
  }

  const k = kolizie.preDlazdicu(kluc);
  g.add(yield* krokyZemeDlazdice(d, rect, vyskopis, rieky));   // po krokoch (textúry, výšky po pásoch)
  yield;
  if (d.voda?.length) g.add(vytvorVodu(d.voda.map((v) => ({ ...v, reka: false })), KONFIG, vyskopis));
  // v detailnom výreze sú obslužné uličky historického jadra vydláždené (kreslí ich zem), nie asfaltové
  const dlazdene = d._detailTerenu ? new Set(cestyVJadre(d.cesty)) : null;
  const cesty = dlazdene?.size ? d.cesty.filter((c) => !dlazdene.has(c)) : d.cesty ?? [];
  const { krizovatky } = najdiKrizovatky(cesty);
  // cesty na nadjazdoch sa nekreslia na zem – mostovku stavia js/mapa/mosty/nadjazdy.js
  g.add(vytvorCesty(cesty.filter((c) => !c.nadjazd), vyskopis));
  yield;
  g.add(vytvorPlochyKrizovatiek(krizovatky, vyskopis));
  yield;
  g.add(vytvorChodniky(cesty, krizovatky, vyskopis));
  yield;
  g.add(vytvorPrechody(d.prvky?.prechody, cesty, vyskopis));
  g.add(vytvorKolajnice((d.kolajnice ?? []).filter((kl) => !kl.nadjazd), vyskopis));
  // nadjazdy, lávky a nadchody (chôdzu a jazdu po nich rieši modul js/mapa/mosty/nadjazdy-modul.js)
  if (d.nadjazdy?.length) {
    const nadj = vytvorNadjazdy(d.nadjazdy, vyskopis, k);
    g.add(nadj.skupina);
    g.userData.nadjazdy = nadj.profily;
  }
  // podchody: chodby pod zemou, schody, zábradlie (chôdzu rieši modul js/mapa/podchody/modul.js)
  if (d.podchody?.length) g.add(vytvorPodchody(pripravTuby(d.podchody, vyskopis.vyskaTerenu), vyskopis.vyskaTerenu, k).skupina);
  yield;
  // vstupné pavilóny podchodov (schody začínajú v budove, napr. Zelená kocka na Hodžovom nám.) – bez kolízie
  const vstupy = (d.podchody ?? []).filter((p) => p.typ === 'schody').flatMap((p) => {
    const a = p.body[0], b = p.body.at(-1);
    return [0.15, 0.5, 0.85].map((t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
  });
  for (const b of d.budovy ?? []) {
    if ((b.minVyska ?? 0) > 2.5) continue;
    if (vstupy.some(([x, z]) => bodVPolygone(x, z, b.body))) continue;
    k.pridajPolygon(b.body, { typ: 'budova' });
  }
  g.add(yield* krokyBudov(d.budovy ?? [], vyskopis, KONFIG));
  yield;
  if (d._strechy) g.add(vytvorStrechyLod2(d._strechy));
  yield;
  const vikiere = vytvorVikiere(d.budovy, d._strechy, vyskopis);
  if (vikiere) g.add(vikiere);
  yield;
  // 3D fasády historických budov (zapustené okná, parapety, rímsy): tu len plán, diely stavia
  // podľa vzdialenosti od kamery modul js/mapa/budovy/fasady-3d-modul.js
  const planFasad = planFasad3d(d.budovy ?? [], vyskopis);
  if (planFasad) {
    const f3 = new THREE.Group();
    f3.name = 'fasady3d';
    f3.userData.plan = planFasad;
    g.add(f3);
  }
  yield;
  g.add(vytvorStromy(d.stromy, vyskopis, k));
  yield;
  g.add(vytvorZnacky(d, krizovatky, vyskopis));
  yield;
  g.add(vytvorTabuleUlic(cesty, krizovatky, vyskopis));
  yield;
  g.add(vytvorLampy(d.prvky?.lampy, vyskopis, k, d.budovy ?? []));
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
