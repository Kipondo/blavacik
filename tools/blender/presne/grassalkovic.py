# Grasalkovičov palác, Hodžovo námestie 1 – neskorobarokový letný palác grófa A. Grasalkoviča (okolo 1760,
# pripisovaný A. Mayerhofferovi), od 1996 sídlo prezidenta SR. Jeden rovný dvojpodlažný trakt (≈ 87 m na juhu,
# ≈ 98 m na severe – konce sú šikmé podľa ulíc): západný nárožný pavilón (5 osí) – krídlo (6 osí) – prevýšený stredný
# pavilón (3 osi, Veľká sála) – krídlo (6 osí) – východný nárožný pavilón (5 osí). Nárožné pavilóny majú mansardové
# valbové strechy s vikiermi, krídla strmé strechy, stredný pavilón zvonovitú kupolovitú strechu s hrotmi a stožiarom.
# Stredný pavilón: 4 pilastre veľkého rádu s pozlátenými hlavicami, 3 vysoké okná s polkruhovým záverom, trojuholníkový
# štít so štátnym znakom v kartuši a so sochami; pred ním murovaný portikus s arkádami a terasou (balustráda
# s pozláteným kovaným úsekom). Na poschodí biele lizény a šambrány a sivé zrkadlá, okná s polkruhovým záverom
# a segmentovými rímsami s pozlátenými kartušami, prízemie biele s mrežami. Čestný dvor uzatvára Bellušova mreža
# (1939–41): kamenný sokel, piliere s urnami, čierna kovaná mreža so zlatom, dve brány, 5 stožiarov s vlajkami.
# Presný model exteriéru podľa prieskumu v napady/pamiatky-podklady.md („Grasalkovičov palác“):
#  - pôdorys z OSM (way 78068599, mreža 90854517), výšky z laserového skenovania ÚGKK (DMP/DMR, INSPIRE WMS),
#  - fasády a farby podľa verejných fotografií (Wikimedia Commons, len na porovnanie) a správ o obnove 2019.
# Lokálna sústava: u = pozdĺž traktu (azimut 95,1°, od JZ nárožia na východ), v = na sever (do záhrady);
# začiatok = JZ nárožie západného pavilónu (OSM). Nula výšky = dlažba čestného dvora pred portikom (≈ 155,7 m);
# záhrada na severe je o 1,1 m nižšie.
import math

from veze import Geo
from spolocne import material
from presne.snd import Hrana, doska, blok, oblukova_doska, ovalna_doska, segmentova_rimsa
from presne.reduta import rotacne
from presne.radnica import rovina, plocha, strecha, stena_pod_strechou, vikier
from presne.primacialny import socha

BIELA, SEDA, TYMPANON, ZLATO, SOCHA = '#efeeeb', '#cfccc6', '#c8c6c1', '#c9a13b', '#cacbcf'
STRECHA, KUPOLA, KOMIN, KAMEN, DLAZBA = '#63655f', '#3d3f46', '#e8e7e3', '#c1b4a2', '#c7bfb8'
RAMY, SKLO, MREZA, TIEN = '#4a3b2e', '#2e3540', '#1c1c1c', '#77746d'
VLAJKA_B, VLAJKA_M, VLAJKA_C, EU_M = '#f4f4f4', '#0b4ea2', '#ee1c25', '#003399'

AZ = math.radians(95.1)
U = (math.sin(AZ), math.cos(AZ))
V = (-U[1], U[0])
O = (-44.79, -3.47)                     # JZ nárožie západného pavilónu (Blender: x = x hry, y = −z hry, od stredu)


def B(u, v):
    return (O[0] + U[0] * u + V[0] * v, O[1] + U[1] * u + V[1] * v)


def H(a, b):
    return Hrana(B(*a), B(*b))


def R(a, b, z0, sklon):
    return rovina(B(*a), B(*b), z0, sklon, uv=False)


# --- rozmery (m nad dlažbou čestného dvora) -------------------------------------------------------------------------
# Laser (DMP, mriežka 1 m): hlavná rímsa krídel a pavilónov ~10,4 m, mansarda nárožných pavilónov so zlomom ~14,1 m
# (1,5 m za lícom) a vrcholom ~15,8 m, strechy krídel sklon ~35° s hrebeňom ~15,9 m, stredný pavilón s rímsou ~14,3 m,
# vrcholom štítu ~17,9 m a plochým vrcholom kupolovej strechy ~20,4 m (6 × 17 m), terasa portiku ~4,1 m
# s balustrádou do ~5,1 m. Osi a podlažia z fotiek (mierka z dĺžky traktu a výšky rímsy).
Z_PATA = -1.4
Z_KORDON = 4.9                          # kordónová rímsa nad prízemím
Z_RIMSA = 10.4                          # hlavná rímsa krídel a nárožných pavilónov
Z_RIMSA_S = 14.3                        # rímsa stredného pavilónu
Z_STIT = 17.9                           # vrchol trojuholníkového štítu
Z_KUPOLA = 20.4                         # plochý vrchol kupolovej strechy
Z_TERASA = 4.1                          # terasa portiku
V_JUH, V_JUH_P, V_SEVER = 0.88, 0.15, 16.35   # líce krídel a nárožných pavilónov na juhu, severné líce
STRED = (34.3, 51.8)                    # stredný pavilón (u0, u1), južné líce v = −6,5, severný výstupok do v = 22,2
V_STRED_J, V_STRED_S = -6.5, 22.2
PAV_Z, PAV_V = 18.6, 68.0               # hranice nárožných pavilónov
OSI_PAV_Z = [1.86, 5.58, 9.3, 13.02, 16.74]
OSI_KR_Z = [19.91, 22.53, 25.14, 27.76, 30.38, 32.99]
OSI_KR_V = [53.15, 55.85, 58.55, 61.25, 63.95, 66.65]
OSI_PAV_V = [69.88, 73.64, 77.4, 81.16, 84.92]
OSI_STRED = [37.22, 43.05, 48.88]
PILASTRE = [34.85, 40.14, 45.96, 51.25]

