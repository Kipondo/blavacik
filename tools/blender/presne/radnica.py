# Stará radnica, Hlavné námestie / Primaciálne námestie / Kostolná – skupina domov okolo nádvoria: gotická veža
# na SZ nároží (13./14. stor., barokový vrch po požiari 1733), Jakubov dom so severným krídlom (okolo 1370),
# dom s gotickým portálom prejazdu a arkierom (1442–1452), Pawerov dom s gotickou kamennou fasádou, Ungerov dom;
# novogotické východné krídlo na Primaciálnom námestí a južné krídlo (J. Hübner a S. Mészner, 1911–1912).
# Presný model exteriéru podľa prieskumu v napady/pamiatky-podklady.md („Stará radnica“):
#  - pôdorys z OSM (relácia 146009 – obrys a nádvorie), výšky z laserového skenovania ÚGKK (DMP/DMR, INSPIRE WMS),
#  - fasády podľa verejných fotografií (Wikimedia Commons, len na porovnanie): okrová veža s nárožnými lizénami,
#    gotickým oknom s vimpergom, galériou s balustrádou na konzolách, ustúpeným barokovým poschodím s hodinami
#    na každej strane a medenou zvonovitou helmicou s cibuľkou; Madona pod červenou striežkou na SZ nároží;
#    priečelie na Hlavné námestie: gotický portál prejazdu, kamenný arkier s mozaikovou glazovanou striežkou, biely
#    dom so 4 oknami v tmavých kamenných šambránach, sivý Pawerov dom so 4 lomenými oknami, Ungerov dom; strmá strecha
#    z obyčajnej pálenej bobrovky s tromi vikiermi obloženými bielo-červeno-modrou glazovanou šachovnicou;
#    východné krídlo z vápenca so štítom nad bránou, arkierom s medenou strieškou a zelenou glazovanou strechou
#    s reťazou kosoštvorcov; nádvorie s dvojpodlažnými renesančnými arkádami, pultovými strieškami a oblúčkovou
#    atikou; dom so štítom do nádvoria, päťpodlažné južné krídlo s mansardou.
# Lokálna sústava: u = pozdĺž priečelia na Hlavnom námestí (azimut 151,5°, od SZ nárožia pri Kostolnej na juh),
# v = do bloku (azimut 61,5°); začiatok = SZ nárožie (OSM). Nula výšky = dlažba Hlavného námestia (≈ 138,85 m).
import math
import random

from veze import Geo, dlzka
from spolocne import material
from presne.snd import Hrana, doska, blok, oblukova_doska, ovalna_doska, segmentova_rimsa
from presne.reduta import rotacne
from presne.dom import lomeny_obrys, lomene_okno, _orez

OKROVA, LIZENY, OMIETKA_HORE, SOKEL = '#e3d09e', '#efe6cc', '#e6dac4', '#978672'
KAMEN, VAPENEC, BIELA, PAWER, RAM = '#d3c8b0', '#c9c0ae', '#eceae4', '#c1bdb5', '#6e6867'
MED, ZLATO, CIFERNIK, CIERNA, DREVO, TEHLA = '#7fa697', '#d4a640', '#f4f2ec', '#1e1e1e', '#4a2e22', '#e3a585'
STRECHA, STRECHA_DVOR = '#a35a44', '#74402f'
CERVENA, MODRA, GLAZURA = '#d0505e', '#4f62c0', '#f2efea'
ZELENA, HNEDA, OKR = '#3f7a5e', '#6e3b2a', '#c47a35'
SEVER, ARKADY, TMA, SKLO = '#d9c49a', '#efe8d8', '#5b5148', '#33393f'
LODZIA = '#a39684'                      # tieň v arkádach (zadná stena lodžie)

AZ = math.radians(151.5)
U = (math.sin(AZ), math.cos(AZ))
V = (-U[1], U[0])
O = (-31.85, 6.61)                      # SZ nárožie (Blender: x = x hry, y = −z hry, od stredu záznamu)


def B(u, v):
    return (O[0] + U[0] * u + V[0] * v, O[1] + U[1] * u + V[1] * v)


def hrana_uv(a, b):
    return Hrana(B(*a), B(*b))


# --- rozmery (m nad dlažbou Hlavného námestia) ----------------------------------------------------------------------
# Laser (DMP, mriežka 1 m, voči OSM ~0,5–1 m na západ): veža 44,4 m (helmica), galéria 24–25 m, rímsa 33–35 m;
# západná strecha odkvap 10,5, hrebeň 20,7 m ~6,8 m za priečelím; Ungerov dom 11,2 / 20,2 m; severné krídlo
# 8–9,5 → hrebeň atiky 13,4 m; východné krídlo odkvap 8,1–8,5 m, atika 13,7 m; južné krídlo 17 → 22,6 m (mansarda),
# juhovýchodná časť ~23–25 m. Terén: Hlavné nám. 138,85, Kostolná +0,5, nádvorie a Primaciálne nám. ±0,1.
Z_PATA = -1.0
Z_ODKVAP_Z, SKLON_PRED = 10.5, 1.51            # dom s arkierom a Pawerov dom (predná strana 57°)
Z_ZAD, SKLON_ZAD = 14.6, 0.9                   # zadná strana nad nádvorím
Z_ODKVAP_UNGER = 11.2
Z_VON, SKLON_VON, Z_ATIKA = 8.5, 0.7, 13.4     # vonkajšie strechy severného a východného krídla, hrebeň pri atike
Z_PULT, Z_PULT_HORE = 9.5, 12.0                # pultové striešky nad arkádami (odkvap, pri atike)
Z_JUH, Z_JUH_HORE = 17.5, 22.6                 # južné krídlo 1912: odkvap mansardy, plochý vrch
Z_GAL0, Z_GAL, Z_BAL = 23.45, 24.35, 25.42     # veža: konzoly galérie, podlaha, vrch balustrády
Z_RIMSA_HORE = 33.0                            # rímsa barokového poschodia
Z_VRCH = 44.8

# pôdorysy (u, v) proti smeru hodinových ručičiek
VEZA = [(0.0, -0.6), (7.8, -0.6), (7.8, 7.2), (0.0, 7.2)]
VEZA_HORE = [(0.7, 0.1), (7.1, 0.1), (7.1, 6.5), (0.7, 6.5)]
STRED_VEZE = (3.9, 3.3)
ZAPAD = [(7.8, 0.0), (11.73, 0.0), (31.1, 1.79), (31.1, 13.4), (7.8, 13.4), (7.8, 7.2)]
UNGER = [(31.1, 2.3), (41.34, 3.71), (40.9, 13.5), (31.1, 13.5)]
STITOVY = [(13.1, 10.0), (20.9, 10.0), (20.9, 17.8), (13.1, 17.8)]        # dom so štítom do nádvoria
KUT = [(5.5, 7.2), (7.8, 7.2), (7.8, 13.4), (5.5, 13.4)]
SEVER_VON = [(-0.49, 7.2), (0.0, 7.2), (5.5, 7.2), (5.5, 39.6), (-1.07, 39.6), (-2.31, 33.97)]
SEVER_DVOR = [(5.5, 13.4), (8.0, 13.4), (8.0, 37.3), (5.5, 39.6)]
VYCHOD_DVOR = [(8.0, 37.3), (25.0, 37.3), (25.0, 39.6), (5.5, 39.6)]
VYCHOD_VON = [(-1.07, 39.6), (25.0, 39.6), (25.0, 46.67), (0.66, 47.41)]
JUH_A = [(25.0, 13.5), (35.5, 13.5), (35.5, 46.0), (25.0, 46.67)]
JUH_B = [(35.5, 13.5), (40.9, 13.5), (40.4, 20.3), (35.5, 20.5)]
JUH_C = [(35.5, 28.8), (52.4, 28.4), (52.5, 34.5), (49.4, 44.8), (35.5, 46.0)]


