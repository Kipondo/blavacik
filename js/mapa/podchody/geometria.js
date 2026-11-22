// Geometria podchodov dlaždice: podzemné chodby (podlaha, steny, strop, svietidlá), schody so zábradlím,
// steny jamy schodiska s parapetom a obrubou na povrchu. Steny idú po hranici zjednotenia všetkých tub
// (kúsky steny, ktoré ležia vnútri inej tuby, sa vynechajú) – tak sa chodby na križovaní a pod schodmi
// samy otvoria. Materiál: betónové dlaždice (assets/textury/beton, CC0) mapované v metroch.

import * as THREE from 'three';
import { HLBKA, VYSKA, voTube } from './tuby.js';

const KUS = 0.5;              // m – dĺžka kúska steny pri orezávaní
const OBLUK = 10;             // počet kúskov polkruhu na konci chodby
const SCHOD = 0.165;          // m – výška schodu

let materialy = null;
function ziskajMaterialy() {
  if (materialy) return materialy;
  const l = new THREE.TextureLoader();
  const t = (s, srgb) => {
    const x = l.load(`assets/textury/beton/${s}.jpg`);
    x.wrapS = x.wrapT = THREE.RepeatWrapping; x.anisotropy = 8;
    if (srgb) x.colorSpace = THREE.SRGBColorSpace;
    return x;
  };
  materialy = {
    betón: new THREE.MeshStandardMaterial({ map: t('farba', true), normalMap: t('normal', false), vertexColors: true, roughness: 0.85, side: THREE.FrontSide }),
    kov: new THREE.MeshStandardMaterial({ color: '#3a3d40', metalness: 0.7, roughness: 0.4 }),
    svetlo: new THREE.MeshBasicMaterial({ color: '#fff6e0' }),
  };
  return materialy;
}

class Zberac {
  constructor() { this.poz = []; this.uv = []; this.farba = []; }
  /** Štvoruholník a, b, c, d (proti smeru hodinových ručičiek pri pohľade na prednú stranu). */
  stvor(a, b, c, d, uv, f) {
    this.poz.push(...a, ...b, ...c, ...a, ...c, ...d);
    const [ua, ub, uc, ud] = uv;
    this.uv.push(...ua, ...ub, ...uc, ...ua, ...uc, ...ud);
    for (let i = 0; i < 6; i++) this.farba.push(f.r, f.g, f.b);
  }
  troj(a, b, c, uv, f) {
    this.poz.push(...a, ...b, ...c);
    this.uv.push(...uv[0], ...uv[1], ...uv[2]);
    for (let i = 0; i < 3; i++) this.farba.push(f.r, f.g, f.b);
  }
  /** Kváder osovo pozdĺž smeru (ex, ez): stred úsečky a→b, šírka w (naprieč), výška y0..y1 (na oboch koncoch). */
  kvader(ax, az, bx, bz, w, ya0, ya1, yb0, yb1, f) {
    const dx = bx - ax, dz = bz - az, l = Math.hypot(dx, dz) || 1;
    const nx = -dz / l * w / 2, nz = dx / l * w / 2;
    const P = (x, y, z) => [x, y, z];
    const A0 = P(ax - nx, ya0, az - nz), A1 = P(ax + nx, ya0, az + nz), B0 = P(bx - nx, yb0, bz - nz), B1 = P(bx + nx, yb0, bz + nz);
    const A0h = P(ax - nx, ya1, az - nz), A1h = P(ax + nx, ya1, az + nz), B0h = P(bx - nx, yb1, bz - nz), B1h = P(bx + nx, yb1, bz + nz);
    const uv = [[0, 0], [l / 3, 0], [l / 3, 0.3], [0, 0.3]];
    this.dvojstrane(A0h, B0h, B1h, A1h, uv, f);            // vrch
    this.dvojstrane(A0, B0, B0h, A0h, uv, f);              // bok
    this.dvojstrane(A1, B1, B1h, A1h, uv, f);              // druhý bok
    this.dvojstrane(A0, A1, A1h, A0h, uv, f);
    this.dvojstrane(B0, B1, B1h, B0h, uv, f);
  }
  dvojstrane(a, b, c, d, uv, f) { this.stvor(a, b, c, d, uv, f); this.stvor(a, d, c, b, [uv[0], uv[3], uv[2], uv[1]], f); }
  mesh(material) {
    if (!this.poz.length) return null;
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.poz, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(this.uv, 2));
    g.setAttribute('color', new THREE.Float32BufferAttribute(this.farba, 3));
    g.computeVertexNormals();
    const m = new THREE.Mesh(g, material);
    m.castShadow = true;
    m.receiveShadow = true;
    return m;
  }
}

