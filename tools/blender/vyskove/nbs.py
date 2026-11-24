# Národná banka Slovenska (Imricha Karvaša 1; Martin Kusý, Pavol Paňák; súťaž 1996, otvorená 23. 5. 2002):
# 33 nadzemných podlaží (6 tvorí podnož), 111,6 m. Prieskum (#126) – napady/pamiatky-podklady.md, časť NBS.
# Výšky sú od terénu pri hlavnom vstupe (146,7 m n. m.; terén klesá k Slovanskej o ~1,7 m), laser ÚGKK:
#   – veža: pôdorys „kvapka“ – oblúk na západ (R 21,8 m, ~120°), dve kolmé rovné steny po 23,5 m a zaoblený
#     východný roh; dvojplášťová sklenená fasáda so strieborným pásom na každom podlaží, strecha ~111 m,
#     nad posledným podlažím presklená atika, nad ňou doska heliportu s prstencom konzol so sieťou, stožiar na JZ,
#   – zaoblený východný roh obložený tmavými lamelami po celej výške, pri ňom presklená šachta výťahov
#     (prečnieva nad strechu),
#   – spodný presklený pás okolo oblúka (OSM 411828059) po ~34,5 m s terasou a von sklonenou sklenenou zástenou,
#   – dve „plecia“ pozdĺž rovných stien (OSM 411828062/065) po ~70 m; ich čelá (5 m) majú tmavé lamely od ~33 m,
#   – podnož: pri vstupe 2 podlažia leštenej portugalskej žuly (#c2bab0) s úzkymi oknami, zaoblená stena
#     a vysoký presklený vstup na rohu Mýtnej a Imricha Karvaša, inde biely obklad; nad kameňom ustúpené
#     presklené podlažie a doska „markízy“ (podhľad ~12 m, kazetový rošt pod 45°), ktorá nad rohom vystrkuje klin
#     (OSM 411828074) – nesú ju štíhle okrúhle stĺpy a dva kamenné pylóny so zástavami SR a EÚ, z ktorých tyče
#     prechádzajú kruhovými otvormi v doske; vyššie krídla podnože 21,4 m, átrium so sklenou strechou,
#   – pred vstupom bronzová minca Biatec (Ľudmila Cvengrošová, 1988; ~3,2 m) na bielom betónovom valci.
# Obrysy z OSM (tools/blender/data/obrysy.json, kľúč „nbs“).

import math

import shapely
from shapely.geometry import Polygon, LineString, Point
from shapely.geometry.polygon import orient

from veze import (Geo, z_hry, stred_obrysu, odsad, dlzka, normala, zavesova_stena, kamenna_fasada, strecha,
                  sklo, svetlo, do_hry, ccw, plocha_obrysu)
from spolocne import material
from vyskove.stavebna_fakulta import napis_rovny
from vyskove.univerzita_komenskeho import otvor

DNO = -2.2                     # spodok stien (terén pod budovou je nižšie ako pri vstupe)
KAMEN = 8.4                    # vrch kamennej časti podnože
DOSKA = (12.0, 12.8)           # podhľad a vrch dosky striešky (strecha 4-podlažnej podnože)
VEZA = [12.8 + 3.386 * k for k in range(30)]   # dosky veže; VEZA[29] = heliport 111,0 m
PAS_TERASA = 34.5              # terasa na spodnom presklenom páse
PLECIA = VEZA[17]              # ~70,4 m (12 podlaží pod strechou veže; laser v dlaždici 77,8 m zachytil aj vežu)
ATIKA = 112.2
HELIPORT = 112.6               # doska heliportu (Ø ~20,5 m) nad atikou, okolo prstenec konzol so sieťou
OBRUC = 113.4
VYTAH = 113.6
HORNE = (12.8, 17.1, 21.4)     # vyššie krídlo podnože (OSM 1278278320): 2 podlažia
ATRIUM = 23.0
SPIC = [-1.5, 2.6, 6.06, 9.52, 12.98, 16.44, 19.9]   # severná špica (OSM 1278278319): 6 podlaží

# body v metroch hry (z OSM)
CF, RF = (544.90, -1075.88), 21.76            # oblúk čela veže
CN, RN = (547.90, -1076.66), 10.32            # zaoblený východný roh
VCHOD = (517.02, -1057.10)                     # hlavný vstup (OSM uzol 4134276201)
PYLONY = [(495.5, -1069.8), (493.4, -1067.1)]   # zástavy: SR (vľavo pri pohľade od Mýtnej), EÚ
BIATEC = (481.7, -1049.4)
OBLUK_PASU = [(521.93, -1092.42), (519.68, -1089.14), (517.94, -1086.05), (516.59, -1081.48), (516.02, -1077.95),
              (515.88, -1074.29), (516.47, -1069.65), (517.96, -1064.72), (520.26, -1060.70), (523.05, -1056.93),
              (527.08, -1053.36), (530.98, -1051.10)]
ZAOBLENA_STENA = [(510.82, -1057.97), (507.77, -1065.57), (506.83, -1074.61), (508.33, -1086.05), (510.94, -1091.98)]
ROH_STRIESKY = (488.12, -1065.06)
SMER_IK = (0.832, 0.554)        # hrana striešky pozdĺž Imricha Karvaša (metre hry)
SMER_MY = (0.646, -0.763)       # hrana striešky pozdĺž Mýtnej


def uhol(c, p):
    return math.atan2(p[1] - c[1], p[0] - c[0])


def oblúk(c, r, a0, a1, krok=1.4):
    n = max(2, round(abs(a1 - a0) * r / krok))
    return [(c[0] + r * math.cos(a0 + (a1 - a0) * i / n), c[1] + r * math.sin(a0 + (a1 - a0) * i / n)) for i in range(n + 1)]


