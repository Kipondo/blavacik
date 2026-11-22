// Trakčné vedenie – geometria pre jednu dlaždicu (bez stavu hry; volá js/mapa/trakcia/modul.js).
//
// Električky: nad každou koľajou (data.kolajnice, typ 'elektricka') jeden trolejový drôt vo výške VYSKA_DROTU,
//   stĺpy po ~ROZOSTUP m na vonkajšej strane koľají (pri obrubníku, ak koľaj ide po ceste), z nich rameno nad drôt.
// Trolejbusy: nad jazdným pruhom dvojica drôtov (+ a −) vo vzdialenosti 0,6 m, stĺpy pri obrubníku vpravo
//   v smere jazdy. Trasy liniek (data/mhd/trasy) sa prichytia k osi najbližšej rovnobežnej cesty z dlaždice,
//   aby drôty viseli nad pruhmi a stĺpy stáli pri okraji vozovky. Rovnaké úseky viacerých liniek sa nekreslia dvakrát.
// Kde by stĺp padol do domu (úzka ulica), drôt drží lano ukotvené na fasáde (bez stĺpa).

import * as THREE from 'three';

export const VYSKA_DROTU = 5.6;   // m nad vozovkou / koľajou
const VYSKA_RAMENA = 6.3;
const VYSKA_STLPA = 7.4;
const ROZOSTUP = 30;              // m medzi stĺpmi
const KUS = 10;                   // m – úsek trasy trolejbusu (na vynechanie zdvojených úsekov)
const BUNKA = 40;                 // m – mriežka ciest na hľadanie najbližšej vozovky

let materialy = null;
function mat() {
  if (materialy) return materialy;
  materialy = {
    stlp: new THREE.MeshStandardMaterial({ color: '#3d4246', metalness: 0.6, roughness: 0.5 }),
    drot: new THREE.LineBasicMaterial({ color: '#1e2124' }),
  };
  return materialy;
}

/** Mriežka úsekov ciest dlaždice (na rýchle hľadanie vozovky pri trase). */
function mriezkaCiest(cesty) {
  const m = new Map();
  for (const c of cesty ?? []) {
    if (c.nadjazd || !c.body || c.body.length < 2) continue;
    const pol = (c.sirka ?? 7) / 2;
    for (let i = 1; i < c.body.length; i++) {
      const [ax, az] = c.body[i - 1], [bx, bz] = c.body[i];
      const l = Math.hypot(bx - ax, bz - az);
      if (l < 0.5) continue;
      const u = { ax, az, bx, bz, l, ux: (bx - ax) / l, uz: (bz - az) / l, pol, jednosmerka: !!c.jednosmerka };
      for (let x = Math.floor((Math.min(ax, bx) - 10) / BUNKA); x <= Math.floor((Math.max(ax, bx) + 10) / BUNKA); x++) {
        for (let z = Math.floor((Math.min(az, bz) - 10) / BUNKA); z <= Math.floor((Math.max(az, bz) + 10) / BUNKA); z++) {
          const k = `${x},${z}`;
          if (!m.has(k)) m.set(k, []);
          m.get(k).push(u);
        }
      }
    }
  }
  return m;
}

/** Najbližšia vozovka rovnobežná so smerom (dx, dz) do 8 m: { cx, cz (bod na osi), pol, jednosmerka } alebo null. */
function vozovkaPri(mriezka, x, z, dx, dz) {
  let naj = null, nd = 8;
  for (const u of mriezka.get(`${Math.floor(x / BUNKA)},${Math.floor(z / BUNKA)}`) ?? []) {
    if (Math.abs(u.ux * dx + u.uz * dz) < 0.8) continue;
    const t = Math.max(0, Math.min(u.l, (x - u.ax) * u.ux + (z - u.az) * u.uz));
    const cx = u.ax + u.ux * t, cz = u.az + u.uz * t;
    const d = Math.hypot(x - cx, z - cz);
    if (d < nd) { nd = d; naj = { cx, cz, pol: u.pol, jednosmerka: u.jednosmerka }; }
  }
  return naj;
}

