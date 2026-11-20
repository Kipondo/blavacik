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
    doskyF: t('assets/textury/dosky/farba.jpg', true), doskyN: t('assets/textury/dosky/normal.jpg', false),
    travaF: t('assets/textury/trava/farba.jpg', true), travaN: t('assets/textury/trava/normal.jpg', false),
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

/** Zem s dlažbou podľa mapy tried (R: 0 príroda, 0,25 tráva, 0,5 chodník, 0,75 kamenné dosky, 1 kocky). */
function materialZemeDlazba(mapa, triedy) {
  detail ??= texturaDetailu();
  const t = texturyDlazby();
  const mat = new THREE.MeshStandardMaterial({ map: mapa, normalMap: t.kockyN, vertexColors: true, roughness: 0.95, metalness: 0 });
  mat.userData.triedy = triedy;
  mat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, {
      detailMapa: { value: detail }, triedy: { value: triedy },
      kockyF: { value: t.kockyF }, kockyN: { value: t.kockyN }, chodF: { value: t.chodF }, chodN: { value: t.chodN },
      travaF: { value: t.travaF }, travaN: { value: t.travaN }, doskyF: { value: t.doskyF }, doskyN: { value: t.doskyN },
    });
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec2 vSvet;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvSvet = (modelMatrix * vec4(position, 1.0)).xz;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform sampler2D detailMapa, triedy, kockyF, kockyN, chodF, chodN, travaF, travaN, doskyF, doskyN;\nvarying vec2 vSvet;')
      .replace('#include <map_fragment>', `#include <map_fragment>
        if (sampledDiffuseColor.a < 0.5) discard;
        diffuseColor.a = 1.0;
        float trava = smoothstep(0.02, 0.12, diffuseColor.g - diffuseColor.r);
        vec2 vDetailUv = vSvet * 0.35;
        diffuseColor.rgb *= mix(vec3(1.0), texture2D(detailMapa, vDetailUv).rgb * 2.0, 0.45 + trava * 0.4)
                          * mix(vec3(1.0), texture2D(detailMapa, vDetailUv * 2.7).rgb * 2.0, 0.25 + trava * 0.35);
        vec2 tr2 = texture2D(triedy, vMapUv).rg;
        float trieda = tr2.r;
        float wK = smoothstep(0.86, 0.95, trieda);
        float wD = smoothstep(0.62, 0.7, trieda) * (1.0 - wK);
        float wC = smoothstep(0.38, 0.46, trieda) * (1.0 - wK - wD);
        float wT = smoothstep(0.12, 0.2, trieda) * (1.0 - smoothstep(0.3, 0.38, trieda));
        // jemná nerovnomernosť (špina, opotrebenie) z veľkého detailu
        float spina = texture2D(detailMapa, vSvet * 0.04).r * 2.0;
        vec3 kocky = texture2D(kockyF, vSvet / 2.4).rgb * mix(1.05, 1.35, spina * 0.5);
        vec3 chodnik = texture2D(chodF, vSvet / 2.2).rgb * mix(0.88, 1.08, spina * 0.5);
        diffuseColor.rgb = mix(diffuseColor.rgb, kocky, wK);
        diffuseColor.rgb = mix(diffuseColor.rgb, chodnik, wC);
        // veľké svetlé kamenné dosky v radoch (námestia, pešia zóna): textúra = 4 × 4 m (tools/textury/dosky.py)
        vec3 dosky = texture2D(doskyF, vSvet / 4.0).rgb * mix(0.9, 1.04, spina * 0.5);
        diffuseColor.rgb = mix(diffuseColor.rgb, dosky, wD);
        // tráva: CC0 textúra v dvoch mierkach (bez opakovania) a farba z mapy pokrývky (park vs. lúka)
        vec3 travnik = texture2D(travaF, vSvet / 3.1).rgb * 0.6 + texture2D(travaF, vSvet / 11.3).rgb * 0.4;
        diffuseColor.rgb = mix(diffuseColor.rgb, travnik * mix(0.8, 1.15, spina * 0.5) * 1.1, wT);
        // mäkké zatienenie pri päte budov (kanál G mapy tried)
        diffuseColor.rgb *= 1.0 - 0.38 * tr2.g;`)
      .replace('#include <normal_fragment_maps>', `
        vec3 mapN = vec3(0.0, 0.0, 1.0);
        mapN.xy += (texture2D(kockyN, vSvet / 2.4).xy * 2.0 - 1.0) * wK * 1.2;
        mapN.xy += (texture2D(chodN, vSvet / 2.2).xy * 2.0 - 1.0) * wC;
        mapN.xy += (texture2D(doskyN, vSvet / 4.0).xy * 2.0 - 1.0) * wD;
        mapN.xy += (texture2D(travaN, vSvet / 3.1).xy * 2.0 - 1.0) * wT * 0.8;
        normal = normalize( tbn * mapN );`);
  };
  mat.customProgramCacheKey = () => 'zem-dlazba';
  return mat;
}
