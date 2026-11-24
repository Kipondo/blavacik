// Vikiere (strešné okná) na šikmých strechách historických budov.
//
// Porovnanie so skutočnosťou (docs/porovnanie/opravy.md): takmer každý starý dom v centre má na šikmej
// streche rad vikierov. Laser ich pri delení strechy na roviny „zahladí“, preto sa dopĺňajú pravidlom:
// pozdĺž každej obvodovej steny (nie spoločnej steny so susedom), kde strecha naozaj stúpa dovnútra
// (overí sa podľa striech z lasera), sa v rytme okenných osí postaví vikier so štítovou strieškou.
// Opravy: b.vikiere = true / false (data/mapa/opravy-budov.json).

import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { bodVPolygone } from '../geometria.js';
import { STYLY } from './fasady.js';

const ROZOSTUP = 3.6;      // m medzi vikiermi
const OKRAJ = 1.6;         // m od rohu steny
const ZAPUSTENIE = 0.75;   // m od líca steny k čelu vikiera
const BUNKA = 6;           // m – mriežka trojuholníkov striech

// ---------- geometria jedného vikiera (lokálne: x pozdĺž steny, y hore, z von od budovy; počiatok = spodok čela) ----------
let geometria = null;
function geometriaVikiera() {
  if (geometria) return geometria;
  const kusy = [];
  const farba = new THREE.Color();
  const kvader = (sx, sy, sz, x, y, z, hex) => {
    const g = new THREE.BoxGeometry(sx, sy, sz).toNonIndexed();
    g.translate(x, y, z);
    g.deleteAttribute('uv');
    farba.setHex(hex);
    const n = g.getAttribute('position').count;
    g.setAttribute('color', new THREE.BufferAttribute(Float32Array.from({ length: n * 3 }, (_, i) => [farba.r, farba.g, farba.b][i % 3]), 3));
    kusy.push(g);
  };
  const S = 1.5, V = 1.6, H = 3.2;          // šírka, výška čela, hĺbka do strechy
  kvader(S, V, 0.14, 0, V / 2, -0.07, 0xefeadf);                   // čelo (omietka)
  kvader(0.98, 1.12, 0.05, 0, 0.84, 0.005, 0xf6f3ec);              // rám okna
  kvader(0.8, 0.94, 0.05, 0, 0.84, 0.02, 0x2f3c48);                // sklo
  kvader(0.05, 0.94, 0.06, 0, 0.84, 0.03, 0xf6f3ec);               // priečka
  kvader(1.1, 0.07, 0.16, 0, 0.24, 0.05, 0xd9d3c7);                // parapet
  for (const s of [-1, 1]) kvader(0.1, V, H, s * (S / 2 - 0.05), V / 2, -H / 2, 0x7e3b2b);   // bočnice
  // štítová strieška (dva sklony)
  const sklon = 0.55, presah = 0.15;
  for (const s of [-1, 1]) {
    const g = new THREE.BoxGeometry(S / 2 + 0.2, 0.08, H + presah).toNonIndexed();
    g.rotateZ(-s * Math.atan2(sklon, S / 2 + 0.1));
    g.translate(s * (S / 4 + 0.03), V + sklon / 2, -H / 2 + presah / 2);
    g.deleteAttribute('uv');
    farba.setHex(0x8e3b29);
    const n = g.getAttribute('position').count;
    g.setAttribute('color', new THREE.BufferAttribute(Float32Array.from({ length: n * 3 }, (_, i) => [farba.r, farba.g, farba.b][i % 3]), 3));
    kusy.push(g);
  }
  // trojuholníkový štít nad čelom
  const stit = new THREE.BufferGeometry();
  stit.setAttribute('position', new THREE.Float32BufferAttribute([-S / 2, V, 0, S / 2, V, 0, 0, V + sklon, 0], 3));
  stit.computeVertexNormals();
  farba.setHex(0xefeadf);
  stit.setAttribute('color', new THREE.Float32BufferAttribute([farba.r, farba.g, farba.b, farba.r, farba.g, farba.b, farba.r, farba.g, farba.b], 3));
  kusy.push(stit);
  geometria = mergeGeometries(kusy, false);
  geometria.computeBoundingSphere();
  geometria.userData.zdielane = true;
  return geometria;
}

