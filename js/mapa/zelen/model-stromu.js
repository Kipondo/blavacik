// Procedurálne modely stromov (blízka úroveň detailu): kmeň a konáre ako zužujúce sa rúrky s kôrou
// a koruna z kariet so zhlukmi listov (ihlíc). Každý druh má vlastný tvar koruny a stavbu konárov.
// Model má výšku VYSKA_MODELU a polomer koruny podľa druhu – inštancia sa zmenší/zväčší na skutočnú
// výšku a šírku stromu (z lasera alebo odhadu). Generuje sa raz pri štarte (deterministicky podľa semienka).

import * as THREE from 'three';

export const VYSKA_MODELU = 10;   // m

/**
 * Druhy stromov v meste. korunaOd = kde začína koruna (podiel výšky), polomer = polomer koruny modelu (m),
 * hlavne/vedlajsie = počet konárov, uhol = odklon hlavných konárov od zvislice (rad),
 * karty = počet kariet s listami, velkost = veľkosť karty (m), previs = koľko listov visí dolu (breza).
 */
export const DRUHY = {
  lipa: { semienko: 11, korunaOd: 0.3, polomer: 3.4, zvlnenie: 0.14, hlavne: 6, vedlajsie: 4, uhol: [0.45, 0.95], karty: 165, velkost: [1.5, 2.3], kora: 'bezna', farbaKory: '#8c8073', hrubka: 0.24, tonListov: [1.0, 1.0, 0.92] },
  javor: { semienko: 23, korunaOd: 0.27, polomer: 3.9, zvlnenie: 0.2, hlavne: 5, vedlajsie: 4, uhol: [0.6, 1.1], karty: 170, velkost: [1.6, 2.5], kora: 'bezna', farbaKory: '#7a7066', hrubka: 0.26, tonListov: [1.04, 1.02, 0.85] },
  platan: { semienko: 37, korunaOd: 0.26, polomer: 4.3, zvlnenie: 0.22, hlavne: 5, vedlajsie: 5, uhol: [0.55, 1.15], karty: 185, velkost: [1.7, 2.6], kora: 'platan', farbaKory: '#ffffff', hrubka: 0.3, tonListov: [0.95, 1.02, 0.86] },
  breza: { semienko: 41, korunaOd: 0.22, polomer: 2.5, zvlnenie: 0.16, hlavne: 5, vedlajsie: 3, uhol: [0.3, 0.7], karty: 150, velkost: [1.0, 1.5], previs: 0.6, kora: 'breza', farbaKory: '#ffffff', hrubka: 0.15, tonListov: [1.12, 1.12, 0.8] },
  topol: { semienko: 53, korunaOd: 0.1, polomer: 1.7, zvlnenie: 0.12, hlavne: 9, vedlajsie: 2, uhol: [0.12, 0.32], karty: 150, velkost: [1.2, 1.8], kora: 'bezna', farbaKory: '#857a6e', hrubka: 0.22, tonListov: [0.98, 1.02, 0.92] },
  smrek: { semienko: 67, ihlicnan: true, korunaOd: 0.08, polomer: 2.4, poschodia: 19, kora: 'bezna', farbaKory: '#7d5f4b', hrubka: 0.2 },
};

/** Jednoduchý generátor pseudonáhodných čísel (rovnaký strom pri každom spustení). */
function nahoda(semienko) {
  let a = semienko >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Zberač geometrie: pozície, normály, uv, farby (AO) a indexy. */
class Zberac {
  constructor() { this.p = []; this.n = []; this.uv = []; this.f = []; this.i = []; }
  get pocet() { return this.p.length / 3; }
  vrchol(v, n, u, w, ao) { this.p.push(v.x, v.y, v.z); this.n.push(n.x, n.y, n.z); this.uv.push(u, w); this.f.push(ao[0], ao[1], ao[2]); }
  geometria() {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.p, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.n, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(this.uv, 2));
    g.setAttribute('color', new THREE.Float32BufferAttribute(this.f, 3));
    g.setIndex(this.i);
    g.computeBoundingSphere();
    g.userData.zdielane = true;
    return g;
  }
}

