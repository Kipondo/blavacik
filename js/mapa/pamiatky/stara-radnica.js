// Stará radnica – skupina budov okolo nádvoria na Hlavnom námestí.
// Podľa porovnania so skutočnosťou (docs/porovnanie/opravy.md, etapa 1):
//   veža je štvorhranná po celej výške, okrovožltá, s hodinami, pod strechou vyhliadková galéria s balustrádou,
//   navrchu barokový medený (zelený) cibuľovitý helm s lucernou a hrotom;
//   krídlo k námestiu je svetlé, so strmou strechou s vikiermi, v prízemí oblúková brána, gotický arkier;
//   strecha má farebnú glazovanú škridlu so vzorom.

import * as THREE from 'three';
import { fasada, valbovaStrecha, valec, kvader, material, naMiesto, vikier } from './pomocne.js';

const OKROVA = '#e3c06f', BIELA = '#f3f0e7', MED = '#5c8f7b', KAMEN = '#cfc6b2';

/** Strecha s farebnou glazovanou škridlou (vzor kosoštvorcov) – vlastná textúra. */
let texStrechy = null;
function textura() {
  if (texStrechy) return texStrechy;
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = '#7a3524'; g.fillRect(0, 0, 128, 128);
  const farby = ['#3f6b3a', '#c99a2e', '#7a3524', '#2f4f5a'];
  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      // kosoštvorcový vzor z farebných škridiel
      const k = (Math.abs(((x + y) % 8) - 4) + Math.abs(((x - y + 64) % 8) - 4)) % 4;
      g.fillStyle = farby[k];
      g.beginPath(); g.ellipse(x * 8 + 4, y * 8 + 5, 3.6, 4.2, 0, 0, Math.PI * 2); g.fill();
    }
  }
  texStrechy = new THREE.CanvasTexture(c);
  texStrechy.wrapS = texStrechy.wrapT = THREE.RepeatWrapping;
  texStrechy.colorSpace = THREE.SRGBColorSpace;
  return texStrechy;
}

/** Valbová strecha s textúrou glazovanej škridly (UV podľa polohy v metroch). */
function farebnaStrecha(w, h, d) {
  const s = valbovaStrecha(w, h, d, '#ffffff');
  const geo = s.geometry, p = geo.attributes.position;
  const uv = new Float32Array(p.count * 2);
  for (let i = 0; i < p.count; i++) { uv[i * 2] = (p.getX(i) + p.getZ(i)) / 4; uv[i * 2 + 1] = p.getY(i) / 3; }
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  s.material = new THREE.MeshStandardMaterial({ map: textura(), roughness: 0.45, metalness: 0.05 });
  return s;
}

/** Hodiny (ciferník) na stene veže. */
function hodiny() {
  const g = new THREE.Group();
  const c = new THREE.Mesh(new THREE.CircleGeometry(1.2, 24), material('#f6f1e2'));
  const ram = new THREE.Mesh(new THREE.RingGeometry(1.2, 1.38, 24), material('#2b2b2b'));
  const r1 = kvader(0.08, 0.95, 0.04, '#1d1d1d'); r1.position.set(0, 0.42, 0.03); r1.rotation.z = 0.5;
  const r2 = kvader(0.1, 0.6, 0.04, '#1d1d1d'); r2.position.set(0.18, -0.2, 0.03); r2.rotation.z = -2.1;
  g.add(c, ram, r1, r2);
  return g;
}

