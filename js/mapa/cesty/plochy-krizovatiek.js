// Plochy križovatiek – asfalt presne medzi okrajmi ciest, ktoré sa v križovatke stretajú, s oblými rohmi
// (tvar z js/mapa/cesty/krizovatky-tvar.js, pravidlá ulice #136). Predtým to bol kruh, ktorý presahoval cez okraje
// ciest do chodníkov a trávy. Plochy majú ten istý materiál, textúru vo svetových súradniciach a výšku ako cesty
// (js/mapa/cesty/cesty.js), takže prekrytie s pásmi ciest nevidno a nič nebliká. Značenie ciest pri križovatke končí
// v tej istej vzdialenosti ako tvar (cesty.js, rozsahyZnacenia).

import * as THREE from 'three';
import { materialAsfaltu, NAD_TERENOM, MIERKA_ASFALTU } from './cesty.js';
import { tvarKrizovatky, tvarSpoja, spojeCiest } from './krizovatky-tvar.js';

const SEGMENTY = 16;

/** Obrys križovatky [[x, z], …] okolo uzla – tvar z ramien ciest, inak (čudná geometria) kruh. */
function obrysKrizovatky(k, cesty) {
  const tvar = !cesty ? null : k.spoj ? tvarSpoja(k, cesty) : tvarKrizovatky(k, cesty);
  if (tvar?.obrys.length >= 3) return tvar.obrys;
  if (!(k.polomer >= 2)) return null;
  const out = [];
  for (let i = 0; i < SEGMENTY; i++) {
    const u = (i / SEGMENTY) * Math.PI * 2;
    out.push([k.x + Math.cos(u) * k.polomer, k.z + Math.sin(u) * k.polomer]);
  }
  return out;
}

/** cesty = pole, na ktoré ukazujú k.cesty[].ci (to isté, z ktorého najdiKrizovatky našla križovatky). */
export function vytvorPlochyKrizovatiek(krizovatky, vyskopis, cesty = null) {
  const poz = [], uv = [], idx = [];
  const m = MIERKA_ASFALTU;
  const vrchol = (x, z) => {
    poz.push(x, vyskopis.vyska(x, z) + NAD_TERENOM, z);
    uv.push(x / m, z / m);
    return poz.length / 3 - 1;
  };
  // križovatky a spoje ciest so zlomom (oblý spoj na vonkajšej strane ohybu)
  const uzly = [...krizovatky.values(), ...(cesty ? spojeCiest(cesty, krizovatky) : [])];
  for (const k of uzly) {
    const obrys = obrysKrizovatky(k, cesty);
    if (!obrys) continue;
    // stred, vnútorný kruh v polovici (terén v strede veľkej križovatky) a obrys; obrys ide v smere uhlov
    const s = vrchol(k.x, k.z);
    const n = obrys.length;
    const vnut = obrys.map(([x, z]) => vrchol((k.x + x) / 2, (k.z + z) / 2));
    const von = obrys.map(([x, z]) => vrchol(x, z));
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      // (stred, j, i) – normála nahor
      idx.push(s, vnut[j], vnut[i]);
      idx.push(vnut[i], von[j], von[i]);
      idx.push(vnut[i], vnut[j], von[j]);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(poz, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  const mesh = new THREE.Mesh(geo, materialAsfaltu());
  mesh.receiveShadow = true;
  mesh.name = 'krizovatky';
  return mesh;
}
