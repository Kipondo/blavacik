# Okolie Mladej gardy: antukové tenisové kurty na nádvoriach (z OSM leisure=pitch, sport=tennis, surface=clay)
# s bielymi čiarami, sieťou a oplotením. Model kopíruje terén ("podlaTerenu").

import math

from shapely.geometry.polygon import orient

from shapely.geometry import Polygon

from spolocne import material
from veze import Geo, stred_obrysu

from garda.zaklad import data, v_bl

KURTY = ['24030312', '93184927', '859753755', '859753756', '859753758', '859753759', '859753760']


def postav():
    D = data()
    M = {
        'antuka': material('antuka', '#c0643c', drsnost=0.95),
        'ciara': material('detail-ciara-kurt', '#f2efe8', drsnost=0.8),
        'siet': material('detail-siet', '#2a2c2e', drsnost=0.7),
        'plot': material('detail-plot-kurt', '#2f4a36', drsnost=0.6, kov=0.3),
    }
    G = Geo()
    hlavny = D['garda']['obrys']['body']
    stred = stred_obrysu([(p[0], p[1]) for p in hlavny])
    stred = (round(stred[0], 2), round(stred[1], 2))
    plochy = {o['id']: o for o in D['okolie']}
    from shapely.ops import unary_union
    from shapely.geometry import Point
    spolu = unary_union([Polygon([v_bl(p, stred) for p in plochy[k]['body']]).buffer(0.3) for k in KURTY if k in plochy])
    for kid in KURTY:
        o = plochy.get(kid)
        if not o:
            continue
        b = [v_bl(p, stred) for p in o['body']]
        P = Polygon(b).buffer(0)
        if P.area < 100:
            continue
        # antuka
        obr = list(P.exterior.coords)[:-1]
        if Polygon(obr).exterior.is_ccw is False:
            obr = obr[::-1]
        # antuka po bunkách 2,5 m – model kopíruje terén len vo vrcholoch, veľký polygón by sa zaboril
        bx0, by0, bx1, by1 = P.bounds
        k = 2.5
        y0 = by0
        while y0 < by1:
            x0 = bx0
            while x0 < bx1:
                bunka = P.intersection(Polygon([(x0, y0), (x0 + k, y0), (x0 + k, y0 + k), (x0, y0 + k)]))
                for g in getattr(bunka, 'geoms', [bunka]):
                    if g.geom_type != 'Polygon' or g.area < 0.01:
                        continue
                    o2 = list(orient(g, 1.0).exterior.coords)[:-1]
                    G.plocha(M['antuka'], [(x, y, 0.10) for x, y in o2])
                x0 += k
            y0 += k
        # os kurtu z najmenšieho otočeného obdĺžnika
        r = list(P.minimum_rotated_rectangle.exterior.coords)[:-1]
        e1 = (r[1][0] - r[0][0], r[1][1] - r[0][1])
        e2 = (r[2][0] - r[1][0], r[2][1] - r[1][1])
        l1, l2 = math.hypot(*e1), math.hypot(*e2)
        u = (e1[0] / l1, e1[1] / l1) if l1 > l2 else (e2[0] / l2, e2[1] / l2)
        v = (-u[1], u[0])
        c = (P.centroid.x, P.centroid.y)
        bod = lambda s, t: (c[0] + u[0] * s + v[0] * t, c[1] + u[1] * s + v[1] * t)

        def ciara(s0, t0, s1, t1, w=0.05):
            # biely pás medzi (s0, t0) a (s1, t1) šírky w
            a, bb = bod(s0, t0), bod(s1, t1)
            dx, dy = bb[0] - a[0], bb[1] - a[1]
            L = math.hypot(dx, dy) or 1e-6
            nx, ny = -dy / L * w / 2, dx / L * w / 2
            kusov = max(1, math.ceil(L / 2.5))
            for i in range(kusov):
                p0 = (a[0] + dx * i / kusov, a[1] + dy * i / kusov)
                p1 = (a[0] + dx * (i + 1) / kusov, a[1] + dy * (i + 1) / kusov)
                G.plocha(M['ciara'], [(p0[0] - nx, p0[1] - ny, 0.12), (p1[0] - nx, p1[1] - ny, 0.12),
                                      (p1[0] + nx, p1[1] + ny, 0.12), (p0[0] + nx, p0[1] + ny, 0.12)])
        S, D2, S1 = 11.885, 5.485, 4.115
        for t in (-D2, D2, -S1, S1):
            ciara(-S, t, S, t)
        for s in (-S, S):
            ciara(s, -D2, s, D2, 0.08)
        for s in (-6.4, 6.4):
            ciara(s, -S1, s, S1)
        ciara(-6.4, 0, 6.4, 0)
        # sieť so stĺpikmi
        for t in (-6.4, 6.4):
            p = bod(0, t)
            G.valec(M['siet'], p, 0.05, 0.0, 1.07, seg=6)
        a, bb = bod(0, -6.4), bod(0, 6.4)
        G.kvader(M['siet'], ((a[0] + bb[0]) / 2, (a[1] + bb[1]) / 2), v, 12.8, 0.03, 0.05, 0.95)
        G.kvader(M['ciara'], ((a[0] + bb[0]) / 2, (a[1] + bb[1]) / 2), v, 12.8, 0.05, 0.92, 1.0)
        # oplotenie okolo kurtu: stĺpiky po 3 m, horné a stredné madlo
        n = len(obr)
        for i in range(n):
            p0, p1 = obr[i], obr[(i + 1) % n]
            L = math.hypot(p1[0] - p0[0], p1[1] - p0[1])
            if L < 0.5:
                continue
            ux, uy = (p1[0] - p0[0]) / L, (p1[1] - p0[1]) / L
            # plot len po vonkajšom okraji skupiny kurtov (medzi susednými kurtmi nie je)
            if spolu.boundary.distance(Point((p0[0] + p1[0]) / 2, (p0[1] + p1[1]) / 2)) > 0.8:
                continue
            k = 0.0
            while k <= L:
                G.valec(M['plot'], (p0[0] + ux * k, p0[1] + uy * k), 0.04, 0.0, 3.0, seg=6)
                k += max(2.0, L / max(1, round(L / 3.0)))
            for z in (1.2, 2.95):
                G.kvader(M['plot'], ((p0[0] + p1[0]) / 2, (p0[1] + p1[1]) / 2), (ux, uy), L, 0.04, z, z + 0.05)
    info = {'stred': [stred[0], stred[1]], 'nazov': 'Tenisové kurty Mladej gardy', 'dosah': 20, 'podlaTerenu': True}
    return G, [], 4.0, 'mlada-garda-kurty', info
