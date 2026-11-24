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

const BUNKA = 500;   // m – veľkosť kúska múrov a zábradlia

export function vytvorNabrezneMury(voda, vyskopis, KONFIG) {
  const H = KONFIG.HRANICE;
  // po štvorcoch BUNKA (#110): múry celého mesta boli jedna sieť (~95 tis. trojuholníkov) a kreslili sa celé
  // z ktoréhokoľvek miesta; po kúskoch sa tie mimo záberu a za koncom hmly (userData.dohlad) nekreslia
  const kusy = new Map();
  const kus = (x, z) => {
    const k = `${Math.floor(x / BUNKA)},${Math.floor(z / BUNKA)}`;
    if (!kusy.has(k)) kusy.set(k, { poz: [], uv: [], farby: [], zabradlie: [] });
    return kusy.get(k);
  };

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
        const dole = (vyskopis.hladina ? vyskopis.hladina((x0 + x1) / 2, (z0 + z1) / 2) : KONFIG.HLADINA) - 1;
        if (h0 < dole + 0.5 && h1 < dole + 0.5) continue;
        // v centre kamenný múr, ďalej od centra prírodný breh (hlina a tráva)
        const priroda = Math.hypot((x0 + x1) / 2, (z0 + z1) / 2 - 300) > 2600 ? 1 : 0;
        const { poz, uv, farby, zabradlie } = kus((x0 + x1) / 2, (z0 + z1) / 2);
        for (let q = 0; q < 6; q++) farby.push(...(priroda ? [0.55, 0.6, 0.42] : [1, 1, 1]));
        // obojstranný múr (DoubleSide) – netreba riešiť orientáciu
        const u0 = (k * d) / n / 4, u1 = ((k + 1) * d) / n / 4;
        poz.push(x0, dole, z0, x1, dole, z1, x1, h1 + 0.05, z1, x0, dole, z0, x1, h1 + 0.05, z1, x0, h0 + 0.05, z0);
        uv.push(u0, 0, u1, 0, u1, (h1 - dole) / 2, u0, 0, u1, (h1 - dole) / 2, u0, (h0 - dole) / 2);
        if (h0 > dole + 3 && h1 > dole + 3 && !priroda) zabradlie.push([x0, h0, z0, x1, h1, z1]);
      }
    }
  }

  const skupina = new THREE.Group();
  const matMur = new THREE.MeshStandardMaterial({ map: kamen(), vertexColors: true, roughness: 0.95, side: THREE.DoubleSide });
  const matZabradlie = new THREE.MeshStandardMaterial({ color: '#3d4144', roughness: 0.6, metalness: 0.5 });
  const geoZ = new THREE.BoxGeometry(1, 1, 1);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
  for (const { poz, uv, farby, zabradlie } of kusy.values()) {
    if (!poz.length) continue;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(poz, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(farby, 3));
    geo.computeVertexNormals();
    const mur = new THREE.Mesh(geo, matMur);
    mur.receiveShadow = true;
    mur.name = 'nabrezne-mury';
    geo.computeBoundingSphere();
    const obal = geo.boundingSphere;
    mur.userData.dohlad = { x: obal.center.x, z: obal.center.z, r: obal.radius };
    skupina.add(mur);

    // zábradlie ako jedna sieť tenkých kvádrov (na štvorec)
    if (!zabradlie.length) continue;
    const im = new THREE.InstancedMesh(geoZ, matZabradlie, zabradlie.length);
    zabradlie.forEach(([x0, h0, z0, x1, h1, z1], i) => {
      const d = Math.hypot(x1 - x0, z1 - z0);
      e.set(0, Math.atan2(x1 - x0, z1 - z0), 0);
      q.setFromEuler(e);
      m.compose(new THREE.Vector3((x0 + x1) / 2, (h0 + h1) / 2 + 0.55, (z0 + z1) / 2), q, new THREE.Vector3(0.12, 1.1, d));
      im.setMatrixAt(i, m);
    });
    im.computeBoundingSphere();
    im.name = 'zabradlie-nabrezia';
    im.userData.dohlad = { x: im.boundingSphere.center.x, z: im.boundingSphere.center.z, r: im.boundingSphere.radius };
    skupina.add(im);
  }
  return skupina;
}
