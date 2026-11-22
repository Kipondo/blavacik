// Modul: Hlavná stanica – chôdza dnu bez teleportu, kolízie, nástupištia, tabuľa odchodov a hodiny.
// Modely sú z Blendera (tools/blender/stanica_blender.py → assets/pamiatky/stanica*.glb.gz), záznamy
// v data/mapa/pamiatky.json. Ich JSON nesie údaje pre hru:
//   stanica.json             – steny: múry výpravnej budovy a krídla s medzerou v priechode, sklenené steny haly
//                              so štrbinami vo dverách (lokálne metre okolo bodu záznamu, výšky nad základňou modelu)
//   stanica-interier.json    – prvky (stĺpy, pokladne, bufet, automaty, lavičky) a miesta (tabuľa, hodiny,
//                              priechod, lavičky pre postavy); interiér sa kreslí len do „viditelnost“ m od kamery
//   stanica-nastupistia.json – nástupištia: os, šírky, výška nad terénom → pochôdzne plochy (js/mapa/mosty/nadjazdy-modul.js)
// Zverejní hra.stanica = { miesta, nastupiste(ref) → { x, z, y, smer } } pre spawn a postavy (A4).

import * as THREE from 'three';
import { tabulaOdchodov, hodiny, napis, navigacia, pasPokladni, pokladnica, napisStrechy } from './tabule.js';
import { freska } from './freska.js';

const SKUPINA = 'modul:stanica';
const SUBORY = { plast: 'stanica', interier: 'stanica-interier', nastupistia: 'stanica-nastupistia' };

