// Geometria vozidiel MHD – procedurálne, bez súborov (#93: vzhľad ako súčasné bratislavské vozidlá, bez log výrobcov).
// Každý článok má tri časti: karoseria (farby vo vrcholoch), sklo (okná, čelné sklo, otvory dverí), svetla (svietiace).
// Plus spoločné krídlo dverí (posúva sa pri otvorení – vykreslenie.js).
//
//   električka: 5 článkov, jasne červená karoséria, čierny pás okien cez celú dĺžku, sivé kryty kĺbov,
//               zaoblené čelo so šikmým čelným sklom (obojsmerná – kabína na oboch koncoch), hranaté svetlomety
//               so striebornou lištou, nízky spojler, malé biele číslo vozidla na nose, zrkadlá na tyči, zberač na streche,
//   autobus a trolejbus: červená karoséria, čierny pás veľkých okien až po strechu, strieborné harmonikové mechy,
//               veľké zaoblené čelné sklo, zahnuté spätné zrkadlá zhora („tykadlá“), LED svetlá v čiernych rámoch,
//               vymyslená tabuľka s číslom, kryt klimatizácie na streche.
// Displej s číslom linky a cieľom kreslí displeje.js – jeho poloha (nad čelným sklom, v zadnom okne) ostáva rovnaká.
//
// Lokálne osi článku: +z = dopredu (smer jazdy), y = hore (0 = koľaj/cesta), pravá strana vozidla je −x.
// Stred článku je v strede jeho dĺžky.

import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { MEDZERA } from './typy.js';

// farby (vlastná schéma podľa bratislavských vozidiel, bez značiek)
const F = {
  cervena: 0xd4161e, cervenaTmava: 0x9e0f15, cierna: 0x141719, ram: 0x0c0e10,
  strieborna: 0xb9bec3, siva: 0x80878d, sivaTmava: 0x4a5056, strecha: 0x2b2e31,
  koleso: 0x151617, disk: 0xc3c8cc, zlta: 0xf2c200, biela: 0xf4f4f1,
  sklo: 0x1a2128, skloCelne: 0x24313c, otvor: 0x0e0f10,
  svetloPredne: 0xfff3d1, svetloZadne: 0xff2414, smerovka: 0xffa21a,
};

const farba = new THREE.Color();

/** Zbiera kúsky geometrie jednej časti (všetky bez indexu, s normálami a farbami). */
class Diel {
  constructor() { this.kusy = []; }

  pridaj(geo, hex, matica) {
    let g = geo.index ? geo.toNonIndexed() : geo;
    g.deleteAttribute('uv');
    if (matica) g.applyMatrix4(matica);
    if (!g.getAttribute('normal')) g.computeVertexNormals();
    const n = g.getAttribute('position').count;
    const c = new Float32Array(n * 3);
    farba.setHex(hex); // setHex prevedie zo sRGB do lineárneho priestoru
    for (let i = 0; i < n; i++) { c[i * 3] = farba.r; c[i * 3 + 1] = farba.g; c[i * 3 + 2] = farba.b; }
    g.setAttribute('color', new THREE.BufferAttribute(c, 3));
    this.kusy.push(g);
    return g;
  }

  /** Kváder so stredom (cx, cy, cz). */
  kvader(sx, sy, sz, cx, cy, cz, hex, natocenie) {
    const g = new THREE.BoxGeometry(sx, sy, sz);
    const m = new THREE.Matrix4();
    if (natocenie) m.makeRotationFromEuler(natocenie);
    m.setPosition(cx, cy, cz);
    return this.pridaj(g, hex, m);
  }

  /** Valec s osou pozdĺž x (koleso). */
  koleso(r, sirka, cx, cy, cz, hex) {
    const g = new THREE.CylinderGeometry(r, r, sirka, 14);
    const m = new THREE.Matrix4().makeRotationZ(Math.PI / 2).setPosition(cx, cy, cz);
    return this.pridaj(g, hex, m);
  }

