// Mrakodrap pri Eurovei (prvý slovenský mrakodrap, ~168 m) – sklenená veža so zvislými
// bielymi rebrami a korunou navrchu.

import * as THREE from 'three';
import { fasada, kvader, naMiesto } from './pomocne.js';

export default function postav(p, { vyskopis, kolizie }) {
  const W = 38, D = 30, H = 164;
  const g = new THREE.Group();
  const veza = fasada(W, H, D, '#a9c1cf', { druh: 'sklo', okno: [3, 3.4], strecha: '#c9cdcf' });
  veza.position.y = H / 2;
  g.add(veza);
  // zvislé rebrá na dlhých stranách
  for (let i = 0; i < 7; i++) {
    for (const s of [-1, 1]) {
      const r = kvader(0.8, H, 1.2, '#f2f4f5');
      r.position.set(-W / 2 + 3 + i * ((W - 6) / 6), H / 2, s * (D / 2 + 0.5));
      g.add(r);
    }
  }
  const koruna = kvader(W + 2, 8, D + 2, '#eef1f2');
  koruna.position.y = H + 2;
  g.add(koruna);
  const podnoz = fasada(W + 16, 7, D + 14, '#d6dcdf', { druh: 'sklo', okno: [4, 3.5] });
  podnoz.position.y = 3.5;
  g.add(podnoz);
  naMiesto(g, p, vyskopis, W, D);
  kolizie.pridajObdlznik(p.x, p.z, W + 16, D + 14, p.natocenie ?? 0, { typ: 'pamiatka', nazov: p.nazov });
  return { objekt: g };
}
