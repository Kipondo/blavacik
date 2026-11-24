// Zlúčenie sietí s rovnakým materiálom do jednej (#110) – menej volaní kreslenia pre statické objekty zložené
// z mnohých dielov (pamiatky z kódu, prístrešky zastávok). Pozícia, natočenie a mierka dielov sa zapečú do geometrie.

import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

/**
 * Zlúči siete statickej pamiatky s rovnakým materiálom do jednej (#110: pontóny, pomník Štefánika a ďalšie
 * pamiatky z kódu mali desiatky sietí – každá je samostatné volanie kreslenia, aj do tieňa). Pamiatky s update
 * (animácie – fontány, vlajky) a siete označené userData.nezlucovat ostávajú, ako sú.
 * bunka (m) = zlučujú sa len siete v rovnakom štvorci (podľa stredu obalu) – veľké celky (voda celého mesta)
 * ostanú po kúskoch, ktoré sa mimo záberu nekreslia.
 */
export function zlucPodlaMaterialu(objekt, { bunka = 0 } = {}) {
  objekt.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(objekt.matrixWorld).invert();
  const skupiny = new Map();
  objekt.traverse((o) => {
    if (!o.isMesh || o.isInstancedMesh || o.isSkinnedMesh || Array.isArray(o.material) || o.userData.nezlucovat) return;
    if (o.morphTargetInfluences || !o.geometry?.attributes?.position || !o.visible) return;
    const g = o.geometry;
    let stvorec = '';
    if (bunka) {
      if (!g.boundingSphere) g.computeBoundingSphere();
      const c = g.boundingSphere.center.clone().applyMatrix4(o.matrixWorld);
      stvorec = `${Math.floor(c.x / bunka)},${Math.floor(c.z / bunka)}`;
    }
    const kluc = [o.material.uuid, Object.keys(g.attributes).sort().join(','), g.index ? 'i' : 'n', o.layers.mask, o.renderOrder,
      o.castShadow ? 1 : 0, o.receiveShadow ? 1 : 0, stvorec].join('|');
    if (!skupiny.has(kluc)) skupiny.set(kluc, []);
    skupiny.get(kluc).push(o);
  });
  const m = new THREE.Matrix4();
  for (const siete of skupiny.values()) {
    if (siete.length < 2) continue;
    const geos = siete.map((o) => {
      const g = o.geometry.clone();
      for (const meno of Object.keys(g.morphAttributes)) delete g.morphAttributes[meno];
      return g.applyMatrix4(m.multiplyMatrices(inv, o.matrixWorld));
    });
    const spojena = mergeGeometries(geos, false);
    for (const g of geos) g.dispose();
    if (!spojena) continue;
    const vzor = siete[0];
    const nova = new THREE.Mesh(spojena, vzor.material);
    nova.name = vzor.name;
    nova.castShadow = vzor.castShadow; nova.receiveShadow = vzor.receiveShadow;
    nova.layers.mask = vzor.layers.mask; nova.renderOrder = vzor.renderOrder;
    nova.userData.zlucena = true;   // vlastná geometria – pri odstránení objektu ju treba uvoľniť (uvolniZlucene)
    if (bunka) {
      // kúsok veľkého celku sa za koncom hmly skryje (js/kamera/dohlad.js)
      spojena.computeBoundingSphere();
      const c = spojena.boundingSphere.center.clone().applyMatrix4(objekt.matrixWorld);
      nova.userData.dohlad = { x: c.x, z: c.z, r: spojena.boundingSphere.radius };
    }
    for (const o of siete) o.parent?.remove(o);
    objekt.add(nova);
  }
}

/** Uvoľní geometrie sietí, ktoré vznikli zlúčením (objekt sa stavia a ruší opakovane – napr. prístrešky zastávok). */
export function uvolniZlucene(objekt) {
  objekt.traverse((o) => { if (o.userData.zlucena) o.geometry.dispose(); });
}
