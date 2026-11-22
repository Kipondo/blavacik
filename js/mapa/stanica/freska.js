// Freska v historickej hale Hlavnej stanice – VOĽNÉ PREKRESLENIE (nie kópia fotky ani diela).
// Predloha: nástenná freska akad. mal. Františka Gajdoša (1960) nad prechodom k 1. nástupišťu. Dielo je chránené
// autorským právom, preto sa do hry nekopíruje: kompozícia (skupiny postáv zľava doprava), motívy a paleta sú
// podľa verejných popisov a fotiek (napady/priebeh.md, prieskum 22. 11. 2026), postavy sú štylizované tvary
// kreslené na plátno. Pod freskou je tabuľka s menom autora.
//   1. útek a útlak – utekajúci muži, odhodená zbraň, kľačiaci robotník so zlomenými okovami
//   2. revolúcia a práca – oceliar v okrovej tunike s tyčou, žena v bielom s knihou, muž s červenou zástavou, holubica
//   3. vzdelanie a deti – dievča s knihou, muž s otvorenou knihou, dievča s dieťaťom, chlapec púšťa holubicu
//   4. ženy a národy – skupina žien v šatkách a krojoch, sediace dievča s holubicami, tri holubice
//   5. veda a kozmos – Sputnik, raketa, žena ukazuje k nebu, muž s glóbusom na trojnožke, polmesiac
//   6. priateľstvo – žena v červených šatách s kvetmi a knihou, štyria muži v objatí, okrový trojuholník

import * as THREE from 'three';

const W = 2048, HH = 512;

/** Pseudonáhoda (rovnaký obraz pri každom štarte). */
function rnd(seed) {
  let s = seed;
  return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
}

/** Štylizovaná postava: x, y = päty (px), h = výška (px). */
function postava(g, o) {
  const { x, y, h, odev = '#8d786c', plet = '#cfa37c', vlasy = '#4a3a2e', sklon = 0, klaci = false, sedi = false,
    dlhe = false, ruky = [[-0.18, 0.45], [0.18, 0.45]], plesaty = false, satka = null } = o;
  const k = klaci ? 0.72 : sedi ? 0.62 : 1;
  const yb = y - (sedi ? 0.05 * h : 0);
  const ramena = [x + sklon * h, yb - 0.8 * h * k], boky = [x + sklon * h * 0.4, yb - 0.46 * h * k];
  g.lineCap = 'round';
  // nohy
  g.strokeStyle = dlhe ? odev : shade(odev, -0.25);
  g.lineWidth = 0.07 * h;
  if (!dlhe) {
    if (sedi) { line(g, boky, [boky[0] + 0.25 * h, boky[1]]); line(g, [boky[0] + 0.25 * h, boky[1]], [boky[0] + 0.27 * h, yb]); }
    else if (klaci) { line(g, boky, [x - 0.12 * h, yb]); line(g, boky, [x + 0.16 * h, yb - 0.12 * h]); line(g, [x + 0.16 * h, yb - 0.12 * h], [x + 0.18 * h, yb]); }
    else { line(g, [boky[0] - 0.04 * h, boky[1]], [x - 0.07 * h, yb]); line(g, [boky[0] + 0.04 * h, boky[1]], [x + 0.07 * h, yb]); }
  }
  // trup (pri dlhom rúchu až po zem)
  g.fillStyle = odev;
  g.beginPath();
  g.moveTo(ramena[0] - 0.11 * h, ramena[1]);
  g.lineTo(ramena[0] + 0.11 * h, ramena[1]);
  if (dlhe) { g.lineTo(x + 0.16 * h, yb); g.lineTo(x - 0.16 * h, yb); }
  else { g.lineTo(boky[0] + 0.1 * h, boky[1]); g.lineTo(boky[0] - 0.1 * h, boky[1]); }
  g.closePath();
  g.fill();
  // ruky
  g.strokeStyle = shade(odev, 0.08);
  g.lineWidth = 0.055 * h;
  for (const [dx, dy] of ruky) {
    const s = dx < 0 ? -1 : 1;
    const zac = [ramena[0] + s * 0.1 * h, ramena[1] + 0.03 * h];
    const kon = [ramena[0] + dx * h, ramena[1] + dy * h * 0.6];
    line(g, zac, kon);
    g.fillStyle = plet;
    g.beginPath(); g.arc(kon[0], kon[1], 0.03 * h, 0, Math.PI * 2); g.fill();
  }
  // hlava
  const hx = ramena[0] + sklon * 0.1 * h, hy = ramena[1] - 0.1 * h;
  g.fillStyle = plet;
  g.beginPath(); g.ellipse(hx, hy, 0.055 * h, 0.07 * h, 0, 0, Math.PI * 2); g.fill();
  if (satka) { g.fillStyle = satka; g.beginPath(); g.ellipse(hx, hy - 0.015 * h, 0.07 * h, 0.075 * h, 0, Math.PI, Math.PI * 2.05); g.fill(); g.fillRect(hx - 0.07 * h, hy - 0.02 * h, 0.03 * h, 0.12 * h); }
  else if (!plesaty) { g.fillStyle = vlasy; g.beginPath(); g.ellipse(hx, hy - 0.03 * h, 0.058 * h, 0.045 * h, 0, Math.PI, Math.PI * 2); g.fill(); }
  return { ramena, hlava: [hx, hy] };
}

