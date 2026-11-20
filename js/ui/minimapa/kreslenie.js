// Skladanie pohľadu na mapu z hotových bitmáp dlaždíc + značky (hráč, zastávky, ciele, sever).
// Spoločné pre minimapu (otáča sa podľa kamery) aj veľkú mapu (sever hore).

import { FARBY } from './farby.js';
import { DLAZDICA, rozlozKluc } from './bitmapy.js';

/**
 * Pohľad: { w, h, dpr, stredX, stredZ, otocenie, mierka, cx, cy }
 *   mierka – CSS pixely na meter, otocenie – rad (0 = sever hore),
 *   (cx, cy) – kde na plátne leží bod (stredX, stredZ).
 */
export function vytvorPohlad(p) {
  const cos = Math.cos(p.otocenie), sin = Math.sin(p.otocenie);
  return {
    ...p, cos, sin,
    naObrazovku(x, z) {
      const dx = (x - p.stredX) * p.mierka, dz = (z - p.stredZ) * p.mierka;
      return [p.cx + dx * cos - dz * sin, p.cy + dx * sin + dz * cos];
    },
    /** Uhol smeru (dx, dz) vo svete na obrazovke. */
    uhol(dx, dz) { return Math.atan2(dz, dx) + p.otocenie; },
  };
}

/** Podklad mapy: najprv hrubé bitmapy, nad ne jemné. */
export function kresliPodklad(ctx, pohlad, bitmapy) {
  const { w, h, dpr } = pohlad;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = FARBY.zem;
  ctx.fillRect(0, 0, w, h);

  ctx.save();
  ctx.translate(pohlad.cx, pohlad.cy);
  ctx.rotate(pohlad.otocenie);
  ctx.scale(pohlad.mierka, pohlad.mierka);
  ctx.translate(-pohlad.stredX, -pohlad.stredZ);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  // polomer, ktorý pokryje celé plátno z bodu (cx, cy)
  const r = Math.hypot(Math.max(pohlad.cx, w - pohlad.cx), Math.max(pohlad.cy, h - pohlad.cy)) / pohlad.mierka;
  const dosah = r + DLAZDICA * 0.75;
  const jemna = pohlad.mierka * dpr > 0.45;   // pri veľkom oddialení stačia hrubé
  for (const [mapa, pouzi] of [[bitmapy.hrube, true], [bitmapy.jemne, jemna]]) {
    if (!pouzi) continue;
    for (const [kluc, b] of mapa) {
      const [i, j] = rozlozKluc(kluc);
      if (Math.hypot((i + 0.5) * DLAZDICA - pohlad.stredX, (j + 0.5) * DLAZDICA - pohlad.stredZ) > dosah) continue;
      ctx.drawImage(b.platno, b.x0, b.z0, b.m, b.m);
    }
  }
  ctx.restore();
}

/** Šípka hráča v bode (x, y) natočená na uhol (rad, 0 = doprava na obrazovke). */
export function kresliHraca(ctx, x, y, uhol, velkost = 9, farba = FARBY.hrac) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(uhol + Math.PI / 2);   // šípka je kreslená špičkou hore
  ctx.beginPath();
  ctx.moveTo(0, -velkost);
  ctx.lineTo(velkost * 0.72, velkost * 0.8);
  ctx.lineTo(0, velkost * 0.38);
  ctx.lineTo(-velkost * 0.72, velkost * 0.8);
  ctx.closePath();
  ctx.lineJoin = 'round';
  ctx.lineWidth = 3;
  ctx.strokeStyle = FARBY.hracOkraj;
  ctx.stroke();
  ctx.fillStyle = farba;
  ctx.fill();
  ctx.restore();
}

/** Písmeno S (sever) na okraji minimapy. */
export function kresliSever(ctx, pohlad, okraj = 13) {
  const { w, h } = pohlad;
  // smer na sever (0, -1) vo svete → na obrazovke
  const u = pohlad.uhol(0, -1);
  const [x, y] = naOkraj(w / 2, h / 2, Math.cos(u), Math.sin(u), w, h, okraj);
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, 9, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(20, 22, 25, 0.85)';
  ctx.fill();
  ctx.fillStyle = FARBY.sever;
  ctx.font = '700 11px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('S', x, y + 0.5);
  ctx.restore();
}

