# Priechody a podchody pod budovami (issue #65): cesty a chodníky z OSM, ktoré vedú popod budovu
# (tunnel=building_passage, covered=yes/arcade – tools/mesto/priechody-osm.mjs) + ručne doplnené
# v data/mapa/priechody-rucne.json. Budova sa v dlaždici rozdelí na:
#   - prízemie bez priechodu (výška priechodu, s kolíziou) – môže mať viac kusov alebo dvor (diery),
#   - horná časť nad priechodom (minVyska = výška priechodu) – hra ju kreslí s podhľadom, bez kolízie,
# takže sa priechodom dá prejsť pešo aj autom (ak je to cesta) a kamera nenarazí do steny.
# Opakované spustenie budovy už rozdelené rovnakým priechodom preskočí.
# Spustenie (z koreňa repozitára, po casti-budov.mjs): python3 tools/mesto/priechody.py
import glob
import json
import os

from shapely.geometry import LineString, Polygon, MultiPolygon
from shapely.geometry.polygon import orient

KOREN = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..'))
VYSTUP = os.path.join(KOREN, 'data', 'mapa', 'mesto')
DLAZDICA = 500
VYSKA = 3.8           # svetlá výška priechodu (ak OSM nemá maxheight)


def nacitaj_priechody():
    p = json.load(open(os.path.join(KOREN, '.cache', 'mesto', 'priechody.json')))
    rucne = os.path.join(KOREN, 'data', 'mapa', 'priechody-rucne.json')
    if os.path.exists(rucne):
        p += json.load(open(rucne)).get('priechody', [])
    for q in p:
        # konce predĺžené o 2 m, aby priechod prerezal aj fasádu (OSM končí často presne na stene)
        b = [list(v) for v in q['body']]
        for a, c in ((0, 1), (-1, -2)):
            dx, dz = b[a][0] - b[c][0], b[a][1] - b[c][1]
            L = (dx * dx + dz * dz) ** 0.5 or 1.0
            b[a] = [b[a][0] + dx / L * 2.0, b[a][1] + dz / L * 2.0]
        q['poly'] = LineString(b).buffer(q['sirka'] / 2, cap_style=2, join_style=2)
    return p


def kruhy(g):
    """Polygón/MultiPolygón → [(body, diery)] CCW, zaokrúhlené na cm."""
    vys = []
    for c in getattr(g, 'geoms', [g]):
        if c.geom_type != 'Polygon' or c.area < 1.5:
            continue
        c = orient(c.simplify(0.05), 1.0)
        body = [[round(x, 2), round(z, 2)] for x, z in list(c.exterior.coords)[:-1]]
        diery = [[[round(x, 2), round(z, 2)] for x, z in list(r.coords)[:-1]] for r in c.interiors if Polygon(r).area > 1.0]
        vys.append((body, diery))
    return vys


def main():
    priechody = nacitaj_priechody()
    upravene_dl = rozdelene = 0
    for cesta in sorted(glob.glob(os.path.join(VYSTUP, 'd', '*.json'))):
        i, j = (int(v) for v in os.path.basename(cesta)[:-5].split('_'))
        x0, z0 = i * DLAZDICA - 50, j * DLAZDICA - 50
        x1, z1 = x0 + DLAZDICA + 100, z0 + DLAZDICA + 100
        tu = [q for q in priechody if any(x0 < x < x1 and z0 < z < z1 for x, z in q['body'])]
        if not tu:
            continue
        d = json.load(open(cesta))
        nove, zmena = [], False
        for b in d.get('budovy', []):
            if b.get('priechod') or b.get('minVyska') or len(b.get('body', [])) < 3:
                nove.append(b)
                continue
            P = Polygon(b['body'], [h for h in b.get('diery', []) if len(h) >= 3])
            if not P.is_valid:
                P = P.buffer(0)
            zasahy = [q for q in tu if P.intersects(q['poly']) and P.intersection(q['poly']).area > 2.0]
            vyska = min([q.get('vyska') or VYSKA for q in zasahy], default=VYSKA)
            if not zasahy or b.get('vyska', 10) <= vyska + 1.5:
                nove.append(b)
                continue
            dolna = P
            for q in zasahy:
                dolna = dolna.difference(q['poly'])
            ids = ','.join(q['id'] for q in zasahy)
            horna = dict(b)
            horna['minVyska'] = vyska
            horna['priechod'] = ids
            horna['vyska'] = round(b['vyska'], 1)
            nove.append(horna)
            for body, diery in kruhy(dolna):
                k = {kk: v for kk, v in b.items() if kk not in ('body', 'diery', 'lod2', 'tvarStrechy', 'hreben', 'strecha', 'nazov')}
                # prízemie siaha 0,6 m do hornej časti, aby na svahu nevznikla škára medzi nimi
                k.update({'body': body, 'vyska': round(vyska + 0.6, 1), 'priechod': ids})
                if diery:
                    k['diery'] = diery
                nove.append(k)
            rozdelene += 1
            zmena = True
        if zmena:
            d['budovy'] = nove
            with open(cesta, 'w') as f:
                json.dump(d, f, ensure_ascii=False, separators=(',', ':'))
            upravene_dl += 1
    print(f'priechodov {len(priechody)}, rozdelených budov {rozdelene} v {upravene_dl} dlaždiciach')


if __name__ == '__main__':
    main()