// ---------- jednoduchý vikier zďaleka (#110): len viditeľné plochy – čelo, okno, bočnice, strieška a štít ----------
// 13 trojuholníkov namiesto 109; rozmery a farby ako podrobný vikier
let geometriaD = null;
function geometriaVikieraDaleko() {
  if (geometriaD) return geometriaD;
  const kusy = [];
  const farba = new THREE.Color();
  const plocha = (sx, sy, uprav, hex) => {
    const g = new THREE.PlaneGeometry(sx, sy).toNonIndexed();
    g.deleteAttribute('uv');
    uprav(g);
    farba.setHex(hex);
    const n = g.getAttribute('position').count;
    g.setAttribute('color', new THREE.BufferAttribute(Float32Array.from({ length: n * 3 }, (_, i) => [farba.r, farba.g, farba.b][i % 3]), 3));
    kusy.push(g);
  };
  const S = 1.5, V = 1.6, H = 3.2, sklon = 0.55, presah = 0.15;
  plocha(S, V, (g) => g.translate(0, V / 2, 0), 0xefeadf);                       // čelo
  plocha(0.98, 1.12, (g) => g.translate(0, 0.84, 0.03), 0x3d4954);              // okno (sklo s rámom)
  for (const s of [-1, 1]) {
    plocha(H, V, (g) => { g.rotateY(s * Math.PI / 2); g.translate(s * S / 2, V / 2, -H / 2); }, 0x7e3b2b);   // bočnice
    plocha(S / 2 + 0.2, H + presah, (g) => {                                        // strieška
      g.rotateX(-Math.PI / 2);
      g.rotateZ(-s * Math.atan2(sklon, S / 2 + 0.1));
      g.translate(s * (S / 4 + 0.03), V + sklon / 2 + 0.04, -H / 2 + presah / 2);
    }, 0x8e3b29);
  }
  const stit = new THREE.BufferGeometry();
  stit.setAttribute('position', new THREE.Float32BufferAttribute([-S / 2, V, 0, S / 2, V, 0, 0, V + sklon, 0], 3));
  stit.computeVertexNormals();
  farba.setHex(0xefeadf);
  stit.setAttribute('color', new THREE.Float32BufferAttribute([farba.r, farba.g, farba.b, farba.r, farba.g, farba.b, farba.r, farba.g, farba.b], 3));
  kusy.push(stit);
  geometriaD = mergeGeometries(kusy, false);
  geometriaD.computeBoundingSphere();
  geometriaD.userData.zdielane = true;
  return geometriaD;
}

const BLIZKO = 90;    // m od kamery – bližšie podrobný vikier, ďalej jednoduchý
const POSUN = 15;     // m – po takom posune sa vikiere znova rozdelia

/**
 * Rozdelí vikiere dlaždice podľa vzdialenosti od (x, z): blízke ostanú v podrobnej sieti, vzdialené idú do
 * jednoduchej siete vedľa nej (vytvorí sa pri prvom volaní, tiež s menom „vikiere“). Volá js/mapa/dlazdice/lod-zeme.js.
 */
export function rozdelVikiere(im, x, z) {
  const ud = im.userData;
  if (ud.px !== undefined && (x - ud.px) ** 2 + (z - ud.pz) ** 2 < POSUN * POSUN) return;
  if (!ud.matice) {
    if (!im.parent) return;
    ud.matice = im.instanceMatrix.array.slice();
    ud.pocet = im.count;
    const d = new THREE.InstancedMesh(geometriaVikieraDaleko(), im.material, ud.pocet);
    d.castShadow = false;
    d.receiveShadow = true;
    d.name = 'vikiere';
    d.count = 0;
    im.parent.add(d);
    ud.daleko = d;
  }
  ud.px = x; ud.pz = z;
  const A = ud.matice, B = im.instanceMatrix.array, D = ud.daleko.instanceMatrix.array, b2 = BLIZKO * BLIZKO;
  let nb = 0, nd = 0;
  for (let i = 0; i < ud.pocet; i++) {
    const o = i * 16, dx = A[o + 12] - x, dz = A[o + 14] - z;
    if (dx * dx + dz * dz < b2) B.set(A.subarray(o, o + 16), nb++ * 16);
    else D.set(A.subarray(o, o + 16), nd++ * 16);
  }
  im.count = nb; ud.daleko.count = nd;
  for (const m of [im, ud.daleko]) {
    m.instanceMatrix.needsUpdate = true;
    // obal len okolo aktuálnych inštancií – mimo záberu sa nekreslia
    if (m.count) m.computeBoundingSphere();
  }
}

