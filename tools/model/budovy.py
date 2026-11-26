# Budovy nového modelu (variant 2+): obrys z OSM (budovy aj multipolygóny s dvormi), výška z laserového skenovania
# ÚGKK (medián DMP − DMR v obryse – spracované pre celé mesto v tools/mesto/laser/vysky.py, data/mapa/mesto/d/),
# inak OSM height / building:levels. Spodok = najnižší bod terénu pod obrysom (budova na svahu nevisí), vrch =
# priemerný terén + výška. → model/data/budovy.json
# Spustenie: python tools/model/budovy.py  (po tools/model/teren.py a tools/model/osm.py)

import json, math, os, sys
import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from spolocne import CACHE, VYSTUP, KOREN, X0, Z0, DLAZDICA, NI, NJ, uloz_json  # noqa: E402
from vyska_terenu import Teren  # noqa: E402


def v_polygone(x, z, b):
    c = False
    j = len(b) - 1
    for i in range(len(b)):
        xi, zi = b[i]; xj, zj = b[j]
        if (zi > z) != (zj > z) and x < (xj - xi) * (z - zi) / (zj - zi) + xi:
            c = not c
        j = i
    return c


def plocha(b):
    return abs(sum(b[i][0] * b[i - 1][1] - b[i - 1][0] * b[i][1] for i in range(len(b)))) / 2


def tazisko(b):
    a = 0.0; cx = 0.0; cz = 0.0
    for i in range(len(b)):
        x0, z0 = b[i - 1]; x1, z1 = b[i]
        c = x0 * z1 - x1 * z0
        a += c; cx += (x0 + x1) * c; cz += (z0 + z1) * c
    if abs(a) < 1e-9:
        return sum(p[0] for p in b) / len(b), sum(p[1] for p in b) / len(b)
    return cx / (3 * a), cz / (3 * a)


def spoj_ringy(casti):
    """Časti multipolygónu (lomené čiary) → uzavreté ringy."""
    ringy, otv = [], [list(c) for c in casti if len(c) > 1]
    while otv:
        r = otv.pop()
        zmena = True
        while zmena and r[0] != r[-1]:
            zmena = False
            for k, c in enumerate(otv):
                if c[0] == r[-1]: r += c[1:]
                elif c[-1] == r[-1]: r += c[::-1][1:]
                elif c[-1] == r[0]: r = c[:-1] + r
                elif c[0] == r[0]: r = c[::-1][:-1] + r
                else: continue
                otv.pop(k); zmena = True; break
        if len(r) >= 4:
            ringy.append(r)
    return ringy


def cislo(v):
    try:
        return float(str(v).replace(',', '.').split()[0])
    except Exception:
        return None


def main():
    osm = json.load(open(os.path.join(CACHE, 'osm.json'), encoding='utf8'))['prvky']
    teren = Teren()
    # výšky z laseru: budovy z dlaždíc mesta (data/mapa/mesto/d/<i>_<j>.json)
    laser = []
    for i in range(math.floor(X0 / 500) - 1, math.floor((X0 + DLAZDICA * NI) / 500) + 1):
        for j in range(math.floor(Z0 / 500) - 1, math.floor((Z0 + DLAZDICA * NJ) / 500) + 1):
            p = os.path.join(KOREN, 'data', 'mapa', 'mesto', 'd', f'{i}_{j}.json')
            if not os.path.exists(p):
                continue
            for b in json.load(open(p, encoding='utf8')).get('budovy', []):
                if b.get('body') and len(b['body']) >= 3:
                    xs = [q[0] for q in b['body']]; zs = [q[1] for q in b['body']]
                    laser.append({'b': b['body'], 'ohr': (min(xs), min(zs), max(xs), max(zs)),
                                  'v': b.get('vyskaLaser') or b.get('vyska'), 'zdroj': b.get('zdrojVysky', '')})
    mriezka = {}
    for k, L in enumerate(laser):
        x0, z0, x1, z1 = L['ohr']
        for a in range(int(x0 // 50), int(x1 // 50) + 1):
            for c in range(int(z0 // 50), int(z1 // 50) + 1):
                mriezka.setdefault((a, c), []).append(k)

    def vyska_laser(x, z):
        for k in mriezka.get((int(x // 50), int(z // 50)), []):
            L = laser[k]
            if L['ohr'][0] <= x <= L['ohr'][2] and L['ohr'][1] <= z <= L['ohr'][3] and v_polygone(x, z, L['b']):
                return L['v'], L['zdroj']
        return None, None

    xmax, zmax = X0 + DLAZDICA * NI, Z0 + DLAZDICA * NJ
    vystup, zdroje = [], {}
    for p in osm:
        t = p['t']
        if 'building' not in t or t.get('building') in ('no', 'roof', 'construction') and 'height' not in t:
            continue
        if p['typ'] == 'w':
            ringy = [p['b']] if len(p['b']) >= 4 else []
            vonkajsie, vnutorne = ringy, []
        elif p['typ'] == 'r':
            vonkajsie = spoj_ringy([c['b'] for c in p['casti'] if c['rola'] != 'inner'])
            vnutorne = spoj_ringy([c['b'] for c in p['casti'] if c['rola'] == 'inner'])
        else:
            continue
        for r in vonkajsie:
            r = [list(q) for q in r]
            if r[0] == r[-1]:
                r = r[:-1]
            if len(r) < 3 or plocha(r) < 4:
                continue
            cx, cz = tazisko(r)
            if not (X0 - 20 <= cx <= xmax + 20 and Z0 - 20 <= cz <= zmax + 20):
                continue
            diery = [[list(q) for q in d[:-1]] for d in vnutorne if v_polygone(*d[0], r)]
            v, zdroj = vyska_laser(cx, cz)
            if not v:
                v = cislo(t.get('height')) or (cislo(t.get('building:levels')) or 0) * 3.2 or None
                zdroj = 'osm' if v else 'odhad'
                v = v or (3.0 if t.get('building') in ('garage', 'garages', 'shed', 'kiosk', 'hut') else 9.0)
            # terén pod obrysom: vrcholy + vnútorné body mriežky 4 m
            xs = [q[0] for q in r]; zs = [q[1] for q in r]
            gx, gz = np.meshgrid(np.arange(min(xs), max(xs) + 0.1, 4.0), np.arange(min(zs), max(zs) + 0.1, 4.0))
            vnu = [(a, c) for a, c in zip(gx.ravel(), gz.ravel()) if v_polygone(a, c, r)]
            body = np.array(r + vnu)
            h = teren.vyska(body[:, 0], body[:, 1])
            h = h[np.isfinite(h)]
            if not len(h):
                continue
            y0 = float(h.min()) - 0.2
            y1 = float(np.median(h)) + float(v)
            zdroje[zdroj] = zdroje.get(zdroj, 0) + 1
            zaznam = {'b': [[round(q[0], 2), round(q[1], 2)] for q in r], 'y0': round(y0, 2), 'y1': round(y1, 2)}
            if diery:
                zaznam['d'] = [[[round(q[0], 2), round(q[1], 2)] for q in d] for d in diery]
            vystup.append(zaznam)
    uloz_json(os.path.join(VYSTUP, 'budovy.json'), {'popis': 'Budovy – obrys © prispievatelia OpenStreetMap (ODbL), výška z laserového skenovania © ÚGKK SR (CC BY 4.0). Vyrába tools/model/budovy.py.', 'budovy': vystup})
    print(f'{len(vystup)} budov, zdroj výšky: {zdroje}, {os.path.getsize(os.path.join(VYSTUP, "budovy.json")) // 1024} kB')


if __name__ == '__main__':
    main()
