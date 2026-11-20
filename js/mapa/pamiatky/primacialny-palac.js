// Primaciálny palác – klasicistický palác s ružovkastou fasádou, bielymi detailmi,
// tympanónom so sochami a kardinálskym klobúkom navrchu. Okolo nádvoria.

import * as THREE from 'three';
import { fasada, valbovaStrecha, stit, stlpy, rimsa, material, naMiesto } from './pomocne.js';

const RUZOVA = '#f0c9b8';

export default function postav(p, { vyskopis, kolizie }) {
  const W = 54, D = 60, H = 17, K = 14;
  const g = new THREE.Group();
  const kridla = [
    [-W / 2 + K / 2, 0, K, D], [W / 2 - K / 2, 0, K, D],
    [0, -D / 2 + K / 2, W - 2 * K, K], [0, D / 2 - K / 2, W - 2 * K, K],
  ];
  for (const [x, z, w, d] of kridla) {
    const k = fasada(w, H, d, RUZOVA, { okno: [3.6, 5.6] });
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
  const portikus = stlpy(4, 4, 9, 0.6);
  portikus.rotation.y = Math.PI / 2;
  portikus.position.set(-W / 2 - 1.2, 6.5, 0);
  g.add(portikus);
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
  return { objekt: g };
}
