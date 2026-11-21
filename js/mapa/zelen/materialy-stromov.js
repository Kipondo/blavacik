// Materiály stromov: kôra podľa druhu, listy a ihlice (karty s priehľadnosťou), vzdialené koruny.
// Listy majú „obalené“ svetlo (koruna sa osvetľuje ako celok, nie ako tvrdé plochy) a presvitajú,
// keď sa pozeráš proti slnku – pri nízkom slnku zlatej hodinky koruny proti svetlu žiaria.

import * as THREE from 'three';

const nacitavac = new THREE.TextureLoader();
const textury = {};
function textura(cesta, srgb = true) {
  if (!textury[cesta]) {
    const t = nacitavac.load(cesta);
    if (srgb) t.colorSpace = THREE.SRGBColorSpace;
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.anisotropy = 8;
    textury[cesta] = t;
  }
  return textury[cesta];
}

const kory = {};
/** Kôra: bežná (brázdy + normálová mapa), platan (škvrny), breza (biela). Farba kôry tónuje textúru. */
export function materialKory(druh) {
  const kluc = `${druh.kora}-${druh.farbaKory}`;
  if (kory[kluc]) return kory[kluc];
  const cesty = { bezna: 'assets/textury/kora/farba.jpg', platan: 'assets/textury/kora/platan.jpg', breza: 'assets/textury/kora/breza.jpg' };
  const mat = new THREE.MeshStandardMaterial({ map: textura(cesty[druh.kora]), color: druh.farbaKory, vertexColors: true, roughness: 0.95 });
  if (druh.kora === 'bezna') {
    mat.normalMap = textura('assets/textury/kora/normal.jpg', false);
    mat.normalScale.set(1.2, 1.2);
  }
  kory[kluc] = mat;
  return mat;
}

// Vietor: spoločný čas pre všetky koruny (nastaví sa pri kreslení listov). Kmeň stojí, koruna sa mierne
// kolíše (viac hore), listy sa trasú; nárazy vetra sa striedajú s bezvetrím.
export const vietor = { value: 0 };
const VIETOR_GLSL = `
  {
    vec3 iPoz = vec3(instanceMatrix[3][0], instanceMatrix[3][1], instanceMatrix[3][2]);
    float faza = dot(iPoz.xz, vec2(0.071, 0.113));
    float naraz = 0.55 + 0.45 * sin(uVietor * 0.21 + faza * 0.2) * sin(uVietor * 0.37 + 1.3);
    float vys = max(transformed.y - 1.5, 0.0);
    float kyv = (sin(uVietor * 1.1 + faza) * 0.65 + sin(uVietor * 1.9 + faza * 1.7) * 0.35) * naraz;
    transformed.x += kyv * 0.010 * vys;
    transformed.z += kyv * 0.006 * vys;
    vec3 tras = vec3(sin(uVietor * 6.3 + position.x * 2.7 + faza), sin(uVietor * 7.7 + position.z * 3.1), cos(uVietor * 5.9 + position.y * 2.3 + faza));
    transformed += tras * 0.035 * naraz * min(vys, 3.0) / 3.0;
  }`;

