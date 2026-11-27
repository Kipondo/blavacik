# Františkánsky kostol (Kostol Zvestovania Pána), Františkánske námestie / Františkánska / Uršulínska – najstarší
# zachovaný kostol v Bratislave (vysvätený 1297): gotické presbytérium s oporami, trojloďová loď pod jednou strechou,
# barokové priečelie (L. de Schramm, 1745–1746), na severe barokové Loretánska kaplnka (1708–1709) a gotická kaplnka
# sv. Jána Evanjelistu (1360–1380), na juhu šesťboká kamenná gotická veža (verná kópia z rokov 1895–1896, pôvodný
# vrchol stojí v Sade Janka Kráľa), ku ktorej prilieha kláštor.
# Presný model exteriéru podľa prieskumu v napady/pamiatky-podklady.md („Františkánsky kostol“):
#  - pôdorys z OSM (way 38539540), výšky z laserového skenovania ÚGKK (DMP/DMR, INSPIRE WMS),
#  - fasády podľa verejných fotografií (Wikimedia Commons, len na porovnanie) a správ o obnove 2024–2026.
# Lokálna sústava: u = pozdĺž osi kostola (azimut 65,4°, od priečelia k presbytériu), v = naprieč (azimut 335,4°,
# na sever k Františkánskej ulici); začiatok = juhozápadné nárožie priečelia (OSM). Nula výšky = dlažba
# Františkánskeho námestia pred priečelím (≈ 141,4 m).
import math

from veze import Geo
from spolocne import material
from presne.snd import Hrana, doska, blok, oblukova_doska, ovalna_doska, fronton
from presne.reduta import rotacne
from presne.dom import lomeny_obrys, lomene_okno
from presne.radnica import rovina, strecha, stena_pod_strechou

BIELA, SIVA_SVETLA, SIVA_TMAVA, NIKA = '#eeeeea', '#e2e2de', '#5c5c5a', '#d9a68e'
SOCHA, KORAL, ZLTA, KAMEN_JAN, KAMEN_VEZA = '#d8cfbf', '#d27a57', '#f2d48a', '#c9bba0', '#cfc6b5'
OMIETKA_VEZA, STRECHA_LOD, STRECHA_PRESB, STRECHA_JAN = '#ece8dc', '#6e4e42', '#9a5b48', '#3e302a'
ZELEZO, DREVO, SKLO, ZLATO = '#2b2b2b', '#5a3a28', '#2f343a', '#c9a040'

AZ = math.radians(65.4)
U = (math.sin(AZ), math.cos(AZ))
V = (-U[1], U[0])
O = (-18.34, -18.37)                    # JZ nárožie priečelia (Blender: x = x hry, y = −z hry, od stredu záznamu)


def B(u, v):
    return (O[0] + U[0] * u + V[0] * v, O[1] + U[1] * u + V[1] * v)


def H(a, b):
    return Hrana(B(*a), B(*b))


def R(a, b, z0, sklon):
    return rovina(B(*a), B(*b), z0, sklon, uv=False)


# --- rozmery (m nad dlažbou pred priečelím) --------------------------------------------------------------------------
# Laser (DMP, mriežka 1 m): hrebeň lode 22,9 m (sklon ~45°, južný odkvap 15,9, severný 14,9 m), pultová strecha nad
# severnými kaplnkami 14,9 → 8,9 m, kaplnka sv. Jána hrebeň 23,9 m (veľmi strmá), presbytérium hrebeň 18,9 m,
# vrchol barokového štítu ~24,9 m, ihlan veže 42,7 m. Terén: priečelie 141,4, Františkánska +0,8, Uršulínska −0,7 m.
Z_PATA = -1.2
Z_RIMSA = 17.6                          # hlavná rímsa priečelia
Z_STIT = 24.9                           # vrchol barokového štítu
Z_VEZA = 42.7

