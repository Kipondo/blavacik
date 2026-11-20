// Slovenské dopravné značky kreslené do plátna (bez cudzích obrázkov).

import * as THREE from 'three';

const cache = new Map();
const S = 128;

function platno(kresli) {
  const c = document.createElement('canvas');
  c.width = c.height = S;
  const g = c.getContext('2d');
  kresli(g);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

function kruh(g, r, farba) { g.beginPath(); g.arc(S / 2, S / 2, r, 0, Math.PI * 2); g.fillStyle = farba; g.fill(); }

const KRESLENIE = {
  stop(g) {
    g.beginPath();
    for (let i = 0; i < 8; i++) {
      const u = Math.PI / 8 + (i * Math.PI) / 4;
      const x = S / 2 + Math.cos(u) * 62, y = S / 2 + Math.sin(u) * 62;
      i ? g.lineTo(x, y) : g.moveTo(x, y);
    }
    g.closePath(); g.fillStyle = '#ffffff'; g.fill();
    g.save(); g.translate(S / 2, S / 2); g.scale(0.9, 0.9); g.translate(-S / 2, -S / 2);
    g.fillStyle = '#c8102e'; g.fill(); g.restore();
    g.fillStyle = '#ffffff'; g.font = 'bold 40px Arial, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText('STOP', S / 2, S / 2 + 2);
  },
  prednost(g) {
    g.beginPath(); g.moveTo(4, 14); g.lineTo(S - 4, 14); g.lineTo(S / 2, S - 6); g.closePath();
    g.fillStyle = '#c8102e'; g.fill();
    g.beginPath(); g.moveTo(24, 26); g.lineTo(S - 24, 26); g.lineTo(S / 2, S - 30); g.closePath();
    g.fillStyle = '#ffffff'; g.fill();
  },
  'zakaz-vjazdu'(g) {
    kruh(g, 62, '#ffffff'); kruh(g, 58, '#c8102e');
    g.fillStyle = '#ffffff'; g.fillRect(20, S / 2 - 10, S - 40, 20);
  },
  jednosmerka(g) {
    g.fillStyle = '#ffffff'; g.fillRect(4, 4, S - 8, S - 8);
    g.fillStyle = '#1f5fbf'; g.fillRect(9, 9, S - 18, S - 18);
    g.fillStyle = '#ffffff';
    g.fillRect(S / 2 - 9, 44, 18, 62);
    g.beginPath(); g.moveTo(S / 2, 18); g.lineTo(S / 2 + 28, 50); g.lineTo(S / 2 - 28, 50); g.closePath(); g.fill();
  },
};

/** Textúra značky podľa typu: 'stop', 'prednost', 'zakaz-vjazdu', 'jednosmerka', 'rychlost-50' … */
export function texturaZnacky(typ) {
  if (cache.has(typ)) return cache.get(typ);
  let t;
  if (typ.startsWith('rychlost-')) {
    const cislo = typ.split('-')[1];
    t = platno((g) => {
      kruh(g, 62, '#c8102e'); kruh(g, 50, '#ffffff');
      g.fillStyle = '#111'; g.font = `bold ${cislo.length > 2 ? 44 : 56}px Arial, sans-serif`;
      g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(cislo, S / 2, S / 2 + 3);
    });
  } else {
    t = platno(KRESLENIE[typ]);
  }
  cache.set(typ, t);
  return t;
}

/** Zadná strana značky (šedý plech). */
export const ZADNA_STRANA = '#8d9296';
