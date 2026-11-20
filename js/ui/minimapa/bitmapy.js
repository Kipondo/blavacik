// Bitmapy dlaždíc pre minimapu. Každá načítaná dlaždica mesta sa raz nakreslí zhora
// (sever hore) do vlastného plátna a minimapa potom každý snímok len skladá hotové obrázky.
// Kreslí sa po vrstvách v malých krokoch (časový rozpočet na snímok), aby to nebrzdilo hru.
//
// Dve mierky: jemná (blízke dlaždice, pre minimapu) a hrubá (ďalšie okolie, pre veľkú mapu).

import { FARBY, POKRYVKA, stylCesty, stylChodnika } from './farby.js';

export const DLAZDICA = 500;
const OKRAJ = 40;            // m navyše okolo dlaždice – budovy presahujúce hranu sa neorežú

const JEMNA = { s: 1.25, polomer: 800, max: 16, podrobne: true };
const HRUBA = { s: 0.4, polomer: 2200, max: 90, podrobne: false };

export class BitmapyDlazdic {
  /** globalnaVoda: polygóny riek a jazier z index.json (kreslia sa do každej dlaždice, ktorej sa dotýkajú). */
  constructor(globalnaVoda = []) {
    this.voda = globalnaVoda.map((v) => ({ body: v.body, ...obal(v.body) }));
    this.data = new Map();      // kluc → dáta dlaždice (len kým je dlaždica načítaná)
    this.jemne = new Map();     // kluc → { platno, x0, z0, m }
    this.hrube = new Map();
    this.uloha = null;          // práve kreslená { kluc, mierka, ciel, gen }
  }

  pridajData(kluc, data) { if (data) this.data.set(kluc, data); }
  odstranData(kluc) { this.data.delete(kluc); }

  /** Dokreslí chýbajúce bitmapy (najbližšie najskôr) a zahodí vzdialené. */
  update(x, z, rozpocetMs = 3) {
    const koniec = performance.now() + rozpocetMs;
    while (performance.now() < koniec) {
      if (!this.uloha) this.uloha = this._dalsiaUloha(x, z);
      if (!this.uloha) break;
      const { gen, kluc, ciel, hotovo } = this.uloha;
      if (gen.next().done) {
        ciel.set(kluc, hotovo);
        this.uloha = null;
      }
    }
    this._uprac(this.jemne, JEMNA, x, z);
    this._uprac(this.hrube, HRUBA, x, z);
  }

  _dalsiaUloha(x, z) {
    for (const [mierka, ciel] of [[JEMNA, this.jemne], [HRUBA, this.hrube]]) {
      let naj = null, min = mierka.polomer;
      for (const [kluc, data] of this.data) {
        if (ciel.has(kluc)) continue;
        const d = vzdialenostDlazdice(kluc, x, z);
        if (d < min) { min = d; naj = [kluc, data]; }
      }
      if (!naj) continue;
      const [kluc, data] = naj;
      const [i, j] = rozlozKluc(kluc);
      const x0 = i * DLAZDICA - OKRAJ, z0 = j * DLAZDICA - OKRAJ, m = DLAZDICA + 2 * OKRAJ;
      const platno = document.createElement('canvas');
      platno.width = platno.height = Math.round(m * mierka.s);
      const hotovo = { platno, x0, z0, m };
      const gen = kresliDlazdicu(platno.getContext('2d'), data, this.voda, x0, z0, m, mierka);
      return { kluc, ciel, gen, hotovo };
    }
    return null;
  }

  _uprac(mapa, mierka, x, z) {
    if (mapa.size <= mierka.max * 0.75) return;
    const zoznam = [...mapa.keys()].map((k) => [k, vzdialenostDlazdice(k, x, z)]).sort((a, b) => b[1] - a[1]);
    for (const [k, d] of zoznam) {
      if (mapa.size <= mierka.max && d < mierka.polomer + 300) break;
      mapa.delete(k);
    }
  }
}

export function rozlozKluc(kluc) {
  const [i, j] = kluc.split('_').map(Number);
  return [i, j];
}

function vzdialenostDlazdice(kluc, x, z) {
  const [i, j] = rozlozKluc(kluc);
  return Math.hypot((i + 0.5) * DLAZDICA - x, (j + 0.5) * DLAZDICA - z);
}

function obal(body) {
  let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
  for (const [x, z] of body) {
    if (x < minX) minX = x; if (x > maxX) maxX = x;
    if (z < minZ) minZ = z; if (z > maxZ) maxZ = z;
  }
  return { minX, maxX, minZ, maxZ };
}