let material = null;
const ziskajMaterial = () => (material ??= new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85, metalness: 0 }));

// ---------- výška striech z lasera (trojuholníky v mriežke) ----------
function mriezkaStriech(strechy) {
  const s = strechy?.sikme;
  if (!s) return null;
  const { p, i: idx } = s;
  const m = new Map();
  for (let t = 0; t < idx.length; t += 3) {
    const a = idx[t] * 3, b = idx[t + 1] * 3, c = idx[t + 2] * 3;
    const minX = Math.min(p[a], p[b], p[c]), maxX = Math.max(p[a], p[b], p[c]);
    const minZ = Math.min(p[a + 2], p[b + 2], p[c + 2]), maxZ = Math.max(p[a + 2], p[b + 2], p[c + 2]);
    for (let i = Math.floor(minX / BUNKA); i <= Math.floor(maxX / BUNKA); i++) {
      for (let j = Math.floor(minZ / BUNKA); j <= Math.floor(maxZ / BUNKA); j++) {
        const k = i * 100003 + j;
        if (!m.has(k)) m.set(k, []);
        m.get(k).push(t);
      }
    }
  }
  return {
    /** Najvyššia šikmá strecha nad bodom (alebo null). */
    vyska(x, z) {
      const zoz = m.get(Math.floor(x / BUNKA) * 100003 + Math.floor(z / BUNKA));
      if (!zoz) return null;
      let naj = null;
      for (const t of zoz) {
        const a = idx[t] * 3, b = idx[t + 1] * 3, c = idx[t + 2] * 3;
        const x1 = p[a], z1 = p[a + 2], x2 = p[b], z2 = p[b + 2], x3 = p[c], z3 = p[c + 2];
        const d = (z2 - z3) * (x1 - x3) + (x3 - x2) * (z1 - z3);
        if (Math.abs(d) < 1e-9) continue;
        const l1 = ((z2 - z3) * (x - x3) + (x3 - x2) * (z - z3)) / d;
        const l2 = ((z3 - z1) * (x - x3) + (x1 - x3) * (z - z3)) / d;
        const l3 = 1 - l1 - l2;
        if (l1 < -1e-4 || l2 < -1e-4 || l3 < -1e-4) continue;
        const y = l1 * p[a + 1] + l2 * p[b + 1] + l3 * p[c + 1];
        if (naj === null || y > naj) naj = y;
      }
      return naj;
    },
  };
}

function maVikiere(b) {
  if (b.vikiere === false) return false;
  if (b.vikiere === true) return true;
  if (b.styl !== STYLY.stare || b.typ === 'garaz' || b.sklo) return false;
  if (!(b.tvarStrechy === 'sikma' || b.strecha)) return false;
  return (b.hreben ?? 0) >= 2.6 && b.vyska < 28;
}

