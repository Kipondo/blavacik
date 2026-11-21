# Z laserového skenovania ÚGKK (DMP − DMR) zistí pre každý blok Átriakov výšku a tvar átria
# (vnútorného dvora): nízke miesta vnútri pôdorysu → najväčšia súvislá plocha → otočený obdĺžnik.
# Výstup tools/blender/data/atriaky-laser.json (generátor Blendera potom laser nepotrebuje).
# Spustenie (po osm_atriaky.mjs, laser v .cache/laser/): python3 tools/blender/laser_atriaky.py
import json
import os
import sys

import numpy as np
from matplotlib.path import Path
from scipy import ndimage
from shapely.geometry import MultiPoint, Polygon

TU = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(TU, '..', 'mesto', 'laser'))
from spolocne import Raster  # noqa: E402

K = 0.5
D = json.load(open(os.path.join(TU, 'data', 'atriaky.json')))
dmp, dmr = Raster('dmp'), Raster('dmr')
vystup = {}
for b in D['bloky']:
    P = Polygon(b['body'])
    x0, z0, x1, z1 = P.bounds
    nx, nz = int((x1 - x0) / K) + 1, int((z1 - z0) / K) + 1
    H = dmp.mriezka(x0 + K / 2, z0 + K / 2, K, nx, nz, priemer=0) - dmr.mriezka(x0 + K / 2, z0 + K / 2, K, nx, nz, priemer=0)
    X, Z = np.meshgrid(x0 + K / 2 + K * np.arange(nx), z0 + K / 2 + K * np.arange(nz))
    vnutri = Path(list(P.buffer(-1.5).exterior.coords)).contains_points(np.c_[X.ravel(), Z.ravel()]).reshape(X.shape)
    h = np.nan_to_num(H, nan=0.0)
    budova = vnutri & (h > 6)
    vyska = float(np.percentile(h[budova], 75)) if budova.sum() > 20 else None
    nizke = vnutri & (h < 3.5)
    nizke = ndimage.binary_opening(nizke, iterations=2)
    lab, n = ndimage.label(nizke)
    atrium = None
    if n:
        velk = ndimage.sum(nizke, lab, range(1, n + 1))
        k = int(np.argmax(velk)) + 1
        if velk[k - 1] * K * K > 40:
            pts = np.c_[X[lab == k], Z[lab == k]]
            r = MultiPoint([tuple(p) for p in pts]).minimum_rotated_rectangle
            atrium = [[round(x, 2), round(z, 2)] for x, z in list(r.exterior.coords)[:-1]]
    # terén pod blokom (DMR, medián po obvode) – bloky stoja na svahu, každý na inej výške
    obvod = np.array(P.buffer(2.0).exterior.coords)
    zem_b = [float(dmr.mriezka(float(x), float(z), 1.0, 1, 1, priemer=0)[0, 0]) for x, z in obvod[::3]]
    vystup[b['meno']] = {'zem': round(float(np.nanmedian(zem_b)), 2),
                         'vyska': round(vyska, 1) if vyska else None, 'atrium': atrium,
                         'plocha_atria': round(Polygon(atrium).area) if atrium else 0}
    print(b['meno'], vystup[b['meno']]['vyska'], vystup[b['meno']]['plocha_atria'], 'm² átrium', 'plocha bloku', round(P.area))
json.dump(vystup, open(os.path.join(TU, 'data', 'atriaky-laser.json'), 'w'), separators=(',', ':'))
