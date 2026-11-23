# Podklady pre model Eurovea 1 (tools/blender/vyskove/eurovea_1.py) z OpenStreetMap a dlaždíc mesta (#131).
#
#   python3 tools/blender/osm_eurovea.py               – stiahne výrez OSM (API openstreetmap.org, nie Overpass)
#   python3 tools/blender/osm_eurovea.py --cache F     – použije uložený výrez (map.json z API)
#
# Do tools/blender/data/eurovea.json idú časti budov Eurovea 1 (building:part, prípadne budova bez častí):
# obrys (metre hry, x východ, z juh, (0,0) = 48.1435 N, 17.1077 E), dvory, vybrané tagy (podlažia, tvar strechy,
# materiál) a výška z laserového skenovania z dlaždíc mesta (data/mapa/mesto/d/, „vyskaLaser“) – OSM má len
# podlažia. Ďalej presklené striešky (building=roof) pri Pribinovej, vchody (uzly entrance=*) a kruhové
# kvetináče na priestranstve pri vajci (landuse=flowerbed).
# Vajce (relation 21708447) a kupola nad vstupom (way 762656643) sú v modeli eurovea-vajce, nie tu.
# Dáta © prispievatelia OpenStreetMap, ODbL.

import glob
import json
import math
import os
import sys
import urllib.request

TU = os.path.dirname(os.path.abspath(__file__))
KOREN = os.path.normpath(os.path.join(TU, '..', '..'))
LAT0, LON0 = 48.1435, 17.1077
KX = 111320 * math.cos(math.radians(LAT0))
KZ = 111132
BBOX = '17.1185,48.1393,17.1252,48.1425'      # lon0,lat0,lon1,lat1 (API /map)

EUROVEA = 21708468                 # celý komplex (E1 + E2) – časti vnútri sú Eurovea 1, ak x < VYCHOD
BUDOVY_E1 = (19111914, 19111915, 19111916)    # galéria, byty, kancelárie
VYCHOD = 1275.0                    # m – za Skladom č. 7 začína Eurovea 2 (GFI, 2023)
VYNECHAT = {21708447, 762656643, 21708471}     # vajce, kupola (model eurovea-vajce), podzemná časť (layer −1)
# východná skupina (hotel a byty pri Sklade č. 7) – časti, ktoré v OSM ležia mimo obrysu relácie
OBLAST_VYCHOD = (1170.0, 1252.0, 330.0, 430.0)
# presklené striešky (building=roof): nad vstupmi do Sheratonu (762656620) a Central 3 (21708450), pultové nad
# vjazdmi do garáže z Pribinovej (762656635, 762656636 – opakujú vzhľad sklenej strechy galérie)
STRIESKY = {762656620, 21708450, 762656635, 762656636}
VYNECHAT_STRIESKY = set()
# vstup do galérie pri kupole (OSM entrance) – podľa terénu v ňom sa model kladie (zakladnaBod)
ZAKLADNA = (949.7, 317.8)
TAGY = ('building', 'building:part', 'building:levels', 'building:min_level', 'min_height', 'height', 'roof:shape',
        'roof:levels', 'roof:material', 'roof:colour', 'building:material', 'building:colour', 'layer', 'name')


def stiahni():
    req = urllib.request.Request(f'https://api.openstreetmap.org/api/0.6/map.json?bbox={BBOX}',
                                 headers={'User-Agent': 'blavacik-mapa/1.0'})
    return json.load(urllib.request.urlopen(req, timeout=180))


def bod(lon, lat):
    return [round((lon - LON0) * KX, 2), round(-(lat - LAT0) * KZ, 2)]


def plocha(p):
    return sum(p[i - 1][0] * p[i][1] - p[i][0] * p[i - 1][1] for i in range(len(p))) / 2


def vnutri(x, z, b):
    c = False
    j = len(b) - 1
    for i in range(len(b)):
        xi, zi = b[i]
        xj, zj = b[j]
        if (zi > z) != (zj > z) and x < (xj - xi) * (z - zi) / (zj - zi) + xi:
            c = not c
        j = i
    return c


def stred(b):
    return sum(p[0] for p in b) / len(b), sum(p[1] for p in b) / len(b)


