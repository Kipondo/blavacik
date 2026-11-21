// Modul: minimapa v ľavom dolnom rohu a veľká mapa mesta (klávesa M).
//
// Minimapa sa otáča podľa kamery (hore = kam sa pozeráš), hráč je biela šípka.
// V aute sa podľa rýchlosti oddiali a hráč sa posunie nižšie, aby bolo vidieť viac cesty dopredu.
// Pod minimapou je názov ulice. Mapa sa kreslí z dát dlaždíc mesta (OpenStreetMap), pozri bitmapy.js.
//
// Značky pre ostatné moduly (cieľ misie, polícia…) idú cez udalosti:
//   hra.posli('znacka-mapy', { id, x, z, farba?, popis? })  – pridá značku alebo ju posunie
//   hra.posli('znacka-mapy-zrus', { id })                   – odstráni ju
// Značka mimo minimapy sa ukáže ako šípka na okraji. Na čítanie: hra.minimapa.znacky (Map id → značka).
// Klik na veľkú mapu (zameriavač) pošle hra.posli('mapa-klik', { x, z }) – miesto vo svete; mapa sa zavrie.

import { BitmapyDlazdic, DLAZDICA, rozlozKluc } from './bitmapy.js';
import {
  vytvorPohlad, kresliPodklad, kresliHraca, kresliSever, kresliZastavky, kresliZnacky, kresliNazvy,
} from './kreslenie.js';

const MIERKA_PESO = 1.05;      // CSS px na meter
const MIERKA_AUTO = [0.95, 0.46]; // pri státí → pri ~110 km/h
const MIERKA_ZASTAVKY = 0.75;  // od tejto mierky sa ukazujú zastávky MHD

