// Správca dlaždíc mesta: podľa polohy hráča načítava a uvoľňuje dlaždice.
//   do POLOMER_DETAIL – plná úroveň (zem, cesty, budovy s fasádami, stromy, značky, kolízie)
//   do POLOMER_LOD    – len jednoduché bloky budov
// Stavba dlaždíc sa rozkladá do viacerých snímok (časový rozpočet na snímok).
//
// Udalosti (hra.posli): 'dlazdica-nacitana' { kluc, uroven, data, objekt }, 'dlazdica-uvolnena' { kluc, uroven }

import { postavDlazdicu, uvolniObjekt } from './postav-dlazdicu.js';
import { nacitajDoplnky } from './doplnky.js';
import { nacitajOpravyBudov, aplikujOpravy } from '../budovy/opravy.js';
import { nacitajHustuZelen, doplnHustuZelen } from '../zelen/husta-zelen.js';
import { bezNahradenych } from '../pamiatky/nahradene-budovy.js';

export const POLOMER_DETAIL = 900;
export const POLOMER_LOD = 3200;
const ROZPOCET_MS = 7;

export class SpravaDlazdic {
  constructor({ index, scena, vyskopis, kolizie, KONFIG, posli }) {
    this.index = index;
    this.velkost = index.dlazdica;
    this.scena = scena;
    this.kontext = { vyskopis, kolizie, rieky: vyskopis.voda, KONFIG };
    this.vyskopis = vyskopis;
    this.kolizie = kolizie;
    this.posli = posli ?? (() => {});
    this.zoznam = index.dlazdice.map(([i, j, pocet, maxVyska]) => ({ i, j, kluc: `${i}_${j}`, pocet, maxVyska }));
    this.aktivne = new Map();   // kluc → { uroven, objekt, data }
    this.data = new Map();      // kluc → Promise(data)
    this.uloha = null;          // práve stavaná dlaždica { kluc, uroven, gen, data }
    this.poslednaKontrola = -1e9;
    this.stred = { x: 0, z: 0 };
  }

  rect(t) {
    const v = this.velkost;
    return { minX: t.i * v, minZ: t.j * v, maxX: (t.i + 1) * v, maxZ: (t.j + 1) * v };
  }

  vzdialenost(t, x, z) {
    const r = this.rect(t);
    const dx = Math.max(r.minX - x, 0, x - r.maxX), dz = Math.max(r.minZ - z, 0, z - r.maxZ);
    return Math.hypot(dx, dz);
  }

  nacitajData(kluc) {
    if (!this.data.has(kluc)) {
      const [i, j] = kluc.split('_').map(Number);
      const obsah = fetch(`data/mapa/mesto/d/${kluc}.json`).then((r) => (r.ok ? r.json() : {})).catch(() => ({}));
      this.data.set(kluc, Promise.all([obsah, nacitajDoplnky(kluc, this.index), nacitajOpravyBudov(), nacitajHustuZelen()]).then(([d, { teren, strechy }, opravy, zelen]) => {
        // ručné opravy podľa porovnania so skutočnosťou (budovy, hustá zeleň v parkoch)
        aplikujOpravy(d.budovy, opravy);
        doplnHustuZelen(d, this.rect({ i, j }), zelen);
        // detailný terén sa zaregistruje skôr, než sa dlaždica začne stavať (budovy, cesty aj zem ho už použijú)
        if (teren && this.data.has(kluc)) { this.vyskopis.pridajDetail?.(i, j, teren.v, teren.n, teren.krok); d._detailTerenu = true; }
        if (strechy) d._strechy = strechy;
        // budovy, ktoré nahrádza podrobný model pamiatky (js/mapa/pamiatky/nahradene-budovy.js)
        if (d.budovy) d.budovy = bezNahradenych(d.budovy);
        return d;
      }));
    }
    return this.data.get(kluc);
  }

  /** Čo má byť načítané okolo bodu (x, z): zoznam { t, uroven, d } zoradený od najbližšej. */
  ziadane(x, z) {
    const out = [];
    for (const t of this.zoznam) {
      const d = this.vzdialenost(t, x, z);
      if (d < POLOMER_DETAIL) out.push({ t, uroven: 'detail', d });
      else if (d < POLOMER_LOD && t.pocet > 0) out.push({ t, uroven: 'lod', d });
    }
    return out.sort((a, b) => a.d - b.d);
  }

