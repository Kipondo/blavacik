// Zrazenie chodca autom hráča: pri rýchlosti nad ~10 km/h chodec neuhne, ale odletí.
// Fyzika (bez kostry): rýchlosť z auta + výskok, gravitácia, prevracanie okolo vodorovnej osi kolmej
// na smer letu, odraz od zeme, šmyk a trenie, náraz do domu ho zastaví. Potom leží, po 5 s vstane
// (návrat na chodník rieši modul). Autu zoberie trochu rýchlosti a pošle udalosť 'naraz' (malá sila,
// chodec: true) – zvuk a poškodenie auta (preliačina vpredu) si ju spracujú samy.

import * as THREE from 'three';

export const MIN_RYCHLOST = 2.8;     // m/s – pomalšie auto chodca len odtlačí (uhne)
const POL_DLZKA = 2.3, POL_SIRKA = 1.0;
const LEZI = 5;               // s

const _q = new THREE.Quaternion(), _qy = new THREE.Quaternion(), _os = new THREE.Vector3(), _y = new THREE.Vector3(0, 1, 0);
const _p = new THREE.Vector3(), _s = new THREE.Vector3(), _t = new THREE.Matrix4();

/** Je chodec v obryse idúceho auta? */
export function zasiahnutyAutom(c, a) {
  const v = Math.hypot(a.vx ?? 0, a.vz ?? 0);
  if (v < MIN_RYCHLOST) return false;
  const dx = c.x - a.pozicia.x, dz = c.z - a.pozicia.z;
  if (Math.abs(dx) > 4 || Math.abs(dz) > 4) return false;
  if (Math.abs((c.y ?? a.pozicia.y) - a.pozicia.y) > 2) return false;   // napr. most nad cestou
  const fx = Math.sin(a.uhol), fz = Math.cos(a.uhol);
  const u = dx * fx + dz * fz, w = dx * fz - dz * fx;
  // menšie vozidlo (kolobežka) môže mať vlastné rozmery
  return Math.abs(u) < (a.polDlzka ?? POL_DLZKA) + 0.35 && Math.abs(w) < (a.polSirka ?? POL_SIRKA) + 0.3;
}

/** Chodec odletí od auta. */
export function zraz(c, a, hra) {
  const v = Math.hypot(a.vx, a.vz);
  const sx = a.vx / v, sz = a.vz / v;
  // bokom od osi auta (kto bol na kraji, odletí viac nabok)
  const fx = Math.sin(a.uhol), fz = Math.cos(a.uhol);
  const w = (c.x - a.pozicia.x) * fz - (c.z - a.pozicia.z) * fx;
  const bok = Math.sign(w || Math.random() - 0.5) * (0.5 + Math.random() * 0.6);
  const vx = a.vx * (0.95 + Math.random() * 0.25) + fz * bok * v * 0.25;
  const vz = a.vz * (0.95 + Math.random() * 0.25) - fx * bok * v * 0.25;
  c.zrazeny = {
    faza: 'let', cas: 0, lezi: 0,
    vx, vz, vy: 2.2 + v * 0.22 + Math.random() * 1.5,
    y: c.y,
    // prevracanie okolo osi kolmej na let (dopredu cez hlavu), mierne aj do strany
    os: new THREE.Vector3(vz, 0, -vx).normalize(),
    uhol: 0, rot: (5 + v * 0.35) * (Math.random() < 0.8 ? 1 : -1),
  };
  c.pauza = 0; c.rych = 0; c.navrat = false;
  // auto stratí trochu rýchlosti
  a.vx *= 0.9; a.vz *= 0.9;
  hra.posli('naraz', { auto: a, sila: Math.min(8, v * 0.35), chodec: true, nx: -sx, nz: -sz, x: c.x, z: c.z });
  hra.posli('zrazeny-chodec', { x: c.x, z: c.z, rychlost: v });
}

/** Let, dopad, ležanie, vstávanie. jeDom(x, z) = je tam dom (nedá sa preletieť). */
export function pohybZrazeneho(c, dt, hra, jeDom) {
  const z = c.zrazeny;
  z.cas += dt;
  c.rych = 0;
  const zem = hra.mapa.vyska(c.x, c.z);
  if (z.faza === 'let' || z.faza === 'smyk') {
    const nx = c.x + z.vx * dt, nz = c.z + z.vz * dt;
    if (jeDom(nx, nz)) { z.vx *= -0.15; z.vz *= -0.15; } // náraz do steny
    else { c.x = nx; c.z = nz; }
    if (z.faza === 'let') {
      z.vy -= 9.81 * dt;
      z.y += z.vy * dt;
      z.uhol += z.rot * dt;
      if (z.y <= zem) {
        z.y = zem;
        if (z.vy < -3.5) {
          // odraz od zeme
          z.vy = -z.vy * 0.28; z.vx *= 0.55; z.vz *= 0.55; z.rot *= 0.45;
        } else {
          z.vy = 0; z.faza = 'smyk';
        }
      }
    } else {
      // šmyk po zemi, trenie; telo sa doklopí na chrbát alebo na brucho
      z.y = zem;
      const trenie = Math.exp(-dt * 5);
      z.vx *= trenie; z.vz *= trenie;
      const ciel = Math.round((z.uhol - Math.PI / 2) / Math.PI) * Math.PI + Math.PI / 2;
      z.uhol += (ciel - z.uhol) * Math.min(1, dt * 8);
      if (Math.hypot(z.vx, z.vz) < 0.15) { z.faza = 'lezi'; z.ciel = ciel; }
    }
  } else if (z.faza === 'lezi') {
    z.y = zem;
    z.uhol += (z.ciel - z.uhol) * Math.min(1, dt * 8);
    z.lezi += dt;
    if (z.lezi > LEZI) { z.faza = 'vstava'; z.zac = z.uhol; z.t = 0; }
  } else if (z.faza === 'vstava') {
    z.y = zem;
    z.t += dt / 1.1;
    const t = Math.min(1, z.t);
    z.uhol = z.zac * (1 - t * t * (3 - 2 * t));
    if (t >= 1) {
      c.zrazeny = null;
      c.navrat = true;
      c.y = zem;
    }
  }
}

/** Matica zrazeného chodca (model má počiatok pri nohách – otáča sa okolo stredu tela). */
export function maticaZrazeneho(c, mierka, out) {
  const z = c.zrazeny;
  _qy.setFromAxisAngle(_y, c.uhol);
  _q.setFromAxisAngle(_os.copy(z.os), z.uhol).multiply(_qy);
  // stred tela: vo výške 0,9 m, keď stojí; ležiaci asi 0,2 m nad zemou
  const lezi = Math.abs(Math.sin(z.uhol));
  const vyskaStredu = (0.9 - 0.7 * lezi) * mierka;
  out.compose(_p.set(c.x, z.y + vyskaStredu, c.z), _q, _s.set(mierka, mierka, mierka));
  out.multiply(_t.makeTranslation(0, -0.9, 0));
  return out;
}
