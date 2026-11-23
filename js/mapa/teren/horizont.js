// Vzdialený terén celého mesta v nízkom rozlíšení (100 m) – kopce na obzore (Malé Karpaty,
// Kamzík, Devínska Kobyla). Nevykresľuje sa tam, kde už stojí podrobná dlaždica so zemou (maska dlaždíc,
// nastavDetail – js/mapa/dlazdice/modul.js). Predtým sa vyrezal celý kruh okolo hráča: po dlhom presune
// (teleport, MHD) bola v ňom, kým sa dlaždice postavili, diera do hmly (biela plocha).

import * as THREE from 'three';

export function vytvorHorizont(vyskopis, KONFIG, velkostDlazdice = 500) {
  const H = KONFIG.HRANICE;
  const KROK = 100;
  const okraj = 6000; // presah za hranice mesta, nech nie je vidieť koniec sveta
  const minX = H.minX - okraj, maxX = H.maxX + okraj, minZ = H.minZ - okraj, maxZ = H.maxZ + okraj;
  const geo = new THREE.PlaneGeometry(maxX - minX, maxZ - minZ, Math.round((maxX - minX) / KROK), Math.round((maxZ - minZ) / KROK));
  geo.rotateX(-Math.PI / 2);
  geo.translate((minX + maxX) / 2, 0, (minZ + maxZ) / 2);
  const poz = geo.attributes.position;
  const farby = new Float32Array(poz.count * 3);
  const mesto = new THREE.Color('#8e8b82'), trava = new THREE.Color('#6f8f4f'), les = new THREE.Color('#40632f');
  const f = new THREE.Color();
  for (let i = 0; i < poz.count; i++) {
    const x = poz.getX(i), z = poz.getZ(i);
    const vnutri = x > H.minX && x < H.maxX && z > H.minZ && z < H.maxZ;
    const h = vnutri ? vyskopis.vyskaTerenu(x, z) : vyskopis.vyskaTerenu(Math.max(H.minX, Math.min(H.maxX, x)), Math.max(H.minZ, Math.min(H.maxZ, z)));
    poz.setY(i, h - 1.5);
    f.copy(h > 60 ? les : h > 15 ? trava : mesto);
    if (!vnutri) f.copy(h > 60 ? les : trava);
    farby[i * 3] = f.r; farby[i * 3 + 1] = f.g; farby[i * 3 + 2] = f.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(farby, 3));
  geo.computeVertexNormals();

  // maska dlaždíc (1 texel = 1 dlaždica): 255 = podrobná dlaždica so zemou stojí → horizont sa tam nekreslí
  const D = velkostDlazdice;
  const i0 = Math.floor(H.minX / D), j0 = Math.floor(H.minZ / D);
  const nI = Math.floor(H.maxX / D) - i0 + 1, nJ = Math.floor(H.maxZ / D) - j0 + 1;
  const maska = new Uint8Array(nI * nJ);
  const tex = new THREE.DataTexture(maska, nI, nJ, THREE.RedFormat, THREE.UnsignedByteType);
  tex.magFilter = tex.minFilter = THREE.NearestFilter;
  tex.needsUpdate = true;
  const uniformy = {
    maskaDetailu: { value: tex },
    maskaRozmer: { value: new THREE.Vector4(i0, j0, nI, nJ) },
    velkostDl: { value: D },
  };
  const mat = new THREE.MeshLambertMaterial({ vertexColors: true });
  mat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniformy);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vSvet;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvSvet = (modelMatrix * vec4(position, 1.0)).xyz;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform sampler2D maskaDetailu; uniform vec4 maskaRozmer; uniform float velkostDl; varying vec3 vSvet;')
      .replace('void main() {', `void main() {
  vec2 dl = floor(vSvet.xz / velkostDl) - maskaRozmer.xy;
  if (dl.x >= 0.0 && dl.y >= 0.0 && dl.x < maskaRozmer.z && dl.y < maskaRozmer.w
      && texture2D(maskaDetailu, (dl + 0.5) / maskaRozmer.zw).r > 0.5) discard;`);
  };
  const mesh = new THREE.Mesh(geo, mat);
  mesh.name = 'horizont';
  mesh.receiveShadow = false;
  /** Podrobná dlaždica (kľúč „i_j“) so zemou stojí (true) alebo bola uvoľnená (false). */
  mesh.userData.nastavDetail = (kluc, stoji) => {
    const [i, j] = kluc.split('_').map(Number);
    const a = i - i0, b = j - j0;
    if (a < 0 || b < 0 || a >= nI || b >= nJ) return;
    const v = stoji ? 255 : 0;
    if (maska[b * nI + a] === v) return;
    maska[b * nI + a] = v;
    tex.needsUpdate = true;
  };
  return mesh;
}
