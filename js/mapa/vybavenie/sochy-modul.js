// Modul: sochy, busty a pamätníky v celom meste (data/mapa/sochy.json z OSM, tools/mesto/sochy.mjs).
//   – postava = model chodca (assets/postavy/npc/*.glb) v pokojnej póze, „odliata“ do bronzu alebo vytesaná z kameňa
//     (statická geometria sa vypočíta raz z kostry), mierne väčšia ako človek, na kamennom podstavci,
//   – busta = horná časť tej istej postavy na stĺpe, Čumil = postava vykúkajúca z kanála,
//   – skulptúra (abstraktné dielo) = organický tvar z kameňa/bronzu na nízkom sokli.
// Sochy sú v štvorcoch 400 m (InstancedMesh na štvorec a druh), kreslia sa do 450 m od hráča;
// výška na teréne sa prepočíta, keď sa štvorec priblíži (laserový terén sa načítava postupne).
// Postavy sú vymyslené (žiadna podoba skutočných osôb) – socha len naznačuje pamätník.

import * as THREE from 'three';
import { clone as klonujSKostrou } from 'three/addons/utils/SkeletonUtils.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { nacitajGlb } from '../../chodec/postava/nacitaj-postavu.js';
import { klipyPreModel } from '../../chodec/npc/model-npc.js';

const STVOREC = 400;
const DOHLAD = 450;
const KOREN = new URL('../../../', import.meta.url);
const MODELY = { muz: ['assets/postavy/npc/muz.glb', 'lod1_korporat_0'], zena: ['assets/postavy/npc/zena.glb', null] };

/** Statická geometria postavy v póze „stoj“ (z kostry), chodidlá v y = 0, výška 1 (potom sa mierkuje). */
async function postavaVPoze(druh) {
  const [cesta, meno] = MODELY[druh];
  const url = new URL(cesta, KOREN).href;
  const gltf = await nacitajGlb(url);
  const scena = klonujSKostrou(gltf.scene);
  // meno má uzol nad sieťou (glTF: uzol „lod1_…“ → sieť „mesh_N“)
  const nazvy = (o) => [o.name, o.parent?.name ?? ''];
  let siet = null;
  scena.traverse((o) => { if (o.isSkinnedMesh && !siet && nazvy(o).some((n) => (meno ? n === meno : n.startsWith('lod1_')))) siet = o; });
  if (!siet) scena.traverse((o) => { if (o.isSkinnedMesh && !siet && nazvy(o).some((n) => n.startsWith('lod1_'))) siet = o; });
  if (!siet) throw new Error('socha: model bez lod1');
  try {
    const klipy = await klipyPreModel(url, gltf);
    const klip = klipy.find((k) => k.name === 'stoj') ?? klipy[0];
    if (klip) {
      const mixer = new THREE.AnimationMixer(scena);
      mixer.clipAction(klip).play();
      mixer.setTime(0.4);
    }
  } catch { /* bez animácie ostane pokojová póza */ }
  scena.updateMatrixWorld(true);
  siet.skeleton.update();
  const g = siet.geometry, n = g.attributes.position.count;
  const poz = new Float32Array(n * 3), v = new THREE.Vector3();
  for (let i = 0; i < n; i++) {
    v.fromBufferAttribute(g.attributes.position, i);
    siet.applyBoneTransform(i, v);
    v.applyMatrix4(siet.matrixWorld);
    poz[i * 3] = v.x; poz[i * 3 + 1] = v.y; poz[i * 3 + 2] = v.z;
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(poz, 3));
  if (g.index) out.setIndex(Array.from(g.index.array));
  out.computeBoundingBox();
  const b = out.boundingBox, h = b.max.y - b.min.y || 1;
  out.translate(-(b.min.x + b.max.x) / 2, -b.min.y, -(b.min.z + b.max.z) / 2);
  out.scale(1 / h, 1 / h, 1 / h);
  out.computeVertexNormals();
  return out;
}

/** Horná časť postavy (od pŕs), spodok v y = 0. */
function horna(g, od = 0.7) {
  const p = g.attributes.position, idx = g.index.array, nove = [];
  for (let i = 0; i < idx.length; i += 3) {
    if (p.getY(idx[i]) > od && p.getY(idx[i + 1]) > od && p.getY(idx[i + 2]) > od) nove.push(idx[i], idx[i + 1], idx[i + 2]);
  }
  const out = g.clone();
  out.setIndex(nove);
  out.translate(0, -od, 0);
  out.computeBoundingSphere();
  return out;
}

