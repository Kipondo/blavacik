# Primaciálny palác, Primaciálne námestie – klasicistický palác ostrihomských arcibiskupov (M. Hefele, 1778–1781),
# dnes sídlo primátora. Štyri krídla okolo nádvoria s fontánou sv. Juraja; hlavné severné krídlo na námestí:
# prízemie s mezanínom, dve poschodia spojené obrovským radom korintských pilastrov, stredný rizalit so 6 pilastrami,
# portikus so 4 toskánskymi stĺpmi a balkónom, trojuholníkový štít so Zmetákovou mozaikou (1958), na vrchole erb
# arcibiskupa J. Batthyányho s kniežacou čiapkou a čiernym železným **kardinálskym klobúkom** (150 kg); na atike
# 4 sochy, 2 súsošia a 4 vázy. Presný model exteriéru podľa prieskumu v napady/pamiatky-podklady.md
# („Primaciálny palác“):
#  - pôdorys z OSM (relácia 189440 – obrys a nádvorie), výšky z laserového skenovania ÚGKK (DMP/DMR, INSPIRE WMS),
#  - fasády podľa verejných fotografií (Wikimedia Commons, len na porovnanie): bledoružová omietka, béžové pieskovcové
#    detaily, 11 osí (3 + 5 + 3) a jednoosová koncová časť pri Starej radnici, okná s frontónmi a rímsami podľa
#    podlaží, strmá valbová strecha z pálenej bobrovky, medená krížová strieška za štítom; nádvorie so slepými
#    arkádami, balkónom východného krídla a osemuholníkovou fontánou.
# Lokálna sústava: u = pozdĺž hlavného priečelia (azimut 244,5°, od východného nárožia pri Uršulínskej na západ),
# v = do bloku (azimut 154,5°); začiatok = východné nárožie hlavného priečelia (OSM). Nula výšky = dlažba
# Primaciálneho námestia pred portikom (≈ 138,85 m, ako pri Starej radnici).
import math

from veze import Geo
from spolocne import material
from presne.snd import Hrana, doska, blok, oblukova_doska, ovalna_doska, fronton
from presne.reduta import rotacne
from presne.radnica import rovina, plocha, strecha, stena_pod_strechou, okno, rad_okien

RUZOVA, RUZOVA_TMAVA, DVOR = '#ebcac4', '#dcbab5', '#ede0de'
KAMEN, RAMY, SOKEL, SOCHA = '#d9c6a2', '#d2ba8c', '#b39a6a', '#b5ad9e'
STRECHA, MED, ZLATO, KLOBUK = '#8a5240', '#5e8c86', '#c9a23e', '#15171c'
MOZAIKA, MOZAIKA_SVETLA, MRAMOR = '#b8ae98', '#e2ded6', '#c08c7a'
SKLO, DREVO, CIERNA, VODA = '#2e3540', '#4a2e22', '#26292a', '#6f8a94'

AZ = math.radians(244.5)
U = (math.sin(AZ), math.cos(AZ))
V = (-U[1], U[0])
O = (9.97, 27.94)                       # východné nárožie hlavného priečelia (Blender: x, y = −z hry, od stredu)


def B(u, v):
    return (O[0] + U[0] * u + V[0] * v, O[1] + U[1] * u + V[1] * v)


def H(a, b):
    return Hrana(B(*a), B(*b))


def R(a, b, z0, sklon):
    return rovina(B(*a), B(*b), z0, sklon, uv=False)


# --- rozmery (m nad dlažbou námestia) ------------------------------------------------------------------------------
# Laser (DMP, mriežka 1 m): vrch klobúka 27,7 m, šikmá rímsa štítu ~21,9 m 4,3 m od osi (sklon 21°), balustráda
# atiky ~21,0 m, hrebene krídel ~26,4 m (hlavné krídlo ~7,5 m za priečelím), odkvapy do nádvoria ~19 m; koncová
# časť pri radnici ~20 m. Podlažia priečelia podľa fotiek (čelná fotka, mierka z obrysu OSM), zväčšené o 10 % podľa
# výšky rímsy z lasera. Terén: námestie 138,85, nádvorie −0,3, Uršulínska −0,5, juh −0,6 m.
Z_PATA = -1.0
Z_SOKEL, Z_KORDON, Z_HLAVICA, Z_ARCHITRAV, Z_RIMSA = 0.7, 7.9, 16.6, 17.5, 20.2
Z_ATIKA, Z_BALUSTRADA = 20.55, 21.15
Z_STIT = 24.2
Z_DVOR = 19.0                           # odkvap do nádvoria
Z_HREBEN = 26.4

