// Modul: internát v Átriakoch – vchod, izba 314 a ochoz bloku T cez teleport (issue #91, úloha 2).
// Vchod do bloku T (hra.stav.atriakyVchod z js/mapa/atriaky/modul.js) má v meste dvere vo výklenku, nad nimi sa
// vznáša oranžová šípka (zďaleka väčšia) a na minimape je značka „Internát“ (mimo minimapy šípka na okraji).
// Pri dverách „E – Otvoriť dvere“: dvere sa otvoria, obraz stmavne a hráč je vnútri – hra prepne do malej
// samostatnej scény (chodba a trojlôžková izba 314): kreslí sa len tá, mesto sa nekreslí a hráč v meste stojí
// (vstup je pre mesto zablokovaný), dlaždice sa nemenia. Vnútri sa chodí z pohľadu postavy (WASD, myš).
// Z izby vedú balkónové dvere na ochoz (terasu okolo ustúpeného podlažia, hra.stav.atriakyOchoz) – na ochoz sa
// inak dostať nedá (vonkajšie schody na fotkách nie sú); z ochozu sa tými istými dverami ide späť do izby.
// Dvere na začiatku chodby vedú von pred vchod.
// Dispozícia podľa verejných zdrojov (mlyny.uniba.sk, Wikipédia): izby okolo jadra s hygienou a kuchynkou,
// trojlôžková izba – posteľ, polička, stolík a stolička pre každého, vešiaková skriňa, umývadlo so zrkadlom,
// spoločná chladnička; sprchy a WC spoločné na poschodí.
// Pre ostatné moduly: hra.stav.vInterieri = true, kým je hráč vnútri; udalosti 'interier-vstup' / 'interier-von'.

import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { NOC } from '../../grafika/noc.js';

const DOSAH = 2.2;            // m – ako blízko vchodu sa dá vojsť
const DOSAH_OCHOZ = 1.6;      // m – ako blízko balkónových dverí na ochoze
const RYCHLOST = 2.4;          // m/s pri chôdzi vnútri
const VYSKA_OCI = 1.62;
const POLOMER = 0.3;
const OTVARANIE = 0.55;        // s – otvorenie dverí pred prechodom dnu
const STMIEVANIE = 0.35;       // s – stmavnutie obrazu (rovnako v css .internat-clona)
const FARBA_ZNACKY = '#ffa31a';
// miesta vnútri: [x, z, yaw] – yaw 0 = pohľad do −z
const DNU = {
  chodba: [0, 0.9, 0],                 // pri vchodových dverách, pohľad do chodby
  izba: [-4.9, -10.75, -Math.PI / 2],    // pri balkónových dverách, pohľad do izby
};

