// Načítanie modelov pamiatok z Blendera (tools/blender/, issue #31 etapa G3): assets/pamiatky/<meno>.glb
// (geometria zmenšená cez gltfpack – meshopt) + <meno>-ao.jpg (zapečené zatienenie okolia, aoMap).
// Ak sa model nenačíta, vráti null a pamiatka sa postaví po starom z jednoduchých telies.
// Veľké stavby (výškové budovy) majú zatienenie zapečené vo farbách vrcholov – vtedy { ao: false },
// a sú zbalené gzipom (<meno>.glb.gz) – vtedy { gz: true }.
// Materiály s menom „sklo…“ dostanú silnejší odraz okolia (ako sklenené fasády budov z dlaždíc).

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';

const loader = new GLTFLoader();
loader.setMeshoptDecoder(MeshoptDecoder);

/** .glb zbalený gzipom (veľké modely); GitHub Pages ho niekedy pošle už rozbalený – spoznáme podľa hlavičky. */
async function nacitajGz(cesta) {
  const r = await fetch(cesta);
  if (!r.ok) throw new Error(`${cesta}: ${r.status}`);
  let buf = await r.arrayBuffer();
  const b = new Uint8Array(buf, 0, 2);
  if (b[0] === 0x1f && b[1] === 0x8b) {
    buf = await new Response(new Blob([buf]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer();
  }
  return loader.parseAsync(buf, 'assets/pamiatky/');
}

export async function nacitajModelPamiatky(meno, { ao: sAo = true, gz = false } = {}) {
  try {
    const [gltf, ao] = await Promise.all([
      gz ? nacitajGz(`assets/pamiatky/${meno}.glb.gz`) : loader.loadAsync(`assets/pamiatky/${meno}.glb`),
      sAo ? new THREE.TextureLoader().loadAsync(`assets/pamiatky/${meno}-ao.jpg`).catch(() => null) : null,
    ]);
    if (ao) { ao.flipY = false; ao.colorSpace = THREE.NoColorSpace; ao.anisotropy = 4; }
    const g = gltf.scene;
    g.traverse((o) => {
      if (!o.isMesh) return;
      o.castShadow = true;
      o.receiveShadow = true;
      for (const m of Array.isArray(o.material) ? o.material : [o.material]) {
        if (ao) { m.aoMap = ao; m.aoMapIntensity = 1; }
        m.envMapIntensity = m.name.startsWith('sklo') ? 1.3 : 0.8;
        m.needsUpdate = true;
      }
    });
    return g;
  } catch (e) {
    console.warn(`Model pamiatky ${meno}.glb sa nenačítal, staviam jednoduchý:`, e?.message ?? e);
    return null;
  }
}

/**
 * Geometrie modelu prevedie do súradníc jeho koreňa ako Float32 (bez kvantovania meshopt)
 * – aby sa dali vrcholy posúvať (ohnutie mosta v nábehu, model kopírujúci terén).
 * Vracia skupinu sietí; každá geometria má v userData.povodne kópiu pôvodných polôh.
 */
export function rozbalModel(model) {
  model.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(model.matrixWorld).invert();
  const vystup = new THREE.Group();
  model.traverse((o) => {
    if (!o.isMesh) return;
    const m = new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld);
    const g = new THREE.BufferGeometry();
    for (const meno of ['position', 'normal', 'color']) {
      const a = o.geometry.getAttribute(meno);
      if (!a) continue;
      const v = new Float32Array(a.count * a.itemSize);
      for (let i = 0; i < a.count; i++) for (let k = 0; k < a.itemSize; k++) v[i * a.itemSize + k] = a.getComponent(i, k);
      g.setAttribute(meno, new THREE.BufferAttribute(v, a.itemSize));
    }
    if (o.geometry.index) g.setIndex(o.geometry.index.clone());
    g.applyMatrix4(m);
    g.userData.povodne = g.getAttribute('position').array.slice();
    const mesh = new THREE.Mesh(g, o.material);
    mesh.castShadow = mesh.receiveShadow = true;
    vystup.add(mesh);
  });
  return vystup;
}
