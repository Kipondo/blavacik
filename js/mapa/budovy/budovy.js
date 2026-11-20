// Budovy: vysunuté pôdorysy (steny s oknami + strecha).
// Budovy sa zlučujú do väčších celkov (chunkov) kvôli výkonu.
//
// Formát budovy v dátach:
//   { "body": [[x,z], ...], "vyska": 15, "farba": "#e9d8a6", "strecha": "#9c3d2b" }
// "strecha" je nepovinná – ak je zadaná a pôdorys je obdĺžnik, budova dostane valbovú strechu.

import * as THREE from 'three';
import { bodVPolygone, stredBodov } from '../geometria.js';
import { texturaOkien, OKNO_SIRKA, OKNO_VYSKA } from './textura-okien.js';

export function vytvorBudovy(budovy, vyskopis, KONFIG) {
  const chunky = new Map();
  for (const b of budovy) {
    if (!b.body || b.body.length < 3) continue;
    const [cx, cz] = stredBodov(b.body);
    const k = `${Math.floor(cx / KONFIG.VELKOST_CHUNKU)},${Math.floor(cz / KONFIG.VELKOST_CHUNKU)}`;
    if (!chunky.has(k)) chunky.set(k, []);
    chunky.get(k).push(b);
  }

  const matSteny = new THREE.MeshStandardMaterial({ map: texturaOkien(), vertexColors: true, roughness: 0.85 });
  const matStrechy = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9 });

  const skupina = new THREE.Group();
  skupina.name = 'budovy';
  for (const zoznam of chunky.values()) {
    const geo = postavGeometriu(zoznam, vyskopis);
    const mesh = new THREE.Mesh(geo, [matSteny, matStrechy]);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    skupina.add(mesh);
  }
  return skupina;
}

function postavGeometriu(budovy, vyskopis) {
  const steny = { poz: [], uv: [], farba: [] };
  const strechy = { poz: [], uv: [], farba: [] };
  const c = new THREE.Color();
  const cs = new THREE.Color();

  for (const b of budovy) {
    let body = b.body;
    if (body.length > 3 && body[0][0] === body[body.length - 1][0] && body[0][1] === body[body.length - 1][1]) {
      body = body.slice(0, -1); // uzavretý polygón – posledný bod je zbytočný
    }
    // základ na najnižšom bode terénu, výška od najvyššieho
    let hMin = Infinity, hMax = -Infinity;
    for (const [x, z] of body) {
      const h = vyskopis.vyskaTerenu(x, z);
      if (h < hMin) hMin = h;
      if (h > hMax) hMax = h;
    }
    const spodok = hMin - 1;
    const vrch = hMax + (b.vyska ?? 10);

    c.set(b.farba ?? '#d8d2c4');
    if (b.strecha) cs.set(b.strecha); else cs.copy(c).multiplyScalar(0.6);

    // smer von: otestujeme prvú stenu
    const [ax, az] = body[0], [bx, bz] = body[1];
    const mx = (ax + bx) / 2, mz = (az + bz) / 2;
    const dlz = Math.hypot(bx - ax, bz - az) || 1;
    const vonJeVlavo = !bodVPolygone(mx + (-(bz - az) / dlz) * 0.05, mz + ((bx - ax) / dlz) * 0.05, body);

    // steny
    let u = 0;
    for (let i = 0; i < body.length; i++) {
      const p = body[i], q = body[(i + 1) % body.length];
      const d = Math.hypot(q[0] - p[0], q[1] - p[1]);
      const u0 = u / (OKNO_SIRKA * 4), u1 = (u + d) / (OKNO_SIRKA * 4);
      const v0 = 0, v1 = (vrch - spodok) / (OKNO_VYSKA * 4);
      const A = [p[0], spodok, p[1]], B = [q[0], spodok, q[1]];
      const C = [q[0], vrch, q[1]], D = [p[0], vrch, p[1]];
      // normála trojuholníka (A,B,C) smeruje "vľavo" od hrany p→q
      if (vonJeVlavo) {
        pridajTroj(steny, A, B, C, [u0, v0], [u1, v0], [u1, v1], c);
        pridajTroj(steny, A, C, D, [u0, v0], [u1, v1], [u0, v1], c);
      } else {
        pridajTroj(steny, A, C, B, [u0, v0], [u1, v1], [u1, v0], c);
        pridajTroj(steny, A, D, C, [u0, v0], [u0, v1], [u1, v1], c);
      }
      u += d;
    }

    // strecha
    if (b.strecha && body.length === 4) {
      valbovaStrecha(strechy, body, vrch, cs);
    } else {
      plochaStrecha(strechy, body, vrch, cs);
    }
  }

  const geo = new THREE.BufferGeometry();
  const poz = [...steny.poz, ...strechy.poz];
  const uv = [...steny.uv, ...strechy.uv];
  const farba = [...steny.farba, ...strechy.farba];
  geo.setAttribute('position', new THREE.Float32BufferAttribute(poz, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(farba, 3));
  geo.addGroup(0, steny.poz.length / 3, 0);
  geo.addGroup(steny.poz.length / 3, strechy.poz.length / 3, 1);
  geo.computeVertexNormals();
  geo.computeBoundingSphere();
  return geo;
}

function pridajTroj(ciel, a, b, c, ua, ub, uc, farba) {
  ciel.poz.push(...a, ...b, ...c);
  ciel.uv.push(...ua, ...ub, ...uc);
  for (let i = 0; i < 3; i++) ciel.farba.push(farba.r, farba.g, farba.b);
}

/** Pridá trojuholník tak, aby normála smerovala nahor. */
function pridajTrojHore(ciel, a, b, c, farba) {
  const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2];
  const vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
  const ny = uz * vx - ux * vz;
  void uy; void vy;
  if (ny >= 0) pridajTroj(ciel, a, b, c, [0, 0], [0, 0], [0, 0], farba);
  else pridajTroj(ciel, a, c, b, [0, 0], [0, 0], [0, 0], farba);
}

