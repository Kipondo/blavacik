// Budovy: vysunuté pôdorysy (steny s oknami + strecha).
// Budovy sa zlučujú do väčších celkov (chunkov) kvôli výkonu.
//
// Formát budovy v dátach:
//   { "body": [[x,z], ...], "vyska": 15, "farba": "#e9d8a6", "strecha": "#9c3d2b", "sklo": true }
// "strecha" je nepovinná – ak je zadaná a pôdorys je obdĺžnik, budova dostane valbovú strechu.
// "sklo" = sklenená fasáda (mrakodrapy, nákupné centrá).

import * as THREE from 'three';
import { bodVPolygone, stredBodov } from '../geometria.js';
import { texturaFasad, pripravMaterialFasady, OKNO_SIRKA, OKNO_VYSKA, TYPY } from './textury-fasad.js';
import { texturaSkla } from '../pamiatky/textury.js';

let materialy = null;
function ziskajMaterialy() {
  if (materialy) return materialy;
  const steny = pripravMaterialFasady(new THREE.MeshStandardMaterial({ map: texturaFasad(), vertexColors: true, roughness: 0.88 }));
  const sklo = new THREE.MeshStandardMaterial({ map: texturaSkla(), vertexColors: true, roughness: 0.12, metalness: 0.65, envMapIntensity: 1.3 });
  const strechy = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.92 });
  materialy = [steny, sklo, strechy];
  return materialy;
}

export function vytvorBudovy(budovy, vyskopis, KONFIG) {
  const chunky = new Map();
  for (const b of budovy) {
    if (!b.body || b.body.length < 3) continue;
    const [cx, cz] = stredBodov(b.body);
    const k = `${Math.floor(cx / KONFIG.VELKOST_CHUNKU)},${Math.floor(cz / KONFIG.VELKOST_CHUNKU)}`;
    if (!chunky.has(k)) chunky.set(k, []);
    chunky.get(k).push(b);
  }

  const skupina = new THREE.Group();
  skupina.name = 'budovy';
  for (const zoznam of chunky.values()) {
    const mesh = new THREE.Mesh(postavGeometriu(zoznam, vyskopis), ziskajMaterialy());
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    skupina.add(mesh);
  }
  return skupina;
}

/** Typ fasády podľa výšky, strechy a polohy (deterministicky). */
function typFasady(b, cx, cz) {
  if (b.strecha) return TYPY.stare;
  const h = Math.abs(Math.round(cx * 3 + cz * 5));
  if (b.vyska >= 22 && cz > 780) return TYPY.obytne;           // Petržalka
  if (b.vyska >= 28) return h % 3 ? TYPY.kancelarie : TYPY.obytne;
  return [TYPY.jednoduche, TYPY.obytne, TYPY.jednoduche, TYPY.stare][h % 4];
}

function postavGeometriu(budovy, vyskopis) {
  const skupiny = [0, 1, 2].map(() => ({ poz: [], uv: [], farba: [], typ: [] }));
  const [steny, sklo, strechy] = skupiny;
  const c = new THREE.Color(), cs = new THREE.Color(), cd = new THREE.Color();

  for (const b of budovy) {
    let body = b.body;
    if (body.length > 3 && body[0][0] === body[body.length - 1][0] && body[0][1] === body[body.length - 1][1]) {
      body = body.slice(0, -1);
    }
    let hMin = Infinity, hMax = -Infinity;
    for (const [x, z] of body) {
      const h = vyskopis.vyskaTerenu(x, z);
      if (h < hMin) hMin = h;
      if (h > hMax) hMax = h;
    }
    const spodok = hMin - 1;
    const vrch = hMax + (b.vyska ?? 10);
    const [cx, cz] = stredBodov(body);
    const typ = typFasady(b, cx, cz);
    const ciel = b.sklo ? sklo : steny;

    c.set(b.farba ?? '#d8d2c4');
    cd.copy(c).multiplyScalar(0.62);           // tmavší sokel – budova „sedí“ na zemi
    if (b.strecha) cs.set(b.strecha); else cs.copy(c).multiplyScalar(0.55).lerp(new THREE.Color('#77736c'), 0.5);

    // smer von: otestujeme prvú stenu
    const [ax, az] = body[0], [bx, bz] = body[1];
    const mx = (ax + bx) / 2, mz = (az + bz) / 2;
    const dlz = Math.hypot(bx - ax, bz - az) || 1;
    const vonJeVlavo = !bodVPolygone(mx + (-(bz - az) / dlz) * 0.05, mz + ((bx - ax) / dlz) * 0.05, body);

    const tile = b.sklo ? [3, 3.4] : [OKNO_SIRKA * 4, OKNO_VYSKA * 4];
    let u = 0;
    for (let i = 0; i < body.length; i++) {
      const p = body[i], q = body[(i + 1) % body.length];
      const d = Math.hypot(q[0] - p[0], q[1] - p[1]);
      // okná zarovnané na celé dlaždice, aby sa na rohu nerozrezali
      const u0 = Math.round(u / tile[0] * 4) / 4, u1 = u0 + Math.max(0.25, Math.round(d / tile[0] * 4) / 4);
      // dva pásy: tmavší sokel (prechod do farby fasády) a zvyšok steny
      const sokel = Math.min(vrch, spodok + 4.5);
      for (const [y0, y1, f0, f1] of [[spodok, sokel, cd, c], [sokel, vrch, c, c]]) {
        if (y1 - y0 < 0.01) continue;
        const v0 = (y0 - spodok) / tile[1], v1 = (y1 - spodok) / tile[1];
        const A = [p[0], y0, p[1]], B = [q[0], y0, q[1]];
        const C = [q[0], y1, q[1]], D = [p[0], y1, p[1]];
        if (vonJeVlavo) {
          troj(ciel, A, B, C, [u0, v0], [u1, v0], [u1, v1], f0, f0, f1, typ);
          troj(ciel, A, C, D, [u0, v0], [u1, v1], [u0, v1], f0, f1, f1, typ);
        } else {
          troj(ciel, A, C, B, [u0, v0], [u1, v1], [u1, v0], f0, f1, f0, typ);
          troj(ciel, A, D, C, [u0, v0], [u0, v1], [u1, v1], f0, f1, f1, typ);
        }
      }
      u += d;
    }

    if (b.strecha && body.length === 4) valbovaStrecha(strechy, body, vrch, cs);
    else plochaStrecha(strechy, body, vrch, cs);
  }

  const geo = new THREE.BufferGeometry();
  const spoj = (k) => skupiny.flatMap((s) => s[k]);
  geo.setAttribute('position', new THREE.Float32BufferAttribute(spoj('poz'), 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(spoj('uv'), 2));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(spoj('farba'), 3));
  geo.setAttribute('aTyp', new THREE.Float32BufferAttribute(spoj('typ'), 1));
  let zac = 0;
  skupiny.forEach((s, i) => { geo.addGroup(zac, s.poz.length / 3, i); zac += s.poz.length / 3; });
  geo.computeVertexNormals();
  geo.computeBoundingSphere();
  return geo;
}

