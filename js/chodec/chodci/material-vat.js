// Materiál chodcov kreslených cez InstancedMesh s animáciou v textúre (vat.js).
//
// Atribút inštancie aChodec = (fáza 0…1, rýchlosť prehrávania v cykloch/s, klip 0 = chôdza / 1 = státie, riadok palety).
// Farby: vo vrcholoch je r = svetlosť textúry, g = index slotu (ako material-lod.js), farba slotu sa berie
// z textúry paliet (riadok = chodec, stĺpec = slot) – každý chodec má vlastné oblečenie a pleť.

import * as THREE from 'three';
import { MAX_SLOTOV } from '../npc/material-lod.js';
import { rozlozenieKlipov } from './vat.js';

const VERTEX_HLAVICKA = /* glsl */ `
uniform sampler2D uVat;
uniform float uCasVat;
uniform vec4 uKlipy;      // start a počet snímok chôdze, start a počet snímok státia
uniform vec2 uVatRozmer;  // šírka textúry, riadkov na snímku
attribute vec4 aChodec;
varying float vPaleta;
vec3 vatBod(float snimka) {
  int id = gl_VertexID;
  int w = int(uVatRozmer.x);
  int r = int(snimka) * int(uVatRozmer.y) + id / w;
  return texelFetch(uVat, ivec2(id - (id / w) * w, r), 0).xyz;
}
vec3 vatPozicia() {
  bool stoj = aChodec.z > 0.5;
  float start = stoj ? uKlipy.z : uKlipy.x;
  float n = stoj ? uKlipy.w : uKlipy.y;
  float f = fract(uCasVat * aChodec.y + aChodec.x) * n;
  float f0 = floor(f);
  return mix(vatBod(start + f0), vatBod(start + mod(f0 + 1.0, n)), f - f0);
}
`;

function upravVertex(shader, u) {
  Object.assign(shader.uniforms, u);
  shader.vertexShader = shader.vertexShader
    .replace('#include <common>', `#include <common>\n${VERTEX_HLAVICKA}`)
    .replace('#include <begin_vertex>', 'vec3 transformed = vatPozicia();\n vPaleta = aChodec.w;');
}

/** Spoločné uniformy jednej siete (VAT textúra, rozmery) + spoločný čas a palety. */
export function vytvorMaterialyVat(lod, spolocne) {
  const k = rozlozenieKlipov();
  const u = {
    uVat: { value: lod.vat },
    uVatRozmer: { value: new THREE.Vector2(lod.sirka, lod.riadkyNaSnimku) },
    uKlipy: { value: new THREE.Vector4(k[0].start, k[0].pocet, k[1].start, k[1].pocet) },
    uCasVat: spolocne.cas,
    uPalety: spolocne.palety,
  };

  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85, metalness: 0, flatShading: true });
  mat.onBeforeCompile = (shader) => {
    upravVertex(shader, u);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\nuniform sampler2D uPalety;\nvarying float vPaleta;`)
      .replace('#include <color_fragment>', `#if defined( USE_COLOR )
  int slot = int( clamp( vColor.g * ${MAX_SLOTOV}.0, 0.0, ${MAX_SLOTOV - 1}.0 ) );
  vec3 farbaSlotu = texelFetch( uPalety, ivec2( slot, int( vPaleta + 0.5 ) ), 0 ).rgb;
  diffuseColor.rgb *= vColor.r * 2.0 * farbaSlotu;
#endif`);
    // flatShading počíta normály z derivácií – vertex shader normálu nepotrebuje
  };
  mat.customProgramCacheKey = () => 'chodci_vat';

  const hlbka = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking });
  hlbka.onBeforeCompile = (shader) => {
    upravVertex(shader, u);
  };
  hlbka.customProgramCacheKey = () => 'chodci_vat_hlbka';
  return { mat, hlbka };
}

/** Textúra paliet: riadok = chodec, stĺpec = slot (lineárne farby). */
export class Palety {
  constructor(max = 2048) {
    this.max = max;
    this.data = new Float32Array(MAX_SLOTOV * max * 4);
    this.textura = new THREE.DataTexture(this.data, MAX_SLOTOV, max, THREE.RGBAFormat, THREE.FloatType);
    this.textura.minFilter = this.textura.magFilter = THREE.NearestFilter;
    this.textura.needsUpdate = true;
    this.volne = [];
    for (let i = max - 1; i >= 0; i--) this.volne.push(i);
  }

  /** farby: pole THREE.Color (MAX_SLOTOV). Vráti riadok alebo -1. */
  pridaj(farby) {
    const r = this.volne.pop();
    if (r === undefined) return -1;
    for (let s = 0; s < MAX_SLOTOV; s++) {
      const c = farby[s] ?? farby[0];
      const j = (r * MAX_SLOTOV + s) * 4;
      this.data[j] = c.r; this.data[j + 1] = c.g; this.data[j + 2] = c.b; this.data[j + 3] = 1;
    }
    this.textura.needsUpdate = true;
    return r;
  }

  uvolni(r) { if (r >= 0) this.volne.push(r); }
}
