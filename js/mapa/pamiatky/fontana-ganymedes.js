// Ganymedova fontána pred historickou budovou SND (Viktor Tilgner, 1888) – podľa prieskumu
// (napady/pamiatky-podklady.md, „SND – historická budova“, kap. Ganymedova fontána):
//  - dolná kruhová nádrž ⌀ ≈ 7 m so zaobleným kamenným obrubníkom a stupňom okolo,
//  - v strede kamenný podstavec so 4 bronzovými deťmi s rybami,
//  - plytká horná kamenná misa ⌀ ≈ 4,3 m s okrajom vo výške ≈ 3,2 m, nad ňou baluster,
//  - navrchu bronzový Ganymedes na orlovi s roztiahnutými krídlami (≈ 6 m), zdvihnutá miska ≈ 6,6 m.
// Krídla orla sú naprieč osou divadla. Pôdorys sa zaregistruje ako nahradený – laser zo súsošia
// inak spravil korunu stromu priamo vo fontáne.

import * as THREE from 'three';
import { valec, kvader, material } from './pomocne.js';
import { nahradBudovy } from './nahradene-budovy.js';

const KAMEN = '#cfc6b4', KAMEN2 = '#bdb4a1', BRONZ = '#4a4a3c', VODA = '#5c8a97';
// natočenie súsošia: krídla kolmo na os SND (os má v hre smer (0,860; −0,511))
const NATOCENIE = 2.106;

function prstenec(r, hrubka, y, farba) {
  const m = new THREE.Mesh(new THREE.TorusGeometry(r, hrubka, 6, 48), material(farba));
  m.rotation.x = -Math.PI / 2;
  m.position.y = y;
  m.castShadow = m.receiveShadow = true;
  return m;
}

function hladina(r, y) {
  const m = new THREE.Mesh(new THREE.CircleGeometry(r, 40), material(VODA, { lesk: 0.85 }));
  m.rotation.x = -Math.PI / 2;
  m.position.y = y;
  return m;
}

function pridaj(g, mesh, x, y, z, rot = null) {
  mesh.position.set(x, y, z);
  if (rot) mesh.rotation.set(...rot);
  g.add(mesh);
  return mesh;
}

export default function postav(p, { vyskopis, kolizie }) {
  const g = new THREE.Group();
  const R = 3.5;
  // stupeň okolo, nádrž so zaobleným obrubníkom, hladina
  pridaj(g, valec(R + 0.55, R + 0.6, 0.12, KAMEN2, 40), 0, 0, 0);
  pridaj(g, valec(R, R + 0.05, 0.48, KAMEN2, 40), 0, 0, 0);
  g.add(prstenec(R - 0.02, 0.17, 0.5, KAMEN));
  g.add(hladina(R - 0.15, 0.4));
  // podstavec v strede: nízky sokel vo vode, osemboký driek
  pridaj(g, valec(1.25, 1.3, 0.38, KAMEN2, 8), 0, 0.2, 0);
  pridaj(g, valec(0.72, 0.9, 1.25, KAMEN2, 8), 0, 0.55, 0);
  // 4 bronzové deti s dunajskými rybami na sokli
  for (let k = 0; k < 4; k++) {
    const a = NATOCENIE + Math.PI / 4 + (k * Math.PI) / 2;
    const cx = Math.cos(a) * 0.98, cz = -Math.sin(a) * 0.98;
    pridaj(g, valec(0.14, 0.2, 0.5, BRONZ, 7), cx, 0.58, cz);
    pridaj(g, new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 6), material(BRONZ)), cx, 1.18, cz);
    const ryba = pridaj(g, kvader(0.55, 0.13, 0.17, BRONZ), cx * 1.12, 0.72, cz * 1.12);
    ryba.rotation.set(0, a + Math.PI / 2, 0.45);
  }
  // driek, plytká horná misa s vodou a baluster
  pridaj(g, valec(0.42, 0.55, 1.0, KAMEN, 12), 0, 1.8, 0);
  pridaj(g, valec(2.15, 0.65, 0.42, KAMEN, 28), 0, 2.78, 0);
  g.add(prstenec(2.12, 0.07, 3.19, KAMEN));
  g.add(hladina(2.02, 3.12));
  pridaj(g, valec(0.3, 0.42, 0.45, KAMEN, 12), 0, 3.15, 0);
  pridaj(g, valec(0.4, 0.26, 0.45, KAMEN, 12), 0, 3.6, 0);
  pridaj(g, valec(0.45, 0.45, 0.16, KAMEN, 12), 0, 4.05, 0);
  // bronzové súsošie: orol s roztiahnutými krídlami a Ganymedes so zdvihnutou miskou
  const s = new THREE.Group();
  s.position.y = 4.21;
  s.rotation.y = NATOCENIE;
  pridaj(s, kvader(0.5, 0.5, 0.95, BRONZ), 0, 0.3, 0);                       // telo orla
  pridaj(s, kvader(0.2, 0.24, 0.34, BRONZ), 0, 0.62, 0.55);                  // hlava orla
  pridaj(s, kvader(1.15, 0.09, 0.6, BRONZ), -0.68, 1.05, -0.05, [0, 0, 0.62]); // krídla
  pridaj(s, kvader(1.15, 0.09, 0.6, BRONZ), 0.68, 1.05, -0.05, [0, 0, -0.62]);
  pridaj(s, kvader(0.1, 0.45, 0.1, BRONZ), -0.2, 0.62, -0.1, [0, 0, 0.3]);   // nohy chlapca
  pridaj(s, kvader(0.1, 0.45, 0.1, BRONZ), 0.2, 0.62, -0.1, [0, 0, -0.3]);
  pridaj(s, valec(0.15, 0.19, 0.72, BRONZ, 8), 0, 0.78, -0.12);              // trup
  pridaj(s, new THREE.Mesh(new THREE.SphereGeometry(0.14, 10, 8), material(BRONZ)), 0, 1.66, -0.12);
  pridaj(s, kvader(0.09, 0.72, 0.09, BRONZ), 0.2, 1.82, -0.1, [0, 0, -0.25]); // zdvihnutá ruka
  pridaj(s, valec(0.14, 0.06, 0.09, BRONZ, 10), 0.3, 2.2, -0.1);             // miska (≈ 6,6 m)
  g.add(s);
  g.position.set(p.x, vyskopis.vyskaTerenu(p.x, p.z), p.z);
  g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  kolizie.pridajKruh(p.x, p.z, R + 0.2, { typ: 'pamiatka', nazov: p.nazov });
  // bez stromu z lasera (koruna zo súsošia) a bez bežných prvkov v pôdoryse fontány
  const kruh = [];
  for (let k = 0; k < 16; k++) kruh.push([p.x + Math.cos((k / 16) * Math.PI * 2) * (R + 0.6), p.z + Math.sin((k / 16) * Math.PI * 2) * (R + 0.6)]);
  nahradBudovy(kruh, 0.5);
  return { objekt: g };
}
