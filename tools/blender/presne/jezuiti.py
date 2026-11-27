# Jezuitský kostol (Kostol Najsvätejšieho Spasiteľa), Františkánske námestie / Hlavné námestie / Kostolná –
# postavený 1636–1638 ako evanjelický kostol (bez veže, nesmel pripomínať sakrálnu stavbu), od roku 1672 jezuitský;
# po roku 1672 pribudol barokový portál s jezuitskou kartušou a sanktusník na hrebeni (1673). Pred priečelím
# Mariánsky stĺp (Leopold I., 1675).
# Presný model exteriéru podľa prieskumu v napady/pamiatky-podklady.md („Jezuitský kostol“):
#  - pôdorys z OSM (way 38539535), výšky z laserového skenovania ÚGKK (DMP/DMR, INSPIRE WMS),
#  - fasády podľa verejných fotografií (Wikimedia Commons, len na porovnanie): jednoduchý obdĺžnik, západné priečelie
#    s lichobežníkovým štítom (šikmé rímsy od nároží, vodorovná rímsa) a strmou valbou s kovaným krížom, 5 osí –
#    4 vysoké polkruhové okná v sivých kamenných rámoch, sivý pilastrový portál s pozlátenou kartušou (IHS), bočné
#    portály, tri okuly; strana do Kostolnej s dvoma radmi okien; tmavý sanktusník so žalúziami a ihlanovou helmicou.
# Lokálna sústava: u = pozdĺž západného priečelia (azimut 149°, od SZ nárožia k Starej radnici), v = pozdĺž osi
# kostola (azimut 59°, od priečelia k presbytériu); začiatok = západné nárožie (OSM). Nula výšky = dlažba
# Hlavného námestia pred priečelím (≈ 139,1 m).
import math

from veze import Geo
from spolocne import material
from presne.snd import Hrana, doska, blok, oblukova_doska, ovalna_doska
from presne.reduta import rotacne
from presne.radnica import rovina, strecha, stena_pod_strechou, vikier

OMIETKA, RAMY, PORTAL, SOKEL = '#e6e0d0', '#b8b6ac', '#9e9c92', '#d3c6a6'
STRECHA, VEZICKA, ZALUZIE, CIERNA = '#83473a', '#505150', '#6b5040', '#2a2a2a'
DREVO, ZLATO, BIELA, CERVENA, SKLO = '#6a4a30', '#c9a040', '#f0eee8', '#b03a2e', '#2f343a'
MRAMOR, SOCHA = '#bb9a80', '#e6e1d4'

AZ = math.radians(149.0)
U = (math.sin(AZ), math.cos(AZ))
V = (-U[1], U[0])
O = (-21.18, 1.72)                      # západné nárožie (Blender: x = x hry, y = −z hry, od stredu záznamu)


def B(u, v):
    return (O[0] + U[0] * u + V[0] * v, O[1] + U[1] * u + V[1] * v)


def H(a, b):
    return Hrana(B(*a), B(*b))


def R(a, b, z0, sklon):
    return rovina(B(*a), B(*b), z0, sklon, uv=False)


# --- rozmery (m nad dlažbou pred priečelím) --------------------------------------------------------------------------
# Laser (DMP, mriežka 1 m): odkvap dlhých strán 16,35 m, hrebeň 29,15 m (sklon ~44°), vodorovná rímsa štítu ~20 m,
# strmá valba nad ňou do hrebeňa 2,7 m za priečelím, kríž na valbe do ~32 m, sanktusník do 39,95 m (~4 m pred
# východným koncom), Mariánsky stĺp ~10–11 m. Terén: Hlavné nám. 139,1, Františkánske nám. +0,5, Kostolná ±0,1 m.
Z_PATA = -1.0
Z_ODKVAP, Z_STIT, Z_HREBEN = 16.35, 20.0, 29.15
SKLON_SZ, SKLON_JV, SKLON_VALBA = 0.98, 0.94, 3.4

# pôdorys (u, v) proti smeru hodinových ručičiek; na SZ strane prilieha k domu jezuitov (v 0–14,8)
KOSTOL = [(0.0, 0.0), (26.86, 0.0), (25.5, 34.5), (-3.2, 33.4), (-1.42, 14.8)]
ROVINY = [R((-3.2, 33.4), (0.0, 0.0), Z_ODKVAP, SKLON_SZ), R((26.86, 0.0), (25.5, 34.5), Z_ODKVAP, SKLON_JV),
          R((0.0, 0.0), (26.86, 0.0), Z_STIT, SKLON_VALBA), R((25.5, 34.5), (-3.2, 33.4), Z_STIT, SKLON_VALBA)]
