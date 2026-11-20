# Istropolis (stav k novembru 2026): pôvodný Dom odborov je zbúraný, na jeho mieste je stavenisko nového
# kongresového centra (dokončenie ~2030) – oplotenie z panelov, výkop so základovou doskou, rozostavaný
# skelet s betónovými jadrami, dva vežové žeriavy a buňky stavbyvedúcich. Plochy staveniska z OSM.

import math
import random

from veze import Geo, z_hry, zjednodus, ccw, odsad, plocha_obrysu, dlzka
from spolocne import material


def zeriav(G, M, p, smer, vyska=52.0, vylozenie=55.0):
    ux, uy = smer
    # stožiar: štyri rohové stĺpiky a priečky (príhradovina)
    s = 1.0
    rohy = [(p[0] + dx * s, p[1] + dy * s) for dx, dy in ((-1, -1), (1, -1), (1, 1), (-1, 1))]
    for r in rohy:
        G.tram(M['zlta'], (r[0], r[1], 0.0), (r[0], r[1], vyska), 0.16)
    z = 0.0
    while z < vyska - 2.0:
        for i in range(4):
            a, b = rohy[i], rohy[(i + 1) % 4]
            G.tram(M['zlta'], (a[0], a[1], z), (b[0], b[1], z + 2.0), 0.08)
        z += 2.0
    G.kvader(M['beton'], p, (1, 0), 6.0, 6.0, -0.5, 1.0)
    # otočná časť, kabína, výložník a protivýložník
    G.kvader(M['zlta'], p, (ux, uy), 3.0, 3.0, vyska, vyska + 1.5)
    G.kvader(M['biela'], (p[0] + ux * 1.2 - uy * 1.6, p[1] + uy * 1.2 + ux * 1.6), (ux, uy), 1.8, 1.6, vyska + 1.5, vyska + 3.6)
    for k, (dl, h) in enumerate(((vylozenie, 1.6), (-15.0, 1.2))):
        a = (p[0], p[1], vyska + 1.5)
        b = (p[0] + ux * dl, p[1] + uy * dl, vyska + 1.5)
        for dz, dv in ((0, -0.6), (0, 0.6), (h, 0)):
            G.tram(M['zlta'], (a[0] - uy * dv, a[1] + ux * dv, a[2] + dz), (b[0] - uy * dv, b[1] + ux * dv, b[2] + dz), 0.12)
        n = int(abs(dl) / 2.0)
        for m in range(n):
            q0 = (p[0] + ux * dl * m / n, p[1] + uy * dl * m / n)
            q1 = (p[0] + ux * dl * (m + 1) / n, p[1] + uy * dl * (m + 1) / n)
            G.tram(M['zlta'], (q0[0], q0[1], vyska + 1.5), (q1[0], q1[1], vyska + 1.5 + h), 0.06)
    # vrchol (veža nad otočou) a laná
    G.tram(M['zlta'], (p[0], p[1], vyska + 1.5), (p[0], p[1], vyska + 9.0), 0.4)
    G.tram(M['kov'], (p[0], p[1], vyska + 9.0), (p[0] + ux * vylozenie * 0.6, p[1] + uy * vylozenie * 0.6, vyska + 3.1), 0.05)
    G.tram(M['kov'], (p[0], p[1], vyska + 9.0), (p[0] - ux * 14, p[1] - uy * 14, vyska + 2.7), 0.05)
    # protiváha
    G.kvader(M['beton'], (p[0] - ux * 13.5, p[1] - uy * 13.5), (ux, uy), 2.5, 2.0, vyska + 0.2, vyska + 2.6)
    # mačka a lano s hákom
    m = (p[0] + ux * vylozenie * 0.55, p[1] + uy * vylozenie * 0.55)
    G.kvader(M['kov'], m, (ux, uy), 1.2, 1.2, vyska + 0.9, vyska + 1.5)
    G.tram(M['kov'], (m[0], m[1], vyska + 0.9), (m[0], m[1], vyska * 0.45), 0.04)
    G.kvader(M['kov'], m, (ux, uy), 0.5, 0.5, vyska * 0.45 - 0.6, vyska * 0.45)


