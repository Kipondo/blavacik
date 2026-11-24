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
//      Kde sa dve cesty prekrývajú mimo križovatky (rozdvojenie, pripájací pruh, súbežné pásy z OSM), platí
//      značenie dôležitejšej cesty – menšia ho na jej vozovke nekreslí (prednostZnacenia), takže čiary nejdú
//      krížom cez seba; v rozdvojení ostane len úzke „V“ ich okrajových čiar ako v skutočnosti.

import * as THREE from 'three';
import { texturaAsfaltuSvet, texturaZnacenia, DLZKA_V } from './textura-cesty.js';
import { pridajStrukturu } from './struktura.js';
import { ROH } from './krizovatky-tvar.js';
import { pridajOpotrebenie } from './opotrebenie.js';
import { kluc } from './krizovatky.js';
import { polohyPrechodov } from './prechody-poloha.js';
import { mriezkaVozoviek } from './vozovky.js';

const KROK = 2.5;         // delenie cesty na úseky (m), aby sedela na teréne (terén je po 2 m)
export const NAD_TERENOM = 0.12;
export const MIERKA_ASFALTU = 9;   // m na jedno opakovanie textúry asfaltu (svetové súradnice)
const VOLNO_KRIZOVATKY = ROH;      // m – značenie končí tam, kde sa obrubník začína zatáčať (krizovatky-tvar.js)
const VOLNO_PRECHODU = 2.5;        // m – polovica medzery v značení pod zebrou (zebra má 3,5 m)
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
 * @param {Array|null} prechody  body prechodov [[x, z], …] (OSM) – pod zebrou sa značenie preruší
 */
