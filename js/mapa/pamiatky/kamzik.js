// Kamzík s televíznou vežou – na horizonte nad mestom (ďaleko za hranicou mapy,
// preto bez hmly, v hmlistej modrej farbe ako vzdialené kopce).

import * as THREE from 'three';

export default function postav(p) {
  const g = new THREE.Group();
  const mat = (farba) => new THREE.MeshBasicMaterial({ color: farba, fog: false });
  // Malé Karpaty – zvlnené kopce
  const kopce = [[0, 0, 1700, 300], [-1800, 300, 1500, 250], [1700, 600, 1500, 220], [-3400, 800, 1400, 200]];
  for (const [dx, dz, r, h] of kopce) {
    const k = new THREE.Mesh(new THREE.ConeGeometry(r, h, 24, 1, true), mat('#9db3bf'));
    k.position.set(dx, h / 2 - 5, dz);
    g.add(k);
  }
  // veža (194 m): driek, kabína, anténa
  const VRCH = 290;
  const driek = new THREE.Mesh(new THREE.CylinderGeometry(6, 14, 120, 12), mat('#c9d3d9'));
  driek.position.y = VRCH + 60;
  const kabina = new THREE.Mesh(new THREE.CylinderGeometry(18, 12, 26, 12), mat('#b9c4cb'));
  kabina.position.y = VRCH + 125;
  const antena = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 4, 70, 8), mat('#d4dce0'));
  antena.position.y = VRCH + 172;
  // nohy veže
  for (const s of [-1, 1]) {
    const noha = new THREE.Mesh(new THREE.BoxGeometry(6, 70, 6), mat('#c3cdd3'));
    noha.position.set(s * 14, VRCH + 30, 0);
    noha.rotation.z = s * 0.15;
    g.add(noha);
  }
  g.add(driek, kabina, antena);
  g.position.set(p.x, 0, p.z);
  g.traverse((o) => { o.castShadow = false; o.receiveShadow = false; });
  g.userData.bezTiena = true;
  return { objekt: g };
}