export default function postav(p, { vyskopis, kolizie }) {
  const W = 52, D = 44, H = 13;
  const g = new THREE.Group();
  // krídla okolo nádvoria (predné krídlo je na lokálnej strane +z – k námestiu)
  const kridla = [
    [0, D / 2 - 7, W, 14, BIELA, true],
    [0, -D / 2 + 7, W, 14, '#efe6d2', false],
    [-W / 2 + 7, 0, 14, D - 28, '#efe4cc', false],
    [W / 2 - 7, 0, 14, D - 28, '#ece0c4', false],
  ];
  for (const [x, z, w, d, f, predne] of kridla) {
    const k = fasada(w, H, d, f, { okno: [3.4, 4.3] });
    k.position.set(x, H / 2, z);
    g.add(k);
    // strmá strecha; predné krídlo s farebnou glazovanou škridlou
    const s = predne ? farebnaStrecha(w + 1, 10, d + 1) : valbovaStrecha(w + 1, 8, d + 1, '#8f4a2f');
    s.position.set(x, H, z);
    g.add(s);
  }
  // rad vikierov na prednom krídle (do námestia)
  for (let i = 0; i < 7; i++) {
    const v = vikier({ stena: BIELA, strecha: '#7a3524' });
    v.position.set(-1 + i * 3.6, H + 1.0, D / 2 - 1.0);
    g.add(v);
  }
  // gotický arkier na prvom poschodí predného krídla
  const arkier = valec(1.6, 1.6, 4.2, '#efe8d8', 6);
  arkier.position.set(16, 5.2, D / 2 + 0.6);
  g.add(arkier);
  const arkierKonzola = valec(1.6, 0.4, 1.4, KAMEN, 6);
  arkierKonzola.position.set(16, 3.8, D / 2 + 0.6);
  g.add(arkierKonzola);
  const arkierStrecha = valec(0.05, 1.8, 2.6, '#7a3524', 6);
  arkierStrecha.position.set(16, 9.4, D / 2 + 0.6);
  g.add(arkierStrecha);

  // veža – štvorhranná po celej výške, okrovožltá
  const vx = -8, vz = D / 2 - 4, S = 8.5, VH = 33;
  const veza = fasada(S, VH, S, OKROVA, { okno: [S / 2, 5.5], strecha: OKROVA });
  veza.position.set(vx, VH / 2, vz);
  g.add(veza);
  // nárožné kvádre a rímsy veže
  for (const y of [12.5, 24, VH - 0.3]) {
    const r = kvader(S + 0.6, 0.45, S + 0.6, '#f2e6c4');
    r.position.set(vx, y, vz);
    g.add(r);
  }
  // oblúková brána v prízemí veže (prejazd na nádvorie)
  const brana = kvader(4.2, 4.6, 0.3, '#2a2420');
  brana.position.set(vx, 2.3, vz + S / 2 + 0.05);
  g.add(brana);
  const oblukG = new THREE.CylinderGeometry(2.1, 2.1, 0.3, 16, 1, false, 0, Math.PI);
  oblukG.rotateX(Math.PI / 2); oblukG.rotateZ(Math.PI / 2);
  const oblukM = new THREE.Mesh(oblukG, material('#2a2420'));
  oblukM.position.set(vx, 4.6, vz + S / 2 + 0.05);
  g.add(oblukM);
  // hodiny na troch stranách
  for (const [dx, dz, r] of [[0, 1, 0], [1, 0, Math.PI / 2], [-1, 0, -Math.PI / 2]]) {
    const h = hodiny();
    h.position.set(vx + dx * (S / 2 + 0.05), VH - 4.5, vz + dz * (S / 2 + 0.05));
    h.rotation.y = r;
    g.add(h);
  }
  // galéria s balustrádou
  const podlaha = kvader(S + 1.6, 0.35, S + 1.6, KAMEN);
  podlaha.position.set(vx, VH + 0.15, vz);
  g.add(podlaha);
  const zabradlie = kvader(S + 1.6, 0.12, S + 1.6, KAMEN);
  zabradlie.position.set(vx, VH + 1.25, vz);
  g.add(zabradlie);
  for (let i = 0; i <= 8; i++) {
    for (const [ax, az] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const t = (i / 8 - 0.5) * (S + 1.4);
      const st = valec(0.09, 0.11, 1.0, KAMEN, 6);
      st.position.set(vx + (ax ? ax * (S / 2 + 0.7) : t), VH + 0.3, vz + (az ? az * (S / 2 + 0.7) : t));
      g.add(st);
    }
  }
  // nadstavec nad galériou a barokový medený helm: cibuľa – lucerna – malá cibuľa – hrot s krížom
  const nad = fasada(S - 1.6, 3.2, S - 1.6, OKROVA, { okno: [2.4, 3.2], strecha: MED });
  nad.position.set(vx, VH + 1.6, vz);
  g.add(nad);
  const zaklHelmu = valec(3.2, 4.4, 1.2, MED, 8, { lesk: 0.35, kov: 0.25 });
  zaklHelmu.position.set(vx, VH + 3.2, vz);
  g.add(zaklHelmu);
  const cibula = new THREE.Mesh(new THREE.SphereGeometry(2.9, 16, 12), material(MED, { lesk: 0.35, kov: 0.25 }));
  cibula.scale.set(1, 1.15, 1);
  cibula.position.set(vx, VH + 6.4, vz);
  cibula.castShadow = true;
  g.add(cibula);
  const krk = valec(0.7, 1.4, 1.4, MED, 8, { lesk: 0.35, kov: 0.25 });
  krk.position.set(vx, VH + 9.3, vz);
  g.add(krk);
  const lucerna = valec(0.9, 0.9, 2.0, '#f1ead8', 8);
  lucerna.position.set(vx, VH + 10.6, vz);
  g.add(lucerna);
  const cibula2 = new THREE.Mesh(new THREE.SphereGeometry(1.15, 12, 10), material(MED, { lesk: 0.35, kov: 0.25 }));
  cibula2.scale.set(1, 1.2, 1);
  cibula2.position.set(vx, VH + 13.3, vz);
  g.add(cibula2);
  const hrot = valec(0.04, 0.35, 3.2, '#c9a54a', 6, { kov: 0.8, lesk: 0.6 });
  hrot.position.set(vx, VH + 14.4, vz);
  g.add(hrot);
  const kriz = kvader(0.9, 0.12, 0.12, '#c9a54a', { kov: 0.8, lesk: 0.6 });
  kriz.position.set(vx, VH + 16.9, vz);
  g.add(kriz);

  naMiesto(g, p, vyskopis, W, D);
  kolizie.pridajObdlznik(p.x, p.z, W, D, p.natocenie ?? 0, { typ: 'pamiatka', nazov: p.nazov });
  return { objekt: g };
}
