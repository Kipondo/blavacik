// Modul: Átriaky – chôdza po lávkach a terasách, schodiská, zábradlia s kolíziou, tabule a okolie (issue #91).
// Model domov a lávok je z Blendera (tools/blender/atriaky/bloky.py → assets/pamiatky/atriaky.glb.gz) a jeho
// JSON nesie údaje pre chôdzu: jadrá domov, výšky podlaží a terás, lávky (os, šírka, výšky podláh na koncoch).
// Tu sa z nich stavia:
//   – pochôdzne plochy (lávky, terasy, schody) pre js/mapa/mosty/nadjazdy-modul.js (udalosť 'pochodzne-plochy'),
//   – kolízie s výškou (js/mapa/kolizie.js, info.vyska): dom po úroveň terasy, ustúpené podlažie celé,
//     zábradlia lávok, terás a schodov – pod lávkou sa dá prejsť, po terase chodiť,
//   – schodiská (zem → 1. lávka → 2. lávka → terasa), tabuľa bloku „T“ so smerovkou, múriky a kvetináče pri dvore.
// Výšky v JSON sú nad základňou modelu (zem najnižšieho domu); základňa = výška skupiny modelu v scéne
// (posunie sa, keď sa pod areálom načíta laserový terén) – vtedy sa výšky prepočítajú.

import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const SUBOR = 'atriaky';
const SIRKA_SCHODOV = 1.3;
const SKLON = 1.75;          // m dĺžky na meter výšky (~30°)

