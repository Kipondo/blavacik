// Chodníky s obrubníkmi pozdĺž mestských ciest (zvýšený pás vedľa vozovky).
// Pri križovatkách chodník obíde oblý roh (pravidlá ulice #136, js/mapa/cesty/rohy-chodnikov.js): rovný chodník končí
// tam, kde sa obrubník začína zatáčať, a pokračuje rohom po oblúku k chodníku druhej cesty; na rovnej strane
// priebežnej cesty (T-križovatka) sa neprerušuje. Všade, kde by ležal na vozovke (inej cesty – súbežné cesty, cesty
// bez spoločného bodu – aj vlastnej na vnútornej strane ostrej zákruty), sa chodník preruší (js/mapa/cesty/vozovky.js).
// Cez vjazdy do dvorov pokračuje. Jednosmerky majú chodník vpravo a vľavo tam, kde vedľa nie je druhý pás rozdelenej cesty.
// Na strane dopravného ostrovčeka alebo deliaceho pásu (js/mapa/cesty/ostrovceky.js) chodník nie je – len obrubník
// a za ním tráva.

import * as THREE from 'three';
import { pridajStrukturu } from './struktura.js';
import { pridajOpotrebenie } from './opotrebenie.js';
import { mriezkaVozoviek } from './vozovky.js';
import { SIRKA, OBRUBNIK, VYSKA, S_CHODNIKOM } from './chodnik-rozmery.js';
import { rohyChodnikov, preruseniaChodnikov } from './rohy-chodnikov.js';
import { vOstrovceku } from './ostrovceky.js';

const KROK = 4;             // m – najdlhší úsek chodníka

let textura = null;
/** Základná farba asfaltového chodníka (štruktúru a opotrebenie pridá shader). */
function asfaltChodnika() {
  if (textura) return textura;
  const c = document.createElement('canvas');
  c.width = c.height = 4;
  const g = c.getContext('2d');
  g.fillStyle = '#76736e'; g.fillRect(0, 0, 4, 4);
  textura = new THREE.CanvasTexture(c);
  textura.colorSpace = THREE.SRGBColorSpace;
  return textura;
}

/** Body osi po najviac KROK m a navyše v daných vzdialenostiach po osi (presné konce chodníka): [{ x, z, s }]. */
function vzorkyOsi(body, navyse) {
  const dl = [0];
  for (let k = 1; k < body.length; k++) dl.push(dl[k - 1] + Math.hypot(body[k][0] - body[k - 1][0], body[k][1] - body[k - 1][1]));
  const polohy = new Set(dl);
  for (let k = 1; k < body.length; k++) {
    const n = Math.ceil((dl[k] - dl[k - 1]) / KROK);
    for (let j = 1; j < n; j++) polohy.add(dl[k - 1] + (dl[k] - dl[k - 1]) * j / n);
  }
  for (const p of navyse) if (p > 0.05 && p < dl[dl.length - 1] - 0.05) polohy.add(p);
  const s = [...polohy].sort((a, b) => a - b).filter((p, j, a) => j === 0 || p - a[j - 1] > 0.02);
  let k = 1;
  return s.map((p) => {
    while (k < body.length - 1 && dl[k] < p) k++;
    const L = dl[k] - dl[k - 1] || 1, t = Math.max(0, Math.min(1, (p - dl[k - 1]) / L));
    return { x: body[k - 1][0] + (body[k][0] - body[k - 1][0]) * t, z: body[k - 1][1] + (body[k][1] - body[k - 1][1]) * t, s: p };
  });
}

