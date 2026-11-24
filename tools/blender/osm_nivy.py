# Podklady pre model Nív (tools/blender/vyskove/nivy.py) z OpenStreetMap – #132.
#
#   python3 tools/blender/osm_nivy.py               – stiahne výrez OSM (API openstreetmap.org)
#   python3 tools/blender/osm_nivy.py --cache F     – použije uložený výrez (map.json z API)
#
# Výstup tools/blender/data/nivy.json (metre hry: x východ, z juh, (0,0) = 48.1435 N, 17.1077 E):
#   hlavny     – obrys celého centra (way 829898609),
#   dvor       – zapustený dvor s amfiteátrom (časť 1243845393, podlaha na 2. podlaží),
#   park_von / park_dnu – strešný park (relation 22058963: vonkajší a vnútorný obrys),
#   draha      – os bežeckej dráhy (way 1579717717, 533 m, overená leteckou fotkou z Commons),
#   chodnik    – dláždený chodník popri dráhe (way 1058302220),
#   strieska_z – západná vstupná strieška (časť 989250478),
#   vybezky    – presklené výbežky na Mlynských nivách (časti 1243845382 / 81 / 79),
#   pilova     – pílovitá strecha nad halou (časť 1245713017),
#   nadstavby  – časti nad strešným parkom (severný pás, technika, kabíny výťahov, drevené pavilóny): { id, body, druh },
#   ihrisko    – stred slnka na detskom ihrisku (uzol 10153004867),
#   vchody     – uzly entrance=* (na neskorší interiér).
# Nivy Tower (way 662313148) a jej vstupná strieška (829898611) sú v modeli nivy-tower.
# Dáta © prispievatelia OpenStreetMap, ODbL.

import json
import os
import sys

TU = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, TU)
from osm_eurovea import stiahni, bod  # noqa: E402

KOREN = os.path.normpath(os.path.join(TU, '..', '..'))
BBOX = '17.1255,48.1455,17.1320,48.1482'          # lon0,lat0,lon1,lat1 (API /map)
WAYS = {'hlavny': 829898609, 'dvor': 1243845393, 'draha': 1579717717, 'chodnik': 1058302220,
        'strieska_z': 989250478, 'pilova': 1245713017}
PARK = 22058963
VYBEZKY = (1243845382, 1243845381, 1243845379)
NADSTAVBY = {1243845395: 'pas', 1243845391: 'technika', 1243845403: 'technika-siva', 1243845404: 'technika-siva',
             1109830602: 'kabina', 1109830603: 'kabina', 1109830604: 'kabina', 1109830605: 'kabina', 1243845392: 'kabina',
             1109830606: 'pavilon', 1109830607: 'pavilon', 1527977560: 'pavilon'}
IHRISKO = 10153004867


def main():
    if hasattr(sys.stdout, 'reconfigure'):
        sys.stdout.reconfigure(encoding='utf-8')
    if '--cache' in sys.argv:
        with open(sys.argv[sys.argv.index('--cache') + 1], encoding='utf-8') as f:
            osm = json.load(f)
    else:
        osm = stiahni(BBOX)
    el = osm['elements']
    uzly = {e['id']: e for e in el if e['type'] == 'node'}
    cesty = {e['id']: e for e in el if e['type'] == 'way'}
    rel = {e['id']: e for e in el if e['type'] == 'relation'}

    def linia(wid, uzavriet=True):
        w = cesty[wid]
        b = [bod(uzly[n]['lon'], uzly[n]['lat']) for n in w['nodes'] if n in uzly]
        if uzavriet and len(b) > 3 and b[0] == b[-1]:
            b = b[:-1]
        return b

    out = {k: linia(v) for k, v in WAYS.items()}
    r = rel[PARK]
    out['park_von'] = [linia(m['ref']) for m in r['members'] if m['type'] == 'way' and m.get('role') == 'outer'][0]
    out['park_dnu'] = [linia(m['ref']) for m in r['members'] if m['type'] == 'way' and m.get('role') == 'inner']
    out['vybezky'] = [linia(i) for i in VYBEZKY]
    out['nadstavby'] = [{'id': str(i), 'body': linia(i), 'druh': d} for i, d in NADSTAVBY.items() if i in cesty]
    n = uzly[IHRISKO]
    out['ihrisko'] = bod(n['lon'], n['lat'])
    hl = out['hlavny']

    def vnutri(x, z, b):
        c, j = False, len(b) - 1
        for i in range(len(b)):
            xi, zi = b[i]
            xj, zj = b[j]
            if (zi > z) != (zj > z) and x < (xj - xi) * (z - zi) / (zj - zi) + xi:
                c = not c
            j = i
        return c

    vchody = []
    for e in el:
        t = e.get('tags', {})
        if e['type'] == 'node' and 'entrance' in t:
            p = bod(e['lon'], e['lat'])
            # vchody na obryse centra (do 3 m) – nie do Nivy Tower
            if any(abs(p[0] - q[0]) < 3 and abs(p[1] - q[1]) < 3 for q in hl) or vnutri(*p, hl):
                v = {'id': f"n{e['id']}", 'bod': p, 'druh': t['entrance']}
                if t.get('name'):
                    v['nazov'] = t['name']
                vchody.append(v)
    out['vchody'] = vchody
    cesta = os.path.join(TU, 'data', 'nivy.json')
    with open(cesta, 'w', encoding='utf-8') as f:
        json.dump(out, f, ensure_ascii=False, separators=(',', ':'))
    print(f'{cesta}: obrys {len(hl)} bodov, dráha {len(out["draha"])}, nadstavby {len(out["nadstavby"])}, vchody {len(vchody)}')


if __name__ == '__main__':
    main()
