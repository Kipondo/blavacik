// Ovládanie kamery prezerača: otáčanie okolo cieľa (ľavé tlačidlo), posun (pravé), priblíženie (koliesko),
// pohyb WASD a Q/E. Cieľ sa drží na teréne (vyska(x, z)).

import * as THREE from 'three';

export class Ovladanie {
  constructor(kamera, prvok, vyska) {
    this.kamera = kamera;
    this.vyska = vyska;
    this.ciel = new THREE.Vector3(0, 0, 300);
    this.vzdialenost = 900;
    this.azimut = -0.6;           // rad, 0 = pohľad na sever (−z)
    this.sklon = 0.75;            // rad nad obzorom
    this.klavesy = new Set();
    let tah = null;
    prvok.addEventListener('contextmenu', (e) => e.preventDefault());
    prvok.addEventListener('pointerdown', (e) => { tah = { x: e.clientX, y: e.clientY, tl: e.button }; prvok.setPointerCapture(e.pointerId); });
    prvok.addEventListener('pointerup', () => { tah = null; });
    prvok.addEventListener('pointermove', (e) => {
      if (!tah) return;
      const dx = e.clientX - tah.x, dy = e.clientY - tah.y;
      tah.x = e.clientX; tah.y = e.clientY;
      if (tah.tl === 0) {
        this.azimut -= dx * 0.005;
        this.sklon = Math.min(1.5, Math.max(0.05, this.sklon + dy * 0.004));
      } else {
        const k = this.vzdialenost * 0.0016;
        const sa = Math.sin(this.azimut), ca = Math.cos(this.azimut);
        this.ciel.x += (-dx * ca - dy * sa) * k;
        this.ciel.z += (dx * sa - dy * ca) * k;
      }
    });
    prvok.addEventListener('wheel', (e) => {
      e.preventDefault();
      this.vzdialenost = Math.min(4000, Math.max(8, this.vzdialenost * Math.exp(e.deltaY * 0.0012)));
    }, { passive: false });
    addEventListener('keydown', (e) => this.klavesy.add(e.key.toLowerCase()));
    addEventListener('keyup', (e) => this.klavesy.delete(e.key.toLowerCase()));
  }

  nastav({ x, z, vzdialenost, azimut, sklon }) {
    if (x !== undefined) this.ciel.x = x;
    if (z !== undefined) this.ciel.z = z;
    if (vzdialenost) this.vzdialenost = vzdialenost;
    if (azimut !== undefined) this.azimut = azimut;
    if (sklon !== undefined) this.sklon = sklon;
  }

  update(dt) {
    const v = this.vzdialenost * 0.8 * dt;
    const sa = Math.sin(this.azimut), ca = Math.cos(this.azimut);
    const k = this.klavesy;
    if (k.has('w')) { this.ciel.x -= sa * v; this.ciel.z -= ca * v; }
    if (k.has('s')) { this.ciel.x += sa * v; this.ciel.z += ca * v; }
    if (k.has('a')) { this.ciel.x -= ca * v; this.ciel.z += sa * v; }
    if (k.has('d')) { this.ciel.x += ca * v; this.ciel.z -= sa * v; }
    if (k.has('q')) this.vzdialenost = Math.max(8, this.vzdialenost * (1 - dt));
    if (k.has('e')) this.vzdialenost = Math.min(4000, this.vzdialenost * (1 + dt));
    const h = this.vyska(this.ciel.x, this.ciel.z);
    if (h !== null) this.ciel.y += (h - this.ciel.y) * Math.min(1, dt * 6);
    const d = this.vzdialenost, cs = Math.cos(this.sklon);
    this.kamera.position.set(this.ciel.x + sa * cs * d, this.ciel.y + Math.sin(this.sklon) * d, this.ciel.z + ca * cs * d);
    const hk = this.vyska(this.kamera.position.x, this.kamera.position.z);
    if (hk !== null && this.kamera.position.y < hk + 2) this.kamera.position.y = hk + 2;
    this.kamera.lookAt(this.ciel);
  }
}
