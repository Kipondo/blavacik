// 3D model zeme (terénu) s farbami podľa zón, svahov a nábrežia.

import * as THREE from 'three';
import { bodVPolygone } from '../geometria.js';

const TRAVA = new THREE.Color('#6f9450');
const TRAVA_KOPEC = new THREE.Color('#5d8a43');
const PIESOK = new THREE.Color('#8a7b5c');
const KAMEN = new THREE.Color('#77736b');

export function vytvorZem(vyskopis, data, KONFIG) {
  const H = KONFIG.HRANICE;
  const krok = KONFIG.TEREN_SIET;
  const sx = Math.ceil((H.maxX - H.minX) / krok);
  const sz = Math.ceil((H.maxZ - H.minZ) / krok);

  const geo = new THREE.PlaneGeometry(H.maxX - H.minX, H.maxZ - H.minZ, sx, sz);
  geo.rotateX(-Math.PI / 2);
  geo.translate((H.minX + H.maxX) / 2, 0, (H.minZ + H.maxZ) / 2);

  const poz = geo.attributes.position;
  const farby = new Float32Array(poz.count * 3);
  const zony = (data.zony ?? []).map((zn) => ({ ...zn, farbaC: new THREE.Color(zn.farba) }));
  const f = new THREE.Color();

  for (let i = 0; i < poz.count; i++) {
    const x = poz.getX(i), z = poz.getZ(i);
    const h = vyskopis.vyskaTerenu(x, z);
    poz.setY(i, h);

    // farba podľa zóny
    f.copy(TRAVA);
    for (const zn of zony) {
      if (bodVPolygone(x, z, zn.body)) { f.copy(zn.farbaC); break; }
    }
    if (h > 3) f.lerp(TRAVA_KOPEC, Math.min(1, (h - 3) / 8));
    if (h < -0.5) f.copy(h < -3 ? PIESOK : KAMEN);
    // jemný šum, nech plochy nie sú jednoliate
    const sum = (Math.sin(x * 0.13) * Math.cos(z * 0.11) + Math.sin(x * 0.031 + z * 0.027)) * 0.03;
    farby[i * 3] = f.r + sum;
    farby[i * 3 + 1] = f.g + sum;
    farby[i * 3 + 2] = f.b + sum;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(farby, 3));
  geo.computeVertexNormals();

  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, metalness: 0 });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.receiveShadow = true;
  mesh.name = 'zem';

  // veľká plochá zem okolo hracej plochy (4 pásy, aby nezakryli Dunaj vnútri)
  const matOkolie = new THREE.MeshStandardMaterial({ color: '#66874a', roughness: 1 });
  const D = 8000;
  const okolie = new THREE.Group();
  okolie.name = 'okolie';
  for (const [x0, z0, x1, z1] of [
    [H.minX - D, H.minZ - D, H.maxX + D, H.minZ],   // sever
    [H.minX - D, H.maxZ, H.maxX + D, H.maxZ + D],   // juh
    [H.minX - D, H.minZ, H.minX, H.maxZ],           // západ
    [H.maxX, H.minZ, H.maxX + D, H.maxZ],           // východ
  ]) {
    const pas = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0, z1 - z0), matOkolie);
    pas.rotation.x = -Math.PI / 2;
    pas.position.set((x0 + x1) / 2, -0.3, (z0 + z1) / 2);
    okolie.add(pas);
  }

  const skupina = new THREE.Group();
  skupina.add(mesh, okolie);
  return skupina;
}
