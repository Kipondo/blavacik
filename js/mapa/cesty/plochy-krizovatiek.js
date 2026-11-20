// Plochy križovatiek – čistý asfalt navrchu, aby sa čiary prekrížených ciest „nebili“.

import * as THREE from 'three';
import { texturaAsfaltu } from './textura-cesty.js';

const SEGMENTY = 16;

export function vytvorPlochyKrizovatiek(krizovatky, vyskopis) {
  const poz = [], uv = [], idx = [];
  for (const k of krizovatky.values()) {
    const r = k.polomer;
    if (r < 2) continue;
    const stred = poz.length / 3;
    const y = vyskopis.vyska(k.x, k.z) + 0.17;
    poz.push(k.x, y, k.z);
    uv.push(0.5, 0);
    for (let i = 0; i <= SEGMENTY; i++) {
      const u = (i / SEGMENTY) * Math.PI * 2;
      const x = k.x + Math.cos(u) * r, z = k.z + Math.sin(u) * r;
      poz.push(x, vyskopis.vyska(x, z) + 0.17, z);
      uv.push(0.5 + Math.cos(u) * 0.45, Math.sin(u) * r / 9);
      // (stred, i+1, i) – normála nahor
      if (i > 0) idx.push(stred, stred + i + 1, stred + i);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(poz, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({
    map: texturaAsfaltu(), roughness: 0.9, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3,
  }));
  mesh.receiveShadow = true;
  mesh.name = 'krizovatky';
  return mesh;
}
