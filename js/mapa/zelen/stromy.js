// Stromy ako InstancedMesh, rozdelené do štvorcov (chunkov), aby sa vzdialené skupiny vôbec nevykresľovali.
// Formát v dátach: "stromy": [[x, z, mierka], ...] alebo z laserového skenovania
// [[x, z, mierka, výška, polomer koruny], ...] – strom má potom skutočnú výšku a šírku koruny.
//
// Úrovne detailu po stromoch (nie po celých chunkoch):
//   – do BLIZKO metrov od kamery podrobný model druhu (kmeň, konáre, karty s listami – model-stromu.js),
//   – ďalej jednoduchá koruna (zhluk gúľ / kužele pri ihličnanoch) s „listnatým“ šumom.
// Ktoré stromy sú blízko, sa prepočíta, keď sa kamera posunie o POSUN metrov (pri kreslení chunku).

import * as THREE from 'three';
import { DRUHY, VYSKA_MODELU, modelStromu } from './model-stromu.js';
import { materialKory, materialListov, materialKmenaDaleko, materialKorunyDaleko } from './materialy-stromov.js';

const CHUNK = 250;      // m – veľkosť skupiny (menej volaní kreslenia; blízke stromy sa vyberajú po jednom)
const DOHLAD = 650;     // ďalej ako toto sa stromy skryjú (aj tak sú v opare)
const BLIZKO = 125;     // m – bližšie podrobný model
const TIEN_DETAIL = 35; // m – bližšie vrhá tieň podrobný model (listy), ďalej len jednoduchá koruna (#110)
const POSUN = 6;        // m – po takom posune kamery sa prepočíta, ktoré stromy sú blízko
// Vrstva len pre tieň: zástupné koruny sa kreslia do tieňovej mapy, nie do obrazu (kamera tieňa má vrstvu
// zapnutú – js/grafika/dosah-tienov.js). Podrobné listy stromov ďalej ako TIEN_DETAIL tak tieň nekreslia
// (v tieňovej mape boli ~0,5 mil. trojuholníkov), tieň za ne vrhá zhluk gúľ (rovnaký ako vzdialená koruna).
export const VRSTVA_TIENA = 1;

// priemerná farba listov a ihlíc z textúr (lineárne) – vzdialená koruna má rovnaký tón ako blízka
const LISTY_PRIEMER = [0.109, 0.19, 0.037];
const IHLICE_PRIEMER = [0.024, 0.07, 0.019];

/** Pseudonáhoda podľa polohy (rovnaký strom vyzerá vždy rovnako). */
const hash = (x, z, k = 0) => { const s = Math.sin(x * 12.9898 + z * 78.233 + k * 37.719) * 43758.5453; return s - Math.floor(s); };

/** Druh stromu: z tvaru koruny (laser) a pseudonáhodne podľa polohy; v uliciach a parkoch Bratislavy prevládajú lipy, javory a platany. */
function vyberDruh(x, z, h, r, ihlicnan) {
  if (ihlicnan) return 'smrek';
  if (h / (2 * r) > 2.6) return h > 15 ? 'topol' : 'smrek';
  const n = hash(x, z, 7);
  if (r > 5.5 && n < 0.5) return 'platan';
  if (n < 0.36) return 'lipa';
  if (n < 0.62) return 'javor';
  if (n < 0.78) return 'platan';
  if (n < 0.9) return 'breza';
  return 'lipa';
}

