// Historická budova SND – neorenesančné divadlo: krémovobiela fasáda, rizality,
// ozdobné štíty a vyvýšená strecha nad javiskom. Priečelie (lokálna strana +z) hľadí na Hviezdoslavovo námestie.
// Porovnanie so skutočnosťou (etapa 3): v priečelí lodžia s oblúkmi a stĺpmi, sochy na atike,
// zdobená strecha s kupolou nad hľadiskom, nárožné pavilóny s kupolkami.

import * as THREE from 'three';
import { fasada, valbovaStrecha, stit, rimsa, kvader, valec, kupola, naMiesto } from './pomocne.js';

const KREM = '#f1e7d0', BIELA = '#fbf6ea', MED = '#5f8c7c';

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
  // priečelie: stredný rizalit s lodžiou (oblúky so stĺpmi v 1. poschodí), atika so sochami a štít
  const RZ = 20, zf = D / 2 + 3;
  const rizalit = fasada(RZ, H + 3, 6, KREM, { okno: [4, 5.5] });
  rizalit.position.set(0, (H + 3) / 2, D / 2);
  g.add(rizalit);
  // tri oblúkové vchody v prízemí
  for (const x of [-5, 0, 5]) {
    const v = kvader(3, 4.2, 0.3, '#3d2f25');
    v.position.set(x, 2.1, zf + 0.05);
    g.add(v);
    const o = valec(1.5, 1.5, 0.3, '#3d2f25', 12);
    o.rotation.x = Math.PI / 2; o.position.set(x, 4.2, zf - 0.1);
    g.add(o);
  }
  // lodžia: tmavý výklenok a pred ním stĺpy s oblúkmi
  const lodzia = kvader(RZ - 3, 7, 0.4, '#4a4038');
  lodzia.position.set(0, 10.5, zf + 0.05);
  g.add(lodzia);
  for (let i = 0; i <= 5; i++) {
    const x = (i - 2.5) * ((RZ - 4) / 5);
    const st = valec(0.38, 0.42, 6.2, BIELA, 12);
    st.position.set(x, 7.2, zf + 0.6);
    g.add(st);
  }
  const balust = kvader(RZ - 2, 1.0, 0.8, BIELA);
  balust.position.set(0, 7.6, zf + 0.6);
  g.add(balust);
  const archy = kvader(RZ - 2, 1.2, 0.9, BIELA);
  archy.position.set(0, 14, zf + 0.5);
  g.add(archy);
  // atika so sochami
  const atika = kvader(RZ + 1, 1.4, 6.6, BIELA);
  atika.position.set(0, H + 3.7, D / 2);
  g.add(atika);
  for (let i = 0; i < 6; i++) {
    const x = (i - 2.5) * 3.6;
    const podst = kvader(0.9, 0.6, 0.9, BIELA);
    podst.position.set(x, H + 4.7, zf - 0.2);
    g.add(podst);
    const socha = valec(0.28, 0.36, 2.0, '#e9e2d2', 8);
    socha.position.set(x, H + 5, zf - 0.2);
    g.add(socha);
    const hlava = valec(0.18, 0.2, 0.35, '#e9e2d2', 8);
    hlava.position.set(x, H + 7, zf - 0.2);
    g.add(hlava);
  }
  const s = stit(RZ - 4, 4.5, 1.2, BIELA);
  s.position.set(0, H + 4.4, zf - 1.2);
  g.add(s);
  // nárožné pavilóny s kupolkami
  for (const x of [-W / 2 + 3, W / 2 - 3]) {
    const pav = fasada(7, H + 4, 7, KREM, { okno: [3.5, 5] });
    pav.position.set(x, (H + 4) / 2, D / 2 - 2);
    g.add(pav);
    const r = rimsa(7, 7, H + 3.7, BIELA, 0.4, 0.5);
    r.position.x = x; r.position.z = D / 2 - 2;
    g.add(r);
    const kup = kupola(3.4, MED, { vyskaPomer: 1.3 });
    kup.position.set(x, H + 4, D / 2 - 2);
    g.add(kup);
  }
  // kupola nad hľadiskom
  const tambur = valec(9, 9, 2.4, KREM, 24);
  tambur.position.set(0, H + 2, 4);
  g.add(tambur);
  const k = kupola(9, MED, { vyskaPomer: 0.75 });
  k.position.set(0, H + 4.4, 4);
  g.add(k);
  naMiesto(g, p, vyskopis, W, D);
  kolizie.pridajObdlznik(p.x, p.z, W, D + 6, p.natocenie ?? 0, { typ: 'pamiatka', nazov: p.nazov });
  return { objekt: g };
}
