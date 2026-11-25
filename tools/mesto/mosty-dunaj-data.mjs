// Údaje o mostoch cez Dunaj z prieskumu (#mosty) – zdroje a istota v napady/pamiatky-podklady.md, „Mosty cez Dunaj“.
// Spracúva tools/mesto/mosty-dunaj.mjs → data/mapa/mosty-dunaj.json.
//
// s = metre pozdĺž osi mosta od bodu „od“ v data/mapa/mesto/index.json (záporné = za ním), výšky v m n. m. (Bpv).
//   rozsah  – začiatok a koniec mostného objektu (OSM man_made=bridge, úseky ciest s menom mosta)
//   profil  – riadiace body výšky vozovky / temena koľajnice [s, m n. m.]; 'zem' = koniec na násype alebo opore
//             (hra vezme terén z laseru, ten násypy obsahuje)
//   sirka   – šírka mostovky (pôdorys, po ktorom sa chodí a jazdí)
//   piliere – polohy pilierov (s) podľa projektu / OSM

/** Vypuklý zakružovací oblúk nivelety: body [s, výška] po krok metrov. */
function oblukNivelety(sOd, sDo, krok, vyska) {
  const out = [];
  const n = Math.max(1, Math.round(Math.abs(sDo - sOd) / krok));
  for (let i = 0; i <= n; i++) {
    const s = sOd + (sDo - sOd) * i / n;
    out.push([Math.round(s * 10) / 10, Math.round(vyska(s) * 100) / 100]);
  }
  return out;
}

// Starý most (1890, nová oceľová konštrukcia 2016): s_index = 394,7 − staničenie od severnej opory.
// Niveleta R = 5600 m, vrchol ~148,64 m n. m. v staničení ~240, pri oporách 4,16 % (laser: konce 143,5 a 144,1).
const STARY_SEVER = 394.7;
const staryNiveleta = (s) => 148.64 - ((STARY_SEVER - s) - 240) ** 2 / 11200;