  /** Na štarte: postaví všetko v okolí naraz (čaká sa na to pri načítavaní hry). */
  async nacitajOkolie(x, z, priebeh = () => {}) {
    this.stred = { x, z };
    const ziadane = this.ziadane(x, z);
    let n = 0;
    for (const { t, uroven } of ziadane) {
      if (uroven === 'lod' && this.vzdialenost(t, x, z) > POLOMER_DETAIL * 1.6) continue; // zvyšok dobehne za behu
      const data = await this.nacitajData(t.kluc);
      const gen = postavDlazdicu(t.kluc, data, this.rect(t), uroven, this.kontext);
      let r = gen.next();
      while (!r.done) r = gen.next();
      this._pridaj(t.kluc, uroven, r.value, data);
      if (++n % 4 === 0) priebeh(`Staviam mesto… ${n} dlaždíc`);
    }
  }

  /** Volá sa každý snímok (modul js/mapa/dlazdice/modul.js). */
  update(x, z, cas) {
    this.stred = { x, z };
    // 1) pokračuj v rozostavanej dlaždici v rámci časového rozpočtu
    const zaciatok = performance.now();
    if (this.uloha?.caka) return;
    while (this.uloha && performance.now() - zaciatok < ROZPOCET_MS) {
      const r = this.uloha.gen.next();
      if (r.done) {
        const { kluc, uroven, data } = this.uloha;
        this.uloha = null;
        this._pridaj(kluc, uroven, r.value, data);
      }
    }
    if (this.uloha) return;

    // 2) raz za čas: čo treba pridať / odobrať
    if (cas - this.poslednaKontrola < 0.25) return;
    this.poslednaKontrola = cas;
    const ziadane = this.ziadane(x, z);
    const chcene = new Map(ziadane.map((w) => [w.t.kluc, w.uroven]));
    for (const [kluc, a] of this.aktivne) {
      const u = chcene.get(kluc);
      // odstránime až keď je ďaleko (malá rezerva, aby dlaždice neblikali na hranici)
      if (!u) {
        const t = this.zoznam.find((q) => q.kluc === kluc);
        const lim = a.uroven === 'detail' ? POLOMER_DETAIL + 150 : POLOMER_LOD + 150;
        if (!t || this.vzdialenost(t, x, z) > lim) this._odober(kluc);
      }
    }
    // prvá dlaždica, ktorej chýba požadovaná úroveň
    for (const { t, uroven } of ziadane) {
      const a = this.aktivne.get(t.kluc);
      if (a?.uroven === uroven || (a?.uroven === 'detail' && uroven === 'lod' && this.vzdialenost(t, x, z) < POLOMER_DETAIL + 150)) continue;
      this._zacni(t, uroven);
      break;
    }
  }

  async _zacni(t, uroven) {
    this.uloha = { kluc: t.kluc, uroven, gen: null, data: null, caka: true };
    const uloha = this.uloha;
    const data = await this.nacitajData(t.kluc);
    if (this.uloha !== uloha) return;
    uloha.data = data;
    uloha.gen = postavDlazdicu(t.kluc, data, this.rect(t), uroven, this.kontext);
    uloha.caka = false;
  }

  _pridaj(kluc, uroven, objekt, data) {
    const stara = this.aktivne.get(kluc);
    if (stara) this._odober(kluc, true);
    this.scena.add(objekt);
    this.aktivne.set(kluc, { uroven, objekt, data });
    this.posli('dlazdica-nacitana', { kluc, uroven, data, objekt });
  }

  _odober(kluc, nahrada = false) {
    const a = this.aktivne.get(kluc);
    if (!a) return;
    this.scena.remove(a.objekt);
    uvolniObjekt(a.objekt);
    if (a.uroven === 'detail') this.kolizie.odstranDlazdicu(kluc);
    this.aktivne.delete(kluc);
    this.posli('dlazdica-uvolnena', { kluc, uroven: a.uroven, nahrada });
    if (!nahrada && a.uroven === 'lod') {
      this.data.delete(kluc);
      const [i, j] = kluc.split('_').map(Number);
      this.vyskopis.odoberDetail?.(i, j);
    }
  }

  /** Cesty zo všetkých podrobne načítaných dlaždíc (napr. na rozmiestnenie áut). */
  cestyOkolia() {
    const out = [];
    for (const a of this.aktivne.values()) if (a.uroven === 'detail') out.push(...(a.data.cesty ?? []));
    return out;
  }
}
