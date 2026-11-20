// Spracuje GTFS cestovné poriadky MHD Bratislava → data/mhd/ (opakovateľne).
//
// Vstup:  .cache/mhd/GTFS_latest.zip (node tools/mhd/stiahni.mjs)
//         data/mapa/mesto/d/*.json   (dlaždice mapy – len čítanie: cesty a koľaje)
// Výstup: data/mhd/index.json        – linky, kalendár služieb, zdroj, licencia, štatistika
//         data/mhd/zastavky.json     – zastávky s nástupišťami (poloha, smer, linky)
//         data/mhd/trasy/<linka>.json    – trasy linky po skutočných cestách/koľajach
//         data/mhd/poriadky/<linka>.json – spoje (odchody) a jazdné doby
//
// Spustenie: node --max-old-space-size=4000 tools/mhd/spracuj.mjs
import { mkdirSync, rmSync, writeFileSync, existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { GTFS_ZIP, VYSTUP, KOREN, naMetre, r1, typLinky, nazovSuboru } from './spolocne.mjs';
import { nacitajGtfs } from './gtfs.mjs';
import { vyrobVzory, vyrobKalendar } from './vzory.mjs';
import { nacitajDlazdice, sietElektriciek, sietCiest } from './siet.mjs';
import { Trasovac } from './trasovanie.mjs';
import { zjednodusTrasu, smerNaKm } from './geometria.mjs';
import { vyrobZastavky, porovnajSOsm } from './zastavky.mjs';

if (!existsSync(GTFS_ZIP)) throw new Error(`Chýba ${GTFS_ZIP} – spusti najprv node tools/mhd/stiahni.mjs`);
const zapis = (cesta, data) => writeFileSync(join(VYSTUP, cesta), JSON.stringify(data));

console.log('Načítavam GTFS…');
const gtfs = nacitajGtfs(GTFS_ZIP);
const nastupistia = new Map();
for (const s of gtfs.stops) {
  const [x, z] = naMetre(Number(s.stop_lon), Number(s.stop_lat));
  nastupistia.set(s.stop_id, { id: s.stop_id, kod: s.stop_code, nazov: s.stop_name, oznacenie: s.platform_code, pasmo: s.zone_id, x: r1(x), z: r1(z) });
}
const { linky, sluzby } = vyrobVzory(gtfs);
// Tvary trás z GTFS (hrubé – len náhrada tam, kde v mape chýbajú koľaje/cesty)
const tvary = new Map();
for (const b of gtfs.shapes) {
  if (!tvary.has(b.shape_id)) tvary.set(b.shape_id, []);
  tvary.get(b.shape_id).push([Number(b.shape_pt_sequence), ...naMetre(Number(b.shape_pt_lon), Number(b.shape_pt_lat))]);
}
for (const [k, v] of tvary) tvary.set(k, v.sort((a, b) => a[0] - b[0]).map(([, x, z]) => [x, z]));

console.log('Staviam siete z dlaždíc mapy…');
const { cesty, kolaje } = nacitajDlazdice();
const trasovace = {
  koľaje: new Trasovac(sietElektriciek(kolaje), 25),
  cesty: new Trasovac(sietCiest(cesty), 40),
};

rmSync(join(VYSTUP, 'trasy'), { recursive: true, force: true });
rmSync(join(VYSTUP, 'poriadky'), { recursive: true, force: true });
mkdirSync(join(VYSTUP, 'trasy'), { recursive: true });
mkdirSync(join(VYSTUP, 'poriadky'), { recursive: true });

const zoznam = [];
const naNastupisti = new Map(); // id nástupišťa → { linky:Set, typy:Set, smer, bod }
const routes = [...gtfs.routes].sort((a, b) => (a.route_sort_order || 0) - (b.route_sort_order || 0));
for (const route of routes) {
  const L = linky.get(route.route_id);
  if (!L) continue;
  const cislo = route.route_short_name;
  const typ = typLinky(route.route_type, cislo);
  const tr = typ === 'elektricka' ? trasovace.koľaje : trasovace.cesty;
  const subor = nazovSuboru(cislo);
  process.stdout.write(`  linka ${cislo} (${typ}, ${L.trasy.length} trás, ${L.spoje.length} spojov)\n`);

  const trasy = L.trasy.map((t) => {
    const zast = t.zastavky.map((id) => nastupistia.get(id));
    const v = tr.trasuj(zast, tvary.get(t.tvar));
    const { body, km } = zjednodusTrasu(v.body, v.indexy);
    zast.forEach((n, i) => {
      if (!naNastupisti.has(n.id)) naNastupisti.set(n.id, { linky: new Set(), typy: new Set() });
      const info = naNastupisti.get(n.id);
      info.linky.add(cislo); info.typy.add(typ);
      // Smer a bod na ceste podľa trasy s najviac spojmi
      if (!info.pocet || t.pocet > info.pocet) {
        info.pocet = t.pocet;
        info.smer = smerNaKm(body, km[i]).map((s) => Math.round(s * 1000) / 1000);
        info.bod = [r1(v.bodyZastavok[i].x), r1(v.bodyZastavok[i].z)];
      }
    });
    return { smer: t.smer, zastavky: t.zastavky, znamenie: t.znamenie, km, body };
  });

  zapis(`trasy/${subor}.json`, { linka: cislo, typ, trasy });
  zapis(`poriadky/${subor}.json`, { linka: cislo, ciele: L.ciele, profily: L.profily, spoje: L.spoje });
  zoznam.push({ linka: cislo, typ, subor, farba: `#${route.route_color || '888888'}`, text: `#${route.route_text_color || 'FFFFFF'}`, spojov: L.spoje.length });
}

console.log('Zastávky…');
const zastavky = vyrobZastavky(nastupistia, naNastupisti);
zapis('zastavky.json', { popis: 'VYGENEROVANÉ z GTFS (tools/mhd/spracuj.mjs) – needituj ručne.', zastavky });

const osm = porovnajSOsm(nastupistia, naNastupisti, KOREN);
const stat = {
  linky: zoznam.length,
  zastavky: zastavky.length,
  nastupistia: zastavky.reduce((s, z) => s + z.nastupistia.length, 0),
  spoje: zoznam.reduce((s, l) => s + l.spojov, 0),
  usekyElektricky: trasovace.koľaje.useky, usekyElektrickyTvarGtfs: trasovace.koľaje.tvarom, usekyElektrickyPriamka: trasovace.koľaje.nahradne,
  usekyCesty: trasovace.cesty.useky, usekyCestyTvarGtfs: trasovace.cesty.tvarom, usekyCestyPriamka: trasovace.cesty.nahradne,
  opravaSieteElektriciek: trasovace.koľaje.siet.oprava, opravaSieteCiest: trasovace.cesty.siet.oprava,
  porovnanieOsm: osm,
};
zapis('index.json', {
  popis: 'VYGENEROVANÉ z GTFS (tools/mhd/spracuj.mjs) – needituj ručne. Formát: data/mhd/README.md',
  zdroj: 'Cestovné poriadky MHD vo formáte GTFS – Dopravný podnik Bratislava, a. s. / hl. m. SR Bratislava (data.bratislava.sk)',
  licencia: 'CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/); trasy po cestách a koľajach: © prispievatelia OpenStreetMap, ODbL',
  verzia: gtfs.feed.feed_version, platnostOd: gtfs.feed.feed_start_date, platnostDo: gtfs.feed.feed_end_date,
  sluzby, kalendar: vyrobKalendar(gtfs), linky: zoznam, statistika: stat,
});
console.log(JSON.stringify(stat, null, 1));
for (const [meno, t] of Object.entries(trasovace)) {
  if (t.chyby.size) console.log(`Úseky bez spojenia (${meno}):`, [...t.chyby.keys()].join('; '));
}
