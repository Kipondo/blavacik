# Spoločné pre Mladú gardu a okolie (Račianska): dáta z OSM (data/garda.json), materiály,
# okná na jednej hrane, cimburie, lodžie, vetracie vikiere na streche, stožiare, živé ploty.
# Súradnice: hra (x východ, z juh) → Blender (x, y = −z) vzhľadom na stred modelu; obrysy CCW.

import json
import math
import os
import random

from shapely.geometry import Polygon, Point
from shapely.geometry.polygon import orient
from shapely.ops import unary_union

from spolocne import material
from veze import Geo, z_hry, zjednodus, ccw, dlzka, normala, odsad, sklo, stred_obrysu  # noqa: F401

_DATA = None


def data():
    global _DATA
    if _DATA is None:
        with open(os.path.join(os.path.dirname(os.path.dirname(__file__)), 'data', 'garda.json')) as f:
            _DATA = json.load(f)
    return _DATA


def v_bl(p, stred):
    return (p[0] - stred[0], -(p[1] - stred[1]))


def obrys_bl(body, stred, tol=0.3):
    return ccw(zjednodus(z_hry(body, stred), tol))


def zjednot(obrysy, tol=0.12):
    """Zjednotí susedné pôdorysy (časti budovy) do jedného alebo viacerých obrysov (CCW)."""
    p = unary_union([Polygon(o).buffer(0.08, join_style=2) for o in obrysy]).buffer(-0.08, join_style=2)
    p = p.simplify(tol)
    casti = list(p.geoms) if hasattr(p, 'geoms') else [p]
    out = []
    for c in casti:
        c = orient(c, 1.0)
        out.append(list(c.exterior.coords)[:-1])
    return out


def najdi_hranu(obrys, bod, max_dlzka=1e9):
    """Index hrany obrysu so stredom najbližšie k bodu."""
    naj, dmin = 0, 1e18
    n = len(obrys)
    for i in range(n):
        a, b = obrys[i], obrys[(i + 1) % n]
        if dlzka(a, b) > max_dlzka:
            continue
        d = math.hypot((a[0] + b[0]) / 2 - bod[0], (a[1] + b[1]) / 2 - bod[1])
        if d < dmin:
            naj, dmin = i, d
    return naj


def koncova_hrana(obrys, smer, max_dlzka=16):
    """Stred kratšej hrany obrysu najďalej v smere (dx, dy) – čelo krídla."""
    naj, best = None, -1e18
    n = len(obrys)
    for i in range(n):
        a, b = obrys[i], obrys[(i + 1) % n]
        if dlzka(a, b) > max_dlzka or dlzka(a, b) < 4:
            continue
        m = ((a[0] + b[0]) / 2, (a[1] + b[1]) / 2)
        v = m[0] * smer[0] + m[1] * smer[1]
        if v > best:
            naj, best = m, v
    return naj


# --- materiály ----------------------------------------------------------------------

def materialy():
    return {
        'omietka': material('omietka-garda', '#e8d9c2', drsnost=0.88),
        'omietka_ruzova': material('omietka-garda-vstup', '#e2c8b8', drsnost=0.88),
        'detail': material('detail-garda', '#f3ece0', drsnost=0.8),
        'rimsa': material('rimsa-garda', '#efe6d6', drsnost=0.8),
        'sokel': material('sokel-garda', '#cfae9c', drsnost=0.9),
        'strecha': material('strecha-skridla-garda', '#c2542f', drsnost=0.78),
        'strecha_plocha': material('strecha-plocha-garda', '#55585b', drsnost=0.92),
        'strecha_svetla': material('strecha-svetla-garda', '#9a9b98', drsnost=0.9),
        'sklo': sklo('sklo-okna-garda', '#4c5c66', drsnost=0.08, kov=0.6),
        'ram': material('detail-ram-okna', '#f4f4f1', drsnost=0.5),
        'relief': material('relief-garda', '#b97f69', drsnost=0.85),
        'relief_svetly': material('relief-garda-svetly', '#dcb6a4', drsnost=0.85),
        'kamen': material('kamen-garda', '#b8b2a6', drsnost=0.9),
        'vikier': material('vikier-garda', '#ece9e2', drsnost=0.8),
        'stoziar': material('detail-stoziar', '#3f7fc2', drsnost=0.4, kov=0.5),
        'kov': material('detail-kov-tmavy', '#2f3134', drsnost=0.5, kov=0.6),
        'cifernik': material('cifernik', '#f6f4ee', drsnost=0.5),
        'ker': material('ker-ziva-ploty', '#3f6b34', drsnost=0.95),
        'zabradlie': material('detail-zabradlie', '#d8d2c6', drsnost=0.8),
    }


