# Prístavný most (1985): dvojpodlažný cestno-železničný most cez Dunaj. Údaje a zdroje: napady/pamiatky-podklady.md,
# „Mosty cez Dunaj“.
#   – hore diaľnica D1 (~30 m: 2 + 2 pruhy s odstavnými, stredný pás ~5 m so stožiarmi osvetlenia),
#   – oceľový hlavný most ~461 m (od petržalského brehu po prístavný pozemok za vjazdom do Zimného prístavu),
#     priehradové nosníky sústavy Warren bez zvislíc ~9,5 m vysoké, panely ~12,75 m; jediný pilier v Dunaji ~140 m
#     od petržalského brehu (polia ~140 + 240 + 85 m – odhad),
#   – dolné podlažie: dve elektrifikované koľaje medzi nosníkmi, chodník (proti prúdu) a cyklotrasa (po prúde) pod
#     okrajmi hornej mostovky,
#   – estakády na oboch brehoch: dva samostatné betónové komorové nosníky na osemhranných stĺpoch s rozšírenou hlavou,
#   – neutrálne sivý náter (~#9a9c9a); vozovka z laseru DMP 157,3 → 159,5 nad riekou → 154,6.

from veze import Geo, svetlo
from spolocne import material
from mostne import (data_mosta, profil, tyc_x, zabradlie, lampa, nosnik, uloz_most, obdlznik_xy, ohni_podla_profilu,
                    zem_modelu, kvader_xyz)

POL = 15.0
Y_N = 7.0                 # roviny priehradových nosníkov
HLBKA = 9.5               # výška priehrady
PANEL = 12.75
Z_HOR = -1.4              # os horného pásu pod doskou diaľnice
Z_DOL = Z_HOR - HLBKA     # os dolného pásu (podlaha železnice)


