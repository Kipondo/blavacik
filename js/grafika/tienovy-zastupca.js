// Tieňový zástupca (#110): statický objekt z mnohých sietí (pamiatka, budovy a strechy dlaždice) sa do tieňovej
// mapy kreslí jednou sieťou namiesto jednej na materiál. Zástupca je zlúčená geometria (len polohy) na vrstve
// VRSTVA_TIENA – kreslí ju len kamera tieňa (js/grafika/dosah-tienov.js), do obrazu nie. Pôvodné siete tieň
// nevrhajú (userData.tienCezZastupcu – dosah tieňov ich nezapína).
// Siete s priehľadnosťou alebo alphaTest (listy, mreže z textúry), inštancie a kostrové siete ostávajú, ako sú.

import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { VRSTVA_TIENA } from '../mapa/zelen/stromy.js';
import { dokonci } from '../mapa/kroky.js';

// spoločné materiály zástupcov podľa strany a strany tieňa pôvodného materiálu (pri kreslení tieňa sa nahradia
// hĺbkovým, rozhoduje len to, ktoré steny sa kreslia)
const materialy = new Map();
function materialZastupcu(kluc, side, shadowSide) {
  if (!materialy.has(kluc)) {
    const m = new THREE.MeshBasicMaterial({ side, colorWrite: false });
    m.shadowSide = shadowSide;
    materialy.set(kluc, m);
  }
  return materialy.get(kluc);
}

/** Geometria siete len s polohami (Float32, aj z kvantovaných modelov) v súradniciach koreňa. */
function polohy(o, matica) {
  const p = o.geometry.getAttribute('position');
  const P = new Float32Array(p.count * 3);
  for (let i = 0; i < p.count; i++) { P[i * 3] = p.getX(i); P[i * 3 + 1] = p.getY(i); P[i * 3 + 2] = p.getZ(i); }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(P, 3));
  const idx = o.geometry.index;
  const dr = o.geometry.drawRange;
  if (idx) {
    const od = dr.start, po = Math.min(idx.count, od + dr.count);
    g.setIndex(new THREE.BufferAttribute(Uint32Array.from(idx.array.subarray(od, po)), 1));
  } else {
    const od = dr.start, po = Math.min(p.count, od + dr.count);
    g.setIndex(new THREE.BufferAttribute(Uint32Array.from({ length: po - od }, (_, i) => od + i), 1));
  }
  g.applyMatrix4(matica);
  return g;
}

/**
 * Pridá objektu tieňových zástupcov (jeden na stranu a stranu tieňa materiálu). vynechat(o) = siete, ktoré ostanú samostatné.
 * Vráti počet nahradených sietí (0 = nič sa nezmenilo).
 */
export function pridajTienovehoZastupcu(objekt, volby) {
  return dokonci(krokyTienovehoZastupcu(objekt, volby));
}

/** To isté po krokoch (generátor – po každej sieti yield; stavba dlaždice tak nesekne). */
export function* krokyTienovehoZastupcu(objekt, { vynechat = () => false } = {}) {
  objekt.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(objekt.matrixWorld).invert();
  const skupiny = new Map();
  objekt.traverse((o) => {
    if (!o.isMesh || o.isInstancedMesh || o.isSkinnedMesh || !o.castShadow || o.userData.tienovyZastupca) return;
    // pole materiálov (budovy: steny, strecha, okná) – každá skupina je samostatné volanie aj v tieni; zástupca ju
    // zahrnie, ak majú všetky materiály rovnakú stranu a žiadny nie je priehľadný
    const mats = Array.isArray(o.material) ? o.material : [o.material];
    if (mats.some((m) => m.transparent || m.alphaTest > 0 || m.side !== mats[0].side || m.shadowSide !== mats[0].shadowSide)) return;
    if (o.morphTargetInfluences || !o.geometry?.getAttribute('position') || vynechat(o)) return;
    // skrytá sieť (alebo v skrytej skupine) nevrhá tieň – do zástupcu nepatrí
    for (let p = o; p && p !== objekt; p = p.parent) if (!p.visible) return;
    const strana = `${mats[0].side}|${mats[0].shadowSide}`;
    if (!skupiny.has(strana)) skupiny.set(strana, []);
    skupiny.get(strana).push(o);
  });
  let n = 0;
  for (const [strana, siete] of skupiny) {
    // jedna sieť s jedným materiálom je už jedno volanie – zástupca by nič neušetril
    const volania = siete.reduce((a, o) => a + (Array.isArray(o.material) ? Math.max(1, o.geometry.groups.length) : 1), 0);
    if (volania < 2) continue;
    const geos = [];
    for (const o of siete) {
      geos.push(polohy(o, new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld)));
      yield;
    }
    const spojena = mergeGeometries(geos, false);
    for (const g of geos) g.dispose();
    if (!spojena) continue;
    spojena.computeBoundingSphere();
    const m0 = [siete[0].material].flat()[0];
    const z = new THREE.Mesh(spojena, materialZastupcu(strana, m0.side, m0.shadowSide));
    z.name = 'tien-zastupca';
    z.layers.set(VRSTVA_TIENA);
    z.castShadow = true;
    z.receiveShadow = false;
    z.userData.tienovyZastupca = true;
    z.userData.zlucena = true;   // vlastná geometria – uvoľní sa s objektom (uvolniZlucene / uvolniObjekt)
    objekt.add(z);
    for (const o of siete) { o.castShadow = false; o.userData.tienCezZastupcu = true; }
    n += siete.length;
    yield;
  }
  return n;
}
