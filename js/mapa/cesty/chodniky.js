// Chodníky s obrubníkmi pozdĺž mestských ciest (zvýšený pás vedľa vozovky).
// Pri križovatkách a všade, kde by ležal na vozovke inej cesty (súbežné cesty, cesty bez spoločného bodu),
// sa chodník preruší (js/mapa/cesty/vozovky.js, #136). Cez vjazdy do dvorov pokračuje.

import * as THREE from 'three';
import { pridajStrukturu } from './struktura.js';
import { pridajOpotrebenie } from './opotrebenie.js';
import { zjemni } from './cesty.js';
import { kluc } from './krizovatky.js';
import { mriezkaVozoviek } from './vozovky.js';

const SIRKA = 2.6;
const OBRUBNIK = 0.16;      // šírka vrchu obrubníka (m)
const VYSKA = 0.28;         // nad terénom (vozovka je na +0.12)
const S_CHODNIKOM = new Set(['primary', 'secondary', 'tertiary', 'residential', 'unclassified', 'living_street',
  'primary_link', 'secondary_link', 'tertiary_link']);

let textura = null;
/** Základná farba asfaltového chodníka (štruktúru a opotrebenie pridá shader). */
function asfaltChodnika() {
  if (textura) return textura;
  const c = document.createElement('canvas');
  c.width = c.height = 4;
  const g = c.getContext('2d');
  g.fillStyle = '#76736e'; g.fillRect(0, 0, 4, 4);
  textura = new THREE.CanvasTexture(c);
  textura.colorSpace = THREE.SRGBColorSpace;
  return textura;
}

export function vytvorChodniky(cesty, krizovatky, vyskopis) {
  const poz = [], uv = [], obrPoz = [];
  const vozovky = mriezkaVozoviek(cesty);
  for (const c of cesty) {
    if (!S_CHODNIKOM.has(c.typ) || c.most) continue;
    // body cesty, pri ktorých chodník končí (križovatky)
    const prerusenia = c.body.filter(([x, z]) => krizovatky.has(kluc(x, z))).map(([x, z]) => {
      const k = krizovatky.get(kluc(x, z));
      return { x, z, r: k.polomer + SIRKA + 1.5 };
    });
    const body = zjemni(c.body, 4);
    // jednosmerka = len vpravo (strana 1; pri dvojprúdovkách je vľavo stredový pás) – predtým tu bolo −1 (vľavo)
    // a chodník rozdelených ciest stál v strednom páse až v protismernej vozovke
    const strany = c.jednosmerka ? [1] : [1, -1];
    for (const strana of strany) {
      let pred = null;
      for (let i = 0; i < body.length; i++) {
        const [x, z] = body[i];
        const blizko = prerusenia.some((p) => Math.hypot(p.x - x, p.z - z) < p.r);
        const prev = body[Math.max(0, i - 1)], next = body[Math.min(body.length - 1, i + 1)];
        let dx = next[0] - prev[0], dz = next[1] - prev[1];
        const d = Math.hypot(dx, dz) || 1; dx /= d; dz /= d;
        const nx = -dz * strana, nz = dx * strana;
        const r0 = c.sirka / 2, rk = r0 + OBRUBNIK, r1 = r0 + SIRKA;
        const ix = x + nx * r0, iz = z + nz * r0, kx = x + nx * rk, kz = z + nz * rk, ox = x + nx * r1, oz = z + nz * r1;
        // chodník by ležal na vozovke inej cesty (stred alebo vonkajší okraj) – tu sa preruší
        const mx = x + nx * (r0 + SIRKA / 2), mz = z + nz * (r0 + SIRKA / 2);
        const prerus = blizko || vozovky.naVozovke(mx, mz, c, 0.3) || vozovky.naVozovke(ox, oz, c, 0.3);
        const bod = {
          i: [ix, vyskopis.vyska(ix, iz), iz], k: [kx, vyskopis.vyska(kx, kz), kz], o: [ox, vyskopis.vyska(ox, oz), oz],
        };
        if (pred && !prerus && !pred.prerus) {
          const A = pred.k, B = bod.k, C = bod.o, D = pred.o;
          // vrch chodníka (normála nahor – poradie podľa strany)
          const vrch = (p) => [p[0], p[1] + VYSKA, p[2]];
          const tri = strana > 0 ? [A, C, B, A, D, C] : [A, B, C, A, C, D];
          for (const p of tri) { const q = vrch(p); poz.push(...q); uv.push(q[0] / 2, q[2] / 2); }
          // obrubník: zvislá stena od vozovky, vrch obrubníka a zadná stena chodníka k terénu
          const dol = (p) => [p[0], p[1] + 0.1, p[2]];
          const Ai = pred.i, Bi = bod.i;
          obrPoz.push(...dol(Ai), ...dol(Bi), ...vrch(Bi), ...dol(Ai), ...vrch(Bi), ...vrch(Ai));
          const trk = strana > 0 ? [Ai, B, Bi, Ai, A, B] : [Ai, Bi, B, Ai, B, A];
          for (const p of trk) obrPoz.push(...vrch(p));
          const zem = (p) => [p[0], p[1] - 0.05, p[2]];
          obrPoz.push(...zem(D), ...vrch(C), ...zem(C), ...zem(D), ...vrch(D), ...vrch(C));
        }
        pred = { ...bod, prerus };
      }
    }
  }
  const skupina = new THREE.Group();
  skupina.name = 'chodniky';
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(poz, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.computeVertexNormals();
  // vrch chodníka: asfalt (svetlejší ako vozovka) so štruktúrou, záplatami a prasklinami
  const matVrch = pridajOpotrebenie(pridajStrukturu(new THREE.MeshStandardMaterial({ map: asfaltChodnika(), roughness: 0.95 }), 'asfalt', 3.3, 0.9, 0.8), 0);
  const vrchy = new THREE.Mesh(geo, matVrch);
  vrchy.receiveShadow = true;
  const geoO = new THREE.BufferGeometry();
  geoO.setAttribute('position', new THREE.Float32BufferAttribute(obrPoz, 3));
  geoO.computeVertexNormals();
  const obrubniky = new THREE.Mesh(geoO, new THREE.MeshStandardMaterial({ color: '#a19e97', roughness: 0.85, side: THREE.DoubleSide }));
  obrubniky.receiveShadow = true;
  skupina.add(vrchy, obrubniky);
  return skupina;
}