export function vytvorStromy(stromy, vyskopis, kolizie) {
  const skupina = new THREE.Group();
  skupina.name = 'stromy';
  if (!stromy?.length) return skupina;

  const { blob, kuzele, kmenGeo } = geometrieDaleko();
  const chunky = new Map();
  stromy.forEach((s, i) => {
    const k = `${Math.floor(s[0] / CHUNK)},${Math.floor(s[1] / CHUNK)}`;
    if (!chunky.has(k)) chunky.set(k, []);
    chunky.get(k).push([s, i]);
  });

  const q = new THREE.Quaternion(), os = new THREE.Vector3(0, 1, 0), poz = new THREE.Vector3(), mier = new THREE.Vector3();
  const m = new THREE.Matrix4(), farba = new THREE.Color();
  for (const zoznam of chunky.values()) {
    const n = zoznam.length;
    const kmene = new THREE.InstancedMesh(kmenGeo, materialKmenaDaleko(), n);
    const stromyCh = [];
    let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity, sx = 0, sz = 0;
    zoznam.forEach(([[x, z, s = 1, hl, rl], i], j) => {
      // laser: skutočná výška a polomer koruny, inak odhad z mierky (bežný mestský strom ~7,4 m, koruna 2,6 m)
      const h = hl ?? 7.4 * s * (0.9 + (i % 5) * 0.06), r = rl ?? 2.6 * s;
      const ihl = hl ? false : (i * 7919) % 12 === 0;
      const druh = vyberDruh(x, z, h, r, ihl);
      const y = vyskopis.vyskaTerenu(x, z);
      q.setFromAxisAngle(os, hash(x, z, 1) * Math.PI * 2);
      // vzdialená úroveň: základný model výšky 7,4 m a koruny 2,6 m
      m.compose(poz.set(x, y, z), q, mier.set(r / 2.6, h / 7.4, r / 2.6));
      kmene.setMatrixAt(j, m);
      // blízka úroveň: model druhu (výška VYSKA_MODELU, polomer koruny podľa druhu)
      const d = DRUHY[druh];
      const pomer = 0.92 + hash(x, z, 2) * 0.16;
      const mBlizko = new THREE.Matrix4().compose(poz.set(x, y - 0.05, z), q, mier.set(r / d.polomer * pomer, h / VYSKA_MODELU, r / d.polomer * pomer));
      // farebná pestrosť stromov: jas a odtieň (niektoré žltkastejšie, iné sýtejšie)
      const jas = 0.74 + hash(x, z, 3) * 0.26, ton = hash(x, z, 4);
      // (celkovo trochu do modrozelena – pri teplom slnku by listy inak boli žltkasté)
      const f = new THREE.Color(jas * (0.8 + ton * 0.12), jas, jas * (1.12 - ton * 0.2));
      stromyCh.push({ x, z, druh, j, m: mBlizko, farba: f, ihl: druh === 'smrek', skryty: false });
      kolizie?.pridajKruh(x, z, 0.45 * Math.min(1.6, Math.sqrt((r / 2.6) * (h / 7.4))), { typ: 'strom' });
      minX = Math.min(minX, x); maxX = Math.max(maxX, x); minZ = Math.min(minZ, z); maxZ = Math.max(maxZ, z); sx += x; sz += z;
    });

    // vzdialené koruny (listnaté a ihličnaté zvlášť)
    const pocetIhl = stromyCh.filter((t) => t.ihl).length;
    const koruny = new THREE.InstancedMesh(blob, materialKorunyDaleko(), Math.max(1, n - pocetIhl));
    const ihlice = new THREE.InstancedMesh(kuzele, materialKorunyDaleko(), Math.max(1, pocetIhl));
    let kl = 0, ki = 0;
    for (const t of stromyCh) {
      kmene.getMatrixAt(t.j, m);
      const tl = DRUHY[t.druh].tonListov ?? [1, 1, 1];
      if (t.ihl) {
        farba.setRGB(IHLICE_PRIEMER[0] * 1.2 * t.farba.r, IHLICE_PRIEMER[1] * 1.2 * t.farba.g, IHLICE_PRIEMER[2] * 1.2 * t.farba.b);
        ihlice.setMatrixAt(ki, m); ihlice.setColorAt(ki, farba); t.k = ki++;
      } else {
        const ao = 0.85;
        farba.setRGB(LISTY_PRIEMER[0] * ao * tl[0] * t.farba.r, LISTY_PRIEMER[1] * ao * tl[1] * t.farba.g, LISTY_PRIEMER[2] * ao * tl[2] * t.farba.b);
        koruny.setMatrixAt(kl, m); koruny.setColorAt(kl, farba); t.k = kl++;
      }
    }
    koruny.count = kl; ihlice.count = ki;

    // blízke modely: pre každý druh v chunku kôra + listy, naplnia sa podľa polohy kamery
    const blizke = new Map();
    for (const t of stromyCh) {
      if (!blizke.has(t.druh)) blizke.set(t.druh, { kapacita: 0, n: 0 });
      blizke.get(t.druh).kapacita++;
    }
    const chunk = new THREE.Group();
    for (const [meno, b] of blizke) {
      const geo = modelStromu(meno);
      const mKora = materialKory(DRUHY[meno]), mListy = materialListov(DRUHY[meno].ihlicnan ? 'ihlice' : 'listy');
      // do obrazu: všetky blízke stromy (bez tieňa); do tieňa: len najbližšie (rovnaké materiály – priehľadnosť listov)
      b.kora = new THREE.InstancedMesh(geo.kora, mKora, b.kapacita);
      b.listy = new THREE.InstancedMesh(geo.listy, mListy, b.kapacita);
      b.tienKora = new THREE.InstancedMesh(geo.kora, mKora, b.kapacita);
      b.tienListy = new THREE.InstancedMesh(geo.listy, mListy, b.kapacita);
      b.listy.setColorAt(0, farba.setRGB(1, 1, 1));
      for (const im of [b.kora, b.listy, b.tienKora, b.tienListy]) {
        im.count = 0; im.visible = false;
        const tien = im === b.tienKora || im === b.tienListy;
        im.castShadow = tien; im.receiveShadow = !tien;
        if (tien) im.layers.set(VRSTVA_TIENA);
        im.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
        chunk.add(im);
      }
    }
    // zástupné koruny pre tieň stromov TIEN_DETAIL…BLIZKO (len vrstva tieňa)
    const tienKoruny = new THREE.InstancedMesh(blob, materialKorunyDaleko(), Math.max(1, n - pocetIhl));
    const tienIhlice = new THREE.InstancedMesh(kuzele, materialKorunyDaleko(), Math.max(1, pocetIhl));
    for (const im of [tienKoruny, tienIhlice]) {
      im.count = 0; im.visible = false; im.castShadow = true; im.receiveShadow = false;
      im.layers.set(VRSTVA_TIENA);
      im.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      chunk.add(im);
    }
    for (const im of [kmene, koruny, ihlice]) {
      // vzdialená úroveň tieň nevrhá: do BLIZKO ho vrhajú podrobné modely / zástupné koruny, ďalej je strom
      // mimo kamery tieňa (±120 m); inak by sa do tieňovej mapy kreslili koruny všetkých stromov chunku
      im.castShadow = false; im.receiveShadow = im !== kmene;
      im.computeBoundingSphere();
      if (im.count) chunk.add(im);
    }
    const stav = {
      stromy: stromyCh, blizke, kmene, koruny, ihlice, tienKoruny, tienIhlice, aktivne: false, px: 0, pz: 0,
      minX, maxX, minZ, maxZ,
      povodneKmene: kmene.instanceMatrix.array.slice(), povodneKoruny: koruny.instanceMatrix.array.slice(), povodneIhlice: ihlice.instanceMatrix.array.slice(),
      farbyKoruny: koruny.instanceColor?.array.slice(), farbyIhlice: ihlice.instanceColor?.array.slice(),
      pocet: [kmene.count, koruny.count, ihlice.count],
    };
    // pri kreslení chunku (keď je v zábere) sa prepočíta, ktoré stromy sú blízko – prejaví sa od ďalšieho snímku
    kmene.onBeforeRender = (renderer, scena, kamera) => { if (kamera.isPerspectiveCamera) aktualizujDetail(stav, kamera.position); };
    chunk.userData.dohlad = { x: sx / n, z: sz / n, max: DOHLAD };
    skupina.add(chunk);
  }
  return skupina;
}

