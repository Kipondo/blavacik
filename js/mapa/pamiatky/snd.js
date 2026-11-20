// Historická budova SND – neorenesančné divadlo: krémová fasáda, rizality,
// ozdobné štíty a vyvýšená strecha nad javiskom. Priečelie (lokálna strana +z) hľadí na Hviezdoslavovo námestie.

import * as THREE from 'three';
import { fasada, valbovaStrecha, stit, rimsa, kvader, naMiesto } from './pomocne.js';

const KREM = '#efe0bf';

export default function postav(p, { vyskopis, kolizie }) {
  const W = 34, D = 62, H = 20;
  const g = new THREE.Group();
  const telo = fasada(W, H, D, KREM, { okno: [3.6, 5] });
  telo.position.y = H / 2;
  g.add(telo);
  g.add(rimsa(W, D, H - 0.3, '#fbf3e1', 0.6));
  const strecha = valbovaStrecha(W + 1, 8, D + 1, '#4f5a5d');
  strecha.position.y = H;
  g.add(strecha);
  // javisková veža (vyššia zadná časť)
  const javisko = fasada(W - 6, 9, 18, '#e7d6b2', { okno: [4, 4.5] });
  javisko.position.set(0, H + 4.5, -D / 2 + 12);
  g.add(javisko);
  const sj = valbovaStrecha(W - 5, 5, 19, '#4f5a5d');
  sj.position.set(0, H + 9, -D / 2 + 12);
  g.add(sj);
  // priečelie s rizalitom a štítom
  const rizalit = fasada(18, H + 3, 4, '#f5e9cc', { okno: [3, 5.5] });
  rizalit.position.set(0, (H + 3) / 2, D / 2 + 2);
  g.add(rizalit);
  const s = stit(18, 5, 4.2, '#fbf3e1');
  s.position.set(0, H + 3, D / 2 + 2);
  g.add(s);
  for (const x of [-12, 12]) {
    const vez = fasada(5, H + 6, 5, '#f2e3c2', { okno: [2.5, 5] });
    vez.position.set(x, (H + 6) / 2, D / 2 - 1);
    g.add(vez);
    const kup = valbovaStrecha(5.5, 4, 5.5, '#4f5a5d');
    kup.position.set(x, H + 6, D / 2 - 1);
    g.add(kup);
  }
  const vchod = kvader(8, 4, 0.5, '#5a4231');
  vchod.position.set(0, 2, D / 2 + 4.1);
  g.add(vchod);
  naMiesto(g, p, vyskopis, W, D);
  kolizie.pridajObdlznik(p.x, p.z, W, D + 6, p.natocenie ?? 0, { typ: 'pamiatka', nazov: p.nazov });
  return { objekt: g };
}
