// Modul: NPC premávka – autá jazdia po cestách okolo hráča.
//
// Sieť ciest sa skladá z načítaných podrobných dlaždíc (siet.js). Autá idú v pruhoch vpravo,
// držia odstup (model inteligentného vodiča – IDM), zastavujú na červenú (hra.doprava.semafor),
// na križovatkách bez semaforov sa striedajú (rezervácia križovatky), brzdia pred električkou,
// autobusom, chodcom aj autom hráča. Hustota podľa typu cesty (HUSTOTA v siet.js).
// Kreslia sa cez InstancedMesh (pár volaní kreslenia pre stovky áut).
// Klávesou E sa dá do NPC auta nastúpiť – zmení sa na obyčajné auto (hra.pridajAuto).
//
// Pre ostatné moduly: hra.doprava.npcAuta = [{ x, z, uhol, v, dlzka }]

import * as THREE from 'three';
import { KONFIG } from '../../config.js';
import { SietCiest, jeKrizovatka } from './siet.js';
import { geometrieNpc, prislusenstvoNpc } from './model.js';
import { nahodnyTyp, nahodnaFarba, nahodnaSluzba } from '../../auto/typy-aut.js';


const R = 380;            // m – v tomto okruhu okolo hráča jazdia autá
const R_ZMAZ = 460;       // m – ďalej sa autá zrušia
const R_NEVIDNO = 170;    // m – bližšie sa nové auto objaví len mimo pohľadu kamery
const MAX_AUT = 200;
const RIEDKOST = 3;       // premávka je 3× redšia, ako by zodpovedalo hustote ciest (HUSTOTA v siet.js)
const SIRKA_AUTA = 1.8;
// model inteligentného vodiča (IDM)
const A_MAX = 1.9, B_KOMF = 2.8, S0 = 2.3, T_ODSTUP = 1.25;
const DOHLAD = 70;        // m – ako ďaleko dopredu vodič sleduje autá a križovatky

const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(0, 0, 0, 'YXZ');
const _p = new THREE.Vector3(), _j = new THREE.Vector3(1, 1, 1), _c = new THREE.Color();

/** Je v hre noc (viac taxíkov a kuriérov, menej dodávok)? */
function jeNoc(hra) {
  const h = hra.stav.datumCas?.getHours?.();
  return h !== undefined && (h >= 21 || h < 5);
}

