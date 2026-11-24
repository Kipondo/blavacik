// Pomník M. R. Štefánika pri Eurovei (#131, časť 4) – obnovený pomník podľa diela Bohumila Kafku (1938, autor
// zomrel 1942 – dielo je voľné; kópia osadená 2009). Podľa prieskumu (napady/pamiatky-podklady.md):
//   – vysoký hranolový pylón (21,6 m × ~4,25 m × ~3,4 m) obložený svetlým travertínom v mriežke 5 × 17 dosiek,
//   – navrchu bronzový lev (6,4 m dlhý, 4,2 m vysoký so základňou) kráča na východ, ľavou prednou labou sa opiera
//     o šikmý štít na východnom konci, chvost visí cez západný okraj,
//   – ~5 m pred pylónom (k Dunaju) samostatný podstavec 3,44 m (2,8 × 1,9 m) s bronzovou tabuľou a socha letca
//     7,4 m so základnou doskou: kombinéza, kožená prilba s okuliarmi vysunutými na čelo, v pravej ruke zvitok,
//     pravá noha vpredu; pozerá na juh k Dunaju (os ~187°),
//   – nízka kamenná plošina pod oboma.
// Bronz je takmer čierny teplý hnedý (bez zelenej patiny). Nápisy na tabuli sa do hry nedávajú (prázdna tabuľa).
// Všeobecné sochy z OSM na tomto mieste (Štefánik, lev – data/mapa/sochy.json) ustúpia modelu (nahradSochy).
// Záznam: { "model": "stefanik", "x", "z" (stred pylónu), "natocenie" (lokálne +z = smer k soche a Dunaju),
//           "socha": [x, z] (stred podstavca sochy) }

import * as THREE from 'three';
import { kvader, valec, material, naMiesto } from './pomocne.js';
import { nahradSochy, nahradBudovy } from './nahradene-budovy.js';

const BRONZ = '#3d3029';
const TRAVERTIN = '#e4dcd4';
const PLOSINA = 0.15;

/** Travertínové obloženie: dosky v mriežke stĺpcov × riadkov so škárami (CanvasTexture). */
function obklad(stlpce, riadky) {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 512;
  const g = c.getContext('2d');
  const w = c.width / stlpce, h = c.height / riadky;
  for (let r = 0; r < riadky; r++) {
    for (let s = 0; s < stlpce; s++) {
      const odtien = 222 + Math.round(((r * 7 + s * 13) % 9) - 4);
      g.fillStyle = `rgb(${odtien + 6},${odtien},${odtien - 6})`;
      g.fillRect(s * w, r * h, w, h);
    }
  }
  g.strokeStyle = 'rgba(120,110,100,0.55)';
  g.lineWidth = 2;
  for (let s = 0; s <= stlpce; s++) { g.beginPath(); g.moveTo(s * w, 0); g.lineTo(s * w, c.height); g.stroke(); }
  for (let r = 0; r <= riadky; r++) { g.beginPath(); g.moveTo(0, r * h); g.lineTo(c.width, r * h); g.stroke(); }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return new THREE.MeshStandardMaterial({ map: t, roughness: 0.9 });
}

/** Elipsoid (zmenšená guľa) z bronzu. */
function elipsoid(rx, ry, rz, x, y, z) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(1, 18, 12), material(BRONZ, { lesk: 0.35, kov: 0.5 }));
  m.scale.set(rx, ry, rz);
  m.position.set(x, y, z);
  return m;
}

/** Bronzový valec medzi dvoma bodmi. */
function ud(a, b, r1, r2 = r1) {
  const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b);
  const d = A.distanceTo(B);
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r2, r1, d, 10), material(BRONZ, { lesk: 0.35, kov: 0.5 }));
  m.position.copy(A).add(B).multiplyScalar(0.5);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), B.clone().sub(A).normalize());
  return m;
}