# pôdorysy (u, v) proti smeru hodinových ručičiek
SEVER = [(0.0, 0.0), (46.15, 0.0), (46.15, 15.0), (0.0, 15.0)]
VYCHOD = [(0.0, 0.0), (13.4, 0.0), (13.4, 30.88), (0.0, 30.88)]
VYCHOD_ROH = [(5.68, 30.88), (13.4, 30.88), (13.4, 38.0), (7.28, 38.0)]
JUH = [(7.28, 38.0), (41.3, 38.0), (41.3, 48.2), (9.43, 47.61)]
ZAPAD = [(32.5, 0.0), (41.3, 0.0), (41.3, 48.2), (32.5, 48.2)]
KONIEC = [(46.15, 0.85), (52.35, 0.85), (52.35, 12.36), (46.15, 12.36)]   # jednoosová časť pri Starej radnici
VYBEZOK = [(41.3, 15.0), (45.8, 15.0), (45.8, 21.3), (41.3, 21.3)]
PRISTAVBA = [(-13.85, 18.24), (0.0, 18.24), (0.0, 30.88), (-13.85, 30.17)]  # strana do Uršulínskej
PRISTAVBA_S = [(-6.78, 9.66), (-0.07, 9.04), (0.0, 18.24), (-7.43, 18.22)]
NADVORIE = (13.4, 32.5, 15.0, 37.9)    # u0, u1, v0, v1
RIZALIT = (12.5, 33.5, -1.2)           # u0, u1, v líca
PORTIKUS = (16.35, 29.65, -4.1)
PILASTRE_VYCHOD = [0.75, 4.45, 8.25, 11.85]
PILASTRE_RIZALIT = [13.0, 16.8, 20.6, 25.4, 29.2, 33.0]
PILASTRE_ZAPAD = [34.15, 37.75, 41.55, 45.25]
OSI_VYCHOD = [2.6, 6.35, 10.05]
OSI_RIZALIT = [14.9, 18.7, 23.0, 27.3, 31.1]
OSI_ZAPAD = [35.95, 39.65, 43.4]

# roviny striech
N_VON = R((0.0, 2.0), (46.15, 2.0), 21.3, 0.93)
N_DNU = R((46.15, 15.0), (0.0, 15.0), Z_DVOR, 0.99)
E_VON = R((0.0, 30.88), (0.0, 0.0), Z_RIMSA, 0.93)
E_DNU = R((13.4, 0.0), (13.4, 38.0), Z_DVOR, 0.99)
D_VON = R((9.43, 47.61), (5.68, 30.88), 19.4, 0.93)
S_DNU = R((7.28, 37.9), (41.3, 37.9), Z_DVOR, 1.3)
S_VON = R((41.3, 48.2), (9.43, 47.61), 19.4, 1.5)
W_DNU = R((32.5, 48.2), (32.5, 0.0), Z_DVOR, 0.89)


def budova(G, mat_strecha, obrys_uv, roviny, steny):
    ob = [B(*p) for p in obrys_uv]
    strecha(G, mat_strecha, ob, roviny)
    for i, s in enumerate(steny):
        if s is None:
            continue
        mat, z_od = s if isinstance(s, tuple) else (s, None)
        stena_pod_strechou(G, mat, ob[i], ob[(i + 1) % len(ob)], roviny, z_od)
    return ob


# --- sochy, vázy, balustráda -----------------------------------------------------------------------------------------

def socha(G, M, c, z, vys=2.3, siroka=1.0, sediaca=False):
    """Zjednodušená stojaca (alebo sediaca) postava v rúchu z pieskovca."""
    k = siroka * 1.45                     # rúcho, ruky a atribúty rozširujú siluetu
    if sediaca:
        prof = [(0.42 * k, z), (0.44 * k, z + 0.3 * vys), (0.3 * k, z + 0.45 * vys), (0.24 * k, z + 0.72 * vys),
                (0.12, z + 0.8 * vys), (0.14, z + 0.86 * vys), (0.13, z + 0.95 * vys), (0.06, z + vys)]
    else:
        prof = [(0.3 * k, z), (0.28 * k, z + 0.2 * vys), (0.24 * k, z + 0.5 * vys), (0.26 * k, z + 0.7 * vys),
                (0.2 * k, z + 0.8 * vys), (0.11, z + 0.84 * vys), (0.14, z + 0.89 * vys), (0.13, z + 0.97 * vys),
                (0.06, z + vys)]
    rotacne(G, M['socha'], c, prof, seg=6)


def vaza(G, M, c, z):
    rotacne(G, M['socha'], c, [(0.24, z), (0.3, z + 0.1), (0.17, z + 0.25), (0.4, z + 0.55), (0.44, z + 0.78),
                               (0.3, z + 0.95), (0.17, z + 1.05), (0.25, z + 1.15), (0.1, z + 1.32), (0.0, z + 1.4)], seg=8)


def podstavec(G, M, h, s, z0, z1, w=0.75, von=0.0):
    G.kvader(M['kamen'], h.bod(s, von), h.t, w, w, z0, z1)
    return h.bod(s, von)


def balustrada(G, M, h, s0, s1, z0, z1, von=0.0, krok=0.32):
    """Kamenná balustráda pozdĺž hrany h: sokel, baluster, madlo."""
    L = s1 - s0
    blok(G, M['kamen'], h, (s0 + s1) / 2, L, 0.42, z0, z0 + 0.15, von0=von - 0.21)
    blok(G, M['kamen'], h, (s0 + s1) / 2, L, 0.46, z1 - 0.18, z1, von0=von - 0.23)
    n = max(1, int(L / krok))
    for i in range(n):
        G.kvader(M['kamen'], h.bod(s0 + L * (i + 0.5) / n, von), h.t, 0.13, 0.13, z0 + 0.15, z1 - 0.18, vrch=False)


