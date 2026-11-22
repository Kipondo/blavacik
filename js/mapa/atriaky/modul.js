// Modul: Átriaky – chôdza po lávkach a terasách (ochoz), zábradlia s kolíziou, tabule a okolie (issue #91).
// Model domov a lávok je z Blendera (tools/blender/atriaky/bloky.py → assets/pamiatky/atriaky.glb.gz) a jeho
// JSON nesie údaje pre chôdzu: jadrá domov, výšky podlaží a terás, lávky (os, šírka, výšky podláh na koncoch).
// Tu sa z nich stavia:
//   – pochôdzne plochy (lávky, terasy) pre js/mapa/mosty/nadjazdy-modul.js (udalosť 'pochodzne-plochy'),
//   – kolízie s výškou (js/mapa/kolizie.js, info.vyska): dom po úroveň terasy, ustúpené podlažie celé,
//     biele zábradlia lávok a terás – pod lávkou sa dá prejsť, po terase chodiť; domy sú pre kameru „budova“,
//   – tabuľa bloku „T“ so smerovkou, múriky a kvetináče pri dvore, vchod do internátu a dvere z ochozu.
// Vonkajšie schody na ochoz nie sú (na fotkách ich niet): na ochoz bloku T sa ide z izby 314 (internat.js).
// Výšky v JSON sú nad základňou modelu (zem najnižšieho domu); základňa = výška skupiny modelu v scéne
// (posunie sa, keď sa pod areálom načíta laserový terén) – vtedy sa výšky prepočítajú.

