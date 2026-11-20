// Všeobecný model mosta: súvislá mostovka (s nájazdmi), bočnice, zábradlie a piliere.
// Špeciálne časti (pylón, UFO, laná, oblúk) dodávajú moduly pamiatok.
// Formát: { "nazov": "Most SNP", "od": [x,z], "do": [x,z], "sirka": 22, "vyska": 4, "nabeh": 45 }

import * as THREE from 'three';

const KROK = 4;
const HRUBKA = 1.8;

export function vytvorMosty(mosty, vyskopis, KONFIG) {
  const skupina = new THREE.Group();
  skupina.name = 'mosty';
  const matBetón = new THREE.MeshStandardMaterial({ color: '#9a968e', roughness: 0.85 });
  const matZabradlie = new THREE.MeshStandardMaterial({ color: '#cfd3d6', roughness: 0.5, metalness: 0.4 });

  for (const m of mosty ?? []) {
    const [ax, az] = m.od, [bx, bz] = m.do;
    const dlzka = Math.hypot(bx - ax, bz - az);
    const ux = (bx - ax) / dlzka, uz = (bz - az) / dlzka;
    const nx = -uz, nz = ux; // kolmica
    const pol = m.sirka / 2;
    const n = Math.ceil(dlzka / KROK);

    // body pozdĺž osi s výškou mostovky
    const rez = [];
    for (let i = 0; i <= n; i++) {
      const s = (i / n) * dlzka;
      const x = ax + ux * s, z = az + uz * s;
      rez.push({ x, z, h: vyskopis.vyska(x, z) });
    }

    // spodná strana a bočnice ako jedna sieť (vrch tvoria cesty)
    const poz = [];
    const quad = (a, b, c, d) => poz.push(...a, ...b, ...c, ...a, ...c, ...d);
    for (let i = 0; i < n; i++) {
      const p = rez[i], q = rez[i + 1];
      const L = (r, y) => [r.x + nx * pol, y, r.z + nz * pol];
      const R = (r, y) => [r.x - nx * pol, y, r.z - nz * pol];
      // ľavá a pravá bočnica, spodok
      quad(L(p, p.h - HRUBKA), L(q, q.h - HRUBKA), L(q, q.h + 0.05), L(p, p.h + 0.05));
      quad(R(q, q.h - HRUBKA), R(p, p.h - HRUBKA), R(p, p.h + 0.05), R(q, q.h + 0.05));
      quad(R(p, p.h - HRUBKA), R(q, q.h - HRUBKA), L(q, q.h - HRUBKA), L(p, p.h - HRUBKA));
      // samotná doska mostovky (pod cestou), aby most nebol priehľadný tam, kde cesta nie je
      quad(L(p, p.h + 0.02), L(q, q.h + 0.02), R(q, q.h + 0.02), R(p, p.h + 0.02));
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(poz, 3));
    geo.computeVertexNormals();
    const telo = new THREE.Mesh(geo, matBetón);
    telo.material.side = THREE.DoubleSide;
    telo.castShadow = telo.receiveShadow = true;
    skupina.add(telo);

    // zábradlie (inštancie) a piliere
    const zabradlie = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), matZabradlie, n * 2);
    const mat4 = new THREE.Matrix4(), q4 = new THREE.Quaternion(), e = new THREE.Euler();
    let k = 0;
    for (let i = 0; i < n; i++) {
      const p = rez[i], q = rez[i + 1];
      const sklon = Math.atan2(q.h - p.h, KROK);
      e.set(-sklon, Math.atan2(ux, uz), 0, 'YXZ');
      q4.setFromEuler(e);
      for (const strana of [1, -1]) {
        mat4.compose(
          new THREE.Vector3((p.x + q.x) / 2 + nx * strana * (pol - 0.2), (p.h + q.h) / 2 + 0.55, (p.z + q.z) / 2 + nz * strana * (pol - 0.2)),
          q4, new THREE.Vector3(0.25, 1.1, KROK + 0.05),
        );
        zabradlie.setMatrixAt(k++, mat4);
      }
      // pilier každých ~60 m tam, kde je pod mostom voda alebo hlboko zem
      const teren = vyskopis.vyskaTerenu(p.x, p.z);
      if (i % 15 === 7 && p.h - teren > 3) {
        const spodok = Math.min(teren, KONFIG.HLBKA_KORYTA);
        const vys = p.h - HRUBKA - spodok;
        const pilier = new THREE.Mesh(new THREE.BoxGeometry(m.sirka * 0.55, vys, 3.5), matBetón);
        pilier.position.set(p.x, spodok + vys / 2, p.z);
        pilier.rotation.y = Math.atan2(ux, uz);
        pilier.castShadow = true;
        skupina.add(pilier);
      }
    }
    zabradlie.computeBoundingSphere();
    skupina.add(zabradlie);
  }
  return skupina;
}
