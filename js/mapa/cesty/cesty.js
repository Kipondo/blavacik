// Cesty: asfaltové pásy, ktoré kopírujú terén (a mosty), a vodorovné značenie navrchu (#136).
// Formát v dátach: { "nazov", "typ", "sirka", "pruhy", "jednosmerka", "body": [[x,z], ...] }
//
// Dve vrstvy – koniec blikania a „bitia“ prekrývajúcich sa ciest:
//   1) asfalt: všetky cesty dlaždice (a plochy križovatiek, plochy-krizovatiek.js) majú jeden spoločný materiál,
//      textúru vo svetových súradniciach a jednu výšku nad terénom. Kde sa pásy prekrývajú (križovatky, súbežné
//      jazdné pásy), vyzerajú na pixel rovnako – nie je čo blikať (predtým každá cesta vlastné UV a značenie a
//      prekrývajúce sa cesty boli od seba len o 5 mm, z diaľky pod presnosťou hĺbky).
//   2) značenie: priehľadná vrstva s čiarami pruhov, krajnicami, stopami kolies a špinou pri obrubníku, len o kúsok
//      vyššie (polygonOffset, nie metre). Pri križovatkách končí (ako chodníky), takže sa čiary rôznych ciest
//      nekrížia. Cesty s rovnakým značením sa zlučujú do jednej siete (rýchlejšie vykresľovanie).

import * as THREE from 'three';
import { texturaAsfaltuSvet, texturaZnacenia, DLZKA_V } from './textura-cesty.js';
import { pridajStrukturu } from './struktura.js';
import { pridajOpotrebenie } from './opotrebenie.js';
import { kluc } from './krizovatky.js';

const KROK = 2.5;         // delenie cesty na úseky (m), aby sedela na teréne (terén je po 2 m)
export const NAD_TERENOM = 0.12;
export const MIERKA_ASFALTU = 9;   // m na jedno opakovanie textúry asfaltu (svetové súradnice)
const VOLNO_KRIZOVATKY = 1.0;      // m – značenie končí kúsok pred plochou križovatky
const S_OKRAJMI = new Set(['motorway', 'trunk', 'primary', 'motorway_link', 'trunk_link']);
// obslužné cesty (vjazdy do dvorov, parkovísk): značenie hlavnej cesty cez ne pokračuje, ich vlastné pri nej končí
const DROBNE = new Set(['service', 'living_street', 'track', 'unknown']);

let matAsfaltu = null;
/** Spoločný materiál asfaltu ciest a križovatiek (textúra aj opotrebenie vo svetových súradniciach). */
export function materialAsfaltu() {
  if (!matAsfaltu) {
    matAsfaltu = pridajOpotrebenie(pridajStrukturu(new THREE.MeshStandardMaterial({
      map: texturaAsfaltuSvet(), roughness: 0.9, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2,
    }), 'asfalt', 3.5, 0.9), 0);
  }
  return matAsfaltu;
}

const matZnacenia = new Map();
function materialZnacenia(pruhy, jednosmerka, okraje) {
  const k = `${pruhy}|${jednosmerka}|${okraje}`;
  if (!matZnacenia.has(k)) {
    matZnacenia.set(k, pridajOpotrebenie(pridajStrukturu(new THREE.MeshStandardMaterial({
      map: texturaZnacenia(pruhy, jednosmerka, okraje), roughness: 0.9, transparent: true, depthWrite: false,
      polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3,
    }), 'asfalt', 3.5, 0.9), 0));
  }
  return matZnacenia.get(k);
}

/**
 * @param {Array} cesty
 * @param {{ vyska(x, z): number }} vyskopis
 * @param {Map|null} krizovatky  z najdiKrizovatky – pri nich sa značenie preruší (bez nich ide značenie celé)
 */
