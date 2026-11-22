// Modul: chodci na chodníkoch a námestiach okolo hráča.
//
// Hustota: do 120 m približne 1 človek na 15 m chodníka (širšie pešie zóny viac, námestia 1 na 110 m²),
// ďalej (do 230 m) štvrtina. Chodci idú len po chodníkoch, pešich zónach, cestičkách v parkoch, schodoch
// a prechodoch (siet-chodnikov.js) – nie po vozovke a nie cez domy. Držia sa vpravo, obchádzajú sa,
// občas zastanú, na námestiach sa prechádzajú medzi náhodnými bodmi a pomalému autu uhnú.
// Rýchle auto hráča chodca zrazí (zrazenie.js): odletí, spadne, chvíľu leží, vstane a vráti sa na chodník.
//
// Kreslenie: najbližších 8 = plný model (model-npc.js, kostra, mimika), ostatní = InstancedMesh
// s animáciou v textúre (vat.js, material-vat.js) – stovky chodcov za pár volaní kreslenia.
//
// Pre ostatné moduly: hra.chodci.zoznam = [{ x, z, uhol, v }]

import * as THREE from 'three';
import { nacitajNpcData, poskladajChodca } from '../npc/profily-npc.js';
import { vytvorNpc, farbySlotov } from '../npc/model-npc.js';
import { zapecModel } from './vat.js';
import { vytvorMaterialyVat, Palety } from './material-vat.js';
import { SietChodnikov, nahodnyBod, vnutri, vBudove } from './siet-chodnikov.js';
import { zasiahnutyAutom, zraz, pohybZrazeneho, maticaZrazeneho, MIN_RYCHLOST } from './zrazenie.js';

const R_HUSTE = 120, R_RIEDKE = 230, R_ZMAZ = 270;
const NA_METER = 1 / 15;           // chodcov na meter chodníka šírky 2,5 m
const NA_M2_NAMESTIA = 1 / 110;
const MAX_CHODCOV = 450;
const PLNY_DOSAH = 12, MAX_PLNYCH = 8;   // plný model (kostra)
const L1_DOSAH = 40, MAX_L1 = 70;        // zlúčená sieť LOD1
const KAP_L1 = 70, KAP_L2 = 500;          // kapacita InstancedMesh na variant
const RYCHLOST_KLIPU = 1.4;               // m/s, pri ktorej chôdza v klipe nekĺže (náhradná – inak zmeraná, krok.js)
const MAX_ZRYCHLENIE = 1.6;               // rýchlejšie kroky by pôsobili ako cupitanie (ako animacie.js)

const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _p = new THREE.Vector3(), _s = new THREE.Vector3();
const _y = new THREE.Vector3(0, 1, 0);