# --- okná na jednej hrane --------------------------------------------------------------

def okna_na_hrane(G, a, b, kz, M, os_okien=3.1, okno=(1.25, 1.55), prizemie_okno=None, podlazia=None,
                  stena=None, vnor=0.22, rnd=None, sambrana=True, dvere=None):
    """Stena nad úsečkou a→b (lícom von) s pravidelnými oknami na podlažiach kz[k]..kz[k+1].
    podlazia = zoznam indexov k, ktoré sa kreslia (inak všetky); dvere = index okna na prízemí, ktoré je dvere."""
    stena = stena or M['omietka']
    L = dlzka(a, b)
    if L < 0.05:
        return
    ux, uy = (b[0] - a[0]) / L, (b[1] - a[1]) / L
    nx, ny = uy, -ux
    pocet = max(1, round(L / os_okien))
    krok = L / pocet
    for k in range(len(kz) - 1):
        if podlazia is not None and k not in podlazia:
            continue
        z0, z1 = kz[k], kz[k + 1]
        w, h = (prizemie_okno or okno) if k == 0 else okno
        h = min(h, (z1 - z0) - 0.9)
        zo = z0 + max(0.8, (z1 - z0 - h) * 0.45)
        G.stena(stena, a, b, z0, zo)
        G.stena(stena, a, b, zo + h, z1)
        for j in range(pocet):
            je_dvere = k == 0 and dvere is not None and j == dvere
            zd = z0 + 0.05 if je_dvere else zo
            s0 = j * krok + (krok - w) / 2
            A = (a[0] + ux * s0, a[1] + uy * s0)
            B = (A[0] + ux * w, A[1] + uy * w)
            P0 = (a[0] + ux * j * krok, a[1] + uy * j * krok)
            P1 = (a[0] + ux * (j + 1) * krok, a[1] + uy * (j + 1) * krok)
            G.stena(stena, P0, A, zo, zo + h)
            G.stena(stena, B, P1, zo, zo + h)
            if je_dvere:
                G.stena(stena, P0, A, z0, zo)   # (už je v páse pod oknami – len pre istotu ostenie nižšie)
            Ai = (A[0] - nx * vnor, A[1] - ny * vnor)
            Bi = (B[0] - nx * vnor, B[1] - ny * vnor)
            G.stena(stena, Ai, A, zd, zo + h)
            G.stena(stena, B, Bi, zd, zo + h)
            G.plocha(stena, [(A[0], A[1], zo + h), (B[0], B[1], zo + h), (Bi[0], Bi[1], zo + h), (Ai[0], Ai[1], zo + h)])
            G.plocha(stena, [(Ai[0], Ai[1], zd), (Bi[0], Bi[1], zd), (B[0], B[1], zd), (A[0], A[1], zd)])
            G.panel(M['sklo'], Ai, Bi, zd, zo + h, rnd, 0.003)
            # rám a priečka okna (biele plastové okná po rekonštrukcii)
            c = ((Ai[0] + Bi[0]) / 2 + nx * 0.03, (Ai[1] + Bi[1]) / 2 + ny * 0.03)
            G.kvader(M['ram'], c, (ux, uy), 0.07, 0.06, zd, zo + h)
            if not je_dvere:
                G.kvader(M['ram'], c, (ux, uy), w, 0.06, zo + h * 0.68, zo + h * 0.68 + 0.06)
            if sambrana:
                r = 0.13
                G.kvader(M['detail'], ((A[0] + B[0]) / 2 + nx * 0.04, (A[1] + B[1]) / 2 + ny * 0.04), (ux, uy), w + 2 * r, 0.08, zo + h, zo + h + r)
                if not je_dvere:
                    G.kvader(M['detail'], ((A[0] + B[0]) / 2 + nx * 0.09, (A[1] + B[1]) / 2 + ny * 0.09), (ux, uy), w + 2 * r + 0.12, 0.18, zo - 0.08, zo, spodok=True)


