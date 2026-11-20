// Modul: odrazy okolia (environment map) z oblohy – sklo, karoséria áut a voda
// tak odrážajú oblohu a celé osvetlenie vyzerá prirodzenejšie. Robí sa raz pri štarte.
// Navyše posúva oblaky na oblohe.

import * as THREE from 'three';

export default {
  nazov: 'prostredie',
  poradie: 1,

  init(hra) {
    const obloha = hra.scena.getObjectByName('obloha');
    if (!obloha) return;
    this.obloha = obloha;
    const envScena = new THREE.Scene();
    // obloha v odrazoch je o niečo bledšia ako na nebi – inak by modré nepriame svetlo z nej
    // prefarbilo všetky tienisté fasády do modra (oblohu už svieti aj HemisphereLight)
    const mat = obloha.material.clone();
    mat.uniforms.vrch.value = obloha.material.uniforms.vrch.value.clone().lerp(obloha.material.uniforms.horizont.value, 0.45);
    const kopia = new THREE.Mesh(obloha.geometry, mat);
    envScena.add(kopia);
    // „zem“ v odraze – aby spodná polovica nebola obloha
    const zem = new THREE.Mesh(new THREE.CircleGeometry(3000, 16), new THREE.MeshBasicMaterial({ color: '#5f5c55' }));
    zem.rotation.x = -Math.PI / 2;
    zem.position.y = -40;
    envScena.add(zem);
    const pmrem = new THREE.PMREMGenerator(hra.renderer);
    // far musí presiahnuť guľu oblohy (polomer 4000 m) – inak sa do odrazov dostane len čierna
    // a zem (sklenené fasády, autá a voda boli tmavé)
    const env = pmrem.fromScene(envScena, 0.03, 1, 4500);
    hra.scena.environment = env.texture;
    hra.scena.environmentIntensity = 0.4;
    pmrem.dispose();
    mat.dispose();
  },

  updateVzdy(dt, hra) {
    if (this.obloha) this.obloha.material.uniforms.cas.value = performance.now() / 1000;
  },
};
