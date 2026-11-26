// Prezerač nového modelu mesta (samostatný, mimo hry). Varianty (?v=1…4 alebo tlačidlá / klávesy 1–4):
//   1 – len terén (laser DMR 0,5 m),
//   2 – terén + budovy (jednoduché sivé hranoly),
//   3 – terén + budovy + cesty, chodníky a plochy nalepené na terén,
//   4 – všetko: navyše mosty a nadjazdy, voda, stromy.
// Bez textúr – len jednoduché farby (legenda v paneli).

import * as THREE from 'three';
import { Teren } from './teren.js';
import { Ovladanie } from './ovladanie.js';
import { nacitajBudovy } from './budovy.js';
import { nacitajMosty } from './mosty.js';
import { nacitajStromy } from './stromy.js';
import { LEGENDA } from './farby.js';

const renderer = new THREE.WebGLRenderer({ antialias: true, logarithmicDepthBuffer: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(Math.min(2, devicePixelRatio));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

const scena = new THREE.Scene();
scena.background = new THREE.Color('#dfe7ec');
scena.fog = new THREE.Fog('#dfe7ec', 2500, 6000);
const kamera = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, 0.5, 12000);
scena.add(new THREE.HemisphereLight('#f4f7fb', '#8c8676', 1.15));
const slnko = new THREE.DirectionalLight('#fff6e8', 1.9);
slnko.position.set(-900, 1300, -500);
slnko.castShadow = true;
slnko.shadow.mapSize.set(4096, 4096);
const sc = slnko.shadow.camera;
sc.left = -900; sc.right = 900; sc.top = 900; sc.bottom = -900; sc.near = 10; sc.far = 4000;
slnko.shadow.bias = -0.0004;
scena.add(slnko, slnko.target);

const stav = document.getElementById('stav');
const teren = new Teren(scena);
const ovladanie = new Ovladanie(kamera, renderer.domElement, (x, z) => teren.vyska(x, z));
window.model = { scena, kamera, renderer, teren, ovladanie };

const vrstvy = { budovy: null, mosty: null, stromy: null };
let variant = Number(new URLSearchParams(location.search).get('v')) || 4;

function legenda() {
  const el = document.getElementById('legenda');
  const zoz = LEGENDA.filter((p) => p.od <= variant);
  el.innerHTML = zoz.map((p) => `<span class="f" style="background:${p.farba}"></span><span>${p.nazov}</span>`).join('');
}

async function nastavVariant(v) {
  variant = v;
  document.querySelectorAll('#varianty button').forEach((b) => b.classList.toggle('aktivny', Number(b.dataset.v) === v));
  const u = new URL(location.href); u.searchParams.set('v', v); history.replaceState(null, '', u);
  legenda();
  teren.nastavPlochy(v >= 3);
  // vrstva bez dát (ešte nevygenerovaná) sa preskočí – ostatné sa ukážu
  const nacitaj = async (meno, fn, text) => {
    if (vrstvy[meno]) return;
    stav.textContent = text;
    try { vrstvy[meno] = await fn(scena, teren); } catch (e) { console.warn(`vrstva ${meno}:`, e); vrstvy[meno] = new THREE.Group(); }
  };
  if (v >= 2) await nacitaj('budovy', nacitajBudovy, 'Načítavam budovy…');
  if (v >= 4) await nacitaj('mosty', nacitajMosty, 'Načítavam mosty…');
  if (v >= 4) await nacitaj('stromy', nacitajStromy, 'Načítavam stromy…');
  if (vrstvy.budovy) vrstvy.budovy.visible = v >= 2;
  if (vrstvy.mosty) vrstvy.mosty.visible = v >= 4;
  if (vrstvy.stromy) vrstvy.stromy.visible = v >= 4;
  stav.textContent = '';
}

document.querySelectorAll('#varianty button').forEach((b) => b.addEventListener('click', () => nastavVariant(Number(b.dataset.v))));
addEventListener('keydown', (e) => { if (e.key >= '1' && e.key <= '4') nastavVariant(Number(e.key)); });
addEventListener('resize', () => { renderer.setSize(innerWidth, innerHeight); kamera.aspect = innerWidth / innerHeight; kamera.updateProjectionMatrix(); });

// pohľad z URL: ?x=&z=&d=&az=&sk= (az, sk v stupňoch)
const q = new URLSearchParams(location.search);
const cislo = (k) => (q.has(k) ? Number(q.get(k)) : undefined);
ovladanie.nastav({ x: cislo('x') ?? 350, z: cislo('z') ?? 450, vzdialenost: cislo('d') ?? 1500,
  azimut: cislo('az') !== undefined ? (cislo('az') * Math.PI) / 180 : -0.5, sklon: cislo('sk') !== undefined ? (cislo('sk') * Math.PI) / 180 : 0.62 });

stav.textContent = 'Načítavam terén…';
await teren.nacitaj((t) => { stav.textContent = t; });
await nastavVariant(variant);
window.model.pripraveny = true;

let posledny = performance.now();
function slucka() {
  const t = performance.now(), dt = Math.min(0.1, (t - posledny) / 1000);
  posledny = t;
  ovladanie.update(dt);
  teren.update(kamera);
  // tiene sledujú cieľ kamery
  slnko.target.position.copy(ovladanie.ciel);
  slnko.position.copy(ovladanie.ciel).add(new THREE.Vector3(-900, 1300, -500));
  const r = Math.min(1600, Math.max(250, ovladanie.vzdialenost * 1.2));
  sc.left = -r; sc.right = r; sc.top = r; sc.bottom = -r; sc.updateProjectionMatrix();
  renderer.render(scena, kamera);
  requestAnimationFrame(slucka);
}
slucka();
