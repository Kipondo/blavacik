// Prevod GeoJSON exportu z OpenStreetMap na formát mapy hry.
// Ako získať súbor: pozri data/osm/README.md
//
// Súradnice: lat/lon → metre od stredového bodu (KONFIG.OSM_STRED),
// x = východ, z = juh. Na pár kilometrov stačí jednoduchá rovinná projekcia.

import { stredBodov, plochaPolygonu } from './geometria.js';

const VYSKA_POSCHODIA = 3.2;

const SIRKY_CIEST = {
  motorway: 22, trunk: 18, primary: 16, secondary: 14, tertiary: 12,
  residential: 9, unclassified: 9, living_street: 7, service: 6,
  pedestrian: 8, motorway_link: 9, trunk_link: 9, primary_link: 9, secondary_link: 8,
};

const FARBY_BUDOV = ['#e9d8a6', '#f1e3c6', '#e8c4a0', '#d9e4c8', '#f4efe4', '#c9c6bd', '#b8b4aa', '#a9b4bd'];

export function prevedOsm(geojson, stred, pamiatky = []) {
  const kx = 111320 * Math.cos((stred.lat * Math.PI) / 180);
  const kz = 111132;
  const premen = ([lon, lat]) => [
    Math.round((lon - stred.lon) * kx * 10) / 10,
    Math.round(-(lat - stred.lat) * kz * 10) / 10,
  ];

  const budovy = [], cesty = [], voda = [];

  for (const f of geojson.features ?? []) {
    const t = f.properties ?? {};
    const g = f.geometry;
    if (!g) continue;

    // vonkajšie obrysy polygónov (multipolygóny rozložíme)
    const obrysy = g.type === 'Polygon' ? [g.coordinates[0]]
      : g.type === 'MultiPolygon' ? g.coordinates.map((p) => p[0]) : [];

    if (t.building || t['building:part']) {
      for (const o of obrysy) {
        const body = o.map(premen);
        if (body.length < 4 || Math.abs(plochaPolygonu(body)) < 12) continue;
        const [cx, cz] = stredBodov(body);
        // pamiatky s vlastným modelom majú prednosť
        if (pamiatky.some((p) => p.model && Math.hypot(p.x - cx, p.z - cz) < (p.zaber?.kruh ?? 30))) continue;
        let vyska = parseFloat(t.height);
        if (!vyska) vyska = (parseFloat(t['building:levels']) || 4) * VYSKA_POSCHODIA + 1;
        budovy.push({
          body,
          vyska: Math.round(vyska),
          farba: farbaBudovy(t, cx, cz),
        });
      }
    } else if (t.natural === 'water' || t.waterway === 'riverbank' || t.water === 'river') {
      for (const o of obrysy) voda.push({ nazov: t.name ?? 'voda', body: o.map(premen) });
    } else if (t.highway && SIRKY_CIEST[t.highway]) {
      const ciary = g.type === 'LineString' ? [g.coordinates] : g.type === 'MultiLineString' ? g.coordinates : [];
      for (const c of ciary) {
        const sirka = (parseFloat(t.lanes) ? parseFloat(t.lanes) * 3.5 : SIRKY_CIEST[t.highway]);
        cesty.push({ nazov: t.name ?? '', sirka, body: c.map(premen), typ: t.highway, most: t.bridge === 'yes' });
      }
    }
  }
  return { budovy, cesty, voda };
}

function farbaBudovy(t, x, z) {
  if (t['building:colour']) return t['building:colour'];
  const i = Math.abs(Math.floor(x * 7 + z * 13)) % FARBY_BUDOV.length;
  return FARBY_BUDOV[i];
}
