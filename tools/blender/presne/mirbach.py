# Mirbachov palác, Františkánske námestie 11 – rokokový mestský palác (1768–1770, staviteľ M. Höllrigl pre pivovarníka
# M. Specha), od 1975 Galéria mesta Bratislavy. Štyri krídla okolo nádvoria. Jediná uličná fasáda do Františkánskeho
# námestia: 11 osí (3 + brána + 3 + brána + 3), plytký rizalit troch stredných osí s trojuholníkovým tympanónom
# (erb Nyáryovcov s grófskou korunou, za ním medená priečna strieška), dve rovnaké rokokové brány s pilastrami,
# vázami a rokajovými kartušami, stredný balkón na dvoch volútových konzolách s bielym zábradlím s pozlátenými
# rokajmi, okná stredných osí s oblúkovým záverom, bočné časti s pásovou bosážou; sedlová strecha s medeným
# oplechovaním a štyrmi vikiermi, južná štítová stena nad susedným domom. Dvorné krídla majú pultové strechy stúpajúce
# k susedom, na SZ je nižšia prístavba. Nádvorie s kamennými pavlačami na západe a juhu, arkádou severného
# krídla, oblou stenou oválneho schodiska v SV rohu a fontánou s bronzovým súsoším Tritóna a nymfy.
# Presný model exteriéru podľa prieskumu v napady/pamiatky-podklady.md („Mirbachov palác“):
#  - pôdorys z OSM (relácia 207207 – obrys a nádvorie), výšky z laserového skenovania ÚGKK (DMP/DMR, INSPIRE WMS),
#  - fasády podľa verejných fotografií (Wikimedia Commons, len na porovnanie) a správ o obnove 2016 a 2026:
#    teplo biela omietka, biele štuky, hnedé drevené vráta, červenohnedá škridla, zelená meď.
# Lokálna sústava: u = pozdĺž hlavnej fasády (azimut 1,8°, od južného nárožia na sever), v = do bloku (na západ);
# začiatok = južné nárožie hlavnej fasády (OSM). Nula výšky = dlažba námestia pred stredom fasády (≈ 141,8 m);
# námestie klesá od severného nárožia (+0,9 m) k južnému (−0,7 m).
import math

from veze import Geo
from spolocne import material
from presne.snd import Hrana, doska, blok, oblukova_doska, ovalna_doska, fronton, segmentova_rimsa
from presne.reduta import rotacne
from presne.radnica import rovina, strecha, stena_pod_strechou, okno, rad_okien, vikier
from presne.primacialny import vaza

BIELA, STUK, RYHA, TIEN, SOKEL = '#ebe6da', '#f4f0e7', '#d9d2c3', '#cdc6b7', '#d2cbbb'
DVOR, DVOR_SEVER, STENA, DLAZBA = '#e6d3bf', '#ece0cc', '#efeae0', '#b9b2a5'
STRECHA, MED, KOMIN = '#9a5641', '#8fb3a0', '#d9d2c4'
DREVO, DREVO_SVETLE, SKLO, ZLATO = '#5e3a22', '#7a4d2e', '#2e3540', '#c9a040'
MREZA, ZELEZO, CERVENA, MODRA, BRONZ, VODA = '#ece9e2', '#2b2b2b', '#a8322d', '#2f4f8f', '#6b5a3e', '#6f8a94'

AZ = math.radians(1.845)
U = (math.sin(AZ), math.cos(AZ))
V = (-U[1], U[0])
O = (19.09, -12.73)                     # južné nárožie hlavnej fasády (Blender: x = x hry, y = −z hry, od stredu)


def B(u, v):
    return (O[0] + U[0] * u + V[0] * v, O[1] + U[1] * u + V[1] * v)


def H(a, b):
    return Hrana(B(*a), B(*b))


def R(a, b, z0, sklon):
    return rovina(B(*a), B(*b), z0, sklon, uv=False)


# --- rozmery (m nad dlažbou pred stredom fasády) --------------------------------------------------------------------
# Laser (DMP, mriežka 1 m): korunná rímsa ~13,4 m, hrebeň uličného krídla 19,6 m (7,3 m za fasádou, sklon do ulice
# ~38°, do nádvoria ~45°), odkvapy do nádvoria ~13,6 m, pultové strechy krídel stúpajú k hraniciam so susedmi
# (~20 m), prístavba na SZ hrebeň ~18,9 m, tympanón ~2 m nad rímsou. Podlažia a osi z fotiek (mierka z rímsy a dĺžky).
Z_PATA = -1.0
DLZKA = 31.06                           # dĺžka hlavnej fasády
Z_KORDON = 5.0                          # kordónová rímsa nad prízemím
Z_FRIZ = 12.55                          # vlys pod korunnou rímsou
Z_RIMSA = 13.35                         # vrch korunnej rímsy
Z_STIT = 15.45                          # vrchol tympanónu
Z_DVOR = 13.6                           # odkvap do nádvoria
ROH = 0.84                              # nárožná lizéna
OSI = [2.115, 4.665, 7.215, 9.898, 12.714, 15.53, 18.346, 21.162, 23.845, 26.395, 28.945]   # osi 1–11
STRED = (8.49, 22.57)                   # stredná časť (osi 4–8) s lizénami
RIZALIT = (11.306, 19.754, -0.2)        # osi 5–7: u0, u1, v líca
STIT = (RIZALIT[0] - 0.2, RIZALIT[1] + 0.2)


def teren(u):
    """Výška dlažby pred fasádou (námestie klesá na juh)."""
    return -0.7 + 1.6 * u / DLZKA