/** Zastávky MHD ako malé štvorčeky (len v blízkom pohľade). */
export function kresliZastavky(ctx, pohlad, zastavky) {
  const { w, h } = pohlad;
  const velkost = pohlad.mierka > 1.4 ? 6 : 4.5;
  ctx.save();
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = FARBY.hracOkraj;
  for (const z of zastavky) {
    const [x, y] = pohlad.naObrazovku(z.x, z.z);
    if (x < -8 || y < -8 || x > w + 8 || y > h + 8) continue;
    ctx.fillStyle = z.elektricka ? FARBY.zastavkaElektricka : FARBY.zastavkaIna;
    ctx.beginPath();
    ctx.rect(x - velkost / 2, y - velkost / 2, velkost, velkost);
    ctx.fill();
    ctx.stroke();
  }
  ctx.restore();
}

/**
 * Značky (ciele misií a pod.). Značka mimo pohľadu sa pritlačí k okraju ako šípka.
 * znacky: iterovateľné { x, z, farba?, popis? }
 */
export function kresliZnacky(ctx, pohlad, znacky, odkial, okraj = 12, popisy = false) {
  const { w, h } = pohlad;
  ctx.save();
  for (const zn of znacky) {
    const [sx, sy] = pohlad.naObrazovku(zn.x, zn.z);
    const farba = zn.farba ?? FARBY.ciel;
    const vnutri = sx > okraj && sy > okraj && sx < w - okraj && sy < h - okraj;
    if (vnutri) {
      ctx.beginPath();
      ctx.arc(sx, sy, 7, 0, Math.PI * 2);
      ctx.fillStyle = farba;
      ctx.fill();
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = FARBY.hracOkraj;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(sx, sy, 2.5, 0, Math.PI * 2);
      ctx.fillStyle = FARBY.hracOkraj;
      ctx.fill();
      if (popisy && zn.popis) popis(ctx, zn.popis, sx, sy - 14);
    } else {
      const [ox, oy] = odkial;
      const u = Math.atan2(sy - oy, sx - ox);
      const [x, y] = naOkraj(ox, oy, Math.cos(u), Math.sin(u), w, h, okraj);
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(u);
      ctx.beginPath();
      ctx.moveTo(8, 0);
      ctx.lineTo(-5, -6);
      ctx.lineTo(-5, 6);
      ctx.closePath();
      ctx.fillStyle = farba;
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = FARBY.hracOkraj;
      ctx.stroke();
      ctx.restore();
    }
  }
  ctx.restore();
}

/** Názvy miest (veľká mapa). */
export function kresliNazvy(ctx, pohlad, miesta) {
  const { w, h } = pohlad;
  ctx.save();
  ctx.font = '600 13px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const obsadene = [];
  for (const m of miesta) {
    const [x, y] = pohlad.naObrazovku(m.x, m.z);
    if (x < 0 || y < 0 || x > w || y > h) continue;
    const sirka = ctx.measureText(m.nazov).width;
    const box = [x - sirka / 2 - 3, y - 22, x + sirka / 2 + 3, y + 4];
    if (obsadene.some((b) => box[0] < b[2] && box[2] > b[0] && box[1] < b[3] && box[3] > b[1])) continue;
    obsadene.push(box);
    ctx.beginPath();
    ctx.arc(x, y, 3, 0, Math.PI * 2);
    ctx.fillStyle = '#f5f1e6';
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = FARBY.hracOkraj;
    ctx.stroke();
    popis(ctx, m.nazov, x, y - 13);
  }
  ctx.restore();
}

function popis(ctx, text, x, y) {
  ctx.lineWidth = 3.5;
  ctx.strokeStyle = 'rgba(15, 17, 20, 0.9)';
  ctx.lineJoin = 'round';
  ctx.strokeText(text, x, y);
  ctx.fillStyle = '#f5f1e6';
  ctx.fillText(text, x, y);
}

/** Bod na okraji obdĺžnika (s odsadením) v smere (dx, dy) z bodu (ox, oy). */
function naOkraj(ox, oy, dx, dy, w, h, okraj) {
  let t = Infinity;
  if (dx > 1e-6) t = Math.min(t, (w - okraj - ox) / dx);
  if (dx < -1e-6) t = Math.min(t, (okraj - ox) / dx);
  if (dy > 1e-6) t = Math.min(t, (h - okraj - oy) / dy);
  if (dy < -1e-6) t = Math.min(t, (okraj - oy) / dy);
  return [ox + dx * t, oy + dy * t];
}