# --- strechy z rovín a steny pod nimi -------------------------------------------------------------------------------

def rovina(a, b, z0, sklon, uv=True):
    """Rovina strechy cez priamku a→b vo výške z0, stúpa vľavo od smeru a→b (dnu pri obryse proti smeru hodinových
    ručičiek). Vracia (A, Bk, C): z = A·x + Bk·y + C v Blenderi."""
    if uv:
        a, b = B(*a), B(*b)
    L = dlzka(a, b)
    nx, ny = -(b[1] - a[1]) / L, (b[0] - a[0]) / L
    return (sklon * nx, sklon * ny, z0 - sklon * (a[0] * nx + a[1] * ny))


def plocha(z):
    return (0.0, 0.0, z)


def vyska(roviny, p):
    return min(r[0] * p[0] + r[1] * p[1] + r[2] for r in roviny)


def strecha(G, mat, obrys, roviny):
    """Strecha nad konvexným obrysom (Blender, CCW) ako dolná obálka rovín."""
    for r in roviny:
        poly = list(obrys)
        for q in roviny:
            if q is r:
                continue
            poly = _orez(poly, r[0] - q[0], r[1] - q[1], r[2] - q[2])
            if len(poly) < 3:
                break
        if len(poly) >= 3:
            G.plocha(mat, [(x, y, r[0] * x + r[1] * y + r[2]) for x, y in poly])


def stena_pod_strechou(G, mat, a, b, roviny, z_od=None):
    """Stena na úsečke a→b (lícom von) od z_od (inak od päty) po strechu – pri štíte vznikne trojuholník."""
    L = dlzka(a, b)
    tx, ty = (b[0] - a[0]) / L, (b[1] - a[1]) / L
    lin = [(r[0] * a[0] + r[1] * a[1] + r[2], r[0] * tx + r[1] * ty) for r in roviny]
    ts = {0.0, L}
    for i in range(len(lin)):
        for j in range(i + 1, len(lin)):
            dk = lin[i][1] - lin[j][1]
            if abs(dk) > 1e-9:
                t = (lin[j][0] - lin[i][0]) / dk
                if 1e-4 < t < L - 1e-4:
                    ts.add(t)
    body = [(t, min(z0 + k * t for z0, k in lin)) for t in sorted(ts)]
    spodok = Z_PATA if z_od is None else z_od
    cl = []
    for k, (t, z) in enumerate(body):
        if k:
            tp, zp = body[k - 1]
            if (zp - spodok) * (z - spodok) < 0:
                cl.append((tp + (t - tp) * (spodok - zp) / (z - zp), spodok))
        if z >= spodok:
            cl.append((t, z))
    if len(cl) < 2 or cl[-1][0] - cl[0][0] < 1e-3:
        return
    P = lambda t, z: (a[0] + tx * t, a[1] + ty * t, z)
    vrch = [P(t, z) for t, z in reversed(cl) if z > spodok + 1e-4]
    if vrch:
        G.plocha(mat, [P(cl[0][0], spodok), P(cl[-1][0], spodok)] + vrch)


def budova(G, mat_strecha, obrys_uv, roviny, steny):
    """Časť budovy: strecha nad obrysom a steny hrán podľa zoznamu steny (None = bez steny, mat alebo (mat, z_od))."""
    ob = [B(*p) for p in obrys_uv]
    strecha(G, mat_strecha, ob, roviny)
    for i, s in enumerate(steny):
        if s is None:
            continue
        mat, z_od = s if isinstance(s, tuple) else (s, None)
        stena_pod_strechou(G, mat, ob[i], ob[(i + 1) % len(ob)], roviny, z_od)
    return ob


# --- drobné prvky ---------------------------------------------------------------------------------------------------

def okno(G, M, h, s, w, z0, z1, ram=0.15, mat_ram=None, priecky=1, priecnik=None, mriezka=False, rimsa=False):
    """Pravouhlé okno: rám (šambrána), tmavé sklo, priečky; voliteľne mreža a rímsa nad oknom."""
    mr = mat_ram or M['lizeny']
    doska(G, mr, h, s, w + 2 * ram, z0 - ram, z1 + ram, 0.03)
    doska(G, M['sklo'], h, s, w, z0, z1, 0.06)
    for k in range(1, priecky + 1):
        doska(G, mr, h, s - w / 2 + w * k / (priecky + 1), 0.07, z0, z1, 0.08)
    if priecnik:
        doska(G, mr, h, s, w, priecnik - 0.04, priecnik + 0.04, 0.08)
    if mriezka:
        for k in range(4):
            doska(G, M['cierna'], h, s - w / 2 + w * (k + 0.5) / 4, 0.035, z0, z1, 0.12)
        doska(G, M['cierna'], h, s, w, (z0 + z1) / 2 - 0.02, (z0 + z1) / 2 + 0.02, 0.12)
    if rimsa:
        blok(G, mr, h, s, w + 2 * ram + 0.25, 0.14, z1 + ram, z1 + ram + 0.22)
        blok(G, mr, h, s, w + 2 * ram + 0.1, 0.1, z0 - ram - 0.12, z0 - ram)


def rad_okien(G, M, h, s0, s1, krok, rady, w=1.1, vys=1.5, mat_ram=None):
    """Pravidelný rad okien (dvorové a bočné fasády): rady = spodky okien."""
    n = max(1, int((s1 - s0) / krok))
    for i in range(n):
        s = s0 + (s1 - s0) * (i + 0.5) / n
        for z in rady:
            okno(G, M, h, s, w, z, z + vys, ram=0.12, mat_ram=mat_ram)


def vzor(G, poly2, bunka, bod, farba):
    """Mozaika na rovinnej ploche: poly2 = konvexný polygón v lokálnych 2D súradniciach (CCW = líc), bod(x, y) → 3D,
    farba(i, j) → materiál bunky alebo None."""
    xs, ys = [p[0] for p in poly2], [p[1] for p in poly2]
    n = len(poly2)
    for i in range(math.floor(min(xs) / bunka), math.ceil(max(xs) / bunka)):
        for j in range(math.floor(min(ys) / bunka), math.ceil(max(ys) / bunka)):
            m = farba(i, j)
            if m is None:
                continue
            c = [(i * bunka, j * bunka), ((i + 1) * bunka, j * bunka), ((i + 1) * bunka, (j + 1) * bunka), (i * bunka, (j + 1) * bunka)]
            for k in range(n):
                a, e = poly2[k], poly2[(k + 1) % n]
                c = _orez(c, e[1] - a[1], -(e[0] - a[0]), (e[0] - a[0]) * a[1] - (e[1] - a[1]) * a[0])
                if len(c) < 3:
                    break
            if len(c) >= 3:
                G.plocha(m, [bod(x, y) for x, y in c])