export default {
  nazov: 'chodci',
  poradie: 12, // po hráčovi

  init(hra) {
    this.hra = hra;
    this.siet = new SietChodnikov();
    this.chodci = [];
    this.pripravene = false;
    this.cas = 0;
    this.dalsiSpawn = 0;
    this.prvyRaz = true;
    this.plne = new Map();       // chodec → plný model (npc z vytvorNpc)
    this.frustum = new THREE.Frustum();
    hra.chodci = { zoznam: [] };

    this.siet.kolizie = hra.mapa.kolizie;
    const sprava = hra.mapa.dlazdice;
    if (sprava) {
      const pridaj = (kluc, data) => this.siet.pridajDlazdicu(kluc, data.chodniky, data.pokryvka, data.cesty);
      for (const [kluc, a] of sprava.aktivne) if (a.uroven === 'detail') pridaj(kluc, a.data);
      hra.na('dlazdica-nacitana', ({ kluc, uroven, data }) => { if (uroven === 'detail') pridaj(kluc, data); });
      hra.na('dlazdica-uvolnena', ({ kluc }) => this.siet.odoberDlazdicu(kluc));
    }
    // modely a zapečené animácie sa pripravia na pozadí (hra medzitým beží)
    this._priprav(hra).catch((e) => console.warn('Chodci: nepodarilo sa pripraviť modely', e));
  },

  async _priprav(hra) {
    this.data = await nacitajNpcData();
    this.skupina = new THREE.Group();
    this.skupina.name = 'chodci';
    hra.scena.add(this.skupina);
    this.spolocne = { cas: { value: 0 }, palety: null };
    this.palety = new Palety(2048);
    this.spolocne.palety = { value: this.palety.textura };
    this.varianty = new Map(); // variant → { lod: [{ siet, pocet }…], trvanieChodze, trvanieStoja, vKroku, sloty }
    for (const [, m] of Object.entries(this.data.npc.modely)) {
      const zapecene = await zapecModel(m.subor);
      for (const [variant, z] of zapecene) {
        const lod = z.lod.map((l, i) => {
          if (!l) return null;
          const { mat, hlbka } = vytvorMaterialyVat(l, this.spolocne);
          const kap = i === 0 ? KAP_L1 : KAP_L2;
          const siet = new THREE.InstancedMesh(l.geometria, mat, kap);
          siet.customDepthMaterial = hlbka;
          siet.count = 0;
          siet.frustumCulled = false;
          siet.castShadow = i === 0;
          siet.receiveShadow = false;
          siet.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
          const attr = new THREE.InstancedBufferAttribute(new Float32Array(kap * 4), 4);
          attr.setUsage(THREE.DynamicDrawUsage);
          siet.geometry = l.geometria.clone();
          siet.geometry.setAttribute('aChodec', attr);
          siet.geometry.boundingSphere = l.geometria.boundingSphere;
          this.skupina.add(siet);
          return { siet, attr, pocet: 0, kap };
        });
        this.varianty.set(variant, { lod, sloty: z.sloty, trvanieChodze: z.trvanieChodze, trvanieStoja: z.trvanieStoja, vKroku: z.vKroku });
      }
    }
    this.pripravene = true;
    console.info(`Chodci: ${this.varianty.size} variantov pripravených (animácia zapečená do textúr)`);
  },

  // ---------- vznik ----------
  _novyChodec(spec) {
    const v = this.varianty.get(spec.variant);
    if (!v) return null;
    const paleta = this.palety.pridaj(farbySlotov(v.sloty, spec, this.data.satnik));
    if (paleta < 0) return null;
    return {
      spec, v, paleta,
      rychlost: spec.rychlost * (0.85 + Math.random() * 0.2),
      x: 0, z: 0, y: 0, uhol: 0, vx: 0, vz: 0, rych: 0,
      faza: Math.random(), pauza: 0, bocny: 0, bocnyCiel: 0, brzda: 1, cielV: 0,
      hrana: null, s: 0, smer: 1, namestie: null, ciel: null,
    };
  },

  _spawn(hra) {
    const p = hra.stav.pozicia;
    const kam = hra.kamera;
    const dirK = new THREE.Vector3(); kam.getWorldDirection(dirK);
    let ziadane = 0, sucet = 0;
    const kandidati = [];
    for (const h of this.siet.hrany) {
      const mx = (h.a.x + h.b.x) / 2, mz = (h.a.z + h.b.z) / 2;
      const d = Math.hypot(mx - p.x, mz - p.z);
      if (d > R_RIEDKE) continue;
      const w = h.dlzka * NA_METER * Math.min(2.5, h.sirka / 2.5) * (d < R_HUSTE ? 1 : 0.25);
      ziadane += w; sucet += w; kandidati.push([sucet, h, null]);
    }
    for (const n of this.siet.namestia) {
      const d = Math.hypot(n.cx - p.x, n.cz - p.z);
      if (d > R_RIEDKE + 60) continue;
      const w = n.plocha * NA_M2_NAMESTIA * (d < R_HUSTE ? 1 : 0.25);
      ziadane += w; sucet += w; kandidati.push([sucet, null, n]);
    }
    let pocet = 0;
    for (const c of this.chodci) if (Math.hypot(c.x - p.x, c.z - p.z) <= R_RIEDKE) pocet++;
    let chyba = Math.min(MAX_CHODCOV - this.chodci.length, Math.floor(ziadane - pocet));
    if (chyba <= 0 || !kandidati.length) return;
    if (!this.prvyRaz) chyba = Math.min(chyba, 12);
    let pokusy = chyba * 3;
    for (let n = 0; n < chyba && pokusy-- > 0;) {
      const r = Math.random() * sucet;
      let lo = 0, hi = kandidati.length - 1;
      while (lo < hi) { const m = (lo + hi) >> 1; if (kandidati[m][0] < r) lo = m + 1; else hi = m; }
      const [, h, nam] = kandidati[lo];
      let x, z;
      if (h) {
        const s = Math.random() * h.dlzka;
        x = h.a.x + h.ux * s; z = h.a.z + h.uz * s;
      } else {
        const b = nahodnyBod(nam); if (!b) continue;
        [x, z] = b;
      }
      const d = Math.hypot(x - p.x, z - p.z);
      if (!this.prvyRaz && d < 60) {
        const vx = x - kam.position.x, vz = z - kam.position.z;
        if (vx * dirK.x + vz * dirK.z > -5 || d < 25) continue; // blízko len za chrbtom
      }
      if (hra.mapa.kolizie && !hra.mapa.kolizie.jeVolne(x, z, 0.35)) continue;
      if (!h && !this.siet.jePesie(x, z)) continue;
      const spec = poskladajChodca(this.data);
      const c = this._novyChodec(spec);
      if (!c) continue;
      c.x = x; c.z = z; c.y = hra.mapa.vyska(x, z);
      if (h) {
        c.hrana = h; c.s = Math.hypot(x - h.a.x, z - h.a.z); c.smer = Math.random() < 0.5 ? 1 : -1;
        c.bocnyCiel = c.bocny = (Math.random() * 0.8 + 0.1) * Math.max(0, h.sirka / 2 - 0.4);
        c.uhol = Math.atan2(h.ux * c.smer, h.uz * c.smer);
      } else {
        c.namestie = nam; c.uhol = Math.random() * Math.PI * 2;
        c.pauza = Math.random() < 0.3 ? Math.random() * 6 : 0;
      }
      if (Math.random() < 0.12) c.pauza = 2 + Math.random() * 8; // niekto práve stojí (telefonuje, čaká…)
      this.chodci.push(c);
      n++;
    }
    this.prvyRaz = false;
  },

  _zrus(c) {
    c.zruseny = true;
    this.palety.uvolni(c.paleta);
    const plny = this.plne.get(c);
    if (plny) { plny.npc?.zrus(); this.plne.delete(c); }
  },

  // ---------- pohyb ----------
  _dalsiaHrana(c) {
    const u = c.smer > 0 ? c.hrana.b : c.hrana.a;
    const moznosti = u.hrany.filter((h) => h !== c.hrana && !h.zmazana);
    if (!moznosti.length) { c.smer = -c.smer; return; } // slepý koniec – otočí sa
    // radšej rovno ako odbočiť
    const ux = c.hrana.ux * c.smer, uz = c.hrana.uz * c.smer;
    let sucet = 0;
    const vahy = moznosti.map((h) => {
      const sm = h.a === u ? 1 : -1;
      const cos = h.ux * sm * ux + h.uz * sm * uz;
      const w = cos > 0.7 ? 4 : 1;
      sucet += w;
      return w;
    });
    let r = Math.random() * sucet, vyber = moznosti[0];
    for (let i = 0; i < moznosti.length; i++) { if (r < vahy[i]) { vyber = moznosti[i]; break; } r -= vahy[i]; }
    c.smer = vyber.a === u ? 1 : -1;
    c.s = c.smer > 0 ? 0 : vyber.dlzka;
    c.hrana = vyber;
    c.bocnyCiel = Math.min(c.bocnyCiel, Math.max(0, vyber.sirka / 2 - 0.4));
  },

  _pohyb(c, dt, hra) {
    if (c.zrazeny) { pohybZrazeneho(c, dt, hra, (x, z) => vBudove(this.siet.kolizie, x, z)); return; }
    if (c.navrat) { this._navrat(c, dt, hra); return; }
    if (c.pauza > 0) { c.pauza -= dt; c.cielV = 0; }
    else c.cielV = c.rychlost;
    c.rych += (Math.min(c.cielV, c.cielV * c.brzda) - c.rych) * Math.min(1, dt * 4);
    c.brzda = 1;

    if (c.hrana) {
      if (c.hrana.zmazana) { this._zrus(c); return; }
      c.s += c.rych * dt * c.smer;
      let n = 0;
      while ((c.s < 0 || c.s > c.hrana.dlzka) && n++ < 4) {
        const prebytok = c.s < 0 ? -c.s : c.s - c.hrana.dlzka;
        this._dalsiaHrana(c);
        c.s += prebytok * c.smer;
        if (Math.random() < 0.03) c.pauza = 1 + Math.random() * 5;
      }
      c.bocny += (c.bocnyCiel - c.bocny) * Math.min(1, dt * 1.5);
      const h = c.hrana, ux = h.ux * c.smer, uz = h.uz * c.smer;
      // vpravo od smeru chôdze = (-uz, ux)
      let x = h.a.x + h.ux * c.s - uz * c.bocny, z = h.a.z + h.uz * c.s + ux * c.bocny;
      // bokom nie do domu ani na vozovku – späť k osi chodníka (kontrola 3× za sekundu stačí)
      c.kontrola = (c.kontrola ?? Math.random() * 0.33) - dt;
      if (Math.abs(c.bocny) > 0.3 && c.kontrola <= 0) {
        c.kontrola = 0.33;
        if (!this.siet.jePesie(x, z)) {
          c.bocny *= 0.5; c.bocnyCiel *= 0.3;
          x = h.a.x + h.ux * c.s - uz * c.bocny; z = h.a.z + h.uz * c.s + ux * c.bocny;
        }
      }
      c.vx = (x - c.x) / Math.max(dt, 1e-4); c.vz = (z - c.z) / Math.max(dt, 1e-4);
      c.x = x; c.z = z;
      if (c.rych > 0.05) {
        let du = Math.atan2(ux, uz) - c.uhol;
        du = Math.atan2(Math.sin(du), Math.cos(du));
        c.uhol += du * Math.min(1, dt * 6);
      }
    } else if (c.namestie) {
      const n = c.namestie;
      if (n.zmazana) { this._zrus(c); return; }
      if (!c.ciel || Math.hypot(c.ciel[0] - c.x, c.ciel[1] - c.z) < 0.6) {
        if (c.ciel) c.pauza = Math.random() < 0.4 ? Math.random() * 7 : 0;
        c.ciel = nahodnyBod(n) ?? [n.cx, n.cz];
      }
      const dx = c.ciel[0] - c.x, dz = c.ciel[1] - c.z, d = Math.hypot(dx, dz) || 1;
      const nx = c.x + (dx / d) * c.rych * dt, nz = c.z + (dz / d) * c.rych * dt;
      // prekážka (fontána, socha, dom, vozovka) – nový cieľ; kontroluje sa 4× za sekundu bod 0,8 m vpredu
      c.kontrola = (c.kontrola ?? Math.random() * 0.25) - dt;
      let volno = true;
      if (c.kontrola <= 0) {
        c.kontrola = 0.25;
        const px = c.x + (dx / d) * 0.8, pz = c.z + (dz / d) * 0.8;
        volno = (!hra.mapa.kolizie || hra.mapa.kolizie.jeVolne(px, pz, 0.3)) && this.siet.jePesie(px, pz);
      }
      if (volno) { c.x = nx; c.z = nz; }
      else c.ciel = null;
      if (c.rych > 0.05) {
        let du = Math.atan2(dx, dz) - c.uhol;
        du = Math.atan2(Math.sin(du), Math.cos(du));
        c.uhol += du * Math.min(1, dt * 5);
      }
      c.vx = (dx / d) * c.rych; c.vz = (dz / d) * c.rych;
    }
  },

  /** Po zrazení: vstal a ide (rýchlejšie) späť na svoj chodník, potom pokračuje. */
  _navrat(c, dt, hra) {
    let tx, tz;
    if (c.hrana && !c.hrana.zmazana) {
      const h = c.hrana;
      c.s = Math.max(0, Math.min(h.dlzka, (c.x - h.a.x) * h.ux + (c.z - h.a.z) * h.uz));
      tx = h.a.x + h.ux * c.s; tz = h.a.z + h.uz * c.s;
    } else if (c.namestie && !c.namestie.zmazana) { c.navrat = false; return; }
    else { this._zrus(c); return; }
    const dx = tx - c.x, dz = tz - c.z, d = Math.hypot(dx, dz);
    if (d < 0.4) { c.navrat = false; c.bocny = c.bocnyCiel = 0; return; }
    c.rych = Math.min(c.rychlost * 1.6, 2.4);
    const krok = Math.min(d, c.rych * dt);
    c.x += (dx / d) * krok; c.z += (dz / d) * krok;
    c.vx = (dx / d) * c.rych; c.vz = (dz / d) * c.rych;
    let du = Math.atan2(dx, dz) - c.uhol;
    du = Math.atan2(Math.sin(du), Math.cos(du));
    c.uhol += du * Math.min(1, dt * 6);
  },

  /** Chodci sa navzájom obchádzajú a uhýbajú hráčovi a autu (mriežka 2 m). */
  _odstupy(hra, dt) {
    // mriežka 2 × 2 m sa používa znova (nové polia každý snímok zbytočne zaťažovali zber pamäte)
    if (!this._mriezka || this._mriezka.size > 4000) this._mriezka = new Map();
    const mriezka = this._mriezka;
    for (const zoz of mriezka.values()) zoz.length = 0;
    const kluc = (x, z) => (Math.floor(x / 2) * 73856093) ^ (Math.floor(z / 2) * 19349663);
    for (const c of this.chodci) {
      const k = kluc(c.x, c.z);
      let zoz = mriezka.get(k);
      if (!zoz) mriezka.set(k, (zoz = []));
      zoz.push(c);
    }
    const hp = hra.stav.auto ? hra.stav.auto.pozicia : hra.hrac?.pozicia;
    const auto = hra.stav.auto;
    for (const c of this.chodci) {
      if (c.zrazeny) continue;
      // rýchle auto hráča chodca zrazí (neuhne)
      if (auto && zasiahnutyAutom(c, auto)) { zraz(c, auto, hra); continue; }
      let px = 0, pz = 0;
      const cx = Math.floor(c.x / 2), cz = Math.floor(c.z / 2);
      for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) {
        const zoz = mriezka.get(((cx + i) * 73856093) ^ ((cz + j) * 19349663));
        if (!zoz) continue;
        for (const o of zoz) {
          if (o === c) continue;
          const dx = c.x - o.x, dz = c.z - o.z, d2 = dx * dx + dz * dz;
          if (d2 > 0.81 || d2 < 1e-6) continue;
          const d = Math.sqrt(d2), sila = (0.9 - d) / d;
          px += dx * sila; pz += dz * sila;
          // niekto pomalší tesne predo mnou → spomalím
          const pred = -(dx * Math.sin(c.uhol) + dz * Math.cos(c.uhol));
          if (pred > 0.2 && o.rych < c.rych) c.brzda = Math.min(c.brzda, 0.6);
        }
      }
      // hráč (pešo) a pomalé auto hráča – odtlačí; rýchle auto už nie (chodec nestihne uhnúť a auto ho zrazí)
      if (hp && !(auto && Math.hypot(auto.vx, auto.vz) >= MIN_RYCHLOST)) {
        const dx = c.x - hp.x, dz = c.z - hp.z, d = Math.hypot(dx, dz);
        const r = auto ? 2.6 : 0.9;
        if (d < r && d > 1e-3) { const s = ((r - d) / d) * (auto ? 3 : 1.2); px += dx * s; pz += dz * s; }
      }
      if (px === 0 && pz === 0) continue;
      const k = Math.min(1, dt * 6);
      if (c.hrana) {
        const ux = c.hrana.ux * c.smer, uz = c.hrana.uz * c.smer;
        const vpravo = px * -uz + pz * ux;
        const max = Math.max(0, c.hrana.sirka / 2 - 0.3) + (auto ? 0.6 : 0);
        c.bocny = Math.max(-max, Math.min(max, c.bocny + vpravo * k));
        c.bocnyCiel = Math.max(-max, Math.min(max, c.bocnyCiel + vpravo * k * 0.3));
      } else {
        const nx = c.x + px * k, nz = c.z + pz * k;
        if (!c.namestie || vnutri(c.namestie.body, nx, nz)) { c.x = nx; c.z = nz; }
      }
    }
  },

  update(dt, hra) {
    if (!this.pripravene) return;
    this.cas += dt;
    this.spolocne.cas.value = this.cas;
    const p = hra.stav.pozicia;

    this.dalsiSpawn -= dt;
    if (this.dalsiSpawn <= 0 && (this.siet.hrany.size || this.siet.namestia.size)) {
      this.dalsiSpawn = 0.3;
      this._spawn(hra);
    }
    for (const c of this.chodci) {
      if (Math.hypot(c.x - p.x, c.z - p.z) > R_ZMAZ) { this._zrus(c); continue; }
      this._pohyb(c, dt, hra);
    }
    if (this.chodci.some((c) => c.zruseny)) this.chodci = this.chodci.filter((c) => !c.zruseny);
    this._odstupy(hra, dt);
    this._vykresli(hra, dt);
    hra.chodci.zoznam = this.chodci;
  },

  // ---------- kreslenie ----------
  _vykresli(hra, dt) {
    const kam = hra.kamera;
    kam.updateMatrixWorld();
    _m.multiplyMatrices(kam.projectionMatrix, kam.matrixWorldInverse);
    this.frustum.setFromProjectionMatrix(_m);
    const kx = kam.position.x, kz = kam.position.z;
    const gula = new THREE.Sphere(new THREE.Vector3(), 1.2);

    const viditelni = [];
    for (const c of this.chodci) {
      const y = hra.mapa.vyska(c.x, c.z);
      if (c.zrazeny) c.y = c.zrazeny.y;
      else c.y = Math.abs(y - c.y) > 1.5 ? y : c.y + (y - c.y) * Math.min(1, dt * 10);
      c.d = Math.hypot(c.x - kx, c.z - kz);
      if (c.d > R_RIEDKE + 20) continue;
      gula.center.set(c.x, c.y + 0.9, c.z);
      if (!this.frustum.intersectsSphere(gula)) continue;
      viditelni.push(c);
    }
    viditelni.sort((a, b) => a.d - b.d);

    for (const v of this.varianty.values()) for (const l of v.lod) if (l) l.pocet = 0;
    let nPlnych = 0, nL1 = 0;
    const plniTeraz = new Set();
    for (const c of viditelni) {
      // plný model pre najbližších
      if (c.d < PLNY_DOSAH && nPlnych < MAX_PLNYCH) {
        const plny = this._plnyModel(c, hra);
        if (plny?.npc) {
          nPlnych++;
          plniTeraz.add(c);
          const k = plny.npc.koren;
          k.visible = true;
          if (c.zrazeny) {
            maticaZrazeneho(c, 1, _m);
            _m.decompose(k.position, k.quaternion, _s);
            plny.npc.rychlost = 0;
          } else {
            k.position.set(c.x, c.y, c.z);
            k.rotation.set(0, c.uhol, 0);
            plny.npc.rychlost = c.rych;
          }
          plny.npc.animuj(dt);
          continue;
        }
      }
      const uroven = c.d < L1_DOSAH && nL1 < MAX_L1 ? 0 : 1;
      const l = c.v.lod[uroven] ?? c.v.lod[0];
      if (!l || l.pocet >= l.kap) continue;
      if (uroven === 0) nL1++;
      const i = l.pocet++;
      const m = c.spec.mierka ?? 1;
      if (c.zrazeny) maticaZrazeneho(c, m, _m);
      else {
        _q.setFromAxisAngle(_y, c.uhol);
        _m.compose(_p.set(c.x, c.y, c.z), _q, _s.set(m, m, m));
      }
      l.siet.setMatrixAt(i, _m);
      const stoji = c.rych < 0.15 || !!c.zrazeny;
      // krok podľa skutočnej rýchlosti a dĺžky kroku (vyšší chodec = dlhší krok), nohy nekĺžu
      const pomer = Math.min(MAX_ZRYCHLENIE, Math.max(0.55, c.rych / ((c.v.vKroku ?? RYCHLOST_KLIPU) * m)));
      const rych = stoji ? 1 / c.v.trvanieStoja : pomer / c.v.trvanieChodze;
      // fáza tak, aby sa pri zmene rýchlosti postava „neprepla“ v kroku
      if (c._rych !== rych) { c.faza = (c.faza + this.cas * ((c._rych ?? rych) - rych)) % 1; c._rych = rych; }
      l.attr.setXYZW(i, c.faza, rych, stoji ? 1 : 0, c.paleta);
    }
    for (const v of this.varianty.values()) {
      for (const l of v.lod) {
        if (!l) continue;
        l.siet.count = l.pocet;
        if (l.pocet) { l.siet.instanceMatrix.needsUpdate = true; l.attr.needsUpdate = true; }
      }
    }
    // plné modely, ktoré sa teraz nekreslia, skryjeme; staré zrušíme
    for (const [c, plny] of this.plne) {
      if (plniTeraz.has(c)) { plny.posledne = this.cas; continue; }
      if (plny.npc) plny.npc.koren.visible = false;
      if (this.cas - plny.posledne > 8 || this.plne.size > MAX_PLNYCH * 2) {
        plny.npc?.zrus(); plny.zruseny = true; this.plne.delete(c);
      }
    }
  },

  /** Plný model chodca (vytvára sa na pozadí; kým nie je, kreslí sa zlúčená sieť). */
  _plnyModel(c, hra) {
    let plny = this.plne.get(c);
    if (!plny) {
      plny = { npc: null, posledne: this.cas };
      this.plne.set(c, plny);
      vytvorNpc(c.spec, this.data).then((npc) => {
        if (plny.zruseny || c.zruseny) { npc.zrus(); return; }
        npc.nastavLod(0);
        npc.koren.visible = false;
        npc.koren.traverse((o) => { if (o.isMesh) o.castShadow = true; });
        this.skupina.add(npc.koren);
        plny.npc = npc;
      }).catch(() => { plny.chyba = true; });
    }
    return plny;
  },
};
