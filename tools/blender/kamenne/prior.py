# Obchodný dom na Kamennom námestí (1968, Ivan Matušík) – bez značky obchodu (pravidlá projektu):
#   hlavný blok: biely, takmer bezokenný klin na štíhlych stĺpoch nad presklenou podnožou; horná hrana
#     stúpa od západu (19 m) k východu (23 m) – výšky z laserového skenovania ÚGKK;
#   veľké okrúhle hodiny na južnej fasáde (poloha z OSM amenity=clock), pod nimi štyri stĺpce tmavých lamiel,
#     pod hornou hranou na východe pás zvislých vetracích lamiel;
#   biela veža na východnej strane (8 podlaží, malé štvorcové okná, ustúpené horné podlažie s komínmi);
#   nižšia dvojpodlažná budova (obchody, jedáleň) s bielym pásom nad oknami, presklená lávka a nadstavba;
#   reliéf pri juhozápadnom rohu.
# Doplnky námestia (okrúhly vyvýšený záhon, drevené truhlíky so stromčekmi) sú zvlášť a kopírujú terén.

import math
import random

from shapely.geometry import Polygon, box
from shapely.geometry.polygon import orient

from spolocne import material
from veze import Geo, dlzka, normala, odsad, stred_obrysu, sklo, strecha

from kamenne.zaklad import data, obrys_bl, cast, bod_na, disk, v_bl
from kamenne.kyjev import vyklad

DNO = 4.8          # podhľad bloku nad podnožou
PRIZEMIE = 4.4     # výška presklenej podnože
VRCH_Z, VRCH_V = 19.2, 23.0   # horná hrana bloku na západe a na východe (laser)
X_Z, X_V = 486.0, 512.0       # medzi týmito x (súradnice hry) horná hrana stúpa


def m_prior():
    return {
        'biela': material('obklad-biely-od', '#ecebe6', drsnost=0.55),
        'skara': material('detail-skara-od', '#c9c7c0', drsnost=0.7),
        'sklo': sklo('sklo-od', '#3d4a52', drsnost=0.05, kov=0.75),
        'ram': material('detail-ram-od', '#46494c', drsnost=0.4, kov=0.6),
        'stlp': material('stlp-od', '#d8d6d0', drsnost=0.5),
        'strecha': material('strecha-od', '#8f9191', drsnost=0.9),
        'lamela': material('lamela-tmava', '#34383b', drsnost=0.5, kov=0.4),
        'cifernik': material('cifernik-biely', '#f6f5f0', drsnost=0.4),
        'rucicka': material('rucicka-cierna', '#151617', drsnost=0.4),
        'kamen': material('kamen-relief', '#cbbfa6', drsnost=0.85),
        'zabradlie': material('detail-zabradlie-od', '#5b5f62', drsnost=0.4, kov=0.6),
        'komin': material('komin-od', '#b9b5ad', drsnost=0.8),
    }


def vrch_bloku(gx):
    """Výška hornej hrany bloku podľa x v hre."""
    t = min(1.0, max(0.0, (gx - X_Z) / (X_V - X_Z)))
    return VRCH_Z + (VRCH_V - VRCH_Z) * t


def blok(G, M, obrys, stred):
    """Klin na stĺpoch: steny s šikmou hornou hranou, vodorovné škáry, podhľad, strecha po rovinných kusoch."""
    zv = lambda p: vrch_bloku(p[0] + stred[0])
    n = len(obrys)
    hranice = [X_Z - stred[0], X_V - stred[0]]
    for i in range(n):
        a, b = obrys[i], obrys[(i + 1) % n]
        # rozdeľ hranu v miestach zlomu hornej hrany (aby bol každý kus rovinný)
        ts = [0.0, 1.0]
        for hx in hranice:
            if (a[0] - hx) * (b[0] - hx) < 0:
                ts.append((hx - a[0]) / (b[0] - a[0]))
        ts.sort()
        for t0, t1 in zip(ts, ts[1:]):
            p, q = bod_na(a, b, t0), bod_na(a, b, t1)
            G.plocha(M['biela'], [(p[0], p[1], DNO), (q[0], q[1], DNO), (q[0], q[1], zv(q)), (p[0], p[1], zv(p))])
        # vodorovné škáry obkladu po 1,6 m
        z = DNO + 1.6
        while z < min(zv(a), zv(b)) - 0.3:
            p, q = bod_na(a, b, 0.0, 0.01), bod_na(a, b, 1.0, 0.01)
            G.stena(M['skara'], p, q, z - 0.03, z + 0.03)
            z += 1.6
    G.vodorovna(M['biela'], obrys, DNO, hore=False)
    G.pas(M['biela'], obrys, DNO - 0.25, DNO, 0.0, dnu=0.2, vrch=False)
    # strecha: kusy medzi zlommi sú rovinné
    P = Polygon(obrys)
    x0, y0, x1, y1 = P.bounds
    for (bx0, bx1) in ((x0 - 1, hranice[0]), (hranice[0], hranice[1]), (hranice[1], x1 + 1)):
        kus = P.intersection(box(bx0, y0 - 1, bx1, y1 + 1))
        for g in getattr(kus, 'geoms', [kus]):
            if g.geom_type != 'Polygon' or g.area < 0.5:
                continue
            o = list(orient(g, 1.0).exterior.coords)[:-1]
            G.plocha(M['strecha'], [(p[0], p[1], zv(p) - 0.15) for p in o])
    # nízka atika po obvode strechy (tenký pás)
    for i in range(n):
        a, b = obrys[i], obrys[(i + 1) % n]
        ai, bi = odsad([a, b], -0.25, uzavreta=False)
        G.plocha(M['biela'], [(bi[0], bi[1], zv(b) - 0.15), (ai[0], ai[1], zv(a) - 0.15), (ai[0], ai[1], zv(a) + 0.05), (bi[0], bi[1], zv(b) + 0.05)])


