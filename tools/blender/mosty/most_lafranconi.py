# Most Lafranconi (1991, Dopravoprojekt): diaľnica D2 cez Dunaj. Údaje a zdroje: napady/pamiatky-podklady.md,
# „Mosty cez Dunaj“.
#   – dva samostatné predpäté jednokomorové nosníky (jeden na smer), polia 4 × 83 + 172 + 174 + 83 m od petržalskej
#     opory (hneď za hrádzou) na sever; jediná podpera v Dunaji je rámová (spojená s nosníkom), nosník je nad ňou
#     11 m vysoký a na 2 × 100 m sa parabolicky zníži na 4,7 m,
#   – severná estakáda ~370 m ponad P+R, Nábrežie arm. gen. L. Svobodu s električkou a FTVŠ do Mlynskej doliny,
#   – šírka 29,74 m medzi zábradliami, 3 + 3 pruhy; chodník a cyklotrasa po oboch stranách POD konzolami 4,7 m pod
#     vozovkou; tyrkysové oceľové zábradlie, sivý betón, riečna podpera obložená kameňom,
#   – vozovka z laseru DMP: násyp v Petržalke 150,4 → vrchol 157,1 nad riečnou podperou → severná opora 152,3.

from veze import Geo, svetlo
from spolocne import material
from mostne import (data_mosta, profil, tyc_x, zabradlie, lampa, uloz_most, obdlznik_xy, ohni_podla_profilu,
                    piliere_estakady, opora, bocne_steny_nasypu, zem_modelu, kvader_xyz)

POL = 14.87                  # polovica šírky (29,74 m)
Y_K = 7.45                   # os komory každého z dvoch nosníkov
LAVKA = (11.4, 14.6)         # lávky pod konzolami
LAVKA_Z = -4.7


