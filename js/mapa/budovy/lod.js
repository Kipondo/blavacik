// Vzdialené budovy (LOD): jednoduché vysunuté bloky bez textúr – jedna sieť na dlaždicu.
// Malé budovy sa vynechajú (z diaľky ich aj tak nevidno).

import * as THREE from 'three';
import { bodVPolygone, plochaPolygonu } from '../geometria.js';

let material = null;

export function vytvorBudovyLod(budovy, vyskopis) {
  material ??= new THREE.MeshLambertMaterial({ vertexColors: true });
  const poz = [], farby = [];
  const c = new THREE.Color(), cs = new THREE.Color();
  for (const b of budovy) {
    let body = b.body;
    if (body.length < 3 || (b.vyska < 7 && Math.abs(plochaPolygonu(body)) < 150)) continue;
    const [x0, z0] = body[0];
    const y0 = vyskopis.vyskaTerenu(x0, z0) - 1;
    const y1 = y0 + 1 + b.vyska;
    c.set(b.sklo ? '#8ea6b6' : b.farba ?? '#cfc9bd').multiplyScalar(0.92);
    cs.copy(b.strecha ? c.clone().set(b.strecha) : c.clone().multiplyScalar(0.7));
    const [ax, az] = body[0], [bx, bz] = body[1];
    const d = Math.hypot(bx - ax, bz - az) || 1;
    const vlavo = !bodVPolygone((ax + bx) / 2 - (bz - az) / d * 0.05, (az + bz) / 2 + (bx - ax) / d * 0.05, body);
    for (let i = 0; i < body.length; i++) {
      const p = body[i], q = body[(i + 1) % body.length];
      const A = [p[0], y0, p[1]], B = [q[0], y0, q[1]], C = [q[0], y1, q[1]], D = [p[0], y1, p[1]];
      const t = vlavo ? [A, B, C, A, C, D] : [A, C, B, A, D, C];
      for (const v of t) { poz.push(...v); farby.push(c.r, c.g, c.b); }
    }
    const kontura = body.map(([x, z]) => new THREE.Vector2(x, z));
    const diery = (b.diery ?? []).filter((d) => d.length >= 3);
    const vsetky = [...body, ...diery.flat()];
    for (const [i, j, k] of THREE.ShapeUtils.triangulateShape(kontura, diery.map((d) => d.map(([x, z]) => new THREE.Vector2(x, z))))) {
      const P = [vsetky[i][0], y1, vsetky[i][1]], Q = [vsetky[j][0], y1, vsetky[j][1]], R = [vsetky[k][0], y1, vsetky[k][1]];
      const ny = (Q[2] - P[2]) * (R[0] - P[0]) - (Q[0] - P[0]) * (R[2] - P[2]);
      for (const v of ny >= 0 ? [P, Q, R] : [P, R, Q]) { poz.push(...v); farby.push(cs.r, cs.g, cs.b); }
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(poz, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(farby, 3));
  geo.computeVertexNormals();
  const mesh = new THREE.Mesh(geo, material);
  mesh.name = 'budovy-lod';
  return mesh;
}
