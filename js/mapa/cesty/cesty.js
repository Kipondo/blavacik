// Cesty: pásy asfaltu, ktoré kopírujú terén (a mosty).
// Formát v dátach: { "nazov": "Staromestská", "sirka": 16, "body": [[x,z], ...] }

import * as THREE from 'three';
import { texturaCesty } from './textura-cesty.js';

const KROK = 5;          // delenie cesty na úseky (m), aby sedela na teréne
const NAD_TERENOM = 0.12;

export function vytvorCesty(cesty, vyskopis) {
  const poz = [], uv = [], idx = [];
  let poradie = 0;

  for (const c of cesty) {
    const body = zjemni(c.body);
    if (body.length < 2) continue;
    const pol = c.sirka / 2;
    const zaciatok = poz.length / 3;
    let v = 0;
    // každá ďalšia cesta je o kúsok vyššie, aby sa križovatky „nebili“
    const posun = NAD_TERENOM + (poradie++ % 8) * 0.004;

    for (let i = 0; i < body.length; i++) {
      const [x, z] = body[i];
      // smer = priemer susedných úsekov
      const prev = body[Math.max(0, i - 1)], next = body[Math.min(body.length - 1, i + 1)];
      let dx = next[0] - prev[0], dz = next[1] - prev[1];
      const d = Math.hypot(dx, dz) || 1;
      dx /= d; dz /= d;
      const nx = -dz, nz = dx; // kolmica

      if (i > 0) v += Math.hypot(x - body[i - 1][0], z - body[i - 1][1]) / 12;

      const lx = x + nx * pol, lz = z + nz * pol;
      const px = x - nx * pol, pz = z - nz * pol;
      poz.push(lx, vyskopis.vyska(lx, lz) + posun, lz);
      poz.push(px, vyskopis.vyska(px, pz) + posun, pz);
      uv.push(0, v, 1, v);

      if (i > 0) {
        const a = zaciatok + (i - 1) * 2;
        idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
      }
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(poz, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  // ak by normály ukazovali dole, otočíme trojuholníky
  const n = geo.attributes.normal;
  if (n.count && n.getY(0) < 0) {
    for (let i = 0; i < idx.length; i += 3) [idx[i + 1], idx[i + 2]] = [idx[i + 2], idx[i + 1]];
    geo.setIndex(idx);
    geo.computeVertexNormals();
  }

  const mat = new THREE.MeshStandardMaterial({
    map: texturaCesty(), roughness: 0.92,
    polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.receiveShadow = true;
  mesh.name = 'cesty';
  return mesh;
}

/** Rozdelí dlhé úseky na kratšie (KROK metrov). */
function zjemni(body) {
  const out = [];
  for (let i = 0; i < body.length - 1; i++) {
    const [ax, az] = body[i], [bx, bz] = body[i + 1];
    const d = Math.hypot(bx - ax, bz - az);
    const n = Math.max(1, Math.ceil(d / KROK));
    for (let k = 0; k < n; k++) out.push([ax + ((bx - ax) * k) / n, az + ((bz - az) * k) / n]);
  }
  out.push(body[body.length - 1]);
  return out;
}