# --- hlavné priečelie ------------------------------------------------------------------------------------------------

def pilaster(G, M, h, s):
    blok(G, M['kamen'], h, s, 1.2, 0.45, Z_KORDON, Z_KORDON + 0.7)
    blok(G, M['ruzova'], h, s, 1.0, 0.35, Z_KORDON + 0.7, Z_HLAVICA)
    blok(G, M['kamen'], h, s, 1.1, 0.4, Z_HLAVICA - 0.2, Z_HLAVICA)
    blok(G, M['kamen'], h, s, 1.35, 0.5, Z_HLAVICA, Z_ARCHITRAV)
    blok(G, M['ruzova'], h, s, 0.9, 0.08, Z_SOKEL, Z_KORDON - 0.4)        # plochá lizéna v prízemí


def os_okien(G, M, h, s, typ='bok', prizemie=True):
    """Okná jednej osi: prízemie s mrežou, mezanín, piano nobile (frontón, rímsa alebo balkónové dvere), 2. poschodie."""
    if prizemie:
        okno(G, M, h, s, 1.3, 0.9, 3.1, ram=0.18, mat_ram=M['ramy'], priecky=1, priecnik=2.4, mriezka=True)
        blok(G, M['kamen'], h, s, 1.9, 0.16, 3.3, 3.5)
        okno(G, M, h, s, 1.2, 4.7, 5.9, ram=0.15, mat_ram=M['ramy'], priecky=1)
        doska(G, M['ramy'], h, s, 1.5, 4.0, 4.45, 0.02)
    if typ == 'stred':
        okno(G, M, h, s, 1.6, 8.45, 11.4, ram=0.24, mat_ram=M['kamen'], priecky=1, priecnik=10.5)
        for k in (-1, 1):
            blok(G, M['kamen'], h, s + k * 1.15, 0.3, 0.25, 8.45, 12.0)
        doska(G, M['mramor'], h, s, 1.7, 11.85, 12.75, 0.12)
        blok(G, M['kamen'], h, s, 2.6, 0.3, 12.75, 13.0)
        for k in (-1, 1):                                  # putti s pozlátenými písmenami I a C
            socha(G, M, h.bod(s + k * 0.6, 0.15), 13.0, 0.85, 0.9, sediaca=True)
            doska(G, M['zlato'], h, s + k * 0.95, 0.18, 13.3, 13.6, 0.32)
    else:
        okno(G, M, h, s, 1.4, 8.6, 11.4, ram=0.2, mat_ram=M['ramy'], priecky=1, priecnik=10.5)
        blok(G, M['kamen'], h, s, 1.95, 0.2, 8.25, 8.45)
        doska(G, M['ramy'], h, s, 1.6, 7.95, 8.25, 0.03)
        if typ == 'bok':
            blok(G, M['kamen'], h, s, 2.1, 0.22, 11.55, 11.75)
            fronton(G, M['kamen'], h, s, 2.2, 11.75, 0.75, 0.22)
        else:
            blok(G, M['kamen'], h, s, 2.2, 0.25, 11.6, 11.95)
            for k in (-1, 1):
                blok(G, M['kamen'], h, s + k * 0.95, 0.2, 0.22, 11.0, 11.6)
    okno(G, M, h, s, 1.4, 14.0, 16.2, ram=0.18, mat_ram=M['ramy'], priecky=1, priecnik=15.5)
    blok(G, M['kamen'], h, s, 1.9, 0.18, 13.65, 13.85)
    doska(G, M['ramy'], h, s, 1.5, 13.25, 13.65, 0.03)


def kladie(G, M, h, s0, s1):
    """Kordónová rímsa, architráv a hlavná rímsa úseku priečelia; sokel."""
    L, s = s1 - s0, (s0 + s1) / 2
    blok(G, M['sokel'], h, s, L, 0.14, Z_PATA, Z_SOKEL)
    blok(G, M['kamen'], h, s, L, 0.3, Z_KORDON - 0.4, Z_KORDON)
    blok(G, M['kamen'], h, s, L, 0.42, Z_ARCHITRAV, Z_ARCHITRAV + 0.5)
    blok(G, M['kamen'], h, s, L + 0.4, 0.5, Z_RIMSA - 1.0, Z_RIMSA - 0.65)
    blok(G, M['kamen'], h, s, L + 0.9, 0.8, Z_RIMSA - 0.65, Z_RIMSA)
    G.plocha(M['med'], [(*h.bod(s0 - 0.45, 0.8), Z_RIMSA + 0.01), (*h.bod(s1 + 0.45, 0.8), Z_RIMSA + 0.01),
                        (*h.bod(s1 + 0.45, -0.2), Z_RIMSA + 0.01), (*h.bod(s0 - 0.45, -0.2), Z_RIMSA + 0.01)])