import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const SUBOR = 'atriaky';
const SKUPINA_KOLIZII = 'modul:atriaky';   // všetky kolízie modulu sa pri prestavbe naraz odstránia
const PRIECHOD = 2.1;        // m voľnej výšky, od ktorej sa dá prejsť popod zábradlie lávky

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
    const kolizie = hra.mapa.kolizie;
    kolizie.odstranDlazdicu(SKUPINA_KOLIZII);
    this.kolizie = [];
    for (const c of [...this.skupina.children]) { this.skupina.remove(c); c.geometry?.dispose(); }

    const profily = [];
    // vrch = výška pre kameru: s ním je prekážka „budova“ a kamera do nej nevojde (js/kamera/kolizia-kamery.js)
    const prekazka = (body, od, po, zem = false, vrch = null) => {
      const info = { typ: vrch === null ? 'atriaky' : 'budova', vyska: [od, po], zem, dlazdica: SKUPINA_KOLIZII };
      if (vrch !== null) info.vrch = vrch;
      const p = kolizie.pridajPolygon(body, info);
      if (p) this.kolizie.push(p);
    };
    /** Biele zábradlie a→b (podlaha ya → yb) s kolíziou; vysoko nad zemou sa popod neho dá prejsť. */
    const zabradlieKol = (a, b, ya, yb) => {
      zabradlie(geo, a, b, ya, yb);
      const L = Math.hypot(b[0] - a[0], b[1] - a[1]);
      const k = Math.abs(yb - ya) > 0.3 ? Math.max(1, Math.ceil(L / 1.0)) : 1;
      for (let i = 0; i < k; i++) {
        const c = [a[0] + (b[0] - a[0]) * i / k, a[1] + (b[1] - a[1]) * i / k];
        const e = [a[0] + (b[0] - a[0]) * (i + 1) / k, a[1] + (b[1] - a[1]) * (i + 1) / k];
        const yc = ya + (yb - ya) * i / k, ye = ya + (yb - ya) * (i + 1) / k;
        const od = Math.min(yc, ye) - 0.35, g = teren((c[0] + e[0]) / 2, (c[1] + e[1]) / 2);
        prekazka(pas(c, e, 0.25), od, Math.max(yc, ye) + 1.1, od - g < PRIECHOD);
      }
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
        prekazka(jadro, zem - 4, terasa, true, terasa + 0.3);
        prekazka(odsadPolygon(jadro, -info.terasa), zem - 4, strecha + 2, true, strecha + 1.2);
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
        prekazka(jadro, zem - 4, strecha + 2, true, strecha + 1.2);
      }
    }

    // lávky: pochôdzne dosky so zábradlím po bokoch; lávka v úrovni terasy má v zábradlí terasy medzeru.
    // Vonkajšie schody nie sú (na fotkách ich niet) – na ochoz sa ide z izby internátu (js/mapa/atriaky/internat.js).
    for (const l of info.lavky) {
      const pa = sv(l.os[0]), pb = sv(l.os[1]);
      const L = Math.hypot(pb[0] - pa[0], pb[1] - pa[1]);
      const vx = -(pb[1] - pa[1]) / L, vz = (pb[0] - pa[0]) / L;
      const w = l.sirka / 2;
      for (const [a0, b0] of l.podlahy) {
        const ha = z0 + a0, hb = z0 + b0;
        profily.push({ body: [{ x: pa[0], z: pa[1], h: ha }, { x: pb[0], z: pb[1], h: hb }], sirka: l.sirka });
        for (const s of [-1, 1]) {
          zabradlieKol([pa[0] + vx * (w - 0.04) * s, pa[1] + vz * (w - 0.04) * s], [pb[0] + vx * (w - 0.04) * s, pb[1] + vz * (w - 0.04) * s], ha, hb);
        }
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
      }
    }

    // zábradlia terás (kolízia na okraji terasy)
    for (const d of domy.values()) {
      if (!d.terasa) continue;
      const j = d.jadroSvet;
      for (let i = 0; i < j.length; i++) {
        const a = j[i], b = j[(i + 1) % j.length];
        const nx = (b[1] - a[1]), nz = -(b[0] - a[0]);
        const n = Math.hypot(nx, nz) || 1;
        const o = 0.08 * (jeCcw(j) ? 1 : -1);
        const LH = Math.hypot(b[0] - a[0], b[1] - a[1]);
        for (const [t0, t1] of odcitajMedzery([0, LH], d._hrany?.[i]?.medzery ?? [])) {
          if (t1 - t0 < 0.3) continue;
          const c = [a[0] + (b[0] - a[0]) * t0 / LH + nx / n * o, a[1] + (b[1] - a[1]) * t0 / LH + nz / n * o];
          const e = [a[0] + (b[0] - a[0]) * t1 / LH + nx / n * o, a[1] + (b[1] - a[1]) * t1 / LH + nz / n * o];
          zabradlieKol(c, e, d.terasaY, d.terasaY);
        }
      }
    }

    // tabuľa bloku T so smerovkou a okolie dvora (podľa fotiek majiteľa)
    const T = domy.get('AD-T');
    if (T) {
      tabulaBloku(this.skupina, geo, T, teren, prekazka);
      // vchod do bloku T pre internát (js/mapa/atriaky/internat.js). Dom stojí na svahu a prízemie je miestami pod zemou: vchod je na mieste najbližšom k fotke 1,
      // kde je pod stropom prízemia aspoň 2,3 m
      const j = T.jadroSvet, foto = [-2902, -1795], cs = centroid(j);
      const strop = T.zemY + T.podlazie - 0.45;
      const normala = (i) => {
        const a = j[i], b = j[(i + 1) % j.length], lh = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
        let qx = (b[1] - a[1]) / lh, qz = -(b[0] - a[0]) / lh;
        if (((a[0] + b[0]) / 2 - cs[0]) * qx + ((a[1] + b[1]) / 2 - cs[1]) * qz < 0) { qx = -qx; qz = -qz; }
        return [qx, qz];
      };
      let naj = null;
      for (let i = 0; i < j.length; i++) {
        const a = j[i], b = j[(i + 1) % j.length], [qx, qz] = normala(i);
        for (let k = 2; k <= 18; k++) {
          const m = [a[0] + (b[0] - a[0]) * k / 20, a[1] + (b[1] - a[1]) * k / 20];
          const volno = strop - teren(m[0] + qx * 0.5, m[1] + qz * 0.5);
          const d = Math.hypot(m[0] - foto[0], m[1] - foto[1]) + (volno >= 2.3 ? 0 : 1000);
          if (!naj || d < naj.d) naj = { d, m, i };
        }
      }
      const [nx, nz] = normala(naj.i);
      const x = naj.m[0] + nx * 1.0, z = naj.m[1] + nz * 1.0;
      // strop = spodok dosky prvého poschodia (dvere sú vo výklenku pod ňou)
      hra.stav.atriakyVchod = { x, z, y: teren(x, z), uhol: Math.atan2(-nx, -nz), blok: 'T', strop };
      // ochoz (terasa): balkónové dvere izby 314 sú otvor v stene ustúpeného podlažia (poloha v JSON modelu,
      // tools/blender/atriaky/bloky.py); izba je priamo v meste a chodí sa do nej pešo (js/mapa/atriaky/internat.js)
      if (T.terasa && T.ochoz) {
        const [ox, oz] = sv(T.ochoz.p), [qx, qz] = T.ochoz.n;
        hra.stav.atriakyOchoz = { x: ox + qx * 1.0, z: oz + qz * 1.0, y: T.terasaY, uhol: Math.atan2(-qx, -qz),
          dvere: [ox, oz], n: [qx, qz], sirka: T.ochoz.sirka, otvor: true };
      } else if (T.terasa) {
        // starší model bez otvoru: dvere v betónovom portáli pred stenou
        const u = odsadPolygon(j, -info.terasa), c = u[naj.i], e = u[(naj.i + 1) % u.length];
        const mo = [(c[0] + e[0]) / 2, (c[1] + e[1]) / 2];
        // dvere sú v portáli, ktorý vystupuje 0,6 m pred stenu (zakryje parapet ustúpeného podlažia)
        hra.stav.atriakyOchoz = { x: mo[0] + nx * 1.35, z: mo[1] + nz * 1.35, y: T.terasaY, uhol: Math.atan2(-nx, -nz),
          dvere: [mo[0] + nx * 0.55, mo[1] + nz * 0.55] };
        prekazka(obdlznikUsecky([mo[0] - nx * 0.1, mo[1] - nz * 0.1], [mo[0] + nx * 0.6, mo[1] + nz * 0.6], 1.6), T.terasaY - 0.5, T.terasaY + 3);
      }
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

/** Kváder po šikmej osi a (výška ya) → b (yb): prierez sirka × hrubka. */
function sikmyKvader(kusy, a, b, ya, yb, sirka, hrubka) {
  const Lh = Math.hypot(b[0] - a[0], b[1] - a[1]) || 0.01, dy = yb - ya;
  const g = new THREE.BoxGeometry(sirka, hrubka, Math.hypot(Lh, dy));
  g.rotateX(-Math.atan2(dy, Lh));
  g.rotateY(Math.atan2(b[0] - a[0], b[1] - a[1]));
  g.translate((a[0] + b[0]) / 2, (ya + yb) / 2, (a[1] + b[1]) / 2);
  kusy.push(g.toNonIndexed());
  g.dispose();
}

/** Biele zábradlie zo stĺpikov a troch vodorovných tyčí nad úsečkou a (podlaha ya) → b (yb). */
function zabradlie(geo, a, b, ya, yb) {
  const L = Math.hypot(b[0] - a[0], b[1] - a[1]);
  if (L < 0.2) return;
  const ux = (b[0] - a[0]) / L, uz = (b[1] - a[1]) / L;
  for (const v of [0.55, 0.8, 1.05]) sikmyKvader(geo.biele, a, b, ya + v, yb + v, 0.045, 0.045);
  const k = Math.max(1, Math.round(L / 1.5));
  for (let i = 0; i <= k; i++) {
    const p = [a[0] + (b[0] - a[0]) * i / k, a[1] + (b[1] - a[1]) * i / k], y = ya + (yb - ya) * i / k;
    kvader(geo.biele, [p[0] - ux * 0.025, p[1] - uz * 0.025], [p[0] + ux * 0.025, p[1] + uz * 0.025], 0.05, y + 0.05, y + 1.08);
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
