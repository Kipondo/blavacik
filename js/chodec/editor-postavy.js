// Editor postavy (editor-postavy.html): tvar tela a tváre, účes, brada, pleť, vlasy, oblečenie, náhľad animácií.
// Výsledok sa uloží do localStorage a hra ho použije pre Ďoďa.

import * as THREE from 'three';
import { vytvorRealistickuPostavu } from './postava/realisticka-postava.js';
import { nacitajSatnik } from './postava/satnik.js';
import { nacitajUlozenyVzhlad, ulozVzhlad, zmazUlozenyVzhlad } from './postava/ulozenie.js';

const scenaEl = document.getElementById('scena');
const ovladanie = document.getElementById('ovladanie');

// --- 3D scéna ---
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.outputColorSpace = THREE.SRGBColorSpace;
scenaEl.appendChild(renderer.domElement);
const scena = new THREE.Scene();
scena.background = new THREE.Color('#2a3646');
scena.add(new THREE.HemisphereLight('#dfe9f5', '#4a4038', 1.2));
const slnko = new THREE.DirectionalLight('#fff4e6', 2.4);
slnko.position.set(2, 4, 3);
slnko.castShadow = true;
slnko.shadow.mapSize.set(1024, 1024);
Object.assign(slnko.shadow.camera, { left: -1.5, right: 1.5, top: 2.5, bottom: -0.5 });
scena.add(slnko);
const doplnkove = new THREE.DirectionalLight('#9fc3e8', 0.8);
doplnkove.position.set(-3, 2, -2);
scena.add(doplnkove);
const podlaha = new THREE.Mesh(new THREE.CircleGeometry(1.4, 48), new THREE.MeshStandardMaterial({ color: '#3a4656', roughness: 0.95 }));
podlaha.rotation.x = -Math.PI / 2;
podlaha.receiveShadow = true;
scena.add(podlaha);
const kamera = new THREE.PerspectiveCamera(30, 1, 0.05, 30);

const ulozene = nacitajUlozenyVzhlad();
const postava = vytvorRealistickuPostavu(ulozene);
scena.add(postava);

// --- kamera: otáčanie ťahaním (myš aj dotyk), priblíženie na tvár ---
let uhol = 0.35, ciel = { vyska: 1.0, vzdialenost: 4.2 }, akt = { ...ciel };
let tahanie = null;
scenaEl.addEventListener('pointerdown', (e) => { tahanie = e.clientX; scenaEl.setPointerCapture(e.pointerId); });
scenaEl.addEventListener('pointermove', (e) => {
  if (tahanie === null) return;
  uhol -= (e.clientX - tahanie) * 0.01;
  tahanie = e.clientX;
});
scenaEl.addEventListener('pointerup', () => { tahanie = null; });
scenaEl.addEventListener('wheel', (e) => { priblizenie(e.deltaY < 0); e.preventDefault(); }, { passive: false });
function priblizenie(tvar) { ciel = tvar ? { vyska: 1.6, vzdialenost: 1.1 } : { vyska: 1.0, vzdialenost: 4.2 }; }

function velkost() {
  const w = scenaEl.clientWidth, h = scenaEl.clientHeight;
  renderer.setSize(w, h, false);
  kamera.aspect = w / h;
  kamera.updateProjectionMatrix();
}
addEventListener('resize', velkost);
velkost();

const hodiny = new THREE.Clock();
renderer.setAnimationLoop(() => {
  const dt = Math.min(hodiny.getDelta(), 0.05);
  akt.vyska += (ciel.vyska - akt.vyska) * Math.min(1, dt * 6);
  akt.vzdialenost += (ciel.vzdialenost - akt.vzdialenost) * Math.min(1, dt * 6);
  kamera.position.set(Math.sin(uhol) * akt.vzdialenost, akt.vyska + 0.08, Math.cos(uhol) * akt.vzdialenost);
  kamera.lookAt(0, akt.vyska - (akt.vzdialenost > 2 ? 0.05 : 0.02), 0);
  postava.userData.animuj(dt, 0, false);
  renderer.render(scena, kamera);
});

