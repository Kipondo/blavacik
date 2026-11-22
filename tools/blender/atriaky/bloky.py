# Átriové domky („Átriaky“, internát UK Mlyny, arch. V. Dedeček) – bloky AD-A … AD-U (issue #72).
#   Pôdorysy z OSM (tools/blender/osm_atriaky.mjs → data/atriaky.json), výšky z laserového skenovania ÚGKK
#   (tools/blender/laser_atriaky.py → data/atriaky-laser.json). Laser ukázal, že átriá väčšiny domov sú
#   zastrešené (zhora je strecha so svetlíkom); otvorený dvor má len AD-I.
#   Vzhľad podľa verejných fotografií: pohľadový betón, mohutné vodorovné parapetné pásy po podlažiach,
#   zapustené pásy okien, ustúpené presklené prízemie na stĺpoch, plochá strecha so zábradlím a svetlíkom nad átriom.
#   Issue #91 (fotky v data/atriaky-fotky.json): najvyššie podlažie je ustúpené – okolo neho pochôdzna terasa
#   s tehlovočerveným pásom a bielym zábradlím. Pôdorysy z OSM obsahujú aj úzke prepojenia so susedným domom –
#   tie sú lávky v 2. a 3. podlaží (pod nimi voľný prechod), nie plná stena. Údaje pre chôdzu (lávky, terasy,
#   kolízie s výškou) idú do assets/pamiatky/atriaky.json, zábradlia a kolízie stavia hra (js/mapa/atriaky/).

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
    # farby podľa prieskumu fotiek (#115, napady/atriaky-izba.md): vymývaný betón panelov, biela omietka za
    # pavlačou, červenooranžové čelá a spodky dosiek, tmavé rámy okien, mozaika na čele strechy 4. podlažia
    return {
        'beton': material('beton-vymyvany', '#b9b5ac', drsnost=0.95),
        'beton_tmavy': material('beton-tmavy', '#8f8a80', drsnost=0.9),
        'omietka': material('omietka-atriaky', '#e4e3df', drsnost=0.9),
        'sklo': sklo('sklo-atriaky', '#2f3a40', drsnost=0.08, kov=0.6),
        'ram': material('detail-ram-atriaky', '#2b2b2b', drsnost=0.5, kov=0.4),
        'strecha': material('strecha-atriaky', '#8e8e8a', drsnost=0.95),
        'svetlik': sklo('sklo-svetlik', '#7f97a3', drsnost=0.05, kov=0.6),
        'zabradlie': material('detail-zabradlie-atriaky', '#7a6a5e', drsnost=0.6, kov=0.5),
        'dvere': material('dvere-atriaky', '#3f3a35', drsnost=0.6),
        'cervena': material('cervena-atriaky', '#c0472b', drsnost=0.8),
        'mozaika': material('mozaika-atriaky', '#9a4a38', drsnost=0.7),
        'biele': material('detail-zabradlie-biele', '#ededed', drsnost=0.4, kov=0.5),
        'dlazba': material('dlazba-terasy', '#a8a49a', drsnost=0.9),
        'podhlad': material('podhlad-atriaky', '#57544f', drsnost=0.95),
        'skara': material('detail-skara-atriaky', '#7e7a72', drsnost=0.95),
    }

TERASA = 2.4   # m – o koľko je najvyššie podlažie ustúpené (terasa okolo neho)
FOTO_VCHODU_T = (-2902, -1795)   # bod fotky vchodu do bloku T (svet hry, #91) – rovnaký ako v js/mapa/atriaky/modul.js


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


PAVLAC = 1.5      # m – hĺbka pavlače (vonkajší ochoz na každom podlaží, prieskum #115: 1,2–2 m)
DOSKA = 0.3       # m – hrúbka stropnej dosky (čelo a spodok červenooranžové)
PARAPET = 1.05    # m – betónové panely zábradlia pavlače


