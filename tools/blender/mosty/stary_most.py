# Starý most (1890, nová oceľová konštrukcia 2016 – Alfa 04, Eurovia CS): spojitý priehradový most s dolnou mostovkou
# pre dvojkoľajnú električku, chodcov a cyklistov. Údaje a zdroje: napady/pamiatky-podklady.md, „Mosty cez Dunaj“.
#   – 465,4 m, polia 32,56 + 106,68 + 137,16 + 75,60 + 75,92 + 32,56 m; opora 1 (Staré Mesto), piliere P2 (dolné
#     nábrežie), P34 a P5 (rieka), P6 (petržalský breh), P7 (Tyršovo nábrežie), opora 8,
#   – hlavné nosníky 11,0 m od seba, kosoštvorcová (rombická) priehrada konštantnej výšky 11,285 m od P2 po P7,
#     panely ~7,8 m, diagonály sa krížia v strednej výške pri každom priečniku; krajné polia len 2,5 m vysoké,
#   – nad P2 a P7 portály, horné vetrové stužidlo v úrovni horných pásov,
#   – koľajisko 8,0 m medzi zvodidlami, mimo nosníkov na konzolách cyklopruh (zelený) a chodník (3 m) – spolu 5 m,
#     zábradlie 1,3 m, nad P34 a P5 vyhliadkové terasy (+5,5 m na každú stranu),
#   – niveleta vo vypuklom oblúku R = 5600 m (vrchol 148,6 m n. m.) – model sa ohne podľa profilu (mostne.py),
#   – vonkajšie plochy zelené, vnútorné a stužidlá svetlosivé; kamenné piliere (vápenec, žula pri vode).

from veze import Geo
from spolocne import material
from mostne import (data_mosta, profil, tyc_x, zabradlie, pilier_rieka, nosnik, kvader_xyz, uloz_most,
                    obdlznik_xy, opora, bocne_steny_nasypu, zem_modelu)

Y_N = 5.5            # os hlavného nosníka od osi mosta
H = 11.285           # celková výška priehrady
Z_DOL = -0.6         # os dolného pásu (mostovka koľajiska je na úrovni dolného pásu)
Z_HOR = Z_DOL + H - 0.45 - 0.375   # os horného pásu