/**
 * Rúrka pozdĺž bodov (konár/kmeň) so zužujúcim sa polomerom. Rámec sa prenáša pozdĺž krivky (bez krútenia),
 * uv: u okolo obvodu, v pozdĺž (1 = 1,6 m kôry).
 */
function rurka(z, body, polomery, strany, ao) {
  const t = new THREE.Vector3(), b = new THREE.Vector3(), nn = new THREE.Vector3(), v = new THREE.Vector3(), nr = new THREE.Vector3();
  let ref = Math.abs(body[1].y - body[0].y) > 0.7 * body[1].distanceTo(body[0]) ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0);
  const zac = z.pocet;
  let dlzka = 0;
  for (let k = 0; k < body.length; k++) {
    if (k > 0) dlzka += body[k].distanceTo(body[k - 1]);
    const a = body[Math.max(0, k - 1)], c = body[Math.min(body.length - 1, k + 1)];
    t.subVectors(c, a).normalize();
    nn.crossVectors(ref, t).normalize();
    b.crossVectors(t, nn);
    ref = b.clone();
    const obvod = Math.max(0.25, 2 * Math.PI * polomery[0]);
    for (let s = 0; s <= strany; s++) {
      const u = (s / strany) * Math.PI * 2;
      nr.copy(nn).multiplyScalar(Math.cos(u)).addScaledVector(b, Math.sin(u));
      v.copy(body[k]).addScaledVector(nr, polomery[k]);
      const tmavsie = ao[k] ?? ao[ao.length - 1];
      z.vrchol(v, nr, (s / strany) * Math.max(1, Math.round(obvod / 0.8)), dlzka / 1.6, [tmavsie, tmavsie, tmavsie]);
    }
  }
  for (let k = 0; k < body.length - 1; k++) {
    for (let s = 0; s < strany; s++) {
      const a = zac + k * (strany + 1) + s, c = a + strany + 1;
      z.i.push(a, c, a + 1, a + 1, c, c + 1);
    }
  }
}

/** Karta (štvorec) so stredom c, normálou n a natočením okolo normály; normály vrcholov = smer „von z koruny“. */
function karta(z, c, n, otocenie, sirka, vyska, von, farba, uvRozsah = [0, 0, 1, 1]) {
  let rr, hh;
  if (otocenie.isVector3) {
    // šírka karty v danom smere (premietnutom do roviny karty)
    rr = otocenie.clone().addScaledVector(n, -otocenie.dot(n)).normalize();
    hh = new THREE.Vector3().crossVectors(n, rr);
  } else {
    const pomoc = Math.abs(n.y) < 0.95 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0);
    const r = new THREE.Vector3().crossVectors(pomoc, n).normalize();
    const h = new THREE.Vector3().crossVectors(n, r);
    const cs = Math.cos(otocenie), sn = Math.sin(otocenie);
    rr = r.clone().multiplyScalar(cs).addScaledVector(h, sn); hh = h.clone().multiplyScalar(cs).addScaledVector(r, -sn);
  }
  const zac = z.pocet;
  const [u0, v0, u1, v1] = uvRozsah;
  const rohy = [[-1, -1, u0, v0], [1, -1, u1, v0], [1, 1, u1, v1], [-1, 1, u0, v1]];
  for (const [x, y, u, w] of rohy) {
    const p = c.clone().addScaledVector(rr, (x * sirka) / 2).addScaledVector(hh, (y * vyska) / 2);
    // normála: hlavne smer von z koruny (koruna sa osvetľuje ako celok), trochu podľa karty
    const nv = von(p).multiplyScalar(0.8).addScaledVector(n, 0.2).normalize();
    z.vrchol(p, nv, u, w, farba);
  }
  z.i.push(zac, zac + 1, zac + 2, zac, zac + 2, zac + 3);
}

