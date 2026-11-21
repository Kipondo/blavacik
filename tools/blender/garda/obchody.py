# Obchody pri Mladej garde na Račianskej (bez značiek firiem – pravidlá projektu):
#   supermarket (64A): dlhá hala so šikmou (pultovou) strechou 7,5 → 4,7 m z OSM, hore sivé plechové
#     opláštenie s rebrami, dole biely pás s výkladmi a plagátovými plochami, presklené zádverie
#     so vstupom, prístrešok na vozíky, nakladacia rampa vzadu;
#   bistro (62A): prízemná reštaurácia s fasádou z drevených lamiel, šikmým pásom strechy nad
#     presklenou jedálňou, svetlou kuchyňou, výdajným okienkom pre autá a terasou so stolíkmi.
# Pôdorysy z OSM (tools/blender/osm_garda.mjs → data/garda.json).

import math
import random

from shapely.geometry import Polygon
from shapely.geometry.polygon import orient

from spolocne import material
from veze import Geo, dlzka, normala, odsad, strecha as plocha_strecha, stred_obrysu, sklo

from garda.zaklad import data, obrys_bl


def m_obchod():
    return {
        'plech': material('plech-obchod', '#a3a8ac', drsnost=0.45, kov=0.55),
        'rebro': material('detail-rebro-plech', '#8f959a', drsnost=0.45, kov=0.55),
        'biela': material('obklad-biely', '#e9eaea', drsnost=0.6),
        'tmava': material('obklad-tmavosivy', '#3b3f44', drsnost=0.6, kov=0.2),
        'strecha': material('strecha-plech-obchod', '#9fa3a6', drsnost=0.55, kov=0.4),
        'sklo': sklo('sklo-vyklad', '#40525e', drsnost=0.05, kov=0.7),
        'ram': material('detail-ram-hlinik', '#55595e', drsnost=0.35, kov=0.7),
        'plagat1': material('plagat-zeleny', '#7fb069', drsnost=0.5),
        'plagat2': material('plagat-oranzovy', '#e8a33d', drsnost=0.5),
        'plagat3': material('plagat-biely', '#f2efe6', drsnost=0.5),
        'tabula': material('tabula-zelena', '#2f6b4f', drsnost=0.5),
        'beton': material('beton-rampa', '#9a9890', drsnost=0.9),
    }


def vyska_pultovej(p, smer, z_hore, z_dole, rozsah):
    """Výška pultovej strechy v bode p (smer = jednotkový vektor, kam strecha klesá)."""
    t = (p[0] * smer[0] + p[1] * smer[1] - rozsah[0]) / max(1e-6, rozsah[1] - rozsah[0])
    return z_hore + (z_dole - z_hore) * t