const FARBA = {
  podlaha: new THREE.Color('#a9a59c'),
  stena: new THREE.Color('#d4d0c6'),
  strop: new THREE.Color('#7d7a74'),
  schod: new THREE.Color('#bdb9b0'),
  obruba: new THREE.Color('#b4b0a6'),
  dvere: new THREE.Color('#3c3f42'),
};

/** Leží bod vnútri inej tuby (než ja)? */
function vInej(tuby, ja, x, z, rezerva = 0.05) {
  for (const t of tuby) {
    if (t === ja) continue;
    if (voTube(t, x, z).d < t.h - rezerva) return true;
  }
  return false;
}

/**
 * Postaví podchody dlaždice. tuby z pripravTuby, vyskaTerenu(x, z), kolizie (pre zábradlie na povrchu).
 * Vracia { skupina, diery } – diery = obdĺžniky jám schodísk (na vyrezanie terénu).
 */
export function vytvorPodchody(tuby, vyskaTerenu, kolizie = null) {
  const M = ziskajMaterialy();
  const beton = new Zberac(), kov = new Zberac(), svetla = new Zberac();
  const diery = [];

  // --- steny po hranici zjednotenia tub ---
  for (const t of tuby) {
    const nx = -t.ez, nz = t.ex;
    const schody = t.typ === 'schody';
    // kúsky obrysu tuby: dve rovné steny (+ polkruhy na koncoch chodby)
    const obrys = [];
    for (const strana of [1, -1]) {
      const n = Math.max(1, Math.ceil(t.dlzka / KUS));
      for (let i = 0; i < n; i++) {
        const s0 = (t.dlzka * i) / n, s1 = (t.dlzka * (i + 1)) / n;
        const a = [t.ax + t.ex * s0 + nx * t.h * strana, t.az + t.ez * s0 + nz * t.h * strana];
        const b = [t.ax + t.ex * s1 + nx * t.h * strana, t.az + t.ez * s1 + nz * t.h * strana];
        obrys.push(strana > 0 ? [b, a] : [a, b]);   // poradie tak, aby stena pozerala dovnútra
      }
    }
    if (!schody) {
      for (const [cx, cz, smer] of [[t.ax, t.az, -1], [t.bx, t.bz, 1]]) {
        const u0 = Math.atan2(nz, nx);
        for (let i = 0; i < OBLUK; i++) {
          const a0 = u0 + (smer > 0 ? -1 : 1) * (Math.PI * i) / OBLUK, a1 = u0 + (smer > 0 ? -1 : 1) * (Math.PI * (i + 1)) / OBLUK;
          const a = [cx + Math.cos(a0) * t.h, cz + Math.sin(a0) * t.h], b = [cx + Math.cos(a1) * t.h, cz + Math.sin(a1) * t.h];
          obrys.push(smer > 0 ? [b, a] : [a, b]);   // stena pozerá dovnútra
        }
      }
    }
    for (const [a, b] of obrys) {
      const mx = (a[0] + b[0]) / 2, mz = (a[1] + b[1]) / 2;
      if (vInej(tuby, t, mx, mz)) continue;
      const va = voTube(t, a[0], a[1]), vb = voTube(t, b[0], b[1]);
      const l = Math.hypot(b[0] - a[0], b[1] - a[1]);
      let ya0, ya1, yb0, yb1;
      if (schody) {
        // stena jamy: od schodov po terén
        ya0 = va.y; yb0 = vb.y;
        ya1 = Math.max(ya0, vyskaTerenu(a[0], a[1]) + (t.nad ?? 0)); yb1 = Math.max(yb0, vyskaTerenu(b[0], b[1]) + (t.nad ?? 0));
        if (ya1 - ya0 < 0.05 && yb1 - yb0 < 0.05) continue;
      } else {
        ya0 = va.y; yb0 = vb.y; ya1 = ya0 + VYSKA; yb1 = yb0 + VYSKA;
      }
      beton.stvor([a[0], ya0, a[1]], [b[0], yb0, b[1]], [b[0], yb1, b[1]], [a[0], ya1, a[1]],
        [[0, ya0 / 3], [l / 3, yb0 / 3], [l / 3, yb1 / 3], [0, ya1 / 3]], t.dvere && !schody && Math.min(va.u, vb.u) > 0.98 ? FARBA.dvere : FARBA.stena);
    }

    if (!schody) {
      // podlaha a strop: obdĺžnik + polkruhy na koncoch (prekryvy rovnakého povrchu nevadia)
      const P = (s, k, dy = 0) => {
        const y = t.ya + (t.yb - t.ya) * (s / t.dlzka) + dy;
        return [t.ax + t.ex * s + nx * t.h * k, y, t.az + t.ez * s + nz * t.h * k];
      };
      const uv = (p) => [p[0] / 3, p[2] / 3];
      const pod = [P(0, 1), P(t.dlzka, 1), P(t.dlzka, -1), P(0, -1)];
      beton.stvor(pod[0], pod[1], pod[2], pod[3], pod.map(uv), FARBA.podlaha);
      const st = [P(0, 1, VYSKA), P(t.dlzka, 1, VYSKA), P(t.dlzka, -1, VYSKA), P(0, -1, VYSKA)];
      beton.stvor(st[0], st[3], st[2], st[1], [st[0], st[3], st[2], st[1]].map(uv), FARBA.strop);
      for (const [cx, cz, y, smer] of [[t.ax, t.az, t.ya, -1], [t.bx, t.bz, t.yb, 1]]) {
        const u0 = Math.atan2(nz, nx);
        for (let i = 0; i < OBLUK; i++) {
          const a0 = u0 + (smer > 0 ? -1 : 1) * (Math.PI * i) / OBLUK, a1 = u0 + (smer > 0 ? -1 : 1) * (Math.PI * (i + 1)) / OBLUK;
          const A = [cx + Math.cos(a0) * t.h, cz + Math.sin(a0) * t.h], B = [cx + Math.cos(a1) * t.h, cz + Math.sin(a1) * t.h];
          const s = [cx, y, cz], a = [A[0], y, A[1]], b = [B[0], y, B[1]];
          const hore = smer > 0 ? [s, a, b] : [s, b, a];
          beton.troj(hore[0], hore[1], hore[2], hore.map(uv), FARBA.podlaha);
          const sh = [cx, y + VYSKA, cz], ah = [A[0], y + VYSKA, A[1]], bh = [B[0], y + VYSKA, B[1]];
          const dole = smer > 0 ? [sh, bh, ah] : [sh, ah, bh];
          beton.troj(dole[0], dole[1], dole[2], dole.map(uv), FARBA.strop);
        }
      }
      // svietidlá na strope každých 6 m
      for (let s = 2; s < t.dlzka - 1; s += 6) {
        const p = P(s, 0, VYSKA - 0.06);
        svetla.kvader(p[0] - t.ex * 0.6, p[2] - t.ez * 0.6, p[0] + t.ex * 0.6, p[2] + t.ez * 0.6, 0.35, p[1], p[1] + 0.05, p[1], p[1] + 0.05, FARBA.stena);
      }
      continue;
    }

    // --- schody ---
    const pad = t.ya - t.yb;
    const n = Math.max(2, Math.round(pad / SCHOD));
    const dy = pad / n;
    for (let k = 0; k < n; k++) {
      const s0 = (t.dlzka * k) / n, s1 = (t.dlzka * (k + 1)) / n;
      const yHore = t.ya - k * dy, y = t.ya - (k + 1) * dy;
      const P = (s, kk, yy) => [t.ax + t.ex * s + nx * t.h * kk, yy, t.az + t.ez * s + nz * t.h * kk];
      // podstupnica (zvislá, pozerá dole po schodoch) a stupnica
      beton.stvor(P(s0, 1, y), P(s0, -1, y), P(s0, -1, yHore), P(s0, 1, yHore), [[0, y / 3], [t.h * 2 / 3, y / 3], [t.h * 2 / 3, yHore / 3], [0, yHore / 3]], FARBA.schod);
      const st = [P(s0, -1, y), P(s1, -1, y), P(s1, 1, y), P(s0, 1, y)];
      beton.stvor(st[0], st[3], st[2], st[1], [st[0], st[3], st[2], st[1]].map((p) => [p[0] / 3, p[2] / 3]), FARBA.schod);
    }
    // madlá pozdĺž stien
    for (const k of [1, -1]) {
      const ax = t.ax + nx * (t.h - 0.12) * k, az = t.az + nz * (t.h - 0.12) * k;
      const bx = t.bx + nx * (t.h - 0.12) * k, bz = t.bz + nz * (t.h - 0.12) * k;
      kov.kvader(ax, az, bx, bz, 0.06, t.ya + 0.86, t.ya + 0.92, t.yb + 0.86, t.yb + 0.92, FARBA.stena);
    }
    // na povrchu: obruba okolo jamy, parapet so zábradlím, nad dolným koncom čelo (portál chodby)
    // (povrch = terén, pri schodoch z nástupišťa o t.nad vyššie)
    const ya = vyskaTerenu(t.ax, t.az) + (t.nad ?? 0), yb = vyskaTerenu(t.bx, t.bz) + (t.nad ?? 0);
    // spodok obruby: na nástupišti siaha až po terén (inak by pod ňou bolo vidno vyrezanú jamu v teréne)
    const dno = 0.05 + (t.nad ?? 0);
    for (const k of [1, -1]) {
      const ax = t.ax + nx * (t.h + 0.6) * k, az = t.az + nz * (t.h + 0.6) * k;
      const bx = t.bx + nx * (t.h + 0.6) * k + t.ex * 0.6, bz = t.bz + nz * (t.h + 0.6) * k + t.ez * 0.6;
      beton.kvader(ax, az, bx, bz, 1.2, ya - dno, ya + 0.03, yb - dno, yb + 0.03, FARBA.obruba);       // obruba
      const px = t.ax + nx * (t.h + 0.15) * k, pz = t.az + nz * (t.h + 0.15) * k;
      const qx = t.bx + nx * (t.h + 0.15) * k, qz = t.bz + nz * (t.h + 0.15) * k;
      // parapet len tam, kde je jama hlbšia (pri hornom konci schodov je vstup)
      const zac = Math.min(0.9, 0.6 / Math.max(0.1, pad) * 1);
      const zx = px + (qx - px) * zac, zz = pz + (qz - pz) * zac;
      const yz = ya + (yb - ya) * zac;
      beton.kvader(zx, zz, qx, qz, 0.3, yz - dno, yz + 0.45, yb - dno, yb + 0.45, FARBA.obruba);
      kov.kvader(zx, zz, qx, qz, 0.05, yz + 0.95, yz + 1.0, yb + 0.95, yb + 1.0, FARBA.stena);
      for (let s = 0; s <= 1.0001; s += 0.25) {
        const x = zx + (qx - zx) * s, z = zz + (qz - zz) * s, yy = yz + (yb - yz) * s;
        kov.kvader(x - t.ex * 0.03, z - t.ez * 0.03, x + t.ex * 0.03, z + t.ez * 0.03, 0.05, yy + 0.45, yy + 0.97, yy + 0.45, yy + 0.97, FARBA.stena);
      }
      if (kolizie) kolizie.pridajPolygon(obdlznik(zx, zz, qx, qz, 0.4), { typ: 'zabradlie' });
    }
    // dolný koniec: obruba a parapet naprieč, čelo nad vstupom do chodby
    {
      const cx = t.bx + t.ex * 0.15, cz = t.bz + t.ez * 0.15;
      const ax = cx + nx * (t.h + 0.3), az = cz + nz * (t.h + 0.3), bx = cx - nx * (t.h + 0.3), bz = cz - nz * (t.h + 0.3);
      beton.kvader(ax, az, bx, bz, 0.3, yb - dno, yb + 0.45, yb - dno, yb + 0.45, FARBA.obruba);
      kov.kvader(ax, az, bx, bz, 0.05, yb + 0.95, yb + 1.0, yb + 0.95, yb + 1.0, FARBA.stena);
      if (kolizie) kolizie.pridajPolygon(obdlznik(ax, az, bx, bz, 0.4), { typ: 'zabradlie' });
      const strop = t.yb + VYSKA;
      if (yb - strop > 0.1) {
        const L = [t.bx + nx * t.h, t.bz + nz * t.h], R = [t.bx - nx * t.h, t.bz - nz * t.h];
        beton.stvor([R[0], strop, R[1]], [L[0], strop, L[1]], [L[0], yb, L[1]], [R[0], yb, R[1]], [[0, strop / 3], [t.h * 2 / 3, strop / 3], [t.h * 2 / 3, yb / 3], [0, yb / 3]], FARBA.stena);
      }
    }
    // jama v teréne (vyreže sa z textúry zeme) – o kúsok väčšia než schody, okraj zakryje obruba
    const D = t.h + 0.6;
    diery.push([
      [t.ax - t.ex * 0.6 + nx * D, t.az - t.ez * 0.6 + nz * D], [t.bx + t.ex * 0.6 + nx * D, t.bz + t.ez * 0.6 + nz * D],
      [t.bx + t.ex * 0.6 - nx * D, t.bz + t.ez * 0.6 - nz * D], [t.ax - t.ex * 0.6 - nx * D, t.az - t.ez * 0.6 - nz * D],
    ]);
    // nástupná plocha nad horným koncom (zakryje okraj vyrezaného terénu)
    beton.kvader(t.ax - t.ex * 0.6, t.az - t.ez * 0.6, t.ax, t.az, 2 * t.h + 2.4, ya - dno, ya + 0.02, ya - dno, ya + 0.02, FARBA.obruba);
  }

  const skupina = new THREE.Group();
  skupina.name = 'podchody';
  for (const [z, m] of [[beton, M.betón], [kov, M.kov], [svetla, M.svetlo]]) {
    const mesh = z.mesh(m);
    if (mesh) skupina.add(mesh);
  }
  return { skupina, diery };
}

/** Obdĺžnik okolo úsečky a→b so šírkou w (pre kolízie). */
function obdlznik(ax, az, bx, bz, w) {
  const dx = bx - ax, dz = bz - az, l = Math.hypot(dx, dz) || 1;
  const nx = (-dz / l) * w / 2, nz = (dx / l) * w / 2;
  return [[ax + nx, az + nz], [bx + nx, bz + nz], [bx - nx, bz - nz], [ax - nx, az - nz]];
}