const listy = {};
/** Karty s listami (typ 'listy') alebo vetvičkami smreka ('ihlice'). */
export function materialListov(typ = 'listy') {
  if (listy[typ]) return listy[typ];
  const cesta = typ === 'ihlice' ? 'assets/textury/ihlice/karta.png' : 'assets/textury/listy/karta.png';
  const t = nacitavac.load(cesta);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  const mat = new THREE.MeshStandardMaterial({
    map: t, alphaTest: 0.42, alphaToCoverage: true, side: THREE.DoubleSide, vertexColors: true, roughness: 0.78,
  });
  const presvit = typ === 'ihlice' ? '0.35' : '1.0';
  mat.onBeforeRender = () => { vietor.value = performance.now() / 1000; };
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uVietor = vietor;
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nuniform float uVietor;')
      .replace('#include <begin_vertex>', `#include <begin_vertex>\n#ifdef USE_INSTANCING${VIETOR_GLSL}\n#endif`);
    // obe strany karty majú normálu „von z koruny“ (inak by zadné strany kariet boli čierne);
    // listy trochu do modrozelena, aby v teplom svetle nežltli
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <color_fragment>', '#include <color_fragment>\n      diffuseColor.rgb *= vec3(0.84, 1.0, 1.06);')
      .replace('#include <normal_fragment_begin>', THREE.ShaderChunk.normal_fragment_begin.replace('normal *= faceDirection;', ''))
      .replace('#include <lights_physical_pars_fragment>', `#include <lights_physical_pars_fragment>
void RE_Direct_Listy( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
  // obalené difúzne svetlo + presvitanie listov proti slnku (tieň už je v directLight.color)
  float obal = saturate( ( dot( geometryNormal, directLight.direction ) + 0.5 ) / 1.5 );
  float proti = pow( saturate( dot( geometryViewDir, -directLight.direction ) ), 3.0 );
  reflectedLight.directDiffuse += directLight.color * BRDF_Lambert( material.diffuseColor ) * ( obal + proti * ${presvit} * 0.85 );
  reflectedLight.directSpecular += directLight.color * saturate( dot( geometryNormal, directLight.direction ) ) * 0.015;
}
#undef RE_Direct
#define RE_Direct RE_Direct_Listy`);
  };
  mat.customProgramCacheKey = () => `stromy-${typ}`;
  listy[typ] = mat;
  return mat;
}

let kmenDaleko = null;
export function materialKmenaDaleko() {
  kmenDaleko ??= new THREE.MeshStandardMaterial({ color: '#4f4338', roughness: 1 });
  return kmenDaleko;
}

let korunaDaleko = null;
/** Vzdialená koruna (plná geometria): „listnatý“ šum vo farbe aj v normále, obalené svetlo ako pri listoch. */
export function materialKorunyDaleko() {
  if (korunaDaleko) return korunaDaleko;
  const mat = new THREE.MeshStandardMaterial({ color: '#ffffff', vertexColors: true, roughness: 0.85 });
  mat.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vSvetK;')
      .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvSvetK = (modelMatrix * instanceMatrix * vec4(transformed, 1.0)).xyz;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>
varying vec3 vSvetK;
float hash3(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float sum3(vec3 x) {
  vec3 i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(hash3(i), hash3(i + vec3(1,0,0)), f.x), mix(hash3(i + vec3(0,1,0)), hash3(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(hash3(i + vec3(0,0,1)), hash3(i + vec3(1,0,1)), f.x), mix(hash3(i + vec3(0,1,1)), hash3(i + vec3(1,1,1)), f.x), f.y), f.z);
}`)
      .replace('#include <color_fragment>', `#include <color_fragment>
        float listy = sum3(vSvetK * 1.4) * 0.6 + sum3(vSvetK * 3.7) * 0.4;
        diffuseColor.rgb *= 0.6 + 0.65 * listy;`)
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
        vec3 e = vec3(0.15, 0.0, 0.0);
        vec3 grad = vec3(sum3((vSvetK + e.xyy) * 2.2) - sum3((vSvetK - e.xyy) * 2.2),
                         sum3((vSvetK + e.yxy) * 2.2) - sum3((vSvetK - e.yxy) * 2.2),
                         sum3((vSvetK + e.yyx) * 2.2) - sum3((vSvetK - e.yyx) * 2.2));
        normal = normalize(normal - (viewMatrix * vec4(grad, 0.0)).xyz * 1.4);`)
      .replace('#include <lights_physical_pars_fragment>', `#include <lights_physical_pars_fragment>
void RE_Direct_Koruna( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
  float obal = saturate( ( dot( geometryNormal, directLight.direction ) + 0.4 ) / 1.4 );
  reflectedLight.directDiffuse += directLight.color * BRDF_Lambert( material.diffuseColor ) * obal;
}
#undef RE_Direct
#define RE_Direct RE_Direct_Koruna`);
  };
  mat.customProgramCacheKey = () => 'koruna-daleko';
  korunaDaleko = mat;
  return mat;
}