export default {
  nazov: 'premavka',
  poradie: 8, // pred hráčom (kvôli nastupovaniu do NPC áut)

  init(hra) {
    this.hra = hra;
    this.siet = new SietCiest();
    this.auta = [];
    this.cas = 0;
    this.dalsiSpawn = 0;
    this.prvyRaz = true;
    hra.doprava ??= {};
    hra.doprava.npcAuta = [];

    const sprava = hra.mapa.dlazdice;
    if (sprava) {
      for (const [kluc, a] of sprava.aktivne) if (a.uroven === 'detail') this.siet.pridajDlazdicu(kluc, a.data.cesty);
      hra.na('dlazdica-nacitana', ({ kluc, uroven, data }) => { if (uroven === 'detail') this.siet.pridajDlazdicu(kluc, data.cesty); });
      hra.na('dlazdica-uvolnena', ({ kluc }) => this.siet.odoberDlazdicu(kluc));
    }

    // siete pre typy áut a príslušenstvo taxíkov/kuriérov – vytvárajú sa až pri prvom aute daného typu
    this.mat = {
      lak: new THREE.MeshStandardMaterial({ roughness: 0.3, metalness: 0.35, envMapIntensity: 1.0 }),
      sklo: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.06, metalness: 0.5, envMapIntensity: 1.5 }),
      ost: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6, metalness: 0.1 }),
      svetla: new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false }),
    };
    this.skupina = new THREE.Group();
    this.skupina.name = 'premavka';
    hra.scena.add(this.skupina);
    this.typy = {};
    this.sluzby = {};
  },

  _siet(geo, mat, tien) {
    const m = new THREE.InstancedMesh(geo, mat, MAX_AUT);
    m.count = 0; m.frustumCulled = false; m.castShadow = tien; m.receiveShadow = tien;
    m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.skupina.add(m);
    return m;
  },

  /** Siete typu auta (lak, sklo, ostatné, svetlá). */
  _typ(typ) {
    if (this.typy[typ]) return this.typy[typ];
    const g = geometrieNpc(typ);
    const lak = this._siet(g.lak, this.mat.lak, true);
    lak.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(MAX_AUT * 3), 3);
    lak.instanceColor.setUsage(THREE.DynamicDrawUsage);
    this.typy[typ] = { casti: [lak, this._siet(g.sklo, this.mat.sklo, false), this._siet(g.ostatne, this.mat.ost, true), this._siet(g.svetla, this.mat.svetla, false)], dlzka: g.dlzka, pocet: 0 };
    return this.typy[typ];
  },

  /** Svetlo na streche a pruhy taxíka / kuriéra (jedna sieť na variant). */
  _sluzba(sl) {
    const k = `${sl.druh}:${sl.id}`;
    if (k in this.sluzby) return this.sluzby[k];
    const p = prislusenstvoNpc(sl);
    this.sluzby[k] = p ? { siet: this._siet(p.geo, p.mat, false), pocet: 0 } : null;
    return this.sluzby[k];
  },

  // ---------- trasa ----------
  _vyberDalsiu(h) {
    let moznosti = h.b.von.filter((x) => x !== h.spatna && !x.zmazana);
    if (!moznosti.length) moznosti = h.b.von.filter((x) => !x.zmazana);
    if (!moznosti.length) return null;
    if (moznosti.length === 1) return moznosti[0];
    let sucet = 0;
    const vahy = moznosti.map((x) => {
      const cos = h.ux * x.ux + h.uz * x.uz;
      let w = cos > 0.85 ? 6 : cos > 0 ? 1.5 : 1;
      if (x.typ === h.typ) w *= 2;
      w *= 40 / x.hustota; // na väčšie cesty sa odbočuje častejšie
      sucet += w;
      return w;
    });
    let r = Math.random() * sucet;
    for (let i = 0; i < moznosti.length; i++) { if (r < vahy[i]) return moznosti[i]; r -= vahy[i]; }
    return moznosti[0];
  },

  _dopln(a) {
    while (a.trasa.length < 6) {
      const posledna = a.trasa.length ? a.trasa[a.trasa.length - 1] : a.hrana;
      const d = this._vyberDalsiu(posledna);
      if (!d) break;
      a.trasa.push(d);
    }
  },

  // ---------- vznik a zánik ----------
  _spawn(hra) {
    const p = hra.stav.pozicia;
    const kam = hra.kamera;
    const smerKamery = new THREE.Vector3();
    kam.getWorldDirection(smerKamery);
    let ziadane = 0;
    const kandidati = [];
    let sucet = 0;
    for (const h of this.siet.hrany) {
      const mx = (h.a.x + h.b.x) / 2, mz = (h.a.z + h.b.z) / 2;
      const d = Math.hypot(mx - p.x, mz - p.z);
      if (d > R) continue;
      const w = (h.pruhy * h.dlzka) / (h.hustota * RIEDKOST);
      ziadane += w;
      sucet += w;
      kandidati.push([sucet, h, d]);
    }
    let pocet = 0;
    for (const a of this.auta) if (Math.hypot(a.x - p.x, a.z - p.z) <= R) pocet++;
    const chyba = Math.min(MAX_AUT - this.auta.length, Math.floor(ziadane - pocet));
    if (chyba <= 0 || !kandidati.length) return;
    const naraz = this.prvyRaz ? chyba : Math.min(chyba, 10);
    let pokusy = naraz * 4;
    for (let n = 0; n < naraz && pokusy-- > 0;) {
      const r = Math.random() * sucet;
      let lo = 0, hi = kandidati.length - 1;
      while (lo < hi) { const m = (lo + hi) >> 1; if (kandidati[m][0] < r) lo = m + 1; else hi = m; }
      const [, h] = kandidati[lo];
      const s = Math.random() * h.dlzka;
      const pruh = Math.floor(Math.random() * h.pruhy);
      const off = h.posuny[pruh];
      const x = h.a.x + h.ux * s - h.uz * off, z = h.a.z + h.uz * s + h.ux * off;
      const d = Math.hypot(x - p.x, z - p.z);
      if (d < (this.prvyRaz ? 25 : R_NEVIDNO)) {
        // blízko hráča len mimo pohľadu kamery
        if (this.prvyRaz) continue;
        const vx = x - kam.position.x, vz = z - kam.position.z;
        if (vx * smerKamery.x + vz * smerKamery.z > -10 || d < 45) continue;
      }
      // voľné miesto v pruhu
      if (h.auta.some((o) => o.pruh === pruh && Math.abs(o.s - s) < 12)) continue;
      if (this.auta.some((o) => Math.abs(o.x - x) < 6 && Math.abs(o.z - z) < 6)) continue;
      // typ a farba podľa skutočného zastúpenia (data/doprava/vozidla.json), občas taxík alebo kuriér
      const noc = jeNoc(hra);
      const sluzba = nahodnaSluzba(noc);
      const typ = sluzba?.typ ?? nahodnyTyp('premavka', noc);
      const farba = sluzba?.farba ?? nahodnaFarba(typ);
      const a = {
        hrana: h, s, pruh, v: Math.min(h.max, 8) * Math.random(), trasa: [],
        povaha: (0.85 + Math.random() * 0.25) * (typ === 'sport' || typ === 'muscle' ? 1.12 : typ === 'dodavka' ? 0.94 : 1),
        typ, farba, sluzba, dlzka: this._typ(typ).dlzka,
        x, z, y: hra.mapa.vyska(x, z), uhol: Math.atan2(h.ux, h.uz), sklon: 0,
        semafor: null, kontrolaSemaforu: Math.random() * 0.3, cakaDo: 0, drziUzol: null,
        objazd: 0, objazdDo: 0, bocny: 0,
      };
      h.auta.push(a);
      this._dopln(a);
      this.auta.push(a);
      n++;
    }
    this.prvyRaz = false;
  },

  _zrus(a) {
    if (a.drziUzol?.rezervacia === a) a.drziUzol.rezervacia = null;
    a.zruseny = true;
  },

  // ---------- prekážky ----------
  _prekazky(hra) {
    const out = [];
    for (const v of hra.mhd?.vozidla ?? []) {
      // stojaci autobus na zastávke sa dá obísť, električka nie
      const obist = v.typ !== 'elektricka' && v.stoji;
      for (const c of v.clanky) out.push({ x: c.x, z: c.z, sx: c.sx, sz: c.sz, d: c.d, s: c.s, v: Math.hypot(c.vx, c.vz), druh: 'mhd', obist });
    }
    if (hra.stav.auto) {
      const a = hra.stav.auto;
      out.push({ x: a.pozicia.x, z: a.pozicia.z, sx: Math.sin(a.uhol), sz: Math.cos(a.uhol), d: 4.6, s: 1.9, v: Math.max(0, a.rychlostDopredu), hrac: true, druh: 'hracAuto' });
    } else if (hra.hrac) {
      out.push({ x: hra.hrac.pozicia.x, z: hra.hrac.pozicia.z, sx: 1, sz: 0, d: 0.9, s: 0.9, v: 0, hrac: true, druh: 'hrac' });
    }
    for (const a of hra.auta) {
      if (a === hra.stav.auto) continue;
      const stoji = Math.abs(a.rychlostDopredu) < 0.5;
      out.push({ x: a.pozicia.x, z: a.pozicia.z, sx: Math.sin(a.uhol), sz: Math.cos(a.uhol), d: 4.6, s: 1.9, v: Math.max(0, a.rychlostDopredu), druh: 'zaparkovane', obist: stoji });
    }
    return out;
  },

  update(dt, hra) {
    if (!this.siet) return;
    this.cas += dt;
    const p = hra.stav.pozicia;

    this.dalsiSpawn -= dt;
    if (this.dalsiSpawn <= 0 && this.siet.hrany.size) {
      this.dalsiSpawn = 0.25;
      this._spawn(hra);
    }

    // zoznamy áut na hranách (zoradené podľa polohy)
    // (vyprázdnia sa aj hrany, na ktorých autá boli minule – inak by tam ostali „duchovia“)
    for (const h of this.hranySAutami ?? []) h.auta.length = 0;
    const hrany = new Set();
    for (const a of this.auta) { if (!hrany.has(a.hrana)) { a.hrana.auta.length = 0; hrany.add(a.hrana); } }
    for (const a of this.auta) a.hrana.auta.push(a);
    this.hranySAutami = hrany;
    for (const h of hrany) if (h.auta.length > 1) h.auta.sort((x, y) => x.s - y.s);

    const prekazky = this._prekazky(hra);
    this._nastupovanie(hra);

    for (const a of this.auta) {
      if (a.zruseny) continue;
      if (a.hrana.zmazana || Math.hypot(a.x - p.x, a.z - p.z) > R_ZMAZ) { this._zrus(a); continue; }
      this._jazda(a, dt, hra, prekazky);
    }
    if (this.auta.some((a) => a.zruseny)) this.auta = this.auta.filter((a) => !a.zruseny);

    this._zrazkySHracom(hra);
    this._vykresli(hra);
    hra.doprava.npcAuta = this.auta;
  },

  _jazda(a, dt, hra, prekazky) {
    const h = a.hrana;
    // --- vodca v pruhu (na tejto hrane alebo ďalej na trase) ---
    a._dovod = '';
    let medzera = Infinity, vVodcu = 0;
    const i = h.auta.indexOf(a);
    for (let k = i + 1; k < h.auta.length; k++) {
      const o = h.auta[k];
      if (o.pruh !== a.pruh && h.pruhy > 1) continue;
      medzera = o.s - a.s - (o.dlzka + a.dlzka) / 2; vVodcu = o.v; a._dovod = 'vodca'; a._vodca = o; break;
    }
    let vzd = h.dlzka - a.s;
    let pruh = a.pruh;
    let krizovatka = null, dKrizovatky = Infinity, zakruta = 1, dZakruty = Infinity;
    if (jeKrizovatka(h.b)) { krizovatka = h.b; dKrizovatky = vzd; }
    let predch = h;
    for (const e of a.trasa) {
      if (vzd > DOHLAD) break;
      const cos = predch.ux * e.ux + predch.uz * e.uz;
      if (cos < zakruta) { zakruta = cos; dZakruty = vzd; }
      pruh = Math.min(pruh, e.pruhy - 1);
      if (medzera === Infinity) {
        for (const o of e.auta) {
          if (o.pruh !== pruh && e.pruhy > 1) continue;
          medzera = vzd + o.s - (o.dlzka + a.dlzka) / 2; vVodcu = o.v; a._dovod = 'vodca2'; a._vodca = o; break;
        }
      }
      if (!krizovatka && jeKrizovatka(e.b)) { krizovatka = e.b; dKrizovatky = vzd + e.dlzka; }
      vzd += e.dlzka;
      predch = e;
    }

    // --- semafor / prednosť na križovatke ---
    if (krizovatka && dKrizovatky < 45) {
      a.kontrolaSemaforu -= dt;
      if (a.kontrolaSemaforu <= 0) {
        a.kontrolaSemaforu = 0.3;
        a.semafor = hra.doprava.semafor ? hra.doprava.semafor(a.x, a.z, h.ux, h.uz) : null;
      }
      const dStop = dKrizovatky - krizovatka.polomer - 2 - a.dlzka / 2;
      if (a.semafor === 'cervena' || (a.semafor === 'oranzova' && dStop > (a.v * a.v) / (2 * 4) + 1)) {
        if (dStop > -1) { medzera = Math.min(medzera, dStop); if (medzera === dStop) { vVodcu = 0; a._dovod = 'semafor'; } }
      } else if (!a.semafor && dKrizovatky < 16) {
        const u = krizovatka;
        if (!u.rezervacia || u.rezervacia === a || u.rezervacia.zruseny || this.cas > u.rezDo) {
          u.rezervacia = a; u.rezDo = this.cas + 6;
          if (a.drziUzol && a.drziUzol !== u && a.drziUzol.rezervacia === a) a.drziUzol.rezervacia = null;
          a.drziUzol = u;
        } else if (dStop > -0.5) {
          medzera = Math.min(medzera, dStop); if (medzera === dStop) { vVodcu = 0; a._dovod = 'rezervacia'; }
        }
      }
    } else a.semafor = null;
    // uvoľnenie križovatky, keď ju auto prejde
    if (a.drziUzol && a.drziUzol !== krizovatka && Math.hypot(a.x - a.drziUzol.x, a.z - a.drziUzol.z) > a.drziUzol.polomer + 3) {
      if (a.drziUzol.rezervacia === a) a.drziUzol.rezervacia = null;
      a.drziUzol = null;
    }

    // --- električky, autobusy, hráč, zaparkované autá v pruhu ---
    if (this.cas > a.objazdDo) a.objazd = 0;
    for (const o of prekazky) {
      const dx = o.x - a.x, dz = o.z - a.z;
      if (Math.abs(dx) > 50 || Math.abs(dz) > 50) continue;
      const pred = dx * h.ux + dz * h.uz;
      if (pred <= 0 || pred > 50) continue;
      const vlavo = dx * h.uz - dz * h.ux;           // > 0 = prekážka je vľavo od osi pruhu
      const cos = Math.abs(o.sx * h.ux + o.sz * h.uz), sin = Math.sqrt(Math.max(0, 1 - cos * cos));
      const pozdlz = cos * o.d / 2 + sin * o.s / 2, naprieč = sin * o.d / 2 + cos * o.s / 2;
      const bok = Math.abs(vlavo - a.bocny);
      if (bok > naprieč + SIRKA_AUTA / 2 + 0.2) continue;
      // stojace auto / autobus na zastávke: obísť zľava (ako v skutočnosti), ak to nie je príliš ďaleko
      if (o.obist && pred < 30) {
        const treba = vlavo + naprieč + SIRKA_AUTA / 2 + 0.35;
        if (treba <= 4.6) {
          a.objazd = Math.max(a.objazd, treba);
          a.objazdDo = this.cas + 0.4;
          if (a.bocny > treba - 0.4 || pred - pozdlz > 10) continue; // už ide bokom alebo je ešte ďaleko
        }
      }
      const m = pred - pozdlz - a.dlzka / 2 - (o.hrac ? 1.5 : 0.5);
      if (m < medzera) { medzera = m; vVodcu = o.v * cos; a._dovod = 'prekazka'; a._vodca = o; }
    }

    // --- rýchlosť (IDM) ---
    let v0 = h.max * a.povaha;
    if (zakruta < 0.9 && dZakruty < 40) {
      const vZakruta = 4 + 9 * Math.max(0, zakruta + 0.2);
      if (dZakruty < (a.v * a.v - vZakruta * vZakruta) / (2 * 2.2) + 8) v0 = Math.min(v0, vZakruta);
    }
    if (this.cas < a.cakaDo) v0 = 0.01;
    const sHviezda = S0 + a.v * T_ODSTUP + (a.v * (a.v - vVodcu)) / (2 * Math.sqrt(A_MAX * B_KOMF));
    let acc = A_MAX * (1 - (a.v / Math.max(0.1, v0)) ** 4);
    if (medzera < Infinity) acc -= A_MAX * (sHviezda / Math.max(0.1, medzera)) ** 2;
    acc = Math.max(-9, acc);
    a.v = Math.max(0, a.v + acc * dt);
    if (this.cas < a.cakaDo) a.v = 0;

    // --- posun po hranách ---
    a.s += a.v * dt;
    while (a.s > a.hrana.dlzka) {
      a.s -= a.hrana.dlzka;
      const d = a.trasa.shift();
      if (!d || d.zmazana) { this._zrus(a); return; }
      a.hrana = d;
      a.pruh = Math.min(a.pruh, d.pruhy - 1);
      this._dopln(a);
    }

    // --- poloha a natočenie (plynulo, aby zákruty neboli skokom) ---
    a.bocny += (a.objazd - a.bocny) * Math.min(1, dt * 1.8); // obchádzanie (vľavo = kladné)
    const e = a.hrana, off = e.posuny[a.pruh] - a.bocny;
    const x = e.a.x + e.ux * a.s - e.uz * off, z = e.a.z + e.uz * a.s + e.ux * off;
    const k = Math.min(1, dt * 9);
    a.x += (x - a.x) * k; a.z += (z - a.z) * k;
    if (Math.hypot(x - a.x, z - a.z) > 6) { a.x = x; a.z = z; }
    let du = Math.atan2(e.ux, e.uz) - a.uhol;
    du = Math.atan2(Math.sin(du), Math.cos(du));
    a.uhol += du * Math.min(1, dt * 7);
  },

  // ---------- nastúpenie do NPC auta (E) ----------
  _nastupovanie(hra) {
    if (hra.stav.auto || hra.hrac?.akcia || !hra.vstup.caka('akcia')) return;
    const hp = hra.hrac.pozicia;
    let naj = null, min = KONFIG.HRAC.DOSAH_AUTA;
    for (const a of this.auta) {
      const d = Math.hypot(a.x - hp.x, a.z - hp.z);
      if (d < min) { min = d; naj = a; }
    }
    if (!naj) return;
    for (const a of hra.auta) {
      if (!a.vodic && Math.hypot(a.pozicia.x - hp.x, a.pozicia.z - hp.z) < min) return; // bližšie je zaparkované
    }
    // NPC auto sa zmení na skutočné auto, do ktorého hráčov modul hneď nastúpi
    this._zrus(naj);
    this.auta = this.auta.filter((a) => a !== naj);
    const auto = hra.pridajAuto({ x: naj.x, z: naj.z, uhol: naj.uhol, farba: naj.farba, typ: naj.typ, sluzba: naj.sluzba });
    hra.posli('npcAutoPrevzate', { auto });
  },

  // ---------- zrážky s hráčom ----------
  _zrazkySHracom(hra) {
    const p = hra.stav.pozicia;
    const R_AUTA = KONFIG.AUTO.POLOMER;
    const ja = hra.stav.auto;
    for (const a of this.auta) {
      if (Math.abs(a.x - p.x) > 8 || Math.abs(a.z - p.z) > 8) continue;
      const sx = Math.sin(a.uhol), sz = Math.cos(a.uhol);
      const kruhy = ja ? ja.kruhy().map((k) => [k.x, k.z, R_AUTA]) : [[hra.hrac.pozicia.x, hra.hrac.pozicia.z, KONFIG.HRAC.POLOMER]];
      for (const [kx, kz, r] of kruhy) {
        const dx = kx - a.x, dz = kz - a.z;
        const u = dx * sx + dz * sz, w = dx * sz - dz * sx;
        const pu = a.dlzka / 2 + r - Math.abs(u), pw = SIRKA_AUTA / 2 + r - Math.abs(w);
        if (pu <= 0 || pw <= 0) continue;
        let nx, nz, o;
        if (pu < pw) { const z0 = Math.sign(u) || 1; nx = sx * z0; nz = sz * z0; o = pu; }
        else { const z0 = Math.sign(w) || 1; nx = sz * z0; nz = -sx * z0; o = pw; }
        if (ja) {
          ja.pozicia.x += nx * o; ja.pozicia.z += nz * o;
          const vn = (ja.vx - sx * a.v) * nx + (ja.vz - sz * a.v) * nz;
          if (vn < 0) {
            ja.vx -= nx * vn * 1.4; ja.vz -= nz * vn * 1.4; ja.vx *= 0.75; ja.vz *= 0.75;
            if (-vn > 4) hra.posli('naraz', { auto: ja, sila: -vn, npc: true, nx, nz });
          }
          a.v = 0; a.cakaDo = this.cas + 3; // šofér NPC auta sa zľakol a chvíľu stojí
        } else {
          hra.hrac.pozicia.x += nx * o; hra.hrac.pozicia.z += nz * o;
        }
      }
    }
  },

  // ---------- vykreslenie ----------
  _vykresli(hra) {
    const p = hra.stav.pozicia;
    for (const t of Object.values(this.typy)) t.pocet = 0;
    for (const sl of Object.values(this.sluzby)) if (sl) sl.pocet = 0;
    for (const a of this.auta) {
      const t = this._typ(a.typ);
      const d = Math.hypot(a.x - p.x, a.z - p.z);
      const y = hra.mapa.vyska(a.x, a.z);
      a.y = Math.abs(y - a.y) > 2 ? y : a.y + (y - a.y) * 0.3;
      if (d < 140) {
        const sx = Math.sin(a.uhol), sz = Math.cos(a.uhol);
        const yP = hra.mapa.vyska(a.x + sx * 1.4, a.z + sz * 1.4), yZ = hra.mapa.vyska(a.x - sx * 1.4, a.z - sz * 1.4);
        a.sklon += (-Math.atan2(yP - yZ, 2.8) - a.sklon) * 0.3;
      } else a.sklon = 0;
      _e.set(a.sklon, a.uhol, 0);
      _q.setFromEuler(_e);
      _m.compose(_p.set(a.x, a.y, a.z), _q, _j);
      const i = t.pocet++;
      for (const c of t.casti) c.setMatrixAt(i, _m);
      t.casti[0].setColorAt(i, _c.set(a.farba));
      if (a.sluzba) {
        const sl = this._sluzba(a.sluzba);
        if (sl) sl.siet.setMatrixAt(sl.pocet++, _m);
      }
    }
    for (const t of Object.values(this.typy)) {
      for (const c of t.casti) { c.count = t.pocet; c.instanceMatrix.needsUpdate = true; }
      t.casti[0].instanceColor.needsUpdate = true;
    }
    for (const sl of Object.values(this.sluzby)) {
      if (!sl) continue;
      sl.siet.count = sl.pocet;
      sl.siet.instanceMatrix.needsUpdate = true;
    }
  },
};