export function vytvorCesty(cesty, vyskopis, krizovatky = null) {
  const asfalt = { poz: [], uv: [], idx: [] };
  const skupiny = new Map();

  for (const c of cesty) {
    const body = zjemni(c.body, KROK);
    if (body.length < 2) continue;
    pridajPas(asfalt, body, c.sirka / 2, NAD_TERENOM, vyskopis, { svet: true });
    const okraje = S_OKRAJMI.has(c.typ);
    const pruhy = c.typ === 'service' || c.typ === 'living_street' ? 1 : Math.max(1, Math.min(6, (c.pruhy ?? 2) | 0));
    const k = `${pruhy}|${!!c.jednosmerka}|${okraje}`;
    if (!skupiny.has(k)) skupiny.set(k, { pruhy, jednosmerka: !!c.jednosmerka, okraje, poz: [], uv: [], idx: [] });
    const s = skupiny.get(k);
    for (const u of usekyZnacenia(c.body, krizovatky, c.typ)) {
      const b = zjemni(u.body, KROK);
      if (b.length >= 2) pridajPas(s, b, c.sirka / 2, NAD_TERENOM, vyskopis, { v0: u.s0 / DLZKA_V });
    }
  }

  const skupina = new THREE.Group();
  skupina.name = 'cesty';
  if (asfalt.idx.length) skupina.add(siet(asfalt, materialAsfaltu(), 'asfalt'));
  for (const s of skupiny.values()) {
    if (s.idx.length) skupina.add(siet(s, materialZnacenia(s.pruhy, s.jednosmerka, s.okraje), 'znacenie'));
  }
  return skupina;
}

function siet(s, mat, meno) {
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(s.poz, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(s.uv, 2));
  geo.setIndex(s.idx);
  geo.computeVertexNormals();
  const mesh = new THREE.Mesh(geo, mat);
  mesh.name = meno;
  mesh.receiveShadow = true;
  return mesh;
}

/**
 * Úseky osi cesty, na ktorých sa kreslí značenie: bez kruhu križovatky (polomer + VOLNO_KRIZOVATKY).
 * Pri vjazde obslužnej cesty (DROBNE) značenie hlavnej cesty pokračuje; značenie obslužnej cesty končí vždy.
 * Vráti [{ body, s0 }] – s0 = vzdialenosť začiatku úseku od začiatku cesty (čiary nadväzujú v rytme).
 */
export function usekyZnacenia(body, krizovatky, typ = '') {
  if (!krizovatky?.size || body.length < 2) return [{ body, s0: 0 }];
  const s = [0];
  for (let i = 1; i < body.length; i++) s.push(s[i - 1] + Math.hypot(body[i][0] - body[i - 1][0], body[i][1] - body[i - 1][1]));
  const L = s[s.length - 1];
  const rezy = [];
  body.forEach(([x, z], i) => {
    const k = krizovatky.get(kluc(x, z));
    if (!k) return;
    // hlavné cesty v uzle okrem tejto (typy obsahujú aj ju samu – raz)
    const hlavne = (k.typy ?? []).filter((t) => !DROBNE.has(t)).length - (DROBNE.has(typ) ? 0 : 1);
    if (DROBNE.has(typ) || hlavne > 0 || !k.typy) rezy.push([s[i] - k.polomer - VOLNO_KRIZOVATKY, s[i] + k.polomer + VOLNO_KRIZOVATKY]);
  });
  if (!rezy.length) return [{ body, s0: 0 }];
  rezy.sort((a, b) => a[0] - b[0]);
  const bod = (t) => {
    let i = 1;
    while (i < s.length - 1 && s[i] < t) i++;
    const u = (t - s[i - 1]) / ((s[i] - s[i - 1]) || 1);
    return [body[i - 1][0] + (body[i][0] - body[i - 1][0]) * u, body[i - 1][1] + (body[i][1] - body[i - 1][1]) * u];
  };
  const vyrez = (a, b) => [bod(a), ...body.filter((_, i) => s[i] > a && s[i] < b), bod(b)];
  const out = [];
  let a = 0;
  for (const [r0, r1] of rezy) {
    if (r0 > a + 0.5) out.push({ body: vyrez(a, Math.min(r0, L)), s0: a });
    a = Math.max(a, r1);
  }
  if (L > a + 0.5) out.push({ body: vyrez(a, L), s0: a });
  return out;
}