class Teren:
    """Podrobný terén z lasera (data/mapa/mesto/t/<i>_<j>.bin – mriežka, uint16 (výška − 100 m)·100, po riadkoch
    rozdiely, gzip) – rovnako ako js/mapa/dlazdice/doplnky.js. Výška v metroch nad morom."""

    def __init__(self):
        with open(os.path.join(KOREN, 'data', 'mapa', 'mesto', 'index.json'), encoding='utf-8') as f:
            idx = json.load(f)
        self.dl = idx['dlazdica']
        self.n = idx['terenDetail']['uzly']
        self.krok = idx['terenDetail']['krok']
        self.cache = {}

    def dlazdica(self, i, j):
        if (i, j) not in self.cache:
            import array
            import gzip
            with open(os.path.join(KOREN, 'data', 'mapa', 'mesto', 't', f'{i}_{j}.bin'), 'rb') as f:
                raw = f.read()
            if raw[:2] == bytes((0x1F, 0x8B)):      # gzip (GitHub Pages ho niekedy pošle rozbalený)
                raw = gzip.decompress(raw)
            a = array.array('H')
            a.frombytes(raw)
            v, n = [0.0] * (self.n * self.n), self.n
            for r in range(n):
                s = 0
                for c in range(n):
                    s = (s + a[r * n + c]) & 0xffff
                    v[r * n + c] = s / 100 + 100
            self.cache[(i, j)] = v
        return self.cache[(i, j)]

    def vyska(self, x, z):
        i, j = int(x // self.dl), int(z // self.dl)
        v, n = self.dlazdica(i, j), self.n
        fx, fz = (x - i * self.dl) / self.krok, (z - j * self.dl) / self.krok
        a, b = min(int(fx), n - 2), min(int(fz), n - 2)
        tx, tz = fx - a, fz - b
        return ((v[b * n + a] * (1 - tx) + v[b * n + a + 1] * tx) * (1 - tz)
                + (v[(b + 1) * n + a] * (1 - tx) + v[(b + 1) * n + a + 1] * tx) * tz)


def main():
    if hasattr(sys.stdout, 'reconfigure'):
        sys.stdout.reconfigure(encoding='utf-8')     # Windows konzola (cp1250) nevie „→“
    if '--cache' in sys.argv:
        with open(sys.argv[sys.argv.index('--cache') + 1], encoding='utf-8') as f:
            osm = json.load(f)
    else:
        osm = stiahni()
    el = osm['elements']
    uzly = {e['id']: (e['lon'], e['lat']) for e in el if e['type'] == 'node'}
    cesty = {e['id']: e for e in el if e['type'] == 'way'}

    def linia(w):
        return [bod(*uzly[n]) for n in w['nodes'] if n in uzly]

    def kruhy(e):
        """Vonkajší prstenec (spojený z úsekov) a dvory; prvý bod sa na konci neopakuje."""
        if e['type'] == 'way':
            von, dnu = [linia(e)], []
        else:
            casti = [(m.get('role'), linia(cesty[m['ref']])) for m in e['members'] if m['type'] == 'way' and m['ref'] in cesty]
            von = [c for r, c in casti if r != 'inner']
            dnu = [c for r, c in casti if r == 'inner']
            k = von.pop(0)
            while von:
                for i, w in enumerate(von):
                    if w[0] == k[-1]:
                        k += w[1:]
                    elif w[-1] == k[-1]:
                        k += w[::-1][1:]
                    else:
                        continue
                    von.pop(i)
                    break
                else:
                    break
            von = [k]
        out = []
        for k in von + dnu:
            if len(k) > 3 and k[0] == k[-1]:
                k = k[:-1]
            out.append(k)
        return out[0], out[1:]

    prvky = [e for e in el if e['type'] in ('way', 'relation') and ('building' in e.get('tags', {}) or 'building:part' in e.get('tags', {}))]
    obrysy = {(e['type'], e['id']): kruhy(e) for e in prvky}
    komplex = obrysy[('relation', EUROVEA)][0]
    budovy_e1 = [obrysy[('relation', i)][0] for i in BUDOVY_E1]
    casti_stredy = [stred(obrysy[(e['type'], e['id'])][0]) for e in prvky if 'building:part' in e['tags']]

    def patri(e, b):
        if e['id'] in VYNECHAT or e['id'] in VYNECHAT_STRIESKY or len(b) < 3:
            return False
        if e['id'] in STRIESKY:
            return True
        x, z = stred(b)
        if x > VYCHOD:
            return False
        if vnutri(x, z, komplex) or any(vnutri(x, z, q) for q in budovy_e1):
            return True
        x0, x1, z0, z1 = OBLAST_VYCHOD
        return x0 < x < x1 and z0 < z < z1

    # výšky z lasera: budovy dlaždíc (časti z OSM, priechody rozdelené na kúsky) so stredom v obryse časti
    laser = []
    for cesta in glob.glob(os.path.join(KOREN, 'data', 'mapa', 'mesto', 'd', '[0-2]_[0-1].json')):
        with open(cesta, encoding='utf-8') as f:
            for b in json.load(f).get('budovy', []):
                if b.get('vyskaLaser') or b.get('zdrojVysky') == 'lidar':
                    laser.append((*stred(b['body']), b.get('vyska'), b.get('vyskaLaser')))

    teren = Teren()
    casti = []
    for e in prvky:
        t = e['tags']
        b, dvory = obrysy[(e['type'], e['id'])]
        if not patri(e, b):
            continue
        cast = 'building:part' in t
        if not cast and t.get('building') != 'roof':
            # budova, ktorá má v OSM časti, sa kreslí len z častí
            if any(vnutri(x, z, b) for x, z in casti_stredy):
                continue
        if plocha(b) < 0:
            b = b[::-1]
        vysky = [(v, vl) for x, z, v, vl in laser if vnutri(x, z, b)]
        zaznam = {'id': f"{e['type'][0]}{e['id']}", 't': {k: t[k] for k in TAGY if k in t}, 'body': b,
                  'plocha': round(plocha(b), 1)}
        if dvory:
            zaznam['dvory'] = dvory
        if vysky:
            zaznam['vyskaLaser'] = round(max(v for v, _ in vysky if v is not None), 2)
        # terén pod časťou (m n. m.): najnižší bod obrysu – časť sa v modeli postaví od neho, sokel zakryje zvyšok
        vz = [teren.vyska(x, z) for x, z in b]
        zaznam['teren'] = [round(min(vz), 2), round(max(vz), 2)]
        casti.append(zaznam)
    casti.sort(key=lambda c: stred(c['body'])[0])

    vchody = []
    for e in el:
        if e['type'] != 'node' or 'entrance' not in e.get('tags', {}):
            continue
        x, z = bod(e['lon'], e['lat'])
        if any(vnutri(x, z, c['body']) or min(math.hypot(x - p[0], z - p[1]) for p in c['body']) < 1.0 for c in casti):
            t = e['tags']
            vchody.append({'id': f"n{e['id']}", 'bod': [x, z], 'typ': t['entrance'], **({'nazov': t['name']} if 'name' in t else {})})

    kvetinace = []
    for e in el:
        t = e.get('tags', {})
        if e['type'] == 'way' and t.get('landuse') == 'flowerbed':
            b = linia(e)
            x, z = stred(b)
            if 880 < x < 960 and 280 < z < 340:
                r = max(math.hypot(p[0] - x, p[1] - z) for p in b)
                kvetinace.append({'bod': [round(x, 2), round(z, 2)], 'polomer': round(r, 2)})

    vystup = {'zdroj': '© prispievatelia OpenStreetMap (ODbL); výšky: laserové skenovanie ÚGKK SR cez dlaždice mesta',
              'zakladna': {'bod': list(ZAKLADNA), 'teren': round(teren.vyska(*ZAKLADNA), 2)},
              'casti': casti, 'vchody': vchody, 'kvetinace': kvetinace}
    cesta = os.path.join(TU, 'data', 'eurovea.json')
    with open(cesta, 'w', encoding='utf-8') as f:
        json.dump(vystup, f, ensure_ascii=False, separators=(',', ':'))
    print(f'{len(casti)} častí, {len(vchody)} vchodov, {len(kvetinace)} kvetináčov → {os.path.relpath(cesta, KOREN)}')
    for c in casti:
        print(f"  {c['id']:>12} {stred(c['body'])[0]:7.1f} {stred(c['body'])[1]:6.1f} lv={c['t'].get('building:levels', '?'):>2} "
              f"laser={c.get('vyskaLaser', '-')!s:>6} {c['t'].get('roof:shape', '')} {c['t'].get('building:part') or c['t'].get('building')}")


if __name__ == '__main__':
    main()
