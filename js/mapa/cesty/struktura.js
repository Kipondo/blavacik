// Jemná štruktúra povrchu z CC0 textúr (ambientCG, assets/textury/LICENSE.md) cez svetové súradnice:
// asfalt ciest a križovatiek, dlažba chodníkov. Pôvodná textúra (značenie, obrys) ostáva, štruktúra ju
// len jemne zosvetlí/stmaví a pridá nerovnosti cez normálovú mapu.

import * as THREE from 'three';

const PRIEMER = { asfalt: 0.052, chodnik: 0.33 };   // stredná lineárna jasnosť textúry (na normalizáciu)
const cache = {};

function textury(meno) {
  if (cache[meno]) return cache[meno];
  const l = new THREE.TextureLoader();
  const t = (subor, srgb) => {
    const x = l.load(`assets/textury/${meno}/${subor}.jpg`);
    x.wrapS = x.wrapT = THREE.RepeatWrapping; x.anisotropy = 8;
    if (srgb) x.colorSpace = THREE.SRGBColorSpace;
    return x;
  };
  cache[meno] = { farba: t('farba', true), normal: t('normal', false) };
  return cache[meno];
}

/** Pridá materiálu štruktúru: meno = priečinok textúry, velkost = metre na opakovanie, sila = normálová mapa. */
export function pridajStrukturu(mat, meno, velkost, sila = 1, kontrast = 0.6) {
  const t = textury(meno);
  mat.normalMap = t.normal;          // zapne výpočet dotyčnicového priestoru (tbn) v shaderi
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.strukturaF = { value: t.farba };
    sh.uniforms.strukturaN = { value: t.normal };
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec2 vSvetS;')
      .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvSvetS = (modelMatrix * vec4(transformed, 1.0)).xz;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform sampler2D strukturaF, strukturaN;\nvarying vec2 vSvetS;')
      .replace('#include <map_fragment>', `#include <map_fragment>
        vec3 str = texture2D(strukturaF, vSvetS / ${velkost.toFixed(2)}).rgb / ${PRIEMER[meno].toFixed(3)};
        diffuseColor.rgb *= mix(vec3(1.0), clamp(str, 0.4, 1.8), ${kontrast.toFixed(2)});`)
      .replace('#include <normal_fragment_maps>', `
        vec3 mapN = texture2D(strukturaN, vSvetS / ${velkost.toFixed(2)}).xyz * 2.0 - 1.0;
        mapN.xy *= ${sila.toFixed(2)};
        normal = normalize(tbn * mapN);`);
  };
  mat.customProgramCacheKey = () => `struktura-${meno}-${velkost}-${sila}-${kontrast}`;
  return mat;
}
