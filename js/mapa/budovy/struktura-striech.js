// Štruktúra striech budov bez laserového modelu (väčšina mesta): šikmé strechy dostanú škridlu,
// ploché štrk/lepenku – CC0 textúry z ambientCG (assets/textury/LICENSE.md) s normálovou mapou a drsnosťou.
// Strechy nemajú UV, textúra sa preto mapuje zo svetových súradníc: na šikmej ploche v smere odkvapu
// a spádu (rady škridiel idú rovnobežne s odkvapom), na plochej zhora. Farbu strechy (farba vrcholov)
// textúra len oživí, odtieň ostáva.

import * as THREE from 'three';

const TEXTURY = {
  skridla: { velkost: 2.2, priemer: [0.182, 0.061, 0.028] },
  strk: { velkost: 1.6, priemer: [0.227, 0.213, 0.173] },
};

let textury = null;
function nacitaj() {
  if (textury) return textury;
  const l = new THREE.TextureLoader();
  const t = (meno, subor, srgb) => {
    const x = l.load(`assets/textury/${meno}/${subor}.jpg`);
    x.wrapS = x.wrapT = THREE.RepeatWrapping; x.anisotropy = 8;
    if (srgb) x.colorSpace = THREE.SRGBColorSpace;
    return x;
  };
  textury = {};
  for (const meno of Object.keys(TEXTURY)) {
    textury[meno] = { f: t(meno, 'farba', true), n: t(meno, 'normal', false), d: t(meno, 'drsnost', false) };
  }
  return textury;
}

const v3 = (a) => `vec3(${a.map((x) => x.toFixed(3)).join(', ')})`;

/** Pridá materiálu striech textúru škridly a štrku (mení shader cez onBeforeCompile). */
export function pridajStrukturuStriech(mat) {
  const t = nacitaj();
  const S = TEXTURY.skridla, K = TEXTURY.strk;
  mat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, {
      skrF: { value: t.skridla.f }, skrN: { value: t.skridla.n }, skrD: { value: t.skridla.d },
      strF: { value: t.strk.f }, strN: { value: t.strk.n }, strD: { value: t.strk.d },
    });
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vSvetStr;')
      .replace('#include <fog_vertex>', '#include <fog_vertex>\nvSvetStr = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>
        uniform sampler2D skrF, skrN, skrD, strF, strN, strD;
        varying vec3 vSvetStr;`)
      .replace('#include <map_fragment>', `#include <map_fragment>
        // normála plochy zo svetových súradníc (strechy sú rovné plochy)
        vec3 nStr = normalize(cross(dFdx(vSvetStr), dFdy(vSvetStr)));
        if (nStr.y < 0.0) nStr = -nStr;
        bool sikma = nStr.y < 0.97;
        vec3 tStr = sikma ? normalize(cross(vec3(0.0, 1.0, 0.0), nStr)) : vec3(1.0, 0.0, 0.0);
        vec3 bStr = sikma ? cross(nStr, tStr) : vec3(0.0, 0.0, 1.0);
        vec2 uvStr = vec2(dot(vSvetStr, tStr), dot(vSvetStr, bStr)) / (sikma ? ${S.velkost.toFixed(2)} : ${K.velkost.toFixed(2)});
        vec3 texStr = sikma ? texture2D(skrF, uvStr).rgb / ${v3(S.priemer)} : texture2D(strF, uvStr).rgb / ${v3(K.priemer)};
        diffuseColor.rgb *= mix(vec3(1.0), clamp(texStr, 0.25, 2.0), sikma ? 0.75 : 0.55);`)
      .replace('#include <roughnessmap_fragment>', `
        float roughnessFactor = roughness * mix(1.0, (sikma ? texture2D(skrD, uvStr).g : texture2D(strD, uvStr).g) * 1.25, 0.6);`)
      .replace('#include <normal_fragment_maps>', `
        vec3 mapStr = (sikma ? texture2D(skrN, uvStr).xyz : texture2D(strN, uvStr).xyz) * 2.0 - 1.0;
        vec3 nSvetStr = normalize(tStr * mapStr.x + bStr * mapStr.y + nStr * mapStr.z);
        normal = normalize((viewMatrix * vec4(nSvetStr, 0.0)).xyz);`);
  };
  mat.customProgramCacheKey = () => 'struktura-striech-1';
  return mat;
}
