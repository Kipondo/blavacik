// Prezidentský (Grasalkovičov) palác – biely rokokový palác so stredným rizalitom,
// štítom a mansardovou strechou. Priečelie (lokálne +z) hľadí na Hodžovo námestie.

import * as THREE from 'three';
import { fasada, valbovaStrecha, stit, rimsa, stlpy, naMiesto } from './pomocne.js';

export default function postav(p, { vyskopis, kolizie }) {
  const W = 96, D = 30, H = 14;
  const g = new THREE.Group();
  const telo = fasada(W, H, D, '#f7f4ee', { okno: [3.6, 5.5] });
  telo.position.y = H / 2;
  g.add(telo);
  g.add(rimsa(W, D, H - 0.3, '#ffffff', 0.5));
  const s = valbovaStrecha(W + 1, 8, D + 1, '#59636a');
  s.position.y = H;
  g.add(s);
  // stredný rizalit
  const riz = fasada(22, H + 3, 6, '#fbf9f4', { okno: [3.6, 5.5] });
  riz.position.set(0, (H + 3) / 2, D / 2 + 2);
  g.add(riz);
  const t = stit(22, 5, 6.2, '#ffffff');
  t.position.set(0, H + 3, D / 2 + 2);
  g.add(t);
  const st = stlpy(4, 4.5, 7, 0.45, '#ffffff');
  st.position.set(0, 0, D / 2 + 5.6);
  g.add(st);
  // bočné krídla
  for (const sx of [-1, 1]) {
    const k = fasada(12, H, 14, '#f5f1e9', { okno: [3.6, 5.5] });
    k.position.set(sx * (W / 2 - 6), H / 2, D / 2 + 7);
    g.add(k);
    const ks = valbovaStrecha(13, 6, 15, '#59636a');
    ks.position.set(sx * (W / 2 - 6), H, D / 2 + 7);
    g.add(ks);
  }
  naMiesto(g, p, vyskopis, W, D);
  kolizie.pridajObdlznik(p.x, p.z, W, D + 10, p.natocenie ?? 0, { typ: 'pamiatka', nazov: p.nazov });
  return { objekt: g };
}