  /** Tyč z bodu a do bodu b (štvorcový prierez). */
  tyc(a, b, hrubka, hex) {
    const d = new THREE.Vector3().subVectors(b, a);
    const g = new THREE.BoxGeometry(hrubka, hrubka, d.length());
    const m = new THREE.Matrix4().lookAt(new THREE.Vector3(), d, new THREE.Vector3(0, 1, 0));
    m.setPosition(a.clone().add(b).multiplyScalar(0.5));
    return this.pridaj(g, hex, m);
  }

  hotovo() {
    if (!this.kusy.length) return new THREE.BufferGeometry();
    const g = mergeGeometries(this.kusy, false);
    g.computeBoundingSphere();
    return g;
  }
}

/** Prefarbí trojuholníky geometrie podľa funkcie (stred y, stred z, normála) → hex. */
function prefarbi(geo, fn) {
  const pos = geo.getAttribute('position'), nor = geo.getAttribute('normal'), col = geo.getAttribute('color');
  const c = new THREE.Color();
  for (let i = 0; i < pos.count; i += 3) {
    const cy = (pos.getY(i) + pos.getY(i + 1) + pos.getY(i + 2)) / 3;
    const cz = (pos.getZ(i) + pos.getZ(i + 1) + pos.getZ(i + 2)) / 3;
    c.setHex(fn(cy, cz, nor.getX(i), nor.getY(i), nor.getZ(i)));
    for (let k = 0; k < 3; k++) col.setXYZ(i + k, c.r, c.g, c.b);
  }
}

/** Výšky pásov: okná (od – do). Električka má čierny pás okien pod strechou, autobus okná až po strechu. */
function pasy(t) {
  const el = t.typ === 'elektricka';
  return el ? { okno0: 1.0, okno1: t.vyska - 0.45 } : { okno0: 1.02, okno1: t.vyska - 0.2 };
}

/** Telo článku: vytiahnutý prierez so zaoblenou strechou, prefarbený po pásoch podľa výšky. */
function telo(diel, t, d) {
  const w = t.sirka / 2, y0 = t.podlaha, H = t.vyska, r = 0.42, rb = 0.06;
  const { okno0, okno1 } = pasy(t);
  const s = new THREE.Shape();
  s.moveTo(-w + rb, y0);
  s.lineTo(w - rb, y0);
  s.quadraticCurveTo(w, y0, w, y0 + rb);
  s.lineTo(w, okno0 - 0.06); s.lineTo(w, okno1 + 0.04); s.lineTo(w, H - r);
  s.quadraticCurveTo(w, H, w - r, H);
  s.lineTo(-w + r, H);
  s.quadraticCurveTo(-w, H, -w, H - r);
  s.lineTo(-w, okno1 + 0.04); s.lineTo(-w, okno0 - 0.06); s.lineTo(-w, y0 + rb);
  s.quadraticCurveTo(-w, y0, -w + rb, y0);
  const g = new THREE.ExtrudeGeometry(s, { depth: d, bevelEnabled: false, curveSegments: 4, steps: 1 });
  g.translate(0, 0, -d / 2);
  const geo = diel.pridaj(g, F.cervena);
  prefarbi(geo, (cy, cz, nx, ny, nz) => {
    if (Math.abs(nz) > 0.7) return F.cervena;           // čelá (zakryje ich kabína / kryt kĺbu)
    if (ny > 0.55) return F.cervena;                    // strecha
    if (ny < -0.55) return F.cierna;                    // spodok
    if (cy > okno0 - 0.06 && cy < okno1 + 0.04) return F.cierna; // pás okien – medzi tabuľami tiež čierny
    return F.cervena;
  });
}

