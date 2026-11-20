// Dav: úrovne detailu (LOD) pre veľa chodcov naraz.
// Každý snímok zoradí chodcov podľa vzdialenosti od kamery a pridelí im úroveň v rámci limitov:
//   najbližší → plný model (LOD0, max. maxBlizko), ďalší → zlúčená sieť (LOD1, max. maxStredne),
//   ďaleko → hrubá sieť (LOD2, animuje sa len každý n-tý snímok), mimo pohľadu alebo za hranicou → nič.
// Pohyb chodcov rieši ten, kto ich vlastní (nastaví npc.koren.position/rotation a npc.rychlost).

import * as THREE from 'three';

const PREDVOLENE = { blizko: 14, stredne: 45, daleko: 140, maxBlizko: 8, maxStredne: 40, animaciaDaleko: 3 };
const HYSTEREZA = 1.12; // chodec si úroveň drží o 12 % ďalej, aby pri hranici neblikal

export class Dav {
  constructor(nastavenia = {}) {
    this.n = { ...PREDVOLENE, ...nastavenia };
    this.clenovia = [];
    this.snimok = 0;
    this.statistika = { lod0: 0, lod1: 0, lod2: 0, skryte: 0 };
    this._frustum = new THREE.Frustum();
    this._matica = new THREE.Matrix4();
    this._gula = new THREE.Sphere(new THREE.Vector3(), 1.2);
  }

  pridaj(npc) {
    npc._dt = 0;
    npc._faza = this.clenovia.length;
    this.clenovia.push(npc);
    return npc;
  }

  odober(npc) {
    const i = this.clenovia.indexOf(npc);
    if (i >= 0) this.clenovia.splice(i, 1);
  }

  update(dt, kamera) {
    const n = this.n;
    this.snimok++;
    kamera.updateMatrixWorld();
    this._matica.multiplyMatrices(kamera.projectionMatrix, kamera.matrixWorldInverse);
    this._frustum.setFromProjectionMatrix(this._matica);
    const kp = kamera.getWorldPosition(this._gula.center.clone());

    for (const c of this.clenovia) {
      c.koren.updateMatrixWorld();
      this._gula.center.setFromMatrixPosition(c.koren.matrixWorld);
      this._gula.center.y += 0.9 * c.koren.scale.y;
      c._d = this._gula.center.distanceTo(kp);
      c._vidno = this._frustum.intersectsSphere(this._gula);
    }
    const poradie = this.clenovia.slice().sort((a, b) => a._d - b._d);

    let n0 = 0, n1 = 0;
    const st = this.statistika;
    st.lod0 = st.lod1 = st.lod2 = st.skryte = 0;
    for (const c of poradie) {
      const h = (uroven) => (c.lod === uroven ? HYSTEREZA : 1);
      let lod = -1;
      if (c._vidno) {
        if (c._d < n.blizko * h(0) && n0 < n.maxBlizko) { lod = 0; n0++; }
        else if (c._d < n.stredne * h(1) && n1 < n.maxStredne) { lod = 1; n1++; }
        else if (c._d < n.daleko * h(2)) lod = 2;
      }
      c.nastavLod(lod);
      st[lod < 0 ? 'skryte' : 'lod' + lod]++;

      // animácia: neviditeľní čakajú, ďalekí sa animujú zriedkavejšie (čas sa nazbiera)
      c._dt = Math.min(c._dt + dt, 1);
      if (lod < 0) continue;
      if (lod === 2 && (this.snimok + c._faza) % n.animaciaDaleko !== 0) continue;
      c.animuj(c._dt);
      c._dt = 0;
    }
  }
}
