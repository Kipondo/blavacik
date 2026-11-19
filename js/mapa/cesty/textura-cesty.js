// Procedurálna textúra asfaltu so stredovou prerušovanou čiarou a krajnicami.
// U = naprieč cestou (0..1), V = pozdĺž cesty (1 = 12 m).

import * as THREE from 'three';

let textura = null;

export function texturaCesty() {
  if (textura) return textura;
  const c = document.createElement('canvas');
  c.width = 128; c.height = 256;
  const g = c.getContext('2d');

  // asfalt so zrnom
  g.fillStyle = '#4a4b4d';
  g.fillRect(0, 0, c.width, c.height);
  for (let i = 0; i < 2500; i++) {
    const s = 60 + Math.random() * 30;
    g.fillStyle = `rgba(${s},${s},${s + 3},0.5)`;
    g.fillRect(Math.random() * c.width, Math.random() * c.height, 1.5, 1.5);
  }
  // krajnice
  g.fillStyle = '#e8e8e2';
  g.fillRect(5, 0, 3, c.height);
  g.fillRect(c.width - 8, 0, 3, c.height);
  // stredová prerušovaná čiara (3 m čiara, 3 m medzera → 2× na 12 m)
  for (let y = 0; y < c.height; y += c.height / 2) {
    g.fillRect(c.width / 2 - 2, y, 4, c.height / 4);
  }

  textura = new THREE.CanvasTexture(c);
  textura.wrapS = THREE.ClampToEdgeWrapping;
  textura.wrapT = THREE.RepeatWrapping;
  textura.colorSpace = THREE.SRGBColorSpace;
  textura.anisotropy = 8;
  return textura;
}
