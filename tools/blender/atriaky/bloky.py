# Átriové domky („Átriaky“, internát UK Mlyny, arch. V. Dedeček) – bloky AD-A … AD-U (issue #72).
#   Pôdorysy z OSM (tools/blender/osm_atriaky.mjs → data/atriaky.json), výšky z laserového skenovania ÚGKK
#   (tools/blender/laser_atriaky.py → data/atriaky-laser.json). Laser ukázal, že átriá väčšiny domov sú
#   zastrešené (zhora je strecha so svetlíkom); otvorený dvor má len AD-I.
#   Vzhľad podľa verejných fotografií: pohľadový betón, mohutné vodorovné parapetné pásy po podlažiach,
#   zapustené pásy okien, ustúpené presklené prízemie na stĺpoch, plochá strecha so zábradlím a svetlíkom nad átriom.
#   Issue #91 (fotky v data/atriaky-fotky.json): najvyššie podlažie je ustúpené – okolo neho pochôdzna terasa
#   s tehlovočerveným pásom a bielym zábradlím. Pôdorysy z OSM obsahujú aj úzke prepojenia so susedným domom –
#   tie sú lávky v 2. a 3. podlaží (pod nimi voľný prechod), nie plná stena. Údaje pre chôdzu (lávky, terasy,
#   kolízie s výškou) idú do assets/pamiatky/atriaky.json, schody a kolízie stavia hra (js/mapa/atriaky/).

import json
import math
import os
import random

from shapely.geometry import MultiPolygon, Polygon, box
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
        'cervena': material('tehlova-atriaky', '#9b3f30', drsnost=0.8),
        'biele': material('detail-zabradlie-biele', '#e6e6e1', drsnost=0.4, kov=0.5),
        'dlazba': material('dlazba-terasy', '#a8a49a', drsnost=0.9),
        'podhlad': material('podhlad-atriaky', '#57544f', drsnost=0.95),
    }

TERASA = 2.4   # m – o koľko je najvyššie podlažie ustúpené (terasa okolo neho)


def zabradlie(G, M, a, b, z, stlpiky=True):
    """Biele zábradlie z vodorovných tyčí nad úsečkou a→b (podlaha z), výška 1,05 m."""
    L = dlzka(a, b)
    if L < 0.2:
        return
    ux, uy = (b[0] - a[0]) / L, (b[1] - a[1]) / L
    for v in (0.45, 0.75, 1.02):
        G.kvader(M['biele'], ((a[0] + b[0]) / 2, (a[1] + b[1]) / 2), (ux, uy), L, 0.05, z + v - 0.025, z + v + 0.025)
    if stlpiky:
        k = max(1, round(L / 1.6))
        for j in range(k + 1):
            p = (a[0] + ux * L * j / k, a[1] + uy * L * j / k)
            G.kvader(M['biele'], p, (ux, uy), 0.05, 0.05, z, z + 1.05)