function line(g, a, b) { g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke(); }

function shade(hex, f) {
  const c = new THREE.Color(hex);
  if (f > 0) c.lerp(new THREE.Color('#ffffff'), f); else c.lerp(new THREE.Color('#000000'), -f);
  return '#' + c.getHexString();
}

function holubica(g, x, y, s) {
  g.fillStyle = '#ece6dc';
  g.beginPath(); g.ellipse(x, y, 0.5 * s, 0.22 * s, -0.2, 0, Math.PI * 2); g.fill();
  g.beginPath(); g.moveTo(x - 0.1 * s, y); g.lineTo(x - 0.5 * s, y - 0.7 * s); g.lineTo(x + 0.15 * s, y - 0.1 * s); g.fill();
  g.beginPath(); g.moveTo(x + 0.1 * s, y); g.lineTo(x + 0.55 * s, y - 0.55 * s); g.lineTo(x + 0.3 * s, y); g.fill();
}

function kniha(g, x, y, s, farba = '#8a3c2a', otvorena = false) {
  g.fillStyle = otvorena ? '#efe6d6' : farba;
  if (otvorena) { g.fillRect(x - s, y - 0.35 * s, 2 * s, 0.7 * s); g.strokeStyle = '#7a6a5a'; g.lineWidth = 1.5; line(g, [x, y - 0.35 * s], [x, y + 0.35 * s]); }
  else g.fillRect(x - 0.5 * s, y - 0.35 * s, s, 0.7 * s);
}

