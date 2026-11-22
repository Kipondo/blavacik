// Tabuľa odchodov, staničné hodiny a nápisy Hlavnej stanice – kreslené na plátno (CanvasTexture).
// Tabuľa číta zoznam odchodov z hra.stav.stanicaOdchody (cestovný poriadok, úloha A3):
//   [{ cas: '14:05', vlak: 'R 611', nazov: 'Považan', smer: 'Žilina', nastupiste: '3', meskanie: 5 }, …]
// Kým poriadok nie je, ukáže len hlavičku a hlásenie.

import * as THREE from 'three';

function platno(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return { c, g: c.getContext('2d'), t };
}

const dvojmiestne = (n) => String(n).padStart(2, '0');

/** Veľká tabuľa odchodov (5 × 1,6 m), obojstranná doska s rámom. */
export function tabulaOdchodov() {
  const { c, g, t } = platno(1024, 320);
  const sk = new THREE.Group();
  const doska = new THREE.Mesh(new THREE.PlaneGeometry(5, 1.6), new THREE.MeshBasicMaterial({ map: t, toneMapped: false }));
  doska.position.z = 0.06;
  const ram = new THREE.Mesh(new THREE.BoxGeometry(5.2, 1.8, 0.1), new THREE.MeshStandardMaterial({ color: '#23272b', roughness: 0.5, metalness: 0.4 }));
  sk.add(ram, doska);
  sk.userData.prekresli = (d, odchody) => {
    g.fillStyle = '#0b1830';
    g.fillRect(0, 0, c.width, c.height);
    g.fillStyle = '#ffffff';
    g.font = 'bold 34px system-ui, sans-serif';
    g.fillText('ODCHODY', 24, 44);
    g.font = '24px system-ui, sans-serif';
    g.fillStyle = '#9fb3d1';
    g.fillText('Departures', 190, 44);
    g.font = 'bold 34px ui-monospace, monospace';
    g.fillStyle = '#ffcc33';
    g.fillText(`${dvojmiestne(d.getHours())}:${dvojmiestne(d.getMinutes())}`, c.width - 130, 44);
    g.fillStyle = '#6d84a8';
    g.font = '18px system-ui, sans-serif';
    const hl = [['ČAS', 24], ['VLAK', 120], ['SMER', 330], ['NÁST.', 760], ['MEŠKANIE', 860]];
    for (const [s, x] of hl) g.fillText(s, x, 78);
    g.font = '26px ui-monospace, monospace';
    if (!odchody?.length) {
      g.fillStyle = '#ffcc33';
      g.fillText('Informácie o odchodoch sa pripravujú.', 24, 130);
    } else {
      odchody.slice(0, 7).forEach((o, i) => {
        const y = 112 + i * 30;
        g.fillStyle = i % 2 ? '#0f2142' : '#0b1830';
        g.fillRect(0, y - 22, c.width, 30);
        g.fillStyle = '#ffffff';
        g.fillText(o.cas, 24, y);
        g.fillText(`${o.vlak}${o.nazov ? ' ' + o.nazov : ''}`.slice(0, 16), 120, y);
        g.fillText(String(o.smer).slice(0, 26), 330, y);
        g.fillText(String(o.nastupiste ?? ''), 780, y);
        if (o.meskanie > 0) { g.fillStyle = '#ff6a4d'; g.fillText(`+${o.meskanie} min`, 860, y); }
      });
    }
    t.needsUpdate = true;
  };
  return sk;
}

/** Staničné hodiny: obojstranný ciferník s ručičkami podľa herného času. */
export function hodiny() {
  const { c, g, t } = platno(256, 256);
  const sk = new THREE.Group();
  const mat = new THREE.MeshBasicMaterial({ map: t, toneMapped: false });
  for (const s of [1, -1]) {
    const m = new THREE.Mesh(new THREE.CircleGeometry(0.5, 40), mat);
    m.position.z = 0.06 * s;
    if (s < 0) m.rotation.y = Math.PI;
    sk.add(m);
  }
  const telo = new THREE.Mesh(new THREE.CylinderGeometry(0.54, 0.54, 0.1, 40), new THREE.MeshStandardMaterial({ color: '#2b2f33', roughness: 0.4, metalness: 0.6 }));
  telo.rotation.x = Math.PI / 2;
  const tyc = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.2, 8), telo.material);
  tyc.position.y = 1.1;
  sk.add(telo, tyc);
  sk.userData.prekresli = (d) => {
    g.fillStyle = '#f7f7f2';
    g.fillRect(0, 0, 256, 256);
    g.translate(128, 128);
    g.strokeStyle = '#111';
    for (let i = 0; i < 60; i++) {
      const a = i / 60 * Math.PI * 2;
      g.lineWidth = i % 5 ? 2 : 7;
      const r0 = i % 5 ? 108 : 92;
      g.beginPath(); g.moveTo(Math.sin(a) * r0, -Math.cos(a) * r0); g.lineTo(Math.sin(a) * 118, -Math.cos(a) * 118); g.stroke();
    }
    const h = (d.getHours() % 12 + d.getMinutes() / 60) / 12 * Math.PI * 2, m = d.getMinutes() / 60 * Math.PI * 2;
    g.lineCap = 'butt';
    g.lineWidth = 12; g.beginPath(); g.moveTo(-Math.sin(h) * 18, Math.cos(h) * 18); g.lineTo(Math.sin(h) * 66, -Math.cos(h) * 66); g.stroke();
    g.lineWidth = 8; g.beginPath(); g.moveTo(-Math.sin(m) * 22, Math.cos(m) * 22); g.lineTo(Math.sin(m) * 100, -Math.cos(m) * 100); g.stroke();
    g.setTransform(1, 0, 0, 1, 0, 0);
    t.needsUpdate = true;
  };
  return sk;
}

/** Jednoduchý obojstranný nápis (tabuľka nad pokladňami, bufetom, priechodom). */
export function napis(text, farba, pozadie, sirka = 3) {
  const { c, g, t } = platno(512, 96);
  g.fillStyle = pozadie;
  g.fillRect(0, 0, 512, 96);
  g.fillStyle = farba;
  g.font = `bold ${text.length > 14 ? 34 : 52}px system-ui, sans-serif`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(text, 256, 50);
  t.needsUpdate = true;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(sirka, sirka * 96 / 512), new THREE.MeshBasicMaterial({ map: t, side: THREE.DoubleSide }));
  return m;
}
