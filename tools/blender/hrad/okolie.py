# Okolie Bratislavského hradu, ktoré kopíruje terén (v hre sa každý vrchol posunie na výšku terénu,
# js/mapa/pamiatky/vyskova-budova.js s "podlaTerenu": true): hradby a múry z OSM (barrier=wall /
# city_wall, wall=castle_wall), kamenné s krycou doskou, a živé ploty barokovej záhrady pozdĺž
# chodníkov parteru (OSM highway=footway vnútri leisure=garden „Baroková záhrada“) s fontánou.
# Výška z = 0 je terén v danom mieste.

import json
import math
import os

from veze import Geo, dlzka
from spolocne import material
from hrad.palac import data

POLOMER = 235.0                          # m od paláca
HRADBA = {'vyska': 6.5, 'hrubka': 2.2}
MUR = {'vyska': 3.0, 'hrubka': 0.9}
KROK = 3.0


def v_bl(p, stred):
    return (p[0] - stred[0], -(p[1] - stred[1]))


def delenie(body, krok=KROK):
    out = [body[0]]
    for a, b in zip(body[:-1], body[1:]):
        n = max(1, math.ceil(dlzka(a, b) / krok))
        for k in range(1, n + 1):
            out.append((a[0] + (b[0] - a[0]) * k / n, a[1] + (b[1] - a[1]) * k / n))
    return out


def mur(G, mat, mat_kryt, body, vyska, hrubka, dole=-2.0):
    """Múr pozdĺž lomenej čiary: dve líca, vrch s krycou doskou, čelá na koncoch."""
    body = delenie(body)
    n = len(body)
    L, R = [], []
    for i in range(n):
        a = body[max(0, i - 1)]
        b = body[min(n - 1, i + 1)]
        d = dlzka(a, b) or 1e-9
        nx, ny = (b[1] - a[1]) / d, -(b[0] - a[0]) / d
        L.append((body[i][0] - nx * hrubka / 2, body[i][1] - ny * hrubka / 2))
        R.append((body[i][0] + nx * hrubka / 2, body[i][1] + ny * hrubka / 2))
    for i in range(n - 1):
        G.stena(mat, R[i], R[i + 1], dole, vyska)
        G.stena(mat, L[i + 1], L[i], dole, vyska)
    # krycia doska (širšia o 0,15 m)
    k = 0.15
    for i in range(n - 1):
        a, b = body[i], body[i + 1]
        d = dlzka(a, b) or 1e-9
        nx, ny = (b[1] - a[1]) / d, -(b[0] - a[0]) / d
        h = hrubka / 2 + k
        q = [(a[0] - nx * h, a[1] - ny * h), (a[0] + nx * h, a[1] + ny * h), (b[0] + nx * h, b[1] + ny * h), (b[0] - nx * h, b[1] - ny * h)]
        G.plocha(mat_kryt, [(x, y, vyska + 0.3) for x, y in q])
        G.stena(mat_kryt, q[1], q[2], vyska - 0.05, vyska + 0.3)
        G.stena(mat_kryt, q[3], q[0], vyska - 0.05, vyska + 0.3)
    for i, (p, q) in ((0, (L[0], R[0])), (n - 1, (R[-1], L[-1]))):
        G.stena(mat, p, q, dole, vyska)


def v_polygone(x, z, b):
    c, j = False, len(b) - 1
    for i in range(len(b)):
        xi, zi = b[i]
        xj, zj = b[j]
        if (zi > z) != (zj > z) and x < (xj - xi) * (z - zi) / (zj - zi) + xi:
            c = not c
        j = i
    return c