export default {
  nazov: 'atriaky',
  poradie: 7,   // po module nadjazdov (6), ktorý zbiera pochôdzne plochy

  async init(hra) {
    this.hra = hra;
    this.zaklad = null;
    const zaznam = (hra.mapa?.pamiatky ?? []).find((p) => p.subor === SUBOR);
    if (!zaznam) return;
    let info;
    try { info = await (await fetch(`assets/pamiatky/${SUBOR}.json`)).json(); } catch { return; }
    if (!info.domy || !info.lavky) return;   // starý model bez údajov pre chôdzu
    this.zaznam = zaznam;
    this.info = info;
    this.skupina = new THREE.Group();
    this.skupina.name = 'atriaky-chodza';
    hra.scena.add(this.skupina);
    this.cas = 0;
    this.aktualizuj();
  },

  /** Skupina modelu Átriakov v scéne (jej y = základňa). */
  model() {
    if (this._model?.parent) return this._model;
    const pam = this.hra.mapa?.objekt?.getObjectByName?.('pamiatky');
    this._model = pam?.children.find((o) => o.name === (this.zaznam.nazov ?? SUBOR)) ?? null;
    return this._model;
  },

  updateVzdy(dt) {
    if (!this.info) return;
    this.cas -= dt;
    if (this.cas > 0) return;
    this.cas = 1;
    this.aktualizuj();
  },

  /** Keď sa zmení základňa modelu (terén), postaví všetko znova v správnej výške. */
  aktualizuj() {
    const m = this.model();
    if (!m) return;
    const y = m.position.y;
    if (this.zaklad !== null && Math.abs(y - this.zaklad) < 0.01) return;
    this.zaklad = y;
    try { this.postav(); } catch (e) { console.error('Átriaky:', e.stack ?? e); }
  },

  postav() {
    const hra = this.hra, info = this.info, z0 = this.zaklad;
    const sx = this.zaznam.x, sz = this.zaznam.z;
    const sv = ([x, z]) => [sx + x, sz + z];
    const teren = hra.mapa.vyskaTerenu ?? hra.mapa.vyska;
    // staré kolízie, plochy a geometria preč
    for (const p of this.kolizie ?? []) p.info.vyska = [-1e9, -1e9];
    this.kolizie = [];
    for (const c of [...this.skupina.children]) { this.skupina.remove(c); c.geometry?.dispose(); }

    const profily = [];
    const kolizie = hra.mapa.kolizie;
    const prekazka = (body, od, po, zem = false) => {
      const p = kolizie.pridajPolygon(body, { typ: 'atriaky', vyska: [od, po], zem });
      if (p) this.kolizie.push(p);
    };
    const pas = (a, b, hrubka) => obdlznikUsecky(a, b, hrubka);
    const geo = { beton: [], cervena: [], biele: [], tabula: [] };

    // domy: kolízia po terasu (zvonka), ustúpené podlažie po strechu; terasy ako pochôdzne pásy
    const domy = new Map();
    for (const d of info.domy) {
      const jadro = d.jadro.map(sv);
      const zem = z0 + d.zem;
      const terasa = zem + (d.pocet - 1) * d.podlazie;
      const strecha = zem + d.vyska;
      const dom = { ...d, jadroSvet: jadro, terasaY: terasa, zemY: zem, _hrany: [] };
      domy.set(d.meno, dom);
      if (d.terasa) {
        prekazka(jadro, zem - 4, terasa, true);
        prekazka(odsadPolygon(jadro, -info.terasa), zem - 4, strecha + 2, true);
        for (let i = 0; i < jadro.length; i++) {
          const a = jadro[i], b = jadro[(i + 1) % jadro.length];
          let [ia, ib] = [odsadBod(jadro, i, -info.terasa / 2), odsadBod(jadro, (i + 1) % jadro.length, -info.terasa / 2)];
          // predĺžené o pol šírky terasy, aby boli pochôdzne aj rohy
          const le = Math.hypot(ib[0] - ia[0], ib[1] - ia[1]) || 1, ex = (ib[0] - ia[0]) / le * info.terasa / 2, ez = (ib[1] - ia[1]) / le * info.terasa / 2;
          ia = [ia[0] - ex, ia[1] - ez]; ib = [ib[0] + ex, ib[1] + ez];
          profily.push({ body: [{ x: ia[0], z: ia[1], h: terasa }, { x: ib[0], z: ib[1], h: terasa }], sirka: info.terasa + 0.2 });
          dom._hrany.push({ a, b, medzery: [] });
        }
      } else {
        prekazka(jadro, zem - 4, strecha + 2, true);
      }
    }

    // lávky: pochôdzne dosky, zábradlia po bokoch (s medzerami pri schodoch), schodiská
    const jadra = [...domy.values()].map((d) => odsadPolygon(d.jadroSvet, 0.15));
    const dosky = info.lavky.map((l) => ({ lavka: l, stopa: obdlznikUsecky(sv(l.os[0]), sv(l.os[1]), l.sirka + 0.3) }));
    const stavane = [];
    /** Schody dole → vrch: geometria, pochôdzny profil, zábradlia s kolíziou. otvorena = strana (±1 voči smeru
     *  schodov), kde je prestup na lávku: pri vrchu (hore) a/alebo pri spodku (dole) ostane v zábradlí medzera. */
    const postavSchody = (dole, vrch, h0, h1, zoZeme, otvorena, hore, dolu) => {
      schodisko(geo, dole, vrch, h0, h1, SIRKA_SCHODOV, zoZeme);
      profily.push({ body: [{ x: dole[0], z: dole[1], h: h0 }, { x: vrch[0], z: vrch[1], h: h1 }], sirka: SIRKA_SCHODOV });
      const Ls = Math.hypot(vrch[0] - dole[0], vrch[1] - dole[1]);
      const qx = (vrch[0] - dole[0]) / Ls, qz = (vrch[1] - dole[1]) / Ls, px = -qz, pz = qx;
      const o = SIRKA_SCHODOV / 2 + 0.05;
      for (const s of [-1, 1]) {
        const a = [dole[0] + px * o * s, dole[1] + pz * o * s], b = [vrch[0] + px * o * s, vrch[1] + pz * o * s];
        zabradlieSikme(geo, a, b, h0, h1);
        // strana pri lávke: otvorená pri prestupe
        const t0 = s === otvorena && dolu ? 1.6 / Ls : 0, t1 = s === otvorena && hore ? 1 - 1.6 / Ls : 1;
        if (t1 <= t0) continue;
        const c = [a[0] + (b[0] - a[0]) * t0, a[1] + (b[1] - a[1]) * t0], e = [a[0] + (b[0] - a[0]) * t1, a[1] + (b[1] - a[1]) * t1];
        prekazka(pas(c, e, 0.25), Math.min(h0, h1) - 0.3, Math.max(h0, h1) + 1.1, zoZeme);
      }
    };
    for (const l of info.lavky) {
      const pa = sv(l.os[0]), pb = sv(l.os[1]);
      const L = Math.hypot(pb[0] - pa[0], pb[1] - pa[1]);
      const ux = (pb[0] - pa[0]) / L, uz = (pb[1] - pa[1]) / L;
      const vx = -uz, vz = ux;
      const w = l.sirka / 2;
      const podlahy = l.podlahy.map(([a, b]) => [z0 + a, z0 + b]);
      for (const [ha, hb] of podlahy) profily.push({ body: [{ x: pa[0], z: pa[1], h: ha }, { x: pb[0], z: pb[1], h: hb }], sirka: l.sirka });

      const medzery = podlahy.map(() => ({ 1: [], [-1]: [] }));   // úrovne → strana → [t0, t1] medzery v zábradlí
      // lávka v úrovni terasy: v zábradlí terasy medzera, z lávky sa prejde rovno na terasu
      podlahy.forEach(([ha, hb]) => {
        for (const [meno, koniec, h] of [[l.domy[0], pa, ha], [l.domy[1], pb, hb]]) {
          const d = domy.get(meno);
          if (!d?.terasa || Math.abs(h - d.terasaY) > 0.6) continue;
          const j = d.jadroSvet;
          let iH = 0, dMin = Infinity;
          for (let i = 0; i < j.length; i++) {
            const dd = vzdialenostOdUsecky(koniec, j[i], j[(i + 1) % j.length]);
            if (dd < dMin) { dMin = dd; iH = i; }
          }
          const a = j[iH], b = j[(iH + 1) % j.length];
          const LH = Math.hypot(b[0] - a[0], b[1] - a[1]);
          const t = ((koniec[0] - a[0]) * (b[0] - a[0]) + (koniec[1] - a[1]) * (b[1] - a[1])) / LH;
          d._hrany[iH].medzery.push([t - w - 0.3, t + w + 0.3]);
        }
      });

      // schodisko rovnobežne s lávkou na strane s; vrch pri t = tVrch, dole smerom k druhému koncu (smer = ±1).
      // hDole = null → zo zeme. Na prestup medzi schodmi a lávkou ostane v zábradliach medzera 1,6 m.
      const skus = (hDole, hHore, strana, tVrch, smer, uroven, urovenDole) => {
        const off = w + SIRKA_SCHODOV / 2 + 0.05;
        const vrch = [pa[0] + ux * tVrch + vx * off * strana, pa[1] + uz * tVrch + vz * off * strana];
        let hD = hDole ?? 0, dlzka = 2.5;
        for (let k = 0; k < 4; k++) {
          const d = [vrch[0] - ux * smer * dlzka, vrch[1] - uz * smer * dlzka];
          if (hDole === null) hD = teren(d[0], d[1]);
          dlzka = Math.max(2.5, (hHore - hD) * SKLON);
        }
        const dole = [vrch[0] - ux * smer * dlzka, vrch[1] - uz * smer * dlzka];
        if (hHore - hD < 1.2) return false;
        const stopa = obdlznikUsecky(dole, vrch, SIRKA_SCHODOV + 0.2);
        if (jadra.some((z) => prekryvaju(stopa, z)) || dosky.some((z) => z.lavka !== l && prekryvaju(stopa, z.stopa))
          || stavane.some((z) => prekryvaju(stopa, z))) return false;
        stavane.push(stopa);
        postavSchody(dole, vrch, hD, hHore, hDole === null, -strana, true, urovenDole !== null);
        const t0 = tVrch - smer * 1.6;
        medzery[uroven][strana].push([Math.min(t0, tVrch), Math.max(t0, tVrch)]);
        if (urovenDole !== null) {
          const td = tVrch - smer * dlzka;
          medzery[urovenDole][strana].push([Math.min(td, td + smer * 1.6), Math.max(td, td + smer * 1.6)]);
        }
        return true;
      };
      // 1) zo zeme na dolnú lávku, 2) z dolnej na hornú (na opačnej strane)
      let stranaDole = 0;
      for (const strana of [1, -1]) {
        if (skus(null, podlahy[0][1], strana, L - 0.9, 1, 0, null) || skus(null, podlahy[0][0], strana, 0.9, -1, 0, null)) { stranaDole = strana; break; }
      }
      if (podlahy.length > 1) {
        const s2 = stranaDole ? -stranaDole : 1;
        if (!skus(podlahy[0][0], podlahy[1][1], s2, L - 0.9, 1, 1, 0) && !skus(podlahy[0][1], podlahy[1][0], s2, 0.9, -1, 1, 0)) {
          skus(podlahy[0][0], podlahy[1][1], -s2, L - 0.9, 1, 1, 0) || skus(podlahy[0][1], podlahy[1][0], -s2, 0.9, -1, 1, 0);
        }
        // 3) z hornej lávky na terasu domu pri jej konci: popri fasáde, vrch pri fasáde vo výške terasy
        const horna = podlahy.length - 1;
        const pokus3 = [[l.domy[0], pa, podlahy[horna][0], 0], [l.domy[1], pb, podlahy[horna][1], L]];
        hotovo3: for (const [meno, koniec, h, tKonca] of pokus3) {
          const d = domy.get(meno);
          if (!d?.terasa || d.terasaY - h < 1.2) continue;
          const j = d.jadroSvet;
          // hrana jadra najbližšie ku koncu lávky
          let iH = 0, dMin = Infinity;
          for (let i = 0; i < j.length; i++) {
            const a = j[i], b = j[(i + 1) % j.length];
            const dd = vzdialenostOdUsecky(koniec, a, b);
            if (dd < dMin) { dMin = dd; iH = i; }
          }
          const a = j[iH], b = j[(iH + 1) % j.length];
          const LH = Math.hypot(b[0] - a[0], b[1] - a[1]);
          const ex = (b[0] - a[0]) / LH, ez = (b[1] - a[1]) / LH;
          let nx = ez, nz = -ex;                       // normála von z domu
          const st = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], cs = centroid(j);
          if ((st[0] - cs[0]) * nx + (st[1] - cs[1]) * nz < 0) { nx = -nx; nz = -nz; }
          const tK = (koniec[0] - a[0]) * ex + (koniec[1] - a[1]) * ez;
          const dlzka = (d.terasaY - h) * SKLON;
          const off = SIRKA_SCHODOV / 2 + 0.1;
          for (const sm of [1, -1]) {
            const tD = tK + sm * (w + 0.05), tV = tD + sm * dlzka;
            if (Math.min(tD, tV) < 0.5 || Math.max(tD, tV) > LH - 0.5) continue;
            const dole = [a[0] + ex * tD + nx * off, a[1] + ez * tD + nz * off];
            const vrch = [a[0] + ex * tV + nx * off, a[1] + ez * tV + nz * off];
            const stopa = obdlznikUsecky(dole, vrch, SIRKA_SCHODOV + 0.1);
            if (dosky.some((z) => z.lavka !== l && prekryvaju(stopa, z.stopa)) || stavane.some((z) => prekryvaju(stopa, z))) continue;
            if ([...domy.values()].some((o) => o !== d && prekryvaju(stopa, odsadPolygon(o.jadroSvet, 0.15)))) continue;
            stavane.push(stopa);
            // dolný koniec: prestup z lávky (bok lávky pri konci), horný: na terasu cez jej okraj
            // strana schodov k fasáde je pri vrchu otvorená (prestup na terasu)
            const qx = (vrch[0] - dole[0]) / dlzka, qz = (vrch[1] - dole[1]) / dlzka;
            const kDomu = -Math.sign(-qz * nx + qx * nz) || 1;
            postavSchody(dole, vrch, h, d.terasaY, false, kDomu, true, false);
            const tL = tKonca === 0 ? [0, 1.8] : [L - 1.8, L];
            const strana = Math.sign((dole[0] - koniec[0]) * vx + (dole[1] - koniec[1]) * vz) || 1;
            medzery[horna][strana].push(tL);
            d._hrany[iH].medzery.push([Math.min(tV, tV - sm * 1.6), Math.max(tV, tV - sm * 1.6)]);
            break hotovo3;
          }
        }
      }

      // dosky lávok: zábradlia po bokoch (kolízia), okrem medzier pri schodoch
      podlahy.forEach(([ha, hb], i) => {
        for (const s of [-1, 1]) {
          const useky = odcitajMedzery([0, L], medzery[i][s]);
          for (const [t0, t1] of useky) {
            if (t1 - t0 < 0.3) continue;
            const a = [pa[0] + ux * t0 + vx * (w + 0.05) * s, pa[1] + uz * t0 + vz * (w + 0.05) * s];
            const b = [pa[0] + ux * t1 + vx * (w + 0.05) * s, pa[1] + uz * t1 + vz * (w + 0.05) * s];
            prekazka(pas(a, b, 0.3), Math.min(ha, hb) - 0.3, Math.max(ha, hb) + 1.1);
          }
        }
      });
      // chýbajúce zábradlie modelu v medzerách pri schodoch nekreslíme znova – model má zábradlie celé,
      // pri schodoch sa cez neho len „prestúpi“ (kolízia tam nie je); vizuálne stačí
    }

    // zábradlia terás (kolízia na okraji terasy)
    for (const d of domy.values()) {
      if (!d.terasa) continue;
      const j = d.jadroSvet;
      for (let i = 0; i < j.length; i++) {
        const a = j[i], b = j[(i + 1) % j.length];
        const nx = (b[1] - a[1]), nz = -(b[0] - a[0]);
        const n = Math.hypot(nx, nz) || 1;
        const o = 0.12 * (jeCcw(j) ? 1 : -1);
        const LH = Math.hypot(b[0] - a[0], b[1] - a[1]);
        for (const [t0, t1] of odcitajMedzery([0, LH], d._hrany?.[i]?.medzery ?? [])) {
          if (t1 - t0 < 0.3) continue;
          const c = [a[0] + (b[0] - a[0]) * t0 / LH + nx / n * o, a[1] + (b[1] - a[1]) * t0 / LH + nz / n * o];
          const e = [a[0] + (b[0] - a[0]) * t1 / LH + nx / n * o, a[1] + (b[1] - a[1]) * t1 / LH + nz / n * o];
          prekazka(pas(c, e, 0.3), d.terasaY - 0.2, d.terasaY + 1.1);
        }
      }
    }

    // tabuľa bloku T so smerovkou a okolie dvora (podľa fotiek majiteľa)
    const T = domy.get('AD-T');
    if (T) {
      tabulaBloku(this.skupina, geo, T, teren, prekazka);
      // vchod do bloku T (hrana jadra najbližšie k miestu fotky 1) – pre internát (js/mapa/atriaky/internat.js)
      const j = T.jadroSvet, foto = [-2902, -1795], cs = centroid(j);
      let naj = null;
      for (let i = 0; i < j.length; i++) {
        const a = j[i], b = j[(i + 1) % j.length], m = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
        const d = Math.hypot(m[0] - foto[0], m[1] - foto[1]);
        if (!naj || d < naj.d) naj = { d, m };
      }
      const nx = naj.m[0] - cs[0], nz = naj.m[1] - cs[1], nl = Math.hypot(nx, nz) || 1;
      const x = naj.m[0] + nx / nl * 1.0, z = naj.m[1] + nz / nl * 1.0;
      hra.stav.atriakyVchod = { x, z, y: teren(x, z), uhol: Math.atan2(-nx, -nz), blok: 'T' };
    }
    okolieDvora(geo, teren, prekazka);

    // geometria: jedna sieť na materiál
    const MAT = materialy();
    for (const [k, kusy] of Object.entries(geo)) {
      if (!kusy.length || !MAT[k]) continue;
      const g = mergeGeometries(kusy, false);
      kusy.forEach((q) => q.dispose());
      const mesh = new THREE.Mesh(g, MAT[k]);
      mesh.castShadow = mesh.receiveShadow = true;
      mesh.name = `atriaky-${k}`;
      this.skupina.add(mesh);
    }
    hra.posli('pochodzne-plochy', { kluc: 'atriaky', profily });
    this.profily = profily;
  },
};

