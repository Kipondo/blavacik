# Starý most (1890, nová oceľová konštrukcia 2016): priehradový most pre električku, chodcov a cyklistov,
# ~465 m. Nad Dunajom polia s priehradovými nosníkmi so zakriveným horným pásom (ako pôvodný most),
# zvislice a diagonály, horné priečne stužidlá s krížmi; zeleno-sivý náter (vybraný v ankete 2014).
# Kamenné riečne piliere so zaoblenými čelami, po bokoch konzolové chodníky so zábradlím.

import math

from veze import Geo, svetlo
from spolocne import material
from mostne import (data_mosta, profil, tyc_x, zabradlie, lampa, pilier_rieka, nosnik, kvader_xyz, uloz_most,
                    obdlznik_xy, komorovy_nosnik, piliere_pevniny)


def postav():
    d = data_mosta('Starý most')
    L = d['L']
    POL = d['sirka'] / 2
    Y_N = POL + 0.55                        # os priehradových nosníkov

    ocel = material('ocel-zelenosiva', '#6f8379', drsnost=0.5, kov=0.45)
    ocel_d = material('detail-ocel-zelenosiva', '#6f8379', drsnost=0.5, kov=0.45)
    kamen = material('kamen-piliera', '#a49d90', drsnost=0.85)
    beton = material('beton', '#a9a59c', drsnost=0.9)
    mostovka = material('mostovka', '#8d8a84', drsnost=0.9)
    zabr = material('detail-zabradlie', '#5f7168', drsnost=0.5, kov=0.5)
    lampy = material('detail-lampa', '#55605a', drsnost=0.5, kov=0.5)
    svetla = svetlo('svetlo-lampy', '#fff2d0', 1.5)

    G = Geo()
    s0 = min(a for a, b in d['voda']) - 8
    s1 = max(b for a, b in d['voda']) + 8
    # polia nad riekou (širšie plavebné pole v strede)
    podiely = [0.2, 0.3, 0.28, 0.22]
    hranice = [s0]
    for p in podiely:
        hranice.append(hranice[-1] + p * (s1 - s0))

    # mostovka – oceľový rošt s betónovou doskou, obrubníky; konzolové chodníky mimo nosníkov
    komorovy_nosnik(G, mostovka, 0, L, POL, 1.3, spodok=2 * POL - 1.0, konzola=0.6, obrubnik=0.18)
    for s in (1, -1):
        y0, y1 = sorted((s * (Y_N + 0.45), s * (Y_N + 2.9)))
        profil(G, mostovka, s0 - 4, s1 + 4, [(y0, -0.35), (y1, -0.35), (y1, -0.05), (y0, -0.05)], uzavriet=True)
        zabradlie(G, zabr, s0 - 4, s1 + 4, s * (Y_N + 2.8), -0.05, vyska=1.15, krok_stlpika=2.0, priecky=(0.4, 0.8))
        zabradlie(G, zabr, 0, s0 - 4, s * (POL - 0.2), 0.18, vyska=1.1, krok_stlpika=2.5)
        zabradlie(G, zabr, s1 + 4, L, s * (POL - 0.2), 0.18, vyska=1.1, krok_stlpika=2.5)

    # priehradové nosníky v každom poli
    for a, b in zip(hranice[:-1], hranice[1:]):
        dl = b - a
        n = max(6, round(dl / 7.5))
        def vyska(t):
            return 5.5 + 6.5 * math.sin(math.pi * t) ** 0.85
        for s in (1, -1):
            y = s * Y_N
            body_d = [(a + dl * k / n, -0.3) for k in range(n + 1)]
            body_h = [(a + dl * k / n, vyska(k / n)) for k in range(n + 1)]
            # dolný a horný pás
            for k in range(n):
                nosnik(G, ocel, (body_d[k][0], y, -0.3), (body_d[k + 1][0], y, -0.3), 0.75, 1.0)
                nosnik(G, ocel, (body_h[k][0], y, body_h[k][1]), (body_h[k + 1][0], y, body_h[k + 1][1]), 0.8, 0.85)
            # koncové šikmé stojky (portál), zvislice a diagonály (Prattova sústava)
            for k in range(n + 1):
                if 0 < k < n:
                    nosnik(G, ocel_d, (body_d[k][0], y, -0.3), (body_h[k][0], y, body_h[k][1] - 0.4), 0.5, 0.45, hore=(1, 0, 0))
            for k in range(n):
                if k < n / 2:
                    p, q = body_h[k], body_d[k + 1]
                else:
                    p, q = body_h[k + 1], body_d[k]
                nosnik(G, ocel_d, (p[0], y, p[1] - 0.3), (q[0], y, q[1]), 0.45, 0.4, hore=(0, 1, 0))
        # horné priečne stužidlá a kríže, kde je dosť výšky nad električkou
        prvy = None
        for k in range(n + 1):
            x, h = a + dl * k / n, vyska(k / n)
            if h < 8.0:
                continue
            nosnik(G, ocel, (x, Y_N, h), (x, -Y_N, h), 0.45, 0.6)
            if prvy is not None:
                px, ph = prvy
                nosnik(G, ocel_d, (px, Y_N, ph), (x, -Y_N, h), 0.25, 0.25, hore=(0, 0, 1))
                nosnik(G, ocel_d, (px, -Y_N, ph), (x, Y_N, h), 0.25, 0.25, hore=(0, 0, 1))
            prvy = (x, h)
    # kamenné riečne piliere (aj krajné opory nad brehom)
    kolizie = []
    for x in hranice:
        pilier_rieka(G, kamen, kamen, x, -1.35, 2 * Y_N + 9.0, 4.2, z_dole=-30.0)
        kolizie.append(obdlznik_xy(x, 0, 4.2, 2 * Y_N + 9.0))
    # estakády na brehoch
    piliere_pevniny(G, beton, 0, s0, 28.0, -1.35, 2 * POL)
    piliere_pevniny(G, beton, s1, L, 28.0, -1.35, 2 * POL)
    # lampy na chodníkoch
    for s in (1, -1):
        x = s0 + 6
        while x < s1:
            lampa(G, lampy, svetla, x, s * (Y_N + 2.6), -0.05, vyska=5.0, rameno=0.6, smer=s)
            x += 25.0
    return G, d, kolizie


def main():
    G, d, kolizie = postav()
    uloz_most(G, 'stary-most', d, kolizie)
