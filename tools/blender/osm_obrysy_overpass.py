# Doplní do tools/blender/data/obrysy.json obrysy ďalších stavieb priamo z Overpass API (bez lokálneho .pbf –
# tools/blender/osm_obrysy.mjs potrebuje celý výrez OSM). Formát rovnaký: meno → { hlavne: [...], casti: [...] },
# súradnice v metroch hry (x východ, z juh, (0,0) = 48.1435 N, 17.1077 E). © prispievatelia OpenStreetMap, ODbL.
#
#   python3 tools/blender/osm_obrysy_overpass.py

import json
import math
import os
import urllib.parse
import urllib.request

TU = os.path.dirname(os.path.abspath(__file__))
LAT0, LON0 = 48.1435, 17.1077
KX = 111320 * math.cos(math.radians(LAT0))
KZ = 111132

CIELE = {
    # historická budova UK na Šafárikovom nám. 6 (F. Krupka, 1930–1937) + aula (building:part)
    'univerzita-komenskeho': {'cesty': [1383879681], 'casti': [1340711263]},
    # „presklené vajce“ pri Eurovei (Pribinova 6, A1 ReSpect / Bose) a sklenená kupola nad vstupom do galérie
    'eurovea-vajce': {'relacie': [21708447], 'casti': [762656643]},
}


SERVERY = ['https://overpass-api.de/api/interpreter', 'https://overpass.kumi.systems/api/interpreter']


def overpass(q):
    """Dotaz s opakovaním (verejné servery občas vrátia 502/504) a záložným serverom."""
    import time
    chyba = None
    for pokus in range(6):
        url = SERVERY[pokus % len(SERVERY)]
        try:
            req = urllib.request.Request(url, data=urllib.parse.urlencode({'data': q}).encode(),
                                         headers={'User-Agent': 'blavacik-mapa/1.0'})
            return json.load(urllib.request.urlopen(req, timeout=120))
        except Exception as e:      # noqa: BLE001 – sieťová chyba, skúsi sa znova
            chyba = e
            time.sleep(5 + 5 * pokus)
    raise chyba


def body(geom):
    b = [[round((g['lon'] - LON0) * KX, 2), round(-(g['lat'] - LAT0) * KZ, 2)] for g in geom]
    if len(b) > 3 and b[0] == b[-1]:
        b.pop()
    return b


def plocha(b):
    return abs(sum(b[i - 1][0] * b[i][1] - b[i][0] * b[i - 1][1] for i in range(len(b))) / 2)


def main():
    cesta = os.path.join(TU, 'data', 'obrysy.json')
    with open(cesta, encoding='utf8') as f:
        vystup = json.load(f)
    for meno, c in CIELE.items():
        hlavne, casti = [], []
        for wid in c.get('cesty', []):
            e = overpass(f'[out:json];way({wid});out body geom;')['elements'][0]
            b = body(e['geometry'])
            hlavne.append({'id': str(wid), 't': e.get('tags', {}), 'body': b, 'plocha': round(plocha(b))})
        for rid in c.get('relacie', []):
            e = overpass(f'[out:json];relation({rid});out body geom;')['elements'][0]
            vonk = [[(g['lat'], g['lon']) for g in m['geometry']] for m in e['members']
                    if m['type'] == 'way' and m.get('role') in ('outer', '') and m.get('geometry')]
            # vonkajší obrys môže byť z viacerých ciest – spojíme ich do jedného prstenca (podľa koncových bodov)
            kruh = vonk.pop(0)
            while vonk:
                for i, w in enumerate(vonk):
                    if w[0] == kruh[-1]:
                        kruh += w[1:]
                    elif w[-1] == kruh[-1]:
                        kruh += w[::-1][1:]
                    else:
                        continue
                    vonk.pop(i)
                    break
                else:
                    break
            b = body([{'lat': la, 'lon': lo} for la, lo in kruh])
            hlavne.append({'id': str(rid), 't': e.get('tags', {}), 'body': b, 'plocha': round(plocha(b))})
        for wid in c.get('casti', []):
            e = overpass(f'[out:json];way({wid});out body geom;')['elements'][0]
            b = body(e['geometry'])
            casti.append({'id': str(wid), 't': e.get('tags', {}), 'body': b, 'plocha': round(plocha(b))})
        vystup[meno] = {'hlavne': hlavne, 'casti': casti}
        print(meno, [(h['id'], h['plocha'], len(h['body'])) for h in hlavne], 'častí', [(k['id'], k['plocha']) for k in casti])
    with open(cesta, 'w', encoding='utf8') as f:
        json.dump(vystup, f, ensure_ascii=False, separators=(',', ':'))


if __name__ == '__main__':
    main()