// ---------- geometria a pomocné výpočty ----------

let _mat = null;
function materialy() {
  _mat ??= {
    beton: new THREE.MeshStandardMaterial({ color: '#b2ada3', roughness: 0.9 }),
    cervena: new THREE.MeshStandardMaterial({ color: '#9b3f30', roughness: 0.8 }),
    biele: new THREE.MeshStandardMaterial({ color: '#e6e6e1', roughness: 0.4, metalness: 0.5 }),
  };
  return _mat;
}

function jeCcw(p) {
  let a = 0;
  for (let i = 0; i < p.length; i++) { const [x0, z0] = p[i], [x1, z1] = p[(i + 1) % p.length]; a += x0 * z1 - x1 * z0; }
  return a > 0;
}

/** Bod i polygónu posunutý o d von (záporné = dnu), rohy s pokosom. */
function odsadBod(p, i, d) {
  const n = p.length, ccw = jeCcw(p) ? 1 : -1;
  const a = p[(i - 1 + n) % n], b = p[i], c = p[(i + 1) % n];
  const nor = (u, v) => { const dx = v[0] - u[0], dz = v[1] - u[1], l = Math.hypot(dx, dz) || 1; return [dz / l * ccw, -dx / l * ccw]; };   // von z polygónu
  const n1 = nor(a, b), n2 = nor(b, c);
  let mx = n1[0] + n2[0], mz = n1[1] + n2[1];
  const l = Math.hypot(mx, mz) || 1; mx /= l; mz /= l;
  const k = Math.max(0.3, mx * n1[0] + mz * n1[1]);
  return [b[0] + mx * d / k, b[1] + mz * d / k];
}
function odsadPolygon(p, d) { return p.map((_, i) => odsadBod(p, i, d)); }