LOD = [(0.0, 0.0), (34.0, -1.0), (34.0, 15.0), (0.46, 15.07)]
R_LOD = [R((0.0, 0.0), (34.0, -1.0), 15.9, 1.0), R((34.0, 15.0), (0.46, 15.07), 14.9, 1.0)]
LORETO = [(1.65, 14.77), (11.5, 14.9), (11.5, 22.28), (2.08, 22.18)]
LODKA = [(11.5, 14.9), (22.5, 14.9), (22.47, 22.38), (11.5, 22.28)]
R_SEVER = [R((22.47, 22.38), (2.08, 22.18), 8.9, 0.83)]
JAN = [(22.5, 14.0), (34.4, 14.0), (37.6, 15.8), (38.3, 18.9), (36.8, 22.6), (34.44, 23.74), (22.59, 23.84)]
PRESB = [(34.0, 2.0), (47.5, 2.0), (50.6, 3.8), (51.2, 7.0), (50.6, 10.2), (47.5, 12.0), (34.0, 12.0)]
VEZA = [(28.2, -6.6), (33.4, -6.6), (33.4, -1.0), (28.2, -1.0)]
STRED_VEZE = (30.5, -3.8)


def budova(G, mat, obrys_uv, roviny, steny):
    ob = [B(*p) for p in obrys_uv]
    strecha(G, mat, ob, roviny)
    for i, s in enumerate(steny):
        if s is None:
            continue
        m, z_od = s if isinstance(s, tuple) else (s, None)
        stena_pod_strechou(G, m, ob[i], ob[(i + 1) % len(ob)], roviny, z_od)


def vaza(G, M, c, z, k=1.0):
    rotacne(G, M['siva_tmava'], c, [(0.22 * k, z), (0.3 * k, z + 0.12 * k), (0.2 * k, z + 0.3 * k), (0.4 * k, z + 0.55 * k),
                                    (0.36 * k, z + 0.8 * k), (0.18 * k, z + 0.95 * k), (0.08 * k, z + 1.15 * k), (0.0, z + 1.2 * k)], seg=8)


def socha(G, M, c, z, vys, k=1.0):
    rotacne(G, M['socha'], c, [(0.42 * k, z), (0.38 * k, z + 0.25 * vys), (0.3 * k, z + 0.6 * vys), (0.28 * k, z + 0.75 * vys),
                               (0.13, z + 0.83 * vys), (0.15, z + 0.9 * vys), (0.13, z + 0.98 * vys), (0.05, z + vys)], seg=6)


# --- barokové priečelie ---------------------------------------------------------------------------------------------

