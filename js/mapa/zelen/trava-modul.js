// Modul: tráva zblízka – trsy stebiel na trávnikoch, v parkoch a na zatrávnených svahoch okolo kamery.
// Kde je tráva, sa zistí z mapy tried povrchu dlaždice (trieda 64) a z mapy pokrývky (zelené plochy parkov
// a lúk) – obe plátna kreslí js/mapa/teren/textura-zeme.js, mesh zeme ich nesie v materiáli.
// Trsy sú v pevnej mriežke sveta (pri pohybe neskáču), prepočítajú sa po 4 m pohybu kamery.
// Dosah podľa kvality grafiky: nízka bez trávy, stredná 18 m, vysoká 30 m. Vonkajší redší prstenec má jednoduchšie
// trsy (vlastný InstancedMesh trsyDaleko, #110).

import * as THREE from 'three';
import { jeBezTravy } from '../pamiatky/nahradene-budovy.js';
import { geometriaTrsu, materialTravy } from './trava.js';
import { nacitajKvalitu } from '../../ui/nastavenia-grafiky.js';
import { bodVPolygone, ohranicenie } from '../geometria.js';

const KROK = 0.32;          // m – mriežka trsov zblízka (ďalej dvojnásobná)
const MAX = 16000;
const DOSAH = { nizka: 0, stredna: 18, vysoka: 30 };

const hash = (x, z, k) => { const s = Math.sin(x * 12.9898 + z * 78.233 + k * 37.719) * 43758.5453; return s - Math.floor(s); };