// --- ovládacie prvky z data/postavy/editor.json ---
const [cfg, satnik] = await Promise.all([
  fetch(new URL('../../data/postavy/editor.json', import.meta.url)).then((r) => r.json()),
  nacitajSatnik(),
  postava.userData.pripravena,
]);
document.getElementById('nacitava').remove();

let vzhlad = structuredClone(postava.userData.vzhlad);
let oblecenie = postava.userData.oblecenie;
const aplikuj = () => postava.userData.nastavVzhlad(vzhlad);

function sekcia(nazov) {
  const s = document.createElement('div');
  s.className = 'sekcia';
  s.innerHTML = `<h2>${nazov}</h2>`;
  ovladanie.appendChild(s);
  return s;
}

function volby(rodic, polozky, aktivne, priVybere, trieda = 'volby') {
  const box = document.createElement('div');
  box.className = trieda;
  for (const p of polozky) {
    const b = document.createElement('button');
    b.type = 'button';
    if (p.farba) { b.style.background = p.farba; b.title = p.farba; } else b.textContent = p.nazov;
    if (p.id === aktivne) b.classList.add('aktivne');
    b.onclick = () => {
      box.querySelectorAll('button').forEach((x) => x.classList.remove('aktivne'));
      b.classList.add('aktivne');
      priVybere(p.id);
    };
    box.appendChild(b);
  }
  rodic.appendChild(box);
}

const posuvniky = [];
function vykresliOvladanie() {
  ovladanie.innerHTML = '';
  posuvniky.length = 0;
  const pohlad = sekcia('Pohľad');
  volby(pohlad, [{ id: 'cela', nazov: 'Celá postava' }, { id: 'tvar', nazov: 'Tvár' }], 'cela', (id) => priblizenie(id === 'tvar'));

  const obl = sekcia('Oblečenie');
  volby(obl, Object.entries(satnik.oblecenia).map(([id, o]) => ({ id, nazov: o.nazov })), oblecenie, (id) => {
    oblecenie = id;
    postava.userData.nastavOblecenie(id);
    aplikuj();
  });

  for (const sk of cfg.skupiny) {
    const s = sekcia(sk.nazov);
    for (const p of sk.posuvniky) {
      const r = document.createElement('label');
      r.className = 'riadok';
      r.innerHTML = `<span>${p.nazov}</span><input type="range" min="0" max="1" step="0.01">`;
      const inp = r.querySelector('input');
      inp.value = vzhlad.tvar[p.morph] || 0;
      inp.oninput = () => { vzhlad.tvar[p.morph] = +inp.value; aplikuj(); };
      s.appendChild(r);
      posuvniky.push(inp);
    }
  }
  volby(sekcia('Účes'), cfg.ucesy, vzhlad.ucet, (id) => { vzhlad.ucet = id; aplikuj(); });
  volby(sekcia('Brada'), cfg.brady, vzhlad.brada, (id) => { vzhlad.brada = id; aplikuj(); });
  volby(sekcia('Farba vlasov'), cfg.vlasy.map((f) => ({ id: f, farba: f })), vzhlad.vlasy,
    (id) => { vzhlad.vlasy = id; aplikuj(); }, 'volby farby');
  volby(sekcia('Pleť'), cfg.plet.map((f) => ({ id: f, farba: f })), vzhlad.plet,
    (id) => { vzhlad.plet = id; aplikuj(); }, 'volby farby');
  volby(sekcia('Skúška pohybu'), cfg.animacie, 'stoj', (id) => postava.userData.nastavAnimaciu(id, 0.3));
}
vykresliOvladanie();
window.HOTOVO = true; // pre nástroj na snímky

document.getElementById('povodny').onclick = () => {
  zmazUlozenyVzhlad();
  vzhlad = structuredClone(satnik.predvolenyVzhlad);
  oblecenie = 'klasicky';
  postava.userData.nastavOblecenie(oblecenie);
  aplikuj();
  vykresliOvladanie();
};
document.getElementById('hrat').onclick = () => {
  ulozVzhlad(oblecenie, vzhlad);
  location.href = 'index.html';
};