def postav_priecelie(G, M):
    h = H((0.46, 15.07), (0.0, 0.0))           # líc na západ, s od severného nárožia
    L = h.L
    sc = L / 2
    # stena po hlavnú rímsu a vlnitý štít (jedna plocha)
    G.stena(M['biela'], h.a, h.b, Z_PATA, Z_RIMSA)
    obl = [(0.4, Z_RIMSA), (L - 0.4, Z_RIMSA)]
    prava = [(L - 0.9, 19.0), (L - 1.6, 20.0), (L - 2.6, 20.3), (L - 3.4, 21.0)]
    lava = [(3.4, 21.0), (2.6, 20.3), (1.6, 20.0), (0.9, 19.0)]
    oblúk = [(sc + 4.1 * math.cos(math.pi * k / 10), 21.0 + 3.9 * math.sin(math.pi * k / 10)) for k in range(11)]
    obrys = obl + prava + oblúk[1:-1] + lava
    # plocha štítu po konvexných častiach (pás nad rímsou, plecia, stred, oblúk) – líc aj rub
    casti = [[(0.4, Z_RIMSA), (L - 0.4, Z_RIMSA), (L - 0.9, 19.0), (0.9, 19.0)],
             [(0.9, 19.0), (3.4, 19.0), (3.4, 21.0), (2.6, 20.3), (1.6, 20.0)],
             [(L - 3.4, 19.0), (L - 0.9, 19.0), (L - 1.6, 20.0), (L - 2.6, 20.3), (L - 3.4, 21.0)],
             [(3.4, 19.0), (L - 3.4, 19.0), (L - 3.4, 21.0), (3.4, 21.0)],
             [(sc + 4.1 * math.cos(math.pi * k / 10), 21.0 + 3.9 * math.sin(math.pi * k / 10)) for k in range(11)]]
    for cast in casti:
        G.plocha(M['biela'], [(*h.bod(s, 0.0), z) for s, z in cast])
        G.plocha(M['biela'], [(*h.bod(s, -0.5), z) for s, z in reversed(cast)])
    for (s0, z0), (s1, z1) in zip(obrys[1:] + [obrys[0]], obrys[2:] + obrys[:1]):
        if z0 > Z_RIMSA + 0.01 or z1 > Z_RIMSA + 0.01:
            G.tram(M['siva_tmava'], (*h.bod(s0, 0.08), z0 + 0.06), (*h.bod(s1, 0.08), z1 + 0.06), 0.16)
    # sokel, kordónová rímsa, kladie s rímsou
    blok(G, M['siva_svetla'], h, sc, L + 0.3, 0.18, Z_PATA, 0.9)
    blok(G, M['siva_svetla'], h, sc, L + 0.4, 0.3, 6.3, 6.9)
    for z in (1.8, 2.9, 4.0, 5.1):                               # pásová rustika prízemia
        blok(G, M['siva_svetla'], h, sc, L, 0.05, z, z + 0.08)
    blok(G, M['siva_svetla'], h, sc, L + 0.3, 0.25, 15.6, 16.6)
    blok(G, M['siva_svetla'], h, sc, L + 0.9, 0.6, 16.9, Z_RIMSA)
    blok(G, M['siva_svetla'], h, sc, L + 0.5, 0.4, 16.6, 16.9)
    # stredný rizalit, pilastre s tmavosivými korintskými hlavicami
    blok(G, M['biela'], h, sc, 5.4, 0.3, Z_PATA, 15.6)
    for s in (0.55, 1.35, sc - 2.7, sc + 2.7, L - 1.35, L - 0.55):
        blok(G, M['siva_svetla'], h, s, 0.7, 0.42 if abs(s - sc) < 3 else 0.2, 6.9, 14.6)
        blok(G, M['siva_tmava'], h, s, 0.85, 0.5 if abs(s - sc) < 3 else 0.28, 14.6, 15.6)
    fronton(G, M['siva_svetla'], h, sc, 6.4, Z_RIMSA, 2.1, 0.45)
    # prízemie: portál s uchami a kartušou s nápisom, oválne okná s mrežou
    blok(G, M['siva_tmava'], h, sc, 3.2, 0.36, Z_PATA, 4.7)
    blok(G, M['siva_tmava'], h, sc, 3.8, 0.5, 4.7, 5.0)
    doska(G, M['drevo'], h, sc, 1.9, 0.0, 3.7, 0.4)
    ovalna_doska(G, M['siva_tmava'], h, sc, 5.5, 0.6, 0.42, 0.33, seg=10)
    doska(G, M['zlato'], h, sc, 0.7, 5.42, 5.58, 0.38)
    for ds in (-4.5, 4.5):
        ovalna_doska(G, M['siva_tmava'], h, sc + ds, 4.1, 0.78, 0.92, 0.04, seg=14)
        ovalna_doska(G, M['sklo'], h, sc + ds, 4.1, 0.58, 0.72, 0.08, seg=14)
    # poschodie: vysoké polkruhové okná, nika s Immaculatou a anjelmi, okulus
    for ds in (-4.7, 4.7):
        oblukova_doska(G, M['siva_svetla'], h, sc + ds, 2.3, 8.9, 11.9, 0.04)
        oblukova_doska(G, M['sklo'], h, sc + ds, 1.8, 9.2, 11.9, 0.08)
        blok(G, M['siva_svetla'], h, sc + ds, 2.6, 0.16, 8.75, 8.95)
    oblukova_doska(G, M['nika'], h, sc, 1.7, 7.0, 10.4, 0.33)
    socha(G, M, h.bod(sc, 0.75), 7.3, 1.9, 1.0)
    for ds in (-1.3, 1.3):
        socha(G, M, h.bod(sc + ds, 0.7), 7.0, 0.8, 0.7)
    ovalna_doska(G, M['siva_svetla'], h, sc, 13.6, 0.85, 0.85, 0.33, seg=14)
    ovalna_doska(G, M['sklo'], h, sc, 13.6, 0.62, 0.62, 0.37, seg=14)
    # štít: okuly, plastický kríž, vázy, kovaný kríž na vrchole
    for ds in (-3.4, 3.4):
        ovalna_doska(G, M['siva_tmava'], h, sc + ds, 19.0, 0.65, 0.65, 0.03, seg=12)
        ovalna_doska(G, M['sklo'], h, sc + ds, 19.0, 0.48, 0.48, 0.06, seg=12)
    doska(G, M['siva_svetla'], h, sc, 0.25, 19.6, 23.6, 0.06)
    doska(G, M['siva_svetla'], h, sc, 2.0, 22.1, 22.35, 0.06)
    for s, z in ((1.25, 20.0), (L - 1.25, 20.0), (3.3, 21.05), (L - 3.3, 21.05)):
        vaza(G, M, h.bod(s, -0.25), z, 0.9 if z < 20.5 else 0.7)
    c = h.bod(sc, -0.25)
    G.kvader(M['zelezo'], c, h.t, 0.07, 0.07, Z_STIT - 0.1, Z_STIT + 1.8)
    G.kvader(M['zelezo'], c, h.t, 0.9, 0.06, Z_STIT + 1.1, Z_STIT + 1.18)
    # rokokový kovaný kríž na kamennom podstavci vpravo pred priečelím
    p = h.bod(L - 0.6, 1.8)
    G.kvader(M['siva_svetla'], p, h.t, 1.0, 0.7, -0.2, 1.1)
    G.kvader(M['zelezo'], p, h.t, 0.1, 0.1, 1.1, 4.0)
    G.kvader(M['zelezo'], p, h.t, 1.3, 0.08, 3.0, 3.12)


