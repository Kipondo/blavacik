// Bratislavský hrad – štvorkrídlový palác s nádvorím, biela fasáda,
// červené strechy a štyri rohové veže.

import * as THREE from 'three';
import { kvaderSOknami, kvader, ihlan, valbovaStrecha, zakladna } from './pomocne.js';

const BIELA = '#f2eee6';
const STRECHA = '#b4442d';
const KAMEN = '#cfc8b8';

export default function postav(p, { vyskopis, kolizie }) {
  const SIRKA = 78, HLBKA = 60, KRIDLO = 14, VYSKA = 20;
  const VEZA = 13, VYSKA_VEZE = 34;

  const g = new THREE.Group();
  const y0 = zakladna(vyskopis, p.x, p.z, SIRKA, HLBKA);

  // kamenná terasa pod hradom
  const terasa = kvader(SIRKA + 30, 4, HLBKA + 26, KAMEN);
  terasa.position.y = 1;
  g.add(terasa);

  // štyri krídla okolo nádvoria
  const kridla = [
    [0, -(HLBKA - KRIDLO) / 2, SIRKA, KRIDLO],
    [0, (HLBKA - KRIDLO) / 2, SIRKA, KRIDLO],
    [-(SIRKA - KRIDLO) / 2, 0, KRIDLO, HLBKA - 2 * KRIDLO],
    [(SIRKA - KRIDLO) / 2, 0, KRIDLO, HLBKA - 2 * KRIDLO],
  ];
  for (const [x, z, w, d] of kridla) {
    const k = kvaderSOknami(w, VYSKA, d, BIELA);
    k.position.set(x, 3 + VYSKA / 2, z);
    g.add(k);
    const s = valbovaStrecha(w + 1, 9, d + 1, STRECHA);
    s.position.set(x, 3 + VYSKA, z);
    g.add(s);
  }

  // rohové veže (juhozápadná – Korunná veža – je o kúsok vyššia)
  const rohy = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
  for (const [sx, sz] of rohy) {
    const korunna = sx === -1 && sz === 1;
    const vyska = VYSKA_VEZE + (korunna ? 6 : 0);
    const veza = kvaderSOknami(VEZA, vyska, VEZA, BIELA);
    const x = sx * (SIRKA / 2 - VEZA / 2 + 1), z = sz * (HLBKA / 2 - VEZA / 2 + 1);
    veza.position.set(x, 3 + vyska / 2, z);
    g.add(veza);
    const strecha = ihlan(VEZA + 1.5, korunna ? 13 : 10, VEZA + 1.5, STRECHA);
    strecha.position.set(x, 3 + vyska, z);
    g.add(strecha);
  }

  // brána na nádvorie (východná strana)
  const brana = kvader(1, 7, 6, '#4a3b2e');
  brana.position.set(SIRKA / 2 + 0.1, 3 + 3.5, 0);
  g.add(brana);

  g.position.set(p.x, y0, p.z);
  g.rotation.y = p.natocenie ?? 0;

  kolizie.pridajObdlznik(p.x, p.z, SIRKA + 2, HLBKA + 2, p.natocenie ?? 0, { typ: 'pamiatka', nazov: p.nazov });

  return { objekt: g };
}
