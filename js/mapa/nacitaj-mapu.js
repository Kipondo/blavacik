// Načítanie dát mapy: ručná mapa (data/mapa/*.json) + voliteľne OSM (data/osm/bratislava.geojson).

import { prevedOsm } from './osm.js';

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

  // OSM – ak súbor existuje, nahradí ručné budovy, cesty a vodu
  priebeh('Hľadám OSM dáta…');
  const osm = await nacitajJson(KONFIG.OSM_SUBOR, false);
  if (osm?.features?.length) {
    priebeh('Spracúvam OSM dáta…');
    const z = prevedOsm(osm, KONFIG.OSM_STRED, data.pamiatky);
    if (z.budovy.length) { data.budovy = z.budovy; data.stromy = []; }
    if (z.cesty.length) data.cesty = z.cesty;
    if (z.voda.length) data.voda = z.voda;
    data.zdroj = 'osm';
    console.info(`OSM: ${z.budovy.length} budov, ${z.cesty.length} ciest, ${z.voda.length} vodných plôch`);
  } else {
    data.zdroj = 'rucna';
  }
  return data;
}
