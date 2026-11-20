// Stará radnica – skupina budov okolo nádvoria na Hlavnom námestí, s gotickou vežou
// (osemboká horná časť, barokový ihlan) a farebnou škridlovou strechou.

import * as THREE from 'three';
import { fasada, valbovaStrecha, valec, kvader, naMiesto } from './pomocne.js';

export default function postav(p, { vyskopis, kolizie }) {
  const W = 52, D = 44, H = 13;
  const g = new THREE.Group();
  // krídla okolo nádvoria (predné krídlo je na lokálnej strane +z – k námestiu)
  const kridla = [
    [0, D / 2 - 7, W, 14, '#f1d9a7'],
    [0, -D / 2 + 7, W, 14, '#ead2b0'],
    [-W / 2 + 7, 0, 14, D - 28, '#efdcc0'],
    [W / 2 - 7, 0, 14, D - 28, '#e9cfa5'],
  ];
  for (const [x, z, w, d, f] of kridla) {
    const k = fasada(w, H, d, f, { okno: [3.4, 4.3] });
    k.position.set(x, H / 2, z);
    g.add(k);
    const s = valbovaStrecha(w + 1, 7, d + 1, '#8f4a2f');
    s.position.set(x, H, z);
    g.add(s);
  }
  // veža na prednom krídle
  const vx = -8, vz = D / 2 - 4;
  const veza = fasada(8, 26, 8, '#f3e7c9', { okno: [3, 5] });
  veza.position.set(vx, 13, vz);
  g.add(veza);
  const osem = valec(3.6, 3.8, 7, '#f6eedb', 8);
  osem.position.set(vx, 26, vz);
  g.add(osem);
  const galeria = valec(4.4, 4.4, 0.6, '#d8cdb5', 8);
  galeria.position.set(vx, 30, vz);
  g.add(galeria);
  const strecha = valec(0.15, 3.6, 9, '#5f7d70', 8);
  strecha.position.set(vx, 33, vz);
  g.add(strecha);
  // podlubie (arkády) na prízemí pri námestí
  for (let i = 0; i < 5; i++) {
    const s = kvader(1, 4, 1, '#d9ccb1');
    s.position.set(6 + i * 4, 2, D / 2 + 0.6);
    g.add(s);
  }
  naMiesto(g, p, vyskopis, W, D);
  kolizie.pridajObdlznik(p.x, p.z, W, D, p.natocenie ?? 0, { typ: 'pamiatka', nazov: p.nazov });
  return { objekt: g };
}
