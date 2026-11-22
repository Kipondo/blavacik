// Vzdialený terén celého mesta v nízkom rozlíšení (100 m) – kopce na obzore (Malé Karpaty,
// Kamzík, Devínska Kobyla). Okolo hráča sa nevykresľuje (tam sú podrobné dlaždice).

import * as THREE from 'three';

export function vytvorHorizont(vyskopis, KONFIG, polomerDetailu) {
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

  const stred = { value: new THREE.Vector3() };
  const polomer = { value: polomerDetailu };
  const mat = new THREE.MeshLambertMaterial({ vertexColors: true });
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.stredDetailu = stred;
    shader.uniforms.polomerDetailu = polomer;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vSvet;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvSvet = (modelMatrix * vec4(position, 1.0)).xyz;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform vec3 stredDetailu; uniform float polomerDetailu; varying vec3 vSvet;')
      .replace('void main() {', 'void main() {\n  if (distance(vSvet.xz, stredDetailu.xz) < polomerDetailu) discard;');
  };
  const mesh = new THREE.Mesh(geo, mat);
  mesh.name = 'horizont';
  mesh.receiveShadow = false;
  mesh.userData.nastavStred = (x, z) => stred.value.set(x, 0, z);
  // okruh podrobných dlaždíc sa mení s kvalitou grafiky (js/grafika/kvalita.js)
  mesh.userData.nastavPolomer = (r) => { polomer.value = r; };
  return mesh;
}