/** Abstraktná skulptúra: skrútený organický tvar (výška 1). */
function skulptura() {
  const g = new THREE.IcosahedronGeometry(0.5, 3);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    let x = p.getX(i), y = p.getY(i) + 0.5, z = p.getZ(i);
    const a = y * 2.2;
    const r = 0.55 + 0.25 * Math.sin(y * 7 + x * 3) * Math.cos(z * 5);
    [x, z] = [x * Math.cos(a) - z * Math.sin(a), x * Math.sin(a) + z * Math.cos(a)];
    p.setXYZ(i, x * r * 0.7, y, z * r * 0.45);
  }
  g.computeVertexNormals();
  return g;
}

/** Podstavec: sokel, telo s rímsou a krycia doska (výška 1, šírka 1). */
function podstavec() {
  const casti = [];
  const kv = (w, h, y) => { const b = new THREE.BoxGeometry(w, h, w); b.translate(0, y + h / 2, 0); return b; };
  casti.push(kv(1.25, 0.12, 0), kv(1.1, 0.08, 0.12), kv(0.9, 0.62, 0.2), kv(1.04, 0.08, 0.82), kv(1.12, 0.1, 0.9));
  return mergeGeometries(casti.map((c) => c.toNonIndexed()));
}

const hash = (x, z) => { const s = Math.sin(x * 12.9898 + z * 78.233) * 43758.5453; return s - Math.floor(s); };

