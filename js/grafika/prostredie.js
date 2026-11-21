// Modul: odrazy okolia (environment map) z oblohy – sklo, karoséria áut a voda
// tak odrážajú oblohu a celé osvetlenie vyzerá prirodzenejšie. Robí sa raz pri štarte.
// Navyše posúva oblaky na oblohe.

import * as THREE from 'three';
import { NALADA } from './nalada.js';

export default {
  nazov: 'prostredie',
  poradie: 1,

  init(hra) {
    const obloha = hra.scena.getObjectByName('obloha');
    if (!obloha) return;
    this.obloha = obloha;
    const envScena = new THREE.Scene();
    const kopia = new THREE.Mesh(obloha.geometry, obloha.material);
    envScena.add(kopia);
    // „zem“ v odraze – aby spodná polovica nebola obloha
    const zem = new THREE.Mesh(new THREE.CircleGeometry(3000, 16), new THREE.MeshBasicMaterial({ color: NALADA.odrazy.zem }));
    zem.rotation.x = -Math.PI / 2;
    zem.position.y = -40;
    envScena.add(zem);
    const pmrem = new THREE.PMREMGenerator(hra.renderer);
    const env = pmrem.fromScene(envScena, 0.03);
    hra.scena.environment = env.texture;
    hra.scena.environmentIntensity = 0.55;
    pmrem.dispose();
  },

  updateVzdy(dt, hra) {
    if (this.obloha) this.obloha.material.uniforms.cas.value = performance.now() / 1000;
  },
};
