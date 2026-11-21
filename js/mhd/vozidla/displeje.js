// Displeje vozidiel MHD: číslo linky a cieľ (oranžové LED písmo). Len pre vozidlá blízko hráča,
// textúry sa pamätajú podľa (linka, cieľ).

import * as THREE from 'three';

const MAX_DISPLEJOV = 18;
const MAX_TEXTUR = 80;

export class Displeje {
  constructor(skupina) {
    this.textury = new Map();
    this.pool = [];
    const geo = new THREE.PlaneGeometry(1, 1);
    for (let i = 0; i < MAX_DISPLEJOV; i++) {
      const par = {};
      for (const k of ['predny', 'bocny', 'zadny']) {
        const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ toneMapped: false, transparent: false }));
        m.visible = false;
        m.matrixAutoUpdate = false;
        skupina.add(m);
        par[k] = m;
      }
      this.pool.push(par);
    }
    this.pouzite = 0;
  }

  _textura(linka, ciel, farba) {
    const kluc = `${linka}|${ciel}`;
    let t = this.textury.get(kluc);
    if (t) { this.textury.delete(kluc); this.textury.set(kluc, t); return t; } // LRU
    const c = document.createElement('canvas');
    c.width = 512; c.height = 64;
    const g = c.getContext('2d');
    g.fillStyle = '#050505';
    g.fillRect(0, 0, 512, 64);
    // číslo linky vo farebnom rámčeku linky
    g.fillStyle = farba || '#c8102e';
    g.fillRect(4, 6, 92, 52);
    g.fillStyle = '#ffffff';
    g.font = 'bold 44px system-ui, sans-serif';
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(linka, 50, 34, 86);
    // cieľ oranžovým „LED“ písmom
    g.fillStyle = '#ffb21a';
    g.textAlign = 'left';
    g.font = 'bold 36px system-ui, sans-serif';
    g.fillText(ciel ?? '', 110, 34, 396);
    t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
    this.textury.set(kluc, t);
    if (this.textury.size > MAX_TEXTUR) {
      const [k0, t0] = this.textury.entries().next().value;
      t0.dispose(); this.textury.delete(k0);
    }
    return t;
  }

  zacni() { this.pouzite = 0; }

  /**
   * Displeje jedného vozidla. mPredny / mZadny = matice prvého a posledného článku,
   * t = typ vozidla, dPredny / dZadny = dĺžky týchto článkov.
   */
  pridaj(linka, ciel, farba, t, mPredny, dPredny, mZadny, dZadny) {
    if (this.pouzite >= MAX_DISPLEJOV) return;
    const par = this.pool[this.pouzite++];
    const tex = this._textura(linka, ciel, farba);
    const s = t.sirka;
    // predný: nad čelným sklom
    nastav(par.predny, tex, mPredny, 0, t.vyska - 0.33, dPredny / 2 + 0.06, 0, s - 0.56, 0.26);
    // bočný: pri predných dverách na pravej strane (−x), otočený von
    nastav(par.bocny, tex, mPredny, -s / 2 - 0.025, t.vyska - 0.62, dPredny / 2 - 2.3, -Math.PI / 2, 1.6, 0.2);
    // zadný: v zadnom okne
    nastav(par.zadny, tex, mZadny, 0, t.vyska - 0.4, -dZadny / 2 - 0.06, Math.PI, s - 1.25, 0.2);
  }

  dokonci() {
    for (let i = this.pouzite; i < this.pool.length; i++) {
      const p = this.pool[i];
      p.predny.visible = p.bocny.visible = p.zadny.visible = false;
    }
  }
}

const _m = new THREE.Matrix4(), _r = new THREE.Matrix4(), _s = new THREE.Matrix4();
function nastav(mesh, tex, rodic, x, y, z, rotY, sx, sy) {
  if (mesh.material.map !== tex) { mesh.material.map = tex; mesh.material.needsUpdate = true; }
  _r.makeRotationY(rotY).setPosition(x, y, z);
  _s.makeScale(sx, sy, 1);
  _m.multiplyMatrices(rodic, _r).multiply(_s);
  mesh.matrix.copy(_m);
  mesh.matrixWorldNeedsUpdate = true;
  mesh.visible = true;
}