/** Listnatý strom: kmeň, hlavné a vedľajšie konáre, karty listov po obale koruny. */
function listnaty(d) {
  const rnd = nahoda(d.semienko);
  const H = VYSKA_MODELU, R = d.polomer;
  const y0 = d.korunaOd * H;
  const a = (H - y0) / 2, cy = y0 + a;                 // poloosi koruny: R (vodorovne), a (zvisle)
  const stred = new THREE.Vector3(0, cy, 0);
  // zvlnený obal koruny – nie dokonalý elipsoid (zhluky vetiev)
  const f1 = rnd() * 6, f2 = rnd() * 6, f3 = rnd() * 6;
  const zvln = (u) => 1 + d.zvlnenie * (Math.sin(3 * Math.atan2(u.z, u.x) + f1) * 0.6 + Math.sin(5 * Math.atan2(u.z, u.x) + 2.3 * u.y + f2) * 0.4) * (0.7 + 0.3 * Math.sin(4 * u.y + f3));
  /** Vzdialenosť od bodu p v smere s po obal koruny. */
  const poObal = (p, s) => {
    const px = p.x / R, py = (p.y - cy) / a, pz = p.z / R, sx = s.x / R, sy = s.y / a, sz = s.z / R;
    const A = sx * sx + sy * sy + sz * sz, B = 2 * (px * sx + py * sy + pz * sz), C = px * px + py * py + pz * pz - 1;
    const t = (-B + Math.sqrt(Math.max(0, B * B - 4 * A * C))) / (2 * A);
    return t * zvln(new THREE.Vector3(px + sx * t, py + sy * t, pz + sz * t));
  };
  const von = (p) => new THREE.Vector3(p.x / R, (p.y - cy) / a, p.z / R).normalize();

  const kora = new Zberac(), listy = new Zberac();
  const r0 = d.hrubka;
  // kmeň: rovný s miernym ohybom, pokračuje do koruny ako hlavný výhonok
  const kmen = [], rk = [], aoK = [];
  const vrchKmena = y0 + (H - y0) * (d.uhol[1] < 0.4 ? 0.85 : 0.55);
  const ohyb = new THREE.Vector3((rnd() - 0.5) * 0.3, 0, (rnd() - 0.5) * 0.3);
  for (let k = 0; k <= 7; k++) {
    const t = k / 7, y = -0.3 + (vrchKmena + 0.3) * t;
    kmen.push(new THREE.Vector3(ohyb.x * Math.sin(t * 3), y, ohyb.z * Math.sin(t * 3)));
    // koreňový nábeh pri zemi, potom zužovanie
    rk.push(r0 * (1 + 0.45 * Math.max(0, 1 - t * 6)) * (1 - 0.72 * t));
    aoK.push(0.55 + 0.45 * Math.min(1, t * 3));
  }
  rurka(kora, kmen, rk, 8, aoK);

  // hlavné konáre z kmeňa v rôznych výškach a smeroch (zlatý uhol)
  const konce = [];
  const smer = new THREE.Vector3(), os = new THREE.Vector3();
  for (let k = 0; k < d.hlavne; k++) {
    const t = (k + 0.5) / d.hlavne;
    const y = y0 + (vrchKmena - y0) * (0.15 + 0.8 * t) + (rnd() - 0.5) * 0.4;
    const kk = Math.min(6, Math.floor(((y + 0.3) / (vrchKmena + 0.3)) * 7));
    const start = kmen[kk].clone().lerp(kmen[kk + 1], 0.5);
    const azim = k * 2.39996 + rnd() * 0.6;
    const odklon = d.uhol[0] + (d.uhol[1] - d.uhol[0]) * (1 - t * 0.6) * (0.7 + 0.3 * rnd());
    smer.set(Math.sin(odklon) * Math.cos(azim), Math.cos(odklon), Math.sin(odklon) * Math.sin(azim)).normalize();
    const L = poObal(start, smer) * (0.72 + 0.15 * rnd());
    const body = [start.clone()], pol = [], ao = [];
    const s = smer.clone();
    for (let j = 1; j <= 4; j++) {
      // konár sa ku koncu dvíha k svetlu (a pri breze ovísa)
      s.y += d.previs ? -0.08 : 0.07; s.normalize();
      body.push(body[j - 1].clone().addScaledVector(s, L / 4));
    }
    const rz = r0 * 0.55 * (1 - t * 0.35);
    for (let j = 0; j <= 4; j++) { pol.push(rz * (1 - (j / 4) * 0.82)); ao.push(0.6 + 0.4 * (j / 4)); }
    rurka(kora, body, pol, 6, ao);
    konce.push(body[4]);
    // vedľajšie konáre z hlavného
    for (let v = 0; v < d.vedlajsie; v++) {
      const tv = 0.35 + 0.6 * ((v + rnd() * 0.6) / d.vedlajsie);
      const iv = Math.min(3, Math.floor(tv * 4));
      const sv = body[iv].clone().lerp(body[iv + 1], tv * 4 - iv);
      os.set(rnd() - 0.5, rnd() - 0.5, rnd() - 0.5).normalize();
      const dv = s.clone().applyAxisAngle(os, 0.5 + rnd() * 0.5);
      if (d.previs) dv.y -= 0.35;
      dv.normalize();
      const Lv = Math.min(L * 0.55, poObal(sv, dv) * 0.85);
      if (Lv < 0.3) continue;
      const kb = sv.clone().addScaledVector(dv, Lv * 0.5).add(new THREE.Vector3(0, d.previs ? -0.15 : 0.12, 0));
      const ke = sv.clone().addScaledVector(dv, Lv);
      const rv = pol[iv] * 0.55;
      rurka(kora, [sv, kb, ke], [rv, rv * 0.55, rv * 0.12], 4, [0.7, 0.85, 1]);
      konce.push(ke);
    }
  }

  // karty s listami: body v škrupine koruny (viac pri obale), niektoré pri koncoch konárov
  const tmp = new THREE.Vector3();
  for (let k = 0; k < d.karty; k++) {
    let c;
    if (k < konce.length * 1.5) {
      c = konce[k % konce.length].clone().add(tmp.set(rnd() - 0.5, rnd() - 0.3, rnd() - 0.5).multiplyScalar(1.2));
    } else {
      const u = new THREE.Vector3(rnd() * 2 - 1, rnd() * 2 - 1, rnd() * 2 - 1);
      if (u.lengthSq() > 1 || u.lengthSq() < 0.01) { k--; continue; }
      u.normalize();
      if (d.previs && u.y < -0.2 && rnd() < 0.5) u.y *= 0.4;
      const rho = (1 - 0.45 * rnd() * rnd()) * zvln(u);
      c = new THREE.Vector3(u.x * R * rho, cy + u.y * a * rho, u.z * R * rho);
    }
    if (c.y < y0 - 0.6) c.y = y0 - 0.6 + rnd() * 0.5;
    const v = von(c);
    const n = v.clone().add(tmp.set(rnd() - 0.5, rnd() - 0.5, rnd() - 0.5).multiplyScalar(1.6)).normalize();
    if (d.previs) n.y *= 0.5;                       // breza: visiace zhluky (karty skôr zvislé)
    const vel = d.velkost[0] + (d.velkost[1] - d.velkost[0]) * rnd();
    // tieň vnútri koruny a na spodku, trochu farebná pestrosť
    const hlbka = Math.min(1, new THREE.Vector3(c.x / R, (c.y - cy) / a, c.z / R).length());
    const ao = (0.42 + 0.58 * Math.pow(hlbka, 1.6)) * (0.78 + 0.22 * Math.min(1, Math.max(0, (c.y - y0) / (H - y0) + 0.3)));
    const pest = 0.88 + rnd() * 0.24, ton = d.tonListov;
    karta(listy, c, n, rnd() * Math.PI * 2, vel, vel, von, [ao * pest * ton[0], ao * pest * ton[1], ao * pest * ton[2]]);
  }
  return { kora: kora.geometria(), listy: listy.geometria() };
}

