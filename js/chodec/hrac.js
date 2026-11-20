// Modul: hráč pešo – chôdza, beh, skok, kolízie, nastupovanie/vystupovanie z áut (klávesa E).

import * as THREE from 'three';
import { KONFIG } from '../config.js';
import { vytvorRealistickuPostavu } from './postava/realisticka-postava.js';
import { nacitajUlozenyVzhlad } from './postava/ulozenie.js';
import { zacniNastup, zacniVystup, aktualizujAkciu, zrusAkciu } from './nastupovanie.js';
import { pohybPodlaKamery, zastavPohyb } from './pohyb-podla-kamery.js';
import { maxRychlost, smiePrejst, aktualizujVodu } from './plavanie.js';

const K = KONFIG.HRAC;

class Hrac {
  constructor(x, z, uhol) {
    this.pozicia = new THREE.Vector3(x, 0, z);
    this.uhol = uhol;
    this.vy = 0;
    this.naZemi = true;
    this.rychlost = 0;
    this.pliva = false; // vo vode (plavanie.js)
    // realistický Ďoďo z assets/postavy/dodo.glb (vzhľad a oblečenie z editora postavy)
    this.mesh = vytvorRealistickuPostavu(nacitajUlozenyVzhlad());
  }
}

/** Najbližšie auto, do ktorého sa dá nastúpiť. */
function najblizsieAuto(hra) {
  let naj = null, min = K.DOSAH_AUTA;
  for (const a of hra.auta) {
    if (a.vodic || a.znicene) continue;
    const d = Math.hypot(a.pozicia.x - hra.hrac.pozicia.x, a.pozicia.z - hra.hrac.pozicia.z);
    if (d < min) { min = d; naj = a; }
  }
  return naj;
}

function nastup(hra, auto) {
  zrusAkciu(hra);
  auto.vodic = 'hrac';
  hra.stav.auto = auto;
  hra.stav.rezim = 'auto';
  hra.hrac.mesh.visible = false;
  hra.posli('nastupil', auto);
}

function vystup(hra) {
  const auto = hra.stav.auto ?? hra.hrac.akcia?.auto;
  if (!auto) return;
  const sedel = hra.stav.auto === auto; // pri animovanom vystupovaní už 'vystupil' odišlo
  zrusAkciu(hra);
  // vystúpime vľavo od auta; ak tam niečo je, skúsime vpravo, vpredu, vzadu
  const s = auto.smer;
  const kandidati = [[s.z, -s.x], [-s.z, s.x], [s.x, s.z], [-s.x, -s.z]].map(([dx, dz]) => [
    auto.pozicia.x + dx * 2.2, auto.pozicia.z + dz * 2.2,
  ]);
  let miesto = kandidati.find(([x, z]) => hra.mapa.kolizie.jeVolne(x, z, K.POLOMER) && !hra.mapa.jeVoVode(x, z));
  if (!miesto) miesto = kandidati[0];
  const h = hra.hrac;
  h.pozicia.set(miesto[0], hra.mapa.vyska(miesto[0], miesto[1]), miesto[1]);
  h.uhol = auto.uhol;
  h.vy = 0;
  h.mesh.visible = true;
  auto.vodic = null;
  hra.stav.auto = null;
  hra.stav.rezim = 'pesi';
  if (sedel) hra.posli('vystupil', auto);
}

