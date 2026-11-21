// Nadjazdy, lávky a nadchody (dáta "nadjazdy" v dlaždici – tools/mesto/nadjazdy.mjs).
// Laserový terén most nemá (pod ním je zem, na koncoch násyp), preto:
//   – výška mostovky ide od terénu na jednom konci k terénu na druhom (násypy a rampy sú v teréne),
//   – nad cestou, koľajou alebo vodou (úseky "pod") sa zdvihne na podjazdnú výšku a k nej vedú rampy
//     so sklonom podľa druhu (cesta 7 %, chodník 12 %, koľaj 3 %),
//   – mostovka (vrch, boky, spodok), zábradlie (cesta betónový parapet, lávka kovové zábradlie, koľaj nízky
//     parapet a koľajnice), piliere mimo podjazdov a opory na koncoch, keď je mostovka nad terénom.
// profilMosta() je spoločný pre stavbu aj pre chôdzu a jazdu po moste (js/mapa/mosty/nadjazdy-modul.js).

import * as THREE from 'three';

const KROK = 2;                                          // m – vzorkovanie osi mosta
const DRUHY = {
  cesta: { sklon: 0.07, hrubka: 1.2, rozpatie: 24, nad: 0.4 },
  chodnik: { sklon: 0.12, hrubka: 0.6, rozpatie: 16, nad: 0.3 },
  kolaj: { sklon: 0.03, hrubka: 1.5, rozpatie: 22, nad: 0.5 },
};
// voľná výška pod mostom: nad cestou, nad koľajou (trakčné vedenie), nad vodou
const PODJAZD = { 1: 4.8, 2: 6.0, 3: 1.6 };

/** Os mosta po 2 m s výškou mostovky: [{ x, z, s, ux, uz, h, teren }]. */
export function profilMosta(m, vyskaTerenu) {
  const D = DRUHY[m.druh] ?? DRUHY.chodnik;
  const body = [];
  let s = 0;
  for (let i = 1; i < m.body.length; i++) {
    const [ax, az] = m.body[i - 1], [bx, bz] = m.body[i];
    const L = Math.hypot(bx - ax, bz - az);
    if (L < 0.01) continue;
    const ux = (bx - ax) / L, uz = (bz - az) / L;
    const n = Math.max(1, Math.round(L / KROK));
    for (let k = i === 1 ? 0 : 1; k <= n; k++) {
      const t = k / n;
      body.push({ x: ax + (bx - ax) * t, z: az + (bz - az) * t, s: s + L * t, ux, uz });
    }
    s += L;
  }
  if (body.length < 2) return null;
  // smer v bode = priemer susedných úsekov (plynulé zábradlie v zákrutách)
  for (let i = 0; i < body.length; i++) {
    const a = body[Math.max(0, i - 1)], b = body[Math.min(body.length - 1, i + 1)];
    const dx = b.x - a.x, dz = b.z - a.z, l = Math.hypot(dx, dz) || 1;
    body[i].ux = dx / l; body[i].uz = dz / l;
    body[i].teren = vyskaTerenu(body[i].x, body[i].z);
  }
  const hA = body[0].teren, hB = body.at(-1).teren;
  const pod = m.pod ?? [];
  const potreba = body.map((p) => {
    let clr = D.nad;
    for (const [s0, s1, co] of pod) if (p.s >= s0 && p.s <= s1) clr = Math.max(clr, (PODJAZD[co] ?? 2) + D.hrubka);
    return p.teren + clr;
  });
  for (let i = 0; i < body.length; i++) {
    const p = body[i];
    let h = hA + (hB - hA) * (p.s / s);
    for (let j = 0; j < body.length; j++) h = Math.max(h, potreba[j] - D.sklon * Math.abs(p.s - body[j].s));
    p.h = h;
  }
  return { m, D, body, dlzka: s, sirka: m.sirka };
}

