# Mosty, nadjazdy a lávky nového modelu (variant 4): každá cesta / koľaj s OSM bridge=* je mostovka po svojej osi
# vo výške z laserového povrchu DMP 2.0 (© ÚGKK SR, CC BY 4.0 – INSPIRE WMS, pamäť .cache/mesto/dmp-mosty.json).
# Mosty nie sú samostatné objekty so svojou výškou – mostovka je tá istá cesta, len nad terénom; kde sa dotkne
# zeme, má výšku terénu, takže zjazd je presne taký ako v skutočnosti a bez schodu.
#   – výška v bode: najnižšia vzorka laseru na osi a po okrajoch, ktorá je nad terénom (vozovka bez áut; pri
#     Starom moste chodník mimo priehrady, nie jej vrch); keď žiadna nie je, mostovka leží na teréne,
#   – dolná obálka so sklonom (cesta 8 %, koľaj 1,2 %) – laser nad mostom vidí aj iné mosty, stožiare, laná,
#   – krytá lávka pod mostovkou (covered=yes – lávky Mosta SNP) je ~3,6 m pod vozovkou nad ňou.
# Spustenie: python tools/model/mosty.py  (po tools/model/osm.py a teren.py; potrebuje internet na laser)
# → model/data/mosty.json

import json, math, os, sys, time, urllib.request
from concurrent.futures import ThreadPoolExecutor
import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from spolocne import CACHE, VYSTUP, KOREN, NULA, X0, Z0, DLAZDICA, NI, NJ, na_stupne, uloz_json  # noqa: E402
from vyska_terenu import Teren  # noqa: E402

POSUN_WMS = 43.8
URL = 'https://inspirews.skgeodesy.sk/geoserver/el_dsm/ows'
PAMAT = os.path.join(KOREN, '.cache', 'mesto', 'dmp-mosty.json')
KROK = 3.0
SIRKA = {'motorway': 11, 'trunk': 10, 'primary': 9, 'secondary': 8, 'tertiary': 7, 'unclassified': 6, 'residential': 6,
         'motorway_link': 6, 'trunk_link': 6, 'primary_link': 6, 'secondary_link': 6, 'tertiary_link': 6, 'living_street': 5,
         'service': 4.5, 'busway': 6, 'track': 3, 'pedestrian': 5, 'footway': 2.5, 'path': 2, 'steps': 2.5, 'cycleway': 2.5,
         'bridleway': 2, 'platform': 3}
CHODNIK = {'pedestrian', 'footway', 'path', 'steps', 'bridleway', 'platform', 'cycleway'}


def cislo(v):
    try:
        return float(str(v).replace(',', '.').split()[0])
    except Exception:
        return None


pamat = json.load(open(PAMAT, encoding='utf8')) if os.path.exists(PAMAT) else {}
import threading  # noqa: E402
ZAMOK = threading.Lock()


def uloz_pamat():
    with ZAMOK:
        kopia = dict(pamat)
    json.dump(kopia, open(PAMAT, 'w', encoding='utf8'))


def laser(x, z):
    kluc = f'dsm|{x:.1f}|{z:.1f}'
    if kluc in pamat:
        return pamat[kluc]
    lon, lat = na_stupne(x, z)
    dla, dlo = 0.00002, 0.00003
    q = (f'{URL}?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetFeatureInfo&LAYERS=EL.GridCoverage&QUERY_LAYERS=EL.GridCoverage'
         f'&CRS=EPSG:4326&BBOX={lat - dla},{lon - dlo},{lat + dla},{lon + dlo}&WIDTH=11&HEIGHT=11&I=5&J=5&INFO_FORMAT=application/json&STYLES=')
    for k in range(4):
        try:
            with urllib.request.urlopen(urllib.request.Request(q, headers={'User-Agent': 'blavacik-model/1.0'}), timeout=60) as r:
                f = json.load(r).get('features') or []
            v = f[0]['properties'].get('GRAY_INDEX') if f else None
            y = None if v is None or v < -1000 else round(v - POSUN_WMS - NULA, 2)
            with ZAMOK:
                pamat[kluc] = y
            return y
        except Exception:
            time.sleep(2 + 2 * k)
    return None


