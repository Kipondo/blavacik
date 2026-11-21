// Materiál hladiny Dunaja: fyzikálne správny odraz (Fresnel – pri pohľade dolu vidno zelenosivú vodu,
// do diaľky sa zrkadlí obloha), vlnky v troch mierkach posúvané rôznymi smermi (dlaždicová textúra
// sa neopakuje), pomalé pásy kalnejšej vody a čeriny tečúce po prúde (Dunaj tečie na východ = +x).

import * as THREE from 'three';
import { SUM_GLSL } from '../../grafika/sum-glsl.js';

export function materialReky(vlny) {
  const cas = { value: 0 };
  const mat = new THREE.MeshPhysicalMaterial({
    color: '#2f4a46', roughness: 0.05, metalness: 0, ior: 1.33, normalMap: vlny,
    normalScale: new THREE.Vector2(0.55, 0.55), envMapIntensity: 1.6,
  });
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uCasVody = cas;
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec2 vVodaSvet;')
      .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvVodaSvet = (modelMatrix * vec4(transformed, 1.0)).xz;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>
uniform float uCasVody;
varying vec2 vVodaSvet;
${SUM_GLSL}`)
      .replace('#include <color_fragment>', `#include <color_fragment>
      {
        // kalnejšie a čistejšie pásy, ktoré pomaly tečú po prúde
        vec2 p = vVodaSvet * vec2(0.004, 0.012) - vec2(uCasVody * 0.004, 0.0);
        float kal = fbm2(p) * 0.7 + fbm2(vVodaSvet * 0.03 - vec2(uCasVody * 0.02, 0.0)) * 0.3;
        diffuseColor.rgb *= mix(vec3(0.85, 0.92, 0.95), vec3(1.25, 1.12, 0.9), smoothstep(0.35, 0.75, kal));
      }`)
      .replace('#include <normal_fragment_maps>', `
      {
        // vlny zo šumu v troch mierkach (neopakujú sa – pravidelná textúra by z mosta vytvorila mriežku bodiek),
        // jemná textúra vlniek už len slabo navrch
        vec2 w = vVodaSvet;
        vec2 tok = vec2(uCasVody, 0.0);
        vec2 q1 = w * 0.06 - tok * 0.08, q2 = mat2(0.8, -0.6, 0.6, 0.8) * w * 0.38 - tok * 0.3, q3 = w * vec2(1.7, 2.3) - tok * 0.9;
        float e = 0.3;
        float a1 = fbm2(q1), a2 = fbm2(q2), a3 = sum2(q3) + sum2(q3 * 1.9 + 4.0) * 0.5;
        vec2 g1 = vec2(fbm2(q1 + vec2(e, 0.0)) - a1, fbm2(q1 + vec2(0.0, e)) - a1) / e;
        vec2 g2 = vec2(fbm2(q2 + vec2(e, 0.0)) - a2, fbm2(q2 + vec2(0.0, e)) - a2) / e;
        vec2 g3 = vec2(sum2(q3 + vec2(e, 0.0)) + sum2((q3 + vec2(e, 0.0)) * 1.9 + 4.0) * 0.5 - a3,
                       sum2(q3 + vec2(0.0, e)) + sum2((q3 + vec2(0.0, e)) * 1.9 + 4.0) * 0.5 - a3) / e;
        vec3 n1 = texture2D(normalMap, w / 11.0 + vec2(uCasVody * 0.05, uCasVody * 0.008)).xyz * 2.0 - 1.0;
        // miestami pokojnejšia hladina
        float pokoj = 0.6 + 0.6 * sum2(w * 0.04 + tok * 0.03);
        // drobné vlnky sa do diaľky strácajú (inak by z výšky hladina zrnila)
        float blizko = 1.0 - smoothstep(25.0, 140.0, length(vViewPosition));
        vec3 mapN = normalize(vec3((g1 * 0.16 + (g2 * 0.13 + (g3 * 0.08 + n1.xy * 0.25) * blizko) * pokoj) * normalScale, 1.0));
        // čeriny po prúde (vietor) v pásoch
        float cer = smoothstep(0.45, 0.8, fbm2(w * 0.02 + vec2(uCasVody * 0.05, 0.0)));
        mapN.xy *= 0.8 + cer * 0.6;
        normal = normalize( tbn * mapN );
      }`);
  };
  mat.customProgramCacheKey = () => 'reka-4';
  mat.userData.cas = cas;
  return mat;
}
