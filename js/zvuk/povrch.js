// Povrch pod hráčom (pre zvuk krokov): tráva alebo dlažba/asfalt – z mapy tried povrchu dlaždice
// (js/mapa/teren/textura-zeme.js: trieda 64 = trávnik, 0 = príroda so zelenou farbou pokrývky).

export function povrchPod(hra, x, z) {
  const sprava = hra.mapa?.dlazdice;
  if (!sprava?.aktivne) return 'dlazba';
  const v = sprava.velkost, i = Math.floor(x / v), j = Math.floor(z / v);
  const a = sprava.aktivne.get(`${i}_${j}`);
  if (!a || a.uroven !== 'detail') return 'dlazba';
  let zem = null;
  a.objekt.traverse((o) => { if (!zem && o.name === 'zem') zem = o; });
  const triedy = zem?.material?.userData?.triedy?.image, farba = zem?.material?.map?.image;
  if (!triedy?.getContext) return 'dlazba';
  const px = Math.min(triedy.width - 1, Math.floor(((x - i * v) / v) * triedy.width));
  const pz = Math.min(triedy.height - 1, Math.floor(((z - j * v) / v) * triedy.height));
  try {
    const r = triedy.getContext('2d').getImageData(px, pz, 1, 1).data[0];
    if (Math.abs(r - 64) < 12) return 'trava';
    if (r < 8 && farba?.getContext) {
      const qx = Math.floor((px / triedy.width) * farba.width), qz = Math.floor((pz / triedy.height) * farba.height);
      const f = farba.getContext('2d').getImageData(qx, qz, 1, 1).data;
      if (f[1] - f[0] > 14) return 'trava';
    }
  } catch { /* plátno nemusí byť čitateľné */ }
  return 'dlazba';
}
