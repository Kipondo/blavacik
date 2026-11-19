// Kamenné nábrežné múry po okrajoch rieky (od hladiny po úroveň nábrežia)
// a nízke zábradlie navrchu.

import * as THREE from 'three';

let texturaKamena = null;
function kamen() {
  if (texturaKamena) return texturaKamena;
  const c = document.createElement('canvas');
  c.width = 128; c.height = 64;
  const g = c.getContext('2d');
  g.fillStyle = '#8f8a80';
  g.fillRect(0, 0, 128, 64);
  for (let r = 0; r < 4; r++) {
    for (let s = 0; s < 4; s++) {
      const x = s * 32 + (r % 2 ? 16 : 0), y = r * 16;
      const v = 125 + Math.floor(Math.random() * 30);
      g.fillStyle = `rgb(${v},${v - 4},${v - 10})`;
      g.fillRect(x + 1, y + 1, 30, 14);
      g.fillRect(x - 128 + 1, y + 1, 30, 14);
    }
  }
  texturaKamena = new THREE.CanvasTexture(c);
  texturaKamena.wrapS = texturaKamena.wrapT = THREE.RepeatWrapping;
  texturaKamena.colorSpace = THREE.SRGBColorSpace;
  return texturaKamena;
}

export function vytvorNabrezneMury(voda, vyskopis, KONFIG) {
  const H = KONFIG.HRANICE;
  const poz = [], uv = [];
  const zabradlie = [];
  const dole = KONFIG.HLADINA - 1;

  for (const v of voda ?? []) {
    if (v.reka === false) continue;
    const body = v.body;
    for (let i = 0; i < body.length; i++) {
      const [ax, az] = body[i], [bx, bz] = body[(i + 1) % body.length];
      if (Math.max(ax, bx) < H.minX || Math.min(ax, bx) > H.maxX || Math.max(az, bz) < H.minZ || Math.min(az, bz) > H.maxZ) continue;
      const d = Math.hypot(bx - ax, bz - az);
      const n = Math.max(1, Math.ceil(d / 6));
      // kolmica von z vody (pozrieme, na ktorej strane je súš)
      const nx = -(bz - az) / d, nz = (bx - ax) / d;
      for (let k = 0; k < n; k++) {
        const x0 = ax + ((bx - ax) * k) / n, z0 = az + ((bz - az) * k) / n;
        const x1 = ax + ((bx - ax) * (k + 1)) / n, z1 = az + ((bz - az) * (k + 1)) / n;
        // vrch múru = výška terénu kúsok od vody (na súši)
        const h0a = vyskopis.vyskaTerenu(x0 + nx * 3, z0 + nz * 3), h0b = vyskopis.vyskaTerenu(x0 - nx * 3, z0 - nz * 3);
        const h1a = vyskopis.vyskaTerenu(x1 + nx * 3, z1 + nz * 3), h1b = vyskopis.vyskaTerenu(x1 - nx * 3, z1 - nz * 3);
        const h0 = Math.max(h0a, h0b), h1 = Math.max(h1a, h1b);
        if (h0 < dole + 0.5 && h1 < dole + 0.5) continue;
        // obojstranný múr (DoubleSide) – netreba riešiť orientáciu
        const u0 = (k * d) / n / 4, u1 = ((k + 1) * d) / n / 4;
        poz.push(x0, dole, z0, x1, dole, z1, x1, h1 + 0.05, z1, x0, dole, z0, x1, h1 + 0.05, z1, x0, h0 + 0.05, z0);
        uv.push(u0, 0, u1, 0, u1, (h1 - dole) / 2, u0, 0, u1, (h1 - dole) / 2, u0, (h0 - dole) / 2);
        if (h0 > -1 && h1 > -1) zabradlie.push([x0, h0, z0, x1, h1, z1]);
      }
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(poz, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.computeVertexNormals();
  const mur = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: kamen(), roughness: 0.95, side: THREE.DoubleSide }));
  mur.receiveShadow = true;
  mur.name = 'nabrezne-mury';

  // zábradlie ako jedna sieť tenkých kvádrov
  const skupina = new THREE.Group();
  skupina.add(mur);
  if (zabradlie.length) {
    const geoZ = new THREE.BoxGeometry(1, 1, 1);
    const im = new THREE.InstancedMesh(geoZ, new THREE.MeshStandardMaterial({ color: '#3d4144', roughness: 0.6, metalness: 0.5 }), zabradlie.length);
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
    zabradlie.forEach(([x0, h0, z0, x1, h1, z1], i) => {
      const d = Math.hypot(x1 - x0, z1 - z0);
      e.set(0, Math.atan2(x1 - x0, z1 - z0), 0);
      q.setFromEuler(e);
      m.compose(new THREE.Vector3((x0 + x1) / 2, (h0 + h1) / 2 + 0.55, (z0 + z1) / 2), q, new THREE.Vector3(0.12, 1.1, d));
      im.setMatrixAt(i, m);
    });
    im.computeBoundingSphere();
    skupina.add(im);
  }
  return skupina;
}