OS = 13.43                              # os priečelia (hlavný portál)
HREBEN_U = 13.1
STLP = (13.5, -17.2)                    # Mariánsky stĺp na osi portálu


def okno_oblukove(G, M, h, s, w, z0, z_pata, ram=0.3, mriezka=True, rimsa=True):
    """Polkruhovo ukončené okno v sivom kamennom ráme s nadokennou rímsou a tmavým olovením."""
    oblukova_doska(G, M['ramy'], h, s, w + 2 * ram, z0 - ram, z_pata, 0.03)
    oblukova_doska(G, M['sklo'], h, s, w, z0, z_pata, 0.06)
    if mriezka:
        doska(G, M['cierna'], h, s, 0.06, z0, z_pata + w / 2 - 0.1, 0.08)
        for z in (z0 + (z_pata - z0) * 0.35, z0 + (z_pata - z0) * 0.7, z_pata):
            doska(G, M['cierna'], h, s, w, z - 0.03, z + 0.03, 0.08)
    blok(G, M['ramy'], h, s, w + 2 * ram + 0.3, 0.16, z0 - ram - 0.2, z0 - ram)
    if rimsa:
        zt = z_pata + w / 2 + ram
        blok(G, M['ramy'], h, s, w + 2 * ram + 0.5, 0.22, zt + 0.25, zt + 0.5)


def postav_priecelie(G, M):
    h = H((0.0, 0.0), (26.86, 0.0))
    blok(G, M['sokel'], h, h.L / 2, h.L + 0.2, 0.12, Z_PATA, 0.8)
    # korunná rímsa: šikmé ramená od nároží a vodorovná rímsa pod valbou
    u_l = (Z_STIT - Z_ODKVAP) / (SKLON_SZ * 0.9954)
    u_p = 26.86 - (Z_STIT - Z_ODKVAP) / (SKLON_JV * 0.9992)
    linia = [(0.0, Z_ODKVAP), (u_l, Z_STIT), (u_p, Z_STIT), (26.86, Z_ODKVAP)]
    for (s0, z0), (s1, z1) in zip(linia, linia[1:]):
        G.tram(M['omietka'], (*h.bod(s0 - 0.25 if s0 == 0 else s0, 0.32), z0 - 0.25), (*h.bod(s1 + 0.25 if s1 == 26.86 else s1, 0.32), z1 - 0.25), 0.6)
        G.tram(M['omietka'], (*h.bod(s0, 0.14), z0 - 0.95), (*h.bod(s1, 0.14), z1 - 0.95), 0.32)
    # 4 vysoké okná, 2 dolné okná, bočné portály
    for du in (-8.75, -2.9, 2.9, 8.75):
        okno_oblukove(G, M, h, OS + du, 1.95, 7.9, 12.0)
    for du in (-3.7, 3.7):
        okno_oblukove(G, M, h, OS + du, 1.8, 2.1, 4.4, ram=0.25, rimsa=False)
    for du in (-8.75, 8.75):
        s = OS + du
        blok(G, M['ramy'], h, s, 2.3, 0.14, 0.0, 3.6)
        blok(G, M['ramy'], h, s, 2.7, 0.3, 3.6, 3.95)
        doska(G, M['drevo'], h, s, 1.55, 0.0, 2.9, 0.16)
        for k in range(3):
            G.kvader(M['sokel'], h.bod(s, 0.3 + 0.3 * (2 - k)), h.t, 2.6, 0.3, Z_PATA, 0.15 * (k + 1))
    # okuly: veľký nad portálom, malé v šikmých ramenách
    for s, zc, r in ((OS, 14.7, 1.2), (OS - 8.75, 15.4, 0.8), (OS + 8.75, 15.4, 0.8)):
        ovalna_doska(G, M['ramy'], h, s, zc, r, r, 0.03, seg=16)
        ovalna_doska(G, M['sklo'], h, s, zc, r * 0.78, r * 0.78, 0.06, seg=16)
        doska(G, M['cierna'], h, s, 0.05, zc - r * 0.78, zc + r * 0.78, 0.08)
        doska(G, M['cierna'], h, s, r * 1.56, zc - 0.025, zc + 0.025, 0.08)
    postav_portal(G, M, h)


