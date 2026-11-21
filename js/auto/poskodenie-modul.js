// Modul poškodenia áut: počúva udalosť 'naraz', preliačí auto (poskodenie.js), vyletia iskry
// a karoséria sa otrasie. Keď je auto doráňané, z kapoty sa dymí.
// Iskry aj dym sú jeden THREE.Points s vlastným malým shaderom (veľkosť a priehľadnosť na časticu).

import * as THREE from 'three';
import { poskod } from './poskodenie.js';

const MAX_CASTIC = 600;
const DYM_OD = 0.55;          // nahromadená hĺbka preliačín (m), od ktorej sa z kapoty dymí
const OTRAS_CAS = 0.45;

const vs = /* glsl */`
  attribute float velkost;
  attribute vec4 farba;
  varying vec4 vFarba;
  uniform float mierka;
  void main() {
    vFarba = farba;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = velkost * mierka / max(0.5, -mv.z);
    gl_Position = projectionMatrix * mv;
  }`;
const fs = /* glsl */`
  varying vec4 vFarba;
  uniform float mekke;
  void main() {
    vec2 d = gl_PointCoord - 0.5;
    float r = length(d) * 2.0;
    if (r > 1.0) discard;
    float a = mix(1.0 - step(0.8, r), 1.0 - smoothstep(0.0, 1.0, r), mekke);
    gl_FragColor = vec4(vFarba.rgb, vFarba.a * a);
  }`;