# pôdorysy (u, v) proti smeru hodinových ručičiek; krídla sa prekrývajú v rohoch (strechy = horná obálka)
ULICA_A = [(0.0, 0.0), (9.56, -0.3), (DLZKA, 0.0), (30.11, 6.81), (-1.74, 6.9)]
ULICA_B = [(-1.74, 6.9), (27.07, 6.98), (26.87, 13.34), (-3.36, 13.3)]
SEVER = [(16.74, 6.98), (27.07, 6.98), (26.87, 13.34), (27.11, 14.38), (26.31, 18.48), (23.44, 29.94), (17.6, 43.4),
         (14.51, 33.02)]
JUH = [(-1.74, 6.9), (6.01, 6.9), (0.52, 27.23), (-7.57, 29.96)]
ZAPAD = [(-6.18, 24.46), (17.0, 34.05), (17.6, 43.4), (3.96, 36.13), (-7.57, 29.96)]
PRISTAVBA = [(23.44, 29.94), (27.09, 32.1), (27.58, 33.46), (26.08, 36.07), (23.11, 40.96), (20.86, 44.68), (17.6, 43.4)]
NADVORIE = [(4.28, 13.3), (16.2, 13.3), (14.51, 33.02), (0.52, 27.23)]   # JV, SV, SZ, JZ roh

# roviny striech
E_VON = R((0.0, -0.65), (DLZKA, -0.65), 13.42, 0.78)
E_DNU = R((DLZKA, 13.3), (-3.36, 13.3), Z_DVOR, 1.0)
N_DNU = R((14.51, 33.02), (16.74, 6.98), Z_DVOR, 0.63)
S_DNU = R((6.01, 6.9), (0.52, 27.23), Z_DVOR, 0.9)
W_DNU = R((0.52, 27.23), (14.51, 33.02), Z_DVOR, 0.85)
P_JUH = R((0.0, 33.5), (1.0, 33.5), 15.2, 0.7)
P_SEVER = R((1.0, 45.0), (0.0, 45.0), 14.6, 0.7)
RE, RN, RS, RW, RP = [E_VON, E_DNU], [N_DNU, E_VON], [S_DNU, E_VON], [W_DNU], [P_JUH, P_SEVER]


def budova(G, mat_strecha, obrys_uv, roviny):
    strecha(G, mat_strecha, [B(*p) for p in obrys_uv], roviny)


def stena(G, mat, a, b, roviny, z_od=None):
    stena_pod_strechou(G, mat, B(*a), B(*b), roviny, z_od)


def na_rovine(r, u, v, dz=0.03):
    x, y = B(u, v)
    return (x, y, r[0] * x + r[1] * y + r[2] + dz)


# --- prvky fasády ----------------------------------------------------------------------------------------------------

def mreza(G, M, h, s, w, z0, z1, von=0.12):
    """Biela kovaná mreža okna prízemia: zvislé prúty, priečka a dvojica C-volút."""
    for k in range(5):
        doska(G, M['mreza'], h, s - w / 2 + w * (k + 0.5) / 5, 0.035, z0, z1, von)
    for z in (z0 + (z1 - z0) * 0.5, z1 - 0.08):
        doska(G, M['mreza'], h, s, w, z - 0.02, z + 0.02, von)
    for k in (-1, 1):                                                      # krúžky z prúta (biely ovál, v ňom sklo)
        ovalna_doska(G, M['mreza'], h, s + k * w / 4, z0 + (z1 - z0) * 0.27, w / 5, (z1 - z0) * 0.14, von + 0.005, seg=10)
        ovalna_doska(G, M['sklo'], h, s + k * w / 4, z0 + (z1 - z0) * 0.27, w / 5 - 0.045, (z1 - z0) * 0.14 - 0.045,
                     von + 0.01, seg=10)


def oblucik(G, mat, h, s, zc, rw, rh, a0, a1, n, hrubka=0.035):
    """Kovaný oblúčik (časť elipsy) z tenkých trámov v rovine hrany h."""
    body = [(*h.bod(s + rw * math.cos(a0 + (a1 - a0) * k / n), 0.0), zc + rh * math.sin(a0 + (a1 - a0) * k / n))
            for k in range(n + 1)]
    for p, q in zip(body[:-1], body[1:]):
        G.tram(mat, p, q, hrubka)


def okno_oblukove(G, M, h, s, w, z0, z_pata, ram=0.18, priecnik=None):
    """Okno s polkruhovým záverom: šambrána, sklo, zvislá priečka, voliteľne priečnik."""
    oblukova_doska(G, M['stuk'], h, s, w + 2 * ram, z0 - ram, z_pata, 0.03)
    oblukova_doska(G, M['sklo'], h, s, w, z0, z_pata, 0.06)
    doska(G, M['stuk'], h, s, 0.07, z0, z_pata + w / 2 - 0.03, 0.08)
    if priecnik:
        doska(G, M['stuk'], h, s, w, priecnik - 0.04, priecnik + 0.04, 0.08)


def okno_prizemie(G, M, h, s, oblukove=False):
    zg = 1.25
    if oblukove:
        okno_oblukove(G, M, h, s, 1.3, zg, 3.0, ram=0.18)
        mreza(G, M, h, s, 1.25, zg + 0.05, 3.3)
    else:
        okno(G, M, h, s, 1.3, zg, 3.35, ram=0.18, mat_ram=M['stuk'], priecky=1, priecnik=2.6)
        mreza(G, M, h, s, 1.25, zg + 0.05, 3.3)
    blok(G, M['stuk'], h, s, 1.75, 0.12, zg - 0.32, zg - 0.18)            # parapet


