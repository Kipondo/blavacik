// NPC postava z assets/postavy/npc/<model>.glb (vyrába tools/postava/npc.sh):
//   LOD0 = plný model ako Ďoďo (samostatné siete, textúry, morph targety, šatník),
//   LOD1 / LOD2 = jedna zlúčená sieť variantu (lod1_<variant>, lod2_<variant>) s prefarbením cez sloty.
// Animácie sa berú z dodo.glb a prispôsobia sa kostre modelu (rovnaký rig, iné proporcie).

import * as THREE from 'three';
import { clone as klonujSKostrou } from 'three/addons/utils/SkeletonUtils.js';
import { nacitajGlb, pripravSiet } from '../postava/nacitaj-postavu.js';
import { URL_DODO } from '../postava/realisticka-postava.js';
import { Animacie } from '../postava/animacie.js';
import { oblec } from '../postava/satnik.js';
import { nastavVzhlad, nastavMorph, Mimika, ZAKLAD_PLETE } from '../postava/vzhlad.js';
import { vytvorMaterialLod, MAX_SLOTOV } from './material-lod.js';

const KOREN_WEBU = new URL('../../../', import.meta.url);
const klipy = new Map();

/** Pokojová poloha kostí (pred animáciou) podľa mena. */
function pokojKosti(scena) {
  const out = {};
  scena.traverse((o) => { if (o.isBone) out[o.name] = { q: o.quaternion.clone(), p: o.position.clone() }; });
  return out;
}

/**
 * Animácie Ďoďa prenesené na kostru modelu: rotácia kosti = pokoj modelu × (pokoj Ďoďa⁻¹ × animácia),
 * posun panvy sa zmenší/zväčší podľa výšky panvy.
 */
export function klipyPreModel(url, gltf) {
  if (!klipy.has(url)) {
    klipy.set(url, nacitajGlb(URL_DODO).then((dodo) => {
      const d = pokojKosti(dodo.scene);
      const n = pokojKosti(gltf.scene);
      const k = d.pelvis && n.pelvis ? n.pelvis.p.length() / d.pelvis.p.length() : 1;
      const q = new THREE.Quaternion();
      return dodo.animations.map((povodny) => {
        const klip = povodny.clone();
        klip.tracks = klip.tracks.filter((t) => {
          const [kost, vlastnost] = t.name.split('.');
          if (!d[kost] || !n[kost]) return false;
          if (vlastnost === 'quaternion') {
            const oprava = n[kost].q.clone().multiply(d[kost].q.clone().invert());
            for (let i = 0; i < t.values.length; i += 4) q.fromArray(t.values, i).premultiply(oprava).toArray(t.values, i);
          } else if (vlastnost === 'position') {
            const a = d[kost].p, b = n[kost].p;
            for (let i = 0; i < t.values.length; i += 3) {
              t.values[i] = (t.values[i] - a.x) * k + b.x;
              t.values[i + 1] = (t.values[i + 1] - a.y) * k + b.y;
              t.values[i + 2] = (t.values[i + 2] - a.z) * k + b.z;
            }
          } else return false; // mierka a iné – nepotrebujeme
          return true;
        });
        return klip;
      });
    }));
  }
  return klipy.get(url);
}

/** Extras uzla LOD (npc_lod, variant, sloty) – môžu byť na sieti alebo na jej rodičovi. */
function lodUdaje(o) {
  for (let x = o; x; x = x.parent) if (x.userData?.npc_lod) return x.userData;
  return null;
}

/** Ktoré siete LOD0 chodec potrebuje (objekty z Blendera). */
function potrebneObjekty(spec, satnik) {
  const s = new Set(['telo', 'oko_l', 'oko_r', 'zuby', 'jazyk']);
  for (const k of spec.kusy) if (satnik.kusy[k]) s.add(satnik.kusy[k].objekt);
  if (spec.vzhlad.ucet && spec.vzhlad.ucet !== 'ziadny') s.add('vlasy_' + spec.vzhlad.ucet);
  if (spec.vzhlad.brada && spec.vzhlad.brada !== 'ziadna') s.add('brada_' + spec.vzhlad.brada);
  return s;
}

function menoObjektu(o) {
  const mm = o.material?.name || o.name;
  return mm.startsWith('koza_') ? 'telo' : mm.replace(/_(ostne|pramene)$/, '');
}

