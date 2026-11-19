// 3D model zeme (terénu): sieť s výškami + textúra pokrývky + jemný detail zblízka.

import * as THREE from 'three';
import { vytvorTexturuZeme, texturaDetailu } from './textura-zeme.js';

const ZELEN_KOPCA = new THREE.Color(0.78, 0.95, 0.66);

export function vytvorZem(vyskopis, data, KONFIG) {
  const H = KONFIG.HRANICE;
  const krok = KONFIG.JE_DOTYKOVE ? KONFIG.TEREN_SIET * 1.5 : KONFIG.TEREN_SIET;
  const sx = Math.ceil((H.maxX - H.minX) / krok);
  const sz = Math.ceil((H.maxZ - H.minZ) / krok);

  const geo = new THREE.PlaneGeometry(H.maxX - H.minX, H.maxZ - H.minZ, sx, sz);
  geo.rotateX(-Math.PI / 2);
  geo.translate((H.minX + H.maxX) / 2, 0, (H.minZ + H.maxZ) / 2);

  const poz = geo.attributes.position;
  const uv = geo.attributes.uv;
  const farby = new Float32Array(poz.count * 3);
  const f = new THREE.Color();
  const biela = new THREE.Color(1, 1, 1);
  const bezPokryvky = !(data.pokryvka?.length);

  for (let i = 0; i < poz.count; i++) {
    const x = poz.getX(i), z = poz.getZ(i);
    const h = vyskopis.vyskaTerenu(x, z);
    poz.setY(i, h);
    uv.setXY(i, (x - H.minX) / (H.maxX - H.minX), (z - H.minZ) / (H.maxZ - H.minZ));
    // svahy kopcov sú zelenšie
    f.copy(biela);
    if (h > 3) f.lerp(ZELEN_KOPCA, Math.min(1, (h - 3) / 10) * (bezPokryvky ? 1 : 0.6));
    farby[i * 3] = f.r; farby[i * 3 + 1] = f.g; farby[i * 3 + 2] = f.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(farby, 3));
  geo.computeVertexNormals();

  const detail = texturaDetailu();
  const mat = new THREE.MeshStandardMaterial({
    map: vytvorTexturuZeme(data, KONFIG), vertexColors: true, roughness: 0.95, metalness: 0,
  });
  // detail zblízka: opakujúce sa zrno vynásobené s textúrou zeme
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.detailMapa = { value: detail };
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec2 vDetailUv;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvDetailUv = position.xz * 0.35;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform sampler2D detailMapa;\nvarying vec2 vDetailUv;')
      .replace('#include <map_fragment>', '#include <map_fragment>\ndiffuseColor.rgb *= mix(vec3(1.0), texture2D(detailMapa, vDetailUv).rgb * 2.0, 0.7) * mix(vec3(1.0), texture2D(detailMapa, vDetailUv * 0.11).rgb * 2.0, 0.25);');
  };

  const mesh = new THREE.Mesh(geo, mat);
  mesh.receiveShadow = true;
  mesh.name = 'zem';

  // veľká plochá zem okolo hracej plochy (4 pásy, aby nezakryli Dunaj vnútri)
  const matOkolie = new THREE.MeshStandardMaterial({ color: '#6c7d55', roughness: 1 });
  const D = 8000;
  const okolie = new THREE.Group();
  okolie.name = 'okolie';
  for (const [x0, z0, x1, z1] of [
    [H.minX - D, H.minZ - D, H.maxX + D, H.minZ],
    [H.minX - D, H.maxZ, H.maxX + D, H.maxZ + D],
    [H.minX - D, H.minZ, H.minX, H.maxZ],
    [H.maxX, H.minZ, H.maxX + D, H.maxZ],
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
