// Mosty, nadjazdy a lávky (variant 4): model/data/mosty.json (tools/model/mosty.py). Každá cesta s OSM bridge=*
// je mostovka po svojej osi vo výške z laserového povrchu: vrch vo farbe cesty (vozovka, chodník, koľajisko),
// boky a podhľad mosta, parapet / zábradlie po okrajoch a piliere tam, kde je pod mostovkou miesto.
// Kde sa mostovka dotkne zeme, má výšku terénu – zjazd plynule prejde na cestu nakreslenú na teréne.

import * as THREE from 'three';
import { FARBY } from './farby.js';

const VRCH = { cesta: '#55575a', chodnik: '#a9a6a0', kolaj: '#7a6a5c' };

export async function nacitajMosty(scena) {
  const { mosty } = await (await fetch('data/mosty.json')).json();
  const vrch = { cesta: [], chodnik: [], kolaj: [] }, telo = [], parapet = [];
  const stvor = (arr, a, b, c, d) => arr.push(...a, ...b, ...c, ...a, ...c, ...d);
  const kvader = (arr, x, z, y0, y1, sx, sz, ux, uz) => {
    const nx = -uz, nz = ux;
    const r = (a, b) => [x + ux * a + nx * b, z + uz * a + nz * b];
    const k = [r(-sx / 2, -sz / 2), r(sx / 2, -sz / 2), r(sx / 2, sz / 2), r(-sx / 2, sz / 2)];
    for (let i = 0; i < 4; i++) {
      const [ax, az] = k[i], [bx, bz] = k[(i + 1) % 4];
      stvor(arr, [ax, y0, az], [bx, y0, bz], [bx, y1, bz], [ax, y1, az]);
    }
  };
  for (const m of mosty) {
    const B = m.b;
    if (B.length < 2) continue;
    const W = m.w / 2, D = m.druh === 'chodnik' ? 0.6 : m.druh === 'kolaj' ? 1.6 : 1.3;
    const smer = B.map((_, i) => {
      const a = B[Math.max(0, i - 1)], c = B[Math.min(B.length - 1, i + 1)];
      const l = Math.hypot(c[0] - a[0], c[1] - a[1]) || 1;
      return [(c[0] - a[0]) / l, (c[1] - a[1]) / l];
    });
    const bod = (i, o, dy = 0) => [B[i][0] + smer[i][1] * o, B[i][2] + dy, B[i][1] - smer[i][0] * o];
    let posledny = -1e9, s = 0;
    for (let i = 0; i < B.length - 1; i++) {
      const nad = Math.min(B[i][2] - B[i][3], B[i + 1][2] - B[i + 1][3]);
      // na teréne mostovka netreba (cesta je nakreslená na zemi) – len kde je aspoň 0,3 m nad ním
      if (Math.max(B[i][2] - B[i][3], B[i + 1][2] - B[i + 1][3]) < 0.3) continue;
      stvor(vrch[m.druh], bod(i, W, 0.03), bod(i + 1, W, 0.03), bod(i + 1, -W, 0.03), bod(i, -W, 0.03));
      stvor(telo, bod(i, -W + 0.4, -D), bod(i + 1, -W + 0.4, -D), bod(i + 1, W - 0.4, -D), bod(i, W - 0.4, -D));
      for (const sg of [1, -1]) {
        stvor(telo, bod(i, sg * W, -0.3), bod(i + 1, sg * W, -0.3), bod(i + 1, sg * (W - 0.4), -D), bod(i, sg * (W - 0.4), -D));
        // bok až k terénu, kde je mostovka nízko (koniec mosta na násype – žiadna škára)
        if (nad < 2.5) {
          const a = bod(i, sg * W, 0), b = bod(i + 1, sg * W, 0);
          stvor(telo, [a[0], B[i][3] - 0.5, a[2]], [b[0], B[i + 1][3] - 0.5, b[2]], [b[0], b[1] - 0.3, b[2]], [a[0], a[1] - 0.3, a[2]]);
        }
        const vp = m.druh === 'cesta' ? 0.9 : m.druh === 'kolaj' ? 0.6 : 1.1;
        stvor(parapet, bod(i, sg * W, -0.3), bod(i + 1, sg * W, -0.3), bod(i + 1, sg * W, vp), bod(i, sg * W, vp));
      }
      // piliere po ~30 m, kde je pod mostovkou miesto
      s += Math.hypot(B[i + 1][0] - B[i][0], B[i + 1][1] - B[i][1]);
      if (s - posledny > (m.druh === 'chodnik' ? 18 : 30) && nad > D + 3) {
        posledny = s;
        const [ux, uz] = smer[i];
        kvader(telo, B[i][0], B[i][1], B[i][3] - 1, B[i][2] - D, 1.2, Math.max(2, m.w * 0.7), ux, uz);
      }
    }
  }
  const siet = (poz, farba) => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(poz, 3));
    g.computeVertexNormals();
    const o = new THREE.Mesh(g, new THREE.MeshLambertMaterial({ color: farba, side: THREE.DoubleSide }));
    o.castShadow = true; o.receiveShadow = true;
    return o;
  };
  const skupina = new THREE.Group();
  skupina.name = 'mosty';
  for (const [druh, poz] of Object.entries(vrch)) if (poz.length) skupina.add(siet(poz, VRCH[druh]));
  skupina.add(siet(telo, FARBY.most), siet(parapet, FARBY.zabradlie));
  scena.add(skupina);
  return skupina;
}