# pôdorysy (u, v) proti smeru hodinových ručičiek
PAVILON_Z = [(0.0, 0.0), (PAV_Z, 0.28), (PAV_Z, 16.4), (-3.28, 16.11)]
PAVILON_V = [(PAV_V, 0.16), (86.8, -0.2), (94.4, 16.15), (PAV_V, 16.3)]
KRIDLO_Z = [(PAV_Z - 0.5, V_JUH), (STRED[0] + 0.5, V_JUH), (STRED[0] + 0.5, V_SEVER), (PAV_Z - 0.5, V_SEVER)]
KRIDLO_V = [(STRED[1] - 0.5, 0.77), (PAV_V + 0.5, 0.74), (PAV_V + 0.5, V_SEVER), (STRED[1] - 0.5, V_SEVER)]
PORTIKUS = [(32.59, 0.93), (32.65, -5.02), (35.06, -8.0), (35.84, -10.39), (50.88, -10.68), (52.12, -7.51), (54.22, -5.2),
            (54.15, 0.78)]
KUPOLA_OB = [(STRED[0] + 0.3, V_STRED_J + 0.3), (STRED[1] - 0.3, V_STRED_J + 0.3), (STRED[1] - 0.3, V_SEVER),
             (50.5, V_STRED_S - 0.3), (36.1, V_STRED_S - 0.3), (STRED[0] + 0.3, V_SEVER)]
# Bellušova mreža čestného dvora (OSM way 90854517), brány a stožiare
MREZA_LINIA = [(0.39, -0.9), (11.08, -24.21), (14.68, -24.92), (18.43, -25.04), (20.41, -25.82), (22.46, -27.13),
               (24.84, -29.66), (31.95, -29.26), (33.97, -32.87), (37.57, -35.0), (41.4, -35.72), (45.44, -35.62),
               (49.66, -34.74), (52.9, -32.89), (55.02, -29.31), (62.19, -29.62), (64.45, -26.81), (66.51, -25.83),
               (68.8, -24.94), (72.11, -24.71), (86.15, -1.12)]
BRANY = [4, 17]                         # indexy bodov mreže, v ktorých stoja hlavné brány
STOZIARE = [(35.61, -28.98), (39.49, -29.2), (43.37, -29.39), (47.29, -29.44), (51.21, -29.49)]


def budova(G, mat_strecha, obrys_uv, roviny):
    strecha(G, mat_strecha, [B(*p) for p in obrys_uv], roviny)


def stena(G, mat, a, b, roviny, z_od=None):
    stena_pod_strechou(G, mat, B(*a), B(*b), roviny, z_od)


def mansarda(a, b, z0=Z_RIMSA):
    """Dve roviny mansardy nad hranou a→b (spodná strmá ~68°, zlom 1,48 m za lícom, horná ~16°)."""
    return [R(a, b, z0, 2.5), R(a, b, z0 + 3.7 - 0.28 * 1.48, 0.28)]


def zvon(a, b):
    """Tri roviny zvonovitej strechy stredného pavilónu nad hranou a→b (strmá → mierna)."""
    return [R(a, b, Z_RIMSA_S, 2.1), R(a, b, Z_RIMSA_S + 0.66, 1.3), R(a, b, Z_RIMSA_S + 2.42, 0.67)]


R_KR_Z = [R((0.0, V_JUH), (1.0, V_JUH), Z_RIMSA, 0.71), R((1.0, V_SEVER), (0.0, V_SEVER), Z_RIMSA, 0.71)]
R_KR_V = [R((0.0, 0.76), (1.0, 0.76), Z_RIMSA, 0.71), R((1.0, V_SEVER), (0.0, V_SEVER), Z_RIMSA, 0.71)]
R_PAV_Z = (mansarda((0.0, 0.0), (PAV_Z, 0.28)) + mansarda((PAV_Z, 16.4), (-3.28, 16.11))
           + mansarda((-3.28, 16.11), (0.0, 0.0)))
R_PAV_V = (mansarda((PAV_V, 0.16), (86.8, -0.2)) + mansarda((94.4, 16.15), (PAV_V, 16.3))
           + mansarda((86.8, -0.2), (94.4, 16.15)))
R_KUPOLA = [plocha(Z_KUPOLA)]
for _i in range(len(KUPOLA_OB)):
    R_KUPOLA += zvon(KUPOLA_OB[_i], KUPOLA_OB[(_i + 1) % len(KUPOLA_OB)])


# --- okná a drobné prvky ---------------------------------------------------------------------------------------------

