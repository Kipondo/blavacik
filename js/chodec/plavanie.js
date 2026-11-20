// Hráč vo vode: pád do Dunaja, plávanie, vyliezanie na breh. Volá ho hrac.js.
// Hĺbku vody berieme z výškopisu: hladina (hra.mapa.hladina) mínus dno (hra.mapa.vyska).

import { KONFIG } from '../config.js';

const K = KONFIG.HRAC;
const HLBKA_PLAVANIA = 1.3;   // od tejto hĺbky sa pláva, v plytšej vode sa brodí
const PONOR_STOJ = 1.5;       // o koľko je postava (chodidlá) pod hladinou pri šliapaní vody
const PONOR_PLAVANIE = 0.98;  // pri plávaní (telo leží, chrbát tesne pod hladinou)
const VYLEZ_MAX = 0.6;        // na breh sa dá vyliezť, ak je najviac takto nad hladinou

export function hladina(hra, x, z) {
  return hra.mapa.hladina ? hra.mapa.hladina(x, z) : KONFIG.HLADINA;
}

/** Je na mieste dosť hlboká voda na plávanie? */
export function hlbokaVoda(hra, x, z) {
  return hra.mapa.jeVoVode(x, z) && hladina(hra, x, z) - hra.mapa.vyska(x, z) > HLBKA_PLAVANIA;
}

/** Maximálna rýchlosť pohybu hráča (vo vode pomalšie). */
export function maxRychlost(h, beh) {
  if (h.pliva) return beh ? K.PLAVANIE_RYCHLO : K.PLAVANIE;
  return beh ? K.BEH : K.CHODZA;
}

/**
 * Smie hráč prejsť zo starej polohy na novú? Vo vode sa dá vyliezť len na nízky breh,
 * na suchu sa do vody dá vojsť (z nábrežia do nej spadne).
 */
export function smiePrejst(hra, h, x, z) {
  if (!h.pliva) return true;
  if (hra.mapa.jeVoVode(x, z)) return true;
  const nad = hra.mapa.vyska(x, z) - hladina(hra, x, z);
  if (nad <= VYLEZ_MAX) return true;
  if (!h._hlaskaMur || performance.now() - h._hlaskaMur > 4000) {
    h._hlaskaMur = performance.now();
    hra.ui?.sprava?.('Tu je múr – plávaj k schodom alebo na nízky breh.', 2.5);
  }
  return false;
}

/**
 * Výška a stav vo vode (volá sa namiesto gravitácie, keď je hráč nad vodou).
 * Vráti true, ak sa výšku postavy postaral (hráč pláva).
 */
export function aktualizujVodu(dt, hra, h) {
  const x = h.pozicia.x, z = h.pozicia.z;
  const hl = hladina(hra, x, z);
  const hlboka = hlbokaVoda(hra, x, z);
  if (!h.pliva) {
    // pád alebo vstup do hlbokej vody: keď sa telo ponorí, začne plávať
    if (hlboka && h.pozicia.y <= hl - PONOR_PLAVANIE) {
      const pad = h.vy < -6;
      h.pliva = true;
      h.vy = 0;
      hra.posli('doVody', { pad });
      hra.ui?.sprava?.(pad ? 'Žblnk! Ďoďo je v Dunaji. Aspoň že vie plávať.' : 'Ďoďo pláva.', 2.5);
    } else {
      return false;
    }
  }
  if (!hlboka) {
    // doplával na plytčinu alebo breh – postaví sa
    h.pliva = false;
    h.naZemi = true;
    h.pozicia.y = Math.max(h.pozicia.y, hra.mapa.vyska(x, z));
    hra.posli('zVody');
    return false;
  }
  // pri plávaní leží telo vyššie ako pri šliapaní vody; plynulý prechod podľa rýchlosti
  const t = Math.min(1, Math.abs(h.rychlost) / 1.0);
  const ciel = hl - (PONOR_STOJ + (PONOR_PLAVANIE - PONOR_STOJ) * t);
  h.pozicia.y += (ciel - h.pozicia.y) * Math.min(1, dt * 4);
  h.vy = 0;
  h.naZemi = false;
  return true;
}
