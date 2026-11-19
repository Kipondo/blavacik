// Budova Slovenského rozhlasu – obrátená pyramída (hrdzavohnedá) na nízkom podstavci.

import * as THREE from 'three';
import { texturaOkien } from '../budovy/textura-okien.js';
import { fasada, naMiesto } from './pomocne.js';

export default function postav(p, { vyskopis, kolizie }) {
  const g = new THREE.Group();
  const DOLE = 34, HORE = 86, H = 58;
  const podstavec = fasada(70, 8, 70, '#b7aa98', { druh: 'okna', okno: [4, 4] });
  podstavec.position.y = 4;
  g.add(podstavec);
  const geo = new THREE.CylinderGeometry(HORE / Math.SQRT2, DOLE / Math.SQRT2, H, 4, 1);
  geo.rotateY(Math.PI / 4);
  geo.translate(0, 8 + H / 2, 0);
  const t = texturaOkien().clone();
  t.repeat.set(16, 3.5);
  t.needsUpdate = true;
  const pyramida = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: '#9a6243', map: t, roughness: 0.7, metalness: 0.2, flatShading: true }));
  pyramida.castShadow = pyramida.receiveShadow = true;
  g.add(pyramida);
  naMiesto(g, p, vyskopis, 70, 70);
  kolizie.pridajObdlznik(p.x, p.z, 70, 70, p.natocenie ?? 0, { typ: 'pamiatka', nazov: p.nazov });
  return { objekt: g };
}