/** Okná po bokoch (pás skla) s prerušením pri dverách na pravej strane (−x). */
function okna(sklo, t, d, dvere, predok, zadok) {
  const w = t.sirka / 2 + 0.012;
  const el = t.typ === 'elektricka';
  const { okno0: y0, okno1: y1 } = pasy(t);
  const kabina = el ? 1.0 : 1.5;
  const zMin = -d / 2 + (zadok ? (el ? 1.0 : 0.9) : 0.3), zMax = d / 2 - (predok ? kabina : 0.3);
  const sirkaDveri = 1.32;
  for (const strana of [-1, 1]) {
    // úseky bez dverí (dvere sú len vpravo)
    const prerusenia = strana < 0 ? dvere.map((z) => [z - sirkaDveri / 2 - 0.08, z + sirkaDveri / 2 + 0.08]) : [];
    prerusenia.sort((a, b) => a[0] - b[0]);
    let od = zMin;
    for (const [a, b] of [...prerusenia, [zMax, zMax]]) {
      const doo = Math.min(a, zMax);
      if (doo - od > 0.3) {
        // veľké tabule po ~1,7 m s úzkymi čiernymi stĺpikmi (medzery – telo je v páse okien čierne)
        const n = Math.max(1, Math.round((doo - od) / 1.7));
        const dl = (doo - od) / n;
        for (let i = 0; i < n; i++) {
          sklo.kvader(0.02, y1 - y0, dl - 0.07, strana * w, (y0 + y1) / 2, od + dl * (i + 0.5), F.sklo);
        }
      }
      od = Math.max(od, b);
    }
  }
  // otvory dverí (tmavé, zakryjú ich krídla, keď sú zatvorené)
  const hornaDveri = t.vyska - 0.5;
  for (const z of dvere) sklo.kvader(0.02, hornaDveri - t.podlaha - 0.05, sirkaDveri, -w + 0.004, (hornaDveri + t.podlaha + 0.05) / 2, z, F.otvor);
}

/**
 * Kabína (čelo) ako bočný profil vytiahnutý cez celú šírku so zaoblenými hranami. smer = +1 vpredu, −1 vzadu.
 * profil = vonkajšie body [z od konca článku, y]; kvôli zaobleniu (b) sa profil vopred zmenší.
 * Vráti body čelného skla (spodná a horná hrana) pre umiestnenie skla.
 */
function kabina(diel, t, d, smer, profil, farbaFn) {
  const b = 0.12;
  const z0 = d / 2;
  const s = new THREE.Shape();
  // zmenšenie: predné body dozadu o b, horné dole, spodné hore
  const vnutri = profil.map(([z, y], i) => {
    const zz = z > -0.2 ? z - b : z + b;
    const yy = y > t.vyska - 0.3 ? y - b : y < t.podlaha + 0.2 ? y + b : y;
    return [zz, yy, i];
  });
  vnutri.forEach(([z, y], i) => (i ? s.lineTo(z, y) : s.moveTo(z, y)));
  s.closePath();
  const sirka = t.sirka - 2 * b;
  const g = new THREE.ExtrudeGeometry(s, { depth: sirka, bevelEnabled: true, bevelThickness: b, bevelSize: b, bevelSegments: 2, curveSegments: 2, steps: 1 });
  // tvar je v rovine (z, y), vytiahnutie ide po osi x
  g.rotateY(-Math.PI / 2);
  g.translate(sirka / 2, 0, 0);
  if (smer < 0) g.rotateY(Math.PI);
  g.translate(0, 0, smer * z0);
  const geo = diel.pridaj(g, F.cervena);
  prefarbi(geo, (cy, cz, nx, ny, nz) => farbaFn(cy, Math.abs(cz) - z0, nx, ny, nz * smer));
}

/** Čelné sklo na šikmej hrane kabíny medzi bodmi a (spodok) a c (vrch), [z od konca článku, y]. */
function celneSklo(sklo, t, d, smer, a, c, sirka) {
  const z0 = d / 2;
  const dz = c[0] - a[0], dy = c[1] - a[1];
  const dl = Math.hypot(dz, dy);
  // vonkajšia normála šikmej hrany (dopredu a hore)
  const nz = dy / dl, ny = -dz / dl;
  const sklon = Math.atan2(-dz, dy); // naklonenie dozadu
  const zS = (a[0] + c[0]) / 2 + nz * 0.012, yS = (a[1] + c[1]) / 2 + ny * 0.012;
  const e = smer > 0 ? new THREE.Euler(-sklon, 0, 0) : new THREE.Euler(sklon, 0, 0);
  sklo.kvader(sirka, dl - 0.08, 0.02, 0, yS, smer * (z0 + zS), F.skloCelne, e);
}

