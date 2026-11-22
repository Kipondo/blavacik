// Modul: zdieľané elektrické kolobežky „Fičák“ (issue #97 – mikromobilita, 1. časť).
//
// – Odstavené kolobežky stoja na chodníkoch a v pešej zóne (miesta sa vyberú z chodníkov detailných dlaždíc,
//   vždy rovnako podľa polohy), kreslia sa jednou InstancedMesh.
// – Pri kolobežke: E = nasadnúť (bez animácie dverí), na kolobežke E = zosadnúť. Jazda: W plyn, S/Medzerník
//   brzda, A/D zatáčanie; max. 25 km/h, náklon do zákruty (js/mikromobilita/kolobezka.js).
// – Jazdec (Ďoďo) stojí na doske a drží riadidlá (IK rúk a nôh, js/mikromobilita/ik.js).
// Pre ostatné moduly: počas jazdy je hra.stav.auto = kolobežka (typ 'kolobezka'), hra.stav.rezim = 'auto'.
// Nápovedu „E – Jazdiť na kolobežke“ dáva cez hra.stav.napoveda (zobrazí HUD).

import * as THREE from 'three';
import { Kolobezka, K_KOLOBEZKY } from './kolobezka.js';
import { geometriaCela, materialKolobezky, ROZMERY } from './model-kolobezky.js';
import { ikDvochKosti } from './ik.js';

const ROZOSTUP = 130;       // m – po chodníku približne takto ďaleko od seba sú stanovištia
const PODIEL = 0.5;         // koľko kandidátov sa naozaj stane stanovišťom
const DOSAH_KRESLENIA = 170; // m – odstavené kolobežky ďalej sa nekreslia
const DOSAH_E = 1.7;        // m – na koľko sa dá nasadnúť
const MAX_VOLNYCH = 8;      // kolobežky odstavené hráčom (najstaršie ďaleko sa odpratajú)
const KAPACITA = 256;

const hash = (x, z, k = 0) => { const s = Math.sin(x * 12.9898 + z * 78.233 + k * 37.719) * 43758.5453; return s - Math.floor(s); };

