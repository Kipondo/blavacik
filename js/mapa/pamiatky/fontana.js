// Maximiliánova (Rolandova) fontána na Hlavnom námestí – okrúhla nádrž so stĺpom a sochou rytiera.

import * as THREE from 'three';
import { valec, material } from './pomocne.js';

export default function postav(p, { vyskopis, kolizie }) {
  const g = new THREE.Group();
  const nadrz = valec(5, 5.2, 1, '#cfc6b4', 24);
  g.add(nadrz);
  const voda = new THREE.Mesh(new THREE.CircleGeometry(4.6, 24), material('#4f8396', { lesk: 0.85 }));
  voda.rotation.x = -Math.PI / 2;
  voda.position.y = 0.85;
  g.add(voda);
  const podstavec = valec(1.2, 1.4, 2.5, '#d6cdb9', 8);
  podstavec.position.y = 0.8;
  g.add(podstavec);
  const stlp = valec(0.45, 0.5, 4, '#e0d8c6', 12);
  stlp.position.y = 3.3;
  g.add(stlp);
  const socha = valec(0.35, 0.45, 2, '#b9b2a2', 8);
  socha.position.y = 7.3;
  g.add(socha);
  const hlava = new THREE.Mesh(new THREE.SphereGeometry(0.32, 8, 6), material('#b9b2a2'));
  hlava.position.y = 9.5;
  g.add(hlava);
  g.position.set(p.x, vyskopis.vyskaTerenu(p.x, p.z), p.z);
  kolizie.pridajKruh(p.x, p.z, 5.2, { typ: 'pamiatka', nazov: 'Maximiliánova fontána' });
  return { objekt: g };
}