def postav():
    d = data_mosta('Most Lanfranconi')
    L = d['L']
    P = d['piliere']
    opora_j, rieka, prechod = P[0], P[5], P[7]          # petržalská opora, rámová podpera, koniec hlavného mosta
    piliere_hl = P[1:7]                                  # inundácia, breh, rieka, breh
    estakada = P[8:]
    beton = material('beton-mosta', '#b2aea5', drsnost=0.85)
    beton_t = material('beton', '#9f9b93', drsnost=0.9)
    kamen = material('kamen-piliera', '#a8a195', drsnost=0.85)
    dlazba = material('chodnik', '#6d6b67', drsnost=0.9)
    tyrkys = material('detail-zabradlie-tyrkys', '#2f9e9a', drsnost=0.45, kov=0.5)
    zvod = material('detail-zvodidlo', '#b3b9bd', drsnost=0.45, kov=0.6)
    lampy = material('detail-lampa', '#9aa0a4', drsnost=0.4, kov=0.6)
    svetla = svetlo('svetlo-lampy', '#fff2d0', 1.5)

    G = Geo()
    kolizie = []

    def hlbka(x):
        """Výška nosníka: 11 m nad riečnou podperou, parabolicky na 4,7 m do 100 m."""
        dd = abs(x - rieka)
        return 4.7 + 6.3 * max(0.0, 1 - dd / 100.0) ** 2
    s_sever = L - 8.0                                      # severná opora – ďalej cesta na teréne
    # dva komorové nosníky (každý so šikmými stenami a konzolami), medzi nimi úzka medzera
    for s in (1, -1):
        def rez(x, s=s):
            D = hlbka(x)
            yk = s * Y_K
            body = [(yk - 3.4, -D), (yk + 3.4, -D), (yk + 4.6, -1.0), (yk + 7.35, -0.5), (yk + 7.35, 0.2),
                    (yk - 7.35, 0.2), (yk - 7.35, -0.5), (yk - 4.6, -1.0)]
            return body
        profil(G, beton, opora_j, s_sever, rez, uzavriet=True, krok=4.0)
        # zábradlie, zvodidlo, rímsa
        zabradlie(G, tyrkys, opora_j, s_sever, s * (POL - 0.15), 0.2, vyska=1.1, krok_stlpika=2.0, priecky=(0.35, 0.75))
        tyc_x(G, zvod, opora_j, s_sever, s * (POL - 1.0), 0.75, 0.1, 0.35)
        tyc_x(G, beton_t, opora_j, s_sever, s * (POL + 0.02), -0.15, 0.1, 0.7)
        # lávky pod konzolami (od rámp pri hrádzi po schody pri prechodovej podpere)
        a, b = sorted((s * LAVKA[0], s * LAVKA[1]))
        profil(G, dlazba, opora_j + 10, prechod + 3, [(a, LAVKA_Z - 0.3), (b, LAVKA_Z - 0.3), (b, LAVKA_Z), (a, LAVKA_Z)], uzavriet=True)
        zabradlie(G, tyrkys, opora_j + 10, prechod + 3, s * (LAVKA[1] + 0.05), LAVKA_Z, vyska=1.2, krok_stlpika=2.5, priecky=(0.5,))
        # závesy lávky (oceľové tyče ku konzole)
        x = opora_j + 12
        while x < prechod:
            kvader_xyz(G, zvod, x, s * (LAVKA[1] - 0.1), LAVKA_Z, -0.5, 0.12, 0.12)
            x += 6.0
    # lampy v strednom páse
    x = opora_j + 10
    while x < s_sever - 5:
        lampa(G, lampy, svetla, x, 0.0, 0.2, vyska=11.0, rameno=2.0, smer=1)
        lampa(G, lampy, svetla, x, 0.0, 0.2, vyska=11.0, rameno=2.0, smer=-1)
        x += 40.0
    # za oporami násyp / cesta na teréne
    profil(G, beton_t, 0.0, opora_j, [(-POL, -0.6), (POL, -0.6), (POL, 0.0), (-POL, 0.0)], uzavriet=True)
    bocne_steny_nasypu(G, beton_t, d, 0.0, opora_j, 2 * POL)
    profil(G, beton_t, s_sever, L, [(-POL, -0.6), (POL, -0.6), (POL, 0.0), (-POL, 0.0)], uzavriet=True)
    opora(G, beton_t, d, opora_j, 1, 2 * POL, hlbka=4.7)
    opora(G, beton_t, d, s_sever, -1, 2 * POL, hlbka=4.7)

    # --- podpery: riečna rámová (masívna, kamenný obklad), ostatné obdĺžnikové – jedna pod každým nosníkom ---
    zr = zem_modelu(d, rieka)
    G.hranol(kamen, [(rieka - 6, -15), (rieka + 6, -15), (rieka + 7.5, 0), (rieka + 6, 15), (rieka - 6, 15), (rieka - 7.5, 0)],
             min(zr, -16.0) - 20.0, -13.0)
    G.hranol(beton_t, [(rieka - 4.5, -13.5), (rieka + 4.5, -13.5), (rieka + 4.5, 13.5), (rieka - 4.5, 13.5)], -13.0, -10.5)
    kolizie.append(obdlznik_xy(rieka, 0, 15.0, 30.0))
    for x in piliere_hl:
        if x == rieka:
            continue
        zem = zem_modelu(d, x)
        for s in (1, -1):
            G.hranol(beton_t, obdlznik_xy(x, s * Y_K, 3.0, 6.0), zem - 3.0, -hlbka(x) + 0.05)
            kolizie.append(obdlznik_xy(x, s * Y_K, 3.0, 6.0))
    # severná estakáda: obdĺžnikové stĺpy pod oboma nosníkmi (polohy podpier zo ZBGIS)
    for x in [prechod] + list(estakada):
        zem = zem_modelu(d, x)
        if -zem < 2.5:
            continue
        for s in (1, -1):
            G.hranol(beton_t, obdlznik_xy(x, s * Y_K, 2.0, 4.5), zem - 2.0, -4.65)
            kolizie.append(obdlznik_xy(x, s * Y_K, 2.0, 4.5))
    lavky = [{'y': s * sum(LAVKA) / 2, 'sirka': LAVKA[1] - LAVKA[0], 'od': opora_j + 10, 'do': prechod + 3, 'pod': -LAVKA_Z}
             for s in (1, -1)]
    return G, d, kolizie, lavky


def main():
    G, d, kolizie, lavky = postav()
    uloz_most(G, 'most-lafranconi', d, kolizie, lavky=lavky)