/** 7-segmentové číslice (biele) na nose električky; z = rovina, číslice smerom +z. */
function cisloVozidla(diel, text, cy, z, smer) {
  const SEG = { 0: 'abcdef', 1: 'bc', 2: 'abged', 3: 'abgcd', 4: 'fgbc', 5: 'afgcd', 6: 'afgedc', 7: 'abc', 8: 'abcdefg', 9: 'abcdfg' };
  const v = 0.1, s = 0.055, h = 0.013, krok = 0.075;
  const x0 = -((text.length - 1) * krok) / 2;
  [...text].forEach((ch, i) => {
    const cx = (x0 + i * krok) * smer;
    for (const seg of SEG[ch] ?? '') {
      const [sx, sy, ox, oy] = {
        a: [s, h, 0, v / 2], g: [s, h, 0, 0], d: [s, h, 0, -v / 2],
        f: [h, v / 2, -s / 2, v / 4], b: [h, v / 2, s / 2, v / 4], e: [h, v / 2, -s / 2, -v / 4], c: [h, v / 2, s / 2, -v / 4],
      }[seg];
      diel.kvader(sx, sy, 0.012, cx + ox * smer, cy + oy, z, F.biela);
    }
  });
}

/** Kabína električky (obojsmerná – rovnaká vpredu aj vzadu), svetlá, lišta, spojler, číslo, zrkadlá. */
function kabinaElektricky(diel, sklo, svetla, t, d, smer) {
  const w = t.sirka / 2, H = t.vyska, z0 = d / 2;
  const yS0 = 1.08, yS1 = H - 0.55;
  const profil = [
    [-0.35, t.podlaha + 0.02], [0.44, t.podlaha + 0.02], [0.52, 0.42], [0.53, 0.72], [0.46, yS0],
    [0.05, yS1], [0.04, H - 0.06], [-0.35, H - 0.06],
  ];
  kabina(diel, t, d, smer, profil, (cy, z, nx, ny, nz) => {
    if (nz > 0.25 && cy > yS0 - 0.04) return F.ram;          // rám čelného skla a okolie displeja
    if (cy < t.podlaha + 0.16) return F.cervenaTmava;        // spodná hrana spojlera
    return F.cervena;
  });
  celneSklo(sklo, t, d, smer, [0.46, yS0], [0.05, yS1], t.sirka - 0.34);
  // bočné okná kabíny (čierne)
  for (const s of [-1, 1]) sklo.kvader(0.02, yS1 - 1.0, 0.75, s * (w + 0.012), (1.0 + yS1) / 2, smer * (z0 - 0.55), F.sklo);
  // svetlomety (vpredu biele, vzadu červené) so striebornou lištou cez nos
  const zN = smer * (z0 + 0.535);
  diel.kvader(t.sirka - 0.55, 0.045, 0.02, 0, 0.82, zN, F.strieborna);
  for (const s of [-1, 1]) {
    diel.kvader(0.42, 0.17, 0.02, s * (w - 0.36), 0.82, zN - smer * 0.004, F.ram);
    svetla.kvader(0.34, 0.11, 0.02, s * (w - 0.36), 0.82, zN + smer * 0.008, smer > 0 ? F.svetloPredne : F.svetloZadne);
    svetla.kvader(0.16, 0.05, 0.02, s * (w - 0.36), 0.66, smer * (z0 + 0.545), F.smerovka);
  }
  // malé biele číslo vozidla na nose (vymyslené)
  cisloVozidla(diel, '7528', 0.5, smer * (z0 + 0.54), smer);
  // spätné zrkadlá na tyči pri čele
  for (const s of [-1, 1]) {
    const a = new THREE.Vector3(s * w, H - 1.05, smer * (z0 - 0.15));
    const b = new THREE.Vector3(s * (w + 0.34), H - 1.12, smer * (z0 + 0.05));
    diel.tyc(a, b, 0.04, F.cierna);
    diel.kvader(0.06, 0.32, 0.18, b.x, b.y - 0.1, b.z, F.cierna);
  }
}

