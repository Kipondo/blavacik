// Načítanie realistického modelu postavy (.glb) a vytváranie jeho kópií.
// Model sa stiahne raz; každá postava (hráč, NPC) dostane vlastnú kópiu s vlastnou kostrou a materiálmi.

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { clone as klonujSKostrou } from 'three/addons/utils/SkeletonUtils.js';

const loader = new GLTFLoader();
loader.setMeshoptDecoder(MeshoptDecoder);

const cache = new Map();

/** Stiahne .glb (raz) – vráti Promise s gltf ({ scene, animations }). */
export function nacitajGlb(url) {
  if (!cache.has(url)) cache.set(url, loader.loadAsync(url));
  return cache.get(url);
}

/**
 * Vytvorí novú inštanciu postavy z .glb.
 * Vráti { koren, siete, kosti, animacie } – siete sú SkinnedMesh-e podľa mena (telo_*, odev_*, vlasy_* …).
 */
/**
 * Spoločná kostra pre všetky časti postavy (#110): SkeletonUtils.clone dá každej kostrovej sieti vlastný objekt
 * Skeleton, hoci majú tie isté kosti – three.js potom každý snímok prepočíta matice kostí (53) a nahrá textúru kostí
 * pre každú viditeľnú časť zvlášť (~12–20 na postavu, aj do tieňa). Časti s rovnakými kosťami a inverznými maticami
 * dostanú jednu kostru. Vráti počet častí, ktoré prešli na spoločnú kostru.
 */
export function zdielajKostru(koren) {
  let spolocna = null, n = 0;
  koren.traverse((o) => {
    if (!o.isSkinnedMesh) return;
    const k = o.skeleton;
    if (!spolocna) { spolocna = k; return; }
    if (k === spolocna) return;
    const rovnake = k.bones.length === spolocna.bones.length && k.bones.every((b, i) => b === spolocna.bones[i])
      && k.boneInverses.every((m, i) => m.equals(spolocna.boneInverses[i]));
    if (!rovnake) return;
    k.dispose();
    o.skeleton = spolocna;
    n++;
  });
  return n;
}

/** Uvoľní textúry kostier postavy (pri zrušení NPC). */
export function uvolniKostry(koren) {
  const kostry = new Set();
  koren.traverse((o) => { if (o.isSkinnedMesh) kostry.add(o.skeleton); });
  for (const k of kostry) k.dispose();
}

export async function vytvorInstanciu(url) {
  const gltf = await nacitajGlb(url);
  const koren = klonujSKostrou(gltf.scene);
  zdielajKostru(koren);
  const siete = [];
  const kosti = {};
  koren.traverse((o) => {
    if (o.isBone) kosti[o.name] = o;
    if (o.isMesh) siete.push(pripravSiet(o));
  });
  return { koren, siete, kosti, animacie: gltf.animations };
}

/**
 * Pripraví sieť inštancie: vlastný materiál (farby šatníka a pleti sa menia nezávisle), vlasy, tiene
 * a userData.objekt = meno objektu z Blendera (telo, odev_*, vlasy_*, brada_* …).
 */
export function pripravSiet(o) {
  o.material = o.material.clone();
  if (o.material.name.endsWith('_pramene')) {
    // pásiky vlasov: ostré vlásky cez alphaTest, bez triedenia priehľadnosti
    o.material.alphaTest = 0.4;
    o.material.transparent = false;
    o.material.side = THREE.DoubleSide;
  } else if (o.material.transparent) {
    // mäkké okraje vlasov a brady: kreslia sa po koži a nezapisujú hĺbku
    o.material.depthWrite = false;
    o.renderOrder = 1;
  }
  // objekt z Blendera podľa mena materiálu (mená uzlov sa pri kompresii môžu stratiť):
  // koza_* = telo, <objekt>_ostne / <objekt>_pramene = časť vlasov, inak meno materiálu = meno objektu
  const mm = o.material.name || o.name;
  // zuby, jazyk a oči sú vnútri obrysu hlavy – tieň by nezmenili, v tieňovej mape boli 5 volaní na postavu (#110)
  o.userData.bezTiena = /^(zuby|jazyk|oko_)/.test(mm);
  o.castShadow = !o.userData.bezTiena;
  o.receiveShadow = true;
  o.frustumCulled = false; // animované kosti menia obrys, orezávanie by postavu občas skrylo
  o.userData.objekt = mm.startsWith('koza_') ? 'telo' : mm.replace(/_(ostne|pramene)$/, '');
  return o;
}

/** Pomocník: nájde sieť (alebo primitívy siete) podľa mena objektu z Blendera. */
export function sieteObjektu(instancia, meno) {
  return instancia.siete.filter((s) => s.userData.objekt === meno);
}

export { THREE };
