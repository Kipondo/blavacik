// Nová budova SND – veľký moderný komplex: kamenný podstavec, vysoké kvádre sál,
// presklené foyer a plochá strecha.

import * as THREE from 'three';
import { fasada, kvader, naMiesto } from './pomocne.js';

export default function postav(p, { vyskopis, kolizie }) {
  const W = 170, D = 126;
  const g = new THREE.Group();
  const podstavec = fasada(W, 8, D, '#d9d4c8', { druh: 'okna', okno: [4, 4] });
  podstavec.position.y = 4;
  g.add(podstavec);
  const casti = [
    [-35, -10, 60, 26, 70, '#e6e2d8', 'okna'],     // veľká sála (javisková veža)
    [35, -15, 26, 22, 60, '#dcd6c8', 'okna'],      // činohra
    [0, 40, 22, 14, 120, '#9fb8c6', 'sklo'],       // foyer
    [60, 30, 20, 20, 36, '#e2ddd1', 'okna'],
    [-65, 35, 18, 16, 30, '#d8d2c4', 'okna'],
  ];
  for (const [x, z, h, d, w, f, druh] of casti) {
    const c = fasada(w, h, d * 2, f, { druh, okno: druh === 'sklo' ? [3, 3] : [4, 4] });
    c.position.set(x, 8 + h / 2, z);
    g.add(c);
  }
  const markiza = kvader(130, 1, 10, '#efebe2');
  markiza.position.set(0, 14, D / 2 - 6);
  g.add(markiza);
  naMiesto(g, p, vyskopis, W, D);
  kolizie.pridajObdlznik(p.x, p.z, W, D, p.natocenie ?? 0, { typ: 'pamiatka', nazov: p.nazov });
  return { objekt: g };
}
