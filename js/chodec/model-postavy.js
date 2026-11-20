// Low-poly postavička s animáciou chôdze. Pozerá na +z.

import * as THREE from 'three';

export function vytvorModelPostavy({ tricko = '#2f6fb3', nohavice = '#2b2b33', plet = '#e0b48f', vlasy = '#3a2a1c' } = {}) {
  const g = new THREE.Group();
  const mat = (c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.8 });

  const trup = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.7, 0.3), mat(tricko));
  trup.position.y = 1.2;
  g.add(trup);

  const hlava = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.34, 0.32), mat(plet));
  hlava.position.y = 1.78;
  g.add(hlava);
  const vlasyM = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.12, 0.34), mat(vlasy));
  vlasyM.position.y = 1.97;
  g.add(vlasyM);

  // končatiny visia z kĺbov, aby sa dali otáčať
  const koncatina = (x, y, sirka, dlzka, farba) => {
    const klb = new THREE.Group();
    klb.position.set(x, y, 0);
    const m = new THREE.Mesh(new THREE.BoxGeometry(sirka, dlzka, sirka), mat(farba));
    m.position.y = -dlzka / 2;
    klb.add(m);
    g.add(klb);
    return klb;
  };
  const lavaRuka = koncatina(-0.37, 1.52, 0.16, 0.66, tricko);
  const pravaRuka = koncatina(0.37, 1.52, 0.16, 0.66, tricko);
  const lavaNoha = koncatina(-0.15, 0.86, 0.2, 0.86, nohavice);
  const pravaNoha = koncatina(0.15, 0.86, 0.2, 0.86, nohavice);

  g.traverse((o) => { if (o.isMesh) o.castShadow = true; });

  let faza = 0;
  /** Animácia: rychlost v m/s, voVzduchu = skok */
  g.userData.animuj = (dt, rychlost, voVzduchu) => {
    faza += dt * (2 + rychlost * 1.6);
    const rozkmit = voVzduchu ? 0.5 : Math.min(0.9, rychlost * 0.13);
    const s = Math.sin(faza) * rozkmit;
    lavaNoha.rotation.x = s;
    pravaNoha.rotation.x = -s;
    lavaRuka.rotation.x = -s * 0.8;
    pravaRuka.rotation.x = s * 0.8;
    if (rychlost < 0.1 && !voVzduchu) {
      for (const k of [lavaNoha, pravaNoha, lavaRuka, pravaRuka]) k.rotation.x *= 0.8;
    }
  };
  return g;
}
