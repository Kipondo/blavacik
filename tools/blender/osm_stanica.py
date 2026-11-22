# Podklady pre model Hlavnej stanice (tools/blender/stanica_blender.py) z OpenStreetMap a dlaždíc mesta.
#
#   python3 tools/blender/osm_stanica.py          – stiahne OSM (Overpass) a zapíše tools/blender/data/stanica.json
#   python3 tools/blender/osm_stanica.py --cache  – použije uložené tools/blender/data/stanica-osm.json
#
# Do výsledku idú pôdorysy budov stanice, nástupištia (pôdorys, os a šírka), prístrešky nad nástupišťami,
# vchody (body s entrance=*) a schody podchodu z dlaždíc mesta (data/mapa/mesto/d/), aby v podlahe haly
# a v nástupištiach ostali otvory presne nad schodiskami, ktoré stavia hra (js/mapa/podchody/).
# Súradnice sú v metroch hry (x východ, z juh, (0,0) = 48.1435 N, 17.1077 E).
# Dáta © prispievatelia OpenStreetMap, ODbL.

import json
import math
import os
import sys
import urllib.parse
import urllib.request

TU = os.path.dirname(os.path.abspath(__file__))
KOREN = os.path.normpath(os.path.join(TU, '..', '..'))
LAT0, LON0 = 48.1435, 17.1077
KX = 111320 * math.cos(math.radians(LAT0))
KZ = 111132
BBOX = '48.1560,17.1000,48.1615,17.1135'

# budovy stanice (OSM way id) – ostatné budovy v okolí ostávajú z dlaždíc
STARA_BUDOVA = 78147458      # výpravná budova (1905, krídla), building:levels 3, valbová strecha
HALA = 78147585              # nová odbavovacia hala (1988), 2 podlažia, plochá strecha
VYCHODNE_KRIDLO = 78147593   # východné krídlo (pošta), 3 podlažia, valbová strecha
SVETLIK = 1523818057         # presklený svetlík Skleníka pred historickou fasádou (building:part, roof:shape apse_gabled)
VEZICKY = (1523818063, 1523818064)   # nárožné vežičky stredného rizalitu (building:part, roof:shape pyramidal, ~4,6 × 4,6 m)
STRED = (-116.0, -1700.0)    # bod záznamu v data/mapa/pamiatky.json


def stiahni():
    q = f"""[out:json][timeout:60];
(
 way["building"]({BBOX});
 way["railway"="platform"]({BBOX});
 way["public_transport"="platform"]({BBOX});
 node["entrance"]({BBOX});
);
out body geom;"""
    req = urllib.request.Request('https://overpass-api.de/api/interpreter',
                                 data=urllib.parse.urlencode({'data': q}).encode(),
                                 headers={'User-Agent': 'blavacik-mapa/1.0'})
    return json.load(urllib.request.urlopen(req, timeout=120))


def doplnok_cesty(osm, way_id):
    """Cesta, ktorá v uloženom výsledku Overpass chýba (napr. building:part) – z API OSM, s geometriou ako Overpass."""
    if any(e['type'] == 'way' and e['id'] == way_id for e in osm['elements']):
        return False
    req = urllib.request.Request(f'https://api.openstreetmap.org/api/0.6/way/{way_id}/full.json',
                                 headers={'User-Agent': 'blavacik-mapa/1.0'})
    r = json.load(urllib.request.urlopen(req, timeout=60))
    uzly = {e['id']: e for e in r['elements'] if e['type'] == 'node'}
    w = next(e for e in r['elements'] if e['type'] == 'way')
    osm['elements'].append({'type': 'way', 'id': way_id, 'tags': w.get('tags', {}),
                            'geometry': [{'lat': uzly[n]['lat'], 'lon': uzly[n]['lon']} for n in w['nodes']]})
    return True


def bod(lat, lon):
    return [round((lon - LON0) * KX, 2), round(-(lat - LAT0) * KZ, 2)]


def plocha(p):
    return sum(p[i - 1][0] * p[i][1] - p[i][0] * p[i - 1][1] for i in range(len(p))) / 2