def postav_priecelie(G, M):
    he = H((0.0, 0.0), (12.5, 0.0))
    hz = H((33.5, 0.0), (46.15, 0.0))
    hr = H((12.5, RIZALIT[2]), (33.5, RIZALIT[2]))
    for h, u0 in ((he, 0.0), (hz, 33.5)):
        G.stena(M['ruzova'], h.a, h.b, Z_PATA, Z_RIMSA)
        kladie(G, M, h, 0.0, h.L)
    # rizalit (predstupuje 1,2 m) s bokmi
    G.stena(M['ruzova'], hr.a, hr.b, Z_PATA, Z_RIMSA)
    for a, b in (((12.5, 0.0), (12.5, RIZALIT[2])), ((33.5, RIZALIT[2]), (33.5, 0.0))):
        hb = H(a, b)
        G.stena(M['ruzova'], hb.a, hb.b, Z_PATA, Z_RIMSA)
        kladie(G, M, hb, 0.0, hb.L)
    kladie(G, M, hr, 0.0, hr.L)
    for u in PILASTRE_VYCHOD:
        pilaster(G, M, he, u)
    for u in PILASTRE_ZAPAD:
        pilaster(G, M, hz, u - 33.5)
    for u in PILASTRE_RIZALIT:
        pilaster(G, M, hr, u - 12.5)
    for u in OSI_VYCHOD:
        os_okien(G, M, he, u, 'bok')
    for u in OSI_ZAPAD:
        os_okien(G, M, hz, u - 33.5, 'bok')
    for u in OSI_RIZALIT:
        v_portiku = 18.0 < u < 28.0
        os_okien(G, M, hr, u - 12.5, 'stred' if abs(u - 23.0) < 0.1 else 'rizalit', prizemie=not v_portiku)
    # v portiku: polkruhová brána s nadsvetlíkom a bočné dvere s oknom mezanínu
    s = 23.0 - 12.5
    oblukova_doska(G, M['kamen'], hr, s, 3.2, Z_PATA, 4.6, 0.03)
    oblukova_doska(G, M['drevo'], hr, s, 2.5, 0.0, 4.75, 0.06)
    ovalna_doska(G, M['sklo'], hr, s, 4.75, 1.1, 1.1, 0.08, seg=16)
    doska(G, M['drevo'], hr, s, 2.5, 3.6, 4.75, 0.08)
    for u in (18.7, 27.3):
        okno(G, M, hr, u - 12.5, 1.3, 0.0, 2.9, ram=0.2, mat_ram=M['kamen'], priecky=1)
        okno(G, M, hr, u - 12.5, 1.2, 4.7, 5.9, ram=0.15, mat_ram=M['ramy'], priecky=1)
        doska(G, M['mramor'], hr, u - 12.5, 1.4, 3.6, 4.3, 0.03)
    postav_portikus(G, M)
    postav_atiku(G, M, he, hz, hr)
    # nárožie do Uršulínskej (východná stena severného krídla): rímsy a okná
    hv = H((0.0, 9.04), (0.0, 0.0))
    kladie(G, M, hv, 0.0, hv.L)
    blok(G, M['sokel'], hv, hv.L / 2, hv.L, 0.14, Z_PATA, 1.1)
    for ss in (2.6, 6.6):
        for z0, z1, w in ((0.9, 3.1, 1.3), (4.7, 5.9, 1.2), (8.6, 11.4, 1.4), (14.0, 16.2, 1.4)):
            okno(G, M, hv, ss, w, z0, z1, ram=0.18, mat_ram=M['ramy'], priecky=1)


def postav_portikus(G, M):
    hr = H((PORTIKUS[0], PORTIKUS[2]), (PORTIKUS[1], PORTIKUS[2]))
    for u in (16.8, 20.6, 25.4, 29.2):
        c = B(u, PORTIKUS[2] + 0.45)
        G.kvader(M['ramy'], c, U, 1.15, 1.15, Z_PATA, 1.2)
        G.kvader(M['ramy'], c, U, 1.0, 1.0, 1.2, 1.45)
        G.valec(M['ramy'], c, 0.45, 1.45, 7.1, seg=12, r1=0.39)
        G.kvader(M['ramy'], c, U, 0.95, 0.95, 7.1, 7.55)
    # kladie a podlaha balkóna
    a = [B(PORTIKUS[0], PORTIKUS[2]), B(PORTIKUS[1], PORTIKUS[2]), B(PORTIKUS[1], RIZALIT[2]), B(PORTIKUS[0], RIZALIT[2])]
    G.hranol(M['kamen'], a, 7.55, 8.4, spodok=True)
    ob = [B(PORTIKUS[0] - 0.15, PORTIKUS[2] - 0.15), B(PORTIKUS[1] + 0.15, PORTIKUS[2] - 0.15),
          B(PORTIKUS[1] + 0.15, RIZALIT[2]), B(PORTIKUS[0] - 0.15, RIZALIT[2])]
    G.hranol(M['kamen'], ob, 8.15, 8.45)
    # balustráda balkóna s piliermi nad stĺpmi
    balustrada(G, M, hr, 0.0, hr.L, 8.45, 9.45, von=-0.2)
    for a, b in (((PORTIKUS[0], RIZALIT[2]), (PORTIKUS[0], PORTIKUS[2])), ((PORTIKUS[1], PORTIKUS[2]), (PORTIKUS[1], RIZALIT[2]))):
        hb = H(a, b)
        balustrada(G, M, hb, 0.0, hb.L, 8.45, 9.45, von=-0.2)
    for u in (16.8, 20.6, 25.4, 29.2):
        G.kvader(M['kamen'], B(u, PORTIKUS[2] + 0.2), U, 0.6, 0.6, 8.45, 9.65)


