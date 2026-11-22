// Modul: ľudia na kolobežkách a bicykloch jazdia po cyklopruhoch a cyklochodníkoch (issue #97).
//
// – Trasy: červené cyklopruhy z data/mapa/cyklopruhy.json (pravý pruh v smere kreslenia cesty, ľavý proti nemu)
//   a cyklochodníky (highway=cycleway) z detailných dlaždíc (oboma smermi).
// – Najviac MAX_JAZDCOV naraz v okolí hráča (objavia sa 50–180 m od neho, zmiznú na konci trasy alebo ďaleko);
//   jazdec je plný model NPC (js/chodec/npc/) s pózou ako hráč – na kolobežke stojí, na bicykli šliape (jazdec.js).
// – Pred hráčom (pešo aj vo vozidle) zabrzdia a počkajú.

import * as THREE from 'three';
import { Jednostopove } from './vozidlo.js';
import { TYPY } from './typy.js';
import { polozJazdca } from './jazdec.js';
import { nacitajNpcData, poskladajChodca } from '../chodec/npc/profily-npc.js';
import { vytvorNpc } from '../chodec/npc/model-npc.js';

const MAX_JAZDCOV = 6;
const SPAWN_OD = 50, SPAWN_DO = 180;   // m od hráča
const ZMIZNE = 220;                    // m od hráča
const PROFILY = ['student', 'studentka', 'korporat', 'kurier', 'manazerka', 'student'];
const SIRKA_PRUHU = 1.5;

/** Lomená čiara posunutá do strany (kladné = vpravo v smere kreslenia, x = východ, z = juh). */
function posunuta(body, posun) {
  return body.map((b, i) => {
    const a = body[Math.max(0, i - 1)], c = body[Math.min(body.length - 1, i + 1)];
    const dx = c[0] - a[0], dz = c[1] - a[1], d = Math.hypot(dx, dz) || 1;
    return [b[0] - (dz / d) * posun, b[1] + (dx / d) * posun];
  });
}

/** Trasa s dĺžkami úsekov (na rýchle hľadanie polohy podľa prejdenej dráhy). */
function trasa(body, obojsmerna) {
  const dl = [0];
  for (let i = 1; i < body.length; i++) dl.push(dl[i - 1] + Math.hypot(body[i][0] - body[i - 1][0], body[i][1] - body[i - 1][1]));
  let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
  for (const [x, z] of body) { minX = Math.min(minX, x); maxX = Math.max(maxX, x); minZ = Math.min(minZ, z); maxZ = Math.max(maxZ, z); }
  return { body, dl, dlzka: dl[dl.length - 1], obojsmerna, ohr: { minX, maxX, minZ, maxZ } };
}

/** Poloha a smer na trase v dráhe s. */
function naTrase(t, s, out) {
  let i = 1;
  while (i < t.dl.length - 1 && t.dl[i] < s) i++;
  const a = t.body[i - 1], b = t.body[i], u = (s - t.dl[i - 1]) / Math.max(1e-6, t.dl[i] - t.dl[i - 1]);
  out.x = a[0] + (b[0] - a[0]) * u; out.z = a[1] + (b[1] - a[1]) * u;
  out.uhol = Math.atan2(b[0] - a[0], b[1] - a[1]);
  return out;
}

