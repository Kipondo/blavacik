// Vykresľovanie s efektmi: scéna do textúry (s vyhladzovaním hrán MSAA a hĺbkou), z hĺbky AO v polovičnom
// rozlíšení, jeho rozmazanie a nakoniec jeden prechod na obrazovku (AO, opar, farby, tone mapping).
// Spolu jedno vykreslenie scény + 4 lacné prechody cez celú obrazovku.

import * as THREE from 'three';
import { VRCHOL, AO, ROZMAZ, VYSLEDOK } from './shadery.js';

export class Vykreslovac {
  constructor(renderer, scena, kamera) {
    this.renderer = renderer;
    this.scena = scena;
    this.kamera = kamera;
    this.nastavenia = { msaa: 4, vzorkyAo: 12, ao: true };

    // jeden trojuholník cez celú obrazovku
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute([-1, -1, 0, 3, -1, 0, -1, 3, 0], 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 2, 0, 0, 2], 2));
    this.trojuholnik = new THREE.Mesh(geo);
    this.trojuholnik.frustumCulled = false;
    this.kameraPrechodu = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    const spolocne = () => ({
      tHlbka: { value: null }, blizko: { value: 0.3 }, daleko: { value: 5000 }, projInv: { value: new THREE.Vector2(1, 1) },
    });
    const material = (fragmentShader, uniforms, extra = {}) => new THREE.ShaderMaterial({
      vertexShader: VRCHOL, fragmentShader, uniforms, depthTest: false, depthWrite: false, toneMapped: false, ...extra,
    });

    this.matAo = material(AO, {
      ...spolocne(), rozlisenie: { value: new THREE.Vector2() }, projMierka: { value: 1 },
      polomer: { value: 1.6 }, sila: { value: 2.0 }, koniec: { value: 1100 },
    }, { defines: { VZORKY: 12 } });
    this.matRozmaz = material(ROZMAZ, { tAo: { value: null }, krok: { value: new THREE.Vector2() } });
    this.matVysledok = material(VYSLEDOK, {
      ...spolocne(), tScena: { value: null }, tAo: { value: null }, rozlisenieAo: { value: new THREE.Vector2() },
      silaAo: { value: 0.85 }, pouziAo: { value: 1 },
      kameraOtocenie: { value: new THREE.Matrix3() },
      farbaOparu: { value: new THREE.Color('#c9dbe6') }, smerSlnka: { value: new THREE.Vector3(0, 1, 0) },
      hustotaOparu: { value: 1 / 2600 }, maxOpar: { value: 0.32 },
      saturacia: { value: 1.08 }, kontrast: { value: 1.05 }, vineta: { value: 0.16 }, ladenie: { value: 0 },
    }, { toneMapped: true });

    this._velkost = new THREE.Vector2();
    this.vytvorCiele();
  }

  /** Zmena kvality (msaa: 0/2/4, vzorkyAo, ao: zapnuté). */
  nastav(n) {
    const msaa = this.nastavenia.msaa;
    Object.assign(this.nastavenia, n);
    if (this.matAo.defines.VZORKY !== this.nastavenia.vzorkyAo) {
      this.matAo.defines.VZORKY = this.nastavenia.vzorkyAo;
      this.matAo.needsUpdate = true;
    }
    this.matVysledok.uniforms.pouziAo.value = this.nastavenia.ao ? 1 : 0;
    if (msaa !== this.nastavenia.msaa) this.vytvorCiele();
  }

  vytvorCiele() {
    for (const c of [this.rtScena, this.rtAo, this.rtAo2]) c?.dispose();
    this.renderer.getDrawingBufferSize(this._velkost);
    const w = Math.max(1, this._velkost.x), h = Math.max(1, this._velkost.y);
    const hlbka = new THREE.DepthTexture(w, h);
    hlbka.type = THREE.UnsignedIntType;
    this.rtScena = new THREE.WebGLRenderTarget(w, h, {
      type: THREE.HalfFloatType, samples: this.nastavenia.msaa, depthTexture: hlbka,
    });
    const aw = Math.max(1, Math.ceil(w / 2)), ah = Math.max(1, Math.ceil(h / 2));
    const volby = { type: THREE.HalfFloatType, format: THREE.RGFormat, depthBuffer: false, minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter };
    this.rtAo = new THREE.WebGLRenderTarget(aw, ah, volby);
    this.rtAo2 = new THREE.WebGLRenderTarget(aw, ah, volby);
    this.w = w; this.h = h; this.aw = aw; this.ah = ah;
  }

  /** Vykreslí snímok. smerSlnka a farbaOparu môže meniť modul efektov (deň/noc). */
  render() {
    const r = this.renderer, k = this.kamera;
    r.getDrawingBufferSize(this._velkost);
    if (this._velkost.x !== this.w || this._velkost.y !== this.h) this.vytvorCiele();

    // 1. scéna
    r.setRenderTarget(this.rtScena);
    r.render(this.scena, k);

    const P = k.projectionMatrix.elements;
    for (const m of [this.matAo, this.matVysledok]) {
      const u = m.uniforms;
      u.tHlbka.value = this.rtScena.depthTexture;
      u.blizko.value = k.near; u.daleko.value = k.far;
      u.projInv.value.set(1 / P[0], 1 / P[5]);
    }

    // 2. AO a jeho rozmazanie (vodorovne, zvislo)
    if (this.nastavenia.ao) {
      const u = this.matAo.uniforms;
      u.rozlisenie.value.set(this.aw, this.ah);
      u.projMierka.value = this.ah * 0.5 * P[5];
      this._prechod(this.matAo, this.rtAo);
      this.matRozmaz.uniforms.tAo.value = this.rtAo.texture;
      this.matRozmaz.uniforms.krok.value.set(1 / this.aw, 0);
      this._prechod(this.matRozmaz, this.rtAo2);
      this.matRozmaz.uniforms.tAo.value = this.rtAo2.texture;
      this.matRozmaz.uniforms.krok.value.set(0, 1 / this.ah);
      this._prechod(this.matRozmaz, this.rtAo);
    }

    // 3. výsledok na obrazovku
    const u = this.matVysledok.uniforms;
    u.tScena.value = this.rtScena.texture;
    u.tAo.value = this.rtAo.texture;
    u.rozlisenieAo.value.set(this.aw, this.ah);
    u.kameraOtocenie.value.setFromMatrix4(k.matrixWorld);
    this._prechod(this.matVysledok, null);
  }

  _prechod(material, ciel) {
    this.trojuholnik.material = material;
    this.renderer.setRenderTarget(ciel);
    this.renderer.render(this.trojuholnik, this.kameraPrechodu);
  }

  dispose() {
    for (const c of [this.rtScena, this.rtAo, this.rtAo2]) c?.dispose();
    for (const m of [this.matAo, this.matRozmaz, this.matVysledok]) m.dispose();
  }
}