export function vytvorCesty(cesty, vyskopis, krizovatky = null, prechody = null) {
  const asfalt = { poz: [], uv: [], idx: [] };
  const skupiny = new Map();
  // vzdialenosti prechodov od začiatku ich cesty (po osi)
  const zebry = new Map();
  for (const p of polohyPrechodov(prechody, cesty)) {
    if (!zebry.has(p.c)) zebry.set(p.c, []);
    zebry.get(p.c).push(p.s);
  }

  const vozovky = mriezkaVozoviek(cesty);
  const poradie = new Map(cesty.map((c, i) => [c, prednostZnacenia(c) - i * 1e-9]));
  for (const c of cesty) {
    const body = zjemni(c.body, KROK);
    if (body.length < 2) continue;
    pridajPas(asfalt, body, c.sirka / 2, NAD_TERENOM, vyskopis, { svet: true });
    // biela plná čiara pri oboch okrajoch – všetky cesty okrem obslužných (pravidlá ulice)
    const okraje = !DROBNE.has(c.typ);
    const pruhy = c.typ === 'service' || c.typ === 'living_street' ? 1 : Math.max(1, Math.min(6, (c.pruhy ?? 2) | 0));
    const k = `${pruhy}|${!!c.jednosmerka}|${okraje}`;
    if (!skupiny.has(k)) skupiny.set(k, { pruhy, jednosmerka: !!c.jednosmerka, okraje, poz: [], uv: [], idx: [] });
    const s = skupiny.get(k);
    // značenie na tých istých bodoch ako asfalt (rovnaké trojuholníky → nikde nezapadne pod asfalt)
    const rozsahy = bezPrekryvu(rozsahyZnacenia(c.body, body, krizovatky, c.typ, zebry.get(c)), body, c, vozovky, poradie);
    for (const [od, po] of rozsahy) {
      pridajPas(s, body, c.sirka / 2, NAD_TERENOM, vyskopis, { od, po });
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
 * Rozsahy bodov zjemnenej osi `jemne` (tie isté body ako asfalt), na ktorých sa kreslí značenie: bez kruhu
 * križovatky (polomer + VOLNO_KRIZOVATKY). Pri vjazde obslužnej cesty (DROBNE) značenie hlavnej cesty pokračuje,
 * značenie obslužnej cesty končí vždy. Pod zebrami (zebry = vzdialenosti prechodov po osi) sa preruší tiež.
 * Vráti [[od, po], …] (indexy do `jemne`, vrátane).
 */
export function rozsahyZnacenia(body, jemne, krizovatky, typ = '', zebry = null) {
  const n = jemne.length;
  if (n < 2) return [];
  // rezy v dĺžke po osi (zjemnenie dĺžku nemení)
  const rezy = (zebry ?? []).map((s) => [s - VOLNO_PRECHODU, s + VOLNO_PRECHODU]);
  let s = 0;
  body.forEach(([x, z], i) => {
    if (i) s += Math.hypot(x - body[i - 1][0], z - body[i - 1][1]);
    const k = krizovatky?.get(kluc(x, z));
    if (!k) return;
    // hlavné cesty v uzle okrem tejto (typy obsahujú aj ju samu – raz)
    const hlavne = (k.typy ?? []).filter((t) => !DROBNE.has(t)).length - (DROBNE.has(typ) ? 0 : 1);
    if (DROBNE.has(typ) || hlavne > 0 || !k.typy) rezy.push([s - k.polomer - VOLNO_KRIZOVATKY, s + k.polomer + VOLNO_KRIZOVATKY]);
  });
  if (!rezy.length) return [[0, n - 1]];
  const out = [];
  let t = 0, od = -1;
  for (let i = 0; i < n; i++) {
    if (i) t += Math.hypot(jemne[i][0] - jemne[i - 1][0], jemne[i][1] - jemne[i - 1][1]);
    const vReze = rezy.some(([a, b]) => t > a && t < b);
    if (!vReze && od < 0) od = i;
    if ((vReze || i === n - 1) && od >= 0) {
      const po = vReze ? i - 1 : i;
      if (po > od) out.push([od, po]);
      od = -1;
    }
  }
  return out;
}

// poradie dôležitosti ciest pre značenie (vyššie = jeho čiary platia, keď sa vozovky prekrývajú)
const DOLEZITOST = {
  motorway: 10, trunk: 9, primary: 8, secondary: 7, tertiary: 6, motorway_link: 5.6, trunk_link: 5.4,
  primary_link: 5.2, secondary_link: 5, tertiary_link: 4.8, unclassified: 4, residential: 4,
};
/** Dôležitosť cesty pre značenie: trieda, potom šírka a počet pruhov. */
export function prednostZnacenia(c) {
  return (DOLEZITOST[c.typ] ?? 1) + Math.min(30, c.sirka ?? 0) * 0.01 + Math.min(9, c.pruhy ?? 0) * 0.001;
}

/**
 * Z rozsahov značenia cesty `c` vyhodí rady (body zjemnenej osi `jemne`), ktorých stred leží na vozovke
 * dôležitejšej cesty (vozovky = mriezkaVozoviek, poradie = Map cesta → dôležitosť). Rady hneď pri konci úseku
 * inej cesty sa nerátajú (vozovky.vsetky – len kolmý priemet), takže pokračovanie cesty sa nepreruší.
 */
export function bezPrekryvu(rozsahy, jemne, c, vozovky, poradie) {
  if (!vozovky || DROBNE.has(c.typ)) return rozsahy;
  const moja = poradie.get(c) ?? 0;
  const prekryty = (i) => {
    for (const d of vozovky.vsetky(jemne[i][0], jemne[i][1], 0.3)) {
      if (d !== c && !DROBNE.has(d.typ) && (poradie.get(d) ?? 0) > moja) return true;
    }
    return false;
  };
  const out = [];
  for (const [od, po] of rozsahy) {
    let a = -1;
    for (let i = od; i <= po; i++) {
      const ok = !prekryty(i);
      if (ok && a < 0) a = i;
      if ((!ok || i === po) && a >= 0) {
        const b = ok ? i : i - 1;
        if (b > a) out.push([a, b]);
        a = -1;
      }
    }
  }
  return out;
}

/**
 * Pridá pás (cestu) do spoločnej geometrie. Normála vždy nahor.
 * V priečnom smere má pás 3 rady vrcholov (okraj – stred – okraj), aby terén v strede širokej cesty
 * nepresvital cez vozovku. V zákrute sa okraj posunie po osi uhla (pokos) – cesta sa nezúži –
 * a vnútorný okraj ostrej zákruty sa nevracia späť: ak by sa niektorý trojuholník medzi dvoma radmi prevrátil
 * (normála nadol – krátke úseky v pravouhlej zákrute), okraj ostane na predošlom bode (pás sa neprekrúti).
 * Vo vlásenke (zákruta nad ~100°) je namiesto pokosu vejár radov okolo vrcholu – zaoblený spoj.
 * svet = UV vo svetových súradniciach (asfalt), inak U naprieč (0..1) a V pozdĺž cesty (značenie).
 * od, po = pridajú sa len rady bodov od…po (vrátane); tvar sa počíta z celej osi, takže sedí na asfalt.
 */
export function pridajPas(s, body, pol, posun, vyskopis, { svet = false, dlzkaV = DLZKA_V, od = 0, po = body.length - 1 } = {}) {
  let v = 0;
  let predL = null, predP = null, predC = null;
  let predRad = -1;            // index prvého vrcholu predošlého pridaného radu
  // trojuholník (a, b, c) v rovine xz otočený normálou nadol (rovnaký test ako kontrola cesty-bez-prekrutenia)
  const naruby = (a, b, c) => (b[1] - a[1]) * (c[0] - a[0]) - (b[0] - a[0]) * (c[1] - a[1]) < -1e-9;
  /**
   * Jeden rad okraj L – stred – okraj P. Štvoruholník k predošlému radu sa na každej strane rozdelí tou
   * uhlopriečkou, pri ktorej sa žiadny trojuholník neprevráti; ak taká nie je, okraj sa posunie na prvý bod,
   * pri ktorom je: predošlý okraj, stred, predošlý stred (tam sa trojuholník len zbalí).
   */
  const rad = (L, C, P, pridat) => {
    let volbaL = 'A', volbaP = 'A';
    if (predC) {
      // strana L: A = (L0, L1, C0) + (C0, L1, C1), B = (L0, L1, C1) + (L0, C1, C0)
      const vL = (q) => (!naruby(predL, q, predC) && !naruby(predC, q, C) ? 'A'
        : !naruby(predL, q, C) && !naruby(predL, C, predC) ? 'B' : null);
      // strana P: A = (C0, C1, P0) + (P0, C1, P1), B = (C0, C1, P1) + (C0, P1, P0)
      const vP = (q) => (!naruby(predC, C, predP) && !naruby(predP, C, q) ? 'A'
        : !naruby(predC, C, q) && !naruby(predC, q, predP) ? 'B' : null);
      if (!vL(L)) L = [predL, C, predC].find((q) => vL(q)) ?? predC;
      if (!vP(P)) P = [predP, C, predC].find((q) => vP(q)) ?? C;
      volbaL = vL(L) ?? 'A';
      volbaP = vP(P) ?? 'A';
    }
    predL = L; predP = P; predC = C;
    if (!pridat) return;
    const a = s.poz.length / 3;
    s.poz.push(L[0], vyskopis.vyska(L[0], L[1]) + posun, L[1]);
    s.poz.push(C[0], vyskopis.vyska(C[0], C[1]) + posun, C[1]);
    s.poz.push(P[0], vyskopis.vyska(P[0], P[1]) + posun, P[1]);
    if (svet) {
      const m = MIERKA_ASFALTU;
      s.uv.push(L[0] / m, L[1] / m, C[0] / m, C[1] / m, P[0] / m, P[1] / m);
    } else {
      s.uv.push(0, v, 0.5, v, 1, v);
    }
    if (predRad >= 0) {
      const b = predRad;
      // poradie vrcholov tak, aby normála smerovala nahor (okraj L – stred, stred – okraj P)
      if (volbaL === 'A') s.idx.push(b, a, b + 1, b + 1, a, a + 1);
      else s.idx.push(b, a, a + 1, b, a + 1, b + 1);
      if (volbaP === 'A') s.idx.push(b + 1, a + 1, b + 2, b + 2, a + 1, a + 2);
      else s.idx.push(b + 1, a + 1, a + 2, b + 1, a + 2, b + 2);
    }
    predRad = a;
  };
  for (let i = 0; i <= po; i++) {
    const [x, z] = body[i];
    const prev = body[Math.max(0, i - 1)], next = body[Math.min(body.length - 1, i + 1)];
    // smery úsekov pred a za bodom
    let ax = x - prev[0], az = z - prev[1], bx = next[0] - x, bz = next[1] - z;
    const la = Math.hypot(ax, az), lb = Math.hypot(bx, bz);
    // najprv jednotkové smery, až potom náhrada chýbajúceho (v prvom bode sa predtým dosadil nenormovaný smer
    // a pás sa na začiatku každej cesty zúžil – šikmé čiary a cyklopruhy krížom cez cestu)
    if (la >= 1e-6) { ax /= la; az /= la; }
    if (lb >= 1e-6) { bx /= lb; bz /= lb; }
    if (la < 1e-6) { ax = bx; az = bz; }
    if (lb < 1e-6) { bx = ax; bz = az; }
    if (la < 1e-6 && lb < 1e-6) { ax = bx = 1; az = bz = 0; }
    if (i > 0) v += Math.hypot(x - body[i - 1][0], z - body[i - 1][1]) / dlzkaV;
    const pridat = i >= od;
    // vlásenka (zákruta ostrejšia ako ~100°): namiesto pokosu vejár radov okolo vrcholu (zaoblený spoj);
    // vnútorná strana sa testom prevrátenia zbalí do jedného bodu
    if (la > 1e-6 && lb > 1e-6 && ax * bx + az * bz < -0.2) {
      const t0 = Math.atan2(az, ax);
      let dt = Math.atan2(bz, bx) - t0;
      while (dt > Math.PI) dt -= 2 * Math.PI;
      while (dt < -Math.PI) dt += 2 * Math.PI;
      const K = Math.max(2, Math.ceil(Math.abs(dt) / (Math.PI / 8)));
      for (let k = 0; k <= K; k++) {
        const t = t0 + (dt * k) / K, nx = -Math.sin(t), nz = Math.cos(t);
        rad([x + nx * pol, z + nz * pol], [x, z], [x - nx * pol, z - nz * pol], pridat);
      }
      continue;
    }
    // normála ako os uhla, dĺžka pokosu najviac 2× šírka
    let nx = -(az + bz), nz = ax + bx;
    const ln = Math.hypot(nx, nz) || 1;
    nx /= ln; nz /= ln;
    const kos = Math.max(0.5, nx * -az + nz * ax);
    const o = pol / kos;
    const dx = ax + bx, dz = az + bz;
    let L = [x + nx * o, z + nz * o], P = [x - nx * o, z - nz * o];
    // vnútorný okraj ostrej zákruty: ak by šiel proti smeru cesty, ostane na predošlom bode
    if (predL && (L[0] - predL[0]) * dx + (L[1] - predL[1]) * dz < 0) L = predL;
    if (predP && (P[0] - predP[0]) * dx + (P[1] - predP[1]) * dz < 0) P = predP;
    rad(L, [x, z], P, pridat);
  }
}

/** Rozdelí dlhé úseky na kratšie; zdvojené body (úsek kratší ako 1 cm, napr. na hrane dlaždice) vynechá. */
export function zjemni(body, krok) {
  const out = [];
  for (let i = 0; i < body.length - 1; i++) {
    const [ax, az] = body[i], [bx, bz] = body[i + 1];
    const d = Math.hypot(bx - ax, bz - az);
    if (d < 0.01) continue;
    const n = Math.max(1, Math.ceil(d / krok));
    for (let k = 0; k < n; k++) out.push([ax + ((bx - ax) * k) / n, az + ((bz - az) * k) / n]);
  }
  if (body.length) out.push(body[body.length - 1]);
  return out;
}