def zadna_stena(G, M, a, b, z0, z1, okno_od, dvere=None, otvor=None):
    """Biela stena za pavlačou na úsečke a→b (líce von): v každom poli ~3,2 m presklené dvere na pavlač a okno
    (ako izby: okno + dvere na pavlač), okolo otvorov ostenie 0,12 m. dvere/otvor = (t0, t1) – voľný otvor
    bez výplne (balkónové dvere izby 314 v bloku T), ktorý nahradí výplň v tom mieste."""
    L = dlzka(a, b)
    if L < 0.2:
        return
    ux, uy = (b[0] - a[0]) / L, (b[1] - a[1]) / L
    nx, ny = normala(a, b)
    hl = 0.12

    def P(t, z, d=0.0):
        return (a[0] + ux * t - nx * d, a[1] + uy * t - ny * d, z)
    vrch = min(z1 - 0.05, z0 + 2.35)
    otv = []
    k = max(1, round(L / 3.2))
    for j in range(k):
        t0 = L * j / k
        w = L / k
        if w > 2.6:
            otv.append((t0 + 0.3, t0 + 1.2, z0, vrch, 'dvere'))
            otv.append((t0 + 1.4, t0 + w - 0.25, z0 + okno_od, vrch, 'okno'))
        elif w > 1.0:
            otv.append((t0 + 0.2, t0 + w - 0.2, z0 + okno_od, vrch, 'okno'))
    if otvor:
        otv = [o for o in otv if o[1] < otvor[0] - 0.15 or o[0] > otvor[1] + 0.15]
        otv.append((otvor[0], otvor[1], z0, z0 + 2.2, 'otvor'))
        otv.sort()
    x = 0.0
    for (t0, t1, oz0, oz1, druh) in otv:
        if t0 > x + 0.001:
            G.plocha(M['omietka'], [P(x, z0), P(t0, z0), P(t0, z1), P(x, z1)])
        if oz0 > z0 + 0.001:
            G.plocha(M['omietka'], [P(t0, z0), P(t1, z0), P(t1, oz0), P(t0, oz0)])
        if oz1 < z1 - 0.001:
            G.plocha(M['omietka'], [P(t0, oz1), P(t1, oz1), P(t1, z1), P(t0, z1)])
        h = 0.3 if druh == 'otvor' else hl
        G.plocha(M['omietka'], [P(t0, oz0), P(t0, oz0, h), P(t0, oz1, h), P(t0, oz1)])
        G.plocha(M['omietka'], [P(t1, oz1), P(t1, oz1, h), P(t1, oz0, h), P(t1, oz0)])
        G.plocha(M['omietka'], [P(t0, oz1), P(t0, oz1, h), P(t1, oz1, h), P(t1, oz1)])
        if druh == 'okno':
            G.plocha(M['omietka'], [P(t1, oz0), P(t1, oz0, h), P(t0, oz0, h), P(t0, oz0)])
        if druh != 'otvor':
            G.plocha(M['sklo'], [P(t0, oz0, h), P(t1, oz0, h), P(t1, oz1, h), P(t0, oz1, h)])
            # tmavé rámy: obvod a priečky (vo farbe rámov, 3 cm pred sklom)
            for tt in [t0 + 0.03, t1 - 0.03] + ([(t0 + t1) / 2] if t1 - t0 > 1.2 else []):
                G.plocha(M['ram'], [P(tt - 0.03, oz0, h - 0.03), P(tt + 0.03, oz0, h - 0.03), P(tt + 0.03, oz1, h - 0.03), P(tt - 0.03, oz1, h - 0.03)])
            for zz in (oz1 - 0.03, oz0 + 0.03) if druh == 'okno' else (oz1 - 0.03,):
                G.plocha(M['ram'], [P(t0, zz - 0.03, h - 0.03), P(t1, zz - 0.03, h - 0.03), P(t1, zz + 0.03, h - 0.03), P(t0, zz + 0.03, h - 0.03)])
        x = t1
    if x < L - 0.001:
        G.plocha(M['omietka'], [P(x, z0), P(L, z0), P(L, z1), P(x, z1)])