def postav_portal(G, M, h):
    """Sivý pilastrový portál s polkruhovým otvorom, vyrezávané vráta, schody; nad ním pozlátená jezuitská kartuša."""
    s = OS
    blok(G, M['portal'], h, s, 4.6, 0.12, Z_PATA, 4.6)
    for k in (-1, 1):
        for d in (1.85, 1.3):
            blok(G, M['portal'], h, s + k * d, 0.45, 0.32, Z_PATA, 4.5)
    blok(G, M['portal'], h, s, 4.9, 0.45, 4.5, 5.0)
    blok(G, M['portal'], h, s, 5.2, 0.6, 5.0, 5.3)
    oblukova_doska(G, M['portal'], h, s, 2.7, 0.0, 2.65, 0.15)
    oblukova_doska(G, M['drevo'], h, s, 2.2, 0.0, 2.65, 0.2)
    blok(G, M['portal'], h, s, 0.4, 0.3, 3.55, 4.05)                    # klenák
    for k in range(4):
        G.kvader(M['sokel'], h.bod(s, 0.5 + 0.35 * (3 - k)), h.t, 6.0, 0.35, Z_PATA, 0.15 * (k + 1))
    for k in (-1, 1):                                                   # zábradlie schodiska
        G.tram(M['cierna'], (*h.bod(s + k * 2.6, 1.9), 1.5), (*h.bod(s + k * 2.6, 0.4), 1.5), 0.05)
    # kartuša: akantový veniec, voluty, IHS s krížikom, plamenné srdce, stuhové kartuše s nápisom
    zc = 6.7
    venec = [(s + (1.55 if i % 2 == 0 else 1.25) * math.cos(math.pi * i / 12),
              zc + (1.3 if i % 2 == 0 else 1.05) * math.sin(math.pi * i / 12)) for i in range(24)]
    G.plocha(M['zlato'], [(*h.bod(x, 0.08), z) for x, z in venec])          # akantový veniec
    ovalna_doska(G, M['biela'], h, s, zc + 0.1, 0.85, 0.8, 0.12, seg=14)
    for dx in (-0.3, 0.0, 0.3):                                               # IHS
        doska(G, M['zlato'], h, s + dx, 0.12, zc + 0.15, zc + 0.6, 0.16)
    doska(G, M['zlato'], h, s, 0.06, zc + 0.6, zc + 0.85, 0.16)               # krížik nad H
    doska(G, M['zlato'], h, s, 0.3, zc + 0.7, zc + 0.76, 0.16)
    G.plocha(M['cervena'], [(*h.bod(s, 0.16), zc - 0.5), (*h.bod(s + 0.2, 0.16), zc - 0.25),
                            (*h.bod(s, 0.16), zc - 0.05), (*h.bod(s - 0.2, 0.16), zc - 0.25)])   # plamenné srdce
    for k in (-1, 1):                                                         # biele voluty a stuhové kartuše
        ovalna_doska(G, M['biela'], h, s + k * 1.7, zc - 0.5, 0.3, 0.5, 0.06, seg=10)
        doska(G, M['biela'], h, s + k * 0.75, 1.1, 5.4, 5.8, 0.1)


def postav_boky(G, M):
    # Kostolná (JV): 5 osí, dole polkruhové okná s mrežou, hore vysoké polkruhové okná; pri presbytériu obdĺžnikové okná
    hs = H((26.86, 0.0), (25.5, 34.5))
    blok(G, M['sokel'], hs, hs.L / 2, hs.L, 0.12, Z_PATA, 0.9)
    blok(G, M['omietka'], hs, hs.L / 2, hs.L + 0.6, 0.6, Z_ODKVAP - 0.6, Z_ODKVAP)
    blok(G, M['omietka'], hs, hs.L / 2, hs.L, 0.3, Z_ODKVAP - 1.25, Z_ODKVAP - 0.9)
    for i, s in enumerate((4.6, 11.1, 17.6, 24.1, 30.6)):
        okno_oblukove(G, M, hs, s, 1.8, 2.0, 4.3, ram=0.25, rimsa=False)
        if i < 4:
            okno_oblukove(G, M, hs, s, 1.9, 7.9, 12.0)
        else:
            for z0 in (7.6, 11.0):
                doska(G, M['ramy'], hs, s, 1.5, z0 - 0.2, z0 + 2.0, 0.03)
                doska(G, M['sklo'], hs, s, 1.1, z0, z0 + 1.8, 0.06)
                blok(G, M['ramy'], hs, s, 1.8, 0.18, z0 + 2.05, z0 + 2.25)
    # severozápadná strana: hladká stena s korunnou rímsou (dole prilieha dom jezuitov)
    for a, b in (((-1.42, 14.8), (0.0, 0.0)), ((-3.2, 33.4), (-1.42, 14.8))):
        h = H(a, b)
        blok(G, M['omietka'], h, h.L / 2, h.L + 0.6, 0.6, Z_ODKVAP - 0.6, Z_ODKVAP)
    hn = H((-3.2, 33.4), (-1.42, 14.8))
    for s in (4.5, 11.0):
        okno_oblukove(G, M, hn, s, 1.9, 7.9, 12.0)


