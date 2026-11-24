// Vzdialený terén celého mesta v nízkom rozlíšení (100 m) – kopce na obzore (Malé Karpaty,
// Kamzík, Devínska Kobyla). Nevykresľuje sa tam, kde už stojí podrobná dlaždica so zemou (maska dlaždíc,
// nastavDetail – js/mapa/dlazdice/modul.js). Predtým sa vyrezal celý kruh okolo hráča: po dlhom presune
// (teleport, MHD) bola v ňom, kým sa dlaždice postavili, diera do hmly (biela plocha).

import * as THREE from 'three';

export function vytvorHorizont(vyskopis, KONFIG, velkostDlazdice = 500) {
  const H = KONFIG.HRANICE;
  const KROK = 100;
  const KUSY = 8;
  const okraj = 6000; // presah za hranice mesta, nech nie je vidieť koniec sveta
  const minX = H.minX - okraj, maxX = H.maxX + okraj, minZ = H.minZ - okraj, maxZ = H.maxZ + okraj;
  // terén po kúskoch (KUSY × KUSY), aby sa kreslili len tie v zábere (#110: celý horizont bol ~320 tis.
  // trojuholníkov v každom snímku, aj za chrbtom hráča)
  const NX = Math.round((maxX - minX) / KROK), NZ = Math.round((maxZ - minZ) / KROK);
  const mesto = new THREE.Color('#8e8b82'), trava = new THREE.Color('#6f8f4f'), les = new THREE.Color('#40632f');
  const f = new THREE.Color();
  const geometrie = [];
  for (let a = 0; a < KUSY; a++) {
    for (let b = 0; b < KUSY; b++) {
      const ia = Math.round((NX * a) / KUSY), ib = Math.round((NX * (a + 1)) / KUSY);
      const ja = Math.round((NZ * b) / KUSY), jb = Math.round((NZ * (b + 1)) / KUSY);
      if (ib <= ia || jb <= ja) continue;
      const x0 = minX + ia * KROK, x1 = minX + ib * KROK, z0 = minZ + ja * KROK, z1 = minZ + jb * KROK;
      const geo = new THREE.PlaneGeometry(x1 - x0, z1 - z0, ib - ia, jb - ja);
      geo.rotateX(-Math.PI / 2);
      geo.translate((x0 + x1) / 2, 0, (z0 + z1) / 2);
      const poz = geo.attributes.position;
      const farby = new Float32Array(poz.count * 3);
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
      geometrie.push(geo);
    }
  }

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
  const mesh = new THREE.Group();
  mesh.name = 'horizont';
  mesh.material = mat;            // spoločný materiál kúskov (kontroly čítajú shader masky)
  for (const geo of geometrie) {
    const kus = new THREE.Mesh(geo, mat);
    kus.name = 'horizont';
    kus.receiveShadow = false;
    mesh.add(kus);
  }
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
