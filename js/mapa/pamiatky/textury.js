// Textúry fasád pre pamiatky: klasické (barokové) okná a sklenená fasáda.
// Textúry sú biele/sivé – farbu dodá materiál. Jedna dlaždica = 1 okno.

import * as THREE from 'three';

const cache = {};

function platno(w, h, kresli) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  kresli(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

/** Barokové okno: vysoké okno so šambránou a rímsou nad ním (1 dlaždica ≈ 3,6 × 4,2 m). */
export function texturaKlasickychOkien() {
  return (cache.klasicke ??= platno(64, 76, (g, w, h) => {
    g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, h);
    g.fillStyle = 'rgba(0,0,0,0.07)'; g.fillRect(0, h - 5, w, 5);          // podlažná rímsa
    g.fillStyle = 'rgba(255,255,255,1)'; g.fillRect(0, h - 7, w, 2);
    g.fillStyle = 'rgba(120,110,95,0.35)'; g.fillRect(17, 12, 30, 50);       // šambrána
    g.fillStyle = '#2a3138'; g.fillRect(20, 15, 24, 44);                      // sklo
    g.fillStyle = 'rgba(255,255,255,0.85)';
    g.fillRect(31, 15, 2, 44); g.fillRect(20, 30, 24, 2);                     // priečky
    g.fillStyle = 'rgba(120,110,95,0.45)'; g.fillRect(14, 7, 36, 4);         // rímsa nad oknom
    g.fillStyle = 'rgba(255,255,255,0.9)'; g.fillRect(16, 60, 32, 3);        // parapet
  }));
}

/** Sklenená fasáda (curtain wall) – modrosivé sklo s rámami. */
export function texturaSkla() {
  return (cache.sklo ??= platno(64, 64, (g, w, h) => {
    const grad = g.createLinearGradient(0, 0, w, h);
    grad.addColorStop(0, '#7f97a8'); grad.addColorStop(0.5, '#b7c8d3'); grad.addColorStop(1, '#6d8597');
    g.fillStyle = grad; g.fillRect(0, 0, w, h);
    g.fillStyle = 'rgba(40,50,58,0.85)';
    g.fillRect(0, 0, w, 3); g.fillRect(0, 0, 3, h); g.fillRect(w / 2 - 1, 0, 2, h);
  }));
}

/** Kópia textúry s vlastným opakovaním (každý mesh môže mať iné rozmery). */
export function opakovanie(textura, rx, ry) {
  const t = textura.clone();
  t.repeat.set(rx, ry);
  t.needsUpdate = true;
  return t;
}