def rokaj(G, M, h, s, z, von=0.12):
    """Rokajový štuk: mušľa a C-volúty s vetvičkami."""
    ovalna_doska(G, M['stuk'], h, s, z, 0.3, 0.22, von, seg=12)
    ovalna_doska(G, M['stuk'], h, s, z + 0.04, 0.16, 0.12, von + 0.04, seg=10)
    for k in (-1, 1):
        ovalna_doska(G, M['stuk'], h, s + k * 0.45, z - 0.08, 0.15, 0.08, von - 0.01, seg=8)
        ovalna_doska(G, M['stuk'], h, s + k * 0.62, z - 0.14, 0.08, 0.05, von - 0.01, seg=6)


def okno_1p(G, M, h, s, typ):
    """Okno hlavného poschodia: 'bok' = obdĺžnikové s uchami, parapetným poľom, vlysom a rovnou rímsou,
    'portal' = s trojuholníkovým frontónom, 'stred' / 'balkon' = s oblúkovým záverom, rokajom a segmentovou rímsou."""
    if typ in ('bok', 'portal'):
        okno(G, M, h, s, 1.35, 6.0, 8.6, ram=0.2, mat_ram=M['stuk'], priecky=1, priecnik=7.9)
        for k in (-1, 1):
            blok(G, M['stuk'], h, s + k * 0.9, 0.22, 0.07, 8.35, 8.85)      # uchá šambrány
        blok(G, M['stuk'], h, s, 1.85, 0.12, 5.78, 5.9)
        if typ == 'bok':
            doska(G, M['stuk'], h, s, 1.4, 5.3, 5.78, 0.04)                 # parapetné pole
            doska(G, M['stuk'], h, s, 1.6, 8.85, 9.05, 0.03)                # vlys
            blok(G, M['stuk'], h, s, 2.0, 0.2, 9.05, 9.25)
            blok(G, M['stuk'], h, s, 2.15, 0.12, 9.25, 9.37)
        else:
            blok(G, M['stuk'], h, s, 2.0, 0.18, 8.85, 9.0)
            fronton(G, M['stuk'], h, s, 2.15, 9.0, 0.6, 0.2)
            rokaj(G, M, h, s, 9.22, 0.1)
    else:
        z0 = 5.62 if typ == 'balkon' else 5.95
        okno_oblukove(G, M, h, s, 1.35, z0, 7.9, ram=0.2, priecnik=7.9)
        if typ != 'balkon':
            doska(G, M['stuk'], h, s, 1.4, 5.3, 5.75, 0.04)
            blok(G, M['stuk'], h, s, 1.85, 0.12, 5.75, 5.87)
        rokaj(G, M, h, s, 8.98)
        segmentova_rimsa(G, M['stuk'], h, s, 2.1, 9.2, 0.42, 0.22)
        blok(G, M['stuk'], h, s, 2.15, 0.16, 9.08, 9.22)


def okno_2p(G, M, h, s, oblukove=False):
    if oblukove:
        okno_oblukove(G, M, h, s, 1.25, 10.1, 11.45, ram=0.17, priecnik=11.45)
        return
    okno(G, M, h, s, 1.25, 10.05, 12.1, ram=0.17, mat_ram=M['stuk'], priecky=1, priecnik=11.5)
    doska(G, M['stuk'], h, s, 1.3, 9.62, 9.9, 0.04)
    blok(G, M['stuk'], h, s, 1.7, 0.1, 9.9, 10.0)


def z_sokel(h, s):
    """Vrch sokla: 0,45 m nad dlažbou námestia (v bode s hrany h)."""
    p = h.bod(s)
    u = (p[0] - O[0]) * U[0] + (p[1] - O[1]) * U[1]
    return teren(min(max(u, 0.0), DLZKA)) + 0.45


def rimsy(G, M, h, s0, s1, kordon=True, sokel=True):
    """Kamenný sokel podľa sklonu námestia, kordónová rímsa, vlys a korunná rímsa úseku fasády."""
    L, s = s1 - s0, (s0 + s1) / 2
    if sokel:
        G.plocha(M['sokel'], [(*h.bod(s0, 0.1), Z_PATA), (*h.bod(s1, 0.1), Z_PATA), (*h.bod(s1, 0.1), z_sokel(h, s1)),
                              (*h.bod(s0, 0.1), z_sokel(h, s0))])
    if kordon:
        blok(G, M['stuk'], h, s, L, 0.16, Z_KORDON - 0.3, Z_KORDON)
        blok(G, M['stuk'], h, s, L, 0.08, Z_KORDON - 0.42, Z_KORDON - 0.3)
    blok(G, M['stuk'], h, s, L, 0.08, Z_FRIZ, Z_FRIZ + 0.3)
    blok(G, M['stuk'], h, s, L + 0.3, 0.32, Z_FRIZ + 0.3, Z_RIMSA - 0.3)
    blok(G, M['stuk'], h, s, L + 0.7, 0.62, Z_RIMSA - 0.3, Z_RIMSA)


def bosaz(G, M, h, s0, s1):
    """Vodorovná pásová bosáž bočných častí fasády (ryhy po 0,55 m)."""
    z = 0.95
    while z < Z_FRIZ - 0.2:
        if not (Z_KORDON - 0.45 < z < Z_KORDON + 0.05):
            doska(G, M['ryha'], h, (s0 + s1) / 2, s1 - s0, z, z + 0.045, 0.012)
        z += 0.55


