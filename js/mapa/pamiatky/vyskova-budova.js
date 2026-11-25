// Výšková budova (alebo iná veľká stavba) z Blendera: assets/pamiatky/<subor>.glb.gz + <subor>.json.
// Generátory sú v tools/blender/vyskove/ (tools/blender/vyskove_budovy.py). JSON nesie pôdorysy
// v lokálnych metroch hry (okolo bodu x, z zo záznamu) – z nich sú kolízie a z dlaždíc mesta
// sa vynechajú bežné vysunuté budovy, ktoré model nahrádza.
//
// Záznam v data/mapa/pamiatky.json:
//   { "model": "vyskova-budova", "subor": "nivy-tower", "nazov": "Nivy Tower", "x": 1656.3, "z": -298.6, "dosah": 80 }
// Jeden model môže stáť na viacerých miestach (napr. štyri rovnaké veže Sky Park).
// Model sa načíta na pozadí – hra nečaká na stiahnutie geometrie, kolízie platia hneď.
// "podlaTerenu": true v <subor>.json = model kopíruje terén (hradby, živé ploty): y vrcholu = terén + lokálna výška.
// "nahradit": [[[x, z], …]] v <subor>.json = pôdorysy bez kolízie, z ktorých sa len vyhodia budovy a stromy dlaždíc.
// "nahraditSochy": [[[x, z], …]] = pôdorysy, v ktorých socha z OSM (sochy-modul) ustúpi soche z modelu.
// "bezKoliziiObrysov": true = z obrysov sa nerobia kolízie (stavbu s terasami a lávkami rieši vlastný modul s výškami).
// "kolizie": [[[x, z], …]] = vlastné kolízne pôdorysy (napr. krídla okolo átria – do dvora sa dá vojsť).
// "vyskyKolizii": [m, …] = výška každej kolízie nad terénom (napr. nádrž fontány 1,6 m) – kamera nad nízkou prekážkou
//   prejde (js/kamera/kolizia-kamery.js); bez nej má výšku len model podľa terénu (výška modelu + 0,5 m).
// "plochy": [{ body: [[x, z, h], …], sirka }] = pochôdzne plochy (schodisko pred vstupom), h nad základňou modelu
//   (js/mapa/mosty/pochodzne-pamiatok.js). "vchody": [{ id, bod: [x, z], vyska }] = dvere na neskorší interiér.
// "zakladnaBod": [x, z] = model sa položí na terén v tomto bode (inak na najnižší terén pod obrysmi).
// Keď sa pod stavbou načíta alebo uvoľní podrobný terén z lasera, výšky sa prepočítajú.

import * as THREE from 'three';
import { nacitajModelPamiatky, rozbalModel } from './model-glb.js';
import { vzdialenaUroven } from './vzdialena-uroven.js';
import { pridajTienovehoZastupcu } from '../../grafika/tienovy-zastupca.js';
import { nahradBudovy, nahradSochy } from './nahradene-budovy.js';
import { pridajPochodzne } from '../mosty/pochodzne-pamiatok.js';

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

/**
 * Model s dvoma úrovňami: zblízka všetko, zďaleka bez materiálov „detail…“. Pevný model má zďaleka farby
 * zapečené vo vrcholoch a spojené siete (js/mapa/pamiatky/vzdialena-uroven.js, #110) – pripraví sa raz na model
 * a kópie (napr. štyri veže Sky Park) ju zdieľajú. Model podľa terénu má zďaleka tie isté siete (ich vrcholy
 * sa posúvajú s terénom).
 */
