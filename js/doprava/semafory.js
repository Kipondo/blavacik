// Modul: semafory na križovatkách (polohy z OSM) so striedaním fáz.
// Semafory jednej križovatky sa delia na dve skupiny podľa smeru príjazdu (A / B).
// Pri celom meste sa semafory stavajú a rušia spolu s dlaždicami (udalosti dlaždíc).
//
//   hra.doprava.semafor(x, z, smerX, smerZ) → 'zelena' | 'oranzova' | 'cervena' | null
//   – stav semafora, ku ktorému sa blíži vozidlo v bode (x,z) idúce smerom (smerX, smerZ)

import * as THREE from 'three';
import { najdiKrizovatky } from '../mapa/cesty/krizovatky.js';
import { najblizsiNaUsecke } from '../mapa/geometria.js';

const FAZY = [['zelena', 14], ['oranzova', 3], ['cervena', 2]];
const CYKLUS = 2 * FAZY.reduce((s, f) => s + f[1], 0);
const FARBY = { cervena: '#ff2a1a', oranzova: '#ffb000', zelena: '#2aff6a' };
const TMAVA = new THREE.Color('#1a1a1a');

function fazaSkupiny(cas, skupinaB) {
  let t = ((cas % CYKLUS) + CYKLUS) % CYKLUS;
  if (skupinaB) t = (t + CYKLUS / 2) % CYKLUS;
  for (const [f, d] of FAZY) { if (t < d) return f; t -= d; }
  return 'cervena';
}

// zdieľané geometrie a materiály
let zdroje = null;
function ziskajZdroje() {
  if (zdroje) return zdroje;
  const stlpGeo = new THREE.CylinderGeometry(0.07, 0.08, 3.6, 6); stlpGeo.translate(0, 1.8, 0);
  const skrinkaGeo = new THREE.BoxGeometry(0.34, 1.0, 0.28); skrinkaGeo.translate(0, 3.2, 0);
  const svetla = ['cervena', 'oranzova', 'zelena'].map((nazov, k) => {
    const g = new THREE.CircleGeometry(0.11, 10); g.translate(0, 3.52 - k * 0.32, 0.15);
    return { nazov, geo: g, farba: new THREE.Color(FARBY[nazov]) };
  });
  for (const g of [stlpGeo, skrinkaGeo, ...svetla.map((s) => s.geo)]) g.userData.zdielane = true;
  zdroje = {
    stlpGeo, skrinkaGeo, svetla,
    matStlp: new THREE.MeshStandardMaterial({ color: '#2d3133', metalness: 0.5 }),
    matSkrinka: new THREE.MeshStandardMaterial({ color: '#1c1f20' }),
    matSvetlo: new THREE.MeshBasicMaterial({ color: '#ffffff' }),
  };
  return zdroje;
}

