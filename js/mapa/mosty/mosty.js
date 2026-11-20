// Všeobecný model mosta: mostovka, zábradlie a piliere.
// Špeciálne časti (pylón, UFO, laná) dodávajú moduly pamiatok.
// Formát: { "nazov": "Most SNP", "od": [x,z], "do": [x,z], "sirka": 22, "vyska": 2.5, "nabeh": 40 }

import * as THREE from 'three';

const DLZKA_USEKU = 8;

export function vytvorMosty(mosty, vyskopis, KONFIG) {
  const skupina = new THREE.Group();
  skupina.name = 'mosty';
  const matMostovka = new THREE.MeshStandardMaterial({ color: '#8d8a84', roughness: 0.8 });
  const matZabradlie = new THREE.MeshStandardMaterial({ color: '#d0d4d6', roughness: 0.5, metalness: 0.4 });
  const matPilier = new THREE.MeshStandardMaterial({ color: '#9b978f', roughness: 0.9 });

  for (const m of mosty ?? []) {
    const [ax, az] = m.od, [bx, bz] = m.do;
    const dlzka = Math.hypot(bx - ax, bz - az);
    const ux = (bx - ax) / dlzka, uz = (bz - az) / dlzka;
    const uhol = Math.atan2(ux, uz);
    const n = Math.ceil(dlzka / DLZKA_USEKU);

    for (let i = 0; i < n; i++) {
      const s0 = (i / n) * dlzka, s1 = ((i + 1) / n) * dlzka;
      const sm = (s0 + s1) / 2;
      const x = ax + ux * sm, z = az + uz * sm;
      const h = vyskopis.vyska(x, z);
      const teren = vyskopis.vyskaTerenu(x, z);
      if (h - teren < 0.4 && teren > KONFIG.HLADINA) continue; // nájazd na zemi – stačí cesta

      const hrubka = 1.6;
      const usek = new THREE.Mesh(new THREE.BoxGeometry(m.sirka, hrubka, s1 - s0 + 0.05), matMostovka);
      usek.position.set(x, h - hrubka / 2 + 0.05, z);
      usek.rotation.y = uhol;
      usek.castShadow = usek.receiveShadow = true;
      skupina.add(usek);

      for (const strana of [-1, 1]) {
        const z1 = new THREE.Mesh(new THREE.BoxGeometry(0.3, 1.1, s1 - s0 + 0.05), matZabradlie);
        const ox = -uz * strana * (m.sirka / 2 - 0.2), oz = ux * strana * (m.sirka / 2 - 0.2);
        z1.position.set(x + ox, h + 0.55, z + oz);
        z1.rotation.y = uhol;
        skupina.add(z1);
      }

      // pilier každých ~80 m nad vodou
      if (i % 10 === 5 && teren < KONFIG.HLADINA) {
        const vyskaP = h - KONFIG.HLBKA_KORYTA;
        const pilier = new THREE.Mesh(new THREE.BoxGeometry(m.sirka * 0.6, vyskaP, 4), matPilier);
        pilier.position.set(x, KONFIG.HLBKA_KORYTA + vyskaP / 2 - hrubka, z);
        pilier.rotation.y = uhol;
        skupina.add(pilier);
      }
    }
  }
  return skupina;
}