/** Farby slotov LOD siete: priemerná farba kusu × farba chodca (pleť, vlasy, paleta oblečenia). */
function farbySlotov(sloty, spec, satnik) {
  const out = Array.from({ length: MAX_SLOTOV }, () => new THREE.Color(1, 1, 1));
  const plet = new THREE.Color(spec.vzhlad.plet || '#e8b493');
  const tintPleti = new THREE.Color(plet.r / ZAKLAD_PLETE.r, plet.g / ZAKLAD_PLETE.g, plet.b / ZAKLAD_PLETE.b);
  sloty.forEach((s, i) => {
    if (i >= MAX_SLOTOV) return;
    const c = out[i].set(s.farba || '#ffffff');
    if (s.kus === 'plet') c.multiply(tintPleti);
    else if (s.kus === 'vlasy') c.multiply(new THREE.Color(spec.vzhlad.vlasy || '#6e4c34'));
    else if (s.tint) {
      const f = spec.farby?.[s.kus] || satnik.kusy[s.kus]?.farba;
      if (f) c.multiply(new THREE.Color(f));
    }
  });
  return out;
}

/**
 * Vytvorí NPC podľa popisu z poskladajChodca(). data = { npc, satnik } z nacitajNpcData().
 * Vráti objekt chodca: { koren, spec, lod, rychlost, nastavLod(n), animuj(dt), zrus() }.
 * koren (THREE.Group) treba pridať do scény a hýbať ním (position, rotation.y).
 */
export async function vytvorNpc(spec, data) {
  const url = new URL(spec.url, KOREN_WEBU).href;
  const gltf = await nacitajGlb(url);
  const animKlipy = await klipyPreModel(url, gltf);
  const kopia = klonujSKostrou(gltf.scene);
  const potrebne = potrebneObjekty(spec, data.satnik);

  const siete0 = [], odstran = [];
  let lod1 = null, lod2 = null, sloty = [];
  kopia.traverse((o) => {
    if (!o.isMesh) return;
    const ud = lodUdaje(o);
    if (ud) {
      if (ud.variant !== spec.variant) { odstran.push(o); return; }
      if (ud.npc_lod === 1) lod1 = o; else lod2 = o;
      sloty = JSON.parse(ud.sloty || '[]');
      return;
    }
    if (potrebne.has(menoObjektu(o))) siete0.push(o); else odstran.push(o);
  });
  for (const o of odstran) o.removeFromParent();

  // LOD0: vlastné materiály, šatník, vzhľad – siete do jednej skupiny, aby sa dali naraz skryť
  const skupina0 = new THREE.Group();
  skupina0.name = 'lod0';
  (siete0[0]?.parent ?? kopia).add(skupina0);
  for (const o of siete0) { pripravSiet(o); skupina0.add(o); }
  const instancia = { koren: kopia, siete: siete0 };
  oblec(instancia, data.satnik, spec.kusy, spec.farby);
  nastavVzhlad(instancia, spec.vzhlad);

  // LOD1/LOD2: spoločný materiál so slotmi farieb tohto chodca
  const matLod = vytvorMaterialLod(farbySlotov(sloty, spec, data.satnik));
  for (const [o, tien] of [[lod1, true], [lod2, false]]) {
    if (!o) continue;
    o.material = matLod;
    o.castShadow = tien;
    o.receiveShadow = false;
    o.frustumCulled = false;
  }

  const koren = new THREE.Group();
  koren.name = 'npc_' + spec.profil;
  koren.scale.setScalar(spec.mierka ?? 1);
  koren.add(kopia);

  const anim = new Animacie(kopia, animKlipy);
  const mimika = new Mimika(instancia);
  nastavMorph(instancia, 'usmev', spec.usmev ?? 0.2);
  mimika.usmev = spec.usmev ?? 0.2;

  const npc = {
    koren,
    spec,
    lod: null,
    rychlost: 0,
    voVzduchu: false,
    /** 0 = plný model, 1 = zlúčená sieť, 2 = hrubá sieť, -1 = nekreslí sa */
    nastavLod(n) {
      if (n === npc.lod) return;
      npc.lod = n;
      koren.visible = n >= 0;
      skupina0.visible = n === 0;
      if (lod1) lod1.visible = n === 1 || (n === 2 && !lod2);
      if (lod2) lod2.visible = n === 2;
    },
    animuj(dt) {
      anim.podlaPohybu(npc.rychlost, npc.voVzduchu, spec.opity);
      if (anim.aktualna && anim.aktualna !== npc._akcia) {
        // každý chodec je v kroku inde, aby dav nepochodoval
        npc._akcia = anim.aktualna;
        if (anim.aktualna.loop !== THREE.LoopOnce) anim.aktualna.time = Math.random() * anim.aktualna.getClip().duration;
      }
      anim.update(dt);
      if (npc.lod === 0) mimika.update(dt);
    },
    zrus() {
      koren.removeFromParent();
      matLod.dispose();
      for (const o of siete0) o.material.dispose();
    },
  };
  npc.nastavLod(0);
  return npc;
}