/**
 * Pridá pás (cestu) do spoločnej geometrie. Normála vždy nahor.
 * V priečnom smere má pás 3 rady vrcholov (okraj – stred – okraj), aby terén v strede širokej cesty
 * nepresvital cez vozovku. V zákrute sa okraj posunie po osi uhla (pokos) – cesta sa nezúži –
 * a vnútorný okraj ostrej zákruty sa nevracia späť (pás sa neprekrúti).
 * svet = UV vo svetových súradniciach (asfalt), inak U naprieč (0..1) a V pozdĺž od v0 (značenie).
 */
export function pridajPas(s, body, pol, posun, vyskopis, { v0 = 0, svet = false, dlzkaV = DLZKA_V } = {}) {
  const zaciatok = s.poz.length / 3;
  let v = v0;
  let predL = null, predP = null;
  for (let i = 0; i < body.length; i++) {
    const [x, z] = body[i];
    const prev = body[Math.max(0, i - 1)], next = body[Math.min(body.length - 1, i + 1)];
    // smery úsekov pred a za bodom
    let ax = x - prev[0], az = z - prev[1], bx = next[0] - x, bz = next[1] - z;
    const la = Math.hypot(ax, az), lb = Math.hypot(bx, bz);
    if (la < 1e-6) { ax = bx; az = bz; } else { ax /= la; az /= la; }
    if (lb < 1e-6) { bx = ax; bz = az; } else { bx /= lb; bz /= lb; }
    if (la < 1e-6 && lb < 1e-6) { ax = bx = 1; az = bz = 0; }
    // normála ako os uhla, dĺžka pokosu najviac 2× šírka
    let nx = -(az + bz), nz = ax + bx;
    const ln = Math.hypot(nx, nz) || 1;
    nx /= ln; nz /= ln;
    const kos = Math.max(0.5, nx * -az + nz * ax);
    const o = pol / kos;
    const dx = ax + bx, dz = az + bz;
    if (i > 0) v += Math.hypot(x - body[i - 1][0], z - body[i - 1][1]) / dlzkaV;
    let L = [x + nx * o, z + nz * o], P = [x - nx * o, z - nz * o];
    // vnútorný okraj ostrej zákruty: ak by šiel proti smeru cesty, ostane na predošlom bode
    if (predL && (L[0] - predL[0]) * dx + (L[1] - predL[1]) * dz < 0) L = predL;
    if (predP && (P[0] - predP[0]) * dx + (P[1] - predP[1]) * dz < 0) P = predP;
    predL = L; predP = P;
    s.poz.push(L[0], vyskopis.vyska(L[0], L[1]) + posun, L[1]);
    s.poz.push(x, vyskopis.vyska(x, z) + posun, z);
    s.poz.push(P[0], vyskopis.vyska(P[0], P[1]) + posun, P[1]);
    if (svet) {
      const m = MIERKA_ASFALTU;
      s.uv.push(L[0] / m, L[1] / m, x / m, z / m, P[0] / m, P[1] / m);
    } else {
      s.uv.push(0, v, 0.5, v, 1, v);
    }
    if (i > 0) {
      const a = zaciatok + (i - 1) * 3;
      // poradie vrcholov tak, aby normála smerovala nahor (okraj L – stred, stred – okraj P)
      s.idx.push(a, a + 3, a + 1, a + 1, a + 3, a + 4);
      s.idx.push(a + 1, a + 4, a + 2, a + 2, a + 4, a + 5);
    }
  }
}

/** Rozdelí dlhé úseky na kratšie. */
export function zjemni(body, krok) {
  const out = [];
  for (let i = 0; i < body.length - 1; i++) {
    const [ax, az] = body[i], [bx, bz] = body[i + 1];
    const d = Math.hypot(bx - ax, bz - az);
    const n = Math.max(1, Math.ceil(d / krok));
    for (let k = 0; k < n; k++) out.push([ax + ((bx - ax) * k) / n, az + ((bz - az) * k) / n]);
  }
  if (body.length) out.push(body[body.length - 1]);
  return out;
}
