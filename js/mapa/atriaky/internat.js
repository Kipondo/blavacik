// Modul: internátna izba v Átriakoch cez teleport (issue #91, úloha 2).
// Pri vchode do bloku T (hra.stav.atriakyVchod z js/mapa/atriaky/modul.js) je nápoveda „E – Vojsť do internátu“.
// Po stlačení hra prepne do malej samostatnej scény (chodba a trojlôžková izba): kreslí sa len tá,
// mesto sa nekreslí a hráč v meste stojí (vstup je pre mesto zablokovaný), dlaždice sa nemenia.
// V interiéri sa chodí z pohľadu postavy (WASD, myš), pri dverách na konci chodby „E – Von“ → späť pred vchod.
// Dispozícia podľa verejných zdrojov (mlyny.uniba.sk, Wikipédia): izby okolo jadra s hygienou a kuchynkou,
// trojlôžková izba – posteľ, polička, stolík a stolička pre každého, vešiaková skriňa, umývadlo so zrkadlom,
// spoločná chladnička; sprchy a WC spoločné na poschodí.
// Pre ostatné moduly: hra.stav.vInterieri = true, kým je hráč vnútri; udalosti 'interier-vstup' / 'interier-von'.

import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { NOC } from '../../grafika/noc.js';

const DOSAH = 2.2;            // m – ako blízko dverí sa dá vojsť
const RYCHLOST = 2.4;          // m/s pri chôdzi vnútri
const VYSKA_OCI = 1.62;
const POLOMER = 0.3;

