// Generátor ručnej mapy: z data/mapa/zakladna.json vyrobí data/mapa/budovy.json
// (budovy a stromy). Výsledok je deterministický – rovnaký seed = rovnaká mapa.
//
// Spustenie:  node tools/generuj-mapu.mjs
//
// Ak upravíš cesty alebo pamiatky v zakladna.json, spusti generátor znova,
// aby budovy nestáli na nových cestách.

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import {
  bodVPolygone, vzdialenostOdCiary, usekaPretinaObdlznik, obdlznik, nahodne,
} from '../js/mapa/geometria.js';

const koren = join(dirname(fileURLToPath(import.meta.url)), '..');
const zakladna = JSON.parse(readFileSync(join(koren, 'data/mapa/zakladna.json'), 'utf8'));
const rnd = nahodne(20261119);
const medzi = (a, b) => a + rnd() * (b - a);
const vyber = (pole) => pole[Math.floor(rnd() * pole.length)];
const zaokruhli = (v) => Math.round(v * 10) / 10;

// --- Štvrte a ich štýl ---------------------------------------------------
const PALETY = {
  stareMesto: ['#e9d8a6', '#f1e3c6', '#e8c4a0', '#f3d1c4', '#d9e4c8', '#f4efe4', '#e6cf8f', '#d8c3a5'],
  strechyStare: ['#9c3d2b', '#8a4b33', '#a5523a', '#7a3b2c'],
  centrum: ['#c9c6bd', '#b8b4aa', '#d6d0c2', '#a9b4bd', '#e0dbd0', '#c2b59b'],
  moderne: ['#8fa7b8', '#a3b9c7', '#7b93a6', '#c8d3da', '#9ea7ad', '#d5d8d6'],
  vily: ['#f4efe4', '#ece2cf', '#e6d6bf', '#f0e6d8', '#dfe6e0'],
  strechyVily: ['#7a3b2c', '#5a4a42', '#8a4b33', '#4f5a5e'],
  panelaky: ['#f2f0ea', '#e9e5da', '#f6d28b', '#a8d0e6', '#f4a6a6', '#b8e0b0', '#d9c2f0', '#ffd8a8'],
};

const STVRTE = [
  {
    nazov: 'Staré Mesto', minX: -250, maxX: 350, minZ: -300, maxZ: 428,
    bunka: 15, medzera: 0.6, vyska: [9, 18], hustota: 0.96,
    farby: PALETY.stareMesto, strechy: PALETY.strechyStare,
  },
  {
    nazov: 'Sever centra', minX: -230, maxX: 700, minZ: -700, maxZ: -300,
    bunka: 26, medzera: 4, vyska: [14, 34], hustota: 0.85,
    farby: PALETY.centrum,
  },
  {
    nazov: 'Nové centrum', minX: 350, maxX: 1700, minZ: -700, maxZ: 380,
    bunka: 34, medzera: 6, vyska: [15, 55], hustota: 0.78,
    farby: PALETY.moderne,
  },
  {
    nazov: 'Vily pod hradom', minX: -1300, maxX: -262, minZ: -700, maxZ: 365,
    bunka: 20, medzera: 6, vyska: [6, 11], hustota: 0.5,
    farby: PALETY.vily, strechy: PALETY.strechyVily,
  },
  {
    nazov: 'Petržalka', minX: -1300, maxX: 1700, minZ: 830, maxZ: 1500,
    bunka: 75, medzera: 12, vyska: [24, 39], hustota: 0.85, panelaky: true,
    farby: PALETY.panelaky,
  },
];

// Miesta, kde nesmú byť budovy (pamiatky majú vlastné modely)
const VYNIMKY = [
  { typ: 'obdlznik', minX: 1015, maxX: 1295, minZ: 280, maxZ: 365 }, // Eurovea
  { typ: 'kruh', x: 1400, z: 250, r: 28 },  // mrakodrap
  { typ: 'kruh', x: -205, z: 205, r: 42 },  // Dóm
  { typ: 'kruh', x: -45, z: -175, r: 12 },  // Michalská brána
  { typ: 'kruh', x: -230, z: 838, r: 34 },  // UFO pylón
  { typ: 'kruh', x: 230, z: 990, r: 175 },  // Sad Janka Kráľa
];

const hradnyKopec = zakladna.kopce.find((k) => k.nazov === 'Hradný kopec');
const H = { minX: -1300, maxX: 1700, minZ: -700, maxZ: 1500 };

