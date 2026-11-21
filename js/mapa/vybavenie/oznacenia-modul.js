// Modul: označenie verejných služieb v meste (data/mapa/sluzby.json z OSM, tools/mesto/sluzby.mjs):
// stanice, autobusová stanica, letisko, prístav, polícia, hasiči, nemocnice, pošty, školy, vysoké školy,
// úrady a ministerstvá, obchodné centrá.
//   – na budove (obrys z OSM) tabuľa na fasáde nad vchodom (najdlhšia stena), inak stojan (pylón),
//   – farby a symboly podľa druhu (modrá polícia, biela s červeným krížom nemocnica, žltá pošta…),
//     druhý riadok je názov miesta,
//   – názov sa ukáže pri príchode (hra.stav.miestaSluzieb číta js/ui/lokality.js),
//   – blízke miesta (do 160 m) dostanú značku na minimape (udalosť 'znacka-mapy').
// Podniky Mlynskej doliny (data/mapa/podniky.json, tools/mesto/podniky.mjs – kluby, bary, bistrá, obchody,
// práčovne…) majú menšiu tabuľu nad vchodom, na stene najbližšie k bodu podniku (issue #73).
// Tabule sa stavajú v štvorcoch 300 m do 450 m od hráča. Ak je služba v OSM len bod vnútri budovy, tabuľa
// pôjde na fasádu tej budovy (budovy a cesty z načítaných dlaždíc – udalosť 'dlazdica-nacitana'), na stenu
// najbližšie k ulici.

import * as THREE from 'three';
import { bodVPolygone, vzdialenostOdOkraja, najblizsiNaUsecke } from '../geometria.js';

const STVOREC = 300;
const DOHLAD = 450;
const ZNACKY = 160;

