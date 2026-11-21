// Modul: deň a noc podľa herného času (hra.stav.datumCas, js/cas/).
//   – poloha slnka nad Bratislavou podľa dátumu a hodiny (js/grafika/poloha-slnka.js), v noci svieti mesiac,
//   – nálada (obloha, farba a sila svetla, svetlo z oblohy, hmla, opar, expozícia) podľa výšky slnka
//     (js/grafika/nalady.js: noc → súmrak → zlatá hodinka → deň),
//   – hviezdy a mesiac na oblohe, lampy a okná v noci svietia (js/grafika/noc.js).
// Ostatným modulom pošle udalosť 'nalada' (nálada v tvare js/grafika/nalada.js) – efekty si podľa nej nastavia
// opar a ladenie. Odrazy oblohy (environment map) prepočíta pri väčšej zmene oblohy sám (rovnako ako
// js/grafika/prostredie.js pri štarte). Výsledok je aj v hra.stav.svetlo = { vyskaSlnka, noc }.
// Bez herného času (modul cas chýba) ostane zlatá hodinka.

import * as THREE from 'three';
import { smerSlnka, smerMesiaca, vyskaSlnka } from './poloha-slnka.js';
import { naladaPreVysku } from './nalady.js';
import { NOC, OKNA, SVIETIDLA } from './noc.js';
import { NALADA } from './nalada.js';

const MIN_VYSKA_SVETLA = 0.08;   // svetlo (tiene) nikdy nie nižšie ako ~5° – inak nekonečne dlhé tiene

export default {
  nazov: 'den-noc',
  poradie: 3,

  init(hra) {
    hra.scena.traverse((o) => {
      if (o.isDirectionalLight && o.castShadow && !this.svetlo) this.svetlo = o;
      if (o.isHemisphereLight && !this.hemi) this.hemi = o;
      if (o.name === 'obloha') this.obloha = o;
    });
    this.slnko = new THREE.Vector3();
    this.mesiac = new THREE.Vector3();
    this.cas = 0;
    this.posledna = null;
    this.klucOdrazov = null;
    this.silaOdrazov = hra.scena.environmentIntensity ?? 0.55;   // pri zlatej hodinke (nastavil prostredie.js)
    hra.stav.svetlo = { vyskaSlnka: 10, noc: 0 };
  },

  /** Odrazy oblohy (PMREM) pre aktuálnu oblohu – obloha bledšia (ako v prostredie.js), pod ňou zem. */
  prepocitajOdrazy(hra, n) {
    const u = this.obloha.material.uniforms;
    if (!this.envScena) {
      this.envScena = new THREE.Scene();
      this.envMat = this.obloha.material.clone();
      this.envScena.add(new THREE.Mesh(this.obloha.geometry, this.envMat));
      this.envZem = new THREE.Mesh(new THREE.CircleGeometry(3000, 16), new THREE.MeshBasicMaterial({ color: n.odrazy.zem }));
      this.envZem.rotation.x = -Math.PI / 2;
      this.envZem.position.y = -40;
      this.envScena.add(this.envZem);
    }
    const e = this.envMat.uniforms;
    e.vrch.value.copy(u.vrch.value).lerp(u.horizont.value, 0.45);
    e.horizont.value.copy(u.horizont.value);
    e.ziara.value.copy(u.ziara.value);
    e.slnko.value.copy(u.slnko.value);
    if (e.hviezdy) e.hviezdy.value = 0;
    this.envZem.material.color.set(n.odrazy.zem);
    const pmrem = new THREE.PMREMGenerator(hra.renderer);
    // far musí presiahnuť guľu oblohy (polomer 4000 m)
    const env = pmrem.fromScene(this.envScena, 0.03, 1, 4500);
    pmrem.dispose();
    this.env?.dispose();
    this.env = env;
    hra.scena.environment = env.texture;
    hra.scena.environmentIntensity = this.silaOdrazov * (n.odrazy.sila / NALADA.odrazy.sila);
  },

  updateVzdy(dt, hra) {
    const d = hra.stav.datumCas;
    if (!d || !this.svetlo) return;
    // nálada sa mení pomaly – stačí 4× za sekundu (alebo hneď po skoku času)
    this.cas -= dt;
    const ms = d.getTime();
    if (this.cas > 0 && this.posledna !== null && Math.abs(ms - this.posledna) < 120000) return;
    this.cas = 0.25;
    this.posledna = ms;

    smerSlnka(d, this.slnko);
    smerMesiaca(d, this.mesiac);
    const e = vyskaSlnka(this.slnko);
    const n = naladaPreVysku(e);
    n.tonovanie.typ = 'AgX';

    // svetlo: nad obzorom slnko, pod ním mesiac (pri súmraku je svetlo slabé, prechod nie je vidieť)
    const zdroj = e > -3 ? this.slnko : this.mesiac;
    const smer = this.svetlo.userData.smer;
    if (smer) {
      smer.copy(zdroj);
      if (smer.y < MIN_VYSKA_SVETLA) { smer.y = MIN_VYSKA_SVETLA; smer.normalize(); }
    }
    this.svetlo.color.set(n.svetlo.farba);
    this.svetlo.intensity = n.svetlo.sila;
    if (this.hemi) {
      this.hemi.color.set(n.hemi.nebo);
      this.hemi.groundColor.set(n.hemi.zem);
      this.hemi.intensity = n.hemi.sila;
    }
    const u = this.obloha?.material?.uniforms;
    if (u) {
      u.vrch.value.set(n.obloha.vrch);
      u.horizont.value.set(n.obloha.horizont);
      u.ziara.value.set(n.obloha.ziara);
      u.slnko.value.copy(this.slnko);
      if (u.mesiac) u.mesiac.value.copy(this.mesiac);
      if (u.hviezdy) u.hviezdy.value = n.hviezdy;
    }
    if (hra.scena.fog) hra.scena.fog.color.set(n.hmla.farba);
    if (hra.scena.background?.isColor) hra.scena.background.set(n.obloha.horizont);

    // noc pre lampy a okná; okná: večer svieti veľa, po polnoci menej, nadránom málo
    NOC.value = n.noc;
    const hod = d.getHours() + d.getMinutes() / 60;
    OKNA.value = hod >= 16 || hod < 1 ? 0.42 : hod < 5 ? 0.12 : hod < 9 ? 0.3 : 0.1;
    for (const [mat, sila] of SVIETIDLA) mat.emissiveIntensity = sila * n.noc;

    hra.stav.svetlo = { vyskaSlnka: e, noc: n.noc };
    // odrazy oblohy sa prepočítajú len pri väčšej zmene (výška slnka po 1,5°)
    const kluc = Math.round(e / 1.5);
    if (u && kluc !== this.klucOdrazov) { this.klucOdrazov = kluc; this.prepocitajOdrazy(hra, n); }
    hra.posli('nalada', { ...n, slnko: { smer: this.slnko.toArray(), farba: n.svetlo.farba, sila: n.svetlo.sila } });
  },
};
