# Hlavná stanica Bratislava – model z Blendera (issue A1: budova, hala, priechod, nástupištia).
#
# Spustenie (Blender 4+/5, alebo bpy z pip):
#   python3 tools/blender/osm_stanica.py --cache       – podklady z OSM a dlaždíc → tools/blender/data/stanica.json
#   blender -b --python-use-system-env -P tools/blender/stanica_blender.py   – modely do assets/pamiatky/
#   (potrebuje shapely: PYTHONPATH na priečinok s balíkom, napr. pip install --target <priečinok> shapely bez numpy;
#    GLTFPACK=<cesta ku gltfpack> pre meshopt kompresiu; bez neho sa uloží nekomprimovaný .glb)
#
# Výsledok (tri modely, záznamy v data/mapa/pamiatky.json, chôdzu a kolízie rieši js/mapa/stanica/modul.js):
#   stanica            – plášť: výpravná budova (1905) s krídlami, odbavovacia hala (1988), východné krídlo,
#                        priechod z haly na 1. nástupište, valbové strechy; kreslí sa do diaľky
#   stanica-interier   – podlaha haly s otvormi nad schodmi do podchodu, galéria, stĺpy, pokladne, bufet,
#                        automaty, lavičky (model kopíruje terén, kreslí sa len do ~100 m od hráča)
#   stanica-nastupistia – nástupištia s bielym okrajom a žltým pásom, prístrešky na stĺpoch (kopíruje terén)
#
# Rozmery: pôdorysy z OpenStreetMap (sedia s pôdorysom 1.NP 1:200), výšky z rezov A-A, B-B a pohľadov:
#   hala – podlaha ±0 (vstup +0,345), galéria +5,18, strecha +10,32;
#   výpravná budova – 1.NP +0,88 (úroveň nástupíšť), podlažia +5,18 a +9,48, rímsa +13,88, hrebeň +19,63;
#   podchod −3,02 (stavia ho hra z OSM). Výkresy samotné nie sú súčasťou repozitára.
#
# Súradnice: metre hry (x východ, z juh) okolo bodu záznamu; v Blenderi X = x − sx, Y = −(z − sz), Z hore.

import json
import math
import os
import random
import sys

TU = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, TU)

import bpy  # noqa: E402,F401
from veze import Geo, odsad, dlzka, normala, ccw, plocha_obrysu, sklo, svetlo, uloz  # noqa: E402
from spolocne import material  # noqa: E402

with open(os.path.join(TU, 'data', 'stanica.json'), encoding='utf8') as f:
    D = json.load(f)
SX, SZ = D['stred']

# --- výšky z rezov (m nad podlahou haly) ---
HALA_STRECHA = 10.32
HALA_GALERIA = 5.18
HALA_STROP = 10.0
STARA_PODLAHA = 0.88          # 1.NP výpravnej budovy = úroveň nástupíšť
STARA_RIMSA = 13.88
STARA_HREBEN = 19.63
STARA_POSCHODIA = [0.88, 5.18, 9.48, 13.88]
KRIDLO_RIMSA = 12.0
KRIDLO_POSCHODIA = [0.88, 4.6, 8.3, 12.0]
NASTUPISTE = 0.35             # výška nástupišťa nad terénom v hre (skutočných 0,55 m nad koľajou – kompromis pre plynulú chôdzu)
PRISTRESOK = 4.4
PRIECHOD_SIRKA = 5.0
PRIECHOD_VYSKA = 4.2
# priechod z haly na 1. nástupište: medzi vchodmi z OSM (sedí s „Priechod“ v pôdoryse 1.NP)
PRIECHOD = ((-139.15, -1697.01), (-126.86, -1714.69))


def B(p):
    """Bod hry → rovina Blendera."""
    return (p[0] - SX, -(p[1] - SZ))


def H(p):
    """Bod Blendera → lokálne metre hry (pre JSON)."""
    return [round(p[0], 2), round(-p[1], 2)]


def uhol_sirky(d):
    """Natočenie pre kolizie.pridajObdlznik (js/mapa/geometria.js obdlznik), keď šírka leží v smere d (Blender)."""
    # smer v hre = (dx, −dy); obdlznik: os šírky = (cos u, −sin u) → u = atan2(dy, dx)
    return round(math.atan2(d[1], d[0]), 4)


def obrys(body):
    return ccw([B(p) for p in body])


def vnutri(p, poly):
    c = False
    n = len(poly)
    for i in range(n):
        a, b = poly[i - 1], poly[i]
        if (a[1] > p[1]) != (b[1] > p[1]):
            x = a[0] + (p[1] - a[1]) * (b[0] - a[0]) / (b[1] - a[1])
            if p[0] < x:
                c = not c
    return c


def vzd_usecka(p, a, b):
    dx, dy = b[0] - a[0], b[1] - a[1]
    L2 = dx * dx + dy * dy or 1e-9
    t = max(0.0, min(1.0, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / L2))
    return math.hypot(p[0] - a[0] - dx * t, p[1] - a[1] - dy * t)


def vzd_obrys(p, poly):
    return min(vzd_usecka(p, poly[i - 1], poly[i]) for i in range(len(poly)))


def pretina(a, b, c, d):
    """Priesečník úsečiek ab a cd → (t na ab, bod) alebo None."""
    r = (b[0] - a[0], b[1] - a[1])
    s = (d[0] - c[0], d[1] - c[1])
    k = r[0] * s[1] - r[1] * s[0]
    if abs(k) < 1e-9:
        return None
    t = ((c[0] - a[0]) * s[1] - (c[1] - a[1]) * s[0]) / k
    u = ((c[0] - a[0]) * r[1] - (c[1] - a[1]) * r[0]) / k
    if 0 <= t <= 1 and 0 <= u <= 1:
        return t, (a[0] + r[0] * t, a[1] + r[1] * t)
    return None


def jednoduchy(poly):
    """Polygón bez samopretínania a s kladnou plochou (kontrola odsadenej strechy)."""
    if plocha_obrysu(poly) <= 0:
        return False
    n = len(poly)
    for i in range(n):
        for j in range(i + 2, n):
            if i == 0 and j == n - 1:
                continue
            if pretina(poly[i], poly[(i + 1) % n], poly[j], poly[(j + 1) % n]):
                return False
    return True


