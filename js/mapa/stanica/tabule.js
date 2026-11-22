// Tabule odchodov a príchodov, staničné hodiny a nápisy Hlavnej stanice – kreslené na plátno (CanvasTexture).
// Tabule čítajú riadky z hra.stav.stanicaOdchody / hra.stav.stanicaPrichody (js/vlaky/modul.js, úloha A3):
//   [{ cas: '14:05', vlak: 'R 611', nazov: 'Považan', smer: 'Žilina', nastupiste: '3', kolaj: '10', meskanie: 5 }, …]
// (pri príchodoch je smer = odkiaľ vlak ide). Kým poriadok nie je, ukáže len hlavičku a hlásenie.

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

/** Veľká tabuľa odchodov alebo príchodov (5 × 1,6 m), obojstranná doska s rámom. druh = 'odchody' | 'prichody'. */
export function tabulaOdchodov(druh = 'odchody') {
  const prichody = druh === 'prichody';
  const { c, g, t } = platno(1024, 320);
  const sk = new THREE.Group();
  const doska = new THREE.Mesh(new THREE.PlaneGeometry(5, 1.6), new THREE.MeshBasicMaterial({ map: t, toneMapped: false }));
  doska.position.z = 0.06;
  const ram = new THREE.Mesh(new THREE.BoxGeometry(5.2, 1.8, 0.1), new THREE.MeshStandardMaterial({ color: '#23272b', roughness: 0.5, metalness: 0.4 }));
  sk.add(ram, doska);
  sk.userData.druh = druh;
  // LED tabuľa ako na stanici: čierne pozadie, biela hlavička, čas jantárovo, riadky zeleno / červeno / oranžovo
  sk.userData.prekresli = (d, riadky) => {
    g.fillStyle = '#05070a';
    g.fillRect(0, 0, c.width, c.height);
    g.fillStyle = '#f4f4f4';
    g.font = 'bold 34px ui-monospace, monospace';
    g.fillText(prichody ? 'PRÍCHODY' : 'ODCHODY', 24, 44);
    g.font = '22px ui-monospace, monospace';
    g.fillStyle = '#bdbdbd';
    g.fillText(prichody ? 'ARRIVALS' : 'DEPARTURES', 220, 44);
    g.font = 'bold 34px ui-monospace, monospace';
    g.fillStyle = '#ffb627';
    g.fillText(`${dvojmiestne(d.getHours())}:${dvojmiestne(d.getMinutes())}`, c.width - 130, 44);
    g.fillStyle = '#8a8a8a';
    g.font = '18px ui-monospace, monospace';
    const hl = [['ČAS', 24], ['VLAK', 120], [prichody ? 'ZO SMERU' : 'SMER', 400], ['NÁST./K.', 730], ['MEŠKANIE', 870]];
    for (const [s, x] of hl) g.fillText(s, x, 78);
    g.font = '26px ui-monospace, monospace';
    if (!riadky?.length) {
      g.fillStyle = '#ffb627';
      g.fillText(prichody ? 'Informácie o príchodoch sa pripravujú.' : 'Informácie o odchodoch sa pripravujú.', 24, 130);
    } else {
      riadky.slice(0, 7).forEach((o, i) => {
        const y = 112 + i * 30;
        g.fillStyle = '#3be06a';
        g.fillText(o.cas, 24, y);
        g.fillStyle = '#ff5a6e';
        g.fillText(`${o.vlak}${o.nazov ? ' ' + o.nazov : ''}`.slice(0, 19), 120, y);
        g.fillStyle = '#ffa640';
        g.fillText(String(o.smer).slice(0, 21), 400, y);
        g.fillStyle = '#ffb627';
        g.fillText(`${o.nastupiste ?? ''}${o.kolaj ? '/' + o.kolaj : ''}`, 740, y);
        if (o.meskanie > 0) { g.fillStyle = '#ff5a6e'; g.fillText(`+${o.meskanie} min`, 870, y); }
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

/** Tmavomodrá orientačná tabuľa (#1E2C66) s bielym textom a šípkou – nový orientačný systém stanice. */
export function navigacia(text, sipka = '', sirka = 3.2) {
  const m = napis(`${sipka ? sipka + '  ' : ''}${text}`, '#ffffff', '#1e2c66', sirka);
  return m;
}

/** Modrý pás nad pokladňami s bielym textom v troch jazykoch. */
export function pasPokladni(sirka) {
  const { c, g, t } = platno(2048, 64);
  g.fillStyle = '#1e3a8a';
  g.fillRect(0, 0, 2048, 64);
  g.fillStyle = '#ffffff';
  g.font = '600 30px system-ui, sans-serif';
  g.textBaseline = 'middle';
  g.fillText('Predaj vnútroštátnych a medzinárodných cestovných lístkov · Domestic and international tickets · Fahrkarten', 24, 34, 2000);
  t.needsUpdate = true;
  return new THREE.Mesh(new THREE.PlaneGeometry(sirka, 0.5), new THREE.MeshBasicMaterial({ map: t }));
}

/** Zavesený modrý box „POKLADNICA“ s bielym panelom (nad okienkami pokladní). */
export function pokladnica() {
  const sk = new THREE.Group();
  const box = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.4, 0.14), new THREE.MeshStandardMaterial({ color: '#1e3a8a', roughness: 0.6 }));
  sk.add(box);
  for (const s of [1, -1]) {
    const n = napis('POKLADNICA', '#1e3a8a', '#ffffff', 1.0);
    n.position.z = 0.075 * s;
    if (s < 0) n.rotation.y = Math.PI;
    sk.add(n);
  }
  const lanko = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.8, 4), new THREE.MeshStandardMaterial({ color: '#333' }));
  lanko.position.y = 0.6;
  sk.add(lanko);
  return sk;
}

/** Svetelný nápis na páse strechy Skleníka: biele písmená (v noci svietia), tenký tmavý obrys kvôli čitateľnosti cez deň. */
export function napisStrechy(text, sirka) {
  const { c, g, t } = platno(2048, 128);
  g.clearRect(0, 0, c.width, c.height);
  g.font = '600 92px system-ui, sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.lineWidth = 6;
  g.strokeStyle = 'rgba(70, 72, 76, 0.9)';
  g.strokeText(text, 1024, 66, 2000);
  g.fillStyle = '#ffffff';
  g.fillText(text, 1024, 66, 2000);
  t.needsUpdate = true;
  return new THREE.Mesh(new THREE.PlaneGeometry(sirka, sirka * 128 / 2048),
    new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false, toneMapped: false }));
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
