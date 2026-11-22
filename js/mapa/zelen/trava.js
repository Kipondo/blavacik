// Trávnik zblízka: trsy tenkých stebiel (geometria, bez textúry) ako jeden InstancedMesh okolo kamery.
// Stebla majú normálu nahor, takže sa osvetľujú ako zem pod nimi a nepôsobia ako tmavé „chlpy“;
// vo vetre sa vlnia (spoločný čas s korunami stromov) a v diaľke sa plynulo zmenšia do textúry trávnika.

import * as THREE from 'three';

const STEBLA = 11;          // stebiel v trse
const SEGMENTY = 3;

/** Geometria jedného trsu (na výšku ~0,3 m pri mierke 1). */
export function geometriaTrsu() {
  const poz = [], farby = [], index = [];
  const zakl = new THREE.Color(0.075, 0.115, 0.03), spic = new THREE.Color(0.2, 0.31, 0.07);
  const c = new THREE.Color();
  let seed = 7;
  const nah = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  for (let k = 0; k < STEBLA; k++) {
    const uhol = nah() * Math.PI * 2, r = Math.sqrt(nah()) * 0.13;
    const ox = Math.cos(uhol) * r, oz = Math.sin(uhol) * r;
    const h = 0.2 + nah() * 0.17, w = 0.022 + nah() * 0.012;
    const naklon = nah() * Math.PI * 2, ohyb = 0.25 + nah() * 0.3;
    const lx = Math.cos(naklon), lz = Math.sin(naklon);
    // šírka stebla kolmo na smer náklonu
    const px = -lz, pz = lx;
    const odtien = 0.85 + nah() * 0.3, sucho = nah() < 0.18 ? 1 : 0;
    const zac = poz.length / 3;
    for (let s = 0; s <= SEGMENTY; s++) {
      const t = s / SEGMENTY;
      const x = ox + lx * ohyb * h * t * t, z = oz + lz * ohyb * h * t * t, y = h * t * (1 - 0.15 * t * t);
      c.copy(zakl).lerp(spic, t).multiplyScalar(odtien);
      if (sucho) c.lerp(new THREE.Color(0.32, 0.29, 0.13), 0.55 * t);
      if (s < SEGMENTY) {
        const sw = w * (1 - t * 0.85) / 2;
        poz.push(x - px * sw, y, z - pz * sw, x + px * sw, y, z + pz * sw);
        farby.push(c.r, c.g, c.b, c.r, c.g, c.b);
      } else {
        poz.push(x, y, z);
        farby.push(c.r, c.g, c.b);
      }
    }
    for (let s = 0; s < SEGMENTY - 1; s++) {
      const a = zac + s * 2;
      index.push(a, a + 1, a + 3, a, a + 3, a + 2);
    }
    const a = zac + (SEGMENTY - 1) * 2;
    index.push(a, a + 1, a + 2);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(poz, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(farby, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(new Array(poz.length).fill(0).map((_, i) => (i % 3 === 1 ? 1 : 0)), 3));
  geo.setIndex(index);
  return geo;
}

/** Materiál stebiel: farba z vrcholov; bez vlnenia vo vetre (rozhodnutie majiteľa 22. 11. 2026). */
export function materialTravy() {
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.92, side: THREE.DoubleSide });
  mat.onBeforeCompile = (sh) => {
    // obe strany stebla majú normálu nahor (inak by zadné strany boli čierne)
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <normal_fragment_begin>', THREE.ShaderChunk.normal_fragment_begin.replace('normal *= faceDirection;', ''));
  };
  mat.customProgramCacheKey = () => 'trava-stebla';
  return mat;
}
