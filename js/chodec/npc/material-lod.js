// Materiál zlúčených LOD sietí NPC: farba vrcholu nesie svetlosť textúry (r) a index slotu (g),
// farba slotu (pleť, vlasy, tričko, …) je uniform – každý chodec má vlastné farby, shader je spoločný.
// Formát farieb vo vrcholoch popisuje tools/postava/lod.py.

import * as THREE from 'three';

export const MAX_SLOTOV = 16;

/** farbySlotov: pole THREE.Color (lineárne) dĺžky MAX_SLOTOV. */
export function vytvorMaterialLod(farbySlotov) {
  const m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.82, metalness: 0 });
  m.name = 'npc_lod';
  m.userData.farbySlotov = farbySlotov;
  m.onBeforeCompile = (shader) => {
    shader.uniforms.farbySlotov = { value: m.userData.farbySlotov };
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\nuniform vec3 farbySlotov[ ${MAX_SLOTOV} ];`)
      .replace('#include <color_fragment>', `#if defined( USE_COLOR_ALPHA ) || defined( USE_COLOR )
  // r = svetlosť textúry (0.5 = priemer kusu), g = index slotu
  int slot = int( clamp( vColor.g * ${MAX_SLOTOV}.0, 0.0, ${MAX_SLOTOV - 1}.0 ) );
  diffuseColor.rgb *= vColor.r * 2.0 * farbySlotov[ slot ];
#endif`);
  };
  m.customProgramCacheKey = () => 'npc_lod';
  return m;
}
