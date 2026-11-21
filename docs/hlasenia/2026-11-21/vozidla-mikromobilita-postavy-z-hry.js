import * as THREE from 'three';
import { vytvorRealistickuPostavu } from '../js/chodec/postava/realisticka-postava.js';
import { vytvorNpc, klipyPreModel } from '../js/chodec/npc/model-npc.js';
import { nacitajNpcData, poskladajChodca } from '../js/chodec/npc/profily-npc.js';
import { nacitajSatnik } from '../js/chodec/postava/satnik.js';
import { nacitajGlb } from '../js/chodec/postava/nacitaj-postavu.js';
const KOREN = new URL('../', import.meta.url);
// Náhľad nízkopolygónových modelov mikromobility a kuriérov pre issue #97 (referencia, nie kód hry).

const r = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
r.setPixelRatio(1); r.setSize(innerWidth, innerHeight); r.toneMapping = THREE.ACESFilmicToneMapping;
r.shadowMap.enabled = true; document.body.appendChild(r.domElement);
const sc = new THREE.Scene(); sc.background = new THREE.Color('#EEF2F4');
sc.add(new THREE.HemisphereLight('#FFFFFF', '#B8C0B0', 1.2));
const sun = new THREE.DirectionalLight('#FFF4E0', 2.2); sun.position.set(-4, 8, 6); sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048); Object.assign(sun.shadow.camera, { left: -14, right: 14, top: 10, bottom: -10 }); sc.add(sun);
const zem = new THREE.Mesh(new THREE.PlaneGeometry(60, 40), new THREE.MeshLambertMaterial({ color: '#D8DCD6' }));
zem.rotation.x = -Math.PI / 2; zem.receiveShadow = true; sc.add(zem);

const M = (c) => new THREE.MeshLambertMaterial({ color: c, flatShading: true });
const box = (w, h, d, c, x, y, z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), M(c)); m.position.set(x, y, z); return m; };
const cyl = (rt, rb, h, c, x, y, z, rx = 0, rz = 0, seg = 10) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), M(c)); m.position.set(x, y, z); m.rotation.set(rx, 0, rz); return m; };
const koleso = (rad, sir, x, y, z, c = '#222') => { const g = new THREE.Group(); g.add(cyl(rad, rad, sir, c, 0, 0, 0, 0, Math.PI / 2, 14)); g.add(cyl(rad * 0.45, rad * 0.45, sir + 0.01, '#9AA0A6', 0, 0, 0, 0, Math.PI / 2, 10)); g.position.set(x, y, z); return g; };
const tyc = (a, b, rad, c) => { const v = new THREE.Vector3().subVectors(b, a); const m = new THREE.Mesh(new THREE.CylinderGeometry(rad, rad, v.length(), 6), M(c)); m.position.copy(a).addScaledVector(v, 0.5); m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), v.clone().normalize()); return m; };
const V = (x, y, z) => new THREE.Vector3(x, y, z);

function postava(farbaBundy, sedi = false, batoh = null) {
  const g = new THREE.Group();
  const nohy = '#2B3550', koza = '#E2B79A';
  if (sedi) { g.add(box(0.16, 0.5, 0.18, nohy, -0.1, 0.95, 0.1)); g.add(box(0.16, 0.5, 0.18, nohy, 0.1, 0.95, 0.1)); }
  else { g.add(box(0.16, 0.85, 0.18, nohy, -0.1, 0.43, 0)); g.add(box(0.16, 0.85, 0.18, nohy, 0.1, 0.43, 0)); }
  const y0 = sedi ? 1.1 : 0.86;
  g.add(box(0.46, 0.6, 0.26, farbaBundy, 0, y0 + 0.3, 0));
  g.add(box(0.12, 0.55, 0.13, farbaBundy, -0.3, y0 + 0.32, 0.08)); g.add(box(0.12, 0.55, 0.13, farbaBundy, 0.3, y0 + 0.32, 0.08));
  g.add(box(0.24, 0.26, 0.24, koza, 0, y0 + 0.75, 0)); g.add(box(0.27, 0.12, 0.27, '#3A2A20', 0, y0 + 0.9, 0));
  if (batoh) { g.add(box(0.44, 0.44, 0.36, batoh, 0, y0 + 0.36, -0.32)); g.add(box(0.36, 0.08, 0.3, '#FFFFFF', 0, y0 + 0.46, -0.32)); }
  g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return g;
}