def postav_atiku(G, M, he, hz, hr):
    """Atika s balustrádou, vázy, súsošia Minervy a Božej múdrosti, sochy pri štíte; štít s mozaikou, erbom
    a kardinálskym klobúkom."""
    for h, piliere in ((he, (0.35, 12.2)), (hz, (0.35, 12.3))):
        balustrada(G, M, h, 0.0, h.L, Z_RIMSA, Z_BALUSTRADA + 0.2, von=-0.15)
        for s in piliere:
            c = podstavec(G, M, h, s, Z_RIMSA, Z_BALUSTRADA + 0.45, w=0.8, von=-0.15)
            vaza(G, M, c, Z_BALUSTRADA + 0.45)
        c = podstavec(G, M, h, h.L / 2, Z_RIMSA, Z_BALUSTRADA + 1.2, w=1.6, von=-0.25)   # súsošie
        socha(G, M, (c[0] + h.t[0] * 0.35, c[1] + h.t[1] * 0.35), Z_BALUSTRADA + 1.2, 2.9, 1.1)
        socha(G, M, (c[0] - h.t[0] * 0.45, c[1] - h.t[1] * 0.45), Z_BALUSTRADA + 1.2, 1.7, 1.1, sediaca=True)
    he_c = he.bod(6.3 + 0.35, -0.25)                                          # kopija Minervy
    G.tram(M['socha'], (*he_c, 22.6), (*he_c, 25.9), 0.06)
    # sochy na nárožiach rizalitu a za šikmými rímsami štítu
    for s, z in ((0.5, Z_RIMSA), (20.5, Z_RIMSA)):
        c = podstavec(G, M, hr, s, z, Z_BALUSTRADA + 0.45, w=0.85, von=-0.2)
        socha(G, M, c, Z_BALUSTRADA + 0.45, 2.3)
    for u in (16.8, 29.2):
        c = B(u, 0.4)
        G.kvader(M['kamen'], c, U, 0.75, 0.75, Z_RIMSA, 22.3)
        socha(G, M, c, 22.3, 2.3)
    # štít: krížová medená strieška, šikmé rímsy, mozaika v tympanóne
    ob = [B(12.5, RIZALIT[2]), B(33.5, RIZALIT[2]), B(33.5, 5.5), B(12.5, 5.5)]
    sk = (Z_STIT - Z_RIMSA) / 10.5
    RR = [R((12.5, 5.5), (12.5, RIZALIT[2]), Z_RIMSA, sk), R((33.5, RIZALIT[2]), (33.5, 5.5), Z_RIMSA, sk)]
    strecha(G, M['med'], ob, RR)
    stena_pod_strechou(G, M['ruzova'], ob[0], ob[1], RR, Z_RIMSA)
    sc = hr.L / 2
    for k in (-1, 1):
        G.tram(M['kamen'], (*hr.bod(sc + k * (hr.L / 2 + 0.4), 0.4), Z_RIMSA - 0.05), (*hr.bod(sc, 0.4), Z_STIT + 0.35), 0.55)
    tymp = [(sc - 9.3, Z_RIMSA + 0.25), (sc + 9.3, Z_RIMSA + 0.25), (sc, Z_STIT - 0.6)]
    G.plocha(M['mozaika'], [(*hr.bod(x, 0.05), z) for x, z in tymp])
    # mozaika: ležiace alegórie Dunaja a Tisy, postavy okolo piliera so zákonom
    for k in (-1, 1):
        x0 = sc + k * 6.3
        hore_p, hore_l = (Z_RIMSA + 1.0, Z_RIMSA + 0.75) if k > 0 else (Z_RIMSA + 0.75, Z_RIMSA + 1.0)
        G.plocha(M['mozaika_svetla'], [(*hr.bod(x0 - 1.6, 0.07), Z_RIMSA + 0.4), (*hr.bod(x0 + 1.6, 0.07), Z_RIMSA + 0.4),
                                       (*hr.bod(x0 + 1.1, 0.07), hore_p), (*hr.bod(x0 - 1.1, 0.07), hore_l)])
    doska(G, M['mozaika_svetla'], hr, sc, 0.45, Z_RIMSA + 0.35, Z_RIMSA + 2.6, 0.07)
    for dx, vys in ((-3.0, 1.9), (-1.6, 2.4), (1.6, 2.4), (3.0, 1.9)):
        doska(G, M['mozaika_svetla'], hr, sc + dx, 0.5, Z_RIMSA + 0.35, Z_RIMSA + 0.35 + vys, 0.07)
    postav_erb(G, M, hr.bod(sc, 0.3))