def postav_strechu(G, M):
    ob = [B(*p) for p in KOSTOL]
    strecha(G, M['strecha'], ob, ROVINY)
    steny = [M['omietka'], M['omietka'], (M['omietka'], 17.0), M['omietka'], (M['omietka'], 12.5)]
    for i, s in enumerate(steny):
        mat, z_od = s if isinstance(s, tuple) else (s, None)
        stena_pod_strechou(G, mat, ob[i], ob[(i + 1) % len(ob)], ROVINY, z_od)
    # vetracie vikiere na dlhých stranách, malý červený vikier na osi západnej valby
    for a, b, sk in (((26.86, 0.0), (25.5, 34.5), SKLON_JV), ((-3.2, 33.4), (0.0, 0.0), SKLON_SZ)):
        h = H(a, b)
        for k, d in enumerate((3.0, 6.5)):
            for s in (8.0, 14.5, 21.0, 27.0) if k == 0 else (11.0, 18.0, 24.5):
                vikier(G, M, h, s, d, Z_ODKVAP + sk * d, sk, 0.7, 0.55, M['strecha'], M['strecha'], strmost=1.0, okno_w=0.35)
    hz = H((0.0, 0.0), (26.86, 0.0))
    vikier(G, M, hz, OS, 0.45, Z_STIT + SKLON_VALBA * 0.45, SKLON_VALBA, 0.8, 0.7, M['cervena'], M['cervena'], strmost=1.2, okno_w=0.3)
    # kovaný kríž s hviezdou na vrchole západnej valby
    c = B(HREBEN_U, (Z_HREBEN - Z_STIT) / SKLON_VALBA)
    G.kvader(M['cierna'], c, U, 0.07, 0.07, Z_HREBEN - 0.2, Z_HREBEN + 2.6)
    G.kvader(M['cierna'], c, U, 1.0, 0.06, Z_HREBEN + 1.65, Z_HREBEN + 1.73)
    lucy = [(c[0] + U[0] * (0.35 if k % 2 == 0 else 0.13) * math.cos(math.pi * k / 6),
             c[1] + U[1] * (0.35 if k % 2 == 0 else 0.13) * math.cos(math.pi * k / 6),
             Z_HREBEN + 2.75 + (0.35 if k % 2 == 0 else 0.13) * math.sin(math.pi * k / 6)) for k in range(12)]
    G.plocha(M['cierna'], lucy)
    G.plocha(M['cierna'], lucy[::-1])


def postav_sanktusnik(G, M):
    """Sanktusník (1673): tmavý štvorhranný hranol, zvonové poschodie so žalúziami, vysunutá rímsa, ihlanová helmica,
    gulička a kríž."""
    c = B(HREBEN_U, 30.0)
    nat = math.atan2(U[1], U[0]) + math.pi / 4
    k = math.sqrt(2)
    hw = 0.8
    rohy = [(c[0] + (U[0] * a + V[0] * b) * hw, c[1] + (U[1] * a + V[1] * b) * hw) for a, b in ((-1, -1), (1, -1), (1, 1), (-1, 1))]
    G.hranol(M['vezicka'], rohy, Z_HREBEN - 1.5, 32.8, vrch=False)
    for i in range(4):
        hh = Hrana(rohy[i], rohy[(i + 1) % 4])
        for d in (-0.35, 0.35):
            doska(G, M['zaluzie'], hh, hh.L / 2 + d, 0.5, 31.0, 32.5, 0.03)
    rotacne(G, M['vezicka'], c, [(hw * k, 32.8), (1.15 * k, 33.05), (1.05 * k, 33.2), (0.85 * k, 33.3),
                                 (0.6 * k, 34.2), (0.08 * k, 38.6), (0.0, 38.65)], seg=4, natocenie=nat)
    rotacne(G, M['zlato'], c, [(0.0, 38.6), (0.15, 38.72), (0.15, 38.88), (0.0, 39.0)], seg=8)
    G.kvader(M['cierna'], c, U, 0.05, 0.05, 39.0, 39.95)
    G.kvader(M['cierna'], c, U, 0.45, 0.05, 39.55, 39.62)