/** Kreslí dlaždicu po vrstvách; po každej vrstve vráti riadenie (yield). */
function* kresliDlazdicu(ctx, data, globalnaVoda, x0, z0, m, { s, podrobne }) {
  ctx.setTransform(s, 0, 0, s, -x0 * s, -z0 * s);   // ďalej kreslíme priamo v metroch sveta
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const px = 1 / s;                                  // jeden pixel v metroch

  // 1. pokrývka zeme (tráva, les, námestia…)
  const pokryvka = data.pokryvka ?? [];
  for (const [k, farba] of POKRYVKA) {
    ctx.beginPath();
    let nieco = false;
    for (const p of pokryvka) if (p.k === k) { polygon(ctx, p.body); nieco = true; }
    if (nieco) { ctx.fillStyle = farba; ctx.fill(); }
  }
  yield;

  // 2. voda – rieky a jazerá z indexu + malé vodné plochy dlaždice
  ctx.beginPath();
  for (const v of globalnaVoda) {
    if (v.maxX < x0 || v.minX > x0 + m || v.maxZ < z0 || v.minZ > z0 + m) continue;
    polygon(ctx, v.body);
  }
  for (const v of data.voda ?? []) polygon(ctx, v.body);
  ctx.fillStyle = FARBY.voda;
  ctx.fill();
  yield;

  // 3. železnica pod cestami
  ciary(ctx, (data.kolajnice ?? []).filter((k) => k.typ === 'zeleznica'), () => 2.2, FARBY.zeleznica, px, [5, 4]);

  // 4. chodníky a cestičky
  const chodniky = new Map();
  for (const c of data.chodniky ?? []) {
    const st = stylChodnika(c.typ);
    if (!st || (!podrobne && !st.vzdy)) continue;
    const kluc = `${st.farba}|${st.prerusovana ? 1 : 0}`;
    if (!chodniky.has(kluc)) chodniky.set(kluc, { st, zoznam: [] });
    chodniky.get(kluc).zoznam.push(c);
  }
  for (const { st, zoznam } of chodniky.values()) {
    ciary(ctx, zoznam, (c) => Math.max(c.sirka ?? 2, 1.2), st.farba, px, st.prerusovana ? [3, 2.5] : null);
  }
  yield;

  // 5. cesty (bez mostov): najprv okraje všetkých, potom výplne od vedľajších po hlavné
  const cesty = (data.cesty ?? []).filter((c) => !c.most);
  kresliCesty(ctx, cesty, px, podrobne);
  yield;

  // 6. budovy (s dvormi)
  const budovy = data.budovy ?? [];
  if (budovy.length) {
    ctx.beginPath();
    for (const b of budovy) {
      polygon(ctx, b.body);
      for (const d of b.diery ?? []) polygon(ctx, d, -1);
    }
    ctx.fillStyle = FARBY.budova;
    ctx.fill();
    if (podrobne) {
      ctx.strokeStyle = FARBY.budovaOkraj;
      ctx.lineWidth = px;
      ctx.stroke();
    }
  }
  yield;

  // 7. električkové koľaje a mosty navrchu
  if (podrobne) ciary(ctx, (data.kolajnice ?? []).filter((k) => k.typ === 'elektricka'), () => 1.1, FARBY.elektricka, px);
  kresliCesty(ctx, (data.cesty ?? []).filter((c) => c.most), px, podrobne);
}

function kresliCesty(ctx, cesty, px, podrobne) {
  if (!cesty.length) return;
  const sirka = (c) => Math.max(c.sirka ?? 6, podrobne ? 3 : 5);
  // okraj
  const skupiny = new Map();
  for (const c of cesty) {
    const st = stylCesty(c.typ);
    if (!podrobne && st.poradie === 0) continue;   // obslužné cesty len v jemnej mierke
    const w = Math.round(sirka(c));
    const k = `${st.poradie}|${st.farba}|${w}`;
    if (!skupiny.has(k)) skupiny.set(k, { st, w, zoznam: [] });
    skupiny.get(k).zoznam.push(c);
  }
  const zoradene = [...skupiny.values()].sort((a, b) => a.st.poradie - b.st.poradie);
  for (const g of zoradene) {
    ctx.beginPath();
    for (const c of g.zoznam) ciara(ctx, c.body);
    ctx.strokeStyle = FARBY.okrajCesty;
    ctx.lineWidth = g.w + 2.2 * px;
    ctx.stroke();
  }
  for (const g of zoradene) {
    ctx.beginPath();
    for (const c of g.zoznam) ciara(ctx, c.body);
    ctx.strokeStyle = g.st.farba;
    ctx.lineWidth = Math.max(g.w, 1.2 * px);
    ctx.stroke();
  }
}

/** Čiary jednej farby, zoskupené podľa hrúbky (jedno ťahanie na skupinu). */
function ciary(ctx, zoznam, sirka, farba, px, prerusenie = null) {
  if (!zoznam.length) return;
  const podlaSirky = new Map();
  for (const c of zoznam) {
    const w = Math.max(Math.round(sirka(c) * 2) / 2, px);
    if (!podlaSirky.has(w)) podlaSirky.set(w, []);
    podlaSirky.get(w).push(c);
  }
  ctx.strokeStyle = farba;
  ctx.setLineDash(prerusenie ?? []);
  for (const [w, cast] of podlaSirky) {
    ctx.beginPath();
    for (const c of cast) ciara(ctx, c.body);
    ctx.lineWidth = w;
    ctx.stroke();
  }
  ctx.setLineDash([]);
}

/** Polygón s jednotným smerom obehu (smer -1 = diera), aby prekryvy pri výplni „nonzero“ nevytvárali diery. */
function polygon(ctx, body, smer = 1) {
  const n = body?.length ?? 0;
  if (n < 3) return;
  let a = 0;
  for (let i = 0, j = n - 1; i < n; j = i++) a += (body[j][0] - body[i][0]) * (body[j][1] + body[i][1]);
  if (a * smer >= 0) {
    ctx.moveTo(body[0][0], body[0][1]);
    for (let i = 1; i < n; i++) ctx.lineTo(body[i][0], body[i][1]);
  } else {
    ctx.moveTo(body[n - 1][0], body[n - 1][1]);
    for (let i = n - 2; i >= 0; i--) ctx.lineTo(body[i][0], body[i][1]);
  }
  ctx.closePath();
}

function ciara(ctx, body) {
  if (!body || body.length < 2) return;
  ctx.moveTo(body[0][0], body[0][1]);
  for (let i = 1; i < body.length; i++) ctx.lineTo(body[i][0], body[i][1]);
}
