// Budovy: vysunuté pôdorysy (steny s fasádou + strecha).
// Budovy sa zlučujú do väčších celkov (chunkov) kvôli výkonu.
//
// Formát budovy v dátach:
//   { "body": [[x,z], ...], "vyska": 15, "farba": "#e9d8a6", "strecha": "#9c3d2b", "sklo": true,
//     "diery": [[[x,z], ...]], "zdrojVysky": "lidar"|"osm"|"odhad", "tvarStrechy": "plocha"|"sikma",
//     "hreben": 4.2, "lod2": 1 }
// "strecha" – farba šikmej strechy; obdĺžnikový pôdorys dostane valbovú strechu (výška = "hreben", ak je známy).
// "lod2" – budova má strechu z laserového skenovania (js/mapa/budovy/strechy-lod2.js), tu len plochý kryt.
// "diery" – vnútorné dvory (steny aj do dvora, kryt strechy s otvorom).
// "sklo" = sklenená fasáda (mrakodrapy, nákupné centrá).
// Fasády (okná s rámom, rímsy, výklady, dvere) sú v js/mapa/budovy/fasady.js – tu sa ráta UV v jednotkách
// okenných osí a podlaží, aby sa okná na rohoch nerezali a podlažia sedeli s výškou budovy.

import * as THREE from 'three';
import { bodVPolygone, stredBodov } from '../geometria.js';
import { materialFasad, STYLY, PARAMETRE } from './fasady.js';
import { texturaSkla } from '../pamiatky/textury.js';
import { stanovaStrecha } from './stanova-strecha.js';

