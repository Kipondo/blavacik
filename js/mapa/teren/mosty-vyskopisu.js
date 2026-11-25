// Výška mostovky veľkých mostov cez rieky (Dunaj, Malý Dunaj…) pre výškopis mesta (js/mapa/teren/vyska-mesto.js).
//
// Most je úsečka od → do (data/mapa/mesto/index.json) alebo lomená os (most v oblúku) so šírkou. Výška mostovky:
//   – most s profilom (data/mapa/mosty-dunaj.json, tools/mesto/mosty-dunaj.mjs): mostovka podľa skutočnosti po celej
//     dĺžke aj s estakádami na brehoch – riadiace body [s, y, naZemi], medzi nimi plynulá krivka; bod „naZemi“
//     berie výšku terénu (koniec mosta na opore alebo násype), y je len odhad pre model z Blendera,
//   – most bez profilu (malé mosty): o m.vyska nad vyšším koncom, na koncoch nábeh m.nabeh metrov k terénu.
//
// Kto sa pýta bez výšky y (veci položené na povrch – cesty bez mosta, lampy, stromy, chodci pri vzniku), dostane
// mostovku len nad riekou a tam, kde mostovka leží tesne nad terénom (násyp, rampa). Pod estakádou na brehu je zem –
// cesty, chodníky a parkoviská pod mostom ostanú dole. Cesty na moste (OSM bridge=*) sa pýtajú s y nad mostom.

import { vytvorOs, bodNaOsi, najblizsiNaOsi } from '../mosty/os-mosta.js';

const plynulo = (t) => t * t * (3 - 2 * t);
const OKRAJ_RAMPY = 1.5;   // m – šírka plynulého prechodu na bočnom okraji nájazdu
const NAD_ZEMOU = 3.5;     // m – mostovka vyššie nad terénom je pre veci na povrchu „strecha“, nie zem
const POD_MOSTOM = 3;      // m – kto je o toľko pod mostovkou, ide popod most

/**
 * @param {Array} zoznam   mosty z index.json (už zlúčené s data/mapa/mosty-dunaj.json)
 * @param {{ vyskaTerenu: Function, jeVRieke: Function }} zdroj
 */
