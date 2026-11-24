// Plávajúci pontón (prístavisko lodí) pri brehu Dunaja – #131, Eurovea – nábrežie.
// Oceľový trup na hladine, plochá paluba s nízkym zábradlím na strane rieky, nadstavba (kajuta) a šikmá lávka
// na breh. Bez nápisov a čísel kotvísk. Rozmery a polohy z OSM (napady/pamiatky-podklady.md).
// Záznam v data/mapa/pamiatky.json:
//   { "model": "ponton", "nazov": "…", "x", "z" (stred), "natocenie" (smer dlhej osi, rad), "dlzka", "sirka",
//     "trup": "#farba", "paluba": "#farba", "nadstavba": { "dlzka", "sirka", "vyska", "posun", "farba" } (nepovinná),
//     "lavka": [[x, z] na brehu, [x, z] na pontóne] (nepovinná) }

import * as THREE from 'three';
import { kvader, material, tram } from './pomocne.js';

const PONOR = 1.1;      // m – trup pod hladinou
const NAD = 0.9;        // m – paluba nad hladinou

export default function postav(p, { vyskopis, kolizie }) {
  const svet = new THREE.Group();
  const hladina = vyskopis.hladina?.(p.x, p.z) ?? 0;
  const g = new THREE.Group();
  g.position.set(p.x, hladina, p.z);
  g.rotation.y = p.natocenie ?? 0;
  svet.add(g);
  const L = p.dlzka ?? 30, W = p.sirka ?? 6;
  // trup: oceľový kváder (pontóny sú hranaté), svetlý pás nad vodoryskou a paluba
  const trup = kvader(L, PONOR + NAD, W, p.trup ?? '#2b2b2d', { lesk: 0.3, kov: 0.4 });
  trup.position.y = (NAD - PONOR) / 2;
  g.add(trup);
  const pas = kvader(L + 0.04, 0.18, W + 0.04, '#b9b4aa');
  pas.position.y = NAD - 0.5;
  g.add(pas);
  const paluba = kvader(L - 0.2, 0.06, W - 0.2, p.paluba ?? '#6f6c66');
  paluba.position.y = NAD + 0.03;
  g.add(paluba);
  // zábradlie na strane rieky a na koncoch (biele)
  const BIELA = '#e9e7e1';
  const zabr = (a, b) => {
    g.add(tram([a[0], NAD + 1.0, a[1]], [b[0], NAD + 1.0, b[1]], 0.05, BIELA));
    g.add(tram([a[0], NAD + 0.5, a[1]], [b[0], NAD + 0.5, b[1]], 0.03, BIELA));
    const d = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.max(1, Math.round(d / 1.5));
    for (let k = 0; k <= n; k++) {
      const x = a[0] + (b[0] - a[0]) * k / n, z = a[1] + (b[1] - a[1]) * k / n;
      g.add(tram([x, NAD, z], [x, NAD + 1.0, z], 0.04, BIELA));
    }
  };
  // natočenie dlhej osi pozdĺž brehu (+x) → lokálne +z smeruje k rieke (na juh), breh je na −z
  const x0 = -(L - 0.4) / 2, x1 = (L - 0.4) / 2, zr = W / 2 - 0.15;
  zabr([x0, zr], [x1, zr]);
  zabr([x0, zr], [x0, -zr]);
  zabr([x1, zr], [x1, -zr]);
  // uväzovacie stĺpiky na strane brehu
  for (let k = 0; k < 4; k++) {
    const st = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.17, 0.5, 10), material('#3a3a3c', { kov: 0.5 }));
    st.position.set(x0 + 1 + k * (x1 - x0 - 2) / 3, NAD + 0.25, -(W / 2 - 0.4));
    g.add(st);
  }
  // nadstavba (kajuta) s oknami
  if (p.nadstavba) {
    const n = p.nadstavba;
    const kab = kvader(n.dlzka, n.vyska, n.sirka, n.farba ?? '#e6dfcf');
    kab.position.set(n.posun ?? 0, NAD + n.vyska / 2, 0);
    g.add(kab);
    const strecha = kvader(n.dlzka + 0.5, 0.15, n.sirka + 0.5, '#d4cfc4');
    strecha.position.set(n.posun ?? 0, NAD + n.vyska + 0.07, 0);
    g.add(strecha);
    for (const s of [-1, 1]) {
      const pocet = Math.max(1, Math.floor(n.dlzka / 1.8));
      for (let k = 0; k < pocet; k++) {
        const okno = kvader(1.1, 0.8, 0.04, '#3e4a52', { lesk: 0.7 });
        okno.position.set((n.posun ?? 0) - n.dlzka / 2 + (k + 0.5) * n.dlzka / pocet, NAD + n.vyska * 0.62, s * (n.sirka / 2 + 0.02));
        g.add(okno);
      }
    }
  }
  kolizie?.pridajObdlznik?.(p.x, p.z, L, W, p.natocenie ?? 0);
  // lávka na breh: šikmá kovová lávka s bielym zábradlím od brehu na palubu
  if (p.lavka) {
    const [[bx, bz], [px, pz]] = p.lavka;
    const hB = (vyskopis.vyskaTerenu ?? vyskopis.vyska)(bx, bz) + 0.05, hP = hladina + NAD + 0.05;
    const d = Math.hypot(px - bx, pz - bz), ux = (px - bx) / d, uz = (pz - bz) / d, nx = -uz, nz = ux;
    const lavka = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.12, d), material('#7d7a74', { kov: 0.4 }));
    lavka.position.set((bx + px) / 2, (hB + hP) / 2, (bz + pz) / 2);
    lavka.lookAt(px, hP, pz);
    svet.add(lavka);
    for (const s of [-1, 1]) {
      const o = s * 0.8;
      svet.add(tram([bx + nx * o, hB + 1.0, bz + nz * o], [px + nx * o, hP + 1.0, pz + nz * o], 0.05, BIELA));
      const n = Math.max(1, Math.round(d / 2));
      for (let k = 0; k <= n; k++) {
        const t = k / n, x = bx + (px - bx) * t + nx * o, z = bz + (pz - bz) * t + nz * o, y = hB + (hP - hB) * t;
        svet.add(tram([x, y, z], [x, y + 1.0, z], 0.04, BIELA));
      }
    }
  }
  return { objekt: svet };
}