function plochaStrecha(ciel, body, y, farba) {
  const kontura = body.map(([x, z]) => new THREE.Vector2(x, z));
  const troj = THREE.ShapeUtils.triangulateShape(kontura, []);
  for (const [i, j, k] of troj) {
    pridajTrojHore(ciel,
      [body[i][0], y, body[i][1]], [body[j][0], y, body[j][1]], [body[k][0], y, body[k][1]], farba);
  }
}

/** Valbová strecha pre obdĺžnikový pôdorys. */
function valbovaStrecha(ciel, body, y, farba) {
  const [p0, p1, p2, p3] = body;
  const d01 = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]);
  const d12 = Math.hypot(p2[0] - p1[0], p2[1] - p1[1]);
  // a, b, c, d = rohy tak, že a→b je dlhá strana
  const [a, b, c, d] = d01 >= d12 ? [p0, p1, p2, p3] : [p1, p2, p3, p0];
  const dlha = Math.max(d01, d12), kratka = Math.min(d01, d12);
  const vyskaStrechy = Math.min(kratka * 0.45, 7);
  const ux = (b[0] - a[0]) / dlha, uz = (b[1] - a[1]) / dlha;
  const sx = (a[0] + b[0] + c[0] + d[0]) / 4, sz = (a[1] + b[1] + c[1] + d[1]) / 4;
  const pol = Math.max(0, dlha / 2 - kratka / 2);
  const r1 = [sx - ux * pol, y + vyskaStrechy, sz - uz * pol];
  const r2 = [sx + ux * pol, y + vyskaStrechy, sz + uz * pol];
  const A = [a[0], y, a[1]], B = [b[0], y, b[1]], C = [c[0], y, c[1]], D = [d[0], y, d[1]];
  // dlhé strany (lichobežníky) a krátke strany (trojuholníky)
  pridajTrojHoreVon(ciel, A, B, r2, sx, sz, farba);
  pridajTrojHoreVon(ciel, A, r2, r1, sx, sz, farba);
  pridajTrojHoreVon(ciel, C, D, r1, sx, sz, farba);
  pridajTrojHoreVon(ciel, C, r1, r2, sx, sz, farba);
  pridajTrojHoreVon(ciel, B, C, r2, sx, sz, farba);
  pridajTrojHoreVon(ciel, D, A, r1, sx, sz, farba);
}

/** Trojuholník strechy s normálou smerom von od stredu budovy. */
function pridajTrojHoreVon(ciel, a, b, c, sx, sz, farba) {
  const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2];
  const vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
  const nx = uy * vz - uz * vy, nz = ux * vy - uy * vx;
  const mx = (a[0] + b[0] + c[0]) / 3 - sx, mz = (a[2] + b[2] + c[2]) / 3 - sz;
  if (nx * mx + nz * mz >= 0) pridajTroj(ciel, a, b, c, [0, 0], [0, 0], [0, 0], farba);
  else pridajTroj(ciel, a, c, b, [0, 0], [0, 0], [0, 0], farba);
}
