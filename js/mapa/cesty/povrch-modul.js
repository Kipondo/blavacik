// Modul: výška povrchu ciest a chodníkov pre autá a chodcov.
// Vozovka leží 0,12 m nad terénom a chodník s obrubníkom 0,28 m (js/mapa/cesty/cesty.js, chodniky.js),
// ale autá a chodci stáli na teréne – kolesá boli 12 cm vo vozovke, nohy 28 cm v chodníku.
// Pre každú detailnú dlaždicu sa preto nakreslí mapa povrchu po 1 m (0 = zem, 1 = vozovka, 2 = chodník)
// a hra.mapa.vyska(x, z) (výška povrchu) k terénu pripočíta výšku vozovky alebo chodníka.
// Pôvodná výška terénu ostáva ako hra.mapa.vyskaZeme(x, z) – na stavbu vecí, ktoré si výšku nad terénom
// určujú samé (napr. cyklopruhy).

import { NAD_TERENOM } from './cesty.js';
import { cestyVJadre } from '../teren/textura-zeme.js';

const N = 500;                // pixelov na dlaždicu (1 m)
const CHODNIK = 0.28;         // výška chodníka nad terénom (chodniky.js)
const SIRKA_CHODNIKA = 2.76;  // obrubník + chodník (chodniky.js)
const S_CHODNIKOM = new Set(['primary', 'secondary', 'tertiary', 'residential', 'unclassified', 'living_street',
  'primary_link', 'secondary_link', 'tertiary_link']);
const POSUN = [0, NAD_TERENOM, CHODNIK];
// číselný kľúč dlaždice (hra.mapa.vyska sa volá veľmi často – bez skladania reťazcov)
const cislo = (i, j) => (i + 4096) * 8192 + (j + 4096);
const cisloKluca = (kluc) => { const [i, j] = kluc.split('_').map(Number); return cislo(i, j); };

/** Mapa povrchu dlaždice: Uint8Array N × N (0 zem, 1 vozovka, 2 chodník). */
function mapaPovrchu(d, x0, z0, velkost) {
  const m = N / velkost;
  const platno = () => { const c = document.createElement('canvas'); c.width = c.height = N; return c.getContext('2d', { willReadFrequently: true }); };
  const gc = platno(), gch = platno();
  for (const g of [gc, gch]) { g.lineCap = 'round'; g.lineJoin = 'round'; g.strokeStyle = '#fff'; }
  // cesty vydláždené ako pešia zóna v historickom jadre sa nestavajú ako vozovka (postav-dlazdicu.js)
  const dlazdene = d._detailTerenu ? new Set(cestyVJadre(d.cesty)) : null;
  for (const c of d.cesty ?? []) {
    if (c.nadjazd || dlazdene?.has(c) || (c.body?.length ?? 0) < 2) continue;
    const ciara = (g, sirka) => {
      g.lineWidth = sirka * m;
      g.beginPath();
      c.body.forEach(([x, z], i) => (i ? g.lineTo((x - x0) * m, (z - z0) * m) : g.moveTo((x - x0) * m, (z - z0) * m)));
      g.stroke();
    };
    ciara(gc, c.sirka ?? 6);
    if (S_CHODNIKOM.has(c.typ) && !c.most) ciara(gch, (c.sirka ?? 6) + 2 * SIRKA_CHODNIKA);
  }
  const a = gc.getImageData(0, 0, N, N).data, b = gch.getImageData(0, 0, N, N).data;
  const out = new Uint8Array(N * N);
  for (let i = 0, o = 3; i < out.length; i++, o += 4) out[i] = a[o] > 127 ? 1 : b[o] > 127 ? 2 : 0;
  return out;
}

export default {
  nazov: 'povrch',
  poradie: 54,

  init(hra) {
    const sprava = hra.mapa.dlazdice;
    if (!sprava) return;
    const velkost = sprava.velkost ?? 500;
    this.mapy = new Map();
    const pridaj = ({ kluc, uroven, data }) => {
      if (uroven !== 'detail' || !data) { this.mapy.delete(cisloKluca(kluc)); return; }
      const [i, j] = kluc.split('_').map(Number);
      this.mapy.set(cislo(i, j), mapaPovrchu(data, i * velkost, j * velkost, velkost));
    };
    for (const [kluc, a] of sprava.aktivne) pridaj({ kluc, uroven: a.uroven, data: a.data });
    hra.na('dlazdica-nacitana', pridaj);
    hra.na('dlazdica-uvolnena', ({ kluc, nahrada }) => { if (!nahrada) this.mapy.delete(cisloKluca(kluc)); });

    const zem = hra.mapa.vyska;
    const mapy = this.mapy;
    hra.mapa.vyskaZeme = zem;
    hra.mapa.vyska = (x, z, y) => {
      const h = zem(x, z, y);
      const i = Math.floor(x / velkost), j = Math.floor(z / velkost);
      const mp = mapy.get(cislo(i, j));
      if (!mp) return h;
      const px = Math.floor((x - i * velkost) / velkost * N), pz = Math.floor((z - j * velkost) / velkost * N);
      return h + POSUN[mp[pz * N + px]];
    };
  },
};