# --- cimburie, lodžie, vikiere -------------------------------------------------------------

def cimburie(G, mat, a, b, z, vyska=0.5, sirka=0.42, rozostup=0.84, hrubka=0.32, von=0.0):
    """Zuby (merlóny) na hrane a→b od výšky z (renesančné cimburie atiky)."""
    L = dlzka(a, b)
    if L < sirka * 1.5:
        return
    ux, uy = (b[0] - a[0]) / L, (b[1] - a[1]) / L
    nx, ny = uy, -ux
    pocet = max(1, int((L - sirka) / rozostup) + 1)
    start = (L - (pocet - 1) * rozostup) / 2
    for k in range(pocet):
        s = start + k * rozostup
        c = (a[0] + ux * s + nx * (von - hrubka / 2), a[1] + uy * s + ny * (von - hrubka / 2))
        G.kvader(mat, c, (ux, uy), sirka, hrubka, z, z + vyska)


def lodzie(G, a, b, kz, M, sirka=6.0, hlbka=1.8, stlpy=2, atika=(5.2, 1.9), rnd=None):
    """Čelo krídla: v strede pás lodžií na poschodiach (stĺpy, zábradlie, zadná stena s dverami a oknom),
    na prízemí dve okná, nad korunnou rímsou renesančná atika s cimburím. Bočné časti steny s oknom."""
    L = dlzka(a, b)
    ux, uy = (b[0] - a[0]) / L, (b[1] - a[1]) / L
    nx, ny = uy, -ux
    sirka = min(sirka, L - 2.0)
    s0, s1 = (L - sirka) / 2, (L + sirka) / 2
    P0 = (a[0] + ux * s0, a[1] + uy * s0)
    P1 = (a[0] + ux * s1, a[1] + uy * s1)
    # bočné časti
    okna_na_hrane(G, a, P0, kz, M, os_okien=s0 + 0.01, rnd=rnd)
    okna_na_hrane(G, P1, b, kz, M, os_okien=s0 + 0.01, rnd=rnd)
    # prízemie v strede – dve okná v líci
    okna_na_hrane(G, P0, P1, kz, M, os_okien=sirka / 2, podlazia=[0], rnd=rnd)
    Q0 = (P0[0] - nx * hlbka, P0[1] - ny * hlbka)
    Q1 = (P1[0] - nx * hlbka, P1[1] - ny * hlbka)
    for k in range(1, len(kz) - 1):
        z0, z1 = kz[k], kz[k + 1]
        # zadná stena lodžie s dverami a oknom
        okna_na_hrane(G, Q0, Q1, [z0, z1], M, os_okien=sirka / 2, okno=(1.3, 1.7), stena=M['omietka'], rnd=rnd, sambrana=False)
        # bočné steny výklenku
        G.stena(M['omietka'], Q0, P0, z0, z1)
        G.stena(M['omietka'], P1, Q1, z0, z1)
        # podlaha (doska) a podhľad
        G.plocha(M['rimsa'], [(P0[0], P0[1], z0 + 0.02), (P1[0], P1[1], z0 + 0.02), (Q1[0], Q1[1], z0 + 0.02), (Q0[0], Q0[1], z0 + 0.02)])
        G.plocha(M['omietka'], [(Q0[0], Q0[1], z1 - 0.02), (Q1[0], Q1[1], z1 - 0.02), (P1[0], P1[1], z1 - 0.02), (P0[0], P0[1], z1 - 0.02)])
        # čelo stropnej dosky
        G.kvader(M['rimsa'], ((P0[0] + P1[0]) / 2 + nx * 0.06, (P0[1] + P1[1]) / 2 + ny * 0.06), (ux, uy), sirka, 0.14, z0 - 0.18, z0 + 0.04)
        # plné zábradlie (parapet) a stĺpy
        G.kvader(M['zabradlie'], ((P0[0] + P1[0]) / 2 - nx * 0.1, (P0[1] + P1[1]) / 2 - ny * 0.1), (ux, uy), sirka, 0.2, z0, z0 + 1.0)
        for j in range(1, stlpy + 1):
            s = s0 + sirka * j / (stlpy + 1)
            c = (a[0] + ux * s - nx * 0.15, a[1] + uy * s - ny * 0.15)
            G.kvader(M['rimsa'], c, (ux, uy), 0.42, 0.42, z0, z1)
    # pás pod hlavnou rímsou nad lodžiami (posledné podlažie má strop v líci)
    G.stena(M['omietka'], P0, P1, kz[-1] - 0.05, kz[-1])
    # atika s cimburím nad rímsou (štít čela krídla)
    sa, ha = atika
    t0, t1 = (L - sa) / 2, (L + sa) / 2
    A0 = (a[0] + ux * t0, a[1] + uy * t0)
    A1 = (a[0] + ux * t1, a[1] + uy * t1)
    z = kz[-1]
    G.kvader(M['omietka'], ((A0[0] + A1[0]) / 2 - nx * 0.25, (A0[1] + A1[1]) / 2 - ny * 0.25), (ux, uy), sa, 0.5, z - 0.4, z + ha)
    G.kvader(M['rimsa'], ((A0[0] + A1[0]) / 2 - nx * 0.2, (A0[1] + A1[1]) / 2 - ny * 0.2), (ux, uy), sa + 0.3, 0.7, z + ha, z + ha + 0.18)
    cimburie(G, M['rimsa'], A0, A1, z + ha + 0.18, vyska=0.55, sirka=0.45, rozostup=0.9, hrubka=0.4, von=-0.05)


