// Modul: internát v Átriakoch – vchod do bloku T, izba 314 a chodba priamo v meste (issue #91, #115).
// Izba a chodba sú model z Blendera (tools/blender/atriaky/izba.py → assets/pamiatky/atriaky-izba.glb.gz) položený
// do ustúpeného (4.) podlažia bloku T za balkónové dvere – tie sú skutočný otvor v plášti domu
// (hra.stav.atriakyOchoz z js/mapa/atriaky/modul.js). Vnútri sa chodí ako vonku: tá istá postava, kamera, myš,
// prvá/tretia osoba (kamera ostáva pod stropom – hra.interier.kamera, js/kamera/kamera.js), kolízie so stenami
// a nábytkom, pochôdzna podlaha (udalosť 'pochodzne-plochy'). Plný kolízny blok domu sa v izbe ignoruje
// (kolizie.pridajVynimku). Z izby sa pešo vyjde balkónovými dverami na ochoz (terasu).
// Vchod na prízemí (dvere vo výklenku, nad nimi oranžová šípka, značka „Internát“ na minimape): E → dvere sa otvoria,
// obraz stmavne a hráč stojí na chodbe pri schodisku na 4. podlaží (schodisko sa nemodeluje); pri dverách schodiska
// E → späť pred vchod.
// Dispozícia podľa prieskumu (napady/atriaky-izba.md): trojlôžková izba ~3,2 × 6 m, okno a dvere na pavlač/terasu,
// skriňa a umývadlo pri dverách na chodbu, chodba s dverami susedných izieb a jadra (kuchynka, sprchy, WC).
// Pre ostatné moduly: hra.stav.vInterieri = true, kým je hráč v izbe alebo na chodbe; udalosti 'interier-vstup' /
// 'interier-von'.

import * as THREE from 'three';
import { NOC } from '../../grafika/noc.js';
import { nacitajModelPamiatky, rozbalModel } from '../pamiatky/model-glb.js';
import { bodVPolygone } from '../geometria.js';

const DOSAH = 2.2;            // m – ako blízko vchodu sa dá vojsť
const DOSAH_SCHODISKO = 1.3;  // m – ako blízko dverí schodiska na chodbe
const OTVARANIE = 0.55;       // s – otvorenie dverí pred prechodom dnu
const STMIEVANIE = 0.35;      // s – stmavnutie obrazu (rovnako v css .internat-clona)
const FARBA_ZNACKY = '#ffa31a';
const SUBOR = 'atriaky-izba';
const SKUPINA = 'modul:internat';
const DOSAH_KRESLENIA = 45;   // m – izbu a svetlá kreslíme len zblízka (inak ju zakrýva plášť domu)