function kolobezka(farba = '#2DBE6C') {
  const g = new THREE.Group();
  g.add(box(0.18, 0.06, 0.95, '#2A2E33', 0, 0.16, 0));
  g.add(koleso(0.11, 0.06, 0, 0.11, 0.48)); g.add(koleso(0.11, 0.06, 0, 0.11, -0.45));
  g.add(tyc(V(0, 0.2, 0.47), V(0, 1.1, 0.52), 0.025, farba));
  g.add(tyc(V(-0.24, 1.1, 0.52), V(0.24, 1.1, 0.52), 0.018, '#2A2E33'));
  g.add(box(0.2, 0.05, 0.5, farba, 0, 0.21, -0.05));
  return g;
}
function bicykel(farba = '#C8102E', elektro = false) {
  const g = new THREE.Group();
  g.add(koleso(0.34, 0.04, 0, 0.34, 0.52)); g.add(koleso(0.34, 0.04, 0, 0.34, -0.52));
  const sed = V(0, 0.92, -0.2), riad = V(0, 1.0, 0.42), osa = V(0, 0.34, 0), pz = V(0, 0.34, -0.52), pp = V(0, 0.34, 0.52);
  for (const [a, b] of [[osa, sed], [osa, riad], [sed, riad], [osa, pz], [sed, pz], [riad, pp]]) g.add(tyc(a, b, 0.025, farba));
  g.add(box(0.12, 0.05, 0.24, '#222', 0, 0.95, -0.22)); g.add(tyc(V(-0.26, 1.02, 0.42), V(0.26, 1.02, 0.42), 0.016, '#222'));
  if (elektro) g.add(box(0.1, 0.14, 0.34, '#3A3F46', 0, 0.62, -0.06));
  return g;
}
function hoverboard() {
  const g = new THREE.Group();
  g.add(box(0.62, 0.09, 0.2, '#2D6BD8', 0, 0.12, 0)); g.add(box(0.08, 0.1, 0.2, '#1E1E1E', 0, 0.13, 0));
  g.add(koleso(0.09, 0.07, 0.36, 0.09, 0, '#222')); g.add(koleso(0.09, 0.07, -0.36, 0.09, 0, '#222'));
  return g;
}
function onewheel() {
  const g = new THREE.Group();
  g.add(box(0.24, 0.05, 0.95, '#2B2B2B', 0, 0.22, 0));
  g.add(koleso(0.15, 0.17, 0, 0.15, 0, '#3A3A3A'));
  g.add(box(0.26, 0.04, 0.3, '#E8A33D', 0, 0.25, 0.3)); g.add(box(0.26, 0.04, 0.3, '#E8A33D', 0, 0.25, -0.3));
  return g;
}
function skuter(farba) {
  const g = new THREE.Group();
  g.add(koleso(0.22, 0.1, 0, 0.22, 0.62)); g.add(koleso(0.22, 0.1, 0, 0.22, -0.55));
  g.add(box(0.36, 0.12, 0.9, '#2A2E33', 0, 0.32, 0)); g.add(box(0.38, 0.45, 0.5, farba, 0, 0.55, -0.35));
  g.add(box(0.4, 0.12, 0.6, '#1E1E1E', 0, 0.82, -0.3)); g.add(box(0.34, 0.8, 0.18, farba, 0, 0.7, 0.55));
  g.add(tyc(V(-0.32, 1.12, 0.6), V(0.32, 1.12, 0.6), 0.02, '#222'));
  return g;
}
function taxi(farba, nazov) {
  const g = new THREE.Group();
  g.add(box(1.8, 0.6, 4.3, '#ECEFF1', 0, 0.62, 0)); g.add(box(1.6, 0.55, 2.2, '#ECEFF1', 0, 1.18, -0.2));
  g.add(box(1.62, 0.42, 2.0, '#2E4452', 0, 1.2, -0.2));
  g.add(box(1.82, 0.22, 2.4, farba, 0, 0.7, 0));
  g.add(box(0.6, 0.2, 0.3, farba, 0, 1.56, -0.2));
  for (const [x, z] of [[-0.82, 1.35], [0.82, 1.35], [-0.82, -1.35], [0.82, -1.35]]) g.add(koleso(0.34, 0.24, x, 0.34, z));
  const cv = document.createElement('canvas'); cv.width = 256; cv.height = 64; const c = cv.getContext('2d');
  c.fillStyle = farba; c.fillRect(0, 0, 256, 64); c.fillStyle = '#fff'; c.font = 'bold 40px sans-serif'; c.textAlign = 'center'; c.fillText(nazov, 128, 46);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace;
  const tab = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 0.35), new THREE.MeshBasicMaterial({ map: t }));
  tab.position.set(0.915, 0.7, 0); tab.rotation.y = Math.PI / 2; g.add(tab);
  return g;
}
function pridaj(o, x, z, ry = -0.5) { o.position.set(x, 0, z); o.rotation.y = ry; o.traverse((m) => { if (m.isMesh) m.castShadow = true; }); sc.add(o); return o; }

