// Príprava hotovej dlaždice pre grafickú kartu ešte predtým, než sa ukáže:
//   1) shadery jej materiálov sa preložia na pozadí (renderer.compileAsync – ak to prehliadač vie,
//      paralelne mimo hlavného vlákna),
//   2) veľké textúry (zem: pokrývka a mapa tried, 1024 × 1024) sa nahrajú na kartu po jednej v samostatných
//      snímkach.
// Bez toho by sa všetko robilo pri prvom kreslení dlaždice naraz a hra by na chvíľu zamrzla.

const dalsiSnimok = () => new Promise((r) => requestAnimationFrame(() => r()));

export async function pripravNaKreslenie(renderer, objekt, kamera, scena) {
  if (renderer.compileAsync) await renderer.compileAsync(objekt, kamera, scena);
  const textury = new Set();
  objekt.traverse((o) => {
    if (o.name !== 'zem' || !o.material) return;
    for (const t of [o.material.map, o.material.userData?.triedy]) if (t?.isTexture) textury.add(t);
  });
  for (const t of textury) {
    await dalsiSnimok();
    renderer.initTexture(t);
  }
}
