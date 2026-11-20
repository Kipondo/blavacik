// Obloha, slnko, svetlá a hmla.

import * as THREE from 'three';

export function vytvorSvet(scena, KONFIG) {
  const HORIZONT = new THREE.Color('#cfe0ea');
  const VRCH = new THREE.Color('#5b8fc7');

  scena.background = HORIZONT.clone();
  scena.fog = new THREE.Fog(HORIZONT, KONFIG.DOHLAD * 0.35, KONFIG.DOHLAD);

  // obloha – guľa s farebným prechodom, slnkom a oblakmi (shader)
  const smerSlnka = new THREE.Vector3(-0.5, 0.62, 0.35).normalize();
  const oblohaGeo = new THREE.SphereGeometry(4000, 32, 16);
  const oblohaMat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    uniforms: {
      vrch: { value: VRCH }, horizont: { value: HORIZONT },
      slnko: { value: smerSlnka }, cas: { value: 0 },
    },
    vertexShader: `
      varying vec3 vSmer;
      void main() {
        vSmer = normalize((modelMatrix * vec4(position, 1.0)).xyz - cameraPosition);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: `
      uniform vec3 vrch; uniform vec3 horizont; uniform vec3 slnko; uniform float cas;
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
        // slnko a žiara okolo neho
        float s = max(dot(d, slnko), 0.0);
        farba += vec3(1.0, 0.92, 0.75) * (pow(s, 900.0) * 6.0 + pow(s, 12.0) * 0.18);
        // oblaky – premietnuté na „strop“ nad nami
        if (h > 0.02) {
          vec2 uv = d.xz / (h + 0.12) * 1.4 + vec2(cas * 0.004, cas * 0.002);
          float o = smoothstep(0.52, 0.78, fbm(uv));
          vec3 oblak = mix(vec3(0.82, 0.85, 0.9), vec3(1.0), smoothstep(0.55, 0.9, fbm(uv + 0.3)));
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

  const hemi = new THREE.HemisphereLight('#dfefff', '#6b6150', 0.7);
  scena.add(hemi);

  const slnko = new THREE.DirectionalLight('#fff1d6', 2.6);
  slnko.position.copy(smerSlnka).multiplyScalar(200);
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
  const osX = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), smerSlnka).normalize();
  const osY = new THREE.Vector3().crossVectors(smerSlnka, osX);
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
    const u = Math.round(stred.dot(osX) / texel) * texel;
    const v = Math.round(stred.dot(osY) / texel) * texel;
    const w = stred.dot(smerSlnka);
    stred.copy(osX).multiplyScalar(u).addScaledVector(osY, v).addScaledVector(smerSlnka, w);
    slnko.target.position.copy(stred);
    slnko.position.copy(stred).addScaledVector(smerSlnka, 250);
  }

  return { update, slnko, hemi, obloha, smerSlnka };
}