def catmull(body, krok):
    """Hladká otvorená krivka cez body (Catmull–Rom), body po ~krok m."""
    P = [body[0]] + list(body) + [body[-1]]
    out = []
    for i in range(1, len(P) - 2):
        p0, p1, p2, p3 = P[i - 1], P[i], P[i + 1], P[i + 2]
        m = max(1, round(dlzka(p1, p2) / krok))
        for s in range(m):
            t = s / m
            out.append(tuple(0.5 * (2 * p1[k] + (-p0[k] + p2[k]) * t + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * t * t
                                    + (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * t ** 3) for k in range(2)))
    out.append(tuple(body[-1]))
    return out


def jemne(linia, krok):
    """Otvorená lomená čiara s hranami rozdelenými po ~krok m."""
    out = [linia[0]]
    for a, b in zip(linia, linia[1:]):
        k = max(1, round(dlzka(a, b) / krok))
        out += [(a[0] + (b[0] - a[0]) * j / k, a[1] + (b[1] - a[1]) * j / k) for j in range(1, k + 1)]
    return out


def ocisti(body, min_d=0.4):
    out = []
    for p in body:
        if not out or dlzka(out[-1], p) >= min_d:
            out.append(tuple(p))
    if len(out) > 2 and dlzka(out[0], out[-1]) < min_d:
        out.pop()
    return out


def volne_retaze(poly, prekazky, d=0.5):
    """Súvislé úseky hrán CCW obrysu, pred ktorými nestojí iná časť (bod d pred stredom hrany nie je v nej)."""
    P = [Polygon(o) for o in prekazky]
    n = len(poly)
    volna = []
    for i in range(n):
        a, b = poly[i], poly[(i + 1) % n]
        nx, ny = normala(a, b)
        m = Point((a[0] + b[0]) / 2 + nx * d, (a[1] + b[1]) / 2 + ny * d)
        volna.append(not any(p.contains(m) for p in P))
    if all(volna):
        return [list(poly) + [poly[0]]]
    s = next(i for i in range(n) if not volna[i])
    retaze, akt = [], None
    for k in range(1, n + 1):
        i = (s + k) % n
        if volna[i]:
            if akt is None:
                akt = [poly[i]]
            akt.append(poly[(i + 1) % n])
        elif akt:
            retaze.append(akt)
            akt = None
    if akt:
        retaze.append(akt)
    return retaze


def plocha_tri(G, mat, poly, z, hore=True):
    """Vodorovná plocha z mnohouholníka shapely (aj nekonvexného, s otvormi)."""
    geoms = poly.geoms if hasattr(poly, 'geoms') else [poly]
    for g in geoms:
        if g.is_empty or g.area < 0.01:
            continue
        for t in shapely.constrained_delaunay_triangles(g).geoms:
            b = list(t.exterior.coords)[:3]
            k = (b[1][0] - b[0][0]) * (b[2][1] - b[0][1]) - (b[1][1] - b[0][1]) * (b[2][0] - b[0][0])
            if (k < 0) == hore:
                b = [b[0], b[2], b[1]]
            G.plocha(mat, [(p[0], p[1], z) for p in b])


def plocha_von(G, mat, body, smer):
    """Plocha otočená lícom k smeru `smer` (3D)."""
    nx = ny = nz = 0.0
    for i in range(len(body)):
        a, b = body[i], body[(i + 1) % len(body)]
        nx += (a[1] - b[1]) * (a[2] + b[2])
        ny += (a[2] - b[2]) * (a[0] + b[0])
        nz += (a[0] - b[0]) * (a[1] + b[1])
    if nx * smer[0] + ny * smer[1] + nz * smer[2] < 0:
        body = list(reversed(body))
    G.plocha(mat, body)


def materialy():
    return {
        'zula': material('nbs-zula', '#c2bab0', drsnost=0.45),
        'hlinik': material('nbs-hlinik', '#a9b0b6', drsnost=0.4, kov=0.5),
        'biela': material('nbs-obklad-biely', '#e2e1dc', drsnost=0.6),
        'okna': sklo('nbs-okna', '#4f5c62', drsnost=0.08, kov=0.7),
        'ram': material('detail-nbs-ram', '#3c3f42', drsnost=0.5, kov=0.5),
        'sklo': sklo('nbs-sklo', '#a9bcc0', drsnost=0.04, kov=0.9),
        'sklo2': sklo('nbs-sklo-tmavsie', '#94abb1', drsnost=0.04, kov=0.9),
        'sklo_tech': sklo('nbs-sklo-tech', '#6e7c84', drsnost=0.05, kov=0.85),
        'sklo_vytah': sklo('nbs-sklo-vytah', '#c3d6d9', drsnost=0.03, kov=0.75),
        'sklo_lobby': sklo('nbs-sklo-lobby', '#8ea3a8', drsnost=0.03, kov=0.75),
        'pas': material('nbs-pas', '#d3d8db', drsnost=0.35, kov=0.6),
        'stlpik': material('detail-nbs-stlpik', '#c0c6c8', drsnost=0.35, kov=0.6),
        'lamela': material('nbs-lamela', '#3d4044', drsnost=0.7, kov=0.15),
        'lamela_t': material('nbs-lamela-tmava', '#232528', drsnost=0.8, kov=0.1),
        'doska': material('nbs-doska', '#cfcfcb', drsnost=0.6),
        'kazety': material('nbs-kazety', '#3f3a36', drsnost=0.8),
        'rebra': material('nbs-rebra', '#9a9893', drsnost=0.7),
        'stlp': material('nbs-stlp', '#d6d5d0', drsnost=0.5),
        'strecha': material('nbs-strecha', '#8d8b86', drsnost=0.95),
        'ocel': material('nbs-ocel', '#9fa4a6', drsnost=0.4, kov=0.7),
        'cervene': svetlo('svetlo-cervene', '#ff2a1a', 6.0),
        'bronz': material('nbs-bronz', '#5b5340', drsnost=0.5, kov=0.6),
        'bronz_l': material('nbs-bronz-lesk', '#9c8458', drsnost=0.35, kov=0.8),
        'beton': material('nbs-beton', '#e3e1dc', drsnost=0.8),
        'doska_soch': material('nbs-doska-sochy', '#c9c7c1', drsnost=0.85),
        'vl_biela': material('nbs-vlajka-biela', '#f2f2ef', drsnost=0.8),
        'vl_modra': material('nbs-vlajka-modra', '#0b4ea2', drsnost=0.8),
        'vl_cervena': material('nbs-vlajka-cervena', '#ee1c25', drsnost=0.8),
        'eu_modra': material('nbs-vlajka-eu', '#003399', drsnost=0.8),
        'eu_zlta': material('nbs-vlajka-zlta', '#ffcc00', drsnost=0.6),
    }


# --- podnož -----------------------------------------------------------------------

def stena_s_oknami(G, M, a, b, mat, podlazia, os_okna=2.2, sir=0.95):
    """Kamenná stena nad úsečkou a→b s úzkymi zapustenými oknami: podlazia = [(z0, z1, okno_od, okno_do)]."""
    L = dlzka(a, b)
    ux, uy = (b[0] - a[0]) / L, (b[1] - a[1]) / L
    nx, ny = normala(a, b)

    def P(t, z, d=0.0):
        return (a[0] + ux * t - nx * d, a[1] + uy * t - ny * d, z)
    k = int((L + 0.3) // os_okna)
    if k and (L - k * os_okna) / 2 + os_okna / 2 - sir / 2 < 0.3:
        k -= 1
    for z0, z1, o0, o1 in podlazia:
        if o0 is None or k < 1:
            G.plocha(mat, [P(0, z0), P(L, z0), P(L, z1), P(0, z1)])
            continue
        x = 0.0
        for j in range(k):
            t = (L - k * os_okna) / 2 + os_okna * (j + 0.5)
            t0, t1 = t - sir / 2, t + sir / 2
            G.plocha(mat, [P(x, z0), P(t0, z0), P(t0, z1), P(x, z1)])
            G.plocha(mat, [P(t0, z0), P(t1, z0), P(t1, o0), P(t0, o0)])
            G.plocha(mat, [P(t0, o1), P(t1, o1), P(t1, z1), P(t0, z1)])
            otvor(G, mat, M['okna'], P, t0, t1, o0, o1, 0.22, M['ram'], (1, 2))
            x = t1
        G.plocha(mat, [P(x, z0), P(L, z0), P(L, z1), P(x, z1)])


def podnoz(G, M, pod, spic, strieska, vchod):
    """Kamenná časť (žula pod strieškou, inde biely obklad), presklený vstup a ustúpené presklené podlažie."""
    P_str = Polygon(strieska).buffer(0.3)
    zula = [(DNO, 0.0, None, None), (0.0, 4.6, 0.8, 3.6), (4.6, KAMEN, 5.2, 7.2)]
    biela = [(DNO, 0.0, None, None), (0.0, 3.2, 0.7, 2.7), (3.2, 5.8, 3.9, 5.3), (5.8, KAMEN, 6.5, 7.9)]
    retaze = volne_retaze(pod, [spic])
    for r in retaze:
        for a, b in zip(r, r[1:]):
            if dlzka(a, b) < 0.05:
                continue
            nx, ny = normala(a, b)
            m = ((a[0] + b[0]) / 2, (a[1] + b[1]) / 2)
            if dlzka(m, vchod) < 4.5:
                # vysoký presklený vstup (zárez ~7 m)
                A, B = (a[0] - nx * 0.3, a[1] - ny * 0.3), (b[0] - nx * 0.3, b[1] - ny * 0.3)
                zavesova_stena(G, jemne([A, B], 1.2), [0.0, 4.6, KAMEN], sklo=M['sklo_lobby'], ram=M['stlpik'],
                               vnor=0.05, stlpik=0.08, priecka=0.12, uzavreta=False, naklon=0.0)
                G.stena(M['zula'], a, b, DNO, 0.0)
                G.plocha(M['zula'], [(A[0], A[1], KAMEN), (B[0], B[1], KAMEN), (b[0], b[1], KAMEN), (a[0], a[1], KAMEN)])
                continue
            pod_strieskou = P_str.contains(Point(m[0] + nx * 1.0, m[1] + ny * 1.0))
            stena_s_oknami(G, M, a, b, M['zula'] if pod_strieskou else M['biela'], zula if pod_strieskou else biela,
                           os_okna=2.6 if pod_strieskou else 2.2)
    # ríms kamennej časti (ústupok pred presklením) a ustúpené presklené podlažie
    plocha_tri(G, M['strecha'], Polygon(pod), KAMEN)
    for r in retaze:
        linia = jemne(odsad(r, -1.8, uzavreta=False), 1.45)
        zavesova_stena(G, linia, [KAMEN, DOSKA[0]], sklo=M['sklo_lobby'], ram=M['stlpik'], vnor=0.08, stlpik=0.07,
                       priecka=0.1, parapet=0.0, uzavreta=False, naklon=0.002, seed=3)
        # štíhle okrúhle stĺpy pred presklením (na kamennej stene)
        stlpy = odsad(r, -0.6, uzavreta=False)
        dl = sum(dlzka(p, q) for p, q in zip(stlpy, stlpy[1:]))
        t, ciel = 0.0, 3.0
        for p, q in zip(stlpy, stlpy[1:]):
            L = dlzka(p, q)
            while ciel <= t + L and ciel < dl - 2.0:
                f = (ciel - t) / L
                G.valec(M['stlp'], (p[0] + (q[0] - p[0]) * f, p[1] + (q[1] - p[1]) * f), 0.2, KAMEN, DOSKA[0], seg=10, vrch=False)
                ciel += 6.5
            t += L
    return retaze


def strieska_doska(G, M, hlavna, spic, pod, pylony, stlpy_vysoke):
    """Doska striešky nad celou 4-podlažnou podnožou: kazetový podhľad, okraj, kruhové otvory pre pylóny."""
    S = Polygon(hlavna).difference(Polygon(spic).buffer(0.05))
    otvory = [Point(p).buffer(1.65, 24) for p in pylony]
    for o in otvory:
        S = S.difference(o)
    S = orient(S if S.geom_type == 'Polygon' else max(S.geoms, key=lambda g: g.area), 1.0)
    plocha_tri(G, M['strecha'], S, DOSKA[1])
    vonku = S.difference(Polygon(pod).buffer(-1.8, join_style=2))
    plocha_tri(G, M['kazety'], vonku, DOSKA[0], hore=False)
    for kruh in [S.exterior] + list(S.interiors):
        b = list(kruh.coords)
        mat = M['doska'] if kruh is S.exterior else M['beton']
        for p, q in zip(b, b[1:]):
            G.stena(mat, p, q, DOSKA[0], DOSKA[1])
    # kazetový rošt ~2,2 m (rebrá svetlejšie, kazety tmavé)
    c45 = math.sqrt(0.5)
    u = (c45 * (SMER_IK[0] + SMER_IK[1]), c45 * (SMER_IK[1] - SMER_IK[0]))   # kosoštvorce pod 45° k hrane
    u = (u[0], -u[1])
    v = -u[1], u[0]
    rebra = vonku.buffer(-0.15)
    for (ex, ey), (fx, fy) in ((u, v), (v, u)):
        rozsah = [x * fx + y * fy for x, y in S.exterior.coords]
        s = min(rozsah) + 1.1
        while s < max(rozsah):
            c = (fx * s, fy * s)
            ciara = LineString([(c[0] - ex * 400, c[1] - ey * 400), (c[0] + ex * 400, c[1] + ey * 400)])
            prienik = rebra.intersection(ciara)
            for kus in getattr(prienik, 'geoms', [prienik]):
                if kus.geom_type != 'LineString' or kus.length < 0.4:
                    continue
                (ax, ay), (bx, by) = kus.coords[0], kus.coords[-1]
                w = 0.1
                a1, b1 = (ax + fx * w, ay + fy * w), (bx + fx * w, by + fy * w)
                a2, b2 = (ax - fx * w, ay - fy * w), (bx - fx * w, by - fy * w)
                z0, z1 = DOSKA[0] - 0.42, DOSKA[0]
                plocha_von(G, M['rebra'], [(a1[0], a1[1], z0), (b1[0], b1[1], z0), (b1[0], b1[1], z1), (a1[0], a1[1], z1)], (fx, fy, 0))
                plocha_von(G, M['rebra'], [(a2[0], a2[1], z0), (b2[0], b2[1], z0), (b2[0], b2[1], z1), (a2[0], a2[1], z1)], (-fx, -fy, 0))
                plocha_von(G, M['rebra'], [(a1[0], a1[1], z0), (b1[0], b1[1], z0), (b2[0], b2[1], z0), (a2[0], a2[1], z0)], (0, 0, -1))
            s += 2.2
    # okolo kruhových otvorov biely „tanier“ v podhľade (cez otvor vidno oblohu)
    for p in pylony:
        for i in range(24):
            a0, a1 = 2 * math.pi * i / 24, 2 * math.pi * (i + 1) / 24
            q = lambda r, a: (p[0] + r * math.cos(a), p[1] + r * math.sin(a), DOSKA[0] - 0.03)
            plocha_von(G, M['beton'], [q(1.65, a0), q(2.4, a0), q(2.4, a1), q(1.65, a1)], (0, 0, -1))
    # vysoké stĺpy od terénu pod klinom striešky
    for c in stlpy_vysoke:
        G.valec(M['stlp'], c, 0.23, -0.3, DOSKA[0], seg=12, vrch=False)
    return S


def pylony_a_zastavy(G, M, pylony, n_zastav):
    """Dva kamenné pylóny (0,85 m) cez otvory v strieške a zvislé zástavy SR a EÚ (1,4 × 4 m, vrch ~9,6 m)."""
    nx, ny = n_zastav
    ux, uy = -ny, nx
    for idx, c in enumerate(pylony):
        G.kvader(M['zula'], c, (ux, uy), 0.85, 0.85, -0.3, 10.5)
        G.valec(M['ocel'], c, 0.1, 10.5, DOSKA[1] + 0.9, seg=8, r1=0.06)
        d0 = 0.425 + 0.25
        o = (c[0] + nx * d0, c[1] + ny * d0)

        def Q(s, t, d=0.0):
            return (o[0] + ux * s + nx * d, o[1] + uy * s + ny * d, t)
        for s in (-0.5, 0.5):
            G.tram(M['ocel'], (c[0] + ux * s + nx * 0.42, c[1] + uy * s + ny * 0.42, 9.7), Q(s, 9.7), 0.06)
        G.tram(M['ocel'], Q(-0.75, 9.68), Q(0.75, 9.68), 0.05)
        pruhy = [(-0.7, -0.233, M['vl_biela']), (-0.233, 0.233, M['vl_modra']), (0.233, 0.7, M['vl_cervena'])] if idx == 0 \
            else [(-0.7, 0.7, M['eu_modra'])]
        for s0, s1, mat in pruhy:
            plocha_von(G, mat, [Q(s0, 5.6), Q(s1, 5.6), Q(s1, 9.6), Q(s0, 9.6)], (nx, ny, 0))
            plocha_von(G, mat, [Q(s0, 5.6, -0.01), Q(s1, 5.6, -0.01), Q(s1, 9.6, -0.01), Q(s0, 9.6, -0.01)], (-nx, -ny, 0))
        if idx == 0:
            # štátny znak: červený štít, biely dvojkríž, modré trojvršie
            t0 = 8.95
            stit = [(-0.33, 0), (0.33, 0), (0.33, -0.58), (0.24, -0.8), (0, -0.98), (-0.24, -0.8), (-0.33, -0.58)]
            vrsky = [(-0.31, -0.62), (-0.18, -0.5), (-0.09, -0.59), (0, -0.46), (0.09, -0.59), (0.18, -0.5), (0.31, -0.62),
                     (0.24, -0.8), (0, -0.98), (-0.24, -0.8)]
            kriz = [[(-0.035, -0.47), (0.035, -0.47), (0.035, -0.07), (-0.035, -0.07)],
                    [(-0.15, -0.2), (0.15, -0.2), (0.15, -0.14), (-0.15, -0.14)],
                    [(-0.21, -0.35), (0.21, -0.35), (0.21, -0.28), (-0.21, -0.28)]]
            for strana in (1, -1):
                for body, mat, d in [(stit, M['vl_cervena'], 0.012), (vrsky, M['vl_modra'], 0.02)] + [(k, M['vl_biela'], 0.02) for k in kriz]:
                    poly = Polygon(body)
                    for t in shapely.constrained_delaunay_triangles(poly).geoms:
                        b = list(t.exterior.coords)[:3]
                        plocha_von(G, mat, [Q(s, t0 + tt, strana * d - (0.01 if strana < 0 else 0)) for s, tt in b], (strana * nx, strana * ny, 0))
        else:
            # 12 žltých hviezd v kruhu
            for strana in (1, -1):
                for k in range(12):
                    a = 2 * math.pi * k / 12
                    cs, ct = 0.44 * math.cos(a), 7.75 + 0.44 * math.sin(a)
                    hv = [(cs + (0.075 if j % 2 == 0 else 0.03) * math.cos(math.pi / 2 + j * math.pi / 5),
                           ct + (0.075 if j % 2 == 0 else 0.03) * math.sin(math.pi / 2 + j * math.pi / 5)) for j in range(10)]
                    d = strana * 0.012 - (0.01 if strana < 0 else 0)
                    for j in range(10):
                        p, q = hv[j], hv[(j + 1) % 10]
                        plocha_von(G, M['eu_zlta'], [Q(cs, ct, d), Q(p[0], p[1], d), Q(q[0], q[1], d)], (strana * nx, strana * ny, 0))


def biatec(G, M, c, n):
    """Bronzová minca Biatec (~3,2 m) na trojbokej nôžke, bielom betónovom valci a štvorcovej doske;
    na líci reliéf jazdca na koni a nápis BIATEC (líce otočené k ulici)."""
    nx, ny = n
    ux, uy = -ny, nx
    G.kvader(M['doska_soch'], c, (ux, uy), 1.8, 1.8, -0.5, 0.15)
    G.valec(M['beton'], c, 0.5, 0.15, 0.45, seg=16)
    R, h, zc = 1.6, 0.26, 2.35

    def Q(s, t, d):
        return (c[0] + ux * s + nx * d, c[1] + uy * s + ny * d, zc + t)
    for k in range(3):
        a = 2 * math.pi * k / 3
        G.tram(M['bronz'], (c[0] + 0.25 * math.cos(a), c[1] + 0.25 * math.sin(a), 0.45), Q(0, -R + 0.15, 0), 0.09)
    seg = 36
    kruh = [(R * math.cos(2 * math.pi * i / seg), R * math.sin(2 * math.pi * i / seg)) for i in range(seg)]
    plocha_von(G, M['bronz'], [Q(s, t, h / 2) for s, t in kruh], (nx, ny, 0))
    plocha_von(G, M['bronz'], [Q(s, t, -h / 2) for s, t in kruh], (-nx, -ny, 0))
    for i in range(seg):
        (s0, t0), (s1, t1) = kruh[i], kruh[(i + 1) % seg]
        sm = ((s0 + s1) / 2, (t0 + t1) / 2)
        plocha_von(G, M['bronz_l'], [Q(s0, t0, h / 2), Q(s1, t1, h / 2), Q(s1, t1, -h / 2), Q(s0, t0, -h / 2)],
                   (ux * sm[0] + nx * 0, uy * sm[0], sm[1]))
    # zvýšený okraj na oboch stranách
    for strana in (1, -1):
        d0, d1 = strana * h / 2, strana * (h / 2 + 0.06)
        for i in range(seg):
            (s0, t0), (s1, t1) = kruh[i], kruh[(i + 1) % seg]
            r1 = 0.9
            plocha_von(G, M['bronz_l'], [Q(s0 * r1, t0 * r1, d1), Q(s1 * r1, t1 * r1, d1), Q(s1, t1, d1), Q(s0, t0, d1)],
                       (strana * nx, strana * ny, 0))
            plocha_von(G, M['bronz'], [Q(s0 * r1, t0 * r1, d0), Q(s1 * r1, t1 * r1, d0), Q(s1 * r1, t1 * r1, d1), Q(s0 * r1, t0 * r1, d1)],
                       (-ux * (s0 + s1), -uy * (s0 + s1), -(t0 + t1)))
    # reliéf: cválajúci kôň s jazdcom (s ratolesťou) – zjednodušená silueta
    silueta = [
        # hlava a krk koňa (hľadí doľava), hrudník a predné nohy
        (-1.00, 0.42), (-0.95, 0.33), (-0.72, 0.30), (-0.52, 0.10), (-0.50, -0.08),
        (-0.72, -0.12), (-0.88, -0.28), (-0.84, -0.34), (-0.66, -0.22), (-0.45, -0.20),
        (-0.38, -0.25), (-0.42, -0.52), (-0.50, -0.66), (-0.42, -0.70), (-0.30, -0.52), (-0.25, -0.25),
        # brucho, zadné nohy v cvale, chvost a zadok
        (0.05, -0.24), (0.35, -0.22), (0.48, -0.25), (0.70, -0.42), (0.92, -0.50), (0.95, -0.42), (0.75, -0.30),
        (0.66, -0.12), (0.70, 0.02), (0.88, 0.05), (1.05, -0.12), (1.02, 0.02), (0.85, 0.16), (0.66, 0.20),
        (0.40, 0.22),
        # jazdec: chrbát, hlava s vencom, ruka s ratolesťou
        (0.20, 0.24), (0.22, 0.50), (0.15, 0.72), (0.12, 0.80), (0.16, 0.92), (0.08, 1.02), (-0.02, 1.00),
        (-0.06, 0.90), (-0.02, 0.82), (-0.04, 0.74), (-0.30, 0.86), (-0.40, 0.92), (-0.44, 1.12), (-0.36, 1.18),
        (-0.34, 0.90), (-0.08, 0.64), (-0.08, 0.50), (-0.18, 0.30),
        # kohútik a hriva
        (-0.30, 0.30), (-0.52, 0.48), (-0.70, 0.60), (-0.72, 0.72), (-0.78, 0.62), (-0.88, 0.55)]
    poly = Polygon([(s, t + 0.12) for s, t in silueta]).buffer(0)
    if poly.geom_type != 'Polygon':
        poly = max(poly.geoms, key=lambda g: g.area)
    poly = orient(poly, 1.0)
    d0, d1 = h / 2, h / 2 + 0.08
    for t in shapely.constrained_delaunay_triangles(poly).geoms:
        plocha_von(G, M['bronz_l'], [Q(s, tt, d1) for s, tt in list(t.exterior.coords)[:3]], (nx, ny, 0))
    b = list(poly.exterior.coords)
    for (s0, t0), (s1, t1) in zip(b, b[1:]):
        von = (t1 - t0, -(s1 - s0))
        plocha_von(G, M['bronz'], [Q(s0, t0, d0), Q(s1, t1, d0), Q(s1, t1, d1), Q(s0, t0, d1)],
                   (ux * von[0], uy * von[0], von[1]))
    stred_lica = (c[0] + nx * h / 2, c[1] + ny * h / 2)
    napis_rovny(G, M['bronz_l'], 'BIATEC', stred_lica, (ux, uy), (nx, ny), zc - 1.33, 0.24, hlbka=0.05)


# --- veža -------------------------------------------------------------------------

def lamely(G, M, linia, z0, z1, krok=0.6, vyska=0.32, von=0.1):
    """Tmavé vodorovné kovové lamely pred tmavou stenou (otvorená lomená čiara, líce vpravo)."""
    for a, b in zip(linia, linia[1:]):
        G.stena(M['lamela_t'], a, b, z0, z1)
    O = odsad(linia, von, uzavreta=False)
    z = z0 + krok / 2
    while z + vyska / 2 < z1:
        for a, b in zip(O, O[1:]):
            G.stena(M['lamela'], a, b, z - vyska / 2, z + vyska / 2)
        z += krok


def sklenena_fasada(G, M, r, urovne, seed, top_tech=None, krok=1.4):
    """Dvojplášťová sklenená fasáda: sklo v module ~krok m, strieborný pás na každom podlaží
    (pás ide po hrubej lomenej čiare r – rovné úseky jedným kusom)."""
    def vyber(i, k, rnd):
        if top_tech is not None and k == top_tech:
            return M['sklo_tech']
        return M['sklo2'] if rnd.random() < 0.12 else M['sklo']
    zavesova_stena(G, jemne(r, krok), urovne, sklo=vyber, ram=M['stlpik'], vnor=0.12, stlpik=0.06, priecka=0.05,
                   priecky=False, uzavreta=False, naklon=0.003, seed=seed, segment_stlpika=6)
    for z in urovne[1:-1] if top_tech is None else urovne[1:]:
        G.pas(M['pas'], r, z - 0.16, z + 0.16, von=0.28, dnu=0.0, spodok=False, uzavreta=False)


def typove_retaze(body, typy):
    """Uzavretý obrys v metroch Blendera s typom každej hrany → CCW a súvislé úseky rovnakého typu."""
    n = len(body)
    if plocha_obrysu(body) < 0:
        body = body[::-1]
        typy = [typy[(n - 2 - i) % n] for i in range(n)]
    s = next(i for i in range(n) if typy[i] != typy[i - 1])
    retaze = []
    for k in range(n):
        i = (s + k) % n
        if not retaze or typy[i] != retaze[-1][0]:
            retaze.append((typy[i], [body[i]]))
        retaze[-1][1].append(body[(i + 1) % n])
    return body, retaze


def veza(G, M, B):
    """Hlavné teleso veže (kvapka), lamelový východný roh, šachta výťahov, koruna s heliportom."""
    A, Bb = (538.35, -1054.84), (530.00, -1092.19)
    P1, P2, P3 = (549.90, -1079.64), (552.54, -1083.75), (553.48, -1085.29)
    N1, N2 = (557.01, -1081.24), (556.63, -1071.16)
    K1, K2 = (555.17, -1071.95), (550.91, -1074.57)
    celo = oblúk(CF, RF, uhol(CF, A), uhol(CF, Bb) + 2 * math.pi)
    vyt = oblúk(CN, RN, uhol(CN, P3), uhol(CN, N1), 1.2)
    roh = oblúk(CN, RN, uhol(CN, N1), uhol(CN, N2), 1.2)
    body, typy = [], []
    for p in celo[:-1]:
        body.append(p); typy.append('sklo')
    body += [celo[-1], P1, P2]; typy += ['sklo', 'sklo', 'vytah']
    for p in vyt[:-1]:
        body.append(p); typy.append('vytah')
    for p in roh[:-1]:
        body.append(p); typy.append('lamely')
    body += [roh[-1], K1, K2]; typy += ['sklo', 'sklo', 'sklo']
    obrys, retaze = typove_retaze([B(p) for p in body], typy)
    for typ, r in retaze:
        if typ == 'sklo':
            sklenena_fasada(G, M, r, VEZA + [ATIKA], seed=11, top_tech=28)
        elif typ == 'lamely':
            lamely(G, M, r, VEZA[0], ATIKA + 1.0)
            G.pas(M['pas'], r, ATIKA + 1.0, ATIKA + 1.3, von=0.2, dnu=0.3, uzavreta=False)
        else:
            # presklená šachta výťahov – číre sklo len so zvislými stĺpikmi, prečnieva nad strechu
            zavesova_stena(G, jemne(r, 1.0), [VEZA[0], VYTAH], sklo=M['sklo_vytah'], ram=M['stlpik'], vnor=0.08,
                           stlpik=0.07, priecky=False, uzavreta=False, naklon=0.0, segment_stlpika=1)
            vnut = odsad(r, -2.4, uzavreta=False)
            for a, b in zip(vnut[::-1], vnut[::-1][1:]):
                G.stena(M['sklo_tech'], a, b, VEZA[29], VYTAH)
            plocha_tri(G, M['strecha'], Polygon(list(r) + vnut[::-1]).buffer(0), VYTAH)
    T = Polygon(obrys)
    plocha_tri(G, M['strecha'], T, VEZA[29])
    # heliport nad oblou časťou: doska Ø ~20,5 m na stĺpikoch, okolo prstenec 20 tmavých konzol so sieťou a rúrou
    rc = B((CF[0] - 7.9, CF[1]))
    G.valec(M['doska'], rc, 10.25, HELIPORT - 0.35, HELIPORT, seg=40)
    for i in range(8):
        a = 2 * math.pi * i / 8
        G.valec(M['ocel'], (rc[0] + 7.0 * math.cos(a), rc[1] + 7.0 * math.sin(a)), 0.18, VEZA[29], HELIPORT - 0.35, seg=6, vrch=False)
    kruh = [(rc[0] + 13.8 * math.cos(2 * math.pi * i / 48), rc[1] + 13.8 * math.sin(2 * math.pi * i / 48)) for i in range(48)]
    G.pas(M['ocel'], kruh, OBRUC - 0.15, OBRUC + 0.15, von=0.15, dnu=0.15)
    for i in range(20):
        a = 2 * math.pi * i / 20
        G.tram(M['lamela'], (rc[0] + 10.2 * math.cos(a), rc[1] + 10.2 * math.sin(a), HELIPORT - 0.2),
               (rc[0] + 13.8 * math.cos(a), rc[1] + 13.8 * math.sin(a), OBRUC), 0.2)
    # tenký stožiar (bleskozvod) na JZ
    s = B((CF[0] - 12.7, CF[1] + 12.7))
    G.valec(M['ocel'], s, 0.12, VEZA[29], 118.5, seg=6, r1=0.05)
    G.kvader(M['cervene'], s, (1, 0), 0.3, 0.3, 118.5, 118.8)
    return obrys


def spodny_pas(G, M, B, T):
    """Presklený pás okolo oblúka (10 podlaží) s terasou a von sklonenou sklenenou zástenou."""
    vonk = catmull(OBLUK_PASU, 1.4)
    a_j, a_s = uhol(CF, (534.77, -1057.14)), uhol(CF, (527.75, -1088.83))
    vnut = oblúk(CF, RF - 0.05, a_j, a_s)
    poly = ccw([B(p) for p in vonk + vnut])
    for r in volne_retaze(poly, [T]):
        linia = jemne(r, 1.4)
        sklenena_fasada(G, M, r, VEZA[:7], seed=21)
        G.pas(M['pas'], linia, VEZA[6], PAS_TERASA, von=0.3, dnu=0.0, uzavreta=False)
        # zástena: sklenené tabule sklonené von na oceľových konzolách
        O = odsad(linia, 0.3, uzavreta=False)
        V = odsad(linia, 1.2, uzavreta=False)
        for a, b, c, d in zip(O, O[1:], V, V[1:]):
            plocha_von(G, M['sklo_vytah'], [(a[0], a[1], PAS_TERASA), (b[0], b[1], PAS_TERASA),
                                            (d[0], d[1], PAS_TERASA + 2.2), (c[0], c[1], PAS_TERASA + 2.2)],
                       (b[1] - a[1], -(b[0] - a[0]), 0.3))
        for i in range(0, len(O), 1):
            G.tram(M['ocel'], (O[i][0], O[i][1], PAS_TERASA - 0.6), (V[i][0], V[i][1], PAS_TERASA + 2.25), 0.07)
    plocha_tri(G, M['strecha'], Polygon(poly).buffer(0), PAS_TERASA)
    return poly


def plecia(G, M, B, T):
    """Dve plecia pozdĺž rovných stien veže (~77 m): sklo, čelá s tmavými lamelami, tenké zábradlie navrchu."""
    out = []
    for cast in PLECIA_OSM:
        poly = ccw([B(p) for p in cast])
        for r in volne_retaze(poly, [T]):
            for a, b in zip(r, r[1:]):
                L = dlzka(a, b)
                if L > 8:
                    sklenena_fasada(G, M, [a, b], VEZA[:20], seed=31)
                else:
                    zavesova_stena(G, jemne([a, b], 1.25), VEZA[:7], sklo=M['hlinik'], ram=M['stlpik'], vnor=0.05,
                                   stlpik=0.05, priecka=0.05, uzavreta=False, naklon=0.0)
                    lamely(G, M, [a, b], VEZA[6], PLECIA + 0.6)
            for a, b in zip(r, r[1:]):
                G.stena(M['sklo_vytah'], a, b, PLECIA, PLECIA + 1.0)
        plocha_tri(G, M['strecha'], Polygon(poly), PLECIA)
        out.append(poly)
    return out


PLECIA_OSM = [
    [(549.90, -1079.64), (552.54, -1083.75), (532.83, -1096.48), (530.00, -1092.19)],
    [(555.17, -1071.95), (542.60, -1052.11), (538.35, -1054.84), (550.91, -1074.57)],
]


# --- celok --------------------------------------------------------------------------

def postav(obrysy):
    data = obrysy['nbs']
    hlavne = data['hlavne'][0]['body']
    st = stred_obrysu(hlavne)

    def B(p):
        return (p[0] - st[0], -(p[1] - st[1]))
    casti = {c['id']: c['body'] for c in data['casti']}
    M = materialy()
    G = Geo()

    hlavna = ccw([B(p) for p in ocisti(hlavne)])
    spic = ccw([B(p) for p in ocisti(casti['1278278319'])])
    strieska = ccw([B(p) for p in ocisti(casti['411828074'])])
    # podnož: zaoblená stena pri vstupe vyhladená
    pod_hra = ocisti(casti['411828068'])
    n = len(pod_hra)
    idx = [min(range(n), key=lambda i: dlzka(pod_hra[i], p)) for p in ZAOBLENA_STENA]
    if (idx[1] - idx[0]) % n == 1:
        retaz, s, e = ZAOBLENA_STENA, idx[0], idx[-1]
    else:
        retaz, s, e = ZAOBLENA_STENA[::-1], idx[-1], idx[0]
    rot = pod_hra[s:] + pod_hra[:s]
    pod_hra = catmull(retaz, 2.4)[:-1] + rot[(e - s) % n:]
    pod = ccw([B(p) for p in ocisti(pod_hra, 0.3)])

    podnoz(G, M, pod, spic, strieska, B(VCHOD))
    stlpy_vysoke = [B((514.2, -1050.0))]   # jediný dlhý stĺp od terénu – pri rohu podnože južne od vstupu
    pyl = [B(p) for p in PYLONY]
    S = strieska_doska(G, M, hlavna, spic, pod, pyl, stlpy_vysoke)
    # zástavy hľadia k Mýtnej (azimut ~310°)
    az = math.radians(310)
    pylony_a_zastavy(G, M, pyl, (math.sin(az), math.cos(az)))

    # severná špica (6 podlaží, biela) a vyššie krídlo podnože s átriom
    for r in volne_retaze(spic, [pod, ccw([B(p) for p in casti['1278278320']])]):
        for a, b in zip(r, r[1:]):
            stena_s_oknami(G, M, a, b, M['biela'],
                           [(DNO, SPIC[0], None, None)] + [(SPIC[k], SPIC[k + 1], SPIC[k] + (0.6 if k == 0 else 0.9),
                                                            SPIC[k + 1] - (0.8 if k == 0 else 0.6)) for k in range(6)])
    strecha(G, spic, SPIC[-1], M['strecha'], M['biela'], atika=0.8)
    horne = ccw([B(p) for p in ocisti(casti['1278278320'])])
    kamenna_fasada(G, horne, list(HORNE), kamen=M['biela'], sklo=M['okna'], ram=M['ram'], parapet=1.1, preklad=0.6)
    strecha(G, horne, HORNE[-1], M['strecha'], M['biela'], atika=0.6)
    atr = ccw([B(p) for p in ocisti(casti['1278278316'])])
    G.hranol(M['sklo_lobby'], odsad(atr, -2.0), HORNE[-1], ATRIUM, vrch=False)
    plocha_tri(G, M['sklo_vytah'], Polygon(odsad(atr, -2.0)), ATRIUM)
    vnut = odsad(atr, -2.0)
    for k in range(len(vnut)):
        G.pas(M['stlpik'], [vnut[k], vnut[(k + 1) % len(vnut)]], ATRIUM, ATRIUM + 0.12, von=0.1, dnu=0.1, uzavreta=False)

    T = veza(G, M, B)
    pas = spodny_pas(G, M, B, Polygon(T))
    pl = plecia(G, M, B, Polygon(T))

    biatec(G, M, B(BIATEC), (math.sin(math.radians(225)), math.cos(math.radians(225))))

    # pôdorysy pre hru: kolízie len pre pevnú podnož, pylóny, stĺpy a sochu (pod strieškou sa dá prejsť)
    zem = Polygon(pod).union(Polygon(spic))
    zem = zem if zem.geom_type == 'Polygon' else max(zem.geoms, key=lambda g: g.area)
    kolizie = [do_hry(list(orient(zem, 1.0).exterior.coords)[:-1])]
    stvorec = lambda c, s: [(c[0] - s, c[1] - s), (c[0] + s, c[1] - s), (c[0] + s, c[1] + s), (c[0] - s, c[1] + s)]
    kolizie += [do_hry(stvorec(c, 0.45)) for c in pyl] + [do_hry(stvorec(c, 0.3)) for c in stlpy_vysoke]
    b = B(BIATEC)
    kolizie.append(do_hry(stvorec(b, 0.9)))
    kruh_sochy = do_hry([(b[0] + 3.0 * math.cos(2 * math.pi * k / 16), b[1] + 3.0 * math.sin(2 * math.pi * k / 16)) for k in range(16)])
    vchod = B(VCHOD)
    obrysy_hry = [hlavna, T, pas, pl[0], pl[1], horne, spic]
    vysky = [DOSKA[1], ATIKA, PAS_TERASA, PLECIA, PLECIA, HORNE[-1], SPIC[-1]]
    info = {
        'stred': [round(st[0], 2), round(st[1], 2)],
        'vysky': [round(v, 1) for v in vysky],
        'zakladnaBod': [round(vchod[0], 2), round(-vchod[1], 2)],
        'bezKoliziiObrysov': True,
        'kolizie': kolizie,
        'nahradit': [do_hry(hlavna), kruh_sochy],
        'nahraditSochy': [kruh_sochy],
        'vchody': [{'id': 'n4134276201', 'bod': [round(vchod[0], 2), round(-vchod[1], 2)], 'vyska': 0.0}],
    }
    print(f'NBS: doska {S.area:.0f} m², veža {Polygon(T).area:.0f} m², podnož {Polygon(pod).area:.0f} m²')
    pocty = {}
    for f, m in zip(G.f, G.fm):
        pocty[G.mat[m].name] = pocty.get(G.mat[m].name, 0) + len(f) - 2
    print('NBS – trojuholníky podľa materiálu:', ', '.join(f'{k} {v}' for k, v in sorted(pocty.items(), key=lambda q: -q[1])))
    return G, obrysy_hry, 118.8, 'nbs', info