/** Zberač geometrie: trojuholníky stĺpov a ramien, úsečky drôtov. */
class Zberac {
  constructor() { this.poz = []; this.idx = []; this.ciary = []; }

  /** Hranol so štvorcovým prierezom 2r okolo úsečky a → b (body [x, y, z]). */
  tram(a, b, r) {
    const dx = b[0] - a[0], dy = b[1] - a[1], dz = b[2] - a[2];
    const L = Math.hypot(dx, dy, dz) || 1;
    const sx = dx / L, sy = dy / L, sz = dz / L;
    let ux = -sz, uy = 0, uz = sx;
    let lu = Math.hypot(ux, uy, uz);
    if (lu < 1e-6) { ux = 1; uy = 0; uz = 0; lu = 1; }
    ux /= lu; uy /= lu; uz /= lu;
    const vx = sy * uz - sz * uy, vy = sz * ux - sx * uz, vz = sx * uy - sy * ux;
    const i0 = this.poz.length / 3;
    for (const p of [a, b]) {
      for (const [m, n] of [[1, 1], [-1, 1], [-1, -1], [1, -1]]) {
        this.poz.push(p[0] + (ux * m + vx * n) * r, p[1] + (uy * m + vy * n) * r, p[2] + (uz * m + vz * n) * r);
      }
    }
    for (let s = 0; s < 4; s++) {
      const p = i0 + s, q = i0 + ((s + 1) % 4);
      this.idx.push(p, p + 4, q, q, p + 4, q + 4);
    }
    this.idx.push(i0 + 4, i0 + 5, i0 + 6, i0 + 4, i0 + 6, i0 + 7);   // vrch
  }

  ciara(a, b) { this.ciary.push(a[0], a[1], a[2], b[0], b[1], b[2]); }

  objekty() {
    const M = mat();
    const out = [];
    if (this.idx.length) {
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(this.poz, 3));
      g.setIndex(this.idx);
      g.computeVertexNormals();
      const m = new THREE.Mesh(g, M.stlp);
      m.castShadow = false; m.receiveShadow = true;
      m.name = 'trakcia-stlpy';
      out.push(m);
    }
    if (this.ciary.length) {
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(this.ciary, 3));
      const l = new THREE.LineSegments(g, M.drot);
      l.name = 'trakcia-drôty';
      out.push(l);
    }
    return out;
  }
}

/**
 * Postaví vedenie dlaždice.
 *   data   – dáta dlaždice (kolajnice, cesty)
 *   trolej – úseky trás trolejbusov v okolí: [{ ax, az, bx, bz }] (smer jazdy a → b)
 *   rect   – { minX, maxX, minZ, maxZ } dlaždice (stĺpy a drôty len vnútri – susedná dlaždica si kreslí svoje)
 *   vyska(x, z) – výška vozovky; mostovka(x, z) – výška mosta alebo null
 *   vDome(x, z) – je bod v pôdoryse domu?
 *   kolizie – kolízie dlaždice (pridajKruh) alebo null
 * Vracia THREE.Group alebo null.
 */
