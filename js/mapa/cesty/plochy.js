// Spevnené plochy – námestia, promenády (dlažba).
// Formát: { "nazov": "Hlavné námestie", "farba": "#b9ab92", "body": [[x,z], ...] }

import * as THREE from 'three';

let texturaDlazby = null;

function dlazba() {
  if (texturaDlazby) return texturaDlazby;
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = '#ffffff';
  g.fillRect(0, 0, 128, 128);
  for (let y = 0; y < 128; y += 16) {
    for (let x = (y / 16) % 2 ? 8 : 0; x < 128; x += 16) {
      const s = 215 + Math.floor(Math.random() * 35);
      g.fillStyle = `rgb(${s},${s - 4},${s - 10})`;
      g.fillRect(x + 1, y + 1, 14, 14);
    }
  }
  texturaDlazby = new THREE.CanvasTexture(c);
  texturaDlazby.wrapS = texturaDlazby.wrapT = THREE.RepeatWrapping;
  texturaDlazby.colorSpace = THREE.SRGBColorSpace;
  return texturaDlazby;
}

export function vytvorPlochy(plochy, vyskopis) {
  const skupina = new THREE.Group();
  skupina.name = 'plochy';
  for (const p of plochy ?? []) {
    const tvar = new THREE.Shape(p.body.map(([x, z]) => new THREE.Vector2(x, -z)));
    const geo = new THREE.ShapeGeometry(tvar);
    geo.rotateX(-Math.PI / 2);
    // každý bod položíme na terén
    const poz = geo.attributes.position;
    const uv = geo.attributes.uv;
    for (let i = 0; i < poz.count; i++) {
      const x = poz.getX(i), z = poz.getZ(i);
      poz.setY(i, vyskopis.vyska(x, z) + 0.16);
      uv.setXY(i, x / 6, z / 6);
    }
    geo.computeVertexNormals();
    const mat = new THREE.MeshStandardMaterial({
      color: p.farba ?? '#b9ab92', map: dlazba(), roughness: 0.9,
      polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.receiveShadow = true;
    skupina.add(mesh);
  }
  return skupina;
}
