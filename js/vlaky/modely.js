// Modely vozňov (assets/vlaky/vlaky.glb z tools/blender/vlaky_blender.py) ako inštancie: každý typ vozňa je
// jedna sieť s farbami vrcholov (farba materiálu z Blendera) → 1 volanie kreslenia na typ, nie na vozeň.
// Do diaľky (DOSAH_DETAILU) sa kreslí zjednodušený model „…-lod1“.
// Súprava = zoznam vozňov od čela: { model, dlzka, podvozky (± od stredu), otoc (vozeň otočený čelom dozadu) }.

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const loader = new GLTFLoader();
loader.setMeshoptDecoder(MeshoptDecoder);

export const VOZNE = {
  'lok-361': { dlzka: 16.8, podvozok: 4.15 },
  'voz-ic': { dlzka: 26.4, podvozok: 9.5 },
  '671-celo': { dlzka: 26.4, podvozok: 10.8 },
  '671-stred': { dlzka: 26.4, podvozok: 10.8 },
  'reg-celo': { dlzka: 21.0, podvozok: 8.4 },
  'reg-stred': { dlzka: 21.0, podvozok: 8.9 },
};
export const MAX_INSTANCII = 72;     // vozňov jedného typu naraz (11 koľají × 7 vozňov + rezerva)
export const DOSAH_DETAILU = 230;    // m

/** Vozne súpravy od čela (typ súpravy z data/vlaky/poriadok.json: '361' | '671' | 'reg'). */
export function vozneSupravy(s) {
  const v = (model, otoc = false) => ({ model, otoc, ...VOZNE[model] });
  if (s.typ === '361') return [v('lok-361'), ...Array.from({ length: s.vozne }, () => v('voz-ic'))];
  if (s.typ === '671') return [v('671-celo'), v('671-stred'), v('671-celo', true)];
  return [v('reg-celo'), v('reg-stred'), v('reg-celo', true)];
}

/** Geometria objektu z glTF v súradniciach jeho koreňa, s farbami vrcholov podľa materiálov. */
function zlucObjekt(koren) {
  koren.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(koren.matrixWorld).invert();
  const casti = [];
  koren.traverse((o) => {
    if (!o.isMesh) return;
    const m = new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld);
    const g = new THREE.BufferGeometry();
    for (const meno of ['position', 'normal']) {
      const a = o.geometry.getAttribute(meno);
      const v = new Float32Array(a.count * 3);
      for (let i = 0; i < a.count; i++) for (let k = 0; k < 3; k++) v[i * 3 + k] = a.getComponent(i, k);
      g.setAttribute(meno, new THREE.BufferAttribute(v, 3));
    }
    g.setIndex(o.geometry.index ? Array.from(o.geometry.index.array) : null);
    g.applyMatrix4(m);
    const n = g.getAttribute('position').count;
    const c = new Float32Array(n * 3);
    const farba = o.material.color ?? new THREE.Color(1, 1, 1);
    for (let i = 0; i < n; i++) { c[i * 3] = farba.r; c[i * 3 + 1] = farba.g; c[i * 3 + 2] = farba.b; }
    g.setAttribute('color', new THREE.BufferAttribute(c, 3));
    casti.push(g.index ? g : g);
  });
  const vsetky = casti.every((g) => g.index) ? casti : casti.map((g) => (g.index ? g.toNonIndexed() : g));
  const geo = mergeGeometries(vsetky, false);
  geo.computeBoundingSphere();
  return geo;
}

/** Načíta vozne a vytvorí InstancedMesh pre každý model a úroveň detailu. Pri chybe vráti null. */
export async function nacitajVozne() {
  try {
    const gltf = await loader.loadAsync('assets/vlaky/vlaky.glb');
    const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.5, metalness: 0.15, envMapIntensity: 0.9 });
    const out = {};
    for (const meno of Object.keys(VOZNE)) {
      const urovne = [];
      for (const pripona of ['', '-lod1']) {
        const o = gltf.scene.getObjectByName(meno + pripona);
        if (!o) continue;
        const im = new THREE.InstancedMesh(zlucObjekt(o), mat, MAX_INSTANCII);
        im.name = `vlak-${meno}${pripona}`;
        im.count = 0;
        im.castShadow = true;
        im.receiveShadow = true;
        im.frustumCulled = false;
        im.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
        urovne.push(im);
      }
      out[meno] = urovne;
    }
    return out;
  } catch (e) {
    console.warn('Modely vlakov sa nenačítali:', e?.message ?? e);
    return null;
  }
}