/** Vzdialená úroveň chunku: všetky stromy (chunk je ďaleko) alebo len tie, ktoré nie sú blízko – inštancie sa
 *  zhustia na začiatok poľa a count sa zníži (skryté stromy sa nekreslia ani ako nulové inštancie, #110). */
function nastavDaleko(st, vsetky) {
  const { kmene, koruny, ihlice } = st;
  if (vsetky) {
    kmene.instanceMatrix.array.set(st.povodneKmene);
    koruny.instanceMatrix.array.set(st.povodneKoruny);
    ihlice.instanceMatrix.array.set(st.povodneIhlice);
    if (st.farbyKoruny) koruny.instanceColor.array.set(st.farbyKoruny);
    if (st.farbyIhlice) ihlice.instanceColor.array.set(st.farbyIhlice);
    [kmene.count, koruny.count, ihlice.count] = st.pocet;
  } else {
    const kA = kmene.instanceMatrix.array, rA = koruny.instanceMatrix.array, iA = ihlice.instanceMatrix.array;
    const rF = koruny.instanceColor?.array, iF = ihlice.instanceColor?.array;
    let nk = 0, nr = 0, ni = 0;
    for (const t of st.stromy) {
      if (t.skryty) continue;
      kA.set(st.povodneKmene.subarray(t.j * 16, t.j * 16 + 16), nk++ * 16);
      if (t.ihl) {
        iA.set(st.povodneIhlice.subarray(t.k * 16, t.k * 16 + 16), ni * 16);
        if (iF) iF.set(st.farbyIhlice.subarray(t.k * 3, t.k * 3 + 3), ni * 3);
        ni++;
      } else {
        rA.set(st.povodneKoruny.subarray(t.k * 16, t.k * 16 + 16), nr * 16);
        if (rF) rF.set(st.farbyKoruny.subarray(t.k * 3, t.k * 3 + 3), nr * 3);
        nr++;
      }
    }
    // kmene sa kreslia vždy aspoň s jednou (nulovou) inštanciou – ich onBeforeRender spúšťa prepočet blízkych stromov
    if (!nk) { kA.fill(0, 0, 16); nk = 1; }
    kmene.count = nk; koruny.count = nr; ihlice.count = ni;
  }
  for (const im of [kmene, koruny, ihlice]) {
    im.instanceMatrix.needsUpdate = true;
    if (im.instanceColor) im.instanceColor.needsUpdate = true;
  }
}

