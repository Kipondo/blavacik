// Obloha, slnko, svetlá a hmla.

import * as THREE from 'three';

export function vytvorSvet(scena, KONFIG) {
  const HORIZONT = new THREE.Color('#cfe0ea');
  const VRCH = new THREE.Color('#5b8fc7');

  scena.background = HORIZONT.clone();
  scena.fog = new THREE.Fog(HORIZONT, KONFIG.DOHLAD * 0.35, KONFIG.DOHLAD);

  // obloha – guľa s farebným prechodom
  const oblohaGeo = new THREE.SphereGeometry(4000, 24, 12);
  const oblohaMat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    uniforms: { vrch: { value: VRCH }, horizont: { value: HORIZONT } },
    vertexShader: `
      varying vec3 vPoz;
      void main() {
        vPoz = (modelMatrix * vec4(position, 1.0)).xyz - cameraPosition;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: `
      uniform vec3 vrch; uniform vec3 horizont;
      varying vec3 vPoz;
      void main() {
        float h = normalize(vPoz).y;
        gl_FragColor = vec4(mix(horizont, vrch, smoothstep(0.0, 0.45, h)), 1.0);
      }`,
  });
  const obloha = new THREE.Mesh(oblohaGeo, oblohaMat);
  obloha.renderOrder = -1;
  obloha.frustumCulled = false;
  scena.add(obloha);

  const hemi = new THREE.HemisphereLight('#dfefff', '#6b6150', 1.1);
  scena.add(hemi);

  const slnko = new THREE.DirectionalLight('#fff3dd', 2.4);
  const smerSlnka = new THREE.Vector3(-0.5, 0.8, 0.35).normalize();
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

  /** Slnko a obloha idú za kamerou, aby tiene boli vždy okolo hráča. */
  function update(ciel, kamera) {
    obloha.position.copy(kamera.position);
    slnko.target.position.copy(ciel);
    slnko.position.copy(ciel).addScaledVector(smerSlnka, 250);
  }

  return { update, slnko, hemi };
}
