# Odhad obytnej zástavby tam, kde ju OSM nemá (landuse=residential chýba napr. v celej Petržalke):
# okolie obytných budov (bytovky 30 m, rodinné domy 20 m) sa zlúči, zjednoduší a pridá
# do data/mapa/zastavba.json (kľúč "odhad"). Hra v ňom kreslí trávnik rovnako ako v zástavbe z OSM
# (js/mapa/teren/zahrady.js – hustá zástavba ostáva dláždená).
# Spustenie (po zastavba.mjs): cd tools/mesto && python3 zastavba_odhad.py
import json, os
from shapely.geometry import Polygon
from shapely.ops import unary_union

KOREN = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..')
CACHE = os.path.join(KOREN, '.cache', 'mesto')
CIEL = os.path.join(KOREN, 'data', 'mapa', 'zastavba.json')

data = json.load(open(CIEL))
osm = unary_union([Polygon(b).buffer(0) for b in data['zastavba'] if len(b) >= 3])
budovy = json.load(open(os.path.join(CACHE, 'obytne-budovy.json')))
okolie = []
for q in budovy:
    p = Polygon(q['b'])
    if not p.is_valid:
        p = p.buffer(0)
    if p.is_empty or osm.contains(p.centroid):
        continue                      # už je v obytnej zástavbe z OSM
    okolie.append(p.buffer(q['r'], resolution=4))
plocha = unary_union(okolie).difference(osm).simplify(2.0)
odhad = []
for g in getattr(plocha, 'geoms', [plocha]):
    if g.geom_type != 'Polygon' or g.area < 400:
        continue
    odhad.append([[round(x * 2) / 2, round(z * 2) / 2] for x, z in list(g.exterior.coords)[:-1]])
data['odhad'] = odhad
data['popis'] = data['popis'].rstrip('.') + '; „odhad“ = okolie obytných budov tam, kde OSM obytnú zástavbu nemá (tools/mesto/zastavba_odhad.py).'
json.dump(data, open(CIEL, 'w'), ensure_ascii=False, separators=(',', ':'))
print(len(odhad), 'odhadnutých plôch,', round(plocha.area / 1e6, 1), 'km²')