export const MOSTY = [
  {
    // Most Apollo (2005): oceľový spojitý nosník 52,5 + 61 + 61 + 63 + 231 (oblúk) + 49 m medzi betónovými estakádami
    // (Petržalka ~110 m, Bratislava 195 m, koniec s 770,7), za ňou ~120 m rampa medzi múrmi do Košickej. Os je v pôdoryse v oblúku
    // (stred medzi oboma jazdnými pásmi z OSM), s od petržalskej opory na sever. Vozovka z laseru DMP: Petržalka 141,4
    // (na násype) → vrchol 150,5 pod oblúkom → 145,6 na konci estakády → Košická ~141 (koniec rampy).
    // Piliere: P6 109, P7 162, P8 223, P9 283 (južný breh), P10 349 (jediný v rieke, južná päta oblúka),
    // P11 585 (ľavý breh, severná päta), P12 634; vrch oblúka 187,8 m n. m. nad s ≈ 465.
    nazov: 'Most Apollo',
    os: [[1563.9, 1138.1], [1558.5, 1127.7], [1553.2, 1117.3], [1547.8, 1106.8], [1542.4, 1096.4], [1537.7, 1086.1], [1533.7, 1075.8], [1529.6, 1065.5], [1525.6, 1055.2], [1521.6, 1044.8], [1517.6, 1034.5], [1514.2, 1024.3], [1511.1, 1014.0], [1508.8, 1003.8], [1506.4, 993.6], [1504.1, 983.5], [1501.9, 973.3], [1500.0, 963.1], [1498.3, 953.0], [1497.0, 942.9], [1495.9, 932.7], [1495.1, 922.7], [1494.4, 912.6], [1494.0, 902.5], [1494.0, 892.5], [1494.2, 882.5], [1494.5, 872.5], [1495.1, 862.5], [1495.7, 852.5], [1496.5, 842.6], [1497.4, 832.6], [1498.4, 822.6], [1499.5, 812.7], [1500.5, 802.8], [1501.7, 792.8], [1502.8, 782.9], [1504.0, 772.9], [1505.3, 763.0], [1506.5, 753.0], [1507.7, 743.1], [1508.9, 733.2], [1510.1, 723.2], [1511.3, 713.3], [1512.5, 703.3], [1513.7, 693.4], [1514.9, 683.5], [1516.1, 673.5], [1517.3, 663.6], [1518.5, 653.6], [1519.7, 643.7], [1520.9, 633.8], [1522.1, 623.8], [1523.4, 613.9], [1524.6, 604.0], [1525.8, 594.0], [1527.0, 584.1], [1528.3, 574.1], [1529.6, 564.2], [1530.9, 554.3], [1532.3, 544.3], [1533.7, 534.4], [1535.1, 524.5], [1536.6, 514.6], [1538.2, 504.7], [1540.0, 494.8], [1542.0, 484.9], [1544.1, 475.0], [1546.2, 465.1], [1548.6, 455.3], [1551.2, 445.4], [1553.9, 435.6], [1556.7, 425.8], [1559.6, 416.0], [1562.5, 406.1], [1565.4, 396.3], [1568.3, 386.5], [1602.4, 271.4]],
    sirka: 32.0,
    profil: [
      [0, 'zem'], [40, 141.6], [80, 143.5], [120, 144.5], [160, 145.4], [200, 146.1], [240, 146.8], [280, 147.5],
      [320, 148.1], [360, 148.8], [400, 149.8], [440, 150.4], [480, 150.5], [520, 150.4], [560, 150.0], [600, 149.3],
      [640, 148.2], [680, 147.5], [720, 147.0], [760, 146.4], [800, 145.3], [830, 144.9], [850, 143.8], [870, 142.9],
      [890.7, 'zem'],
    ],
    piliere: [109, 162, 223, 283, 349, 585, 634],
    // rampa medzi múrmi (laser ju nemá – v DMR je pod ňou zem 139): mostovka je tu povrchom aj pre cesty na nej
    nasypy: [[770.7, 890.7]],
  },
  {
    // Most Lafranconi (1991): dva samostatné predpäté komorové nosníky diaľnice D2, polia 4 × 83 + 172 + 174 + 83 m
    // (s od petržalskej opory na sever), rámová podpera v Dunaji s ≈ 181, severná estakáda ~370 m (s 440 … 812) ponad
    // P+R, Nábrežie arm. gen. L. Svobodu s električkou a FTVŠ. V Petržalke opora hneď za hrádzou (s −323), ďalej násyp.
    // Vozovka z laseru DMP (napady/pamiatky-podklady.md): 150,4 násyp → 151,4 nad hrádzou → vrchol 157,1 nad riečnou
    // podperou → 154,1 nad nábrežím → 152,3 severná opora. Chodníky po oboch stranách 4,7 m pod vozovkou.
    nazov: 'Most Lanfranconi',
    rozsah: [-343, 820],
    sirka: 29.7,
    profil: [
      [-343, 'zem'], [-323, 151.0], [-303, 151.4], [-283, 151.8], [-223, 153.2], [-163, 154.2], [-123, 155.0],
      [-83, 155.4], [-3, 156.3], [37, 156.6], [77, 156.9], [181, 157.1], [237, 157.0], [297, 156.8], [357, 156.4],
      [397, 156.3], [437, 156.0], [477, 155.9], [517, 155.7], [597, 155.3], [677, 154.7], [717, 154.1], [777, 153.1],
      [820, 'zem'],
    ],
    // opora (Petržalka), piliere v inundácii, breh, rieka, breh, prechodová podpera, piliere estakády
    piliere: [-323, -240, -157, -74, 9, 181, 355, 440, 463, 495, 527, 560, 594, 628, 657, 682, 716, 744, 771],
    lavky: { pod: 4.7 },
  },
  {
    // Prístavný most (1985): dvojpodlažný cestno-železničný most – hore diaľnica D1 (~30 m, 2 + 2 pruhy s odstavnými),
    // dole dve koľaje, chodník a cyklotrasa. Oceľový priehradový hlavný most ~461 m (Warren bez zvislíc, ~9,5 m vysoký)
    // + betónové estakády na oboch brehoch, celý komplex D1 ~2,6 km. Tu len priamy úsek s menom mosta (s −107 … 925);
    // estakády ďalej v oblúkoch sú nadjazdy z dlaždíc a na mostovku sa napoja výškou (js/mapa/mosty/nadjazdy.js).
    // Vozovka z laseru DMP: 157,3 → vrchol 159,5 nad riekou → 154,6 na severnom konci úseku.
    nazov: 'Prístavný most',
    rozsah: [-107, 925],
    sirka: 30.0,
    profil: [
      [-107, 157.3], [-40, 157.6], [0, 158.0], [40, 158.2], [80, 158.7], [120, 159.0], [160, 159.2], [200, 159.3],
      [240, 159.5], [320, 159.5], [400, 159.4], [480, 159.2], [520, 158.9], [560, 158.6], [600, 158.5], [640, 158.0],
      [680, 157.7], [720, 157.3], [760, 156.6], [800, 156.1], [840, 155.6], [880, 155.3], [925, 154.6],
    ],
  },
  {
    // Most SNP (1972): oceľový zavesený nosník 74,8 + 303 + 54 m (s ≈ −47 … 389) + betónové estakády na oboch brehoch,
    // spolu 688 m (OSM man_made=bridge 238810163: s −174,7 … 514,1). Sever: estakáda ponad nábrežie a autobusový
    // terminál, končí na Staromestskej (146,9, v záreze – na teréne). Juh: estakáda ponad park, opora pri násype
    // Panónskej cesty (143,5). Mostovka je mierne vzopätá – vrchol 152,2 nad stredom rieky (laser DMP).
    // Pylón s ≈ 334,5, pilier hlavného poľa na nábreží s ≈ 32,4.
    nazov: 'Most SNP',
    // konce posunuté na korunu násypu podľa laseru (pri opore je v DMR jama – podchod pamäti, zárez opory):
    // Staromestská 147,0 na s −200, násyp Panónskej 143,5 na s 528
    rozsah: [-200, 528],
    sirka: 21.0,
    // výška vozovky z laseru DMP (INSPIRE WMS ÚGKK, vzorky po 10 m v jazdných pruhoch, posun WMS − 43,8 m)
    profil: [
      [-200, 'zem'], [-160, 146.8], [-120, 146.6], [-80, 146.8], [-40, 147.5], [0, 148.4], [40, 149.5], [80, 150.5],
      [120, 151.4], [160, 152.1], [200, 152.2], [240, 152.1], [280, 151.7], [320, 151.0], [360, 150.0], [400, 148.6],
      [440, 147.1], [480, 145.5], [528, 'zem'],
    ],
    piliere: [32.4, 334.5, 389.4],
    lavky: { pod: 3.6 },
  },
  {
    nazov: 'Starý most',
    // na severe mostovka pokračuje 15 m po násype rampy k Šafárikovmu nám. (laser má pri opore jamu 142,0 – za ňou 143,0)
    rozsah: [-70.9, 410],
    sirka: 22.0,
    profil: [
      [-70.9, 'zem'],
      ...oblukNivelety(-50, 394.7, 24.6, staryNiveleta),
      [410, 'zem'],
    ],
    // opora 8, P7 (Tyršovo nábrežie), P6 (breh), P5, P34 (rieka), P2 (dolné nábrežie), opora 1
    piliere: [-35.0, 40.4, 116.0, 254.6, 359.9],
  },
];
