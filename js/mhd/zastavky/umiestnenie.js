// Kde presne stojí zastávka: bod na ceste/koľaji (z trasovania), smer jazdy a strana.
// V Bratislave sa jazdí vpravo → prístrešok je napravo od smeru jazdy, otvorený k ceste.

const MIN_ODSTUP = 3.2;  // m od osi cesty
const MAX_ODSTUP = 14;
const PREDVOLENY = 4.8;

/** Vráti { x, z, uhol } – poloha prístrešku a otočenie (rad, okolo osi y; lokálne +z k ceste). */
export function umiestnenie(nast) {
  const [bx, bz] = nast.bod ?? [nast.x, nast.z];
  const [dx, dz] = nast.smer ?? [1, 0];
  const px = -dz, pz = dx; // pravá strana smeru jazdy
  // Bočný odstup podľa skutočnej polohy nástupišťa z GTFS (ak dáva zmysel)
  const bocne = (nast.x - bx) * px + (nast.z - bz) * pz;
  const odstup = bocne >= MIN_ODSTUP && bocne <= MAX_ODSTUP ? bocne : PREDVOLENY;
  const pozdlz = (nast.x - bx) * dx + (nast.z - bz) * dz;
  const posun = Math.abs(pozdlz) < 25 ? pozdlz : 0;
  return {
    x: bx + px * odstup + dx * posun,
    z: bz + pz * odstup + dz * posun,
    // lokálne +z (otvorená strana) má mieriť k ceste, t. j. proti pravej normále
    uhol: Math.atan2(-px, -pz),
    smer: [dx, dz],
  };
}
