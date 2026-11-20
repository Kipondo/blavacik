// Výšková budova (alebo iná veľká stavba) z Blendera: assets/pamiatky/<subor>.glb.gz + <subor>.json.
// Generátory sú v tools/blender/vyskove/ (tools/blender/vyskove_budovy.py). JSON nesie pôdorysy
// v lokálnych metroch hry (okolo bodu x, z zo záznamu) – z nich sú kolízie a z dlaždíc mesta
// sa vynechajú bežné vysunuté budovy, ktoré model nahrádza.
//
// Záznam v data/mapa/pamiatky.json:
//   { "model": "vyskova-budova", "subor": "nivy-tower", "nazov": "Nivy Tower", "x": 1656.3, "z": -298.6, "dosah": 80 }
// Jeden model môže stáť na viacerých miestach (napr. štyri rovnaké veže Sky Park).
// Model sa načíta na pozadí – hra nečaká na stiahnutie geometrie, kolízie platia hneď.

import * as THREE from 'three';
import { nacitajModelPamiatky } from './model-glb.js';
import { nahradBudovy } from './nahradene-budovy.js';

// Drobné prvky (stĺpiky, priečky – materiály „detail…“) sa z diaľky nekreslia: na pár pixeloch
// by len blikali (moaré) a zbytočne by sa kreslili tisíce trojuholníkov.
const VZDIALENOST_DETAILU = 260;

const cacheInfo = new Map();
const cacheModel = new Map();

function nacitajInfo(subor) {
  if (!cacheInfo.has(subor)) {
    cacheInfo.set(subor, fetch(`assets/pamiatky/${subor}.json`).then((r) => (r.ok ? r.json() : null)).catch(() => null));
  }
  return cacheInfo.get(subor);
}

function nacitajModel(subor) {
  if (!cacheModel.has(subor)) cacheModel.set(subor, nacitajModelPamiatky(subor, { ao: false, gz: true }));
  return cacheModel.get(subor);
}

/** Model s dvoma úrovňami: zblízka všetko, zďaleka bez materiálov „detail…“. */
function sUrovnami(model) {
  const daleko = model.clone();
  const zmaz = [];
  daleko.traverse((o) => {
    if (!o.isMesh) return;
    const m = Array.isArray(o.material) ? o.material : [o.material];
    if (m.every((x) => x.name.startsWith('detail'))) zmaz.push(o);
  });
  for (const o of zmaz) o.parent.remove(o);
  const lod = new THREE.LOD();
  lod.addLevel(model, 0);
  lod.addLevel(daleko, VZDIALENOST_DETAILU);
  return lod;
}

/** Jednoduchá záloha: vysunuté pôdorysy, kým (alebo keď) sa model nenačíta. */
function zaloha(info) {
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: '#7f97a6', roughness: 0.2, metalness: 0.6 });
  info.obrysy.forEach((o, i) => {
    const tvar = new THREE.Shape(o.map(([x, z]) => new THREE.Vector2(x, -z)));
    const geo = new THREE.ExtrudeGeometry(tvar, { depth: info.vysky?.[i] ?? info.vyska, bevelEnabled: false });
    geo.rotateX(-Math.PI / 2);
    g.add(new THREE.Mesh(geo, mat));
  });
  return g;
}

export default async function postav(p, { vyskopis, kolizie }) {
  const info = await nacitajInfo(p.subor);
  if (!info) return null;
  const u = p.natocenie ?? 0, c = Math.cos(u), s = Math.sin(u);
  // lokálne → svet (otočenie okolo osi y ako v three.js: x' = x·cos + z·sin, z' = −x·sin + z·cos)
  const svet = (o) => o.map(([x, z]) => [p.x + x * c + z * s, p.z - x * s + z * c]);
  let zem = Infinity;
  for (const o of info.obrysy) {
    const w = svet(o);
    nahradBudovy(w, 1.5);
    kolizie.pridajPolygon(w, { typ: 'pamiatka', nazov: p.nazov });
    for (const [x, z] of w) zem = Math.min(zem, vyskopis.vyskaTerenu(x, z));
  }
  const g = new THREE.Group();
  g.position.set(p.x, Number.isFinite(zem) ? zem : vyskopis.vyskaTerenu(p.x, p.z), p.z);
  g.rotation.y = u;
  const docasny = zaloha(info);
  g.add(docasny);
  nacitajModel(p.subor).then((model) => {
    if (!model) return;
    g.remove(docasny);
    docasny.traverse((o) => o.geometry?.dispose());
    g.add(sUrovnami(cacheModel.get(p.subor + '#pouzity') ? model.clone() : model));
    cacheModel.set(p.subor + '#pouzity', true);
  });
  return { objekt: g };
}