export function vytvorChodniky(cesty, krizovatky, vyskopis, ostrovceky = []) {
  const poz = [], uv = [], obrPoz = [];
  const vozovky = mriezkaVozoviek(cesty);
  const prerusenia = preruseniaChodnikov(cesty, krizovatky);
  const vrch = (p) => [p[0], p[1] + VYSKA, p[2]];
  const dol = (p) => [p[0], p[1] + 0.1, p[2]];
  const zem = (p) => [p[0], p[1] - 0.05, p[2]];
  /** Úsek chodníka medzi dvoma priečnymi radmi { i: okraj vozovky, k: za obrubníkom, o: vonkajší okraj }. */
  const usek = (pred, bod) => {
    const A = pred.k, B = bod.k, C = bod.o, D = pred.o;
    // vrch chodníka – trojuholníky s normálou nahor (poradie podľa toho, na ktorú stranu chodník ide)
    // normála (B − A) × (C − A) má y = (Bz − Az)(Cx − Ax) − (Bx − Ax)(Cz − Az); kladná = nahor
    const hore = (B[2] - A[2]) * (C[0] - A[0]) - (B[0] - A[0]) * (C[2] - A[2]) > 0;
    const tri = hore ? [A, B, C, A, C, D] : [A, C, B, A, D, C];
    for (const p of tri) { const q = vrch(p); poz.push(...q); uv.push(q[0] / 2, q[2] / 2); }
    // obrubník: zvislá stena od vozovky, vrch obrubníka a zadná stena chodníka k terénu
    const Ai = pred.i, Bi = bod.i;
    obrPoz.push(...dol(Ai), ...dol(Bi), ...vrch(Bi), ...dol(Ai), ...vrch(Bi), ...vrch(Ai));
    for (const p of [Ai, Bi, B, Ai, B, A]) obrPoz.push(...vrch(p));
    obrPoz.push(...zem(D), ...vrch(C), ...zem(C), ...zem(D), ...vrch(D), ...vrch(C));
  };
  /** Len obrubník (okraj ostrovčeka): čelo od vozovky, vrch a zadná stena k tráve. */
  const obrubnik = (pred, bod) => {
    const Ai = pred.i, Bi = bod.i, A = pred.k, B = bod.k;
    obrPoz.push(...dol(Ai), ...dol(Bi), ...vrch(Bi), ...dol(Ai), ...vrch(Bi), ...vrch(Ai));
    for (const p of [Ai, Bi, B, Ai, B, A]) obrPoz.push(...vrch(p));
    obrPoz.push(...zem(A), ...vrch(B), ...zem(B), ...zem(A), ...vrch(A), ...vrch(B));
  };
  const rad = (x, z, nx, nz, r0) => {
    const ix = x + nx * r0, iz = z + nz * r0, kx = x + nx * (r0 + OBRUBNIK), kz = z + nz * (r0 + OBRUBNIK);
    const ox = x + nx * (r0 + SIRKA), oz = z + nz * (r0 + SIRKA);
    return { i: [ix, vyskopis.vyska(ix, iz), iz], k: [kx, vyskopis.vyska(kx, kz), kz], o: [ox, vyskopis.vyska(ox, oz), oz] };
  };

  for (const c of cesty) {
    if (!S_CHODNIKOM.has(c.typ) || c.most) continue;
    // križovatky na ceste: kde rovný chodník končí (podľa strany a smeru od uzla)
    const uzly = (prerusenia.get(c) ?? []).map((u) => ({ ...u, s: 0 }));
    const dl = [0];
    for (let k = 1; k < c.body.length; k++) dl.push(dl[k - 1] + Math.hypot(c.body[k][0] - c.body[k - 1][0], c.body[k][1] - c.body[k - 1][1]));
    const konce = [];
    for (const u of uzly) {
      u.s = dl[u.i];
      for (const smer of [1, -1]) for (const strana of [1, -1]) if (u.r[smer][strana] > 0) konce.push(u.s + smer * u.r[smer][strana]);
    }
    const body = vzorkyOsi(c.body, konce);
    // chodník po oboch stranách; pri jednosmerke vľavo (strana −1) len tam, kde vedľa nie je druhý jazdný pás
    // rozdelenej cesty (stredný pás) – predtým mali jednosmerky chodník len vľavo, teda v strednom páse
    for (const strana of [1, -1]) {
      let pred = null;
      for (let i = 0; i < body.length; i++) {
        const { x, z, s } = body[i];
        const blizko = uzly.some((u) => {
          const r = u.r[s >= u.s ? 1 : -1][strana];
          return r > 0 && Math.abs(s - u.s) < r - 0.01;
        });
        const prev = body[Math.max(0, i - 1)], next = body[Math.min(body.length - 1, i + 1)];
        let dx = next.x - prev.x, dz = next.z - prev.z;
        const d = Math.hypot(dx, dz) || 1; dx /= d; dz /= d;
        const nx = -dz * strana, nz = dx * strana;
        const r0 = c.sirka / 2, r1 = r0 + SIRKA;
        // chodník by ležal na vozovke (inej cesty alebo vlastnej na vnútornej strane zákruty) – tu sa preruší;
        // vnútorný okraj, stred a vonkajší okraj chodníka
        const bodVo = (r) => [x + nx * r, z + nz * r];
        const naVozovke = [r0 + 0.5, r0 + SIRKA / 2, r1].some((r) => vozovky.naVozovke(...bodVo(r), null, 0.3));
        // jednosmerka vľavo: druhý jazdný pás rozdelenej cesty do ~8 m za chodníkom = stredný pás, chodník nie je
        const strednyPas = c.jednosmerka && strana < 0 && vozovky.naVozovke(...bodVo(r1 + 3), c, -8);
        // strana ostrovčeka: namiesto chodníka obrubník (ak sám neleží na vozovke)
        const ostrov = !blizko && vOstrovceku(ostrovceky, ...bodVo(r0 + OBRUBNIK + 0.25))
          && !vozovky.naVozovke(...bodVo(r0 + OBRUBNIK + 0.2), null, 0.3);
        const prerus = blizko || naVozovke || strednyPas || ostrov;
        const bod = { ...rad(x, z, nx, nz, r0), prerus, ostrov };
        if (pred && !prerus && !pred.prerus) usek(pred, bod);
        else if (pred && ostrov && pred.ostrov) obrubnik(pred, bod);
        pred = bod;
      }
    }
  }

  // rohy chodníkov po oblých rohoch križovatiek a po vonkajšej strane ohybov (rohy-chodnikov.js)
  let rohy = 0, vhodne = 0;
  for (const p of rohyChodnikov(cesty, krizovatky)) {
    vhodne++;
    const naVozovke = p.vnutro.some(([x, z], j) => {
      const [nx, nz] = p.normaly[j];
      return [0.5, SIRKA / 2, SIRKA].some((r) => vozovky.naVozovke(x + nx * r, z + nz * r, null, 0.3));
    });
    // roh v ostrovčeku: len obrubník po oblúku
    const stred = Math.floor(p.vnutro.length / 2), [sx, sz] = p.vnutro[stred], [snx, snz] = p.normaly[stred];
    const vOstrove = vOstrovceku(ostrovceky, sx + snx * (OBRUBNIK + 0.25), sz + snz * (OBRUBNIK + 0.25));
    if (naVozovke && !vOstrove) continue;
    let pred = null;
    p.vnutro.forEach(([x, z], j) => {
      const bod = rad(x, z, p.normaly[j][0], p.normaly[j][1], 0);
      if (pred) (vOstrove ? obrubnik : usek)(pred, bod);
      pred = bod;
    });
    rohy++;
  }

  const skupina = new THREE.Group();
  skupina.name = 'chodniky';
  skupina.userData.rohy = { postavene: rohy, vhodne };
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(poz, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.computeVertexNormals();
  // vrch chodníka: asfalt (svetlejší ako vozovka) so štruktúrou, záplatami a prasklinami
  const matVrch = pridajOpotrebenie(pridajStrukturu(new THREE.MeshStandardMaterial({ map: asfaltChodnika(), roughness: 0.95 }), 'asfalt', 3.3, 0.9, 0.8), 0);
  const vrchy = new THREE.Mesh(geo, matVrch);
  vrchy.receiveShadow = true;
  const geoO = new THREE.BufferGeometry();
  geoO.setAttribute('position', new THREE.Float32BufferAttribute(obrPoz, 3));
  geoO.computeVertexNormals();
  const obrubniky = new THREE.Mesh(geoO, new THREE.MeshStandardMaterial({ color: '#a19e97', roughness: 0.85, side: THREE.DoubleSide }));
  obrubniky.receiveShadow = true;
  skupina.add(vrchy, obrubniky);
  return skupina;
}