/** Prepočíta blízke stromy chunku podľa polohy kamery. */
function aktualizujDetail(st, kam) {
  const dx = Math.max(st.minX - kam.x, 0, kam.x - st.maxX), dz = Math.max(st.minZ - kam.z, 0, kam.z - st.maxZ);
  if (dx * dx + dz * dz > BLIZKO * BLIZKO) {
    if (st.aktivne) {
      // celý chunk je ďaleko – len vzdialené koruny
      for (const t of st.stromy) t.skryty = false;
      nastavDaleko(st, true);
      for (const b of st.blizke.values()) {
        for (const im of [b.kora, b.listy, b.tienKora, b.tienListy]) { im.count = 0; im.visible = false; }
      }
      for (const im of [st.tienKoruny, st.tienIhlice]) { im.count = 0; im.visible = false; }
      st.aktivne = false;
    }
    return;
  }
  if (st.aktivne && (kam.x - st.px) ** 2 + (kam.z - st.pz) ** 2 < POSUN * POSUN) return;
  st.aktivne = true; st.px = kam.x; st.pz = kam.z;
  for (const b of st.blizke.values()) { b.n = 0; b.nt = 0; }
  let zmena = false, nk = 0, ni = 0;
  const b2 = BLIZKO * BLIZKO, t2 = TIEN_DETAIL * TIEN_DETAIL;
  const kAr = st.tienKoruny.instanceMatrix.array, iAr = st.tienIhlice.instanceMatrix.array;
  for (const t of st.stromy) {
    const d2 = (t.x - kam.x) ** 2 + (t.z - kam.z) ** 2;
    const blizko = d2 < b2;
    if (blizko) {
      const b = st.blizke.get(t.druh);
      b.kora.setMatrixAt(b.n, t.m); b.listy.setMatrixAt(b.n, t.m); b.listy.setColorAt(b.n, t.farba);
      b.n++;
      if (d2 < t2) {
        // tieň podrobného modelu (listy) len zblízka
        b.tienKora.setMatrixAt(b.nt, t.m); b.tienListy.setMatrixAt(b.nt, t.m); b.nt++;
      } else if (t.ihl) {
        iAr.set(st.povodneKmene.subarray(t.j * 16, t.j * 16 + 16), ni++ * 16);
      } else {
        kAr.set(st.povodneKmene.subarray(t.j * 16, t.j * 16 + 16), nk++ * 16);
      }
    }
    if (blizko !== t.skryty) { t.skryty = blizko; zmena = true; }
  }
  for (const b of st.blizke.values()) {
    for (const [im, n] of [[b.kora, b.n], [b.listy, b.n], [b.tienKora, b.nt], [b.tienListy, b.nt]]) {
      im.count = n;
      im.visible = n > 0;
      if (!n) continue;
      im.instanceMatrix.needsUpdate = true;
      // obal len okolo blízkych stromov (aby sa mimo záberu nekreslili)
      im.computeBoundingSphere();
    }
    if (b.n) b.listy.instanceColor.needsUpdate = true;
  }
  for (const [im, n] of [[st.tienKoruny, nk], [st.tienIhlice, ni]]) {
    im.count = n; im.visible = n > 0;
    if (n) { im.instanceMatrix.needsUpdate = true; im.computeBoundingSphere(); }
  }
  if (zmena) nastavDaleko(st, false);
}

