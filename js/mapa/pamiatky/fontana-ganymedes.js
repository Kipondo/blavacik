// Ganymedova fontána pred historickou budovou SND (porovnanie so skutočnosťou, etapa 3):
// okrúhla nádrž s nízkym kamenným okrajom, v strede podstavec s mušľami a súsošie navrchu.

import * as THREE from 'three';
import { valec, kvader, material } from './pomocne.js';

const KAMEN = '#d8cfbd', KAMEN2 = '#c5bca8', SOCHA = '#cdc4b0';

export default function postav(p, { vyskopis, kolizie }) {
  const g = new THREE.Group();
  const R = 3.4;
  const okraj = valec(R, R + 0.1, 0.55, KAMEN2, 32);
  g.add(okraj);
  const hrana = valec(R + 0.2, R + 0.2, 0.12, KAMEN, 32);
  hrana.position.y = 0.55;
  g.add(hrana);
  const voda = new THREE.Mesh(new THREE.CircleGeometry(R - 0.1, 32), material('#5c8a97', { lesk: 0.85 }));
  voda.rotation.x = -Math.PI / 2;
  voda.position.y = 0.45;
  g.add(voda);
  // podstavec s dvoma mušľami
  const podst = valec(0.7, 0.9, 1.6, KAMEN2, 8);
  podst.position.y = 0.3;
  g.add(podst);
  const musla1 = valec(1.6, 0.6, 0.4, KAMEN, 16);
  musla1.position.y = 1.9;
  g.add(musla1);
  const drik = valec(0.35, 0.45, 1.4, KAMEN, 12);
  drik.position.y = 2.3;
  g.add(drik);
  const musla2 = valec(0.9, 0.35, 0.3, KAMEN, 16);
  musla2.position.y = 3.7;
  g.add(musla2);
  // súsošie: postava chlapca s orlom (zjednodušené)
  const telo = valec(0.22, 0.3, 1.1, SOCHA, 8);
  telo.position.y = 4.0;
  g.add(telo);
  const hlava = new THREE.Mesh(new THREE.SphereGeometry(0.17, 10, 8), material(SOCHA));
  hlava.position.y = 5.3;
  g.add(hlava);
  const orol = kvader(1.2, 0.18, 0.5, SOCHA);
  orol.position.set(0.3, 5.0, 0.1);
  orol.rotation.z = 0.35;
  g.add(orol);
  g.position.set(p.x, vyskopis.vyskaTerenu(p.x, p.z), p.z);
  g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  kolizie.pridajKruh(p.x, p.z, R + 0.2, { typ: 'pamiatka', nazov: p.nazov });
  return { objekt: g };
}
