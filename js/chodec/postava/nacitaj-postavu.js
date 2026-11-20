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
export async function vytvorInstanciu(url) {
  const gltf = await nacitajGlb(url);
  const koren = klonujSKostrou(gltf.scene);
  const siete = [];
  const kosti = {};
  koren.traverse((o) => {
    if (o.isBone) kosti[o.name] = o;
    if (o.isMesh) {
      // vlastný materiál pre každú inštanciu (farby šatníka a pleti sa menia nezávisle)
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
      o.castShadow = true;
      o.receiveShadow = true;
      o.frustumCulled = false; // animované kosti menia obrys, orezávanie by postavu občas skrylo
      // objekt z Blendera: pri viacerých materiáloch je sieť dieťaťom skupiny, ktorá nesie meno objektu
      const p = o.parent;
      const skupina = p && !p.isBone && p.children.length > 0 && p.children.every((c) => c.isMesh);
      o.userData.objekt = skupina ? p.name : o.name;
      siete.push(o);
    }
  });
  return { koren, siete, kosti, animacie: gltf.animations };
}

/** Pomocník: nájde sieť (alebo primitívy siete) podľa mena objektu z Blendera. */
export function sieteObjektu(instancia, meno) {
  return instancia.siete.filter((s) => s.userData.objekt === meno);
}

export { THREE };
