// Nálady osvetlenia počas dňa podľa výšky slnka (°): noc, súmrak, zlatá hodinka (js/grafika/nalada.js), deň.
// Medzi nimi sa plynulo prechádza (farby v lineárnom priestore). Modul js/grafika/den-noc.js ich použije
// podľa herného času. „svetlo“ je slnko, v noci mesiac (smer volí den-noc.js), „hviezdy“ 0–1 na oblohe.

import * as THREE from 'three';
import { NALADA } from './nalada.js';

const NOC = {
  obloha: { vrch: '#02040b', horizont: '#0b1120', ziara: '#141c33' },
  svetlo: { farba: '#9fb6ec', sila: 0.6 },
  hemi: { nebo: '#3a4c75', zem: '#0d0e12', sila: 0.42 },
  odrazy: { sila: 0.12, zem: '#050608' },
  hmla: { farba: '#0c111d' },
  tonovanie: { expozicia: 1.75 },
  efekty: { opar: '#0d1220', hustotaOparu: 1 / 1500, maxOpar: 0.45, saturacia: 0.82, kontrast: 1.05, vineta: 0.32, silaAo: 0.7 },
  hviezdy: 1, noc: 1,
};

const SUMRAK = {
  obloha: { vrch: '#16224a', horizont: '#b8735a', ziara: '#ff8650' },
  svetlo: { farba: '#b9a6d6', sila: 0.12 },
  hemi: { nebo: '#7b7c9e', zem: '#221e1d', sila: 0.32 },
  odrazy: { sila: 0.22, zem: '#1a1614' },
  hmla: { farba: '#5a4a58' },
  tonovanie: { expozicia: 1.4 },
  efekty: { opar: '#4c3f50', hustotaOparu: 1 / 1600, maxOpar: 0.45, saturacia: 0.95, kontrast: 1.08, vineta: 0.26, silaAo: 0.8 },
  hviezdy: 0.35, noc: 0.75,
};

const ZLATA = {
  obloha: NALADA.obloha,
  svetlo: { farba: NALADA.slnko.farba, sila: NALADA.slnko.sila },
  hemi: NALADA.hemi,
  odrazy: NALADA.odrazy,
  hmla: { farba: NALADA.hmla.farba },
  tonovanie: { expozicia: NALADA.tonovanie.expozicia },
  efekty: NALADA.efekty,
  hviezdy: 0, noc: 0,
};

const DEN = {
  obloha: { vrch: '#3a6dbd', horizont: '#c3d5e8', ziara: '#fff3da' },
  svetlo: { farba: '#fff0dc', sila: 3.1 },
  hemi: { nebo: '#d2e1f4', zem: '#5c5349', sila: 0.55 },
  odrazy: { sila: 0.5, zem: '#4d463e' },
  hmla: { farba: '#cdd9e5' },
  tonovanie: { expozicia: 1.05 },
  efekty: { opar: '#c6d4e2', hustotaOparu: 1 / 2200, maxOpar: 0.36, saturacia: 1.04, kontrast: 1.06, vineta: 0.15, silaAo: 0.85 },
  hviezdy: 0, noc: 0,
};

// [výška slnka v °, nálada]
const KLUCE = [[-12, NOC], [-3.5, SUMRAK], [7, ZLATA], [14, ZLATA], [30, DEN]];

const ca = new THREE.Color(), cb = new THREE.Color();
function zmiesaj(a, b, t) {
  if (typeof a === 'number') return a + (b - a) * t;
  if (typeof a === 'string' && a.startsWith('#')) return '#' + ca.set(a).lerp(cb.set(b), t).getHexString();
  if (typeof a === 'string') return a;
  const out = {};
  for (const k of Object.keys(a)) out[k] = k in b ? zmiesaj(a[k], b[k], t) : a[k];
  return out;
}

/** Nálada pre výšku slnka (°). */
export function naladaPreVysku(e) {
  if (e <= KLUCE[0][0]) return zmiesaj(KLUCE[0][1], KLUCE[0][1], 0);
  for (let i = 0; i < KLUCE.length - 1; i++) {
    const [e0, a] = KLUCE[i], [e1, b] = KLUCE[i + 1];
    if (e <= e1) {
      const t = (e - e0) / (e1 - e0);
      return zmiesaj(a, b, t * t * (3 - 2 * t));
    }
  }
  const posledna = KLUCE[KLUCE.length - 1][1];
  return zmiesaj(posledna, posledna, 0);
}
