// Modul: zdieľané kolobežky „Fičák“, mestské bicykle, hoverboardy a onewheely (issue #97 – mikromobilita).
//
// – Odstavené kolobežky a bicykle stoja na chodníkoch a v pešej zóne (miesta sa vyberú z chodníkov detailných
//   dlaždíc, vždy rovnako podľa polohy), každý typ sa kreslí jednou InstancedMesh.
// – Pri vozidle: E = nasadnúť (bez animácie dverí), počas jazdy E = zosadnúť. Jazda: W plyn/šliapanie, S alebo
//   Medzerník brzda, A/D zatáčanie, Shift šprint na bicykli; náklon do zákruty (js/mikromobilita/vozidlo.js).
// – Jazdec (Ďoďo) na kolobežke stojí, na bicykli sedí a šliape (IK rúk a nôh – js/mikromobilita/jazdec.js).
// Pre ostatné moduly: počas jazdy je hra.stav.auto = vozidlo (typ 'kolobezka' | 'bicykel'), hra.stav.rezim = 'auto';
// udalosti 'nasadol' / 'zosadol' (vozidlo). Nápovedu „E – Jazdiť na …“ dáva cez hra.stav.napoveda (zobrazí HUD).

import * as THREE from 'three';
import { Jednostopove } from './vozidlo.js';
import { TYPY, FARBY_BICYKLOV } from './typy.js';
import { polozJazdca, uvolniJazdca } from './jazdec.js';

const ROZOSTUP = 130;        // m – po chodníku približne takto ďaleko od seba sú stanovištia
const PODIEL = 0.5;          // koľko kandidátov sa naozaj stane stanovišťom
const PODIEL_BICYKLOV = 0.3; // časť stanovíšť s bicyklami (ostatné kolobežky)
const DOSAH_KRESLENIA = 170; // m – odstavené vozidlá ďalej sa nekreslia
const DOSAH_E = 1.7;         // m – na koľko sa dá nasadnúť
const MAX_VOLNYCH = 8;       // vozidlá odstavené hráčom (najstaršie ďaleko sa odpracú)
const KAPACITA = 256;

const hash = (x, z, k = 0) => { const s = Math.sin(x * 12.9898 + z * 78.233 + k * 37.719) * 43758.5453; return s - Math.floor(s); };

/** Stanovištia na chodníkoch dlaždice: [{ id, typ, x, z, uhol, farba }]. */
function najdiStanovistia(kluc, data, kolizie, mapa) {
  const out = [];
  for (const ch of data.chodniky ?? []) {
    if (ch.typ !== 'footway' && ch.typ !== 'pedestrian') continue;
    if ((ch.sirka ?? 2) < 2) continue;
    const b = ch.body;
    let draha = hash(b[0][0], b[0][1], 3) * ROZOSTUP;   // posun, aby stanovištia neboli na začiatku chodníkov
    for (let i = 1; i < b.length; i++) {
      const [x0, z0] = b[i - 1], [x1, z1] = b[i];
      const dl = Math.hypot(x1 - x0, z1 - z0);
      if (dl < 1e-3) continue;
      const dx = (x1 - x0) / dl, dz = (z1 - z0) / dl;
      while (draha < dl) {
        const px = x0 + dx * draha, pz = z0 + dz * draha;
        if (hash(px, pz, 1) < PODIEL) {
          // 1–3 kolobežky alebo 1–2 bicykle vedľa seba pri okraji chodníka, zriedka hoverboard alebo onewheel
          const hd = hash(px, pz, 9);
          const typ = hash(px, pz, 7) < PODIEL_BICYKLOV ? 'bicykel' : hd < 0.05 ? 'hoverboard' : hd < 0.1 ? 'onewheel' : 'kolobezka';
          const bic = typ === 'bicykel';
          const n = typ === 'hoverboard' || typ === 'onewheel' ? 1 : 1 + Math.floor(hash(px, pz, 2) * (bic ? 2 : 3));
          const strana = hash(px, pz, 4) < 0.5 ? 1 : -1;
          const okraj = Math.max(0.3, (ch.sirka ?? 2) / 2 - (bic ? 0.45 : 0.35)) * strana;
          for (let k = 0; k < n; k++) {
            const x = px - dz * okraj + dx * k * (bic ? 1.9 : 0.75), z = pz + dx * okraj + dz * k * (bic ? 1.9 : 0.75);
            if (!kolizie.jeVolne(x, z, bic ? 0.6 : 0.45) || mapa.jeVoVode(x, z)) continue;
            const uhol = Math.atan2(dx, dz) + (hash(x, z, 5) < 0.5 ? 0 : Math.PI) + (hash(x, z, 6) - 0.5) * (bic ? 0.3 : 0.7);
            const farba = FARBY_BICYKLOV[Math.floor(hash(x, z, 8) * FARBY_BICYKLOV.length)];
            out.push({ id: `${kluc}:${out.length}`, typ, x, z, uhol, farba });
          }
        }
        draha += ROZOSTUP;
      }
      draha -= dl;
    }
  }
  return out;
}

