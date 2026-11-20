// Nastupovanie a vystupovanie z auta s animáciou realistickej postavy:
//   E pri aute → Ďoďo dôjde k dverám vodiča (ľavá strana auta), animácia „nastup_auto“, potom šoféruje.
//   E v aute   → auto zabrzdí, animácia „vystup_auto“, Ďoďo ostane stáť pri dverách.
// Ak postava animácie nemá (náhradný model) alebo pri dverách nie je miesto, hrac.js nastúpi/vystúpi hneď.
//
// Stav prebiehajúcej akcie je v hra.hrac.akcia = { typ, auto, cas }:
//   'k_autu'  – ide k dverám (dá sa zrušiť ďalším E)
//   'nastup'  – nastupuje (animácia)
//   'brzdi'   – sedí v aute, ktoré brzdí pred vystúpením
//   'vystup'  – vystupuje (animácia)

import * as THREE from 'three';
import { KONFIG } from '../config.js';

const K = KONFIG.HRAC;

// Súradnice v aute: x = doľava (strana vodiča), z = dopredu. Auto má predok na +z.
const DVERE = { x: 1.15, z: 0 };   // kde postava stojí pred nastúpením / po vystúpení
const SEDADLO_X = 0.74;             // kam sa posunie koreň postavy (animácia posunie panvu ešte o 0,32 m dnu)
const ROH_X = 1.3, ROH_Z = 2.75;    // obchádzanie auta cez roh, keď hráč stojí na druhej strane
const MAX_CESTA = 5;                // s – keď k dverám nedôjde (auto sa hýbe…), nastúpi hneď
const MAX_BRZDENIE = 3;             // s

const hladko = (x) => { const t = THREE.MathUtils.clamp(x, 0, 1); return t * t * (3 - 2 * t); };
// koľko je postava „dnu“ (0 = pri dverách, 1 = na sedadle) v čase u animácie nastupovania (rovnako ako v animacie.py)
const dnu = (u) => hladko((u - 0.3) / 0.6);

/** Bod v súradniciach auta → svet (x, z). */
function doSveta(auto, lx, lz) {
  const c = Math.cos(auto.uhol), s = Math.sin(auto.uhol);
  return { x: auto.pozicia.x + lx * c + lz * s, z: auto.pozicia.z - lx * s + lz * c };
}

/** Bod vo svete → súradnice auta. */
function doAuta(auto, x, z) {
  const dx = x - auto.pozicia.x, dz = z - auto.pozicia.z;
  const c = Math.cos(auto.uhol), s = Math.sin(auto.uhol);
  return { x: dx * c - dz * s, z: dx * s + dz * c };
}

/** Ďalší bod cesty k dverám vodiča (v súradniciach auta) – auto sa obchádza cez roh. */
function dalsiBod(l) {
  if (l.x >= 0.95) return DVERE;                                          // ľavá strana → rovno k dverám
  const smer = l.z >= DVERE.z ? 1 : -1;
  if (Math.abs(l.z) >= ROH_Z - 0.2) return { x: ROH_X, z: smer * ROH_Z };  // pred/za autom → na ľavý roh
  return { x: -ROH_X, z: smer * ROH_Z };                                   // pravá strana → na pravý roh
}

function maAnimacie(h) {
  const a = h.mesh.userData.animacie;
  return !!(a?.ma('nastup_auto') && a.ma('vystup_auto'));
}

function trvanie(h, meno) {
  return h.mesh.userData.animacie.akcie[meno].getClip().duration;
}

function dvereVolne(hra, auto) {
  const d = doSveta(auto, DVERE.x, DVERE.z);
  return hra.mapa.kolizie.jeVolne(d.x, d.z, K.POLOMER * 0.8) && !hra.mapa.jeVoVode(d.x, d.z);
}

/** Postaví postavu na miesto v aute (lx, lz) otočenú dopredu. */
function polozVAute(h, auto, lx, lz) {
  const p = doSveta(auto, lx, lz);
  h.pozicia.set(p.x, auto.pozicia.y, p.z);
  h.uhol = auto.uhol;
}

function zastavAuto(auto) {
  const v = auto.rychlostDopredu;
  auto.ovladanie = { plyn: Math.abs(v) > 0.5 ? -Math.sign(v) : 0, zatacanie: 0, rucna: Math.abs(v) <= 0.5 };
}

/** Začne nastupovanie s animáciou. Vráti false, ak to nejde (volajúci nastúpi hneď). */
export function zacniNastup(hra, auto) {
  const h = hra.hrac;
  if (!maAnimacie(h) || !dvereVolne(hra, auto)) return false;
  auto.vodic = 'hrac'; // auto je rezervované – nikto iný doň nenastúpi
  h.akcia = { typ: 'k_autu', auto, cas: 0 };
  return true;
}