let cacheGeo = null;
/** Geometrie vzdialenej úrovne: listnatá koruna (zhluk nepravidelných gúľ), ihličnan (dva kužele), kmeň. */
function geometrieDaleko() {
  if (cacheGeo) return cacheGeo;
  const kmenGeo = new THREE.CylinderGeometry(0.1, 0.17, 3.2, 6);
  kmenGeo.translate(0, 1.6, 0);
  const casti = [];
  [[0, 4.9, 0, 2.3], [1.3, 4.3, 0.6, 1.6], [-1.1, 4.4, -0.7, 1.7], [0.2, 6.1, -0.4, 1.5], [-0.3, 3.7, 1.2, 1.3]].forEach(([x, y, z, r], k) => {
    const g = new THREE.IcosahedronGeometry(r, 1);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const n = Math.sin(p.getX(i) * 3.1 + k) * Math.cos(p.getZ(i) * 2.7 - k) * 0.22 * r;
      p.setXYZ(i, p.getX(i) * (1 + n / r) + x, p.getY(i) * 0.9 + y, p.getZ(i) * (1 + n / r) + z);
    }
    casti.push(g);
  });
  const blob = spojGeometrie(casti, 2.6, 7.4);
  const k1 = new THREE.ConeGeometry(2.3, 4.6, 9).toNonIndexed(); k1.translate(0, 3.6, 0);
  const k2 = new THREE.ConeGeometry(1.6, 3.6, 9).toNonIndexed(); k2.translate(0, 6.0, 0);
  const kuzele = spojGeometrie([k1, k2], 1.2, 8);
  for (const g of [blob, kuzele, kmenGeo]) g.userData.zdielane = true;
  cacheGeo = { blob, kuzele, kmenGeo };
  return cacheGeo;
}

/** Spojí geometrie (normály podľa stredu koruny – mäkké tieňovanie) a pridá farbu vrcholov: dole tmavšie. */
function spojGeometrie(geos, yMin, yMax) {
  const poz = [];
  for (const g of geos) poz.push(...(g.index ? g.toNonIndexed() : g).attributes.position.array);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(poz, 3));
  const farby = [], nor = [];
  const sy = (yMin + yMax) / 2;
  for (let i = 0; i < poz.length; i += 3) {
    const t = Math.min(1, Math.max(0, (poz[i + 1] - yMin) / (yMax - yMin)));
    const v = 0.55 + t * 0.55;
    farby.push(v, v, v * 0.95);
    const n = new THREE.Vector3(poz[i], (poz[i + 1] - sy) * 0.8, poz[i + 2]).normalize();
    nor.push(n.x, n.y, n.z);
  }
  geo.setAttribute('color', new THREE.Float32BufferAttribute(farby, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  // spriemerovať s normálami plôch, aby zhluky boli trochu vidieť
  const plochy = geo.clone(); plochy.computeVertexNormals();
  const a = geo.attributes.normal.array, b = plochy.attributes.normal.array;
  for (let i = 0; i < a.length; i += 3) {
    const n = new THREE.Vector3(a[i] * 0.6 + b[i] * 0.4, a[i + 1] * 0.6 + b[i + 1] * 0.4, a[i + 2] * 0.6 + b[i + 2] * 0.4).normalize();
    a[i] = n.x; a[i + 1] = n.y; a[i + 2] = n.z;
  }
  return geo;
}