def vikier(G, M, h, s, d_f, z_r, sklon, w, vys, mat_celo, mat_strecha, strmost=1.1, sachovnica=None, okno_w=0.6):
    """Sedlový vikier na streche so sklonom `sklon` nad odkvapom h (normála h von zo strechy): čelo v hĺbke d_f
    (výška strechy z_r), stena čela vys, štít so sklonom strmost; sachovnica(i, j) = vzor glazúry na čele a bokoch."""
    hw = w / 2
    z_e = z_r + vys
    z_g = z_e + hw * strmost
    d_e = d_f + vys / sklon
    d_g = d_f + (z_g - z_r) / sklon
    P = lambda ss, d, z: (*h.bod(ss, -d), z)
    celo = [(s - hw, z_r), (s + hw, z_r), (s + hw, z_e), (s, z_g), (s - hw, z_e)]
    G.plocha(mat_celo, [P(x, d_f, y) for x, y in celo])
    lavy = [(-d_f, z_r), (-d_f, z_e), (-d_e, z_e)]
    pravy = [(d_f, z_r), (d_e, z_e), (d_f, z_e)]
    G.plocha(mat_celo, [P(s - hw, -x, y) for x, y in lavy])
    G.plocha(mat_celo, [P(s + hw, x, y) for x, y in pravy])
    if sachovnica:
        vzor(G, celo, 0.3, lambda x, y: P(x, d_f - 0.02, y), sachovnica)
        vzor(G, lavy, 0.3, lambda x, y: P(s - hw - 0.02, -x, y), sachovnica)
        vzor(G, pravy, 0.3, lambda x, y: P(s + hw + 0.02, x, y), sachovnica)
    o = 0.14
    G.plocha(mat_strecha, [P(s - hw - o, d_f - o, z_e - o * strmost), P(s, d_f - o, z_g), P(s, d_g, z_g), P(s - hw - o, d_e, z_e - o * strmost)])
    G.plocha(mat_strecha, [P(s, d_f - o, z_g), P(s + hw + o, d_f - o, z_e - o * strmost), P(s + hw + o, d_e, z_e - o * strmost), P(s, d_g, z_g)])
    # okienko
    zo = z_r + vys * 0.25
    G.plocha(M['lizeny'], [P(s - okno_w / 2 - 0.1, d_f - 0.03, zo - 0.1), P(s + okno_w / 2 + 0.1, d_f - 0.03, zo - 0.1),
                           P(s + okno_w / 2 + 0.1, d_f - 0.03, zo + vys * 0.62 + 0.1), P(s - okno_w / 2 - 0.1, d_f - 0.03, zo + vys * 0.62 + 0.1)])
    G.plocha(M['sklo'], [P(s - okno_w / 2, d_f - 0.06, zo), P(s + okno_w / 2, d_f - 0.06, zo),
                         P(s + okno_w / 2, d_f - 0.06, zo + vys * 0.62), P(s - okno_w / 2, d_f - 0.06, zo + vys * 0.62)])
    return z_g


def hrot(G, mat, c, z, vys, r=0.1):
    """Ozdobný kamenný alebo kovový hrot (fiala) na štíte."""
    rotacne(G, mat, c, [(r, z), (r, z + vys * 0.3), (r * 1.5, z + vys * 0.36), (r * 0.15, z + vys)], seg=4,
            natocenie=math.atan2(U[1], U[0]) + math.pi / 4)


def arkady(G, M, h, s0, s1, n_dole, n_hore):
    """Renesančné arkády nádvoria: prízemie s polkruhovými oblúkmi na toskánskych stĺpoch, lodžia s parapetom."""
    L = s1 - s0
    k = L / n_dole
    w = k - 0.8
    zp = 4.4 - w / 2
    for i in range(n_dole):
        oblukova_doska(G, M['lodzia'], h, s0 + k * (i + 0.5), w, 0.0, zp, 0.03, seg=8)
    for i in range(1, n_dole):
        c = h.bod(s0 + k * i, 0.3)
        G.valec(M['vapenec'], c, 0.22, -0.2, zp - 0.32, seg=8)
        G.kvader(M['vapenec'], c, h.t, 0.6, 0.6, zp - 0.32, zp)
    blok(G, M['arkady'], h, (s0 + s1) / 2, L, 0.14, 4.75, 5.8)
    blok(G, M['lizeny'], h, (s0 + s1) / 2, L + 0.1, 0.2, 5.8, 5.93)
    k2 = L / n_hore
    w2 = k2 - 0.55
    zp2 = 8.75 - w2 / 2
    for i in range(n_hore):
        oblukova_doska(G, M['lodzia'], h, s0 + k2 * (i + 0.5), w2, 5.93, zp2, 0.03, seg=8)
    for i in range(1, n_hore):
        c = h.bod(s0 + k2 * i, 0.2)
        G.valec(M['vapenec'], c, 0.14, 5.93, zp2 - 0.22, seg=6)
        G.kvader(M['vapenec'], c, h.t, 0.4, 0.4, zp2 - 0.22, zp2)
    blok(G, M['lizeny'], h, (s0 + s1) / 2, L, 0.25, Z_PULT - 0.25, Z_PULT)


def atika(G, M, h, s0, s1, z, r=0.72, krok=1.7):
    """Oblúčková atika: rímsa a rad polkruhových zubov s okrúhlym otvorom (líc k nádvoriu = normála h)."""
    blok(G, M['biela'], h, (s0 + s1) / 2, s1 - s0, 0.55, z - 0.32, z, von0=-0.33)
    n = int((s1 - s0) / krok)
    o = (s1 - s0 - n * krok) / 2
    seg = 6
    for i in range(n):
        sc = s0 + o + krok * (i + 0.5)
        oblk = [(sc + r * math.cos(math.pi * j / seg), z + r * math.sin(math.pi * j / seg)) for j in range(seg + 1)]
        F = [(*h.bod(x, 0.2), y) for x, y in oblk]
        Bk = [(*h.bod(x, -0.3), y) for x, y in oblk]
        G.plocha(M['biela'], [F[seg], F[0]] + F[1:seg])
        G.plocha(M['biela'], [Bk[0], Bk[seg]] + Bk[seg - 1:0:-1])
        for j in range(seg):
            G.plocha(M['biela'], [F[j], Bk[j], Bk[j + 1], F[j + 1]])
        ovalna_doska(G, M['tma'], h, sc, z + r * 0.42, 0.19, 0.19, 0.21, seg=8)


# --- veža -----------------------------------------------------------------------------------------------------------