def postav_erb(G, M, c):
    """Erb arcibiskupa Batthyányho na vrchole štítu: kartuša, dvaja géniovia, kniežacia čiapka, pozlátený
    patriarchálny kríž a strapce, navrchu čierny kardinálsky klobúk (krempa ⌀ 1,9 m)."""
    G.kvader(M['kamen'], c, U, 1.7, 0.6, Z_STIT - 0.3, Z_STIT + 1.6)
    ovalna_doska(G, M['zlato'], Hrana(B(22.0, -1.85), B(24.0, -1.85)), 1.0, Z_STIT + 0.8, 0.42, 0.5, 0.0, seg=12)
    ovalna_doska(G, M['kamen'], Hrana(B(22.0, -1.85), B(24.0, -1.85)), 1.0, Z_STIT + 0.8, 0.32, 0.4, 0.02, seg=12)
    for k in (-1, 1):
        p = (c[0] + U[0] * k * 1.25, c[1] + U[1] * k * 1.25)
        socha(G, M, p, Z_STIT - 0.3, 1.7, 1.0, sediaca=True)
    rotacne(G, M['kamen'], c, [(0.45, Z_STIT + 1.6), (0.66, Z_STIT + 1.9), (0.63, Z_STIT + 2.25), (0.35, Z_STIT + 2.55),
                               (0.0, Z_STIT + 2.62)], seg=8)
    # kríž (vľavo za erbom)
    p = (c[0] - U[0] * 0.75 + V[0] * 0.3, c[1] - U[1] * 0.75 + V[1] * 0.3)
    G.kvader(M['zlato'], p, U, 0.08, 0.08, Z_STIT + 1.0, Z_STIT + 3.2)
    for z, w in ((Z_STIT + 2.5, 0.55), (Z_STIT + 2.9, 0.4)):
        G.kvader(M['zlato'], p, U, w, 0.07, z, z + 0.08)
    # klobúk na krátkom nosiči, strapce visiace z krempy
    zk = Z_STIT + 2.6
    G.kvader(M['klobuk'], c, U, 0.08, 0.08, Z_STIT + 2.5, zk + 0.45)
    rotacne(G, M['klobuk'], c, [(0.0, zk + 0.45), (0.95, zk + 0.46), (0.97, zk + 0.52), (0.42, zk + 0.54),
                                (0.42, zk + 0.86), (0.4, zk + 0.9), (0.0, zk + 0.9)], seg=16)
    for i in range(10):
        f = 2 * math.pi * (i + 0.5) / 10
        p = (c[0] + 0.8 * math.cos(f), c[1] + 0.8 * math.sin(f))
        G.kvader(M['zlato'], p, U, 0.03, 0.03, zk - 0.3, zk + 0.45, vrch=False)
        rotacne(G, M['zlato'], p, [(0.0, zk - 0.62), (0.1, zk - 0.5), (0.05, zk - 0.3)], seg=5)


# --- krídla, strechy, nádvorie ---------------------------------------------------------------------------------------