def okno_obdlz(G, M, h, s, w, z0, z1, ram=0.16, mreza=False, priecnik=None):
    """Obdĺžnikové okno: biela šambrána, tmavé sklo, tmavohnedé rámy s krížom; voliteľne čierna mreža."""
    doska(G, M['fasada'], h, s, w + 2 * ram, z0 - ram, z1 + ram, 0.03)
    doska(G, M['sklo'], h, s, w, z0, z1, 0.05)
    doska(G, M['ramy'], h, s, 0.07, z0, z1, 0.07)
    pz = priecnik or z0 + (z1 - z0) * 0.68
    doska(G, M['ramy'], h, s, w, pz - 0.035, pz + 0.035, 0.07)
    if mreza:
        for k in range(6):
            doska(G, M['mreza'], h, s - w / 2 + w * (k + 0.5) / 6, 0.03, z0 - 0.05, z1 + 0.05, 0.11)
        for z in (z0 + 0.15, (z0 + z1) / 2, z1 - 0.15):
            doska(G, M['mreza'], h, s, w + 0.1, z - 0.02, z + 0.02, 0.11)


def okno_oblukove(G, M, h, s, w, z0, z_pata, ram=0.16, priecnik=None):
    """Okno s polkruhovým záverom: biela šambrána, tmavé sklo, tmavohnedá priečka a priečnik."""
    oblukova_doska(G, M['fasada'], h, s, w + 2 * ram, z0 - ram, z_pata, 0.03)
    oblukova_doska(G, M['sklo'], h, s, w, z0, z_pata, 0.05)
    doska(G, M['ramy'], h, s, 0.07, z0, z_pata + w / 2 - 0.03, 0.07)
    doska(G, M['ramy'], h, s, w, (priecnik or z_pata) - 0.035, (priecnik or z_pata) + 0.035, 0.07)


def okno_poschodie(G, M, h, s, w=1.25):
    """Okno piana nobile krídel a pavilónov: polkruhový záver, segmentová nadokenná rímsa s pozlátenou kartušou."""
    okno_oblukove(G, M, h, s, w, 5.6, 7.9)
    blok(G, M['fasada'], h, s, w + 0.5, 0.1, 5.42, 5.56)                   # parapet
    segmentova_rimsa(G, M['fasada'], h, s, w + 0.7, 8.78, 0.32, 0.18)
    ovalna_doska(G, M['zlato'], h, s, 9.02, 0.16, 0.13, 0.12, seg=8)


def rimsy(G, M, h, s0, s1, z_rimsa=Z_RIMSA, kordon=True, zrkadla=True):
    """Kamenný sokel, kordónová rímsa, hlavná rímsa; na poschodí sivé zrkadlo (lizény a šambrány ostanú biele)."""
    L, s = s1 - s0, (s0 + s1) / 2
    blok(G, M['kamen'], h, s, L, 0.08, Z_PATA, 0.45)
    if kordon:
        blok(G, M['fasada'], h, s, L, 0.18, Z_KORDON - 0.3, Z_KORDON)
    if zrkadla:
        doska(G, M['seda'], h, s, L, Z_KORDON + 0.1, z_rimsa - 0.85, 0.012)
    blok(G, M['fasada'], h, s, L, 0.1, z_rimsa - 0.75, z_rimsa - 0.45)
    blok(G, M['fasada'], h, s, L + 0.3, 0.3, z_rimsa - 0.45, z_rimsa - 0.2)
    blok(G, M['fasada'], h, s, L + 0.6, 0.55, z_rimsa - 0.2, z_rimsa)


def lizena(G, M, h, s, w=0.5, z0=Z_KORDON, z1=Z_RIMSA - 0.75):
    blok(G, M['fasada'], h, s, w, 0.06, z0, z1)


def fasada_traktu(G, M, h, u0, osi, sever=False, dvere=None):
    """Fasáda časti traktu: rímsy, lizény medzi osami a na krajoch, okná prízemia s mrežami a okná poschodia."""
    rimsy(G, M, h, 0.0, h.L)
    hranice = [osi[0] - (osi[1] - osi[0]) / 2] + [(a + b) / 2 for a, b in zip(osi[:-1], osi[1:])] + \
              [osi[-1] + (osi[-1] - osi[-2]) / 2]
    for u in hranice:
        s = min(max(u - u0, 0.25), h.L - 0.25)
        lizena(G, M, h, s)
    for u in osi:
        s = u - u0
        if dvere is not None and abs(u - dvere) < 0.01:
            oblukova_doska(G, M['fasada'], h, s, 1.9, Z_PATA, 2.6, 0.03)
            oblukova_doska(G, M['ramy'], h, s, 1.5, Z_PATA, 2.6, 0.06)
            doska(G, M['tien'], h, s, 0.05, -1.0, 3.3, 0.08)
        else:
            okno_obdlz(G, M, h, s, 1.4, 1.3, 3.2, mreza=True)
        okno_poschodie(G, M, h, s)


def komin(G, M, u, v, z0, z1):
    G.kvader(M['komin'], B(u, v), U, 0.8, 1.3, z0, z1)
    G.kvader(M['komin'], B(u, v), U, 1.0, 1.5, z1 - 0.35, z1 - 0.2)
    G.kvader(M['kupola'], B(u, v), U, 0.95, 1.45, z1, z1 + 0.12)


# --- trakt: nárožné pavilóny a krídla ----------------------------------------------------------------------------------