export const DRUHY = {
  stanica: { text: 'STANICA', pozadie: '#1f4f9a', pismo: '#ffffff', symbol: 'vlak', dosah: 120, mapa: '#3d7be0' },
  autobusova: { text: 'AUTOBUSOVÁ STANICA', pozadie: '#1f4f9a', pismo: '#ffffff', symbol: 'autobus', dosah: 120, mapa: '#3d7be0' },
  letisko: { text: 'LETISKO', pozadie: '#1f4f9a', pismo: '#ffffff', symbol: 'lietadlo', dosah: 250, mapa: '#3d7be0' },
  pristav: { text: 'PRÍSTAV', pozadie: '#1f4f9a', pismo: '#ffffff', symbol: 'kotva', dosah: 80, mapa: '#3d7be0' },
  policia: { text: 'POLÍCIA', pozadie: '#14306e', pismo: '#ffffff', symbol: 'hviezda', dosah: 45, mapa: '#2f5fd0' },
  hasici: { text: 'HASIČI', pozadie: '#b3201c', pismo: '#ffffff', symbol: 'plamen', dosah: 45, mapa: '#e0442e' },
  nemocnica: { text: 'NEMOCNICA', pozadie: '#ffffff', pismo: '#c4161c', symbol: 'kriz', dosah: 90, mapa: '#e03030' },
  posta: { text: 'POŠTA', pozadie: '#f3c623', pismo: '#1b2a5c', symbol: 'obalka', dosah: 30, mapa: '#e8b81a' },
  skola: { text: 'ŠKOLA', pozadie: '#2f7d4a', pismo: '#ffffff', symbol: 'kniha', dosah: 50, mapa: '#3fa45f' },
  univerzita: { text: 'VYSOKÁ ŠKOLA', pozadie: '#2f5d55', pismo: '#ffffff', symbol: 'kniha', dosah: 60, mapa: '#3f8f80' },
  urad: { text: 'ÚRAD', pozadie: '#3b3f46', pismo: '#ffffff', symbol: 'stlpy', dosah: 50, mapa: '#8a8f98' },
  'obchodne-centrum': { text: 'OBCHODNÉ CENTRUM', pozadie: '#6a3d8f', pismo: '#ffffff', symbol: 'taska', dosah: 120, mapa: '#9b5cd0' },
  // podniky (malé tabule nad vchodom; mapa: null = bez značky na minimape)
  klub: { text: 'KLUB', pozadie: '#2a1740', pismo: '#f4d35e', symbol: 'nota', dosah: 25, mapa: '#b05cd6', maly: true },
  bar: { text: 'BAR', pozadie: '#3a2418', pismo: '#f2c46d', symbol: 'pohar', dosah: 20, mapa: '#d08a3a', maly: true },
  krcma: { text: 'KRČMA', pozadie: '#4a2c1a', pismo: '#f2c46d', symbol: 'pohar', dosah: 20, mapa: '#d08a3a', maly: true },
  kaviaren: { text: 'KAVIAREŇ', pozadie: '#5b3d2b', pismo: '#f6e8d5', symbol: 'salka', dosah: 20, mapa: '#a8724a', maly: true },
  bistro: { text: 'BISTRO', pozadie: '#b8322a', pismo: '#ffffff', symbol: 'pribor', dosah: 20, mapa: '#e0603a', maly: true },
  restauracia: { text: 'REŠTAURÁCIA', pozadie: '#6e2a20', pismo: '#f6e8d5', symbol: 'pribor', dosah: 20, mapa: '#e0603a', maly: true },
  zmrzlina: { text: 'ZMRZLINA', pozadie: '#f3d6e2', pismo: '#7a2346', symbol: 'kornut', dosah: 15, mapa: null, maly: true },
  pekaren: { text: 'PEKÁREŇ', pozadie: '#f0e0c0', pismo: '#7a4a1a', symbol: 'chlieb', dosah: 15, mapa: null, maly: true },
  potraviny: { text: 'POTRAVINY', pozadie: '#2e7d32', pismo: '#ffffff', symbol: 'kosik', dosah: 25, mapa: '#4caf50', maly: true },
  pracovna: { text: 'PRÁČOVŇA', pozadie: '#e9f2f8', pismo: '#1f5f8f', symbol: 'pracka', dosah: 15, mapa: null, maly: true },
  fitness: { text: 'FITNES', pozadie: '#1d1d1f', pismo: '#ff7a1a', symbol: 'cinka', dosah: 20, mapa: null, maly: true },
  obchod: { text: 'OBCHOD', pozadie: '#ece8df', pismo: '#2a2a2a', symbol: 'taska', dosah: 15, mapa: null, maly: true },
};

/** Hlavný nápis podľa druhu a mena (ministerstvo, hlavná stanica…). */
function napis(s, d) {
  if (s.text) return s.text;
  if (s.typ === 'urad' && /^Ministerstvo/i.test(s.nazov)) return 'MINISTERSTVO';
  if (s.typ === 'stanica' && /hlavná/i.test(s.nazov)) return 'HLAVNÁ STANICA';
  if (s.typ === 'skola' && /gymnázium/i.test(s.nazov)) return 'GYMNÁZIUM';
  if (s.typ === 'skola' && /materská/i.test(s.nazov)) return 'MATERSKÁ ŠKOLA';
  return d.text;
}

