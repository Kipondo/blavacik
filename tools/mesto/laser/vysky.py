# Výšky a tvar strechy všetkých budov v meste z laserového skenovania ÚGKK (DMP − DMR), issue #53.
#
# Na rozdiel od budovy.py (LOD2 strechy ako mnohouholníky – len vo výreze Starého Mesta, veľa dát) tento krok
# mení len čísla v existujúcich dlaždiciach, takže veľkosť dát sa takmer nemení:
#   - vyska     – odkvap (šikmá strecha) alebo vrch atiky (plochá strecha) nad terénom,
#   - hreben    – výška hrebeňa nad odkvapom, tvarStrechy = 'sikma' / 'plocha',
#   - zdrojVysky = 'lidar'; pôvodná výška ostáva vo vyskaOsm / zdrojOsm (opakované spustenie začne od nej).
# Výška z OSM (height, building:levels) sa nahradí, keď sa od lasera líši o viac ako 3 m; odhad vždy.
# Budova, ktorú laser nevidí (postavená po skenovaní v roku 2023), ostane podľa OSM.
# Preskočí budovy s LOD2 strechou (lod2) a vyvýšené časti budov (cast – tie overuje casti.py).
#
# Spustenie (z koreňa repozitára, laser v .cache/laser/): python3 tools/mesto/laser/vysky.py [i_j …]
import sys, os, json, glob, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from matplotlib.path import Path
from scipy import ndimage
from shapely.geometry import Polygon
from spolocne import Raster, VYSTUP, DLAZDICA, uloz_json

K = 0.5
OKRAJ = 4
ROZDIEL_OSM = 3.0


def vyska_z_lasera(H, x0, z0, body):
    """(vyska, hreben) z výšok nad terénom H v mriežke od (x0, z0) s krokom K, alebo None."""
    P = Polygon(body)
    if not P.is_valid:
        P = P.buffer(0)
    vnutro = P.buffer(-0.75) if P.area > 30 else P
    if vnutro.is_empty:
        vnutro = P
    minx, minz, maxx, maxz = vnutro.bounds
    c0, c1 = int((minx - x0) / K), int((maxx - x0) / K) + 1
    r0, r1 = int((minz - z0) / K), int((maxz - z0) / K) + 1
    c0, r0 = max(c0, 0), max(r0, 0)
    c1, r1 = min(c1, H.shape[1]), min(r1, H.shape[0])
    if c1 - c0 < 1 or r1 - r0 < 1:
        return None
    xs = x0 + K / 2 + K * np.arange(c0, c1)
    zs = z0 + K / 2 + K * np.arange(r0, r1)
    X, Z = np.meshgrid(xs, zs)
    geom = vnutro if vnutro.geom_type == 'Polygon' else max(vnutro.geoms, key=lambda g: g.area)
    m = Path(list(geom.exterior.coords)).contains_points(np.c_[X.ravel(), Z.ravel()]).reshape(X.shape)
    okno = H[r0:r1, c0:c1]
    h = okno[m]
    h = h[np.isfinite(h)]
    if h.size < 8:
        return None
    nad = h[h > 2.5]
    if nad.size < 0.4 * h.size:
        return None                     # laser tu budovu nevidí (nová stavba alebo zbúraná)
    # šikmá strecha = povrch sa plynule mení (sklon 15–60°) na väčšine plochy; inak plochá
    # (aj viac rovín v rôznej výške – veža nad podnožou – je „plochá“, tú rozdelí OSM building:part)
    gz, gx = np.gradient(np.nan_to_num(okno, nan=0.0), K)
    sklon = np.hypot(gx, gz)[m]
    vnutri_nad = (okno[m] > 2.5)
    sikme = np.mean((sklon[vnutri_nad] > 0.27) & (sklon[vnutri_nad] < 1.7)) if vnutri_nad.any() else 0.0
    vrchol = float(np.percentile(nad, 97))
    odkvap = float(np.percentile(nad, 8))
    kratsia = min(maxx - minx, maxz - minz) + 1.5
    if sikme > 0.5 and vrchol - odkvap > 1.5 and h.size > 40:
        return max(2.5, odkvap), min(vrchol - odkvap, kratsia * 0.75)
    return max(2.5, float(np.percentile(nad, 70))), 0.0


def spracuj(dmp_r, dmr_r, cesta, i, j):
    d = json.load(open(cesta))
    budovy = d.get('budovy') or []
    kandidati = [b for b in budovy if not b.get('lod2') and not b.get('cast') and len(b.get('body', [])) >= 3]
    if not kandidati:
        return 0, 0
    X0, Z0 = i * DLAZDICA - OKRAJ, j * DLAZDICA - OKRAJ
    W = H = int((DLAZDICA + 2 * OKRAJ) / K)
    dmp = dmp_r.mriezka(X0 + K / 2, Z0 + K / 2, K, W, H, priemer=0)
    if not np.isfinite(dmp).mean() > 0.5:
        return 0, 0                     # mimo pokrytia lasera
    dmr = dmr_r.mriezka(X0 + K / 2, Z0 + K / 2, K, W, H, priemer=0)
    nds = ndimage.median_filter(np.nan_to_num(dmp - dmr, nan=np.nan), size=3)
    zmenene = 0
    for b in kandidati:
        # opakované spustenie začína od pôvodnej výšky
        if 'vyskaOsm' in b:
            b['vyska'] = b['vyskaOsm']
            b['zdrojVysky'] = b.get('zdrojOsm', 'odhad')
            for k in ('tvarStrechy', 'hreben'):
                b.pop(k, None)
        v = vyska_z_lasera(nds, X0, Z0, b['body'])
        if not v:
            continue
        vyska, hreben = v
        if hreben > 0 and len(b['body']) != 4:
            vyska, hreben = vyska + hreben * 0.5, 0.0
        zdroj = b.get('zdrojVysky', 'odhad')
        celkom = vyska + hreben
        if zdroj != 'odhad' and abs(celkom - (b['vyska'] + (b.get('hreben') or 0))) <= ROZDIEL_OSM:
            continue
        b.setdefault('vyskaOsm', b['vyska'])
        b.setdefault('zdrojOsm', zdroj)
        b['vyska'] = round(vyska, 1)
        b['zdrojVysky'] = 'lidar'
        if hreben > 0:
            b['tvarStrechy'] = 'sikma'
            b['hreben'] = round(hreben, 1)
        else:
            b['tvarStrechy'] = 'plocha'
            b.pop('hreben', None)
        zmenene += 1
    uloz_json(cesta, d)
    return len(kandidati), zmenene


def main():
    dmp_r, dmr_r = Raster('dmp'), Raster('dmr')
    vyber = sys.argv[1:]
    cesty = [os.path.join(VYSTUP, 'd', f'{k}.json') for k in vyber] if vyber else sorted(glob.glob(os.path.join(VYSTUP, 'd', '*.json')))
    t0 = time.time()
    spolu = zmenene = 0
    for n, cesta in enumerate(cesty):
        kl = os.path.basename(cesta)[:-5]
        i, j = (int(v) for v in kl.split('_'))
        s, z = spracuj(dmp_r, dmr_r, cesta, i, j)
        spolu += s
        zmenene += z
        if n % 50 == 0:
            print(f'{n}/{len(cesty)} dlaždíc, budov {spolu}, z lasera {zmenene}, {time.time() - t0:.0f} s', flush=True)
    print(f'hotovo: budov {spolu}, výška z lasera {zmenene}, {time.time() - t0:.0f} s')


if __name__ == '__main__':
    main()