/** Obdĺžnik okolo úsečky a→b s danou šírkou (pôdorys). */
function obdlznikUsecky(a, b, sirka) {
  const L = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
  const vx = -(b[1] - a[1]) / L * sirka / 2, vz = (b[0] - a[0]) / L * sirka / 2;
  return [[a[0] + vx, a[1] + vz], [b[0] + vx, b[1] + vz], [b[0] - vx, b[1] - vz], [a[0] - vx, a[1] - vz]];
}

/** Prekrývajú sa dva konvexné polygóny? (oddeľujúca os) */
function prekryvaju(A, B) {
  for (const P of [A, B]) {
    for (let i = 0; i < P.length; i++) {
      const a = P[i], b = P[(i + 1) % P.length];
      const nx = -(b[1] - a[1]), nz = b[0] - a[0];
      let amin = Infinity, amax = -Infinity, bmin = Infinity, bmax = -Infinity;
      for (const q of A) { const v = q[0] * nx + q[1] * nz; amin = Math.min(amin, v); amax = Math.max(amax, v); }
      for (const q of B) { const v = q[0] * nx + q[1] * nz; bmin = Math.min(bmin, v); bmax = Math.max(bmax, v); }
      if (amax < bmin || bmax < amin) return false;
    }
  }
  return true;
}

