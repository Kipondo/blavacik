// Pouličné lampy z OSM (highway=street_lamp) – stĺp s ramenom a svietidlom,
// v historickom jadre liatinový stĺp s lucernou. Svietidlo má vlastný materiál, aby sa dalo v noci rozsvietiť (emissive).

import * as THREE from 'three';
import { vJadre } from '../teren/textura-zeme.js';

export function vytvorLampy(lampyVsetky, vyskopis, kolizie, budovy = []) {
  const skupina = new THREE.Group();
  skupina.name = 'lampy';
  if (!lampyVsetky?.length) return skupina;
  const historicke = lampyVsetky.filter(([x, z]) => vJadre(x, z));
  const lampy = lampyVsetky.filter(([x, z]) => !vJadre(x, z));
  if (historicke.length) skupina.add(vytvorLucerny(historicke, vyskopis, kolizie, budovy));
  const n = lampy.length;
  if (!n) return skupina;
  const stlpGeo = new THREE.CylinderGeometry(0.07, 0.11, 7, 6);
  stlpGeo.translate(0, 3.5, 0);
  const ramenoGeo = new THREE.BoxGeometry(0.08, 0.08, 1.4);
  ramenoGeo.translate(0, 6.9, 0.65);
  const hlavaGeo = new THREE.BoxGeometry(0.35, 0.18, 0.7);
  hlavaGeo.translate(0, 6.8, 1.3);
  const matStlp = new THREE.MeshStandardMaterial({ color: '#3a3f42', metalness: 0.6, roughness: 0.45 });
  const matSvetlo = new THREE.MeshStandardMaterial({ color: '#f5efd6', emissive: '#ffd27a', emissiveIntensity: 0 });
  const stlpy = new THREE.InstancedMesh(stlpGeo, matStlp, n);
  const ramena = new THREE.InstancedMesh(ramenoGeo, matStlp, n);
  const hlavy = new THREE.InstancedMesh(hlavaGeo, matSvetlo, n);
  const o = new THREE.Object3D();
  lampy.forEach(([x, z], i) => {
    o.position.set(x, vyskopis.vyska(x, z), z);
    o.rotation.set(0, (Math.abs(Math.round(x * 13 + z * 7)) % 4) * (Math.PI / 2), 0);
    o.updateMatrix();
    stlpy.setMatrixAt(i, o.matrix);
    ramena.setMatrixAt(i, o.matrix);
    hlavy.setMatrixAt(i, o.matrix);
    kolizie?.pridajKruh(x, z, 0.15, { typ: 'lampa' });
  });
  for (const m of [stlpy, ramena, hlavy]) { m.castShadow = true; m.computeBoundingSphere(); }
  skupina.add(stlpy, ramena, hlavy);
  skupina.userData.materialSvetla = matSvetlo; // pre budúci deň/noc
  return skupina;
}

function spoj(casti) {
  const poz = [], nor = [];
  for (const g of casti) { const x = g.toNonIndexed(); poz.push(...x.attributes.position.array); nor.push(...x.attributes.normal.array); }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.Float32BufferAttribute(poz, 3));
  out.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  return out;
}

/** Lucerna (štvorboká) so strieškou, stred skla vo výške y nad bodom (x = 0, z = dz). */
function lucerna(y, dz) {
  const strieska = new THREE.ConeGeometry(0.32, 0.3, 4); strieska.rotateY(Math.PI / 4); strieska.translate(0, y + 0.35, dz);
  const spodok = new THREE.CylinderGeometry(0.2, 0.12, 0.12, 4); spodok.rotateY(Math.PI / 4); spodok.translate(0, y - 0.3, dz);
  const sklo = new THREE.CylinderGeometry(0.24, 0.17, 0.5, 4); sklo.rotateY(Math.PI / 4); sklo.translate(0, y, dz);
  return { kov: [strieska, spodok], sklo };
}

