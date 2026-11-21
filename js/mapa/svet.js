// Obloha, slnko, svetlá a hmla.

import * as THREE from 'three';
import { NALADA } from '../grafika/nalada.js';

export function vytvorSvet(scena, KONFIG) {
  // farby a smer slnka podľa nálady (js/grafika/nalada.js, predvolená zlatá hodinka)
  const HORIZONT = new THREE.Color(NALADA.obloha.horizont);
  const VRCH = new THREE.Color(NALADA.obloha.vrch);

  scena.background = HORIZONT.clone();
  scena.fog = new THREE.Fog(NALADA.hmla.farba, KONFIG.DOHLAD * NALADA.hmla.od, KONFIG.DOHLAD);

  // obloha – guľa s farebným prechodom, slnkom a oblakmi (shader)
  const smerSlnka = new THREE.Vector3(...NALADA.slnko.smer).normalize();
  const oblohaGeo = new THREE.SphereGeometry(4000, 32, 16);
  const oblohaMat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    uniforms: {
      vrch: { value: VRCH }, horizont: { value: HORIZONT },
      slnko: { value: smerSlnka }, cas: { value: 0 },
      ziara: { value: new THREE.Color(NALADA.obloha.ziara) },
      // noc (js/grafika/den-noc.js): hviezdy 0–1 a smer k mesiacu
      hviezdy: { value: 0 }, mesiac: { value: new THREE.Vector3(0.3, 0.5, -0.8).normalize() },
    },
    vertexShader: `
      varying vec3 vSmer;
      void main() {
        vSmer = normalize((modelMatrix * vec4(position, 1.0)).xyz - cameraPosition);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: `
      uniform vec3 vrch; uniform vec3 horizont; uniform vec3 slnko; uniform vec3 ziara; uniform float cas;
      uniform float hviezdy; uniform vec3 mesiac;
      varying vec3 vSmer;
      float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float sum(vec2 p) {
        vec2 i = floor(p), f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y);
      }
      float fbm(vec2 p) { float v = 0.0, a = 0.5; for (int i = 0; i < 5; i++) { v += a * sum(p); p *= 2.03; a *= 0.5; } return v; }
      void main() {
        vec3 d = normalize(vSmer);
        float h = d.y;
        vec3 farba = mix(horizont, vrch, smoothstep(0.0, 0.5, h));
        // slnko a žiara okolo neho; pri nízkom slnku je teplý aj obzor na jeho strane
        float s = max(dot(d, slnko), 0.0);
        float pas = 1.0 - smoothstep(0.0, 0.45, h);
        farba = mix(farba, ziara, pow(s, 3.0) * pas * 0.35);
        farba += ziara * (pow(s, 900.0) * 6.0 + pow(s, 12.0) * 0.22);
        // hviezdy a mesiac (v noci; pod oblakmi)
        if (hviezdy > 0.0 && h > 0.0) {
          vec2 uvH = d.xz / (h + 0.35) * 160.0;
          vec2 bunka = floor(uvH);
          float r = hash(bunka);
          vec2 f = fract(uvH) - 0.5 - (vec2(hash(bunka + 1.3), hash(bunka + 2.7)) - 0.5) * 0.6;
          float hv = step(0.982, r) * (1.0 - smoothstep(0.03, 0.13, length(f))) * (0.4 + 0.6 * (r - 0.982) / 0.018);
          hv *= 0.75 + 0.25 * sin(cas * 3.0 + r * 80.0);
          farba += vec3(0.85, 0.9, 1.0) * hv * hviezdy * 1.6 * smoothstep(0.0, 0.25, h);
          float m = max(dot(d, mesiac), 0.0);
          farba += vec3(0.82, 0.86, 0.95) * (smoothstep(0.99975, 0.99985, m) * 2.2 + pow(m, 300.0) * 0.25 + pow(m, 12.0) * 0.04) * hviezdy;
        }
        // oblaky – premietnuté na „strop“ nad nami; strana k slnku teplá, tienistá sivomodrá
        if (h > 0.02) {
          vec2 uv = d.xz / (h + 0.12) * 1.4 + vec2(cas * 0.004, cas * 0.002);
          float o = smoothstep(0.52, 0.78, fbm(uv));
          float svetlo = smoothstep(0.55, 0.9, fbm(uv + 0.3));
          vec3 tien = mix(vrch, horizont, 0.45) * 0.95;
          // jas oblakov podľa jasu oblohy (v noci len slabo osvetlené mesiacom)
          float svetlost = clamp(max(max(horizont.r, horizont.g), horizont.b) * 1.6, 0.0, 1.0) + hviezdy * 0.06;
          vec3 jas = mix(vec3(1.0), ziara, 0.18 + 0.45 * pow(s, 2.0)) * min(svetlost, 1.0);
          vec3 oblak = mix(tien, jas, svetlo);
          farba = mix(farba, oblak, o * smoothstep(0.02, 0.2, h) * 0.85);
        }
        gl_FragColor = vec4(farba, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
  const obloha = new THREE.Mesh(oblohaGeo, oblohaMat);
  obloha.renderOrder = -1;
  obloha.frustumCulled = false;
  obloha.name = 'obloha';
  scena.add(obloha);

  const hemi = new THREE.HemisphereLight(NALADA.hemi.nebo, NALADA.hemi.zem, NALADA.hemi.sila);
  scena.add(hemi);

  const slnko = new THREE.DirectionalLight(NALADA.slnko.farba, NALADA.slnko.sila);
  // smer svetla (v noci mesiac) – oddelený od slnka na oblohe; mení ho js/grafika/den-noc.js
  const smerSvetla = smerSlnka.clone();
  slnko.userData.smer = smerSvetla;
  slnko.position.copy(smerSvetla).multiplyScalar(200);
  if (KONFIG.TIENE) {
    slnko.castShadow = true;
    slnko.shadow.mapSize.set(2048, 2048);
    const s = slnko.shadow.camera;
    s.left = -90; s.right = 90; s.top = 90; s.bottom = -90;
    s.near = 10; s.far = 600;
    slnko.shadow.bias = -0.0004;
    slnko.shadow.normalBias = 0.6;
  }
  scena.add(slnko, slnko.target);

  // os tieňovej kamery (rovnako ako ju nastaví Three.js cez lookAt na slnko) – na zarovnanie na texely
  const HORE = new THREE.Vector3(0, 1, 0);
  const osX = new THREE.Vector3(), osY = new THREE.Vector3();
  const pohlad = new THREE.Vector3(), stred = new THREE.Vector3();

  /**
   * Slnko a obloha idú za kamerou, aby tiene boli vždy okolo hráča. Stred tieňov je kúsok pred hráčom
   * v smere pohľadu (viac tieňov tam, kam sa pozeráš) a je zarovnaný na texely tieňovej mapy,
   * takže okraje tieňov pri pohybe neblikajú.
   */
  function update(ciel, kamera, cas = 0) {
    obloha.position.copy(kamera.position);
    oblohaMat.uniforms.cas.value = cas;
    const dosah = slnko.shadow.camera.right;
    kamera.getWorldDirection(pohlad);
    pohlad.y = 0;
    if (pohlad.lengthSq() > 1e-4) pohlad.normalize();
    stred.copy(ciel).addScaledVector(pohlad, dosah * 0.4);
    const texel = (2 * dosah) / slnko.shadow.mapSize.x;
    osX.crossVectors(HORE, smerSvetla).normalize();
    osY.crossVectors(smerSvetla, osX);
    const u = Math.round(stred.dot(osX) / texel) * texel;
    const v = Math.round(stred.dot(osY) / texel) * texel;
    const w = stred.dot(smerSvetla);
    stred.copy(osX).multiplyScalar(u).addScaledVector(osY, v).addScaledVector(smerSvetla, w);
    slnko.target.position.copy(stred);
    slnko.position.copy(stred).addScaledVector(smerSvetla, 250);
  }

  return { update, slnko, hemi, obloha, smerSlnka };
}
