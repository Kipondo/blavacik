// Terén z laserového skenovania (model/data/teren/ – tools/model/teren.py): dlaždice 256 m, mriežka 0,5 m.
// Každá dlaždica má úrovne podrobnosti podľa vzdialenosti kamery (0,5 / 1 / 2 / 4 m) – podrobné siete sa stavajú
// až keď treba (najviac jedna za snímok, aby prezerač nesekal). Okraj dlaždice má zvislý lem dolu, takže medzi
// dlaždicami s rôznou úrovňou nie je škára. Farba: jednotná (variant 1–2) alebo z mapy plôch (variant 3–4,
// model/data/plochy/<i>_<j>.png – tools/model/plochy.py).

import * as THREE from 'three';

const UROVNE = [{ krok: 1, do: 220 }, { krok: 2, do: 520 }, { krok: 4, do: 1200 }, { krok: 8, do: Infinity }];

async function rozbal(buf) {
  const b = new Uint8Array(buf);
  if (b[0] !== 0x1f || b[1] !== 0x8b) return buf;
  const prud = new Blob([buf]).stream().pipeThrough(new DecompressionStream('gzip'));
  return await new Response(prud).arrayBuffer();
}

export class Teren {
  constructor(scena, cesta = 'data/teren') {
    this.scena = scena;
    this.cesta = cesta;
    this.skupina = new THREE.Group();
    this.skupina.name = 'teren';
    scena.add(this.skupina);
    this.dlazdice = new Map();
    this.farba = new THREE.Color('#d8d2c4');
    this.material = new THREE.MeshLambertMaterial({ color: this.farba });
    this.plochy = false;
  }

  async nacitaj(priebeh = () => {}) {
    this.meta = await (await fetch(`${this.cesta}/index.json`)).json();
    const m = this.meta;
    this.N = m.uzly; this.D = m.dlazdica; this.krok = m.krok;
    let n = 0;
    await Promise.all(m.dlazdice.map(async (t) => {
      const r = await fetch(`${this.cesta}/${t.i}_${t.j}.bin`);
      const u = new Uint16Array(await rozbal(await r.arrayBuffer()));
      const N = this.N, v = new Float32Array(N * N);
      for (let row = 0; row < N; row++) {
        let a = 0;
        for (let c = 0; c < N; c++) { a = (a + u[row * N + c]) & 0xffff; v[row * N + c] = a / 100 + t.min; }
      }
      const x0 = m.x0 + m.dlazdica * t.i, z0 = m.z0 + m.dlazdica * t.j;
      const d = { ...t, x0, z0, v, siete: [], aktivna: -1, mesh: null, mapa: null };
      this.dlazdice.set(`${t.i}_${t.j}`, d);
      priebeh(`Terén ${++n} / ${m.dlazdice.length}`);
    }));
  }

  /** Výška terénu v bode (bilineárne z mriežky 0,5 m), mimo územia null. */
  vyska(x, z) {
    const m = this.meta;
    if (!m) return null;
    const i = Math.floor((x - m.x0) / this.D), j = Math.floor((z - m.z0) / this.D);
    const d = this.dlazdice.get(`${i}_${j}`);
    if (!d) return null;
    const N = this.N;
    const fx = Math.min(N - 1.001, (x - d.x0) / this.krok), fz = Math.min(N - 1.001, (z - d.z0) / this.krok);
    const a = Math.floor(fx), b = Math.floor(fz), tx = fx - a, tz = fz - b, v = d.v;
    return (v[b * N + a] * (1 - tx) + v[b * N + a + 1] * tx) * (1 - tz) + (v[(b + 1) * N + a] * (1 - tx) + v[(b + 1) * N + a + 1] * tx) * tz;
  }