def postav_trakt(G, M):
    budova(G, M['strecha'], PAVILON_Z, R_PAV_Z)
    budova(G, M['strecha'], PAVILON_V, R_PAV_V)
    budova(G, M['strecha'], KRIDLO_Z, R_KR_Z)
    budova(G, M['strecha'], KRIDLO_V, R_KR_V)
    # steny: pavilóny (južné líce predstupuje o 0,6–0,7 m), krídla, šikmé koncové steny
    steny = [
        ((0.0, 0.0), (PAV_Z, 0.28), R_PAV_Z, 0.0, OSI_PAV_Z, False, OSI_PAV_Z[2]),
        ((PAV_Z, 16.4), (-3.28, 16.11), R_PAV_Z, PAV_Z, OSI_PAV_Z[::-1], True, None),
        ((PAV_V, 0.16), (86.8, -0.2), R_PAV_V, PAV_V, OSI_PAV_V, False, OSI_PAV_V[2]),
        ((94.4, 16.15), (PAV_V, 16.3), R_PAV_V, 94.4, OSI_PAV_V[::-1], True, None),
        ((PAV_Z, V_JUH), (STRED[0], V_JUH), R_KR_Z, PAV_Z, OSI_KR_Z, False, None),
        ((STRED[0], V_SEVER), (PAV_Z, V_SEVER), R_KR_Z, STRED[0], OSI_KR_Z[::-1], True, None),
        ((STRED[1], 0.77), (PAV_V, 0.74), R_KR_V, STRED[1], OSI_KR_V, False, None),
        ((PAV_V, V_SEVER), (STRED[1], V_SEVER), R_KR_V, PAV_V, OSI_KR_V[::-1], True, None),
    ]
    for a, b, roviny, u0, osi, sever, dvere in steny:
        stena(G, M['fasada'], a, b, roviny)
        h = H(a, b)
        osi_s = [abs(u - u0) for u in osi] if sever else [u - u0 for u in osi]
        fasada_traktu(G, M, h, 0.0, osi_s, sever, None if dvere is None else dvere - u0)
    # schodíky pavilónov k líciam krídel a koncové šikmé steny s tromi osami
    for a, b, roviny in (((PAV_Z, 0.28), (PAV_Z, V_JUH), R_PAV_Z), ((PAV_V, 0.74), (PAV_V, 0.16), R_PAV_V)):
        stena(G, M['fasada'], a, b, roviny)
    for a, b, roviny in (((-3.28, 16.11), (0.0, 0.0), R_PAV_Z), ((86.8, -0.2), (94.4, 16.15), R_PAV_V)):
        stena(G, M['fasada'], a, b, roviny)
        h = H(a, b)
        rimsy(G, M, h, 0.0, h.L)
        for k in range(3):
            s = h.L * (k + 0.5) / 3
            okno_obdlz(G, M, h, s, 1.4, 1.3, 3.2, mreza=True)
            okno_poschodie(G, M, h, s)
    # bočné steny mansárd nad strechami krídel (pavilóny nemajú valbu ku krídlam)
    stena(G, M['strecha'], (PAV_Z, V_JUH), (PAV_Z, V_SEVER), R_PAV_Z, z_od=Z_RIMSA - 0.5)
    stena(G, M['strecha'], (PAV_V, V_SEVER), (PAV_V, 0.74), R_PAV_V, z_od=Z_RIMSA - 0.5)
    # vikiere: krídla po 2 na svah, pavilóny po 3 na strmej časti mansardy
    for u0, u1, v in ((OSI_KR_Z[1], OSI_KR_Z[4], V_JUH), (OSI_KR_V[1], OSI_KR_V[4], 0.76)):
        for u in (u0, u1):
            for h, vv in ((H((0.0, v), (1.0, v)), v), (H((1.0, V_SEVER), (0.0, V_SEVER)), V_SEVER)):
                s = u if vv != V_SEVER else 1.0 - u
                vikier(G, M, h, s, 1.9, Z_RIMSA + 0.71 * 1.9, 0.71, 1.1, 1.25, M['fasada'], M['strecha'], strmost=0.9,
                       okno_w=0.6)
    for osi, vj, vs in ((OSI_PAV_Z, V_JUH_P, 16.4), (OSI_PAV_V, 0.0, 16.25)):
        for u in osi[1:4]:
            vikier(G, M, H((0.0, vj), (1.0, vj)), u, 0.35, Z_RIMSA + 2.5 * 0.35, 2.5, 1.1, 1.7, M['fasada'], M['strecha'],
                   strmost=0.8, okno_w=0.62)
            vikier(G, M, H((1.0, vs), (0.0, vs)), 1.0 - u, 0.35, Z_RIMSA + 2.5 * 0.35, 2.5, 1.1, 1.7, M['fasada'],
                   M['strecha'], strmost=0.8, okno_w=0.62)
    # komíny (podľa lasera a fotiek)
    for u, v, z0, z1 in ((8.2, 7.5, 15.0, 19.2), (13.0, 8.2, 15.0, 18.2), (24.5, 8.6, 15.0, 17.6), (61.0, 8.6, 15.0, 17.6),
                         (76.8, 6.8, 15.0, 19.1), (78.6, 9.4, 15.0, 18.2)):
        komin(G, M, u, v, z0, z1)


# --- stredný pavilón, portikus ----------------------------------------------------------------------------------------

def okno_sala(G, M, h, s, z0=5.2):
    """Vysoké okno Veľkej sály s polkruhovým záverom, prehnutá rímsa s pozlátenou kartušou a rokajom."""
    okno_oblukove(G, M, h, s, 1.8, z0, 9.0, ram=0.2, priecnik=7.6)
    doska(G, M['ramy'], h, s - 0.45, 0.06, z0, 9.0, 0.072)
    doska(G, M['ramy'], h, s + 0.45, 0.06, z0, 9.0, 0.072)
    segmentova_rimsa(G, M['fasada'], h, s, 2.6, 10.25, 0.45, 0.22)
    ovalna_doska(G, M['zlato'], h, s, 10.45, 0.28, 0.22, 0.14, seg=10)
    for k in (-1, 1):
        ovalna_doska(G, M['fasada'], h, s + k * 0.95, 10.15, 0.28, 0.15, 0.1, seg=8)
        ovalna_doska(G, M['zlato'], h, s + k * 0.95, 10.15, 0.1, 0.07, 0.12, seg=6)
    blok(G, M['fasada'], h, s, 2.3, 0.14, z0 - 0.25, z0 - 0.1)


