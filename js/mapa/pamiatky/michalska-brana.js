// Michalská brána – štíhla veža (51 m) s cibuľovitou medenou strechou
// a sochou sv. Michala navrchu. Dolná časť má priechod.
// Model je z Blendera (tools/blender/michalska_brana.py → assets/pamiatky/michalska-brana.glb so zapečeným AO);
// ak sa nenačíta, postaví sa jednoduchý model z telies nižšie.

import * as THREE from 'three';
import { fasada, kvader, valec, material, naMiesto } from './pomocne.js';
import { nacitajModelPamiatky } from './model-glb.js';

const OMIETKA = '#f0e6cf';
const MED = '#5f9a84';

export default async function postav(p, { vyskopis, kolizie }) {
  const S = 8.5;
  const model = await nacitajModelPamiatky('michalska-brana');
  const g = model ?? jednoduchyModel(S);
  naMiesto(g, p, vyskopis, S, S);
  // kolízia len pre piliere – priechod (pozdĺž lokálnej osi z) je voľný
  const u = p.natocenie ?? 0;
  const ox = Math.cos(u), oz = -Math.sin(u); // lokálna os x vo svete
  for (const s of [-1, 1]) {
    kolizie.pridajObdlznik(p.x + ox * s * (S / 2 - 1.1), p.z + oz * s * (S / 2 - 1.1), 2.2, S, u, { typ: "pamiatka" });
  }
  return { objekt: g };
}

/** Pôvodný model z jednoduchých telies (záloha, keď sa .glb nenačíta). */
function jednoduchyModel(S) {
  const g = new THREE.Group();
  // spodná časť s priechodom (dva piliere + preklad)
  for (const s of [-1, 1]) {
    const pil = kvader(2.2, 6, S, '#d9cdb2');
    pil.position.set(s * (S / 2 - 1.1), 3, 0);
    g.add(pil);
  }
  const preklad = fasada(S, 16, S, '#e6dcc4', { okno: [4, 6] });
  preklad.position.y = 6 + 8;
  g.add(preklad);
  const horna = fasada(S - 0.8, 10, S - 0.8, OMIETKA, { okno: [3, 5] });
  horna.position.y = 22 + 5;
  g.add(horna);
  // hodiny
  for (const r of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) {
    const h = new THREE.Mesh(new THREE.CircleGeometry(1.2, 16), material('#ffffff'));
    h.position.set(Math.sin(r) * (S / 2 - 0.35), 29, Math.cos(r) * (S / 2 - 0.35));
    h.rotation.y = r;
    g.add(h);
  }
  // cibuľovitá strecha s lucernou
  const zaklad = valec(S * 0.62, S * 0.62, 1.2, '#e8dfca', 8);
  zaklad.position.y = 32;
  g.add(zaklad);
  const cibula = new THREE.Mesh(new THREE.SphereGeometry(S * 0.55, 12, 10), material(MED, { lesk: 0.3 }));
  cibula.scale.set(1, 0.85, 1);
  cibula.position.y = 36;
  g.add(cibula);
  const lucerna = valec(1.0, 1.0, 3, '#e8dfca', 8);
  lucerna.position.y = 39.5;
  g.add(lucerna);
  const ihla = valec(0.05, 1.3, 7, MED, 8);
  ihla.position.y = 42.5;
  g.add(ihla);
  const socha = new THREE.Mesh(new THREE.ConeGeometry(0.5, 2.4, 6), material('#c9a54a', { kov: 0.8, lesk: 0.6 }));
  socha.position.y = 50.5;
  g.add(socha);

  return g;
}
