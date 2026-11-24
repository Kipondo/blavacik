// Správca dlaždíc mesta: podľa polohy hráča načítava a uvoľňuje dlaždice.
//   do POLOMER_DETAIL – plná úroveň (zem, cesty, budovy s fasádami, stromy, značky, kolízie)
//   do POLOMER_LOD    – len jednoduché bloky budov
// Stavba dlaždíc sa rozkladá do viacerých snímok (časový rozpočet na snímok).
//
// Udalosti (hra.posli): 'dlazdica-nacitana' { kluc, uroven, data, objekt }, 'dlazdica-uvolnena' { kluc, uroven }

import { postavDlazdicu, uvolniObjekt } from './postav-dlazdicu.js';
import { nacitajDoplnky } from './doplnky.js';
import { nacitajOpravyBudov, aplikujOpravy } from '../budovy/opravy.js';
import { nacitajMola, oznacMola } from '../mosty/mola.js';
import { nacitajHustuZelen, doplnHustuZelen } from '../zelen/husta-zelen.js';
import { bezNahradenych, bezStromovVNahradenych } from '../pamiatky/nahradene-budovy.js';
import { upravOsiCiest } from '../cesty/upravy-osi.js';
import { upravSirkyPasov } from '../cesty/sirky-pasov.js';
import { nastavLodDlazdice } from './lod-zeme.js';

// predvolené okruhy (bez predvoľby kvality); skutočné nastaví nastavPolomery() podľa js/grafika/predvolby.js
export const POLOMER_DETAIL = 900;
export const POLOMER_LOD = 3200;
const ROZPOCET_MS = 7;
// po dlhom presune (teleport, MHD), kým pod hráčom nie je podrobná dlaždica, sa stavia rýchlejšie – zem pod nohami
// je dôležitejšia než pár snímok plynulosti
const ROZPOCET_PO_PRESUNE_MS = 25;

