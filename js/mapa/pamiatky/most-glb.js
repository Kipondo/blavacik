// Most z Blendera: assets/pamiatky/<subor>.glb.gz + <subor>.json (generátory v tools/blender/mosty/).
// Model je v lokálnych súradniciach mosta: x pozdĺž osi od bodu „od“ po „do“ (z data/mapa/mesto/index.json, alebo
// po lomenej osi mosta v oblúku z data/mapa/mosty-dunaj.json),
// y = 0 je vrch mostovky. Postaví sa na výšku mostovky a v nábehoch (koncoch mosta) sa časti pri
// mostovke ohnú podľa výškového profilu (vyskopis.vyska) – vysoké časti (pylón, oblúk) ostanú rovné.
//
// Záznam v data/mapa/pamiatky.json:
//   { "model": "most-glb", "subor": "most-snp", "nahradzaMost": "Most SNP", "nazov": "Most SNP a UFO", "x": …, "z": …, "dosah": 170 }
// „nahradzaMost“ = meno mosta v index.json; jeho všeobecný model (js/mapa/mosty/mosty.js) sa nestavia
// (js/mapa/mesto.js). Keď sa model nenačíta, postaví sa ten všeobecný.

import * as THREE from 'three';
import { nacitajModelPamiatky, rozbalModel } from './model-glb.js';
import { vzdialenaUroven } from './vzdialena-uroven.js';
import { pridajTienovehoZastupcu } from '../../grafika/tienovy-zastupca.js';
import { vytvorMosty } from '../mosty/mosty.js';
import { pridajPochodzne } from '../mosty/pochodzne-pamiatok.js';
import { bodNaOsi, naSvet } from '../mosty/os-mosta.js';

const OHYB_DO = 12;     // do tejto výšky nad mostovkou sa časti ohýbajú s nábehom celé
const OHYB_NAD = 22;    // od tejto výšky už vôbec (medzi tým plynulo)
const VZDIALENOST_DETAILU = 320;

/**
 * Model rozbalí na Float32 geometrie a časti pri mostovke ohne podľa profilu posun(s).
 * os = lomená os mosta v oblúku (Most Apollo): model je v Blenderi rovno pozdĺž x – tu sa ohne aj v pôdoryse
 * (vrchol x → bod osi, y vľavo → kolmo na os), súradnice relatívne k stredu `c`.
 */
function ohni(model, posun, os = null, c = null) {
  const vystup = rozbalModel(model);
  for (const mesh of vystup.children) {
    const p = mesh.geometry.getAttribute('position');
    const nrm = os ? mesh.geometry.getAttribute('normal') : null;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i);
      const w = y <= OHYB_DO ? 1 : y >= OHYB_NAD ? 0 : (OHYB_NAD - y) / (OHYB_NAD - OHYB_DO);
      if (w > 0) p.setY(i, y + w * posun(x));
      if (os) {
        const b = bodNaOsi(os, x), yb = -p.getZ(i);
        p.setX(i, b.x + b.tz * yb - c[0]);
        p.setZ(i, b.z - b.tx * yb - c[1]);
        if (nrm) {
          const nx = nrm.getX(i), nz = nrm.getZ(i);
          nrm.setX(i, nx * b.tx - nz * b.tz);
          nrm.setZ(i, nx * b.tz + nz * b.tx);
        }
      }
    }
    p.needsUpdate = true;
    if (nrm) nrm.needsUpdate = true;
    mesh.geometry.computeBoundingSphere();
    mesh.geometry.computeBoundingBox?.();
  }
  return vystup;
}

/** z modelu v polohe s (lineárne medzi bodmi [s, z] po 5 m); bez profilu 0. */
function profilModelu(body) {
  if (!body?.length) return () => 0;
  return (s) => {
    if (s <= body[0][0]) return body[0][1];
    const i = Math.min(body.length - 2, Math.floor((s - body[0][0]) / ((body.at(-1)[0] - body[0][0]) / (body.length - 1))));
    for (let k = Math.max(0, i - 1); k < body.length - 1; k++) {
      const [s0, z0] = body[k], [s1, z1] = body[k + 1];
      if (s <= s1) return z0 + (z1 - z0) * (s - s0) / ((s1 - s0) || 1);
    }
    return body.at(-1)[1];
  };
}

