# Stromy nového modelu (variant 4): stromy z laserového skenovania (výška a polomer koruny – tools/mesto/laser/stromy.py,
# data/mapa/mesto/d/) + OSM natural=tree tam, kde laser strom nemá. Päta na teréne nového modelu.
# → model/data/stromy.json  [[x, z, päta, výška, polomer koruny], …]
# Spustenie: python tools/model/stromy.py

import json, math, os, sys
import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from spolocne import CACHE, VYSTUP, KOREN, X0, Z0, DLAZDICA, NI, NJ, uloz_json  # noqa: E402
from vyska_terenu import Teren  # noqa: E402


def main():
    teren = Teren()
    xmax, zmax = X0 + DLAZDICA * NI, Z0 + DLAZDICA * NJ
    stromy = []
    for i in range(math.floor(X0 / 500), math.floor(xmax / 500) + 1):
        for j in range(math.floor(Z0 / 500), math.floor(zmax / 500) + 1):
            p = os.path.join(KOREN, 'data', 'mapa', 'mesto', 'd', f'{i}_{j}.json')
            if not os.path.exists(p):
                continue
            for s in json.load(open(p, encoding='utf8')).get('stromy', []):
                x, z = s[0], s[1]
                if X0 <= x <= xmax and Z0 <= z <= zmax:
                    vys = s[3] if len(s) > 3 else 8 * (s[2] if len(s) > 2 else 1)
                    pol = s[4] if len(s) > 4 else vys * 0.3
                    stromy.append([x, z, vys, pol])
    mriezka = {}
    for k, (x, z, _, _) in enumerate(stromy):
        mriezka.setdefault((int(x // 5), int(z // 5)), []).append(k)
    osm = json.load(open(os.path.join(CACHE, 'osm.json'), encoding='utf8'))['prvky']
    pridane = 0
    for p in osm:
        if p['typ'] == 'n' and p['t'].get('natural') == 'tree':
            x, z = p['b'][0]
            if not (X0 <= x <= xmax and Z0 <= z <= zmax):
                continue
            blizko = any(math.hypot(stromy[k][0] - x, stromy[k][1] - z) < 3
                         for a in (-1, 0, 1) for c in (-1, 0, 1) for k in mriezka.get((int(x // 5) + a, int(z // 5) + c), []))
            if not blizko:
                stromy.append([x, z, 9.0, 3.0]); pridane += 1
    # bez stromov na mostoch a pod nimi (laser bral mostovku za korunu; pod mostom by koruna prerástla cez mostovku)
    mosty = json.load(open(os.path.join(VYSTUP, 'mosty.json'), encoding='utf8'))['mosty'] if os.path.exists(os.path.join(VYSTUP, 'mosty.json')) else []
    pas = {}
    for m in mosty:
        for (x, z, y, t), (x2, z2, y2, t2) in zip(m['b'][:-1], m['b'][1:]):
            if max(y - t, y2 - t2) < 0.5:
                continue
            for k in range(4):
                xx, zz = x + (x2 - x) * k / 4, z + (z2 - z) * k / 4
                pas.setdefault((int(xx // 5), int(zz // 5)), []).append((xx, zz, m['w'] / 2 + 2.5))
    pred = len(stromy)
    stromy = [s for s in stromy if not any(math.hypot(px - s[0], pz - s[1]) < r
                                         for a in (-1, 0, 1) for c in (-1, 0, 1)
                                         for px, pz, r in pas.get((int(s[0] // 5) + a, int(s[1] // 5) + c), []))]
    print(f'na mostoch a pod nimi odstránených {pred - len(stromy)} stromov')
    xs = np.array([s[0] for s in stromy]); zs = np.array([s[1] for s in stromy])
    pata = teren.vyska(xs, zs)
    vystup = [[round(s[0], 1), round(s[1], 1), round(float(y), 2), round(s[2], 1), round(s[3], 1)] for s, y in zip(stromy, pata) if np.isfinite(y)]
    uloz_json(os.path.join(VYSTUP, 'stromy.json'), {'popis': 'Stromy – laserové skenovanie © ÚGKK SR (CC BY 4.0) a © prispievatelia OpenStreetMap (ODbL). [x, z, päta, výška, polomer koruny]. Vyrába tools/model/stromy.py.', 'stromy': vystup})
    print(f'{len(vystup)} stromov (z OSM navyše {pridane}), {os.path.getsize(os.path.join(VYSTUP, "stromy.json")) // 1024} kB')


if __name__ == '__main__':
    main()
