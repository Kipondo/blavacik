# Antická Gerulata v Rusovciach: odkryté základy rímskeho vojenského tábora (OSM historic=archaeological_site)
# – nízke kamenné múriky miestností v pravouhlej mriežke pozdĺž hlavnej osi plochy, štrk medzi nimi,
# a Dom s hypokaustom (stĺpiky podlahového kúrenia). Model kopíruje terén.

import math
import random

from veze import Geo, dlzka
from spolocne import material
from hrad.stavebne import hlavna_os
from pamiatky2.zaklad import data, v_bl, bez_konca, ccw, stred_bodov, zrucany_mur, kolizie_muru

STRED = (3060.0, 9715.0)


def v_poly(x, y, b):
    c, j = False, len(b) - 1
    for i in range(len(b)):
        xi, yi = b[i]
        xj, yj = b[j]
        if (yi > y) != (yj > y) and x < (xj - xi) * (y - yi) / (yj - yi) + xi:
            c = not c
        j = i
    return c


def postav():
    D = data()['gerulata']
    kamen = [material('gerulata-kamen-a', '#c8bfa9', drsnost=0.95), material('gerulata-kamen-b', '#b5ab95', drsnost=0.96)]
    tehla = material('gerulata-tehla', '#a0634a', drsnost=0.9)
    strk = material('gerulata-strk', '#a59b88', drsnost=1.0)
    G = Geo()
    kolizie = []
    for k, s in enumerate(D):
        o = ccw(bez_konca([v_bl(p, STRED) for p in s['body']]))
        if len(o) < 3:
            continue
        hypokaust = 'hypocaust' in (s['nazov'] or '').lower()
        # štrk po celej ploche (tesne nad terénom)
        G.vodorovna(strk, o, 0.04)
        # obvodový múr
        zrucany_mur(G, kamen, o, 1.0 if not hypokaust else 0.8, 0.9, seed=k, rozpad=0.35, uzavreta=True, dole=-0.5)
        kolizie += kolizie_muru(o + [o[0]], 0.9)
        ux, uy = hlavna_os(o)
        vx, vy = -uy, ux
        c = stred_bodov(o)
        # rozsah v osiach
        us = [(p[0] - c[0]) * ux + (p[1] - c[1]) * uy for p in o]
        vs = [(p[0] - c[0]) * vx + (p[1] - c[1]) * vy for p in o]
        rnd = random.Random(k)
        if hypokaust:
            # stĺpiky (pilae) z tehál v mriežke 0,6 m
            u = min(us) + 0.8
            while u < max(us) - 0.8:
                v = min(vs) + 0.8
                while v < max(vs) - 0.8:
                    x, y = c[0] + ux * u + vx * v, c[1] + uy * u + vy * v
                    if v_poly(x, y, o):
                        G.kvader(tehla, (x, y), (ux, uy), 0.32, 0.32, 0.0, 0.55 + rnd.random() * 0.1)
                    v += 0.65
                u += 0.65
            continue
        # vnútorné múriky: mriežka miestností 7 × 5 m s vynechanými dverami
        for os_, rozsah, krok, druha in (((ux, uy), (min(vs), max(vs)), 7.0, (vx, vy)), ((vx, vy), (min(us), max(us)), 5.0, (ux, uy))):
            t = rozsah[0] + krok
            while t < rozsah[1] - 1.0:
                # čiara rovnobežná s os_ vo vzdialenosti t po druhej osi
                body = []
                s0 = -200.0
                while s0 < 200.0:
                    x = c[0] + os_[0] * s0 + druha[0] * t
                    y = c[1] + os_[1] * s0 + druha[1] * t
                    body.append((x, y, v_poly(x, y, o)))
                    s0 += 1.0
                # súvislé vnútorné úseky, dvere (medzera 1,2 m) náhodne
                usek = []
                for x, y, vnutri in body + [(0, 0, False)]:
                    if vnutri and rnd.random() > 0.06:
                        usek.append((x, y))
                    else:
                        if len(usek) >= 3:
                            zrucany_mur(G, kamen, usek, 0.75, 0.6, seed=int(t * 10) + k, rozpad=0.45, dole=-0.4)
                        usek = []
                t += krok
    print('Gerulata:', len(D), 'plôch')
    return G, [], 1.5, 'gerulata', {'stred': [STRED[0], STRED[1]], 'podlaTerenu': True, 'kolizie': kolizie}