export default {
  nazov: 'kolobezky',
  poradie: 9,   // pred hráčom (10): stlačenie E pri vozidle si vezme skôr, než by hráč nastúpil do auta

  init(hra) {
    this.stanovistia = new Map();   // kľúč dlaždice → stanovištia
    this.vzate = new Set();         // id stanovíšť, z ktorých si hráč vzal vozidlo
    this.volne = [];                // vozidlá odstavené hráčom (Jednostopove)
    this.jazdene = null;
    this.napoveda = null;
    this.casKreslenia = 0;
    this.kreslene = [];

    this.odstavene = {};
    for (const [typ, T] of Object.entries(TYPY)) {
      const m = new THREE.InstancedMesh(T.geometria(), T.material(), KAPACITA);
      m.name = `${typ}-odstavene`;
      m.count = 0;
      m.castShadow = true;
      m.receiveShadow = true;
      m.frustumCulled = false;
      hra.scena.add(m);
      this.odstavene[typ] = m;
    }

    const sprava = hra.mapa.dlazdice;
    const pridaj = ({ kluc, uroven, data }) => {
      if (uroven !== 'detail' || !data) return;
      this.stanovistia.set(kluc, najdiStanovistia(kluc, data, hra.mapa.kolizie, hra.mapa));
      this.casKreslenia = 0;
    };
    for (const [kluc, a] of sprava?.aktivne ?? []) pridaj({ kluc, uroven: a.uroven, data: a.data });
    hra.na('dlazdica-nacitana', pridaj);
    hra.na('dlazdica-uvolnena', ({ kluc, nahrada }) => { if (!nahrada) this.stanovistia.delete(kluc); this.casKreslenia = 0; });
  },

  update(dt, hra) {
    const h = hra.hrac;
    if (!h) return;

    // jazda
    if (this.jazdene && hra.stav.auto !== this.jazdene) this.jazdene = null;   // napr. iný modul zrušil jazdu
    for (const v of this.volne) if (v !== this.jazdene) v.update(dt, hra.mapa, hra);
    const voz = this.jazdene;
    if (voz && hra.vstup.caka('akcia')) {
      hra.vstup.stlacil('akcia');
      if (voz.rychlostKmh > 14) hra.ui.sprava('Najprv spomaľ!', 1.2);
      else this.zosadni(hra);
    }
    if (this.jazdene) {
      voz.sprint = hra.vstup.drzi('beh');
      voz.update(dt, hra.mapa, hra);
      polozJazdca(dt, h, voz);
    }

    // odstavené vozidlá v okolí (prepočet 2× za sekundu)
    const p = hra.stav.auto?.pozicia ?? h.pozicia;
    this.casKreslenia -= dt;
    if (this.casKreslenia <= 0) { this.casKreslenia = 0.5; this.prekresli(hra, p); }

    // nápoveda a nasadnutie
    let naj = null;
    if (!hra.stav.auto && !h.akcia && !h.pliva && h.naZemi !== false) naj = this.najblizsie(h.pozicia);
    this.nastavNapovedu(hra, naj ? `E – Jazdiť na ${TYPY[naj.typ].nazov}` : null);
    if (naj && hra.vstup.caka('akcia')) {
      hra.vstup.stlacil('akcia');
      this.nasadni(hra, naj);
    }
  },

  /** Najbližšie vozidlo do DOSAH_E (stanovište alebo odstavené hráčom). */
  najblizsie(poz) {
    let naj = null, min = DOSAH_E;
    for (const s of this.kreslene) {
      const d = Math.hypot(s.x - poz.x, s.z - poz.z);
      if (d < min) { min = d; naj = { stanoviste: s, typ: s.typ }; }
    }
    for (const v of this.volne) {
      if (v === this.jazdene) continue;
      const d = Math.hypot(v.pozicia.x - poz.x, v.pozicia.z - poz.z);
      if (d < min) { min = d; naj = { vozidlo: v, typ: v.typ }; }
    }
    return naj;
  },

  prekresli(hra, p) {
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(0, 0, 0, 'YXZ');
    const poz = new THREE.Vector3(), jedna = new THREE.Vector3(1, 1, 1), farba = new THREE.Color();
    const d2 = DOSAH_KRESLENIA * DOSAH_KRESLENIA;
    const pocet = Object.fromEntries(Object.keys(TYPY).map((t) => [t, 0]));
    this.kreslene = [];
    for (const zoznam of this.stanovistia.values()) {
      for (const s of zoznam) {
        if (this.vzate.has(s.id) || pocet[s.typ] >= KAPACITA) continue;
        if ((s.x - p.x) ** 2 + (s.z - p.z) ** 2 > d2) continue;
        const im = this.odstavene[s.typ], i = pocet[s.typ]++;
        poz.set(s.x, hra.mapa.vyska(s.x, s.z), s.z);
        q.setFromEuler(e.set(0, s.uhol, TYPY[s.typ].STOJAN));
        im.setMatrixAt(i, m.compose(poz, q, jedna));
        im.setColorAt(i, s.typ === 'bicykel' ? farba.set(s.farba) : farba.setRGB(1, 1, 1));
        this.kreslene.push(s);
      }
    }
    for (const [typ, im] of Object.entries(this.odstavene)) {
      im.count = pocet[typ];
      im.instanceMatrix.needsUpdate = true;
      if (im.instanceColor) im.instanceColor.needsUpdate = true;
    }
    // odstavené hráčom: ďaleké a nadbytočné sa odpracú (zdieľané si „odvezie“ firma)
    while (this.volne.length > MAX_VOLNYCH) {
      const i = this.volne.findIndex((v) => v !== this.jazdene);
      if (i < 0) break;
      hra.scena.remove(this.volne[i].mesh);
      this.volne.splice(i, 1);
    }
    for (let i = this.volne.length - 1; i >= 0; i--) {
      const v = this.volne[i];
      if (v !== this.jazdene && Math.hypot(v.pozicia.x - p.x, v.pozicia.z - p.z) > 400) {
        hra.scena.remove(v.mesh);
        this.volne.splice(i, 1);
      }
    }
  },

  nasadni(hra, { stanoviste, vozidlo }) {
    let voz = vozidlo;
    if (stanoviste) {
      const s = stanoviste;
      this.vzate.add(s.id);
      voz = new Jednostopove({ typ: s.typ, x: s.x, z: s.z, uhol: s.uhol, y: hra.mapa.vyska(s.x, s.z), farba: s.farba });
      hra.scena.add(voz.mesh);
      this.volne.push(voz);
      this.casKreslenia = 0;
    }
    const h = hra.hrac;
    voz.vodic = 'hrac';
    voz.vF = 0;
    this.jazdene = voz;
    hra.stav.auto = voz;
    hra.stav.rezim = 'auto';
    h.vx = h.vz = 0; h.rychlost = 0;
    h.mesh.visible = true;
    h.mesh.rotation.order = 'YXZ';
    this.nastavNapovedu(hra, null);
    const spravy = {
      bicykel: 'Bicykel: W – šliapať, Shift – šprint, S – brzda, E – zosadnúť',
      kolobezka: 'Kolobežka Fičák: W – jazda, S – brzda, E – zosadnúť',
      hoverboard: 'Hoverboard: W – jazda, A/D – otáčanie aj na mieste, E – zosadnúť',
      onewheel: 'Onewheel: W – nakloniť sa a fičať, S – brzda, E – zosadnúť',
    };
    hra.ui.sprava(spravy[voz.typ] ?? 'E – zosadnúť', 2.8);
    hra.posli('nasadol', voz);
  },

  zosadni(hra) {
    const voz = this.jazdene, h = hra.hrac;
    // zosadne vľavo, ak tam nie je miesto, vpravo alebo za vozidlo
    const lx = Math.cos(voz.uhol), lz = -Math.sin(voz.uhol), fx = Math.sin(voz.uhol), fz = Math.cos(voz.uhol);
    const { x, z } = voz.pozicia;
    const kandidati = [[x + lx * 0.6, z + lz * 0.6], [x - lx * 0.6, z - lz * 0.6], [x - fx * 1.1, z - fz * 1.1]];
    const miesto = kandidati.find(([a, b]) => hra.mapa.kolizie.jeVolne(a, b, 0.3) && !hra.mapa.jeVoVode(a, b)) ?? [x, z];
    h.pozicia.set(miesto[0], hra.mapa.vyska(miesto[0], miesto[1], voz.pozicia.y + 0.5), miesto[1]);
    h.uhol = voz.uhol;
    h.vy = 0; h.vx = h.vz = 0; h.rychlost = 0; h.naZemi = true;
    h.mesh.position.copy(h.pozicia);
    h.mesh.rotation.set(0, h.uhol, 0);
    uvolniJazdca(h);
    voz.vodic = null;
    voz.sprint = false;
    voz.ovladanie = { plyn: 0, zatacanie: 0, rucna: false };
    hra.stav.auto = null;
    hra.stav.rezim = 'pesi';
    this.jazdene = null;
    hra.posli('zosadol', voz);
  },

  nastavNapovedu(hra, text) {
    if (text === this.napoveda) return;
    // cudziu nápovedu (napr. dvere internátu) na null neprepisujeme
    if (text !== null || this.napoveda !== null) hra.stav.napoveda = text;
    this.napoveda = text;
  },
};
