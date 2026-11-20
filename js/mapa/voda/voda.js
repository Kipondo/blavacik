// Dunaj (a iná voda): hladina s pohyblivými vlnkami (posúvaná normálová mapa)
// a odrazom oblohy (environment map z modulu js/grafika/prostredie.js).
// Formát: { "nazov": "Dunaj", "reka": true, "body": [[x,z], ...] }

import * as THREE from 'three';

/** Opakovateľná normálová mapa vlniek (súčet sínusov – bez švov). */
function normaloveVlny() {
  const N = 256;
  const c = document.createElement('canvas');
  c.width = c.height = N;
  const g = c.getContext('2d');
  const obr = g.createImageData(N, N);
  const vlny = [];
  for (let i = 0; i < 9; i++) {
    const kx = (1 + (i * 5) % 7) * (i % 2 ? 1 : -1), kz = 1 + (i * 3) % 5;
    vlny.push({ kx, kz, a: 1 / (1 + i * 0.6), f: i * 1.7 });
  }
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      let dx = 0, dz = 0;
      for (const v of vlny) {
        const u = ((x * v.kx + y * v.kz) / N) * Math.PI * 2 + v.f;
        const c2 = Math.cos(u) * v.a;
        dx += c2 * v.kx; dz += c2 * v.kz;
      }
      const s = 0.035;
      const nx = -dx * s, nz = -dz * s, ny = 1;
      const l = Math.hypot(nx, ny, nz);
      const i = (y * N + x) * 4;
      obr.data[i] = (nx / l * 0.5 + 0.5) * 255;
      obr.data[i + 1] = (nz / l * 0.5 + 0.5) * 255;
      obr.data[i + 2] = (ny / l * 0.5 + 0.5) * 255;
      obr.data[i + 3] = 255;
    }
  }
  g.putImageData(obr, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

export function vytvorVodu(voda, KONFIG, vyskopis) {
  const skupina = new THREE.Group();
  skupina.name = 'voda';
  const vlny = normaloveVlny();
  const matReka = new THREE.MeshStandardMaterial({
    color: '#4d7c8a', roughness: 0.06, metalness: 0.3, normalMap: vlny,
    normalScale: new THREE.Vector2(0.5, 0.5), envMapIntensity: 2.2,
  });
  const matFontana = matReka.clone();
  matFontana.color.set('#4d7f8c');

  for (const v of voda ?? []) {
    const tvar = new THREE.Shape(v.body.map(([x, z]) => new THREE.Vector2(x, -z)));
    const geo = new THREE.ShapeGeometry(tvar);
    geo.rotateX(-Math.PI / 2);
    // UV podľa sveta (vlnky majú všade rovnakú veľkosť: 1 dlaždica = 24 m)
    const poz = geo.attributes.position, uv = geo.attributes.uv;
    for (let i = 0; i < poz.count; i++) uv.setXY(i, poz.getX(i) / 24, poz.getZ(i) / 24);
    const reka = v.reka !== false;
    const mesh = new THREE.Mesh(geo, reka ? matReka : matFontana);
    if (!reka) {
      const [cx, cz] = v.body[0];
      mesh.position.y = vyskopis.vyskaTerenu(cx, cz) + 0.25;
    } else if (vyskopis.hladina) {
      // hladina sa mení pozdĺž toku (celé mesto) – výška pre každý vrchol
      for (let i = 0; i < poz.count; i++) poz.setY(i, vyskopis.hladina(poz.getX(i), poz.getZ(i)));
      geo.computeVertexNormals();
    } else {
      mesh.position.y = KONFIG.HLADINA;
    }
    mesh.receiveShadow = true;
    skupina.add(mesh);
  }

  // vlnky tečú po prúde (Dunaj tečie na východ = +x)
  skupina.userData.update = (cas) => {
    vlny.offset.set(cas * 0.035, Math.sin(cas * 0.1) * 0.02);
  };
  return skupina;
}