// --- Kontroly ------------------------------------------------------------
function narazaNaCestu(minX, minZ, maxX, maxZ, okraj) {
  for (const c of zakladna.cesty) {
    const r = c.sirka / 2 + okraj;
    for (let i = 0; i < c.body.length - 1; i++) {
      const [ax, az] = c.body[i];
      const [bx, bz] = c.body[i + 1];
      if (usekaPretinaObdlznik(ax, az, bx, bz, minX - r, minZ - r, maxX + r, maxZ + r)) return true;
    }
  }
  for (const m of zakladna.mosty) {
    const r = m.sirka / 2 + okraj;
    if (usekaPretinaObdlznik(m.od[0], m.od[1], m.do[0], m.do[1], minX - r, minZ - r, maxX + r, maxZ + r)) return true;
  }
  return false;
}

function jeVoVode(x, z, okraj = 0) {
  for (const v of zakladna.voda) {
    if (bodVPolygone(x, z, v.body)) return true;
    if (okraj > 0) {
      for (const [dx, dz] of [[okraj, 0], [-okraj, 0], [0, okraj], [0, -okraj]]) {
        if (bodVPolygone(x + dx, z + dz, v.body)) return true;
      }
    }
  }
  return false;
}

function jeVoVynimke(x, z, okraj = 0) {
  for (const v of VYNIMKY) {
    if (v.typ === 'kruh' && Math.hypot(x - v.x, z - v.z) < v.r + okraj) return true;
    if (v.typ === 'obdlznik' && x > v.minX - okraj && x < v.maxX + okraj && z > v.minZ - okraj && z < v.maxZ + okraj) return true;
  }
  for (const p of zakladna.plochy) {
    if (bodVPolygone(x, z, p.body)) return true;
  }
  return false;
}

function naHradnomKopci(x, z, okraj = 0) {
  return Math.hypot(x - hradnyKopec.x, z - hradnyKopec.z) < hradnyKopec.polomer * 0.92 + okraj;
}

function obdlznikJeVolny(minX, minZ, maxX, maxZ) {
  if (minX < H.minX + 5 || maxX > H.maxX - 5 || minZ < H.minZ + 5 || maxZ > H.maxZ - 5) return false;
  if (narazaNaCestu(minX, minZ, maxX, maxZ, 2)) return false;
  const body = [[minX, minZ], [maxX, minZ], [maxX, maxZ], [minX, maxZ], [(minX + maxX) / 2, (minZ + maxZ) / 2]];
  for (const [x, z] of body) {
    if (jeVoVode(x, z, 10)) return false;
    if (jeVoVynimke(x, z, 3)) return false;
    if (naHradnomKopci(x, z, 4)) return false;
  }
  return true;
}

// --- Budovy --------------------------------------------------------------
const budovy = [];
const obsadene = []; // ohraničenia budov pre kontrolu stromov

function pridajBudovu(minX, minZ, maxX, maxZ, vyska, farba, strecha) {
  const body = [[minX, minZ], [maxX, minZ], [maxX, maxZ], [minX, maxZ]].map(([x, z]) => [zaokruhli(x), zaokruhli(z)]);
  const b = { body, vyska: Math.round(vyska), farba };
  if (strecha) b.strecha = strecha;
  budovy.push(b);
  obsadene.push({ minX, minZ, maxX, maxZ });
}

for (const s of STVRTE) {
  for (let x = s.minX; x < s.maxX; x += s.bunka) {
    for (let z = s.minZ; z < s.maxZ; z += s.bunka) {
      if (rnd() > s.hustota) continue;
      let w, d;
      if (s.panelaky) {
        // dlhé panelákové bloky, náhodne otočené
        const dlhy = medzi(45, 66), uzky = medzi(12, 15);
        if (rnd() < 0.5) { w = dlhy; d = uzky; } else { w = uzky; d = dlhy; }
      } else {
        w = medzi(s.bunka * 0.55, s.bunka) - s.medzera;
        d = medzi(s.bunka * 0.55, s.bunka) - s.medzera;
      }
      const cx = x + s.bunka / 2 + medzi(-2, 2);
      const cz = z + s.bunka / 2 + medzi(-2, 2);
      let minX = cx - w / 2, maxX = cx + w / 2, minZ = cz - d / 2, maxZ = cz + d / 2;

      // ak sa nezmestí, skús menšiu budovu
      let pokus = 0;
      while (!obdlznikJeVolny(minX, minZ, maxX, maxZ) && pokus < 3) {
        w *= 0.7; d *= 0.7;
        minX = cx - w / 2; maxX = cx + w / 2; minZ = cz - d / 2; maxZ = cz + d / 2;
        pokus++;
      }
      if (pokus === 3 || w < 6 || d < 6) continue;

      let vyska = medzi(s.vyska[0], s.vyska[1]);
      if (s.panelaky) vyska = Math.round(vyska / 2.8) * 2.8;
      // pár výškových budov v novom centre
      if (s.nazov === 'Nové centrum' && rnd() < 0.08) vyska = medzi(70, 110);
      pridajBudovu(minX, minZ, maxX, maxZ, vyska, vyber(s.farby), s.strechy ? vyber(s.strechy) : undefined);
    }
  }
}