export function postavVedenie({ data, trolej = [], rect, vyska, mostovka, vDome, kolizie }) {
  const Z = new Zberac();
  const mriezka = mriezkaCiest(data.cesty);
  const vnutri = (x, z) => x >= rect.minX && x < rect.maxX && z >= rect.minZ && z < rect.maxZ;
  let stlpov = 0;

  /** Stĺp v bode s (x, z) s ramenom k bodu nad drôtom (k = [x, z]); na fasáde len lano. */
  const stlp = (sx, sz, kx, kz, y0, sirkaRamena = 0) => {
    const yv = y0 + VYSKA_RAMENA;
    if (vDome?.(sx, sz)) {
      // úzka ulica: lano z fasády
      Z.ciara([sx, yv + 0.4, sz], [kx, yv, kz]);
      return;
    }
    Z.tram([sx, y0 - 0.2, sz], [sx, y0 + VYSKA_STLPA, sz], 0.11);
    Z.tram([sx, yv, sz], [kx, yv, kz], 0.045);
    // šikmá vzpera ramena
    Z.tram([sx, yv - 0.9, sz], [sx + (kx - sx) * 0.4, yv, sz + (kz - sz) * 0.4], 0.03);
    if (sirkaRamena > 0) {
      // priečnik nad dvojicou drôtov trolejbusu
      const dx = kx - sx, dz = kz - sz, l = Math.hypot(dx, dz) || 1;
      const nx = dx / l, nz = dz / l;
      Z.tram([kx - nx * sirkaRamena, yv, kz - nz * sirkaRamena], [kx + nx * sirkaRamena, yv, kz + nz * sirkaRamena], 0.03);
    }
    kolizie?.pridajKruh(sx, sz, 0.18, { typ: 'lampa' });
    stlpov++;
  };

  // --- električky: drôt nad každou koľajou ---
  const kolaje = (data.kolajnice ?? []).filter((k) => k.typ === 'elektricka' && k.body?.length >= 2);
  // na zistenie vonkajšej strany: body všetkých električkových koľají dlaždice
  const susedna = (x, z, ja) => {
    for (const k of kolaje) {
      if (k === ja) continue;
      for (let i = 1; i < k.body.length; i++) {
        const [ax, az] = k.body[i - 1], [bx, bz] = k.body[i];
        const dx = bx - ax, dz = bz - az, l2 = dx * dx + dz * dz || 1;
        const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / l2));
        if (Math.hypot(ax + dx * t - x, az + dz * t - z) < 1.3) return true;
      }
    }
    return false;
  };
  for (const k of kolaje) {
    const naMoste = !!(k.most || k.nadjazd);
    const yBod = (x, z) => (naMoste ? mostovka?.(x, z) : null) ?? vyska(x, z);
    // drôt: body koľaje, dlhé úseky rozdelené po 8 m
    const body = [];
    for (let i = 0; i < k.body.length; i++) {
      const [x, z] = k.body[i];
      if (i > 0) {
        const [px, pz] = k.body[i - 1];
        const l = Math.hypot(x - px, z - pz);
        for (let s = 8; s < l; s += 8) body.push([px + (x - px) * s / l, pz + (z - pz) * s / l]);
      }
      body.push([x, z]);
    }
    for (let i = 1; i < body.length; i++) {
      const [ax, az] = body[i - 1], [bx, bz] = body[i];
      if (!vnutri((ax + bx) / 2, (az + bz) / 2)) continue;
      Z.ciara([ax, yBod(ax, az) + VYSKA_DROTU, az], [bx, yBod(bx, bz) + VYSKA_DROTU, bz]);
    }
    // stĺpy po ROZOSTUP m (fáza podľa polohy – rovnaká pri každom načítaní)
    let s0 = 0;
    for (let i = 1; i < k.body.length; i++) {
      const [ax, az] = k.body[i - 1], [bx, bz] = k.body[i];
      const l = Math.hypot(bx - ax, bz - az);
      if (l < 0.1) continue;
      const ux = (bx - ax) / l, uz = (bz - az) / l, nx = -uz, nz = ux;
      for (let s = (ROZOSTUP - (s0 % ROZOSTUP)) % ROZOSTUP; s < l; s += ROZOSTUP) {
        const x = ax + ux * s, z = az + uz * s;
        if (!vnutri(x, z)) continue;
        // vonkajšia strana = tam, kde nie je druhá koľaj
        const strana = susedna(x + nx * 3.2, z + nz * 3.2, k) ? -1 : 1;
        const v = vozovkaPri(mriezka, x, z, ux, uz);
        let d = 2.2;
        if (v) {
          const o = (x - v.cx) * nx + (z - v.cz) * nz;      // posun koľaje od osi cesty (kladný = strana +n)
          if (Math.abs(o) < v.pol + 0.5) d = Math.max(2.2, Math.abs(strana * v.pol - o) + 0.6);
        }
        stlp(x + nx * d * strana, z + nz * d * strana, x, z, yBod(x, z));
      }
      s0 += l;
    }
  }

  // --- trolejbusy: dvojica drôtov nad pruhom vpravo v smere jazdy ---
  const hotove = new Set();
  const stlpyKluce = new Set();
  for (const u of trolej) {
    const l = Math.hypot(u.bx - u.ax, u.bz - u.az);
    if (l < 0.5) continue;
    const ux = (u.bx - u.ax) / l, uz = (u.bz - u.az) / l;
    const uhol = Math.round(Math.atan2(uz, ux) / (Math.PI / 12));
    const kusov = Math.max(1, Math.round(l / KUS));
    for (let j = 0; j < kusov; j++) {
      const x0 = u.ax + (u.bx - u.ax) * j / kusov, z0 = u.az + (u.bz - u.az) * j / kusov;
      const x1 = u.ax + (u.bx - u.ax) * (j + 1) / kusov, z1 = u.az + (u.bz - u.az) * (j + 1) / kusov;
      const mx = (x0 + x1) / 2, mz = (z0 + z1) / 2;
      if (!vnutri(mx, mz)) continue;
      const kluc = `${Math.round(mx / 4)},${Math.round(mz / 4)},${uhol}`;
      if (hotove.has(kluc)) continue;
      hotove.add(kluc);
      // bod nad pruhom: os vozovky + posun vpravo (obojsmerná cesta – stred pravej polovice)
      const pruh = (x, z) => {
        const v = vozovkaPri(mriezka, x, z, ux, uz);
        const nx = -uz, nz = ux;           // vpravo v smere jazdy (x východ, z juh: na sever (0, −1) je vpravo východ)
        if (!v) {
          // bez cesty na zemi – trasa ide asi po moste (nadjazdy sa do mriežky ciest nedávajú)
          const px = x + nx * 1.8, pz = z + nz * 1.8;
          return { x: px, z: pz, nx, nz, okraj: 4.2, cx: x, cz: z, y: mostovka?.(px, pz) ?? vyska(px, pz) };
        }
        const posun = v.jednosmerka ? Math.max(0, v.pol - 1.8) : Math.min(3.5, v.pol / 2);
        const px = v.cx + nx * posun, pz = v.cz + nz * posun;
        return { x: px, z: pz, nx, nz, okraj: v.pol + 0.6, cx: v.cx, cz: v.cz, y: vyska(px, pz) };
      };
      const p0 = pruh(x0, z0), p1 = pruh(x1, z1);
      const y0 = p0.y + VYSKA_DROTU, y1 = p1.y + VYSKA_DROTU;
      for (const s of [-0.3, 0.3]) {
        Z.ciara([p0.x + p0.nx * s, y0, p0.z + p0.nz * s], [p1.x + p1.nx * s, y1, p1.z + p1.nz * s]);
      }
      // stĺp pri okraji vozovky vpravo, najviac jeden v bunke ROZOSTUP × ROZOSTUP pre daný smer
      const kS = `${Math.round(p0.x / ROZOSTUP)},${Math.round(p0.z / ROZOSTUP)},${uhol}`;
      if (!stlpyKluce.has(kS)) {
        stlpyKluce.add(kS);
        const sx = p0.cx + p0.nx * p0.okraj, sz = p0.cz + p0.nz * p0.okraj;
        stlp(sx, sz, p0.x, p0.z, p0.y, 0.45);
      }
    }
  }

  const objekty = Z.objekty();
  if (!objekty.length) return null;
  const g = new THREE.Group();
  g.name = 'trakcia';
  g.userData.stlpov = stlpov;
  for (const o of objekty) g.add(o);
  return g;
}
