# Prístavný most (1985): dvojpodlažný cestno-železničný most, hore diaľnica D1, dole železnica.
# Oceľový priehradový nosník sústavy Warren (bez zvislíc) pod mostovkou, betónové riečne piliere,
# hlavný most ~600 m. Modrosivý náter, na diaľnici zvodidlá a lampy.

from veze import Geo, svetlo
from spolocne import material
from mostne import (data_mosta, profil, tyc_x, zabradlie, lampa, pilier_rieka, nosnik, uloz_most, obdlznik_xy,
                    piliere_pevniny)

HLBKA, POLE = 7.0, 11.0


def postav():
    d = data_mosta('Prístavný most')
    L = d['L']
    POL = d['sirka'] / 2
    Y_N = POL - 3.5
    ocel = material('ocel-modrosiva', '#7d8e9a', drsnost=0.5, kov=0.45)
    ocel_d = material('detail-ocel-modrosiva', '#7d8e9a', drsnost=0.5, kov=0.45)
    mostovka = material('mostovka', '#8f8c86', drsnost=0.9)
    beton = material('beton', '#aaa69d', drsnost=0.9)
    zabr = material('detail-zabradlie', '#b3b9bd', drsnost=0.45, kov=0.6)
    lampy = material('detail-lampa', '#9aa0a4', drsnost=0.4, kov=0.6)
    svetla = svetlo('svetlo-lampy', '#fff2d0', 1.5)

    G = Geo()
    # horná doska (diaľnica) s rímsou
    profil(G, mostovka, 0, L, [(-POL, -1.0), (POL, -1.0), (POL, 0.3), (POL - 0.6, 0.3), (POL - 0.6, -0.03),
                              (-POL + 0.6, -0.03), (-POL + 0.6, 0.3), (-POL, 0.3)], uzavriet=True)
    for s in (1, -1):
        tyc_x(G, ocel, 0, L, s * (POL + 0.05), -0.5, 0.15, 0.9)
        zabradlie(G, zabr, 0, L, s * (POL - 0.3), 0.3, vyska=1.1, krok_stlpika=2.5, priecky=(0.5,))
    s0 = min(a for a, b in d['voda']) - 6
    s1 = max(b for a, b in d['voda']) + 6
    # priehradové nosníky Warren pod doskou + dolná doska železnice
    n = max(4, round((s1 - s0) / POLE))
    dl = (s1 - s0) / n
    for s in (1, -1):
        y = s * Y_N
        tyc_x(G, ocel, s0, s1, y, -1.6, 0.9, 1.2)
        tyc_x(G, ocel, s0, s1, y, -1.0 - HLBKA, 0.9, 1.2)
        for k in range(n):
            a, b = s0 + k * dl, s0 + (k + 1) * dl
            m = (a + b) / 2
            nosnik(G, ocel_d, (a, y, -1.0 - HLBKA), (m, y, -1.6), 0.6, 0.5, hore=(0, 1, 0))
            nosnik(G, ocel_d, (m, y, -1.6), (b, y, -1.0 - HLBKA), 0.6, 0.5, hore=(0, 1, 0))
    for k in range(0, n + 1, 2):
        x = s0 + k * dl
        nosnik(G, ocel, (x, Y_N, -1.0 - HLBKA), (x, -Y_N, -1.0 - HLBKA), 0.5, 0.7)
    profil(G, mostovka, s0, s1, [(-Y_N, -HLBKA - 0.7), (Y_N, -HLBKA - 0.7), (Y_N, -HLBKA - 0.3), (-Y_N, -HLBKA - 0.3)],
           uzavriet=True)
    # riečne piliere každých ~100 m, estakády
    kolizie = []
    pocet = max(2, round((s1 - s0) / 100))
    for i in range(pocet + 1):
        x = s0 + (s1 - s0) * i / pocet
        pilier_rieka(G, beton, beton, x, -1.0 - HLBKA - 0.6, 2 * Y_N + 6, 5.0, z_dole=-35.0)
        kolizie.append(obdlznik_xy(x, 0, 5.0, 2 * Y_N + 6))
    piliere_pevniny(G, beton, 0, s0, 36.0, -1.0, 2 * POL)
    piliere_pevniny(G, beton, s1, L, 36.0, -1.0, 2 * POL)
    for s in (1, -1):
        x = 15.0
        while x < L - 5:
            lampa(G, lampy, svetla, x, s * (POL - 0.4), 0.3, vyska=11.0, rameno=2.0, smer=-s)
            x += 40.0
    return G, d, kolizie


def main():
    G, d, kolizie = postav()
    uloz_most(G, 'pristavny-most', d, kolizie)