def blok(G, M, obrys, H, rnd, dvor=None, otvor_ochoz=None):
    """Jeden átriový dom podľa prieskumu fotiek (#115, napady/atriaky-izba.md):
      – prízemie zapustené o 1,4 m, presklené so stĺpikmi, na stĺpoch;
      – na každom podlaží obvodová pavlač: červenooranžová doska (čelo a spodok), betónové panely zábradlia
        so škárami po 1,2 m, za pavlačou biela stena s oknami a dverami izieb;
      – 4. podlažie ustúpené o TERASA (terasa okolo neho – chodí sa po nej, zábradlie kreslí hra), takmer celé
        presklené, nad ním strecha s presahom a mozaikovým čelom, atika a zábradlie na streche.
    Všetky plochy sa stretávajú na hranách (bez dier) a žiadne dve sa neprekrývajú v jednej rovine (bez blikania).
    otvor_ochoz = (index hrany, t0, t1) – v ustúpenom podlaží voľný otvor na balkónové dvere izby 314 (blok T)."""
    pocet = max(2, round((H - 1.0) / 3.3))
    hp = (H - 1.0) / pocet
    n = len(obrys)
    ustup = pocet >= 3 and not dvor
    # --- prízemie: zapustené o 1,4 m, presklené, stĺpy pod obvodom, spodok prvej dosky červený ---
    vnutro = odsad(obrys, -1.4)
    z_pod = hp - DOSKA
    for i in range(n):
        a, b = vnutro[i], vnutro[(i + 1) % n]
        L = dlzka(a, b)
        if L < 0.3:
            continue
        G.stena(M['sklo'], a, b, -1.0, z_pod)
        ux, uy = (b[0] - a[0]) / L, (b[1] - a[1]) / L
        nx, ny = normala(a, b)
        k = max(1, round(L / 1.8))
        for j in range(k + 1):
            p = (a[0] + ux * L * j / k + nx * 0.06, a[1] + uy * L * j / k + ny * 0.06)
            G.kvader(M['ram'], p, (ux, uy), 0.08, 0.12, -1.0, z_pod)
        if L > 8:
            m = ((a[0] + b[0]) / 2, (a[1] + b[1]) / 2)
            G.kvader(M['dvere'], (m[0] + nx * 0.06, m[1] + ny * 0.06), (ux, uy), 1.8, 0.06, 0.0, 2.3)
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
            G.kvader(M['beton'], p, (ux, uy), 0.5, 0.5, -1.0, z_pod, vrch=False)
    G.vodorovna(M['cervena'], obrys, z_pod, hore=False)

    # --- podlažia s pavlačou ---
    posledne_pavlac = pocet - 2 if ustup else pocet - 1
    for k in range(1, posledne_pavlac + 1):
        z0, z1 = k * hp, (k + 1) * hp
        # doska: čelo a spodok červenooranžové (spodok prvej dosky kryje plocha nad prízemím)
        G.pas(M['cervena'], obrys, z0 - DOSKA, z0 - 0.02, 0.0, dnu=PAVLAC, vrch=False, spodok=k > 1)
        # podlaha pavlače (za panelmi zábradlia)
        G.pas(M['dlazba'], obrys, z0 - 0.02, z0, -0.15, dnu=PAVLAC, spodok=False)
        # betónové panely zábradlia (líce v rovine čela dosky), navrchu biela rúrka, škáry po 1,2 m
        G.pas(M['beton'], obrys, z0 - 0.02, z0 + PARAPET, 0.0, dnu=0.15, spodok=False)
        G.pas(M['biele'], obrys, z0 + PARAPET + 0.04, z0 + PARAPET + 0.1, 0.0, dnu=0.12)
        skary(G, M, obrys, z0, z0 + PARAPET)
        # zadná stena s oknami a dverami (nad ňou spodok vyššej dosky)
        Z = odsad(obrys, -PAVLAC)
        for i in range(n):
            zadna_stena(G, M, Z[i], Z[(i + 1) % n], z0 - 0.02, z1 - DOSKA, okno_od=0.85)

    # --- 4. podlažie ustúpené, terasa okolo neho ---
    if ustup:
        k = pocet - 1
        z0, z1 = k * hp, (k + 1) * hp
        lice = odsad(obrys, -TERASA)
        G.pas(M['cervena'], obrys, z0 - DOSKA, z0 - 0.02, 0.0, dnu=TERASA, vrch=False, spodok=True)
        G.pas(M['dlazba'], obrys, z0 - 0.02, z0, -0.15, dnu=TERASA, spodok=False)
        # nízky betónový sokel na okraji terasy (biele zábradlie s kolíziou nad ním kreslí hra – js/mapa/atriaky/)
        G.pas(M['beton'], obrys, z0 - 0.02, z0 + 0.25, 0.0, dnu=0.15, spodok=False)
        for i in range(n):
            otvor = None
            if otvor_ochoz and otvor_ochoz[0] == i:
                otvor = otvor_ochoz[1:]
            zadna_stena(G, M, lice[i], lice[(i + 1) % n], z0 - 0.02, z1 - DOSKA, okno_od=0.3, otvor=otvor)
        horne_lice, presah = lice, 0.4
    else:
        horne_lice, presah = obrys, 0.0

    # --- strecha: doska s mozaikovým čelom (nad ustúpeným podlažím s presahom), atika, zábradlie, technika ---
    zs = pocet * hp
    dnu_dosky = (PAVLAC if not ustup else 0.0) + presah
    G.pas(M['mozaika'], horne_lice, zs - DOSKA, zs + 0.2, presah, dnu=dnu_dosky, vrch=False, spodok=True)
    okraj = odsad(horne_lice, presah) if presah else horne_lice
    G.pas(M['beton'], okraj, zs + 0.2, zs + 0.75, 0.0, dnu=0.25)
    G.vodorovna(M['strecha'], odsad(okraj, -0.25), zs + 0.25)
    G.pas(M['zabradlie'], odsad(okraj, -0.12), zs + 1.25, zs + 1.31, 0.03, dnu=0.03)
    if dvor:
        return
    # výstup zo schodiska (kocka ~2,5 m) a dva vetracie boxy jadra (výkaz výmer bloku C)
    P = Polygon(horne_lice)
    c = P.centroid
    G.kvader(M['beton'], (c.x, c.y), (1, 0), 2.6, 2.6, zs + 0.25, zs + 2.75)
    for dx in (-4.0, 4.0):
        G.kvader(M['zabradlie'], (c.x + dx, c.y + 2.5), (1, 0), 0.9, 0.9, zs + 0.25, zs + 1.1)