export default {
  nazov: 'jazdci-npc',
  poradie: 22,   // po autách (20) – hráč a jeho vozidlo sú už na mieste

  async init(hra) {
    this.trasyDlazdic = new Map();
    this.pruhy = [];
    this.jazdci = [];
    this.casSpawnu = 0;
    this.data = null;
    nacitajNpcData().then((d) => { this.data = d; }).catch(() => {});
    try {
      const r = await fetch('data/mapa/cyklopruhy.json');
      if (r.ok) {
        const { pruhy = [] } = await r.json();
        for (const p of pruhy) {
          if (!p.body || p.body.length < 2) continue;
          const os = Math.max(0.5, (p.s ?? 6) / 2 - SIRKA_PRUHU / 2 - 0.15);
          if (p.p) this.pruhy.push(trasa(posunuta(p.body, os), false));                         // v smere kreslenia
          if (p.l) this.pruhy.push(trasa(posunuta(p.body, -os).slice().reverse(), false));      // proti nemu
        }
      }
    } catch { /* bez cyklopruhov */ }
    const pridaj = ({ kluc, uroven, data }) => {
      if (uroven !== 'detail' || !data) return;
      const t = [];
      for (const ch of data.chodniky ?? []) if (ch.typ === 'cycleway' && ch.body?.length > 1) t.push(trasa(ch.body, true));
      this.trasyDlazdic.set(kluc, t);
    };
    for (const [kluc, a] of hra.mapa.dlazdice?.aktivne ?? []) pridaj({ kluc, uroven: a.uroven, data: a.data });
    hra.na('dlazdica-nacitana', pridaj);
    hra.na('dlazdica-uvolnena', ({ kluc, nahrada }) => { if (!nahrada) this.trasyDlazdic.delete(kluc); });
  },

  update(dt, hra) {
    if (!this.data || !hra.hrac) return;
    const p = hra.stav.auto?.pozicia ?? hra.hrac.pozicia;
    this.casSpawnu -= dt;
    if (this.casSpawnu <= 0 && this.jazdci.length < MAX_JAZDCOV) { this.casSpawnu = 0.8; this.spawni(hra, p); }

    for (let i = this.jazdci.length - 1; i >= 0; i--) {
      const j = this.jazdci[i];
      if (!j.npc) continue;   // model sa ešte načítava
      // zabrzdí pred hráčom (alebo jeho vozidlom) na trase
      const dx = p.x - j.x, dz = p.z - j.z;
      const pred = dx * Math.sin(j.uhol) + dz * Math.cos(j.uhol), bok = Math.abs(dx * Math.cos(j.uhol) - dz * Math.sin(j.uhol));
      const prekazka = pred > 0 && pred < 4 && bok < 1.1;
      j.v += ((prekazka ? 0 : j.cielV) - j.v) * Math.min(1, dt * (prekazka ? 4 : 0.8));
      j.s += j.v * dt;
      if (j.s >= j.t.dlzka || Math.hypot(j.x - p.x, j.z - p.z) > ZMIZNE) { this.odstran(hra, i); continue; }
      const poz = naTrase(j.t, j.opacne ? j.t.dlzka - j.s : j.s, {});
      const cielUhol = j.opacne ? poz.uhol + Math.PI : poz.uhol;
      let du = Math.atan2(Math.sin(cielUhol - j.uhol), Math.cos(cielUhol - j.uhol));
      du *= Math.min(1, dt * 5);
      j.uhol += du;
      j.x = poz.x; j.z = poz.z;
      const voz = j.voz;
      voz.pozicia.set(j.x, hra.mapa.vyska(j.x, j.z, voz.pozicia.y + 0.5), j.z);
      voz.uhol = j.uhol;
      voz.vF = j.v;
      voz.otacanie = du / Math.max(dt, 1e-3);
      const cielNaklon = Math.max(-voz.K.MAX_NAKLON, Math.min(voz.K.MAX_NAKLON, -Math.atan(j.v * voz.otacanie / 9.81)));
      voz.naklon += (cielNaklon - voz.naklon) * Math.min(1, dt * 5);
      voz.klopenie = 0;
      if (j.v > 0.3) voz.faza += (j.v * dt / 5.3) * Math.PI * 2;
      voz._aktualizujModel(dt);
      // zblízka plný model, ďalej zlúčená sieť (1 volanie kreslenia, tá istá kostra – póza platí)
      j.npc.nastavLod(Math.hypot(j.x - hra.kamera.position.x, j.z - hra.kamera.position.z) < 25 ? 0 : 1);
      polozJazdca(dt, j.postava, voz);
    }
  },

  /** Nový jazdec na náhodnej trase 50–150 m od hráča. */
  spawni(hra, p) {
    const trasy = [...this.pruhy, ...[...this.trasyDlazdic.values()].flat()]
      .filter((t) => t.dlzka > 30 && p.x > t.ohr.minX - SPAWN_DO && p.x < t.ohr.maxX + SPAWN_DO && p.z > t.ohr.minZ - SPAWN_DO && p.z < t.ohr.maxZ + SPAWN_DO);
    if (!trasy.length) return;
    const t = trasy[Math.floor(Math.random() * trasy.length)];
    const kandidati = [];
    for (let s = 0; s < t.dlzka - 15; s += 5) {
      const q = naTrase(t, s, {});
      const d = Math.hypot(q.x - p.x, q.z - p.z);
      if (d > SPAWN_OD && d < SPAWN_DO) kandidati.push(s);
    }
    if (!kandidati.length) return;
    const opacne = t.obojsmerna && Math.random() < 0.5;
    const s0 = kandidati[Math.floor(Math.random() * kandidati.length)];
    const s = opacne ? t.dlzka - s0 : s0;
    const n = Math.random();
    const typ = n < 0.4 ? 'bicykel' : n < 0.45 ? 'hoverboard' : n < 0.52 ? 'onewheel' : 'kolobezka';
    const farby = ['#2f6db5', '#1f2326', '#e9e6df', '#8c1c22', '#3d6b45', '#b8b2a6'];
    const j = {
      t, s: Math.min(s, t.dlzka - 15), opacne, v: 0, x: 0, z: 0, uhol: 0, npc: null,
      // bicykle 14–22 km/h, kolobežky 17–25 km/h, hoverboard ~11–15 km/h, onewheel 18–25 km/h
      cielV: typ === 'bicykel' ? 4 + Math.random() * 2.2 : TYPY[typ].MAX_RYCHLOST * (0.72 + Math.random() * 0.26),
    };
    const q = naTrase(t, opacne ? t.dlzka - j.s : j.s, {});
    j.x = q.x; j.z = q.z; j.uhol = opacne ? q.uhol + Math.PI : q.uhol;
    j.v = j.cielV;
    j.voz = new Jednostopove({ typ, x: j.x, z: j.z, uhol: j.uhol, y: hra.mapa.vyska(j.x, j.z), farba: farby[Math.floor(Math.random() * farby.length)] });
    j.voz.vodic = 'npc';
    this.jazdci.push(j);
    const spec = poskladajChodca(this.data, { profil: PROFILY[Math.floor(Math.random() * PROFILY.length)] });
    vytvorNpc(spec, this.data).then((npc) => {
      if (!this.jazdci.includes(j)) { npc.zrus(); return; }
      npc.nastavLod(0);
      const kosti = {};
      npc.koren.traverse((o) => { if (o.isBone && !kosti[o.name]) kosti[o.name] = o; });
      npc.koren.userData.instancia = { kosti };
      npc.koren.userData.animuj = (dt) => { npc.rychlost = 0; npc.animuj(dt); };
      npc.koren.rotation.order = 'YXZ';
      j.postava = { mesh: npc.koren };
      j.npc = npc;
      hra.scena.add(npc.koren, j.voz.mesh);
    }).catch(() => { const i = this.jazdci.indexOf(j); if (i >= 0) this.jazdci.splice(i, 1); });
  },

  odstran(hra, i) {
    const j = this.jazdci[i];
    this.jazdci.splice(i, 1);
    hra.scena.remove(j.voz.mesh);
    j.npc?.zrus();
  },
};
