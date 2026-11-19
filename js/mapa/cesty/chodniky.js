// Chodníky s obrubníkmi pozdĺž mestských ciest (zvýšený pás vedľa vozovky).
// Pri križovatkách sa chodník preruší, aby nezasahoval do vozovky.

import * as THREE from 'three';
import { zjemni } from './cesty.js';
import { kluc } from './krizovatky.js';

const SIRKA = 2.6;
const VYSKA = 0.28;         // nad terénom (vozovka je na +0.12)
const S_CHODNIKOM = new Set(['primary', 'secondary', 'tertiary', 'residential', 'unclassified', 'living_street',
  'primary_link', 'secondary_link', 'tertiary_link']);

let textura = null;
function dlazba() {
  if (textura) return textura;
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  g.fillStyle = '#9a978f'; g.fillRect(0, 0, 64, 64);
  for (let y = 0; y < 64; y += 16) {
    for (let x = 0; x < 64; x += 16) {
      const s = 168 + ((x * 7 + y * 13) % 24);
      g.fillStyle = `rgb(${s},${s - 2},${s - 6})`;
      g.fillRect(x + 1, y + 1, 14, 14);
    }
  }
  textura = new THREE.CanvasTexture(c);
  textura.wrapS = textura.wrapT = THREE.RepeatWrapping;
  textura.colorSpace = THREE.SRGBColorSpace;
  return textura;
}

export function vytvorChodniky(cesty, krizovatky, vyskopis) {
  const poz = [], uv = [], obrPoz = [];
  for (const c of cesty) {
    if (!S_CHODNIKOM.has(c.typ) || c.most) continue;
    // body cesty, pri ktorých chodník končí (križovatky)
    const prerusenia = c.body.filter(([x, z]) => krizovatky.has(kluc(x, z))).map(([x, z]) => {
      const k = krizovatky.get(kluc(x, z));
      return { x, z, r: k.polomer + SIRKA + 1.5 };
    });
    const body = zjemni(c.body, 4);
    const strany = c.jednosmerka ? [-1] : [1, -1]; // jednosmerka = len vpravo (pri dvojprúdovkách je vľavo stredový pás)
    for (const strana of strany) {
      let pred = null;
      for (let i = 0; i < body.length; i++) {
        const [x, z] = body[i];
        const blizko = prerusenia.some((p) => Math.hypot(p.x - x, p.z - z) < p.r);
        const prev = body[Math.max(0, i - 1)], next = body[Math.min(body.length - 1, i + 1)];
        let dx = next[0] - prev[0], dz = next[1] - prev[1];
        const d = Math.hypot(dx, dz) || 1; dx /= d; dz /= d;
        const nx = -dz * strana, nz = dx * strana;
        const r0 = c.sirka / 2, r1 = r0 + SIRKA;
        const ix = x + nx * r0, iz = z + nz * r0, ox = x + nx * r1, oz = z + nz * r1;
        const bod = {
          i: [ix, vyskopis.vyska(ix, iz), iz], o: [ox, vyskopis.vyska(ox, oz), oz],
        };
        if (pred && !blizko && !pred.blizko) {
          const A = pred.i, B = bod.i, C = bod.o, D = pred.o;
          // vrch chodníka (normála nahor – poradie podľa strany)
          const vrch = (p) => [p[0], p[1] + VYSKA, p[2]];
          const tri = strana > 0 ? [A, C, B, A, D, C] : [A, B, C, A, C, D];
          for (const p of tri) { const q = vrch(p); poz.push(...q); uv.push(q[0] / 2, q[2] / 2); }
          // obrubník (zvislá stena od vozovky po vrch chodníka)
          const dol = (p) => [p[0], p[1] + 0.1, p[2]];
          obrPoz.push(...dol(A), ...dol(B), ...vrch(B), ...dol(A), ...vrch(B), ...vrch(A));
        }
        pred = { ...bod, blizko };
      }
    }
  }
  const skupina = new THREE.Group();
  skupina.name = 'chodniky';
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(poz, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.computeVertexNormals();
  const vrchy = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: dlazba(), roughness: 0.95 }));
  vrchy.receiveShadow = true;
  const geoO = new THREE.BufferGeometry();
  geoO.setAttribute('position', new THREE.Float32BufferAttribute(obrPoz, 3));
  geoO.computeVertexNormals();
  const obrubniky = new THREE.Mesh(geoO, new THREE.MeshStandardMaterial({ color: '#b9b5ab', roughness: 0.9, side: THREE.DoubleSide }));
  skupina.add(vrchy, obrubniky);
  return skupina;
}