/** Vikiere pre budovy dlaždice → InstancedMesh (alebo null). */
export function vytvorVikiere(budovy = [], strechy, vyskopis) {
  const roof = mriezkaStriech(strechy);
  const kandidati = budovy.filter((b) => b.body?.length >= 3 && maVikiere(b));
  if (!kandidati.length) return null;
  // susedné budovy (spoločné steny) – hrubé ohraničenia
  const okraje = budovy.map((b) => {
    let minX = Infinity, minZ = Infinity, maxX = -Infinity, maxZ = -Infinity;
    for (const [x, z] of b.body) { minX = Math.min(minX, x); maxX = Math.max(maxX, x); minZ = Math.min(minZ, z); maxZ = Math.max(maxZ, z); }
    return { b, minX, minZ, maxX, maxZ };
  });
  const vInejBudove = (x, z, ja) => okraje.some((o) => o.b !== ja && x >= o.minX && x <= o.maxX && z >= o.minZ && z <= o.maxZ && bodVPolygone(x, z, o.b.body));

  const matice = [];
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), poz = new THREE.Vector3(), jedna = new THREE.Vector3(1, 1, 1), os = new THREE.Vector3(0, 1, 0);
  for (const b of kandidati) {
    let body = b.body;
    if (body.length > 3 && body[0][0] === body[body.length - 1][0] && body[0][1] === body[body.length - 1][1]) body = body.slice(0, -1);
    let hMax = -Infinity;
    for (const [x, z] of body) hMax = Math.max(hMax, vyskopis.vyskaTerenu(x, z));
    const odkvap = hMax + (b.vyska ?? 10);
    // sklon pre jednoduché strechy (bez lasera): hrebeň nad polovicou kratšej strany
    let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
    for (const [x, z] of body) { minX = Math.min(minX, x); maxX = Math.max(maxX, x); minZ = Math.min(minZ, z); maxZ = Math.max(maxZ, z); }
    const sklonOdhad = Math.min(1.4, Math.max(0.5, (b.hreben ?? 4) / Math.max(3, Math.min(maxX - minX, maxZ - minZ, 16) / 2)));

    for (let i = 0; i < body.length; i++) {
      const [ax, az] = body[i], [bx, bz] = body[(i + 1) % body.length];
      const L = Math.hypot(bx - ax, bz - az);
      if (L < 4.2) continue;
      const ux = (bx - ax) / L, uz = (bz - az) / L;
      // normála von z budovy
      let nx = -uz, nz = ux;
      const mx = (ax + bx) / 2, mz = (az + bz) / 2;
      if (bodVPolygone(mx + nx * 0.3, mz + nz * 0.3, body)) { nx = -nx; nz = -nz; }
      // spoločná stena so susedom – bez vikierov
      if (vInejBudove(mx + nx * 1.0, mz + nz * 1.0, b)) continue;
      const pocet = Math.max(1, Math.floor((L - 2 * OKRAJ) / ROZOSTUP) + 1);
      const zac = (L - (pocet - 1) * ROZOSTUP) / 2;
      for (let k = 0; k < pocet; k++) {
        const s = pocet === 1 ? L / 2 : zac + k * ROZOSTUP;
        const px = ax + ux * s, pz = az + uz * s;
        if (vInejBudove(px + nx * 1.0, pz + nz * 1.0, b)) continue;
        // čelo vikiera ZAPUSTENIE m od steny, strecha musí ďalej dovnútra stúpať
        const fx = px - nx * ZAPUSTENIE, fz = pz - nz * ZAPUSTENIE;
        let y;
        if (roof && b.lod2) {
          const h1 = roof.vyska(px - nx * 1.0, pz - nz * 1.0), h2 = roof.vyska(px - nx * 3.0, pz - nz * 3.0);
          if (h1 === null || h2 === null) continue;
          const sklon = (h2 - h1) / 2;
          if (sklon < 0.35 || sklon > 2.2) continue;               // štít alebo plochá časť – vikier tu nie je
          if (h1 < odkvap - 0.8 || h1 > odkvap + 3) continue;
          y = h1 - sklon * (1.0 - ZAPUSTENIE) - 0.12;
        } else {
          y = odkvap + sklonOdhad * ZAPUSTENIE - 0.12;
        }
        q.setFromAxisAngle(os, Math.atan2(nx, nz));
        m.compose(poz.set(fx, y, fz), q, jedna);
        matice.push(m.clone());
      }
    }
  }
  if (!matice.length) return null;
  const im = new THREE.InstancedMesh(geometriaVikiera(), ziskajMaterial(), matice.length);
  matice.forEach((mm, i) => im.setMatrixAt(i, mm));
  // vikiere tieň nevrhajú: na strechu by padol len malý tieň, v tieňovej mape boli ~0,15 mil. △ (#110)
  im.castShadow = false;
  im.receiveShadow = true;
  im.computeBoundingSphere();
  im.name = 'vikiere';
  // zďaleka jednoduchý vikier (#110) – rozdelenie podľa polohy hráča robí js/mapa/dlazdice/lod-zeme.js
  im.userData.podlaKamery = (x, z) => rozdelVikiere(im, x, z);
  return im;
}
