// Modul: postavy v hale Hlavnej stanice – staničný filozof a ľudia bez domova (humor s dôstojnosťou).
// Miesta (lavičky, automaty, priechod) sú z assets/pamiatky/stanica-interier.json (hra.stanica.miesta, js/mapa/stanica/modul.js).
//   – filozof stojí pri vstupe do priechodu na nástupištia, E → dialóg data/dialogy/stanica-filozof.json
//     (úvodná scénka ho spustí sama – js/mapa/stanica/prichod.js, udalosť 'stanica-filozof')
//   – pán spí na lavičke pod dekou, pán s novinami sedí na lavičke, pani sedí na kartóne pri automatoch;
//     E → krátka veta z data/dialogy/stanica-postavy.json
// Postavy sú NPC modely chodcov (js/chodec/npc/), póza sedenia cez IK (ako jazdci na bicykli). Kreslia sa len do 90 m.

import * as THREE from 'three';
import { vytvorNpc } from '../../chodec/npc/model-npc.js';
import { nacitajNpcData, poskladajChodca } from '../../chodec/npc/profily-npc.js';
import { ikDvochKosti, otocVoSvete } from '../../chodec/postava/ik.js';

const DOSAH_KRESLENIA = 90;
const DOSAH_REC = 2.2;
const SEDADLO = 0.48;
const _v = new THREE.Vector3(), _q = new THREE.Quaternion(), _os = new THREE.Vector3();

