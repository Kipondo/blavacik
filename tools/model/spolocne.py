# Nový model mesta (samostatný, mimo hry) – spoločné nastavenia skriptov tools/model/*.py.
#
# Skúšobné územie ~2,5 × 2 km: Staré Mesto s Hradným kopcom, nábrežie, Most SNP, Starý most, Most Apollo a kus
# Petržalky. Súradnice ako v hre: x = východ, z = juh, metre od 48.1435 N, 17.1077 E (Hlavné námestie).
# Výsledok ide do model/data/ a zobrazuje ho model/index.html (štyri varianty).

import json, math, os, sys

KOREN = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..'))
VYSTUP = os.path.join(KOREN, 'model', 'data')
CACHE = os.path.join(KOREN, '.cache', 'model')

LAT0, LON0 = 48.1435, 17.1077
KX = 111320 * math.cos(math.radians(LAT0))
KZ = 111132
NULA = 139.0                   # m n. m. = y 0 (ako v hre)

DLAZDICA = 256                 # m
KROK = 0.5                     # m – mriežka terénu (rozlíšenie laseru DMR 6.0)
UZLY = int(DLAZDICA / KROK) + 1  # 513 – uzly dlaždice vrátane spoločného okraja
X0, Z0 = -768, -512            # ľavý horný roh územia
NI, NJ = 10, 8                 # počet dlaždíc v x a z (2560 × 2048 m)
PIX = 0.25                     # m – rozlíšenie mapy plôch (cesty, chodníky, zeleň…)


def dlazdice():
    return [(i, j) for j in range(NJ) for i in range(NI)]


def roh(i, j):
    return X0 + DLAZDICA * i, Z0 + DLAZDICA * j


def na_metre(lon, lat):
    return (lon - LON0) * KX, -(lat - LAT0) * KZ


def na_stupne(x, z):
    return LON0 + x / KX, LAT0 - z / KZ


def hranice(okraj=0):
    """(lat_min, lon_min, lat_max, lon_max) územia s okrajom v metroch."""
    lon0, lat1 = na_stupne(X0 - okraj, Z0 - okraj)
    lon1, lat0 = na_stupne(X0 + DLAZDICA * NI + okraj, Z0 + DLAZDICA * NJ + okraj)
    return lat0, lon0, lat1, lon1


def uloz_json(cesta, data):
    os.makedirs(os.path.dirname(cesta), exist_ok=True)
    with open(cesta, 'w', encoding='utf8') as f:
        json.dump(data, f, ensure_ascii=False, separators=(',', ':'))


def laser():
    """Laserové pomôcky hry (tools/mesto/laser/spolocne.py – čítanie výrezov z GeoTIFF ÚGKK) bez konfliktu mien."""
    import importlib.util
    spec = importlib.util.spec_from_file_location('laser_spolocne', os.path.join(KOREN, 'tools', 'mesto', 'laser', 'spolocne.py'))
    m = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(m)
    return m
