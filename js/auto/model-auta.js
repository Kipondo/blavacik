// Low-poly model osobného auta. Predok smeruje na +z.

import * as THREE from 'three';

const geoKolesa = new THREE.CylinderGeometry(0.36, 0.36, 0.28, 12);
geoKolesa.rotateZ(Math.PI / 2);
const matKolesa = new THREE.MeshStandardMaterial({ color: '#1b1b1b', roughness: 0.9 });
const matDisk = new THREE.MeshStandardMaterial({ color: '#b8bcc0', roughness: 0.4, metalness: 0.6 });
const geoDisku = new THREE.CylinderGeometry(0.2, 0.2, 0.3, 8);
geoDisku.rotateZ(Math.PI / 2);
const matSklo = new THREE.MeshStandardMaterial({ color: '#1e2a33', roughness: 0.1, metalness: 0.5 });
const matSvetlo = new THREE.MeshStandardMaterial({ color: '#fff6d8', emissive: '#fff1c0', emissiveIntensity: 0.6 });
const matZadne = new THREE.MeshStandardMaterial({ color: '#b01010', emissive: '#600000', emissiveIntensity: 0.5 });
const matCierna = new THREE.MeshStandardMaterial({ color: '#202020', roughness: 0.8 });

export function vytvorModelAuta(farba = '#c8102e') {
  const auto = new THREE.Group();
  const telo = new THREE.Group(); // nakláňa sa (pruženie), kolesá nie
  auto.add(telo);

  const matKaroseria = new THREE.MeshStandardMaterial({ color: farba, roughness: 0.35, metalness: 0.3 });

  const spodok = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.62, 4.4), matKaroseria);
  spodok.position.y = 0.66;
  telo.add(spodok);

  const kabina = new THREE.Mesh(new THREE.BoxGeometry(1.66, 0.58, 2.2), matKaroseria);
  kabina.position.set(0, 1.25, -0.25);
  telo.add(kabina);

  // okná (tmavé pásy okolo kabíny)
  const okna = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.42, 2.0), matSklo);
  okna.position.set(0, 1.25, -0.25);
  telo.add(okna);
  const predneSklo = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.45, 0.08), matSklo);
  predneSklo.position.set(0, 1.22, 0.87);
  predneSklo.rotation.x = -0.5;
  telo.add(predneSklo);

  // nárazníky a svetlá
  for (const z of [2.22, -2.22]) {
    const naraznik = new THREE.Mesh(new THREE.BoxGeometry(1.94, 0.2, 0.12), matCierna);
    naraznik.position.set(0, 0.42, z);
    telo.add(naraznik);
  }
  for (const x of [-0.65, 0.65]) {
    const predne = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.16, 0.06), matSvetlo);
    predne.position.set(x, 0.82, 2.21);
    telo.add(predne);
    const zadne = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.16, 0.06), matZadne);
    zadne.position.set(x, 0.82, -2.21);
    telo.add(zadne);
  }

  // kolesá – predné sú v otočnom kĺbe kvôli zatáčaniu
  const kolesa = [];
  const predneKlby = [];
  for (const [x, z] of [[-0.86, 1.35], [0.86, 1.35], [-0.86, -1.35], [0.86, -1.35]]) {
    const klb = new THREE.Group();
    klb.position.set(x, 0.36, z);
    const koleso = new THREE.Group();
    koleso.add(new THREE.Mesh(geoKolesa, matKolesa), new THREE.Mesh(geoDisku, matDisk));
    klb.add(koleso);
    auto.add(klb);
    kolesa.push(koleso);
    if (z > 0) predneKlby.push(klb);
  }

  auto.traverse((o) => { if (o.isMesh) { o.castShadow = true; } });
  auto.userData = { telo, kolesa, predneKlby, matKaroseria };
  return auto;
}