export default {
  nazov: 'sochy',
  poradie: 60,

  async init(hra) {
    this.hra = hra;
    this.stvorce = new Map();
    this.skupina = new THREE.Group();
    this.skupina.name = 'sochy';
    hra.scena.add(this.skupina);
    this.cas = 0;
    let data;
    try { data = await fetch('data/mapa/sochy.json').then((r) => r.json()); } catch { return; }
    this.mat = {
      bronz: new THREE.MeshStandardMaterial({ color: '#5d4a33', metalness: 0.75, roughness: 0.42 }),
      patina: new THREE.MeshStandardMaterial({ color: '#4c5c4a', metalness: 0.45, roughness: 0.55 }),
      kamen: new THREE.MeshStandardMaterial({ color: '#cbc3b2', roughness: 0.88 }),
      podstavec: new THREE.MeshStandardMaterial({ color: '#b3ab9b', roughness: 0.9 }),
    };
    this.geo = { podstavec: podstavec(), skulptura: skulptura() };
    try {
      const [muz, zena] = await Promise.all([postavaVPoze('muz'), postavaVPoze('zena')]);
      Object.assign(this.geo, { muz, zena, bustaM: horna(muz, 0.72), bustaZ: horna(zena, 0.72), cumil: horna(muz, 0.55) });
    } catch (e) {
      console.warn('Sochy: postava sa nepodarila', e);
    }
    for (const g of Object.values(this.geo)) g.userData.zdielane = true;
    for (const s of data.sochy ?? []) {
      const k = `${Math.floor(s.x / STVOREC)},${Math.floor(s.z / STVOREC)}`;
      if (!this.stvorce.has(k)) this.stvorce.set(k, { sochy: [], skupina: null, cx: 0, cz: 0 });
      this.stvorce.get(k).sochy.push(s);
    }
    for (const st of this.stvorce.values()) {
      st.cx = st.sochy.reduce((a, s) => a + s.x, 0) / st.sochy.length;
      st.cz = st.sochy.reduce((a, s) => a + s.z, 0) / st.sochy.length;
    }
    console.info(`Sochy: ${data.sochy?.length ?? 0} (OSM)`);
  },

  /** Diely jednej sochy: [[geometria, materiál, matica], …] a kolízia. */
  diely(s, y) {
    const out = [];
    const rot = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0),
      s.smer != null ? (-s.smer * Math.PI) / 180 + Math.PI : hash(s.x, s.z) * Math.PI * 2);
    const mat = s.material === 'bronz' ? (hash(s.z, s.x) < 0.35 ? this.mat.patina : this.mat.bronz) : this.mat.kamen;
    const m = (geo, mt, dx, dy, dz, sx, sy, sz, q = rot) => out.push([geo, mt, new THREE.Matrix4().compose(new THREE.Vector3(s.x + dx, y + dy, s.z + dz), q, new THREE.Vector3(sx, sy, sz))]);
    const postava = s.zena ? this.geo.zena : this.geo.muz;
    if (s.typ === 'cumil') {
      if (this.geo.cumil) {
        const q = rot.clone().multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), 0.35));
        m(this.geo.cumil, mat, 0, -0.35, 0, 1.7, 1.7, 1.7, q);
      }
      return { diely: out, r: 0.5 };
    }
    let z = 0, r = 0.6;
    const ped = s.podstavec && !(s.vyska && s.vyska <= 2.3 && s.typ === 'socha');
    if (s.typ === 'busta') {
      m(this.geo.podstavec, this.mat.podstavec, 0, 0, 0, 0.7, 1.55, 0.7);
      if (this.geo.bustaM) m(s.zena ? this.geo.bustaZ : this.geo.bustaM, mat, 0, 1.55, 0, 2.3, 2.3, 2.3);
      return { diely: out, r: 0.5 };
    }
    if (s.typ === 'skulptura') {
      const h = s.vyska ?? 1.8 + hash(s.x, s.z) * 1.5;
      if (s.podstavec) { m(this.geo.podstavec, this.mat.podstavec, 0, 0, 0, 1.0, 0.6, 1.0); z = 0.6; }
      m(this.geo.skulptura, mat, 0, z, 0, h * 0.8, h, h * 0.8);
      return { diely: out, r: 0.5 + h * 0.2 };
    }
    // socha (aj jazdecká – bez koňa, na vyššom podstavci)
    if (ped) {
      const hp = s.typ === 'jazdecka' ? 4.2 : s.material === 'bronz' ? 2.4 : 1.9;
      const wp = s.typ === 'jazdecka' ? 2.6 : 1.5;
      m(this.geo.podstavec, this.mat.podstavec, 0, 0, 0, wp, hp, wp);
      z = hp; r = wp * 0.65;
    }
    const h = s.vyska && !ped ? s.vyska : ped ? 2.5 : 1.85;
    if (postava) m(postava, mat, 0, z, 0, h, h, h);
    return { diely: out, r };
  },

  /** Postaví InstancedMeshe štvorca (raz) a nastaví výšky podľa terénu. */
  postavStvorec(st) {
    const skupiny = new Map();
    st.kolizie = [];
    for (const s of st.sochy) {
      const y = this.hra.mapa.vyska(s.x, s.z);
      const { diely, r } = this.diely(s, y);
      for (const [geo, mat, mx] of diely) {
        const k = `${geo.uuid}|${mat.uuid}`;
        if (!skupiny.has(k)) skupiny.set(k, { geo, mat, m: [] });
        skupiny.get(k).m.push(mx);
      }
      if (diely.length && !st.kolizieHotove) this.hra.mapa.kolizie?.pridajKruh?.(s.x, s.z, r, { typ: 'socha' });
    }
    st.skupina = new THREE.Group();
    for (const { geo, mat, m } of skupiny.values()) {
      const im = new THREE.InstancedMesh(geo, mat, m.length);
      m.forEach((mx, i) => im.setMatrixAt(i, mx));
      im.castShadow = im.receiveShadow = true;
      im.computeBoundingSphere();
      st.skupina.add(im);
    }
    st.y = st.sochy.map((s) => this.hra.mapa.vyska(s.x, s.z));
    st.kolizieHotove = true;
    this.skupina.add(st.skupina);
  },

  update(dt, hra) {
    if (!this.stvorce?.size || !this.geo) return;
    this.cas -= dt;
    if (this.cas > 0) return;
    this.cas = 1.0;
    const { x, z } = hra.stav.pozicia;
    for (const st of this.stvorce.values()) {
      const d = Math.hypot(st.cx - x, st.cz - z);
      if (d < DOHLAD + STVOREC * 0.7) {
        if (!st.skupina) this.postavStvorec(st);
        st.skupina.visible = true;
        // terén sa mohol spresniť (laser) – ak sa výška zmenila, štvorec sa postaví znova
        if (d < 300 && st.sochy.some((s, i) => Math.abs(hra.mapa.vyska(s.x, s.z) - st.y[i]) > 0.05)) {
          this.skupina.remove(st.skupina);
          st.skupina.traverse((o) => o.dispose?.());
          st.skupina = null;
          this.postavStvorec(st);
        }
      } else if (st.skupina) st.skupina.visible = false;
    }
  },
};
