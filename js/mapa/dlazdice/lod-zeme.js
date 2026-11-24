// Úrovne detailu podrobných dlaždíc podľa vzdialenosti od hráča (#110): zem dlaždice má po blokoch 100 m sieť
// 2 m, 4 m alebo 10 m (kúsky indexu pripravené v js/mapa/teren/zem-dlazdica.js) a drobnosti, ktoré zďaleka nevidno
// (obrubníky, značky, lavičky…; nad 300 m aj semafory, vikiere a komíny), sa ďaleko nekreslia. Volá ho správca
// dlaždíc raz za ~0,25 s.

export const HRANICE_LOD = [100, 320];   // m od hráča k bloku zeme: do 100 m sieť 2 m, do 320 m 4 m, ďalej 10 m
// skupiny dlaždice, ktoré sa ďaleko nekreslia: [meno, dosah v m k okraju dlaždice]
//   – obrubníky chodníkov v zeleni, hroby, dopravné značky, tabule ulíc, lavičky a trolejové vedenie zďaleka
//     nevidno (menej ako pár bodov obrazovky – len by blikali) a každý druh je samostatné volanie kreslenia (#110),
//   – semafory, vodorovné značenie ciest (jedna sieť na druh čiar – v dlaždici 5–9 volaní; čiary 15 cm sú
//     za 300 m užšie ako bod a len by blikali), vikiere a komíny striech do 300 m
// (lampy ostávajú – v noci svietia)
const DOSAHY = [
  ['obrubniky-chodnikov', 220], ['hroby', 220], ['znacky', 220], ['tabule-ulic', 220], ['lavicky', 220], ['trakcia', 220],
  ['semafory', 300], ['znacenie', 300], ['vikiere', 300], ['kominy', 300],
];

/**
 * Nastaví úroveň detailu jednej dlaždice (objekt = skupina dlaždice, vzd = vzdialenosť hráča od jej okraja,
 * x, z = poloha hráča). Objekty s userData.podlaKamery(x, z) si detail rozdelia samy (vikiere – blízke podrobné).
 */
export function nastavLodDlazdice(objekt, vzd, x = 0, z = 0) {
  const ud = objekt.userData;
  if (ud.lodZem === undefined) {
    ud.lodZem = objekt.getObjectByName('zem') ?? null;
    // skupiny sa môžu do dlaždice pridať aj neskôr (trolejové vedenie – js/mapa/trakcia/modul.js)
    ud.lodSkupiny = null;
  }
  if (!ud.lodSkupiny || ud.lodPocet !== objekt.children.length) {
    ud.lodPocet = objekt.children.length;
    ud.lodSkupiny = [];
    ud.lodKamera = [];
    objekt.traverse((o) => {
      const d = DOSAHY.find(([meno]) => meno === o.name);
      if (d) ud.lodSkupiny.push([o, d[1]]);
      if (o.userData.podlaKamery) ud.lodKamera.push(o);
    });
  }
  const lb = ud.lodZem?.userData.lodBloky;
  if (lb) {
    // úroveň každého bloku zeme podľa vzdialenosti hráča od bloku; index sa poskladá len pri zmene
    let zmena = false;
    for (let bj = 0; bj < lb.nb; bj++) {
      const dz = Math.max(lb.z[bj] - z, 0, z - lb.z[bj + 1]);
      for (let bi = 0; bi < lb.nb; bi++) {
        const dx = Math.max(lb.x[bi] - x, 0, x - lb.x[bi + 1]);
        const d = Math.hypot(dx, dz);
        const u = d < HRANICE_LOD[0] ? 0 : d < HRANICE_LOD[1] ? 1 : 2;
        if (lb.urovne[bj * lb.nb + bi] !== u) { lb.urovne[bj * lb.nb + bi] = u; zmena = true; }
      }
    }
    if (zmena) lb.zostav();
  }
  for (const [o, dosah] of ud.lodSkupiny) o.visible = vzd < dosah;
  for (const o of ud.lodKamera) if (o.visible) o.userData.podlaKamery(x, z);
}
