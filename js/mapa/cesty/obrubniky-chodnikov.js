// Obrubníky samostatných chodníkov v zeleni (pravidlá ulice #136): chodník, ktorý nejde popri ceste (parky, sídliská,
// pásy zelene medzi cestou a domami), má po oboch stranách nízky betónový obrubník – rovná čistá hrana medzi dlažbou
// a trávou namiesto rozmazaného okraja textúry zeme.
// Obrubník sa vynechá tam, kde by bol na vozovke alebo chodníku cesty, na inom chodníku (odbočky, križovanie),
// v budove, na námestí, parkovisku či v historickom jadre (dlažba od domu po dom) a na lávkach.

import * as THREE from 'three';
import { bodVPolygone } from '../geometria.js';
import { mriezkaVozoviek } from './vozovky.js';
import { SIRKA as SIRKA_CHODNIKA, sChodnikom } from './chodnik-rozmery.js';
import { vJadre } from '../teren/textura-zeme.js';

const TYPY = new Set(['footway', 'cycleway', 'path', 'corridor']);
const HRUBKA = 0.12;     // m – šírka obrubníka
const VYSKA = 0.07;      // m nad terénom
const KROK = 2;          // m – delenie, aby obrubník kopíroval terén
const BUNKA = 20;
const DLAZBA = new Set(['dlazba', 'parkovisko']);

/** Mriežka osí chodníkov: je bod na inom chodníku (do jeho polšírky + rezerva)? */
function mriezkaChodnikov(chodniky) {
  const m = new Map();
  for (const ch of chodniky) {
    const pol = (ch.sirka ?? 2) / 2;
    for (let i = 1; i < ch.body.length; i++) {
      const [ax, az] = ch.body[i - 1], [bx, bz] = ch.body[i];
      const u = { ax, az, bx, bz, pol, ch };
      for (let gi = Math.floor((Math.min(ax, bx) - pol) / BUNKA); gi <= Math.floor((Math.max(ax, bx) + pol) / BUNKA); gi++) {
        for (let gj = Math.floor((Math.min(az, bz) - pol) / BUNKA); gj <= Math.floor((Math.max(az, bz) + pol) / BUNKA); gj++) {
          const k = gi * 100003 + gj;
          if (!m.has(k)) m.set(k, []);
          m.get(k).push(u);
        }
      }
    }
  }
  return (x, z, okrem, rezerva) => {
    for (const u of m.get(Math.floor(x / BUNKA) * 100003 + Math.floor(z / BUNKA)) ?? []) {
      if (u.ch === okrem) continue;
      const dx = u.bx - u.ax, dz = u.bz - u.az, L2 = dx * dx + dz * dz || 1e-9;
      const t = Math.max(0, Math.min(1, ((x - u.ax) * dx + (z - u.az) * dz) / L2));
      if (Math.hypot(x - u.ax - dx * t, z - u.az - dz * t) < u.pol + rezerva) return true;
    }
    return false;
  };
}

/**
 * @param {object} d  dáta dlaždice (chodniky, cesty, budovy, pokryvka)
 * @param {{ vyska(x, z): number }} vyskopis
 */