def pilaster(G, M, h, s, z0, z1):
    """Pilaster veľkého rádu: biely driek, pozlátená rokajová hlavica."""
    blok(G, M['fasada'], h, s, 1.1, 0.3, z0, z1 - 0.8)
    blok(G, M['zlato'], h, s, 1.05, 0.32, z1 - 0.8, z1 - 0.15)
    blok(G, M['fasada'], h, s, 1.25, 0.4, z1 - 0.15, z1)


def kladie(G, M, h, s0, s1):
    L, s = s1 - s0, (s0 + s1) / 2
    blok(G, M['fasada'], h, s, L, 0.2, 12.4, 13.0)
    blok(G, M['fasada'], h, s, L + 0.3, 0.35, 13.0, 13.7)
    blok(G, M['fasada'], h, s, L + 0.7, 0.65, 13.7, Z_RIMSA_S)


def stit(G, M, h, sochy=True, znak=True):
    """Trojuholníkový štít nad čelom pavilónu: sivý tympanón, šikmé rímsy, kartuša so štátnym znakom, sochy."""
    L = h.L
    sc = L / 2
    tymp = [(*h.bod(0.3, 0.02), Z_RIMSA_S), (*h.bod(L - 0.3, 0.02), Z_RIMSA_S), (*h.bod(sc, 0.02), Z_STIT - 0.5)]
    G.plocha(M['fasada'], [(*h.bod(0.0, 0.0), Z_RIMSA_S), (*h.bod(L, 0.0), Z_RIMSA_S), (*h.bod(sc, 0.0), Z_STIT)])
    G.plocha(M['tympanon'], tymp)
    for k in (-1, 1):
        a = (*h.bod(sc + k * (L / 2 + 0.35), 0.3), Z_RIMSA_S - 0.05)
        b = (*h.bod(sc, 0.3), Z_STIT + 0.3)
        G.tram(M['fasada'], a, b, 0.55)
    if znak:                                                               # štátny znak v pozlátenej kartuši
        zc = Z_RIMSA_S + 1.4
        ovalna_doska(G, M['zlato'], h, sc, zc, 0.9, 1.0, 0.1, seg=14)
        ovalna_doska(G, M['fasada'], h, sc, zc, 0.75, 0.85, 0.12, seg=14)
        doska(G, M['cervena'], h, sc, 0.9, zc - 0.55, zc + 0.6, 0.14)
        doska(G, M['modra'], h, sc, 0.9, zc - 0.55, zc - 0.3, 0.16)
        doska(G, M['biela'], h, sc, 0.12, zc - 0.25, zc + 0.48, 0.16)
        for z, w in ((zc + 0.28, 0.42), (zc + 0.05, 0.56)):
            doska(G, M['biela'], h, sc, w, z - 0.05, z + 0.05, 0.16)
    if sochy:                                                              # dve sediace sochy na šikmých rímsach
        for k in (-1, 1):
            p = h.bod(sc + k * 2.2, 0.35)
            socha(G, M, p, Z_STIT - 0.95 + 0.0, 1.7, 1.0, sediaca=True)