/** Postaví semafory pre jednu skupinu dát (cesty + prvky.semafory). */
function postavSemafory(cesty, body, mapa, kolizie) {
  if (!body?.length || !cesty?.length) return null;
  const { krizovatky } = najdiKrizovatky(cesty);
  const zoznamK = [...krizovatky.values()];
  const semafory = [];
  const skupinyKrizovatiek = new Map();
  for (const [x, z] of body) {
    let naj = null;
    for (const c of cesty) {
      for (let i = 0; i < c.body.length - 1; i++) {
        const [ax, az] = c.body[i], [bx, bz] = c.body[i + 1];
        if (Math.abs(ax - x) > 60 && Math.abs(bx - x) > 60) continue;
        const n = najblizsiNaUsecke(x, z, ax, az, bx, bz);
        if (n.d2 < 64 && (!naj || n.d2 < naj.d2)) naj = { ...n, c, ax, az, bx, bz };
      }
    }
    if (!naj) continue;
    let kr = null, min = 60;
    for (const k of zoznamK) {
      const d = Math.hypot(k.x - x, k.z - z);
      if (d < min) { min = d; kr = k; }
    }
    if (!kr) continue;
    let dx = naj.bx - naj.ax, dz = naj.bz - naj.az;
    const d = Math.hypot(dx, dz) || 1; dx /= d; dz /= d;
    if ((kr.x - naj.x) * dx + (kr.z - naj.z) * dz < 0) { dx = -dx; dz = -dz; }
    const kk = `${kr.x},${kr.z}`;
    // posun fázy závisí od polohy križovatky – rovnaký pri každom načítaní
    if (!skupinyKrizovatiek.has(kk)) skupinyKrizovatiek.set(kk, { os: [dx, dz], posun: Math.abs(Math.sin(kr.x * 12.9898 + kr.z * 78.233)) * CYKLUS });
    const sk = skupinyKrizovatiek.get(kk);
    const pol = naj.c.sirka / 2 + 1;
    semafory.push({
      x: naj.x - dz * pol, z: naj.z + dx * pol,
      dx, dz, cx: naj.x, cz: naj.z, skupinaB: Math.abs(sk.os[0] * dx + sk.os[1] * dz) < Math.SQRT1_2, posun: sk.posun, stav: null,
    });
  }
  if (!semafory.length) return null;

  const Z = ziskajZdroje();
  const n = semafory.length;
  const stlpy = new THREE.InstancedMesh(Z.stlpGeo, Z.matStlp, n);
  const skrinky = new THREE.InstancedMesh(Z.skrinkaGeo, Z.matSkrinka, n);
  const svetla = Z.svetla.map((s) => {
    const m = new THREE.InstancedMesh(s.geo, Z.matSvetlo, n);
    m.userData = { nazov: s.nazov, farba: s.farba };
    return m;
  });
  const o = new THREE.Object3D();
  semafory.forEach((s, i) => {
    o.position.set(s.x, mapa.vyska(s.x, s.z) + 0.25, s.z);
    o.rotation.set(0, Math.atan2(-s.dx, -s.dz), 0);
    o.updateMatrix();
    stlpy.setMatrixAt(i, o.matrix);
    skrinky.setMatrixAt(i, o.matrix);
    for (const m of svetla) m.setMatrixAt(i, o.matrix);
    kolizie?.pridajKruh(s.x, s.z, 0.15, { typ: 'semafor' });
  });
  const skupina = new THREE.Group();
  skupina.name = 'semafory';
  for (const m of [stlpy, skrinky, ...svetla]) { m.computeBoundingSphere(); skupina.add(m); }
  stlpy.castShadow = skrinky.castShadow = true;
  return { skupina, semafory, svetla };
}

export default {
  nazov: 'semafory',
  poradie: 30,

  init(hra) {
    hra.doprava ??= {};
    this.skupiny = new Map(); // kluc → { skupina, semafory, svetla }

    const pridaj = (kluc, cesty, body, rodic, kolizie) => {
      const s = postavSemafory(cesty, body, hra.mapa, kolizie);
      if (!s) return;
      rodic.add(s.skupina);
      this.skupiny.set(kluc, s);
    };

    const sprava = hra.mapa.dlazdice;
    if (sprava) {
      // celé mesto: semafory patria k dlaždiciam
      const zDlazdice = ({ kluc, uroven, data, objekt }) => {
        if (uroven !== 'detail') return;
        pridaj(kluc, data.cesty, data.prvky?.semafory, objekt, hra.mapa.kolizie.preDlazdicu(kluc));
      };
      for (const [kluc, a] of sprava.aktivne) zDlazdice({ kluc, uroven: a.uroven, data: a.data, objekt: a.objekt });
      hra.na('dlazdica-nacitana', zDlazdice);
      hra.na('dlazdica-uvolnena', ({ kluc }) => this.skupiny.delete(kluc));
    } else {
      pridaj('vsetko', hra.mapa.data.cesty, hra.mapa.data.prvky?.semafory, hra.scena, hra.mapa.kolizie);
    }

    hra.doprava.semafor = (x, z, smerX, smerZ) => {
      let naj = null, min = 35;
      for (const sk of this.skupiny.values()) {
        for (const s of sk.semafory) {
          if (Math.abs(s.cx - x) > 40 || Math.abs(s.cz - z) > 40) continue;
          if (s.dx * smerX + s.dz * smerZ < 0.7) continue;
          const d = Math.hypot(s.cx - x, s.cz - z);
          if (d < min && (s.cx - x) * smerX + (s.cz - z) * smerZ > 0) { min = d; naj = s; }
        }
      }
      return naj ? naj.stav : null;
    };
  },

  updateVzdy(dt, hra) {
    if (!this.skupiny) return;
    const cas = hra.stav.cas;
    for (const sk of this.skupiny.values()) {
      let zmena = false;
      sk.semafory.forEach((s, i) => {
        const stav = fazaSkupiny(cas + s.posun, s.skupinaB);
        if (stav === s.stav) return;
        s.stav = stav;
        zmena = true;
        for (const m of sk.svetla) m.setColorAt(i, m.userData.nazov === stav ? m.userData.farba : TMAVA);
      });
      if (zmena) for (const m of sk.svetla) m.instanceColor.needsUpdate = true;
    }
  },
};
