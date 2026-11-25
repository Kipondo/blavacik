// Koľaje: električkové (rozchod 1 000 mm) – dve oceľové koľajnice nad vozovkou alebo zemou;
// železničné (1 435 mm, typ 'zeleznica') – koľajnice na pražcoch (pás s textúrou pražcov na štrkovom lôžku,
// lôžko samo je nakreslené v textúre zeme). Temeno železničnej koľajnice je TEMENO_ZELEZNICE nad terénom –
// na ňom stoja vlaky (js/vlaky/modul.js).

import * as THREE from 'three';
import { zjemni } from './cesty.js';

const ROZCHOD = 1.0;
const ROZCHOD_ZELEZNICE = 1.435;
export const TEMENO_ZELEZNICE = 0.24;
const SIRKA_PRAZCOV = 2.6;
const ROZOSTUP_PRAZCOV = 0.6;

let matPrazce = null;
/** Pražce na štrku (opakuje sa po ROZOSTUP_PRAZCOV). */
function materialPrazcov() {
  if (matPrazce) return matPrazce;
  const c = document.createElement('canvas');
  c.width = 64; c.height = 32;
  const g = c.getContext('2d');
  g.fillStyle = '#6f675e'; g.fillRect(0, 0, 64, 32);
  let s = 7;
  for (let i = 0; i < 260; i++) {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    const x = s % 64, y = (s >> 8) % 32, v = 90 + ((s >> 4) % 50);
    g.fillStyle = `rgb(${v},${v - 6},${v - 12})`;
    g.fillRect(x, y, 2, 2);
  }
  g.fillStyle = '#8d8a85';           // betónový pražec
  g.fillRect(1, 9, 62, 14);
  g.fillStyle = '#77736e';
  g.fillRect(1, 20, 62, 3);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 4;
  matPrazce = new THREE.MeshStandardMaterial({ map: t, roughness: 0.95, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  return matPrazce;
}

export function vytvorKolajnice(kolajnice, vyskopis) {
  const poz = [];
  const prazce = [], uv = [];
  let vyska = (x, z) => vyskopis.vyska(x, z);
  const kolajnica = (body, rozchod, nad, hrubka) => {
    for (const strana of [1, -1]) {
      for (let i = 0; i < body.length - 1; i++) {
        const [ax, az] = body[i], [bx, bz] = body[i + 1];
        const d = Math.hypot(bx - ax, bz - az) || 1;
        const nx = -(bz - az) / d * strana * rozchod / 2, nz = (bx - ax) / d * strana * rozchod / 2;
        const ox = -(bz - az) / d * hrubka, oz = (bx - ax) / d * hrubka;
        const ya = vyska(ax + nx, az + nz) + nad, yb = vyska(bx + nx, bz + nz) + nad;
        const A = [ax + nx - ox, ya, az + nz - oz], Bv = [bx + nx - ox, yb, bz + nz - oz];
        const C = [bx + nx + ox, yb, bz + nz + oz], D = [ax + nx + ox, ya, az + nz + oz];
        poz.push(...A, ...Bv, ...C, ...A, ...C, ...D);
        // bok koľajnice (vonkajší), aby bola vidieť aj zboku
        if (nad > 0.2) {
          const E = [ax + nx + ox, ya - 0.16, az + nz + oz], F = [bx + nx + ox, yb - 0.16, bz + nz + oz];
          const G = [ax + nx - ox, ya - 0.16, az + nz - oz], H = [bx + nx - ox, yb - 0.16, bz + nz - oz];
          poz.push(...D, ...C, ...F, ...D, ...F, ...E, ...A, ...H, ...Bv, ...A, ...G, ...H);
        }
      }
    }
  };
  for (const k of kolajnice ?? []) {
    if (k.typ === 'elektricka') {
      // električka na moste cez Dunaj (Starý most) ide po mostovke aj nad brehom (výška „zhora“)
      vyska = k.most ? (x, z) => vyskopis.vyska(x, z, 1e9) : (x, z) => vyskopis.vyska(x, z);
      kolajnica(zjemni(k.body, 3), ROZCHOD, 0.24, 0.04);
    } else if (k.typ === 'zeleznica') {
      // mosty: koľajnice na nadjazdoch kreslí js/mapa/mosty/nadjazdy.js; veľké mosty (Dunaj) by tu boli vo výške vody
      if (k.most) continue;
      vyska = (x, z) => vyskopis.vyska(x, z);
      const body = zjemni(k.body, 5);
      kolajnica(body, ROZCHOD_ZELEZNICE, TEMENO_ZELEZNICE, 0.035);
      // pás pražcov
      let v = 0;
      for (let i = 0; i < body.length - 1; i++) {
        const [ax, az] = body[i], [bx, bz] = body[i + 1];
        const d = Math.hypot(bx - ax, bz - az) || 1;
        const nx = -(bz - az) / d * SIRKA_PRAZCOV / 2, nz = (bx - ax) / d * SIRKA_PRAZCOV / 2;
        const y = (x, z) => vyskopis.vyska(x, z) + 0.07;
        const v2 = v + d / ROZOSTUP_PRAZCOV;
        const A = [ax + nx, y(ax + nx, az + nz), az + nz], B = [bx + nx, y(bx + nx, bz + nz), bz + nz];
        const C = [bx - nx, y(bx - nx, bz - nz), bz - nz], D = [ax - nx, y(ax - nx, az - nz), az - nz];
        // (normála hore: A-B-C a A-C-D)
        prazce.push(...A, ...B, ...C, ...A, ...C, ...D);
        uv.push(0, v, 0, v2, 1, v2, 0, v, 1, v2, 1, v);
        v = v2 - Math.floor(v2);     // textúra sa opakuje – stačí zvyšok (presnosť)
      }
    }
  }
  const skupina = new THREE.Group();
  skupina.name = 'kolajnice';
  if (poz.length) {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(poz, 3));
    geo.computeVertexNormals();
    skupina.add(new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: '#9aa0a4', metalness: 0.8, roughness: 0.35, side: THREE.DoubleSide })));
  }
  if (prazce.length) {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(prazce, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    geo.computeVertexNormals();
    const m = new THREE.Mesh(geo, materialPrazcov());
    m.receiveShadow = true;
    skupina.add(m);
  }
  return skupina;
}
