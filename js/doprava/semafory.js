// Modul: semafory na križovatkách (polohy z OSM) so striedaním fáz.
// Semafory jednej križovatky sa delia na dve skupiny podľa smeru príjazdu (A / B).
//
//   hra.doprava.semafor(x, z, smerX, smerZ) → 'zelena' | 'oranzova' | 'cervena' | null
//   – stav semafora, ku ktorému sa blíži vozidlo v bode (x,z) idúce smerom (smerX, smerZ)

import * as THREE from 'three';
import { najdiKrizovatky } from '../mapa/cesty/krizovatky.js';
import { najblizsiNaUsecke } from '../mapa/geometria.js';

const FAZY = [['zelena', 14], ['oranzova', 3], ['cervena', 2]]; // pre skupinu A; B je posunutá
const CYKLUS = 2 * FAZY.reduce((s, f) => s + f[1], 0);
const FARBY = { cervena: '#ff2a1a', oranzova: '#ffb000', zelena: '#2aff6a' };
const TMAVA = new THREE.Color('#1a1a1a');

function fazaSkupiny(cas, skupinaB) {
  let t = ((cas % CYKLUS) + CYKLUS) % CYKLUS;
  if (skupinaB) t = (t + CYKLUS / 2) % CYKLUS;
  for (const [f, d] of FAZY) { if (t < d) return f; t -= d; }
  return 'cervena'; // druhá polovica cyklu – zelenú má druhá skupina
}

export default {
  nazov: 'semafory',
  poradie: 30,

  init(hra) {
    hra.doprava ??= {};
    const data = hra.mapa.data;
    const body = data.prvky?.semafory ?? [];
    const cesty = data.cesty ?? [];
    if (!body.length) { hra.doprava.semafor = () => null; return; }
    const { krizovatky } = najdiKrizovatky(cesty);
    const zoznamK = [...krizovatky.values()];

    // každý semafor: najbližšia cesta → smer príjazdu ku križovatke
    this.semafory = [];
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
      // najbližšia križovatka
      let kr = null, min = 60;
      for (const k of zoznamK) {
        const d = Math.hypot(k.x - x, k.z - z);
        if (d < min) { min = d; kr = k; }
      }
      if (!kr) continue;
      let dx = naj.bx - naj.ax, dz = naj.bz - naj.az;
      const d = Math.hypot(dx, dz) || 1; dx /= d; dz /= d;
      // smer jazdy = ku križovatke
      if ((kr.x - naj.x) * dx + (kr.z - naj.z) * dz < 0) { dx = -dx; dz = -dz; }
      const kk = `${kr.x},${kr.z}`;
      if (!skupinyKrizovatiek.has(kk)) skupinyKrizovatiek.set(kk, { os: [dx, dz], posun: Math.random() * CYKLUS });
      const sk = skupinyKrizovatiek.get(kk);
      const skupinaB = Math.abs(sk.os[0] * dx + sk.os[1] * dz) < Math.SQRT1_2;
      const pol = naj.c.sirka / 2 + 1;
      this.semafory.push({
        x: naj.x - dz * pol, z: naj.z + dx * pol, // vpravo od jazdného smeru
        dx, dz, cx: naj.x, cz: naj.z, skupinaB, posun: sk.posun, stav: null,
      });
    }

    // model: stĺp + skrinka + 3 svetlá (InstancedMesh, farby svetiel sa menia)
    const n = this.semafory.length;
    const stlpGeo = new THREE.CylinderGeometry(0.07, 0.08, 3.6, 6); stlpGeo.translate(0, 1.8, 0);
    const skrinkaGeo = new THREE.BoxGeometry(0.34, 1.0, 0.28); skrinkaGeo.translate(0, 3.2, 0);
    const svetloGeo = new THREE.CircleGeometry(0.11, 10);
    this.stlpy = new THREE.InstancedMesh(stlpGeo, new THREE.MeshStandardMaterial({ color: '#2d3133', metalness: 0.5 }), n);
    this.skrinky = new THREE.InstancedMesh(skrinkaGeo, new THREE.MeshStandardMaterial({ color: '#1c1f20' }), n);
    this.svetla = ['cervena', 'oranzova', 'zelena'].map((farba, k) => {
      const g = svetloGeo.clone(); g.translate(0, 3.52 - k * 0.32, 0.15);
      const m = new THREE.InstancedMesh(g, new THREE.MeshBasicMaterial({ color: '#ffffff' }), n);
      m.userData.farba = new THREE.Color(FARBY[farba]);
      m.userData.nazov = farba;
      return m;
    });
    const o = new THREE.Object3D();
    this.semafory.forEach((s, i) => {
      o.position.set(s.x, hra.mapa.vyska(s.x, s.z) + 0.25, s.z);
      o.rotation.set(0, Math.atan2(-s.dx, -s.dz), 0); // svetlá hľadia na prichádzajúce autá
      o.updateMatrix();
      this.stlpy.setMatrixAt(i, o.matrix);
      this.skrinky.setMatrixAt(i, o.matrix);
      for (const m of this.svetla) m.setMatrixAt(i, o.matrix);
      hra.mapa.kolizie.pridajKruh(s.x, s.z, 0.15, { typ: 'semafor' });
    });
    const skupina = new THREE.Group();
    skupina.name = 'semafory';
    for (const m of [this.stlpy, this.skrinky, ...this.svetla]) { m.computeBoundingSphere(); skupina.add(m); }
    this.stlpy.castShadow = this.skrinky.castShadow = true;
    hra.scena.add(skupina);

    hra.doprava.semafor = (x, z, smerX, smerZ) => {
      let naj = null, min = 35;
      for (const s of this.semafory) {
        if (s.dx * smerX + s.dz * smerZ < 0.7) continue;
        const d = Math.hypot(s.cx - x, s.cz - z);
        if (d < min && (s.cx - x) * smerX + (s.cz - z) * smerZ > 0) { min = d; naj = s; }
      }
      return naj ? naj.stav : null;
    };
    this.updateVzdy(0, hra);
  },

  updateVzdy(dt, hra) {
    if (!this.semafory) return;
    const cas = hra.stav.cas;
    let zmena = false;
    this.semafory.forEach((s, i) => {
      const stav = fazaSkupiny(cas + s.posun, s.skupinaB);
      if (stav === s.stav) return;
      s.stav = stav;
      zmena = true;
      for (const m of this.svetla) m.setColorAt(i, m.userData.nazov === stav ? m.userData.farba : TMAVA);
    });
    if (zmena) for (const m of this.svetla) m.instanceColor.needsUpdate = true;
  },

};
