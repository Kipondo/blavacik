// Správca zastávok: modely (prístrešok, označník, tabuľa odchodov) sa stavajú len v okolí hráča
// a vzdialené sa uvoľnia. Tabule odchodov sa prekresľujú, keď je hráč blízko.
import { umiestnenie } from './umiestnenie.js';
import { vytvorPristresok, vytvorOznacnik, vytvorTabulu } from '../modely/pristresok.js';
import { texturaOznacnika, kresliOdchody } from '../modely/textury.js';
import { najblizsieOdchody } from '../odchody.js';
import { sekundyDna } from '../cas.js';

const POLOMER_STAVBY = 380;
const POLOMER_UVOLNENIA = 460;
const POLOMER_TABULE = 60;     // tabuľa sa obnovuje len keď je hráč bližšie
const OBNOVA_TABULE = 20;      // s
const BUNKA = 250;

export class SpravaZastavok {
  constructor(hra, data, hodiny) {
    this.hra = hra; this.data = data; this.hodiny = hodiny;
    this.THREE = hra.THREE;
    this.skupina = new hra.THREE.Group();
    this.skupina.name = 'mhd-zastavky';
    hra.scena.add(this.skupina);
    this.aktivne = new Map(); // id nástupišťa → { objekt, tabula, dalsiaObnova }
    this.mriezka = new Map();
    for (const n of data.nastupistia.values()) {
      const k = `${Math.floor(n.x / BUNKA)},${Math.floor(n.z / BUNKA)}`;
      if (!this.mriezka.has(k)) this.mriezka.set(k, []);
      this.mriezka.get(k).push(n);
    }
    this.kontrola = 0;
  }

  /** Nástupištia do vzdialenosti r od bodu. */
  vOkoli(x, z, r) {
    const out = [];
    const c = Math.ceil(r / BUNKA), ci = Math.floor(x / BUNKA), cj = Math.floor(z / BUNKA);
    for (let i = ci - c; i <= ci + c; i++) for (let j = cj - c; j <= cj + c; j++) {
      for (const n of this.mriezka.get(`${i},${j}`) ?? []) if (Math.hypot(n.x - x, n.z - z) <= r) out.push(n);
    }
    return out;
  }

  postav(n) {
    const { THREE } = this;
    const u = umiestnenie(n);
    const g = new THREE.Group();
    g.position.set(u.x, this.hra.mapa.vyska(u.x, u.z), u.z);
    g.rotation.y = u.uhol;
    // Prístrešok pri električkách a frekventovaných nástupištiach, inak len označník
    const pristresok = n.typy.includes('elektricka') || n.linky.length >= 2;
    if (pristresok) g.add(vytvorPristresok(THREE));
    const oznacnik = vytvorOznacnik(THREE, texturaOznacnika(THREE, n.zastavka, n, this.data.linky));
    oznacnik.position.set(pristresok ? 2.9 : 0, 0, 0.9);
    g.add(oznacnik);
    let tabula = null;
    if (n.typy.includes('elektricka') || n.linky.length >= 3) {
      tabula = vytvorTabulu(THREE);
      tabula.position.set(pristresok ? -2.8 : -1.2, 0, 0.6);
      g.add(tabula);
    }
    g.userData = { nastupiste: n, umiestnenie: u };
    this.skupina.add(g);
    this.aktivne.set(n.id, { objekt: g, oznacnik, tabula, dalsiaObnova: 0 });
  }

  uvolni(id) {
    const a = this.aktivne.get(id);
    a.oznacnik.userData.uvolni?.();
    a.tabula?.userData.uvolni?.();
    this.skupina.remove(a.objekt);
    this.aktivne.delete(id);
  }

  update(dt) {
    const { x, z } = this.hra.stav.pozicia;
    this.kontrola -= dt;
    if (this.kontrola <= 0) {
      this.kontrola = 0.5;
      for (const n of this.vOkoli(x, z, POLOMER_STAVBY)) if (!this.aktivne.has(n.id)) this.postav(n);
      for (const [id, a] of this.aktivne) {
        const n = a.objekt.userData.nastupiste;
        if (Math.hypot(n.x - x, n.z - z) > POLOMER_UVOLNENIA) this.uvolni(id);
      }
    }
    this.obnovTabule(x, z);
  }

  obnovTabule(x, z) {
    const teraz = this.hodiny.teraz(this.hra);
    const t = teraz.getTime() / 1000;
    for (const a of this.aktivne.values()) {
      if (!a.tabula || t < a.dalsiaObnova || a.nacitava) continue;
      const n = a.objekt.userData.nastupiste;
      if (Math.hypot(n.x - x, n.z - z) > POLOMER_TABULE && a.dalsiaObnova) continue;
      a.nacitava = true;
      najblizsieOdchody(this.data, n.id, teraz, 5).then((odchody) => {
        const { ctx, platno, tex } = a.tabula.userData;
        kresliOdchody(ctx, platno.width, platno.height, n.zastavka, odchody, sekundyDna(teraz), this.data.linky);
        tex.needsUpdate = true;
      }).finally(() => { a.nacitava = false; a.dalsiaObnova = t + OBNOVA_TABULE; });
    }
  }

  /** Najbližšie nástupište k bodu (pre hráča, NPC, misie). */
  najblizsie(x, z, max = 50) {
    let naj = null, d = max;
    for (const n of this.vOkoli(x, z, max)) {
      const dn = Math.hypot(n.x - x, n.z - z);
      if (dn < d) { d = dn; naj = n; }
    }
    return naj;
  }
}