export class SpravaDlazdic {
  constructor({ index, scena, vyskopis, kolizie, KONFIG, posli }) {
    this.index = index;
    this.velkost = index.dlazdica;
    this.scena = scena;
    // voda = všetky vodné plochy mesta (aj jazerá) – stromy v nich sa nestavajú (js/mapa/zelen/stromy-dlazdice.js)
    this.kontext = { vyskopis, kolizie, rieky: vyskopis.voda, voda: index.voda ?? [], KONFIG };
    this.vyskopis = vyskopis;
    this.kolizie = kolizie;
    this.posli = posli ?? (() => {});
    this.zoznam = index.dlazdice.map(([i, j, pocet, maxVyska]) => ({ i, j, kluc: `${i}_${j}`, pocet, maxVyska }));
    this.kluce = new Set(this.zoznam.map((t) => t.kluc));
    this.aktivne = new Map();   // kluc → { uroven, objekt, data }
    this.data = new Map();      // kluc → Promise(data)
    this.uloha = null;          // práve stavaná dlaždica { kluc, uroven, gen, data }
    this.priprav = null;        // (objekt) → Promise: príprava shaderov a textúr pred ukázaním (nastaví modul dlaždíc)
    this.poslednaKontrola = -1e9;
    this.stred = { x: 0, z: 0 };
    this.polomerDetail = POLOMER_DETAIL;  // m – plne podrobné dlaždice
    this.polomerLod = POLOMER_LOD;        // m – jednoduché bloky budov (ďalej sa nestavia nič)
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
      this.data.set(kluc, Promise.all([obsah, nacitajDoplnky(kluc, this.index), nacitajOpravyBudov(), nacitajHustuZelen(), nacitajMola()]).then(([d, { teren, strechy }, opravy, zelen, mola]) => {
        // osi ciest: rovné úseky a plynulé oblúky (pravidlá ulice, js/mapa/cesty/upravy-osi.js)
        upravOsiCiest(d.cesty);
        // súbežné jazdné pásy rozdelenej cesty sa neprekrývajú (js/mapa/cesty/sirky-pasov.js)
        upravSirkyPasov(d.cesty);
        // osi chodníkov tiež (rovné úseky a oblúky – bez cikcaku z kreslenia); body spoločné s cestami ostávajú
        upravOsiCiest([...(d.chodniky ?? []), ...(d.cesty ?? [])]);
        // ručné opravy podľa porovnania so skutočnosťou (budovy, hustá zeleň v parkoch)
        aplikujOpravy(d.budovy, opravy);
        // mólá nad nábrežím: vodorovná mostovka namiesto lávky dolu svahom (js/mapa/mosty/mola.js)
        oznacMola(d.nadjazdy, mola);
        doplnHustuZelen(d, this.rect({ i, j }), zelen);
        // detailný terén sa zaregistruje skôr, než sa dlaždica začne stavať (budovy, cesty aj zem ho už použijú)
        if (teren && this.data.has(kluc)) { this.vyskopis.pridajDetail?.(i, j, teren.v, teren.n, teren.krok); d._detailTerenu = true; }
        if (strechy) d._strechy = strechy;
        // budovy, ktoré nahrádza podrobný model pamiatky (js/mapa/pamiatky/nahradene-budovy.js)
        if (d.budovy) d.budovy = bezNahradenych(d.budovy);
        if (d.stromy) d.stromy = bezStromovVNahradenych(d.stromy);
        return d;
      }));
    }
    return this.data.get(kluc);
  }

  /** Zmení okruhy podrobných a jednoduchých dlaždíc (kvalita grafiky, skracovanie dohľadu). */
  nastavPolomery(detail, lod) {
    this.polomerDetail = detail;
    this.polomerLod = Math.max(detail, lod);
    this.poslednaKontrola = -1e9; // prepočítať hneď
  }

  /** Čo má byť načítané okolo bodu (x, z): zoznam { t, uroven, d } zoradený od najbližšej. */
  ziadane(x, z) {
    const out = [];
    for (const t of this.zoznam) {
      const d = this.vzdialenost(t, x, z);
      if (d < this.polomerDetail) out.push({ t, uroven: 'detail', d });
      else if (d < this.polomerLod && t.pocet > 0) out.push({ t, uroven: 'lod', d });
    }
    return out.sort((a, b) => a.d - b.d);
  }

  /** Na štarte: postaví všetko v okolí naraz (čaká sa na to pri načítavaní hry). */
  async nacitajOkolie(x, z, priebeh = () => {}) {
    this.stred = { x, z };
    // zvyšok (vzdialené dlaždice LOD) dobehne za behu; polomer podľa predvoľby kvality (#99) – vopred, aby počet
    // dlaždíc „n/N“ pre vlak na obrazovke načítavania (#102) sedel a vlak došiel až po poslednej dlaždici
    const ziadane = this.ziadane(x, z).filter(({ t, uroven }) => uroven !== 'lod' || this.vzdialenost(t, x, z) <= this.polomerDetail * 1.6);
    let n = 0;
    for (const { t, uroven } of ziadane) {
      const data = await this.nacitajData(t.kluc);
      const gen = postavDlazdicu(t.kluc, data, this.rect(t), uroven, this.kontext);
      let r = gen.next();
      while (!r.done) r = gen.next();
      this._pridaj(t.kluc, uroven, r.value, data);
      // „n/N“ číta obrazovka načítavania (js/ui/nacitavanie/priebeh.js) – podľa toho ide vlak
      priebeh(`Staviam mesto… ${++n}/${ziadane.length} dlaždíc`);
      // jeden snímok pre obrazovku načítavania (vlak sa hýbe plynulo); v skrytej karte stačí krátka pauza
      await new Promise((r) => { requestAnimationFrame(r); setTimeout(r, 40); });
    }
  }

  /**
   * Po dlhom presune (teleport, MHD): dostavia chýbajúce podrobné dlaždice do `polomer` m – každú celú naraz,
   * jednu za snímok (ako pri štarte hry), aby hráč nestál dlho na horizonte. Bežné stavanie počas toho čaká.
   */
  async dostavOkolie(x, z, polomer = 450) {
    if (this.dostavuje) return;
    this.dostavuje = true;
    this.uloha = null;   // rozostavaná dlaždica z pôvodného miesta už nie je potrebná
    try {
      for (const { t, uroven } of this.ziadane(x, z)) {
        if (uroven !== 'detail' || this.vzdialenost(t, x, z) > polomer) continue;
        if (this.aktivne.get(t.kluc)?.uroven === 'detail') continue;
        const data = await this.nacitajData(t.kluc);
        const gen = postavDlazdicu(t.kluc, data, this.rect(t), 'detail', this.kontext);
        let r = gen.next();
        while (!r.done) r = gen.next();
        this._pridaj(t.kluc, 'detail', r.value, data);
        await new Promise((ok) => { requestAnimationFrame(ok); setTimeout(ok, 50); });
      }
    } finally {
      this.dostavuje = false;
      this.poslednaKontrola = -1e9;
    }
  }

  /** Volá sa každý snímok (modul js/mapa/dlazdice/modul.js). */
  update(x, z, cas, kamera = null) {
    this.stred = { x, z };
    if (this.dostavuje) return;
    // 1) pokračuj v rozostavanej dlaždici v rámci časového rozpočtu (väčší, kým pod hráčom chýba podrobná dlaždica)
    const zaciatok = performance.now();
    if (this.uloha?.caka) return;
    const vlastna = `${Math.floor(x / this.velkost)}_${Math.floor(z / this.velkost)}`;
    const rozpocet = this.kluce.has(vlastna) && this.aktivne.get(vlastna)?.uroven !== 'detail' ? ROZPOCET_PO_PRESUNE_MS : ROZPOCET_MS;
    while (this.uloha && !this.uloha.caka && performance.now() - zaciatok < rozpocet) {
      const r = this.uloha.gen.next();
      if (r.done) {
        const { kluc, uroven, data } = this.uloha;
        if (this.priprav) {
          // shadery a textúry dlaždice sa pripravia vopred (na pozadí), až potom sa dlaždica ukáže –
          // inak by ich grafická karta pripravovala pri prvom kreslení a hra by sa na chvíľu zasekla
          const uloha = this.uloha;
          uloha.caka = true;
          Promise.resolve().then(() => this.priprav(r.value)).catch(() => {}).then(() => {
            if (this.uloha !== uloha) return;
            this.uloha = null;
            this._pridaj(kluc, uroven, r.value, data);
          });
          return;
        }
        this.uloha = null;
        this._pridaj(kluc, uroven, r.value, data);
      }
    }
    // úrovne detailu podrobných dlaždíc podľa vzdialenosti (zem 2 / 4 / 10 m, drobnosti) – aj počas stavby ďalšej
    if (cas - (this.poslednyLod ?? -1e9) >= 0.25) {
      this.poslednyLod = cas;
      const kx = kamera?.x ?? x, kz = kamera?.z ?? z;
      for (const [kluc, a] of this.aktivne) {
        if (a.uroven !== 'detail') continue;
        const [i, j] = kluc.split('_').map(Number);
        nastavLodDlazdice(a.objekt, this.vzdialenost({ i, j }, kx, kz), kx, kz);
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
        const lim = a.uroven === 'detail' ? this.polomerDetail + 150 : this.polomerLod + 150;
        if (!t || this.vzdialenost(t, x, z) > lim) this._odober(kluc);
      }
    }
    // prvá dlaždica, ktorej chýba požadovaná úroveň
    for (const { t, uroven } of ziadane) {
      const a = this.aktivne.get(t.kluc);
      if (a?.uroven === uroven || (a?.uroven === 'detail' && uroven === 'lod' && this.vzdialenost(t, x, z) < this.polomerDetail + 150)) continue;
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