def postav_vezu(G, M):
    b = [B(*p) for p in VEZA]
    hr = [Hrana(b[i], b[(i + 1) % 4]) for i in range(4)]
    zap, juh, vych, sev = hr
    for h, m in ((zap, 'okrova'), (juh, 'veza_hore'), (vych, 'veza_hore'), (sev, 'okrova')):
        G.stena(M[m], h.a, h.b, Z_PATA, Z_GAL)
    # sokel, nárožné lizény a rímsa v 15,9 m (priečelia do Hlavného nám. a Kostolnej)
    for h in (zap, sev):
        blok(G, M['sokel'], h, h.L / 2, h.L + 0.2, 0.1, Z_PATA, 1.2)
        for s in (0.4, h.L - 0.4):
            blok(G, M['lizeny'], h, s, 0.8, 0.07, 1.2, 15.6)
            blok(G, M['lizeny'], h, s, 0.8, 0.07, 16.2, Z_GAL0)
    G.pas(M['lizeny'], b, 15.6, 16.15, 0.22)
    # západ: gotické dvojdielne okno pod vimpergom, nad ním polkruhové okno s erbom mesta
    s = zap.L / 2
    lomene_okno(G, M, zap, s, 1.5, 5.4, 8.7, ram=0.2, prieciek=1, mat_ram=M['kamen'])
    for k in (-1, 1):
        a = (*zap.bod(s + k * 1.15, 0.12), 9.2)
        G.tram(M['kamen'], a, (*zap.bod(s, 0.12), 11.1), 0.16)
    hrot(G, M['kamen'], zap.bod(s, 0.15), 11.0, 0.9)
    oblukova_doska(G, M['lizeny'], zap, s, 1.35, 11.4, 12.95, 0.03)
    oblukova_doska(G, M['sklo'], zap, s, 1.0, 11.6, 12.95, 0.06)
    ovalna_doska(G, M['lizeny'], zap, s, 14.45, 0.62, 0.72, 0.05)
    ovalna_doska(G, M['cervena'], zap, s, 14.4, 0.36, 0.46, 0.09, seg=10)
    doska(G, M['glazura'], zap, s, 0.36, 14.25, 14.6, 0.11)
    # sever: gotické okno a oválne okienko
    s = sev.L / 2
    lomene_okno(G, M, sev, s, 1.3, 5.4, 8.4, ram=0.2, prieciek=1, mat_ram=M['kamen'], ruzica=False)
    ovalna_doska(G, M['lizeny'], sev, s, 12.4, 0.5, 0.66, 0.04)
    ovalna_doska(G, M['sklo'], sev, s, 12.4, 0.33, 0.48, 0.07, seg=10)
    # horná časť drieku: polkruhové okno a okulus so štukovým rámom
    for h in (zap, sev):
        s = h.L / 2
        oblukova_doska(G, M['lizeny'], h, s, 1.15, 17.05, 18.45, 0.03)
        oblukova_doska(G, M['sklo'], h, s, 0.85, 17.2, 18.45, 0.06)
        ovalna_doska(G, M['lizeny'], h, s, 21.0, 0.78, 0.78, 0.04, seg=14)
        ovalna_doska(G, M['sklo'], h, s, 21.0, 0.5, 0.5, 0.07, seg=12)
        blok(G, M['lizeny'], h, s, 1.0, 0.1, 21.85, 22.25)
    for h in (juh, vych):
        okno(G, M, h, h.L / 2, 0.7, 21.3, 22.5, ram=0.12)
    okno(G, M, vych, vych.L / 2, 0.7, 15.0, 16.2, ram=0.12)
    okno(G, M, vych, vych.L * 0.3, 0.7, 18.2, 19.4, ram=0.12)
    # Madona (1676) na SZ nároží pod červenou kužeľovou striežkou
    roh = b[0]
    d = ((-U[0] - V[0]) / math.sqrt(2), (-U[1] - V[1]) / math.sqrt(2))
    c = (roh[0] + d[0] * 0.4, roh[1] + d[1] * 0.4)
    G.kvader(M['kamen'], c, U, 0.55, 0.55, 4.6, 5.05)
    rotacne(G, M['glazura'], c, [(0.2, 5.05), (0.26, 5.4), (0.2, 6.0), (0.13, 6.25), (0.0, 6.3)], seg=6)
    rotacne(G, M['zlato'], c, [(0.12, 6.25), (0.13, 6.45), (0.0, 6.5)], seg=6)
    rotacne(G, M['cervena'], c, [(0.05, 6.55), (0.62, 6.6), (0.5, 6.75), (0.0, 7.55)], seg=8)
    rotacne(G, M['zlato'], c, [(0.07, 7.5), (0.1, 7.75), (0.0, 7.95)], seg=6)
    # galéria: konzoly, podlaha, balustráda s kovanými svietnikmi
    for h in hr:
        n = 9
        for i in range(n):
            blok(G, M['kamen'], h, h.L * (i + 0.5) / n, 0.3, 0.66, Z_GAL0, Z_GAL - 0.25)
    G.pas(M['kamen'], b, Z_GAL - 0.25, Z_GAL, 0.72)
    G.vodorovna(M['kamen'], b, Z_GAL)
    G.pas(M['kamen'], b, Z_GAL, Z_GAL + 0.15, 0.7, dnu=-0.42)
    G.pas(M['kamen'], b, Z_BAL - 0.22, Z_BAL, 0.72, dnu=-0.4)
    for h in hr:
        L = h.L + 1.1
        n = int(L / 0.36)
        for i in range(n):
            ss = -0.55 + L * (i + 0.5) / n
            G.kvader(M['kamen'], h.bod(ss, 0.56), h.t, 0.13, 0.13, Z_GAL + 0.15, Z_BAL - 0.22, vrch=False)
        for ss in (h.L * 0.25, h.L * 0.75):
            p = h.bod(ss, 0.56)
            G.kvader(M['cierna'], p, h.t, 0.05, 0.05, Z_BAL, Z_BAL + 0.75)
            for k in (-1, 1):                      # kované ramená svietnika (do V) s guľkou
                G.tram(M['cierna'], (*p, Z_BAL + 0.3), (*h.bod(ss + k * 0.28, 0.56), Z_BAL + 0.7), 0.035)
            rotacne(G, M['cierna'], p, [(0.0, Z_BAL + 0.72), (0.09, Z_BAL + 0.8), (0.0, Z_BAL + 0.9)], seg=6)
    for i in range(4):
        p = hr[i].bod(-0.56, 0.56)
        G.kvader(M['kamen'], p, U, 0.42, 0.42, Z_GAL, Z_BAL + 0.18)
    postav_barokove_poschodie(G, M)


def hodiny(G, M, h, s, zc):
    """Ciferník: biela doska 2,4 × 2,5 m, čierny prstenec s rímskymi číslicami (čiarky), čierne ručičky."""
    doska(G, M['cifernik'], h, s, 2.4, zc - 1.25, zc + 1.25, 0.05)
    ovalna_doska(G, M['cierna'], h, s, zc, 1.08, 1.08, 0.07, seg=20)
    ovalna_doska(G, M['cifernik'], h, s, zc, 0.84, 0.84, 0.09, seg=20)
    for i in range(12):
        f = 2 * math.pi * i / 12
        doska(G, M['cifernik'], h, s + 0.96 * math.cos(f), 0.07, zc + 0.96 * math.sin(f) - 0.06, zc + 0.96 * math.sin(f) + 0.06, 0.08)
    for uhol, dl in ((math.radians(140), 0.5), (math.radians(45), 0.76)):
        G.tram(M['cierna'], (*h.bod(s, 0.11), zc), (*h.bod(s + dl * math.cos(uhol), 0.11), zc + dl * math.sin(uhol)), 0.07)


def postav_barokove_poschodie(G, M):
    """Barokové poschodie (1733): ustúpené, nárožné pilastre, hodiny a žalúziové okno na každej strane, vlnitá rímsa
    s vázami na nárožiach a medená zvonovitá helmica s cibuľkou, guľou a hrotom."""
    b = [B(*p) for p in VEZA_HORE]
    hr = [Hrana(b[i], b[(i + 1) % 4]) for i in range(4)]
    G.hranol(M['veza_hore'], b, Z_GAL, Z_RIMSA_HORE - 0.6, vrch=False)
    for h in hr:
        for s in (0.3, h.L - 0.3):
            blok(G, M['lizeny'], h, s, 0.6, 0.12, Z_GAL, Z_RIMSA_HORE - 0.6)
        hodiny(G, M, h, h.L / 2, 28.0)
        oblukova_doska(G, M['lizeny'], h, h.L / 2, 1.6, 29.6, 31.3, 0.03)
        oblukova_doska(G, M['tma'], h, h.L / 2, 1.3, 29.75, 31.3, 0.06)
        for z in (30.2, 30.7, 31.2):
            doska(G, M['veza_hore'], h, h.L / 2, 1.3, z, z + 0.07, 0.08)
        segmentova_rimsa(G, M['lizeny'], h, h.L / 2, 4.2, Z_RIMSA_HORE - 0.1, 0.85, 0.45)
    G.pas(M['lizeny'], b, Z_RIMSA_HORE - 0.6, Z_RIMSA_HORE, 0.38)
    for i in range(4):
        p = hr[i].bod(-0.2, 0.2)
        G.kvader(M['kamen'], p, U, 0.6, 0.6, Z_RIMSA_HORE, Z_RIMSA_HORE + 0.6)
        rotacne(G, M['kamen'], p, [(0.14, 33.6), (0.3, 33.8), (0.33, 34.1), (0.18, 34.4), (0.26, 34.55), (0.08, 34.95), (0.0, 35.05)], seg=6)
    c = B(*STRED_VEZE)
    nat = math.atan2(U[1], U[0]) + math.pi / 4
    k = math.sqrt(2)
    # zvon helmice so štvorcovým pôdorysom (hrany na nárožiach)
    rotacne(G, M['med'], c, [(3.3 * k, Z_RIMSA_HORE), (3.38 * k, 33.5), (3.15 * k, 34.4), (2.7 * k, 35.4), (2.1 * k, 36.4),
                             (1.45 * k, 37.3), (0.95 * k, 38.1), (0.72 * k, 38.6)], seg=4, natocenie=nat)
    # cibuľka (zvlnená), guľa a hrot
    rotacne(G, M['med'], c, [(0.72, 38.6), (0.9, 38.9), (1.0, 39.4), (0.95, 39.9), (0.7, 40.4), (0.42, 40.9), (0.3, 41.3),
                             (0.38, 41.5), (0.3, 41.8), (0.18, 42.2), (0.16, 42.5)], seg=8, natocenie=nat)
    rotacne(G, M['med'], c, [(0.16, 42.5), (0.3, 42.6), (0.36, 42.85), (0.3, 43.1), (0.12, 43.25), (0.07, 43.3), (0.02, Z_VRCH)], seg=8)