  /** Sieť dlaždice s krokom (1 = 0,5 m) + lem po okraji. */
  siet(d, krok) {
    const N = this.N, n = (N - 1) / krok + 1, s = this.krok * krok;
    const poz = new Float32Array((n * n + 4 * n) * 3), uv = new Float32Array((n * n + 4 * n) * 2);
    let k = 0;
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        poz[k * 3] = c * s; poz[k * 3 + 1] = d.v[r * krok * N + c * krok]; poz[k * 3 + 2] = r * s;
        uv[k * 2] = c / (n - 1); uv[k * 2 + 1] = 1 - r / (n - 1);
        k++;
      }
    }
    const idx = [];
    for (let r = 0; r < n - 1; r++) {
      for (let c = 0; c < n - 1; c++) {
        const a = r * n + c, b = a + 1, e = a + n, f = e + 1;
        idx.push(a, e, b, b, e, f);
      }
    }
    // lem: okrajové uzly zopakované 3 m nižšie
    const okraj = [];
    for (let c = 0; c < n; c++) okraj.push(c);
    for (let r = 1; r < n; r++) okraj.push(r * n + n - 1);
    for (let c = n - 2; c >= 0; c--) okraj.push((n - 1) * n + c);
    for (let r = n - 2; r > 0; r--) okraj.push(r * n);
    const zaciatok = k;
    for (const o of okraj) {
      poz[k * 3] = poz[o * 3]; poz[k * 3 + 1] = poz[o * 3 + 1] - 3; poz[k * 3 + 2] = poz[o * 3 + 2];
      uv[k * 2] = uv[o * 2]; uv[k * 2 + 1] = uv[o * 2 + 1];
      k++;
    }
    for (let q = 0; q < okraj.length; q++) {
      const a = okraj[q], b = okraj[(q + 1) % okraj.length], a2 = zaciatok + q, b2 = zaciatok + (q + 1) % okraj.length;
      idx.push(a, b, a2, b, b2, a2);
    }
    // normály z výšky terénu (aj cez hranicu dlaždice – bez tmavých čiar na švoch); lem má normálu horného uzla
    const nrm = new Float32Array(k * 3);
    const e = Math.max(this.krok, s);
    for (let q = 0; q < zaciatok; q++) {
      const x = d.x0 + poz[q * 3], z = d.z0 + poz[q * 3 + 2];
      const hl = this.vyska(x - e, z) ?? poz[q * 3 + 1], hp = this.vyska(x + e, z) ?? poz[q * 3 + 1];
      const hh = this.vyska(x, z - e) ?? poz[q * 3 + 1], hd = this.vyska(x, z + e) ?? poz[q * 3 + 1];
      const nx = hl - hp, nz = hh - hd, ny = 2 * e, l = Math.hypot(nx, ny, nz);
      nrm[q * 3] = nx / l; nrm[q * 3 + 1] = ny / l; nrm[q * 3 + 2] = nz / l;
    }
    okraj.forEach((o, q) => { nrm.set(nrm.subarray(o * 3, o * 3 + 3), (zaciatok + q) * 3); });
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(poz.subarray(0, k * 3), 3));
    g.setAttribute('normal', new THREE.BufferAttribute(nrm, 3));
    g.setAttribute('uv', new THREE.BufferAttribute(uv.subarray(0, k * 2), 2));
    g.setIndex(idx);
    return g;
  }

  /** Mapa plôch dlaždice (variant 3–4) – načíta sa raz, keď je zapnutá. */
  async mapaPloch(d) {
    if (d.mapa) return d.mapa;
    d.mapa = new Promise((res) => {
      new THREE.TextureLoader().load(`data/plochy/${d.i}_${d.j}.png`, (t) => {
        t.colorSpace = THREE.SRGBColorSpace;
        t.anisotropy = 8;
        t.magFilter = THREE.NearestFilter;
        res(t);
      }, undefined, () => res(null));
    });
    return d.mapa;
  }

  nastavPlochy(zapnute) {
    this.plochy = zapnute;
    for (const d of this.dlazdice.values()) this.priradMaterial(d);
  }

  async priradMaterial(d) {
    if (!d.mesh) return;
    if (!this.plochy) { d.mesh.material = this.material; return; }
    const t = await this.mapaPloch(d);
    if (!this.plochy || !d.mesh) return;
    d.material ??= t ? new THREE.MeshLambertMaterial({ map: t }) : this.material;
    d.mesh.material = d.material;
  }

  /** Úrovne podrobnosti podľa vzdialenosti kamery; postaví najviac jednu novú sieť za snímok. */
  update(kamera) {
    let postavene = 0;
    for (const d of this.dlazdice.values()) {
      const cx = d.x0 + this.D / 2, cz = d.z0 + this.D / 2;
      const dist = Math.max(0, Math.hypot(kamera.position.x - cx, kamera.position.z - cz, kamera.position.y - (d.min + d.max) / 2) - this.D * 0.6);
      let u = UROVNE.findIndex((x) => dist < x.do);
      if (u < 0) u = UROVNE.length - 1;
      if (u === d.aktivna) continue;
      if (!d.siete[u]) {
        if (postavene >= 1 && d.aktivna >= 0) continue;
        d.siete[u] = this.siet(d, UROVNE[u].krok);
        postavene++;
      }
      if (!d.mesh) {
        d.mesh = new THREE.Mesh(d.siete[u], this.material);
        d.mesh.position.set(d.x0, 0, d.z0);
        d.mesh.receiveShadow = true;
        this.skupina.add(d.mesh);
        this.priradMaterial(d);
      } else d.mesh.geometry = d.siete[u];
      d.aktivna = u;
    }
  }
}