# --- loď, severné kaplnky, presbytérium ----------------------------------------------------------------------------

def postav_lod(G, M):
    budova(G, M['strecha_lod'], LOD, R_LOD, [M['biela'], M['biela'], (M['biela'], 14.0), None])
    # severné kaplnky: Loretánska (koralové stĺpy, žlté plochy) a nižšia bočná loď
    budova(G, M['strecha_presb'], LORETO, R_SEVER, [None, None, M['biela'], M['biela']])
    budova(G, M['strecha_presb'], LODKA, R_SEVER, [None, None, M['biela'], None])
    hz = H((2.08, 22.18), (1.65, 14.77))              # západná stena Loretánskej kaplnky
    hs = H((11.5, 22.28), (2.08, 22.18))              # severná stena (Františkánska ul.)
    for h, stlpy, okna in ((hz, (0.6, 1.4, hz.L - 1.4, hz.L - 0.6), (hz.L / 2,)),
                           (hs, (0.6, 1.4, hs.L / 2 - 0.4, hs.L / 2 + 0.4, hs.L - 1.4, hs.L - 0.6), (hs.L * 0.27, hs.L * 0.73))):
        doska(G, M['zlta'], h, h.L / 2, h.L, Z_PATA, 9.6, 0.02)          # žlté plochy kaplnky po kladie
        blok(G, M['koral'], h, h.L / 2, h.L + 0.2, 0.15, Z_PATA, 0.8)
        for s in stlpy:
            blok(G, M['koral'], h, s, 0.75, 0.3, 0.0, 1.6)
            G.valec(M['koral'], h.bod(s, 0.32), 0.27, 1.6, 8.2, seg=8, r1=0.24)
            blok(G, M['siva_tmava'], h, s, 0.7, 0.62, 8.2, 8.75)
        blok(G, M['koral'], h, h.L / 2, h.L + 0.3, 0.65, 8.75, 9.6)
        for s in okna:
            okno_h = 1.6 if h is hz else 1.5
            if h is hz:
                doska(G, M['biela'], h, s, okno_h + 0.4, 3.0, 6.4, 0.04)
                doska(G, M['sklo'], h, s, okno_h, 3.2, 6.2, 0.08)
            else:
                oblukova_doska(G, M['biela'], h, s, okno_h + 0.4, 3.0, 5.8, 0.04)
                oblukova_doska(G, M['sklo'], h, s, okno_h, 3.2, 5.8, 0.08)
    fronton(G, M['koral'], hz, hz.L / 2, hz.L + 0.4, 9.6, 1.6, 0.65)
    ovalna_doska(G, M['zlato'], hz, hz.L / 2, 7.4, 0.5, 0.55, 0.18, seg=10)   # Esterházyho erb
    # bočná loď: hladká stena s rímsou, dve okná
    hl = H((22.47, 22.38), (11.5, 22.28))
    blok(G, M['biela'], hl, hl.L / 2, hl.L, 0.4, 8.5, 8.9)
    for s in (hl.L * 0.3, hl.L * 0.7):
        oblukova_doska(G, M['siva_svetla'], hl, s, 1.6, 3.0, 6.3, 0.03)
        oblukova_doska(G, M['sklo'], hl, s, 1.2, 3.2, 6.3, 0.06)