export default {
  nazov: 'stanica-postavy',
  poradie: 8,   // pred hráčom (10) – E pri postave si vezme skôr, než by nastúpil do auta

  init(hra) {
    this.hra = hra;
    this.postavy = [];
    this.skupina = new THREE.Group();
    this.skupina.name = 'stanica-postavy';
    hra.scena.add(this.skupina);
    this.cas = 0;
    this.napoveda = null;
    this.vety = null;
    fetch('data/dialogy/stanica-postavy.json').then((r) => r.json()).then((d) => { this.vety = d; }).catch(() => {});
    nacitajNpcData().then((d) => { this.data = d; }).catch(() => {});
    hra.na('stanica-filozof', () => this.rozhovor(this.postavy.find((p) => p.druh === 'filozof')));
  },

  async postav() {
    const hra = this.hra, m = hra.stanica?.miesta;
    if (!m || !this.data || this.postavene) return;
    this.postavene = true;
    const svet = hra.stanica.svet;
    const teren = (x, z) => (hra.mapa.vyskaTerenu ?? hra.mapa.vyska)(x, z);
    const zoznam = [];
    if (m.vstup_hist) {
      // v Skleníku pred vstupom do historickej haly s freskou, 2,5 m bokom (nezavadzia v otvore); pozerá do Skleníka
      const [x, z] = svet(m.vstup_hist.p), [dx, dz] = m.vstup_hist.smer;
      zoznam.push({ druh: 'filozof', profil: 'dochodca', x: x - dz * 2.5, z: z + dx * 2.5, smer: [-dx, -dz], poza: 'stoj' });
    } else if (m.priechod) {
      const a = svet(m.priechod.a), b = svet(m.priechod.b);
      const L = Math.hypot(a[0] - b[0], a[1] - b[1]) || 1;
      const dx = (a[0] - b[0]) / L, dz = (a[1] - b[1]) / L;
      zoznam.push({ druh: 'filozof', profil: 'dochodca', x: a[0] + dx * 3.5 + dz * 1.2, z: a[1] + dz * 3.5 - dx * 1.2, smer: [dx, dz], poza: 'stoj' });
    }
    // lavičky v halách nie sú (prieskum fotiek) – ľudia bez domova sú na kartóne pri stenách
    const kar = m.kartony ?? [];
    if (kar[0]) { const [x, z] = svet(kar[0].p); zoznam.push({ druh: 'spiaci', profil: 'dochodca', x, z, smer: kar[0].smer, os: [kar[0].smer[1], -kar[0].smer[0]], poza: 'lezi', zem: true }); }
    if (kar[1]) { const [x, z] = svet(kar[1].p); zoznam.push({ druh: 'sediaci', profil: 'dochodca', x, z, smer: kar[1].smer, poza: 'zem' }); }
    if (m.automaty) { const [x, z] = svet(m.automaty.p); zoznam.push({ druh: 'pani', profil: 'dochodkyna', x: x + 2.6 * (m.os?.[0] ?? 1), z: z + 2.6 * (m.os?.[1] ?? 0), smer: [-(m.os?.[1] ?? 0), m.os?.[0] ?? 1], poza: 'zem' }); }

    for (const [i, p] of zoznam.entries()) {
      try {
        const spec = poskladajChodca(this.data, { profil: this.data.npc?.profily?.[p.profil] ? p.profil : null, semienko: 4242 + i * 17 });
        const npc = await vytvorNpc(spec, this.data);
        // zlúčená sieť (LOD1) – jedno kreslenie na postavu; plný model len pri rozhovore zblízka (update)
        npc.nastavLod(1);
        p.lod = 1;
        const kosti = {};
        npc.koren.traverse((o) => { if (o.isBone && !kosti[o.name]) kosti[o.name] = o; });
        p.npc = npc; p.kosti = kosti; p.y = teren(p.x, p.z);
        npc.koren.rotation.order = 'YXZ';
        this.skupina.add(npc.koren);
        this.poloz(p);
        hra.mapa.kolizie.pridajKruh(p.x, p.z, p.poza === 'stoj' ? 0.35 : 0.5, { typ: 'pamiatka', vyska: [p.y - 1, p.y + 1.8], zem: true, dlazdica: 'modul:stanica-postavy' });
        this.postavy.push(p);
      } catch (e) {
        console.warn('Stanica – postava sa nenačítala:', e);
      }
    }
  },

  /** Póza a poloha postavy (pri sedení/ležaní raz po animácii státia – ďalej je postava nehybná). */
  poloz(p) {
    const k = p.npc.koren, s = k.scale.y;
    const uhol = Math.atan2(p.smer[0], p.smer[1]);
    k.rotation.set(0, uhol, 0);
    p.npc.rychlost = 0;
    p.npc.animuj(0.016);
    if (p.poza === 'stoj') { k.position.set(p.x, p.y, p.z); return; }
    if (p.poza === 'lezi') {
      // na boku pozdĺž lavičky alebo na kartóne pri stene, pod dekou
      const os = Math.atan2(p.os?.[0] ?? 1, p.os?.[1] ?? 0);
      const lozko = p.zem ? 0.06 : SEDADLO;
      k.quaternion.setFromAxisAngle(_os.set(0, 1, 0), os - Math.PI / 2).multiply(_q.setFromAxisAngle(_os.set(0, 0, 1), Math.PI / 2));
      _v.set(0, 0.9 * s, 0).applyQuaternion(k.quaternion);
      k.position.set(p.x - _v.x, p.y + lozko + 0.17, p.z - _v.z);
      const deka = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.32, 0.62), new THREE.MeshStandardMaterial({ color: '#4d5e3c', roughness: 0.95 }));
      deka.position.set(p.x + (p.os?.[0] ?? 1) * 0.55, p.y + lozko + 0.2, p.z + (p.os?.[1] ?? 0) * 0.55);
      deka.rotation.y = os - Math.PI / 2;
      this.skupina.add(deka);
      if (p.zem) {
        const karton = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.05, 0.9), new THREE.MeshStandardMaterial({ color: '#a4824f', roughness: 1 }));
        karton.position.set(p.x, p.y + 0.025, p.z);
        karton.rotation.y = os - Math.PI / 2;
        this.skupina.add(karton);
      }
      return;
    }
    // sedí: na lavičke (panva vo výške sedadla) alebo na kartóne na zemi
    const sedadlo = p.poza === 'zem' ? 0.1 : SEDADLO;
    const dozadu = p.poza === 'zem' ? 0 : -0.12;
    k.position.set(p.x + p.smer[0] * dozadu, p.y + sedadlo - 0.86 * s + 0.05, p.z + p.smer[1] * dozadu);
    k.updateMatrixWorld(true);
    const K = p.kosti;
    if (K.spine_01) otocVoSvete(K.spine_01, _q.setFromAxisAngle(_os.set(1, 0, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), uhol), -0.12));
    const svet = (x, y, z) => k.localToWorld(new THREE.Vector3(x, y, z));
    const smer = (x, y, z) => new THREE.Vector3(x, y, z).applyQuaternion(k.quaternion);
    const pred = p.poza === 'zem' ? 0.5 : 0.48;
    const y0 = (p.y + 0.08 - k.position.y) / s;
    if (K.thigh_l && K.calf_l && K.foot_l) {
      ikDvochKosti(K.thigh_l, K.calf_l, K.foot_l, svet(0.14, y0, pred / s), smer(0.1, 1, 1));
      ikDvochKosti(K.thigh_r, K.calf_r, K.foot_r, svet(-0.14, y0, pred / s), smer(-0.1, 1, 1));
    }
    if (p.poza === 'zem') {
      const karton = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.08, 1.2), new THREE.MeshStandardMaterial({ color: '#a4824f', roughness: 1 }));
      karton.position.set(p.x + p.smer[0] * 0.3, p.y + 0.04, p.z + p.smer[1] * 0.3);
      karton.rotation.y = uhol;
      this.skupina.add(karton);
    } else if (K.hand_l && K.hand_r) {
      // noviny v rukách
      ikDvochKosti(K.upperarm_l, K.lowerarm_l, K.hand_l, svet(0.16, 1.18, 0.32), smer(1, -0.6, -0.4));
      ikDvochKosti(K.upperarm_r, K.lowerarm_r, K.hand_r, svet(-0.16, 1.18, 0.32), smer(-1, -0.6, -0.4));
      const noviny = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.36), new THREE.MeshStandardMaterial({ color: '#e9e5d8', roughness: 0.9, side: THREE.DoubleSide }));
      noviny.position.copy(svet(0, 1.22, 0.36));
      noviny.rotation.set(-0.3, uhol, 0, 'YXZ');
      this.skupina.add(noviny);
    }
  },

  update(dt) {
    const hra = this.hra;
    if (!this.postavene) { if (hra.stanica?.miesta && this.data) this.postav(); return; }
    const k = hra.kamera.position;
    const blizko = this.postavy.length && Math.hypot(k.x - this.postavy[0].x, k.z - this.postavy[0].z) < DOSAH_KRESLENIA;
    this.skupina.visible = !!blizko && !hra.stav.vInterieri;
    if (!this.skupina.visible) return this.nastavNapovedu(null);
    // filozof dýcha (animácia státia), ostatní sú nehybní (sedia, spia)
    for (const p of this.postavy) if (p.poza === 'stoj') { p.npc.rychlost = 0; p.npc.animuj(dt); }
    const h = hra.hrac?.pozicia;
    // plný model (tvár, oblečenie) len do 8 m od hráča
    for (const p of this.postavy) {
      const lod = h && Math.hypot(p.x - h.x, p.z - h.z) < 8 ? 0 : 1;
      if (lod !== p.lod) { p.lod = lod; p.npc.nastavLod(lod); }
    }
    // E pri postave → veta / rozhovor
    if (!h || hra.stav.auto || hra.titulky?.bezi) return this.nastavNapovedu(null);
    const naj = this.postavy.find((p) => Math.hypot(p.x - h.x, p.z - h.z) < DOSAH_REC);
    if (!naj) return this.nastavNapovedu(null);
    this.nastavNapovedu(naj.druh === 'filozof' ? 'E – Porozprávať sa so staničným filozofom' : 'E – Prihovoriť sa');
    if (hra.vstup.caka('akcia')) {
      hra.vstup.stlacil('akcia');
      this.rozhovor(naj);
    }
  },

  rozhovor(p) {
    if (!p || !this.hra.titulky) return;
    if (p.druh === 'filozof') {
      // pozrie sa na Ďoďa
      const h = this.hra.hrac?.pozicia;
      if (h) p.npc.koren.rotation.y = Math.atan2(h.x - p.x, h.z - p.z);
      return this.hra.titulky.prehraj('stanica-filozof');
    }
    const vety = this.vety?.repliky?.[p.druh];
    if (!vety) return;
    p.i = ((p.i ?? -1) + 1) % vety.length;
    return this.hra.titulky.prehraj({ postavy: this.vety.postavy, repliky: [{ kto: p.druh, text: vety[p.i] }] });
  },

  nastavNapovedu(text) {
    if (text === this.napoveda) return;
    if (text !== null || this.napoveda !== null) this.hra.stav.napoveda = text;
    this.napoveda = text;
  },
};
