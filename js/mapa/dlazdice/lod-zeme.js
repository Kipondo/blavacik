// Úrovne detailu podrobných dlaždíc podľa vzdialenosti od hráča (#110): zem dlaždice prepína medzi sieťou 2 m,
// 4 m a 10 m (indexy pripravené v js/mapa/teren/zem-dlazdica.js) a drobnosti, ktoré zďaleka nevidno
// (obrubníky chodníkov v zeleni, hroby; nad 300 m aj vikiere a komíny), sa ďaleko nekreslia. Volá ho správca dlaždíc
// raz za ~0,25 s.

export const HRANICE_LOD = [220, 520];   // m od hráča k okraju dlaždice: do 220 m sieť 2 m, do 520 m 4 m, ďalej 10 m
const DROBNOSTI = ['obrubniky-chodnikov', 'hroby'];
const DOSAH_DROBNOSTI = 220;
// vikiere a komíny striech: zďaleka menšie ako pár bodov obrazovky, nad 300 m sa nekreslia
const STRESNE = ['vikiere', 'kominy'];
const DOSAH_STRESNYCH = 300;

/** Nastaví úroveň detailu jednej dlaždice (objekt = skupina dlaždice, vzd = vzdialenosť hráča od jej okraja). */
export function nastavLodDlazdice(objekt, vzd) {
  const ud = objekt.userData;
  if (!ud.lodZem) {
    ud.lodZem = objekt.getObjectByName('zem') ?? null;
    ud.lodDrobnosti = DROBNOSTI.map((m) => objekt.getObjectByName(m)).filter(Boolean);
    ud.lodStresne = [];
    objekt.traverse((o) => { if (STRESNE.includes(o.name)) ud.lodStresne.push(o); });
  }
  const zem = ud.lodZem;
  const lod = zem?.userData.lodIndexy;
  if (lod) {
    const u = vzd < HRANICE_LOD[0] ? 0 : vzd < HRANICE_LOD[1] ? 1 : 2;
    if (u !== zem.userData.lod && lod[u]) {
      zem.geometry.setIndex(lod[u]);
      zem.userData.lod = u;
    }
  }
  const blizko = vzd < DOSAH_DROBNOSTI;
  for (const o of ud.lodDrobnosti) o.visible = blizko;
  const strechy = vzd < DOSAH_STRESNYCH;
  for (const o of ud.lodStresne) o.visible = strechy;
}
