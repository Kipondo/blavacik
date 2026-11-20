// Lavičky z OSM (amenity=bench) – drevené sedadlo a operadlo na liatinových nohách.
// OSM smer lavičky väčšinou nemá: lavička sa natočí čelom k najbližšiemu chodníku alebo ceste.

import * as THREE from 'three';

let geo = null;
const matDrevo = () => new THREE.MeshStandardMaterial({ color: '#8a5d3b', roughness: 0.8 });
const matKov = () => new THREE.MeshStandardMaterial({ color: '#23302a', metalness: 0.5, roughness: 0.5 });

function geometrie() {
  if (geo) return geo;
  // drevo: 3 dosky sedadla + 2 dosky operadla (sklon dozadu); kov: 2 bočnice
  const drevo = [];
  for (let k = 0; k < 3; k++) { const g = new THREE.BoxGeometry(1.8, 0.04, 0.12); g.translate(0, 0.45, -0.16 + k * 0.15); drevo.push(g); }
  for (let k = 0; k < 2; k++) {
    const g = new THREE.BoxGeometry(1.8, 0.12, 0.035); g.rotateX(-0.25); g.translate(0, 0.62 + k * 0.17, -0.26 - k * 0.04); drevo.push(g);
  }
  const kov = [];
  for (const s of [-0.78, 0.78]) {
    const noha = new THREE.BoxGeometry(0.06, 0.45, 0.5); noha.translate(s, 0.225, -0.02); kov.push(noha);
    const op = new THREE.BoxGeometry(0.05, 0.42, 0.05); op.rotateX(-0.25); op.translate(s, 0.66, -0.3); kov.push(op);
  }
  const spoj = (casti) => {
    const poz = [], nor = [];
    for (const g of casti) {
      const n = g.toNonIndexed();
      poz.push(...n.attributes.position.array); nor.push(...n.attributes.normal.array);
    }
    const out = new THREE.BufferGeometry();
    out.setAttribute('position', new THREE.Float32BufferAttribute(poz, 3));
    out.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
    out.userData.zdielane = true;
    return out;
  };
  geo = { drevo: spoj(drevo), kov: spoj(kov) };
  return geo;
}

/** Smer k najbližšiemu chodníku/ceste (lavička naň „pozerá“). */
function smerKCeste(x, z, ciary) {
  let best = Infinity, sx = 0, sz = 1;
  for (const c of ciary) {
    const b = c.body;
    for (let i = 0; i < b.length - 1; i++) {
      const [ax, az] = b[i], [bx, bz] = b[i + 1];
      const dx = bx - ax, dz = bz - az, L2 = dx * dx + dz * dz || 1;
      const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / L2));
      const px = ax + dx * t - x, pz = az + dz * t - z, d2 = px * px + pz * pz;
      if (d2 < best) { best = d2; sx = px; sz = pz; }
    }
  }
  const d = Math.hypot(sx, sz);
  return d > 0.01 && best < 30 * 30 ? [sx / d, sz / d] : null;
}

export function vytvorLavicky(lavicky, ciary, vyskopis, kolizie) {
  const skupina = new THREE.Group();
  skupina.name = 'lavicky';
  const n = lavicky?.length ?? 0;
  if (!n) return skupina;
  const g = geometrie();
  const drevo = new THREE.InstancedMesh(g.drevo, matDrevo(), n);
  const kov = new THREE.InstancedMesh(g.kov, matKov(), n);
  const o = new THREE.Object3D();
  lavicky.forEach(([x, z], i) => {
    const s = smerKCeste(x, z, ciary);
    // lavička je modelovaná čelom do +z
    const uhol = s ? Math.atan2(s[0], s[1]) : (Math.abs(Math.round(x * 7 + z * 3)) % 4) * (Math.PI / 2);
    o.position.set(x, vyskopis.vyska(x, z), z);
    o.rotation.set(0, uhol, 0);
    o.updateMatrix();
    drevo.setMatrixAt(i, o.matrix);
    kov.setMatrixAt(i, o.matrix);
    kolizie?.pridajObdlznik(x, z, 1.8, 0.6, uhol, { typ: 'lavicka' });
  });
  for (const m of [drevo, kov]) { m.castShadow = true; m.receiveShadow = true; m.computeBoundingSphere(); }
  skupina.add(drevo, kov);
  return skupina;
}
