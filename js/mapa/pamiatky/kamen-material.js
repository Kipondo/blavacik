// Kamenné materiály modelov pamiatok z Blendera (meno materiálu obsahuje „kamen“ alebo „skala“):
// namiesto jednofarebnej plochy procedurálny kameň vo svetových súradniciach (js/grafika/kamen-glsl.js) –
// hradby a múry z lomového kameňa, brány a sokle z kvádrov, skala pod Devínom. Farba materiálu ostáva
// základom, kameň ju len oživí (odtiene kameňov, škáry, stekance).

import { KAMEN_GLSL } from '../../grafika/kamen-glsl.js';

/** Druh kameňa podľa mena materiálu: [výška radu, dĺžka kameňa, skala]. */
function druh(meno) {
  if (meno.includes('skala')) return [0, 0, 1];
  // kvádre: brány, portály, sokle, piliere, fontány
  if (/brany|portal|sokel|piliera|fontana/.test(meno)) return [0.5, 0.95, 0];
  // múry z lomového kameňa: hradby, Devín, Gerulata, opona
  return [0.32, 0.55, 0];
}

export function jeKamen(m) {
  return /kamen|skala/.test(m.name ?? '');
}

/** Pridá kameň do MeshStandardMaterial (raz – materiál sa zdieľa medzi kópiami modelu). */
export function kamenNaMaterial(m) {
  if (m.userData.kamen) return;
  m.userData.kamen = true;
  const [vr, dl, sk] = druh(m.name);
  const f = (v) => v.toFixed(3);
  m.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vKamenPoz;\nvarying vec3 vKamenN;')
      .replace('#include <worldpos_vertex>', `#include <worldpos_vertex>
  vKamenPoz = (modelMatrix * vec4(transformed, 1.0)).xyz;
  vKamenN = normalize(mat3(modelMatrix) * objectNormal);`);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>\nvarying vec3 vKamenPoz;\nvarying vec3 vKamenN;\n${KAMEN_GLSL}`)
      .replace('#include <color_fragment>', `#include <color_fragment>
  {
    vec2 km = kamenTriplanar(vKamenPoz, normalize(vKamenN), ${f(vr)}, ${f(dl)}, ${f(sk)});
    diffuseColor.rgb *= (0.78 + 0.4 * km.x) * (1.0 - 0.48 * km.y) * kamenSkvrny(vKamenPoz);
  }`);
  };
  m.customProgramCacheKey = () => `kamen-${f(vr)}-${f(dl)}-${f(sk)}`;
  m.needsUpdate = true;
}
