// Modrý kostolík (Kostol sv. Alžbety) – secesný kostol: bledomodrá omietka, modrá škridla,
// okrúhla veža a oválne prvky. Veža je na lokálnej strane -x.

import * as THREE from 'three';
import { valec, kvader, material, naMiesto } from './pomocne.js';

const MODRA = '#a9d2e6';
const STRECHA = '#2f6ea5';
const BIELA = '#f7fbfd';

export default function postav(p, { vyskopis, kolizie }) {
  const W = 30, D = 16, H = 13;
  const g = new THREE.Group();
  // loď so zaoblenými rohmi (kváder + valce)
  const lod = kvader(W - 6, H, D, MODRA);
  lod.position.y = H / 2;
  g.add(lod);
  const apsida = valec(D / 2, D / 2, H, MODRA, 16);
  apsida.position.x = W / 2 - 3;
  g.add(apsida);
  for (let i = 0; i < 6; i++) {
    const pas = kvader(0.4, H - 4, D + 0.2, BIELA);
    pas.position.set(-W / 2 + 6 + i * 4, (H - 4) / 2 + 2, 0);
    g.add(pas);
  }
  // modrá strecha – zaoblený „hrebeň“ (polovica valca)
  const strechaGeo = new THREE.CylinderGeometry(D / 2 + 0.6, D / 2 + 0.6, W - 6, 16, 1, false, 0, Math.PI);
  strechaGeo.rotateZ(Math.PI / 2);
  strechaGeo.rotateX(Math.PI / 2);
  const strecha = new THREE.Mesh(strechaGeo, material(STRECHA, { lesk: 0.4 }));
  strecha.scale.set(1, 0.7, 1);
  strecha.position.y = H;
  g.add(strecha);
  const kup = new THREE.Mesh(new THREE.SphereGeometry(D / 2 + 0.6, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), material(STRECHA, { lesk: 0.4 }));
  kup.scale.set(1, 0.7, 1);
  kup.position.set(W / 2 - 3, H, 0);
  g.add(kup);
  // okrúhla veža s modrou kupolou
  const vx = -W / 2 + 2;
  const veza = valec(4, 4.2, 28, MODRA, 20);
  veza.position.x = vx;
  g.add(veza);
  const krk = valec(3.2, 3.6, 4, BIELA, 20);
  krk.position.set(vx, 28, 0);
  g.add(krk);
  const kv = new THREE.Mesh(new THREE.SphereGeometry(3.4, 16, 10), material(STRECHA, { lesk: 0.4 }));
  kv.scale.set(1, 1.5, 1);
  kv.position.set(vx, 33, 0);
  g.add(kv);
  const kriz = kvader(0.25, 2.5, 0.25, '#e3b23c', { kov: 0.8, lesk: 0.6 });
  kriz.position.set(vx, 39, 0);
  g.add(kriz);
  naMiesto(g, p, vyskopis, W, D);
  kolizie.pridajObdlznik(p.x, p.z, W + 2, D, p.natocenie ?? 0, { typ: 'pamiatka', nazov: p.nazov });
  return { objekt: g };
}
