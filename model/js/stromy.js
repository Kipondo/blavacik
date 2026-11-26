// Stromy (variant 4): model/data/stromy.json (tools/model/stromy.py) – z laserového skenovania výška a polomer koruny.
// Jednoduchý tvar: kmeň (valec) a koruna (zaoblený mnohosten) – dve inštančné siete.

import * as THREE from 'three';
import { FARBY } from './farby.js';

export async function nacitajStromy(scena) {
  const { stromy } = await (await fetch('data/stromy.json')).json();
  const n = stromy.length;
  const kmen = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.12, 0.2, 1, 6).translate(0, 0.5, 0),
    new THREE.MeshLambertMaterial({ color: FARBY.kmen }), n);
  const koruna = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 1),
    new THREE.MeshLambertMaterial({ color: FARBY.koruna, flatShading: true }), n);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), s = new THREE.Vector3();
  const farba = new THREE.Color();
  stromy.forEach(([x, z, y0, h, r], i) => {
    const vk = Math.max(1, h * 0.38);                     // výška kmeňa po korunu
    m.compose(p.set(x, y0, z), q, s.set(Math.max(0.5, r / 4), vk, Math.max(0.5, r / 4)));
    kmen.setMatrixAt(i, m);
    const rk = Math.max(0.8, Math.min(r, h * 0.55));
    const vyskaKoruny = Math.max(rk, (h - vk) / 2);
    m.compose(p.set(x, y0 + h - vyskaKoruny, z), q.setFromAxisAngle(p.clone().set(0, 1, 0), (i * 2.39) % 6.28), s.set(rk, vyskaKoruny, rk));
    koruna.setMatrixAt(i, m);
    // jemne rozdielne odtiene zelene
    farba.set(FARBY.koruna).offsetHSL(((i * 0.618) % 1 - 0.5) * 0.04, 0, ((i * 0.37) % 1 - 0.5) * 0.08);
    koruna.setColorAt(i, farba);
  });
  for (const o of [kmen, koruna]) { o.castShadow = true; o.receiveShadow = true; o.computeBoundingSphere(); }
  const g = new THREE.Group();
  g.name = 'stromy';
  g.add(kmen, koruna);
  scena.add(g);
  return g;
}
