// Modul: grafické efekty a kvalita grafiky.
//   – zatienenie kútov (AO), vzdušná perspektíva, farebné ladenie, vyhladzovanie hrán (vykreslovac.js),
//   – ostrejšie a stabilné tiene slnka okolo hráča (veľkosť mapy a dosah podľa kvality, svet.js ich zarovnáva),
//   – úroveň efektov a tiene podľa kvality grafiky (hra.stav.grafika, js/grafika/kvalita.js): nízka bez efektov a tieňov.
// Zverejňuje hra.vykresli() – main.js ním kreslí snímok (bez modulu kreslí priamo renderer).

import * as THREE from 'three';
import '../tiene.js';
import { Vykreslovac } from './vykreslovac.js';
import { NALADA } from '../nalada.js';

// úrovne obrazových efektov (hra.stav.grafika.efekty); tiene sú v predvoľbách (js/grafika/predvolby.js)
const EFEKTY = {
  nizka: { efekty: false },
  stredna: { efekty: true, msaa: 2, vzorkyAo: 8, ao: true },
  vysoka: { efekty: true, msaa: 4, vzorkyAo: 12, ao: true },
};
// bez predvoľby kvality (napr. ručná mapa): ako vysoká
const BEZ_PREDVOLBY = { efekty: 'vysoka', tiene: 4096, dosahTienov: 120 };

export default {
  nazov: 'efekty',
  poradie: 2,

  init(hra) {
    this.slnko = null;
    // slnko (svet.js) – podľa smeru, nie podľa tieňa: na nízkej kvalite tieň nevrhá
    hra.scena.traverse((o) => { if (!this.slnko && o.isDirectionalLight && o.userData.smer && o.castShadow) this.slnko = o; });
    this.maTiene = !!this.slnko;
    this.vykreslovac = new Vykreslovac(hra.renderer, hra.scena, hra.kamera);
    this._smer = new THREE.Vector3();
    this.nastavNaladu(hra, NALADA);
    // deň a noc (js/grafika/den-noc.js) posiela náladu podľa herného času
    hra.na('nalada', (n) => this.nastavNaladu(hra, n));

    this.nastavKvalitu(hra.stav.grafika ?? BEZ_PREDVOLBY);
    hra.na('kvalita', (g) => this.nastavKvalitu(g));

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

  /** g = hra.stav.grafika (efekty, tiene, dosahTienov). Vypnutie/zapnutie tieňov raz preloží shadery (krátke zaseknutie). */
  nastavKvalitu(g) {
    this.nastavenie = EFEKTY[g.efekty] ?? EFEKTY.vysoka;
    const n = this.nastavenie;
    if (n.efekty) this.vykreslovac.nastav({ msaa: n.msaa, vzorkyAo: n.vzorkyAo, ao: n.ao });
    const s = this.slnko;
    if (!s) return;
    s.castShadow = this.maTiene && g.tiene > 0;
    if (!s.castShadow) return;
    if (s.shadow.mapSize.x !== g.tiene) {
      s.shadow.mapSize.set(g.tiene, g.tiene);
      s.shadow.map?.dispose();
      s.shadow.map = null;
    }
    const c = s.shadow.camera;
    c.left = -g.dosahTienov; c.right = g.dosahTienov; c.top = g.dosahTienov; c.bottom = -g.dosahTienov;
    c.updateProjectionMatrix();
  },

  updateVzdy(dt, hra) {
    // smer k slnku a farba oparu (pripravené na deň a noc)
    if (this.slnko) {
      this._smer.subVectors(this.slnko.position, this.slnko.target.position).normalize();
      this.vykreslovac.matVysledok.uniforms.smerSlnka.value.copy(this._smer);
    }
  },
};
