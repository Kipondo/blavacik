// Načítanie OSM .pbf do rovnakej štruktúry, akú používa tools/osm/zostav.mjs:
//   db = { uzly: Map(id → {lat, lon, t}), cesty: Map(id → {nd, t}), relacie: Map(id → {cleny, t}) }

import { createReadStream } from 'node:fs';
import parseOSM from 'osm-pbf-parser';

export function nacitajPbf(subor) {
  return new Promise((ok, chyba) => {
    const db = { uzly: new Map(), cesty: new Map(), relacie: new Map() };
    const p = parseOSM();
    createReadStream(subor).pipe(p)
      .on('data', (polozky) => {
        for (const it of polozky) {
          const t = it.tags && Object.keys(it.tags).length ? it.tags : null;
          if (it.type === 'node') db.uzly.set(String(it.id), { lat: it.lat, lon: it.lon, t });
          else if (it.type === 'way') db.cesty.set(String(it.id), { nd: it.refs.map(String), t: it.tags ?? {} });
          else if (it.type === 'relation') {
            db.relacie.set(String(it.id), {
              t: it.tags ?? {},
              cleny: it.members.map((m) => ({ typ: m.type, ref: String(m.id), rola: m.role ?? '' })),
            });
          }
        }
      })
      .on('end', () => ok(db))
      .on('error', chyba);
  });
}