def postav_kridla(G, M):
    budova(G, M['strecha'], SEVER, [N_VON, N_DNU, E_VON], [None, (M['ruzova'], 19.0), None, None])
    stena_pod_strechou(G, M['dvor'], B(46.15, 15.0), B(41.3, 15.0), [N_VON, N_DNU, E_VON])
    G.stena(M['ruzova'], B(46.15, 0.0), B(46.15, 0.85), Z_PATA, Z_RIMSA)
    budova(G, M['strecha'], VYCHOD, [E_VON, E_DNU, N_VON], [None, None, None, M['ruzova']])
    budova(G, M['strecha'], VYCHOD_ROH, [E_DNU, D_VON, S_VON], [None, None, None, M['dvor']])
    budova(G, M['strecha'], JUH, [S_DNU, S_VON, D_VON], [None, None, M['dvor'], M['dvor']])
    budova(G, M['strecha'], ZAPAD, [W_DNU, N_VON, S_VON, plocha(26.8)], [None, M['dvor'], None, None])
    RK = [R((46.15, 0.85), (52.35, 0.85), 19.6, 0.75), R((52.35, 12.36), (46.15, 12.36), 20.5, 0.75)]
    budova(G, M['strecha'], KONIEC, RK, [M['ruzova'], (M['ruzova'], 13.0), M['dvor'], None])
    budova(G, M['strecha'], VYBEZOK, [plocha(17.2)], [None, M['dvor'], M['dvor'], None])
    RP = [R((-13.85, 18.24), (0.0, 18.24), Z_DVOR, 1.23), R((0.0, 30.88), (-13.85, 30.17), Z_DVOR, 1.23)]
    budova(G, M['strecha'], PRISTAVBA, RP, [M['ruzova'], None, M['ruzova'], M['ruzova']])
    budova(G, M['strecha'], PRISTAVBA_S, [plocha(19.4)], [M['ruzova'], None, None, M['ruzova']])
    # pás medi za atikou a nad rímsou koncovej časti
    G.plocha(M['med'], [(*B(0.0, 0.0), Z_RIMSA + 0.05), (*B(46.15, 0.0), Z_RIMSA + 0.05), (*B(46.15, 0.87), Z_RIMSA + 0.05),
                        (*B(0.0, 0.87), Z_RIMSA + 0.05)])
    # koncová časť: jedna os, rímsa o 1 m nižšie, bez atiky
    hk = H((46.15, 0.85), (52.35, 0.85))
    blok(G, M['sokel'], hk, hk.L / 2, hk.L, 0.14, Z_PATA, Z_SOKEL)
    blok(G, M['kamen'], hk, hk.L / 2, hk.L, 0.3, Z_KORDON - 0.4, Z_KORDON)
    blok(G, M['kamen'], hk, hk.L / 2, hk.L, 0.6, 18.6, 19.2)
    os_okien(G, M, hk, 3.1, 'bok')
    # strana do Uršulínskej a ďalšie vonkajšie steny: rímsy a rady okien
    for a, b, rady in ((( -13.85, 30.17), (-13.85, 18.24), (1.3, 8.6, 13.4)), ((-7.43, 18.22), (-6.78, 9.66), (1.3, 8.6, 13.4)),
                       ((-13.85, 18.24), (-7.43, 18.24), (1.3, 8.6, 13.4)), ((0.0, 30.88), (-13.85, 30.17), (1.3, 8.6, 13.4)),
                       ((41.3, 48.2), (9.43, 47.61), (1.3, 6.6, 10.8, 14.6)), ((9.43, 47.61), (5.68, 30.88), (1.3, 8.6, 13.4)),
                       ((-6.78, 9.66), (-0.07, 9.04), (1.3, 8.6, 13.4)), ((41.3, 15.0), (41.3, 48.2), ())):
        h = H(a, b)
        if not rady:
            continue
        blok(G, M['sokel'], h, h.L / 2, h.L, 0.12, Z_PATA, 1.1)
        if rady[0] < 5:
            blok(G, M['kamen'], h, h.L / 2, h.L, 0.25, Z_KORDON - 0.4, Z_KORDON)
        rad_okien(G, M, h, 0.8, h.L - 0.8, 3.6, rady, w=1.25, vys=2.2, mat_ram=M['ramy'])
    for a, b in (((-13.85, 30.17), (-13.85, 18.24)), ((0.0, 30.88), (-13.85, 30.17)), ((41.3, 48.2), (9.43, 47.61))):
        h = H(a, b)
        blok(G, M['kamen'], h, h.L / 2, h.L, 0.45, Z_DVOR - 0.5, Z_DVOR)


def dvorova_fasada(G, M, h, n, balkon=False, prejazd=None):
    """Fasáda do nádvoria: slepé arkády s lunetami v prízemí, 2 rady okien, hlavná rímsa; voliteľne balkón."""
    L = h.L
    blok(G, M['sokel'], h, L / 2, L, 0.1, Z_PATA, 0.5)
    for i in range(n):
        s = L * (i + 0.5) / n
        w = min(3.0, L / n - 0.9)
        if prejazd is not None and i == prejazd:
            oblukova_doska(G, M['kamen'], h, s, w + 0.4, Z_PATA, 4.0, 0.03)
            oblukova_doska(G, M['drevo'], h, s, w - 0.2, 0.0, 4.1, 0.06)
        else:
            oblukova_doska(G, M['ruzova_tmava'], h, s, w, 0.5, 5.4 - w / 2, 0.03)
            oblukova_doska(G, M['sklo'], h, s, 1.4, 5.4 - w / 2 - 0.05, 5.4 - w / 2, 0.06, seg=8)
            okno(G, M, h, s, 1.2, 1.4, 3.1, ram=0.15, mat_ram=M['ramy'], priecky=1)
        okno(G, M, h, s, 1.35, 7.8, 10.5, ram=0.17, mat_ram=M['ramy'], priecky=1, priecnik=9.8)
        blok(G, M['kamen'], h, s, 1.9, 0.18, 10.7, 10.95)
        okno(G, M, h, s, 1.35, 12.4, 14.6, ram=0.17, mat_ram=M['ramy'], priecky=1, priecnik=14.0)
    for i in range(1, n):
        blok(G, M['dvor'], h, L * i / n, 0.6, 0.08, 0.5, 6.0)
    blok(G, M['kamen'], h, L / 2, L, 0.25, 6.0, 6.35)
    blok(G, M['kamen'], h, L / 2, L, 0.45, Z_DVOR - 0.55, Z_DVOR)
    if balkon:
        s0, s1 = L * 0.5 / n - 0.8, L * (n - 0.5) / n + 0.8
        blok(G, M['kamen'], h, (s0 + s1) / 2, s1 - s0, 1.0, 7.55, 7.75)
        for i in range(n):
            blok(G, M['kamen'], h, L * (i + 0.5) / n + 0.9, 0.25, 0.9, 6.9, 7.55)
        hb = Hrana(h.bod(s0, 0.95), h.bod(s1, 0.95))
        doska(G, M['cierna'], hb, hb.L / 2, hb.L, 8.65, 8.72, 0.0)
        for i in range(int(hb.L / 0.5)):
            G.kvader(M['cierna'], hb.bod(0.25 + i * 0.5, 0.0), hb.t, 0.03, 0.03, 7.75, 8.7, vrch=False)