export default {
  nazov: 'stanica',
  poradie: 7,   // po module nadjazdov (6), ktorý zbiera pochôdzne plochy

  async init(hra) {
    this.hra = hra;
    const pam = hra.mapa?.pamiatky ?? [];
    this.zaznamy = {};
    for (const [k, s] of Object.entries(SUBORY)) this.zaznamy[k] = pam.find((p) => p.subor === s);
    if (!this.zaznamy.plast) return;
    const nacitaj = async (s) => { try { return await (await fetch(`assets/pamiatky/${s}.json`)).json(); } catch { return null; } };
    [this.plast, this.interier, this.nastupistia] = await Promise.all(Object.values(SUBORY).map(nacitaj));
    this.zaklad = null;
    this.skupina = new THREE.Group();
    this.skupina.name = 'stanica-tabule';
    hra.scena.add(this.skupina);
    this.cas = 0;
    this.minuta = -1;
    hra.stanica = { miesta: this.interier?.miesta ?? {}, nastupiste: (ref, t) => this.nastupiste(ref, t), svet: (p) => this.svet('interier', p) };
    this.aktualizuj();
  },

  /** Skupina modelu v scéne podľa mena záznamu. */
  model(kluc) {
    const z = this.zaznamy[kluc];
    if (!z) return null;
    const pam = this.hra.mapa?.objekt?.getObjectByName?.('pamiatky');
    return pam?.children.find((o) => o.name === (z.nazov ?? z.subor)) ?? null;
  },

  svet(kluc, [x, z]) {
    const r = this.zaznamy[kluc];
    return [r.x + x, r.z + z];
  },

  teren(x, z) {
    const m = this.hra.mapa;
    return (m.vyskaTerenu ?? m.vyska)(x, z);
  },

  updateVzdy(dt) {
    if (!this.plast) return;
    this.skloHaly();
    // interiér len zblízka (rozpočet trojuholníkov a volaní kreslenia) – skrýva ho js/kamera/dohlad.js
    const ri = this.zaznamy.interier, mi = this.model('interier');
    if (ri && mi) {
      if (mi.userData.dohlad?.max !== this.dohladInterieru) {
        this.dohladInterieru = this.interier?.viditelnost ?? 100;
        mi.userData.dohlad = { x: ri.x, z: ri.z, max: this.dohladInterieru, r: 40 };
      }
      // interiér je pod strechou haly – tieň slnka nevrhá (ušetrí kreslenia v tieňovej mape), tiene len prijíma
      if (!mi.userData.bezTiena) {
        let hotovo = false;
        mi.traverse((o) => { if (o.isMesh) { o.castShadow = false; hotovo = true; } });
        if (hotovo) mi.userData.bezTiena = true;
      }
      this.skupina.visible = mi.visible;
    }
    this.cas -= dt;
    if (this.cas > 0) return;
    this.cas = 1;
    this.aktualizuj();
    this.prekresliTabule();
  },

  /** Sklo haly je priehľadné (zvonka vidno do haly, zvnútra na námestie) – raz po načítaní modelu.
   *  Prízemie číre, pásové okno poschodia tmavšie, svetlík na streche číry. */
  skloHaly() {
    if (this.skloHotovo) return;
    const m = this.model('plast');
    const PRIEHLADNOST = { 'sklo-hala': 0.32, 'sklo-hala-tmave': 0.62, 'sklo-svetlik': 0.3 };
    let n = 0;
    m?.traverse((o) => {
      if (!o.isMesh) return;
      for (const mat of Array.isArray(o.material) ? o.material : [o.material]) {
        if (!(mat.name in PRIEHLADNOST)) continue;
        mat.transparent = true;
        mat.opacity = PRIEHLADNOST[mat.name];
        mat.depthWrite = false;
        mat.needsUpdate = true;
        o.castShadow = false;
        o.renderOrder = 2;
        n++;
      }
    });
    if (n) this.skloHotovo = true;
  },

  /** Keď sa zmení základňa plášťa (terén z lasera), postaví kolízie a plochy znova. */
  aktualizuj() {
    const m = this.model('plast');
    if (!m) return;
    const y = m.position.y;
    if (this.zaklad !== null && Math.abs(y - this.zaklad) < 0.01) return;
    this.zaklad = y;
    try { this.postav(); } catch (e) { console.error('Stanica:', e.stack ?? e); }
  },

  postav() {
    const hra = this.hra, kol = hra.mapa.kolizie, z0 = this.zaklad;
    kol.odstranDlazdicu(SKUPINA);
    // steny plášťa (múry s medzerou v priechode, sklenené steny haly so štrbinami vo dverách)
    for (const s of this.plast.steny ?? []) {
      const a = this.svet('plast', s.a), b = this.svet('plast', s.b);
      kol.pridajPolygon(pasUsecky(a, b, s.hrubka), { typ: 'budova', vyska: [z0 + s.od, z0 + s.po], vrch: z0 + s.vrch, zem: true, dlazdica: SKUPINA });
    }
    // prvky interiéru (výšky nad terénom – interiér kopíruje terén)
    for (const p of this.interier?.prvky ?? []) {
      if (p.typ === 'stena') {
        // obklad historickej haly: stena so štrbinami v otvoroch (pre kameru „budova“)
        const a = this.svet('interier', p.a), b = this.svet('interier', p.b), t = this.teren((a[0] + b[0]) / 2, (a[1] + b[1]) / 2);
        kol.pridajPolygon(pasUsecky(a, b, p.hrubka), { typ: 'budova', vyska: [t - 2, t + p.vyska], vrch: t + p.vyska, zem: true, dlazdica: SKUPINA });
        continue;
      }
      const [x, z] = this.svet('interier', p.p), t = this.teren(x, z);
      const info = { typ: 'pamiatka', vyska: [t - 1, t + p.vyska], zem: true, dlazdica: SKUPINA };
      if (p.typ === 'kruh') kol.pridajKruh(x, z, p.r, info);
      else kol.pridajObdlznik(x, z, p.sirka, p.hlbka, p.uhol, info);
    }
    // nástupištia: pochôdzne plochy po úsekoch osi (výška = terén + výška nástupišťa)
    const profily = [];
    for (const n of this.nastupistia?.nastupistia ?? []) {
      for (let i = 0; i + 1 < n.body.length; i++) {
        const [ax, az] = this.svet('nastupistia', n.body[i]), [bx, bz] = this.svet('nastupistia', n.body[i + 1]);
        profily.push({
          body: [{ x: ax, z: az, h: this.teren(ax, az) + n.vyska }, { x: bx, z: bz, h: this.teren(bx, bz) + n.vyska }],
          sirka: Math.min(n.sirky[i], n.sirky[i + 1]) - 0.1,
        });
      }
    }
    hra.posli('pochodzne-plochy', { kluc: 'stanica', profily });
    // na podlahe haly, v budovách a na nástupištiach nerastie tráva (js/mapa/zelen/trava-modul.js)
    const polygony = [
      ...(this.plast.obrysy ?? []).map((o) => o.map((p) => this.svet('plast', p))),
      ...(this.nastupistia?.nahradit ?? []).map((o) => o.map((p) => this.svet('nastupistia', p))),
    ];
    // aj do stavu – modul trávy sa môže inicializovať až po stanici (udalosť by zmeškal)
    hra.stav.bezTravy = { ...(hra.stav.bezTravy ?? {}), stanica: polygony };
    hra.posli('bez-travy', { kluc: 'stanica', polygony });
    this.postavTabule();
    this.postavNapisy(z0);
  },

  /** Nápisy na plášti (svetelný nápis na šikmom páse Skleníka) – vidno ich aj zďaleka, nie len s interiérom. */
  postavNapisy(z0) {
    if (!this.napisy) {
      this.napisy = new THREE.Group();
      this.napisy.name = 'stanica-napisy';
      this.hra.scena.add(this.napisy);
    }
    for (const c of [...this.napisy.children]) { this.napisy.remove(c); c.geometry?.dispose(); c.material?.map?.dispose(); c.material?.dispose(); }
    for (const n of this.plast.napisy ?? []) {
      const m = napisStrechy(n.text, n.sirka);
      const [x, z] = this.svet('plast', n.p);
      m.position.set(x, z0 + n.vyska, z);
      m.rotation.order = 'YXZ';
      m.rotation.y = Math.atan2(n.smer[0], n.smer[1]);
      m.rotation.x = n.sklon ?? 0;      // pás sa hore vykláňa von – nápis leží na ňom
      this.napisy.add(m);
    }
  },

  /** Poloha na nástupišti `ref` (t = 0…1 pozdĺž osi) – pre spawn a scénku (A4). */
  nastupiste(ref, t = 0.5) {
    const n = (this.nastupistia?.nastupistia ?? []).find((q) => String(q.ref) === String(ref));
    if (!n) return null;
    const b = n.body.map((p) => this.svet('nastupistia', p));
    const L = [0];
    for (let i = 1; i < b.length; i++) L.push(L[i - 1] + Math.hypot(b[i][0] - b[i - 1][0], b[i][1] - b[i - 1][1]));
    const s = L.at(-1) * Math.min(1, Math.max(0, t));
    let i = 1;
    while (i < b.length - 1 && L[i] < s) i++;
    const u = (s - L[i - 1]) / Math.max(1e-6, L[i] - L[i - 1]);
    const x = b[i - 1][0] + (b[i][0] - b[i - 1][0]) * u, z = b[i - 1][1] + (b[i][1] - b[i - 1][1]) * u;
    const d = Math.hypot(b[i][0] - b[i - 1][0], b[i][1] - b[i - 1][1]) || 1;
    return { x, z, y: this.teren(x, z) + n.vyska, smer: [(b[i][0] - b[i - 1][0]) / d, (b[i][1] - b[i - 1][1]) / d] };
  },

  /** Tabuľa odchodov, hodiny a nápisy (plátno → textúra; prekresľuje sa raz za hernú minútu). */
  postavTabule() {
    for (const c of [...this.skupina.children]) { this.skupina.remove(c); c.traverse((o) => { o.geometry?.dispose(); o.material?.map?.dispose(); o.material?.dispose(); }); }
    const m = this.interier?.miesta ?? {};
    const poloz = (obj, miesto, vyska) => {
      const [x, z] = this.svet('interier', miesto.p);
      obj.position.set(x, this.teren(x, z) + (vyska ?? miesto.vyska ?? 3), z);
      const [sx, sz] = miesto.smer ?? [0, 1];
      obj.rotation.y = Math.atan2(sx, sz);
      this.skupina.add(obj);
      return obj;
    };
    // tabule odchodov: v Skleníku pred historickou halou a dve nad prechodom na nástupište pod freskou
    this.tabuleOdchodov = [];
    for (const t of [m.tabula, ...(m.tabule_hist ?? [])].filter(Boolean)) this.tabuleOdchodov.push(poloz(tabulaOdchodov(), t));
    if (m.hodiny) this.hodiny = poloz(hodiny(), m.hodiny);
    // pokladne: modrý pás s textom a zavesené boxy „POKLADNICA“
    if (m.pokladne) poloz(pasPokladni(m.pokladne.sirka ?? 18), m.pokladne);
    for (const o of m.okienka ?? []) poloz(pokladnica(), o);
    for (const s of m.stanky ?? []) poloz(napis(s.nazov, '#ffffff', '#3a3a3a', 2.6), s);
    // orientačné tabule (tmavomodré): k nástupištiam a k vlakom
    if (m.k_nastupistiam) poloz(navigacia('K NÁSTUPIŠTIAM 2 – 5', '↓', 3.4), m.k_nastupistiam);
    if (m.tabula) poloz(navigacia('NÁSTUPIŠTE 1, 6  ·  K NÁSTUPIŠTIAM 2 – 5', '↑', 6), m.tabula, (m.tabula.vyska ?? 4) + 1.6);
    // freska Františka Gajdoša (voľne prekreslená) nad prechodom a tabuľka s menom autora
    if (m.freska) {
      const f = freska(m.freska.sirka, m.freska.do - m.freska.od);
      poloz(f, m.freska, (m.freska.od + m.freska.do) / 2);
      const tab = napis('Freska: František Gajdoš, 1960 · v hre voľne prekreslená', '#2b2b2b', '#e6e2da', 3.2);
      poloz(tab, m.freska, m.freska.od - 0.55);
    }
    this.minuta = -1;
    this.prekresliTabule();
  },

  prekresliTabule() {
    const d = new Date(this.hra.stav.datumCas ?? Date.now());
    const min = d.getHours() * 60 + d.getMinutes();
    if (min === this.minuta) return;
    this.minuta = min;
    for (const t of this.tabuleOdchodov ?? []) t.userData.prekresli(d, this.hra.stav.stanicaOdchody ?? null);
    this.hodiny?.userData.prekresli(d);
  },
};

function vnutri(x, z, b) {
  let c = false;
  for (let i = 0, j = b.length - 1; i < b.length; j = i++) {
    if ((b[i][1] > z) !== (b[j][1] > z) && x < ((b[j][0] - b[i][0]) * (z - b[i][1])) / (b[j][1] - b[i][1]) + b[i][0]) c = !c;
  }
  return c;
}

/** Obdĺžnik okolo úsečky a→b s danou hrúbkou. */
function pasUsecky(a, b, hrubka) {
  const dx = b[0] - a[0], dz = b[1] - a[1], L = Math.hypot(dx, dz) || 1;
  const nx = -dz / L * hrubka / 2, nz = dx / L * hrubka / 2;
  return [[a[0] + nx, a[1] + nz], [b[0] + nx, b[1] + nz], [b[0] - nx, b[1] - nz], [a[0] - nx, a[1] - nz]];
}
