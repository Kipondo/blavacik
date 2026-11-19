// Pouličné lampy z OSM (highway=street_lamp) – stĺp s ramenom a svietidlom.
// Svietidlo má vlastný materiál, aby sa dalo v noci rozsvietiť (emissive).

import * as THREE from 'three';

export function vytvorLampy(lampy, vyskopis, kolizie) {
  const skupina = new THREE.Group();
  skupina.name = 'lampy';
  const n = lampy?.length ?? 0;
  if (!n) return skupina;
  const stlpGeo = new THREE.CylinderGeometry(0.07, 0.11, 7, 6);
  stlpGeo.translate(0, 3.5, 0);
  const ramenoGeo = new THREE.BoxGeometry(0.08, 0.08, 1.4);
  ramenoGeo.translate(0, 6.9, 0.65);
  const hlavaGeo = new THREE.BoxGeometry(0.35, 0.18, 0.7);
  hlavaGeo.translate(0, 6.8, 1.3);
  const matStlp = new THREE.MeshStandardMaterial({ color: '#3a3f42', metalness: 0.6, roughness: 0.45 });
  const matSvetlo = new THREE.MeshStandardMaterial({ color: '#f5efd6', emissive: '#ffd27a', emissiveIntensity: 0 });
  const stlpy = new THREE.InstancedMesh(stlpGeo, matStlp, n);
  const ramena = new THREE.InstancedMesh(ramenoGeo, matStlp, n);
  const hlavy = new THREE.InstancedMesh(hlavaGeo, matSvetlo, n);
  const o = new THREE.Object3D();
  lampy.forEach(([x, z], i) => {
    o.position.set(x, vyskopis.vyska(x, z), z);
    o.rotation.set(0, (Math.abs(Math.round(x * 13 + z * 7)) % 4) * (Math.PI / 2), 0);
    o.updateMatrix();
    stlpy.setMatrixAt(i, o.matrix);
    ramena.setMatrixAt(i, o.matrix);
    hlavy.setMatrixAt(i, o.matrix);
    kolizie?.pridajKruh(x, z, 0.15, { typ: 'lampa' });
  });
  for (const m of [stlpy, ramena, hlavy]) { m.castShadow = true; m.computeBoundingSphere(); }
  skupina.add(stlpy, ramena, hlavy);
  skupina.userData.materialSvetla = matSvetlo; // pre budúci deň/noc
  return skupina;
}
