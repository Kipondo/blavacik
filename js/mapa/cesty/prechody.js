// Prechody pre chodcov (zebry) na miestach z OSM (highway=crossing), #136.
// Zebra je krátky pás po osi najbližšej cesty (js/mapa/cesty/prechody-poloha.js) cez celú jej šírku, postavený
// tým istým kódom ako asfalt (pridajPas – kopíruje terén v tých istých radoch naprieč). Sú to len biele pruhy
// (priehľadná textúra) tesne nad vozovkou, takže pod nimi je ten istý asfalt ako všade okolo; čiary pruhov sa pod
// zebrou prerušia (cesty.js, rozsahyZnacenia).

import * as THREE from 'three';
import { texturaZebry } from './textura-cesty.js';
import { pridajPas, zjemni, NAD_TERENOM } from './cesty.js';
import { polohyPrechodov } from './prechody-poloha.js';

export const DLZKA_ZEBRY = 3.5;
const NAD_VOZOVKOU = 0.02;    // m – nad asfaltom a značením (spolu s polygonOffset)

let material = null;

export function vytvorPrechody(prechody, cesty, vyskopis) {
  const s = { poz: [], uv: [], idx: [] };
  for (const p of polohyPrechodov(prechody, cesty)) {
    const h = DLZKA_ZEBRY / 2, w = p.c.sirka;
    const body = zjemni([[p.x - p.dx * h, p.z - p.dz * h], [p.x + p.dx * h, p.z + p.dz * h]], 1);
    const zac = s.uv.length;
    pridajPas(s, body, w / 2, NAD_TERENOM + NAD_VOZOVKOU, vyskopis, { dlzkaV: DLZKA_ZEBRY });
    // U = metre naprieč cestou (perióda pruhov 1 m)
    for (let i = zac; i < s.uv.length; i += 2) s.uv[i] *= w;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(s.poz, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(s.uv, 2));
  geo.setIndex(s.idx);
  geo.computeVertexNormals();
  if (!material) {
    material = new THREE.MeshStandardMaterial({
      map: texturaZebry(), roughness: 0.8, transparent: true, depthWrite: false,
      polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4,
    });
  }
  const mesh = new THREE.Mesh(geo, material);
  mesh.receiveShadow = true;
  mesh.name = 'prechody';
  return mesh;
}
