// Plochy križovatiek – asfalt v kruhu, ktorý vyplní medzery medzi pásmi ciest, čo sa v križovatke stretajú.
// Majú ten istý materiál, textúru vo svetových súradniciach a výšku ako cesty (js/mapa/cesty/cesty.js), takže
// prekrytie s pásmi ciest nevidno a nič nebliká. Značenie ciest pri križovatke končí (cesty.js, rozsahyZnacenia).

import * as THREE from 'three';
import { materialAsfaltu, NAD_TERENOM, MIERKA_ASFALTU } from './cesty.js';

const SEGMENTY = 16;

export function vytvorPlochyKrizovatiek(krizovatky, vyskopis) {
  const poz = [], uv = [], idx = [];
  const m = MIERKA_ASFALTU;
  for (const k of krizovatky.values()) {
    const r = k.polomer;
    if (r < 2) continue;
    const stred = poz.length / 3;
    poz.push(k.x, vyskopis.vyska(k.x, k.z) + NAD_TERENOM, k.z);
    uv.push(k.x / m, k.z / m);
    for (let i = 0; i <= SEGMENTY; i++) {
      const u = (i / SEGMENTY) * Math.PI * 2;
      const x = k.x + Math.cos(u) * r, z = k.z + Math.sin(u) * r;
      poz.push(x, vyskopis.vyska(x, z) + NAD_TERENOM, z);
      uv.push(x / m, z / m);
      // (stred, i+1, i) – normála nahor
      if (i > 0) idx.push(stred, stred + i + 1, stred + i);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(poz, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  const mesh = new THREE.Mesh(geo, materialAsfaltu());
  mesh.receiveShadow = true;
  mesh.name = 'krizovatky';
  return mesh;
}
