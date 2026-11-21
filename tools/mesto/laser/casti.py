# Overenie vyvýšených častí budov (building:part z tools/mesto/casti-budov.mjs, "cast": 1) laserom ÚGKK.
#
# OSM má na niektorých miestach úzke vysoké časti, ktoré v skutočnosti nestoja (plánované veže,
# zle zadané min_height) – za hotelom Kyjev trčali 9 × 9 m „veže“ do 75 m (issue #68).
# Pre každú úzku časť (kratšia strana < 12 m) sa z (DMP − DMR) zistí výška povrchu v jej pôdoryse
# (90. percentil). Širšie časti ostávajú podľa OSM – laser je z roku 2023 a novšie budovy by inak zmizli.
#  - laser nad spodkom časti nič nevidí → časť sa vyhodí,
#  - laser vidí nižšiu stavbu → výška časti sa zníži na laser (zdrojVysky = 'lidar'),
#  - inak časť ostáva (potvrdená laserom).
# Kde laser chýba: úzka časť (kratšia strana < 12 m) o viac ako 15 m vyššia než budova pod ňou sa vyhodí.
#
# Spustenie (po casti-budov.mjs): python3 tools/mesto/laser/casti.py
import sys, os, json, math, glob
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from matplotlib.path import Path
from spolocne import Raster, VYSTUP, uloz_json

K = 0.5
UZKA = 12.0          # m – kratšia strana „úzkej“ časti
NAD_BUDOVOU = 15.0   # m – o koľko môže byť úzka časť vyššia než budova pod ňou bez potvrdenia laserom


def rozmery(body):
    """Kratšia a dlhšia strana obdĺžnika okolo pôdorysu, natočeného podľa najdlhšej hrany."""
    best, u = 0, (1.0, 0.0)
    for i in range(len(body)):
        (ax, az), (bx, bz) = body[i], body[(i + 1) % len(body)]
        l = math.hypot(bx - ax, bz - az)
        if l > best: best, u = l, ((bx - ax) / l, (bz - az) / l)
    a = [x * u[0] + z * u[1] for x, z in body]
    b = [-x * u[1] + z * u[0] for x, z in body]
    s = sorted([max(a) - min(a), max(b) - min(b)])
    return s[0], s[1]


def laser_vrch(dmp_r, dmr_r, body):
    """90. percentil výšky povrchu nad terénom v pôdoryse (m), alebo None, keď laser chýba."""
    xs = [p[0] for p in body]; zs = [p[1] for p in body]
    x0, z0 = min(xs), min(zs)
    nx, nz = max(2, int((max(xs) - x0) / K) + 1), max(2, int((max(zs) - z0) / K) + 1)
    dmp = dmp_r.mriezka(x0 + K / 2, z0 + K / 2, K, nx, nz, priemer=0)
    dmr = dmr_r.mriezka(x0 + K / 2, z0 + K / 2, K, nx, nz, priemer=0)
    X, Z = np.meshgrid(x0 + K / 2 + K * np.arange(nx), z0 + K / 2 + K * np.arange(nz))
    vnutri = Path(body).contains_points(np.c_[X.ravel(), Z.ravel()]).reshape(X.shape)
    h = (dmp - dmr)[vnutri]
    if h.size < 4 or np.isfinite(h).mean() < 0.5: return None
    return float(np.nanpercentile(h, 90))


def v_polygone(x, z, body):
    c = False
    for i in range(len(body)):
        (xi, zi), (xj, zj) = body[i], body[i - 1]
        if (zi > z) != (zj > z) and x < (xj - xi) * (z - zi) / (zj - zi) + xi: c = not c
    return c


dmp_r, dmr_r = Raster('dmp'), Raster('dmr')
vyhodene = znizene = potvrdene = bez_lasera = 0
for cesta in sorted(glob.glob(os.path.join(VYSTUP, 'd', '*.json'))):
    d = json.load(open(cesta))
    budovy = d.get('budovy') or []
    if not any(b.get('cast') for b in budovy): continue
    zaklad = [b for b in budovy if not b.get('cast')]
    nove, zmena = [], False
    for b in budovy:
        if not b.get('cast'):
            nove.append(b); continue
        body = b['body']
        cx = sum(p[0] for p in body) / len(body); cz = sum(p[1] for p in body) / len(body)
        kratsia, _ = rozmery(body)
        if kratsia >= UZKA:
            nove.append(b); continue
        vrch = laser_vrch(dmp_r, dmr_r, body)
        if vrch is not None:
            if vrch < b['minVyska'] + 1.5:
                vyhodene += 1; zmena = True
                print(f'  vyhodená {os.path.basename(cesta)} x={cx:.0f} z={cz:.0f}: OSM {b["minVyska"]}–{b["vyska"]} m, laser {vrch:.1f} m')
                continue
            if vrch < b['vyska'] - 5:
                znizene += 1; zmena = True
                print(f'  znížená  {os.path.basename(cesta)} x={cx:.0f} z={cz:.0f}: {b["vyska"]} → {vrch:.1f} m')
                b['vyska'] = round(vrch, 1)
            else:
                potvrdene += 1
            if b.get('zdrojVysky') != 'lidar':
                b['zdrojVysky'] = 'lidar'; zmena = True
            nove.append(b)
            continue
        bez_lasera += 1
        pod = next((o for o in zaklad if v_polygone(cx, cz, o['body'])), None)
        vyska_pod = pod.get('vyska', 0) if pod else 0
        if kratsia < UZKA and b['vyska'] - vyska_pod > NAD_BUDOVOU:
            vyhodene += 1; zmena = True
            print(f'  vyhodená (bez lasera) {os.path.basename(cesta)} x={cx:.0f} z={cz:.0f}: {kratsia:.1f} m, {b["vyska"]} m nad {vyska_pod} m')
            continue
        nove.append(b)
    if zmena:
        d['budovy'] = nove
        uloz_json(cesta, d)
print(f'úzke časti: potvrdené {potvrdene}, znížené {znizene}, vyhodené {vyhodene}, bez lasera {bez_lasera}')