/** Lev kráčajúci po +x so štítom na konci; počiatok = stred základne (navrchu pylónu). */
function lev() {
  const g = new THREE.Group();
  const zakl = kvader(5.0, 0.3, 2.2, BRONZ, { lesk: 0.3, kov: 0.5 });
  zakl.position.y = 0.15;
  g.add(zakl);
  const y0 = 0.3;
  g.add(elipsoid(1.9, 0.95, 0.75, -0.4, y0 + 1.95, 0));           // trup
  g.add(elipsoid(1.0, 1.25, 0.95, 1.15, y0 + 2.5, 0));            // hruď a hriva
  g.add(elipsoid(0.62, 0.6, 0.55, 1.95, y0 + 3.15, 0));           // hlava
  const papula = kvader(0.6, 0.42, 0.5, BRONZ, { lesk: 0.35, kov: 0.5 });
  papula.position.set(2.5, y0 + 2.95, 0);
  g.add(papula);
  for (const s of [-1, 1]) g.add(elipsoid(0.16, 0.2, 0.1, 1.85, y0 + 3.65, s * 0.32));   // uši
  // nohy: zadné dve a pravá predná na zemi, ľavá predná zdvihnutá na štíte
  for (const [x, z] of [[-1.7, -0.42], [-1.6, 0.42], [1.25, 0.45]]) {
    g.add(ud([x, y0 + 0.05, z], [x + 0.1, y0 + 1.9, z * 0.8], 0.22, 0.32));
    const laba = elipsoid(0.32, 0.14, 0.24, x + 0.12, y0 + 0.12, z);
    g.add(laba);
  }
  g.add(ud([1.3, y0 + 2.3, -0.45], [2.45, y0 + 1.75, -0.5], 0.3, 0.24));
  g.add(elipsoid(0.3, 0.16, 0.24, 2.55, y0 + 1.72, -0.5));
  // šikmý štít na východnom konci (opretý o labu)
  const stit = kvader(0.18, 1.8, 1.3, BRONZ, { lesk: 0.35, kov: 0.5 });
  stit.position.set(2.75, y0 + 0.9, -0.45);
  stit.rotation.z = -0.32;
  g.add(stit);
  // chvost cez západný okraj
  g.add(ud([-2.15, y0 + 2.3, 0], [-2.85, y0 + 1.6, 0.1], 0.13, 0.11));
  g.add(ud([-2.85, y0 + 1.6, 0.1], [-3.15, y0 + 0.6, 0.15], 0.11, 0.1));
  g.add(elipsoid(0.16, 0.26, 0.16, -3.17, y0 + 0.45, 0.15));
  return g;
}

/** Letec v kombinéze (v ľudskej mierke ~1,78 m, pozerá na +z); pravá strana postavy = −x. */
function letec() {
  const g = new THREE.Group();
  const B = { lesk: 0.35, kov: 0.5 };
  // nohy v kombinéze (pravá vpredu) a čižmy
  for (const [x, z] of [[-0.095, 0.09], [0.095, -0.05]]) {
    g.add(ud([x * 0.9, 0.92, 0], [x, 0.5, z * 0.6], 0.085, 0.075));
    g.add(ud([x, 0.5, z * 0.6], [x, 0.12, z], 0.07, 0.06));
    const cizma = kvader(0.11, 0.13, 0.27, BRONZ, B);
    cizma.position.set(x, 0.065, z + 0.05);
    g.add(cizma);
  }
  // trup: plochší (eliptický prierez), opasok, plecia
  const trup = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.15, 0.56, 14), material(BRONZ, B));
  trup.scale.set(1.15, 1, 0.72);
  trup.position.y = 1.16;
  g.add(trup);
  const opasok = new THREE.Mesh(new THREE.CylinderGeometry(0.155, 0.155, 0.05, 14), material(BRONZ, { lesk: 0.45, kov: 0.5 }));
  opasok.scale.set(1.15, 1, 0.74);
  opasok.position.y = 0.95;
  g.add(opasok);
  g.add(elipsoid(0.215, 0.075, 0.12, 0, 1.42, 0));                 // plecia
  g.add(ud([0, 1.44, 0], [0, 1.53, 0.005], 0.05, 0.045));           // krk s golierom
  // hlava, tesná kožená prilba s klapkami na uši, okuliare vysunuté na čelo
  g.add(elipsoid(0.083, 0.105, 0.095, 0, 1.625, 0.01));
  const prilba = new THREE.Mesh(new THREE.SphereGeometry(0.097, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.52), material(BRONZ, B));
  prilba.scale.set(0.92, 1.08, 1.02);
  prilba.position.set(0, 1.64, 0.0);
  g.add(prilba);
  for (const s of [-1, 1]) g.add(elipsoid(0.02, 0.05, 0.04, s * 0.085, 1.6, 0));     // klapky
  const pas = new THREE.Mesh(new THREE.TorusGeometry(0.094, 0.009, 6, 20), material(BRONZ, B));
  pas.rotation.x = Math.PI / 2 - 0.25;
  pas.position.set(0, 1.705, 0.005);
  g.add(pas);
  for (const s of [-1, 1]) {
    const okuliar = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.024, 0.02, 12), material(BRONZ, { lesk: 0.5, kov: 0.6 }));
    okuliar.rotation.x = Math.PI / 2 - 0.6;
    okuliar.position.set(s * 0.035, 1.715, 0.085);
    g.add(okuliar);
  }
  // pravá ruka (−x) dolu so zvitkom, ľavá pokrčená s rukou pri opasku
  g.add(ud([-0.215, 1.4, 0], [-0.245, 1.13, 0.01], 0.05, 0.047));
  g.add(ud([-0.245, 1.13, 0.01], [-0.24, 0.88, 0.07], 0.043, 0.04));
  g.add(elipsoid(0.035, 0.045, 0.035, -0.24, 0.85, 0.08));
  const zvitok = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.3, 10), material(BRONZ, { lesk: 0.4, kov: 0.5 }));
  zvitok.rotation.x = 0.25;
  zvitok.position.set(-0.24, 0.82, 0.1);
  g.add(zvitok);
  g.add(ud([0.215, 1.4, 0], [0.26, 1.14, -0.02], 0.05, 0.047));
  g.add(ud([0.26, 1.14, -0.02], [0.17, 0.98, 0.09], 0.043, 0.04));
  g.add(elipsoid(0.035, 0.04, 0.035, 0.15, 0.97, 0.1));
  return g;
}