def postav_stredny_pavilon(G, M):
    u0, u1 = STRED
    # steny pavilónu až po rímsu (dolné časti skrýva portikus a krídla)
    obrys = [(u0, V_STRED_J), (u1, V_STRED_J), (u1, V_SEVER), (50.8, V_SEVER), (50.8, V_STRED_S), (35.8, V_STRED_S),
             (35.8, V_SEVER), (u0, V_SEVER)]
    for i in range(len(obrys)):
        a, b = obrys[i], obrys[(i + 1) % len(obrys)]
        h = H(a, b)
        G.stena(M['fasada'], h.a, h.b, Z_PATA, Z_RIMSA_S)
        blok(G, M['fasada'], h, h.L / 2, h.L + 0.6, 0.55, Z_RIMSA_S - 0.25, Z_RIMSA_S)
        blok(G, M['fasada'], h, h.L / 2, h.L + 0.3, 0.3, Z_RIMSA_S - 0.6, Z_RIMSA_S - 0.25)
    budova(G, M['kupola'], KUPOLA_OB, R_KUPOLA)
    # južné čelo: 4 pilastre, 3 okná Veľkej sály, sivé plochy, kladie a štít
    hj = H((u0, V_STRED_J), (u1, V_STRED_J))
    doska(G, M['seda'], hj, hj.L / 2, hj.L, Z_TERASA, 12.4, 0.012)
    for u in PILASTRE:
        pilaster(G, M, hj, u - u0, Z_TERASA, 12.4)
    for u in OSI_STRED:
        okno_sala(G, M, hj, u - u0)
    kladie(G, M, hj, 0.0, hj.L)
    stit(G, M, hj)
    # bočné steny južnej časti pavilónu: po jednom okne
    for a, b in (((u0, 0.0), (u0, V_STRED_J)), ((u1, V_STRED_J), (u1, 0.0))):
        h = H(a, b)
        doska(G, M['seda'], h, h.L / 2, h.L - 1.0, Z_TERASA, 12.4, 0.012)
        okno_sala(G, M, h, h.L / 2)
        kladie(G, M, h, 0.0, h.L)
        for s in (0.45, h.L - 0.45):
            pilaster(G, M, h, s, Z_TERASA, 12.4)
    # severné (záhradné) čelo: sala terrena s troma oblúkovými dverami, balkón na konzolách, 3 okná, štít
    hs = H((50.8, V_STRED_S), (35.8, V_STRED_S))
    doska(G, M['seda'], hs, hs.L / 2, hs.L, Z_KORDON, 12.4, 0.012)
    blok(G, M['kamen'], hs, hs.L / 2, hs.L, 0.08, Z_PATA, 0.3)
    blok(G, M['fasada'], hs, hs.L / 2, hs.L, 0.18, Z_KORDON - 0.3, Z_KORDON)
    for u in PILASTRE[1:3] + [36.3, 50.3]:
        pilaster(G, M, hs, 50.8 - u, Z_KORDON, 12.4)
    for u in OSI_STRED:
        s = 50.8 - u
        oblukova_doska(G, M['fasada'], hs, s, 2.2, -0.2, 2.9, 0.03)
        oblukova_doska(G, M['sklo'], hs, s, 1.8, 0.0, 2.9, 0.05)
        doska(G, M['ramy'], hs, s, 0.07, 0.0, 3.75, 0.07)
        okno_sala(G, M, hs, s, z0=5.6)
    kladie(G, M, hs, 0.0, hs.L)
    stit(G, M, hs, znak=False)
    ob = [hs.bod(0.0, 0.0), hs.bod(hs.L, 0.0), hs.bod(hs.L, 1.1), hs.bod(0.0, 1.1)]
    G.hranol(M['kamen'], ob[::-1], 4.55, 4.8, spodok=True)
    for i in range(7):
        blok(G, M['kamen'], hs, 0.6 + (hs.L - 1.2) * i / 6, 0.3, 1.0, 3.9, 4.55)
    balustrada(G, M, Hrana(hs.bod(0.05, 1.05), hs.bod(hs.L - 0.05, 1.05)), 4.8, 5.8)
    # ozdoby kupoly: hroty a stožiar s vlajkou
    for v in (0.5, 15.7):
        c = B(43.05, v)
        rotacne(G, M['kupola'], c, [(0.25, Z_KUPOLA), (0.18, Z_KUPOLA + 0.3), (0.12, Z_KUPOLA + 0.5), (0.02, Z_KUPOLA + 1.2)],
                seg=6)
    c = B(43.05, 8.0)
    G.valec(M['mreza'], c, 0.06, Z_KUPOLA, Z_KUPOLA + 4.0, seg=6)
    vlajka_sk(G, M, c, Z_KUPOLA + 4.0, 1.8, 1.2)


def balustrada(G, M, h, z0, z1, krok=0.3, mat='fasada'):
    L = h.L
    blok(G, M[mat], h, L / 2, L, 0.36, z0, z0 + 0.14, von0=-0.18)
    blok(G, M[mat], h, L / 2, L, 0.4, z1 - 0.15, z1, von0=-0.2)
    for i in range(int(L / krok)):
        G.kvader(M[mat], h.bod(krok * (i + 0.5), 0.0), h.t, 0.13, 0.13, z0 + 0.14, z1 - 0.15, vrch=False)


def postav_portikus(G, M):
    """Murovaný portikus s arkádami pred stredným pavilónom, terasa s balustrádou a pozláteným kovaným úsekom."""
    ob = PORTIKUS
    budova(G, M['kamen'], [ob[0], ob[1], ob[3], ob[4], ob[6], ob[7]], [plocha(Z_TERASA)])   # terasa (konvexný obrys)
    for i in range(len(ob) - 1):
        a, b = ob[i], ob[i + 1]
        h = H(a, b)
        G.stena(M['fasada'], h.a, h.b, Z_PATA, Z_TERASA)
        blok(G, M['kamen'], h, h.L / 2, h.L, 0.08, Z_PATA, 0.35)
        blok(G, M['fasada'], h, h.L / 2, h.L + 0.3, 0.3, Z_TERASA - 0.45, Z_TERASA)
        if h.L > 10:                                                       # čelo: 3 oblúky, v strede hlavné dvere
            sc = 43.3 - ob[i][0]
            for s, w in ((sc - 4.6, 2.2), (sc, 3.0), (sc + 4.6, 2.2)):
                oblukova_doska(G, M['fasada'], h, s, w + 0.4, Z_PATA, 2.15, 0.03)
                oblukova_doska(G, M['tien'], h, s, w, 0.0, 2.15, 0.05)
            oblukova_doska(G, M['ramy'], h, sc, 2.0, 0.0, 2.2, 0.07)
            doska(G, M['sklo'], h, sc, 1.6, 1.0, 2.8, 0.08)
            balustrada(G, M, h, Z_TERASA, Z_TERASA + 1.0)
            # pozlátený kovaný úsek v strede terasy
            hz = Hrana(h.bod(sc - 1.8, -0.1), h.bod(sc + 1.8, -0.1))
            doska(G, M['mreza'], hz, hz.L / 2, hz.L, Z_TERASA + 0.95, Z_TERASA + 1.02, -0.02)
            for k in range(9):
                ovalna_doska(G, M['zlato'], hz, 0.2 + k * 0.4, Z_TERASA + 0.55, 0.13, 0.25, -0.03, seg=8)
        elif h.L > 5:                                                      # boky: veľké oblúky prejazdu
            oblukova_doska(G, M['fasada'], h, h.L / 2, 3.9, Z_PATA, 1.9, 0.03)
            oblukova_doska(G, M['tien'], h, h.L / 2, 3.5, 0.0, 1.9, 0.05)
        elif i in (1, 5):                                                  # zaoblené rohy: oblúk
            oblukova_doska(G, M['fasada'], h, h.L / 2, 2.2, Z_PATA, 2.0, 0.03)
            oblukova_doska(G, M['tien'], h, h.L / 2, 1.8, 0.0, 2.0, 0.05)
        if h.L <= 10:
            balustrada(G, M, h, Z_TERASA, Z_TERASA + 1.0)
    # lampáše pri bočných oblúkoch
    for a, b in ((ob[0], ob[1]), (ob[-2], ob[-1])):
        h = H(a, b)
        for s in (0.7, h.L - 0.7):
            p = h.bod(s, 0.45)
            G.kvader(M['mreza'], p, U, 0.25, 0.25, 2.6, 3.1)