export default {
  nazov: 'internat',
  poradie: 9,   // pred hráčom (10) – stlačenie E pri dverách si vezme skôr, než by nastúpil do auta

  init(hra) {
    this.hra = hra;
    this.vnutri = false;
    this.napoveda = null;
    this.prechod = null;          // { smer: 'dnu' | 'von', t } – otváranie dverí a stmievanie
    this.dvere = {};              // 'vchod' → { skupina, kridlo, u (0 zatvorené … 1 otvorené), zatvaraj }
    this.cas = 0;
    this.clona = document.createElement('div');
    this.clona.className = 'internat-clona';
    document.body.appendChild(this.clona);
    fetch(`assets/pamiatky/${SUBOR}.json`).then((r) => (r.ok ? r.json() : null)).then((d) => { this.info = d; }).catch(() => {});
    hra.interier = { kamera: (poz, ciel, hrac) => this.kamera(poz, ciel, hrac) };
  },

  updateVzdy(dt, hra) {
    this.cas += dt;
    if (hra.stav.atriakyVchod && hra.stav.atriakyVchod !== this.vchod) this.postavVchod(hra);
    if (hra.stav.atriakyOchoz && this.info && hra.stav.atriakyOchoz !== this.ochoz) this.postavIzbu(hra);
    this.animujDvere(dt, hra);
    if (this.prechod) { this.krokPrechodu(dt, hra); return; }
    const p = hra.hrac?.pozicia;
    // je hráč v izbe/na chodbe? (podľa pôdorysu a výšky podlahy)
    const dnu = !!(p && this.zona && !hra.stav.auto && Math.abs(p.y - this.podlaha) < 1.5 && bodVPolygone(p.x, p.z, this.zona));
    if (dnu !== this.vnutri) {
      this.vnutri = dnu;
      hra.stav.vInterieri = dnu;
      hra.posli(dnu ? 'interier-vstup' : 'interier-von', { blok: 'T', miesto: 'izba-314' });
      if (dnu) hra.ui?.sprava?.('Átriaky, blok T – izba 314. Von na terasu balkónovými dverami, dole po schodisku na konci chodby', 5);
    }
    this.svetla(hra);
    if (!p || hra.stav.auto || hra.stav.pauza) { this.nastavNapovedu(hra, null); return; }
    const v = hra.stav.atriakyVchod;
    const kam = v && Math.hypot(p.x - v.x, p.z - v.z) < DOSAH && Math.abs(p.y - v.y) < 2.5 ? 'dnu'
      : this.schodisko && Math.hypot(p.x - this.schodisko[0], p.z - this.schodisko[1]) < DOSAH_SCHODISKO && Math.abs(p.y - this.podlaha) < 1 ? 'von' : null;
    this.nastavNapovedu(hra, kam === 'dnu' ? 'E – Otvoriť dvere (internát)' : kam === 'von' ? 'E – Dole po schodisku (von)' : null);
    if (kam && hra.vstup.caka('akcia')) {
      hra.vstup.stlacil('akcia');
      this.nastavNapovedu(hra, null);
      if (kam === 'dnu' && !this.schodisko) { hra.ui?.sprava?.('Izba sa ešte načítava…', 2); return; }
      hra.vstup.blokovane = true;
      if (kam === 'dnu' && hra.hrac) hra.hrac.uhol = v.uhol;   // tvárou k dverám
      this.prechod = { smer: kam, t: 0 };
    }
  },

  /** Prechod medzi vchodom na prízemí a chodbou na 4. podlaží: otvorenie dverí, stmavnutie, presun, rozjasnenie. */
  krokPrechodu(dt, hra) {
    const pr = this.prechod, d = this.dvere.vchod;
    pr.t += dt;
    if (pr.smer === 'dnu' && d) d.u = Math.min(1, pr.t / OTVARANIE);
    const zaciatok = pr.smer === 'dnu' ? OTVARANIE : 0;
    if (pr.t >= zaciatok && !pr.tma) { pr.tma = true; this.clona.classList.add('zapnuta'); }
    if (pr.t >= zaciatok + STMIEVANIE) {
      this.prechod = null;
      if (pr.smer === 'dnu') {
        this.presun(hra, this.schodisko[0], this.podlaha, this.schodisko[1], this.uholChodby);
        if (d) d.u = 0;
      } else {
        const v = hra.stav.atriakyVchod;
        // pred dvere, otočený od nich; dvere sa za ním zavrú
        this.presun(hra, v.x - Math.sin(v.uhol) * 0.8, v.y, v.z - Math.cos(v.uhol) * 0.8, v.uhol + Math.PI);
        if (d) { d.u = 1; d.zatvaraj = true; }
      }
      hra.vstup.blokovane = false;
      this.clona.classList.remove('zapnuta');
    }
  },

  presun(hra, x, y, z, uhol) {
    const h = hra.hrac;
    if (!h) return;
    h.pozicia.set(x, y, z);
    h.vx = 0; h.vz = 0; h.vy = 0; h.rychlost = 0;
    h.uhol = uhol;
    hra.posli('teleport', { x, y, z });
  },

  /** Izba a chodba v meste: model, kolízie, pochôdzna podlaha, výnimka z kolízie domu, svetlá, tabuľky, výhľad. */
  postavIzbu(hra) {
    const o = hra.stav.atriakyOchoz, info = this.info;
    this.ochoz = o;
    if (!o?.otvor || !o.n) return;
    const kol = hra.mapa.kolizie;
    kol.odstranDlazdicu(SKUPINA);
    if (this.vynimka) kol.odstranVynimku(this.vynimka);
    if (this.skupina) { hra.scena.remove(this.skupina); this.skupina.traverse((q) => { q.geometry?.dispose(); q.material?.map?.dispose(); }); }
    // lokálne (x dnu od líca, z pozdĺž fasády) → svet: os x = −n, os z = (nz, −nx); rotácia skupiny u = atan2(nz, −nx)
    const [nx, nz] = o.n, [ox, oz] = o.dvere;
    const u = Math.atan2(nz, -nx);
    const svet = (x, z) => [ox - nx * x + nz * z, oz - nz * x - nx * z];
    const y0 = o.y;
    this.podlaha = y0;
    this.uholChodby = Math.atan2(nz, -nx);   // pohľad pozdĺž chodby (lokálne +z)
    const sk = new THREE.Group();
    sk.name = 'internat-izba';
    sk.position.set(ox, y0, oz);
    sk.rotation.y = u;
    hra.scena.add(sk);
    this.skupina = sk;
    nacitajModelPamiatky(SUBOR, { ao: false, gz: true }).then((m) => {
      if (!m || this.skupina !== sk) return;
      const siete = rozbalModel(m);
      siete.traverse((q) => { if (q.isMesh) { q.castShadow = false; q.receiveShadow = true; } });
      sk.add(siete);
    }).catch((e) => console.warn('Izba 314 sa nenačítala:', e));

    const obdlznik = ([x0, x1, z0, z1]) => [svet(x0, z0), svet(x1, z0), svet(x1, z1), svet(x0, z1)];
    const V = info.vyskaStropu ?? 2.7;
    // steny: prekážka „budova“ (kamera sa pred nimi zastaví), nábytok len pre chôdzu
    for (const s of info.steny ?? []) kol.pridajPolygon(obdlznik(s), { typ: 'budova', vyska: [y0 - 0.3, y0 + V], vrch: y0 + V, dlazdica: SKUPINA });
    for (const p of info.prekazky ?? []) kol.pridajPolygon(obdlznik(p), { typ: 'nabytok', vyska: [y0 - 0.3, y0 + p[4]], dlazdica: SKUPINA });
    // ostenie balkónových dverí z terasy (aby sa v otvore nedalo vojsť do steny domu)
    const [d0, d1] = info.dvereVon;
    for (const [z0, z1] of [[d0 - 0.4, d0], [d1, d1 + 0.4]]) kol.pridajPolygon(obdlznik([-0.35, 0.3, z0, z1]), { typ: 'budova', vyska: [y0 - 0.3, y0 + V], vrch: y0 + V, dlazdica: SKUPINA });
    // podlaha izby, chodby a prahu: pochôdzne plochy vo výške podlahy
    const profily = (info.plochy ?? []).map(([x0, x1, z0, z1]) => {
      const pozdlzX = x1 - x0 >= z1 - z0;
      const a = pozdlzX ? svet(x0, (z0 + z1) / 2) : svet((x0 + x1) / 2, z0);
      const b = pozdlzX ? svet(x1, (z0 + z1) / 2) : svet((x0 + x1) / 2, z1);
      return { body: [{ x: a[0], z: a[1], h: y0 }, { x: b[0], z: b[1], h: y0 }], sirka: pozdlzX ? z1 - z0 : x1 - x0 };
    });
    hra.posli('pochodzne-plochy', { kluc: 'internat', profily });
    // v izbe, na chodbe a v otvore dverí sa ignoruje plný kolízny blok domu (js/mapa/atriaky/modul.js)
    const [ix0, ix1, iz0, iz1] = info.izba, [cx0, cx1, cz0, cz1] = info.chodba;
    this.zona = [svet(-0.6, d0), svet(ix0, d0), svet(ix0, iz0), svet(ix1, iz0), svet(ix1, cz0), svet(cx1, cz0),
      svet(cx1, cz1), svet(ix1, cz1), svet(ix1, iz1), svet(ix0, iz1), svet(ix0, d1), svet(-0.6, d1)];
    this.vynimka = kol.pridajVynimku({ body: this.zona, vyska: [y0 - 0.6, y0 + 2.4], skupiny: ['modul:atriaky'] });
    this.strop = y0 + V;
    this.schodisko = svet(...info.schodisko);
    // svetlá (zapnú sa len zblízka – updateVzdy)
    this.svetloIzba = new THREE.PointLight('#fff1d6', 7, 9, 1.4);
    this.svetloIzba.position.set(2.6, V - 0.25, 0.9);
    this.svetloChodba = new THREE.PointLight('#f2f6ff', 5, 14, 1.4);
    this.svetloChodba.position.set((cx0 + cx1) / 2, V - 0.25, 0);
    sk.add(this.svetloIzba, this.svetloChodba);
    // výhľad z okna (obrázok za sklom) a tabuľky
    this.okno = vyhlad();
    const [oz0, oz1, oy0, oy1] = info.okno;
    this.okno.scale.set(oz1 - oz0, oy1 - oy0, 1);
    this.okno.position.set(ix0 - 0.13, (oy0 + oy1) / 2, (oz0 + oz1) / 2);
    this.okno.rotation.y = Math.PI / 2;
    sk.add(this.okno);
    const tab = (text, x, z, rotY, w = 0.42, y = 1.95) => { const t = tabulka(text, w); t.position.set(x, y, z); t.rotation.y = rotY; sk.add(t); };
    const [, dz1] = info.dvereChodba;
    // čísla izieb na stene chodby vedľa dverí (líce steny je x = začiatok chodby), názvy na dverách jadra
    tab('314', cx0 + 0.02, dz1 + 0.3, Math.PI / 2, 0.3);
    (info.izbyCisla ?? []).forEach(([, z], i) => tab(String(301 + i + (i >= 6 ? 1 : 0)), cx0 + 0.02, z - 0.65, Math.PI / 2, 0.3));
    const NAZVY = { kuchynka: 'Kuchynka', sprchy: 'Sprchy – muži', wc: 'WC – muži', upratovanie: 'Upratovanie' };
    for (const [x, z, meno] of info.jadro ?? []) tab(NAZVY[meno] ?? meno, x - 0.01, z, -Math.PI / 2);
    tab('Schodisko ↓', info.schodisko[0], cz0 + 0.03, 0, 0.5, 2.3);
    this.skupina.visible = false;
  },

  /** Svetlá a viditeľnosť izby len zblízka; výhľad z okna podľa dňa a noci. */
  svetla(hra) {
    if (!this.skupina) return;
    const k = hra.kamera.position;
    const vid = Math.hypot(k.x - this.skupina.position.x, k.z - this.skupina.position.z) < DOSAH_KRESLENIA && Math.abs(k.y - this.podlaha) < 20;
    if (this.skupina.visible !== vid) this.skupina.visible = vid;
    if (vid && this.okno) this.okno.material.color.setScalar(1 - NOC.value * 0.85);
  },

  /** Kamera v izbe/na chodbe: ostáva pod stropom a nad podlahou (vonku nerobí nič). */
  kamera(poz, ciel, hrac) {
    if (!this.vnutri) return false;
    poz.y = Math.min(poz.y, this.strop - 0.25);
    poz.y = Math.max(poz.y, this.podlaha + 1.0);
    return true;
  },

  nastavNapovedu(hra, text) {
    if (text === this.napoveda) return;
    // nápoveda ide cez hra.stav.napoveda – HUD ju kreslí každý snímok; cudziu nápovedu na null neprepisujeme
    if (text !== null || this.napoveda !== null) hra.stav.napoveda = text;
    this.napoveda = text;
  },

  /** Dvere vchodu (so šípkou a značkou na minimape) – pri zmene polohy nanovo. */
  postavVchod(hra) {
    const v = hra.stav.atriakyVchod;
    this.vchod = v;
    for (const d of Object.values(this.dvere)) { hra.scena.remove(d.skupina); d.skupina.traverse((q) => q.geometry?.dispose()); }
    this.dvere = {};
    if (this.sipka) hra.scena.remove(this.sipka);
    const teren = hra.mapa.vyskaTerenu ?? hra.mapa.vyska;
    const x = v.x + Math.sin(v.uhol) * 0.92, z = v.z + Math.cos(v.uhol) * 0.92;   // líce domu
    const y = teren(x, z);
    const skupina = postavDvere((v.strop ?? y + 2.8) - y);
    skupina.position.set(x, y, z);
    skupina.rotation.y = v.uhol + Math.PI;                   // lokálne +z = von z domu
    hra.scena.add(skupina);
    this.dvere.vchod = { skupina, kridlo: skupina.getObjectByName('kridlo'), u: 0, zatvaraj: false };
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
};

// ---------- výhľad, tabuľky ----------

/** Výhľad z okna izby: obloha a susedný dom s pavlačami (obrázok za sklom, jas podľa dňa a noci). */
function vyhlad() {
  const c = document.createElement('canvas'); c.width = 256; c.height = 160;
  const g = c.getContext('2d');
  const nebo = g.createLinearGradient(0, 0, 0, 160); nebo.addColorStop(0, '#9fc2e2'); nebo.addColorStop(1, '#dce8ef');
  g.fillStyle = nebo; g.fillRect(0, 0, 256, 160);
  g.fillStyle = '#b9b5ac'; g.fillRect(20, 46, 216, 114);
  for (let r = 0; r < 3; r++) {
    const y = 52 + r * 36;
    g.fillStyle = '#c0472b'; g.fillRect(20, y, 216, 5);
    g.fillStyle = '#b9b5ac'; g.fillRect(20, y + 5, 216, 13);
    g.fillStyle = '#e4e3df'; g.fillRect(20, y + 18, 216, 18);
    g.fillStyle = '#2f3a40'; for (let x = 26; x < 230; x += 30) g.fillRect(x, y + 21, 20, 13);
  }
  g.fillStyle = '#4d7a3c'; g.beginPath(); g.arc(200, 150, 40, 0, Math.PI * 2); g.fill();
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  return new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: tex }));
}

/** Tabuľka s textom na dverách (číslo izby, kuchynka, sprchy…). */
function tabulka(text, w) {
  const cv = document.createElement('canvas'); cv.width = 256; cv.height = 96;
  const q = cv.getContext('2d'); q.fillStyle = '#f3f1ea'; q.fillRect(0, 0, 256, 96);
  q.fillStyle = '#20242a'; q.font = 'bold 40px system-ui, sans-serif'; q.textAlign = 'center'; q.textBaseline = 'middle';
  q.fillText(text, 128, 50, 240);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace;
  return new THREE.Mesh(new THREE.PlaneGeometry(w, w * 0.375), new THREE.MeshLambertMaterial({ map: t }));
}

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