export default {
  nazov: 'internat',
  poradie: 9,   // pred hráčom (10) – stlačenie E pri dverách si vezme skôr, než by nastúpil do auta

  init(hra) {
    this.hra = hra;
    this.vnutri = false;
    this.scena = null;
    this.napoveda = null;
    this.prechod = null;          // { smer: 'dnu' | 'von', kam: 'vchod' | 'ochoz', t } – otváranie dverí a stmievanie
    this.dvere = {};              // 'vchod' | 'ochoz' → { skupina, kridlo, u (0 zatvorené … 1 otvorené), zatvaraj }
    this.cas = 0;
    // čierna clona na prechod dnu a von
    this.clona = document.createElement('div');
    this.clona.className = 'internat-clona';
    document.body.appendChild(this.clona);
  },

  updateVzdy(dt, hra) {
    this.cas += dt;
    if (hra.stav.atriakyVchod && hra.stav.atriakyVchod !== this.vchod) this.postavVchod(hra);
    this.animujDvere(dt, hra);
    if (this.prechod) { this.krokPrechodu(dt, hra); return; }
    if (this.vnutri) { this.pohyb(dt, hra); return; }
    if (!hra.stav.atriakyVchod || hra.stav.auto || hra.stav.pauza) { this.nastavNapovedu(hra, null); return; }
    const p = hra.hrac?.pozicia;
    const pri = (m, r, dy) => p && m && Math.hypot(p.x - m.x, p.z - m.z) < r && Math.abs(p.y - m.y) < dy;
    const kam = pri(hra.stav.atriakyVchod, DOSAH, 2.5) ? 'vchod' : pri(hra.stav.atriakyOchoz, DOSAH_OCHOZ, 1) ? 'ochoz' : null;
    this.nastavNapovedu(hra, kam === 'vchod' ? 'E – Otvoriť dvere (internát)' : kam === 'ochoz' ? 'E – Do izby 314' : null);
    if (kam && hra.vstup.caka('akcia')) {
      hra.vstup.stlacil('akcia');
      this.nastavNapovedu(hra, null);
      hra.vstup.blokovane = true;
      if (hra.hrac) hra.hrac.uhol = (kam === 'vchod' ? hra.stav.atriakyVchod : hra.stav.atriakyOchoz).uhol;   // tvárou k dverám
      this.prechod = { smer: 'dnu', kam, t: 0 };
    }
  },

  /** Prechod: dnu = dvere sa otvoria → stmavne → vnútri; von = stmavne → pred dverami → dvere sa zavrú. */
  krokPrechodu(dt, hra) {
    const pr = this.prechod, d = this.dvere[pr.kam];
    pr.t += dt;
    if (pr.smer === 'dnu') {
      if (d) d.u = Math.min(1, pr.t / OTVARANIE);
      if (pr.t >= OTVARANIE && !pr.tma) { pr.tma = true; this.clona.classList.add('zapnuta'); }
      if (pr.t >= OTVARANIE + STMIEVANIE) {
        this.prechod = null;
        this.vojdi(hra, pr.kam === 'vchod' ? 'chodba' : 'izba');
        if (d) d.u = 0;
        this.clona.classList.remove('zapnuta');
      }
    } else {
      if (!pr.tma) { pr.tma = true; this.clona.classList.add('zapnuta'); }
      if (pr.t >= STMIEVANIE) {
        this.prechod = null;
        this.vyjdi(hra, pr.kam);
        if (d) { d.u = 1; d.zatvaraj = true; }
        this.clona.classList.remove('zapnuta');
      }
    }
  },

  /** Dvere vchodu (so šípkou a značkou na minimape) a balkónové dvere na ochoze – pri zmene polohy nanovo. */
  postavVchod(hra) {
    const v = hra.stav.atriakyVchod, o = hra.stav.atriakyOchoz;
    this.vchod = v;
    for (const d of Object.values(this.dvere)) { hra.scena.remove(d.skupina); d.skupina.traverse((q) => q.geometry?.dispose()); }
    this.dvere = {};
    if (this.sipka) hra.scena.remove(this.sipka);
    const teren = hra.mapa.vyskaTerenu ?? hra.mapa.vyska;
    const x = v.x + Math.sin(v.uhol) * 0.92, z = v.z + Math.cos(v.uhol) * 0.92;   // líce domu
    const y = teren(x, z);
    const pridaj = (kluc, skupina, px, py, pz, uhol) => {
      skupina.position.set(px, py, pz);
      skupina.rotation.y = uhol + Math.PI;                   // lokálne +z = von z domu
      hra.scena.add(skupina);
      this.dvere[kluc] = { skupina, kridlo: skupina.getObjectByName('kridlo'), u: 0, zatvaraj: false };
    };
    pridaj('vchod', postavDvere((v.strop ?? y + 2.8) - y), x, y, z, v.uhol);
    if (o) pridaj('ochoz', postavBalkonoveDvere(), o.dvere[0], o.y, o.dvere[1], o.uhol);
    this.sipka = postavSipku();
    this.sipka.position.set(v.x, v.y, v.z);
    hra.scena.add(this.sipka);
    hra.posli('znacka-mapy', { id: 'internat', x: v.x, z: v.z, farba: FARBA_ZNACKY, popis: 'Internát – blok T' });
  },

  animujDvere(dt, hra) {
    for (const d of Object.values(this.dvere)) {
      if (d.zatvaraj) {
        d.u = Math.max(0, d.u - dt / 0.7);
        if (d.u === 0) d.zatvaraj = false;
      }
      d.kridlo.rotation.y = -1.75 * (d.u * d.u * (3 - 2 * d.u));   // otvára sa von, k hráčovi
    }
    // šípka nad vchodom: vznáša sa a točí, zďaleka väčšia; vnútri a počas prechodu nie je
    const s = this.sipka, p = hra.hrac?.pozicia;
    if (!s) return;
    s.visible = !this.vnutri && !this.prechod;
    if (!s.visible || !p) return;
    const d = Math.hypot(p.x - s.position.x, p.z - s.position.z);
    const m = Math.max(1, Math.min(7, d / 25));
    const hlava = s.getObjectByName('hlava'), kruh = s.getObjectByName('kruh');
    hlava.scale.setScalar(m);
    hlava.position.y = 2.9 + (m - 1) * 1.2 + Math.sin(this.cas * 2.4) * 0.15;
    hlava.rotation.y = this.cas * 1.6;
    kruh.material.opacity = d < 40 ? 0.35 + 0.25 * Math.sin(this.cas * 3) : 0;
  },

  nastavNapovedu(hra, text) {
    if (text === this.napoveda) return;
    // nápovedu iných modulov (nastúpiť do auta) neprepisujeme na null, ak sme ju nenastavili my
    if (text !== null || this.napoveda !== null) hra.ui?.napoveda?.(text);
    this.napoveda = text;
  },

  /** Vstup do interiéru: miesto 'chodba' (od vchodu) alebo 'izba' (z ochozu). */
  vojdi(hra, miesto) {
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
    const [x, z, yaw] = DNU[miesto];
    this.poz = new THREE.Vector3(x, 0, z);
    this.yaw = yaw; this.pitch = 0;
    this.svetloStrop.intensity = 9;
    hra.ui?.sprava?.(miesto === 'chodba'
      ? 'Átriaky, blok T – izba 314 je vľavo na konci chodby, z nej sa ide na ochoz'
      : 'Izba 314 – na chodbu dverami oproti, na ochoz balkónovými dverami za tebou', 5);
    hra.posli('interier-vstup', { blok: 'T', miesto });
  },

  /** Von z interiéru: 'vchod' = pred vchod na zemi, 'ochoz' = na terasu pred balkónové dvere. */
  vyjdi(hra, kam) {
    this.vnutri = false;
    hra.stav.vInterieri = false;
    hra.vstup.blokovane = false;
    hra.vykresli = this.povodneVykresli;
    const v = kam === 'ochoz' ? hra.stav.atriakyOchoz : hra.stav.atriakyVchod;
    if (v && hra.hrac) {
      // pred dvere, otočený od nich
      const k = kam === 'ochoz' ? 0 : 0.8;
      hra.hrac.pozicia.set(v.x - Math.sin(v.uhol) * k, v.y, v.z - Math.cos(v.uhol) * k);
      hra.hrac.vy = 0;
      hra.hrac.uhol = v.uhol + Math.PI;
      hra.posli('teleport', { x: hra.hrac.pozicia.x, y: v.y, z: hra.hrac.pozicia.z });
    }
    this.nastavNapovedu(hra, null);
    hra.posli('interier-von', { blok: 'T', kam });
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
    for (const o of this.okna) o.material.color.setScalar(1 - NOC.value * 0.85);
    // dvere von (na začiatku chodby) a balkónové dvere z izby na ochoz
    const kam = Math.hypot(this.poz.x, this.poz.z - 1.6) < 1.3 ? 'vchod'
      : Math.hypot(this.poz.x + 5.6, this.poz.z + 10.75) < 1.6 && hra.stav.atriakyOchoz ? 'ochoz' : null;
    this.nastavNapovedu(hra, kam === 'vchod' ? 'E – Otvoriť dvere (von)' : kam === 'ochoz' ? 'E – Vyjsť na ochoz' : null);
    if (vs.stlacene.has('akcia')) {
      vs.stlacene.delete('akcia');
      if (kam) { this.nastavNapovedu(hra, null); this.prechod = { smer: 'von', kam, t: 0 }; }
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

  /** Chodba (x −1,1 · z 2 … −14) a izba 314 vľavo na konci (x −5,6 … −1,2 · z −14 … −9,4), výška 2,7 m;
   *  vo vonkajšej stene izby okno a balkónové dvere na ochoz. */
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
    // --- izba 314 (trojlôžková) ---
    box(-5.6, -1.1, -0.05, 0, -14.2, -9.4, PODLAHA, false);
    box(-5.6, -1.1, H, H + 0.05, -14.2, -9.4, STROP, false);
    box(-5.7, -5.6, 0, H, -14.2, -9.4, STENA);                   // stena s oknom (vonkajšia)
    box(-5.7, -1.1, 0, H, -9.4, -9.3, STENA);
    box(-5.7, -1.1, 0, H, -14.3, -14.2, STENA);
    // okno: parapet, rám, výhľad (obrázok) za sklom
    box(-5.62, -5.35, 0.95, 1.0, -13.05, -11.3, '#cfcac0', false);
    box(-5.6, -5.55, 1.0, 2.3, -13.1, -13.0, '#5a5e60', false);
    box(-5.6, -5.55, 1.0, 2.3, -11.35, -11.25, '#5a5e60', false);
    box(-5.6, -5.55, 1.62, 1.68, -13.05, -11.3, '#5a5e60', false);
    box(-5.6, -5.55, 2.28, 2.34, -13.1, -11.25, '#5a5e60', false);
    // balkónové dvere na ochoz: rám, priečka, kľučka (sklo s výhľadom je obrázok nižšie)
    box(-5.6, -5.54, 0, 2.2, -11.2, -11.12, '#5a5e60', false);
    box(-5.6, -5.54, 0, 2.2, -10.38, -10.3, '#5a5e60', false);
    box(-5.6, -5.54, 2.14, 2.22, -11.2, -10.3, '#5a5e60', false);
    box(-5.6, -5.54, 0, 0.12, -11.2, -10.3, '#5a5e60', false);
    box(-5.6, -5.54, 1.0, 1.05, -11.15, -10.35, '#5a5e60', false);
    box(-5.54, -5.46, 1.0, 1.04, -10.5, -10.42, '#c8c8c8', false);
    // 3 postele, stolíky, stoličky, poličky
    // postele: pri severnej stene, pri južnej stene a pod oknom (pri dverách na chodbu aj na ochoz ostane voľno)
    const postele = [[-5.45, -3.45, -14.1, -13.2, 'x'], [-5.45, -3.45, -10.3, -9.5, 'x'], [-5.45, -4.55, -13.15, -11.2, 'z']];
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
    const okno = new THREE.Mesh(new THREE.PlaneGeometry(1.75, 1.3), new THREE.MeshBasicMaterial({ map: tex }));
    okno.position.set(-5.595, 1.65, -12.18);   // tesne pred stenou, za rámom okna
    okno.rotation.y = Math.PI / 2;
    scena.add(okno);
    // sklo balkónových dverí: ten istý výhľad (dolná časť obrázka je ochoz so zábradlím)
    const balkon = new THREE.Mesh(new THREE.PlaneGeometry(0.82, 2.08), new THREE.MeshBasicMaterial({ map: tex }));
    balkon.position.set(-5.595, 1.1, -10.75);
    balkon.rotation.y = Math.PI / 2;
    scena.add(balkon);
    this.okna = [okno, balkon];
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
    tabula('314', -1.07, -12.9, Math.PI / 2, 0.3);
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

// ---------- vchod v meste ----------

/** Vchodové dvere bloku T vo výklenku pod prvým poschodím: zárubňa, krídlo s presklením (otáča sa okolo pántu,
 *  meno 'kridlo'), tmavá predsieň, betónové bočné steny až po strop (vyska = m od prahu po spodok stropu),
 *  tabuľka „T · Internát“ a svetlo. Lokálne: stred prahu v (0, 0, 0), +z von z domu. */
function postavDvere(vyska) {
  const g = new THREE.Group();
  g.name = 'internat-dvere';
  const H = Math.max(2.1, Math.min(2.45, vyska - 0.12));   // výška otvoru
  const mat = (farba, ine = {}) => new THREE.MeshStandardMaterial({ color: farba, roughness: 0.6, ...ine });
  const box = (sx, sy, sz, x, y, z, m, rodic = g) => {
    const b = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), m);
    b.position.set(x, y, z);
    b.castShadow = b.receiveShadow = true;
    rodic.add(b);
    return b;
  };
  const beton = mat('#bdb8ae', { roughness: 0.9 });
  const V = Math.max(vyska, H + 0.12);
  // výklenok: bočné steny a nadpražie až po strop, vzadu tmavá predsieň
  for (const s of [-1, 1]) box(0.55, V + 0.3, 1.6, s * 1.035, (V + 0.3) / 2 - 0.3, -0.69, beton);
  box(1.52, V - H + 0.3, 1.6, 0, H + (V - H + 0.3) / 2, -0.69, beton);
  box(1.24, H, 0.04, 0, H / 2, -1.45, mat('#121416', { roughness: 1 }));
  const zaruben = mat('#d9d6cf');
  for (const s of [-1, 1]) box(0.08, H + 0.04, 0.2, s * 0.68, (H + 0.04) / 2, 0, zaruben);
  box(1.44, 0.08, 0.2, 0, H, 0, zaruben);
  box(1.6, 0.06, 0.5, 0, -0.01, 0.15, mat('#8d8a84'));                         // prah / schodík
  // krídlo: pánt vľavo (pri pohľade zvonka), otvára sa von
  const kridlo = new THREE.Group();
  kridlo.name = 'kridlo';
  kridlo.position.set(-0.62, 0, 0.02);
  g.add(kridlo);
  box(1.22, H - 0.06, 0.05, 0.61, (H - 0.06) / 2, 0, mat('#4a3424'), kridlo);
  box(0.8, H * 0.48, 0.06, 0.61, H * 0.64, 0, mat('#8fa6b6', { roughness: 0.15, metalness: 0.4 }), kridlo);
  box(0.04, 0.04, 0.3, 1.08, 1.02, 0.05, mat('#c8c8c8', { metalness: 0.8, roughness: 0.3 }), kridlo);   // kľučka
  // tabuľa na pravej stene: oranžové „T“ a „Internát“
  const c = document.createElement('canvas'); c.width = 256; c.height = 320;
  const q = c.getContext('2d');
  q.fillStyle = '#e8781e'; q.fillRect(0, 0, 256, 220);
  q.fillStyle = '#ffffff'; q.font = 'bold 180px system-ui, sans-serif'; q.textAlign = 'center'; q.textBaseline = 'middle';
  q.fillText('T', 128, 120);
  q.fillStyle = '#f4f2ec'; q.fillRect(0, 220, 256, 100);
  q.fillStyle = '#20242a'; q.font = 'bold 50px system-ui, sans-serif';
  q.fillText('Internát', 128, 272);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  const tab = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.525), new THREE.MeshStandardMaterial({ map: t, roughness: 0.5 }));
  tab.position.set(1.035, 1.55, 0.115);
  g.add(tab);
  // svetlo pod stropom výklenku
  box(0.3, 0.06, 0.16, 0, H + 0.1, 0.18, new THREE.MeshStandardMaterial({ color: '#fff4d8', emissive: '#ffe2a8', emissiveIntensity: 1.2 }));
  return g;
}