def rozdel(o):
    """OSM pôdorys → jadro domu (veľký štvoruholník) a úzke prepojenia k susedom (lávky)."""
    P = Polygon(o)
    jadro = P.buffer(-3.0, join_style=2).buffer(3.0, join_style=2)
    if isinstance(jadro, MultiPolygon):
        jadro = max(jadro.geoms, key=lambda g: g.area)
    zvysok = P.difference(jadro.buffer(0.05, join_style=2))
    pasy = [g for g in getattr(zvysok, 'geoms', [zvysok]) if g.area > 4 and not g.is_empty]
    j = ccw(zjednodus([tuple(c) for c in list(orient(jadro, 1.0).exterior.coords)[:-1]], 0.3))
    return j, pasy


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
    # poschodia: mohutný parapetný pás na líci, za ním zapustený pás okien; najvyššie podlažie ustúpené
    # o TERASA – okolo neho pochôdzna terasa s tehlovočerveným pásom a bielym zábradlím (fotky #91)
    ustup = pocet >= 3 and not dvor
    for k in range(1, pocet):
        z0 = k * hp
        z1 = (k + 1) * hp
        horne = ustup and k == pocet - 1
        lice = odsad(obrys, -TERASA) if horne else obrys
        G.pas(M['beton'], lice, z0, z0 + 1.15, 0.15, dnu=0.15)
        # tehlovočervený pás pod oknami
        G.pas(M['cervena'], lice, z0 + 0.92, z0 + 1.15, 0.17, dnu=0.0, vrch=False, spodok=False)
        okna = odsad(lice, -0.6)
        for i in range(len(okna)):
            a, b = okna[i], okna[(i + 1) % len(okna)]
            G.stena(M['sklo'], a, b, z0 + 1.15, z1)
            L = dlzka(a, b)
            if L < 1:
                continue
            ux, uy = (b[0] - a[0]) / L, (b[1] - a[1]) / L
            for j in range(1, max(2, round(L / 1.5))):
                t = j / max(2, round(L / 1.5))
                G.kvader(M['ram'], (a[0] + ux * L * t, a[1] + uy * L * t), (ux, uy), 0.07, 0.1, z0 + 1.15, z1)
        if horne:
            # terasa: dlažba medzi lícom domu a ustúpeným podlažím, na okraji červený pás a zábradlie
            G.pas(M['dlazba'], obrys, z0 - 0.06, z0, 0.15, dnu=TERASA + 0.2, spodok=False)
            G.pas(M['cervena'], obrys, z0 - 0.45, z0 + 0.3, 0.18, dnu=0.0, spodok=False)
            for i in range(len(obrys)):
                zabradlie(G, M, odsad(obrys, 0.08)[i], odsad(obrys, 0.08)[(i + 1) % len(obrys)], z0 + 0.3)
        # stropná doska medzi pásom okien a vyšším parapetom
        G.pas(M['beton_tmavy'], okna, z1 - 0.05, z1, 0.6, dnu=0.0, vrch=False)
    # strecha, atika so zábradlím (nad ustúpeným podlažím)
    lice = odsad(obrys, -TERASA) if ustup else obrys
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
    stred = (sum(p[0] for p in vsetky) / len(vsetky), sum(p[1] for p in vsetky) / len(vsetky))
    stred = (round(stred[0], 2), round(stred[1], 2))
    obrysy, kolizie, nahradit = [], [], []
    zem0 = min(LZ[b['meno']]['zem'] for b in D['bloky'] if LZ.get(b['meno'], {}).get('zem'))
    domy, pasy = [], []
    for b in D['bloky']:
        i0 = len(G.v)
        dom = postav_blok(G, M, b, LZ, stred, rnd, obrysy, kolizie, nahradit)
        # blok stojí na svahu: posun podľa terénu pod ním (DMR) voči najnižšiemu bloku
        dz = (LZ.get(b['meno'], {}).get('zem') or zem0) - zem0
        if dz:
            G.v[i0:] = [(x, y, z + dz) for x, y, z in G.v[i0:]]
        if dom:
            dom['dz'] = dz
            domy.append(dom)
            pasy += [(dom, P) for P in dom.pop('pasy')]
    lavky = []
    for dom, P in pasy:
        c = P.centroid
        # to isté prepojenie môže byť v pôdoryse oboch susedov – stačí raz
        if any(dlzka((c.x, c.y), ((l['obrys'][0][0] + l['obrys'][2][0]) / 2, (l['obrys'][0][1] + l['obrys'][2][1]) / 2)) < 3.0 for l in lavky):
            continue
        l = lavka(G, M, dom, P, domy)
        if l:
            lavky.append(l)
    for l in lavky:
        nahradit.append(l.pop('obrys'))
    hra = lambda o: [[round(x, 2), round(-y, 2)] for x, y in o]
    info = {'stred': [stred[0], stred[1]], 'nazov': 'Átriaky', 'dosah': 120, 'bezKoliziiObrysov': True,
            'nahradit': [hra(o) for o in nahradit],
            'kolizie': [hra(o) for o in kolizie],
            # pre chôdzu (js/mapa/atriaky/): výšky v m nad základňou modelu (zem najnižšieho domu)
            'terasa': TERASA,
            'domy': [{'meno': d['meno'], 'jadro': hra(d['jadro']), 'zem': round(d['dz'], 2), 'podlazie': round(d['hp'], 3),
                      'pocet': d['pocet'], 'vyska': round(d['H'], 2), 'terasa': d['ustup']} for d in domy],
            'lavky': lavky}
    print(len(domy), 'domov,', len(lavky), 'lávok')
    return G, obrysy, 18.0, 'atriaky', info


