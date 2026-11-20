# Most SNP (1972, A. Tesár, J. Lacko, L. Kušnír, I. Slameň): asymetrický zavesený most s jedným pylónom
# na petržalskom brehu, polia 74,8 + 303 + 54 m, mostovka 21 m (oceľový komorový nosník, hĺbka 4,6 m).
# Dve nohy pylónu (84,6 m) obkročujú mostovku, sú sklonené k Petržalke a nesú reštauráciu „UFO“.
# Hlavné pole visí na lanách v troch bodoch, zadné laná kotvia za pylónom. Chodci a cyklisti chodia
# po dolnom podlaží – chodníkoch pod konzolami mostovky.

import math

from veze import Geo, svetlo
from spolocne import material
from mostne import (data_mosta, lokalne, profil, tyc_x, zabradlie, lampa, pilier_rieka, rotacne, nosnik,
                    lano, kvader_xyz, uloz_most, obdlznik_xy)

PYLON = (-231.0, 738.0)        # päta pylónu (data/mapa/pamiatky.json)
POL = 10.75                    # polovica šírky mostovky


def postav():
    d = data_mosta('Most SNP')
    L = d['L']
    s_p, _ = lokalne(d, *PYLON)

    ocel = material('ocel-mosta', '#c4c9cc', drsnost=0.45, kov=0.55)
    ocel_t = material('ocel-tmava', '#9ea4a8', drsnost=0.5, kov=0.5)
    pylon_m = material('ocel-pylonu', '#cdd2d5', drsnost=0.35, kov=0.65)
    ufo_m = material('ufo-plech', '#d9dddf', drsnost=0.35, kov=0.35)
    sklo_ufo = material('sklo-ufo', '#5d7480', drsnost=0.05, kov=0.85)
    lano_m = material('lana', '#e3e6e8', drsnost=0.35, kov=0.7)
    beton = material('beton', '#a9a59c', drsnost=0.9)
    dlazba = material('chodnik', '#8f8b84', drsnost=0.9)
    zabr = material('detail-zabradlie', '#b9bfc3', drsnost=0.4, kov=0.6)
    lampy = material('detail-lampa', '#8e9498', drsnost=0.4, kov=0.6)
    svetla = svetlo('svetlo-lampy', '#fff2d0', 1.5)
    cervena = svetlo('svetlo-cervene', '#ff2a1a', 6.0)

    G = Geo()
    # --- mostovka: komorový nosník s konzolami, obrubníky, chodníky dolného podlažia ---
    x0, x1 = 0.0, L
    profil(G, ocel, x0, x1, [(-5.5, -4.6), (5.5, -4.6), (7.2, -0.9), (POL, -0.9), (POL, 0.25), (POL - 0.5, 0.25),
                             (POL - 0.5, -0.03), (-POL + 0.5, -0.03), (-POL + 0.5, 0.25), (-POL, 0.25), (-POL, -0.9),
                             (-7.2, -0.9)], uzavriet=True)
    # rímsa – tmavšia linka na čele konzoly
    for s in (1, -1):
        tyc_x(G, ocel_t, x0, x1, s * (POL + 0.05), -0.35, 0.12, 0.5)
    # dolné podlažie: podlaha chodníka, vonkajšie zábradlie až po konzolu, vnútorné madlo pri stene
    for s in (1, -1):
        y_in, y_out = s * 5.7, s * (POL - 0.35)
        a, b = sorted((y_in, y_out))
        profil(G, dlazba, x0 + 6, x1 - 6, [(a, -4.2), (b, -4.2), (b, -3.9), (a, -3.9)], uzavriet=True)
        zabradlie(G, zabr, x0 + 6, x1 - 6, y_out, -3.9, vyska=2.95, krok_stlpika=2.5, priecky=(0.5, 1.1, 1.9))
    # zábradlie hore na obrubníkoch a lampy
    for s in (1, -1):
        zabradlie(G, zabr, x0, x1, s * (POL - 0.25), 0.25, vyska=1.0, krok_stlpika=3.0, priecky=(0.55,))
        x = 18.0
        while x < L - 10:
            if abs(x - s_p - 5) > 14:
                lampa(G, lampy, svetla, x, s * (POL - 0.3), 0.25, vyska=10.0, rameno=1.8, smer=-s)
            x += 36.0

    # --- pilier na staromestskej strane (koniec hlavného poľa) ---
    s_pilier = s_p - 303.0
    kolizie = []
    if s_pilier > 4:
        pilier_rieka(G, beton, beton, s_pilier, -4.6, 13.0, 3.6)
        kolizie.append(obdlznik_xy(s_pilier, 0, 3.6, 13.0))

    # --- pylón: dve nohy obkročujú mostovku, sklon k Petržalke, zbiehajú sa pod UFO ---
    VRCH = 74.5
    x_vrch = s_p + 17.0
    for s in (1, -1):
        pata = (s_p - 4.0, s * 13.6, -14.0)
        vrch = (x_vrch, s * 2.4, VRCH)
        nosnik(G, pylon_m, pata, vrch, 3.2, 5.6, 2.2, 3.4, hore=(1, 0, 0))
        kolizie.append(obdlznik_xy(s_p - 4.0 + 0.24 * 14, s * 13.0, 6.0, 4.0))
    # priečnik pod mostovkou
    def na_nohe(z, s):
        t = (z + 14.0) / (VRCH + 14.0)
        return (s_p - 4.0 + (x_vrch - s_p + 4.0) * t, s * (13.6 + (2.4 - 13.6) * t), z)
    nosnik(G, pylon_m, na_nohe(-6.2, 1), na_nohe(-6.2, -1), 3.0, 2.6)
    nosnik(G, pylon_m, na_nohe(VRCH - 9, 1), na_nohe(VRCH - 9, -1), 1.6, 1.8)

    # --- UFO: tanier s presklenou reštauráciou a vyhliadkou navrchu ---
    c = (x_vrch, 0.0)
    rotacne(G, ufo_m, c, [(2.6, VRCH - 0.5), (8.5, VRCH + 2.1), (12.9, VRCH + 4.2), (14.6, VRCH + 5.6)], seg=40)
    rotacne(G, sklo_ufo, c, [(14.6, VRCH + 5.6), (15.0, VRCH + 7.0), (14.6, VRCH + 8.4)], seg=40)
    rotacne(G, ufo_m, c, [(14.6, VRCH + 8.4), (14.8, VRCH + 8.8), (13.6, VRCH + 9.0)], seg=40)
    rotacne(G, dlazba, c, [(13.6, VRCH + 9.0), (3.6, VRCH + 9.0)], seg=40)
    G.vodorovna(ufo_m, [(c[0] + 2.6 * math.cos(2 * math.pi * k / 24), c[1] + 2.6 * math.sin(2 * math.pi * k / 24))
                        for k in range(24)], VRCH - 0.5, hore=False)
    for k in range(48):
        a = 2 * math.pi * k / 48
        kvader_xyz(G, zabr, c[0] + 13.3 * math.cos(a), c[1] + 13.3 * math.sin(a), VRCH + 9.0, VRCH + 10.1, 0.08, 0.08)
    prst = [(c[0] + 13.3 * math.cos(2 * math.pi * k / 48), c[1] + 13.3 * math.sin(2 * math.pi * k / 48)) for k in range(48)]
    G.pas(zabr, prst, VRCH + 10.0, VRCH + 10.1, von=0.04, dnu=0.04)
    G.valec(ufo_m, c, 3.6, VRCH + 9.0, VRCH + 12.0, seg=20)
    G.valec(ufo_m, c, 0.5, VRCH + 12.0, VRCH + 19.0, seg=8, r1=0.18)
    G.kvader(cervena, c, (1, 0), 0.4, 0.4, VRCH + 19.0, VRCH + 19.4)

    # --- laná: hlavné pole v troch bodoch, zadné kotvenie za pylónom ---
    for s in (1, -1):
        for k, (dx, zk) in enumerate(((92.0, VRCH - 10.5), (168.0, VRCH - 7.0), (244.0, VRCH - 3.5))):
            hore = na_nohe(zk, s)
            for o in (-0.45, 0.45):
                dole = (s_p - dx + o, s * (POL - 0.6), 0.6)
                lano(G, lano_m, (hore[0] + o, hore[1], hore[2]), dole, r=0.14)
            # kotvenie na mostovke
            kvader_xyz(G, ocel_t, s_p - dx, s * (POL - 0.6), 0.25, 1.1, 2.2, 0.8)
        for k, (dx, zk) in enumerate(((30.0, VRCH - 10.5), (38.0, VRCH - 7.0), (46.0, VRCH - 3.5))):
            hore = na_nohe(zk, s)
            for o in (-0.45, 0.45):
                lano(G, lano_m, (hore[0] + o, hore[1], hore[2]), (s_p + dx + o, s * (POL + 1.2), 1.4), r=0.14)
    # kotevné bloky zadných lán po bokoch cesty (za koncom mosta, na petržalskom brehu)
    for s in (1, -1):
        G.hranol(beton, obdlznik_xy(s_p + 38.0, s * (POL + 1.2), 22.0, 3.4), -12.0, 1.4)
        kolizie.append(obdlznik_xy(s_p + 38.0, s * (POL + 1.2), 22.0, 3.4))
    vystrazne = [(x_vrch, 0.0)]
    return G, d, kolizie, vystrazne


def main():
    G, d, kolizie, _ = postav()
    uloz_most(G, 'most-snp', d, kolizie)
