// Sklenené fasády modelov z Blendera (materiál „sklo…“) v noci: kancelárie po moduloch 3 × 3,6 m
// (vo svetových súradniciach) čiastočne svietia. Sila podľa noci a podiel okien z js/grafika/noc.js
// (nastavuje modul deň/noc; bez neho ostane NOC = 0 a nič nesvieti).

import { NOC, OKNA } from '../../grafika/noc.js';

export function jeSklo(m) {
  return (m.name ?? '').startsWith('sklo');
}

export function nocneSkloModelu(m) {
  if (m.userData.noc) return;
  m.userData.noc = true;
  const povodny = m.onBeforeCompile;
  m.onBeforeCompile = (sh, r) => {
    povodny?.(sh, r);
    sh.uniforms.uNoc = NOC;
    sh.uniforms.uOkna = OKNA;
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vSkloPoz;\nvarying vec3 vSkloN;')
      .replace('#include <worldpos_vertex>', `#include <worldpos_vertex>
  vSkloPoz = (modelMatrix * vec4(transformed, 1.0)).xyz;
  vSkloN = normalize(mat3(modelMatrix) * objectNormal);`);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>
uniform float uNoc, uOkna;
varying vec3 vSkloPoz;
varying vec3 vSkloN;
float hashSk(vec2 p) { return fract(sin(dot(p, vec2(41.3, 289.1))) * 43758.5453); }`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
  if (uNoc > 0.0 && abs(vSkloN.y) < 0.5) {
    float u = abs(vSkloN.x) > abs(vSkloN.z) ? vSkloPoz.z : vSkloPoz.x;
    vec2 c = vec2(u / 3.0, vSkloPoz.y / 3.6);
    vec2 bunka = floor(c), f = fract(c);
    float svieti = step(hashSk(bunka), uOkna * 0.45);
    vec3 ton = mix(vec3(0.85, 0.9, 1.0), vec3(1.0, 0.85, 0.62), hashSk(bunka.yx + 3.0));
    float okraj = smoothstep(0.02, 0.08, f.x) * smoothstep(0.98, 0.92, f.x) * smoothstep(0.08, 0.18, f.y) * smoothstep(0.97, 0.88, f.y);
    totalEmissiveRadiance += ton * svieti * okraj * uNoc * 0.42;
  }`);
  };
  const kluc = m.customProgramCacheKey?.bind(m);
  m.customProgramCacheKey = () => `${kluc ? kluc() : ''}-sklo-noc`;
  m.needsUpdate = true;
}