def lavka(G, M, dom, P, domy):
    """Prepojenie z OSM pôdorysu → lávky v 2. a 3. podlaží (betónová doska, červený pás, biele zábradlie),
    pod nimi voľný prechod. Vráti údaje pre chôdzu (os, šírka, výšky podláh na oboch koncoch)."""
    from shapely.geometry import Point
    obd = P.minimum_rotated_rectangle
    c = list(obd.exterior.coords)[:4]
    s1, s2 = dlzka(c[0], c[1]), dlzka(c[1], c[2])
    if s1 < s2:
        c = c[1:] + c[:1]
        s1, s2 = s2, s1
    # konce = stredy kratších strán; koniec A je pri vlastnom dome
    pa = ((c[0][0] + c[3][0]) / 2, (c[0][1] + c[3][1]) / 2)
    pb = ((c[1][0] + c[2][0]) / 2, (c[1][1] + c[2][1]) / 2)
    JA = Polygon(dom['jadro'])
    if JA.distance(Point(pa)) > JA.distance(Point(pb)):
        pa, pb = pb, pa
    druhy = min((d for d in domy if d is not dom), key=lambda d: Polygon(d['jadro']).distance(Point(pb)))
    if Polygon(druhy['jadro']).distance(Point(pb)) > 4.0 or s1 < 2.5 or s2 < 1.5:
        return None
    # predĺžime až k lícom oboch domov (prepojenie z OSM môže končiť kúsok pred nimi)
    ux, uy = (pb[0] - pa[0]) / (dlzka(pa, pb) or 1), (pb[1] - pa[1]) / (dlzka(pa, pb) or 1)
    pa = (pa[0] - ux * 0.3, pa[1] - uy * 0.3)
    pb = (pb[0] + ux * 0.3, pb[1] + uy * 0.3)
    sirka = min(max(s2, 2.2), 4.0)
    vx, vy = -uy, ux
    w = sirka / 2
    rohy = [(pa[0] + vx * w, pa[1] + vy * w), (pb[0] + vx * w, pb[1] + vy * w), (pb[0] - vx * w, pb[1] - vy * w), (pa[0] - vx * w, pa[1] - vy * w)]
    podlahy = []
    # dolná lávka: prvé podlažie, ktoré je aspoň 3,1 m nad zemou vyššieho z domov (domy stoja na svahu – pod lávkou
    # musí ostať prechod), horná o podlažie vyššie (najvyššie = úroveň terasy); laser tomu zodpovedá (#91)
    zem = max(dom['dz'], druhy['dz'])
    k1 = next((k for k in range(1, dom['pocet']) if dom['dz'] + k * dom['hp'] - zem >= 3.1), None)
    for k in ((k1, k1 + 1) if k1 else ()):
        if k >= dom['pocet']:
            break
        ha = dom['dz'] + k * dom['hp']
        poschodia = [druhy['dz'] + j * druhy['hp'] for j in range(1, druhy['pocet'])]
        hb = min(poschodia, key=lambda h: abs(h - ha)) if poschodia else ha
        if abs(hb - ha) > 1.3:
            hb = ha
        podlahy.append([round(ha, 2), round(hb, 2)])
        # doska (vrch ha → hb), spodok tmavý, bočné čelá tehlovočervené
        def bod(p, z):
            return (p[0], p[1], z)
        za, zb = ha, hb
        top = [bod(rohy[0], za), bod(rohy[1], zb), bod(rohy[2], zb), bod(rohy[3], za)]
        # vrch dosky (obe orientácie – poradie rohov závisí od smeru lávky)
        G.plocha(M['dlazba'], top)
        G.plocha(M['dlazba'], list(reversed(top)))
        spodok = [bod(rohy[0], za - 0.45), bod(rohy[1], zb - 0.45), bod(rohy[2], zb - 0.45), bod(rohy[3], za - 0.45)]
        G.plocha(M['podhlad'], spodok)
        G.plocha(M['podhlad'], list(reversed(spodok)))
        for (p, q) in ((rohy[0], rohy[1]), (rohy[3], rohy[2])):
            zp, zq = za, zb
            pas = [bod(p, zp - 0.5), bod(q, zq - 0.5), bod(q, zq + 0.3), bod(p, zp + 0.3)]
            G.plocha(M['cervena'], pas)
            G.plocha(M['cervena'], list(reversed(pas)))
            # zábradlie nad červeným pásom (šikmé, keď sú konce v inej výške)
            L = dlzka(p, q)
            for v in (0.55, 0.8, 1.05):
                G.tram(M['biele'], (p[0], p[1], zp + v), (q[0], q[1], zq + v), 0.05)
            n = max(1, round(L / 1.6))
            for j in range(n + 1):
                t = j / n
                x, y, z = p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t, zp + (zq - zp) * t
                G.kvader(M['biele'], (x, y), (ux, uy), 0.05, 0.05, z + 0.3, z + 1.05)
    if not podlahy:
        return None
    hra = lambda p: [round(p[0], 2), round(-p[1], 2)]
    return {'domy': [dom['meno'], druhy['meno']], 'os': [hra(pa), hra(pb)], 'sirka': round(sirka, 2),
            'podlahy': podlahy, 'obrys': rohy}


def postav_blok(G, M, b, LZ, stred, rnd, obrysy, kolizie, nahradit):
    """Jeden blok AD-x (AD-I s otvoreným dvorom podľa lasera, ostatné so zastrešeným átriom).
    Vráti údaje domu (jadro, podlažia, prepojenia k susedom) – AD-I a jedáleň bez lávok."""
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
        return None
    jadro, pasy = rozdel(o) if b['meno'] != 'AD-U' else (o, [])
    blok(G, M, jadro, H, rnd)
    obrysy.append(jadro)
    pocet = max(2, round((H - 1.0) / 3.3))
    return {'meno': b['meno'], 'jadro': jadro, 'pasy': pasy, 'H': H, 'pocet': pocet, 'hp': (H - 1.0) / pocet,
            'ustup': pocet >= 3}
