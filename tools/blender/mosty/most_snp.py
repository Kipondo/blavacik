# Most SNP (1972, A. Tesár, J. Lacko, L. Kušnír, I. Slameň): asymetrický zavesený most s jedným šikmým pylónom
# v tvare „A“ na petržalskom brehu. Údaje a zdroje: napady/pamiatky-podklady.md, „Mosty cez Dunaj“.
#   – celá stavba 688 m: severná betónová estakáda ~130 m (ponad nábrežie a autobusový terminál, koniec na
#     Staromestskej), oceľový spojitý nosník 74,8 + 303 + 54 m (pilier hlavného poľa na staromestskej promenáde,
#     pylón, koncová podpera na hrádzi), južná betónová estakáda ~124 m ponad park k násypu Panónskej cesty,
#   – mostovka 21 m: dvojkomorový oceľový nosník 4,6 m (komora ±6,3 m) s konzolami 4,2 m, vozovky 2 + 2 pruhy,
#     laná kotvia v strednom páse; chodci a cyklisti po lávkach POD konzolami (~3,6 m pod vozovkou, 3 m široké),
#   – pylón 84,6 m nad terénom, nohy 28,5 m od seba obkročujú mostovku, sklon 17° k Petržalke (vrchol ~26 m za
#     pätami), navrchu reštaurácia „UFO“,
#   – laná v JEDNEJ strednej rovine: hlavné pole visí v troch bodoch (~48, 98 a 150 m od pylóna), zadné laná
#     kotvia ~75 m za pylónom v kotevnom bloku (na bokoch reliéfy erbu – tu len hladký blok),
#   – mostovka mierne vzopätá (vrchol ~152 m n. m. nad stredom rieky) – model sa ohne podľa profilu (mostne.py).

import math

from veze import Geo, svetlo
from spolocne import material
from mostne import (data_mosta, profil, tyc_x, zabradlie, lampa, rotacne, nosnik, lano, kvader_xyz, uloz_most,
                    obdlznik_xy, ohni_podla_profilu, piliere_estakady, opora, bocne_steny_nasypu, zem_modelu)

POL = 10.5                     # polovica šírky mostovky
KOMORA = 6.3                   # vonkajšie steny komory od osi
LAVKA_Z = -3.6                 # podlaha lávok pod vozovkou
LAVKA = (6.5, 10.2)            # lávka od steny komory po zábradlie