export default {
  nazov: 'minimapa',
  poradie: 92,

  init(hra) {
    const index = hra.mapa?.data?.mestoIndex;
    this.bitmapy = new BitmapyDlazdic(index?.voda ?? []);
    for (const [kluc, a] of hra.mapa?.dlazdice?.aktivne ?? []) this.bitmapy.pridajData(kluc, a.data);
    hra.na('dlazdica-nacitana', ({ kluc, data }) => this.bitmapy.pridajData(kluc, data));
    hra.na('dlazdica-uvolnena', ({ kluc, nahrada }) => { if (!nahrada) this.bitmapy.odstranData(kluc); });

    this.znacky = new Map();
    hra.na('znacka-mapy', (z) => { if (z?.id != null) this.znacky.set(z.id, { ...z }); });
    hra.na('znacka-mapy-zrus', (z) => this.znacky.delete(z?.id));
    hra.minimapa = { znacky: this.znacky };

    this.mierka = MIERKA_PESO;
    this.posunHraca = 0.5;
    this.otocenie = 0;
    this.casUlice = 0;
    this.velkaMierka = 0.45;
    this.zastavky = null;
    this._smer = new hra.THREE.Vector3();

    // minimapa
    const obal = document.createElement('div');
    obal.className = 'ui-minimapa';
    obal.innerHTML = '<canvas></canvas><div class="ui-minimapa-ulica" hidden></div>';
    hra.ui.vrstva.appendChild(obal);
    this.platno = obal.querySelector('canvas');
    this.ctx = this.platno.getContext('2d', { alpha: false });
    this.ulicaEl = obal.querySelector('.ui-minimapa-ulica');
    this.obal = obal;

    // veľká mapa
    const velka = document.createElement('div');
    velka.className = 'ui-velka-mapa';
    velka.hidden = true;
    velka.innerHTML = `
      <div class="ui-velka-mapa-okno">
        <canvas></canvas>
        <div class="ui-velka-mapa-pata">
          <span><b>M</b> – zavrieť · <b>koliesko myši</b> – priblížiť / oddialiť · <b>klik</b> – presun sem</span>
          <span>© prispievatelia OpenStreetMap</span>
        </div>
      </div>`;
    hra.ui.vrstva.appendChild(velka);
    this.velka = velka;
    this.velkePlatno = velka.querySelector('canvas');
    this.velkyCtx = this.velkePlatno.getContext('2d', { alpha: false });
    window.addEventListener('wheel', (e) => {
      if (this.velka.hidden) return;
      this.velkaMierka *= Math.exp(-e.deltaY * 0.0012);
    }, { passive: true });

    // kurzor na veľkej mape: pri zamknutej myši (Pointer Lock) ho posúva pohyb myši, inak je pod šípkou;
    // klik pošle udalosť 'mapa-klik' { x, z } (napr. presun hráča – js/ladenie/teleport.js) a mapu zavrie
    this.kurzor = null;
    document.addEventListener('mousemove', (e) => {
      if (this.velka.hidden || !this.kurzor) return;
      const r = this.velkePlatno.getBoundingClientRect();
      if (document.pointerLockElement) { this.kurzor[0] += e.movementX; this.kurzor[1] += e.movementY; }
      else { this.kurzor[0] = e.clientX - r.left; this.kurzor[1] = e.clientY - r.top; }
      this.kurzor[0] = Math.max(0, Math.min(r.width, this.kurzor[0]));
      this.kurzor[1] = Math.max(0, Math.min(r.height, this.kurzor[1]));
    });
    document.addEventListener('mousedown', (e) => {
      if (this.velka.hidden || e.button !== 0 || !this.kurzor || !this.pohladVelkej) return;
      const p = this.pohladVelkej;
      const x = p.stredX + (this.kurzor[0] - p.cx) / p.mierka, z = p.stredZ + (this.kurzor[1] - p.cy) / p.mierka;
      hra.posli('mapa-klik', { x, z });
      this.velka.hidden = true;
    });
  },

  updateVzdy(dt, hra) {
    const { x, z } = hra.stav.pozicia;
    this.bitmapy.update(x, z, 3);

    if (hra.vstup.stlacil('mapa') && !hra.stav.pauza) {
      this.velka.hidden = !this.velka.hidden;
      // kurzor začína na hráčovi (stred mapy)
      if (!this.velka.hidden) this.kurzor = [this.velkePlatno.clientWidth / 2, this.velkePlatno.clientHeight / 2];
    }
    if (hra.stav.pauza && !this.velka.hidden) this.velka.hidden = true;
    this.obal.hidden = !this.velka.hidden;

    if (this.velka.hidden) this._kresliMinimapu(dt, hra);
    else this._kresliVelkuMapu(hra);

    this.casUlice -= dt;
    if (this.casUlice <= 0) {
      this.casUlice = 0.4;
      const nazov = this._nazovUlice(x, z);
      this.ulicaEl.hidden = !nazov;
      if (nazov && this.ulicaEl.textContent !== nazov) this.ulicaEl.textContent = nazov;
    }
  },

  _kresliMinimapu(dt, hra) {
    const s = hra.stav;
    const { w, h, dpr } = prisposobPlatno(this.platno);
    const k = Math.min(1, dt * 2.5);

    // mierka a posun hráča podľa rýchlosti
    const kmh = s.auto ? Math.abs(s.rychlostKmh) : 0;
    const t = Math.min(1, kmh / 110);
    const cielMierka = s.auto ? MIERKA_AUTO[0] + (MIERKA_AUTO[1] - MIERKA_AUTO[0]) * t : MIERKA_PESO;
    this.mierka += (cielMierka - this.mierka) * k;
    this.posunHraca += ((s.auto ? 0.6 + 0.06 * t : 0.55) - this.posunHraca) * k;

    // otočenie podľa smeru kamery (hore = dopredu)
    hra.kamera.getWorldDirection(this._smer);
    if (Math.hypot(this._smer.x, this._smer.z) > 0.05) {
      this.otocenie = -Math.PI / 2 - Math.atan2(this._smer.z, this._smer.x);
    }

    const pohlad = vytvorPohlad({
      w, h, dpr, stredX: s.pozicia.x, stredZ: s.pozicia.z,
      otocenie: this.otocenie, mierka: this.mierka, cx: w / 2, cy: h * this.posunHraca,
    });
    const ctx = this.ctx;
    kresliPodklad(ctx, pohlad, this.bitmapy);
    if (this.mierka >= MIERKA_ZASTAVKY) kresliZastavky(ctx, pohlad, this._zastavkyMhd(hra));
    kresliHraca(ctx, pohlad.cx, pohlad.cy, pohlad.uhol(Math.sin(s.uhol), Math.cos(s.uhol)));
    kresliZnacky(ctx, pohlad, this.znacky.values(), [pohlad.cx, pohlad.cy]);
    kresliSever(ctx, pohlad);
  },

  _kresliVelkuMapu(hra) {
    const s = hra.stav;
    const { w, h, dpr } = prisposobPlatno(this.velkePlatno);
    // najďalej toľko, kam siahajú načítané dlaždice
    const minMierka = Math.max(w, h) / 2 / 2000;
    this.velkaMierka = Math.min(3, Math.max(minMierka, this.velkaMierka));
    const pohlad = vytvorPohlad({
      w, h, dpr, stredX: s.pozicia.x, stredZ: s.pozicia.z,
      otocenie: 0, mierka: this.velkaMierka, cx: w / 2, cy: h / 2,
    });
    const ctx = this.velkyCtx;
    kresliPodklad(ctx, pohlad, this.bitmapy);
    if (this.velkaMierka >= MIERKA_ZASTAVKY) kresliZastavky(ctx, pohlad, this._zastavkyMhd(hra));
    kresliNazvy(ctx, pohlad, Object.values(hra.mapa?.miesta ?? {}).filter((m) => m?.nazov));
    kresliZnacky(ctx, pohlad, this.znacky.values(), [pohlad.cx, pohlad.cy], 14, true);
    kresliHraca(ctx, pohlad.cx, pohlad.cy, pohlad.uhol(Math.sin(s.uhol), Math.cos(s.uhol)), 11);
    this.pohladVelkej = pohlad;
    if (this.kurzor) kresliKurzor(ctx, dpr, this.kurzor[0], this.kurzor[1]);
  },

  /** Nástupištia MHD zo zverejnených dát modulu MHD (ak beží). */
  _zastavkyMhd(hra) {
    if (this.zastavky) return this.zastavky;
    const data = hra.mhd?.data?.zastavky;
    if (!data) return [];
    this.zastavky = [];
    for (const z of data) {
      for (const n of z.nastupistia ?? []) {
        if (!Number.isFinite(n.x)) continue;
        this.zastavky.push({ x: n.x, z: n.z, elektricka: (n.typy ?? []).includes('elektricka') });
      }
    }
    return this.zastavky;
  },

  /** Názov najbližšej pomenovanej cesty do 18 m (alebo null). */
  _nazovUlice(x, z) {
    let naj = null, min = 18 * 18;
    const i0 = Math.floor(x / DLAZDICA), j0 = Math.floor(z / DLAZDICA);
    for (const [kluc, data] of this.bitmapy.data) {
      const [i, j] = rozlozKluc(kluc);
      if (Math.abs(i - i0) > 1 || Math.abs(j - j0) > 1) continue;
      for (const c of data.cesty ?? []) {
        if (!c.nazov) continue;
        const b = c.body;
        for (let n = 1; n < b.length; n++) {
          const d = vzdialenost2(x, z, b[n - 1][0], b[n - 1][1], b[n][0], b[n][1]);
          if (d < min) { min = d; naj = c.nazov; }
        }
      }
    }
    return naj;
  },
};

