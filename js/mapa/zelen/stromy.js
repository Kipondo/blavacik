// Stromy ako InstancedMesh, rozdelené do štvorcov (chunkov), aby sa vzdialené
// a neviditeľné skupiny stromov vôbec nevykresľovali.
// Formát v dátach: "stromy": [[x, z, mierka], ...] alebo z laserového skenovania
// [[x, z, mierka, výška, polomer koruny], ...] – strom má potom skutočnú výšku a šírku koruny.

import * as THREE from 'three';

const CHUNK = 250;
const DOHLAD = 650; // ďalej ako toto sa stromy skryjú (aj tak sú v hmle)

export function vytvorStromy(stromy, vyskopis, kolizie) {
  const skupina = new THREE.Group();
  skupina.name = 'stromy';
  if (!stromy?.length) return skupina;

  // stromy z lasera (výrez s detailom) dostanú členitejšiu korunu, ostatné jednoduchšiu (lesy majú tisíce stromov)
  const bohate = stromy[0]?.length >= 5;
  const { listnaty, ihlicnaty, kmenGeo } = geometrieStromov(bohate);
  const matKmen = new THREE.MeshStandardMaterial({ color: '#5b4632', roughness: 1 });
  const matKoruna = new THREE.MeshStandardMaterial({ color: '#ffffff', vertexColors: true, roughness: 0.85, flatShading: true });

  const chunky = new Map();
  stromy.forEach((s, i) => {
    const k = `${Math.floor(s[0] / CHUNK)},${Math.floor(s[1] / CHUNK)}`;
    if (!chunky.has(k)) chunky.set(k, []);
    chunky.get(k).push([s, i]);
  });

  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const os = new THREE.Vector3(0, 1, 0);
  const farba = new THREE.Color();
  for (const zoznam of chunky.values()) {
    // ihličnany: z lasera podľa tvaru (úzka vysoká koruna), inak ~1/6 stromov
    const druhy = zoznam.map(([s, i]) => (s.length >= 5 ? (s[3] / (2 * s[4]) > 1.9 ? 1 : 0) : (i * 7919) % 6 === 0 ? 1 : 0));
    const pocetIhl = druhy.filter((d) => d).length;
    const kmene = new THREE.InstancedMesh(kmenGeo, matKmen, zoznam.length);
    const koruny = new THREE.InstancedMesh(listnaty, matKoruna, zoznam.length - pocetIhl);
    const ihlice = new THREE.InstancedMesh(ihlicnaty, matKoruna, Math.max(1, pocetIhl));
    ihlice.count = pocetIhl;
    let sx = 0, sz = 0, kl = 0, ki = 0;
    zoznam.forEach(([[x, z, s = 1, h, r], i], j) => {
      const y = vyskopis.vyskaTerenu(x, z);
      q.setFromAxisAngle(os, (i * 2.399) % (Math.PI * 2));
      // laser: skutočná výška a polomer koruny (základný model: výška 7,4 m, polomer koruny 2,6 m)
      const mv = h ? h / 7.4 : s * (0.9 + (i % 5) * 0.06), mh = r ? r / 2.6 : s;
      m.compose(new THREE.Vector3(x, y, z), q, new THREE.Vector3(mh, mv, mh));
      kmene.setMatrixAt(j, m);
      if (druhy[j]) {
        farba.setHSL(0.33 + (i % 5) * 0.01, 0.35, 0.2 + (i % 4) * 0.02);
        ihlice.setMatrixAt(ki, m); ihlice.setColorAt(ki++, farba);
      } else {
        farba.setHSL(0.2 + (i % 7) * 0.015, 0.36 + (i % 3) * 0.07, 0.22 + (i % 5) * 0.025);
        koruny.setMatrixAt(kl, m); koruny.setColorAt(kl++, farba);
      }
      kolizie?.pridajKruh(x, z, 0.45 * Math.min(1.6, Math.sqrt(mh * mv)), { typ: 'strom' });
      sx += x; sz += z;
    });
    const chunk = new THREE.Group();
    for (const im of [kmene, koruny, ihlice]) {
      im.castShadow = true;
      im.receiveShadow = im !== kmene;
      im.computeBoundingSphere();
      if (im.count) chunk.add(im);
    }
    chunk.userData.dohlad = { x: sx / zoznam.length, z: sz / zoznam.length, max: DOHLAD };
    skupina.add(chunk);
  }
  return skupina;
}

const cacheGeo = {};
/** Geometrie stromov: listnatý (zhluk nepravidelných gúľ) a ihličnatý (dva kužele). */
function geometrieStromov(bohate) {
  if (cacheGeo[bohate]) return cacheGeo[bohate];
  const kmenGeo = new THREE.CylinderGeometry(0.18, 0.3, 3.2, 7);
  kmenGeo.translate(0, 1.6, 0);

  const casti = [];
  // koruna zo zhlukov listov: väčšie jadro a menšie chumáče po obvode (členitejší obrys)
  const gule = bohate
    ? [[0, 5.0, 0, 2.0], [1.4, 4.4, 0.5, 1.3], [-1.3, 4.5, -0.6, 1.35], [0.3, 6.3, -0.3, 1.25], [-0.5, 4.2, 1.4, 1.2],
      [0.7, 4.3, -1.4, 1.15], [1.6, 5.6, -0.4, 1.0], [-1.5, 5.7, 0.6, 1.0], [-0.2, 3.6, -0.2, 1.4], [0.9, 6.6, 0.8, 0.85]]
    : [[0, 4.9, 0, 2.3], [1.3, 4.3, 0.6, 1.6], [-1.1, 4.4, -0.7, 1.7], [0.2, 6.1, -0.4, 1.5]];
  gule.forEach(([x, y, z, r], k) => {
    const g = new THREE.IcosahedronGeometry(r, bohate ? 1 : 0);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      // nepravidelnosť – aby to nebola dokonalá guľa
      const n = Math.sin(p.getX(i) * 3.1 + k) * Math.cos(p.getZ(i) * 2.7 - k) * 0.22 * r;
      p.setXYZ(i, p.getX(i) * (1 + n / r) + x, p.getY(i) * 0.9 + y, p.getZ(i) * (1 + n / r) + z);
    }
    casti.push(g);
  });
  const listnaty = spojGeometrie(casti, 3.2, 7.4);

  const k1 = new THREE.ConeGeometry(2.3, 4.2, 8).toNonIndexed(); k1.translate(0, 4.2, 0);
  const k2 = new THREE.ConeGeometry(1.6, 3.4, 8).toNonIndexed(); k2.translate(0, 6.4, 0);
  const ihlicnaty = spojGeometrie([k1, k2], 2.4, 8);

  for (const g of [listnaty, ihlicnaty, kmenGeo]) g.userData.zdielane = true;
  cacheGeo[bohate] = { listnaty, ihlicnaty, kmenGeo };
  return cacheGeo[bohate];
}

/** Spojí geometrie a pridá farbu vrcholov: dole tmavšie (tieň v korune), hore svetlejšie. */
function spojGeometrie(geos, yMin, yMax) {
  const poz = [];
  for (const g of geos) poz.push(...g.attributes.position.array);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(poz, 3));
  const farby = [];
  for (let i = 1; i < poz.length; i += 3) {
    const t = Math.min(1, Math.max(0, (poz[i] - yMin) / (yMax - yMin)));
    const v = 0.55 + t * 0.55;
    farby.push(v, v, v * 0.95);
  }
  geo.setAttribute('color', new THREE.Float32BufferAttribute(farby, 3));
  geo.computeVertexNormals();
  return geo;
}
