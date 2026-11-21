// Cesty: pásy asfaltu s dopravným značením podľa pruhov, ktoré kopírujú terén (a mosty).
// Formát v dátach: { "nazov", "typ", "sirka", "pruhy", "jednosmerka", "body": [[x,z], ...] }
// Cesty s rovnakým značením sa zlučujú do jednej siete (rýchlejšie vykresľovanie).

import * as THREE from 'three';
import { texturaCesty, DLZKA_V } from './textura-cesty.js';
import { pridajStrukturu } from './struktura.js';
import { pridajOpotrebenie } from './opotrebenie.js';

const KROK = 2.5;         // delenie cesty na úseky (m), aby sedela na teréne (terén je po 2 m)
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
    const mat = pridajOpotrebenie(pridajStrukturu(new THREE.MeshStandardMaterial({
      map: texturaCesty(s.pruhy, s.jednosmerka, s.okraje), roughness: 0.9,
      polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2,
    }), 'asfalt', 3.5, 0.9), s.pruhy);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.receiveShadow = true;
    skupina.add(mesh);
  }
  return skupina;
}

/**
 * Pridá pás (cestu) do spoločnej geometrie. Normála vždy nahor.
 * V priečnom smere má pás 3 rady vrcholov (okraj – stred – okraj), aby terén v strede širokej cesty
 * nepresvital cez vozovku. V zákrute sa okraj posunie po osi uhla (pokos) – cesta sa nezúži –
 * a vnútorný okraj ostrej zákruty sa nevracia späť (pás sa neprekrúti).
 */
export function pridajPas(s, body, pol, posun, vyskopis, dlzkaV = DLZKA_V) {
  const zaciatok = s.poz.length / 3;
  let v = 0;
  let predL = null, predP = null;
  for (let i = 0; i < body.length; i++) {
    const [x, z] = body[i];
    const prev = body[Math.max(0, i - 1)], next = body[Math.min(body.length - 1, i + 1)];
    // smery úsekov pred a za bodom
    let ax = x - prev[0], az = z - prev[1], bx = next[0] - x, bz = next[1] - z;
    const la = Math.hypot(ax, az), lb = Math.hypot(bx, bz);
    if (la < 1e-6) { ax = bx; az = bz; } else { ax /= la; az /= la; }
    if (lb < 1e-6) { bx = ax; bz = az; } else { bx /= lb; bz /= lb; }
    if (la < 1e-6 && lb < 1e-6) { ax = bx = 1; az = bz = 0; }
    // normála ako os uhla, dĺžka pokosu najviac 2× šírka
    let nx = -(az + bz), nz = ax + bx;
    const ln = Math.hypot(nx, nz) || 1;
    nx /= ln; nz /= ln;
    const kos = Math.max(0.5, nx * -az + nz * ax);
    const o = pol / kos;
    const dx = ax + bx, dz = az + bz;
    if (i > 0) v += Math.hypot(x - body[i - 1][0], z - body[i - 1][1]) / dlzkaV;
    let L = [x + nx * o, z + nz * o], P = [x - nx * o, z - nz * o];
    // vnútorný okraj ostrej zákruty: ak by šiel proti smeru cesty, ostane na predošlom bode
    if (predL && (L[0] - predL[0]) * dx + (L[1] - predL[1]) * dz < 0) L = predL;
    if (predP && (P[0] - predP[0]) * dx + (P[1] - predP[1]) * dz < 0) P = predP;
    predL = L; predP = P;
    s.poz.push(L[0], vyskopis.vyska(L[0], L[1]) + posun, L[1]);
    s.poz.push(x, vyskopis.vyska(x, z) + posun, z);
    s.poz.push(P[0], vyskopis.vyska(P[0], P[1]) + posun, P[1]);
    s.uv.push(0, v, 0.5, v, 1, v);
    if (i > 0) {
      const a = zaciatok + (i - 1) * 3;
      // poradie vrcholov tak, aby normála smerovala nahor (okraj L – stred, stred – okraj P)
      s.idx.push(a, a + 3, a + 1, a + 1, a + 3, a + 4);
      s.idx.push(a + 1, a + 4, a + 2, a + 2, a + 4, a + 5);
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
