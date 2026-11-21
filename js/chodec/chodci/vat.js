// Zapečenie animácie chodcov do textúry (VAT – vertex animation texture).
//
// Zlúčené LOD siete NPC (lod1_* a lod2_* v assets/postavy/npc/*.glb) sú skinnuté. Pre stovky chodcov
// je kostra na každého drahá, preto sa pri načítaní raz prehrá chôdza a státie, polohy vrcholov
// sa uložia do float textúry (riadok = snímka) a chodci sa kreslia cez InstancedMesh – shader si
// polohu vrcholu vyberie podľa času a fázy chodca (material-vat.js).

import * as THREE from 'three';
import { clone as klonujSKostrou } from 'three/addons/utils/SkeletonUtils.js';
import { nacitajGlb } from '../postava/nacitaj-postavu.js';
import { klipyPreModel, lodUdaje } from '../npc/model-npc.js';

export const KLIPY = [
  { meno: 'chodza', snimky: 24 },
  { meno: 'stoj', snimky: 12 },
];
const SIRKA_MAX = 4096;
const KOREN_WEBU = new URL('../../../', import.meta.url);

/**
 * Zapečie všetky varianty jedného modelu (muz, zena, …).
 * Vráti Map(variant → { lod: [ {geometria, vat, sirka, riadkyNaSnimku}, … ], sloty, dlzkaChodze, rychlostChodze })
 */
export async function zapecModel(urlRel) {
  const url = new URL(urlRel, KOREN_WEBU).href;
  const gltf = await nacitajGlb(url);
  const klipy = await klipyPreModel(url, gltf);
  const kopia = klonujSKostrou(gltf.scene);
  kopia.position.set(0, 0, 0);
  kopia.updateMatrixWorld(true);

  // LOD siete podľa variantu
  const varianty = new Map();
  kopia.traverse((o) => {
    if (!o.isSkinnedMesh) return;
    const ud = lodUdaje(o);
    if (!ud) return;
    if (!varianty.has(ud.variant)) varianty.set(ud.variant, { siete: [], sloty: JSON.parse(ud.sloty || '[]') });
    varianty.get(ud.variant).siete[ud.npc_lod - 1] = o;
  });

  const mixer = new THREE.AnimationMixer(kopia);
  const akcie = KLIPY.map((k) => {
    const klip = klipy.find((c) => c.name === k.meno) ?? klipy.find((c) => c.name === 'stoj') ?? klipy[0];
    const a = mixer.clipAction(klip);
    return { ...k, akcia: a, trvanie: klip.duration };
  });

  const out = new Map();
  const v = new THREE.Vector3();
  let pocetSnimok = 0;
  for (const k of akcie) pocetSnimok += k.snimky;

  for (const [variant, { siete, sloty }] of varianty) {
    const lod = [];
    for (const siet of siete) {
      if (!siet) { lod.push(null); continue; }
      const n = siet.geometry.getAttribute('position').count;
      const sirka = Math.min(n, SIRKA_MAX);
      const riadkyNaSnimku = Math.ceil(n / sirka);
      const data = new Float32Array(sirka * riadkyNaSnimku * pocetSnimok * 4);
      let riadok = 0;
      for (const k of akcie) {
        for (const a of akcie) a.akcia.stop();
        k.akcia.play();
        for (let f = 0; f < k.snimky; f++) {
          k.akcia.time = (f / k.snimky) * k.trvanie;
          mixer.update(0);
          kopia.updateMatrixWorld(true);
          siet.skeleton.update();
          for (let i = 0; i < n; i++) {
            siet.getVertexPosition(i, v);
            v.applyMatrix4(siet.matrixWorld);
            const r = riadok + Math.floor(i / sirka), c = i % sirka;
            const j = (r * sirka + c) * 4;
            data[j] = v.x; data[j + 1] = v.y; data[j + 2] = v.z; data[j + 3] = 1;
          }
          riadok += riadkyNaSnimku;
          // nech prehliadač nezamrzne pri pečení
          if ((f & 7) === 7) await new Promise((r) => setTimeout(r, 0));
        }
      }
      const vat = new THREE.DataTexture(data, sirka, riadkyNaSnimku * pocetSnimok, THREE.RGBAFormat, THREE.FloatType);
      vat.minFilter = vat.magFilter = THREE.NearestFilter;
      vat.needsUpdate = true;

      // geometria bez kostry (polohy berie shader z textúry)
      const g = new THREE.BufferGeometry();
      g.setIndex(siet.geometry.index);
      g.setAttribute('position', siet.geometry.getAttribute('position'));
      g.setAttribute('color', siet.geometry.getAttribute('color'));
      g.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0.9, 0), 1.3);
      lod.push({ geometria: g, vat, sirka, riadkyNaSnimku });
    }
    const chodza = akcie[0];
    out.set(variant, { lod, sloty, trvanieChodze: chodza.trvanie, trvanieStoja: akcie[1].trvanie });
  }
  for (const a of akcie) a.akcia.stop();
  return out;
}

/** Začiatočné riadky klipov (v snímkach) – pre shader. */
export function rozlozenieKlipov() {
  let start = 0;
  return KLIPY.map((k) => { const r = { start, pocet: k.snimky }; start += k.snimky; return r; });
}