def postav():
    d = data_mosta('Starý most')
    L = d['L']
    p8, p7, p6, p5, p34, p2 = 0.0, *d['piliere']
    o1 = p2 + 34.8                        # opora 1 (Staré Mesto), za ňou násyp rampy po L
    zelena = material('ocel-zelena', '#5a9450', drsnost=0.5, kov=0.4)
    zelena_d = material('detail-ocel-zelena', '#5a9450', drsnost=0.5, kov=0.4)
    siva = material('ocel-svetlosiva', '#c0c0c4', drsnost=0.45, kov=0.4)
    siva_d = material('detail-ocel-svetlosiva', '#c0c0c4', drsnost=0.45, kov=0.4)
    hrany = material('ocel-siva-tmava', '#7a7f7e', drsnost=0.5, kov=0.4)
    kamen = material('kamen-piliera', '#c8c0b0', drsnost=0.85)
    zula = material('zula-piliera', '#9a968e', drsnost=0.85)
    doska = material('mostovka-kolajisko', '#b5a996', drsnost=0.9)
    cyklo = material('cyklopruh', '#49604c', drsnost=0.85)
    chodnik = material('chodnik', '#75767a', drsnost=0.85)
    beton = material('beton', '#a9a59c', drsnost=0.9)
    zabr = material('detail-zabradlie', '#5a9450', drsnost=0.5, kov=0.4)

    G = Geo()
    kolizie = []

    # --- mostovka koľajiska (medzi nosníkmi) a konzoly s chodníkmi po celej dĺžke oceľovej konštrukcie ---
    profil(G, doska, p8, o1, [(-Y_N + 0.3, -1.1), (Y_N - 0.3, -1.1), (Y_N - 0.3, 0.0), (-Y_N + 0.3, 0.0)], uzavriet=True)
    for s in (1, -1):
        # zvýšený obrubník so zvodidlom pri nosníku
        a, b = sorted((s * 4.0, s * (Y_N - 0.3)))
        profil(G, beton, p8, o1, [(a, 0.0), (b, 0.0), (b, 0.4), (a, 0.4)], uzavriet=True)
        tyc_x(G, siva_d, p8, o1, s * 4.15, 0.95, 0.08, 0.32)
        # konzola: cyklopruh pri nosníku, chodník vonku, lemovací nosník po okraji
        yc0, yc1 = sorted((s * (Y_N + 0.4), s * (Y_N + 1.9)))
        yd0, yd1 = sorted((s * (Y_N + 1.9), s * (Y_N + 5.0)))
        profil(G, cyklo, p8, o1, [(yc0, 0.05), (yc1, 0.05), (yc1, 0.25), (yc0, 0.25)], uzavriet=True)
        profil(G, chodnik, p8, o1, [(yd0, 0.05), (yd1, 0.05), (yd1, 0.25), (yd0, 0.25)], uzavriet=True)
        tyc_x(G, hrany, p8, o1, s * (Y_N + 5.15), -0.4, 0.3, 1.3)
        # spodok konzol (priečne priehradové konzoly zjednodušene ako šikmá plocha)
        y_out = s * (Y_N + 5.0)
        profil(G, hrany, p8, o1, [(s * (Y_N + 0.3), -1.6), (y_out, -0.9), (y_out, -0.85), (s * (Y_N + 0.3), -1.55)] if s > 0 else
               [(y_out, -0.9), (s * (Y_N + 0.3), -1.6), (s * (Y_N + 0.3), -1.55), (y_out, -0.85)], uzavriet=True)
        zabradlie(G, zabr, p8, o1, s * (Y_N + 5.05), 0.25, vyska=1.3, krok_stlpika=1.9, priecky=(0.15, 0.65))
        zabradlie(G, zabr, p8 + 36, o1 - 35, s * (Y_N + 0.45), 0.25, vyska=1.1, krok_stlpika=3.8, priecky=(0.5,))

    # --- vyhliadkové terasy nad P34 a P5 ---
    for x in (p34, p5):
        for s in (1, -1):
            a, b = sorted((s * (Y_N + 5.0), s * (Y_N + 10.5)))
            G.hranol(chodnik, [(x - 6, a), (x + 6, a), (x + 6, b), (x - 6, b)], -0.9, 0.25)
            yy = s * (Y_N + 10.55)
            zabradlie(G, zabr, x - 6, x + 6, yy, 0.25, vyska=1.3, krok_stlpika=1.9, priecky=(0.15, 0.65))

    # --- dolný pás po celej dĺžke, vysoká priehrada od P7 po P2, krajné polia nízke ---
    for s in (1, -1):
        y = s * Y_N
        tyc_x(G, zelena, p8, o1, y, Z_DOL, 0.6, 0.75)
        tyc_x(G, zelena, p8, p7, y, Z_DOL + 1.0, 0.6, 2.4)        # krajné polia: nízky plnostenný nosník
        tyc_x(G, zelena, p2, o1, y, Z_DOL + 1.0, 0.6, 2.4)
        tyc_x(G, zelena, p7, p2, y, Z_HOR, 0.6, 0.9)              # horný pás
    # rombická priehrada: panely ~7,8 m, X v strednej výške pri každom priečniku
    n = max(1, round((p2 - p7) / 7.8))
    pan = (p2 - p7) / n
    z0, z1 = Z_DOL + 0.35, Z_HOR - 0.4
    for s in (1, -1):
        y = s * Y_N
        for k in range(n + 1):
            x = p7 + pan * k
            a, b = max(p7, x - pan / 2), min(p2, x + pan / 2)
            za = z0 + (z1 - z0) * (a - (x - pan / 2)) / pan
            zb = z0 + (z1 - z0) * (b - (x - pan / 2)) / pan
            nosnik(G, zelena_d, (a, y, za), (b, y, zb), 0.4, 0.4, hore=(0, 1, 0))
            nosnik(G, zelena_d, (a, y, z0 + z1 - za), (b, y, z0 + z1 - zb), 0.4, 0.4, hore=(0, 1, 0))
        # koncové šikmé prvky nad P7 a P2 (horný pás vybieha nad pilier)
        nosnik(G, zelena, (p7 - 1.5, y, Z_DOL + 2.2), (p7 + pan * 0.5, y, Z_HOR), 0.6, 0.8, hore=(0, 1, 0))
        nosnik(G, zelena, (p2 + 1.5, y, Z_DOL + 2.2), (p2 - pan * 0.5, y, Z_HOR), 0.6, 0.8, hore=(0, 1, 0))
    # horné vetrové stužidlo: priečky v každom styčníku, kríž v každom paneli; portály nad P7 a P2
    for k in range(n + 1):
        x = p7 + pan * k
        nosnik(G, siva, (x, Y_N, Z_HOR), (x, -Y_N, Z_HOR), 0.35, 0.7)
        if k < n:
            nosnik(G, siva_d, (x, Y_N, Z_HOR + 0.2), (x + pan, -Y_N, Z_HOR + 0.2), 0.22, 0.22, hore=(0, 0, 1))
            nosnik(G, siva_d, (x, -Y_N, Z_HOR + 0.2), (x + pan, Y_N, Z_HOR + 0.2), 0.22, 0.22, hore=(0, 0, 1))
    for x in (p7 + pan * 0.6, p2 - pan * 0.6):
        G.hranol(siva, obdlznik_xy(x, 0, 0.5, 2 * Y_N), Z_HOR - 2.2, Z_HOR + 0.45)
    # priečniky pod koľajiskom (priehradové 1,3–2,6 m – zjednodušene plnostenné)
    for k in range(int((o1 - p8) / 7.8) + 1):
        x = p8 + 7.8 * k
        kvader_xyz(G, hrany, x, 0, -2.2, -1.1, 0.35, 2 * Y_N)

    # --- piliere a opory ---
    for x in (p34, p5):                       # v rieke
        pilier_rieka(G, kamen, kamen, x, -3.3, 19.4, 3.6, z_dole=-34.0, seg=6, hlava=0.8)
        kolizie.append(obdlznik_xy(x, 0, 3.6, 19.4))
    for x in (p2, p6, p7):                    # na nábreží / brehu
        dno = min(-6.0, zem_modelu(d, x) - 2.0)
        G.hranol(zula, obdlznik_xy(x, 0, 4.4, 20.0), dno - 10.0, zem_modelu(d, x) + 0.6)
        G.hranol(kamen, obdlznik_xy(x, 0, 3.6, 19.4), zem_modelu(d, x) + 0.6, -3.3)
        G.hranol(kamen, obdlznik_xy(x, 0, 4.0, 19.8), -3.3, -2.3)
        kolizie.append(obdlznik_xy(x, 0, 4.4, 20.0))
    opora(G, kamen, d, p8, 1, 22.0, hlbka=1.2)
    opora(G, kamen, d, o1, -1, 22.0, hlbka=1.2)
    # za oporou 1 násyp rampy k Šafárikovmu námestiu: vozovka na násype so stenami po okraj
    profil(G, doska, o1, L, [(-8.0, -0.5), (8.0, -0.5), (8.0, 0.0), (-8.0, 0.0)], uzavriet=True)
    bocne_steny_nasypu(G, kamen, d, o1, L, 16.0)
    return G, d, kolizie


def main():
    G, d, kolizie = postav()
    uloz_most(G, 'stary-most', d, kolizie)