/** Balkónové dvere z ochozu do izby 314 v betónovom portáli: hliníkový rám, presklené krídlo (meno 'kridlo',
 *  pánt vľavo), tmavá izba za nimi a tabuľka s číslom. Lokálne: stred prahu v (0, 0, 0), +z von na terasu. */
function postavBalkonoveDvere() {
  const g = new THREE.Group();
  g.name = 'internat-balkon';
  const ram = new THREE.MeshStandardMaterial({ color: '#5a5e60', roughness: 0.4, metalness: 0.6 });
  const box = (sx, sy, sz, x, y, z, m, rodic = g) => {
    const b = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), m);
    b.position.set(x, y, z);
    b.castShadow = b.receiveShadow = true;
    rodic.add(b);
    return b;
  };
  // betónový portál pred parapetom ustúpeného podlažia
  const beton = new THREE.MeshStandardMaterial({ color: '#bdb8ae', roughness: 0.9 });
  for (const s of [-1, 1]) box(0.26, 2.55, 0.76, s * 0.66, 1.275, -0.31, beton);
  box(1.58, 0.3, 0.76, 0, 2.4, -0.31, beton);
  for (const s of [-1, 1]) box(0.07, 2.25, 0.12, s * 0.49, 1.12, 0, ram);
  box(1.05, 0.07, 0.12, 0, 2.22, 0, ram);
  box(0.92, 2.18, 0.03, 0, 1.09, -0.6, new THREE.MeshStandardMaterial({ color: '#1a1c1f', roughness: 1 }));   // izba za sklom
  box(1.06, 0.04, 0.66, 0, 0.0, -0.3, beton);                                                                // prah
  const kridlo = new THREE.Group();
  kridlo.name = 'kridlo';
  kridlo.position.set(-0.45, 0, 0.02);
  g.add(kridlo);
  for (const s of [0, 1]) box(0.05, 2.15, 0.05, 0.03 + s * 0.84, 1.08, 0, ram, kridlo);
  for (const y of [0.05, 1.02, 2.12]) box(0.9, 0.06, 0.05, 0.45, y, 0, ram, kridlo);
  const sklo = new THREE.MeshStandardMaterial({ color: '#9fb6c4', roughness: 0.08, metalness: 0.5, transparent: true, opacity: 0.55 });
  box(0.8, 0.93, 0.015, 0.45, 0.55, 0, sklo, kridlo);
  box(0.8, 1.05, 0.015, 0.45, 1.57, 0, sklo, kridlo);
  box(0.03, 0.03, 0.18, 0.8, 1.04, 0.05, new THREE.MeshStandardMaterial({ color: '#c8c8c8', metalness: 0.8, roughness: 0.3 }), kridlo);
  // tabuľka „314“ vedľa dverí
  const c = document.createElement('canvas'); c.width = 128; c.height = 64;
  const q = c.getContext('2d');
  q.fillStyle = '#f3f1ea'; q.fillRect(0, 0, 128, 64);
  q.fillStyle = '#20242a'; q.font = 'bold 40px system-ui, sans-serif'; q.textAlign = 'center'; q.textBaseline = 'middle';
  q.fillText('314', 64, 34);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  const tab = new THREE.Mesh(new THREE.PlaneGeometry(0.26, 0.13), new THREE.MeshStandardMaterial({ map: t, roughness: 0.5 }));
  tab.position.set(0.66, 1.6, 0.075);
  g.add(tab);
  return g;
}

/** Oranžová šípka nad vchodom (hrot dole, meno 'hlava') a blikajúci kruh na zemi (meno 'kruh'). */
function postavSipku() {
  const g = new THREE.Group();
  g.name = 'internat-sipka';
  const m = new THREE.MeshBasicMaterial({ color: FARBA_ZNACKY, fog: false, transparent: true, opacity: 0.92, depthWrite: false });
  const hlava = new THREE.Group();
  hlava.name = 'hlava';
  const hrot = new THREE.Mesh(new THREE.ConeGeometry(0.32, 0.7, 4), m);
  hrot.rotation.x = Math.PI;
  hlava.add(hrot);
  const driek = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.45, 0.16), m);
  driek.position.y = 0.55;
  hlava.add(driek);
  hlava.renderOrder = 10;
  g.add(hlava);
  const kruh = new THREE.Mesh(new THREE.RingGeometry(0.75, 0.95, 32), new THREE.MeshBasicMaterial({ color: FARBA_ZNACKY, transparent: true, opacity: 0.5, depthWrite: false, side: THREE.DoubleSide }));
  kruh.name = 'kruh';
  kruh.rotation.x = -Math.PI / 2;
  kruh.position.y = 0.06;
  g.add(kruh);
  return g;
}
