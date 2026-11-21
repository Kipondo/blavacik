// Zvukový systém: Web Audio kontext, hlasitosť (zvuky, hlasy, hudba), priestorový zvuk podľa kamery.
// Všetky zvuky hry sú syntetizované (js/zvuk/*.js – jeden zvuk = jeden súbor), hlasy postáv sú súbory
// z Google Gemini TTS (js/zvuk/hlasy.js). Prehliadač pustí zvuk až po prvom kliknutí / klávese / dotyku.

const KLUC = 'blavacik.zvuk';
const PREDVOLENE = { zvuky: 0.8, hlasy: 1, hudba: 0.6 };
const MAX_ZDROJOV = 24;          // naraz hrajúcich krátkych zvukov (slabé zariadenia)

export function nacitajHlasitost() {
  try {
    const n = JSON.parse(localStorage.getItem(KLUC) ?? 'null');
    if (n && typeof n === 'object') {
      const o = { ...PREDVOLENE };
      for (const k of Object.keys(o)) if (Number.isFinite(n[k])) o[k] = Math.min(1, Math.max(0, n[k]));
      return o;
    }
  } catch { /* localStorage nemusí byť dostupný */ }
  return { ...PREDVOLENE };
}

export function ulozHlasitost(h) {
  try { localStorage.setItem(KLUC, JSON.stringify(h)); } catch { /* nevadí */ }
}

export class Zvuk {
  constructor() {
    this.ctx = null;
    this.hlasitost = nacitajHlasitost();
    this.aktivne = 0;
  }

  /** Vytvorí (alebo prebudí) audio kontext – volá sa pri prvej akcii hráča. */
  odomkni() {
    if (!this.ctx) {
      const AC = window.AudioContext ?? window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      const c = this.ctx;
      this.hlavny = c.createDynamicsCompressor();
      this.hlavny.threshold.value = -14; this.hlavny.ratio.value = 4;
      this.hlavny.connect(c.destination);
      this.zbernice = {};
      for (const k of ['zvuky', 'hlasy', 'hudba']) {
        const g = c.createGain();
        g.gain.value = this.hlasitost[k];
        g.connect(this.hlavny);
        this.zbernice[k] = g;
      }
      // biely šum (2 s) – základ krokov, vetra, šmyku, nárazov
      const n = c.sampleRate * 2;
      this.sum = c.createBuffer(1, n, c.sampleRate);
      const d = this.sum.getChannelData(0);
      for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
      // hnedý šum (hukot dopravy)
      this.hnedy = c.createBuffer(1, n, c.sampleRate);
      const h = this.hnedy.getChannelData(0);
      let p = 0;
      for (let i = 0; i < n; i++) { p = (p + 0.02 * (Math.random() * 2 - 1)) / 1.02; h[i] = p * 3.5; }
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
  }

  get pripraveny() { return !!this.ctx && this.ctx.state === 'running'; }
  get cas() { return this.ctx?.currentTime ?? 0; }

  nastavHlasitost(k, v) {
    this.hlasitost[k] = v;
    ulozHlasitost(this.hlasitost);
    if (this.zbernice?.[k]) this.zbernice[k].gain.setTargetAtTime(v, this.ctx.currentTime, 0.05);
  }

  /** Poslucháč = kamera (poloha a smer). */
  nastavPosluchaca(kamera) {
    const l = this.ctx?.listener;
    if (!l) return;
    const p = kamera.position, e = kamera.matrixWorld.elements;
    // smer pohľadu = −z kamery, hore = +y kamery
    const fx = -e[8], fy = -e[9], fz = -e[10], ux = e[4], uy = e[5], uz = e[6];
    if (l.positionX) {
      const t = this.ctx.currentTime;
      l.positionX.setTargetAtTime(p.x, t, 0.02); l.positionY.setTargetAtTime(p.y, t, 0.02); l.positionZ.setTargetAtTime(p.z, t, 0.02);
      l.forwardX.setTargetAtTime(fx, t, 0.02); l.forwardY.setTargetAtTime(fy, t, 0.02); l.forwardZ.setTargetAtTime(fz, t, 0.02);
      l.upX.setTargetAtTime(ux, t, 0.02); l.upY.setTargetAtTime(uy, t, 0.02); l.upZ.setTargetAtTime(uz, t, 0.02);
    } else {
      l.setPosition(p.x, p.y, p.z);
      l.setOrientation(fx, fy, fz, ux, uy, uz);
    }
  }

  /** Výstup pre zvuk: priestorový (x, y, z) alebo rovno do zbernice. Vracia vstupný uzol. */
  vystup(poz = null, zbernica = 'zvuky', dosah = 1) {
    const c = this.ctx;
    if (!poz) return this.zbernice[zbernica];
    const p = c.createPanner();
    p.panningModel = 'equalpower';
    p.distanceModel = 'inverse';
    p.refDistance = 6 * dosah; p.maxDistance = 400; p.rolloffFactor = 1.1;
    if (p.positionX) { p.positionX.value = poz.x; p.positionY.value = poz.y ?? 0; p.positionZ.value = poz.z; }
    else p.setPosition(poz.x, poz.y ?? 0, poz.z);
    p.connect(this.zbernice[zbernica]);
    return p;
  }

  /** Dá sa spustiť ďalší krátky zvuk? (počet naraz hrajúcich je obmedzený) */
  miesto(trvanie) {
    if (!this.pripraveny || this.aktivne >= MAX_ZDROJOV) return false;
    this.aktivne++;
    setTimeout(() => { this.aktivne--; }, trvanie * 1000 + 50);
    return true;
  }

  /** Zdroj šumu (opakovaný) so začiatkom na náhodnom mieste. */
  zdrojSumu(buffer = this.sum) {
    const s = this.ctx.createBufferSource();
    s.buffer = buffer; s.loop = true;
    s.loopStart = 0; s.loopEnd = buffer.duration;
    return s;
  }
}
