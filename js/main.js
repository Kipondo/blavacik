// Štart hry a herná slučka. Meň len minimálne – nové veci patria do modulov (js/moduly.js).

import * as THREE from 'three';
import { KONFIG } from './config.js';
import { Hra } from './jadro/hra.js';
import { Vstup } from './vstup/vstup.js';
import { pripojKlavesnicu } from './vstup/klavesnica.js';
import { pripojDotyk } from './vstup/dotyk.js';
import { vytvorUI } from './ui/hud.js';
import { vytvorMenu } from './ui/menu.js';
import { nacitajDataMapy } from './mapa/nacitaj-mapu.js';
import { postavMapu } from './mapa/mapa.js';
import { vytvorSvet } from './mapa/svet.js';
import moduly from './moduly.js';

const hra = new Hra(THREE);
window.hra = hra; // na ladenie v konzole prehliadača

async function start() {
  const koren = document.getElementById('hra');

  // renderer a scéna
  const renderer = new THREE.WebGLRenderer({ antialias: !KONFIG.JE_DOTYKOVE, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, KONFIG.MAX_PIXEL_RATIO));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = KONFIG.TIENE;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  koren.appendChild(renderer.domElement);

  hra.renderer = renderer;
  hra.scena = new THREE.Scene();
  hra.kamera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.3, 5000);

  // ovládanie a UI
  hra.vstup = new Vstup();
  pripojKlavesnicu(hra.vstup, renderer.domElement);
  hra.ui = vytvorUI(koren);
  if (KONFIG.JE_DOTYKOVE) {
    pripojDotyk(hra.vstup, hra.ui.vrstva);
    hra.vstup.dotyk = true;
  }
  const menu = vytvorMenu(koren, { dotyk: KONFIG.JE_DOTYKOVE });

  window.addEventListener('resize', () => {
    hra.kamera.aspect = window.innerWidth / window.innerHeight;
    hra.kamera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  // mapa
  const svet = vytvorSvet(hra.scena, KONFIG);
  const data = await nacitajDataMapy(KONFIG, menu.priebeh);
  hra.mapa = await postavMapu(data, hra.scena, KONFIG, menu.priebeh);

  // moduly
  menu.priebeh('Pripravujem moduly…');
  for (const m of moduly) hra.pridajModul(m);
  await hra.inicializujModuly();
  aktualizujStav();

  // prvý snímok vykreslíme hneď (za menu je vidieť mesto)
  hra.moduly.find((m) => m.nazov === 'kamera')?.updateVzdy?.(0.016, hra);
  svet.update(hra.stav.pozicia, hra.kamera);
  renderer.render(hra.scena, hra.kamera);

  menu.pripravene(() => {
    hra.pauza(false);
    if (!hra.spustenaUdalost) { hra.spustenaUdalost = true; hra.posli('start'); }
  });

  // herná slučka
  const hodiny = new THREE.Clock();
  renderer.setAnimationLoop(() => {
    const dt = Math.min(hodiny.getDelta(), 0.05); // pri zaseknutí neskáčeme príliš ďaleko

    if (hra.vstup.stlacil('pauza')) {
      if (menu.viditelne && hra.spustenaUdalost) { menu.skry(); hra.pauza(false); }
      else if (!menu.viditelne) { menu.ukaz(); hra.pauza(true); }
    }

    if (!hra.stav.pauza) hra.stav.cas += dt;
    hra.aktualizuj(dt);
    aktualizujStav();
    hra.mapa.update(hra.stav.cas);
    svet.update(hra.stav.pozicia, hra.kamera);
    renderer.render(hra.scena, hra.kamera);
    hra.vstup.koniecSnimku();
  });
}

/** Prepíše do hra.stav polohu a rýchlosť toho, čo hráč práve ovláda. */
function aktualizujStav() {
  const s = hra.stav;
  if (s.auto) {
    s.pozicia.copy(s.auto.pozicia);
    s.uhol = s.auto.uhol;
    s.rychlost = s.auto.rychlostDopredu;
    s.rezim = 'auto';
  } else if (hra.hrac) {
    s.pozicia.copy(hra.hrac.pozicia);
    s.uhol = hra.hrac.uhol;
    s.rychlost = hra.hrac.rychlost;
    s.rezim = 'pesi';
  }
  s.rychlostKmh = Math.abs(s.rychlost) * 3.6;
}

start().catch((e) => {
  console.error(e);
  const stav = document.querySelector('.menu-stav');
  if (stav) { stav.textContent = `Chyba: ${e.message}`; stav.classList.add('chyba'); }
});