def skary(G, M, obrys, z0, z1, krok=1.2):
    """Zvislé škáry medzi panelmi zábradlia: tmavé pásiky 2 cm, 3 cm pred lícom (materiál „detail“ – zďaleka sa nekreslí)."""
    n = len(obrys)
    for i in range(n):
        a, b = obrys[i], obrys[(i + 1) % n]
        L = dlzka(a, b)
        if L < krok:
            continue
        ux, uy = (b[0] - a[0]) / L, (b[1] - a[1]) / L
        nx, ny = normala(a, b)
        for j in range(1, int(L / krok)):
            t = L * j / int(L / krok)
            p = (a[0] + ux * t + nx * 0.03, a[1] + uy * t + ny * 0.03)
            G.plocha(M['skara'], [(p[0] - ux * 0.01, p[1] - uy * 0.01, z0 + 0.05), (p[0] + ux * 0.01, p[1] + uy * 0.01, z0 + 0.05),
                                  (p[0] + ux * 0.01, p[1] + uy * 0.01, z1 - 0.02), (p[0] - ux * 0.01, p[1] - uy * 0.01, z1 - 0.02)])


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
                      'pocet': d['pocet'], 'vyska': round(d['H'], 2), 'terasa': d['ustup'],
                      # balkónové dvere izby 314 (stred otvoru v líci ustúpeného podlažia, normála von, šírka)
                      **({'ochoz': {'p': hra([d['ochoz']['p']])[0], 'n': [round(d['ochoz']['n'][0], 4), round(-d['ochoz']['n'][1], 4)],
                                    'sirka': d['ochoz']['sirka']}} if d.get('ochoz') else {})} for d in domy],
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
            # biele zábradlie lávky kreslí hra (js/mapa/atriaky/) – s kolíziou
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
    pocet = max(2, round((H - 1.0) / 3.3))
    ochoz = None
    if b['meno'] == 'AD-T' and pocet >= 3:
        # balkónové dvere izby 314 na terasu: v ustúpenom podlaží na strane najbližšej k fotke vchodu (#91),
        # v strede steny – v tom mieste je v stene voľný otvor, za ním izba (tools/blender/atriaky/izba.py)
        foto = (FOTO_VCHODU_T[0] - stred[0], -(FOTO_VCHODU_T[1] - stred[1]))
        lice = odsad(jadro, -TERASA)
        i = min(range(len(jadro)), key=lambda k: dlzka(foto, ((jadro[k][0] + jadro[(k + 1) % len(jadro)][0]) / 2,
                                                                (jadro[k][1] + jadro[(k + 1) % len(jadro)][1]) / 2)))
        a, c = lice[i], lice[(i + 1) % len(lice)]
        L = dlzka(a, c)
        ochoz = {'hrana': i, 'p': ((a[0] + c[0]) / 2, (a[1] + c[1]) / 2), 'n': normala(a, c), 'sirka': 1.0}
    blok(G, M, jadro, H, rnd, otvor_ochoz=(ochoz['hrana'], L / 2 - 0.5, L / 2 + 0.5) if ochoz else None)
    obrysy.append(jadro)
    return {'meno': b['meno'], 'jadro': jadro, 'pasy': pasy, 'H': H, 'pocet': pocet, 'hp': (H - 1.0) / pocet,
            'ustup': pocet >= 3, 'ochoz': ochoz}
