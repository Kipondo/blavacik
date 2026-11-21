// Okná na ustúpených podlažiach a nadstavbách (issue #64): steny medzi rovinami LOD2 strechy z lasera
// (js/mapa/budovy/strechy-lod2.js) boli len omietnuté. Kde je stena aspoň na jedno podlažie, dostane presklenie
// po podlažiach (3 m) – rad vysokých okien s rámom, ako majú ustúpené podlažia a penthousy.
// Nižšie steny (atiky, štíty pri odkvape) ostávajú bez okien.
//
// Každý vrchol steny dostane atribút `stena` = (spodok steny v tomto mieste, výška steny trojuholníka);
// spodok sa nájde ako najnižší vrchol stien s rovnakou polohou (x, z). Výška steny trojuholníka je najmenšia
// z jeho vrcholov – trojuholníky štítu (pri odkvape nulová výška) tak okná nedostanú.

import * as THREE from 'three';

const PODLAZIE = 3.0;
const MIN_VYSKA = 2.6;
const MAX_VYSKA = 12;      // vyššie steny sú chyby roviny strechy (ďaleko predĺžená rovina) – bez okien

const materialy = new WeakMap();

function materialSOknami(zaklad) {
  if (materialy.has(zaklad)) return materialy.get(zaklad);
  const m = zaklad.clone();
  m.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>
        attribute vec2 stena;
        varying vec2 vStena;
        varying vec2 vStenaUv;`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        vStena = stena;
        vStenaUv = vec2(uv.x, position.y);`);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>
        varying vec2 vStena;
        varying vec2 vStenaUv;
        float sklo = 0.0;`)
      .replace('#include <color_fragment>', `#include <color_fragment>
        {
          float h = vStenaUv.y - vStena.x;
          float pod = floor(h / ${PODLAZIE.toFixed(1)});
          float v = h - pod * ${PODLAZIE.toFixed(1)};
          // celé podlažie sa musí zmestiť do steny
          float cele = step(${MIN_VYSKA.toFixed(1)}, vStena.y) * step(vStena.y, ${MAX_VYSKA.toFixed(1)})
            * step((pod + 1.0) * ${PODLAZIE.toFixed(1)}, vStena.y + 0.35) * step(0.0, h);
          float u = fract(vStenaUv.x / 2.6);
          // okno 0,25 – 2,55 m nad podlahou, šírka ~1,8 m; rám 8 cm
          float okno = step(0.15, u) * step(u, 0.85) * step(0.25, v) * step(v, 2.55);
          float vnutro = step(0.18, u) * step(u, 0.82) * step(0.33, v) * step(v, 2.47);
          // priečka v strede okna
          float priecka = 1.0 - step(abs(u - 0.5), 0.012);
          sklo = cele * vnutro * priecka;
          float ram = cele * okno * (1.0 - sklo);
          vec3 farbaSkla = vec3(0.12, 0.15, 0.18) + 0.05 * vec3(sin(pod * 3.1 + floor(vStenaUv.x / 2.6) * 1.7));
          diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.62, 0.62, 0.6), ram);
          diffuseColor.rgb = mix(diffuseColor.rgb, farbaSkla, sklo);
        }`)
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
        roughnessFactor = mix(roughnessFactor, 0.12, sklo);`)
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
        // sklo je hladké – bez normálovej mapy omietky
        normal = normalize(mix(normal, nonPerturbedNormal, sklo));`);
  };
  m.customProgramCacheKey = () => 'steny-okna';
  materialy.set(zaklad, m);
  return m;
}

/** Sieť stien LOD2 strechy s oknami (geometria môže byť indexovaná – kvôli atribútom sa rozdelí). */
export function stenySOknami(geo, zaklad) {
  const g = geo.index ? geo.toNonIndexed() : geo;
  const p = g.attributes.position.array;
  const n = p.length / 3;
  const kluc = (i) => `${Math.round(p[i * 3] * 10)},${Math.round(p[i * 3 + 2] * 10)}`;
  const rozsah = new Map();
  for (let i = 0; i < n; i++) {
    const k = kluc(i), y = p[i * 3 + 1], r = rozsah.get(k);
    if (r) { if (y < r[0]) r[0] = y; if (y > r[1]) r[1] = y; } else rozsah.set(k, [y, y]);
  }
  const a = new Float32Array(n * 2);
  for (let t = 0; t + 2 < n; t += 3) {
    const r = [rozsah.get(kluc(t)), rozsah.get(kluc(t + 1)), rozsah.get(kluc(t + 2))];
    const vys = Math.min(r[0][1] - r[0][0], r[1][1] - r[1][0], r[2][1] - r[2][0]);
    for (let q = 0; q < 3; q++) { a[(t + q) * 2] = r[q][0]; a[(t + q) * 2 + 1] = vys; }
  }
  g.setAttribute('stena', new THREE.BufferAttribute(a, 2));
  g.computeVertexNormals();
  g.computeBoundingSphere();
  return new THREE.Mesh(g, materialSOknami(zaklad));
}