def lizena(G, M, h, s, w=0.6, z0=Z_KORDON, konzoly=1):
    """Hladká lizéna cez poschodia, hore esovité konzoly pod korunnou rímsou (1 alebo dvojica)."""
    blok(G, M['stuk'], h, s, w, 0.14, z0, Z_FRIZ)
    if not konzoly:
        return
    for k in ([0.0] if konzoly == 1 else [-0.17, 0.17]):
        blok(G, M['stuk'], h, s + k, 0.24, 0.3, Z_FRIZ - (1.3 if konzoly == 2 else 0.7), Z_FRIZ + 0.3)
        blok(G, M['stuk'], h, s + k, 0.26, 0.5, Z_FRIZ + 0.05, Z_FRIZ + 0.62)
        ovalna_doska(G, M['stuk'], Hrana(h.bod(s + k - 0.5, 0.31), h.bod(s + k + 0.5, 0.31)), 0.5,
                     Z_FRIZ - (1.3 if konzoly == 2 else 0.7) + 0.1, 0.12, 0.12, 0.0, seg=8)


def portal(G, M, h, s, u):
    """Kamenná brána (2,2 × 3,7 m): profilované ostenie s oblúkom, vyrezávané drevené vráta, pilastre na pätkách
    s volútovými hlavicami, na nich kúsky rímsy a plamenné vázy; nad oblúkom rokajová kartuša, ktorá prechádza
    do vypuklej segmentovej rímsy pod oknom 1. poschodia."""
    w = 2.2
    zg = teren(u)
    zp = zg + 2.6
    oblukova_doska(G, M['stuk'], h, s, w + 0.6, Z_PATA, zp, 0.04)
    oblukova_doska(G, M['tien'], h, s, w + 0.16, Z_PATA, zp, 0.06)
    oblukova_doska(G, M['drevo'], h, s, w, Z_PATA, zp, 0.08)
    doska(G, M['tien'], h, s, 0.06, zg, zp + w / 2, 0.1)                   # škára medzi krídlami
    for k in (-1, 1):                                                      # vyrezávané výplne krídiel
        for z0, z1 in ((zg + 0.35, zg + 1.35), (zg + 1.6, zp - 0.1)):
            doska(G, M['drevo_svetle'], h, s + k * w / 4, w / 2 - 0.35, z0, z1, 0.1)
        ovalna_doska(G, M['drevo_svetle'], h, s + k * w / 4, zp + w / 4, w / 6, w / 7, 0.1, seg=10)
        doska(G, M['zlato'], h, s + k * 0.12, 0.06, zg + 1.1, zg + 1.3, 0.11)   # kľučky
    for k in (-1, 1):
        x = s + k * (w / 2 + 0.25)
        blok(G, M['stuk'], h, x, 0.5, 0.36, Z_PATA, zg + 0.5)              # pätka
        blok(G, M['stuk'], h, x, 0.4, 0.3, zg + 0.5, zg + 3.4)
        blok(G, M['stuk'], h, x, 0.5, 0.42, zg + 3.4, zg + 3.75)            # volútová hlavica
        blok(G, M['stuk'], h, x, 0.4, 0.55, zg + 3.75, zg + 4.05)
        blok(G, M['stuk'], h, x, 0.62, 0.62, zg + 4.05, zg + 4.2)           # kúsok rímsy
        vaza(G, M, h.bod(x, 0.33), zg + 4.2)
    # rokajová kartuša nad oblúkom a segmentová rímsa pod oknom
    zc = zp + w / 2 + 0.75
    ovalna_doska(G, M['stuk'], h, s, zc, 0.7, 0.62, 0.14, seg=14)
    ovalna_doska(G, M['stuk'], h, s + 0.08, zc + 0.05, 0.45, 0.42, 0.2, seg=12)
    ovalna_doska(G, M['tien'], h, s + 0.1, zc + 0.08, 0.22, 0.24, 0.22, seg=10)
    for k in (-1, 1):
        ovalna_doska(G, M['stuk'], h, s + k * 0.85, zc - 0.45, 0.32, 0.2, 0.12, seg=10)
        ovalna_doska(G, M['stuk'], h, s + k * 0.55, zc + 0.55, 0.28, 0.18, 0.15, seg=10)
    segmentova_rimsa(G, M['stuk'], h, s, 2.2, 5.35, 0.3, 0.25)