/** Stanovištia kolobežiek na chodníkoch dlaždice: [{ id, x, z, uhol }]. */
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
        const h = hash(px, pz, 1);
        if (h < PODIEL) {
          // 1–3 kolobežky vedľa seba pri okraji chodníka, šikmo ako ich ľudia nechávajú
          const n = 1 + Math.floor(hash(px, pz, 2) * 3);
          const strana = hash(px, pz, 4) < 0.5 ? 1 : -1;
          const okraj = Math.max(0.3, (ch.sirka ?? 2) / 2 - 0.35) * strana;
          for (let k = 0; k < n; k++) {
            const x = px - dz * okraj + dx * k * 0.75, z = pz + dx * okraj + dz * k * 0.75;
            if (!kolizie.jeVolne(x, z, 0.45) || mapa.jeVoVode(x, z)) continue;
            const uhol = Math.atan2(dx, dz) + (hash(x, z, 5) < 0.5 ? 0 : Math.PI) + (hash(x, z, 6) - 0.5) * 0.7;
            out.push({ id: `${kluc}:${out.length}`, x, z, uhol });
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
  poradie: 9,   // pred hráčom (10): stlačenie E pri kolobežke si vezme skôr, než by hráč nastúpil do auta

  init(hra) {
    this.stanovistia = new Map();   // kľúč dlaždice → stanovištia
    this.vzate = new Set();         // id stanovíšť, z ktorých si hráč vzal kolobežku
    this.volne = [];                // kolobežky odstavené hráčom (Kolobezka)
    this.jazdena = null;
    this.napoveda = null;
    this.casKreslenia = 0;
    this.kreslene = [];

    this.odstavene = new THREE.InstancedMesh(geometriaCela(), materialKolobezky(), KAPACITA);
    this.odstavene.name = 'kolobezky-odstavene';
    this.odstavene.count = 0;
    this.odstavene.castShadow = true;
    this.odstavene.receiveShadow = true;
    this.odstavene.frustumCulled = false;
    hra.scena.add(this.odstavene);

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
    const p = hra.stav.auto?.pozicia ?? h.pozicia;

    // jazda
    const k = this.jazdena;
    if (k && hra.stav.auto !== k) this.jazdena = null;   // napr. teleport alebo iný modul zrušil jazdu
    for (const v of this.volne) if (v !== this.jazdena) v.update(dt, hra.mapa, hra);
    if (this.jazdena) {
      if (hra.vstup.caka('akcia')) {
        hra.vstup.stlacil('akcia');
        if (k.rychlostKmh > 14) hra.ui.sprava('Najprv spomaľ!', 1.2);
        else this.zosadni(hra);
      }
    }
    if (this.jazdena) {
      this.jazdena.update(dt, hra.mapa, hra);
      this.polozJazdca(dt, hra, this.jazdena);
    }

    // odstavené kolobežky v okolí (prepočet 2× za sekundu)
    this.casKreslenia -= dt;
    if (this.casKreslenia <= 0) { this.casKreslenia = 0.5; this.prekresli(hra, p); }

    // nápoveda a nasadnutie
    let naj = null;
    if (!hra.stav.auto && !h.akcia && !h.pliva && h.naZemi !== false) naj = this.najblizsia(h.pozicia);
    this.nastavNapovedu(hra, naj ? 'E – Jazdiť na kolobežke (Fičák)' : null);
    if (naj && hra.vstup.caka('akcia')) {
      hra.vstup.stlacil('akcia');
      this.nasadni(hra, naj);
    }
  },

  /** Najbližšia kolobežka do DOSAH_E (stanovište alebo odstavená hráčom). */
  najblizsia(poz) {
    let naj = null, min = DOSAH_E;
    for (const s of this.kreslene) {
      const d = Math.hypot(s.x - poz.x, s.z - poz.z);
      if (d < min) { min = d; naj = { stanoviste: s }; }
    }
    for (const v of this.volne) {
      if (v === this.jazdena) continue;
      const d = Math.hypot(v.pozicia.x - poz.x, v.pozicia.z - poz.z);
      if (d < min) { min = d; naj = { kolobezka: v }; }
    }
    return naj;
  },

  prekresli(hra, p) {
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(0, 0, 0, 'YXZ');
    const poz = new THREE.Vector3(), jedna = new THREE.Vector3(1, 1, 1);
    const d2 = DOSAH_KRESLENIA * DOSAH_KRESLENIA;
    this.kreslene = [];
    let n = 0;
    for (const zoznam of this.stanovistia.values()) {
      for (const s of zoznam) {
        if (n >= KAPACITA) break;
        if (this.vzate.has(s.id)) continue;
        if ((s.x - p.x) ** 2 + (s.z - p.z) ** 2 > d2) continue;
        poz.set(s.x, hra.mapa.vyska(s.x, s.z), s.z);
        q.setFromEuler(e.set(0, s.uhol, K_KOLOBEZKY.STOJAN));
        this.odstavene.setMatrixAt(n++, m.compose(poz, q, jedna));
        this.kreslene.push(s);
      }
    }
    this.odstavene.count = n;
    this.odstavene.instanceMatrix.needsUpdate = true;
    // odstavené hráčom: ďaleké a nadbytočné sa odpracú (zdieľané kolobežky si „odvezie“ firma)
    while (this.volne.length > MAX_VOLNYCH) {
      const i = this.volne.findIndex((v) => v !== this.jazdena);
      if (i < 0) break;
      hra.scena.remove(this.volne[i].mesh);
      this.volne.splice(i, 1);
    }
    for (let i = this.volne.length - 1; i >= 0; i--) {
      const v = this.volne[i];
      if (v !== this.jazdena && Math.hypot(v.pozicia.x - p.x, v.pozicia.z - p.z) > 400) {
        hra.scena.remove(v.mesh);
        this.volne.splice(i, 1);
      }
    }
  },

  nasadni(hra, { stanoviste, kolobezka }) {
    let k = kolobezka;
    if (stanoviste) {
      this.vzate.add(stanoviste.id);
      k = new Kolobezka({ x: stanoviste.x, z: stanoviste.z, uhol: stanoviste.uhol, y: hra.mapa.vyska(stanoviste.x, stanoviste.z) });
      hra.scena.add(k.mesh);
      this.volne.push(k);
      this.casKreslenia = 0;
    }
    const h = hra.hrac;
    k.vodic = 'hrac';
    k.vF = 0;
    this.jazdena = k;
    hra.stav.auto = k;
    hra.stav.rezim = 'auto';
    h.vx = h.vz = 0; h.rychlost = 0;
    h.mesh.visible = true;
    h.mesh.rotation.order = 'YXZ';
    this.nastavNapovedu(hra, null);
    hra.ui.sprava('Kolobežka Fičák: W – jazda, S – brzda, E – zosadnúť', 2.8);
    hra.posli('nasadol', k);
  },

  zosadni(hra) {
    const k = this.jazdena, h = hra.hrac;
    // zosadne vľavo od kolobežky, ak tam nie je miesto, vpravo
    const lx = Math.cos(k.uhol), lz = -Math.sin(k.uhol), fx = Math.sin(k.uhol), fz = Math.cos(k.uhol);
    const { x, z } = k.pozicia;
    const kandidati = [[x + lx * 0.55, z + lz * 0.55], [x - lx * 0.55, z - lz * 0.55], [x - fx * 0.8, z - fz * 0.8]];
    const miesto = kandidati.find(([x, z]) => hra.mapa.kolizie.jeVolne(x, z, 0.3) && !hra.mapa.jeVoVode(x, z)) ?? [k.pozicia.x, k.pozicia.z];
    h.pozicia.set(miesto[0], hra.mapa.vyska(miesto[0], miesto[1], k.pozicia.y + 0.5), miesto[1]);
    h.uhol = k.uhol;
    h.vy = 0; h.vx = h.vz = 0; h.rychlost = 0; h.naZemi = true;
    h.mesh.position.copy(h.pozicia);
    h.mesh.rotation.set(0, h.uhol, 0);
    k.vodic = null;
    k.ovladanie = { plyn: 0, zatacanie: 0, rucna: false };
    hra.stav.auto = null;
    hra.stav.rezim = 'pesi';
    this.jazdena = null;
    hra.posli('zosadol', k);
  },

  /** Jazdec stojí na doske (ľavá noha vpredu), drží riadidlá a nakláňa sa s kolobežkou. */
  polozJazdca(dt, hra, k) {
    const h = hra.hrac, ud = h.mesh.userData;
    k.mesh.updateMatrixWorld(true);
    h.mesh.visible = true;
    h.mesh.position.copy(k.mesh.localToWorld(new THREE.Vector3(0, ROZMERY.doska, -0.06)));
    h.mesh.quaternion.copy(k.mesh.quaternion);
    ud.animuj?.(dt, 0, false);
    const K = ud.instancia?.kosti;
    if (!K?.upperarm_l || !K.thigh_l) return;
    h.mesh.updateMatrixWorld(true);
    const svet = (x, y, z) => k.mesh.localToWorld(new THREE.Vector3(x, y, z));
    const smer = (x, y, z) => new THREE.Vector3(x, y, z).applyQuaternion(k.mesh.quaternion);
    const R = ROZMERY, s = R.sirkaRiadidiel / 2 - 0.05;
    // ruky na gripoch (lakte von a dole), nohy na doske za sebou (kolená mierne dopredu)
    ikDvochKosti(K.upperarm_l, K.lowerarm_l, K.hand_l, svet(s, R.riadidla + 0.02, R.riadidlaZ - 0.03), smer(1, -0.6, -0.8));
    ikDvochKosti(K.upperarm_r, K.lowerarm_r, K.hand_r, svet(-s, R.riadidla + 0.02, R.riadidlaZ - 0.03), smer(-1, -0.6, -0.8));
    ikDvochKosti(K.thigh_l, K.calf_l, K.foot_l, svet(0.045, R.doska + 0.085, 0.1), smer(0.15, 0, 1));
    ikDvochKosti(K.thigh_r, K.calf_r, K.foot_r, svet(-0.045, R.doska + 0.085, -0.2), smer(-0.15, 0, 1));
  },

  nastavNapovedu(hra, text) {
    if (text === this.napoveda) return;
    // cudziu nápovedu (napr. dvere internátu) na null neprepisujeme
    if (text !== null || this.napoveda !== null) hra.stav.napoveda = text;
    this.napoveda = text;
  },
};
