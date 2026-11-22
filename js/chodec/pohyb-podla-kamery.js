// Chôdza vzhľadom na kameru (PC): W = dopredu tam, kam sa pozerá kamera, S = ku kamere,
// A/D = úkrok doľava/doprava. Postava sa plynulo natočí do smeru pohybu.
//
// Pohyb ako u človeka (issue #96): rozbeh a brzdenie postupne (~0,25 s na plnú rýchlosť), pri obrátke
// do protismeru postava najprv zabrzdí; otáčanie najviac ~540 °/s; v zákrute sa mierne nakloní dovnútra
// a pri rozbehu dopredu (h.naklon, h.predklon – kreslí hrac.js).

const ROZBEH = 0.25;        // s – z 0 na plnú rýchlosť
const BRZDENIE = 0.2;       // s – z plnej rýchlosti na 0
const OTACANIE = 14;        // 1/s – ako rýchlo sa postava natočí do smeru pohybu
const MAX_OTACANIE = 9.4;   // rad/s (~540 °/s)
const MAX_NAKLON = 0.14;    // rad (~8°) – náklon do zákruty
const MAX_PREDKLON = 0.07;  // rad (~4°) – predklon pri rozbehu, záklon pri brzdení
const PLYNULOST_NAKLONU = 8; // 1/s

/**
 * Posunie hráča h podľa vstupu p = { x, y } (−1…1) a smeru kamery `smer` (rad, 0 = na juh).
 * Mení h.pozicia (x, z), h.uhol, h.rychlost (veľkosť rýchlosti), h.vx / h.vz a h.naklon / h.predklon.
 */
export function pohybPodlaKamery(h, p, maxV, dt, smer) {
  if (dt <= 0) return;
  // dopredu a doprava od smeru pohľadu (x = východ, z = juh)
  const fx = Math.sin(smer), fz = Math.cos(smer);
  const rx = -fz, rz = fx;
  let dx = fx * p.y + rx * p.x;
  let dz = fz * p.y + rz * p.x;
  const d = Math.hypot(dx, dz);
  if (d > 1) { dx /= d; dz /= d; }

  // rýchlosť sa blíži k cieľovej najviac o zrýchlenie × dt (vektorovo – obrátka ide cez zastavenie)
  const vx0 = h.vx ?? 0, vz0 = h.vz ?? 0;
  const cx = dx * maxV, cz = dz * maxV;
  let ex = cx - vx0, ez = cz - vz0;
  const e = Math.hypot(ex, ez);
  // brzdí sa (bez vstupu alebo proti smeru pohybu) rýchlejšie, ako sa rozbieha
  const brzdi = d < 0.05 || cx * vx0 + cz * vz0 < 0;
  const a = Math.max(maxV, 2) / (brzdi ? BRZDENIE : ROZBEH);
  if (e > a * dt) { ex *= (a * dt) / e; ez *= (a * dt) / e; }
  h.vx = vx0 + ex;
  h.vz = vz0 + ez;
  h.pozicia.x += h.vx * dt;
  h.pozicia.z += h.vz * dt;
  const v0 = h.rychlost ?? 0;
  h.rychlost = Math.hypot(h.vx, h.vz);

  // natáčanie do smeru pohybu, najviac MAX_OTACANIE
  let omega = 0;
  if (d > 0.05) {
    let r = Math.atan2(dx, dz) - h.uhol;
    r = Math.atan2(Math.sin(r), Math.cos(r));
    let du = r * Math.min(1, dt * OTACANIE);
    du = Math.max(-MAX_OTACANIE * dt, Math.min(MAX_OTACANIE * dt, du));
    h.uhol += du;
    omega = du / dt;
  }
  // náklon do zákruty ~ dostredivé zrýchlenie (v · ω / g), predklon ~ zrýchlenie dopredu
  const cielNaklon = Math.max(-MAX_NAKLON, Math.min(MAX_NAKLON, -Math.atan(h.rychlost * omega / 9.81) * 0.45));
  const cielPredklon = Math.max(-MAX_PREDKLON, Math.min(MAX_PREDKLON, ((h.rychlost - v0) / dt) * 0.006));
  const k = Math.min(1, dt * PLYNULOST_NAKLONU);
  h.naklon = (h.naklon ?? 0) + (cielNaklon - (h.naklon ?? 0)) * k;
  h.predklon = (h.predklon ?? 0) + (cielPredklon - (h.predklon ?? 0)) * k;
}

/** Zastaví hráča (napr. po nastúpení do auta), aby po vystúpení „nedobiehal“. */
export function zastavPohyb(h) {
  h.vx = 0;
  h.vz = 0;
  h.rychlost = 0;
  h.naklon = 0;
  h.predklon = 0;
}