def postav_stlp(G, M):
    """Mariánsky stĺp (1675): schody, piedestál s erbom, driek z ružového mramoru, kompozitná hlavica, Panna Mária."""
    c = B(*STLP)
    for k, w in enumerate((4.2, 3.6, 3.0)):
        G.kvader(M['sokel'], c, U, w, w, Z_PATA if k == 0 else 0.2 * k, 0.2 * (k + 1))
    G.kvader(M['socha'], c, U, 2.0, 2.0, 0.6, 0.9)
    G.kvader(M['socha'], c, U, 1.7, 1.7, 0.9, 2.7)
    G.kvader(M['socha'], c, U, 2.0, 2.0, 2.7, 3.0)
    hz = Hrana((c[0] - U[0] * 0.85 - V[0] * 0.86, c[1] - U[1] * 0.85 - V[1] * 0.86),
               (c[0] + U[0] * 0.85 - V[0] * 0.86, c[1] + U[1] * 0.85 - V[1] * 0.86))
    ovalna_doska(G, M['ramy'], hz, hz.L / 2, 1.8, 0.5, 0.65, 0.02, seg=10)          # erb na piedestáli
    rotacne(G, M['mramor'], c, [(0.42, 3.0), (0.4, 3.25), (0.35, 3.35), (0.33, 8.5), (0.38, 8.6)], seg=10)
    rotacne(G, M['socha'], c, [(0.36, 8.6), (0.55, 9.1), (0.62, 9.3), (0.0, 9.35)], seg=8)
    rotacne(G, M['socha'], c, [(0.42, 9.35), (0.4, 9.8), (0.3, 10.4), (0.22, 10.6), (0.12, 10.65), (0.14, 10.85),
                               (0.12, 11.0), (0.0, 11.05)], seg=8)
    rotacne(G, M['zlato'], c, [(0.12, 11.0), (0.13, 11.15), (0.0, 11.16)], seg=6)


def postav():
    """Vracia (Geo, výška modelu)."""
    G = Geo()
    M = {
        'omietka': material('omietka-jezuiti', OMIETKA, drsnost=0.85),
        'ramy': material('kamen-ramy-jezuiti', RAMY, drsnost=0.8),
        'lizeny': material('kamen-ramy-jezuiti', RAMY, drsnost=0.8),
        'portal': material('portal-jezuiti', PORTAL, drsnost=0.8),
        'sokel': material('piesokovec-jezuiti', SOKEL, drsnost=0.85),
        'strecha': material('skridla-jezuiti', STRECHA, drsnost=0.75),
        'vezicka': material('plech-vezicka-jezuiti', VEZICKA, drsnost=0.55, kov=0.3),
        'zaluzie': material('drevo-zaluzie-jezuiti', ZALUZIE, drsnost=0.7),
        'cierna': material('zelezo-jezuiti', CIERNA, drsnost=0.55, kov=0.5),
        'drevo': material('drevo-jezuiti', DREVO, drsnost=0.7),
        'zlato': material('zlato-jezuiti', ZLATO, drsnost=0.35, kov=0.6),
        'biela': material('stuk-jezuiti', BIELA, drsnost=0.8),
        'cervena': material('cervena-jezuiti', CERVENA, drsnost=0.7),
        'sklo': material('sklo-jezuiti', SKLO, drsnost=0.15, kov=0.4),
        'mramor': material('mramor-stlp-jezuiti', MRAMOR, drsnost=0.4),
        'socha': material('kamen-stlp-jezuiti', SOCHA, drsnost=0.8),
    }
    postav_strechu(G, M)
    postav_priecelie(G, M)
    postav_boky(G, M)
    postav_sanktusnik(G, M)
    postav_stlp(G, M)
    return G, 39.95


# bod na dlažbe pred portálom (lokálne x, z hry) – model sa kladie naň
_zb = B(OS, -6.0)
ZAKLADNA_BOD = [round(_zb[0], 2), round(-_zb[1], 2)]
