// Hroby na cintorínoch (plochy pokrývky "cintorin" z OSM landuse=cemetery): rady hrobov pozdĺž hlavnej osi
// cintorína – kamenný rám s krycou doskou a náhrobok (stojatá doska, kríž, nízka široká doska, obelisk)
// z leštenej žuly či pieskovca rôznych farieb. Hroby sa nekladú na chodníky ani do budov.
// InstancedMesh po štvorcoch 125 m (orezanie mimo záberu), kreslia sa do 350 m.

import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { bodVPolygone } from '../geometria.js';

const STVOREC = 125;
const DOHLAD = 350;
const RAD = 2.7;          // vzdialenosť radov (hrob 2 m + ulička)
const KROK = 1.3;         // hroby vedľa seba
const MAX_HROBOV = 9000;  // na dlaždicu (veľké cintoríny sa zriedia)

const FARBY = ['#26272a', '#3a3b3f', '#5a5b5f', '#8f8d88', '#b7ac93', '#6e4a42', '#a49a86'];
const hash = (x, z, k = 0) => { const s = Math.sin(x * 12.9898 + z * 78.233 + k * 37.719) * 43758.5453; return s - Math.floor(s); };

let geo = null;
function geometrie() {
  if (geo) return geo;
  const kv = (w, h, d, x = 0, y = 0, z = 0) => { const b = new THREE.BoxGeometry(w, h, d); b.translate(x, y + h / 2, z); return b.toNonIndexed(); };
  const spoj = (casti) => { const g = mergeGeometries(casti); g.userData.zdielane = true; return g; };
  geo = {
    // rám a krycia doska hrobu (náhrobok stojí na konci pri -z)
    ram: spoj([kv(1.0, 0.18, 0.12, 0, 0, -0.94), kv(1.0, 0.18, 0.12, 0, 0, 0.94), kv(0.12, 0.18, 1.8, -0.44), kv(0.12, 0.18, 1.8, 0.44), kv(0.86, 0.12, 1.76, 0, 0.04)]),
    doska: spoj([kv(0.7, 0.95, 0.14, 0, 0.18, -0.95), kv(0.82, 0.12, 0.3, 0, 0.12, -0.95)]),
    kriz: spoj([kv(0.13, 1.15, 0.13, 0, 0.18, -0.95), kv(0.55, 0.13, 0.13, 0, 0.95, -0.95), kv(0.5, 0.16, 0.3, 0, 0.12, -0.95)]),
    nizka: spoj([kv(0.95, 0.6, 0.18, 0, 0.18, -0.95), kv(1.0, 0.1, 0.3, 0, 0.12, -0.95)]),
    obelisk: spoj([kv(0.4, 0.25, 0.4, 0, 0.12, -0.9), kv(0.3, 1.25, 0.3, 0, 0.37, -0.9), kv(0.2, 0.2, 0.2, 0, 1.62, -0.9)]),
  };
  return geo;
}

let mat = null;
function material() {
  mat ??= new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.38, metalness: 0.05 });
  return mat;
}

/** Hlavná os polygónu (smer najdlhšej hrany). */
function os(body) {
  let best = 0, u = [1, 0];
  for (let i = 0; i < body.length - 1; i++) {
    const dx = body[i + 1][0] - body[i][0], dz = body[i + 1][1] - body[i][1], l = Math.hypot(dx, dz);
    if (l > best) { best = l; u = [dx / l, dz / l]; }
  }
  return u;
}

