// Načítanie modelov pamiatok z Blendera (tools/blender/, issue #31 etapa G3): assets/pamiatky/<meno>.glb
// (geometria zmenšená cez gltfpack – meshopt) + <meno>-ao.jpg (zapečené zatienenie okolia, aoMap).
// Ak sa model nenačíta, vráti null a pamiatka sa postaví po starom z jednoduchých telies.

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';

const loader = new GLTFLoader();
loader.setMeshoptDecoder(MeshoptDecoder);

export async function nacitajModelPamiatky(meno) {
  try {
    const [gltf, ao] = await Promise.all([
      loader.loadAsync(`assets/pamiatky/${meno}.glb`),
      new THREE.TextureLoader().loadAsync(`assets/pamiatky/${meno}-ao.jpg`).catch(() => null),
    ]);
    if (ao) { ao.flipY = false; ao.colorSpace = THREE.NoColorSpace; ao.anisotropy = 4; }
    const g = gltf.scene;
    g.traverse((o) => {
      if (!o.isMesh) return;
      o.castShadow = true;
      o.receiveShadow = true;
      for (const m of Array.isArray(o.material) ? o.material : [o.material]) {
        if (ao) { m.aoMap = ao; m.aoMapIntensity = 1; }
        m.envMapIntensity = 0.8;
        m.needsUpdate = true;
      }
    });
    return g;
  } catch (e) {
    console.warn(`Model pamiatky ${meno}.glb sa nenačítal, staviam jednoduchý:`, e?.message ?? e);
    return null;
  }
}