def stlpy_pod_blokom(G, M, obrys, vynechat):
    n = len(obrys)
    vnutro = odsad(obrys, -0.9)
    for i in range(n):
        a, b = vnutro[i], vnutro[(i + 1) % n]
        L = dlzka(a, b)
        if L < 2:
            continue
        k = max(1, round(L / 6.5))
        for j in range(k + 1):
            p = bod_na(a, b, j / k)
            if vynechat.contains(Polygon([(p[0] - 0.3, p[1] - 0.3), (p[0] + 0.3, p[1] - 0.3), (p[0] + 0.3, p[1] + 0.3), (p[0] - 0.3, p[1] + 0.3)])):
                continue
            G.valec(M['stlp'], p, 0.22, 0.0, DNO, seg=10)


def hodiny(G, M, obrys, stred, bod_hry):
    """Veľké okrúhle hodiny (biely ciferník, čierne ručičky bez číslic) a lamely pod nimi."""
    c = v_bl(bod_hry, stred)
    n = len(obrys)
    # najbližšia hrana k bodu z OSM
    def vzd(i):
        a, b = obrys[i], obrys[(i + 1) % n]
        L2 = (b[0] - a[0]) ** 2 + (b[1] - a[1]) ** 2 or 1e-9
        t = max(0.0, min(1.0, ((c[0] - a[0]) * (b[0] - a[0]) + (c[1] - a[1]) * (b[1] - a[1])) / L2))
        return math.hypot(a[0] + (b[0] - a[0]) * t - c[0], a[1] + (b[1] - a[1]) * t - c[1]), t
    i = min((i for i in range(n) if dlzka(obrys[i], obrys[(i + 1) % n]) > 8), key=lambda i: vzd(i)[0])
    a, b = obrys[i], obrys[(i + 1) % n]
    L = dlzka(a, b)
    t = vzd(i)[1]
    R = 2.4
    t = min(max(t, (R + 1.0) / L), 1 - (R + 1.0) / L)
    p = bod_na(a, b, t)
    nrm = normala(a, b)
    ux, uy = (b[0] - a[0]) / L, (b[1] - a[1]) / L
    zc = (DNO + vrch_bloku(p[0] + stred[0])) / 2 + 1.2
    disk(G, M['rucicka'], p, nrm, R + 0.18, 0.1, zc)
    disk(G, M['cifernik'], p, nrm, R, 0.16, zc)
    # značky hodín (12 krátkych čiarok) a ručičky na 10:10
    for k in range(12):
        u = 2 * math.pi * k / 12
        r0, r1 = R * 0.82, R * 0.95
        q0 = (p[0] + ux * r0 * math.sin(u) + nrm[0] * 0.18, p[1] + uy * r0 * math.sin(u) + nrm[1] * 0.18, zc + r0 * math.cos(u))
        q1 = (p[0] + ux * r1 * math.sin(u) + nrm[0] * 0.18, p[1] + uy * r1 * math.sin(u) + nrm[1] * 0.18, zc + r1 * math.cos(u))
        G.tram(M['rucicka'], q0, q1, 0.12 if k % 3 else 0.2)
    for uhol, dl, hr in ((math.radians(-60), R * 0.55, 0.2), (math.radians(60), R * 0.82, 0.13)):
        q0 = (p[0] + nrm[0] * 0.24, p[1] + nrm[1] * 0.24, zc)
        q1 = (p[0] + ux * dl * math.sin(uhol) + nrm[0] * 0.24, p[1] + uy * dl * math.sin(uhol) + nrm[1] * 0.24, zc + dl * math.cos(uhol))
        G.tram(M['rucicka'], q0, q1, hr)
    G.kvader(M['rucicka'], (p[0] + nrm[0] * 0.27, p[1] + nrm[1] * 0.27), (ux, uy), 0.25, 0.08, zc - 0.12, zc + 0.12)
    # štyri stĺpce zvislých tmavých lamiel pod hodinami
    for s in (-2.4, -0.8, 0.8, 2.4):
        for k in range(5):
            o = s + (k - 2) * 0.24
            q = (p[0] + ux * o + nrm[0] * 0.15, p[1] + uy * o + nrm[1] * 0.15)
            G.kvader(M['lamela'], q, (ux, uy), 0.07, 0.3, DNO + 1.0, zc - R - 0.8)
    return i