export default {
  nazov: 'hrac',
  poradie: 10,

  init(hra) {
    const s = hra.mapa.data.spawn?.hrac ?? { x: 0, z: 0, uhol: 0 };
    const h = new Hrac(s.x, s.z, s.uhol ?? 0);
    h.pozicia.y = hra.mapa.vyska(s.x, s.z);
    hra.hrac = h;
    hra.scena.add(h.mesh);
    hra.hrac.nastup = (auto) => nastup(hra, auto);
    hra.hrac.vystup = () => vystup(hra);
    hra.hrac.najblizsieAuto = () => najblizsieAuto(hra);
  },

  update(dt, hra) {
    const h = hra.hrac;

    // prebieha nastupovanie / vystupovanie s animáciou (nastupovanie.js)
    if (h.akcia) { zastavPohyb(h); aktualizujAkciu(dt, hra); return; }

    // E – nastúpiť / vystúpiť (s animáciou, ak sa dá; inak hneď)
    if (hra.vstup.stlacil('akcia')) {
      if (hra.stav.auto) {
        if (hra.stav.auto.rychlostKmh >= 25) hra.ui.sprava('Najprv spomaľ!', 1.5);
        else if (!zacniVystup(hra)) vystup(hra);
      } else {
        const auto = h.pliva ? null : najblizsieAuto(hra);
        if (auto && !zacniNastup(hra, auto)) nastup(hra, auto);
      }
      if (h.akcia) { aktualizujAkciu(dt, hra); return; }
    }

    if (hra.stav.auto) {
      // hráč sa vezie s autom
      h.pozicia.copy(hra.stav.auto.pozicia);
      h.uhol = hra.stav.auto.uhol;
      zastavPohyb(h);
      return;
    }

    // --- chôdza ---
    const p = hra.vstup.pohyb();
    const beh = hra.vstup.drzi('beh');
    const maxV = maxRychlost(h, beh);
    const staraX = h.pozicia.x, staraZ = h.pozicia.z;
    if (!hra.vstup.dotyk && hra.stav.smerKamery !== undefined) {
      // PC: W = tam, kam sa pozerá kamera, A/D = úkrok (pohyb-podla-kamery.js)
      pohybPodlaKamery(h, p, maxV, dt, hra.stav.smerKamery);
    } else {
      // mobil: dopredu/dozadu podľa smeru postavy, doľava/doprava otáča
      h.uhol -= p.x * K.OTACANIE * dt * (p.y < -0.1 ? -1 : 1);
      const cielV = p.y * maxV;
      h.rychlost += (cielV - h.rychlost) * Math.min(1, dt * 10);
      h.pozicia.x += Math.sin(h.uhol) * h.rychlost * dt;
      h.pozicia.z += Math.cos(h.uhol) * h.rychlost * dt;
    }

    // kolízie s budovami a autami
    const r = hra.mapa.kolizie.vytlac(h.pozicia.x, h.pozicia.z, K.POLOMER);
    h.pozicia.x = r.x; h.pozicia.z = r.z;
    for (const a of hra.auta) {
      for (const k of a.kruhy()) {
        const dx = h.pozicia.x - k.x, dz = h.pozicia.z - k.z;
        const d = Math.hypot(dx, dz), min = KONFIG.AUTO.POLOMER + K.POLOMER;
        if (d < min && d > 1e-4) {
          h.pozicia.x += (dx / d) * (min - d);
          h.pozicia.z += (dz / d) * (min - d);
        }
      }
    }
    // do vody sa dá vojsť alebo spadnúť z nábrežia; z vody len na nízky breh (plavanie.js)
    if (hra.mapa.jeMimo(h.pozicia.x, h.pozicia.z) || !smiePrejst(hra, h, h.pozicia.x, h.pozicia.z)) {
      h.pozicia.x = staraX; h.pozicia.z = staraZ;
    }

    // skok a gravitácia (vo vode sa pláva – výšku rieši plavanie.js)
    const zem = hra.mapa.vyska(h.pozicia.x, h.pozicia.z);
    const pliva = aktualizujVodu(dt, hra, h);
    if (pliva) {
      // nič – postava drží pri hladine
    } else if (h.naZemi && hra.vstup.drzi('skok')) {
      h.vy = K.SKOK;
      h.naZemi = false;
      hra.posli('skok');
    }
    if (!pliva) {
      h.vy -= K.GRAVITACIA * dt;
      h.pozicia.y += h.vy * dt;
    }
    if (pliva) {
      // vo vode
    } else if (h.pozicia.y <= zem) {
      h.pozicia.y = zem;
      h.vy = 0;
      h.naZemi = true;
    } else if (h.naZemi && h.pozicia.y - zem < 0.6) {
      h.pozicia.y = zem; // schádzanie zo svahu bez poskakovania
    } else {
      h.naZemi = false;
    }

    h.mesh.position.copy(h.pozicia);
    h.mesh.rotation.y = h.uhol;
    h.mesh.userData.opity = !!hra.stav.opity;
    h.mesh.userData.voVode = h.pliva;
    h.mesh.userData.animuj(dt, Math.abs(h.rychlost), !h.naZemi && !h.pliva);
  },
};
