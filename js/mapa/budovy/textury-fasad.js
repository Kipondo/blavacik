// Atlas fasád 2 × 2: štyri typy okien v jednej textúre (biele – farbu dodá budova).
//   0 = staromestské (vysoké okná so šambránou, rímsy)   1 = obytné (balkóny)
//   2 = kancelárie (pásové okná)                          3 = jednoduché
// Každý typ je dlaždica 4 × 4 okien; budova si vyberá typ atribútom vrcholu aTyp.

import * as THREE from 'three';

export const OKNO_SIRKA = 3.6;
export const OKNO_VYSKA = 3.2;
export const TYPY = { stare: 0, obytne: 1, kancelarie: 2, jednoduche: 3 };

const P = 64;          // pixelov na jedno okno
const D = P * 4;       // dlaždica = 4 × 4 okná

let atlas = null;

function nahodne(seed) {
  let a = seed;
  return () => ((a = (a * 16807) % 2147483647) / 2147483647);
}

function sklo(g, x, y, w, h, rnd) {
  const svieti = rnd() < 0.12;
  const t = 38 + Math.floor(rnd() * 34);
  const grad = g.createLinearGradient(x, y, x + w, y + h);
  if (svieti) { grad.addColorStop(0, '#e8d7a4'); grad.addColorStop(1, '#c9b27a'); }
  else { grad.addColorStop(0, `rgb(${t + 25},${t + 40},${t + 55})`); grad.addColorStop(1, `rgb(${t},${t + 10},${t + 22})`); }
  g.fillStyle = grad;
  g.fillRect(x, y, w, h);
}

function stare(g, ox, oy, rnd) {
  for (let r = 0; r < 4; r++) {
    // podlažná rímsa
    g.fillStyle = 'rgba(0,0,0,0.10)'; g.fillRect(ox, oy + r * P + P - 6, D, 3);
    g.fillStyle = 'rgba(255,255,255,0.9)'; g.fillRect(ox, oy + r * P + P - 8, D, 2);
    for (let s = 0; s < 4; s++) {
      const x = ox + s * P, y = oy + r * P;
      g.fillStyle = 'rgba(110,98,82,0.35)'; g.fillRect(x + 17, y + 9, 30, 46);      // šambrána
      sklo(g, x + 20, y + 12, 24, 40, rnd);
      g.fillStyle = 'rgba(245,242,235,0.9)'; g.fillRect(x + 31, y + 12, 2, 40); g.fillRect(x + 20, y + 26, 24, 2);
      g.fillStyle = 'rgba(110,98,82,0.45)'; g.fillRect(x + 14, y + 5, 36, 4);       // nadokenná rímsa
      if (rnd() < 0.35) { g.fillStyle = 'rgba(70,90,60,0.55)'; g.fillRect(x + 12, y + 14, 5, 36); g.fillRect(x + 47, y + 14, 5, 36); } // okenice
    }
  }
}

function obytne(g, ox, oy, rnd) {
  for (let r = 0; r < 4; r++) {
    for (let s = 0; s < 4; s++) {
      const x = ox + s * P, y = oy + r * P;
      sklo(g, x + 8, y + 12, 48, 30, rnd);
      g.fillStyle = 'rgba(240,240,240,0.9)'; g.fillRect(x + 31, y + 12, 2, 30);
      if (s % 2 === 1) {  // balkón so zábradlím
        g.fillStyle = 'rgba(0,0,0,0.18)'; g.fillRect(x + 2, y + 44, 60, 4);
        g.fillStyle = 'rgba(200,200,195,0.95)'; g.fillRect(x + 2, y + 46, 60, 14);
        g.fillStyle = 'rgba(120,120,115,0.6)'; for (let k = 0; k < 6; k++) g.fillRect(x + 6 + k * 10, y + 48, 2, 10);
      } else {
        g.fillStyle = 'rgba(255,255,255,0.85)'; g.fillRect(x + 6, y + 43, 52, 3);
      }
    }
  }
}

function kancelarie(g, ox, oy, rnd) {
  for (let r = 0; r < 4; r++) {
    const y = oy + r * P;
    g.fillStyle = 'rgba(0,0,0,0.08)'; g.fillRect(ox, y + 50, D, 14);
    for (let s = 0; s < 4; s++) sklo(g, ox + s * P, y + 8, P, 40, rnd);
    g.fillStyle = 'rgba(60,66,70,0.75)';
    for (let k = 0; k <= 8; k++) g.fillRect(ox + k * (D / 8) - 1, y + 8, 2, 40);
  }
}

function jednoduche(g, ox, oy, rnd) {
  for (let r = 0; r < 4; r++) {
    g.fillStyle = 'rgba(0,0,0,0.06)'; g.fillRect(ox, oy + r * P + P - 4, D, 4);
    for (let s = 0; s < 4; s++) {
      const x = ox + s * P, y = oy + r * P;
      g.fillStyle = 'rgba(80,72,64,0.4)'; g.fillRect(x + 13, y + 13, 38, 36);
      sklo(g, x + 15, y + 15, 34, 32, rnd);
      g.fillStyle = 'rgba(240,240,240,0.9)'; g.fillRect(x + 31, y + 15, 2, 32);
      g.fillStyle = 'rgba(255,255,255,0.9)'; g.fillRect(x + 12, y + 49, 40, 3);
    }
  }
}

export function texturaFasad() {
  if (atlas) return atlas;
  const c = document.createElement('canvas');
  c.width = c.height = D * 2;
  const g = c.getContext('2d');
  g.fillStyle = '#ffffff';
  g.fillRect(0, 0, c.width, c.height);
  // jemná nerovnosť omietky
  const rnd = nahodne(4242);
  for (let i = 0; i < 6000; i++) {
    g.fillStyle = `rgba(0,0,0,${0.015 + rnd() * 0.03})`;
    g.fillRect(rnd() * c.width, rnd() * c.height, 2 + rnd() * 4, 2 + rnd() * 4);
  }
  // poradie v atlase (UV začína dole): typ 0 vľavo dole, 1 vpravo dole, 2 vľavo hore, 3 vpravo hore
  stare(g, 0, D, rnd);
  obytne(g, D, D, rnd);
  kancelarie(g, 0, 0, rnd);
  jednoduche(g, D, 0, rnd);
  atlas = new THREE.CanvasTexture(c);
  atlas.colorSpace = THREE.SRGBColorSpace;
  atlas.anisotropy = 8;
  return atlas;
}

/** Úprava materiálu: vyberie dlaždicu atlasu podľa atribútu aTyp a opakuje ju (fract + textureGrad). */
export function pripravMaterialFasady(mat) {
  mat.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nattribute float aTyp;\nvarying float vTyp;')
      .replace('#include <uv_vertex>', '#include <uv_vertex>\nvTyp = aTyp;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying float vTyp;')
      .replace('#include <map_fragment>', `
        #ifdef USE_MAP
          vec2 posunTypu = vec2(mod(vTyp, 2.0), floor(vTyp / 2.0)) * 0.5;
          vec4 sampledDiffuseColor = textureGrad(map, fract(vMapUv) * 0.5 + posunTypu, dFdx(vMapUv) * 0.5, dFdy(vMapUv) * 0.5);
          diffuseColor *= sampledDiffuseColor;
        #endif`);
  };
  return mat;
}
