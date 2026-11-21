// Dopravné značky pri cestách: STOP a daj prednosť (z OSM), zákaz vjazdu a jednosmerka
// (na koncoch jednosmerných ciest), obmedzenie rýchlosti (z maxspeed).
// Všetky značky jedného druhu sú jeden InstancedMesh.

import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { texturaZnacky, ZADNA_STRANA } from './textury-znaciek.js';
import { kluc } from '../cesty/krizovatky.js';
import { najblizsiNaUsecke } from '../geometria.js';

const VYSKA = 2.3, VELKOST = 0.75;
// predná strana tabule je 6 cm pred osou stĺpika (polomer 4 cm + 2 cm), aby stĺpik neprechádzal symbolom
const ODSTUP_TABULE = 0.06;

export function vytvorZnacky(data, krizovatky, vyskopis) {
  const zoznam = []; // { typ, x, z, smerX, smerZ } – smer = kam ide vodič, ktorý značku vidí
  const cesty = data.cesty ?? [];
  const pridaj = (typ, x, z, dx, dz, pol) => {
    // značka vpravo od jazdného smeru (dx, dz)
    const rx = -dz, rz = dx;
    zoznam.push({ typ, x: x + rx * (pol + 1.3), z: z + rz * (pol + 1.3), dx, dz });
  };

  // --- STOP a daj prednosť z OSM ---
  const mriezka = mriezkaUsekov(cesty);
  const najdiUsek = (x, z) => {
    let naj = null;
    for (const u of mriezka.get(Math.floor(x / 30) * 100003 + Math.floor(z / 30)) ?? []) {
      const n = najblizsiNaUsecke(x, z, u.ax, u.az, u.bx, u.bz);
      if (n.d2 < 16 && (!naj || n.d2 < naj.d2)) naj = { ...n, u };
    }
    return naj;
  };
  const kKrizovatke = (x, z, u) => {
    // smer jazdy = k bližšiemu koncu úseku, ktorý je križovatkou (alebo ku koncu b)
    const kb = krizovatky.has(kluc(u.bx, u.bz)), ka = krizovatky.has(kluc(u.ax, u.az));
    const db = Math.hypot(u.bx - x, u.bz - z), da = Math.hypot(u.ax - x, u.az - z);
    const doB = kb && (!ka || db <= da) ? true : ka ? false : db <= da;
    const [tx, tz] = doB ? [u.bx - u.ax, u.bz - u.az] : [u.ax - u.bx, u.az - u.bz];
    const d = Math.hypot(tx, tz) || 1;
    return [tx / d, tz / d];
  };
  for (const [typ, body] of [['stop', data.prvky?.stop], ['prednost', data.prvky?.prednost]]) {
    for (const [x, z] of body ?? []) {
      const n = najdiUsek(x, z);
      if (!n) continue;
      const [dx, dz] = kKrizovatke(x, z, n.u);
      pridaj(typ, n.x, n.z, dx, dz, n.u.c.sirka / 2);
    }
  }

  // --- jednosmerky: na začiatku „jednosmerka“, na konci „zákaz vjazdu“ ---
  for (const c of cesty) {
    if (!c.jednosmerka || c.typ?.startsWith('motorway') || c.typ === 'service' || c.body.length < 2) continue;
    const dlzka = c.body.reduce((s, b, i) => (i ? s + Math.hypot(b[0] - c.body[i - 1][0], b[1] - c.body[i - 1][1]) : 0), 0);
    if (dlzka < 25) continue;
    const [a0, a1] = [c.body[0], c.body[1]];
    if (krizovatky.has(kluc(...a0))) {
      const d = Math.hypot(a1[0] - a0[0], a1[1] - a0[1]) || 1;
      const dx = (a1[0] - a0[0]) / d, dz = (a1[1] - a0[1]) / d;
      pridaj('jednosmerka', a0[0] + dx * 6, a0[1] + dz * 6, dx, dz, c.sirka / 2);
    }
    const [b0, b1] = [c.body[c.body.length - 1], c.body[c.body.length - 2]];
    if (krizovatky.has(kluc(...b0))) {
      // vodič, ktorý by vchádzal do jednosmerky z nesprávnej strany, ide smerom b0 → b1
      const d = Math.hypot(b1[0] - b0[0], b1[1] - b0[1]) || 1;
      const dx = (b1[0] - b0[0]) / d, dz = (b1[1] - b0[1]) / d;
      pridaj('zakaz-vjazdu', b0[0] + dx * 5, b0[1] + dz * 5, dx, dz, c.sirka / 2);
    }
  }

  // --- obmedzenie rýchlosti na začiatku dlhších úsekov s maxspeed ---
  for (const c of cesty) {
    if (!c.max || c.max === 50 || c.body.length < 2) continue;
    const [a0, a1] = [c.body[0], c.body[1]];
    const d = Math.hypot(a1[0] - a0[0], a1[1] - a0[1]);
    if (d < 40) continue;
    const dx = (a1[0] - a0[0]) / d, dz = (a1[1] - a0[1]) / d;
    pridaj(`rychlost-${c.max}`, a0[0] + dx * 15, a0[1] + dz * 15, dx, dz, c.sirka / 2);
  }

  return postavZnacky(zoznam, vyskopis);
}