def supermarket():
    D = data()
    M = m_obchod()
    rnd = random.Random(64)
    G = Geo()
    stred = stred_obrysu([(p[0], p[1]) for p in D['obchod']['obrys']['body']])
    stred = (round(stred[0], 2), round(stred[1], 2))
    cely = obrys_bl(D['obchod']['obrys']['body'], stred, 0.25)
    hala = obrys_bl(D['obchod']['casti'][0]['body'], stred, 0.25)
    # pultová strecha: roof:direction 101° (od severu v smere hodín) – klesá na východ
    u = math.radians(101)
    smer = (math.sin(u), math.cos(u))
    proj = [p[0] * smer[0] + p[1] * smer[1] for p in hala]
    rozsah = (min(proj), max(proj))
    ZH, ZD = 7.5, 4.7
    z = lambda p: vyska_pultovej(p, smer, ZH, ZD, rozsah)
    n = len(hala)
    for i in range(n):
        a, b = hala[i], hala[(i + 1) % n]
        L = dlzka(a, b)
        if L < 0.1:
            continue
        ux, uy = (b[0] - a[0]) / L, (b[1] - a[1]) / L
        nx, ny = uy, -ux
        za, zb = z(a), z(b)
        # spodný biely pás 0 – 3.2 m, horný plech až po strechu (zošikmený)
        G.stena(M['biela'], a, b, -0.5, 3.2)
        G.plocha(M['plech'], [(a[0], a[1], 3.2), (b[0], b[1], 3.2), (b[0], b[1], zb), (a[0], a[1], za)])
        # zvislé rebrá plechu
        k = 0.5
        while k < L - 0.3:
            p = (a[0] + ux * k, a[1] + uy * k)
            zz = za + (zb - za) * k / L
            G.kvader(M['rebro'], (p[0] + nx * 0.03, p[1] + ny * 0.03), (ux, uy), 0.07, 0.06, 3.25, zz - 0.1)
            k += 1.0
        # oplechovanie atiky
        G.plocha(M['tmava'], [(a[0] + nx * 0.12, a[1] + ny * 0.12, za - 0.25), (b[0] + nx * 0.12, b[1] + ny * 0.12, zb - 0.25),
                              (b[0] + nx * 0.12, b[1] + ny * 0.12, zb + 0.1), (a[0] + nx * 0.12, a[1] + ny * 0.12, za + 0.1)])
        # predná (západná) strana: plagátové plochy vo výkladoch; zadná (východná): nakladacia rampa
        if nx < -0.6 and L > 8:
            pocet = int(L // 6.5)
            for j in range(pocet):
                s = (L - pocet * 6.5) / 2 + j * 6.5 + 3.25
                c = (a[0] + ux * s + nx * 0.05, a[1] + uy * s + ny * 0.05)
                G.kvader(M['ram'], c, (ux, uy), 5.2, 0.1, 0.4, 2.9)
                G.kvader(M[('plagat1', 'plagat2', 'plagat3')[j % 3]], (c[0] + nx * 0.06, c[1] + ny * 0.06), (ux, uy), 4.9, 0.04, 0.55, 2.75)
        if nx > 0.6 and L > 15:
            s = L * 0.3
            c = (a[0] + ux * s + nx * 2.0, a[1] + uy * s + ny * 2.0)
            G.kvader(M['beton'], c, (ux, uy), 9.0, 4.0, -0.5, 1.1)
            for j in range(2):
                cc = (a[0] + ux * (s - 2.2 + j * 4.4) + nx * 0.05, a[1] + uy * (s - 2.2 + j * 4.4) + ny * 0.05)
                G.kvader(M['tmava'], cc, (ux, uy), 3.0, 0.08, 1.1, 4.0)
    # strecha (rovinná – vrcholy obrysu vo výške pultu)
    G.plocha(M['strecha'], [(p[0], p[1], z(p) - 0.05) for p in hala])
    # podlubie: zvyšok celého obrysu mimo haly (pás pred južnou časťou čela) – strieška na stĺpoch,
    # pod ňou presklená stena haly so vstupom
    zvysok = Polygon(cely).difference(Polygon(hala).buffer(0.05, join_style=2))
    casti = list(zvysok.geoms) if hasattr(zvysok, 'geoms') else [zvysok]
    hala_p = Polygon(hala)
    for c in casti:
        if c.area < 25:
            continue
        o = list(orient(c.simplify(0.2), 1.0).exterior.coords)[:-1]
        m = len(o)
        G.vodorovna(M['tmava'], o, 4.0)
        G.vodorovna(M['strecha'], o, 4.45)
        G.vodorovna(M['plech'], o, 3.9, hore=False)
        for i in range(m):
            a, b = o[i], o[(i + 1) % m]
            L = dlzka(a, b)
            if L < 0.1:
                continue
            ux, uy = (b[0] - a[0]) / L, (b[1] - a[1]) / L
            mid = ((a[0] + b[0]) / 2, (a[1] + b[1]) / 2)
            pri_hale = hala_p.exterior.distance(Polygon(o).exterior.interpolate(Polygon(o).exterior.project(__import__('shapely').geometry.Point(mid)))) < 0.3
            if pri_hale:
                # stena haly pod podlubím: sklo so vstupnými dverami
                G.panel(M['sklo'], b, a, 0.0, 3.6, rnd, 0.002)
                continue
            # obvodový nosník (atika strieška) a stĺpy po 6 m
            G.stena(M['tmava'], a, b, 3.9, 4.45)
            k = 0.0
            while k <= L + 0.01:
                p = (a[0] + ux * k, a[1] + uy * k)
                G.valec(M['ram'], p, 0.14, -0.5, 3.9, seg=8)
                k += max(3.0, L / max(1, round(L / 6.0)))
    # vstup: severný koniec prednej strany – markíza, doska
    prednie = [(i, hala[i], hala[(i + 1) % n]) for i in range(n) if normala(hala[i], hala[(i + 1) % n])[0] < -0.6 and dlzka(hala[i], hala[(i + 1) % n]) > 8]
    if prednie:
        _, a, b = max(prednie, key=lambda e: (e[1][1] + e[2][1]) / 2)
        L = dlzka(a, b)
        ux, uy = (b[0] - a[0]) / L, (b[1] - a[1]) / L
        nx, ny = uy, -ux
        # severný koniec hrany (väčšie y)
        kon = a if a[1] > b[1] else b
        sgn = 1 if kon is a else -1
        c = (kon[0] + ux * sgn * 5.0, kon[1] + uy * sgn * 5.0)
        G.kvader(M['tmava'], (c[0] + nx * 1.6, c[1] + ny * 1.6), (ux, uy), 8.0, 3.2, 3.3, 3.7, spodok=True)
        G.kvader(M['sklo'], (c[0] + nx * 0.02, c[1] + ny * 0.02), (ux, uy), 6.5, 0.05, 0.0, 3.2)
        G.kvader(M['tabula'], (c[0] + nx * 0.15, c[1] + ny * 0.15), (ux, uy), 2.8, 0.12, 4.0, 6.6)
        G.kvader(M['plagat3'], (c[0] + nx * 0.22, c[1] + ny * 0.22), (ux, uy), 2.4, 0.04, 4.2, 6.4)
        # prístrešok na vozíky pred vstupom
        pc = (c[0] + nx * 9.0 + ux * sgn * 4.0, c[1] + ny * 9.0 + uy * sgn * 4.0)
        G.kvader(M['tmava'], pc, (ux, uy), 6.0, 2.6, 2.2, 2.35)
        for dx in (-2.8, 2.8):
            for dy in (-1.1, 1.1):
                G.kvader(M['ram'], (pc[0] + ux * dx + nx * dy, pc[1] + uy * dx + ny * dy), (ux, uy), 0.08, 0.08, 0.0, 2.2)
    info = {'stred': [stred[0], stred[1]], 'nazov': 'Supermarket na Račianskej', 'dosah': 50}
    return G, [cely], ZH + 0.2, 'supermarket-racianska', info


def bistro():
    D = data()
    rnd = random.Random(62)
    G = Geo()
    M = {
        'lamely': material('lamely-drevo', '#7a4a2a', drsnost=0.7),
        'lamela': material('detail-lamela', '#5e3820', drsnost=0.7),
        'pas': material('strecha-pas-bistro', '#6b4a33', drsnost=0.6),
        'kuchyna': material('obklad-kuchyna', '#dcdcd8', drsnost=0.6),
        'tmava': material('obklad-tmavosivy', '#3b3f44', drsnost=0.6, kov=0.2),
        'sklo': sklo('sklo-bistro', '#3e4c55', drsnost=0.05, kov=0.7),
        'ram': material('detail-ram-hlinik', '#55595e', drsnost=0.35, kov=0.7),
        'strecha': material('strecha-plocha-garda', '#55585b', drsnost=0.92),
        'stol': material('detail-stol', '#4a4d50', drsnost=0.5, kov=0.5),
        'slnecnik': material('slnecnik', '#d9d2c4', drsnost=0.8),
        'plot': material('detail-plot-terasa', '#2e2f31', drsnost=0.5, kov=0.4),
        'tabula': material('tabula-bistro', '#2b2b2b', drsnost=0.5),
    }
    stred = stred_obrysu([(p[0], p[1]) for p in D['bistro']['body']])
    stred = (round(stred[0], 2), round(stred[1], 2))
    o = obrys_bl(D['bistro']['body'], stred, 0.3)
    n = len(o)
    H = 4.4
    # najdlhšia hrana = os budovy; jedáleň na západnej polovici (k Račianskej), kuchyňa na východnej
    i_os = max(range(n), key=lambda i: dlzka(o[i], o[(i + 1) % n]))
    a, b = o[i_os], o[(i_os + 1) % n]
    L = dlzka(a, b)
    os_ = ((b[0] - a[0]) / L, (b[1] - a[1]) / L)
    proj = [p[0] * os_[0] + p[1] * os_[1] for p in o]
    p0, p1 = min(proj), max(proj)
    zapad_je_min = (os_[0] > 0)          # os smeruje na východ → menšie hodnoty sú na západe
    hranica = p0 + (p1 - p0) * (0.62 if zapad_je_min else 0.38)
    def je_jedalen(p):
        v = p[0] * os_[0] + p[1] * os_[1]
        return v < hranica if zapad_je_min else v > hranica
    for i in range(n):
        a, b = o[i], o[(i + 1) % n]
        Lh = dlzka(a, b)
        if Lh < 0.1:
            continue
        ux, uy = (b[0] - a[0]) / Lh, (b[1] - a[1]) / Lh
        nx, ny = uy, -ux
        # rozdelíme hranu na kúsky po ~1 m a podľa polohy dáme presklenie s lamelami alebo kuchyňu
        kusov = max(1, round(Lh / 1.2))
        for k in range(kusov):
            A = (a[0] + ux * Lh * k / kusov, a[1] + uy * Lh * k / kusov)
            B = (a[0] + ux * Lh * (k + 1) / kusov, a[1] + uy * Lh * (k + 1) / kusov)
            mid = ((A[0] + B[0]) / 2, (A[1] + B[1]) / 2)
            if je_jedalen(mid):
                G.stena(M['tmava'], A, B, -0.4, 0.4)
                G.panel(M['sklo'], A, B, 0.4, 2.9, rnd, 0.002)
                G.stena(M['lamely'], A, B, 2.9, H)
                G.kvader(M['ram'], A, (ux, uy), 0.1, 0.12, 0.4, 2.9)
            else:
                G.stena(M['kuchyna'], A, B, -0.4, H)
        # zvislé drevené lamely na kuchynskej časti nie, na jedálni nad oknami áno
    # šikmý pás strechy okolo jedálne (ako mansarda) a plochá strecha
    G.pas(M['pas'], o, H, H + 0.25, von=0.9, spodok=True)
    for i in range(n):
        a, b = o[i], o[(i + 1) % n]
        if not (je_jedalen(a) or je_jedalen(b)):
            continue
        nx, ny = normala(a, b)
        A2, B2 = (a[0] - nx * 0.4, a[1] - ny * 0.4), (b[0] - nx * 0.4, b[1] - ny * 0.4)
        A1, B1 = (a[0] + nx * 0.9, a[1] + ny * 0.9), (b[0] + nx * 0.9, b[1] + ny * 0.9)
        G.plocha(M['pas'], [(A1[0], A1[1], H + 0.25), (B1[0], B1[1], H + 0.25), (B2[0], B2[1], H + 1.6), (A2[0], A2[1], H + 1.6)])
    plocha_strecha(G, odsad(o, -0.5), H + 0.2, M['strecha'], M['kuchyna'], atika=1.4)
    # lamely na stene nad oknami jedálne (zvislé)
    for i in range(n):
        a, b = o[i], o[(i + 1) % n]
        Lh = dlzka(a, b)
        if Lh < 1:
            continue
        ux, uy = (b[0] - a[0]) / Lh, (b[1] - a[1]) / Lh
        nx, ny = uy, -ux
        k = 0.15
        while k < Lh:
            p = (a[0] + ux * k, a[1] + uy * k)
            if je_jedalen(p):
                G.kvader(M['lamela'], (p[0] + nx * 0.05, p[1] + ny * 0.05), (ux, uy), 0.06, 0.08, 2.9, H)
            k += 0.3
    # terasa so stolíkmi a slnečníkmi pred jedálňou (na západ, k Račianskej)
    zapad = min(o, key=lambda p: p[0])
    tc = (zapad[0] - 5.0, sum(p[1] for p in o) / n)
    for dx in (-2.5, 2.5):
        for dy in (-4.5, 0.0, 4.5):
            c = (tc[0] + dx, tc[1] + dy)
            G.valec(M['stol'], c, 0.45, 0.72, 0.76, seg=10)
            G.valec(M['stol'], c, 0.05, 0.0, 0.72, seg=6)
            G.valec(M['stol'], c, 0.04, 0.76, 2.3, seg=6)
            G.valec(M['slnecnik'], c, 1.25, 2.1, 2.45, seg=8, r1=0.05)
    # nízky plot okolo terasy (západná strana a dve kratšie strany)
    G.kvader(M['plot'], (tc[0] - 4.2, tc[1]), (0, 1), 13.0, 0.05, 0.0, 1.0)
    for s in (-1, 1):
        G.kvader(M['plot'], (tc[0] - 0.1, tc[1] + s * 6.5), (1, 0), 8.2, 0.05, 0.0, 1.0)
    # výdajné okienko pre autá a stojan s nápisom (len tmavá tabuľa bez značky)
    G.kvader(M['tabula'], (tc[0] + 1, tc[1] - 9.5), (1, 0), 1.6, 0.25, 0.0, 5.5)
    info = {'stred': [stred[0], stred[1]], 'nazov': 'Bistro na Račianskej', 'dosah': 35}
    return G, [o], H + 1.6, 'bistro-racianska', info


def postav_vsetky():
    return [supermarket, bistro]