function symbol(g, druh, x, y, r, farba) {
  g.save();
  g.translate(x, y);
  g.fillStyle = farba; g.strokeStyle = farba; g.lineWidth = r * 0.16;
  const kruh = (rr) => { g.beginPath(); g.arc(0, 0, rr, 0, Math.PI * 2); g.fill(); };
  switch (druh) {
    case 'kriz': g.fillRect(-r * 0.22, -r * 0.75, r * 0.44, r * 1.5); g.fillRect(-r * 0.75, -r * 0.22, r * 1.5, r * 0.44); break;
    case 'hviezda': {
      g.beginPath();
      for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + (k * Math.PI) / 5, rr = k % 2 ? r * 0.38 : r * 0.85; g.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); }
      g.closePath(); g.fill(); break;
    }
    case 'obalka': g.strokeRect(-r * 0.75, -r * 0.5, r * 1.5, r); g.beginPath(); g.moveTo(-r * 0.75, -r * 0.5); g.lineTo(0, r * 0.1); g.lineTo(r * 0.75, -r * 0.5); g.stroke(); break;
    case 'kniha': g.fillRect(-r * 0.75, -r * 0.55, r * 0.68, r * 1.1); g.fillRect(r * 0.07, -r * 0.55, r * 0.68, r * 1.1); break;
    case 'vlak': g.fillRect(-r * 0.5, -r * 0.75, r, r * 1.2); g.fillStyle = '#00000055'; g.fillRect(-r * 0.38, -r * 0.6, r * 0.76, r * 0.45); g.fillStyle = farba; g.fillRect(-r * 0.6, r * 0.55, r * 0.25, r * 0.25); g.fillRect(r * 0.35, r * 0.55, r * 0.25, r * 0.25); break;
    case 'autobus': g.fillRect(-r * 0.6, -r * 0.7, r * 1.2, r * 1.3); g.fillStyle = '#00000055'; g.fillRect(-r * 0.48, -r * 0.55, r * 0.96, r * 0.5); g.fillStyle = farba; kruh(0); break;
    case 'lietadlo': g.beginPath(); g.moveTo(0, -r * 0.85); g.lineTo(r * 0.85, r * 0.2); g.lineTo(r * 0.12, r * 0.05); g.lineTo(r * 0.12, r * 0.6); g.lineTo(r * 0.35, r * 0.85); g.lineTo(-r * 0.35, r * 0.85); g.lineTo(-r * 0.12, r * 0.6); g.lineTo(-r * 0.12, r * 0.05); g.lineTo(-r * 0.85, r * 0.2); g.closePath(); g.fill(); break;
    case 'kotva': g.beginPath(); g.arc(0, r * 0.1, r * 0.6, 0.1 * Math.PI, 0.9 * Math.PI); g.stroke(); g.fillRect(-r * 0.08, -r * 0.7, r * 0.16, r * 1.4); g.fillRect(-r * 0.4, -r * 0.45, r * 0.8, r * 0.14); break;
    case 'plamen': g.beginPath(); g.moveTo(0, -r * 0.85); g.quadraticCurveTo(r * 0.8, 0, r * 0.4, r * 0.75); g.lineTo(-r * 0.4, r * 0.75); g.quadraticCurveTo(-r * 0.8, 0, 0, -r * 0.85); g.fill(); break;
    case 'nota': g.beginPath(); g.ellipse(-r * 0.25, r * 0.5, r * 0.3, r * 0.22, -0.4, 0, Math.PI * 2); g.fill(); g.fillRect(r * 0.0, -r * 0.8, r * 0.13, r * 1.3); g.beginPath(); g.moveTo(r * 0.13, -r * 0.8); g.quadraticCurveTo(r * 0.7, -r * 0.5, r * 0.45, -r * 0.05); g.stroke(); break;
    case 'pohar': g.beginPath(); g.moveTo(-r * 0.45, -r * 0.7); g.lineTo(r * 0.3, -r * 0.7); g.lineTo(r * 0.22, r * 0.8); g.lineTo(-r * 0.37, r * 0.8); g.closePath(); g.fill(); g.beginPath(); g.arc(r * 0.38, 0, r * 0.28, -Math.PI / 2, Math.PI / 2); g.stroke(); break;
    case 'salka': g.beginPath(); g.moveTo(-r * 0.6, -r * 0.3); g.lineTo(r * 0.4, -r * 0.3); g.quadraticCurveTo(r * 0.35, r * 0.6, -r * 0.1, r * 0.6); g.quadraticCurveTo(-r * 0.55, r * 0.6, -r * 0.6, -r * 0.3); g.fill(); g.beginPath(); g.arc(r * 0.45, r * 0.05, r * 0.22, -Math.PI / 2, Math.PI / 2); g.stroke(); g.fillRect(-r * 0.8, r * 0.7, r * 1.4, r * 0.12); break;
    case 'pribor': g.fillRect(-r * 0.42, -r * 0.1, r * 0.14, r * 0.95); for (let k = 0; k < 3; k++) g.fillRect(-r * 0.6 + k * r * 0.18, -r * 0.8, r * 0.09, r * 0.6); g.fillRect(-r * 0.6, -r * 0.25, r * 0.5, r * 0.12); g.beginPath(); g.ellipse(r * 0.4, -r * 0.35, r * 0.17, r * 0.48, 0, 0, Math.PI * 2); g.fill(); g.fillRect(r * 0.33, 0, r * 0.14, r * 0.85); break;
    case 'kornut': g.beginPath(); g.moveTo(-r * 0.4, -r * 0.1); g.lineTo(r * 0.4, -r * 0.1); g.lineTo(0, r * 0.9); g.closePath(); g.fill(); g.beginPath(); g.arc(0, -r * 0.35, r * 0.4, 0, Math.PI * 2); g.fill(); break;
    case 'chlieb': g.beginPath(); g.ellipse(0, r * 0.1, r * 0.85, r * 0.5, 0, 0, Math.PI * 2); g.fill(); g.strokeStyle = '#00000055'; for (let k = -1; k <= 1; k++) { g.beginPath(); g.moveTo(k * r * 0.4 - r * 0.1, -r * 0.2); g.lineTo(k * r * 0.4 + r * 0.15, r * 0.35); g.stroke(); } break;
    case 'kosik': g.beginPath(); g.moveTo(-r * 0.85, -r * 0.35); g.lineTo(r * 0.85, -r * 0.35); g.lineTo(r * 0.6, r * 0.55); g.lineTo(-r * 0.6, r * 0.55); g.closePath(); g.fill(); g.beginPath(); g.arc(0, -r * 0.35, r * 0.5, Math.PI, 0); g.stroke(); break;
    case 'pracka': g.strokeRect(-r * 0.7, -r * 0.8, r * 1.4, r * 1.6); g.beginPath(); g.arc(0, r * 0.1, r * 0.45, 0, Math.PI * 2); g.stroke(); g.fillRect(-r * 0.55, -r * 0.65, r * 0.3, r * 0.15); break;
    case 'cinka': g.fillRect(-r * 0.6, -r * 0.08, r * 1.2, r * 0.16); g.fillRect(-r * 0.85, -r * 0.45, r * 0.25, r * 0.9); g.fillRect(r * 0.6, -r * 0.45, r * 0.25, r * 0.9); break;
    case 'stlpy': for (let k = -2; k <= 2; k++) g.fillRect(k * r * 0.3 - r * 0.08, -r * 0.4, r * 0.16, r * 0.95); g.beginPath(); g.moveTo(-r * 0.85, -r * 0.45); g.lineTo(0, -r * 0.85); g.lineTo(r * 0.85, -r * 0.45); g.fill(); g.fillRect(-r * 0.85, r * 0.55, r * 1.7, r * 0.15); break;
    default: g.fillRect(-r * 0.6, -r * 0.3, r * 1.2, r * 1.0); g.beginPath(); g.arc(0, -r * 0.3, r * 0.35, Math.PI, 0); g.stroke();
  }
  g.restore();
}

