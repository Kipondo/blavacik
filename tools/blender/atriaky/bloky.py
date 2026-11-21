# Átriové domky („Átriaky“, internát UK Mlyny, arch. V. Dedeček) – bloky AD-A … AD-U (issue #72).
#   Pôdorysy z OSM (tools/blender/osm_atriaky.mjs → data/atriaky.json), výšky z laserového skenovania ÚGKK
#   (tools/blender/laser_atriaky.py → data/atriaky-laser.json). Laser ukázal, že átriá väčšiny domov sú
#   zastrešené (zhora je strecha so svetlíkom); otvorený dvor má len AD-I.
#   Vzhľad podľa verejných fotografií: pohľadový betón, mohutné vodorovné parapetné pásy po podlažiach,
#   zapustené pásy okien, ustúpené presklené prízemie na stĺpoch, horné podlažie vyložené nad nižšie,
#   plochá strecha so zábradlím a svetlíkom nad átriom.

import json
import math
import os
import random

from shapely.geometry import Polygon, box
from shapely.geometry.polygon import orient

from spolocne import material
from veze import Geo, z_hry, zjednodus, ccw, odsad, dlzka, normala, stred_obrysu, sklo

TU = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def data():
    D = json.load(open(os.path.join(TU, 'data', 'atriaky.json')))
    L = json.load(open(os.path.join(TU, 'data', 'atriaky-laser.json')))
    return D, L


def materialy():
    return {
        'beton': material('beton-pohladovy', '#b4afa5', drsnost=0.9),
        'beton_tmavy': material('beton-tmavy', '#8f8a80', drsnost=0.9),
        'sklo': sklo('sklo-atriaky', '#3b464d', drsnost=0.06, kov=0.7),
        'ram': material('detail-ram-atriaky', '#5a5e60', drsnost=0.5, kov=0.5),
        'strecha': material('strecha-atriaky', '#7d7f7d', drsnost=0.95),
        'svetlik': sklo('sklo-svetlik', '#7f97a3', drsnost=0.05, kov=0.6),
        'zabradlie': material('detail-zabradlie-atriaky', '#6a6e70', drsnost=0.5, kov=0.6),
        'dvere': material('dvere-atriaky', '#3f3a35', drsnost=0.6),
    }


def blok(G, M, obrys, H, rnd, dvor=None):
    """Jeden átriový dom: zapustené prízemie na stĺpoch, betónové parapetné pásy, pásy okien, strecha."""
    pocet = max(2, round((H - 1.0) / 3.3))
    hp = (H - 1.0) / pocet
    # prízemie zapustené o 1,4 m, presklené so stĺpikmi a dverami
    vnutro = odsad(obrys, -1.4)
    n = len(obrys)
    for i in range(n):
        a, b = vnutro[i], vnutro[(i + 1) % n]
        L = dlzka(a, b)
        if L < 0.3:
            continue
        G.stena(M['sklo'], a, b, 0.0, hp)
        ux, uy = (b[0] - a[0]) / L, (b[1] - a[1]) / L
        k = max(1, round(L / 1.8))
        for j in range(k + 1):
            p = (a[0] + ux * L * j / k, a[1] + uy * L * j / k)
            G.kvader(M['ram'], p, (ux, uy), 0.08, 0.12, 0.0, hp)
        if L > 8:
            m = ((a[0] + b[0]) / 2, (a[1] + b[1]) / 2)
            nx, ny = normala(a, b)
            G.kvader(M['dvere'], (m[0] + nx * 0.03, m[1] + ny * 0.03), (ux, uy), 1.8, 0.06, 0.0, 2.3)
    # stĺpy pod obvodom
    for i in range(n):
        a, b = obrys[i], obrys[(i + 1) % n]
        L = dlzka(a, b)
        if L < 2:
            continue
        ux, uy = (b[0] - a[0]) / L, (b[1] - a[1]) / L
        nx, ny = normala(a, b)
        k = max(1, round(L / 6.0))
        for j in range(k + 1):
            p = (a[0] + ux * L * j / k - nx * 0.7, a[1] + uy * L * j / k - ny * 0.7)
            G.kvader(M['beton'], p, (ux, uy), 0.5, 0.5, 0.0, hp)
    G.vodorovna(M['beton_tmavy'], obrys, hp, hore=False)
    # poschodia: mohutný parapetný pás na líci, za ním zapustený pás okien; horné podlažie vyložené
    for k in range(1, pocet):
        z0 = k * hp
        z1 = (k + 1) * hp
        von = 0.7 if k == pocet - 1 else 0.0
        lice = odsad(obrys, von) if von else obrys
        G.pas(M['beton'], lice, z0, z0 + 1.15, 0.15, dnu=0.15 + von)
        okna = odsad(obrys, -0.6)
        for i in range(n):
            a, b = okna[i], okna[(i + 1) % n]
            G.stena(M['sklo'], a, b, z0 + 1.15, z1)
            L = dlzka(a, b)
            if L < 1:
                continue
            ux, uy = (b[0] - a[0]) / L, (b[1] - a[1]) / L
            for j in range(1, max(2, round(L / 1.5))):
                t = j / max(2, round(L / 1.5))
                G.kvader(M['ram'], (a[0] + ux * L * t, a[1] + uy * L * t), (ux, uy), 0.07, 0.1, z0 + 1.15, z1)
        if von:
            G.vodorovna(M['beton_tmavy'], lice, z0, hore=False)
        # stropná doska medzi pásom okien a vyšším parapetom
        G.pas(M['beton_tmavy'], okna, z1 - 0.05, z1, 0.6 + (0.7 if k == pocet - 2 else 0.0), dnu=0.0, vrch=False)
    # strecha, atika so zábradlím
    lice = odsad(obrys, 0.7) if pocet > 1 else obrys
    G.pas(M['beton'], lice, H, H + 0.9, 0.15, dnu=0.25)
    G.vodorovna(M['strecha'], odsad(lice, -0.25), H + 0.05)
    G.pas(M['zabradlie'], odsad(lice, -0.1), H + 1.4, H + 1.46, 0.03, dnu=0.03)
    if dvor:
        return
    # svetlík nad zastrešeným átriom (sklenený ihlan)
    P = Polygon(obrys)
    c = P.centroid
    s = math.sqrt(P.area) * 0.2
    st = [(c.x - s, c.y - s), (c.x + s, c.y - s), (c.x + s, c.y + s), (c.x - s, c.y + s)]
    G.hranol(M['beton'], st, H, H + 0.6)
    for i in range(4):
        a, b = st[i], st[(i + 1) % 4]
        G.plocha(M['svetlik'], [(a[0], a[1], H + 0.6), (b[0], b[1], H + 0.6), (c.x, c.y, H + 0.6 + s * 0.3)])


