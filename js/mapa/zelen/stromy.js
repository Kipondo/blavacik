// Stromy ako InstancedMesh (tisíce stromov za cenu pár objektov).
// Formát v dátach: "stromy": [[x, z, mierka], ...]

import * as THREE from 'three';

export function vytvorStromy(stromy, vyskopis, kolizie) {
  const pocet = stromy?.length ?? 0;
  const skupina = new THREE.Group();
  skupina.name = 'stromy';
  if (!pocet) return skupina;

  const kmenGeo = new THREE.CylinderGeometry(0.22, 0.32, 3, 6);
  kmenGeo.translate(0, 1.5, 0);
  const korunaGeo = new THREE.IcosahedronGeometry(2.4, 0);
  korunaGeo.translate(0, 4.6, 0);

  const kmene = new THREE.InstancedMesh(kmenGeo, new THREE.MeshStandardMaterial({ color: '#5b4632', roughness: 1 }), pocet);
  const koruny = new THREE.InstancedMesh(korunaGeo, new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.9, flatShading: true }), pocet);

  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const os = new THREE.Vector3(0, 1, 0);
  const farba = new THREE.Color();
  for (let i = 0; i < pocet; i++) {
    const [x, z, s = 1] = stromy[i];
    const y = vyskopis.vyskaTerenu(x, z);
    q.setFromAxisAngle(os, (i * 2.399) % (Math.PI * 2));
    m.compose(new THREE.Vector3(x, y, z), q, new THREE.Vector3(s, s * (0.9 + (i % 5) * 0.06), s));
    kmene.setMatrixAt(i, m);
    koruny.setMatrixAt(i, m);
    farba.setHSL(0.24 + (i % 7) * 0.012, 0.42 + (i % 3) * 0.06, 0.26 + (i % 5) * 0.025);
    koruny.setColorAt(i, farba);
    kolizie?.pridajKruh(x, z, 0.45 * s, { typ: 'strom' });
  }
  kmene.castShadow = koruny.castShadow = true;
  koruny.receiveShadow = true;
  kmene.computeBoundingSphere();
  koruny.computeBoundingSphere();
  skupina.add(kmene, koruny);
  return skupina;
}