/** Výška mostovky v bode (x, z), alebo null, ak bod nie je na moste. */
export function vyskaNaMoste(pr, x, z) {
  const b = pr.body, pol = pr.sirka / 2 + 0.3;
  let naj = null, dMin = pol;
  for (let i = 1; i < b.length; i++) {
    const a = b[i - 1], c = b[i];
    const dx = c.x - a.x, dz = c.z - a.z, l2 = dx * dx + dz * dz || 1;
    const tt = ((x - a.x) * dx + (z - a.z) * dz) / l2;
    // na koncoch mosta len po koniec osi (ďalej už je cesta na zemi)
    if ((i === 1 && tt < 0) || (i === b.length - 1 && tt > 1)) continue;
    const t = Math.max(0, Math.min(1, tt));
    const d = Math.hypot(a.x + dx * t - x, a.z + dz * t - z);
    if (d < dMin) { dMin = d; naj = a.h + (c.h - a.h) * t; }
  }
  return naj;
}

// --- geometria ---------------------------------------------------------------
class Zberac {
  constructor() { this.p = []; this.n = []; }
  stvor(a, b, c, d) {
    // a b c d proti smeru hodín pri pohľade zvonka
    const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2];
    const vx = d[0] - a[0], vy = d[1] - a[1], vz = d[2] - a[2];
    let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    const l = Math.hypot(nx, ny, nz) || 1; nx /= l; ny /= l; nz /= l;
    for (const q of [a, b, c, a, c, d]) { this.p.push(q[0], q[1], q[2]); this.n.push(nx, ny, nz); }
  }
  /** Kváder (stĺp) so stredom podstavy x, y0, z a výškou do y1, otočený podľa (ux, uz). */
  kvader(x, y0, y1, z, sx, sz, ux = 1, uz = 0) {
    const nx = -uz, nz = ux;
    const r = (a, b) => [x + ux * a + nx * b, z + uz * a + nz * b];
    const k = [r(-sx / 2, -sz / 2), r(sx / 2, -sz / 2), r(sx / 2, sz / 2), r(-sx / 2, sz / 2)];
    for (let i = 0; i < 4; i++) {
      const [ax, az] = k[i], [bx, bz] = k[(i + 1) % 4];
      this.stvor([ax, y0, az], [bx, y0, bz], [bx, y1, bz], [ax, y1, az]);
    }
    this.stvor([k[0][0], y1, k[0][1]], [k[1][0], y1, k[1][1]], [k[2][0], y1, k[2][1]], [k[3][0], y1, k[3][1]]);
  }
  geometria() {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.p, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.n, 3));
    return g;
  }
}

let MAT = null;
function materialy() {
  // obojstranné – poradie vrcholov plôch potom nehrá rolu (normála sa otočí k divákovi)
  const S = THREE.DoubleSide;
  MAT ??= {
    asfalt: new THREE.MeshStandardMaterial({ color: '#3d3d3e', roughness: 0.92, side: S }),
    dlazba: new THREE.MeshStandardMaterial({ color: '#8f8c86', roughness: 0.9, side: S }),
    strk: new THREE.MeshStandardMaterial({ color: '#6b645b', roughness: 1, side: S }),
    beton: new THREE.MeshStandardMaterial({ color: '#a29e95', roughness: 0.88, side: S }),
    kov: new THREE.MeshStandardMaterial({ color: '#3d4a44', roughness: 0.5, metalness: 0.6, side: S }),
    kolajnica: new THREE.MeshStandardMaterial({ color: '#6c6660', roughness: 0.35, metalness: 0.8, side: S }),
  };
  return MAT;
}

/** Postaví mosty dlaždice. Vracia { skupina, profily } – profily použije modul na chôdzu a jazdu. */
export function vytvorNadjazdy(nadjazdy, vyskopis, kolizie) {
  const skupina = new THREE.Group();
  skupina.name = 'nadjazdy';
  const profily = [];
  if (!nadjazdy?.length) return { skupina, profily };
  const Z = { vrch: { cesta: new Zberac(), chodnik: new Zberac(), kolaj: new Zberac() }, beton: new Zberac(), kov: new Zberac(), kolajnica: new Zberac() };
  for (const m of nadjazdy) {
    const pr = profilMosta(m, vyskopis.vyskaTerenu);
    if (!pr) continue;
    profily.push(pr);
    postavMost(pr, Z, kolizie);
  }
  const M = materialy();
  const pridaj = (z, mat) => {
    if (!z.p.length) return;
    const mesh = new THREE.Mesh(z.geometria(), mat);
    mesh.castShadow = true; mesh.receiveShadow = true;
    skupina.add(mesh);
  };
  pridaj(Z.vrch.cesta, M.asfalt);
  pridaj(Z.vrch.chodnik, M.dlazba);
  pridaj(Z.vrch.kolaj, M.strk);
  pridaj(Z.beton, M.beton);
  pridaj(Z.kov, M.kov);
  pridaj(Z.kolajnica, M.kolajnica);
  return { skupina, profily };
}

