// Procedurálna textúra fasády s oknami (biela – farbu dodá farba budovy).
// Jedna dlaždica = 4 × 4 okná; v UV súradniciach je 1 = 4 okná (4 × OKNO_SIRKA metrov).

import * as THREE from 'three';

export const OKNO_SIRKA = 3.6;  // m na jedno okno vodorovne
export const OKNO_VYSKA = 3.2;  // m na jedno poschodie

let textura = null;

export function texturaOkien() {
  if (textura) return textura;
  const n = 4, px = 64;
  const c = document.createElement('canvas');
  c.width = c.height = n * px;
  const g = c.getContext('2d');
  g.fillStyle = '#ffffff';
  g.fillRect(0, 0, c.width, c.height);

  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);

  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      const x = i * px, y = j * px;
      // jemné tieňovanie fasády
      g.fillStyle = 'rgba(0,0,0,0.06)';
      g.fillRect(x, y + px - 6, px, 6);
      // rám okna
      g.fillStyle = 'rgba(60,55,50,0.55)';
      g.fillRect(x + 14, y + 12, px - 28, px - 22);
      // sklo – rôzne odtiene, niektoré „rozsvietené“
      const svieti = rnd() < 0.18;
      const odtien = 40 + Math.floor(rnd() * 40);
      g.fillStyle = svieti ? `rgb(${230},${210},${150})` : `rgb(${odtien},${odtien + 15},${odtien + 30})`;
      g.fillRect(x + 17, y + 15, px - 34, px - 28);
      // priečka
      g.fillStyle = 'rgba(230,230,230,0.7)';
      g.fillRect(x + px / 2 - 1, y + 15, 2, px - 28);
      // parapet
      g.fillStyle = 'rgba(255,255,255,0.9)';
      g.fillRect(x + 12, y + px - 12, px - 24, 3);
    }
  }

  textura = new THREE.CanvasTexture(c);
  textura.wrapS = textura.wrapT = THREE.RepeatWrapping;
  textura.colorSpace = THREE.SRGBColorSpace;
  textura.anisotropy = 4;
  return textura;
}
