// Modul: vlaky na Hlavnej stanici (úlohy A2 a A3).
//
// Vlaky jazdia podľa cestovného poriadku ŽSR (data/vlaky/poriadok.json, tools/vlaky/gtfs_vlaky.py) a herného času
// (hra.stav.datumCas): prídu po koľajach z OSM (data/vlaky/trate.json, tools/vlaky/trate_osm.py) od tunela
// alebo od Vinohrad, zastavia stredom pri nástupišti, postoja a odídu; mimo úseku (~2,6 km) alebo v tuneli zmiznú.
// Naraz sa hýbe najviac MAX_V_POHYBE vlakov. Súpravy: 671 (dvojpodlažná jednotka, Považan), 361 + vozne (Košice
// a diaľkové), regionálna jednotka (ostatné) – modely z tools/blender/vlaky_blender.py, kreslené ako inštancie.
//
// Zverejní:
//   hra.stav.stanicaOdchody, hra.stav.stanicaPrichody – riadky tabúľ (js/mapa/stanica/tabule.js), raz za hernú minútu
//   hra.vlaky = { pobyty, plan() }                     – plán dňa (na ladenie a pre iné moduly)
// Pri štarte na 1. nástupišti stojí na koľaji 1 súprava z Košíc, z ktorej Ďoďo „vystúpil“ (scénka A4) –
// o pár minút odíde do depa.

import * as THREE from 'three';
import { planDna, odchodyNaTabulu, prichodyNaTabulu } from './poriadok.js';
import { Trasa } from './trasa.js';
import { nacitajVozne, vozneSupravy, DOSAH_DETAILU } from './modely.js';
import { Hlasenia } from './hlasenia.js';

const V_PRICHOD = 16.7;     // m/s – rýchlosť pred brzdením (60 km/h)
const BRZDA = 0.5;          // m/s²
const V_ODCHOD = 22;        // m/s
const ROZJAZD = 0.4;        // m/s²
const TEMENO = 0.24;        // m – temeno koľajnice nad terénom (js/mapa/cesty/kolajnice.js)
const MAX_V_POHYBE = 5;
const DOSAH_HRACA = 3500;   // m od stanice – ďalej sa vlaky nekreslia ani nepočítajú
const DOSAH_KRESLENIA = 1800;
const POL_SIRKY = 1.7;      // m – polovica šírky vozňa + polomer hráča (kolízia)
const MAX_SKLON = 0.045;    // rad

/** Čas (s) na prejdenie vzdialenosti d z pokoja (alebo do zastavenia) so zrýchlením a a najvyššou rýchlosťou v. */
function casNa(d, a, v) {
  const db = v * v / (2 * a);
  return d <= db ? Math.sqrt(2 * d / a) : v / a + (d - db) / v;
}
/** Vzdialenosť za čas τ (s) od rozbehu (alebo pred zastavením). */
function drahaZa(t, a, v) {
  const tb = v / a;
  return t <= tb ? 0.5 * a * t * t : v * v / (2 * a) + v * (t - tb);
}