def balkon(G, M, h, s):
    """Stredný balkón (os 6): doska s mierne prehnutým čelom na dvoch veľkých esovitých volútových konzolách,
    biele kované zábradlie s pozlátenými rokajmi."""
    w, d = 3.0, 0.95
    for k in (-1, 1):
        x = s + k * 0.95
        blok(G, M['stuk'], h, x, 0.32, 0.3, 3.75, 5.35)
        blok(G, M['stuk'], h, x, 0.34, 0.55, 4.45, 5.35)
        blok(G, M['stuk'], h, x, 0.36, d - 0.1, 4.95, 5.35)
        ovalna_doska(G, M['stuk'], Hrana(h.bod(x - 0.2, 0.31), h.bod(x + 0.2, 0.31)), 0.2, 3.95, 0.16, 0.18, 0.0, seg=8)
        ovalna_doska(G, M['stuk'], Hrana(h.bod(x - 0.2, d - 0.04), h.bod(x + 0.2, d - 0.04)), 0.2, 5.05, 0.15, 0.15,
                     0.0, seg=8)
    ob = [h.bod(s - w / 2, 0.0), h.bod(s + w / 2, 0.0), h.bod(s + w / 2, d), h.bod(s, d + 0.12), h.bod(s - w / 2, d)]
    G.hranol(M['stuk'], ob[::-1], 5.35, 5.6, spodok=True)                  # podlaha (obrys proti smeru hod. ručičiek)
    hrany = [Hrana(h.bod(s - w / 2 + 0.05, 0.0), h.bod(s - w / 2 + 0.05, d - 0.05)),
             Hrana(h.bod(s - w / 2 + 0.05, d - 0.05), h.bod(s, d + 0.07)),
             Hrana(h.bod(s, d + 0.07), h.bod(s + w / 2 - 0.05, d - 0.05)),
             Hrana(h.bod(s + w / 2 - 0.05, d - 0.05), h.bod(s + w / 2 - 0.05, 0.0))]
    for hh in hrany:
        L = hh.L
        doska(G, M['mreza'], hh, L / 2, L, 6.5, 6.58, 0.0)                  # madlo
        doska(G, M['mreza'], hh, L / 2, L, 5.62, 5.68, 0.0)
        n = max(1, round(L / 0.75))
        for i in range(n + 1):
            doska(G, M['mreza'], hh, L * i / n, 0.04, 5.6, 6.58, 0.0)
        for i in range(n):                                                 # pozlátené rokaje
            sm = L * (i + 0.5) / n
            oblucik(G, M['zlato'], hh, sm, 6.1, 0.13, 0.2, 0.0, 2 * math.pi, 8)
            for k in (-1, 1):
                for zc in (5.82, 6.38):
                    oblucik(G, M['zlato'], hh, sm + k * 0.2, zc, 0.09, 0.12, math.pi / 2 - k * math.pi / 2,
                            math.pi * 1.5 - k * math.pi / 2, 3)


def erb(G, M, h, s):
    """Erb Nyáryovcov v tympanóne: kartuša s girlandami a dvoma oválnymi štítmi (modrá, červená, zlato),
    hore grófska koruna s perlami presahujúca vrchol štítu."""
    zc = 14.35
    ovalna_doska(G, M['stuk'], h, s, zc, 0.8, 0.95, 0.6, seg=16)
    ovalna_doska(G, M['stuk'], h, s, zc + 0.08, 0.6, 0.75, 0.66, seg=14)
    for k, mat in ((-1, 'modra'), (1, 'cervena')):
        ovalna_doska(G, M['zlato'], h, s + k * 0.27, zc + 0.03, 0.25, 0.36, 0.69, seg=12)
        ovalna_doska(G, M[mat], h, s + k * 0.27, zc + 0.03, 0.2, 0.3, 0.71, seg=12)
    for k in (-1, 1):                                                      # girlandy a akantové listy
        ovalna_doska(G, M['stuk'], h, s + k * 0.95, zc - 0.45, 0.42, 0.22, 0.58, seg=10)
        ovalna_doska(G, M['stuk'], h, s + k * 1.35, zc - 0.62, 0.3, 0.13, 0.56, seg=8)
        ovalna_doska(G, M['stuk'], h, s + k * 0.72, zc + 0.85, 0.22, 0.3, 0.62, seg=8)
    # grófska koruna: obruč s deviatimi perlami na hrotoch
    c = h.bod(s, 0.45)
    zk = zc + 0.98
    rotacne(G, M['stuk'], c, [(0.32, zk), (0.52, zk + 0.12), (0.56, zk + 0.36), (0.54, zk + 0.44), (0.0, zk + 0.44)], seg=12)
    for i in range(9):
        f = math.pi * (0.06 + 0.88 * i / 8)
        p = (c[0] + h.t[0] * 0.55 * math.cos(f) - h.n[0] * 0.33 * math.sin(f),
             c[1] + h.t[1] * 0.55 * math.cos(f) - h.n[1] * 0.33 * math.sin(f))
        hore = zk + 0.62 + 0.12 * (1 - abs(math.cos(f)))
        rotacne(G, M['stuk'], p, [(0.05, zk + 0.42), (0.04, hore - 0.06), (0.08, hore), (0.0, hore + 0.08)], seg=5)


# --- hlavná fasáda ---------------------------------------------------------------------------------------------------