function vzdialenostOdUsecky(p, a, b) {
  const dx = b[0] - a[0], dz = b[1] - a[1], l2 = dx * dx + dz * dz || 1;
  const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dz) / l2));
  return Math.hypot(a[0] + dx * t - p[0], a[1] + dz * t - p[1]);
}

function centroid(p) {
  let x = 0, z = 0;
  for (const q of p) { x += q[0]; z += q[1]; }
  return [x / p.length, z / p.length];
}

function odcitajMedzery([a, b], medzery) {
  let useky = [[a, b]];
  for (const [m0, m1] of medzery) {
    useky = useky.flatMap(([u0, u1]) => (m1 <= u0 || m0 >= u1 ? [[u0, u1]] : [[u0, m0], [m1, u1]].filter(([x, y]) => y > x)));
  }
  return useky;
}

/** Kváder s osou a→b (pôdorys), výška y0…y1. */
function kvader(kusy, a, b, sirka, y0, y1) {
  const L = Math.hypot(b[0] - a[0], b[1] - a[1]) || 0.01;
  const g = new THREE.BoxGeometry(sirka, y1 - y0, L);
  g.rotateY(Math.atan2(b[0] - a[0], b[1] - a[1]));
  g.translate((a[0] + b[0]) / 2, (y0 + y1) / 2, (a[1] + b[1]) / 2);
  kusy.push(g.toNonIndexed());
  g.dispose();
}

