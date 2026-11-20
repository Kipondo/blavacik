// Národná rada SR – modernistická budova pod hradom: široký nízky kváder
// na štvorhranných stĺpoch, svetlý kameň a sklo.

import * as THREE from 'three';
import { fasada, kvader, rimsa, naMiesto } from './pomocne.js';

export default function postav(p, { vyskopis, kolizie }) {
  const W = 90, D = 50, H = 17;
  const g = new THREE.Group();
  const prizemie = fasada(W - 8, 5, D - 8, '#9fb3bd', { druh: 'sklo', okno: [3, 5] });
  prizemie.position.y = 2.5;
  g.add(prizemie);
  const telo = fasada(W, H - 5, D, '#e7e2d6', { druh: 'okna', okno: [3, 3.6], strecha: '#9c9890' });
  telo.position.y = 5 + (H - 5) / 2;
  g.add(telo);
  g.add(rimsa(W, D, H, '#f1eee6', 0.8, 0.8));
  // stĺpy pod presahujúcim telom
  for (let i = 0; i < 16; i++) {
    for (const strana of [-1, 1]) {
      const s = kvader(1.2, 5, 1.2, '#d6d0c2');
      s.position.set(-W / 2 + 3 + i * ((W - 6) / 15), 2.5, strana * (D / 2 - 1));
      g.add(s);
    }
  }
  naMiesto(g, p, vyskopis, W, D);
  kolizie.pridajObdlznik(p.x, p.z, W - 6, D - 6, p.natocenie ?? 0, { typ: 'pamiatka', nazov: p.nazov });
  return { objekt: g };
}