# --- priečelie na Hlavné námestie -----------------------------------------------------------------------------------

def postav_zapad(G, M):
    R = [rovina((7.8, 0.0), (11.73, 0.0), Z_ODKVAP_Z, SKLON_PRED), rovina((11.73, 0.0), (31.1, 1.79), Z_ODKVAP_Z, SKLON_PRED),
         rovina((31.1, 13.4), (7.8, 13.4), Z_ZAD, SKLON_ZAD)]
    budova(G, M['strecha'], ZAPAD, R, [M['biela'], M['biela'], M['biela'], M['arkady'], (M['arkady'], Z_ATIKA), None])
    RU = [rovina((31.1, 2.3), (41.34, 3.71), Z_ODKVAP_UNGER, 1.6), rovina((40.9, 13.5), (31.1, 13.5), 15.5, SKLON_ZAD)]
    budova(G, M['strecha'], UNGER, RU, [M['biela'], (M['biela'], 16.6), None, None])
    h1, h2 = hrana_uv((7.8, 0.0), (11.73, 0.0)), hrana_uv((11.73, 0.0), (31.1, 1.79))
    hu = hrana_uv((31.1, 2.3), (41.34, 3.71))
    s2 = lambda u: (u - 11.73) / 0.99576
    # sokel, rímsa, medený žľab
    for h in (h1, h2, hu):
        blok(G, M['vapenec'], h, h.L / 2, h.L, 0.08, Z_PATA, 0.6)
    linia = [B(7.8, 0.0), B(11.73, 0.0), B(31.1, 1.79)]
    G.pas(M['lizeny'], linia, Z_ODKVAP_Z - 0.45, Z_ODKVAP_Z, 0.32, uzavreta=False)
    G.pas(M['med'], linia, Z_ODKVAP_Z - 0.15, Z_ODKVAP_Z + 0.05, 0.5, dnu=-0.32, uzavreta=False)
    lu = [B(31.1, 2.3), B(41.34, 3.71)]
    G.pas(M['lizeny'], lu, Z_ODKVAP_UNGER - 0.45, Z_ODKVAP_UNGER, 0.32, uzavreta=False)
    G.pas(M['med'], lu, Z_ODKVAP_UNGER - 0.15, Z_ODKVAP_UNGER + 0.05, 0.5, dnu=-0.32, uzavreta=False)
    for u in (7.95, 31.0):
        G.kvader(M['med'], B(u, -0.15), U, 0.12, 0.12, Z_PATA, Z_ODKVAP_Z)
    # gotický portál prejazdu (1442/43) a arkier nad ním
    s = 1.4
    G.plocha(M['kamen'], lomeny_obrys(h1, s, 3.3, Z_PATA, 3.0, 0.03, r_k=0.62))
    G.plocha(M['drevo'], lomeny_obrys(h1, s, 2.5, 0.0, 2.85, 0.07, r_k=0.62))
    for k in (-1, 1):
        blok(G, M['kamen'], h1, s + k * 1.5, 0.3, 0.18, Z_PATA, 3.6)
    postav_arkier(G, M, h1, s)
    # biely dom: 4 okná v tmavých kamenných šambránach, prízemie s mrežami
    for u in (12.0, 15.2, 18.9, 20.6):
        okno(G, M, h2, s2(u), 1.15, 6.3, 8.3, ram=0.2, mat_ram=M['ram'], priecky=1, priecnik=7.65, rimsa=True)
    for u in (14.9, 17.9, 20.6):
        okno(G, M, h2, s2(u), 0.9, 1.6, 3.0, ram=0.18, mat_ram=M['ram'], mriezka=True)
    okno(G, M, h2, s2(12.4), 0.6, 1.9, 2.9, ram=0.15, mat_ram=M['ram'], mriezka=True)
    # Pawerov dom: sivý kameň, 4 lomené okná s oslím chrbtom, zamurované lomené dvere
    doska(G, M['pawer'], h2, (s2(23.5) + s2(31.1)) / 2, s2(31.1) - s2(23.5), Z_PATA, Z_ODKVAP_Z - 0.45, 0.02)
    for u in (24.6, 26.4, 28.2, 30.0):
        ss = s2(u)
        lomene_okno(G, M, h2, ss, 0.95, 6.0, 8.3, ram=0.16, prieciek=1, mat_ram=M['ram'], ruzica=False)
        for k in (-1, 1):
            G.tram(M['ram'], (*h2.bod(ss + k * 0.72, 0.1), 8.55), (*h2.bod(ss, 0.1), 9.7), 0.11)
        hrot(G, M['ram'], h2.bod(ss, 0.12), 9.6, 0.5, r=0.06)
    blok(G, M['ram'], h2, (s2(23.5) + s2(31.1)) / 2, s2(31.1) - s2(23.5), 0.06, 9.75, 10.0)
    G.plocha(M['ram'], lomeny_obrys(h2, s2(26.0), 1.5, 0.0, 2.2, 0.04, r_k=0.8))
    okno(G, M, h2, s2(29.6), 0.55, 2.1, 2.9, ram=0.12, mat_ram=M['ram'], mriezka=True)
    # Ungerov dom
    for ss in (2.0, 5.2, 8.3):
        okno(G, M, hu, ss, 1.15, 6.4, 8.4, ram=0.2, mat_ram=M['ram'], priecky=1, priecnik=7.75, rimsa=True)
        okno(G, M, hu, ss, 1.0, 1.7, 3.1, ram=0.18, mat_ram=M['ram'], mriezka=True)
    # vikiere: tri s glazovanou šachovnicou (bielo-červeno-modrou), jeden biely na Ungerovom dome
    def sach(i, j):
        if (i + j) % 2 == 0:
            return None
        return M['cervena'] if ((i - j - 1) // 2) % 2 == 0 else M['modra']
    for u in (10.6, 16.5, 23.5):
        h = h1 if u < 11.73 else h2
        ss = (u - 7.8) if h is h1 else s2(u)
        d_f = 1.1
        z_r = vyska(R, h.bod(ss, -d_f))
        zg = vikier(G, M, h, ss, d_f, z_r, SKLON_PRED, 1.8, 1.7, M['glazura'], M['strecha'], strmost=1.15, sachovnica=sach)
        hrot(G, M['kamen'], h.bod(ss, -d_f + 0.05), zg - 0.05, 0.75, r=0.07)
    d_f = 1.1
    z_r = vyska(RU, hu.bod(5.2, -d_f))
    vikier(G, M, hu, 5.2, d_f, z_r, 1.6, 1.5, 1.4, M['biela'], M['strecha'], strmost=1.0)


def postav_arkier(G, M, h, s):
    """Neskorogotický arkier (1450-te roky): kamenná skriňa na konzolách, trojdielne okno, maľovaný tehlový parapet,
    dve sošky, pultová striežka z mozaiky glazovaných škridiel."""
    w, d = 2.8, 1.0
    z0, z1 = 5.0, 8.4
    # konzola (zúžený sokel)
    G.plocha(M['kamen'], [(*h.bod(s - w / 2, d), z0), (*h.bod(s + w / 2, d), z0), (*h.bod(s + 0.8, 0.0), 3.9), (*h.bod(s - 0.8, 0.0), 3.9)])
    for k in (-1, 1):
        G.plocha(M['kamen'], [(*h.bod(s + k * w / 2, 0.0), z0), (*h.bod(s + k * w / 2, d), z0), (*h.bod(s + k * 0.8, 0.0), 3.9)][::k])
    blok(G, M['kamen'], h, s, w, d, z0, z1)
    doska(G, M['tehla'], h, s, w - 0.4, z0 + 0.25, z0 + 0.95, d + 0.02)
    okno(G, M, Hrana(h.bod(s - w / 2, d), h.bod(s + w / 2, d)), w / 2, 2.0, 6.15, 7.95, ram=0.12, mat_ram=M['kamen'], priecky=2)
    for k in (-1, 1):
        p = h.bod(s + k * (w / 2 - 0.12), d + 0.12)
        G.kvader(M['kamen'], p, h.t, 0.25, 0.25, 6.0, 7.15)
        G.kvader(M['kamen'], p, h.t, 0.34, 0.34, 7.15, 7.35)
    blok(G, M['kamen'], h, s, w + 0.2, d + 0.12, z1, z1 + 0.18)
    # pultová striežka: náhodná mozaika (biela, žltá, zelená, modrá, hnedá, čierna)
    rnd = random.Random(146009)
    farby = [M['glazura'], M['okr'], M['zelena'], M['modra'], M['hneda'], M['cierna']]
    z_s, sk = z1 + 0.18, 1.05
    dd = d + 0.12
    poly = [(s - w / 2 - 0.1, -dd), (s + w / 2 + 0.1, -dd), (s + w / 2 + 0.1, 0.0), (s - w / 2 - 0.1, 0.0)]
    vzor(G, poly, 0.22, lambda x, y: (*h.bod(x, -y), z_s + sk * (dd + y)), lambda i, j: rnd.choice(farby))
    for k in (-1, 1):
        a, c = h.bod(s + k * (w / 2 + 0.1), dd), h.bod(s + k * (w / 2 + 0.1), 0.0)
        G.plocha(M['kamen'], [(*a, z_s), (*c, z_s), (*c, z_s + sk * dd)][::k])
    G.tram(M['med'], (*h.bod(s - w / 2 - 0.1, 0.05), z_s + sk * dd), (*h.bod(s + w / 2 + 0.1, 0.05), z_s + sk * dd), 0.12)


# --- severné krídlo (Kostolná), kút pri veži, dvorové krídla -------------------------------------------------------

R_VON = [rovina((-2.31, 33.97), (-0.49, 7.2), Z_VON, SKLON_VON), rovina((0.66, 47.41), (-2.31, 33.97), Z_VON, SKLON_VON),
         rovina((25.0, 46.67), (0.66, 47.41), Z_VON, SKLON_VON), plocha(Z_ATIKA)]


def postav_sever_a_dvor(G, M):
    budova(G, M['strecha_dvor'], SEVER_VON, R_VON,
           [M['sever'], None, (M['biela'], Z_PULT_HORE), None, M['sever'], M['sever']])
    budova(G, M['strecha_dvor'], KUT, [plocha(Z_ATIKA)], [None, None, (M['arkady'], Z_PULT), None])
    RS = [rovina((8.0, 13.4), (8.0, 37.3), Z_PULT, (Z_PULT_HORE - Z_PULT) / 2.5)]
    budova(G, M['strecha_dvor'], SEVER_DVOR, RS, [None, M['arkady'], None, None])
    RV = [rovina((8.0, 37.3), (25.0, 37.3), Z_PULT, (Z_PULT_HORE - Z_PULT) / 2.3)]
    budova(G, M['strecha_dvor'], VYCHOD_DVOR, RV, [M['arkady'], None, None, None])
    # Kostolná: rímsa so žľabom, malé okná
    linia = [B(0.66, 47.41), B(-2.31, 33.97), B(-0.49, 7.2)]
    G.pas(M['sever'], linia, Z_VON - 0.4, Z_VON, 0.28, uzavreta=False)
    G.pas(M['med'], linia, Z_VON - 0.12, Z_VON + 0.05, 0.45, dnu=-0.28, uzavreta=False)
    hs = hrana_uv((-2.31, 33.97), (-0.49, 7.2))
    blok(G, M['sokel'], hs, hs.L / 2, hs.L, 0.08, Z_PATA, 0.9)
    for i in range(6):
        ss = 2.5 + i * 4.4
        okno(G, M, hs, ss, 0.7, 1.9, 2.9, ram=0.12, mriezka=True)
        okno(G, M, hs, ss + 1.2, 1.0, 5.0, 6.5, ram=0.14)
    # nádvorie: arkády severného (6 + 7 oblúkov) a východného krídla (4 + 5), pultové striešky s vikiermi, atika
    ha = hrana_uv((8.0, 13.4), (8.0, 37.3))
    arkady(G, M, ha, 0.0, ha.L, 6, 7)
    hv = hrana_uv((8.0, 37.3), (25.0, 37.3))
    arkady(G, M, hv, 0.0, hv.L, 4, 5)
    for h, sk, poz in ((ha, (Z_PULT_HORE - Z_PULT) / 2.5, (5.5, 12.0, 18.5)), (hv, (Z_PULT_HORE - Z_PULT) / 2.3, (4.5, 12.5))):
        for ss in poz:
            vikier(G, M, h, ss, 0.55, Z_PULT + sk * 0.55, sk, 1.15, 1.0, M['drevo'], M['strecha_dvor'], strmost=1.0, okno_w=0.55)
    atika(G, M, hrana_uv((5.5, 13.4), (5.5, 39.6)), 0.0, 26.2, Z_ATIKA + 0.3)
    atika(G, M, hrana_uv((5.5, 39.6), (25.0, 39.6)), 0.3, 19.5, Z_ATIKA + 0.3)


# --- východné krídlo (Primaciálne nám., 1911–1912) -----------------------------------------------------------------

def postav_vychod(G, M):
    budova(G, M['zelena'], VYCHOD_VON, R_VON, [(M['biela'], Z_PULT_HORE), None, M['vapenec'], M['vapenec']])
    h = hrana_uv((25.0, 46.67), (0.66, 47.41))
    blok(G, M['sokel'], h, h.L / 2, h.L, 0.1, Z_PATA, 0.8)
    linia = [B(25.0, 46.67), B(0.66, 47.41), B(-1.07, 39.6)]
    G.pas(M['vapenec'], linia, Z_VON - 0.45, Z_VON, 0.3, uzavreta=False)
    G.pas(M['med'], linia, Z_VON - 0.12, Z_VON + 0.05, 0.45, dnu=-0.3, uzavreta=False)
    # zelená glazovaná strecha: v hornej polovici reťaz kosoštvorcov (hnedočervené s okrovým lemom a krémovým stredom)
    s0, s1 = 4.4, 11.0                                       # rizalit so štítom
    dc = 5.7
    for i in range(16):
        sc = 0.9 + i * 1.55
        if s0 - 0.6 < sc < s1 + 0.6:
            continue
        for mat, hw, hh, lift in ((M['okr'], 0.92, 0.95, 0.04), (M['hneda'], 0.74, 0.76, 0.07), (M['lizeny'], 0.22, 0.24, 0.1)):
            body = [(sc, dc - hh), (sc + hw, dc), (sc, dc + hh), (sc - hw, dc)]
            G.plocha(mat, [(*h.bod(x, -y), vyska(R_VON, h.bod(x, -y)) + lift) for x, y in body])
    # rizalit so strmým štítom nad bránou (vrchol ~15 m)
    a0, a1, a2, a3 = h.bod(s0, 0.3), h.bod(s1, 0.3), h.bod(s1, -7.0), h.bod(s0, -7.0)
    sk = (15.0 - Z_VON) / ((s1 - s0) / 2)
    RR = [rovina(a1, a2, Z_VON, sk, uv=False), rovina(a3, a0, Z_VON, sk, uv=False)]
    ob = [a0, a1, a2, a3]
    strecha(G, M['zelena'], ob, RR)
    for i in range(4):
        stena_pod_strechou(G, M['vapenec'], ob[i], ob[(i + 1) % 4], RR)
    hr = Hrana(a0, a1)
    sc = hr.L / 2
    for k in (-1, 1):
        G.tram(M['kamen'], (*hr.bod(sc + k * hr.L / 2, 0.12), Z_VON), (*hr.bod(sc, 0.12), 15.05), 0.22)
    hrot(G, M['kamen'], hr.bod(sc, 0.0), 15.0, 1.6, r=0.16)
    for k in (-1, 1):
        okno(G, M, hr, sc + k * 0.55, 0.42, 10.6, 11.8, ram=0.1, mat_ram=M['kamen'], priecky=0)
    # brána s kovanou mrežou, arkier s medenou valbovou strieškou
    G.plocha(M['kamen'], lomeny_obrys(hr, sc, 3.6, Z_PATA, 2.7, 0.03, r_k=0.6))
    G.plocha(M['tma'], lomeny_obrys(hr, sc, 3.0, 0.0, 2.6, 0.06, r_k=0.6))
    for k in range(-5, 6):
        G.kvader(M['cierna'], hr.bod(sc + k * 0.26, 0.09), hr.t, 0.035, 0.035, 0.0, 2.6 + 0.9 * math.cos(k * 0.26 / 1.5))
    w, d = 3.2, 0.85
    G.plocha(M['vapenec'], [(*hr.bod(sc - w / 2, d), 4.6), (*hr.bod(sc + w / 2, d), 4.6), (*hr.bod(sc + 0.9, 0.0), 3.7), (*hr.bod(sc - 0.9, 0.0), 3.7)])
    blok(G, M['vapenec'], hr, sc, w, d, 4.6, 8.0)
    doska(G, M['kamen'], hr, sc, w - 0.4, 4.85, 5.55, d + 0.02)
    hro = Hrana(hr.bod(sc - w / 2, d), hr.bod(sc + w / 2, d))
    for k in (-1, 1):
        okno(G, M, hro, w / 2 + k * 0.8, 1.2, 5.85, 7.65, ram=0.1, mat_ram=M['vapenec'], priecky=2, priecnik=7.05)
    ob = [hr.bod(sc - w / 2 - 0.15, 0.0), hr.bod(sc + w / 2 + 0.15, 0.0), hr.bod(sc + w / 2 + 0.15, d + 0.15), hr.bod(sc - w / 2 - 0.15, d + 0.15)]
    ob = ob[::-1] if (ob[1][0] - ob[0][0]) * (ob[2][1] - ob[0][1]) - (ob[1][1] - ob[0][1]) * (ob[2][0] - ob[0][0]) < 0 else ob
    strecha(G, M['med'], ob, [rovina(ob[i], ob[(i + 1) % 4], 8.0, 0.9, uv=False) for i in range(4)] + [plocha(9.0)])
    # krížové okná z kamenných priečok
    for ss, sirka in ((2.2, 1.3), (13.6, 1.9), (18.9, 1.3), (21.9, 1.3)):
        p = 2 if sirka > 1.5 else 1
        okno(G, M, h, ss, sirka, 1.3, 2.9, ram=0.14, mat_ram=M['kamen'], priecky=p, priecnik=2.4)
        okno(G, M, h, ss, sirka, 4.9, 6.9, ram=0.14, mat_ram=M['kamen'], priecky=p, priecnik=6.2)
    # kamenné vikiere so štítom a fialou priamo nad rímsou, novogotické komíny
    for ss in (2.2, 13.6, 18.9):
        d_f = 0.35
        z_r = vyska(R_VON, h.bod(ss, -d_f))
        zg = vikier(G, M, h, ss, d_f, z_r, SKLON_VON, 1.3, 1.5, M['vapenec'], M['zelena'], strmost=1.8, okno_w=0.5)
        hrot(G, M['kamen'], h.bod(ss, -d_f + 0.05), zg - 0.05, 0.9, r=0.08)
    for ss in (15.6, 20.6):
        p = h.bod(ss, -4.6)
        G.kvader(M['vapenec'], p, h.t, 0.9, 0.7, 10.0, 14.2)
        G.kvader(M['vapenec'], p, h.t, 1.1, 0.9, 14.2, 14.45)


# --- dom so štítom do nádvoria, dvorové fasády -----------------------------------------------------------------------

def postav_dvor_zapad(G, M):
    RS = [rovina((20.9, 10.0), (20.9, 17.8), 13.0, 1.13), rovina((13.1, 17.8), (13.1, 10.0), 13.0, 1.13)]
    budova(G, M['strecha'], STITOVY, RS, [None, M['arkady'], M['arkady'], M['arkady']])
    hs = hrana_uv((20.9, 17.8), (13.1, 17.8))
    blok(G, M['lizeny'], hs, hs.L / 2, hs.L, 0.2, 12.75, 13.0)
    for ss in (1.6, 3.9, 6.2):
        okno(G, M, hs, ss, 0.95, 1.4, 2.8, ram=0.14, mriezka=True)
        okno(G, M, hs, ss, 1.0, 4.7, 6.3, ram=0.14, mriezka=True)
        okno(G, M, hs, ss, 1.0, 8.2, 9.8, ram=0.14, mriezka=True)
    okno(G, M, hs, 3.9, 0.8, 13.9, 15.0, ram=0.12)
    for ss in (2.4, 5.4):
        ovalna_doska(G, M['lizeny'], hs, ss, 14.4, 0.42, 0.42, 0.03, seg=10)
        ovalna_doska(G, M['sklo'], hs, ss, 14.4, 0.28, 0.28, 0.06, seg=10)
    # pozlátené slnko na vrchole štítu
    c = hs.bod(3.9, 0.15)
    G.kvader(M['cierna'], c, hs.t, 0.05, 0.05, 17.3, 18.2)
    lucy = [(3.9 + (0.55 if k % 2 == 0 else 0.25) * math.cos(math.pi * k / 8), 18.4 + (0.55 if k % 2 == 0 else 0.25) * math.sin(math.pi * k / 8)) for k in range(16)]
    G.plocha(M['zlato'], [(*hs.bod(x, 0.17), z) for x, z in lucy])
    # bočné steny domu (časť nad nádvorím, v ≈ 15,6)
    for hh, ss in ((hrana_uv((20.9, 10.0), (20.9, 17.8)), 5.6), (hrana_uv((13.1, 17.8), (13.1, 10.0)), 2.2)):
        for z in (1.4, 4.7, 8.2):
            okno(G, M, hh, ss, 0.9, z, z + 1.4, ram=0.12)
    # zadná fasáda domov na Hlavnom nám. (k nádvoriu): gotický portál prejazdu, okná
    hz = hrana_uv((31.1, 13.4), (7.8, 13.4))
    s = 31.1 - 10.8
    G.plocha(M['kamen'], lomeny_obrys(hz, s, 3.5, Z_PATA, 2.7, 0.03, r_k=0.62))
    G.plocha(M['tma'], lomeny_obrys(hz, s, 2.9, 0.0, 2.6, 0.06, r_k=0.62))
    for z in (5.0, 8.4, 11.6):
        okno(G, M, hz, s, 1.0, z, z + 1.4, ram=0.13)
        okno(G, M, hz, 31.1 - 22.9, 1.0, z, z + 1.4, ram=0.13)
    okno(G, M, hz, 31.1 - 22.9, 0.9, 1.5, 2.8, ram=0.13, mriezka=True)


# --- južné krídlo (1911–1912) a zvyšok bloku ------------------------------------------------------------------------

def postav_juh(G, M):
    sk = (Z_JUH_HORE - Z_JUH) / 3.0
    RA = [rovina((25.0, 46.67), (25.0, 13.5), Z_JUH, sk), rovina((35.5, 13.5), (35.5, 46.0), Z_JUH, sk), plocha(Z_JUH_HORE)]
    budova(G, M['strecha_dvor'], JUH_A, RA, [M['arkady'], M['arkady'], None, M['arkady']])
    budova(G, M['strecha_dvor'], JUH_B, [plocha(20.5)], [M['arkady'], (M['arkady'], 16.6), M['arkady'], None])
    RC = [rovina(JUH_C[i], JUH_C[(i + 1) % 5], 21.5, 0.6) for i in range(4)] + [plocha(24.0)]
    budova(G, M['strecha_dvor'], JUH_C, RC, [M['arkady'], (M['arkady'], 17.5), (M['arkady'], 17.5), None, (M['arkady'], Z_JUH)])
    # fasáda do nádvoria: kamenné prízemie so zasklenými oblúkmi, 4 poschodia okien, mansarda s vikiermi
    h = hrana_uv((25.0, 46.67), (25.0, 13.5))
    s0, s1 = 46.67 - 37.1, 46.67 - 14.7
    doska(G, M['vapenec'], h, (s0 + s1) / 2, s1 - s0, Z_PATA, 4.6, 0.02)
    blok(G, M['lizeny'], h, (s0 + s1) / 2, s1 - s0, 0.16, 4.6, 4.85)
    for i in range(5):
        ss = s0 + (s1 - s0) * (i + 0.5) / 5
        oblukova_doska(G, M['kamen'], h, ss, 3.0, 0.0, 2.55, 0.04, seg=8)
        oblukova_doska(G, M['sklo'], h, ss, 2.5, 0.25, 2.55, 0.07, seg=8)
    rad_okien(G, M, h, s0, s1, 3.2, (5.6, 8.8, 12.0, 15.1), w=1.15, vys=1.6)
    blok(G, M['lizeny'], h, (s0 + s1) / 2, s1 - s0 + 0.4, 0.3, Z_JUH - 0.35, Z_JUH)
    for i in range(6):
        ss = s0 + (s1 - s0) * (i + 0.5) / 6
        vikier(G, M, h, ss, 0.5, Z_JUH + sk * 0.5, sk, 1.2, 1.5, M['arkady'], M['strecha_dvor'], strmost=0.9, okno_w=0.65)
    # zvyšok: okná do malého nádvoria a nad strechy domov na Hlavnom nám.
    rad_okien(G, M, hrana_uv((25.0, 13.5), (35.5, 13.5)), 1.0, 10.5, 2.6, (15.4, 18.6), w=1.0, vys=1.3)
    rad_okien(G, M, hrana_uv((35.5, 20.5), (35.5, 28.8)), 0.0, 8.3, 2.8, (2.0, 5.4, 8.8, 12.0, 15.1), w=1.0, vys=1.4)
    rad_okien(G, M, hrana_uv((35.5, 28.8), (52.4, 28.4)), 0.0, 6.0, 2.8, (2.0, 5.4, 8.8, 12.0, 15.1, 18.2), w=1.0, vys=1.4)
    rad_okien(G, M, hrana_uv((40.4, 20.3), (35.5, 20.5)), 0.0, 4.9, 2.4, (2.0, 5.4, 8.8, 12.0, 15.1, 18.2), w=1.0, vys=1.4)
    for p, z in (((30.0, 20.0), 24.6), ((30.5, 40.0), 24.6), ((44.0, 38.0), 25.6)):
        c = B(*p)
        G.kvader(M['tehla'], c, U, 0.8, 0.6, 20.0, z)
        G.kvader(M['ram'], c, U, 1.0, 0.8, z, z + 0.25)


def postav():
    """Vracia (Geo, výška modelu)."""
    G = Geo()
    M = {
        'okrova': material('omietka-veze-radnica', OKROVA, drsnost=0.85),
        'lizeny': material('stuk-radnica', LIZENY, drsnost=0.8),
        'veza_hore': material('omietka-hore-radnica', OMIETKA_HORE, drsnost=0.85),
        'sokel': material('sokel-radnica', SOKEL, drsnost=0.9),
        'kamen': material('piesokovec-radnica', KAMEN, drsnost=0.8),
        'vapenec': material('vapenec-radnica', VAPENEC, drsnost=0.8),
        'med': material('med-patina-radnica', MED, drsnost=0.5, kov=0.25),
        'cifernik': material('cifernik-radnica', CIFERNIK, drsnost=0.5),
        'cierna': material('cierna-radnica', CIERNA, drsnost=0.5, kov=0.3),
        'zlato': material('zlato-radnica', ZLATO, drsnost=0.35, kov=0.6),
        'biela': material('omietka-biela-radnica', BIELA, drsnost=0.85),
        'pawer': material('kamen-pawer-radnica', PAWER, drsnost=0.85),
        'ram': material('sambrany-radnica', RAM, drsnost=0.8),
        'drevo': material('drevo-radnica', DREVO, drsnost=0.7),
        'tehla': material('tehla-malba-radnica', TEHLA, drsnost=0.85),
        'strecha': material('skridla-radnica', STRECHA, drsnost=0.75),
        'strecha_dvor': material('skridla-dvor-radnica', STRECHA_DVOR, drsnost=0.75),
        'cervena': material('glazura-cervena-radnica', CERVENA, drsnost=0.35),
        'modra': material('glazura-modra-radnica', MODRA, drsnost=0.35),
        'glazura': material('glazura-biela-radnica', GLAZURA, drsnost=0.35),
        'zelena': material('glazura-zelena-radnica', ZELENA, drsnost=0.45),
        'hneda': material('glazura-hneda-radnica', HNEDA, drsnost=0.45),
        'okr': material('glazura-okrova-radnica', OKR, drsnost=0.45),
        'sever': material('omietka-sever-radnica', SEVER, drsnost=0.85),
        'arkady': material('omietka-dvor-radnica', ARKADY, drsnost=0.85),
        'tma': material('tien-otvorov-radnica', TMA, drsnost=0.9),
        'lodzia': material('lodzia-radnica', LODZIA, drsnost=0.9),
        'sklo': material('sklo-radnica', SKLO, drsnost=0.15, kov=0.4),
    }
    postav_vezu(G, M)
    postav_zapad(G, M)
    postav_sever_a_dvor(G, M)
    postav_vychod(G, M)
    postav_dvor_zapad(G, M)
    postav_juh(G, M)
    return G, Z_VRCH


# bod na dlažbe Hlavného námestia pred priečelím (lokálne x, z hry) – model sa kladie naň
_zb = B(20.0, -3.0)
ZAKLADNA_BOD = [round(_zb[0], 2), round(-_zb[1], 2)]