def postav():
    D, LZ = data()
    M = materialy()
    rnd = random.Random(72)
    G = Geo()
    vsetky = [p for b in D['bloky'] for p in b['body']]
    stred = stred_obrysu(vsetky) if False else (sum(p[0] for p in vsetky) / len(vsetky), sum(p[1] for p in vsetky) / len(vsetky))
    stred = (round(stred[0], 2), round(stred[1], 2))
    obrysy, kolizie, nahradit = [], [], []
    zem0 = min(LZ[b['meno']]['zem'] for b in D['bloky'] if LZ.get(b['meno'], {}).get('zem'))
    for b in D['bloky']:
        i0 = len(G.v)
        postav_blok(G, M, b, LZ, stred, rnd, obrysy, kolizie, nahradit)
        # blok stojí na svahu: posun podľa terénu pod ním (DMR) voči najnižšiemu bloku
        dz = (LZ.get(b['meno'], {}).get('zem') or zem0) - zem0
        if dz:
            G.v[i0:] = [(x, y, z + dz) for x, y, z in G.v[i0:]]
    info = {'stred': [stred[0], stred[1]], 'nazov': 'Átriaky', 'dosah': 120,
            'nahradit': [[[round(x, 2), round(-y, 2)] for x, y in o] for o in nahradit],
            'kolizie': [[[round(x, 2), round(-y, 2)] for x, y in o] for o in kolizie]}
    return G, obrysy, 18.0, 'atriaky', info


def postav_blok(G, M, b, LZ, stred, rnd, obrysy, kolizie, nahradit):
    """Jeden blok AD-x (AD-I s otvoreným dvorom podľa lasera, ostatné so zastrešeným átriom)."""
    o = ccw(zjednodus(z_hry(b['body'], stred), 0.3))
    lz = LZ.get(b['meno'], {})
    H = lz.get('vyska') or 13.5
    dvor = None
    if b['meno'] == 'AD-I' and lz.get('atrium'):
        # otvorený dvor (laser): krídla okolo dvora, prechod do dvora z jednej strany
        dvor = ccw([(x - stred[0], -(z - stred[1])) for x, z in lz['atrium']])
        H = 12.0
        kruh = Polygon(o).difference(Polygon(dvor))
        i0 = max(range(len(dvor)), key=lambda i: dlzka(dvor[i], dvor[(i + 1) % len(dvor)]))
        a, c = dvor[i0], dvor[(i0 + 1) % len(dvor)]
        m = ((a[0] + c[0]) / 2, (a[1] + c[1]) / 2)
        nx, ny = normala(a, c)
        prechod = Polygon([(m[0] - ny * 2 + nx * 0.0, m[1] + nx * 2), (m[0] + ny * 2, m[1] - nx * 2),
                           (m[0] + ny * 2 + nx * 20, m[1] - nx * 2 + ny * 20), (m[0] - ny * 2 + nx * 20, m[1] + nx * 2 + ny * 20)])
        casti = kruh.difference(prechod)
        for g in getattr(casti, 'geoms', [casti]):
            if g.area > 10:
                oo = list(orient(g.simplify(0.2), 1.0).exterior.coords)[:-1]
                blok(G, M, oo, H, rnd, dvor=True)
                kolizie.append(oo)
        nahradit.append(o)
        return
    blok(G, M, o, H, rnd)
    obrysy.append(o)