const cacheDaleko = new Map();
function sUrovnami(model, subor = null) {
  let daleko;
  if (subor) {
    if (!cacheDaleko.has(subor)) cacheDaleko.set(subor, vzdialenaUroven(model));
    daleko = cacheDaleko.get(subor).clone();
    // zblízka vrhá tieň jedna zlúčená sieť (#110) – kópie modelu ju zdedia
    if (!model.userData.maZastupcu) { pridajTienovehoZastupcu(model); model.userData.maZastupcu = true; }
  } else {
    daleko = model.clone();
    const zmaz = [];
    daleko.traverse((o) => {
      if (!o.isMesh) return;
      const m = Array.isArray(o.material) ? o.material : [o.material];
      if (m.every((x) => x.name.startsWith('detail'))) zmaz.push(o);
    });
    for (const o of zmaz) o.parent.remove(o);
  }
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

/** Podpis stavu podrobného terénu (laser) v dlaždiciach pod obdĺžnikom – keď sa zmení, prepočítame výšky. */
function podpisTerenu(vyskopis, ohr) {
  if (!vyskopis.maDetail || !ohr) return '';
  let s = '';
  for (let i = Math.floor(ohr.minX / 500); i <= Math.floor(ohr.maxX / 500); i++) {
    for (let j = Math.floor(ohr.minZ / 500); j <= Math.floor(ohr.maxZ / 500); j++) s += vyskopis.maDetail(i, j) ? '1' : '0';
  }
  return s;
}

export default async function postav(p, { vyskopis, kolizie }) {
  const info = await nacitajInfo(p.subor);
  if (!info) return null;
  const u = p.natocenie ?? 0, c = Math.cos(u), s = Math.sin(u);
  // lokálne → svet (otočenie okolo osi y ako v three.js: x' = x·cos + z·sin, z' = −x·sin + z·cos)
  const svetBod = (x, z) => [p.x + x * c + z * s, p.z - x * s + z * c];
  const svet = (o) => o.map(([x, z]) => svetBod(x, z));
  const obrysy = info.obrysy.map(svet);
  for (const w of obrysy) {
    nahradBudovy(w, 1.5);
    // bezKoliziiObrysov: kolízie s výškou rieši vlastný modul stavby (napr. Átriaky – terasy, lávky)
    if (!info.bezKoliziiObrysov) kolizie.pridajPolygon(w, { typ: 'pamiatka', nazov: p.nazov });
  }
  // pôdorysy, z ktorých sa len vyhodia budovy a stromy dlaždíc (napr. blok na stĺpoch – pod ním sa dá prejsť)
  for (const w of info.nahradit ?? []) nahradBudovy(svet(w), 0.5);
  // socha je súčasťou modelu (napr. socha z gúľ pri Eurovea 2) – všeobecná socha z OSM sa na tom mieste nestavia
  for (const w of info.nahraditSochy ?? []) nahradSochy(svet(w));
  // ďalšie kolízie bez nahrádzania budov (hradby, múry). Model podľa terénu (ploty, živé ploty) je nízky:
  // kolízia dostane vrch (terén + výška modelu), aby nad ním kamera prešla (js/kamera/kolizia-kamery.js)
  for (const [i, k] of (info.kolizie ?? []).entries()) {
    const w = svet(k);
    const nad = info.vyskyKolizii?.[i] ?? (info.podlaTerenu ? (info.vyska ?? 3) + 0.5 : undefined);
    const vrch = nad === undefined ? undefined : Math.max(...w.map(([x, z]) => vyskopis.vyskaTerenu(x, z))) + nad;
    kolizie.pridajPolygon(w, vrch === undefined ? { typ: 'pamiatka', nazov: p.nazov } : { typ: 'pamiatka', nazov: p.nazov, vrch });
  }
  const ohr = obrysy.length ? obrysy.flat().reduce((o, [x, z]) => ({
    minX: Math.min(o.minX, x), maxX: Math.max(o.maxX, x), minZ: Math.min(o.minZ, z), maxZ: Math.max(o.maxZ, z),
  }), { minX: Infinity, maxX: -Infinity, minZ: Infinity, maxZ: -Infinity }) : null;
  const zakladna = () => {
    // model so zvažujúcim sa terénom pod sebou sa kladie na terén v danom bode (napr. ulica pred vstupom)
    if (info.zakladnaBod) return vyskopis.vyskaTerenu(...svetBod(...info.zakladnaBod));
    let zem = Infinity;
    for (const w of obrysy) for (const [x, z] of w) zem = Math.min(zem, vyskopis.vyskaTerenu(x, z));
    return Number.isFinite(zem) ? zem : vyskopis.vyskaTerenu(p.x, p.z);
  };

  const g = new THREE.Group();
  g.position.set(p.x, info.podlaTerenu ? 0 : zakladna(), p.z);
  // pochôdzne plochy (schody pred vstupom): výška = základňa modelu + h; prepočítajú sa so základňou
  const klucPloch = `${p.subor}@${p.x},${p.z}`;
  const zapisPlochy = () => {
    if (!info.plochy?.length) return;
    const y0 = g.position.y;
    pridajPochodzne(klucPloch, info.plochy.map((pr) => ({
      sirka: pr.sirka,
      body: pr.body.map(([x, z, h]) => { const [wx, wz] = svetBod(x, z); return { x: wx, z: wz, h: y0 + h }; }),
    })));
  };
  zapisPlochy();
  g.rotation.y = u;
  const docasny = info.podlaTerenu ? new THREE.Group() : zaloha(info);
  g.add(docasny);

  // model, ktorý kopíruje terén: každý vrchol na výšku terénu + jeho lokálna výška
  let siete = null, ohrModelu = ohr;
  const prisposobTerenu = () => {
    if (!siete) return;
    for (const mesh of siete.children) {
      const pos = mesh.geometry.getAttribute('position'), povodne = mesh.geometry.userData.povodne;
      for (let i = 0; i < pos.count; i++) {
        const x = povodne[i * 3], y = povodne[i * 3 + 1], z = povodne[i * 3 + 2];
        const [wx, wz] = svetBod(x, z);
        pos.setY(i, y + vyskopis.vyskaTerenu(wx, wz));
      }
      pos.needsUpdate = true;
      mesh.geometry.computeBoundingSphere();
    }
  };
  nacitajModel(p.subor).then((model) => {
    if (!model) return;
    g.remove(docasny);
    docasny.traverse((o) => o.geometry?.dispose());
    if (info.podlaTerenu) {
      siete = rozbalModel(model);
      const b = new THREE.Box3().setFromObject(siete);
      const [ax, az] = svetBod(b.min.x, b.min.z), [bx, bz] = svetBod(b.max.x, b.max.z);
      ohrModelu = { minX: Math.min(ax, bx), maxX: Math.max(ax, bx), minZ: Math.min(az, bz), maxZ: Math.max(az, bz) };
      prisposobTerenu();
      podpis = podpisTerenu(vyskopis, ohrModelu);
      g.add(sUrovnami(siete));
      return;
    }
    g.add(sUrovnami(cacheModel.get(p.subor + '#pouzity') ? model.clone() : model, p.subor));
    cacheModel.set(p.subor + '#pouzity', true);
  });

  // keď sa načíta/uvoľní podrobný terén (laser) pod stavbou, upravíme výšku (pevný model)
  // alebo znova položíme vrcholy na terén (model podľa terénu)
  let podpis = podpisTerenu(vyskopis, ohr);
  let cakanie = 0;
  const update = () => {
    if (++cakanie < 30) return;
    cakanie = 0;
    const nove = podpisTerenu(vyskopis, ohrModelu);
    if (nove === podpis) return;
    podpis = nove;
    if (info.podlaTerenu) prisposobTerenu();
    else { g.position.y = zakladna(); zapisPlochy(); }
  };
  return { objekt: g, update };
}