// --- Stromy --------------------------------------------------------------
const stromy = [];

function stromJeVolny(x, z) {
  if (x < H.minX + 3 || x > H.maxX - 3 || z < H.minZ + 3 || z > H.maxZ - 3) return false;
  if (jeVoVode(x, z, 3)) return false;
  for (const c of zakladna.cesty) {
    if (vzdialenostOdCiary(x, z, c.body) < c.sirka / 2 + 2) return false;
  }
  for (const m of zakladna.mosty) {
    if (vzdialenostOdCiary(x, z, [m.od, m.do]) < m.sirka / 2 + 2) return false;
  }
  for (const p of zakladna.plochy) {
    if (bodVPolygone(x, z, p.body)) return false;
  }
  for (const o of obsadene) {
    if (x > o.minX - 2.5 && x < o.maxX + 2.5 && z > o.minZ - 2.5 && z < o.maxZ + 2.5) return false;
  }
  for (const v of VYNIMKY) {
    if (v.typ === 'kruh' && v.r < 100 && Math.hypot(x - v.x, z - v.z) < v.r) return false;
    if (v.typ === 'obdlznik' && x > v.minX && x < v.maxX && z > v.minZ && z < v.maxZ) return false;
  }
  return true;
}

function pridajStrom(x, z) {
  if (!stromJeVolny(x, z)) return false;
  stromy.push([zaokruhli(x), zaokruhli(z), Math.round(medzi(0.8, 1.4) * 100) / 100]);
  return true;
}

// stromoradie na nábreží (medzi cestou a vodou)
const nabrezie = zakladna.cesty.find((c) => c.nazov === 'Nábrežie');
for (let i = 0; i < nabrezie.body.length - 1; i++) {
  const [ax, az] = nabrezie.body[i];
  const [bx, bz] = nabrezie.body[i + 1];
  const dlzka = Math.hypot(bx - ax, bz - az);
  for (let t = 0; t < dlzka; t += 16) {
    const x = ax + ((bx - ax) * t) / dlzka;
    const z = az + ((bz - az) * t) / dlzka;
    pridajStrom(x, z + 15);
  }
}

// Hradný kopec – svahy plné stromov (nie na plató s hradom)
for (let i = 0; i < 900; i++) {
  const u = rnd() * Math.PI * 2;
  const r = medzi(hradnyKopec.polomer * 0.4, hradnyKopec.polomer * 1.05);
  pridajStrom(hradnyKopec.x + Math.cos(u) * r, hradnyKopec.z + Math.sin(u) * r);
}

// Sad Janka Kráľa
for (let i = 0; i < 700; i++) {
  const u = rnd() * Math.PI * 2;
  const r = Math.sqrt(rnd()) * 165;
  pridajStrom(230 + Math.cos(u) * r, 990 + Math.sin(u) * r);
}

// zeleň medzi panelákmi a medzi vilami
for (let i = 0; i < 1400; i++) pridajStrom(medzi(-1290, 1690), medzi(840, 1490));
for (let i = 0; i < 900; i++) pridajStrom(medzi(-1290, -270), medzi(-690, 360));
// zopár stromov v meste
for (let i = 0; i < 500; i++) pridajStrom(medzi(-240, 1690), medzi(-690, 380));

const vystup = {
  popis: 'VYGENEROVANÉ – needituj ručne. Spusti: node tools/generuj-mapu.mjs',
  budovy,
  stromy,
};
writeFileSync(join(koren, 'data/mapa/budovy.json'), JSON.stringify(vystup));
console.log(`Hotovo: ${budovy.length} budov, ${stromy.length} stromov → data/mapa/budovy.json`);
