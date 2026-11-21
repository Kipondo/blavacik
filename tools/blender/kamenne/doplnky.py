# Doplnky Kamenného námestia: okrúhly vyvýšený záhon s kvetmi a nízkou betónovou obrubou (poloha a tvar
# z OSM – tráva 974143626) a pravouhlé drevené truhlíky so stromčekmi. Model kopíruje terén (podlaTerenu).

import math
import random

from spolocne import material
from veze import Geo

from kamenne.zaklad import data, v_bl

# truhlíky (x, z v hre, natočenie v stupňoch) – na dlažbe východne od záhona, mimo ciest
TRUHLIKY = [(478.0, -134.0, 12), (483.5, -132.2, 12), (489.0, -130.4, 12), (481.0, -127.0, 12)]


def m_doplnky():
    return {
        'betón': material('obruba-beton', '#bdb8ae', drsnost=0.85),
        'zem': material('zem-zahon', '#4a3a2c', drsnost=1.0),
        'drevo': material('drevo-truhlik', '#8a6440', drsnost=0.8),
        'kmen': material('kmen-strom', '#5b4632', drsnost=1.0),
        'koruna': material('ker-koruna', '#4f7a3a', drsnost=0.9),
        'trava': material('ker-trava', '#5f8a42', drsnost=0.95),
        'kvet_c': material('kvet-cerveny', '#c23a33', drsnost=0.7),
        'kvet_z': material('kvet-zlty', '#e0b83a', drsnost=0.7),
        'kvet_f': material('kvet-fialovy', '#7b4f9e', drsnost=0.7),
        'kvet_b': material('kvet-biely', '#eeeae0', drsnost=0.7),
    }


def zahon(G, M, stred_bl, r, rnd):
    """Okrúhly záhon: betónová obruba 45 cm, hlina a kvety v kruhoch."""
    seg = 40
    G.valec(M['betón'], stred_bl, r, 0.0, 0.45, seg=seg, vrch=False)
    # vrch obruby (medzikružie)
    for i in range(seg):
        a0, a1 = 2 * math.pi * i / seg, 2 * math.pi * (i + 1) / seg
        ri = r - 0.25
        G.plocha(M['betón'], [(stred_bl[0] + ri * math.cos(a0), stred_bl[1] + ri * math.sin(a0), 0.45),
                               (stred_bl[0] + r * math.cos(a0), stred_bl[1] + r * math.sin(a0), 0.45),
                               (stred_bl[0] + r * math.cos(a1), stred_bl[1] + r * math.sin(a1), 0.45),
                               (stred_bl[0] + ri * math.cos(a1), stred_bl[1] + ri * math.sin(a1), 0.45)])
    G.valec(M['zem'], stred_bl, r - 0.25, 0.3, 0.38, seg=seg)
    # kvety po kruhoch: vonku červené, potom žlté, fialové, v strede biele a nízky ker
    for rr, mat, n in ((r - 0.55, 'kvet_c', 34), (r - 1.1, 'kvet_z', 26), (r - 1.65, 'kvet_f', 18), (r - 2.2, 'kvet_b', 10)):
        if rr <= 0.2:
            continue
        for k in range(n):
            u = 2 * math.pi * (k + rnd.random() * 0.4) / n
            p = (stred_bl[0] + rr * math.cos(u), stred_bl[1] + rr * math.sin(u))
            h = 0.12 + rnd.random() * 0.14
            G.kvader(M['trava'], p, (math.cos(u), math.sin(u)), 0.32, 0.32, 0.38, 0.38 + h * 0.6)
            G.kvader(M[mat], p, (math.cos(u), math.sin(u)), 0.22, 0.22, 0.38 + h * 0.6, 0.38 + h)
    G.valec(M['koruna'], stred_bl, 0.55, 0.38, 1.1, seg=10, r1=0.25)


def truhlik(G, M, p, uhol, rnd):
    """Drevený truhlík 2,4 × 1,2 × 0,6 m s hlinou, kríkmi a stromčekom."""
    ux, uy = math.cos(math.radians(uhol)), math.sin(math.radians(uhol))
    G.kvader(M['drevo'], p, (ux, uy), 2.4, 1.2, 0.0, 0.6)
    # vodorovné dosky (škáry) na boku
    for z in (0.2, 0.4):
        G.kvader(M['kmen'], p, (ux, uy), 2.42, 1.22, z - 0.01, z + 0.01, vrch=False)
    G.kvader(M['zem'], p, (ux, uy), 2.2, 1.0, 0.6, 0.62)
    for s in (-0.75, 0.75):
        q = (p[0] + ux * s, p[1] + uy * s)
        G.valec(M['trava'], q, 0.38, 0.6, 0.95, seg=8, r1=0.2)
    G.valec(M['kmen'], p, 0.06, 0.6, 2.2, seg=6)
    G.valec(M['koruna'], p, 0.75, 1.9, 3.1, seg=10, r1=0.3)
    G.valec(M['koruna'], p, 0.45, 1.7, 1.9, seg=10, r1=0.75)


def postav():
    D = data()
    M = m_doplnky()
    rnd = random.Random(7)
    G = Geo()
    b = D['zahon']['body']
    stred = (round(sum(p[0] for p in b) / len(b), 2), round(sum(p[1] for p in b) / len(b), 2))
    r = sum(math.hypot(p[0] - stred[0], p[1] - stred[1]) for p in b) / len(b)
    zahon(G, M, (0.0, 0.0), r, rnd)
    for x, z, u in TRUHLIKY:
        truhlik(G, M, v_bl((x, z), stred), u, rnd)
    # kolízie (lokálne metre hry): obruba záhona a truhlíky
    kolizie = [[[round(r * math.cos(2 * math.pi * k / 16), 2), round(r * math.sin(2 * math.pi * k / 16), 2)] for k in range(16)]]
    for x, z, u in TRUHLIKY:
        ux, uz = math.cos(math.radians(u)), -math.sin(math.radians(u))
        vx, vz = -uz, ux
        cx, cz = x - stred[0], z - stred[1]
        kolizie.append([[round(cx + ux * a * 1.2 + vx * c * 0.6, 2), round(cz + uz * a * 1.2 + vz * c * 0.6, 2)]
                        for a, c in ((-1, -1), (1, -1), (1, 1), (-1, 1))])
    info = {'stred': [stred[0], stred[1]], 'podlaTerenu': True, 'kolizie': kolizie}
    return G, [], 3.2, 'kamenne-namestie-doplnky', info
