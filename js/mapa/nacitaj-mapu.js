// Načítanie dát mapy: ručná mapa (data/mapa/*.json) + voliteľne OSM (data/osm/bratislava.geojson).

import { rozmiestniAuta } from './spawn-aut.js';

async function nacitajJson(cesta, povinny = true) {
  try {
    const r = await fetch(cesta);
    if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
    return await r.json();
  } catch (e) {
    if (povinny) throw new Error(`Nepodarilo sa načítať ${cesta}: ${e.message}`);
    return null;
  }
}

/** Zlúči viac súborov mapy – polia sa spoja, objekty sa prepíšu. */
function zluc(ciel, zdroj) {
  for (const [k, v] of Object.entries(zdroj)) {
    if (k === 'popis') continue;
    if (Array.isArray(v)) ciel[k] = [...(ciel[k] ?? []), ...v];
    else if (v && typeof v === 'object') ciel[k] = { ...(ciel[k] ?? {}), ...v };
    else ciel[k] = v;
  }
  return ciel;
}

export async function nacitajDataMapy(KONFIG, priebeh = () => {}) {
  const zoznam = await nacitajJson('data/mapa/zoznam.json');
  const data = {};
  for (const subor of zoznam.subory) {
    priebeh(`Načítavam ${subor}…`);
    zluc(data, await nacitajJson(`data/mapa/${subor}`));
  }

  const pamiatky = await nacitajJson('data/mapa/pamiatky.json', false);
  data.pamiatky = pamiatky?.pamiatky ?? [];
  data.miesta = (await nacitajJson('data/mapa/miesta.json', false)) ?? {};

  // OSM – ak súbor existuje (vyrába ho tools/osm/prevod.mjs), nahradí ručné budovy, cesty a vodu
  priebeh('Načítavam mapu z OpenStreetMap…');
  const osm = await nacitajJson(KONFIG.OSM_SUBOR, false);
  if (osm?.budovy?.length) {
    for (const k of ['budovy', 'cesty', 'voda', 'mosty', 'stromy', 'chodniky', 'kolajnice', 'pokryvka', 'prvky']) {
      if (osm[k]) data[k] = osm[k];
    }
    data.plochy = [];   // námestia sú v pokrývke (textúra zeme)
    data.zony = [];
    data.licencia = osm.licencia;
    data.zdroj = 'osm';
    // autá na štarte postavíme na skutočné ulice
    data.spawn = { ...data.spawn, auta: rozmiestniAuta(data.cesty, data.spawn?.ulice ?? []) };
  } else {
    data.zdroj = 'rucna';
  }
  return data;
}