/** Nastaví rozlíšenie plátna podľa jeho veľkosti na obrazovke. */
/** Zameriavač kurzora na veľkej mape (kam sa dá kliknúť). */
function kresliKurzor(ctx, dpr, x, y) {
  ctx.save();
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  for (const [w, farba] of [[3, 'rgba(0,0,0,0.6)'], [1.5, '#ffffff']]) {
    ctx.lineWidth = w; ctx.strokeStyle = farba;
    ctx.beginPath(); ctx.arc(x, y, 9, 0, Math.PI * 2);
    ctx.moveTo(x - 16, y); ctx.lineTo(x - 5, y); ctx.moveTo(x + 5, y); ctx.lineTo(x + 16, y);
    ctx.moveTo(x, y - 16); ctx.lineTo(x, y - 5); ctx.moveTo(x, y + 5); ctx.lineTo(x, y + 16);
    ctx.stroke();
  }
  ctx.restore();
}

function prisposobPlatno(platno) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = platno.clientWidth || 1, h = platno.clientHeight || 1;
  const pw = Math.round(w * dpr), ph = Math.round(h * dpr);
  if (platno.width !== pw || platno.height !== ph) { platno.width = pw; platno.height = ph; }
  return { w, h, dpr };
}

/** Druhá mocnina vzdialenosti bodu od úsečky. */
function vzdialenost2(px, pz, ax, az, bx, bz) {
  const dx = bx - ax, dz = bz - az;
  const l = dx * dx + dz * dz;
  let t = l > 0 ? ((px - ax) * dx + (pz - az) * dz) / l : 0;
  t = Math.max(0, Math.min(1, t));
  const qx = ax + dx * t - px, qz = az + dz * t - pz;
  return qx * qx + qz * qz;
}