/** Schodisko z bodu dole (výška h0) na vrch (h1): stupne, bočnice; zoZeme = plný múr pod stupňami. */
function schodisko(geo, dole, vrch, h0, h1, sirka, zoZeme) {
  const L = Math.hypot(vrch[0] - dole[0], vrch[1] - dole[1]);
  const n = Math.max(3, Math.round((h1 - h0) / 0.17));
  const ux = (vrch[0] - dole[0]) / L, uz = (vrch[1] - dole[1]) / L;
  for (let i = 0; i < n; i++) {
    const t0 = (i / n) * L, t1 = ((i + 1) / n) * L;
    const a = [dole[0] + ux * t0, dole[1] + uz * t0], b = [dole[0] + ux * t1, dole[1] + uz * t1];
    const y = h0 + ((i + 1) / n) * (h1 - h0);
    kvader(geo.beton, a, b, sirka, zoZeme ? h0 - 0.5 : y - 0.35, y);
  }
  // podesta hore (1 m) a tehlovočervené bočnice
  const p1 = [vrch[0] + ux * 0.0, vrch[1] + uz * 0.0];
  kvader(geo.beton, [vrch[0] - ux * 0.8, vrch[1] - uz * 0.8], [p1[0] + ux * 0.2, p1[1] + uz * 0.2], sirka, h1 - 0.35, h1);
  const vx = -uz, vz = ux;
  for (const s of [-1, 1]) {
    const o = sirka / 2 + 0.06;
    const a = [dole[0] + vx * o * s, dole[1] + vz * o * s], b = [vrch[0] + vx * o * s, vrch[1] + vz * o * s];
    // šikmá bočnica: niekoľko úsekov
    const k = Math.max(2, Math.round(L / 1.2));
    for (let i = 0; i < k; i++) {
      const t0 = i / k, t1 = (i + 1) / k;
      const c = [a[0] + (b[0] - a[0]) * t0, a[1] + (b[1] - a[1]) * t0], d = [a[0] + (b[0] - a[0]) * t1, a[1] + (b[1] - a[1]) * t1];
      const y = h0 + (h1 - h0) * (t0 + t1) / 2;
      kvader(geo.cervena, c, d, 0.12, zoZeme ? Math.max(h0 - 0.5, y - 1.5) : y - 0.45, y + 0.25);
    }
  }
}