export default function postav(p, { vyskopis, kolizie }) {
  const skupina = new THREE.Group();
  naMiesto(skupina, p, vyskopis, 8, 8);
  const [sx, sz] = p.socha ?? [p.x, p.z + 8.9];
  const dSoch = Math.hypot(sx - p.x, sz - p.z);
  // nízka kamenná plošina pod pylónom aj sochou
  const plosina = kvader(12, PLOSINA, dSoch + 8, '#cdc4b6');
  plosina.position.set(0, PLOSINA / 2 - 0.02, dSoch / 2 + 0.5);
  skupina.add(plosina);
  // pylón s travertínovým obkladom, rímsa navrchu
  const VP = 21.6, SP = 4.25, HP = 3.4;
  const mat = obklad(5, 17);
  const pylon = new THREE.Mesh(new THREE.BoxGeometry(SP, VP, HP), mat);
  pylon.position.y = PLOSINA + VP / 2;
  skupina.add(pylon);
  const rimsa = kvader(SP + 0.3, 0.25, HP + 0.3, TRAVERTIN);
  rimsa.position.y = PLOSINA + VP - 0.12;
  skupina.add(rimsa);
  const sokel = kvader(SP + 0.4, 0.6, HP + 0.4, '#d6cdc2');
  sokel.position.y = PLOSINA + 0.3;
  skupina.add(sokel);
  // bronzová tabuľa na zadnej (severnej) strane pylónu
  const tabula2 = kvader(2.2, 1.4, 0.06, BRONZ, { lesk: 0.35, kov: 0.5 });
  tabula2.position.set(0, PLOSINA + 2.6, -HP / 2 - 0.03);
  skupina.add(tabula2);
  // lev navrchu: kráča na východ (lokálne +x), mierne posunutý, aby chvost a štít presahovali okraje
  const l = lev();
  l.position.set(0.15, PLOSINA + VP, 0);
  skupina.add(l);
  // podstavec sochy (3 × 2 dosky) s prázdnou bronzovou tabuľou na prednej strane
  const VPd = 3.44, SPd = 2.8, HPd = 1.9;
  const podst = new THREE.Mesh(new THREE.BoxGeometry(SPd, VPd, HPd), obklad(3, 2));
  podst.position.set(0, PLOSINA + VPd / 2, dSoch);
  skupina.add(podst);
  const tabula = kvader(1.9, 0.9, 0.05, BRONZ, { lesk: 0.35, kov: 0.5 });
  tabula.position.set(0, PLOSINA + 1.9, dSoch + HPd / 2 + 0.025);
  skupina.add(tabula);
  // socha letca 7,4 m so základnou doskou, pozerá k Dunaju (lokálne +z)
  const doska = kvader(1.8, 0.25, 1.4, BRONZ, { lesk: 0.3, kov: 0.5 });
  doska.position.set(0, PLOSINA + VPd + 0.125, dSoch);
  skupina.add(doska);
  const postava = letec();
  postava.scale.setScalar((7.4 - 0.25) / 1.78);
  postava.position.set(0, PLOSINA + VPd + 0.25, dSoch);
  skupina.add(postava);
  // kolízie (pylón, podstavec) a náhrada všeobecných sôch z OSM
  const uhol = p.natocenie ?? 0;
  kolizie?.pridajObdlznik?.(p.x, p.z, SP + 0.4, HP + 0.4, uhol);
  kolizie?.pridajObdlznik?.(sx, sz, SPd, HPd, uhol);
  const c = Math.cos(uhol), s = Math.sin(uhol);
  const svet = (x, z) => [p.x + x * c + z * s, p.z - x * s + z * c];
  nahradSochy([svet(-6, -4), svet(6, -4), svet(6, dSoch + 4), svet(-6, dSoch + 4)]);
  // laser vidí pylón a sochu ako „stromy“ (21,9 m a 7,1 m) – v pôdoryse pomníka sa nestavajú (budovy tu nie sú)
  nahradBudovy([svet(-3, -2.5), svet(3, -2.5), svet(3, dSoch + 1.5), svet(-3, dSoch + 1.5)], 0.5);
  return { objekt: skupina };
}