let materialy = null;
function ziskajMaterialy() {
  if (materialy) return materialy;
  const steny = materialFasad();
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

/** Štýl fasády podľa výšky, strechy a polohy (deterministicky). */
function typFasady(b, cx, cz) {
  if (b.strecha) return STYLY.stare;
  const h = Math.abs(Math.round(cx * 3 + cz * 5));
  if (b.vyska >= 22 && cz > 780) return STYLY.obytne;           // Petržalka
  if (b.vyska >= 28) return h % 3 ? STYLY.kancelarie : STYLY.obytne;
  return [STYLY.jednoduche, STYLY.obytne, STYLY.jednoduche, STYLY.stare][h % 4];
}

/** Pásy steny podľa výšky: sokel, prízemie, poschodia, atika → [y0, y1, v0, v1]. */
function pasyFasady(spodok, zaklad, vrch, par) {
  const H = vrch - zaklad;
  const pasy = [];
  if (zaklad > spodok) pasy.push([spodok, zaklad, (spodok - zaklad) / par.prizemie, 0]);
  if (H <= 0.5) return pasy;
  if (H < par.prizemie + 1.2) {                       // prízemná budova: prízemie + nízka atika
    const hp = Math.max(0.5, H - 0.45);
    pasy.push([zaklad, zaklad + hp, 0, 1], [zaklad + hp, vrch, 100, 101]);
    return pasy;
  }
  const f = Math.max(0, Math.floor((H - par.prizemie - 0.55) / par.podlazie));
  const atika = Math.min(1.1, Math.max(0.55, H - par.prizemie - f * par.podlazie));
  const hf = f > 0 ? (H - par.prizemie - atika) / f : 0;
  const y1 = zaklad + par.prizemie, y2 = y1 + f * hf;
  pasy.push([zaklad, y1, 0, 1]);
  if (f > 0) pasy.push([y1, y2, 1, 1 + f]);
  pasy.push([y2, vrch, 100, 101]);
  return pasy;
}

function postavGeometriu(budovy, vyskopis) {
  const skupiny = [0, 1, 2].map(() => ({ poz: [], uv: [], farba: [], typ: [], metre: [] }));
  const [steny, sklo, strechy] = skupiny;
  const c = new THREE.Color(), cs = new THREE.Color();

  for (const b of budovy) {
    let body = b.body;
    if (body.length > 3 && body[0][0] === body[body.length - 1][0] && body[0][1] === body[body.length - 1][1]) {
      body = body.slice(0, -1);
    }
    const diery = (b.diery ?? []).filter((d) => d.length >= 3);
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
    const par = PARAMETRE[typ];
    const seed = ((Math.abs(Math.round(cx * 7.13 + cz * 3.71)) % 97) / 97) * 0.9;
    const ciel = b.sklo ? sklo : steny;
    const nahodaFarby = 0.94 + 0.12 * (((Math.abs(Math.round(cx * 13 + cz * 7))) % 11) / 10);

    c.set(b.farba ?? '#d8d2c4').multiplyScalar(nahodaFarby);
    if (b.strecha) cs.set(b.strecha); else cs.copy(c).multiplyScalar(0.55).lerp(new THREE.Color('#77736c'), 0.5);

    const vnutri = (x, z) => bodVPolygone(x, z, body) && !diery.some((d) => bodVPolygone(x, z, d));
    const pasy = b.sklo ? [[spodok, vrch, 0, 0]] : pasyFasady(spodok, hMax, vrch, par);

    for (const kruh of [body, ...diery]) {
      // smer von (od hmoty budovy): otestujeme prvú stenu kruhu
      const [ax, az] = kruh[0], [bx, bz] = kruh[1];
      const dlz = Math.hypot(bx - ax, bz - az) || 1;
      const vonJeVlavo = !vnutri((ax + bx) / 2 + (-(bz - az) / dlz) * 0.05, (az + bz) / 2 + ((bx - ax) / dlz) * 0.05);
      for (let i = 0; i < kruh.length; i++) {
        const p = kruh[i], q = kruh[(i + 1) % kruh.length];
        const d = Math.hypot(q[0] - p[0], q[1] - p[1]);
        if (d < 0.05) continue;
        // okenné osi: celé číslo na stenu (krátke steny bez okien)
        const osi = d < par.os * 0.6 ? 0 : Math.max(1, Math.round(d / par.os));
        // slepá stena (bez okien) má u od 200 – spojitá UV kvôli normálovej mape, shader v nej okná nekreslí
        const u0 = osi === 0 && !b.sklo ? 200 : 0, u1 = b.sklo ? d / 3 : osi === 0 ? 200 + d / par.os : osi;
        for (const [y0, y1, v0, v1] of pasy) {
          if (y1 - y0 < 0.01) continue;
          const vv0 = b.sklo ? (y0 - spodok) / 3.4 : v0, vv1 = b.sklo ? (y1 - spodok) / 3.4 : v1;
          const A = [p[0], y0, p[1]], B = [q[0], y0, q[1]];
          const C = [q[0], y1, q[1]], D = [p[0], y1, p[1]];
          const mA = [0, y0], mB = [d, y0], mC = [d, y1], mD = [0, y1];
          if (vonJeVlavo) {
            troj(ciel, A, B, C, [u0, vv0], [u1, vv0], [u1, vv1], c, c, c, typ + seed, mA, mB, mC);
            troj(ciel, A, C, D, [u0, vv0], [u1, vv1], [u0, vv1], c, c, c, typ + seed, mA, mC, mD);
          } else {
            troj(ciel, A, C, B, [u0, vv0], [u1, vv1], [u1, vv0], c, c, c, typ + seed, mA, mC, mB);
            troj(ciel, A, D, C, [u0, vv0], [u0, vv1], [u1, vv1], c, c, c, typ + seed, mA, mD, mC);
          }
        }
      }
    }

    const valbova = b.strecha && !b.lod2 && b.tvarStrechy !== 'plocha' && body.length === 4 && !diery.length;
    if (valbova) valbovaStrecha(strechy, body, vrch, cs, b.hreben);
    // neobdĺžnikový dom so šikmou strechou: stanová strecha (js/mapa/budovy/stanova-strecha.js)
    else if (!(b.strecha && !b.lod2 && b.tvarStrechy !== 'plocha' && !diery.length
      && stanovaStrecha(body, vrch, b.hreben, (A, B, C) => trojVon(strechy, A, B, C, cs, (n) => n[1] > 0)))) plochaStrecha(strechy, body, diery, vrch, cs);
  }

  const geo = new THREE.BufferGeometry();
  const spoj = (k) => skupiny.flatMap((s) => s[k]);
  geo.setAttribute('position', new THREE.Float32BufferAttribute(spoj('poz'), 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(spoj('uv'), 2));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(spoj('farba'), 3));
  geo.setAttribute('aTyp', new THREE.Float32BufferAttribute(spoj('typ'), 1));
  geo.setAttribute('aMetre', new THREE.Float32BufferAttribute(spoj('metre'), 2));
  let zac = 0;
  skupiny.forEach((s, i) => { geo.addGroup(zac, s.poz.length / 3, i); zac += s.poz.length / 3; });
  geo.computeVertexNormals();
  geo.computeBoundingSphere();
  return geo;
}

function troj(ciel, a, b, c, ua, ub, uc, fa, fb, fc, typ = 0, ma = [0, 0], mb = [0, 0], mc = [0, 0]) {
  ciel.poz.push(...a, ...b, ...c);
  ciel.uv.push(...ua, ...ub, ...uc);
  ciel.farba.push(fa.r, fa.g, fa.b, fb.r, fb.g, fb.b, fc.r, fc.g, fc.b);
  ciel.typ.push(typ, typ, typ);
  ciel.metre.push(...ma, ...mb, ...mc);
}

function trojVon(ciel, a, b, c, farba, test) {
  const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2];
  const vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
  const n = [uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx];
  if (test(n, a, b, c)) troj(ciel, a, b, c, [0, 0], [0, 0], [0, 0], farba, farba, farba);
  else troj(ciel, a, c, b, [0, 0], [0, 0], [0, 0], farba, farba, farba);
}

function plochaStrecha(ciel, body, diery, y, farba) {
  const kontura = body.map(([x, z]) => new THREE.Vector2(x, z));
  const otvory = diery.map((d) => d.map(([x, z]) => new THREE.Vector2(x, z)));
  const vsetky = [...body, ...diery.flat()];
  for (const [i, j, k] of THREE.ShapeUtils.triangulateShape(kontura, otvory)) {
    trojVon(ciel, [vsetky[i][0], y, vsetky[i][1]], [vsetky[j][0], y, vsetky[j][1]], [vsetky[k][0], y, vsetky[k][1]], farba, (n) => n[1] >= 0);
  }
}

/** Valbová strecha pre obdĺžnikový pôdorys. */
function valbovaStrecha(ciel, body, y, farba, hreben) {
  const [p0, p1, p2, p3] = body;
  const d01 = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]);
  const d12 = Math.hypot(p2[0] - p1[0], p2[1] - p1[1]);
  const [a, b, c, d] = d01 >= d12 ? [p0, p1, p2, p3] : [p1, p2, p3, p0];
  const dlha = Math.max(d01, d12), kratka = Math.min(d01, d12);
  const vyskaStrechy = hreben > 0.5 ? Math.min(hreben, kratka * 0.8) : Math.min(kratka * 0.45, 7);
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