def vetracie_lamely(G, M, obrys, stred, i):
    """Pás zvislých lamiel pod hornou hranou na východnej časti hrany i."""
    a, b = obrys[i], obrys[(i + 1) % len(obrys)]
    L = dlzka(a, b)
    ux, uy = (b[0] - a[0]) / L, (b[1] - a[1]) / L
    nrm = normala(a, b)
    k = 0.0
    while k < L - 0.5:
        p = bod_na(a, b, k / L)
        gx = p[0] + stred[0]
        if gx > X_V - 4:
            z1 = vrch_bloku(gx) - 0.7
            q = (p[0] + nrm[0] * 0.12, p[1] + nrm[1] * 0.12)
            G.kvader(M['lamela'], q, (ux, uy), 0.06, 0.24, z1 - 1.8, z1)
        k += 0.38


def biela_veza(G, M, obrys):
    """Biela veža: 8 podlaží s malými štvorcovými oknami, ustúpené horné podlažie, zábradlie a komíny."""
    VYSKA, HORNE = 23.6, 26.6
    n = len(obrys)
    vyklad(G, M, obrys, 0.0, PRIZEMIE, krok=2.0)
    for i in range(n):
        a, b = obrys[i], obrys[(i + 1) % n]
        G.stena(M['biela'], a, b, PRIZEMIE, VYSKA)
        L = dlzka(a, b)
        if L < 2.5:
            continue
        k = int(L // 2.0)
        z = PRIZEMIE + 0.9
        while z + 1.1 < VYSKA - 0.4:
            for j in range(k):
                t = (j + 0.5) / k
                p, q = bod_na(a, b, t - 0.55 / L, 0.02), bod_na(a, b, t + 0.55 / L, 0.02)
                G.stena(M['sklo'], p, q, z, z + 1.1)
            z += 2.75
    strecha(G, obrys, VYSKA, M['strecha'], M['biela'], atika=0.3)
    horne = odsad(obrys, -1.3)
    G.hranol(M['biela'], horne, VYSKA, HORNE, mat_vrch=M['strecha'])
    vo = odsad(horne, 0.03)
    for i in range(n):
        a, b = vo[i], vo[(i + 1) % n]
        if dlzka(a, b) > 3:
            G.stena(M['sklo'], bod_na(a, b, 0.1), bod_na(a, b, 0.9), VYSKA + 0.9, VYSKA + 2.3)
    # zábradlie na okraji terasy
    za = odsad(obrys, -0.2)
    G.pas(M['zabradlie'], za, VYSKA + 1.0, VYSKA + 1.06, 0.03, dnu=0.03)
    for i in range(n):
        a, b = za[i], za[(i + 1) % n]
        L = dlzka(a, b)
        for j in range(max(1, int(L / 1.5)) + 1):
            G.valec(M['zabradlie'], bod_na(a, b, j / max(1, int(L / 1.5))), 0.025, VYSKA, VYSKA + 1.0, seg=4)
    # komíny
    sx = sum(p[0] for p in horne) / len(horne)
    sy = sum(p[1] for p in horne) / len(horne)
    i0 = max(range(n), key=lambda i: dlzka(obrys[i], obrys[(i + 1) % n]))
    a, b = obrys[i0], obrys[(i0 + 1) % n]
    L = dlzka(a, b)
    ux, uy = (b[0] - a[0]) / L, (b[1] - a[1]) / L
    for s in (-0.35, 0.0, 0.3):
        G.kvader(M['komin'], (sx + ux * L * s, sy + uy * L * s), (ux, uy), 0.7, 0.7, HORNE, HORNE + 2.6)


def nizsia_budova(G, M, D, stred):
    """Dvojpodlažná budova: presklené prízemie, sklo jedálne, biely pás, strešná terasa, nadstavba a lávka."""
    prizemie = obrys_bl(cast(D, 'nizsia', '1389655499')['body'], stred, 0.3)
    poschodie = obrys_bl(cast(D, 'nizsia', '1389655498')['body'], stred, 0.3)
    nadstavba = obrys_bl(cast(D, 'nizsia', '243395275')['body'], stred, 0.2)
    lavka = obrys_bl(D['lavka']['body'], stred, 0.2)
    vyklad(G, M, odsad(prizemie, -0.8), 0.0, PRIZEMIE)
    G.vodorovna(M['biela'], prizemie, PRIZEMIE, hore=False)
    G.pas(M['biela'], prizemie, PRIZEMIE - 0.3, PRIZEMIE + 0.2, 0.0, dnu=0.8)
    for o in (poschodie, lavka):
        vyklad(G, M, o, PRIZEMIE + 0.2, 8.3, krok=1.8)
        n = len(o)
        for i in range(n):
            G.stena(M['biela'], o[i], o[(i + 1) % n], 8.3, 10.5)
        G.vodorovna(M['biela'], o, PRIZEMIE + 0.2, hore=False)
    strecha(G, poschodie, 10.5, M['strecha'], M['biela'], atika=0.25)
    G.vodorovna(M['strecha'], lavka, 10.5)
    # zábradlie strešnej terasy
    za = odsad(poschodie, -0.3)
    G.pas(M['zabradlie'], za, 11.6, 11.66, 0.03, dnu=0.03)
    # nadstavba
    G.hranol(M['biela'], nadstavba, 10.5, 15.2, mat_vrch=M['strecha'])
    vo = odsad(nadstavba, 0.02)
    n = len(vo)
    for i in range(n):
        G.stena(M['sklo'], bod_na(vo[i], vo[(i + 1) % n], 0.05), bod_na(vo[i], vo[(i + 1) % n], 0.95), 11.4, 13.6)
    return [prizemie, poschodie, lavka]


def relief(G, M, D, stred):
    b = [v_bl(p, stred) for p in D['relief']['body']]
    c = (sum(p[0] for p in b) / len(b), sum(p[1] for p in b) / len(b))
    i = max(range(len(b)), key=lambda i: dlzka(b[i], b[(i + 1) % len(b)]))
    a, q = b[i], b[(i + 1) % len(b)]
    L = dlzka(a, q)
    G.kvader(M['kamen'], c, ((q[0] - a[0]) / L, (q[1] - a[1]) / L), 3.4, 0.45, 0.0, 2.7)


def postav():
    D = data()
    M = m_prior()
    G = Geo()
    stred = stred_obrysu([(p[0], p[1]) for p in D['prior']['obrys']['body']])
    stred = (round(stred[0], 2), round(stred[1], 2))
    blok_o = obrys_bl(cast(D, 'prior', '1389655495')['body'], stred, 0.3)
    veza_o = obrys_bl(cast(D, 'prior', '1389655496')['body'], stred, 0.2)
    sklo_o = obrys_bl(cast(D, 'prior', '1389655497')['body'], stred, 0.3)
    # presklená podnož pod blokom (je zapustená za stĺpmi)
    vyklad(G, M, sklo_o, 0.0, PRIZEMIE)
    G.vodorovna(M['strecha'], sklo_o, PRIZEMIE)
    stlpy_pod_blokom(G, M, blok_o, Polygon(sklo_o).buffer(-0.4))
    blok(G, M, blok_o, stred)
    i_hodiny = hodiny(G, M, blok_o, stred, D['hodiny'])
    vetracie_lamely(G, M, blok_o, stred, i_hodiny)
    biela_veza(G, M, veza_o)
    nizsie = nizsia_budova(G, M, D, stred)
    relief(G, M, D, stred)
    info = {'stred': [stred[0], stred[1]], 'nazov': 'Obchodný dom na Kamennom námestí', 'dosah': 60,
            'nahradit': [[[round(x, 2), round(-y, 2)] for x, y in blok_o]]}
    # kolízie a náhrada budov z dlaždíc: presklená podnož (pod blokom medzi stĺpmi sa dá prejsť), veža, nižšia budova
    return G, [sklo_o, veza_o, odsad(nizsie[0], -0.8)] + nizsie[1:], VRCH_V + 6, 'obchodny-dom-kamenne', info


def postav_vsetky():
    return [postav]