function troj(ciel, a, b, c, ua, ub, uc, fa, fb, fc, typ = 0) {
  ciel.poz.push(...a, ...b, ...c);
  ciel.uv.push(...ua, ...ub, ...uc);
  ciel.farba.push(fa.r, fa.g, fa.b, fb.r, fb.g, fb.b, fc.r, fc.g, fc.b);
  ciel.typ.push(typ, typ, typ);
}

function trojVon(ciel, a, b, c, farba, test) {
  const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2];
  const vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
  const n = [uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx];
  if (test(n, a, b, c)) troj(ciel, a, b, c, [0, 0], [0, 0], [0, 0], farba, farba, farba);
  else troj(ciel, a, c, b, [0, 0], [0, 0], [0, 0], farba, farba, farba);
}

function plochaStrecha(ciel, body, y, farba) {
  const kontura = body.map(([x, z]) => new THREE.Vector2(x, z));
  for (const [i, j, k] of THREE.ShapeUtils.triangulateShape(kontura, [])) {
    trojVon(ciel, [body[i][0], y, body[i][1]], [body[j][0], y, body[j][1]], [body[k][0], y, body[k][1]], farba, (n) => n[1] >= 0);
  }
}

/** Valbová strecha pre obdĺžnikový pôdorys. */
function valbovaStrecha(ciel, body, y, farba) {
  const [p0, p1, p2, p3] = body;
  const d01 = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]);
  const d12 = Math.hypot(p2[0] - p1[0], p2[1] - p1[1]);
  const [a, b, c, d] = d01 >= d12 ? [p0, p1, p2, p3] : [p1, p2, p3, p0];
  const dlha = Math.max(d01, d12), kratka = Math.min(d01, d12);
  const vyskaStrechy = Math.min(kratka * 0.45, 7);
  const ux = (b[0] - a[0]) / dlha, uz = (b[1] - a[1]) / dlha;
  const sx = (a[0] + b[0] + c[0] + d[0]) / 4, sz = (a[1] + b[1] + c[1] + d[1]) / 4;
  const pol = Math.max(0, dlha / 2 - kratka / 2);
  const r1 = [sx - ux * pol, y + vyskaStrechy, sz - uz * pol];
  const r2 = [sx + ux * pol, y + vyskaStrechy, sz + uz * pol];
  const A = [a[0], y, a[1]], B = [b[0], y, b[1]], C = [c[0], y, c[1]], D = [d[0], y, d[1]];
  const von = (n, p, q, r) => n[0] * ((p[0] + q[0] + r[0]) / 3 - sx) + n[2] * ((p[2] + q[2] + r[2]) / 3 - sz) >= 0;
  trojVon(ciel, A, B, r2, farba, von);
  trojVon(ciel, A, r2, r1, farba, von);
  trojVon(ciel, C, D, r1, farba, von);
  trojVon(ciel, C, r1, r2, farba, von);
  trojVon(ciel, B, C, r2, farba, von);
  trojVon(ciel, D, A, r1, farba, von);
}