export function vytvorMostyVyskopisu(zoznam, { vyskaTerenu, jeVRieke }) {
  const mosty = (zoznam ?? []).map((m) => {
    // os: lomená čiara (most v oblúku, data/mapa/mosty-dunaj.json „os“) alebo úsečka od → do
    const os = vytvorOs(m.os?.length >= 2 ? m.os : [m.od, m.do]);
    const [ax, az] = os.body[0], [bx, bz] = os.body.at(-1);
    const dlzka = os.dlzka;
    const p = { ...m, os, ax, az, bx, bz, dlzka, ux: (bx - ax) / dlzka, uz: (bz - az) / dlzka, polSirka2: (m.sirka / 2) ** 2, nabeh: m.nabeh ?? 30 };
    p.hA = vyskaTerenu(ax, az);
    p.hB = vyskaTerenu(bx, bz);
    if (m.profil?.length >= 2) {
      p.body = m.profil.map(([s, y, naZemi]) => {
        const b = bodNaOsi(os, s);
        return { s, y, naZemi: !!naZemi, x: b.x, z: b.z };
      });
      p.vrch = m.vrch ?? Math.max(...p.body.map((b) => b.y));
    } else {
      // mostovka je o m.vyska nad vyšším koncom
      p.vrch = Math.max(p.hA, p.hB) + (m.vyska ?? 4);
    }
    const r = m.sirka, o = os.ohr;
    p.ohr = { minX: o.minX - r, maxX: o.maxX + r, minZ: o.minZ - r, maxZ: o.maxZ + r };
    return p;
  });

  /** Poloha bodu voči osi mosta: { s, d2 } – s orezané na most; null, ak je bod za koncom. */
  function naOsi(m, x, z) {
    const n = najblizsiNaOsi(m.os, x, z);
    if (n.s < -0.01 || n.s > m.dlzka + 0.01) {
      // za koncom mosta: vzdialenosť ku koncovému bodu (ako pri úsečke – orezané)
      const [ex, ez] = n.s < 0 ? m.os.body[0] : m.os.body.at(-1);
      return { s: n.s < 0 ? 0 : m.dlzka, d2: (x - ex) ** 2 + (z - ez) ** 2 };
    }
    return n;
  }

  /** Rampa medzi múrmi (data/mapa/mosty-dunaj.json „nasypy“) – laser pod ňou ukazuje zem, ale priestor tam nie je. */
  const vNasype = (m, s) => !!m.nasypy?.some(([a, b]) => s >= a && s <= b);

  /** Výška riadiaceho bodu profilu (bod na zemi sa pýta terénu – detailný terén sa načítava postupne). */
  const yBodu = (b) => (b.naZemi ? vyskaTerenu(b.x, b.z) : b.y);

  /** Výška mostovky v polohe s pozdĺž osi – kubická krivka cez riadiace body (bez prekmitov). */
  function vyskaProfilu(m, s) {
    const B = m.body, n = B.length;
    if (s <= B[0].s) return yBodu(B[0]);
    if (s >= B[n - 1].s) return yBodu(B[n - 1]);
    let k = 0;
    while (k < n - 2 && s > B[k + 1].s) k++;
    const P = [Math.max(0, k - 1), k, k + 1, Math.min(n - 1, k + 2)].map((i) => B[i]);
    const y = P.map(yBodu);
    const h = P[2].s - P[1].s;
    const d = (P[2].s > P[1].s) ? (y[2] - y[1]) / h : 0;
    // dotyčnice (Fritsch–Carlson): na zlome sklonu priemer, pri zmene smeru 0 – krivka neprekmitne nad body
    const dotycnica = (ya, yb, yc, sa, sb, sc) => {
      const d0 = sb > sa ? (yb - ya) / (sb - sa) : 0, d1 = sc > sb ? (yc - yb) / (sc - sb) : 0;
      if (d0 * d1 <= 0) return 0;
      return (2 * d0 * d1) / (d0 + d1);
    };
    let t1 = P[0] === P[1] ? d : dotycnica(y[0], y[1], y[2], P[0].s, P[1].s, P[2].s);
    let t2 = P[3] === P[2] ? d : dotycnica(y[1], y[2], y[3], P[1].s, P[2].s, P[3].s);
    // pri bode na zemi (koniec mosta) plynulý dosad – nulová dotyčnica nedovolí „hrb“ nad terénom
    if (P[1].naZemi && P[0] === P[1]) t1 = d;
    if (P[2].naZemi && P[3] === P[2]) t2 = d;
    const t = (s - P[1].s) / h, t2_ = t * t, t3 = t2_ * t;
    return (2 * t3 - 3 * t2_ + 1) * y[1] + (t3 - 2 * t2_ + t) * h * t1 + (-2 * t3 + 3 * t2_) * y[2] + (t3 - t2_) * h * t2;
  }

  /** Výška mostovky na osi v polohe s (metre od „od“). */
  function vyskaNaOsi(m, s) {
    if (m.body) return vyskaProfilu(m, s);
    const odKonca = Math.min(s, m.dlzka - s);
    const hKonca = s < m.dlzka / 2 ? m.hA : m.hB;
    return odKonca >= m.nabeh ? m.vrch : hKonca + (m.vrch - hKonca) * plynulo(odKonca / m.nabeh);
  }

  /**
   * Mostovka pod bodom bez ohľadu na výšku: { m, h, s, okraj } alebo null. rezerva = širší pás (napojenie rámp),
   * druh = len mosty daného druhu ('kolaj' – vlak pod Prístavným mostom ide po trati, nie po diaľnici nad ním).
   */
  function mostovka(x, z, rezerva = 0, druh = null) {
    for (const m of mosty) {
      if (druh && m.druh !== druh) continue;
      if (x < m.ohr.minX - rezerva || x > m.ohr.maxX + rezerva || z < m.ohr.minZ - rezerva || z > m.ohr.maxZ + rezerva) continue;
      const n = naOsi(m, x, z);
      const pol = m.sirka / 2 + rezerva;
      if (n.d2 > pol * pol) continue;
      const s = n.s;
      const okraj = m.sirka / 2 - Math.sqrt(n.d2);
      return { m, s, h: okrajRampy(vyskaNaOsi(m, s), okraj, x, z), okraj };
    }
    return null;
  }

  /** Na okraji nájazdovej rampy (mostovka tesne nad terénom) sa výška do strán plynulo zlieva s terénom. */
  function okrajRampy(h, okraj, x, z) {
    if (okraj >= OKRAJ_RAMPY) return h;
    const t = vyskaTerenu(x, z);
    return h - t < 1.5 ? t + (h - t) * plynulo(Math.max(0, okraj) / OKRAJ_RAMPY) : h;
  }

  // y = výška objektu (auto, chodec): kto je hlboko pod mostovkou (cesta popod most), ide po teréne.
  // Na okraji nájazdovej rampy (mostovka tesne nad terénom) sa výška do strán plynulo zlieva s terénom,
  // aby auto pri vjazde z boku neskočilo o pol metra (issue #54).
  function vyskaMostu(x, z, y) {
    for (const m of mosty) {
      if (x < m.ohr.minX || x > m.ohr.maxX || z < m.ohr.minZ || z > m.ohr.maxZ) continue;
      const n = naOsi(m, x, z);
      if (n.d2 > m.polSirka2) continue;
      const s = n.s;
      let h = vyskaNaOsi(m, s);
      if (y === undefined || y === null) {
        // vec na povrchu: pod estakádou na brehu je zem (nad riekou a na násype mostovka)
        if (m.body && h - vyskaTerenu(x, z) > NAD_ZEMOU && !jeVRieke(x, z) && !vNasype(m, s)) continue;
      } else if (y < h - POD_MOSTOM) continue;
      return okrajRampy(h, m.sirka / 2 - Math.sqrt(n.d2), x, z);
    }
    return null;
  }

  /** Je bod na pôdoryse niektorého mosta (aj vysoko nad zemou)? – nie je vo vode, aj keď je pod ním rieka. */
  const naPodoryse = (x, z) => mostovka(x, z) !== null;

  return { mosty, vyskaMostu, vyskaNaOsi, mostovka, naPodoryse };
}