def postav_fasadu(G, M):
    r0, r1, rv = RIZALIT
    useky = [H((0.0, 0.0), (STRED[0], 0.0)), H((STRED[0], 0.0), (r0, 0.0)), H((r0, rv), (r1, rv)),
             H((r1, 0.0), (STRED[1], 0.0)), H((STRED[1], 0.0), (DLZKA, 0.0))]
    zaciatky = [0.0, STRED[0], r0, r1, STRED[1]]
    for i, h in enumerate(useky):
        G.stena(M['fasada'], h.a, h.b, Z_PATA, Z_RIMSA + 0.05)
        rimsy(G, M, h, 0.0, h.L, sokel=i not in (1, 3))                    # pri bránach sokel tvoria pätky pilastrov
    for a, b in (((r0, 0.0), (r0, rv)), ((r1, rv), (r1, 0.0))):             # boky rizalitu
        hb = H(a, b)
        G.stena(M['fasada'], hb.a, hb.b, Z_PATA, Z_RIMSA)
        rimsy(G, M, hb, 0.0, hb.L)
    hj, hp1, hr, hp2, hs = useky
    # bočné časti: pásová bosáž, nárožné lizény
    bosaz(G, M, hj, ROH, hj.L)
    bosaz(G, M, hs, 0.0, hs.L - ROH)
    for h, s in ((hj, ROH / 2), (hs, hs.L - ROH / 2)):
        lizena(G, M, h, s, w=ROH, z0=Z_PATA, konzoly=0)
    # stredná časť: lizény cez poschodia s konzolami, na nárožiach rizalitu dvojice vysokých volút pod tympanónom
    lizena(G, M, hp1, 0.0, konzoly=1)
    lizena(G, M, hp2, hp2.L, konzoly=1)
    lizena(G, M, hr, 0.25, w=0.5, konzoly=2)
    lizena(G, M, hr, hr.L - 0.25, w=0.5, konzoly=2)
    # osi okien
    for i, u in enumerate(OSI):
        k = 0 if u < STRED[0] else 1 if u < r0 else 2 if u < r1 else 3 if u < STRED[1] else 4
        h, s = useky[k], u - zaciatky[k]
        if i in (3, 7):                                                    # brány (osi 4 a 8)
            portal(G, M, h, s, u)
            okno_1p(G, M, h, s, 'portal')
            okno_2p(G, M, h, s)
        elif i in (4, 5, 6):                                               # rizalit (osi 5–7)
            okno_prizemie(G, M, h, s, oblukove=True)
            okno_1p(G, M, h, s, 'balkon' if i == 5 else 'stred')
            okno_2p(G, M, h, s, oblukove=True)
        else:
            okno_prizemie(G, M, h, s)
            okno_1p(G, M, h, s, 'bok')
            okno_2p(G, M, h, s)
    balkon(G, M, hr, OSI[5] - r0)
    postav_stit(G, M, hr)


def postav_stit(G, M, hr):
    """Tympanón nad rizalitom: šikmé rímsy s medeným oplechovaním, erb s korunou, medená priečna strieška."""
    u0, u1 = STIT
    v = RIZALIT[2]
    sk = (Z_STIT - Z_RIMSA) / ((u1 - u0) / 2)
    ob = [B(u0, v), B(u1, v), B(u1, 3.4), B(u0, 3.4)]
    RR = [R((u0, 3.4), (u0, v), Z_RIMSA, sk), R((u1, v), (u1, 3.4), Z_RIMSA, sk)]
    strecha(G, M['med'], ob, RR)
    stena_pod_strechou(G, M['fasada'], ob[0], ob[1], RR, Z_RIMSA)
    sc = (u0 + u1) / 2 - RIZALIT[0]
    for k in (-1, 1):
        a = (*hr.bod(sc + k * ((u1 - u0) / 2 + 0.3), 0.3), Z_RIMSA - 0.05)
        b = (*hr.bod(sc, 0.3), Z_STIT + 0.25)
        G.tram(M['stuk'], a, b, 0.5)
        G.tram(M['med'], (a[0], a[1], a[2] + 0.3), (b[0], b[1], b[2] + 0.3), 0.18)
    erb(G, M, hr, sc)


# --- krídla, strechy, nádvorie ---------------------------------------------------------------------------------------

def postav_strechy(G, M):
    budova(G, M['strecha'], ULICA_A, RE)
    budova(G, M['strecha'], ULICA_B, RE)
    budova(G, M['strecha'], SEVER, RN)
    budova(G, M['strecha'], JUH, RS)
    budova(G, M['strecha'], ZAPAD, RW)
    budova(G, M['strecha'], PRISTAVBA, RP)
    # medené oplechovanie korunnej rímsy, žľab a zvody na nárožiach
    for u0, u1 in ((0.0, STIT[0]), (STIT[1], DLZKA)):
        budova(G, M['med'], [(u0, -0.65), (u1, -0.65), (u1, 0.12), (u0, 0.12)], [E_VON])
    hf = H((0.0, -0.62), (DLZKA, -0.62))
    for u0, u1 in ((0.0, STIT[0] - 0.3), (STIT[1] + 0.3, DLZKA)):
        G.tram(M['med'], (*hf.bod(u0, 0.0), Z_RIMSA + 0.1), (*hf.bod(u1, 0.0), Z_RIMSA + 0.1), 0.16)
    hz = H((0.0, -0.18), (DLZKA, -0.18))
    for s in (0.25, DLZKA - 0.25):                                         # zvody pri nárožiach, hore ohyb k žľabu
        p, q = hz.bod(s), hf.bod(s)
        G.tram(M['med'], (*p, Z_PATA + 0.5), (*p, Z_FRIZ + 0.2), 0.11)
        G.tram(M['med'], (*p, Z_FRIZ + 0.2), (*q, Z_RIMSA + 0.1), 0.11)
    # 4 vikiere v dolnej tretine uličného svahu nad osami 2, 4, 8 a 10
    he = H((0.0, 0.0), (DLZKA, 0.0))
    for i in (1, 3, 7, 9):
        d = 1.9
        vikier(G, M, he, OSI[i], d, 13.93 + 0.78 * d, 0.78, 1.0, 1.15, M['stuk'], M['strecha'], strmost=1.0, okno_w=0.55)
    # strešné okná severného krídla do dvora (2 rady po 6)
    for rad, du in ((0, 2.3), (1, 5.4)):
        for i in range(6):
            v = 15.6 + i * 2.8
            uc = 16.4 - (v - 13.3) * 1.69 / 19.72 + du
            p = [na_rovine(N_DNU, uc + a, v + b) for a, b in ((-0.45, -0.35), (-0.45, 0.35), (0.45, 0.35), (0.45, -0.35))]
            G.plocha(M['sklo'], p)
    # komíny (podľa lasera)
    for u, v, z0, z1 in ((22.3, 27.5, 17.5, 21.2), (3.3, 36.3, 18.5, 21.3), (-5.6, 21.4, 19.3, 21.3)):
        G.kvader(M['komin'], B(u, v), U, 0.75, 0.9, z0, z1)
        G.kvader(M['komin'], B(u, v), U, 0.95, 1.1, z1, z1 + 0.15)


