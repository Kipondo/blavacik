// Materiál zeme: textúra pokrývky + jemný opakujúci sa detail zblízka.
// Kde má textúra alfa 0 (rieka), zem sa nevykreslí – vidno vodu a nábrežné múry.

import * as THREE from 'three';
import { texturaDetailu } from './textura-zeme.js';

let detail = null;

export function materialZeme(mapa) {
  detail ??= texturaDetailu();
  const mat = new THREE.MeshStandardMaterial({ map: mapa, vertexColors: true, roughness: 0.95, metalness: 0 });
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.detailMapa = { value: detail };
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec2 vDetailUv;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvDetailUv = (modelMatrix * vec4(position, 1.0)).xz * 0.35;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform sampler2D detailMapa;\nvarying vec2 vDetailUv;')
      .replace('#include <map_fragment>', `#include <map_fragment>
        if (sampledDiffuseColor.a < 0.5) discard;
        diffuseColor.a = 1.0;
        float trava = smoothstep(0.02, 0.12, diffuseColor.g - diffuseColor.r);
        diffuseColor.rgb *= mix(vec3(1.0), texture2D(detailMapa, vDetailUv).rgb * 2.0, 0.45 + trava * 0.4)
                          * mix(vec3(1.0), texture2D(detailMapa, vDetailUv * 2.7).rgb * 2.0, 0.25 + trava * 0.35);`);
  };
  mat.customProgramCacheKey = () => 'zem-detail';
  return mat;
}