const HLADOS = '#009DE0', FICAK = '#2DBE6C';
// rad 1: vozidlá samotné
pridaj(kolobezka(FICAK), -9, -3); pridaj(bicykel('#C8102E'), -6.5, -3); pridaj(bicykel('#3A6EA5', true), -4, -3);
pridaj(hoverboard(), -1.8, -3); pridaj(onewheel(), 0, -3); pridaj(skuter(HLADOS), 2.4, -3);
pridaj(taxi(HLADOS, 'HLADOŠ'), 6.0, -4.2, -0.9); pridaj(taxi(FICAK, 'FIČÁK'), 9.6, -4.2, -0.9);
// rad 2: jazdci – skutočné postavy z hry (Ďoďo cez vytvorRealistickuPostavu, NPC cez vytvorNpc a profily z data/postavy/npc.json)
function osad(obj, nadZemou, rodic, x, z, ry) {
  obj.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.frustumCulled = false; } });
  rodic.add(obj); obj.position.set(x, 0, z); obj.rotation.y = ry; obj.updateMatrixWorld(true);
  const bx = new THREE.Box3().setFromObject(obj); const wp = new THREE.Vector3(); rodic.getWorldPosition(wp);
  obj.position.y = nadZemou - (bx.min.y - wp.y);
}
async function npc(data, profil, semienko, poza, cas, nadZemou, rodic, x = 0, z = 0, ry = 0) {
  const spec = poskladajChodca(data, { profil, semienko });
  const n = await vytvorNpc(spec, data);
  const url = new URL(spec.url, KOREN).href;
  const klipy = await klipyPreModel(url, await nacitajGlb(url));
  const mx = new THREE.AnimationMixer(n.koren.children[0]);
  mx.clipAction(klipy.find((k) => k.name === poza)).play(); mx.update(cas);
  osad(n.koren, nadZemou, rodic, x, z, ry); return n;
}
async function dodo(oblecenie, poza, cas, nadZemou, rodic, x = 0, z = 0, ry = 0) {
  const g = vytvorRealistickuPostavu({ oblecenie }); await g.userData.pripravena;
  g.userData.animacie.hraj(poza, 0); g.userData.mixer.update(cas);
  osad(g, nadZemou, rodic, x, z, ry); return g;
}
(async () => {
  const data = await nacitajNpcData();
  const k1 = pridaj(kolobezka('#2A2E33'), -9, 2);
  const b1 = pridaj(bicykel('#2A2E33'), -6.3, 2); b1.add(box(0.42, 0.42, 0.36, HLADOS, 0, 1.45, -0.5));
  const b2 = pridaj(bicykel('#3A3F46', true), -3.6, 2); b2.add(box(0.42, 0.42, 0.36, FICAK, 0, 1.45, -0.5));
  const h1 = pridaj(hoverboard(), -1.2, 2);
  const o1 = pridaj(onewheel(), 0.9, 2);
  const s1 = pridaj(skuter(FICAK), 3.4, 2); s1.add(box(0.42, 0.42, 0.36, FICAK, 0, 1.55, -0.62));
  await Promise.all([
    npc(data, 'studentka', 3, 'stoj', 0.5, 0.24, k1),
    npc(data, 'kurier', 1, 'sedenie', 0.6, 0.18, b1, 0, -0.12),
    npc(data, 'kurier', 7, 'sedenie', 0.6, 0.18, b2, 0, -0.12),
    npc(data, 'student', 5, 'stoj', 0.5, 0.17, h1),
    npc(data, 'korporat', 2, 'stoj', 0.5, 0.27, o1, 0, 0, Math.PI / 2.3),
    dodo('kurier', 'sedenie', 0.6, 0.3, s1, 0, -0.2),
    npc(data, 'dochodkyna', 4, 'mavanie', 0.6, 0, sc, 7.6, -1.6, -0.4),
    npc(data, 'dochodca', 6, 'stoj', 0.5, 0, sc, -11.5, 1.2, 0.5),
  ]);
  r.render(sc, kam); document.body.dataset.hotovo = '1';
})().catch((e) => { console.error('CHYBA', e?.stack || e); document.body.dataset.hotovo = '1'; });

const kam = new THREE.PerspectiveCamera(33, innerWidth / innerHeight, 0.1, 200);
kam.position.set(-1.2, 6.2, 18.5); kam.lookAt(-1.2, 0.7, -0.8);
r.render(sc, kam);
