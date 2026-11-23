// Procedurálne textúry ciest (#136):
//   – asfalt vo svetových súradniciach (spoločný pre všetky cesty a križovatky – prekrytie nevidno),
//   – priehľadné vodorovné značenie podľa počtu pruhov a smeru: U = naprieč cestou (0..1),
//     V = pozdĺž cesty (1 = DLZKA_V metrov); s čiarami aj stopy kolies a špina pri obrubníku,
//   – zebra priechodov (len biele pruhy, priehľadná).

import * as THREE from 'three';

export const DLZKA_V = 9;  // 3 m čiara + 6 m medzera
const cache = new Map();

/** Asfalt bez značenia, opakuje sa vo svetových súradniciach (UV = x, z / MIERKA_ASFALTU v cesty.js). */
export function texturaAsfaltuSvet() {
  if (cache.has('asfalt')) return cache.get('asfalt');
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = '#4b4c4e';
  g.fillRect(0, 0, 256, 256);
  let seed = 17;
  for (let i = 0; i < 4000; i++) {
    seed = (seed * 16807) % 2147483647;
    const s = 55 + (seed % 40);
    g.fillStyle = `rgba(${s},${s},${s + 3},0.55)`;
    g.fillRect(seed % 256, (seed >> 8) % 256, 1.5, 1.5);
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  cache.set('asfalt', t);
  return t;
}

/**
 * Priehľadná vrstva značenia jednej cesty.
 * @param {number} pruhy  počet jazdných pruhov
 * @param {boolean} jednosmerka
 * @param {boolean} okraje  vodorovné značenie krajníc (hlavné cesty)
 */
export function texturaZnacenia(pruhy = 2, jednosmerka = false, okraje = false) {
  pruhy = Math.max(1, Math.min(6, pruhy | 0));
  const kluc = `znacenie|${pruhy}|${jednosmerka}|${okraje}`;
  if (cache.has(kluc)) return cache.get(kluc);

  const c = document.createElement('canvas');
  c.width = 256; c.height = 256;
  const g = c.getContext('2d');
  const W = c.width, H = c.height;
  // tmavší okraj pri obrubníku (odtokový žľab, špina)
  const kraj = g.createLinearGradient(0, 0, W, 0);
  kraj.addColorStop(0, 'rgba(20,20,20,0.4)');
  kraj.addColorStop(0.06, 'rgba(20,20,20,0)');
  kraj.addColorStop(0.94, 'rgba(20,20,20,0)');
  kraj.addColorStop(1, 'rgba(20,20,20,0.4)');
  g.fillStyle = kraj;
  g.fillRect(0, 0, W, H);
  // stopy kolies: dve tmavšie mäkké stopy v každom pruhu (27 % a 73 % šírky pruhu)
  for (let k = 0; k < pruhy; k++) {
    for (const t of [0.27, 0.73]) {
      const x = ((k + t) / pruhy) * W, r = (0.12 / pruhy) * W;
      const s = g.createLinearGradient(x - r, 0, x + r, 0);
      s.addColorStop(0, 'rgba(15,15,15,0)');
      s.addColorStop(0.5, 'rgba(15,15,15,0.16)');
      s.addColorStop(1, 'rgba(15,15,15,0)');
      g.fillStyle = s;
      g.fillRect(x - r, 0, 2 * r, H);
    }
  }
  // čiary
  g.fillStyle = '#ecebe4';
  const ciara = 4;
  const prerusovana = (x) => { g.fillRect(x - ciara / 2, 0, ciara, H / 3); };
  const plna = (x) => { g.fillRect(x - ciara / 2, 0, ciara, H); };
  if (okraje) { plna(10); plna(W - 10); }
  for (let k = 1; k < pruhy; k++) {
    const x = (k / pruhy) * W;
    const stred = !jednosmerka && k === pruhy / 2;
    if (stred && pruhy >= 4) { plna(x - 4); plna(x + 4); }        // dvojitá plná
    else prerusovana(x);                                          // stredová (2 pruhy) a deliace čiary
  }

  const t = new THREE.CanvasTexture(c);
  t.wrapS = THREE.ClampToEdgeWrapping;
  t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  cache.set(kluc, t);
  return t;
}

/** Zebra – biele pruhy (U = metre naprieč cestou, perióda 1 m), medzi nimi priehľadné – asfalt je pod nimi. */
export function texturaZebry() {
  if (cache.has('zebra')) return cache.get('zebra');
  const c = document.createElement('canvas');
  c.width = 64; c.height = 16;
  const g = c.getContext('2d');
  g.fillStyle = '#efeee8'; g.fillRect(0, 0, 32, 16);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  cache.set('zebra', t);
  return t;
}