/** Nakreslí fresku na plátno. */
function kresli(g) {
  const r = rnd(1960);
  // pozadie: sivé „nebo“, tmavá lila zem, okrové lúče a kubizujúce trojuholníky
  const pg = g.createLinearGradient(0, 0, 0, HH);
  pg.addColorStop(0, '#9a9094'); pg.addColorStop(0.62, '#968d91'); pg.addColorStop(0.78, '#7d727a'); pg.addColorStop(1, '#736870');
  g.fillStyle = pg; g.fillRect(0, 0, W, HH);
  g.globalAlpha = 0.45;
  for (const [x0, x1, x2, f] of [[380, 520, 760, '#d5c193'], [700, 900, 1150, '#d5c193'], [1300, 1430, 1600, '#c8b78e'], [1780, 2048, 2048, '#a2835b']]) {
    g.fillStyle = f; g.beginPath(); g.moveTo(x0, 0); g.lineTo(x1, 0); g.lineTo(x2, HH * 0.85); g.closePath(); g.fill();
  }
  g.globalAlpha = 0.35;
  g.fillStyle = '#5d6a5a'; g.beginPath(); g.moveTo(0, 0); g.lineTo(260, 0); g.lineTo(120, HH); g.lineTo(0, HH); g.fill();   // zelenošedá tma vľavo
  g.fillStyle = '#4c4652'; g.beginPath(); g.moveTo(1480, 0); g.lineTo(1640, 0); g.lineTo(1560, 260); g.fill();          // tmavá plocha s polmesiacom
  g.globalAlpha = 1;
  // 1. útek a útlak
  postava(g, { x: 70, y: 470, h: 300, odev: '#a8a2a4', sklon: -0.18, ruky: [[-0.35, 0.2], [-0.32, 0.35]], vlasy: '#6a5a4a' });
  postava(g, { x: 140, y: 470, h: 300, odev: '#6a6458', sklon: -0.14, ruky: [[-0.3, 0.4], [0.2, 0.6]] });
  postava(g, { x: 205, y: 470, h: 290, odev: '#776d72', sklon: -0.1, plesaty: true, ruky: [[-0.28, 0.1], [0.2, 0.6]] });
  g.strokeStyle = '#2e2a2a'; g.lineWidth = 7; line(g, [40, 490], [150, 476]);                                     // odhodená zbraň
  const rob = postava(g, { x: 290, y: 500, h: 330, odev: '#e2dbd2', klaci: true, plesaty: true, ruky: [[-0.08, -0.1], [0.12, -0.12]] });
  g.strokeStyle = '#3a3536'; g.lineWidth = 3;
  for (const [cx, cy] of [[rob.ramena[0] - 26, rob.ramena[1] - 30], [rob.ramena[0] + 40, rob.ramena[1] - 36], [318, 496]]) {
    for (let k = 0; k < 3; k++) { g.beginPath(); g.ellipse(cx + k * 9, cy + k * 6, 6, 4, 0.6, 0, Math.PI * 2); g.stroke(); }
  }
  // 2. revolúcia a práca
  const ocel = postava(g, { x: 420, y: 480, h: 360, odev: '#c6a164', ruky: [[0.25, 0.2], [-0.3, 0.45]], vlasy: '#3e3228' });
  g.strokeStyle = '#3d3a3a'; g.lineWidth = 9; line(g, [ocel.ramena[0] + 90, ocel.ramena[1] - 120], [ocel.ramena[0] + 60, 490]);
  g.fillStyle = '#f2efe8'; g.beginPath(); g.arc(ocel.ramena[0] + 0.25 * 360, ocel.ramena[1] + 0.2 * 360 * 0.6, 12, 0, 7); g.fill();   // rukavica
  postava(g, { x: 500, y: 470, h: 330, odev: '#c3b0a2', dlhe: true, ruky: [[0.16, 0.15], [-0.15, 0.5]] });
  kniha(g, 545, 300, 26, '#8a3c2a');
  postava(g, { x: 575, y: 480, h: 340, odev: '#8b8589', ruky: [[0.05, -0.55], [0.2, 0.3]] });
  g.strokeStyle = '#4a3a2e'; g.lineWidth = 7; line(g, [585, 140], [600, 470]);                                    // žrď
  g.fillStyle = '#b5452a';
  g.beginPath(); g.moveTo(587, 140); g.bezierCurveTo(660, 120, 700, 180, 760, 150); g.lineTo(770, 260); g.bezierCurveTo(700, 290, 660, 230, 595, 255); g.closePath(); g.fill();
  for (const [x, y] of [[640, 170], [660, 150], [690, 165]]) { g.fillStyle = '#cfa37c'; g.beginPath(); g.ellipse(x, y + 90, 14, 18, 0, 0, 7); g.fill(); }
  holubica(g, 640, 70, 36);
  postava(g, { x: 660, y: 505, h: 260, odev: '#3f3a3e', klaci: true, ruky: [[-0.1, 0.2], [0.2, 0.2]] });
  // 3. vzdelanie a deti
  postava(g, { x: 760, y: 480, h: 300, odev: '#b9cfa8', dlhe: true, vlasy: '#d9c08a', ruky: [[0.15, 0.25], [-0.1, 0.25]] });
  kniha(g, 790, 340, 22, '#efe6d6', true);
  postava(g, { x: 830, y: 485, h: 320, odev: '#776d72', plet: '#5c3d2a', vlasy: '#1e1612', ruky: [[0.16, 0.3], [-0.16, 0.3]] });
  kniha(g, 835, 330, 26, '#efe6d6', true);
  postava(g, { x: 895, y: 480, h: 290, odev: '#b97e52', dlhe: true, plet: '#d9b07a', vlasy: '#1e1612', ruky: [[0.2, 0.4], [-0.1, 0.4]] });
  postava(g, { x: 930, y: 480, h: 150, odev: '#e2dbd2', plet: '#d9b07a', vlasy: '#1e1612' });
  const chl = postava(g, { x: 985, y: 480, h: 220, odev: '#d8cdb9', ruky: [[0.1, -0.6], [-0.15, 0.4]] });
  holubica(g, chl.ramena[0] + 30, chl.ramena[1] - 110, 30);
  // 4. ženy a národy
  const zeny = [
    [1040, 300, '#554f55', null, true], [1085, 310, '#ddd6cc', null, true], [1125, 300, '#9a8e8a', null, false],
    [1165, 305, '#e8e2d8', '#f0ece4', true], [1205, 300, '#e8e2d8', '#f0ece4', true], [1245, 295, '#a18262', '#c6a164', true],
    [1285, 300, '#bcb1b7', '#ece6dc', true], [1330, 295, '#92635c', null, true], [1370, 305, '#e3d6be', null, true],
  ];
  zeny.forEach(([x, h, odev, satka, dlhe], i) => {
    const plet = i === 8 ? '#5c3d2a' : i === 7 ? '#d9b07a' : '#cfa37c';
    postava(g, { x, y: 482, h, odev, satka, dlhe, plet, vlasy: i === 1 ? '#d9c08a' : '#3a2e26', ruky: [[0.15, 0.35 + r() * 0.3], [-0.15, 0.4]] });
    if (satka === '#f0ece4') { g.fillStyle = '#b5452a'; for (let k = 0; k < 3; k++) g.fillRect(x - 46, 455 + k * 8, 92, 3); }  // pruhy kroja
  });
  g.fillStyle = '#b5452a'; g.fillRect(1125, 170, 4, 70); g.fillRect(1129, 170, 30, 20);                         // malá zástavka
  g.fillStyle = '#d98aa0'; g.beginPath(); g.arc(1355, 300, 16, 0, 7); g.fill();                                  // ružová kytica
  postava(g, { x: 1400, y: 482, h: 150, odev: '#d9c060', plet: '#5c3d2a' });
  postava(g, { x: 1180, y: 505, h: 230, odev: '#c3b0a2', sedi: true, ruky: [[0.2, 0.3], [-0.15, 0.4]] });
  holubica(g, 1150, 490, 22); holubica(g, 1240, 492, 20); holubica(g, 1265, 480, 18);
  holubica(g, 1120, 60, 30); holubica(g, 1190, 40, 28); holubica(g, 1260, 70, 30);
  g.fillStyle = '#e6e0d4'; g.beginPath(); g.arc(1330, 50, 16, 0, 7); g.fill();
  // 5. veda a kozmos
  g.fillStyle = '#f0ece4'; g.beginPath(); g.arc(1560, 70, 20, 0, 7); g.fill();                                    // Sputnik
  g.strokeStyle = '#f0ece4'; g.lineWidth = 2.5;
  for (const [dx, dy] of [[-60, 30], [-50, 45], [55, 32], [45, 48]]) line(g, [1560, 70], [1560 + dx, 70 + dy]);
  g.globalAlpha = 0.35; g.strokeStyle = '#fff6d6'; g.lineWidth = 2;
  for (let k = 0; k < 10; k++) { const a = k / 10 * Math.PI * 2; line(g, [1560 + Math.cos(a) * 26, 70 + Math.sin(a) * 26], [1560 + Math.cos(a) * 60, 70 + Math.sin(a) * 60]); }
  g.globalAlpha = 1;
  g.fillStyle = '#f0ece4';                                                                                         // raketa
  g.beginPath(); g.moveTo(1690, 40); g.lineTo(1712, 100); g.lineTo(1712, 220); g.lineTo(1668, 220); g.lineTo(1668, 100); g.closePath(); g.fill();
  g.beginPath(); g.moveTo(1668, 190); g.lineTo(1645, 235); g.lineTo(1668, 220); g.fill();
  g.beginPath(); g.moveTo(1712, 190); g.lineTo(1735, 235); g.lineTo(1712, 220); g.fill();
  g.fillStyle = '#82634e'; g.beginPath(); g.moveTo(1672, 222); g.lineTo(1708, 222); g.lineTo(1690, 300); g.fill();
  g.fillStyle = '#d9c060'; g.beginPath(); g.arc(1520, 150, 26, 0.6, 5.0); g.arc(1530, 145, 22, 5.0, 0.6, true); g.fill();   // polmesiac
  postava(g, { x: 1470, y: 482, h: 320, odev: '#3f3a3e', ruky: [[0.1, -0.3], [-0.15, 0.4]] });
  postava(g, { x: 1530, y: 482, h: 300, odev: '#7c573e', ruky: [[0.25, -0.75], [-0.15, 0.3]] });
  g.fillStyle = '#f4efe6'; g.fillRect(1495, 330, 28, 36);                                                         // plán
  postava(g, { x: 1590, y: 482, h: 310, odev: '#82634e', ruky: [[0.2, -0.7], [-0.1, 0.4]] });
  postava(g, { x: 1630, y: 482, h: 200, odev: '#d8cdb9' });
  postava(g, { x: 1700, y: 505, h: 270, odev: '#776d72', klaci: true, plesaty: true, ruky: [[0.25, 0.1], [0.3, 0.2]] });
  g.strokeStyle = '#3a3030'; g.lineWidth = 4; line(g, [1770, 420], [1745, 500]); line(g, [1770, 420], [1795, 500]); line(g, [1770, 420], [1770, 500]);
  g.fillStyle = '#593a2f'; g.beginPath(); g.arc(1770, 395, 30, 0, 7); g.fill();                                   // glóbus
  g.strokeStyle = '#7a5a4a'; g.lineWidth = 2; g.beginPath(); g.ellipse(1770, 395, 30, 10, 0, 0, 7); g.stroke();
  holubica(g, 1640, 495, 20);
  // 6. priateľstvo
  g.fillStyle = '#a9a0c4'; g.beginPath(); g.moveTo(1760, 500); g.lineTo(1880, 470); g.lineTo(1900, 505); g.lineTo(1770, 512); g.fill();  // plachta
  postava(g, { x: 1830, y: 500, h: 230, odev: '#92635c', sedi: true, dlhe: false, ruky: [[0.2, 0.4], [-0.1, 0.3]] });
  for (const [x, y] of [[1790, 495], [1805, 488], [1880, 490]]) { g.fillStyle = '#b5452a'; g.beginPath(); g.arc(x, y, 7, 0, 7); g.fill(); }
  kniha(g, 1860, 500, 14, '#efe6d6', true);
  postava(g, { x: 1920, y: 482, h: 330, odev: '#ece6dc', dlhe: true, vlasy: '#2a2220', ruky: [[0.18, 0.3], [-0.12, 0.4]] });
  postava(g, { x: 1965, y: 482, h: 320, odev: '#776d72', ruky: [[-0.25, 0.2], [0.1, 0.4]] });
  postava(g, { x: 2005, y: 482, h: 315, odev: '#8d786c', ruky: [[-0.2, 0.3], [0.1, 0.4]] });
  postava(g, { x: 2035, y: 482, h: 310, odev: '#6a6458', ruky: [[-0.25, 0.2], [0.05, 0.4]] });
  // šrafovanie (matný povrch fresky z krátkych súbežných ťahov) a ľahké poškodenie ľavého horného rohu
  g.globalAlpha = 0.07;
  for (let k = 0; k < 9000; k++) {
    const x = r() * W, y = r() * HH, d = 6 + r() * 8;
    g.strokeStyle = r() < 0.5 ? '#ffffff' : '#000000';
    g.lineWidth = 1;
    line(g, [x, y], [x + d * 0.3, y + d]);
  }
  g.globalAlpha = 0.25;
  for (let k = 0; k < 60; k++) { g.fillStyle = r() < 0.6 ? '#6b5745' : '#d8d2c4'; g.beginPath(); g.arc(r() * 230, r() * 140, 4 + r() * 16, 0, 7); g.fill(); }
  g.globalAlpha = 1;
}

/** Freska ako rovina (šírka × výška v m); obojstranne nie – visí na stene. */
export function freska(sirka, vyska) {
  const c = document.createElement('canvas');
  c.width = W; c.height = HH;
  kresli(c.getContext('2d'));
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(sirka, vyska), new THREE.MeshStandardMaterial({ map: t, roughness: 0.95 }));
  m.name = 'freska';
  return m;
}