/** Biele zábradlie z vodorovných tyčí po šikmej línii (schody). */
function zabradlieSikme(geo, a, b, h0, h1) {
  const L = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const k = Math.max(2, Math.round(L / 1.2));
  for (let i = 0; i < k; i++) {
    const t0 = i / k, t1 = (i + 1) / k;
    const c = [a[0] + (b[0] - a[0]) * t0, a[1] + (b[1] - a[1]) * t0], d = [a[0] + (b[0] - a[0]) * t1, a[1] + (b[1] - a[1]) * t1];
    const y = h0 + (h1 - h0) * (t0 + t1) / 2;
    for (const v of [0.5, 0.8, 1.05]) kvader(geo.biele, c, d, 0.045, y + v - 0.022, y + v + 0.022);
    kvader(geo.biele, c, [c[0] + (d[0] - c[0]) * 0.04, c[1] + (d[1] - c[1]) * 0.04], 0.05, h0 + (h1 - h0) * t0 + 0.25, h0 + (h1 - h0) * t0 + 1.05);
  }
}

/** Oranžová tabuľa s písmenom bloku na stĺpe pri vchode, pod ňou biela tabuľka a smerovka „UKc →“ (fotka 1). */
function tabulaBloku(skupina, geo, T, teren, prekazka) {
  // stĺp pred západným rohom bloku T, pri prechode pod lávkou R–T
  const j = T.jadroSvet;
  let roh = j[0];
  for (const p of j) if (p[0] < roh[0]) roh = p;
  const x = roh[0] - 4.0, z = roh[1] + 2.5;
  const y = teren(x, z);
  kvader(geo.biele, [x, z - 0.06], [x, z + 0.06], 0.12, y, y + 0.5);              // biela pätka
  const stlp = new THREE.CylinderGeometry(0.05, 0.05, 2.9, 8);
  stlp.translate(x, y + 1.45, z);
  geo.beton.push(stlp.toNonIndexed()); stlp.dispose();
  prekazka([[x - 0.15, z - 0.15], [x + 0.15, z - 0.15], [x + 0.15, z + 0.15], [x - 0.15, z + 0.15]], y - 1, y + 3, true);
  const tex = (kresli, w, h) => {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    kresli(c.getContext('2d'), w, h);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
    return t;
  };
  const tabula = (t, sirka, vyska, ty) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(sirka, vyska), new THREE.MeshStandardMaterial({ map: t, roughness: 0.6, side: THREE.DoubleSide }));
    m.position.set(x + 0.06, y + ty, z);
    m.rotation.y = Math.PI / 2;   // lícom na západ (k príchodu z fotky 1)
    skupina.add(m);
  };
  tabula(tex((g, w, h) => {
    g.fillStyle = '#e8781e'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#ffffff'; g.font = 'bold 150px system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText('T', w / 2, h / 2 + 8);
  }, 192, 192), 0.42, 0.42, 2.55);
  tabula(tex((g, w, h) => {
    g.fillStyle = '#f4f4f0'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#20242a'; g.font = '20px system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText('Átriové domy', w / 2, h / 2);
  }, 192, 48), 0.42, 0.1, 2.24);
  tabula(tex((g, w, h) => {
    g.fillStyle = '#2b2f34'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#ffffff'; g.font = 'bold 34px system-ui, sans-serif'; g.textAlign = 'left'; g.textBaseline = 'middle';
    g.fillText('UKc  →', 14, h / 2 + 2);
  }, 192, 56), 0.5, 0.15, 1.45);
}

