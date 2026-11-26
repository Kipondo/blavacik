// Budovy (variant 2+): jednoduché hranoly z model/data/budovy.json (tools/model/budovy.py) – obrys z OSM, spodok na
// najnižšom bode terénu, vrch podľa výšky z laseru. Steny a strechy sú dve zlúčené siete (dve volania kreslenia).

import * as THREE from 'three';
import { FARBY } from './farby.js';

export async function nacitajBudovy(scena) {
  const data = await (await fetch('data/budovy.json')).json();
  const steny = [], strechy = [];
  const ccw = (b) => { let a = 0; for (let i = 0; i < b.length; i++) { const p = b[i], q = b[(i + 1) % b.length]; a += p[0] * q[1] - q[0] * p[1]; } return a > 0; };
  for (const bud of data.budovy) {
    const ringy = [bud.b, ...(bud.d ?? [])];
    for (const r of ringy) {
      for (let i = 0; i < r.length; i++) {
        const [ax, az] = r[i], [bx, bz] = r[(i + 1) % r.length];
        steny.push(ax, bud.y0, az, bx, bud.y0, bz, bx, bud.y1, bz, ax, bud.y0, az, bx, bud.y1, bz, ax, bud.y1, az);
      }
    }
    // strecha (rovná) s dvormi
    const obrys = bud.b.map(([x, z]) => new THREE.Vector2(x, z));
    const diery = (bud.d ?? []).map((d) => d.map(([x, z]) => new THREE.Vector2(x, z)));
    const vsetky = [obrys, ...diery].flat();
    for (const [a, b, c] of THREE.ShapeUtils.triangulateShape(obrys, diery)) {
      for (const k of [a, b, c]) strechy.push(vsetky[k].x, bud.y1, vsetky[k].y);
    }
    void ccw;
  }
  const siet = (poz, farba) => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(poz, 3));
    g.computeVertexNormals();
    const m = new THREE.Mesh(g, new THREE.MeshLambertMaterial({ color: farba, side: THREE.DoubleSide }));
    m.castShadow = true; m.receiveShadow = true;
    return m;
  };
  const skupina = new THREE.Group();
  skupina.name = 'budovy';
  skupina.add(siet(steny, FARBY.budova), siet(strechy, FARBY.strecha));
  scena.add(skupina);
  return skupina;
}