/** Začne vystupovanie s animáciou. Vráti false, ak to nejde (volajúci vystúpi hneď). */
export function zacniVystup(hra) {
  const h = hra.hrac;
  const auto = hra.stav.auto;
  if (!auto || !maAnimacie(h) || !dvereVolne(hra, auto)) return false;
  // riadenie preberá nastupovanie.js (auto ostáva rezervované, kým hráč nevystúpi)
  hra.stav.auto = null;
  hra.stav.rezim = 'pesi';
  h.akcia = { typ: 'brzdi', auto, cas: 0 };
  hra.posli('vystupil', auto);
  return true;
}

/** Zruší prebiehajúcu akciu (napr. keď hráča z auta vytiahne iný modul). */
export function zrusAkciu(hra) {
  const h = hra.hrac;
  if (!h?.akcia) return;
  h.akcia = null;
  h.mesh.userData.nastavAnimaciu?.(null);
}

/** Každý snímok počas akcie – hýbe postavou, autom a animáciou. */
export function aktualizujAkciu(dt, hra) {
  const h = hra.hrac;
  const a = h.akcia;
  const auto = a.auto;
  const ud = h.mesh.userData;
  a.cas += dt;

  // auto zmizlo alebo sa zničilo → koniec, postava ostane stáť
  if (!hra.auta.includes(auto) || auto.znicene) {
    if (a.typ === 'brzdi' || a.typ === 'vystup') h.mesh.visible = true;
    if (auto.vodic === 'hrac' && hra.stav.auto !== auto) auto.vodic = null;
    zrusAkciu(hra);
    return;
  }

  let rychlost = 0;
  if (a.typ === 'k_autu') {
    zastavAuto(auto);
    if (hra.vstup.stlacil('akcia')) { auto.vodic = null; zrusAkciu(hra); return; } // rozmyslel si to
    const l = doAuta(auto, h.pozicia.x, h.pozicia.z);
    const ciel = dalsiBod(l);
    const p = doSveta(auto, ciel.x, ciel.z);
    const dx = p.x - h.pozicia.x, dz = p.z - h.pozicia.z;
    const d = Math.hypot(dx, dz);
    const kDverom = ciel === DVERE;
    if ((kDverom && d < 0.06) || a.cas > MAX_CESTA) {
      polozVAute(h, auto, DVERE.x, DVERE.z);
      a.typ = 'nastup';
      a.cas = 0;
      a.trvanie = trvanie(h, 'nastup_auto');
      ud.nastavAnimaciu('nastup_auto', 0.2);
    } else {
      // k autu poklusom, pri dverách spomalí; posledný kúsok sa otočí po smere auta
      const vMax = Math.min(K.BEH * 0.6, 4.5);
      rychlost = kDverom ? THREE.MathUtils.clamp(d * 3, 0.9, vMax) : vMax;
      const krok = Math.min(d, rychlost * dt);
      h.pozicia.x += (dx / d) * krok;
      h.pozicia.z += (dz / d) * krok;
      h.pozicia.y = hra.mapa.vyska(h.pozicia.x, h.pozicia.z);
      const cielUhol = kDverom && d < 0.5 ? auto.uhol : Math.atan2(dx, dz);
      let r = cielUhol - h.uhol;
      r = Math.atan2(Math.sin(r), Math.cos(r));
      h.uhol += r * Math.min(1, dt * (kDverom && d < 0.5 ? 14 : 10));
    }
  } else if (a.typ === 'nastup') {
    zastavAuto(auto);
    const u = Math.min(1, a.cas / a.trvanie);
    polozVAute(h, auto, THREE.MathUtils.lerp(DVERE.x, SEDADLO_X, dnu(u)), DVERE.z);
    if (u >= 1) {
      hra.hrac.nastup(auto); // sedí – odteraz šoféruje (hrac.js skryje postavu a pošle 'nastupil')
      return;
    }
  } else if (a.typ === 'brzdi') {
    zastavAuto(auto);
    h.pozicia.copy(auto.pozicia);
    h.uhol = auto.uhol;
    if (auto.rychlostKmh < 1.5 || a.cas > MAX_BRZDENIE) {
      if (!dvereVolne(hra, auto)) { a.typ = 'vystup'; a.cas = 1e9; } // auto docúvalo k múru → hneď
      else {
        a.typ = 'vystup';
        a.cas = 0;
        a.trvanie = trvanie(h, 'vystup_auto');
        ud.nastavAnimaciu('vystup_auto', 0);
        h.mesh.visible = true;
      }
    }
  } else if (a.typ === 'vystup') {
    zastavAuto(auto);
    const u = a.trvanie ? Math.min(1, a.cas / a.trvanie) : 1;
    polozVAute(h, auto, THREE.MathUtils.lerp(DVERE.x, SEDADLO_X, dnu(1 - u)), DVERE.z);
    if (u >= 1) {
      polozVAute(h, auto, DVERE.x, DVERE.z);
      h.pozicia.y = hra.mapa.vyska(h.pozicia.x, h.pozicia.z);
      h.vy = 0;
      h.rychlost = 0;
      h.naZemi = true;
      h.mesh.visible = true;
      auto.vodic = null;
      zrusAkciu(hra);
    }
  }

  h.mesh.position.copy(h.pozicia);
  h.mesh.rotation.y = h.uhol;
  ud.animuj(dt, rychlost, false);
}