export function vytvorObrubnikyChodnikov(d, vyskopis) {
  const chodniky = (d.chodniky ?? []).filter((ch) => TYPY.has(ch.typ) && !ch.nadjazd && ch.body?.length > 1);
  const skupina = new THREE.Group();
  skupina.name = 'obrubniky-chodnikov';
  if (!chodniky.length) return skupina;
  const cesty = (d.cesty ?? []).filter((c) => !c.nadjazd);
  const vozovky = mriezkaVozoviek(cesty);
  const sChodnikomCesty = mriezkaVozoviek(cesty.filter(sChodnikom).map((c) => ({ ...c, sirka: c.sirka + 2 * (SIRKA_CHODNIKA + 0.3) })));
  const naChodniku = mriezkaChodnikov(chodniky);
  const domy = (d.budovy ?? []).filter((b) => !((b.minVyska ?? 0) > 2.5) && b.body?.length > 2).map((b) => ({ body: b.body, ...obalka(b.body) }));
  const plochy = (d.pokryvka ?? []).filter((p) => DLAZBA.has(p.k) && p.body?.length > 2).map((p) => ({ body: p.body, ...obalka(p.body) }));
  const vPolygone = (zoznam, x, z) => zoznam.some((p) => x > p.minX && x < p.maxX && z > p.minZ && z < p.maxZ && bodVPolygone(x, z, p.body));
  const volno = (x, z, ch) => !vozovky.naVozovke(x, z, null, -0.3) && !sChodnikomCesty.naVozovke(x, z, null, 0)
    && !naChodniku(x, z, ch, 0.05) && !vJadre(x, z) && !vPolygone(domy, x, z) && !vPolygone(plochy, x, z);

  const poz = [];
  const pridajUsek = (a, b) => {
    // kváder obrubníka medzi bodmi a, b (stredy) – vrch a obe bočné steny
    const dx = b[0] - a[0], dz = b[1] - a[1], L = Math.hypot(dx, dz) || 1;
    const nx = (-dz / L) * HRUBKA / 2, nz = (dx / L) * HRUBKA / 2;
    const ya = vyskopis.vyska(a[0], a[1]), yb = vyskopis.vyska(b[0], b[1]);
    const A1 = [a[0] + nx, ya + VYSKA, a[1] + nz], A2 = [a[0] - nx, ya + VYSKA, a[1] - nz];
    const B1 = [b[0] + nx, yb + VYSKA, b[1] + nz], B2 = [b[0] - nx, yb + VYSKA, b[1] - nz];
    const A1d = [A1[0], ya - 0.05, A1[2]], A2d = [A2[0], ya - 0.05, A2[2]], B1d = [B1[0], yb - 0.05, B1[2]], B2d = [B2[0], yb - 0.05, B2[2]];
    poz.push(...A1, ...B1, ...B2, ...A1, ...B2, ...A2);          // vrch (normála nahor)
    poz.push(...A1d, ...B1, ...B1d, ...A1d, ...A1, ...B1);       // strana +n
    poz.push(...A2d, ...B2d, ...B2, ...A2d, ...B2, ...A2);       // strana −n
  };

  for (const ch of chodniky) {
    const pol = (ch.sirka ?? 2) / 2 + HRUBKA / 2;
    // body osi po KROK m
    const os = [];
    for (let i = 0; i < ch.body.length - 1; i++) {
      const [ax, az] = ch.body[i], [bx, bz] = ch.body[i + 1];
      const n = Math.max(1, Math.ceil(Math.hypot(bx - ax, bz - az) / KROK));
      for (let k = 0; k < n; k++) os.push([ax + ((bx - ax) * k) / n, az + ((bz - az) * k) / n]);
    }
    os.push(ch.body[ch.body.length - 1]);
    if (os.length < 2) continue;
    for (const strana of [1, -1]) {
      let pred = null;
      for (let i = 0; i < os.length; i++) {
        const prev = os[Math.max(0, i - 1)], next = os[Math.min(os.length - 1, i + 1)];
        let dx = next[0] - prev[0], dz = next[1] - prev[1];
        const L = Math.hypot(dx, dz) || 1; dx /= L; dz /= L;
        const p = [os[i][0] - dz * pol * strana, os[i][1] + dx * pol * strana];
        const ok = volno(p[0], p[1], ch);
        if (ok && pred) pridajUsek(pred, p);
        pred = ok ? p : null;
      }
    }
  }
  if (!poz.length) return skupina;
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(poz, 3));
  geo.computeVertexNormals();
  const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: '#b3afa6', roughness: 0.9, side: THREE.DoubleSide }));
  mesh.receiveShadow = true;
  skupina.add(mesh);
  return skupina;
}

function obalka(body) {
  let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
  for (const [x, z] of body) { minX = Math.min(minX, x); maxX = Math.max(maxX, x); minZ = Math.min(minZ, z); maxZ = Math.max(maxZ, z); }
  return { minX, maxX, minZ, maxZ };
}