/** Predok autobusu / trolejbusu s veľkým čelným sklom, displejom, LED svetlami, tykadlami a tabuľkou. */
function predokAutobusu(diel, sklo, svetla, t, d) {
  const w = t.sirka / 2, H = t.vyska, z0 = d / 2;
  const yS0 = 0.98, yS1 = H - 0.5;
  const profil = [
    [-0.35, t.podlaha + 0.02], [0.2, t.podlaha + 0.02], [0.26, 0.5], [0.24, yS0], [0.07, yS1],
    [0.04, H - 0.04], [-0.35, H - 0.04],
  ];
  kabina(diel, t, d, 1, profil, (cy, z, nx, ny, nz) => {
    if (nz > 0.25 && cy > yS0 - 0.04) return F.ram;
    if (cy < 0.42 && nz > 0.25) return F.cierna;             // nárazník
    return F.cervena;
  });
  celneSklo(sklo, t, d, 1, [0.24, yS0], [0.07, yS1], t.sirka - 0.3);
  // bočné okná kabíny vodiča
  for (const s of [-1, 1]) sklo.kvader(0.02, yS1 - 1.02, 1.1, s * (w + 0.012), (1.02 + yS1) / 2 + 0.05, z0 - 0.75, F.sklo);
  // LED svetlá v čiernych rámoch po stranách
  const zN = z0 + 0.255;
  for (const s of [-1, 1]) {
    diel.kvader(0.5, 0.2, 0.02, s * (w - 0.38), 0.74, zN, F.ram);
    svetla.kvader(0.4, 0.05, 0.02, s * (w - 0.38), 0.79, zN + 0.008, F.svetloPredne);
    svetla.kvader(0.4, 0.04, 0.02, s * (w - 0.38), 0.69, zN + 0.008, F.svetloPredne);
    svetla.kvader(0.08, 0.12, 0.02, s * (w - 0.1), 0.74, zN + 0.008, F.smerovka);
  }
  // tabuľka s vymysleným číslom (biela s tmavými znakmi naznačenými pásikmi)
  diel.kvader(0.52, 0.12, 0.015, 0, 0.36, z0 + 0.235, F.biela);
  for (let i = 0; i < 6; i++) diel.kvader(0.045, 0.07, 0.01, -0.18 + i * 0.072, 0.36, z0 + 0.245, F.cierna);
  // zahnuté spätné zrkadlá zhora („tykadlá“)
  for (const s of [-1, 1]) {
    const a = new THREE.Vector3(s * (w - 0.08), H - 0.12, z0 - 0.15);
    const b = new THREE.Vector3(s * (w + 0.22), H - 0.22, z0 + 0.3);
    const c = new THREE.Vector3(s * (w + 0.28), H - 0.7, z0 + 0.42);
    diel.tyc(a, b, 0.05, F.cierna);
    diel.tyc(b, c, 0.05, F.cierna);
    diel.kvader(0.08, 0.36, 0.22, c.x, c.y - 0.18, c.z, F.cierna);
  }
}

/** Zadok autobusu so zadným oknom (displej v ňom dopĺňa displeje.js) a zadnými svetlami v čiernych rámoch. */
function zadokAutobusu(diel, sklo, svetla, t, d) {
  const w = t.sirka / 2, z = -d / 2;
  sklo.kvader(t.sirka - 0.5, 0.95, 0.04, 0, t.vyska - 1.15, z - 0.06, F.sklo);
  sklo.kvader(t.sirka - 1.2, 0.22, 0.05, 0, t.vyska - 0.4, z - 0.03, 0x050505);
  diel.kvader(t.sirka - 0.04, 0.3, 0.1, 0, t.podlaha + 0.17, z - 0.06, F.cierna);
  for (const s of [-1, 1]) {
    diel.kvader(0.26, 0.5, 0.02, s * (w - 0.17), 1.0, z - 0.06, F.ram);
    svetla.kvader(0.18, 0.3, 0.02, s * (w - 0.17), 1.04, z - 0.075, F.svetloZadne);
    svetla.kvader(0.14, 0.08, 0.02, s * (w - 0.17), 0.82, z - 0.075, F.smerovka);
  }
  diel.kvader(0.52, 0.12, 0.015, 0, 0.62, z - 0.06, F.biela);
}