function sUrovnami(model) {
  // zďaleka farby zapečené vo vrcholoch a spojené siete, bez materiálov „detail…“ (#110)
  const daleko = vzdialenaUroven(model);
  // zblízka vrhá tieň jedna zlúčená sieť (#110)
  pridajTienovehoZastupcu(model);
  const lod = new THREE.LOD();
  lod.addLevel(model, 0);
  lod.addLevel(daleko, VZDIALENOST_DETAILU);
  lod.autoUpdate = true;
  return lod;
}

export default async function postav(p, { vyskopis, kolizie, KONFIG }) {
  const m = vyskopis.mosty?.find((x) => x.nazov === p.nahradzaMost);
  if (!m) return null;
  const info = await fetch(`assets/pamiatky/${p.subor}.json`).then((r) => (r.ok ? r.json() : null)).catch(() => null);
  const ax = m.ax ?? m.od[0], az = m.az ?? m.od[1];
  const bx = m.bx ?? m.do[0], bz = m.bz ?? m.do[1];
  const L = m.dlzka ?? Math.hypot(bx - ax, bz - az);
  const ux = (bx - ax) / Math.hypot(bx - ax, bz - az), uz = (bz - az) / Math.hypot(bx - ax, bz - az);
  const vrch = m.vrch ?? m.vyska;   // pri moste s profilom rovnaký ako info.vrch (data/mapa/mosty-dunaj.json)
  const g = new THREE.Group();
  // most v oblúku (lomená os): model sa ohne do sveta okolo stredu mosta; priamy most sa len otočí
  const oblukom = m.os?.body?.length > 2 ? m.os : null;
  const stred = oblukom ? (({ x, z }) => [x, z])(bodNaOsi(oblukom, oblukom.dlzka / 2)) : null;
  if (oblukom) g.position.set(stred[0], vrch, stred[1]);
  else {
    g.position.set(ax, vrch, az);
    g.rotation.y = Math.atan2(-uz, ux);
  }

  // kolízie (pylóny, piliere na brehu, kotvy): lokálne x pozdĺž, y doľava (Blender) → svet
  const svet = oblukom ? ([x, y]) => naSvet(oblukom, x, y) : ([x, y]) => [ax + ux * x + uz * y, az + uz * x - ux * y];
  for (const k of info?.kolizie ?? []) kolizie.pridajPolygon(k.map(svet), { typ: 'pamiatka', nazov: p.nazov });
  // lávky pod mostovkou (Most SNP): pochôdzne plochy o „pod“ metrov nižšie ako vozovka – po 4 m
  const lavky = (info?.lavky ?? []).map((l) => {
    const body = [];
    for (let x = l.od; x <= l.do + 0.01; x += 4) {
      const [wx, wz] = svet([Math.min(x, l.do), l.y]);
      body.push({ x: wx, z: wz, h: (vyskopis.vyskaNaOsi?.(m, Math.min(x, l.do)) ?? vrch) - l.pod });
    }
    return { body, sirka: l.sirka };
  });
  if (lavky.length) pridajPochodzne(`most:${p.subor}`, lavky);

  const zalozny = () => g.add(vytvorMosty([m], vyskopis, KONFIG));
  if (!info) { zalozny(); g.position.set(0, 0, 0); g.rotation.y = 0; return { objekt: g }; }
  nacitajModelPamiatky(p.subor, { ao: false, gz: true }).then((model) => {
    if (!model) {
      g.position.set(0, 0, 0); g.rotation.y = 0;
      zalozny();
      return;
    }
    // model z Blendera je ohnutý podľa výškového profilu mosta (info.profil = [s, z modelu], tools/blender/mostne.py) –
    // tu sa ohne už len o rozdiel: konce na teréne (detailný terén) a staré modely bez profilu celé podľa mostovky
    const zModelu = profilModelu(info.profil);
    const posun = (s) => {
      const t = Math.max(0, Math.min(L, s));
      const h = vyskopis.vyskaNaOsi ? vyskopis.vyskaNaOsi(m, t) : vyskopis.vyska(ax + ux * t, az + uz * t);
      return h - vrch - zModelu(t);
    };
    g.add(sUrovnami(ohni(model, posun, oblukom, stred)));
  });
  return { objekt: g };
}
