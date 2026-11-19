// Stromy ako InstancedMesh, rozdelené do štvorcov (chunkov), aby sa vzdialené
// a neviditeľné skupiny stromov vôbec nevykresľovali.
// Formát v dátach: "stromy": [[x, z, mierka], ...]

import * as THREE from 'three';

const CHUNK = 250;
const DOHLAD = 520; // ďalej ako toto sa stromy skryjú (aj tak sú v hmle)

export function vytvorStromy(stromy, vyskopis, kolizie) {
  const skupina = new THREE.Group();
  skupina.name = 'stromy';
  if (!stromy?.length) return skupina;

  const kmenGeo = new THREE.CylinderGeometry(0.22, 0.32, 3, 6);
  kmenGeo.translate(0, 1.5, 0);
  const korunaGeo = new THREE.IcosahedronGeometry(2.4, 0);
  korunaGeo.translate(0, 4.6, 0);
  const matKmen = new THREE.MeshStandardMaterial({ color: '#5b4632', roughness: 1 });
  const matKoruna = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.9, flatShading: true });

  const chunky = new Map();
  stromy.forEach((s, i) => {
    const k = `${Math.floor(s[0] / CHUNK)},${Math.floor(s[1] / CHUNK)}`;
    if (!chunky.has(k)) chunky.set(k, []);
    chunky.get(k).push([s, i]);
  });

  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const os = new THREE.Vector3(0, 1, 0);
  const farba = new THREE.Color();
  for (const zoznam of chunky.values()) {
    const kmene = new THREE.InstancedMesh(kmenGeo, matKmen, zoznam.length);
    const koruny = new THREE.InstancedMesh(korunaGeo, matKoruna, zoznam.length);
    let sx = 0, sz = 0;
    zoznam.forEach(([[x, z, s = 1], i], j) => {
      const y = vyskopis.vyskaTerenu(x, z);
      q.setFromAxisAngle(os, (i * 2.399) % (Math.PI * 2));
      m.compose(new THREE.Vector3(x, y, z), q, new THREE.Vector3(s, s * (0.9 + (i % 5) * 0.06), s));
      kmene.setMatrixAt(j, m);
      koruny.setMatrixAt(j, m);
      farba.setHSL(0.24 + (i % 7) * 0.012, 0.42 + (i % 3) * 0.06, 0.26 + (i % 5) * 0.025);
      koruny.setColorAt(j, farba);
      kolizie?.pridajKruh(x, z, 0.45 * s, { typ: 'strom' });
      sx += x; sz += z;
    });
    kmene.castShadow = koruny.castShadow = true;
    koruny.receiveShadow = true;
    kmene.computeBoundingSphere();
    koruny.computeBoundingSphere();
    const chunk = new THREE.Group();
    chunk.add(kmene, koruny);
    chunk.userData.dohlad = { x: sx / zoznam.length, z: sz / zoznam.length, max: DOHLAD };
    skupina.add(chunk);
  }
  return skupina;
}