const textury = new Map();
/** Textúra tabule: symbol, hlavný nápis a meno (zmenšené, aby sa zmestilo). */
function texturaTabule(s) {
  const d = DRUHY[s.typ];
  const hlavny = napis(s, d);
  const kluc = `${s.typ}|${hlavny}|${s.nazov}`;
  if (textury.has(kluc)) return textury.get(kluc);
  // podniky majú menšiu tabuľu – stačí polovičné rozlíšenie (menej pamäte na grafickej karte)
  const k = d.maly ? 0.5 : 1;
  const W = 1024 * k, Hh = 256 * k;
  const c = document.createElement('canvas');
  c.width = W; c.height = Hh;
  const g = c.getContext('2d');
  g.fillStyle = d.pozadie; g.fillRect(0, 0, W, Hh);
  g.strokeStyle = d.pismo; g.globalAlpha = 0.35; g.lineWidth = 6 * k; g.strokeRect(10 * k, 10 * k, W - 20 * k, Hh - 20 * k); g.globalAlpha = 1;
  symbol(g, d.symbol, 128 * k, Hh / 2, 82 * k, d.pismo);
  g.fillStyle = d.pismo;
  g.textBaseline = 'middle';
  // služba: veľký druh (POLÍCIA) a pod ním meno; podnik: veľké meno (ako na skutočnom vývesnom štíte) a pod ním druh
  let velky = hlavny, maly = s.nazov && s.nazov.toUpperCase() !== hlavny ? s.nazov : '';
  if (d.maly && s.nazov) { velky = s.nazov; maly = hlavny; }
  let v = 92 * k;
  g.font = `bold ${v}px DejaVu Sans, Arial, sans-serif`;
  while (g.measureText(velky).width > W - 290 * k && v > 40 * k) { v -= 4 * k; g.font = `bold ${v}px DejaVu Sans, Arial, sans-serif`; }
  g.fillText(velky, 250 * k, maly ? Hh * 0.38 : Hh / 2);
  if (maly) {
    let m = (d.maly ? 50 : 40) * k;
    g.font = `${m}px DejaVu Sans, Arial, sans-serif`;
    while (g.measureText(maly).width > W - 290 * k && m > 20 * k) { m -= 2 * k; g.font = `${m}px DejaVu Sans, Arial, sans-serif`; }
    g.fillText(maly, 252 * k, Hh * 0.74);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  textury.set(kluc, t);
  return t;
}

const plocha = (b) => b.reduce((a, p, i) => { const q = b[(i + 1) % b.length]; return a + p[0] * q[1] - q[0] * p[1]; }, 0) / 2;

export default {
  nazov: 'oznacenia',
  poradie: 61,

  async init(hra) {
    this.hra = hra;
    this.stvorce = new Map();
    this.skupina = new THREE.Group();
    this.skupina.name = 'oznacenia';
    hra.scena.add(this.skupina);
    this.cas = 0;
    this.fronta = [];
    this.znacky = new Set();
    this.dlazdice = new Map();
    hra.stav.miestaSluzieb = [];
    const pridajDlazdicu = (kluc, data) => {
      if (data) this.dlazdice.set(kluc, { budovy: data.budovy ?? [], cesty: [...(data.cesty ?? []), ...(data.chodniky ?? [])] });
    };
    hra.na('dlazdica-nacitana', ({ kluc, data }) => pridajDlazdicu(kluc, data));
    // dlaždice načítané ešte pred štartom modulu
    for (const [kluc, a] of hra.mapa.dlazdice?.aktivne ?? []) pridajDlazdicu(kluc, a.data);
    hra.na('dlazdica-uvolnena', ({ kluc }) => this.dlazdice.delete(kluc));
    const nacitaj = (subor) => fetch(subor).then((r) => (r.ok ? r.json() : {})).then((d) => d.sluzby ?? []).catch(() => []);
    const [sluzby, podniky] = await Promise.all([nacitaj('data/mapa/sluzby.json'), nacitaj('data/mapa/podniky.json')]);
    this.sluzby = [...sluzby, ...podniky].filter((s) => DRUHY[s.typ]);
    if (!this.sluzby.length) return;
    this.sluzby.forEach((s, i) => {
      s.id = i;
      const k = `${Math.floor(s.x / STVOREC)},${Math.floor(s.z / STVOREC)}`;
      if (!this.stvorce.has(k)) this.stvorce.set(k, { sluzby: [], skupina: null, cx: (Math.floor(s.x / STVOREC) + 0.5) * STVOREC, cz: (Math.floor(s.z / STVOREC) + 0.5) * STVOREC });
      this.stvorce.get(k).sluzby.push(s);
    });
    // názvy pre js/ui/lokality.js (tabuľa sa ukáže pri príchode k miestu)
    hra.stav.miestaSluzieb = this.sluzby.filter((s) => s.nazov).map((s) => ({ nazov: s.nazov, x: s.x, z: s.z, dosah: DRUHY[s.typ].dosah }));
    this.matStojan = new THREE.MeshStandardMaterial({ color: '#4a4e53', roughness: 0.5, metalness: 0.6 });
    console.info(`Označenia: ${sluzby.length} služieb a ${podniky.length} podnikov (OSM)`);
  },

  /** Budova z načítaných dlaždíc, v ktorej leží bod (služba je v OSM len bod), inak najbližšia do 12 m (vchod). */
  budovaPreBod(x, z) {
    let naj = null, dmin = 12;
    for (const d of this.dlazdice.values()) {
      for (const b of d.budovy) {
        if (!(b.body?.length > 2) || Math.abs(b.body[0][0] - x) > 300 || Math.abs(b.body[0][1] - z) > 300) continue;
        if (bodVPolygone(x, z, b.body)) return b.body;
        const v = vzdialenostOdOkraja(x, z, b.body);
        if (v < dmin) { dmin = v; naj = b.body; }
      }
    }
    return naj;
  },

  /** Leží bod vnútri inej budovy (stena susedí so susedným domom)? */
  vInejBudove(x, z, obrys) {
    for (const d of this.dlazdice.values()) {
      for (const b of d.budovy) {
        if (b.body === obrys || !(b.body?.length > 2) || Math.abs(b.body[0][0] - x) > 300 || Math.abs(b.body[0][1] - z) > 300) continue;
        if (bodVPolygone(x, z, b.body)) return true;
      }
    }
    return false;
  },

  /** Cesty z načítaných dlaždíc blízko bodu (úsečky). */
  usekyCiest(x, z, r = 60) {
    const out = [];
    for (const d of this.dlazdice.values()) {
      for (const c of d.cesty) {
        for (let i = 0; i < c.body.length - 1; i++) {
          const [ax, az] = c.body[i], [bx, bz] = c.body[i + 1];
          if (Math.min(Math.hypot(ax - x, az - z), Math.hypot(bx - x, bz - z)) < r + Math.hypot(bx - ax, bz - az)) out.push([ax, az, bx, bz]);
        }
      }
    }
    return out;
  },

  /** Tabuľa na fasáde: stena najbližšie k ulici (inak najdlhšia), 3,4 m nad terénom, lícom von. */
  tabulaNaFasade(s, g, obrys = s.budova) {
    const maly = DRUHY[s.typ].maly;
    // bod podniku v OSM (nie obrys celej budovy) označuje jeho vchod
    const priBode = maly && !(s.budova?.length > 2);
    let b = obrys;
    if (plocha(b) < 0) b = [...b].reverse();
    const cx = b.reduce((a, p) => a + p[0], 0) / b.length, cz = b.reduce((a, p) => a + p[1], 0) / b.length;
    const useky = this.usekyCiest(cx, cz);
    const odCesty = (x, z) => {
      let m = Infinity;
      for (const [ax, az, bx, bz] of useky) {
        const dx = bx - ax, dz = bz - az, l = dx * dx + dz * dz || 1;
        const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / l));
        m = Math.min(m, Math.hypot(ax + dx * t - x, az + dz * t - z));
      }
      return m;
    };
    let best = -1, i0 = 0, skore = Infinity;
    for (let i = 0; i < b.length; i++) {
      const q = b[(i + 1) % b.length], L = Math.hypot(q[0] - b[i][0], q[1] - b[i][1]);
      if (L < 3) continue;
      // stena pri susednom dome (radová zástavba) – tam tabuľa nepatrí
      const vx = (q[1] - b[i][1]) / L, vz = -(q[0] - b[i][0]) / L;
      if (this.vInejBudove((b[i][0] + q[0]) / 2 + vx * 1.5, (b[i][1] + q[1]) / 2 + vz * 1.5, obrys)) continue;
      // blízko ulice / chodníka, nie príliš krátka stena, a čo najbližšie k bodu služby (vchod)
      // podnik: bod v OSM je pri jeho vchode – váži viac než blízkosť ulice
      const kBodu = Math.sqrt(najblizsiNaUsecke(s.x, s.z, b[i][0], b[i][1], q[0], q[1]).d2) * (priBode ? 1.5 : 0.3);
      const v = useky.length ? odCesty((b[i][0] + q[0]) / 2, (b[i][1] + q[1]) / 2) - Math.min(L, 20) * 0.15 + kBodu : kBodu - L;
      if (v < skore) { skore = v; best = L; i0 = i; }
    }
    if (best < 0) return this.stojan(s, g);
    const a = b[i0], q = b[(i0 + 1) % b.length];
    const ux = (q[0] - a[0]) / best, uz = (q[1] - a[1]) / best;
    // obrys je v rovine x, z (z na juh) – pri kladnej ploche je von normála (uz, −ux)
    const nx = uz, nz = -ux;
    const sir = maly ? Math.min(3.2, Math.max(1.6, best * 0.4)) : Math.min(6.0, Math.max(2.2, best * 0.5)), vys = sir / 4;
    // služba: stred steny; podnik: pri jeho bode (viac podnikov na jednej stene sa neprekrýva)
    let t0 = 0.5;
    if (priBode) {
      const okraj = Math.min(0.5, (sir / 2 + 0.3) / best);
      t0 = Math.max(okraj, Math.min(1 - okraj, najblizsiNaUsecke(s.x, s.z, a[0], a[1], q[0], q[1]).t));
    }
    const mx = a[0] + (q[0] - a[0]) * t0 + nx * 0.14, mz = a[1] + (q[1] - a[1]) * t0 + nz * 0.14;
    const y = this.hra.mapa.vyska(mx, mz) + (maly ? 2.8 : 3.4);
    const t = texturaTabule(s);
    const doska = new THREE.Mesh(new THREE.PlaneGeometry(sir, vys), new THREE.MeshStandardMaterial({ map: t, emissiveMap: t, emissive: '#ffffff', emissiveIntensity: 0.22, roughness: 0.45, metalness: 0.1 }));
    doska.position.set(mx, y + vys / 2, mz);
    doska.rotation.y = Math.atan2(nx, nz);
    const ram = new THREE.Mesh(new THREE.BoxGeometry(sir + 0.12, vys + 0.12, 0.08), this.matStojan);
    ram.position.copy(doska.position).addScaledVector(new THREE.Vector3(nx, 0, nz), -0.045);
    ram.rotation.y = doska.rotation.y;
    g.add(ram, doska);
  },

  /** Stojan (pylón) s tabuľou z oboch strán. */
  stojan(s, g) {
    let x = s.x, z = s.z;
    if (s.areal && s.areal.length > 2) {
      // veľký areál: stojan pri okraji (stred najdlhšej hrany, 4 m dnu), malý: v strede
      const b = plocha(s.areal) < 0 ? [...s.areal].reverse() : s.areal;
      if (Math.abs(plocha(b)) > 4000) {
        let best = -1, i0 = 0;
        for (let i = 0; i < b.length; i++) { const q = b[(i + 1) % b.length], L = Math.hypot(q[0] - b[i][0], q[1] - b[i][1]); if (L > best) { best = L; i0 = i; } }
        const a = b[i0], q = b[(i0 + 1) % b.length];
        const ux = (q[0] - a[0]) / best, uz = (q[1] - a[1]) / best;
        x = (a[0] + q[0]) / 2 - uz * 4; z = (a[1] + q[1]) / 2 + ux * 4;
      }
    }
    const y = this.hra.mapa.vyska(x, z);
    const sir = 2.6, vys = 0.65;
    const telo = new THREE.Mesh(new THREE.BoxGeometry(0.2, 2.6, 0.2), this.matStojan);
    telo.position.set(x, y + 1.3, z);
    g.add(telo);
    const t = texturaTabule(s);
    const mat = new THREE.MeshStandardMaterial({ map: t, emissiveMap: t, emissive: '#ffffff', emissiveIntensity: 0.22, roughness: 0.45, metalness: 0.1, side: THREE.DoubleSide });
    const doska = new THREE.Mesh(new THREE.PlaneGeometry(sir, vys), mat);
    doska.position.set(x, y + 2.5, z);
    doska.rotation.y = (s.id * 2.399) % Math.PI;
    const ram = new THREE.Mesh(new THREE.BoxGeometry(sir + 0.1, vys + 0.1, 0.06), this.matStojan);
    ram.position.copy(doska.position); ram.rotation.y = doska.rotation.y;
    g.add(ram, doska);
    this.hra.mapa.kolizie?.pridajKruh?.(x, z, 0.25, { typ: 'stojan' });
  },

  /** Je načítaná podrobná dlaždica s bodom (x, z)? */
  budovaDlazdice(x, z) {
    for (const d of this.dlazdice.values()) {
      if (d.budovy.some((b) => b.body?.length && Math.abs(b.body[0][0] - x) < 260 && Math.abs(b.body[0][1] - z) < 260)) return true;
    }
    return false;
  },

  /** Štvorec sa stavia postupne – tabule jeho služieb idú do fronty (pár za snímok, viď update). */
  postavStvorec(st) {
    st.skupina = new THREE.Group();
    this.skupina.add(st.skupina);
    for (const s of st.sluzby) this.fronta.push([st, s]);
  },

  postavSluzbu(st, s) {
    const g = new THREE.Group();
    g.userData.sluzba = s;
    const budova = s.budova?.length > 2 ? s.budova : !s.areal ? this.budovaPreBod(s.x, s.z) : null;
    if (budova) this.tabulaNaFasade(s, g, budova);
    else this.stojan(s, g);
    for (const o of g.children) { o.castShadow = true; o.receiveShadow = true; }
    st.skupina.add(g);
  },

  update(dt, hra) {
    if (!this.stvorce?.size) return;
    // rozostavané tabule: najviac ~3 ms za snímok (celý štvorec naraz trval v centre aj 100 ms – hra sekla)
    if (this.fronta.length) {
      const koniec = performance.now() + 3;
      while (this.fronta.length && performance.now() < koniec) {
        const [st, s] = this.fronta.shift();
        if (st.skupina) this.postavSluzbu(st, s);
      }
    }
    this.cas -= dt;
    if (this.cas > 0) return;
    this.cas = 1.0;
    const { x, z } = hra.stav.pozicia;
    for (const st of this.stvorce.values()) {
      const d = Math.hypot(st.cx - x, st.cz - z);
      if (d < DOHLAD + STVOREC * 0.7) {
        st.cakanie = (st.cakanie ?? 0) + 1;
        // počkaj na budovy z dlaždice (bod služby sa umiestni na fasádu), najviac 6 s
        if (!st.skupina && (this.budovaDlazdice(st.cx, st.cz) || st.cakanie > 6)) this.postavStvorec(st);
        if (st.skupina) st.skupina.visible = true;
      } else if (st.skupina) st.skupina.visible = false;
    }
    // značky na minimape pre blízke služby
    for (const s of this.sluzby) {
      const d = Math.hypot(s.x - x, s.z - z), id = `sluzba-${s.id}`;
      if (!DRUHY[s.typ].mapa) continue;
      if (d < ZNACKY && !this.znacky.has(id)) {
        this.znacky.add(id);
        hra.posli('znacka-mapy', { id, x: s.x, z: s.z, farba: DRUHY[s.typ].mapa, popis: s.nazov });
      } else if (d > ZNACKY * 1.2 && this.znacky.has(id)) {
        this.znacky.delete(id);
        hra.posli('znacka-mapy-zrus', { id });
      }
    }
  },
};