export default {
  nazov: 'trava',
  poradie: 40,

  init(hra) {
    this.dlazdice = new Map();   // kluc → { rect, zem, maska (lenivo) }
    this.posledna = null;
    this.cas = 0;
    const pridaj = (kluc, objekt) => {
      let zem = null;
      objekt?.traverse((o) => { if (!zem && o.name === 'zem' && o.userData.rect) zem = o; });
      if (zem) this.dlazdice.set(kluc, { rect: zem.userData.rect, zem, maska: null });
      else this.dlazdice.delete(kluc);
      this.posledna = null;
    };
    for (const [kluc, a] of hra.mapa?.dlazdice?.aktivne ?? []) if (a.uroven === 'detail') pridaj(kluc, a.objekt);
    hra.na('dlazdica-nacitana', ({ kluc, uroven, objekt }) => {
      this._budovy?.clear();   // pribudli kolízie budov dlaždice – pamäť „v budove“ neplatí
      if (uroven === 'detail') pridaj(kluc, objekt); else this.dlazdice.delete(kluc);
    });
    hra.na('dlazdica-uvolnena', ({ kluc, nahrada }) => { if (!nahrada) { this.dlazdice.delete(kluc); this.posledna = null; } });
    // plochy bez trávy (podlaha haly, nástupištia – js/mapa/stanica/): udalosť 'bez-travy' { kluc, polygony } (prázdne = zrušiť)
    this.bezTravy = new Map();
    const nastav = (kluc, polygony) => {
      if (polygony?.length) this.bezTravy.set(kluc, polygony.map((b) => ({ b, ...ohranicenie(b) }))); else this.bezTravy.delete(kluc);
      this.posledna = null;
    };
    hra.na('bez-travy', ({ kluc, polygony }) => nastav(kluc, polygony));
    // moduly, ktoré poslali plochy ešte pred týmto modulom, ich nechali aj v hra.stav.bezTravy
    for (const [kluc, polygony] of Object.entries(hra.stav.bezTravy ?? {})) nastav(kluc, polygony);

    // zblízka podrobné trsy, v redšom vonkajšom prstenci jednoduchšie (18 trojuholníkov namiesto 55, #110)
    const mat = materialTravy();
    this.trsy = new THREE.InstancedMesh(geometriaTrsu(), mat, MAX);
    this.trsyDaleko = new THREE.InstancedMesh(geometriaTrsu(6, 2, 1.6), mat, MAX);
    for (const im of [this.trsy, this.trsyDaleko]) {
      im.count = 0;
      im.frustumCulled = false;
      im.receiveShadow = true;
      im.castShadow = false;
      im.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      im.name = 'trava';
      hra.scena.add(im);
    }
    this._m = new THREE.Matrix4(); this._q = new THREE.Quaternion(); this._v = new THREE.Vector3(); this._s = new THREE.Vector3();
    this._os = new THREE.Vector3(0, 1, 0);
  },

  /** Maska trávy dlaždice (1 bajt na pixel mapy tried): 1 = tráva. Počíta sa až keď treba. */
  maska(d) {
    if (d.maska) return d.maska;
    const mat = d.zem.material, triedy = mat.userData?.triedy?.image, pokr = mat.map?.image;
    if (!triedy?.getContext) return (d.maska = { px: 0 });
    const px = triedy.width;
    const t = triedy.getContext('2d').getImageData(0, 0, px, px).data;
    let p = null;
    if (pokr?.getContext && pokr.width === px) p = pokr.getContext('2d').getImageData(0, 0, px, px).data;
    const m = new Uint8Array(px * px);
    for (let i = 0, o = 0; i < m.length; i++, o += 4) {
      const r = t[o];
      // trieda 64 = trávnik; trieda 0 (príroda) so zelenou farbou pokrývky = park, lúka, svah
      if (Math.abs(r - 64) < 12) m[i] = 1;
      else if (r < 8 && p && p[o + 1] - p[o] > 14 && p[o + 1] > 70) m[i] = 1;
    }
    d.maska = { px, m };
    return d.maska;
  },

  jeTrava(x, z) {
    for (const polygony of this.bezTravy.values()) {
      for (const p of polygony) if (x >= p.minX && x <= p.maxX && z >= p.minZ && z <= p.maxZ && bodVPolygone(x, z, p.b)) return false;
    }
    for (const d of this.dlazdice.values()) {
      const r = d.rect;
      if (x < r.minX || x >= r.maxX || z < r.minZ || z >= r.maxZ) continue;
      const mk = this.maska(d);
      if (!mk.px) return false;
      const i = Math.floor((x - r.minX) / (r.maxX - r.minX) * mk.px), j = Math.floor((z - r.minZ) / (r.maxZ - r.minZ) * mk.px);
      return mk.m[j * mk.px + i] === 1;
    }
    return false;
  },

  update(dt, hra) {
    this.cas -= dt;
    if (this.cas > 0) return;
    this.cas = 0.25;
    const dosah = hra.stav.grafika?.trava ?? DOSAH[nacitajKvalitu('vysoka')] ?? 30;
    const k = hra.kamera.position;
    // vysoko nad zemou (vyhliadka, lietanie kamerou) tráva nie je vidieť
    const nadZemou = k.y - hra.mapa.vyska(k.x, k.z);
    if (!dosah || nadZemou > 40) { this.trsy.count = 0; this.trsyDaleko.count = 0; this.posledna = null; return; }
    if (this.posledna && Math.hypot(k.x - this.posledna.x, k.z - this.posledna.z) < 4 && this.posledna.dosah === dosah) return;
    this.posledna = { x: k.x, z: k.z, dosah };
    this.prepocitaj(hra, k.x, k.z, dosah);
  },

  /** Je bod v pôdoryse budovy alebo pamiatky? (kolízne polygóny; výsledok sa pamätá po štvorcoch 1 m) */
  vBudove(hra, x, z, cache) {
    const k = Math.floor(x) * 100003 + Math.floor(z);
    let v = cache.get(k);
    if (v === undefined) {
      v = false;
      const kol = hra.mapa.kolizie;
      if (kol) {
        for (const p of kol.vOkoli(x, z, 0.5)) {
          const t = p.info?.typ;
          if (p.typ !== 'polygon' || (t !== 'budova' && t !== 'pamiatka') || p.body.length < 4) continue;
          if (x < p.minX || x > p.maxX || z < p.minZ || z > p.maxZ) continue;
          if (bodVPolygone(Math.floor(x) + 0.5, Math.floor(z) + 0.5, p.body)) { v = true; break; }
        }
      }
      cache.set(k, v);
    }
    return v;
  },

  prepocitaj(hra, cx, cz, dosah) {
    const blizko = Math.min(12, dosah * 0.45);
    const vyska = hra.mapa.vyskaTerenu ?? hra.mapa.vyska, hladina = hra.mapa.hladina;
    // tráva nerastie v pôdorysoch budov (nepresvitá cez podlahy a nekreslí sa zbytočne pod domami)
    const budovy = this._budovy ??= new Map();
    if (budovy.size > 200000) budovy.clear();
    const pocty = [0, 0];
    // zblízka hustá mriežka, ďalej dvojnásobný krok, väčšie a redšie trsy (zvyšok dokreslí textúra trávnika)
    for (const [krok, od, po, mierka, u] of [[KROK, 0, blizko, 1, 0], [KROK * 2, blizko, dosah, 1.3, 1]]) {
      const im = u ? this.trsyDaleko : this.trsy;
      let n = 0;
      const i0 = Math.floor((cx - po) / krok), i1 = Math.ceil((cx + po) / krok);
      const j0 = Math.floor((cz - po) / krok), j1 = Math.ceil((cz + po) / krok);
      for (let i = i0; i <= i1 && n < MAX; i++) {
        for (let j = j0; j <= j1 && n < MAX; j++) {
          const gx = i * krok, gz = j * krok;
          const x = gx + (hash(gx, gz, 1) - 0.5) * krok * 0.9, z = gz + (hash(gx, gz, 2) - 0.5) * krok * 0.9;
          const d = Math.hypot(x - cx, z - cz);
          if (d > po || d <= od) continue;
          if (od > 0 && hash(gx, gz, 3) > 1 - (d - od) / (po - od) * 0.6) continue;
          if (!this.jeTrava(x, z)) continue;
          if (this.vBudove(hra, x, z, budovy) || jeBezTravy(x, z)) continue;
          // nie na strmom zreze ani múre (tam je kameň)
          const y = vyska(x, z);
          // nie pod hladinou (dno Dunaja a jazier môže mať v mape pokrývky zelenú farbu)
          // (pri brehu rozhodne obrys vody – sieť zeme medzi vrcholmi môže byť nižšie ako presný terén)
          if (hladina) {
            const h = hladina(x, z);
            if (y < h + 0.15 || (y < h + 1.5 && hra.mapa.jeVoVode?.(x, z))) continue;
          }
          if (Math.abs(vyska(x + 0.5, z) - y) > 0.45 || Math.abs(vyska(x, z + 0.5) - y) > 0.45) continue;
          const okraj = 1 - Math.max(0, (d - dosah * 0.7) / (dosah * 0.3));
          const s = (0.75 + hash(gx, gz, 4) * 0.55) * (0.25 + 0.75 * okraj) * mierka;
          this._q.setFromAxisAngle(this._os, hash(gx, gz, 5) * Math.PI * 2);
          this._v.set(x, y - 0.02, z);
          this._s.set(s, s * (0.8 + hash(gx, gz, 6) * 0.5), s);
          this._m.compose(this._v, this._q, this._s);
          im.setMatrixAt(n++, this._m);
        }
      }
      pocty[u] = n;
    }
    this.trsy.count = pocty[0];
    this.trsyDaleko.count = pocty[1];
    this.trsy.instanceMatrix.needsUpdate = true;
    this.trsyDaleko.instanceMatrix.needsUpdate = true;
  },
};
