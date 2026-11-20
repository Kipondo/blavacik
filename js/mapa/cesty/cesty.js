// Cesty: pásy asfaltu s dopravným značením podľa pruhov, ktoré kopírujú terén (a mosty).
// Formát v dátach: { "nazov", "typ", "sirka", "pruhy", "jednosmerka", "body": [[x,z], ...] }
// Cesty s rovnakým značením sa zlučujú do jednej siete (rýchlejšie vykresľovanie).

import * as THREE from 'three';
import { texturaCesty, DLZKA_V } from './textura-cesty.js';

const KROK = 5;           // delenie cesty na úseky (m), aby sedela na teréne
export const NAD_TERENOM = 0.12;
const S_OKRAJMI = new Set(['motorway', 'trunk', 'primary', 'motorway_link', 'trunk_link']);

export function vytvorCesty(cesty, vyskopis) {
  const skupiny = new Map();
  let poradie = 0;

  for (const c of cesty) {
    const body = zjemni(c.body, KROK);
    if (body.length < 2) continue;
    const okraje = S_OKRAJMI.has(c.typ);
    const pruhy = c.typ === 'service' || c.typ === 'living_street' ? 1 : (c.pruhy ?? 2);
    const kluc = `${pruhy}|${!!c.jednosmerka}|${okraje}`;
    if (!skupiny.has(kluc)) skupiny.set(kluc, { pruhy, jednosmerka: !!c.jednosmerka, okraje, poz: [], uv: [], idx: [] });
    const s = skupiny.get(kluc);
    // každá cesta je o kúsok vyššie, aby sa prekrývajúce sa cesty „nebili“
    const posun = NAD_TERENOM + (poradie++ % 6) * 0.005;
    pridajPas(s, body, c.sirka / 2, posun, vyskopis);
  }

  const skupina = new THREE.Group();
  skupina.name = 'cesty';
  for (const s of skupiny.values()) {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(s.poz, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(s.uv, 2));
    geo.setIndex(s.idx);
    geo.computeVertexNormals();
    const mat = new THREE.MeshStandardMaterial({
      map: texturaCesty(s.pruhy, s.jednosmerka, s.okraje), roughness: 0.9,
      polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.receiveShadow = true;
    skupina.add(mesh);
  }
  return skupina;
}

/** Pridá pás (cestu) do spoločnej geometrie. Normála vždy nahor. */
export function pridajPas(s, body, pol, posun, vyskopis, dlzkaV = DLZKA_V) {
  const zaciatok = s.poz.length / 3;
  let v = 0;
  for (let i = 0; i < body.length; i++) {
    const [x, z] = body[i];
    const prev = body[Math.max(0, i - 1)], next = body[Math.min(body.length - 1, i + 1)];
    let dx = next[0] - prev[0], dz = next[1] - prev[1];
    const d = Math.hypot(dx, dz) || 1;
    dx /= d; dz /= d;
    const nx = -dz, nz = dx;
    if (i > 0) v += Math.hypot(x - body[i - 1][0], z - body[i - 1][1]) / dlzkaV;
    const lx = x + nx * pol, lz = z + nz * pol;
    const px = x - nx * pol, pz = z - nz * pol;
    s.poz.push(lx, vyskopis.vyska(lx, lz) + posun, lz);
    s.poz.push(px, vyskopis.vyska(px, pz) + posun, pz);
    s.uv.push(0, v, 1, v);
    if (i > 0) {
      const a = zaciatok + (i - 1) * 2;
      // poradie vrcholov tak, aby normála smerovala nahor
      s.idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
    }
  }
}

/** Rozdelí dlhé úseky na kratšie. */
export function zjemni(body, krok) {
  const out = [];
  for (let i = 0; i < body.length - 1; i++) {
    const [ax, az] = body[i], [bx, bz] = body[i + 1];
    const d = Math.hypot(bx - ax, bz - az);
    const n = Math.max(1, Math.ceil(d / krok));
    for (let k = 0; k < n; k++) out.push([ax + ((bx - ax) * k) / n, az + ((bz - az) * k) / n]);
  }
  if (body.length) out.push(body[body.length - 1]);
  return out;
}