/** Múriky, kvetináče, kôš a lampa v dvore medzi blokmi R, O, S, T (fotka 2, x = −2894, z = −1820). */
function okolieDvora(geo, teren, prekazka) {
  // chodník klesá od lávky R–T do doliny; po bokoch nízke betónové múriky a hranaté kvetináče
  const a = [-2896.6, -1811.0], b = [-2891.6, -1828.0];
  const L = Math.hypot(b[0] - a[0], b[1] - a[1]), ux = (b[0] - a[0]) / L, uz = (b[1] - a[1]) / L, vx = -uz, vz = ux;
  for (const s of [-1, 1]) {
    for (const [t0, t1] of [[1.5, 7.5], [9.0, 15.0]]) {
      const p = [a[0] + ux * t0 + vx * 1.9 * s, a[1] + uz * t0 + vz * 1.9 * s], q = [a[0] + ux * t1 + vx * 1.9 * s, a[1] + uz * t1 + vz * 1.9 * s];
      const y0 = Math.min(teren(p[0], p[1]), teren(q[0], q[1]));
      kvader(geo.beton, p, q, 0.25, y0 - 0.3, y0 + 0.55);
      prekazka(obdlznikUsecky(p, q, 0.35), y0 - 1, y0 + 0.55, true);
    }
    // kvetináč
    const c = [a[0] + ux * 8.2 + vx * 2.6 * s, a[1] + uz * 8.2 + vz * 2.6 * s];
    const yc = teren(c[0], c[1]);
    kvader(geo.beton, [c[0] - ux * 0.6, c[1] - uz * 0.6], [c[0] + ux * 0.6, c[1] + uz * 0.6], 1.2, yc - 0.2, yc + 0.7);
    prekazka(obdlznikUsecky([c[0] - ux * 0.6, c[1] - uz * 0.6], [c[0] + ux * 0.6, c[1] + uz * 0.6], 1.3), yc - 1, yc + 0.7, true);
  }
  // lampa: vysoký sivý stĺp, biela pätka
  const l = [a[0] + ux * 5 - vx * 2.6, a[1] + uz * 5 - vz * 2.6], yl = teren(l[0], l[1]);
  const pat = new THREE.CylinderGeometry(0.16, 0.16, 0.6, 10); pat.translate(l[0], yl + 0.3, l[1]);
  geo.biele.push(pat.toNonIndexed()); pat.dispose();
  const st = new THREE.CylinderGeometry(0.06, 0.08, 5.2, 8); st.translate(l[0], yl + 2.6, l[1]);
  geo.beton.push(st.toNonIndexed()); st.dispose();
  kvader(geo.beton, [l[0], l[1]], [l[0] + ux * 0.6, l[1] + uz * 0.6], 0.25, yl + 5.1, yl + 5.3);
  prekazka([[l[0] - 0.2, l[1] - 0.2], [l[0] + 0.2, l[1] - 0.2], [l[0] + 0.2, l[1] + 0.2], [l[0] - 0.2, l[1] + 0.2]], yl - 1, yl + 5, true);
  // sivý odpadkový kôš
  const k = [a[0] + ux * 3 - vx * 2.4, a[1] + uz * 3 - vz * 2.4], yk = teren(k[0], k[1]);
  const kos = new THREE.CylinderGeometry(0.22, 0.2, 0.85, 12); kos.translate(k[0], yk + 0.42, k[1]);
  geo.beton.push(kos.toNonIndexed()); kos.dispose();
}