def postav_steny(G, M):
    """Vonkajšie steny: severná štítová stena nad nárožným domom so Zámočníckou (naň priamo nadväzuje fasáda),
    južná štítová stena a požiarne steny nad susedmi, prístavba."""
    stena(G, M['stena'], (DLZKA, 0.0), (30.11, 6.81), RE)
    stena(G, M['stena'], (30.11, 6.81), (27.07, 6.98), RE)
    # južná štítová stena nad domom č. 10 (hladká, biela, malé okienko) a požiarne steny nad susednými domami
    stena(G, M['stena'], (-1.74, 6.9), (0.0, 0.0), RE)
    stena(G, M['stena'], (-7.57, 29.96), (-1.74, 6.9), RS)
    hj = H((-7.57, 29.96), (-1.74, 6.9))
    okno(G, M, hj, 18.4, 0.6, 17.4, 18.2, ram=0.12, mat_ram=M['stuk'], priecky=1)
    for a, b in (((27.07, 6.98), (26.87, 13.34)), ((26.87, 13.34), (27.11, 14.38)), ((27.11, 14.38), (26.31, 18.48)),
                 ((26.31, 18.48), (23.44, 29.94))):
        stena(G, M['stena'], a, b, RN)
    for a, b in (((17.6, 43.4), (3.96, 36.13)), ((3.96, 36.13), (-7.57, 29.96))):
        stena(G, M['stena'], a, b, RW)
    for i in range(len(PRISTAVBA) - 1):
        stena(G, M['stena'], PRISTAVBA[i], PRISTAVBA[i + 1], RP)
    stena(G, M['stena'], (17.6, 43.4), (23.44, 29.94), RP, z_od=13.0)


def pavlac(G, M, h, z, s0, s1):
    """Kamenná pavlač na profilovaných konzolách s kovaným zábradlím s vypuklými prútmi."""
    d = 1.15
    ob = [h.bod(s0, 0.0), h.bod(s1, 0.0), h.bod(s1, d), h.bod(s0, d)]
    G.hranol(M['sokel'], ob[::-1], z - 0.2, z, spodok=True)
    n = max(2, round((s1 - s0) / 2.5))
    for i in range(n + 1):
        s = s0 + (s1 - s0) * i / n
        blok(G, M['sokel'], h, s, 0.28, d - 0.1, z - 0.45, z - 0.2)
        blok(G, M['sokel'], h, s, 0.26, 0.45, z - 0.8, z - 0.45)
    hz = Hrana(h.bod(s0, d - 0.05), h.bod(s1, d - 0.05))
    doska(G, M['zelezo'], hz, hz.L / 2, hz.L, z + 0.95, z + 1.0, 0.0)
    doska(G, M['zelezo'], hz, hz.L / 2, hz.L, z + 0.05, z + 0.09, 0.0)
    doska(G, M['zelezo'], hz, hz.L / 2, hz.L, z + 0.48, z + 0.51, 0.0)
    for i in range(int(hz.L / 0.16)):                                      # prúty (vypuklé – zjednodušene rovné)
        doska(G, M['zelezo'], hz, 0.08 + i * 0.16, 0.025, z + 0.05, z + 1.0, 0.0)