def os_polygonu(p, krok=8.0):
    """Os pretiahnutého polygónu (nástupište, prístrešok): hlavná os (PCA), po krokoch stred a šírka rezu."""
    n = len(p)
    cx = sum(q[0] for q in p) / n
    cz = sum(q[1] for q in p) / n
    sxx = sum((q[0] - cx) ** 2 for q in p)
    szz = sum((q[1] - cz) ** 2 for q in p)
    sxz = sum((q[0] - cx) * (q[1] - cz) for q in p)
    u = 0.5 * math.atan2(2 * sxz, sxx - szz)
    ux, uz = math.cos(u), math.sin(u)
    vx, vz = -uz, ux
    t = [(q[0] - cx) * ux + (q[1] - cz) * uz for q in p]
    t0, t1 = min(t), max(t)
    body = []
    k = max(2, int((t1 - t0) / krok) + 1)
    for i in range(k + 1):
        s = t0 + 0.3 + (t1 - t0 - 0.6) * i / k
        # priesečníky priamky kolmej na os v bode s s obrysom
        prs = []
        for j in range(len(p)):
            a, b = p[j - 1], p[j]
            ta = (a[0] - cx) * ux + (a[1] - cz) * uz
            tb = (b[0] - cx) * ux + (b[1] - cz) * uz
            if (ta - s) * (tb - s) > 0 or ta == tb:
                continue
            f = (s - ta) / (tb - ta)
            px, pz = a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f
            prs.append((px - cx) * vx + (pz - cz) * vz)
        if len(prs) < 2:
            continue
        v0, v1 = min(prs), max(prs)
        vm = (v0 + v1) / 2
        body.append({'x': round(cx + ux * s + vx * vm, 2), 'z': round(cz + uz * s + vz * vm, 2), 'sirka': round(v1 - v0, 2)})
    return body


def schody_z_dlazdic():
    out = []
    for meno in ('-1_-4', '0_-4', '-1_-3', '0_-3'):
        cesta = os.path.join(KOREN, 'data', 'mapa', 'mesto', 'd', f'{meno}.json')
        if not os.path.exists(cesta):
            continue
        with open(cesta, encoding='utf8') as f:
            d = json.load(f)
        for p in d.get('podchody', []):
            if p['typ'] == 'schody':
                out.append({'body': p['body'], 'sirka': p.get('sirka', 3)})
    return out


def main():
    cache = os.path.join(TU, 'data', 'stanica-osm.json')
    if '--cache' in sys.argv and os.path.exists(cache):
        with open(cache, encoding='utf8') as f:
            osm = json.load(f)
    else:
        osm = stiahni()
        with open(cache, 'w', encoding='utf8') as f:
            json.dump(osm, f, ensure_ascii=False, separators=(',', ':'))
    if any([doplnok_cesty(osm, w) for w in (SVETLIK, *VEZICKY)]):
        with open(cache, 'w', encoding='utf8') as f:
            json.dump(osm, f, ensure_ascii=False, separators=(',', ':'))

    budovy, nastupistia, pristresky, vchody = {}, [], [], []
    for e in osm['elements']:
        t = e.get('tags', {})
        if e['type'] == 'node':
            if 'entrance' in t:
                vchody.append({'p': bod(e['lat'], e['lon']), 'druh': t['entrance']})
            continue
        p = [bod(g['lat'], g['lon']) for g in e.get('geometry', [])]
        if len(p) > 1 and p[0] == p[-1]:
            p = p[:-1]
        if len(p) < 3:
            continue
        if e['id'] in (STARA_BUDOVA, HALA, VYCHODNE_KRIDLO, SVETLIK, *VEZICKY):
            budovy[str(e['id'])] = p
        elif t.get('building') == 'roof':
            cx = sum(q[0] for q in p) / len(p)
            cz = sum(q[1] for q in p) / len(p)
            if -240 < cx < 60 and -1830 < cz < -1640 and abs(plocha(p)) > 100:
                pristresky.append({'obrys': p, 'os': os_polygonu(p, 9.0)})
        elif t.get('railway') == 'platform' and t.get('area') == 'yes':
            nastupistia.append({'ref': t.get('ref') or t.get('railway:platform:ref') or t.get('local_ref'),
                                'obrys': p, 'os': os_polygonu(p, 8.0)})

    # vchody len pri budovách stanice
    def blizko(q):
        return any(min(math.hypot(q[0] - a[0], q[1] - a[1]) for a in obr) < 40 for obr in budovy.values())
    vchody = [v for v in vchody if blizko(v['p'])]
    nastupistia.sort(key=lambda n: n['ref'] or '9')
    data = {
        'popis': 'VYGENEROVANÉ tools/blender/osm_stanica.py z OpenStreetMap (© prispievatelia OpenStreetMap, ODbL) a dlaždíc mesta.',
        'stred': STRED,
        'budovy': {'stara': budovy[str(STARA_BUDOVA)], 'hala': budovy[str(HALA)], 'vychod': budovy[str(VYCHODNE_KRIDLO)],
                   'svetlik': budovy.get(str(SVETLIK)),
                   'vezicky': [budovy[str(w)] for w in VEZICKY if str(w) in budovy]},
        'nastupistia': nastupistia,
        'pristresky': pristresky,
        'vchody': vchody,
        'schody': schody_z_dlazdic(),
    }
    with open(os.path.join(TU, 'data', 'stanica.json'), 'w', encoding='utf8') as f:
        json.dump(data, f, ensure_ascii=False, indent=1)
    print(f"budovy {len(budovy)}, nástupištia {len(nastupistia)}, prístrešky {len(pristresky)}, vchody {len(vchody)}, schody {len(data['schody'])}")


if __name__ == '__main__':
    main()