/** Spoj medzi článkami – na +z konci zadného článku: električka sivý kryt kĺbu, autobus strieborná harmonika. */
function mech(diel, t, d) {
  const z = d / 2 + MEDZERA / 2, vys = t.vyska - t.podlaha - 0.2, cy = (t.vyska + t.podlaha) / 2 - 0.02;
  if (t.typ === 'elektricka') {
    diel.kvader(t.sirka - 0.08, vys, MEDZERA + 0.1, 0, cy, z, F.siva);
    // úzke zvislé kryty kĺbu na bokoch (svetlejšie)
    for (const s of [-1, 1]) diel.kvader(0.03, vys - 0.1, MEDZERA - 0.1, s * (t.sirka / 2 - 0.02), cy, z, F.strieborna);
    return;
  }
  // harmonika: zvislé lamely striedavo strieborné a sivé
  const n = 7, hr = (MEDZERA + 0.1) / n;
  for (let i = 0; i < n; i++) {
    const sir = t.sirka - (i % 2 ? 0.2 : 0.1);
    diel.kvader(sir, vys + (i % 2 ? -0.06 : 0), hr, 0, cy, z - (MEDZERA + 0.1) / 2 + hr * (i + 0.5), i % 2 ? F.siva : F.strieborna);
  }
}

function podvozokElektricky(diel, t) {
  // podvozky pod článkom (tmavé), kolesá skryté za krytmi
  diel.kvader(t.sirka - 0.5, 0.26, 2.0, 0, 0.15, 0, F.koleso);
  for (const s of [-1, 1]) diel.koleso(0.33, 0.12, s * (t.sirka / 2 - 0.42), 0.33, 0.6, F.koleso);
}

function kolesaAutobusu(diel, t, napravy) {
  for (const z of napravy) {
    for (const s of [-1, 1]) {
      diel.koleso(0.5, 0.3, s * (t.sirka / 2 - 0.2), 0.5, z, F.koleso);
      diel.koleso(0.27, 0.31, s * (t.sirka / 2 - 0.2), 0.5, z, F.disk);
      // tmavý blatník nad kolesom
      diel.kvader(0.02, 0.12, 1.25, s * (t.sirka / 2 + 0.005), 1.0, z, F.cierna);
    }
  }
}

function zberac(diel, t) {
  // jednoramenný zberač prúdu na streche stredného článku (sivý, žltá lišta zberača)
  const y = t.vyska;
  diel.kvader(1.4, 0.16, 1.1, 0, y + 0.08, 0, F.strecha);
  const a = new THREE.Vector3(0, y + 0.2, -0.45), b = new THREE.Vector3(0, y + 0.75, 0.55), c = new THREE.Vector3(0, y + 1.25, -0.2);
  for (const s of [-0.25, 0.25]) diel.tyc(a.clone().setX(s), b.clone().setX(s * 0.4), 0.06, F.siva);
  diel.tyc(b, c, 0.05, F.siva);
  diel.kvader(1.6, 0.05, 0.12, 0, c.y, c.z, F.zlta);
}

function krytyElektricky(diel, t, d) {
  // kryty zariadení na streche (čierne)
  diel.kvader(t.sirka - 0.9, 0.22, Math.min(2.6, d - 1.4), 0, t.vyska + 0.09, 0, F.strecha);
}

