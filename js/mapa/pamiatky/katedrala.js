// Katedrála sv. Martina (Dóm) – gotická loď so strmou strechou a západnou vežou
// zakončenou ihlanom so zlatou korunou (repliku uhorskej koruny).

import * as THREE from 'three';
import { fasada, kvader, valbovaStrecha, valec, material, naMiesto } from './pomocne.js';

const KAMEN = '#d8cfbe';

export default function postav(p, { vyskopis, kolizie }) {
  const DLZKA = 70, SIRKA = 30, VYSKA_LODE = 21;
  const g = new THREE.Group();

  const lod = fasada(DLZKA - 12, VYSKA_LODE, SIRKA, KAMEN, { okno: [5, 9] });
  lod.position.set(6, VYSKA_LODE / 2, 0);
  g.add(lod);
  const strecha = valbovaStrecha(DLZKA - 10, 16, SIRKA + 1.5, '#5f6a66');
  strecha.position.set(6, VYSKA_LODE, 0);
  g.add(strecha);
  // presbytérium (východný koniec, užší)
  const presb = fasada(14, VYSKA_LODE - 2, SIRKA * 0.65, KAMEN, { okno: [4, 8] });
  presb.position.set(DLZKA / 2 - 3, (VYSKA_LODE - 2) / 2, 0);
  g.add(presb);
  // oporné piliere
  for (let i = 0; i < 6; i++) {
    for (const s of [-1, 1]) {
      const pil = kvader(1.6, VYSKA_LODE * 0.8, 2.2, '#cbbfaa');
      pil.position.set(-16 + i * 9, VYSKA_LODE * 0.4, s * (SIRKA / 2 + 1));
      g.add(pil);
    }
  }

  // veža na západnom konci
  const V = 12, VYSKA_VEZE = 52;
  const vx = -DLZKA / 2 + V / 2;
  const veza = fasada(V, VYSKA_VEZE, V, KAMEN, { okno: [3, 7] });
  veza.position.set(vx, VYSKA_VEZE / 2, 0);
  g.add(veza);
  const osem = valec(V * 0.42, V * 0.46, 8, KAMEN, 8);
  osem.position.set(vx, VYSKA_VEZE, 0);
  g.add(osem);
  const ihlan = valec(0.2, V * 0.45, 18, '#5f6a66', 8);
  ihlan.position.set(vx, VYSKA_VEZE + 8, 0);
  g.add(ihlan);
  // zlatá koruna navrchu (vankúš + koruna + krížik)
  const zlato = material('#e3b23c', { lesk: 0.7, kov: 0.9 });
  const vankus = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.5, 2.6), material('#9b2335'));
  vankus.position.set(vx, VYSKA_VEZE + 26.2, 0);
  const koruna = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 0.9, 1.4, 10, 1, true), zlato);
  koruna.position.set(vx, VYSKA_VEZE + 27.1, 0);
  const vrch = new THREE.Mesh(new THREE.SphereGeometry(0.9, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), zlato);
  vrch.position.set(vx, VYSKA_VEZE + 27.7, 0);
  const kriz = new THREE.Mesh(new THREE.BoxGeometry(0.15, 1.1, 0.15), zlato);
  kriz.position.set(vx, VYSKA_VEZE + 29.1, 0);
  g.add(vankus, koruna, vrch, kriz);

  naMiesto(g, p, vyskopis, DLZKA, SIRKA);
  kolizie.pridajObdlznik(p.x, p.z, DLZKA, SIRKA + 3, p.natocenie ?? 0, { typ: 'pamiatka', nazov: p.nazov });
  return { objekt: g };
}