/** Ihličnan (smrek): rovný kmeň až po špičku, poschodia ovisnutých konárov z kariet s vetvičkami. */
function ihlicnaty(d) {
  const rnd = nahoda(d.semienko);
  const H = VYSKA_MODELU, R = d.polomer, y0 = d.korunaOd * H;
  const kora = new Zberac(), listy = new Zberac();
  const kmen = [], rk = [], aoK = [];
  for (let k = 0; k <= 6; k++) {
    const t = k / 6;
    kmen.push(new THREE.Vector3(0, -0.3 + (H + 0.3) * t, 0));
    rk.push(d.hrubka * (1 - 0.95 * t) * (1 + 0.35 * Math.max(0, 1 - t * 8)));
    aoK.push(0.5 + 0.5 * t);
  }
  rurka(kora, kmen, rk, 7, aoK);
  const von = (p) => new THREE.Vector3(p.x, (p.y - (y0 + H) / 2) * 0.35 + 0.6, p.z).normalize();
  const n = new THREE.Vector3();
  for (let k = 0; k < d.poschodia; k++) {
    const t = k / (d.poschodia - 1);
    const y = y0 + (H - y0) * Math.pow(t, 0.92) * 0.97;
    const rc = R * Math.pow(1 - t, 0.95) + 0.25;
    const pocet = Math.max(3, Math.round(6 - t * 2));
    for (let j = 0; j < pocet; j++) {
      const azim = (j / pocet) * Math.PI * 2 + k * 1.3 + rnd() * 0.5;
      const dx = Math.cos(azim), dz = Math.sin(azim);
      const L = rc * (0.85 + rnd() * 0.25);
      // konár ovisne dolu a na konci sa zdvihne – dve karty za sebou
      for (let q = 0; q < 2; q++) {
        const s0 = 0.08 + q * 0.5, s1 = s0 + 0.55;
        const sm = (s0 + s1) / 2;
        const c = new THREE.Vector3(dx * L * sm, y - L * (0.28 * sm - 0.12 * sm * sm) - 0.15, dz * L * sm);
        const sklon = q === 0 ? -0.28 : -0.05;
        // karta leží skoro vodorovne pozdĺž konára (normála hore a trochu von)
        n.set(-dx * sklon, 1, -dz * sklon).normalize().add(new THREE.Vector3(rnd() - 0.5, 0, rnd() - 0.5).multiplyScalar(0.5)).normalize();
        const dlzka = L * 0.62, sirka = Math.min(1.5, 0.55 + L * 0.28);
        const ao = 0.5 + 0.5 * Math.min(1, sm + 0.25) * (0.75 + 0.25 * t);
        const smerK = new THREE.Vector3(dx, 0, dz).applyAxisAngle(new THREE.Vector3(0, 1, 0), (rnd() - 0.5) * 0.3);
        karta(listy, c, n, smerK, dlzka, sirka, von, [ao * 1.5, ao * 1.55, ao * 1.45]);
      }
    }
  }
  // špička: dve skrížené zvislé karty
  for (let j = 0; j < 2; j++) {
    const c = new THREE.Vector3(0, H - 0.55, 0);
    karta(listy, c, new THREE.Vector3(Math.cos(j * 1.57), 0, Math.sin(j * 1.57)), new THREE.Vector3(0, 1, 0), 1.2, 0.6, von, [1.5, 1.55, 1.45]);
  }
  return { kora: kora.geometria(), listy: listy.geometria() };
}

const cache = {};
/** Geometrie druhu { kora, listy } (vytvoria sa raz). */
export function modelStromu(meno) {
  if (!cache[meno]) {
    const d = DRUHY[meno];
    cache[meno] = d.ihlicnan ? ihlicnaty(d) : listnaty(d);
  }
  return cache[meno];
}