function tyceTrolejbusu(diel, t, d) {
  // dve tyče od strechy dozadu-hore k (pomyselnému) trolejovému vedeniu vo výške ~5,6 m
  const y = t.vyska;
  diel.kvader(1.2, 0.2, 1.6, 0, y + 0.1, -d / 2 + 1.6, F.strecha);
  for (const s of [-0.35, 0.35]) {
    const a = new THREE.Vector3(s, y + 0.25, -d / 2 + 1.9);
    const b = new THREE.Vector3(s * 1.15, 5.6, -d / 2 + 1.9 - 5.4);
    diel.tyc(a, b, 0.07, F.sivaTmava);
    diel.kvader(0.12, 0.1, 0.35, b.x, b.y, b.z, F.cierna);
  }
}

function strechaAutobusu(diel, t, d) {
  // kryt klimatizácie na streche (sivý)
  diel.kvader(t.sirka - 0.7, 0.26, 3.0, 0, t.vyska + 0.11, d / 2 - 2.8, F.siva);
}

/** Postaví geometriu jedného článku. */
function postavClanok(t, c, index, pocet) {
  const kar = new Diel(), sklo = new Diel(), svetla = new Diel();
  const jePredok = index === 0, jeZadok = index === pocet - 1;
  const el = t.typ === 'elektricka';
  telo(kar, t, c.d);
  okna(sklo, t, c.d, c.dvere, jePredok, jeZadok);
  if (!jePredok) mech(kar, t, c.d);
  if (el) {
    if (jePredok) kabinaElektricky(kar, sklo, svetla, t, c.d, 1);
    if (jeZadok) kabinaElektricky(kar, sklo, svetla, t, c.d, -1);
    if (c.varianta !== 'el-kratky') podvozokElektricky(kar, t);
    if (c.varianta === 'el-stredny') zberac(kar, t);
    else krytyElektricky(kar, t, c.d);
    // displej v zadnom okne (displeje.js) – čierne pozadie
    if (jeZadok) sklo.kvader(t.sirka - 1.2, 0.24, 0.05, 0, t.vyska - 0.4, -c.d / 2 - 0.03, 0x050505);
  } else {
    if (jePredok) predokAutobusu(kar, sklo, svetla, t, c.d);
    if (jeZadok) zadokAutobusu(kar, sklo, svetla, t, c.d);
    kolesaAutobusu(kar, t, t.napravy?.[c.varianta] ?? [c.d / 2 - 2.7, -c.d / 2 + 3.0]);
    if (c.varianta === 'trol-predny') tyceTrolejbusu(kar, t, c.d);
    else if (jePredok) strechaAutobusu(kar, t, c.d);
  }
  // displej nad čelným sklom – čierne pozadie (text dopĺňa displeje.js)
  if (jePredok) sklo.kvader(t.sirka - 0.5, 0.3, 0.05, 0, t.vyska - 0.33, c.d / 2 + 0.03, 0x050505);
  return { karoseria: kar.hotovo(), sklo: sklo.hotovo(), svetla: svetla.hotovo() };
}

/** Krídlo dverí: čierne sklo, dole červený pás, žlté tlačidlo zvonka (farby vo vrcholoch, materiál karosérie). */
export function geometriaKridla(vyska) {
  const d = new Diel();
  d.kvader(0.03, 0.4, 0.62, 0, 0.2, 0, F.cervena);
  d.kvader(0.03, vyska - 0.4, 0.62, 0, 0.4 + (vyska - 0.4) / 2, 0, 0x1c242b);
  d.kvader(0.035, 0.05, 0.62, 0, vyska - 0.025, 0, F.cierna);
  d.kvader(0.035, 0.05, 0.03, 0, 0.42, 0, F.cierna);
  d.kvader(0.02, 0.06, 0.06, -0.02, 1.12, 0.22, F.zlta);
  return d.hotovo();
}

/** Geometrie všetkých variantov článkov pre zoznam typov: Map(varianta → { karoseria, sklo, svetla }). */
export function postavGeometrie(typy) {
  const out = new Map();
  for (const t of typy) {
    t.clanky.forEach((c, i) => {
      if (!out.has(c.varianta)) out.set(c.varianta, postavClanok(t, c, i, t.clanky.length));
    });
  }
  return out;
}
