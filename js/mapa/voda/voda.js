// Dunaj (a iná voda): hladina s jemným vlnením.
// Formát: { "nazov": "Dunaj", "body": [[x,z], ...] }

import * as THREE from 'three';

export function vytvorVodu(voda, KONFIG, vyskopis) {
  const skupina = new THREE.Group();
  skupina.name = 'voda';
  const mat = new THREE.MeshStandardMaterial({
    color: '#3f6f80', roughness: 0.15, metalness: 0.25, transparent: true, opacity: 0.92,
  });

  for (const v of voda ?? []) {
    const tvar = new THREE.Shape(v.body.map(([x, z]) => new THREE.Vector2(x, -z)));
    const geo = new THREE.ShapeGeometry(tvar);
    geo.rotateX(-Math.PI / 2);
    const mesh = new THREE.Mesh(geo, mat);
    // rieka je v koryte, fontány a jazierka na úrovni zeme
    if (v.reka === false) {
      const [cx, cz] = v.body[0];
      mesh.position.y = vyskopis.vyskaTerenu(cx, cz) + 0.25;
    } else {
      mesh.position.y = KONFIG.HLADINA;
    }
    mesh.receiveShadow = true;
    skupina.add(mesh);
  }

  // jemné „vlnenie“ – mení sa farba a lesk
  skupina.userData.update = (cas) => {
    mat.roughness = 0.15 + Math.sin(cas * 0.7) * 0.05;
    mat.color.setHSL(0.54, 0.34, 0.37 + Math.sin(cas * 0.4) * 0.015);
  };
  return skupina;
}
