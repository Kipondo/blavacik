// Modul: drobnosti (lavičky, značky, tabule ulíc, lampy) sa kreslia len zblízka (#58).
// Dosah je v predvoľbe kvality (hra.stav.grafika.drobnosti, js/grafika/predvolby.js), lampy majú dvojnásobný
// (v noci svietia aj z diaľky). Každá drobnosť je inštancia v InstancedMesh dlaždice: raz za chvíľu sa
// inštancie v dosahu presunú na začiatok poľa a kreslí sa len ich počet; sieť bez inštancií v dosahu sa nekreslí vôbec.
// Hroby majú vlastné štvorce s dosahom (js/mapa/vybavenie/hroby.js), sochy a tabule služieb vlastné moduly.

const SKUPINY = { lavicky: 1, znacky: 1, 'tabule-ulic': 1, lampy: 2, lucerny: 2 };
const POSUN = 6;   // m – po takomto posune kamery sa výber prepočíta

export default {
  nazov: 'drobnosti',
  poradie: 61,

  init(hra) {
    this.dlazdice = new Map(); // kľúč → zoznam sietí { mesh, poz, matice, farby, nasobok, n, vybrane }
    this.posledna = null;
    this.cas = 0;
    hra.na('dlazdica-nacitana', ({ kluc, uroven, objekt }) => {
      if (uroven === 'detail') this.dlazdice.set(kluc, this.zber(objekt));
      else this.dlazdice.delete(kluc);
      this.posledna = null;
    });
    hra.na('dlazdica-uvolnena', ({ kluc }) => this.dlazdice.delete(kluc));
    hra.na('kvalita', () => { this.posledna = null; });
    for (const [kluc, a] of hra.mapa?.dlazdice?.aktivne ?? []) {
      if (a.uroven === 'detail') this.dlazdice.set(kluc, this.zber(a.objekt));
    }
  },

  /** Zapamätá si pôvodné inštancie drobností v dlaždici (polohy vo svete, matice, farby). */
  zber(objekt) {
    const out = [];
    objekt.updateMatrixWorld(true);
    for (const g of objekt.children) {
      const nasobok = SKUPINY[g.name];
      if (!nasobok) continue;
      g.traverse((o) => {
        if (!o.isInstancedMesh || o.count === 0) return;
        const n = o.count;
        const matice = o.instanceMatrix.array.slice(0, n * 16);
        const farby = o.instanceColor ? o.instanceColor.array.slice(0, n * 3) : null;
        const poz = new Float32Array(n * 2);
        const e = o.matrixWorld.elements;
        for (let i = 0; i < n; i++) {
          const x = matice[i * 16 + 12], y = matice[i * 16 + 13], z = matice[i * 16 + 14];
          poz[i * 2] = e[0] * x + e[4] * y + e[8] * z + e[12];
          poz[i * 2 + 1] = e[2] * x + e[6] * y + e[10] * z + e[14];
        }
        // obal pre orezanie mimo záberu ostáva pôvodný (všetky inštancie) – je väčší, nie menší, takže nič nechýba
        if (!o.boundingSphere) o.computeBoundingSphere();
        out.push({ mesh: o, poz, matice, farby, nasobok, n, vybrane: -1 });
      });
    }
    return out;
  },

  updateVzdy(dt, hra) {
    this.cas -= dt;
    if (this.cas > 0) return;
    this.cas = 0.3;
    const k = hra.kamera.position;
    const dosah = hra.stav.grafika?.drobnosti ?? Infinity;
    if (this.posledna && this.posledna.dosah === dosah && Math.hypot(k.x - this.posledna.x, k.z - this.posledna.z) < POSUN) return;
    this.posledna = { x: k.x, z: k.z, dosah };
    for (const siete of this.dlazdice.values()) for (const s of siete) this.vyber(s, k.x, k.z, dosah * s.nasobok);
  },

  /** Inštancie v dosahu presunie na začiatok poľa (v pôvodnom poradí) a nastaví ich počet. */
  vyber(s, x, z, dosah) {
    const { mesh, poz, matice, farby, n } = s;
    const d2 = dosah * dosah;
    const m = mesh.instanceMatrix.array, f = mesh.instanceColor?.array;
    let k = 0, podpis = 0;
    for (let i = 0; i < n; i++) {
      const dx = poz[i * 2] - x, dz = poz[i * 2 + 1] - z;
      if (dx * dx + dz * dz > d2) continue;
      if (k !== i || s.vybrane !== -1) {
        for (let j = 0; j < 16; j++) m[k * 16 + j] = matice[i * 16 + j];
        if (farby && f) { f[k * 3] = farby[i * 3]; f[k * 3 + 1] = farby[i * 3 + 1]; f[k * 3 + 2] = farby[i * 3 + 2]; }
      }
      podpis = (podpis * 31 + i + 1) | 0;
      k++;
    }
    const kluc = k * 1e6 + (podpis & 0xfffff);
    if (kluc === s.vybrane) return;
    s.vybrane = kluc;
    mesh.count = k;
    mesh.visible = k > 0;
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  },
};