def postav():
    d = data_mosta('Prístavný most')
    L = d['L']
    voda = d['voda']
    breh_pz = min(a for a, b in voda)                   # petržalský breh (začiatok oceľového mosta)
    s0 = breh_pz - 2.0
    s1 = s0 + 461.0
    rieka = s0 + 140.0                                   # jediný pilier v Dunaji
    pilier3 = s1 - 85.0
    ocel = material('ocel-siva', '#9a9c9a', drsnost=0.5, kov=0.45)
    ocel_d = material('detail-ocel-siva', '#9a9c9a', drsnost=0.5, kov=0.45)
    mostovka = material('mostovka', '#8f8c86', drsnost=0.9)
    beton = material('beton', '#aaa69d', drsnost=0.9)
    strk = material('strk-kolajiska', '#6b645b', drsnost=1.0)
    kolajnica = material('detail-kolajnica', '#6c6660', drsnost=0.35, kov=0.8)
    zabr = material('detail-zabradlie', '#b3b9bd', drsnost=0.45, kov=0.6)
    lampy = material('detail-lampa', '#9aa0a4', drsnost=0.4, kov=0.6)
    svetla = svetlo('svetlo-lampy', '#fff2d0', 1.5)

    G = Geo()
    kolizie = []
    # --- horná doska diaľnice po celej dĺžke ---
    profil(G, mostovka, 0, L, [(-POL, -1.0), (POL, -1.0), (POL, 0.3), (POL - 0.6, 0.3), (POL - 0.6, -0.03),
                              (-POL + 0.6, -0.03), (-POL + 0.6, 0.3), (-POL, 0.3)], uzavriet=True)
    for s in (1, -1):
        tyc_x(G, ocel, 0, L, s * (POL + 0.05), -0.5, 0.15, 0.9)
        zabradlie(G, zabr, 0, L, s * (POL - 0.3), 0.3, vyska=1.1, krok_stlpika=2.5, priecky=(0.5,))
        tyc_x(G, zabr, 0, L, s * 2.2, 0.7, 0.1, 0.35)                     # zvodidlá v strednom páse
    x = 12.0
    while x < L - 5:
        lampa(G, lampy, svetla, x, 0.0, 0.0, vyska=11.0, rameno=2.0, smer=1)
        lampa(G, lampy, svetla, x, 0.0, 0.0, vyska=11.0, rameno=2.0, smer=-1)
        x += 38.0

    # --- estakády: dva komorové nosníky pod doskou ---
    for a, b in ((0.0, s0), (s1, L)):
        for s in (1, -1):
            yk = s * 7.5
            profil(G, beton, a, b, [(yk - 3.2, -3.4), (yk + 3.2, -3.4), (yk + 4.2, -1.0), (yk - 4.2, -1.0)], uzavriet=True)
    for a, b in ((4.0, s0 - 4), (s1 + 4, L - 4)):
        n = max(1, round((b - a) / 33.0))
        for i in range(n + 1):
            x = a + (b - a) * i / n
            zem = zem_modelu(d, x)
            for s in (1, -1):
                G.valec(beton, (x, s * 7.5), 1.0, zem - 2.0, -4.4, seg=8)
                G.hranol(beton, obdlznik_xy(x, s * 7.5, 2.6, 4.6), -4.4, -3.4)
                kolizie.append(obdlznik_xy(x, s * 7.5, 2.2, 2.2))

    # --- oceľový hlavný most: Warren bez zvislíc, železnica na dolnom podlaží ---
    n = max(4, round((s1 - s0) / PANEL))
    dl = (s1 - s0) / n
    for s in (1, -1):
        y = s * Y_N
        tyc_x(G, ocel, s0, s1, y, Z_HOR, 0.9, 1.1)
        tyc_x(G, ocel, s0, s1, y, Z_DOL, 0.9, 1.3)
        for k in range(n):
            a, b = s0 + k * dl, s0 + (k + 1) * dl
            m = (a + b) / 2
            nosnik(G, ocel_d, (a, y, Z_DOL + 0.5), (m, y, Z_HOR - 0.4), 0.7, 0.6, hore=(0, 1, 0))
            nosnik(G, ocel_d, (m, y, Z_HOR - 0.4), (b, y, Z_DOL + 0.5), 0.7, 0.6, hore=(0, 1, 0))
    # priečniky hore (pod doskou) a dole (pod koľajiskom), konzoly dolných chodníkov
    for k in range(n + 1):
        x = s0 + k * dl
        nosnik(G, ocel, (x, Y_N, Z_DOL), (x, -Y_N, Z_DOL), 0.5, 1.0)
        nosnik(G, ocel_d, (x, POL - 1, Z_HOR), (x, -POL + 1, Z_HOR), 0.4, 0.8)
    profil(G, strk, s0, s1, [(-Y_N + 0.5, Z_DOL + 0.4), (Y_N - 0.5, Z_DOL + 0.4), (Y_N - 0.5, Z_DOL + 0.8), (-Y_N + 0.5, Z_DOL + 0.8)],
           uzavriet=True)
    for yk in (-2.2, 2.2):
        for r in (-0.72, 0.72):
            tyc_x(G, kolajnica, s0, s1, yk + r, Z_DOL + 0.9, 0.07, 0.15)
    for s in (1, -1):
        a, b = sorted((s * (Y_N + 0.6), s * (Y_N + 3.6)))
        profil(G, mostovka, s0, s1, [(a, Z_DOL + 0.3), (b, Z_DOL + 0.3), (b, Z_DOL + 0.6), (a, Z_DOL + 0.6)], uzavriet=True)
        zabradlie(G, zabr, s0, s1, s * (Y_N + 3.6), Z_DOL + 0.6, vyska=1.2, krok_stlpika=2.5, priecky=(0.5,))
    # piliere: breh, rieka, pri Zimnom prístave, koniec ocele
    for x in (s0, rieka, pilier3, s1):
        zem = min(zem_modelu(d, x), Z_DOL - 6.0)
        G.hranol(beton, [(x - 3, -10), (x + 3, -10), (x + 4.5, 0), (x + 3, 10), (x - 3, 10), (x - 4.5, 0)], zem - 20.0, Z_DOL - 0.65)
        kolizie.append(obdlznik_xy(x, 0, 9.0, 20.0))
    return G, d, kolizie


def main():
    G, d, kolizie = postav()
    uloz_most(G, 'pristavny-most', d, kolizie)
