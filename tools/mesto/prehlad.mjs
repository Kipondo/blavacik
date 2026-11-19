// Vyrobí dáta pre prehľadovú 2D mapu (nastroje/prehlad/): budovy, cesty, zeleň, voda, stromy
// v kompaktnom binárnom tvare (base64 v JSON). Súradnice: Uint16, 0,5 m, od ľavého horného rohu mapy.
//
// Spustenie (po dlazdice.mjs): node prehlad.mjs

import { readFileSync, writeFileSync, readdirSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { VYSTUP, KOREN } from './spolocne.mjs';

const index = JSON.parse(readFileSync(join(VYSTUP, 'index.json'), 'utf8'));
const H = index.hranice;
const CIEL = join(KOREN, 'nastroje/prehlad/data');
mkdirSync(CIEL, { recursive: true });
const sx = (x) => Math.max(0, Math.min(65535, Math.round((x - H.minX) * 2)));
const sz = (z) => Math.max(0, Math.min(65535, Math.round((z - H.minZ) * 2)));

const TYPY_CIEST = ['motorway', 'trunk', 'primary', 'secondary', 'tertiary', 'unclassified', 'residential', 'living_street', 'service',
  'motorway_link', 'trunk_link', 'primary_link', 'secondary_link', 'tertiary_link'];
const POKRYVKA = ['trava', 'les', 'cintorin', 'ihrisko', 'parkovisko', 'dlazba', 'piesok', 'zeleznica', 'stavenisko'];

// zapisovač: zoznam záznamov [hlavička bajty..., počet bodov, body]
class Zapis {
  constructor() { this.casti = []; this.dlzka = 0; }
  u8(...v) { const b = Buffer.from(v); this.casti.push(b); this.dlzka += b.length; }
  u16(...v) { const b = Buffer.alloc(v.length * 2); v.forEach((x, i) => b.writeUInt16LE(x, i * 2)); this.casti.push(b); this.dlzka += b.length; }
  body(pole) {
    this.u16(pole.length);
    const b = Buffer.alloc(pole.length * 4);
    pole.forEach(([x, z], i) => { b.writeUInt16LE(sx(x), i * 4); b.writeUInt16LE(sz(z), i * 4 + 2); });
    this.casti.push(b); this.dlzka += b.length;
  }
  // binárne dáta ukladáme ako base64 v JSON (dá sa servírovať odkiaľkoľvek, aj z artefaktu)
  uloz(meno) { writeFileSync(join(CIEL, meno), JSON.stringify({ base64: Buffer.concat(this.casti).toString('base64') })); return this.dlzka; }
}

const budovy = new Zapis(), cesty = new Zapis(), zelen = new Zapis(), stromy = new Zapis(), chodniky = new Zapis();
const mena = [];
let pocet = { budovy: 0, cesty: 0, zelen: 0, stromy: 0, chodniky: 0 };
for (const subor of readdirSync(join(VYSTUP, 'd'))) {
  const d = JSON.parse(readFileSync(join(VYSTUP, 'd', subor), 'utf8'));
  for (const b of d.budovy ?? []) {
    const f = parseInt((b.farba ?? '#cccccc').slice(1), 16);
    const typ = b.sklo ? 1 : b.strecha ? 2 : 0;
    budovy.u8((f >> 16) & 255, (f >> 8) & 255, f & 255, Math.min(255, Math.round(b.vyska)), typ);
    budovy.body(b.body);
    if (b.nazov) mena.push([pocet.budovy, b.nazov]);
    pocet.budovy++;
  }
  for (const c of d.cesty ?? []) {
    cesty.u8(Math.max(0, TYPY_CIEST.indexOf(c.typ)), Math.min(255, Math.round(c.sirka * 4)), (c.jednosmerka ? 1 : 0) | (c.most ? 2 : 0) | (c.elektricka ? 4 : 0));
    cesty.body(c.body);
    pocet.cesty++;
  }
  for (const c of d.chodniky ?? []) {
    chodniky.u8(Math.min(255, Math.round(c.sirka * 4)));
    chodniky.body(c.body);
    pocet.chodniky++;
  }
  for (const p of d.pokryvka ?? []) {
    zelen.u8(Math.max(0, POKRYVKA.indexOf(p.k)));
    zelen.body(p.body);
    pocet.zelen++;
  }
  for (const s of d.stromy ?? []) { stromy.u16(sx(s[0]), sz(s[1])); pocet.stromy++; }
}
const velkosti = {
  budovy: budovy.uloz('budovy.json'), cesty: cesty.uloz('cesty.json'), chodniky: chodniky.uloz('chodniky.json'),
  zelen: zelen.uloz('zelen.json'), stromy: stromy.uloz('stromy.json'),
};
writeFileSync(join(CIEL, 'meta.json'), JSON.stringify({
  hranice: H, stred: index.stred, hranica: index.hranica, voda: index.voda.map((v) => ({ reka: v.reka, nazov: v.nazov, body: v.body })),
  mosty: index.mosty, typyCiest: TYPY_CIEST, pokryvka: POKRYVKA, mena, pocet, licencia: index.licencia,
}));
console.log(pocet, Object.fromEntries(Object.entries(velkosti).map(([k, v]) => [k, `${(v / 1e6).toFixed(1)} MB`])));