# --- materiály ---
def materialy():
    return {
        'omietka': material('omietka-stanica', '#e4d9c1', drsnost=0.9),
        'sokel': material('sokel-stanica', '#a89c86', drsnost=0.9),
        'rimsa': material('detail-rimsa', '#efe6d2', drsnost=0.85),
        'ram': material('detail-ram', '#e9e4d8', drsnost=0.6),
        'okno': sklo('okna-stanica', '#26323b', drsnost=0.18, kov=0.55),
        'dvere': material('dvere-stanica', '#4a3426', drsnost=0.7),
        'strecha': material('strecha-stanica', '#5d5550', drsnost=0.75),
        'podhlad': material('podhlad-stanica', '#cfc6b3', drsnost=0.9),
        'sklo_hala': sklo('hala', '#8ea3ae', drsnost=0.08, kov=0.45),
        'hlinik': material('detail-hlinik', '#9aa3a8', drsnost=0.4, kov=0.7),
        'atika': material('atika-hala', '#cdc8bd', drsnost=0.85),
        'strecha_plocha': material('strecha-hala', '#6f6f6c', drsnost=0.95),
        'strop': material('strop-hala', '#dedbd3', drsnost=0.9),
        'priechod': material('steny-priechod', '#d8cfbd', drsnost=0.9),
        # interiér
        'podlaha_a': material('podlaha-a', '#b9b2a6', drsnost=0.35),
        'podlaha_b': material('podlaha-b', '#a39c90', drsnost=0.35),
        'galeria': material('galeria', '#d6d2c9', drsnost=0.8),
        'sklo_zabradlie': sklo('zabradlie', '#b7c8cf', drsnost=0.05, kov=0.3),
        'stlp': material('stlp-hala', '#cbc6bb', drsnost=0.8),
        'drevo': material('drevo-pult', '#7b5a3c', drsnost=0.6),
        'pult_sklo': sklo('pult', '#c6d6dc', drsnost=0.05, kov=0.25),
        'lavicka': material('lavicka', '#3d5a73', drsnost=0.4, kov=0.6),
        'automat_c': material('automat-cerveny', '#b0302c', drsnost=0.5),
        'automat_m': material('automat-modry', '#2c5aa0', drsnost=0.5),
        'displej': svetlo('svetlo-displej', '#bfe3ff', sila=2.0),
        'svetlo': svetlo('svetlo-strop', '#fff6e0', sila=3.0),
        'bufet': material('bufet', '#d18a2c', drsnost=0.6),
        'kos': material('detail-kos', '#4b4f52', drsnost=0.5, kov=0.5),
        # nástupištia
        'nastupiste': material('nastupiste', '#8f8c86', drsnost=0.95),
        'okraj': material('okraj-nastupista', '#e6e3da', drsnost=0.8),
        'pas': material('detail-pas-zlty', '#dcc21f', drsnost=0.7),
        'pristresok': material('pristresok', '#7d8884', drsnost=0.7, kov=0.15),
        'oceľ': material('stlp-ocel', '#3c4744', drsnost=0.5, kov=0.6),
    }