def postav(obrysy):
    H = obrysy['istropolis']['hlavne']
    vsetky = [p for h in H for p in h['body']]
    stred = (sum(p[0] for p in vsetky) / len(vsetky), sum(p[1] for p in vsetky) / len(vsetky))
    M = {
        'plot': material('stavenisko-plot', '#d9d5c8', drsnost=0.6), 'plot2': material('stavenisko-plot-modry', '#2f5b8a', drsnost=0.6),
        'zem': material('stavenisko-zem', '#7b6a55', drsnost=1.0), 'beton': material('stavenisko-beton', '#a7a59e', drsnost=0.85),
        'zlta': material('stavenisko-zeriav', '#e2b028', drsnost=0.5, kov=0.4), 'biela': material('stavenisko-kabina', '#efefea', drsnost=0.5),
        'kov': material('stavenisko-kov', '#4a4d50', drsnost=0.5, kov=0.7), 'bunka': material('stavenisko-bunka', '#c9ccd0', drsnost=0.6),
        'vystuz': material('stavenisko-vystuz', '#6e4a36', drsnost=0.7, kov=0.4),
    }
    G = Geo()
    rnd = random.Random(7)
    plochy = []
    for k, h in enumerate(H):
        o = ccw(zjednodus(z_hry(h['body'], stred), 0.6))
        plochy.append(o)
        # oplotenie z panelov (striedavo svetlé a modré s logom staviteľa – bez názvu)
        n = len(o)
        for i in range(n):
            a, b = o[i], o[(i + 1) % n]
            L = dlzka(a, b)
            m = max(1, int(L / 3.5))
            for j in range(m):
                p0 = (a[0] + (b[0] - a[0]) * j / m, a[1] + (b[1] - a[1]) * j / m)
                p1 = (a[0] + (b[0] - a[0]) * (j + 1) / m, a[1] + (b[1] - a[1]) * (j + 1) / m)
                mat = M['plot2'] if (j // 3) % 2 else M['plot']
                G.stena(mat, p0, p1, 0.0, 2.4)
                G.stena(mat, p1, p0, 0.0, 2.4)
        # výkop: hnedá zem a základová doska
        G.vodorovna(M['zem'], odsad(o, -0.5), 0.06)
        if abs(plocha_obrysu(o)) > 3000:
            dno = odsad(o, -12.0)
            G.hranol(M['beton'], dno, 0.06, 0.5)
            # rozostavaný skelet: stĺpy v mriežke 8 m a dve stropné dosky nad časťou plochy, betónové jadrá
            xs = [p[0] for p in dno]
            ys = [p[1] for p in dno]
            from pamiatky2.gerulata import v_poly
            x = min(xs) + 4
            while x < max(xs) - 4:
                y = min(ys) + 4
                while y < max(ys) - 4:
                    if v_poly(x, y, dno):
                        poschodia = 3 if x < (min(xs) + max(xs)) / 2 else 1
                        G.kvader(M['beton'], (x, y), (1, 0), 0.6, 0.6, 0.5, 0.5 + 4.0 * poschodia)
                        for p_ in range(1, poschodia):
                            G.kvader(M['beton'], (x, y), (1, 0), 8.0, 8.0, 0.5 + 4.0 * p_ - 0.3, 0.5 + 4.0 * p_)
                        if poschodia == 1 and rnd.random() < 0.3:
                            for dx in (-0.25, 0.25):
                                G.tram(M['vystuz'], (x + dx, y, 4.5), (x + dx, y, 6.5), 0.05)
                    y += 8.0
                x += 8.0
            c = (sum(xs) / len(xs), sum(ys) / len(ys))
            for dx in (-14, 10):
                G.kvader(M['beton'], (c[0] + dx, c[1] + 4), (1, 0), 7.0, 9.0, 0.5, 24.0)
            zeriav(G, M, (c[0] - 20, c[1] - 6), (math.cos(0.6), math.sin(0.6)))
            zeriav(G, M, (c[0] + 26, c[1] + 10), (math.cos(3.4), math.sin(3.4)), vyska=46.0, vylozenie=48.0)
            # bunky stavbyvedúcich (dve poschodia)
            b0 = o[0]
            for r in range(4):
                for s in range(2):
                    G.kvader(M['bunka'], (b0[0] + 8 + r * 2.6, b0[1] + 6), (0, 1), 6.0, 2.5, s * 2.7, s * 2.7 + 2.6)
    return G, plochy, 60.0, 'istropolis', {'stred': [round(stred[0], 2), round(stred[1], 2)]}