export default {
  nazov: 'internat',
  poradie: 9,   // pred hráčom (10) – stlačenie E pri dverách si vezme skôr, než by nastúpil do auta

  init(hra) {
    this.hra = hra;
    this.vnutri = false;
    this.scena = null;
    this.napoveda = null;
  },

  updateVzdy(dt, hra) {
    if (this.vnutri) { this.pohyb(dt, hra); return; }
    const v = hra.stav.atriakyVchod;
    if (!v || hra.stav.auto || hra.stav.pauza) { this.nastavNapovedu(hra, null); return; }
    const p = hra.hrac?.pozicia;
    const blizko = p && Math.hypot(p.x - v.x, p.z - v.z) < DOSAH && Math.abs(p.y - v.y) < 2.5;
    this.nastavNapovedu(hra, blizko ? 'E – Vojsť do internátu' : null);
    if (blizko && hra.vstup.caka('akcia')) {
      hra.vstup.stlacil('akcia');
      this.vojdi(hra);
    }
  },

  nastavNapovedu(hra, text) {
    if (text === this.napoveda) return;
    // nápovedu iných modulov (nastúpiť do auta) neprepisujeme na null, ak sme ju nenastavili my
    if (text !== null || this.napoveda !== null) hra.ui?.napoveda?.(text);
    this.napoveda = text;
  },

  vojdi(hra) {
    if (!this.scena) this.postavInterier();
    this.vnutri = true;
    hra.stav.vInterieri = true;
    hra.vstup.blokovane = true;   // hráč v meste stojí, kamera mesta sa nehýbe
    this.povodneVykresli = hra.vykresli;
    hra.vykresli = () => {
      hra.renderer.setRenderTarget(null);
      hra.renderer.render(this.scena, this.kamera);
    };
    this.kamera.aspect = innerWidth / innerHeight;
    this.kamera.updateProjectionMatrix();
    // štart v chodbe pri vchode, pohľad do chodby
    this.poz = new THREE.Vector3(0, 0, 0.9);
    this.yaw = 0; this.pitch = 0;
    this.svetloStrop.intensity = 9;
    hra.ui?.sprava?.('Átriaky, blok T – izba 214 je vľavo na konci chodby', 4);
    hra.posli('interier-vstup', { blok: 'T' });
  },

  vyjdi(hra) {
    this.vnutri = false;
    hra.stav.vInterieri = false;
    hra.vstup.blokovane = false;
    hra.vykresli = this.povodneVykresli;
    const v = hra.stav.atriakyVchod;
    if (v && hra.hrac) {
      // pred vchod, otočený od dverí
      hra.hrac.pozicia.set(v.x - Math.sin(v.uhol) * 0.8, v.y, v.z - Math.cos(v.uhol) * 0.8);
      hra.hrac.uhol = v.uhol + Math.PI;
      hra.posli('teleport', { x: hra.hrac.pozicia.x, y: v.y, z: hra.hrac.pozicia.z });
    }
    this.nastavNapovedu(hra, null);
    hra.posli('interier-von', { blok: 'T' });
  },

  /** Chôdza vnútri: surový vstup (mesto má vstup zablokovaný), kolízie so stenami (obdĺžniky). */
  pohyb(dt, hra) {
    const vs = hra.vstup;
    vs.blokovane = true;
    const dx = vs.kamera.dx, dy = vs.kamera.dy;
    vs.kamera.dx = 0; vs.kamera.dy = 0;
    this.yaw -= dx * 0.0032;
    this.pitch = Math.max(-1.2, Math.min(1.2, this.pitch - dy * 0.0032));
    const m = vs.surovyPohyb();
    const sx = Math.sin(this.yaw), cz = Math.cos(this.yaw);
    // dopredu = −z kamery (yaw 0 → pozerá do −z)
    let nx = this.poz.x + (-sx * m.y + cz * m.x) * RYCHLOST * dt;
    let nz = this.poz.z + (-cz * m.y - sx * m.x) * RYCHLOST * dt;
    [nx, nz] = this.vytlac(nx, nz);
    this.poz.x = nx; this.poz.z = nz;
    this.kamera.position.set(this.poz.x, VYSKA_OCI, this.poz.z);
    this.kamera.rotation.set(this.pitch, this.yaw, 0, 'YXZ');
    // svetlo v izbe a výhľad podľa dňa a noci
    this.okno.material.color.setScalar(1 - NOC.value * 0.85);
    // dvere von (na začiatku chodby) a do izby
    const pri = Math.hypot(this.poz.x - 0, this.poz.z - 1.6) < 1.3;
    this.nastavNapovedu(hra, pri ? 'E – Von' : null);
    if (vs.stlacene.has('akcia')) {
      vs.stlacene.delete('akcia');
      if (pri) this.vyjdi(hra);
    }
  },

  vytlac(x, z) {
    // povolené obdĺžniky (chodba, dvere do izby, izba); mimo nich sa bod vráti dnu
    const zony = this.zony;
    const vnutri = (q) => zony.some((r) => x >= r[0] + q && x <= r[1] - q && z >= r[2] + q && z <= r[3] - q);
    if (vnutri(POLOMER)) {
      // nábytok (prekážky)
      for (const r of this.prekazky) {
        if (x > r[0] - POLOMER && x < r[1] + POLOMER && z > r[2] - POLOMER && z < r[3] + POLOMER) {
          const vl = x - (r[0] - POLOMER), vp = r[1] + POLOMER - x, vh = z - (r[2] - POLOMER), vd = r[3] + POLOMER - z;
          const mn = Math.min(vl, vp, vh, vd);
          if (mn === vl) x = r[0] - POLOMER; else if (mn === vp) x = r[1] + POLOMER; else if (mn === vh) z = r[2] - POLOMER; else z = r[3] + POLOMER;
        }
      }
      return [x, z];
    }
    // najbližší bod v niektorej zóne
    let naj = null;
    for (const r of zony) {
      const cx = Math.max(r[0] + POLOMER, Math.min(r[1] - POLOMER, x)), cz = Math.max(r[2] + POLOMER, Math.min(r[3] - POLOMER, z));
      const d = Math.hypot(cx - x, cz - z);
      if (!naj || d < naj[2]) naj = [cx, cz, d];
    }
    return [naj[0], naj[1]];
  },

  /** Chodba (x −1,1 · z 2 … −14) a izba vľavo na konci (x −5,6 … −1,2 · z −14 … −9,4), výška 2,7 m. */
  postavInterier() {
    const scena = new THREE.Scene();
    scena.background = new THREE.Color('#1b1d20');
    const kusy = [];
    const farba = new THREE.Color();
    const box = (x0, x1, y0, y1, z0, z1, hex, ao = true) => {
      const g = new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0).toNonIndexed();
      g.translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
      const pos = g.getAttribute('position');
      const c = new Float32Array(pos.count * 3);
      farba.set(hex);
      for (let i = 0; i < pos.count; i++) {
        // jednoduché „zapečené“ zatienenie: dole a v kútoch tmavšie
        const y = pos.getY(i);
        const k = ao ? 0.62 + 0.38 * Math.min(1, y / 1.4) : 1;
        c[i * 3] = farba.r * k; c[i * 3 + 1] = farba.g * k; c[i * 3 + 2] = farba.b * k;
      }
      g.setAttribute('color', new THREE.BufferAttribute(c, 3));
      g.deleteAttribute('uv');
      kusy.push(g);
    };
    const H = 2.7, STENA = '#e9e4d8', PODLAHA = '#8a7a64', STROP = '#f2f0ea', CHODBA_PODLAHA = '#6f6a63';
    // --- chodba ---
    box(-1.1, 1.1, -0.05, 0, -14.2, 2.1, CHODBA_PODLAHA, false);
    box(-1.1, 1.1, H, H + 0.05, -14.2, 2.1, STROP, false);
    box(-1.2, -1.1, 0, H, -12.4, 2.1, STENA);                    // ľavá stena (pred dverami izby)
    box(-1.2, -1.1, 0, H, -14.2, -13.4, STENA);                  // ľavá stena za dverami izby
    box(-1.2, -1.1, 2.1, H, -13.4, -12.4, STENA);                // nadpražie dverí izby
    box(-1.19, -1.17, 0, 2.08, -12.45, -12.4, '#7b5b3c', false); // zárubňa
    box(1.1, 1.2, 0, H, -14.2, 2.1, STENA);                      // pravá stena
    box(-1.2, 1.2, 0, H, 2.1, 2.2, '#c9c2b4');                   // čelo pri vchode
    box(-0.55, 0.55, 0, 2.1, 2.05, 2.12, '#3f3a35', false);      // vchodové dvere
    box(-1.2, 1.2, 0, H, -14.3, -14.2, STENA);                   // koniec chodby
    // dvere iných izieb a priestorov (zatvorené)
    for (const z of [-2.5, -6.5]) box(-1.12, -1.08, 0, 2.05, z - 0.45, z + 0.45, '#7b5b3c', false);
    for (const z of [-1.5, -5.0, -8.5, -12.0]) box(1.08, 1.12, 0, 2.05, z - 0.45, z + 0.45, '#7b5b3c', false);
    // kuchynka v jadre: linka s drezom a varičom (výklenok vpravo)
    box(0.5, 1.08, 0, 0.9, -11.2, -9.6, '#d8d2c4');
    box(0.5, 1.08, 0.9, 0.94, -11.2, -9.6, '#5d5f61', false);
    box(0.75, 1.08, 1.5, 2.1, -11.2, -9.6, '#d8d2c4');
    // --- izba 214 (trojlôžková) ---
    box(-5.6, -1.1, -0.05, 0, -14.2, -9.4, PODLAHA, false);
    box(-5.6, -1.1, H, H + 0.05, -14.2, -9.4, STROP, false);
    box(-5.7, -5.6, 0, H, -14.2, -9.4, STENA);                   // stena s oknom (vonkajšia)
    box(-5.7, -1.1, 0, H, -9.4, -9.3, STENA);
    box(-5.7, -1.1, 0, H, -14.3, -14.2, STENA);
    // okno: parapet, rám, výhľad (obrázok) za sklom
    box(-5.62, -5.35, 0.95, 1.0, -12.9, -10.7, '#cfcac0', false);
    box(-5.6, -5.55, 1.0, 2.3, -12.95, -12.85, '#5a5e60', false);
    box(-5.6, -5.55, 1.0, 2.3, -10.75, -10.65, '#5a5e60', false);
    box(-5.6, -5.55, 1.62, 1.68, -12.9, -10.7, '#5a5e60', false);
    box(-5.6, -5.55, 2.28, 2.34, -12.95, -10.65, '#5a5e60', false);
    // 3 postele, stolíky, stoličky, poličky
    // postele: pri severnej stene, pri južnej stene a pod oknom (pri dverách ostane voľno)
    const postele = [[-5.45, -3.45, -14.1, -13.2, 'x'], [-5.45, -3.45, -10.3, -9.5, 'x'], [-5.45, -4.55, -12.75, -10.75, 'z']];
    for (const [x0, x1, z0, z1, os] of postele) {
      box(x0, x1, 0, 0.42, z0, z1, '#6b5a48');
      box(x0 + 0.03, x1 - 0.03, 0.42, 0.55, z0 + 0.03, z1 - 0.03, '#d9dde4', false);   // matrac s plachtou
      if (os === 'x') {
        box(x0 + 0.1, x0 + 0.5, 0.55, 0.64, z0 + 0.08, z1 - 0.08, '#f0f0ec', false);   // vankúš pri stene s oknom
        box(x0 + 0.8, x1 - 0.05, 0.55, 0.6, z0 + 0.05, z1 - 0.05, '#4f6d8f', false);   // deka
      } else {
        box(x0 + 0.08, x1 - 0.08, 0.55, 0.64, z0 + 0.1, z0 + 0.5, '#f0f0ec', false);
        box(x0 + 0.05, x1 - 0.05, 0.55, 0.6, z0 + 0.8, z1 - 0.05, '#4f6d8f', false);
      }
    }
    const stoly = [[-3.2, -2.1, -14.15, -13.55], [-3.2, -2.2, -9.95, -9.35], [-2.1, -1.2, -9.95, -9.35]];
    for (const [x0, x1, z0, z1] of stoly) {
      box(x0, x1, 0.72, 0.76, z0, z1, '#b89a74', false);
      for (const [px, pz] of [[x0 + 0.04, z0 + 0.04], [x1 - 0.04, z0 + 0.04], [x0 + 0.04, z1 - 0.04], [x1 - 0.04, z1 - 0.04]]) box(px - 0.02, px + 0.02, 0, 0.72, pz - 0.02, pz + 0.02, '#4a4a4a', false);
      const cx = (x0 + x1) / 2, cz = z0 < -12 ? z1 + 0.35 : z0 - 0.35;
      box(cx - 0.21, cx + 0.21, 0.42, 0.46, cz - 0.2, cz + 0.2, '#2f4f6f', false);
      box(cx - 0.21, cx + 0.21, 0.46, 0.9, z0 < -12 ? cz + 0.17 : cz - 0.21, z0 < -12 ? cz + 0.21 : cz - 0.17, '#2f4f6f', false);
      box(x0, x1, 1.45, 1.48, z0 < -12 ? -14.2 : -9.65, z0 < -12 ? -13.95 : -9.4, '#b89a74', false);   // polička nad stolíkom
    }
    // vešiaková skriňa s policami, umývadlo so zrkadlom a poličkou, chladnička
    box(-2.3, -1.15, 0, 2.05, -12.0, -11.2, '#a88b66');
    box(-1.75, -1.73, 0.1, 1.95, -12.02, -11.18, '#6e5a43', false);
    box(-1.75, -1.15, 0.78, 0.9, -10.9, -10.4, '#f2f2f0', false);
    box(-1.2, -1.15, 1.2, 1.8, -10.9, -10.4, '#9fb4c2', false);
    box(-1.32, -1.15, 1.08, 1.1, -10.9, -10.4, '#d8d2c4', false);
    box(-1.75, -1.25, 0, 0.85, -14.1, -13.7, '#e9e9e6');      // chladnička
    const geo = mergeGeometries(kusy, false);
    kusy.forEach((g) => g.dispose());
    const mesh = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ vertexColors: true }));
    scena.add(mesh);
    // výhľad z okna: susedný dom s lávkou (obrázok)
    const c = document.createElement('canvas'); c.width = 256; c.height = 160;
    const g = c.getContext('2d');
    const nebo = g.createLinearGradient(0, 0, 0, 160); nebo.addColorStop(0, '#9fc2e2'); nebo.addColorStop(1, '#dce8ef');
    g.fillStyle = nebo; g.fillRect(0, 0, 256, 160);
    g.fillStyle = '#b4afa5'; g.fillRect(20, 40, 216, 120);
    for (let r = 0; r < 4; r++) {
      g.fillStyle = '#3b464d'; g.fillRect(20, 52 + r * 28, 216, 12);
      g.fillStyle = '#9b3f30'; g.fillRect(20, 64 + r * 28, 216, 4);
    }
    g.fillStyle = '#9b3f30'; g.fillRect(0, 96, 256, 8);
    g.fillStyle = '#e6e6e1'; for (let x = 0; x < 256; x += 12) g.fillRect(x, 84, 2, 12);
    g.fillRect(0, 84, 256, 2); g.fillRect(0, 90, 256, 2);
    g.fillStyle = '#4d7a3c'; g.beginPath(); g.arc(200, 150, 40, 0, Math.PI * 2); g.fill();
    const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
    this.okno = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 1.3), new THREE.MeshBasicMaterial({ map: tex }));
    this.okno.position.set(-5.595, 1.65, -11.8);   // tesne pred stenou, za rámom okna
    this.okno.rotation.y = Math.PI / 2;
    scena.add(this.okno);
    // menovka izby a tabuľky v chodbe
    const tabula = (text, x, z, rotY, w = 0.42) => {
      const cv = document.createElement('canvas'); cv.width = 256; cv.height = 96;
      const q = cv.getContext('2d'); q.fillStyle = '#f3f1ea'; q.fillRect(0, 0, 256, 96);
      q.fillStyle = '#20242a'; q.font = 'bold 40px system-ui, sans-serif'; q.textAlign = 'center'; q.textBaseline = 'middle';
      q.fillText(text, 128, 50, 240);
      const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace;
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, w * 0.375), new THREE.MeshLambertMaterial({ map: t }));
      m.position.set(x, 2.25, z); m.rotation.y = rotY;
      scena.add(m);
    };
    tabula('214', -1.07, -12.9, Math.PI / 2, 0.3);
    tabula('Sprchy – muži', 1.07, -1.5, -Math.PI / 2);
    tabula('WC', 1.07, -5.0, -Math.PI / 2, 0.3);
    tabula('Kuchynka', 1.07, -10.4, -Math.PI / 2);
    tabula('Východ', 0, 2.08, Math.PI, 0.4);
    // svetlo: jedno na strope izby + slabé v chodbe a rozptýlené
    scena.add(new THREE.HemisphereLight('#fff7e8', '#6a5f52', 1.1));
    this.svetloStrop = new THREE.PointLight('#fff1d6', 9, 9, 1.4);
    this.svetloStrop.position.set(-3.3, 2.55, -11.8);
    scena.add(this.svetloStrop);
    const chodba = new THREE.PointLight('#f2f6ff', 5, 12, 1.4);
    chodba.position.set(0, 2.55, -5);
    scena.add(chodba);
    this.scena = scena;
    this.kamera = new THREE.PerspectiveCamera(72, innerWidth / innerHeight, 0.05, 50);
    // pochôdzne zóny [x0, x1, z0, z1] a nábytok
    this.zony = [[-1.1, 1.1, -14.2, 2.1], [-1.8, -0.2, -13.5, -12.3], [-5.6, -1.1, -14.2, -9.4]];
    this.prekazky = [...postele.map(([x0, x1, z0, z1]) => [x0, x1, z0, z1]), ...stoly.map(([x0, x1, z0, z1]) => [x0, x1, z0, z1]),
      [-2.3, -1.15, -12.0, -11.2], [-1.75, -1.15, -10.9, -10.4], [-1.75, -1.25, -14.1, -13.7], [0.5, 1.1, -11.2, -9.6]];
  },
};