# --- fasáda murovanej budovy s oknami a dverami (otvory bez dier: okolo každého otvoru ostenie) ---
def murovana_fasada(G, poly, poschodia, M, otvory_hran, os_okna=3.4, vnor=0.28, sokel_od=-3.0, skip=()):
    """poly CCW (líce múru). poschodia = výšky podlaží [z0, z1, …, rimsa]. otvory_hran = {i: [(t0, t1, z0, z1, druh)]}
    – dvere/priechody na hrane i (druh 'priechod' = otvor cez celý múr bez výplne)."""
    n = len(poly)
    for i in range(n):
        if i in skip:
            continue
        a, b = poly[i], poly[(i + 1) % n]
        L = dlzka(a, b)
        if L < 0.05:
            continue
        ux, uy = (b[0] - a[0]) / L, (b[1] - a[1]) / L
        nx, ny = normala(a, b)

        def P(t, z, d=0.0):
            return (a[0] + ux * t - nx * d, a[1] + uy * t - ny * d, z)

        vlastne = list(otvory_hran.get(i, []))
        # sokel pod 1.NP (terén v hre je miestami nižšie); priechod ide až po zem – v sokli je medzera
        x = 0.0
        for (t0, t1, _, _, druh) in sorted(q for q in vlastne if q[4] == 'priechod') + [(L, L, 0, 0, '')]:
            if t0 > x + 0.001:
                G.plocha(M['sokel'], [P(x, sokel_od), P(min(L, t0), sokel_od), P(min(L, t0), poschodia[0]), P(x, poschodia[0])])
            x = max(x, t1)
        k = int((L - 1.0) // os_okna)
        stredy = [(L - k * os_okna) / 2 + os_okna * (j + 0.5) for j in range(k)] if k >= 1 else []
        for r in range(len(poschodia) - 1):
            z0, z1 = poschodia[r], poschodia[r + 1]
            vys = z1 - z0
            if r == 0:
                sir, par, pre = 1.7, 0.9, 0.75
            else:
                sir, par, pre = 1.25, 0.95, min(0.9, vys * 0.22)
            otv = []
            for (t0, t1, oz0, oz1, druh) in vlastne:
                if oz0 < z1 - 0.01 and oz1 > z0 + 0.01:
                    otv.append((t0, t1, max(z0, oz0), min(z1, oz1), druh))
            for t in stredy:
                o = (t - sir / 2, t + sir / 2, z0 + par, z1 - pre, 'okno')
                if all(o[1] < q[0] - 0.4 or o[0] > q[1] + 0.4 for q in otv if q[4] != 'okno'):
                    otv.append(o)
            otv.sort()
            # múr okolo otvorov: zvislé pruhy medzi otvormi, pod a nad otvorom
            x = 0.0
            for (t0, t1, oz0, oz1, druh) in otv:
                t0c, t1c = max(0.0, t0), min(L, t1)
                if t0c > x + 0.001:
                    G.plocha(M['omietka'], [P(x, z0), P(t0c, z0), P(t0c, z1), P(x, z1)])
                if oz0 > z0 + 0.001:
                    G.plocha(M['omietka'], [P(t0c, z0), P(t1c, z0), P(t1c, oz0), P(t0c, oz0)])
                if oz1 < z1 - 0.001:
                    G.plocha(M['omietka'], [P(t0c, oz1), P(t1c, oz1), P(t1c, z1), P(t0c, z1)])
                hl = 0.8 if druh == 'priechod' else vnor
                mat_ost = M['priechod'] if druh == 'priechod' else M['omietka']
                # ostenie (4 plochy dnu do múru)
                G.plocha(mat_ost, [P(t0c, oz0), P(t0c, oz0, hl), P(t0c, oz1, hl), P(t0c, oz1)])
                G.plocha(mat_ost, [P(t1c, oz1), P(t1c, oz1, hl), P(t1c, oz0, hl), P(t1c, oz0)])
                G.plocha(mat_ost, [P(t0c, oz1), P(t0c, oz1, hl), P(t1c, oz1, hl), P(t1c, oz1)])
                if druh != 'priechod':
                    G.plocha(mat_ost, [P(t1c, oz0), P(t1c, oz0, hl), P(t0c, oz0, hl), P(t0c, oz0)])
                if druh == 'okno':
                    G.plocha(M['okno'], [P(t0c, oz0, hl), P(t1c, oz0, hl), P(t1c, oz1, hl), P(t0c, oz1, hl)])
                    # parapet (rímsa pod oknom) a priečka okna
                    pz = oz0
                    G.plocha(M['ram'], [P(t0c - 0.08, pz - 0.02, -0.06), P(t1c + 0.08, pz - 0.02, -0.06), P(t1c + 0.08, pz, -0.06), P(t0c - 0.08, pz, -0.06)])
                    G.plocha(M['ram'], [P(t0c - 0.08, pz, -0.06), P(t1c + 0.08, pz, -0.06), P(t1c + 0.08, pz, 0), P(t0c - 0.08, pz, 0)])
                    tm = (t0c + t1c) / 2
                    G.plocha(M['ram'], [P(tm - 0.04, oz0, hl - 0.03), P(tm + 0.04, oz0, hl - 0.03), P(tm + 0.04, oz1, hl - 0.03), P(tm - 0.04, oz1, hl - 0.03)])
                    zp = oz0 + (oz1 - oz0) * 0.72
                    G.plocha(M['ram'], [P(t0c, zp - 0.04, hl - 0.03), P(t1c, zp - 0.04, hl - 0.03), P(t1c, zp + 0.04, hl - 0.03), P(t0c, zp + 0.04, hl - 0.03)])
                elif druh == 'dvere':
                    G.plocha(M['dvere'], [P(t0c, oz0, hl), P(t1c, oz0, hl), P(t1c, oz1, hl), P(t0c, oz1, hl)])
                x = t1c
            if x < L - 0.001:
                G.plocha(M['omietka'], [P(x, z0), P(L, z0), P(L, z1), P(x, z1)])
    # rímsy (kordónové medzi podlažiami, hlavná pod strechou)
    for z in poschodia[1:-1]:
        G.pas(M['rimsa'], poly, z - 0.12, z + 0.12, von=0.12)
    zr = poschodia[-1]
    G.pas(M['rimsa'], poly, zr - 0.55, zr - 0.25, von=0.22)
    G.pas(M['rimsa'], poly, zr - 0.25, zr, von=0.55)


def valbova_strecha(G, poly, z, sklon_deg, presah, M, max_vnor=12.0, vyska=None):
    """Valbová strecha nad ľubovoľným obrysom: šikmé plochy od odkvapu po plochý vrch (odsadený obrys).
    Odsadenie sa zmenšuje, kým je vrchný obrys jednoduchý polygón (úzke krídla). vyska = výška strechy
    od odkvapu po hrebeň (z pohľadov); inak sa ráta zo sklonu."""
    O = odsad(poly, presah)
    d = max_vnor
    while d > 0.8:
        I = odsad(poly, -d)
        if jednoduchy(I):
            break
        d *= 0.85
    I = odsad(poly, -d)
    h = vyska if vyska is not None else (d + presah) * math.tan(math.radians(sklon_deg))
    n = len(poly)
    for i in range(n):
        j = (i + 1) % n
        G.plocha(M['strecha'], [(O[i][0], O[i][1], z), (O[j][0], O[j][1], z), (I[j][0], I[j][1], z + h), (I[i][0], I[i][1], z + h)])
        # podhľad presahu (zospodu)
        G.plocha(M['podhlad'], [(poly[i][0], poly[i][1], z), (O[i][0], O[i][1], z), (O[j][0], O[j][1], z), (poly[j][0], poly[j][1], z)][::-1])
    G.vodorovna(M['strecha'], I, z + h)
    return z + h


# Časti výpravnej budovy a východného krídla pozdĺž osi (0 = západný koniec, 1 = východný) podľa pohľadu južného
# a severného: dvojpodlažné krídla (arkáda na prízemí, rímsa +9,48, nízka strecha po +10,3) a trojpodlažné
# pavilóny s valbovými strechami. (od, do, poschodia, hrebeň)
KRIDLO = [0.88, 5.18, 9.48]
PAVILON = [0.88, 5.18, 9.48, 13.2]
CASTI = [
    (0.000, 0.080, PAVILON, 16.64),             # západný pavilón
    (0.080, 0.250, KRIDLO, 10.32),
    (0.250, 0.310, PAVILON, 17.41),             # pavilón s komínom
    (0.310, 0.390, KRIDLO, 10.32),
    (0.390, 0.550, STARA_POSCHODIA, STARA_HREBEN),   # stredná historická hala (+13,88 / +19,63)
    (0.550, 0.635, KRIDLO, 10.32),
    (0.635, 0.705, PAVILON, 16.74),
    (0.705, 0.815, KRIDLO, 10.32),
    (0.815, 1.000, STARA_POSCHODIA, 17.95),     # východný pavilón (pošta)
]


def casti_budovy(stara, vychod):
    """Rozdelí pôdorysy výpravnej budovy a východného krídla na časti podľa CASTI (pásy kolmo na os budovy)."""
    from shapely.geometry import Polygon as SP, MultiPolygon
    from shapely.geometry.polygon import orient
    hrany = [(dlzka(stara[i - 1], stara[i]), stara[i - 1], stara[i]) for i in range(len(stara))]
    _, a, b = max(hrany)
    ux, uy = (b[0] - a[0]) / dlzka(a, b), (b[1] - a[1]) / dlzka(a, b)
    if ux < 0:                       # os smeruje na východ (+x)
        ux, uy = -ux, -uy
    vx, vy = -uy, ux
    body = stara + vychod
    us = [p[0] * ux + p[1] * uy for p in body]
    vs = [p[0] * vx + p[1] * vy for p in body]
    u0, u1, v0, v1 = min(us), max(us), min(vs) - 5, max(vs) + 5
    out = []
    for poly in (stara, vychod):
        P = SP(poly).buffer(0)
        for (f0, f1, poschodia, hreben) in CASTI:
            a0, a1 = u0 + (u1 - u0) * f0, u0 + (u1 - u0) * f1
            pas = SP([(ux * a0 + vx * v0, uy * a0 + vy * v0), (ux * a1 + vx * v0, uy * a1 + vy * v0),
                      (ux * a1 + vx * v1, uy * a1 + vy * v1), (ux * a0 + vx * v1, uy * a0 + vy * v1)])
            r = P.intersection(pas)
            for g in (list(r.geoms) if hasattr(r, 'geoms') else [r]):
                if g.is_empty or g.geom_type != 'Polygon' or g.area < 15:
                    continue
                g = orient(g.simplify(0.05), 1.0)
                out.append({'poly': ccw([tuple(c) for c in list(g.exterior.coords)[:-1]]), 'poschodia': poschodia, 'hreben': hreben})
    return out


# --- plášť ---
def plast(M):
    G = Geo()
    stara = obrys(D['budovy']['stara'])
    hala = obrys(D['budovy']['hala'])
    vychod = obrys(D['budovy']['vychod'])
    pa, pb = B(PRIECHOD[0]), B(PRIECHOD[1])
    # predĺženie osi priechodu cez oba múry
    L = dlzka(pa, pb)
    ux, uy = (pb[0] - pa[0]) / L, (pb[1] - pa[1]) / L
    qa, qb = (pa[0] - ux * 4, pa[1] - uy * 4), (pb[0] + ux * 4, pb[1] + uy * 4)

    def otvory_priechodu(poly):
        """Otvory priechodu v múroch polygónu (aj vo vnútorných múroch medzi časťami budovy) + body kríženia s osou."""
        otv, kriz = {}, []
        for i in range(len(poly)):
            a, b = poly[i], poly[(i + 1) % len(poly)]
            r = pretina(qa, qb, a, b)
            if not r:
                continue
            t_osi, p = r
            Lh = dlzka(a, b)
            # šírka otvoru v smere hrany (priechod nemusí byť kolmý)
            hx, hy = (b[0] - a[0]) / Lh, (b[1] - a[1]) / Lh
            sin = abs(ux * hy - uy * hx) or 1
            w = PRIECHOD_SIRKA / sin / 2
            t = dlzka(a, p)
            otv.setdefault(i, []).append((t - w, t + w, -3.0, STARA_PODLAHA + PRIECHOD_VYSKA, 'priechod'))
            kriz.append((t_osi, p))
        return otv, sorted(kriz)

    # priechod cez celú výpravnú budovu: krajné kríženia s jej obrysom
    _, krizenia = otvory_priechodu(stara)

    def dvere_z_osm(poly, otv, z0):
        """Ďalšie vchody z OSM na fasáde → dvere (okrem tých pri priechode)."""
        for v in D['vchody']:
            p = B(v['p'])
            if krizenia and min(dlzka(p, k[1]) for k in krizenia) < 4:
                continue
            best = None
            for i in range(len(poly)):
                dd = vzd_usecka(p, poly[i - 1], poly[i])
                if dd < 1.5 and (best is None or dd < best[0]):
                    best = (dd, (i - 1) % len(poly))
            if best:
                i = best[1]
                a, b = poly[i], poly[(i + 1) % len(poly)]
                t = dlzka(a, p)
                otv.setdefault(i, []).append((t - 1.0, t + 1.0, z0, z0 + 3.0, 'dvere'))

    # výpravná budova a východné krídlo podľa pohľadov: dvojpodlažné krídla s arkádou a trojpodlažné pavilóny
    # s valbovými strechami (časti pozdĺž osi budovy – CASTI); každá časť má vlastné podlažia a strechu
    steny_kol = []
    casti = casti_budovy(stara, vychod)
    for c in casti:
        otv, _ = otvory_priechodu(c['poly'])
        dvere_z_osm(c['poly'], otv, STARA_PODLAHA)
        murovana_fasada(G, c['poly'], c['poschodia'], M, otv)
        valbova_strecha(G, c['poly'], c['poschodia'][-1], None, 0.6, M, vyska=c['hreben'] - c['poschodia'][-1])
        c['otvory'] = otv
    print('časti výpravnej budovy:', len(casti))

    # priechod: bočné steny, strop (podlahu kreslí interiér podľa terénu)
    if len(krizenia) >= 2:
        p0, p1 = krizenia[0][1], krizenia[-1][1]
        vx, vy = -uy, ux
        w = PRIECHOD_SIRKA / 2
        z0, z1 = STARA_PODLAHA - 0.9 - 0.5, STARA_PODLAHA + PRIECHOD_VYSKA
        for s in (1, -1):
            a = (p0[0] + vx * w * s, p0[1] + vy * w * s)
            b = (p1[0] + vx * w * s, p1[1] + vy * w * s)
            # líce dnu do priechodu
            if s == 1:
                G.stena(M['priechod'], b, a, z0, z1)
            else:
                G.stena(M['priechod'], a, b, z0, z1)
            steny_kol.append({'a': H(a), 'b': H(b), 'hrubka': 0.4, 'od': -4, 'po': STARA_RIMSA, 'vrch': STARA_RIMSA + 1})
        G.plocha(M['priechod'], [(p0[0] + vx * w, p0[1] + vy * w, z1), (p1[0] + vx * w, p1[1] + vy * w, z1),
                                  (p1[0] - vx * w, p1[1] - vy * w, z1), (p0[0] - vx * w, p0[1] - vy * w, z1)])

    # odbavovacia hala: sklenená fasáda na voľných hranách, hrany pri výpravnej budove sa nekreslia
    nh = len(hala)
    spolocne = set()
    for i in range(nh):
        a, b = hala[i], hala[(i + 1) % nh]
        m = ((a[0] + b[0]) / 2, (a[1] + b[1]) / 2)
        if vzd_obrys(m, stara) < 1.2 or vnutri(m, stara) or vzd_obrys(m, vychod) < 1.2:
            spolocne.add(i)
    dvere_hala = {}
    for v in D['vchody']:
        p = B(v['p'])
        for i in range(nh):
            if i in spolocne:
                continue
            a, b = hala[i], hala[(i + 1) % nh]
            if vzd_usecka(p, a, b) < 1.6:
                t = dlzka(a, p)
                dvere_hala.setdefault(i, []).append((t - 2.0, t + 2.0))
                break
    hala_steny = sklenena_hala(G, hala, spolocne, dvere_hala, M)
    # strecha haly a podhľad
    from veze import strecha as plocha_strecha
    plocha_strecha(G, hala, HALA_STRECHA, M['strecha_plocha'], M['atika'], atika=0.7)
    G.vodorovna(M['strop'], hala, HALA_STROP, hore=False)
    # strop nad pásom pri výpravnej budove (hala je nižšia než budova – medzera po rímsu sa zakryje stenou budovy)

    # kolízie plášťa: múry výpravnej budovy a krídla po obvode s medzerami (priechod, otvory), steny haly
    for poly, otv, vrch in ((c['poly'], c['otvory'], c['hreben']) for c in casti):
        for i in range(len(poly)):
            a, b = poly[i], poly[(i + 1) % len(poly)]
            Lh = dlzka(a, b)
            if Lh < 0.05:
                continue
            medzery = sorted((t0, t1) for (t0, t1, _, _, d) in otv.get(i, []) if d == 'priechod')
            x = 0.0
            for (t0, t1) in medzery + [(Lh, Lh)]:
                if t0 - x > 0.05:
                    pa_ = (a[0] + (b[0] - a[0]) * x / Lh, a[1] + (b[1] - a[1]) * x / Lh)
                    pb_ = (a[0] + (b[0] - a[0]) * min(Lh, t0) / Lh, a[1] + (b[1] - a[1]) * min(Lh, t0) / Lh)
                    steny_kol.append({'a': H(pa_), 'b': H(pb_), 'hrubka': 0.8, 'od': -4, 'po': vrch, 'vrch': vrch})
                x = max(x, t1)
    steny_kol.extend(hala_steny)
    return G, [stara, hala, vychod], steny_kol, krizenia


def sklenena_hala(G, poly, spolocne, dvere, M):
    """Závesová stena haly: hliníkové stĺpiky po ~1,9 m, priečky, nad 2,6 m sklo; vo dverách otvor do 2,6 m."""
    kol = []
    n = len(poly)
    urovne = [0.0, 2.6, HALA_GALERIA, 7.75, HALA_STRECHA]
    for i in range(n):
        if i in spolocne:
            continue
        a, b = poly[i], poly[(i + 1) % n]
        L = dlzka(a, b)
        if L < 0.05:
            continue
        ux, uy = (b[0] - a[0]) / L, (b[1] - a[1]) / L

        def P(t, z):
            return (a[0] + ux * t, a[1] + uy * t, z)
        k = max(1, round(L / 1.9))
        dv = dvere.get(i, [])
        for j in range(k):
            t0, t1 = L * j / k, L * (j + 1) / k
            otvor = any(t1 > d0 and t0 < d1 for d0, d1 in dv)
            for r in range(len(urovne) - 1):
                z0, z1 = urovne[r], urovne[r + 1]
                if r == 0 and otvor:
                    continue
                G.plocha(M['sklo_hala'], [P(t0, z0), P(t1, z0), P(t1, z1), P(t0, z1)])
        # sokel pod halou
        G.plocha(M['sokel'], [P(0, -3.0), P(L, -3.0), P(L, 0.0), P(0, 0.0)])
        nx, ny = normala(a, b)
        for j in range(k + 1):
            t = L * j / k
            c = (a[0] + ux * t + nx * 0.04, a[1] + uy * t + ny * 0.04)
            G.kvader(M['hlinik'], c, (ux, uy), 0.08, 0.16, 0.0, HALA_STRECHA)
        for z in urovne[1:-1]:
            G.pas(M['hlinik'], [a, b], z - 0.06, z + 0.06, von=0.1, uzavreta=False)
        # kolízia steny so štrbinami vo dverách
        x = 0.0
        for (d0, d1) in sorted(dv) + [(L, L)]:
            if d0 - x > 0.05:
                kol.append({'a': H(P(x, 0)[:2]), 'b': H(P(min(L, d0), 0)[:2]), 'hrubka': 0.3, 'od': -4, 'po': HALA_STRECHA, 'vrch': HALA_STRECHA + 0.8})
            x = max(x, d1)
    return kol


# --- interiér (kopíruje terén) ---
def interier(M, krizenia):
    G = Geo()
    hala = obrys(D['budovy']['hala'])
    stara = obrys(D['budovy']['stara'])
    schody = []
    for s in D['schody']:
        a, b = B(s['body'][0]), B(s['body'][-1])
        schody.append((a, b, s.get('sirka', 3) / 2 + 0.6))

    def pri_schodoch(p, rez=0.0):
        return any(vzd_usecka(p, a, b) < r + rez for a, b, r in schody)

    # os budovy (smer najdlhšej hrany výpravnej budovy) – mriežka stĺpov a dlaždíc
    hrany = [(dlzka(stara[i - 1], stara[i]), stara[i - 1], stara[i]) for i in range(len(stara))]
    _, a, b = max(hrany)
    uh = math.atan2(b[1] - a[1], b[0] - a[0])
    ux, uy = math.cos(uh), math.sin(uh)
    vx, vy = -uy, ux

    # priechod
    pas_priechodu = None
    if len(krizenia) >= 2:
        p0, p1 = krizenia[0][1], krizenia[-1][1]
        pas_priechodu = (p0, p1)

    def v_priechode(p, rez=0.0):
        return pas_priechodu and vzd_usecka(p, *pas_priechodu) < PRIECHOD_SIRKA / 2 + rez

    # podlaha haly a priechodu: štvorce 2 × 2 m v osi budovy, bez štvorcov nad schodmi
    krok = 2.0
    cx = sum(p[0] for p in hala) / len(hala)
    cy = sum(p[1] for p in hala) / len(hala)
    pocet = 0
    for iu in range(-45, 46):
        for iv in range(-45, 46):
            u0, v0 = iu * krok, iv * krok
            rohy = [(cx + ux * (u0 + du) + vx * (v0 + dv), cy + uy * (u0 + du) + vy * (v0 + dv))
                    for du, dv in ((0, 0), (krok, 0), (krok, krok), (0, krok))]
            stred = (cx + ux * (u0 + 1) + vx * (v0 + 1), cy + uy * (u0 + 1) + vy * (v0 + 1))
            if not (vnutri(stred, hala) or v_priechode(stred)):
                continue
            if pri_schodoch(stred):
                continue
            mat = M['podlaha_a'] if (iu + iv) % 2 == 0 else M['podlaha_b']
            G.plocha(mat, [(p[0], p[1], 0.03) for p in rohy])
            pocet += 1

    # galéria po obvode haly (+5,18) so skleneným zábradlím
    G.pas(M['galeria'], hala, HALA_GALERIA - 0.35, HALA_GALERIA, von=0.0, dnu=5.0)
    vnutorny = odsad(hala, -5.0)
    for i in range(len(vnutorny)):
        a, b = vnutorny[i], vnutorny[(i + 1) % len(vnutorny)]
        G.plocha(M['sklo_zabradlie'], [(a[0], a[1], HALA_GALERIA), (b[0], b[1], HALA_GALERIA), (b[0], b[1], HALA_GALERIA + 1.05), (a[0], a[1], HALA_GALERIA + 1.05)])
        G.pas(M['hlinik'], [a, b], HALA_GALERIA + 1.02, HALA_GALERIA + 1.1, von=0.04, dnu=0.04, uzavreta=False)

    # svetelné pásy na strope haly (pod galériou aj v strednom priestore) – svietiaci materiál
    for iv in range(-12, 13):
        for iu in range(-12, 13):
            if (iu + iv) % 2:
                continue
            p = (cx + ux * iu * 4.2 + vx * iv * 4.2, cy + uy * iu * 4.2 + vy * iv * 4.2)
            if not vnutri(p, hala) or vzd_obrys(p, hala) < 1.0:
                continue
            z = HALA_GALERIA - 0.37 if vzd_obrys(p, hala) < 5.0 else HALA_STROP - 1.4
            G.kvader(M['svetlo'], p, (ux, uy), 2.4, 0.25, z - 0.04, z, vrch=False, spodok=True)

    prvky = []   # kolízie interiéru: {typ: 'kruh'|'obdlznik', …} v lokálnych metroch hry

    # stĺpy v mriežke 8,4 m (pôdorys 1.NP), mimo schodov a priechodu
    for iu in range(-6, 7):
        for iv in range(-6, 7):
            p = (cx + ux * iu * 8.4 + vx * iv * 8.4, cy + uy * iu * 8.4 + vy * iv * 8.4)
            if not vnutri(p, hala) or vzd_obrys(p, hala) < 3.0 or pri_schodoch(p, 1.5) or v_priechode(p, 1.0):
                continue
            # stĺp končí nad podhľadom (podlaha kopíruje terén, ktorý v hale stúpa o ~1 m)
            G.kvader(M['stlp'], p, (ux, uy), 0.7, 0.7, 0.0, HALA_STROP - 1.0)
            prvky.append({'typ': 'kruh', 'p': H(p), 'r': 0.5, 'vyska': HALA_STROP})

    def volne(p, r):
        return vnutri(p, hala) and vzd_obrys(p, hala) > r and not pri_schodoch(p, r) and not v_priechode(p, r + 1) and \
            all(math.hypot(p[0] - q['p'][0], -p[1] - q['p'][1]) > r + 0.8 for q in prvky if q['typ'] == 'kruh') and \
            all(math.hypot(p[0] - q['p'][0], -p[1] - q['p'][1]) > r + 1.0 + max(q['sirka'], q['hlbka']) / 2 for q in prvky if q['typ'] == 'obdlznik')

    def lokal(u, v):
        return (cx + ux * u + vx * v, cy + uy * u + vy * v)

    # pokladne: rad 6 okienok pri západnej stene haly (pult, sklo, zadná stena)
    # hľadá sa v mriežke 1 m: čo najviac na západ (min u), celý rad musí byť voľný
    def najdi(body_radu, r, kluc):
        kand = [(u, v) for u in range(-40, 41) for v in range(-30, 31)
                if all(volne(lokal(u + du, v + dv), r) for du, dv in body_radu)]
        return min(kand, key=kluc) if kand else None

    dlz = 12.0
    rad = [(du, dv) for du in (-2.2, 0.0, 0.8) for dv in (-dlz / 2, -dlz / 4, 0, dlz / 4, dlz / 2)]
    pokladne = najdi(rad, 0.6, lambda q: (q[0], abs(q[1])))
    miesta = {}
    if pokladne is not None:
        u, v0 = pokladne

        def LP(u_, v_):   # rad pokladní je posunutý o v0
            return lokal(u_, v_ + v0)
        G.kvader(M['drevo'], LP(u, 0), (vx, vy), dlz, 0.7, 0.0, 1.1)
        G.kvader(M['pult_sklo'], LP(u - 0.25, 0), (vx, vy), dlz, 0.05, 1.1, 2.4, vrch=False)
        G.kvader(M['drevo'], LP(u - 2.2, 0), (vx, vy), dlz, 0.25, 0.0, 3.0)
        G.kvader(M['drevo'], LP(u - 1.1, 0), (vx, vy), dlz + 0.5, 2.6, 3.0, 3.25, spodok=True)
        for k in range(7):
            v = -dlz / 2 + dlz * k / 6
            G.kvader(M['drevo'], LP(u - 0.25, v), (vx, vy), 0.12, 0.12, 1.1, 2.4, vrch=False)
        prvky.append({'typ': 'obdlznik', 'p': H(LP(u - 0.75, 0)), 'sirka': dlz, 'hlbka': 3.0, 'uhol': uhol_sirky((vx, vy)), 'vyska': 3.25})
        miesta['pokladne'] = {'p': H(LP(u + 0.6, 0)), 'smer': H((ux, uy)), 'vyska': 3.6}
        miesta['pokladna'] = {'p': H(LP(u + 1.0, 0)), 'smer': H((-ux, -uy))}

    # bufet: stánok čo najviac na východ (max u)
    stanok = [(du, dv) for du in (-1.0, 0.0, 1.2) for dv in (-3.2, 0.0, 3.2)]
    bufet = najdi(stanok, 0.7, lambda q: (-q[0], abs(q[1])))
    if bufet is not None:
        u, v0 = bufet

        def LB(u_, v_):
            return lokal(u_, v_ + v0)
        p = LB(u, 0)
        G.kvader(M['bufet'], p, (ux, uy), 3.0, 6.0, 0.0, 1.05)
        G.kvader(M['drevo'], LB(u + 1.0, 0), (ux, uy), 1.0, 6.0, 1.05, 2.6)
        G.kvader(M['bufet'], LB(u + 0.2, 0), (ux, uy), 3.6, 6.6, 2.6, 2.95, spodok=True)
        prvky.append({'typ': 'obdlznik', 'p': H(LB(u + 0.3, 0)), 'sirka': 3.6, 'hlbka': 6.4, 'uhol': uhol_sirky((ux, uy)), 'vyska': 2.95})
        miesta['bufet'] = {'p': H(LB(u - 1.6, 0)), 'smer': H((-ux, -uy)), 'vyska': 3.2}

    # automaty: tri v rade pri stene výpravnej budovy (sever = −v), mimo priechodu a schodov
    for u in (6, -6, 12, -12, 0):
        for v in range(-30, 0):
            p = lokal(u, v)
            if volne(p, 1.4) and volne(lokal(u - 2.4, v), 1.4) and volne(lokal(u + 2.4, v), 1.4) and not volne(lokal(u, v - 2.0), 0.0):
                for k, mat in enumerate((M['automat_c'], M['automat_m'], M['automat_c'])):
                    q = lokal(u + (k - 1) * 1.2, v)
                    G.kvader(mat, q, (ux, uy), 1.0, 0.85, 0.0, 1.95)
                    G.kvader(M['displej'], lokal(u + (k - 1) * 1.2, v + 0.43), (ux, uy), 0.45, 0.02, 1.2, 1.7, vrch=False)
                prvky.append({'typ': 'obdlznik', 'p': H(p), 'sirka': 3.8, 'hlbka': 1.1, 'uhol': uhol_sirky((ux, uy)), 'vyska': 2.0})
                miesta['automaty'] = {'p': H(lokal(u, v + 1.4))}
                break
        if 'automaty' in miesta:
            break

    # lavičky: dva rady v strede haly
    lavicky = []
    for v in (-3.0, 3.0):
        for u in (-12, -7.5, -3, 1.5, 6, 10.5):
            p = lokal(u, v)
            if not volne(p, 1.6):
                continue
            G.kvader(M['lavicka'], p, (ux, uy), 3.2, 0.5, 0.42, 0.48)
            G.kvader(M['lavicka'], lokal(u, v + (0.27 if v > 0 else -0.27)), (ux, uy), 3.2, 0.06, 0.48, 0.95, vrch=True)
            for du in (-1.4, 1.4):
                G.kvader(M['kos'], lokal(u + du, v), (ux, uy), 0.08, 0.45, 0.0, 0.42)
            prvky.append({'typ': 'obdlznik', 'p': H(p), 'sirka': 3.2, 'hlbka': 0.7, 'uhol': uhol_sirky((ux, uy)), 'vyska': 0.95})
            lavicky.append({'p': H(p), 'smer': H((vx * (1 if v < 0 else -1), vy * (1 if v < 0 else -1)))})

    # tabuľa odchodov a hodiny: nad vstupom do priechodu (kreslí js/mapa/stanica/tabule.js)
    if pas_priechodu:
        p0 = pas_priechodu[0]
        # bod v hale 3 m pred priechodom
        dx, dy = p0[0] - pas_priechodu[1][0], p0[1] - pas_priechodu[1][1]
        dl = math.hypot(dx, dy)
        tx, ty = dx / dl, dy / dl
        miesta['tabula'] = {'p': H((p0[0] + tx * 1.5, p0[1] + ty * 1.5)), 'smer': H((tx, ty)), 'vyska': 3.4}
        miesta['hodiny'] = {'p': H((p0[0] + tx * 9.0, p0[1] + ty * 9.0)), 'smer': H((tx, ty)), 'vyska': 4.6}
        miesta['priechod'] = {'a': H(pas_priechodu[0]), 'b': H(pas_priechodu[1])}
    miesta['lavicky'] = lavicky
    miesta['os'] = H((ux, uy))
    print(f'interiér: {pocet} dlaždíc podlahy, {len(prvky)} prekážok')
    return G, [hala], prvky, miesta


# --- nástupištia a prístrešky (kopírujú terén) ---
def nastupistia(M):
    G = Geo()
    schody = [(B(s['body'][0]), B(s['body'][-1]), s.get('sirka', 3) / 2 + 0.4) for s in D['schody']]
    profily = []
    obrysy = []
    for n in D['nastupistia']:
        poly = obrys(n['obrys'])
        obrysy.append(poly)
        h = NASTUPISTE
        # povrch: pásy kolmo na os po 4 m, mimo schodov do podchodu
        os_ = [B((q['x'], q['z'])) for q in n['os']]
        sirky = [q['sirka'] for q in n['os']]
        for k in range(len(os_) - 1):
            a, b = os_[k], os_[k + 1]
            L = dlzka(a, b)
            if L < 0.1:
                continue
            ux, uy = (b[0] - a[0]) / L, (b[1] - a[1]) / L
            vx, vy = -uy, ux
            kusov = max(1, round(L / 4.0))
            for j in range(kusov):
                t0, t1 = L * j / kusov, L * (j + 1) / kusov
                w0 = (sirky[k] + (sirky[k + 1] - sirky[k]) * j / kusov) / 2
                w1 = (sirky[k] + (sirky[k + 1] - sirky[k]) * (j + 1) / kusov) / 2
                c0 = (a[0] + ux * t0, a[1] + uy * t0)
                c1 = (a[0] + ux * t1, a[1] + uy * t1)
                m = ((c0[0] + c1[0]) / 2, (c0[1] + c1[1]) / 2)
                if any(vzd_usecka(m, sa, sb) < r for sa, sb, r in schody):
                    # pri schodoch len okraje nástupišťa (schody idú stredom)
                    for s in (1, -1):
                        o0 = (c0[0] + vx * w0 * s, c0[1] + vy * w0 * s)
                        o1 = (c1[0] + vx * w1 * s, c1[1] + vy * w1 * s)
                        i0 = (c0[0] + vx * (w0 - 1.2) * s, c0[1] + vy * (w0 - 1.2) * s)
                        i1 = (c1[0] + vx * (w1 - 1.2) * s, c1[1] + vy * (w1 - 1.2) * s)
                        q = [(o0[0], o0[1], h), (o1[0], o1[1], h), (i1[0], i1[1], h), (i0[0], i0[1], h)]
                        G.plocha(M['nastupiste'], q if s < 0 else q[::-1])
                    continue
                L0 = (c0[0] + vx * w0, c0[1] + vy * w0)
                L1 = (c1[0] + vx * w1, c1[1] + vy * w1)
                R0 = (c0[0] - vx * w0, c0[1] - vy * w0)
                R1 = (c1[0] - vx * w1, c1[1] - vy * w1)
                G.plocha(M['nastupiste'], [(R0[0], R0[1], h), (R1[0], R1[1], h), (L1[0], L1[1], h), (L0[0], L0[1], h)])
            # hrany: biely okraj (bok k trati) a žltý bezpečnostný pás 0,8 m od hrany
            for s in (1, -1):
                o0 = (a[0] + vx * sirky[k] / 2 * s, a[1] + vy * sirky[k] / 2 * s)
                o1 = (b[0] + vx * sirky[k + 1] / 2 * s, b[1] + vy * sirky[k + 1] / 2 * s)
                if s > 0:
                    G.stena(M['okraj'], o1, o0, -0.6, h)
                else:
                    G.stena(M['okraj'], o0, o1, -0.6, h)
                p0 = (a[0] + vx * (sirky[k] / 2 - 0.8) * s, a[1] + vy * (sirky[k] / 2 - 0.8) * s)
                p1 = (b[0] + vx * (sirky[k + 1] / 2 - 0.8) * s, b[1] + vy * (sirky[k + 1] / 2 - 0.8) * s)
                q0 = (p0[0] + vx * 0.1 * s, p0[1] + vy * 0.1 * s)
                q1 = (p1[0] + vx * 0.1 * s, p1[1] + vy * 0.1 * s)
                q = [(p0[0], p0[1], h + 0.01), (p1[0], p1[1], h + 0.01), (q1[0], q1[1], h + 0.01), (q0[0], q0[1], h + 0.01)]
                G.plocha(M['pas'], q if s < 0 else q[::-1])
        # čelá nástupišťa
        for k in (0, len(os_) - 1):
            j = 1 if k == 0 else k - 1
            a, b = os_[k], os_[j]
            L = dlzka(a, b) or 1
            vx, vy = -(b[1] - a[1]) / L, (b[0] - a[0]) / L
            w = sirky[k] / 2
            e0, e1 = (a[0] + vx * w, a[1] + vy * w), (a[0] - vx * w, a[1] - vy * w)
            if k == 0:
                G.stena(M['okraj'], e0, e1, -0.6, h)
            else:
                G.stena(M['okraj'], e1, e0, -0.6, h)
        profily.append({'ref': n['ref'], 'body': [H(p) for p in os_], 'sirky': sirky, 'vyska': NASTUPISTE})

    # prístrešky: strecha na stĺpoch v osi, ~9 m
    for p in D['pristresky']:
        poly = obrys(p['obrys'])
        h0 = PRISTRESOK
        G.hranol(M['pristresok'], poly, h0, h0 + 0.35, vrch=True, spodok=True)
        os_ = [B((q['x'], q['z'])) for q in p['os']]
        for q in os_[1:-1]:
            G.kvader(M['oceľ'], q, (1, 0), 0.3, 0.3, NASTUPISTE, h0)
    print(f'nástupištia: {len(profily)}, prístrešky: {len(D["pristresky"])}')
    return G, obrysy, profily


def main():
    M = materialy()
    G, obrysy, steny, krizenia = plast(M)
    # minimum 0,55: zapečené zatienenie na veľkých sklenených tabuliach haly nerobí tmavé fľaky
    uloz(G, 'stanica', obrysy, STARA_HREBEN, vzorky=16, minimum=0.55, info={
        'bezKoliziiObrysov': True, 'steny': steny,
        'popis': 'Hlavná stanica – plášť (tools/blender/stanica_blender.py). Kolízie: steny (js/mapa/stanica/modul.js).'})
    for ob in list(bpy.data.objects):
        bpy.data.objects.remove(ob)
    M = materialy()
    G2, obr2, prvky, miesta = interier(M, krizenia)
    uloz(G2, 'stanica-interier', obr2, 6.0, ao=False, info={
        'podlaTerenu': True, 'bezKoliziiObrysov': True, 'prvky': prvky, 'miesta': miesta,
        'viditelnost': 100})
    for ob in list(bpy.data.objects):
        bpy.data.objects.remove(ob)
    M = materialy()
    G3, obr3, profily = nastupistia(M)
    uloz(G3, 'stanica-nastupistia', [], 5.0, ao=False, info={
        'podlaTerenu': True, 'bezKoliziiObrysov': True, 'nastupistia': profily, 'nahradit': [[H(p) for p in o] for o in obr3]})


if __name__ == '__main__':
    main()