# --- čestný dvor: mreža, brány, stožiare, dlažba ------------------------------------------------------------------------

def vlajka_sk(G, M, c, z, d, v):
    """Vlajka SR (biela, modrá, červená) so zjednodušeným znakom pri žrdi."""
    t = (U[0], U[1])
    P = lambda x, zz: (c[0] + t[0] * x, c[1] + t[1] * x, zz)
    for i, mat in enumerate(('biela', 'modra', 'cervena')):
        z1 = z - v * i / 3
        G.plocha(M[mat], [P(0.05, z1), P(0.05 + d, z1), P(0.05 + d, z1 - v / 3), P(0.05, z1 - v / 3)])
    for o in (-0.01, 0.01):                                                # znak na oboch stranách vlajky
        Q = lambda x, zz: (c[0] + t[0] * x - U[1] * o, c[1] + t[1] * x + U[0] * o, zz)
        G.plocha(M['cervena'], [Q(0.3, z - 0.2), Q(0.72, z - 0.2), Q(0.72, z - 0.85), Q(0.3, z - 0.85)])
        G.plocha(M['modra'], [Q(0.3, z - 0.7), Q(0.72, z - 0.7), Q(0.72, z - 0.85), Q(0.3, z - 0.85)])
        for x0, x1, z0, z1 in ((0.49, 0.53, z - 0.68, z - 0.27), (0.42, 0.6, z - 0.38, z - 0.34), (0.39, 0.63, z - 0.52, z - 0.48)):
            G.plocha(M['biela'], [Q(x0, z1), Q(x1, z1), Q(x1, z0), Q(x0, z0)])


def vlajka_eu(G, M, c, z, d, v):
    t = (U[0], U[1])
    P = lambda x, zz: (c[0] + t[0] * x, c[1] + t[1] * x, zz)
    G.plocha(M['eu'], [P(0.05, z), P(0.05 + d, z), P(0.05 + d, z - v), P(0.05, z - v)])
    for k in range(12):
        f = 2 * math.pi * k / 12
        x, zz = 0.05 + d / 2 + 0.33 * v * math.cos(f), z - v / 2 + 0.33 * v * math.sin(f)
        G.plocha(M['zlato'], [P(x - 0.04, zz - 0.04), P(x + 0.04, zz - 0.04), P(x + 0.04, zz + 0.04), P(x - 0.04, zz + 0.04)])


def pilier(G, M, p, t, z1):
    """Kamenný pilier mreže s rímsou a urnou."""
    G.kvader(M['kamen'], p, t, 0.65, 0.65, 0.6, z1)
    G.kvader(M['kamen'], p, t, 0.8, 0.8, z1, z1 + 0.15)
    z = z1 + 0.15
    rotacne(G, M['kamen'], p, [(0.18, z), (0.32, z + 0.3), (0.12, z + 0.6), (0.0, z + 0.85)], seg=6)


