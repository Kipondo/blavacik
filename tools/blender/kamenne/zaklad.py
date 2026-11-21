# Spoločné pre Kamenné námestie (Hotel Kyjev, obchodný dom): dáta z OSM (data/kamenne.json), prevody súradníc.
# Súradnice: hra (x východ, z juh) → Blender (x, y = −z) vzhľadom na stred modelu; obrysy CCW.

import json
import math
import os

from veze import z_hry, zjednodus, ccw, dlzka, normala, odsad, stred_obrysu  # noqa: F401

_DATA = None


def data():
    global _DATA
    if _DATA is None:
        with open(os.path.join(os.path.dirname(os.path.dirname(__file__)), 'data', 'kamenne.json')) as f:
            _DATA = json.load(f)
    return _DATA


def v_bl(p, stred):
    return (p[0] - stred[0], -(p[1] - stred[1]))


def obrys_bl(body, stred, tol=0.3):
    return ccw(zjednodus(z_hry(body, stred), tol))


def cast(D, kluc, osm_id):
    return next(c for c in D[kluc]['casti'] if c['id'] == osm_id)


def bod_na(a, b, t, odsun=0.0):
    """Bod na úsečke a→b v parametri t, posunutý o `odsun` von (vpravo od smeru)."""
    nx, ny = normala(a, b)
    return (a[0] + (b[0] - a[0]) * t + nx * odsun, a[1] + (b[1] - a[1]) * t + ny * odsun)


def najdlhsie_hrany(obrys, n=2):
    """Indexy n najdlhších hrán obrysu."""
    return sorted(range(len(obrys)), key=lambda i: -dlzka(obrys[i], obrys[(i + 1) % len(obrys)]))[:n]


def disk(G, mat, stred, os_n, r, hrubka, z, seg=32, von=0.0):
    """Zvislý kruh (ciferník, terč) s lícom v smere normály os_n, stred (x, y) na stene, výška z."""
    nx, ny = os_n
    ux, uy = -ny, nx
    cx, cy = stred[0] + nx * von, stred[1] + ny * von
    pred = [(cx + nx * hrubka + ux * r * math.cos(2 * math.pi * i / seg), cy + ny * hrubka + uy * r * math.cos(2 * math.pi * i / seg),
             z + r * math.sin(2 * math.pi * i / seg)) for i in range(seg)]
    zad = [(cx + ux * r * math.cos(2 * math.pi * i / seg), cy + uy * r * math.cos(2 * math.pi * i / seg),
            z + r * math.sin(2 * math.pi * i / seg)) for i in range(seg)]
    # body idú v smere u → hore, takže normála predného kruhu je os_n (u × z = n)
    G.plocha(mat, pred)
    for i in range(seg):
        j = (i + 1) % seg
        G.plocha(mat, [zad[i], zad[j], pred[j], pred[i]])
