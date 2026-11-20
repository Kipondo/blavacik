// Televízna veža na Kamzíku (194 m) – stojí na skutočnom teréne Malých Karpát.
// Ak mapa nemá výškový model (len centrum), postaví sa aj zjednodušený kopec na obzore.

import * as THREE from 'three';

export default function postav(p, { vyskopis, KONFIG }) {
  const g = new THREE.Group();
  const H = KONFIG.HRANICE;
  const naMape = p.x > H.minX && p.x < H.maxX && p.z > H.minZ && p.z < H.maxZ;
  const mat = (farba) => new THREE.MeshStandardMaterial({ color: farba, roughness: 0.6, metalness: 0.2 });

  let y0 = naMape ? vyskopis.vyskaTerenu(p.x, p.z) : 290;
  if (!naMape) {
    // starý režim (len centrum): Malé Karpaty ako hmlistý kopec na obzore
    const kopec = new THREE.Mesh(new THREE.ConeGeometry(1700, 300, 24, 1, true), new THREE.MeshBasicMaterial({ color: '#9db3bf', fog: false }));
    kopec.position.y = 145;
    g.add(kopec);
  }
  const SIVA = '#c9d1d6';
  // nohy (betónové piliere) a driek
  for (let k = 0; k < 3; k++) {
    const u = (k / 3) * Math.PI * 2;
    const noha = new THREE.Mesh(new THREE.BoxGeometry(5, 60, 5), mat('#bfc7cc'));
    noha.position.set(Math.cos(u) * 12, y0 + 28, Math.sin(u) * 12);
    noha.rotation.set(Math.sin(u) * 0.18, 0, -Math.cos(u) * 0.18);
    g.add(noha);
  }
  const driek = new THREE.Mesh(new THREE.CylinderGeometry(5.5, 8, 100, 16), mat(SIVA));
  driek.position.y = y0 + 50;
  const kabina = new THREE.Mesh(new THREE.CylinderGeometry(15, 11, 24, 20), mat('#b8c3ca'));
  kabina.position.y = y0 + 108;
  const okna = new THREE.Mesh(new THREE.CylinderGeometry(15.2, 14, 6, 20), mat('#2c3b46'));
  okna.position.y = y0 + 104;
  const strecha = new THREE.Mesh(new THREE.CylinderGeometry(9, 15, 6, 20), mat(SIVA));
  strecha.position.y = y0 + 123;
  const antena = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 3.5, 68, 8), mat('#dfe5e8'));
  antena.position.y = y0 + 160;
  const pruhy = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 2.4, 14, 8), mat('#c8102e'));
  pruhy.position.y = y0 + 175;
  g.add(driek, kabina, okna, strecha, antena, pruhy);
  g.position.set(p.x, 0, p.z);
  return { objekt: g };
}
