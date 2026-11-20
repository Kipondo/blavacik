// Primaciálny palác – klasicistický palác so svetlou krémovou fasádou, bielymi detailmi,
// tympanónom so sochami a kardinálskym klobúkom navrchu. Okolo nádvoria.
// Pred priečelím portikus: masívne stĺpy na podstavcoch stoja na zemi a nesú balkón v 1. poschodí
// (porovnanie so skutočnosťou, docs/porovnanie/opravy.md, etapa 2).

import * as THREE from 'three';
import { fasada, valbovaStrecha, stit, stlpy, rimsa, kvader, valec, material, naMiesto } from './pomocne.js';

const KREMOVA = '#f2e5c8';

export default function postav(p, { vyskopis, kolizie }) {
  const W = 54, D = 60, H = 17, K = 14;
  const g = new THREE.Group();
  const kridla = [
    [-W / 2 + K / 2, 0, K, D], [W / 2 - K / 2, 0, K, D],
    [0, -D / 2 + K / 2, W - 2 * K, K], [0, D / 2 - K / 2, W - 2 * K, K],
  ];
  for (const [x, z, w, d] of kridla) {
    const k = fasada(w, H, d, KREMOVA, { okno: [3.6, 5.6] });
    k.position.set(x, H / 2, z);
    g.add(k);
    const r = rimsa(w, d, H - 0.3, '#fbf6ee', 0.5);
    r.position.x = x; r.position.z = z;
    g.add(r);
    const s = valbovaStrecha(w + 1, 5, d + 1, '#6f6b66');
    s.position.set(x, H, z);
    g.add(s);
  }
  // hlavné priečelie na lokálnej strane -x (k Primaciálnemu námestiu)
  // portikus: 4 stĺpy (~1 m hrubé) od dlažby po balkón, na podstavcoch
  const PR = 6.2, X = -W / 2 - 2.0;
  for (let i = 0; i < 4; i++) {
    const z = (i - 1.5) * 4;
    const podstavec = kvader(1.5, 1.0, 1.5, '#e9e2d2');
    podstavec.position.set(X, 0.5, z);
    g.add(podstavec);
    const stlp = valec(0.5, 0.55, PR - 1.6, '#fbf8f1', 16);
    stlp.position.set(X, 1.0, z);
    g.add(stlp);
    const hlavica = kvader(1.3, 0.6, 1.3, '#fbf8f1');
    hlavica.position.set(X, PR - 0.3, z);
    g.add(hlavica);
  }
  // balkón v 1. poschodí so zábradlím (balustráda)
  const balkon = kvader(4.6, 0.5, 15.5, '#f4efe4');
  balkon.position.set(-W / 2 - 2.0, PR + 0.25, 0);
  g.add(balkon);
  const madlo = kvader(0.25, 0.15, 15.5, '#f4efe4');
  madlo.position.set(-W / 2 - 4.15, PR + 1.5, 0);
  g.add(madlo);
  for (let i = 0; i <= 24; i++) {
    const b = valec(0.08, 0.11, 0.95, '#f4efe4', 6);
    b.position.set(-W / 2 - 4.15, PR + 0.5, (i / 24 - 0.5) * 15);
    g.add(b);
  }
  const tymp = stit(18, 4.5, 2, '#fbf6ee');
  tymp.rotation.y = Math.PI / 2;
  tymp.position.set(-W / 2 - 0.5, H, 0);
  g.add(tymp);
  // kardinálsky klobúk (železný, 150 kg :) )
  const klobuk = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1.6, 0.6, 16), material('#8b1e2c'));
  klobuk.position.set(-W / 2 - 0.5, H + 5.1, 0);
  g.add(klobuk);
  naMiesto(g, p, vyskopis, W, D);
  kolizie.pridajObdlznik(p.x, p.z, W + 2, D, p.natocenie ?? 0, { typ: 'pamiatka', nazov: p.nazov });
  // stĺpy portika (pred palácom) – kolízne kruhy vo svetových súradniciach
  const u = p.natocenie ?? 0, c = Math.cos(u), s = Math.sin(u);
  for (let i = 0; i < 4; i++) {
    const lx = -W / 2 - 2.0, lz = (i - 1.5) * 4;
    kolizie.pridajKruh(p.x + lx * c + lz * s, p.z - lx * s + lz * c, 0.75, { typ: 'pamiatka', nazov: p.nazov });
  }
  return { objekt: g };
}
