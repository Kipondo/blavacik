// Vzdialené budovy (LOD, stredný pás po koniec hmly): jednoduché vysunuté bloky – jedna sieť na dlaždicu.
// Okná kreslí shader (poschodia po 3,2 m, okno každé 3 m, v noci časť svieti – js/grafika/noc.js),
// bez textúry; z väčšej diaľky sa vzor okien plynulo zmení na priemernú farbu (žiadne mihotanie).
// Malé budovy sa vynechajú (z diaľky ich aj tak nevidno).

import * as THREE from 'three';
import { bodVPolygone, plochaPolygonu } from '../geometria.js';
import { typizujBudovy } from './typ-budovy.js';
import { NOC, OKNA } from '../../grafika/noc.js';

let material = null;

function vytvorMaterial() {
  const m = new THREE.MeshLambertMaterial({ vertexColors: true });
  m.onBeforeCompile = (shader) => {
    shader.uniforms.noc = NOC;
    shader.uniforms.okna = OKNA;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nattribute float zaklad;\nvarying float vZaklad;\nvarying vec3 vSvetLod;\nvarying vec3 vNormalaLod;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvZaklad = zaklad;\nvSvetLod = (modelMatrix * vec4(position, 1.0)).xyz;\nvNormalaLod = normalize(mat3(modelMatrix) * normal);');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>
uniform float noc; uniform float okna;
varying float vZaklad; varying vec3 vSvetLod; varying vec3 vNormalaLod;
float oknoLod;`)
      .replace('#include <color_fragment>', `#include <color_fragment>
      oknoLod = 0.0;
      if (abs(vNormalaLod.y) < 0.5) {
        vec2 smer = normalize(vec2(-vNormalaLod.z, vNormalaLod.x));
        vec2 uv = vec2(dot(vSvetLod.xz, smer) / 3.0, (vSvetLod.y - vZaklad) / 3.2);
        vec2 f = fract(uv);
        float vzor = step(0.22, f.x) * step(f.x, 0.78) * step(0.32, f.y) * step(f.y, 0.8) * step(0.9, uv.y);
        // pixel pokrýva veľa okien → priemer vzoru (inak by okná v diaľke mihotali)
        float rozmaz = smoothstep(0.25, 0.7, max(fwidth(uv.x), fwidth(uv.y)));
        oknoLod = mix(vzor, 0.27 * step(0.9, uv.y), rozmaz);
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.15, 0.18, 0.22), oknoLod * 0.8);
        // v noci svieti časť okien (náhodne podľa okna, podiel podľa času – OKNA)
        float h = fract(sin(dot(floor(uv) + vec2(vZaklad * 0.37, 0.0), vec2(12.9898, 78.233))) * 43758.5453);
        oknoLod *= mix(step(h, okna), okna, rozmaz) * noc;
      }`)
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance += oknoLod * vec3(1.0, 0.78, 0.45) * 0.9;');
  };
  m.customProgramCacheKey = () => 'budovy-lod-okna';
  return m;
}

export function vytvorBudovyLod(budovy, vyskopis) {
  material ??= vytvorMaterial();
  typizujBudovy(budovy);                    // výška a farba podľa typu – rovnaké ako v podrobnej dlaždici
  const poz = [], farby = [], zaklady = [];
  const c = new THREE.Color(), cs = new THREE.Color();
  for (const b of budovy) {
    let body = b.body;
    if (body.length < 3 || (b.vyska < 7 && Math.abs(plochaPolygonu(body)) < 150)) continue;
    const [x0, z0] = body[0];
    const zem = vyskopis.vyskaTerenu(x0, z0) - 1;
    const y0 = zem + ((b.minVyska ?? 0) > 0 ? 1 + b.minVyska : 0);   // vyvýšená časť budovy (veža nad podnožou)
    const y1 = zem + 1 + b.vyska;
    c.set(b.sklo ? '#8ea6b6' : b.farba ?? '#cfc9bd').multiplyScalar(0.92);
    cs.copy(b.strecha ? c.clone().set(b.strecha) : c.clone().multiplyScalar(0.7));
    const [ax, az] = body[0], [bx, bz] = body[1];
    const d = Math.hypot(bx - ax, bz - az) || 1;
    const vlavo = !bodVPolygone((ax + bx) / 2 - (bz - az) / d * 0.05, (az + bz) / 2 + (bx - ax) / d * 0.05, body);
    for (let i = 0; i < body.length; i++) {
      const p = body[i], q = body[(i + 1) % body.length];
      const A = [p[0], y0, p[1]], B = [q[0], y0, q[1]], C = [q[0], y1, q[1]], D = [p[0], y1, p[1]];
      const t = vlavo ? [A, B, C, A, C, D] : [A, C, B, A, D, C];
      for (const v of t) { poz.push(...v); farby.push(c.r, c.g, c.b); zaklady.push(zem + 1); }
    }
    const kontura = body.map(([x, z]) => new THREE.Vector2(x, z));
    const diery = (b.diery ?? []).filter((d) => d.length >= 3);
    const vsetky = [...body, ...diery.flat()];
    for (const [i, j, k] of THREE.ShapeUtils.triangulateShape(kontura, diery.map((d) => d.map(([x, z]) => new THREE.Vector2(x, z))))) {
      const P = [vsetky[i][0], y1, vsetky[i][1]], Q = [vsetky[j][0], y1, vsetky[j][1]], R = [vsetky[k][0], y1, vsetky[k][1]];
      const ny = (Q[2] - P[2]) * (R[0] - P[0]) - (Q[0] - P[0]) * (R[2] - P[2]);
      for (const v of ny >= 0 ? [P, Q, R] : [P, R, Q]) { poz.push(...v); farby.push(cs.r, cs.g, cs.b); zaklady.push(zem + 1); }
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(poz, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(farby, 3));
  geo.setAttribute('zaklad', new THREE.Float32BufferAttribute(zaklady, 1));
  geo.computeVertexNormals();
  const mesh = new THREE.Mesh(geo, material);
  mesh.name = 'budovy-lod';
  return mesh;
}