def postav():
    d = data_mosta('Most SNP')
    L = d['L']
    p_pilier, s_p, p_koniec = d['piliere']          # pilier hlavného poľa, pylón, koncová podpera oceľového nosníka
    s_oc0 = p_pilier - 74.8 + 1.0                    # začiatok oceľového nosníka (severná estakáda končí)
    s_juh = L - 14.0                                 # južná opora – ďalej násyp Panónskej cesty
    s_sev = 2.0                                      # severná opora pri Staromestskej
    zm = d['zm']

    ocel = material('ocel-mosta', '#b8bdc0', drsnost=0.45, kov=0.55)
    ocel_t = material('ocel-tmava', '#8e959a', drsnost=0.5, kov=0.5)
    pylon_m = material('ocel-pylonu', '#c4c9cc', drsnost=0.35, kov=0.65)
    ufo_m = material('ufo-plech', '#c9cdcf', drsnost=0.35, kov=0.35)
    sklo_ufo = material('sklo-ufo', '#2f3b42', drsnost=0.05, kov=0.85)
    lano_m = material('lana', '#9da3a7', drsnost=0.35, kov=0.7)
    beton = material('beton', '#a8a49b', drsnost=0.9)
    dlazba = material('chodnik', '#5f6062', drsnost=0.9)
    zabr = material('detail-zabradlie', '#8a9094', drsnost=0.4, kov=0.6)
    lampy = material('detail-lampa', '#8e9498', drsnost=0.4, kov=0.6)
    svetla = svetlo('svetlo-lampy', '#fff2d0', 1.5)
    cervena = svetlo('svetlo-cervene', '#ff2a1a', 6.0)

    G = Geo()
    kolizie = []

    # --- oceľový nosník: dvojkomorový nosník 4,6 m, konzoly, obrubníky ---
    profil(G, ocel, s_oc0, p_koniec, [(-KOMORA, -4.6), (KOMORA, -4.6), (KOMORA, -0.9), (POL, -0.9), (POL, 0.25), (POL - 0.5, 0.25),
                                    (POL - 0.5, -0.03), (-POL + 0.5, -0.03), (-POL + 0.5, 0.25), (-POL, 0.25), (-POL, -0.9),
                                    (-KOMORA, -0.9)], uzavriet=True)
    for s in (1, -1):
        tyc_x(G, ocel_t, s_oc0, p_koniec, s * (POL + 0.05), -0.45, 0.12, 0.7)   # okrajový nosník konzol
    # stredný pás s kotvením lán (nízky obrubník v strede mostovky)
    tyc_x(G, ocel_t, s_oc0, p_koniec, 0.0, 0.12, 1.4, 0.25)

    # --- betónové estakády na brehoch: komorový nosník 2,2 m s konzolami ---
    for a, b in ((s_sev, s_oc0), (p_koniec, s_juh)):
        profil(G, beton, a, b, [(-5.5, -2.2), (5.5, -2.2), (7.5, -0.6), (POL, -0.6), (POL, 0.25), (POL - 0.5, 0.25),
                               (POL - 0.5, -0.03), (-POL + 0.5, -0.03), (-POL + 0.5, 0.25), (-POL, 0.25), (-POL, -0.6),
                               (-7.5, -0.6)], uzavriet=True)
    # násyp za južnou oporou (Panónska cesta) a opory
    profil(G, beton, s_juh, L, [(-POL, -0.6), (POL, -0.6), (POL, 0.0), (-POL, 0.0)], uzavriet=True)
    bocne_steny_nasypu(G, beton, d, s_juh, L, 2 * POL)
    opora(G, beton, d, s_juh, -1, 2 * POL, hlbka=2.2)
    opora(G, beton, d, s_sev, 1, 2 * POL, hlbka=2.2)
    # piliere estakád (dvojice stĺpov), nie v podjazdoch (nábrežie, električka, cesty terminálu)
    pod = [(a, b) for a, b, *_ in d.get('podjazdy', [])]
    piliere_estakady(G, beton, beton, d, s_sev + 4, s_oc0 - 2, 25.0, 2 * POL, hrubka=1.5, vynechaj=pod, hlbka=2.2, nad_zemou=3.0)
    piliere_estakady(G, beton, beton, d, p_koniec + 3, s_juh - 2, 25.0, 2 * POL, hrubka=1.5, vynechaj=pod, hlbka=2.2, nad_zemou=3.0)

    # --- lávky pod konzolami (od schodov na Starom Meste po rampy na hrádzi v Petržalke) ---
    l0, l1 = s_oc0 + 14.0, p_koniec - 5.0
    for s in (1, -1):
        a, b = sorted((s * LAVKA[0], s * LAVKA[1]))
        profil(G, dlazba, l0, l1, [(a, LAVKA_Z - 0.3), (b, LAVKA_Z - 0.3), (b, LAVKA_Z), (a, LAVKA_Z)], uzavriet=True)
        zabradlie(G, zabr, l0, l1, s * (LAVKA[1] + 0.05), LAVKA_Z, vyska=2.7, krok_stlpika=2.5, priecky=(0.5, 1.1, 1.9))
        # zábradlie hore na obrubníkoch a stožiare osvetlenia (52 svietidiel)
        zabradlie(G, zabr, s_sev, s_juh, s * (POL - 0.25), 0.25, vyska=1.0, krok_stlpika=3.0, priecky=(0.55,))
        x = s_sev + 12.0
        while x < s_juh - 6:
            if abs(x - s_p) > 14:
                lampa(G, lampy, svetla, x, s * (POL - 0.3), 0.25, vyska=10.0, rameno=1.8, smer=-s)
            x += 26.0

    # --- piliere oceľového nosníka: pilier hlavného poľa na promenáde, podpery na konci oboch polí ---
    for x, hl in ((p_pilier, -4.6), (s_oc0 + 1.0, -4.6), (p_koniec, -4.6)):
        zem = zem_modelu(d, x)
        for s in (1, -1):
            G.hranol(beton, obdlznik_xy(x, s * 5.0, 2.6, 3.2), zem - 3.0, hl)
            kolizie.append(obdlznik_xy(x, s * 5.0, 2.6, 3.2))
        G.hranol(beton, obdlznik_xy(x, 0, 3.0, 14.0), hl - 1.2, hl)
    # kotevný blok zadných lán (~75 m za pylónom), pod mostovkou
    s_kotva = s_p + 75.0
    G.hranol(beton, obdlznik_xy(s_kotva, 0, 16.0, 2 * POL + 1.0), zem_modelu(d, s_kotva) - 2.0, -2.2)
    kolizie.append(obdlznik_xy(s_kotva, 0, 16.0, 2 * POL + 1.0))

    # všetko pri mostovke sa ohne podľa profilu – pylón, laná a UFO sa pridajú až potom (rovné, v skutočnej výške)
    ohni_podla_profilu(G, d)

    # --- pylón: dve nohy obkročujú mostovku, sklon 17° k Petržalke, zbiehajú sa pod UFO ---
    zp = zem_modelu(d, s_p) + zm(s_p)                # terén pri pylóne vo výške modelu (už ohnutého)
    VRCH = zp + 79.5                                 # spodok UFO ~80 m nad terénom
    x_vrch = s_p + 24.0
    pata = lambda s: (s_p - 2.0, s * 14.25, zp - 1.0)
    for s in (1, -1):
        nosnik(G, pylon_m, pata(s), (x_vrch, s * 2.4, VRCH), 3.4, 7.0, 2.2, 3.4, hore=(1, 0, 0))
        kolizie.append(obdlznik_xy(s_p - 2.0 + 1.2, s * 14.25, 8.0, 5.5))

    def na_nohe(z, s):
        t = (z - pata(s)[2]) / (VRCH - pata(s)[2])
        return (pata(s)[0] + (x_vrch - pata(s)[0]) * t, s * (14.25 + (2.4 - 14.25) * t), z)
    # priečnik pod mostovkou (ložisko) a priečnik pod vrcholom (kotvenie lán)
    z_lozisko = zm(s_p) - 6.0
    nosnik(G, pylon_m, na_nohe(z_lozisko, 1), na_nohe(z_lozisko, -1), 3.0, 2.6)
    nosnik(G, pylon_m, na_nohe(VRCH - 11, 1), na_nohe(VRCH - 11, -1), 1.8, 2.4)

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

    # --- laná v strednej rovine: hlavné pole v troch bodoch, zadné do kotevného bloku ---
    def priecnik(z):
        a, b = na_nohe(z, 1), na_nohe(z, -1)
        return ((a[0] + b[0]) / 2, 0.0, z)
    for k, (dx, zk) in enumerate(((48.0, VRCH - 13.0), (98.0, VRCH - 12.0), (150.0, VRCH - 11.0))):
        hore = priecnik(zk)
        x = s_p - dx
        for o in (-0.5, 0.5):
            lano(G, lano_m, (hore[0] + o * 0.6, o, hore[2]), (x + o, o, zm(x) + 0.5), r=0.16)
        kvader_xyz(G, ocel_t, x, 0, zm(x) + 0.2, zm(x) + 1.1, 2.4, 1.2)
    for k, zk in enumerate((VRCH - 13.0, VRCH - 12.0, VRCH - 11.0)):
        hore = priecnik(zk)
        for o in (-0.5, 0.5):
            x = s_kotva - 4.0 + 4.0 * k
            lano(G, lano_m, (hore[0] + o * 0.6, o, hore[2]), (x, o, zm(x) + 0.5), r=0.16)

    lavky = [{'y': s * sum(LAVKA) / 2, 'sirka': LAVKA[1] - LAVKA[0], 'od': l0, 'do': l1, 'pod': -LAVKA_Z} for s in (1, -1)]
    return G, d, kolizie, lavky


def main():
    G, d, kolizie, lavky = postav()
    uloz_most(G, 'most-snp', d, kolizie, lavky=lavky)
