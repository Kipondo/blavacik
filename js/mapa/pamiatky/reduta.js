// Reduta – secesno-neobaroková budova filharmónie: svetlá fasáda, nárožné kupoly, mansardové strechy.

import * as THREE from 'three';
import { fasada, valbovaStrecha, rimsa, kupola, naMiesto } from './pomocne.js';

export default function postav(p, { vyskopis, kolizie }) {
  const W = 84, D = 40, H = 19;
  const g = new THREE.Group();
  const telo = fasada(W, H, D, '#efe6d2', { okno: [3.8, 4.8] });
  telo.position.y = H / 2;
  g.add(telo);
  g.add(rimsa(W, D, H - 0.3, '#fbf7ee', 0.6));
  const s = valbovaStrecha(W + 1, 8, D + 1, '#59625f');
  s.position.y = H;
  g.add(s);
  for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
    const n = fasada(9, H + 3, 9, '#f4ecdb', { okno: [3, 4.8] });
    n.position.set(sx * (W / 2 - 4), (H + 3) / 2, sz * (D / 2 - 4));
    g.add(n);
    const k = kupola(4.6, '#5d7d74', { vyskaPomer: 1.3 });
    k.position.set(sx * (W / 2 - 4), H + 3, sz * (D / 2 - 4));
    g.add(k);
  }
  naMiesto(g, p, vyskopis, W, D);
  kolizie.pridajObdlznik(p.x, p.z, W, D, p.natocenie ?? 0, { typ: 'pamiatka', nazov: p.nazov });
  return { objekt: g };
}