function postavZnacky(zoznam, vyskopis) {
  const skupina = new THREE.Group();
  skupina.name = 'znacky';
  if (!zoznam.length) return skupina;

  // stĺpiky
  const stlpGeo = new THREE.CylinderGeometry(0.04, 0.04, VYSKA, 6);
  stlpGeo.translate(0, VYSKA / 2, 0);
  const stlpy = new THREE.InstancedMesh(stlpGeo, new THREE.MeshStandardMaterial({ color: '#9ea4a8', metalness: 0.6, roughness: 0.4 }), zoznam.length);
  const o = new THREE.Object3D();
  zoznam.forEach((z, i) => {
    o.position.set(z.x, vyskopis.vyska(z.x, z.z) + 0.25, z.z);
    o.rotation.set(0, 0, 0);
    o.scale.set(1, 1, 1);
    o.updateMatrix();
    stlpy.setMatrixAt(i, o.matrix);
  });
  stlpy.computeBoundingSphere();
  skupina.add(stlpy);

  // tabule – podľa typu
  const podlaTypu = new Map();
  for (const z of zoznam) {
    if (!podlaTypu.has(z.typ)) podlaTypu.set(z.typ, []);
    podlaTypu.get(z.typ).push(z);
  }
  // tabuľa je PRED stĺpikom (polomer 4 cm + medzera), zadná strana 1 cm za prednou;
  // medzi stĺpikom a zadnou stranou dve objímky, aby tabuľa nevisela vo vzduchu
  const predna = new THREE.PlaneGeometry(VELKOST, VELKOST);
  predna.translate(0, 0, ODSTUP_TABULE);
  const zadna = new THREE.PlaneGeometry(VELKOST, VELKOST);
  zadna.rotateY(Math.PI);
  zadna.translate(0, 0, ODSTUP_TABULE - 0.01);
  const objimky = mergeGeometries([-1, 1].map((s) => {
    const g = new THREE.BoxGeometry(0.1, 0.035, ODSTUP_TABULE - 0.01);
    g.translate(0, s * VELKOST * 0.28, (ODSTUP_TABULE - 0.01) / 2);
    return g;
  }));
  const matZadna = new THREE.MeshStandardMaterial({ color: ZADNA_STRANA, metalness: 0.5, roughness: 0.5 });
  const matObjimky = new THREE.MeshStandardMaterial({ color: '#7d8489', metalness: 0.6, roughness: 0.45 });
  for (const [typ, z2] of podlaTypu) {
    const mat = new THREE.MeshStandardMaterial({ map: texturaZnacky(typ), transparent: true, alphaTest: 0.5, roughness: 0.6 });
    const p = new THREE.InstancedMesh(predna, mat, z2.length);
    const b = new THREE.InstancedMesh(zadna, matZadna, z2.length);
    const ob = new THREE.InstancedMesh(objimky, matObjimky, z2.length);
    z2.forEach((z, i) => {
      o.position.set(z.x, vyskopis.vyska(z.x, z.z) + 0.25 + VYSKA - VELKOST / 2, z.z);
      // predná strana hľadí proti jazdnému smeru (na vodiča)
      o.rotation.set(0, Math.atan2(-z.dx, -z.dz), 0);
      o.updateMatrix();
      p.setMatrixAt(i, o.matrix);
      b.setMatrixAt(i, o.matrix);
      ob.setMatrixAt(i, o.matrix);
    });
    p.computeBoundingSphere(); b.computeBoundingSphere(); ob.computeBoundingSphere();
    skupina.add(p, b, ob);
  }
  skupina.userData.pocet = zoznam.length;
  return skupina;
}

function mriezkaUsekov(cesty) {
  const m = new Map();
  for (const c of cesty) {
    for (let i = 0; i < c.body.length - 1; i++) {
      const [ax, az] = c.body[i], [bx, bz] = c.body[i + 1];
      for (let gx = Math.floor(Math.min(ax, bx) / 30); gx <= Math.floor(Math.max(ax, bx) / 30); gx++) {
        for (let gz = Math.floor(Math.min(az, bz) / 30); gz <= Math.floor(Math.max(az, bz) / 30); gz++) {
          const k = gx * 100003 + gz;
          if (!m.has(k)) m.set(k, []);
          m.get(k).push({ c, ax, az, bx, bz });
        }
      }
    }
  }
  return m;
}