function postavMost(pr, Z, kolizie) {
  const { body: b, D, m } = pr;
  const w = pr.sirka / 2;
  const kraj = m.druh === 'cesta' ? 0.35 : m.druh === 'kolaj' ? 0.4 : 0.1;   // šírka rímsy pod zábradlím
  const W = w + kraj;
  const bod = (p, o, y) => [p.x - p.uz * o, y, p.z + p.ux * o];
  const vrch = Z.vrch[m.druh] ?? Z.vrch.chodnik;
  for (let i = 1; i < b.length; i++) {
    const a = b[i - 1], c = b[i];
    // vrch mostovky (pochôdzna / jazdná plocha) a rímsy po okrajoch
    vrch.stvor(bod(a, w, a.h), bod(a, -w, a.h), bod(c, -w, c.h), bod(c, w, c.h));
    for (const s of [1, -1]) {
      const o0 = s * w, o1 = s * W;
      if (s > 0) Z.beton.stvor(bod(a, o1, a.h + 0.12), bod(a, o0, a.h + 0.12), bod(c, o0, c.h + 0.12), bod(c, o1, c.h + 0.12));
      else Z.beton.stvor(bod(a, o0, a.h + 0.12), bod(a, o1, a.h + 0.12), bod(c, o1, c.h + 0.12), bod(c, o0, c.h + 0.12));
    }
    // boky a spodok
    const yA = a.h - D.hrubka, yC = c.h - D.hrubka;
    Z.beton.stvor(bod(a, W, yA), bod(c, W, yC), bod(c, W, c.h + 0.12), bod(a, W, a.h + 0.12));
    Z.beton.stvor(bod(c, -W, yC), bod(a, -W, yA), bod(a, -W, a.h + 0.12), bod(c, -W, c.h + 0.12));
    Z.beton.stvor(bod(a, -W, yA), bod(c, -W, yC), bod(c, W, yC), bod(a, W, yA));
    // zábradlie
    if (m.druh === 'cesta') {
      // betónový parapet 0,9 m
      for (const s of [1, -1]) {
        const o0 = s * (W - 0.3), o1 = s * W;
        const h0 = a.h + 1.0, h1 = c.h + 1.0;
        if (s > 0) Z.beton.stvor(bod(a, o0, h0), bod(c, o0, h1), bod(c, o1, h1), bod(a, o1, h0));
        else Z.beton.stvor(bod(c, o0, h1), bod(a, o0, h0), bod(a, o1, h0), bod(c, o1, h1));
        Z.beton.stvor(bod(a, o0, a.h + 0.12), bod(c, o0, c.h + 0.12), bod(c, o0, h1), bod(a, o0, h0));
        Z.beton.stvor(bod(c, o0, c.h + 0.12), bod(a, o0, a.h + 0.12), bod(a, o0, h0), bod(c, o0, h1));
      }
    } else if (m.druh === 'kolaj') {
      for (const s of [1, -1]) {
        const o = s * (W - 0.15);
        Z.beton.stvor(bod(a, o, a.h + 0.12), bod(c, o, c.h + 0.12), bod(c, o, c.h + 0.7), bod(a, o, a.h + 0.7));
        Z.beton.stvor(bod(c, o, c.h + 0.12), bod(a, o, a.h + 0.12), bod(a, o, a.h + 0.7), bod(c, o, c.h + 0.7));
      }
      // koľajnice: pre každú koľaj dve (rozchod 1,435 m), koľaje po 4,5 m
      const pocet = Math.max(1, Math.round(pr.sirka / 4.5));
      for (let k = 0; k < pocet; k++) {
        const os = (k - (pocet - 1) / 2) * 4.5;
        for (const r of [-0.72, 0.72]) {
          const o = os + r;
          Z.kolajnica.stvor(bod(a, o - 0.04, a.h + 0.18), bod(a, o + 0.04, a.h + 0.18), bod(c, o + 0.04, c.h + 0.18), bod(c, o - 0.04, c.h + 0.18));
          Z.kolajnica.stvor(bod(a, o + 0.04, a.h), bod(c, o + 0.04, c.h), bod(c, o + 0.04, c.h + 0.18), bod(a, o + 0.04, a.h + 0.18));
          Z.kolajnica.stvor(bod(c, o - 0.04, c.h), bod(a, o - 0.04, a.h), bod(a, o - 0.04, a.h + 0.18), bod(c, o - 0.04, c.h + 0.18));
        }
      }
    } else {
      // kovové zábradlie: madlo a stredná tyč
      for (const s of [1, -1]) {
        const o = s * (W - 0.04);
        for (const [y, v] of [[1.05, 0.07], [0.55, 0.04]]) {
          Z.kov.stvor(bod(a, o, a.h + y), bod(c, o, c.h + y), bod(c, o, c.h + y + v), bod(a, o, a.h + y + v));
          Z.kov.stvor(bod(c, o, c.h + y), bod(a, o, a.h + y), bod(a, o, a.h + y + v), bod(c, o, c.h + y + v));
        }
      }
    }
  }
  // stĺpiky zábradlia lávky po 2 m
  if (m.druh === 'chodnik') {
    for (const p of b) for (const s of [1, -1]) {
      const [x, , z] = bod(p, s * (W - 0.04), 0);
      Z.kov.kvader(x, p.h + 0.1, p.h + 1.12, z, 0.05, 0.05, p.ux, p.uz);
    }
  }
  // piliere mimo podjazdov, kde je mostovka nad terénom
  const pod = m.pod ?? [];
  const volne = (s) => !pod.some(([s0, s1]) => s > s0 - 3 && s < s1 + 3);
  let posledny = -1e9;
  for (const p of b) {
    if (p.s - posledny < D.rozpatie || p.s < 4 || p.s > pr.dlzka - 4) continue;
    const spodok = p.h - D.hrubka;
    if (spodok - p.teren < 1.2 || !volne(p.s)) continue;
    posledny = p.s;
    if (m.druh === 'chodnik') {
      Z.beton.kvader(p.x, p.teren - 0.3, spodok, p.z, 0.6, 0.6, p.ux, p.uz);
      kolizie?.pridajKruh(p.x, p.z, 0.45, { typ: 'pilier' });
    } else {
      // dva stĺpy (cesta) alebo stena (koľaj) naprieč mostom
      if (m.druh === 'kolaj') {
        Z.beton.kvader(p.x, p.teren - 0.3, spodok, p.z, 1.2, pr.sirka * 0.8, p.ux, p.uz);
        for (const o of [-pr.sirka * 0.3, 0, pr.sirka * 0.3]) kolizie?.pridajKruh(p.x - p.uz * o, p.z + p.ux * o, 0.8, { typ: 'pilier' });
      } else {
        for (const o of [-w * 0.55, w * 0.55]) {
          const x = p.x - p.uz * o, z = p.z + p.ux * o;
          Z.beton.kvader(x, p.teren - 0.3, spodok, z, 1.1, 1.1, p.ux, p.uz);
          kolizie?.pridajKruh(x, z, 0.8, { typ: 'pilier' });
        }
      }
    }
  }
  // opory na koncoch (mostovka nad terénom): stena pod mostovkou až po zem
  for (const p of [b[0], b.at(-1)]) {
    const spodok = p.h - D.hrubka;
    if (p.h - p.teren < 0.8) continue;
    Z.beton.kvader(p.x, p.teren - 0.5, Math.max(spodok, p.teren), p.z, 1.2, pr.sirka + 2 * kraj, p.ux, p.uz);
  }
}