export function vytvorHroby(d, vyskopis) {
  const skupina = new THREE.Group();
  skupina.name = 'hroby';
  const cintoriny = (d.pokryvka ?? []).filter((p) => p.k === 'cintorin' && p.body.length > 3);
  if (!cintoriny.length) return skupina;
  const G = geometrie();
  const druhy = ['doska', 'kriz', 'nizka', 'obelisk'];
  const hroby = [];
  for (const c of cintoriny) {
    const [ux, uz] = os(c.body), vx = -uz, vz = ux;
    const budovy = (d.budovy ?? []).filter((bu) => bu.body.some(([x, z]) => bodVPolygone(x, z, c.body)) || c.body.some(([x, z]) => bodVPolygone(x, z, bu.body)));
    const xs = c.body.map((p) => p[0] * ux + p[1] * uz), zs = c.body.map((p) => p[0] * vx + p[1] * vz);
    const plocha = (Math.max(...xs) - Math.min(...xs)) * (Math.max(...zs) - Math.min(...zs));
    const riedenie = Math.max(1, Math.sqrt((plocha / (KROK * RAD)) / MAX_HROBOV));
    // chodníky v cintoríne → mriežka 1 m s obsadenými bunkami (rýchla kontrola)
    const blizkoChodnika = new Set();
    for (const ch of d.chodniky ?? []) {
      if (!ch.body.some(([x, z]) => bodVPolygone(x, z, c.body))) continue;
      const r = (ch.sirka ?? 2) / 2 + 1.2, rc = Math.ceil(r);
      for (let i = 0; i < ch.body.length - 1; i++) {
        const [ax, az] = ch.body[i], [bx, bz] = ch.body[i + 1];
        const L = Math.hypot(bx - ax, bz - az), n = Math.max(1, Math.ceil(L / 0.7));
        for (let k = 0; k <= n; k++) {
          const px = ax + ((bx - ax) * k) / n, pz = az + ((bz - az) * k) / n;
          for (let dx = -rc; dx <= rc; dx++) for (let dz = -rc; dz <= rc; dz++) {
            if (dx * dx + dz * dz <= r * r) blizkoChodnika.add(`${Math.round(px) + dx},${Math.round(pz) + dz}`);
          }
        }
      }
    }
    for (let a = Math.min(...xs) + KROK; a < Math.max(...xs); a += KROK * riedenie) {
      for (let b = Math.min(...zs) + RAD / 2; b < Math.max(...zs); b += RAD * riedenie) {
        const x = a * ux + b * vx, z = a * uz + b * vz;
        if (!bodVPolygone(x, z, c.body)) continue;
        if (hash(x, z, 1) < 0.08) continue;                                  // voľné miesto
        if (budovy.some((bu) => bodVPolygone(x, z, bu.body))) continue;
        if (blizkoChodnika.has(`${Math.round(x)},${Math.round(z)}`)) continue;
        hroby.push({ x, z, uhol: Math.atan2(ux, uz) + (hash(x, z, 2) - 0.5) * 0.05 });
      }
    }
  }
  if (!hroby.length) return skupina;
  const stvorce = new Map();
  for (const h of hroby) {
    const k = `${Math.floor(h.x / STVOREC)},${Math.floor(h.z / STVOREC)}`;
    if (!stvorce.has(k)) stvorce.set(k, []);
    stvorce.get(k).push(h);
  }
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), os_ = new THREE.Vector3(0, 1, 0), p = new THREE.Vector3(), s = new THREE.Vector3(1, 1, 1);
  const farba = new THREE.Color();
  for (const zoznam of stvorce.values()) {
    const pocty = { ram: 0, doska: 0, kriz: 0, nizka: 0, obelisk: 0 };
    const vyber = zoznam.map((h) => {
      const n = hash(h.x, h.z, 3);
      const druh = n < 0.5 ? 'doska' : n < 0.66 ? 'kriz' : n < 0.9 ? 'nizka' : 'obelisk';
      const ram = hash(h.x, h.z, 4) < 0.82;
      pocty[druh]++; if (ram) pocty.ram++;
      return { ...h, druh, ram };
    });
    const im = {};
    for (const k of ['ram', ...druhy]) {
      if (!pocty[k]) continue;
      im[k] = new THREE.InstancedMesh(G[k], material(), pocty[k]);
      im[k].count = 0;
    }
    let sx = 0, sz = 0;
    for (const h of vyber) {
      const y = vyskopis.vyskaTerenu(h.x, h.z);
      q.setFromAxisAngle(os_, h.uhol);
      m.compose(p.set(h.x, y, h.z), q, s);
      farba.set(FARBY[Math.floor(hash(h.x, h.z, 5) * FARBY.length)]);
      const t = im[h.druh];
      t.setMatrixAt(t.count, m); t.setColorAt(t.count++, farba);
      if (h.ram) {
        farba.set(FARBY[Math.floor(hash(h.x, h.z, 6) * FARBY.length)]);
        im.ram.setMatrixAt(im.ram.count, m); im.ram.setColorAt(im.ram.count++, farba);
      }
      sx += h.x; sz += h.z;
    }
    const chunk = new THREE.Group();
    for (const t of Object.values(im)) { t.castShadow = true; t.receiveShadow = true; t.computeBoundingSphere(); chunk.add(t); }
    chunk.userData.dohlad = { x: sx / zoznam.length, z: sz / zoznam.length, max: DOHLAD };
    skupina.add(chunk);
  }
  return skupina;
}