def postav_mrezu(G, M):
    """Bellušova mreža: kamenný sokel, piliere s urnami, čierna kovaná mreža s pozlátenými rozetami, dve brány."""
    L = MREZA_LINIA
    for i in range(len(L) - 1):
        a, b = L[i], L[i + 1]
        h = H(a, b)
        if h.L < 0.1:
            continue
        G.kvader(M['kamen'], h.bod(h.L / 2), h.t, h.L + 0.5, 0.55, -0.4, 0.6)
        n = max(1, round(h.L / 3.5))
        for k in range(n + 1):
            s = h.L * k / n
            if k == 0 and i > 0:
                continue
            p = h.bod(s)
            if any(math.dist(p, B(*L[j])) < 1.9 for j in BRANY):           # v bráne pilier nie je
                continue
            pilier(G, M, p, h.t, 2.5)
        # polia mreže: zvislé prúty, pásy, pozlátené rozety
        doska(G, M['mreza'], h, h.L / 2, h.L, 2.25, 2.32, 0.0)
        doska(G, M['mreza'], h, h.L / 2, h.L, 0.75, 0.82, 0.0)
        doska(G, M['mreza'], h, h.L / 2, h.L, 1.62, 1.68, 0.0)
        for k in range(int(h.L / 0.22)):
            doska(G, M['mreza'], h, 0.11 + k * 0.22, 0.03, 0.6, 2.4, 0.0)
        for k in range(int(h.L / 1.75)):
            ovalna_doska(G, M['zlato'], h, 0.87 + k * 1.75, 1.95, 0.13, 0.13, 0.02, seg=8)
            ovalna_doska(G, M['zlato'], h, 0.87 + k * 1.75, 1.95, 0.13, 0.13, -0.02, seg=8)
    # dve hlavné brány s oblúkovým horným okrajom a pozláteným nástavcom
    for i in BRANY:
        a, b = L[i - 1], L[i + 1]
        h = Hrana(B(*a), B(*b))
        s = Hrana(B(*a), B(*L[i])).L
        obluk = [(*h.bod(s + 1.5 * math.cos(math.pi * k / 8), 0.0), 2.6 + 1.5 * math.sin(math.pi * k / 8)) for k in range(9)]
        for p, q in zip(obluk[:-1], obluk[1:]):                            # oblúkový horný okraj krídiel
            G.tram(M['mreza'], p, q, 0.08)
        for z in (0.65, 1.6):
            G.tram(M['mreza'], (*h.bod(s - 1.5, 0.0), z), (*h.bod(s + 1.5, 0.0), z), 0.07)
        for k in range(-7, 8):
            G.tram(M['mreza'], (*h.bod(s + k * 0.2, 0.0), 0.6), (*h.bod(s + k * 0.2, 0.0), 2.6 + math.sqrt(max(0.0, 2.25 - (k * 0.2) ** 2))), 0.03)
        for k in (-1, 1):                                                  # vyššie piliere pri bráne
            pilier(G, M, h.bod(s + k * 1.85), h.t, 2.9)
        ovalna_doska(G, M['zlato'], h, s, 4.45, 0.45, 0.5, 0.05, seg=12)
        ovalna_doska(G, M['zlato'], h, s, 4.45, 0.45, 0.5, -0.05, seg=12)
        for k in (-1, 1):
            ovalna_doska(G, M['zlato'], h, s + k * 0.55, 4.15, 0.3, 0.16, 0.05, seg=8)
            ovalna_doska(G, M['zlato'], h, s + k * 0.55, 4.15, 0.3, 0.16, -0.05, seg=8)
    # päť stožiarov s vlajkami (SR – EÚ – SR – EÚ – SR)
    for i, (u, v) in enumerate(STOZIARE):
        c = B(u, v)
        G.valec(M['kamen'], c, 0.35, -0.2, 0.3, seg=8)
        G.valec(M['mreza'], c, 0.09, 0.3, 18.0, seg=6, r1=0.06)
        (vlajka_sk if i % 2 == 0 else vlajka_eu)(G, M, c, 17.6, 3.0, 2.0)
    # svetlá kamenná dlažba čestného dvora
    for cast in ([(0.0, 0.0), (11.08, -24.21), (24.84, -29.66), (31.95, -29.26), (32.6, 0.9)],
                 [(31.95, -29.26), (33.97, -32.87), (37.57, -35.0), (41.4, -35.72), (45.44, -35.62), (49.66, -34.74),
                  (52.9, -32.89), (55.02, -29.31), (54.2, 0.8), (32.6, 0.9)],
                 [(55.02, -29.31), (72.11, -24.71), (86.15, -1.12), (86.8, -0.2), (54.2, 0.8)]):
        G.plocha(M['dlazba'], [(*B(*p), 0.06) for p in cast])


def postav():
    """Vracia (Geo, výška modelu)."""
    G = Geo()
    M = {
        'fasada': material('omietka-biela-grassalkovic', BIELA, drsnost=0.85),
        'lizeny': material('omietka-biela-grassalkovic', BIELA, drsnost=0.85),
        'seda': material('omietka-seda-grassalkovic', SEDA, drsnost=0.85),
        'tympanon': material('tympanon-grassalkovic', TYMPANON, drsnost=0.85),
        'zlato': material('zlato-grassalkovic', ZLATO, drsnost=0.35, kov=0.6),
        'socha': material('socha-grassalkovic', SOCHA, drsnost=0.8),
        'strecha': material('bridlica-grassalkovic', STRECHA, drsnost=0.6),
        'kupola': material('kupola-grassalkovic', KUPOLA, drsnost=0.55, kov=0.1),
        'komin': material('komin-grassalkovic', KOMIN, drsnost=0.9),
        'kamen': material('kamen-grassalkovic', KAMEN, drsnost=0.85),
        'dlazba': material('dlazba-dvor-grassalkovic', DLAZBA, drsnost=0.9),
        'ramy': material('ramy-grassalkovic', RAMY, drsnost=0.7),
        'sklo': material('sklo-grassalkovic', SKLO, drsnost=0.15, kov=0.4),
        'mreza': material('mreza-grassalkovic', MREZA, drsnost=0.5, kov=0.4),
        'tien': material('tien-grassalkovic', TIEN, drsnost=0.9),
        'biela': material('vlajka-biela-grassalkovic', VLAJKA_B, drsnost=0.8),
        'modra': material('vlajka-modra-grassalkovic', VLAJKA_M, drsnost=0.8),
        'cervena': material('vlajka-cervena-grassalkovic', VLAJKA_C, drsnost=0.8),
        'eu': material('vlajka-eu-grassalkovic', EU_M, drsnost=0.8),
    }
    postav_trakt(G, M)
    postav_stredny_pavilon(G, M)
    postav_portikus(G, M)
    postav_mrezu(G, M)
    return G, Z_KUPOLA + 4.0                # vrch stožiara na kupole (plochý vrchol kupoly 20,4 m)


# bod na dlažbe čestného dvora pred portikom (lokálne x, z hry) – model sa kladie naň
_zb = B(43.3, -14.0)
ZAKLADNA_BOD = [round(_zb[0], 2), round(-_zb[1], 2)]