def postav_kaplnku_jana(G, M):
    """Gotická kaplnka sv. Jána Evanjelistu: neomietnutý kameň, veľmi strmá tmavá strecha so štítom na západe
    a ihlanovou strechou nad polygonálnym chórom, opory s fialami, kružbové okná, kraby a kvetina na štíte."""
    sk = (23.9 - 13.0) / 4.9
    ob = JAN
    RJ = [R(ob[i], ob[(i + 1) % len(ob)], 13.0, sk) for i in range(len(ob)) if i != 6]
    budova(G, M['strecha_jan'], JAN, RJ, [None, M['kamen_jan'], M['kamen_jan'], M['kamen_jan'], M['kamen_jan'], M['kamen_jan'],
                                          (M['kamen_jan'], 8.5)])
    hz = H((22.59, 23.84), (22.5, 14.0))               # západný štít
    s = hz.L / 2
    lomene_okno(G, M, hz, s, 2.6, 13.6, 18.4, ram=0.3, prieciek=1, mat_ram=M['kamen_jan'])
    for k in (-1, 1):                                  # kraby po hranách štítu
        for i in range(1, 8):
            t = i / 8
            p = hz.bod(s + k * (hz.L / 2) * (1 - t), 0.15)
            G.kvader(M['kamen_jan'], p, hz.t, 0.3, 0.3, 13.0 + 10.9 * t, 13.0 + 10.9 * t + 0.35)
    rotacne(G, M['kamen_jan'], hz.bod(s, 0.1), [(0.25, 23.8), (0.35, 24.2), (0.1, 24.9), (0.0, 25.0)], seg=4)
    G.kvader(M['zelezo'], hz.bod(s, 0.1), hz.t, 0.06, 0.06, 25.0, 25.8)
    # severná strana a chór: opory s fialami, vysoké dvojdielne okná s kružbou
    hn = H((34.44, 23.74), (22.59, 23.84))
    for ss in (3.9, 7.9):
        lomene_okno(G, M, hn, ss, 1.6, 7.0, 11.0, ram=0.22, prieciek=1, mat_ram=M['kamen_jan'])
    for ss in (0.3, 5.9, 11.5):
        c = hn.bod(ss, 0.5)
        G.kvader(M['kamen_jan'], c, hn.t, 0.8, 1.0, Z_PATA, 11.5)
        rotacne(G, M['kamen_jan'], c, [(0.4, 11.5), (0.4, 12.4), (0.0, 14.0)], seg=4, natocenie=math.atan2(U[1], U[0]) + math.pi / 4)
    for i in range(1, 5):
        a, b = ob[i], ob[i + 1]
        h = H(a, b)
        lomene_okno(G, M, h, h.L / 2, 1.2, 6.5, 10.8, ram=0.2, prieciek=1, mat_ram=M['kamen_jan'], ruzica=False)
    G.kvader(M['zelezo'], B(37.4, 18.9), U, 0.06, 0.06, 23.0, 25.0)
    G.kvader(M['zelezo'], B(37.4, 18.9), U, 0.6, 0.06, 24.2, 24.28)