def postav():
    D = data()
    palac = D['8160490']
    b = palac['body'][:-1]
    from veze import stred_obrysu
    stred = stred_obrysu(b)
    kamen = material('kamen-hradieb', '#c2b8a4', drsnost=0.92)
    kryt = material('kryt-hradieb', '#b1a792', drsnost=0.9)
    omietka = material('omietka-hradieb', '#e6e0d2', drsnost=0.9)
    zivy = material('zivy-plot', '#3f5f2c', drsnost=0.95)
    voda_m = material('voda-fontany', '#5d7f8c', drsnost=0.1, kov=0.3)

    G = Geo()
    pocet_murov = 0
    kolizie = []
    for c in D.values():
        t = c['t']
        if t.get('barrier') not in ('wall', 'city_wall'):
            continue
        if t.get('material') == 'glass' or (t.get('height') and float(t['height']) < 1.6):
            continue
        body = c['body']
        if not any(math.hypot(x - stred[0], z - stred[1]) < POLOMER for x, z in body):
            continue
        hradba = t.get('wall') == 'castle_wall' or t.get('barrier') == 'city_wall'
        par = HRADBA if hradba else MUR
        vys = float(t['height']) if t.get('height') else par['vyska']
        bl = [v_bl(p, stred) for p in body]
        mur(G, kamen if (hradba or t.get('material') == 'stone') else omietka, kryt, bl, vys, par['hrubka'])
        pocet_murov += 1
        # kolízie: obdĺžnik pre každý úsek múru (v lokálnych metroch hry: x, z = −y Blendera)
        h = par['hrubka'] / 2 + 0.1
        for a, b2 in zip(bl[:-1], bl[1:]):
            d = dlzka(a, b2) or 1e-9
            nx, ny = (b2[1] - a[1]) / d, -(b2[0] - a[0]) / d
            q = [(a[0] - nx * h, a[1] - ny * h), (b2[0] - nx * h, b2[1] - ny * h), (b2[0] + nx * h, b2[1] + ny * h), (a[0] + nx * h, a[1] + ny * h)]
            kolizie.append([[round(x, 2), round(-y, 2)] for x, y in q])

    # baroková záhrada: živé ploty pozdĺž chodníkov parteru
    zahrada = D['369605107']['body']
    chodniky = [c for c in D.values() if c['t'].get('highway') in ('footway', 'path', 'pedestrian')]
    kruhy = []
    for c in chodniky:
        body = c['body']
        vnutri = [v_polygone(x, z, zahrada) for x, z in body]
        if sum(vnutri) < len(body) * 0.8:
            continue
        if c['uzavrety'] and len(body) > 6:
            kruhy.append(body)
        bl = [v_bl(p, stred) for p in body]
        for s in (1, -1):
            # ploty po oboch stranách chodníka (odsadené o 1,4 m)
            dl = delenie(bl, 2.5)
            n = len(dl)
            ciara = []
            for i in range(n):
                a, bb = dl[max(0, i - 1)], dl[min(n - 1, i + 1)]
                d = dlzka(a, bb) or 1e-9
                nx, ny = (bb[1] - a[1]) / d, -(bb[0] - a[0]) / d
                ciara.append((dl[i][0] + nx * 1.4 * s, dl[i][1] + ny * 1.4 * s))
            if len(ciara) >= 2:
                mur(G, zivy, zivy, ciara, 0.55, 0.5, dole=-0.3)
    # fontána v strede parteru (kruhový chodník) – kamenné obrubie, voda a stredný stĺp
    for kruh in kruhy[:2]:
        cx = sum(p[0] for p in kruh) / len(kruh)
        cz = sum(p[1] for p in kruh) / len(kruh)
        r = sum(math.hypot(p[0] - cx, p[1] - cz) for p in kruh) / len(kruh) - 1.6
        if r < 1.5:
            continue
        c = v_bl((cx, cz), stred)
        G.valec(kamen, c, r, -0.3, 0.55, seg=32)
        G.valec(kamen, c, r - 0.4, 0.55, 0.55, seg=32, vrch=False)
        G.valec(voda_m, c, r - 0.4, 0.3, 0.3, seg=32)
        G.valec(kamen, c, 0.5, 0.3, 1.6, seg=12, r1=0.3)
        G.valec(kamen, c, 1.2, 1.6, 1.8, seg=16, r1=0.9)
    print('múrov', pocet_murov, 'kruhov', len(kruhy))
    return G, [], 7.0, 'hrad-okolie', {'stred': [round(stred[0], 2), round(stred[1], 2)], 'podlaTerenu': True, 'kolizie': kolizie}
