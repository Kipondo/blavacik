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
import { tabulaOdchodov, hodiny, napis } from './tabule.js';

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
    this.postavTabule();
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
    if (m.tabula) this.tabula = poloz(tabulaOdchodov(), m.tabula);
    if (m.hodiny) this.hodiny = poloz(hodiny(), m.hodiny);
    if (m.pokladne) poloz(napis('POKLADNE', '#f2f2f2', '#1d3d6b'), m.pokladne);
    if (m.bufet) poloz(napis('BUFET', '#2a1a08', '#f0b24a'), m.bufet);
    if (m.tabula) {
      const k = { ...m.tabula, smer: m.tabula.smer };
      poloz(napis('K VLAKOM  ↑  NÁSTUPIŠTIA 1 – 6', '#ffffff', '#1d3d6b', 6), k, (m.tabula.vyska ?? 3.4) + 1.65);
    }
    this.minuta = -1;
    this.prekresliTabule();
  },

  prekresliTabule() {
    const d = new Date(this.hra.stav.datumCas ?? Date.now());
    const min = d.getHours() * 60 + d.getMinutes();
    if (min === this.minuta) return;
    this.minuta = min;
    this.tabula?.userData.prekresli(d, this.hra.stav.stanicaOdchody ?? null);
    this.hodiny?.userData.prekresli(d);
  },
};

/** Obdĺžnik okolo úsečky a→b s danou hrúbkou. */
function pasUsecky(a, b, hrubka) {
  const dx = b[0] - a[0], dz = b[1] - a[1], L = Math.hypot(dx, dz) || 1;
  const nx = -dz / L * hrubka / 2, nz = dx / L * hrubka / 2;
  return [[a[0] + nx, a[1] + nz], [b[0] + nx, b[1] + nz], [b[0] - nx, b[1] - nz], [a[0] - nx, a[1] - nz]];
}