def postav_presbyterium(G, M):
    sk = (18.9 - 13.0) / 5.0
    ob = PRESB
    RP = [R(ob[i], ob[(i + 1) % len(ob)], 13.0, sk) for i in range(len(ob) - 1)]
    budova(G, M['strecha_presb'], PRESB, RP, [M['biela'], M['biela'], M['biela'], M['biela'], M['biela'], M['biela'], None])
    hrany = [H(ob[i], ob[i + 1]) for i in range(len(ob) - 1)]
    # opory: stupňovité, omietnuté nabielo, na nárožiach záveru a medzi oknami bočných stien
    for i in range(1, 5):
        a = B(*ob[i])
        d = (B(*ob[i])[0] - B(41.0, 7.0)[0], B(*ob[i])[1] - B(41.0, 7.0)[1])
        Ld = math.hypot(*d)
        n = (d[0] / Ld, d[1] / Ld)
        for k, (z1, dd) in enumerate(((6.0, 1.1), (10.5, 0.7))):
            c = (a[0] + n[0] * dd / 2, a[1] + n[1] * dd / 2)
            G.kvader(M['biela'], c, (-n[1], n[0]), 0.75, dd, Z_PATA if k == 0 else 6.0, z1)
    for h in (hrany[0], H((47.5, 12.0), (34.0, 12.0))):
        for s in (h.L * 0.33, h.L * 0.67):
            blok(G, M['biela'], h, s, 0.75, 1.0, Z_PATA, 6.0)
            blok(G, M['biela'], h, s, 0.75, 0.65, 6.0, 10.5)
    for h in hrany[1:5]:
        lomene_okno(G, M, h, h.L / 2, 1.3, 4.2, 9.6, ram=0.2, prieciek=1, mat_ram=M['siva_svetla'], ruzica=False)
    for h in (hrany[0], H((47.5, 12.0), (34.0, 12.0))):
        for s in (h.L * 0.15, h.L * 0.5, h.L * 0.85):
            lomene_okno(G, M, h, s, 1.6, 4.2, 9.6, ram=0.2, prieciek=2, mat_ram=M['siva_svetla'])
    blok(G, M['biela'], H((34.0, 2.0), (47.5, 2.0)), 6.75, 13.5, 0.35, 12.6, 13.0)
    G.kvader(M['zelezo'], B(48.6, 7.0), U, 0.06, 0.06, 17.0, 19.6)
    G.kvader(M['zelezo'], B(48.6, 7.0), U, 0.6, 0.06, 18.9, 18.98)
    # polygonálna sakristia s medenou strechou na juhu záveru
    sakr = [(43.2, -6.9), (48.8, -6.9), (49.6, -3.5), (48.6, 2.0), (43.2, 2.0)]
    RS = [R(sakr[i], sakr[(i + 1) % 5], 6.0, 0.8) for i in range(4)] + [R(sakr[4], sakr[0], 6.0, 0.8)]
    budova(G, M['med'], sakr, RS, [M['biela'], M['biela'], M['biela'], None, (M['biela'], 4.0)])


# --- gotická veža ---------------------------------------------------------------------------------------------------

def postav_vezu(G, M):
    """Šesťboká kamenná veža: omietnutý štvorhranný driek, kamenné podlažie s úzkymi oknami, zvonica s dvojdielnymi
    oknami a chrličmi, koruna vimpergov a fiál, plný kamenný ihlan s krabmi, kvetina a hrot."""
    ob = [B(*p) for p in VEZA]
    G.hranol(M['omietka_veza'], ob, Z_PATA, 17.0, vrch=True)
    c = B(*STRED_VEZE)
    nat = math.atan2(U[1], U[0])
    def sest(r, z):
        return [(c[0] + r * math.cos(nat + math.pi * k / 3), c[1] + r * math.sin(nat + math.pi * k / 3)) for k in range(6)]
    for k, (z0, z1, r) in enumerate(((17.0, 22.6, 2.9), (22.6, 23.2, 3.05), (23.2, 29.0, 2.8), (29.0, 29.5, 3.0))):
        G.hranol(M['kamen_veza'], sest(r, z0), z0, z1)
    # okná: dolné úzke, zvonica dvojdielne
    for i in range(6):
        p0, p1 = sest(2.9, 0)[i], sest(2.9, 0)[(i + 1) % 6]
        h = Hrana(p0, p1)
        G.plocha(M['tma'], lomeny_obrys(h, h.L / 2, 0.55, 18.4, 21.2, 0.03, r_k=1.0))
        p0, p1 = sest(2.8, 0)[i], sest(2.8, 0)[(i + 1) % 6]
        h = Hrana(p0, p1)
        G.plocha(M['kamen_veza'], lomeny_obrys(h, h.L / 2, 1.6, 23.6, 27.0, 0.03, r_k=1.0))
        G.plocha(M['tma'], lomeny_obrys(h, h.L / 2, 1.25, 23.8, 27.0, 0.06, r_k=1.0))
        doska(G, M['kamen_veza'], h, h.L / 2, 0.1, 23.8, 27.4, 0.08)
        # vimperg nad oknom
        for kk in (-1, 1):
            G.tram(M['kamen_veza'], (*h.bod(h.L / 2 + kk * 1.05, 0.12), 29.4), (*h.bod(h.L / 2, 0.12), 31.5), 0.22)
        # chrlič na nároží
        q = sest(2.85, 0)[i]
        d = (q[0] - c[0], q[1] - c[1])
        G.tram(M['kamen_veza'], (q[0], q[1], 28.6), (q[0] + d[0] * 0.35, q[1] + d[1] * 0.35, 28.75), 0.22)
    # fiály: na nárožiach a nad stredmi strán (spolu 12), končia v rovnakej výške
    for k in range(12):
        f = nat + math.pi * k / 6
        r = 2.95 if k % 2 == 0 else 2.6
        p = (c[0] + r * math.cos(f), c[1] + r * math.sin(f))
        rotacne(G, M['kamen_veza'], p, [(0.2, 29.5), (0.2, 31.2), (0.0, 32.8)], seg=4, natocenie=f)
    # ihlan s krabmi, kvetina a hrot
    rotacne(G, M['kamen_veza'], c, [(2.55, 29.5), (2.45, 30.6), (0.14, Z_VEZA - 1.3)], seg=6, natocenie=nat)
    for k in range(6):
        f = nat + math.pi * k / 3
        for t in (0.15, 0.32, 0.49, 0.66, 0.83):
            r = 2.45 + (0.14 - 2.45) * t
            z = 30.6 + (Z_VEZA - 1.3 - 30.6) * t
            p = (c[0] + (r + 0.12) * math.cos(f), c[1] + (r + 0.12) * math.sin(f))
            G.kvader(M['kamen_veza'], p, (-math.sin(f), math.cos(f)), 0.28, 0.28, z - 0.15, z + 0.15)
    rotacne(G, M['kamen_veza'], c, [(0.14, Z_VEZA - 1.3), (0.35, Z_VEZA - 1.0), (0.3, Z_VEZA - 0.75), (0.06, Z_VEZA - 0.55)], seg=6)
    G.kvader(M['zelezo'], c, U, 0.05, 0.05, Z_VEZA - 0.6, Z_VEZA)


