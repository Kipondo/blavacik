// Postava s oblými tvarmi (kapsuly), kĺbmi v ramenách, lakťoch, bokoch a kolenách
// a animáciou chôdze/behu. Pozerá na +z. Farby sa dajú zmeniť (NPC chodci).

import * as THREE from 'three';

const geoCache = {};
const kapsula = (r, d) => (geoCache[`k${r}${d}`] ??= new THREE.CapsuleGeometry(r, d, 4, 10));

export function vytvorModelPostavy({
  tricko = '#2f6fb3', nohavice = '#2b2f3a', plet = '#e3b994', vlasy = '#3a2a1c', topanky = '#f2f2f2',
} = {}) {
  const g = new THREE.Group();
  const mat = (c, r = 0.8) => new THREE.MeshStandardMaterial({ color: c, roughness: r });
  const mTricko = mat(tricko), mNohavice = mat(nohavice), mPlet = mat(plet, 0.6), mTopanky = mat(topanky, 0.5);

  const telo = new THREE.Group();
  telo.position.y = 0.98;
  g.add(telo);

  // trup a boky
  const trup = new THREE.Mesh(kapsula(0.2, 0.32), mTricko);
  trup.scale.set(1.15, 1, 0.75);
  trup.position.y = 0.38;
  telo.add(trup);
  const boky = new THREE.Mesh(kapsula(0.17, 0.08), mNohavice);
  boky.scale.set(1.2, 1, 0.8);
  boky.position.y = 0.06;
  telo.add(boky);

  // hlava, krk, vlasy, nos
  const krk = new THREE.Mesh(kapsula(0.06, 0.06), mPlet);
  krk.position.y = 0.68;
  telo.add(krk);
  const hlava = new THREE.Mesh(new THREE.SphereGeometry(0.13, 14, 10), mPlet);
  hlava.scale.set(0.92, 1.08, 1);
  hlava.position.y = 0.84;
  telo.add(hlava);
  const vlasyM = new THREE.Mesh(new THREE.SphereGeometry(0.135, 14, 8, 0, Math.PI * 2, 0, Math.PI * 0.55), mat(vlasy, 0.9));
  vlasyM.position.set(0, 0.86, -0.012);
  vlasyM.scale.set(0.95, 1.05, 1.05);
  telo.add(vlasyM);
  const nos = new THREE.Mesh(new THREE.ConeGeometry(0.022, 0.05, 6), mPlet);
  nos.rotation.x = Math.PI / 2;
  nos.position.set(0, 0.83, 0.13);
  telo.add(nos);

  // končatina = horná časť + dolná časť (koleno/lakeť)
  const koncatina = (rodic, x, y, r, d1, d2, m1, m2, koniec) => {
    const klb = new THREE.Group();
    klb.position.set(x, y, 0);
    const horna = new THREE.Mesh(kapsula(r, d1), m1);
    horna.position.y = -(d1 / 2 + r);
    klb.add(horna);
    const klb2 = new THREE.Group();
    klb2.position.y = -(d1 + r * 1.4);
    const dolna = new THREE.Mesh(kapsula(r * 0.88, d2), m2);
    dolna.position.y = -(d2 / 2 + r);
    klb2.add(dolna);
    if (koniec) { koniec.position.y = -(d2 + r * 2); klb2.add(koniec); }
    klb.add(klb2);
    rodic.add(klb);
    return { klb, klb2 };
  };
  const ruka = (s) => {
    const dlan = new THREE.Mesh(new THREE.SphereGeometry(0.055, 8, 6), mPlet);
    return koncatina(telo, s * 0.27, 0.6, 0.065, 0.2, 0.18, mTricko, mPlet, dlan);
  };
  const noha = (s) => {
    const topanka = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.08, 0.26), mTopanky);
    topanka.position.z = 0.05;
    return koncatina(telo, s * 0.11, 0.02, 0.085, 0.3, 0.3, mNohavice, mNohavice, topanka);
  };
  const lavaRuka = ruka(-1), pravaRuka = ruka(1);
  const lavaNoha = noha(-1), pravaNoha = noha(1);
  lavaRuka.klb.rotation.z = 0.08; pravaRuka.klb.rotation.z = -0.08;

  g.traverse((o) => { if (o.isMesh) o.castShadow = true; });

  let faza = 0;
  /** Animácia: rychlost v m/s, voVzduchu = skok */
  g.userData.animuj = (dt, rychlost, voVzduchu) => {
    faza += dt * (2.2 + rychlost * 1.5);
    const beh = Math.min(1, rychlost / 7);
    const rozkmit = voVzduchu ? 0.45 : Math.min(0.85, rychlost * 0.14);
    const s = Math.sin(faza) * rozkmit;
    lavaNoha.klb.rotation.x = s;
    pravaNoha.klb.rotation.x = -s;
    // koleno sa ohýba, keď noha ide dozadu a hore
    lavaNoha.klb2.rotation.x = Math.max(0, -Math.sin(faza - 0.6)) * rozkmit * 1.4;
    pravaNoha.klb2.rotation.x = Math.max(0, Math.sin(faza - 0.6)) * rozkmit * 1.4;
    lavaRuka.klb.rotation.x = -s * 0.9;
    pravaRuka.klb.rotation.x = s * 0.9;
    lavaRuka.klb2.rotation.x = -0.25 - beh * 0.9;
    pravaRuka.klb2.rotation.x = -0.25 - beh * 0.9;
    // pri behu sa trup nakloní dopredu a jemne poskakuje
    telo.rotation.x = beh * 0.18;
    telo.position.y = 0.98 + Math.abs(Math.sin(faza)) * 0.04 * Math.min(1, rychlost / 3);
    if (voVzduchu) { lavaNoha.klb2.rotation.x = 0.6; pravaNoha.klb2.rotation.x = 0.3; }
    if (rychlost < 0.1 && !voVzduchu) {
      for (const k of [lavaNoha, pravaNoha, lavaRuka, pravaRuka]) { k.klb.rotation.x *= 0.8; }
      // dýchanie
      trup.scale.y = 1 + Math.sin(performance.now() / 600) * 0.012;
    }
  };
  return g;
}
