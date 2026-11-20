// Procedurálne textúry asfaltu s dopravným značením podľa počtu pruhov a smeru.
// U = naprieč cestou (0..1), V = pozdĺž cesty (1 = DLZKA_V metrov).

import * as THREE from 'three';

export const DLZKA_V = 9;  // 3 m čiara + 6 m medzera
const cache = new Map();

function asfalt(g, w, h) {
  g.fillStyle = '#4b4c4e';
  g.fillRect(0, 0, w, h);
  let seed = 17;
  for (let i = 0; i < 4000; i++) {
    seed = (seed * 16807) % 2147483647;
    const s = 55 + (seed % 40);
    g.fillStyle = `rgba(${s},${s},${s + 3},0.55)`;
    g.fillRect(seed % w, (seed >> 8) % h, 1.5, 1.5);
  }
  // tmavšie stopy kolies a okraje pri obrubníku
  const grad = g.createLinearGradient(0, 0, w, 0);
  grad.addColorStop(0, 'rgba(20,20,20,0.35)');
  grad.addColorStop(0.06, 'rgba(0,0,0,0)');
  grad.addColorStop(0.94, 'rgba(0,0,0,0)');
  grad.addColorStop(1, 'rgba(20,20,20,0.35)');
  g.fillStyle = grad;
  g.fillRect(0, 0, w, h);
}

/**
 * @param {number} pruhy  počet jazdných pruhov
 * @param {boolean} jednosmerka
 * @param {boolean} okraje  vodorovné značenie krajníc (hlavné cesty)
 */
export function texturaCesty(pruhy = 2, jednosmerka = false, okraje = false) {
  pruhy = Math.max(1, Math.min(6, pruhy | 0));
  const kluc = `${pruhy}|${jednosmerka}|${okraje}`;
  if (cache.has(kluc)) return cache.get(kluc);

  const c = document.createElement('canvas');
  c.width = 256; c.height = 256;
  const g = c.getContext('2d');
  asfalt(g, c.width, c.height);
  g.fillStyle = '#ecebe4';
  const ciara = 4;
  const prerusovana = (x) => { g.fillRect(x - ciara / 2, 0, ciara, c.height / 3); };
  const plna = (x) => { g.fillRect(x - ciara / 2, 0, ciara, c.height); };

  if (okraje) { plna(10); plna(c.width - 10); }
  for (let k = 1; k < pruhy; k++) {
    const x = (k / pruhy) * c.width;
    const stred = !jednosmerka && k === pruhy / 2;
    if (stred && pruhy >= 4) { plna(x - 4); plna(x + 4); }        // dvojitá plná
    else if (stred) prerusovana(x);                               // obojsmerná 2-pruhová
    else prerusovana(x);                                          // deliace čiary pruhov
  }

  const t = new THREE.CanvasTexture(c);
  t.wrapS = THREE.ClampToEdgeWrapping;
  t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  cache.set(kluc, t);
  return t;
}

/** Čistý asfalt bez značenia (križovatky, parkoviská). */
export function texturaAsfaltu() {
  return texturaCesty(1, true, false);
}

/** Zebra – biele pruhy naprieč (U = metre naprieč cestou, perióda 1 m). */
export function texturaZebry() {
  if (cache.has('zebra')) return cache.get('zebra');
  const c = document.createElement('canvas');
  c.width = 64; c.height = 16;
  const g = c.getContext('2d');
  g.fillStyle = '#4b4c4e'; g.fillRect(0, 0, 64, 16);
  g.fillStyle = '#efeee8'; g.fillRect(0, 0, 32, 16);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  cache.set('zebra', t);
  return t;
}