def main():
    osm = json.load(open(os.path.join(CACHE, 'osm.json'), encoding='utf8'))['prvky']
    teren = Teren()
    xmax, zmax = X0 + DLAZDICA * NI, Z0 + DLAZDICA * NJ
    mosty = []
    for p in osm:
        t = p['t']
        if p['typ'] != 'w' or not t.get('bridge') or t.get('bridge') == 'no' or len(p['b']) < 2:
            continue
        h, r = t.get('highway'), t.get('railway')
        if not (h or r in ('rail', 'tram', 'light_rail')):
            continue
        if h in ('corridor', 'elevator', 'proposed', 'construction'):
            continue
        b = p['b']
        if not any(X0 <= x <= xmax and Z0 <= z <= zmax for x, z in b):
            continue
        # len časť na území (mimo neho nie je terén – mostovka by visela vo vzduchu)
        vnutri = [X0 <= x <= xmax and Z0 <= z <= zmax for x, z in b]
        i0 = vnutri.index(True); i1 = len(vnutri) - 1 - vnutri[::-1].index(True)
        b = b[i0:i1 + 1]
        if len(b) < 2:
            continue
        if r:
            druh, w = 'kolaj', (cislo(t.get('width')) or 5.0)
        else:
            druh = 'chodnik' if h in CHODNIK else 'cesta'
            w = cislo(t.get('width'))
            if not w or w > 40:
                lanes = cislo(t.get('lanes'))
                w = lanes * 3.25 + 1.5 if lanes and druh == 'cesta' else SIRKA.get(h, 5)
        # os po 3 m
        body = [b[0]]
        for (ax, az), (bx, bz) in zip(b[:-1], b[1:]):
            L = math.hypot(bx - ax, bz - az)
            n = max(1, math.ceil(L / KROK))
            body += [(ax + (bx - ax) * k / n, az + (bz - az) * k / n) for k in range(1, n + 1)]
        mosty.append({'id': p['id'], 'druh': druh, 'typ': h or r, 'w': round(w, 1), 'body': body,
                      'kryty': t.get('covered') == 'yes', 'vrstva': cislo(t.get('layer')) or 1})
    print(f'mostných úsekov: {len(mosty)}')

    # vzorky laseru (os a okraje)
    dotazy = []
    for m in mosty:
        b = m['body']
        m['bocne'] = [0.0, -(m['w'] / 2 + 1.5), m['w'] / 2 + 1.5] if m['druh'] == 'kolaj' or m['w'] > 6 else [0.0]
        for k, (x, z) in enumerate(b):
            a, c = b[max(0, k - 1)], b[min(len(b) - 1, k + 1)]
            l = math.hypot(c[0] - a[0], c[1] - a[1]) or 1
            tx, tz = (c[0] - a[0]) / l, (c[1] - a[1]) / l
            for o in m['bocne']:
                dotazy.append((x + tz * o, z - tx * o))
    chyba = [q for q in dict.fromkeys(dotazy) if f'dsm|{q[0]:.1f}|{q[1]:.1f}' not in pamat]
    print(f'vzoriek laseru: {len(dotazy)}, nových {len(chyba)}')
    t0 = time.time()
    with ThreadPoolExecutor(4) as ex:
        for k, _ in enumerate(ex.map(lambda q: laser(*q), chyba)):
            if k % 500 == 499:
                print(f'  {k + 1} / {len(chyba)} ({time.time() - t0:.0f} s)', flush=True)
                uloz_pamat()
    uloz_pamat()

    vystup = []
    for m in mosty:
        b = m['body']
        xs = np.array([q[0] for q in b]); zs = np.array([q[1] for q in b])
        ter = teren.vyska(xs, zs)
        ter = np.where(np.isfinite(ter), ter, np.nanmedian(ter) if np.isfinite(ter).any() else 0)
        h = []
        k = 0
        for i, (x, z) in enumerate(b):
            a, c = b[max(0, i - 1)], b[min(len(b) - 1, i + 1)]
            l = math.hypot(c[0] - a[0], c[1] - a[1]) or 1
            tx, tz = (c[0] - a[0]) / l, (c[1] - a[1]) / l
            v = [pamat.get(f'dsm|{x + tz * o:.1f}|{z - tx * o:.1f}') for o in m['bocne']]
            v = [y for y in v if y is not None and y > ter[i] + 0.4]
            h.append(min(v) if v else ter[i])
        h = np.array(h, float)
        # dolná obálka so sklonom (iné mosty, stožiare, laná nad mostovkou)
        s = np.concatenate([[0], np.cumsum(np.hypot(np.diff(xs), np.diff(zs)))])
        sklon = 0.012 if m['druh'] == 'kolaj' else 0.08 if m['druh'] == 'cesta' else 0.12
        h = np.min(h[None, :] + sklon * np.abs(s[:, None] - s[None, :]), axis=1)
        if m['kryty']:
            h = np.where(h - ter > 4.5, h - 3.6, h)
        h = np.maximum(h, ter)
        vystup.append({'druh': m['druh'], 'typ': m['typ'], 'w': m['w'],
                       'b': [[round(x, 2), round(z, 2), round(float(y), 2), round(float(t_), 2)] for x, z, y, t_ in zip(xs, zs, h, ter)]})
    uloz_json(os.path.join(VYSTUP, 'mosty.json'), {'popis': 'Mosty a nadjazdy – os © prispievatelia OpenStreetMap (ODbL), výška z laserového skenovania DMP © ÚGKK SR (CC BY 4.0). Vyrába tools/model/mosty.py. Bod: [x, z, výška mostovky, terén].', 'mosty': vystup})
    print(f'Hotovo: {len(vystup)} mostovok, {os.path.getsize(os.path.join(VYSTUP, "mosty.json")) // 1024} kB')


if __name__ == '__main__':
    main()
