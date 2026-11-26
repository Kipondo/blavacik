# OSM dáta územia nového modelu (Overpass API) → .cache/model/osm.json (budovy, cesty, chodníky, plochy, voda, koľaje,
# mosty, stromy). © prispievatelia OpenStreetMap, ODbL.
# Spustenie: python tools/model/osm.py

import json, os, sys, time, urllib.parse, urllib.request

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from spolocne import CACHE, hranice, na_metre  # noqa: E402

SERVERY = ['https://overpass-api.de/api/interpreter', 'https://overpass.kumi.systems/api/interpreter']


def main():
    s, w, n, e = hranice(okraj=150)
    bb = f'{s},{w},{n},{e}'
    q = f"""[out:json][timeout:300];
(
  way["building"]({bb}); relation["building"]({bb});
  way["building:part"]({bb});
  way["highway"]({bb});
  way["area:highway"]({bb});
  way["railway"]({bb});
  way["landuse"]({bb}); relation["landuse"]({bb});
  way["leisure"]({bb}); relation["leisure"]({bb});
  way["natural"]({bb}); relation["natural"]({bb});
  way["amenity"~"parking|marketplace|fountain"]({bb});
  way["man_made"~"bridge|pier|embankment|dyke"]({bb});
  way["place"~"square"]({bb});
  way["waterway"]({bb}); relation["waterway"]({bb});
  way["barrier"~"wall|retaining_wall|city_wall"]({bb});
  node["natural"="tree"]({bb});
);
out geom;"""
    data = None
    for url in SERVERY * 2:
        try:
            req = urllib.request.Request(url, data=urllib.parse.urlencode({'data': q}).encode(), headers={'User-Agent': 'blavacik-model/1.0'})
            data = json.load(urllib.request.urlopen(req, timeout=400))
            break
        except Exception as ex:
            print('Overpass zlyhal:', url, ex)
            time.sleep(10)
    if data is None:
        raise SystemExit('Overpass nedostupný')
    prvky = []
    for el in data['elements']:
        t = el.get('tags', {})
        if el['type'] == 'node':
            prvky.append({'typ': 'n', 'id': el['id'], 't': t, 'b': [na_metre(el['lon'], el['lat'])]})
        elif el['type'] == 'way':
            prvky.append({'typ': 'w', 'id': el['id'], 't': t, 'b': [na_metre(p['lon'], p['lat']) for p in el.get('geometry', [])]})
        else:
            casti = []
            for m in el.get('members', []):
                if m.get('type') == 'way' and m.get('geometry'):
                    casti.append({'rola': m.get('role', ''), 'b': [na_metre(p['lon'], p['lat']) for p in m['geometry']]})
            prvky.append({'typ': 'r', 'id': el['id'], 't': t, 'casti': casti})
    os.makedirs(CACHE, exist_ok=True)
    with open(os.path.join(CACHE, 'osm.json'), 'w', encoding='utf8') as f:
        json.dump({'stiahnute': time.strftime('%Y-%m-%d %H:%M'), 'prvky': prvky}, f, ensure_ascii=False)
    druhy = {}
    for p in prvky:
        k = next((x for x in ('building', 'highway', 'railway', 'landuse', 'leisure', 'natural', 'amenity', 'waterway', 'man_made', 'area:highway', 'barrier', 'place', 'building:part') if x in p['t']), '?')
        druhy[k] = druhy.get(k, 0) + 1
    print(f'{len(prvky)} prvkov', druhy)


if __name__ == '__main__':
    main()