def vetraky(G, mat, obrys, H, sklon, odstup=2.3, rozostup=6.5, rnd=None):
    """Malé vikiere (vetracie a výlezové otvory) v radoch na svahoch valbovej strechy – ako na leteckej snímke."""
    P = Polygon(obrys)
    n = len(obrys)
    for i in range(n):
        a, b = obrys[i], obrys[(i + 1) % n]
        L = dlzka(a, b)
        if L < 9:
            continue
        ux, uy = (b[0] - a[0]) / L, (b[1] - a[1]) / L
        nx, ny = uy, -ux
        pocet = int((L - 6) // rozostup) + 1
        start = (L - (pocet - 1) * rozostup) / 2
        for k in range(pocet):
            s = start + k * rozostup
            c = (a[0] + ux * s - nx * odstup, a[1] + uy * s - ny * odstup)
            p = Point(c)
            if not P.contains(p) or P.exterior.distance(p) < odstup - 0.25:
                continue
            z = H + sklon * odstup
            # krabička s plochou strieškou, čelo k okapu
            G.kvader(mat, c, (ux, uy), 0.95, 0.75, z - 0.6, z + 0.38)


def stoziar(G, mat, c, vyska=10.0):
    G.valec(mat, c, 0.07, 0.0, vyska, seg=8)
    G.valec(mat, c, 0.12, vyska, vyska + 0.18, seg=8)


def ziva_plot(G, mat, a, b, vyska=1.3, hrubka=1.1):
    L = dlzka(a, b)
    ux, uy = (b[0] - a[0]) / L, (b[1] - a[1]) / L
    G.kvader(mat, ((a[0] + b[0]) / 2, (a[1] + b[1]) / 2), (ux, uy), L, hrubka, 0.0, vyska)