/** Zásobník častíc (iskry alebo dym) – kruhový, najstaršie sa prepíšu. */
class Castice {
  constructor(scena, { aditivne, mekke }) {
    this.n = MAX_CASTIC;
    this.pos = new Float32Array(this.n * 3);
    this.rych = new Float32Array(this.n * 3);
    this.farba = new Float32Array(this.n * 4);
    this.velkost = new Float32Array(this.n);
    this.zivot = new Float32Array(this.n);     // zostávajúci čas
    this.dlzka = new Float32Array(this.n);     // celkový čas
    this.rast = new Float32Array(this.n);
    this.alfa = new Float32Array(this.n);
    this.dalsi = 0;
    this.aktivne = 0;
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('farba', new THREE.BufferAttribute(this.farba, 4).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('velkost', new THREE.BufferAttribute(this.velkost, 1).setUsage(THREE.DynamicDrawUsage));
    this.mat = new THREE.ShaderMaterial({
      vertexShader: vs, fragmentShader: fs,
      uniforms: { mierka: { value: 600 }, mekke: { value: mekke ? 1 : 0 } },
      transparent: true, depthWrite: false,
      blending: aditivne ? THREE.AdditiveBlending : THREE.NormalBlending,
    });
    this.body = new THREE.Points(g, this.mat);
    this.body.frustumCulled = false;
    this.body.renderOrder = 5;
    scena.add(this.body);
  }

  pridaj(x, y, z, vx, vy, vz, cas, velkost, rast, r, gg, b, a) {
    const i = this.dalsi;
    this.dalsi = (this.dalsi + 1) % this.n;
    this.pos.set([x, y, z], i * 3);
    this.rych.set([vx, vy, vz], i * 3);
    this.farba.set([r, gg, b, a], i * 4);
    this.velkost[i] = velkost;
    this.zivot[i] = cas; this.dlzka[i] = cas;
    this.rast[i] = rast;
    this.alfa[i] = a;
    this.aktivne = Math.max(this.aktivne, 1);
  }

  /** gravitacia (m/s²), odpor (1/s), zemY(x,z) – iskry sa odrážajú od zeme */
  update(dt, gravitacia, odpor, zemY, alfaNasobok) {
    let ziju = 0;
    for (let i = 0; i < this.n; i++) {
      if (this.zivot[i] <= 0) continue;
      this.zivot[i] -= dt;
      if (this.zivot[i] <= 0) { this.farba[i * 4 + 3] = 0; this.velkost[i] = 0; continue; }
      ziju++;
      const j = i * 3;
      this.rych[j + 1] -= gravitacia * dt;
      const o = Math.exp(-odpor * dt);
      this.rych[j] *= o; this.rych[j + 1] *= o; this.rych[j + 2] *= o;
      this.pos[j] += this.rych[j] * dt;
      this.pos[j + 1] += this.rych[j + 1] * dt;
      this.pos[j + 2] += this.rych[j + 2] * dt;
      if (zemY) {
        const y0 = zemY(this.pos[j], this.pos[j + 2]) + 0.03;
        if (this.pos[j + 1] < y0) { this.pos[j + 1] = y0; this.rych[j + 1] *= -0.35; this.rych[j] *= 0.6; this.rych[j + 2] *= 0.6; }
      }
      this.velkost[i] += this.rast[i] * dt;
      const t = this.zivot[i] / this.dlzka[i];
      this.farba[i * 4 + 3] = this.alfa[i] * alfaNasobok * Math.min(1, t * 1.6) * Math.min(1, (1 - t) * 8 + 0.15);
      if (gravitacia > 0) { // iskry chladnú: zo žltobielej do oranžovej
        this.farba[i * 4 + 1] = 0.35 + 0.6 * t;
        this.farba[i * 4 + 2] = 0.1 + 0.5 * t * t;
      }
    }
    this.aktivne = ziju;
    const g = this.body.geometry;
    g.attributes.position.needsUpdate = true;
    g.attributes.farba.needsUpdate = true;
    g.attributes.velkost.needsUpdate = true;
    this.body.visible = ziju > 0;
  }
}

export default {
  nazov: 'poskodenie-aut',
  poradie: 60,

  init(hra) {
    this.iskry = new Castice(hra.scena, { aditivne: true, mekke: false });
    this.dym = new Castice(hra.scena, { aditivne: false, mekke: true });
    this.otrasy = new Map();   // auto → { t, x, z, a }
    this.dymCas = 0;

    hra.na('naraz', (e) => {
      if (!e?.auto) return;
      this._zasah(hra, e.auto, e);
      if (e.ine && e.ine.mesh) this._zasah(hra, e.ine, { ...e, nx: -(e.nx ?? 0), nz: -(e.nz ?? 0), chodec: false });
    });
  },

  _zasah(hra, auto, e) {
    const vysledok = poskod(auto, e);
    if (!vysledok) return;
    const sila = e.sila ?? 5;
    // otras karosérie v smere nárazu
    this.otrasy.set(auto, { t: 0, x: -vysledok.smer.x, z: -vysledok.smer.z, a: Math.min(0.16, sila * 0.012) });
    if (e.chodec) return;
    // iskry – len pri náraze do niečoho tvrdého a blízko kamery
    if (hra.kamera.position.distanceToSquared(vysledok.bod) > 160 * 160) return;
    const n = Math.min(70, Math.round(sila * 4));
    const b = vysledok.bod, s = vysledok.smer;
    for (let i = 0; i < n; i++) {
      // odletia hlavne nabok od miesta nárazu (dotyčnica) a trochu späť a hore
      const bok = (Math.random() - 0.5) * 2;
      const v = 2 + Math.random() * (3 + sila * 0.4);
      const vx = (-s.z * bok - s.x * 0.5) * v + (Math.random() - 0.5) * 1.5;
      const vz = (s.x * bok - s.z * 0.5) * v + (Math.random() - 0.5) * 1.5;
      const vy = 1 + Math.random() * 3.5;
      this.iskry.pridaj(b.x, b.y, b.z, vx, vy, vz, 0.35 + Math.random() * 0.55, 0.07 + Math.random() * 0.06, -0.05, 1, 0.95, 0.6, 1);
    }
    // obláčik prachu / úlomkov
    for (let i = 0; i < 6; i++) {
      this.dym.pridaj(b.x, b.y - 0.2, b.z, (Math.random() - 0.5) * 1.2, 0.4 + Math.random() * 0.6, (Math.random() - 0.5) * 1.2,
        1.0 + Math.random() * 0.6, 0.6, 1.4, 0.55, 0.53, 0.5, 1);
    }
  },

  update(dt, hra) {
    // otrasy: tlmené kmitanie karosérie (auto.js nastavuje len rotáciu tela, posun je náš)
    for (const [auto, o] of this.otrasy) {
      const telo = auto.mesh?.userData?.telo;
      o.t += dt;
      if (!telo || o.t > OTRAS_CAS) { if (telo) telo.position.set(0, 0, 0); this.otrasy.delete(auto); continue; }
      const k = o.a * Math.exp(-o.t * 9) * Math.cos(o.t * 38);
      // posun v lokálnych súradniciach auta
      const u = auto.uhol, c = Math.cos(u), s = Math.sin(u);
      telo.position.set((o.x * c - o.z * s) * k, Math.abs(k) * 0.3, (o.x * s + o.z * c) * k);
    }

    // dym z doráňaných áut (len tie blízko kamery)
    this.dymCas -= dt;
    if (this.dymCas <= 0) {
      this.dymCas = 0.09;
      const kam = hra.kamera.position;
      for (const a of hra.auta) {
        if ((a.poskodenie ?? 0) < DYM_OD) continue;
        if (Math.abs(a.pozicia.x - kam.x) > 120 || Math.abs(a.pozicia.z - kam.z) > 120) continue;
        const ud = a.mesh.userData;
        const pz = (ud.predok ?? 2.2) - 0.7;
        const sx = Math.sin(a.uhol), sz = Math.cos(a.uhol);
        const tazky = a.poskodenie > DYM_OD * 2.2;
        const sv = tazky ? 0.22 : 0.5; // čím viac poškodené, tým tmavší dym
        this.dym.pridaj(
          a.pozicia.x + sx * pz + (Math.random() - 0.5) * 0.5, a.pozicia.y + 1.05, a.pozicia.z + sz * pz + (Math.random() - 0.5) * 0.5,
          a.vx * 0.3 + (Math.random() - 0.5) * 0.3, 0.9 + Math.random() * 0.5, a.vz * 0.3 + (Math.random() - 0.5) * 0.3,
          1.8 + Math.random(), 0.5, tazky ? 1.6 : 1.1, sv, sv, sv * 1.02, tazky ? 0.75 : 0.5,
        );
      }
    }

    const zem = (x, z) => hra.mapa.vyska(x, z);
    this.iskry.mat.uniforms.mierka.value = hra.renderer?.domElement ? hra.renderer.domElement.height * 0.9 : 600;
    this.dym.mat.uniforms.mierka.value = this.iskry.mat.uniforms.mierka.value;
    if (this.iskry.aktivne) this.iskry.update(dt, 9.81, 0.6, zem, 1);
    if (this.dym.aktivne) this.dym.update(dt, -0.25, 0.8, null, 0.55);
  },
};