export default {
  nazov: 'vlaky',
  poradie: 62,

  async init(hra) {
    this.hra = hra;
    this.pobyty = [];
    this.den = null;
    this.minuta = -1;
    const [data, trate, modely] = await Promise.all([
      fetch('data/vlaky/poriadok.json').then((r) => r.json()).catch(() => null),
      fetch('data/vlaky/trate.json').then((r) => r.json()).catch(() => null),
      nacitajVozne(),
    ]);
    if (!data || !trate) { console.warn('Vlaky: chýba poriadok alebo trate'); return; }
    this.data = data;
    this.trate = trate;
    this.modely = modely;
    // trasy na koľaj: E = smerom na východ (zo západu), W = na západ (z východu); bod zastavenia = koniec 1. časti
    this.trasy = {};
    let sx = 0, sz = 0, n = 0;
    for (const [k, t] of Object.entries(trate.kolaje)) {
      this.trasy[k] = {
        E: t.z_zapadu && t.na_vychod ? new Trasa(t.z_zapadu, t.na_vychod) : null,
        W: t.z_vychodu && t.na_zapad ? new Trasa(t.z_vychodu, t.na_zapad) : null,
      };
      sx += t.bod[0]; sz += t.bod[1]; n++;
    }
    this.stred = new THREE.Vector3(sx / n, 0, sz / n);
    this.stred.y = hra.mapa.vyska(this.stred.x, this.stred.z);
    if (modely) {
      this.skupina = new THREE.Group();
      this.skupina.name = 'vlaky';
      for (const urovne of Object.values(modely)) for (const im of urovne) this.skupina.add(im);
      hra.scena.add(this.skupina);
    }
    this.hlasenia = new Hlasenia(hra);
    const M = this;
    hra.vlaky = { get pobyty() { return M.pobyty; }, plan: () => M.pobyty };
    hra.na('casPreskoceny', () => { this.den = null; this.minuta = -1; });
    hra.na('start', () => this.scenaPrichodu());
    this._m = new THREE.Matrix4(); this._q = new THREE.Quaternion(); this._e = new THREE.Euler(0, 0, 0, 'YXZ');
    this._p = new THREE.Vector3(); this._s = new THREE.Vector3(1, 1, 1);
    this._a = {}; this._b = {};
  },

  /** Súprava z Košíc stojí pri štarte na koľaji 1 (Ďoďo z nej vystúpil) a po chvíli odíde do depa. */
  scenaPrichodu() {
    const hra = this.hra, h = hra.hrac?.pozicia, s = hra.mapa?.data?.spawn?.hrac;
    if (!this.data || !h || !s || Math.hypot(h.x - s.x, h.z - s.z) > 30) return;
    const t = this.minutaDna();
    this.scena = { den: (hra.stav.datumCas ?? new Date()).toDateString(), od: t - 0.5, do: t + 5 };
    this.den = null;
  },

  minutaDna() {
    const d = this.hra.stav.datumCas ?? new Date();
    return d.getHours() * 60 + d.getMinutes() + d.getSeconds() / 60 + d.getMilliseconds() / 60000;
  },

  pripravDen() {
    const d = this.hra.stav.datumCas ?? new Date();
    const kluc = d.toDateString();
    if (this.den === kluc) return;
    this.den = kluc;
    const scena = this.scena?.den === kluc ? this.scena : null;     // len v deň štartu
    this.pobyty = planDna(this.data, this.trate, d, scena ? [{ kolaj: '1', od: scena.od - 6, do: scena.do + 4 }] : []);
    if (scena) {
      const suprava = { typ: '361', vozne: 7, dlzka: 17.2 + 7 * 26.4 };
      this.pobyty.push({ kolaj: '1', nastupiste: this.trate.kolaje['1']?.nastupiste ?? '1', prichod: null, odchod: null,
        tPri: scena.od, tOdch: scena.do, zo: 'vychod', na: 'vychod', suprava, scena: true });
    }
    for (const p of this.pobyty) {
      p.vozne = vozneSupravy(p.suprava);
      // dĺžka podľa vozňov
      p.dlzka = p.vozne.reduce((a, v) => a + v.dlzka, 0);
    }
  },

  update(dt) {
    if (!this.data) return;
    const hra = this.hra;
    this.pripravDen();
    const t = this.minutaDna();
    // tabule raz za hernú minútu
    const m = Math.floor(t);
    if (m !== this.minuta) {
      this.minuta = m;
      hra.stav.stanicaOdchody = odchodyNaTabulu(this.pobyty, t);
      hra.stav.stanicaPrichody = prichodyNaTabulu(this.pobyty, t);
    }
    const hrac = hra.stav.pozicia ?? hra.hrac?.pozicia;      // pešo aj v aute
    const dStanica = hrac ? Math.hypot(hrac.x - this.stred.x, hrac.z - this.stred.z) : 0;
    this.hlasenia.krok(this.pobyty, t, dStanica, this.stred);
    if (!this.modely) return;
    for (const urovne of Object.values(this.modely)) for (const im of urovne) im.count = 0;
    if (dStanica > DOSAH_HRACA) { this.zapisInstancie(); return; }

    // stav každej súpravy: kde je hlava na trase (s), smer jazdy, či sa hýbe
    const vPohybe = [];
    let najblizsi = Infinity;
    for (const p of this.pobyty) {
      const st = this.stavPobytu(p, t);
      if (!st) continue;
      if (st.pohyb) { vPohybe.push(st); continue; }
      this.vykresli(st, hrac);
    }
    vPohybe.sort((a, b) => a.zaciatok - b.zaciatok);
    for (const st of vPohybe.slice(0, MAX_V_POHYBE)) {
      const d = this.vykresli(st, hrac);
      if (d < najblizsi) najblizsi = d;
    }
    // pri idúcom vlaku blízko hráča beží čas normálne (hodiny sa nezrýchľujú)
    if (najblizsi < Infinity) hra.hodiny?.blizko?.('vlaky', najblizsi);
    this.zapisInstancie();
  },

  /** { trasa, s (hlava), vozne, pohyb, zaciatok } alebo null, ak súprava nie je v úseku. */
  stavPobytu(p, t) {
    const tr = this.trasy[p.kolaj];
    if (!tr) return null;
    const trPri = p.zo === 'zapad' ? tr.E : tr.W;          // príchod zo západu = jazda na východ
    const trOdch = p.na === 'vychod' ? tr.E : tr.W;
    if (!trPri || !trOdch) return null;
    const polD = p.dlzka / 2;
    if (t < p.tPri) {
      const sStop = trPri.hranice[0] + polD;
      const tau = (p.tPri - t) * 60;
      if (tau > casNa(sStop, BRZDA, V_PRICHOD)) return null;
      return { trasa: trPri, s: sStop - drahaZa(tau, BRZDA, V_PRICHOD), vozne: p.vozne, pohyb: true, zaciatok: p.tPri, p };
    }
    // otočenie súpravy (príde a odíde na tú istú stranu): čelo je na druhom konci
    const otocena = trPri !== trOdch;
    const vozne = otocena ? (p._otocene ??= [...p.vozne].reverse().map((v) => ({ ...v, otoc: !v.otoc }))) : p.vozne;
    const sStop = trOdch.hranice[0] + polD;
    if (t <= p.tOdch) return { trasa: trOdch, s: sStop, vozne, pohyb: false, zaciatok: p.tOdch, p };
    const s = sStop + drahaZa((t - p.tOdch) * 60, ROZJAZD, V_ODCHOD);
    if (s - p.dlzka > trOdch.dlzka) return null;
    return { trasa: trOdch, s, vozne, pohyb: true, zaciatok: p.tOdch, p };
  },

  vyska(x, z) {
    const y = this.hra.mapa.vyska(x, z);
    const m = this.hra.mosty?.vyska?.(x, z, y + 6);
    return m != null && m > y && m - y < 12 ? m : y;
  },

  /** Rozmiestni vozne súpravy; vráti vzdialenosť najbližšieho vozňa od hráča. */
  vykresli(st, hrac) {
    const kam = this.hra.kamera.position;
    let dHrac = Infinity, odhlavy = 0;
    const A = this._a, B = this._b;
    for (const v of st.vozne) {
      const stred = st.s - odhlavy - v.dlzka / 2;
      odhlavy += v.dlzka;
      st.trasa.bod(stred + v.podvozok, A);
      st.trasa.bod(stred - v.podvozok, B);
      if (A.mimo || B.mimo || A.tunel || B.tunel) continue;
      const cx = (A.x + B.x) / 2, cz = (A.z + B.z) / 2;
      const dk = Math.hypot(cx - kam.x, cz - kam.z);
      if (dk > DOSAH_KRESLENIA) continue;
      const ya = this.vyska(A.x, A.z), yb = this.vyska(B.x, B.z);
      // vozeň smeruje čelom (+z modelu) k bodu A, otočený vozeň k bodu B
      const [fx, fz, fy, rx, rz, ry] = v.otoc ? [B.x, B.z, yb, A.x, A.z, ya] : [A.x, A.z, ya, B.x, B.z, yb];
      const dl = Math.hypot(fx - rx, fz - rz) || 1;
      // sklon najviac ~2,5° – pri portáli tunela terén (DEM) stúpa do svahu, trať nie
      this._e.set(-Math.max(-MAX_SKLON, Math.min(MAX_SKLON, Math.atan2(fy - ry, dl))), Math.atan2(fx - rx, fz - rz), 0);
      this._q.setFromEuler(this._e);
      this._p.set(cx, (ya + yb) / 2 + TEMENO, cz);
      this._m.compose(this._p, this._q, this._s);
      const urovne = this.modely[v.model];
      const im = urovne[dk < DOSAH_DETAILU || urovne.length < 2 ? 0 : 1];
      if (im.count < im.instanceMatrix.count) im.setMatrixAt(im.count++, this._m);
      if (hrac) {
        const dh = Math.hypot(cx - hrac.x, cz - hrac.z);
        dHrac = Math.min(dHrac, dh);
        if (dh < v.dlzka) this.odtlac(cx, cz, (fx - rx) / dl, (fz - rz) / dl, v.dlzka, (ya + yb) / 2);
      }
    }
    return dHrac;
  },

  /** Hráč pešo nemôže prejsť cez vozeň: ak je v jeho pôdoryse, odsunie sa k bližšiemu boku. */
  odtlac(cx, cz, ux, uz, dlzka, y) {
    const hra = this.hra, p = hra.hrac?.pozicia;
    if (!p || hra.stav.rezim !== 'pesi' || p.y > y + TEMENO + 4.4 || p.y < y - 1) return;
    const px = p.x - cx, pz = p.z - cz;
    const a = px * ux + pz * uz, b = -px * uz + pz * ux;     // pozdĺž vozňa a nabok
    if (Math.abs(a) > dlzka / 2 || Math.abs(b) > POL_SIRKY) return;
    const o = (b >= 0 ? POL_SIRKY : -POL_SIRKY) - b;
    p.x += -uz * o; p.z += ux * o;
  },

  zapisInstancie() {
    for (const urovne of Object.values(this.modely)) for (const im of urovne) {
      im.instanceMatrix.needsUpdate = true;
      im.visible = im.count > 0;
    }
  },
};
