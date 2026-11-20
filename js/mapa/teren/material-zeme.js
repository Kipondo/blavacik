// Materiál zeme: textúra pokrývky + jemný opakujúci sa detail zblízka.
// Kde má textúra alfa 0 (rieka), zem sa nevykreslí – vidno vodu a nábrežné múry.
// S mapou tried povrchu (detailné dlaždice) sa chodníky a pešie zóny kreslia CC0 dlažbou z ambientCG
// (assets/textury/kocky – žulové kocky, assets/textury/chodnik – kamenné dlaždice) aj s normálovou mapou.

import * as THREE from 'three';
import { texturaDetailu } from './textura-zeme.js';

let detail = null;
let dlazby = null;

function texturyDlazby() {
  if (dlazby) return dlazby;
  const l = new THREE.TextureLoader();
  const t = (cesta, srgb) => {
    const x = l.load(cesta);
    x.wrapS = x.wrapT = THREE.RepeatWrapping; x.anisotropy = 8;
    if (srgb) x.colorSpace = THREE.SRGBColorSpace;
    return x;
  };
  dlazby = {
    kockyF: t('assets/textury/kocky/farba.jpg', true), kockyN: t('assets/textury/kocky/normal.jpg', false),
    chodF: t('assets/textury/chodnik/farba.jpg', true), chodN: t('assets/textury/chodnik/normal.jpg', false),
  };
  return dlazby;
}

export function materialZeme(mapa, triedy = null) {
  if (triedy) return materialZemeDlazba(mapa, triedy);
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

/** Zem s dlažbou podľa mapy tried (R: 0 príroda, 0,5 chodník, 1 kocky). */
function materialZemeDlazba(mapa, triedy) {
  detail ??= texturaDetailu();
  const t = texturyDlazby();
  const mat = new THREE.MeshStandardMaterial({ map: mapa, normalMap: t.kockyN, vertexColors: true, roughness: 0.95, metalness: 0 });
  mat.userData.triedy = triedy;
  mat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, {
      detailMapa: { value: detail }, triedy: { value: triedy },
      kockyF: { value: t.kockyF }, kockyN: { value: t.kockyN }, chodF: { value: t.chodF }, chodN: { value: t.chodN },
    });
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec2 vSvet;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvSvet = (modelMatrix * vec4(position, 1.0)).xz;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform sampler2D detailMapa, triedy, kockyF, kockyN, chodF, chodN;\nvarying vec2 vSvet;')
      .replace('#include <map_fragment>', `#include <map_fragment>
        if (sampledDiffuseColor.a < 0.5) discard;
        diffuseColor.a = 1.0;
        float trava = smoothstep(0.02, 0.12, diffuseColor.g - diffuseColor.r);
        vec2 vDetailUv = vSvet * 0.35;
        diffuseColor.rgb *= mix(vec3(1.0), texture2D(detailMapa, vDetailUv).rgb * 2.0, 0.45 + trava * 0.4)
                          * mix(vec3(1.0), texture2D(detailMapa, vDetailUv * 2.7).rgb * 2.0, 0.25 + trava * 0.35);
        float trieda = texture2D(triedy, vMapUv).r;
        float wK = smoothstep(0.72, 0.92, trieda);
        float wC = smoothstep(0.3, 0.42, trieda) * (1.0 - wK);
        // jemná nerovnomernosť (špina, opotrebenie) z veľkého detailu
        float spina = texture2D(detailMapa, vSvet * 0.04).r * 2.0;
        vec3 kocky = texture2D(kockyF, vSvet / 2.4).rgb * mix(1.05, 1.35, spina * 0.5);
        vec3 chodnik = texture2D(chodF, vSvet / 2.2).rgb * mix(0.88, 1.08, spina * 0.5);
        diffuseColor.rgb = mix(diffuseColor.rgb, kocky, wK);
        diffuseColor.rgb = mix(diffuseColor.rgb, chodnik, wC);`)
      .replace('#include <normal_fragment_maps>', `
        vec3 mapN = vec3(0.0, 0.0, 1.0);
        mapN.xy += (texture2D(kockyN, vSvet / 2.4).xy * 2.0 - 1.0) * wK * 1.2;
        mapN.xy += (texture2D(chodN, vSvet / 2.2).xy * 2.0 - 1.0) * wC;
        normal = normalize( tbn * mapN );`);
  };
  mat.customProgramCacheKey = () => 'zem-dlazba';
  return mat;
}