def postav_nadvorie(G, M):
    u0, u1, v0, v1 = NADVORIE
    steny = [((u1, v0), (u0, v0), [N_VON, N_DNU, E_VON], 5, False, 2),
             ((u0, v0), (u0, v1), [E_VON, E_DNU, N_VON], 5, True, None),
             ((u0, v1), (u1, v1), [S_DNU, S_VON, D_VON], 5, False, 2),
             ((u1, v1), (u1, v0), [W_DNU, N_VON, S_VON, plocha(26.8)], 5, False, None)]
    for a, b, roviny, n, balkon, prejazd in steny:
        stena_pod_strechou(G, M['dvor'], B(*a), B(*b), roviny)
        dvorova_fasada(G, M, H(a, b), n, balkon, prejazd)
    # fontána sv. Juraja: osemuholníková nádrž, podstavec, jazdec na koni s kopijou nad drakom
    c = B((u0 + u1) / 2, (v0 + v1) / 2)
    nat = math.atan2(U[1], U[0]) + math.pi / 8
    rotacne(G, M['kamen'], c, [(2.25, -0.3), (2.25, 0.6), (2.0, 0.6), (2.0, 0.35)], seg=8, natocenie=nat)
    rotacne(G, M['voda'], c, [(2.0, 0.4), (0.0, 0.4)], seg=8, natocenie=nat)
    G.kvader(M['kamen'], c, U, 1.1, 1.1, 0.3, 1.7)
    G.kvader(M['socha'], c, U, 1.5, 0.8, 1.7, 2.2)
    kon = [(c[0] - U[0] * 0.6, c[1] - U[1] * 0.6, 2.6), (c[0] + U[0] * 0.7, c[1] + U[1] * 0.7, 3.2)]
    G.tram(M['socha'], *kon, 0.55)
    G.tram(M['socha'], (c[0] + U[0] * 0.7, c[1] + U[1] * 0.7, 3.2), (c[0] + U[0] * 1.0, c[1] + U[1] * 1.0, 3.7), 0.3)
    for k in (-1, 1):
        G.tram(M['socha'], (c[0] - U[0] * 0.5 + V[0] * 0.15 * k, c[1] - U[1] * 0.5 + V[1] * 0.15 * k, 2.2),
               (c[0] - U[0] * 0.55 + V[0] * 0.15 * k, c[1] - U[1] * 0.55 + V[1] * 0.15 * k, 2.7), 0.14)
    socha(G, M, c, 3.0, 1.2, 0.9)
    G.tram(M['cierna'], (c[0] + U[0] * 0.2, c[1] + U[1] * 0.2, 3.9), (c[0] + U[0] * 1.4 - V[0] * 0.2, c[1] + U[1] * 1.4 - V[1] * 0.2, 1.9), 0.04)


def postav():
    """Vracia (Geo, výška modelu)."""
    G = Geo()
    M = {
        'ruzova': material('omietka-palac', RUZOVA, drsnost=0.85),
        'ruzova_tmava': material('omietka-arkady-palac', RUZOVA_TMAVA, drsnost=0.85),
        'dvor': material('omietka-dvor-palac', DVOR, drsnost=0.85),
        'kamen': material('piesokovec-palac', KAMEN, drsnost=0.8),
        'ramy': material('ramy-palac', RAMY, drsnost=0.8),
        'lizeny': material('ramy-palac', RAMY, drsnost=0.8),
        'sokel': material('sokel-palac', SOKEL, drsnost=0.9),
        'socha': material('socha-palac', SOCHA, drsnost=0.85),
        'strecha': material('skridla-palac', STRECHA, drsnost=0.75),
        'med': material('med-patina-palac', MED, drsnost=0.5, kov=0.25),
        'zlato': material('zlato-palac', ZLATO, drsnost=0.35, kov=0.6),
        'klobuk': material('zelezo-klobuk-palac', KLOBUK, drsnost=0.5, kov=0.4),
        'mozaika': material('mozaika-palac', MOZAIKA, drsnost=0.8),
        'mozaika_svetla': material('mozaika-postavy-palac', MOZAIKA_SVETLA, drsnost=0.8),
        'mramor': material('mramor-palac', MRAMOR, drsnost=0.4),
        'sklo': material('sklo-palac', SKLO, drsnost=0.15, kov=0.4),
        'drevo': material('drevo-palac', DREVO, drsnost=0.7),
        'cierna': material('zelezo-palac', CIERNA, drsnost=0.55, kov=0.5),
        'voda': material('voda-fontana-palac', VODA, drsnost=0.1, kov=0.2),
    }
    postav_kridla(G, M)
    postav_priecelie(G, M)
    postav_nadvorie(G, M)
    return G, Z_STIT + 2.6 + 0.9


# bod na dlažbe námestia pred portikom (lokálne x, z hry) – model sa kladie naň
_zb = B(23.0, -8.0)
ZAKLADNA_BOD = [round(_zb[0], 2), round(-_zb[1], 2)]
