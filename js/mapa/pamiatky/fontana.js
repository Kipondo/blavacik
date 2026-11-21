// Maximiliánova (Rolandova) fontána na Hlavnom námestí.
// Podľa porovnania so skutočnosťou (docs/porovnanie/opravy.md, etapa 1): okrúhla kamenná nádrž so zdobeným
// okrajom, v strede podstavec s menšou mušľou, zdobený stĺp a navrchu socha rytiera v brnení so štítom.

import * as THREE from 'three';
import { valec, kvader, material } from './pomocne.js';

const KAMEN = '#d3cab6', KAMEN2 = '#c4bba6', SOCHA = '#cfc7b4';

/** Rytier v brnení (low-poly socha, ~2,3 m) – stojí na počiatku, pozerá na +z. */
function rytier() {
  const g = new THREE.Group();
  const m = (geo, f = SOCHA) => { const x = new THREE.Mesh(geo, material(f)); x.castShadow = true; g.add(x); return x; };
  // nohy v brnení
  for (const s of [-1, 1]) {
    const noha = m(new THREE.CylinderGeometry(0.11, 0.13, 0.95, 8));
    noha.position.set(s * 0.15, 0.48, 0);
    const chodidlo = m(new THREE.BoxGeometry(0.16, 0.08, 0.3));
    chodidlo.position.set(s * 0.15, 0.04, 0.05);
  }
  // sukňa brnenia a trup
  const sukna = m(new THREE.CylinderGeometry(0.3, 0.38, 0.35, 10));
  sukna.position.y = 1.05;
  const trup = m(new THREE.CylinderGeometry(0.33, 0.28, 0.65, 10));
  trup.position.y = 1.5;
  const plecia = m(new THREE.BoxGeometry(0.85, 0.18, 0.36));
  plecia.position.y = 1.83;
  // hlava s prilbou a chocholom
  const hlava = m(new THREE.SphereGeometry(0.17, 10, 8));
  hlava.position.y = 2.05;
  const prilba = m(new THREE.CylinderGeometry(0.14, 0.2, 0.2, 10));
  prilba.position.y = 2.14;
  const choch = m(new THREE.ConeGeometry(0.08, 0.3, 6));
  choch.position.set(0, 2.36, -0.05);
  // ruky: pravá drží meč dole, ľavá štít
  const ruka1 = m(new THREE.CylinderGeometry(0.07, 0.08, 0.75, 6));
  ruka1.position.set(0.45, 1.45, 0.05); ruka1.rotation.z = 0.15;
  const mec = m(new THREE.BoxGeometry(0.06, 1.2, 0.02), '#bdb6a6');
  mec.position.set(0.52, 0.9, 0.12);
  const ruka2 = m(new THREE.CylinderGeometry(0.07, 0.08, 0.6, 6));
  ruka2.position.set(-0.42, 1.5, 0.12); ruka2.rotation.x = -0.6;
  const stit = m(new THREE.CylinderGeometry(0.34, 0.34, 0.06, 12));
  stit.rotation.x = Math.PI / 2; stit.scale.set(1, 1, 1.3);
  stit.position.set(-0.46, 1.38, 0.38);
  return g;
}

export default function postav(p, { vyskopis, kolizie }) {
  const g = new THREE.Group();
  const R = 5;
  // nádrž: múrik so zdobeným okrajom a balustrádou
  const murik = valec(R, R + 0.15, 0.7, KAMEN2, 32);
  g.add(murik);
  const okraj = valec(R + 0.25, R + 0.25, 0.18, KAMEN, 32);
  okraj.position.y = 0.7;
  g.add(okraj);
  for (let i = 0; i < 28; i++) {
    const a = (i / 28) * Math.PI * 2;
    const b = valec(0.08, 0.12, 0.45, KAMEN, 6);
    b.position.set(Math.cos(a) * (R + 0.05), 0.88, Math.sin(a) * (R + 0.05));
    g.add(b);
  }
  const madlo = new THREE.Mesh(new THREE.TorusGeometry(R + 0.05, 0.1, 6, 40), material(KAMEN));
  madlo.rotation.x = Math.PI / 2;
  madlo.position.y = 1.36;
  g.add(madlo);
  // voda
  const voda = new THREE.Mesh(new THREE.CircleGeometry(R - 0.05, 32), material('#5c8a97', { lesk: 0.85 }));
  voda.rotation.x = -Math.PI / 2;
  voda.position.y = 0.55;
  g.add(voda);
  // podstavec v strede (osemboký) s menšou mušľou
  const podst = valec(1.15, 1.35, 1.8, KAMEN2, 8);
  podst.position.y = 0.5;
  g.add(podst);
  const musla = valec(1.9, 0.7, 0.55, KAMEN, 16);
  musla.position.y = 2.3;
  g.add(musla);
  // zdobený stĺp: pätka, drieky s prstencami, hlavica
  const patka = valec(0.62, 0.7, 0.5, KAMEN, 12);
  patka.position.y = 2.85;
  g.add(patka);
  const drik = valec(0.4, 0.46, 3.2, KAMEN, 16);
  drik.position.y = 3.35;
  g.add(drik);
  for (const y of [3.9, 4.9, 5.9]) {
    const pr = new THREE.Mesh(new THREE.TorusGeometry(0.46, 0.07, 6, 16), material(KAMEN2));
    pr.rotation.x = Math.PI / 2;
    pr.position.y = y;
    g.add(pr);
  }
  const hlavica = valec(0.75, 0.45, 0.45, KAMEN, 12);
  hlavica.position.y = 6.55;
  g.add(hlavica);
  const doska = kvader(1.3, 0.18, 1.3, KAMEN2);
  doska.position.y = 7.09;
  g.add(doska);
  // socha rytiera navrchu (pozerá do námestia)
  const r = rytier();
  r.position.y = 7.18;
  r.rotation.y = -0.6;
  g.add(r);
  g.position.set(p.x, vyskopis.vyskaTerenu(p.x, p.z), p.z);
  kolizie.pridajKruh(p.x, p.z, R + 0.3, { typ: 'pamiatka', nazov: 'Maximiliánova fontána' });
  return { objekt: g };
}