def postav():
    """Vracia (Geo, výška modelu)."""
    G = Geo()
    M = {
        'biela': material('omietka-frantiskani', BIELA, drsnost=0.85),
        'siva_svetla': material('stuk-frantiskani', SIVA_SVETLA, drsnost=0.8),
        'siva_tmava': material('kamen-tmavy-frantiskani', SIVA_TMAVA, drsnost=0.8),
        'kamen': material('kamen-tmavy-frantiskani', SIVA_TMAVA, drsnost=0.8),
        'nika': material('nika-frantiskani', NIKA, drsnost=0.8),
        'socha': material('socha-frantiskani', SOCHA, drsnost=0.85),
        'koral': material('koral-loreto-frantiskani', KORAL, drsnost=0.8),
        'zlta': material('zlta-loreto-frantiskani', ZLTA, drsnost=0.85),
        'kamen_jan': material('kamen-jan-frantiskani', KAMEN_JAN, drsnost=0.85),
        'kamen_veza': material('kamen-veza-frantiskani', KAMEN_VEZA, drsnost=0.85),
        'omietka_veza': material('omietka-veza-frantiskani', OMIETKA_VEZA, drsnost=0.85),
        'strecha_lod': material('skridla-lod-frantiskani', STRECHA_LOD, drsnost=0.75),
        'strecha_presb': material('skridla-presb-frantiskani', STRECHA_PRESB, drsnost=0.75),
        'strecha_jan': material('skridla-jan-frantiskani', STRECHA_JAN, drsnost=0.75),
        'med': material('med-sakristia-frantiskani', '#8e968e', drsnost=0.5, kov=0.25),
        'zelezo': material('zelezo-frantiskani', ZELEZO, drsnost=0.55, kov=0.5),
        'drevo': material('drevo-frantiskani', DREVO, drsnost=0.7),
        'sklo': material('sklo-frantiskani', SKLO, drsnost=0.15, kov=0.4),
        'tma': material('tma-frantiskani', '#3a3632', drsnost=0.9),
        'zlato': material('zlato-frantiskani', ZLATO, drsnost=0.35, kov=0.6),
    }
    postav_lod(G, M)
    postav_kaplnku_jana(G, M)
    postav_presbyterium(G, M)
    postav_vezu(G, M)
    postav_priecelie(G, M)
    return G, Z_VEZA


# bod na dlažbe Františkánskeho námestia pred portálom (lokálne x, z hry) – model sa kladie naň
_zb = B(-6.0, 7.5)
ZAKLADNA_BOD = [round(_zb[0], 2), round(-_zb[1], 2)]