def postav_nadvorie(G, M):
    """Nádvorie: svetlé krémovobéžové fasády (stav 2022) s kamennými šambránami, pavlače na západe a juhu (1. a 2. poschodie), arkáda severného
    krídla (4 zasklené oblúky), oblá stena oválneho schodiska v SV rohu, prejazd z južnej brány, fontána."""
    A, Bv, C, D = NADVORIE
    steny = ((Bv, A, RE, 'dvor'), (A, D, RS, 'dvor'), (D, C, RW, 'dvor'), (C, Bv, RN, 'dvor_sever'))
    for a, b, roviny, mat in steny:
        stena(G, M[mat], a, b, roviny)
        h = H(a, b)
        blok(G, M['sokel'], h, h.L / 2, h.L, 0.08, Z_PATA, 0.45)
        blok(G, M['stuk'], h, h.L / 2, h.L, 0.12, 4.75, 4.95)
        blok(G, M['stuk'], h, h.L / 2, h.L, 0.35, Z_DVOR - 0.45, Z_DVOR)
        kraj = 3.6 if a == Bv or b == Bv else 0.9                         # pri schodisku v SV rohu bez okien
        s0, s1 = (kraj, h.L - 0.9) if a == Bv else (0.9, h.L - kraj)
        rad_okien(G, M, h, s0, s1, 2.9, (6.1, 10.2), w=1.2, vys=1.9, mat_ram=M['stuk'])
        if a == C:                                                         # arkáda severného krídla
            for i in range(4):
                s = s0 + (s1 - s0) * (i + 0.5) / 4
                oblukova_doska(G, M['stuk'], h, s, 2.6, Z_PATA, 2.4, 0.03)
                oblukova_doska(G, M['sklo'], h, s, 2.2, 0.3, 2.4, 0.06)
            continue
        n = max(1, int((s1 - s0) / 2.9))
        for i in range(n):
            s = s0 + (s1 - s0) * (i + 0.5) / n
            if a == Bv and abs(s - (Bv[0] - OSI[3])) < 1.6:
                continue
            okno(G, M, h, s, 1.15, 1.2, 3.2, ram=0.14, mat_ram=M['stuk'], priecky=1)
    for a, b in ((A, D), (D, C)):                                          # pavlače
        h = H(a, b)
        for z in (5.0, 9.1):
            pavlac(G, M, h, z, 0.0, h.L)
    # prejazd z južnej brány do nádvoria
    h = H(Bv, A)
    s = Bv[0] - OSI[3]
    oblukova_doska(G, M['stuk'], h, s, 3.0, Z_PATA, 2.7, 0.03)
    oblukova_doska(G, M['tien'], h, s, 2.5, Z_PATA, 2.7, 0.05)
    # oblá stena oválneho schodiska v SV rohu s úzkymi okienkami a strieškou
    r = 3.3
    obluk = [(Bv[0] - r * math.cos(t), Bv[1] + r * math.sin(t)) for t in [math.pi / 2 * k / 6 for k in range(7)]]
    obluk = obluk[::-1]                                                    # od severnej steny k východnej (líc do dvora)
    rs = [R((Bv[0], Bv[1] + r), (Bv[0] - r, Bv[1]), 14.25, 0.55)]
    budova(G, M['strecha'], [Bv] + obluk, rs)
    for p, q in zip(obluk[:-1], obluk[1:]):
        stena(G, M['dvor'], p, q, rs)
    for k in (2, 4):
        hh = H(obluk[k - 1], obluk[k + 1])
        for z in (2.2, 6.8, 10.6):
            okno(G, M, hh, hh.L / 2, 0.55, z, z + 1.4, ram=0.12, mat_ram=M['stuk'], priecky=0)
    # kamenná dlažba nádvoria (dvor leží ~0,3 m nad námestím)
    G.plocha(M['dlazba'], [(*B(*p), 0.32) for p in NADVORIE])
    # fontána (⌀ 3,5 m) s bronzovým súsoším Tritóna a nymfy
    c = B(8.9, 22.4)
    rotacne(G, M['sokel'], c, [(1.75, -0.3), (1.75, 0.45), (1.55, 0.45), (1.55, 0.25)], seg=20)
    rotacne(G, M['voda'], c, [(1.56, 0.3), (0.0, 0.3)], seg=20)
    rotacne(G, M['bronz'], c, [(0.55, 0.3), (0.5, 0.75), (0.35, 1.0), (0.3, 1.5), (0.36, 1.9), (0.26, 2.2), (0.12, 2.35),
                                (0.14, 2.5), (0.0, 2.62)], seg=8)
    for k in (-1, 1):
        p = (c[0] + U[0] * 0.3 * k, c[1] + U[1] * 0.3 * k)
        G.tram(M['bronz'], (*p, 1.6), (p[0] + U[0] * 0.35 * k, p[1] + U[1] * 0.35 * k, 2.3), 0.13)


def postav():
    """Vracia (Geo, výška modelu)."""
    G = Geo()
    M = {
        'fasada': material('omietka-mirbach', BIELA, drsnost=0.85),
        'stuk': material('stuk-mirbach', STUK, drsnost=0.8),
        'lizeny': material('stuk-mirbach', STUK, drsnost=0.8),
        'socha': material('stuk-mirbach', STUK, drsnost=0.8),
        'ryha': material('bosaz-ryha-mirbach', RYHA, drsnost=0.9),
        'tien': material('tien-mirbach', TIEN, drsnost=0.9),
        'sokel': material('kamen-sokel-mirbach', SOKEL, drsnost=0.9),
        'dvor': material('omietka-dvor-mirbach', DVOR, drsnost=0.85),
        'dvor_sever': material('omietka-dvor-sever-mirbach', DVOR_SEVER, drsnost=0.85),
        'stena': material('omietka-stena-mirbach', STENA, drsnost=0.9),
        'strecha': material('skridla-mirbach', STRECHA, drsnost=0.75),
        'med': material('med-patina-mirbach', MED, drsnost=0.5, kov=0.25),
        'komin': material('komin-mirbach', KOMIN, drsnost=0.9),
        'drevo': material('drevo-vrata-mirbach', DREVO, drsnost=0.7),
        'drevo_svetle': material('drevo-vyplne-mirbach', DREVO_SVETLE, drsnost=0.7),
        'sklo': material('sklo-mirbach', SKLO, drsnost=0.15, kov=0.4),
        'zlato': material('zlato-mirbach', ZLATO, drsnost=0.35, kov=0.6),
        'mreza': material('mreza-mirbach', MREZA, drsnost=0.5, kov=0.3),
        'zelezo': material('zelezo-mirbach', ZELEZO, drsnost=0.55, kov=0.5),
        'cervena': material('erb-cervena-mirbach', CERVENA, drsnost=0.6),
        'modra': material('erb-modra-mirbach', MODRA, drsnost=0.6),
        'bronz': material('bronz-mirbach', BRONZ, drsnost=0.45, kov=0.6),
        'voda': material('voda-fontana-mirbach', VODA, drsnost=0.1, kov=0.2),
        'dlazba': material('dlazba-dvor-mirbach', DLAZBA, drsnost=0.9),
    }
    postav_strechy(G, M)
    postav_steny(G, M)
    postav_fasadu(G, M)
    postav_nadvorie(G, M)
    return G, 21.45                     # vrch komínov (hrebeň 19,6, požiarne steny ~20,3 m)


# bod na dlažbe námestia pred stredom fasády (lokálne x, z hry) – model sa kladie naň
_zb = B(15.5, -4.0)
ZAKLADNA_BOD = [round(_zb[0], 2), round(-_zb[1], 2)]
