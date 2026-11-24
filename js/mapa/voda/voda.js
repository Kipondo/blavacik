// Dunaj (a iná voda): hladina s pohyblivými vlnkami (posúvaná normálová mapa)
// a odrazom oblohy (environment map z modulu js/grafika/prostredie.js).
// Formát: { "nazov": "Dunaj", "reka": true, "body": [[x,z], ...] }

import * as THREE from 'three';
import { zlucPodlaMaterialu } from '../zluc-siete.js';
import { materialReky } from './material-reky.js';

/** Opakovateľná normálová mapa vlniek (súčet sínusov – bez švov). */
function normaloveVlny() {
  const N = 256;
  const c = document.createElement('canvas');
  c.width = c.height = N;
  const g = c.getContext('2d');
  const obr = g.createImageData(N, N);
  const vlny = [];
  for (let i = 0; i < 9; i++) {
    const kx = (1 + (i * 5) % 7) * (i % 2 ? 1 : -1), kz = 1 + (i * 3) % 5;
    vlny.push({ kx, kz, a: 1 / (1 + i * 0.6), f: i * 1.7 });
  }
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      let dx = 0, dz = 0;
      for (const v of vlny) {
        const u = ((x * v.kx + y * v.kz) / N) * Math.PI * 2 + v.f;
        const c2 = Math.cos(u) * v.a;
        dx += c2 * v.kx; dz += c2 * v.kz;
      }
      const s = 0.035;
      const nx = -dx * s, nz = -dz * s, ny = 1;
      const l = Math.hypot(nx, ny, nz);
      const i = (y * N + x) * 4;
      obr.data[i] = (nx / l * 0.5 + 0.5) * 255;
      obr.data[i + 1] = (nz / l * 0.5 + 0.5) * 255;
      obr.data[i + 2] = (ny / l * 0.5 + 0.5) * 255;
      obr.data[i + 3] = 255;
    }
  }
  g.putImageData(obr, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

function plochaPolygonu(body) {
  let a = 0;
  for (let i = 0, j = body.length - 1; i < body.length; j = i++) a += (body[j][0] + body[i][0]) * (body[j][1] - body[i][1]);
  return Math.abs(a / 2);
}

let matOkraj = null;
/** Nízky kamenný okraj okolo malej vodnej plochy (múrik s vrchnou doskou). */
function kamennyOkraj(body, zem) {
  matOkraj ??= new THREE.MeshStandardMaterial({ color: '#cfc8b8', roughness: 0.85 });
  const V = 0.45, S = 0.35;
  const P = [];
  // smer obiehania – aby bol okraj vždy zvonka
  let a = 0;
  for (let i = 0, j = body.length - 1; i < body.length; j = i++) a += (body[j][0] - body[i][0]) * (body[j][1] + body[i][1]);
  const von = a > 0 ? 1 : -1;
  for (let i = 0; i < body.length; i++) {
    const [ax, az] = body[i], [bx, bz] = body[(i + 1) % body.length];
    const d = Math.hypot(bx - ax, bz - az);
    if (d < 0.05) continue;
    const nx = ((bz - az) / d) * von, nz = (-(bx - ax) / d) * von;
    const a0 = [ax, zem - 0.2, az], b0 = [bx, zem - 0.2, bz], a1 = [ax, zem + V, az], b1 = [bx, zem + V, bz];
    const a2 = [ax + nx * S, zem + V, az + nz * S], b2 = [bx + nx * S, zem + V, bz + nz * S];
    const a3 = [ax + nx * S, zem - 0.2, az + nz * S], b3 = [bx + nx * S, zem - 0.2, bz + nz * S];
    // vnútorná stena, vrchná doska, vonkajšia stena (obe strany – poradie bodov nehrá rolu)
    for (const [p, q, r, t] of [[a0, b0, b1, a1], [a1, b1, b2, a2], [a2, b2, b3, a3]]) {
      P.push(...p, ...q, ...r, ...p, ...r, ...t, ...p, ...r, ...q, ...p, ...t, ...r);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
  geo.computeVertexNormals();
  const m = new THREE.Mesh(geo, matOkraj);
  m.castShadow = m.receiveShadow = true;
  return m;
}

export function vytvorVodu(voda, KONFIG, vyskopis) {
  const skupina = new THREE.Group();
  skupina.name = 'voda';
  const vlny = normaloveVlny();
  const matReka = materialReky(vlny);
  const matFontana = new THREE.MeshStandardMaterial({
    color: '#4d7f8c', roughness: 0.06, metalness: 0.3, normalMap: vlny,
    normalScale: new THREE.Vector2(0.5, 0.5), envMapIntensity: 2.2,
  });

  for (const v of voda ?? []) {
    const tvar = new THREE.Shape(v.body.map(([x, z]) => new THREE.Vector2(x, -z)));
    const geo = new THREE.ShapeGeometry(tvar);
    geo.rotateX(-Math.PI / 2);
    // UV podľa sveta (vlnky majú všade rovnakú veľkosť: 1 dlaždica = 24 m)
    const poz = geo.attributes.position, uv = geo.attributes.uv;
    for (let i = 0; i < poz.count; i++) uv.setXY(i, poz.getX(i) / 24, poz.getZ(i) / 24);
    const reka = v.reka !== false;
    const mesh = new THREE.Mesh(geo, reka ? matReka : matFontana);
    if (!reka) {
      // fontány a vodné plochy v meste: hladina v kamennom okraji (porovnanie so skutočnosťou, etapa 3 –
      // jazierko na promenáde Hviezdoslavovho námestia má nízky kamenný okraj, nie trávnaté brehy)
      let zem = Infinity;
      for (const [x, z] of v.body) zem = Math.min(zem, vyskopis.vyskaTerenu(x, z));
      mesh.position.y = zem + 0.32;
      if (plochaPolygonu(v.body) < 6000) skupina.add(kamennyOkraj(v.body, zem));
    } else if (vyskopis.hladina) {
      // hladina sa mení pozdĺž toku (celé mesto) – výška pre každý vrchol
      for (let i = 0; i < poz.count; i++) poz.setY(i, vyskopis.hladina(poz.getX(i), poz.getZ(i)));
      geo.computeVertexNormals();
    } else {
      mesh.position.y = KONFIG.HLADINA;
    }
    mesh.receiveShadow = true;
    skupina.add(mesh);
  }

  // vodné plochy a kamenné okraje s rovnakým materiálom – jedna sieť na štvorec 1 km (#110: Dunaj a jazerá
  // mali ~90 sietí, každá samostatné volanie kreslenia)
  zlucPodlaMaterialu(skupina, { bunka: 1000 });

  // vlnky tečú po prúde (Dunaj tečie na východ = +x)
  skupina.userData.update = (cas) => {
    vlny.offset.set(cas * 0.035, Math.sin(cas * 0.1) * 0.02);
    matReka.userData.cas.value = cas;
  };
  return skupina;
}
