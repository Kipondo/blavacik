# Most Apollo (2005, Ing. M. Maťaščík / Dopravoprojekt): oceľový oblúk s dolnou mostovkou (tied arch),
# rozpätie 231 m, oblúk 36 m nad mostovkou, 66 závesov usporiadaných do vejára, šírka 32 m.
# Dva oblúkové rebrá sú sklonené k sebe a navrchu spojené priečnikmi, mostovku ťahajú okrajové
# nosníky (tiahla). Chodníky sú na konzolách mimo rovín závesov. Biely náter.

import math

from veze import Geo, svetlo
from spolocne import material
from mostne import (data_mosta, profil, tyc_x, zabradlie, lampa, pilier_rieka, nosnik, lano, kvader_xyz,
                    uloz_most, obdlznik_xy, komorovy_nosnik, piliere_pevniny)

ROZPATIE, VYSKA_OBLUKA, ZAVESOV = 231.0, 36.0, 33
Y_PATA, Y_VRCH = 12.8, 6.2       # vzdialenosť rebier od osi pri päte a vo vrchole


def postav():
    d = data_mosta('Most Apollo')
    L = d['L']
    POL = 16.0
    biela = material('ocel-biela', '#e6e9eb', drsnost=0.4, kov=0.45)
    biela_d = material('detail-ocel-biela', '#e6e9eb', drsnost=0.4, kov=0.45)
    lana = material('zavesy', '#dfe3e6', drsnost=0.35, kov=0.7)
    mostovka = material('mostovka', '#8f8c86', drsnost=0.9)
    beton = material('beton', '#aaa69d', drsnost=0.9)
    zabr = material('detail-zabradlie', '#c9ced1', drsnost=0.4, kov=0.6)
    lampy = material('detail-lampa', '#9aa0a4', drsnost=0.4, kov=0.6)
    svetla = svetlo('svetlo-lampy', '#fff2d0', 1.5)

    G = Geo()
    voda = (min(a for a, b in d['voda']), max(b for a, b in d['voda']))
    xc = (voda[0] + voda[1]) / 2
    x0, x1 = xc - ROZPATIE / 2, xc + ROZPATIE / 2

    # mostovka – oceľová ortotropná doska s konzolami chodníkov
    komorovy_nosnik(G, mostovka, 0, L, POL, 2.6, spodok=20.0, konzola=0.7, obrubnik=0.2, sirka_obrubnika=3.0)
    # tiahla (okrajové nosníky v rovinách závesov) nad riekou, mimo nich zábradlia na deliacich pásoch
    for s in (1, -1):
        tyc_x(G, biela, x0 - 6, x1 + 6, s * Y_PATA, -0.6, 1.5, 3.2)
        zabradlie(G, zabr, 0, L, s * (POL - 0.15), 0.2, vyska=1.15, krok_stlpika=2.0, priecky=(0.4, 0.8))
        zabradlie(G, zabr, 0, x0 - 6, s * Y_PATA, 0.0, vyska=0.9, krok_stlpika=3.0)
        zabradlie(G, zabr, x1 + 6, L, s * Y_PATA, 0.0, vyska=0.9, krok_stlpika=3.0)

    # oblúkové rebrá (parabola, sklonené k sebe)
    N = 40
    def rebro(t, s):
        h = 4 * t * (1 - t)
        return (x0 + ROZPATIE * t, s * (Y_PATA + (Y_VRCH - Y_PATA) * h), 1.0 + VYSKA_OBLUKA * h)
    for s in (1, -1):
        for k in range(N):
            a, b = rebro(k / N, s), rebro((k + 1) / N, s)
            hr = 1 - abs(k / N - 0.5) * 2
            nosnik(G, biela, a, b, 2.2, 3.6 - 1.0 * hr, hore=(0, 0, 1))
        # päty oblúka – oceľové uzly na pilieroch
        for x in (x0, x1):
            G.hranol(biela, obdlznik_xy(x, s * Y_PATA, 9.0, 3.4), -2.4, 2.2)
    # priečniky a kríže medzi rebrami vo vrchnej časti
    prv = None
    for k in range(6, N - 5, 4):
        t = k / N
        a, b = rebro(t, 1), rebro(t, -1)
        nosnik(G, biela, a, b, 1.2, 1.5)
        if prv:
            pa, pb = prv
            nosnik(G, biela_d, pa, b, 0.6, 0.6)
            nosnik(G, biela_d, pb, a, 0.6, 0.6)
        prv = (a, b)
    # závesy do vejára (smerom ku koncom sa nakláňajú)
    for s in (1, -1):
        for k in range(ZAVESOV):
            t = (k + 1) / (ZAVESOV + 1)
            hore = rebro(t, s)
            xd = xc + (hore[0] - xc) * 0.86
            lano(G, lana, (hore[0], hore[1], hore[2] - 1.2), (xd, s * Y_PATA, 1.0), r=0.09)
    # piliere: dva mohutné riečne pod pätami oblúka, estakády
    kolizie = []
    for x in (x0, x1):
        pilier_rieka(G, beton, beton, x, -2.6, 2 * POL + 4.0, 7.0, z_dole=-30.0)
        kolizie.append(obdlznik_xy(x, 0, 7.0, 2 * POL + 4.0))
    piliere_pevniny(G, beton, 0, x0, 42.0, -2.6, 2 * POL)
    piliere_pevniny(G, beton, x1, L, 42.0, -2.6, 2 * POL)
    # lampy na deliacich pásoch pri tiahlach
    for s in (1, -1):
        x = 10.0
        while x < L - 5:
            lampa(G, lampy, svetla, x, s * (Y_PATA - 1.4), 0.0, vyska=9.0, rameno=1.6, smer=-s)
            x += 33.0
    return G, d, kolizie


def main():
    G, d, kolizie = postav()
    uloz_most(G, 'most-apollo', d, kolizie)