/** Najbližšia stena budovy: { d, px, pz, nx, nz } (normála smeruje od budovy), alebo null. */
function najblizsiaStena(x, z, budovy) {
  let best = null;
  for (const b of budovy) {
    const body = b.body;
    if (Math.abs(body[0][0] - x) > 120 || Math.abs(body[0][1] - z) > 120) continue;
    let dnu = false;
    for (let i = 0, j = body.length - 1; i < body.length; j = i++) {
      const [xi, zi] = body[i], [xj, zj] = body[j];
      if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) dnu = !dnu;
    }
    for (let i = 0; i < body.length; i++) {
      const [ax, az] = body[i], [bx, bz] = body[(i + 1) % body.length];
      const dx = bx - ax, dz = bz - az, L2 = dx * dx + dz * dz || 1;
      const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / L2));
      const px = ax + dx * t, pz = az + dz * t, d = Math.hypot(x - px, z - pz);
      if (best && (dnu ? 0 : d) >= best.poradie) continue;
      // normála steny smerom von z budovy
      let nx = -dz, nz = dx; const nl = Math.hypot(nx, nz) || 1; nx /= nl; nz /= nl;
      const tx = (ax + bx) / 2 + nx * 0.05, tz = (az + bz) / 2 + nz * 0.05;
      let von = true;
      { let v = false; for (let k = 0, l = body.length - 1; k < body.length; l = k++) { const [xk, zk] = body[k], [xl, zl] = body[l]; if ((zk > tz) !== (zl > tz) && tx < ((xl - xk) * (tz - zk)) / (zl - zk) + xk) v = !v; } von = !v; }
      if (!von) { nx = -nx; nz = -nz; }
      best = { d: dnu ? 0 : d, poradie: dnu ? 0 : d, px, pz, nx, nz };
    }
  }
  return best;
}

/** Historické lampy: liatinový stĺp s lucernou, pri stene konzola s lucernou (v jadre ich je takmer polovica). */
function vytvorLucerny(lampy, vyskopis, kolizie, budovy) {
  const podstavec = new THREE.CylinderGeometry(0.16, 0.22, 0.6, 8); podstavec.translate(0, 0.3, 0);
  const stlp = new THREE.CylinderGeometry(0.06, 0.09, 3.4, 8); stlp.translate(0, 2.3, 0);
  const prstenec = new THREE.CylinderGeometry(0.12, 0.1, 0.12, 8); prstenec.translate(0, 4.0, 0);
  const lS = lucerna(4.4, 0);
  const kovStlp = spoj([podstavec, stlp, prstenec, ...lS.kov]);
  const konzola = new THREE.BoxGeometry(0.06, 0.06, 0.75); konzola.translate(0, 4.75, 0.37);
  const vzpera = new THREE.BoxGeometry(0.04, 0.04, 0.6); vzpera.rotateX(-0.75); vzpera.translate(0, 4.55, 0.2);
  const lK = lucerna(4.3, 0.72);
  const kovKonzola = spoj([konzola, vzpera, ...lK.kov]);
  const matKov = new THREE.MeshStandardMaterial({ color: '#1f2622', metalness: 0.6, roughness: 0.45 });
  const matSvetlo = new THREE.MeshStandardMaterial({ color: '#f3ead0', emissive: '#ffd27a', emissiveIntensity: 0, roughness: 0.2, transparent: true, opacity: 0.85 });
  const stlpove = [], nastenne = [];
  for (const [x, z] of lampy) {
    const s = najblizsiaStena(x, z, budovy);
    if (s && s.d < 1.6) nastenne.push({ x: s.px, z: s.pz, uhol: Math.atan2(s.nx, s.nz) });
    else stlpove.push({ x, z, uhol: 0 });
  }
  const g = new THREE.Group(); g.name = 'lucerny';
  const o = new THREE.Object3D();
  for (const [zoznam, kov, sklo] of [[stlpove, kovStlp, lS.sklo], [nastenne, kovKonzola, lK.sklo]]) {
    if (!zoznam.length) continue;
    const a = new THREE.InstancedMesh(kov, matKov, zoznam.length), b = new THREE.InstancedMesh(sklo, matSvetlo, zoznam.length);
    zoznam.forEach(({ x, z, uhol }, i) => {
      o.position.set(x, vyskopis.vyska(x, z), z); o.rotation.set(0, uhol, 0); o.updateMatrix();
      a.setMatrixAt(i, o.matrix); b.setMatrixAt(i, o.matrix);
      if (kov === kovStlp) kolizie?.pridajKruh(x, z, 0.2, { typ: 'lampa' });
    });
    for (const m of [a, b]) { m.castShadow = true; m.computeBoundingSphere(); }
    g.add(a, b);
  }
  g.userData.materialSvetla = matSvetlo;
  return g;
}
