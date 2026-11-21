// Modul: grafické efekty a kvalita grafiky.
//   – zatienenie kútov (AO), vzdušná perspektíva, farebné ladenie, vyhladzovanie hrán (vykreslovac.js),
//   – ostrejšie a stabilné tiene slnka okolo hráča (veľkosť mapy a dosah podľa kvality, svet.js ich zarovnáva),
//   – výber kvality v menu: nízka (bez efektov), stredná, vysoká.
// Zverejňuje hra.vykresli() – main.js ním kreslí snímok (bez modulu kreslí priamo renderer).

import * as THREE from 'three';
import '../tiene.js';
import { Vykreslovac } from './vykreslovac.js';
import { NALADA } from '../nalada.js';
import { nacitajKvalitu, vlozKvalituDoMenu } from '../../ui/nastavenia-grafiky.js';

const KVALITA = {
  nizka: { efekty: false, tiene: 2048, dosahTienov: 80 },
  stredna: { efekty: true, msaa: 2, vzorkyAo: 8, ao: true, tiene: 2048, dosahTienov: 100 },
  vysoka: { efekty: true, msaa: 4, vzorkyAo: 12, ao: true, tiene: 4096, dosahTienov: 120 },
};

/** Integrovaná grafika (notebooky, kancelárske PC) začne na strednej kvalite, samostatná karta na vysokej. */
function predvolenaKvalita(renderer) {
  try {
    const gl = renderer.getContext();
    const info = gl.getExtension('WEBGL_debug_renderer_info');
    const nazov = info ? String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL)) : '';
    if (/intel|iris|uhd|radeon\(tm\) graphics|vega|mali|adreno|swiftshader|llvmpipe/i.test(nazov)) return 'stredna';
  } catch { /* nevadí */ }
  return 'vysoka';
}

export default {
  nazov: 'efekty',
  poradie: 2,

  init(hra) {
    this.slnko = null;
    hra.scena.traverse((o) => { if (!this.slnko && o.isDirectionalLight && o.castShadow) this.slnko = o; });
    this.vykreslovac = new Vykreslovac(hra.renderer, hra.scena, hra.kamera);
    this._smer = new THREE.Vector3();
    this.nastavNaladu(hra, NALADA);
    // deň a noc (js/grafika/den-noc.js) posiela náladu podľa herného času
    hra.na('nalada', (n) => this.nastavNaladu(hra, n));

    this.kvalita = nacitajKvalitu(predvolenaKvalita(hra.renderer));
    vlozKvalituDoMenu(this.kvalita, (k) => this.nastavKvalitu(k));
    this.nastavKvalitu(this.kvalita);

    hra.vykresli = () => {
      if (this.nastavenie.efekty) this.vykreslovac.render();
      else { hra.renderer.setRenderTarget(null); hra.renderer.render(hra.scena, hra.kamera); }
    };
  },

  /** Tone mapping, opar a farebné ladenie podľa nálady (js/grafika/nalada.js). */
  nastavNaladu(hra, n) {
    hra.renderer.toneMapping = n.tonovanie.typ === 'AgX' ? THREE.AgXToneMapping : THREE.ACESFilmicToneMapping;
    hra.renderer.toneMappingExposure = n.tonovanie.expozicia;
    const u = this.vykreslovac.matVysledok.uniforms, e = n.efekty;
    u.farbaOparu.value.set(e.opar);
    u.hustotaOparu.value = e.hustotaOparu; u.maxOpar.value = e.maxOpar;
    u.saturacia.value = e.saturacia; u.kontrast.value = e.kontrast; u.vineta.value = e.vineta; u.silaAo.value = e.silaAo;
  },

  nastavKvalitu(kvalita) {
    this.kvalita = kvalita;
    this.nastavenie = KVALITA[kvalita] ?? KVALITA.vysoka;
    const n = this.nastavenie;
    if (n.efekty) this.vykreslovac.nastav({ msaa: n.msaa, vzorkyAo: n.vzorkyAo, ao: n.ao });
    const s = this.slnko;
    if (s) {
      if (s.shadow.mapSize.x !== n.tiene) {
        s.shadow.mapSize.set(n.tiene, n.tiene);
        s.shadow.map?.dispose();
        s.shadow.map = null;
      }
      const c = s.shadow.camera;
      c.left = -n.dosahTienov; c.right = n.dosahTienov; c.top = n.dosahTienov; c.bottom = -n.dosahTienov;
      c.updateProjectionMatrix();
    }
  },

  updateVzdy(dt, hra) {
    // smer k slnku a farba oparu (pripravené na deň a noc)
    if (this.slnko) {
      this._smer.subVectors(this.slnko.position, this.slnko.target.position).normalize();
      this.vykreslovac.matVysledok.uniforms.smerSlnka.value.copy(this._smer);
    }
  },
};
