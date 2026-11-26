# Reduta – Slovenská filharmónia (Marcell Komor a Dezső Jakab, 1913–1919), Nám. E. Suchoňa / Mostová / Medená.
# Presný model exteriéru podľa prieskumu v napady/pamiatky-podklady.md („Reduta“):
#  - pôdorys z OSM (way 56305202, zastrešené nádvorie way 779745499), výšky z laserového skenovania ÚGKK
#    (DMP/DMR, INSPIRE WMS): severné a západné krídlo s rímsou 16,2 m a mansardou do 22,9 m, pavilón za severným
#    štítom s hrotom 27,8 m, juhozápadný blok s rímsou 20,5 m, strmou strechou s plošinou 32,3 m, tamburom
#    s 12 oválnymi oknami a rebrovanou kupolou 37,4 m, blok koncertnej siene s rímsou 20,2 m a plochou strechou
#    25,9 m so svetlíkom, zastrešené nádvorie 13,5 m, čepcová kupola stredného pavilónu na Mostovej ~26,5 m,
#  - fasády podľa verejných fotografií (Wikimedia Commons, len na porovnanie): pásová bosáž prízemia s oblúkovými
#    otvormi, lizény cez dve poschodia, okná s nadokennými rímsami, oválne okná vo vlyse; severný rizalit
#    s portálom, edikulou s oválnym oknom, frontónom, atikou s pozláteným nápisom (v hre len zlaté pásiky, bez textu)
#    a urnami; južný luk s obrovským oblúkovým portálom, trojdielnym oknom a zakriveným štítom s erbom mesta,
#  - farby po obnove 2009–2011: svetlá krémová omietka (nie okrová), strechy z novej medi 2022–2023 (tmavohnedé).
# Lokálna sústava: u = dlhá os budovy (azimut 166,5°, od Nám. E. Suchoňa k Medenej), v = priečna (azimut 76,5°,
# od Mostovej do vnútra bloku), začiatok v ťažisku pôdorysu (= stred záznamu v pamiatkach).
# Nula výšky = chodník na Mostovej (≈ 138,25 m n. m.).
import math

from veze import Geo, dlzka, ccw, odsad
from spolocne import material
from historicke.strechy import strecha_podla_vzdialenosti, profil_valbovy, profil_mansardovy
from presne.snd import Hrana, doska, blok, oblukova_doska, ovalna_doska, fronton, segmentova_rimsa, okno

STENA, DETAIL, RUSTIKA, RYHA, SOKEL = '#dccbb0', '#e9e0cf', '#d3c2a4', '#a89a80', '#9e978a'
MED, MED_LEM, RAM, SKLO, DVERE = '#544640', '#6b5849', '#eceeea', '#3f4652', '#3a2a20'
ZELEZO, ZLATO, SKLO_STRECHY, OCEL, PLOCHA = '#1f2422', '#c8a44a', '#6f8a96', '#3b4146', '#b9b8b0'

AZ = math.radians(166.5)
U = (math.sin(AZ), math.cos(AZ))
V = (-U[1], U[0])


def B(u, v):
    return (U[0] * u + V[0] * v, U[1] * u + V[1] * v)


# bod na chodníku Mostovej pred stredným pavilónom (lokálne x, z hry) – model sa kladie naň
_zb = B(-14.0, -21.2)
ZAKLADNA_BOD = [round(_zb[0], 2), round(-_zb[1], 2)]

# výškové schémy blokov (m nad chodníkom)
SCH = {
    'Z': dict(prizemie=5.4, kordon=5.9, op=(1.7, 1.3, 3.9), o1=(1.55, 6.7, 9.6), o2=(1.4, 10.9, 13.0),
              vlys=14.3, rimsa0=15.2, rimsa=16.2, okulus=False, krok=3.75),
    'SW': dict(prizemie=7.2, kordon=7.7, op=(2.2, 1.1, 5.2), o1=(1.75, 8.4, 12.4), o2=(1.5, 14.0, 16.2),
               vlys=17.6, rimsa0=19.4, rimsa=20.5, okulus=True, krok=4.2),
    'SE': dict(prizemie=7.2, kordon=7.7, op=(2.0, 1.1, 5.0), o1=(1.7, 8.4, 12.3), o2=(1.5, 13.9, 16.0),
               vlys=17.4, rimsa0=19.1, rimsa=20.2, okulus=True, krok=4.2),
}


def oblúk(a, b, sagita, n):
    """Body oblúka z a do b (u, v) vypuklého o sagitu doprava od smeru a→b."""
    cx, cy = (a[0] + b[0]) / 2, (a[1] + b[1]) / 2
    L = dlzka(a, b)
    nx, ny = (b[1] - a[1]) / L, -(b[0] - a[0]) / L
    R = (L * L / 4 + sagita * sagita) / (2 * sagita)
    sx, sy = cx + nx * (sagita - R), cy + ny * (sagita - R)
    a0, a1 = math.atan2(a[1] - sy, a[0] - sx), math.atan2(b[1] - sy, b[0] - sx)
    if a1 > a0:
        a1 -= 2 * math.pi
    return [(sx + R * math.cos(a0 + (a1 - a0) * k / n), sy + R * math.sin(a0 + (a1 - a0) * k / n)) for k in range(n + 1)]


# --- pôdorys: úseky fasád v poradí OSM (v smere hodinových ručičiek), každý (meno, blok, body u, v) ----------------

def _na_priamke(a, b, v):
    t = (v - a[1]) / (b[1] - a[1])
    return (a[0] + (b[0] - a[0]) * t, v)


SEVER_A, SEVER_B, SEVER_C = (-45.0, -15.3), (-44.6, -4.3), (-43.6, 22.0)
RIZ_V0, RIZ_V1 = -10.5, -0.5          # severný rizalit so štítom
_riz0 = _na_priamke(SEVER_A, SEVER_B, RIZ_V0)
_riz1 = _na_priamke(SEVER_B, SEVER_C, RIZ_V1)
NADVORIE = [(-26.8, 18.5), (-27.5, 4.4), (-24.1, 2.5), (-20.8, 2.4), (-18.7, 6.7), (-16.3, 7.7), (-13.7, 8.1),
            (-11.8, 7.7), (-10.8, 6.6), (-8.9, 4.8), (-7.9, 4.5), (-8.0, 2.0), (-4.1, 2.0), (-2.3, 3.9), (-1.0, 3.6)]
LUK = [(38.9, 2.2), (40.1, 1.4), (40.7, 0.2), (41.3, -0.9), (41.75, -2.5), (42.1, -4.0), (42.2, -4.6),
       (42.2, -10.6), (42.1, -11.2), (41.7, -12.7), (40.7, -14.3), (40.8, -14.8)]
LUK_STRED = (-10.6, -4.6)             # rovná stredná časť luku (portál, okno, štít)

USEKY = [
    ('mostova-z-juh', 'Z', [(2.05, -16.4), (-8.5, -16.1)]),
    ('pavilon', 'Z', [(-8.5, -16.1), (-9.9, -17.1), (-10.2, -18.75), (-19.7, -18.75), (-19.9, -17.1), (-21.7, -15.5)]),
    ('mostova-z-sever', 'Z', [(-21.7, -15.5), (-32.0, -15.3)]),
    ('roh-sz', 'Z', [(-32.0, -15.3), (-32.7, -16.2), (-37.1, -17.2), (-40.4, -17.0), (-44.5, -16.0), SEVER_A]),
    ('sever-zapad', 'Z', [SEVER_A, _riz0]),
    ('rizalit', 'Z', [_riz0, SEVER_B, _riz1]),
    ('sever-vychod', 'Z', [_riz1, SEVER_C]),
    ('sv-koniec', 'Z', [SEVER_C, (-34.9, 23.0), (-34.8, 18.6), (-26.8, 18.5)]),
    ('nadvorie', 'Z', NADVORIE),
    ('se-nadvorie', 'SE', [(-1.0, 3.6), (-0.7, 18.9)]),
    ('se-stit', 'SE', [(-0.7, 18.9), (1.7, 19.2), (37.9, 22.6), (38.4, 22.4)]),
    ('juh-vychod', 'SE', [(38.4, 22.4), (38.2, 17.4), (38.8, 16.4), (39.6, 14.6), (39.8, 12.9), (39.8, 10.1), (39.2, 8.7),
                          (37.8, 6.5), (37.4, 2.6), (38.9, 2.2)]),
    ('luk', 'SW', LUK),
    ('roh-jz', 'SW', [(40.8, -14.8), (39.9, -16.6), (38.7, -17.3), (37.4, -17.7)]),
    ('mostova-jz', 'SW', [(37.4, -17.7), (31.3, -18.1), (2.05, -17.3), (2.05, -16.4)]),
]
# počet okenných osí bežných fasád (ostatné úseky majú vlastnú výzdobu)
OSI = {'mostova-z-juh': 3, 'mostova-z-sever': 3, 'roh-sz': 3, 'sever-zapad': 1, 'sever-vychod': 6, 'sv-koniec': 3,
       'nadvorie': 8, 'se-nadvorie': 4, 'juh-vychod': 5, 'roh-jz': 1, 'mostova-jz': 7}
ULICNE = {'mostova-z-juh', 'pavilon', 'mostova-z-sever', 'roh-sz', 'sever-zapad', 'rizalit', 'sever-vychod',
          'juh-vychod', 'luk', 'roh-jz', 'mostova-jz'}

# strechy: polygóny (u, v) a profily
STRECHA_Z = ([(2.05, -16.4), (-8.5, -16.1), (-9.9, -17.1), (-10.2, -18.75), (-19.7, -18.75), (-19.9, -17.1), (-21.7, -15.5),
              (-32.0, -15.3), (-32.7, -16.2), (-37.1, -17.2), (-40.4, -17.0), (-44.5, -16.0), SEVER_A, SEVER_B, SEVER_C,
              (-34.9, 23.0), (-34.8, 18.6)] + NADVORIE + [(-1.0, 1.5), (2.05, 1.5)])
STRECHA_SW_A = [(2.05, 1.5), (29.5, 1.86), (29.5, -17.95), (2.05, -17.3)]
STRECHA_SW_B = [(29.5, 1.86)] + LUK + [(39.9, -16.6), (38.7, -17.3), (37.4, -17.7), (31.3, -18.1), (29.5, -17.95)]
STRECHA_SE = [(-1.0, 1.5), (-1.0, 3.6), (-0.7, 18.9), (1.7, 19.2), (37.9, 22.6), (38.4, 22.4), (38.2, 17.4), (38.8, 16.4),
              (39.6, 14.6), (39.8, 12.9), (39.8, 10.1), (39.2, 8.7), (37.8, 6.5), (37.4, 2.6), (38.9, 2.2), (2.05, 1.5)]
Z_PLOSINA_SW = 32.3
KUPOLA_C, KUPOLA_R = (17.5, -7.6), 3.35   # tambur a kupola nad JZ blokom (stred z laseru)


def ccw_uv(body):
    A = sum(a[0] * b[1] - b[0] * a[1] for a, b in zip(body, body[1:] + body[:1]))
    return body if A > 0 else list(reversed(body))


def obrys_uv():
    """Celý obrys budovy (v smere hodinových ručičiek, ako OSM) a značka úseku pre každú hranu."""
    body, znacky = [], []
    for meno, _, b in USEKY:
        for i in range(len(b) - 1):
            body.append(b[i])
            znacky.append(meno)
    return body, znacky


# --- drobné prvky ------------------------------------------------------------------------------------------------

def retaz(body_b):
    """Hrany reťaze bodov (Blender, poradie proti smeru hodinových ručičiek) a dĺžky."""
    hrany = [Hrana(body_b[i], body_b[i + 1]) for i in range(len(body_b) - 1)]
    return hrany, sum(h.L for h in hrany)


def na_retazi(hrany, s):
    for h in hrany:
        if s <= h.L or h is hrany[-1]:
            return h, min(s, h.L)
        s -= h.L


def oblukove_okno(G, M, h, s, w, z0, z_pata, mat_ram=None, ram=0.15, kluc=True):
    oblukova_doska(G, M['detail'], h, s, w + 2 * ram, z0 - 0.08, z_pata, 0.02)
    oblukova_doska(G, M['sklo'], h, s, w, z0, z_pata, 0.035)
    r = mat_ram or M['ram']
    doska(G, r, h, s, 0.07, z0, z_pata + w / 2 - 0.05, 0.045)
    doska(G, r, h, s, w, z_pata - 0.035, z_pata + 0.035, 0.045)
    if kluc:
        blok(G, M['detail'], h, s, 0.32, 0.14, z_pata + w / 2 + ram - 0.15, z_pata + w / 2 + ram + 0.3)


def dvere_oblukove(G, M, h, s, w, z0, z_pata, mat=None, ram=0.22):
    oblukova_doska(G, M['detail'], h, s, w + 2 * ram, z0, z_pata, 0.025)
    oblukova_doska(G, mat or M['dvere'], h, s, w, z0, z_pata, 0.045)
    blok(G, M['detail'], h, s, 0.45, 0.18, z_pata + w / 2 + ram - 0.2, z_pata + w / 2 + ram + 0.4)


def ovalne_okno(G, M, h, s, zc, rw, rh, von=0.0):
    ovalna_doska(G, M['detail'], h, s, zc, rw + 0.16, rh + 0.16, von + 0.02, seg=14)
    ovalna_doska(G, M['sklo'], h, s, zc, rw, rh, von + 0.04, seg=14)


def urna(G, M, c, z, k=1.0, mat=None):
    """Urna / váza s vekom (výška ≈ 0,62·k)."""
    m = mat or M['detail']
    G.kvader(m, c, (1, 0), 0.4 * k, 0.4 * k, z, z + 0.1 * k)
    G.valec(m, c, 0.12 * k, z + 0.1 * k, z + 0.18 * k, seg=8, vrch=False)
    G.valec(m, c, 0.12 * k, z + 0.18 * k, z + 0.3 * k, seg=8, r1=0.22 * k, vrch=False)
    G.valec(m, c, 0.22 * k, z + 0.3 * k, z + 0.46 * k, seg=8, r1=0.12 * k, vrch=False)
    G.valec(m, c, 0.15 * k, z + 0.46 * k, z + 0.53 * k, seg=8, r1=0.06 * k)
    G.valec(m, c, 0.06 * k, z + 0.53 * k, z + 0.62 * k, seg=6, r1=0.0, vrch=False)


def rotacne(G, mat, c, profil, seg=16, natocenie=0.0, rebra=0, mat_rebra=None, hrubka_rebra=0.09):
    """Rotačné teleso z profilu [(r, z), …] zdola nahor; voliteľne zvislé rebrá (každý `rebra`-tý poludník)."""
    kruhy = [[(c[0] + r * math.cos(natocenie + 2 * math.pi * i / seg), c[1] + r * math.sin(natocenie + 2 * math.pi * i / seg), z)
              for i in range(seg)] for r, z in profil]
    for A, C in zip(kruhy, kruhy[1:]):
        for i in range(seg):
            k = (i + 1) % seg
            G.plocha(mat, [A[i], A[k], C[k], C[i]])
    if profil[-1][0] > 1e-3:
        G.plocha(mat, kruhy[-1])
    if rebra:
        for i in range(0, seg, rebra):
            for j in range(len(kruhy) - 1):
                p, q = kruhy[j][i], kruhy[j + 1][i]
                vx, vy = p[0] - c[0], p[1] - c[1]
                L = math.hypot(vx, vy) or 1.0
                o = hrubka_rebra * 0.4
                G.tram(mat_rebra or mat, (p[0] + vx / L * o, p[1] + vy / L * o, p[2]),
                       (q[0] + vx / L * o, q[1] + vy / L * o, q[2]), hrubka_rebra)


def hrot(G, M, c, z, vyska, gula=0.22):
    """Ozdobný hrot s guľou navrchu kupoly či vežičky."""
    G.valec(M['med'], c, 0.12, z, z + 0.25 * vyska, seg=8, r1=0.07)
    rotacne(G, M['med'], c, [(0.0, z + 0.25 * vyska), (gula * 0.7, z + 0.25 * vyska + gula * 0.3),
                             (gula, z + 0.25 * vyska + gula), (gula * 0.7, z + 0.25 * vyska + gula * 1.7),
                             (0.0, z + 0.25 * vyska + gula * 2)], seg=8)
    G.valec(M['med'], c, 0.05, z + 0.25 * vyska + gula * 2, z + vyska, seg=6, r1=0.0, vrch=False)


def striezka(G, mat, h, s, w, d, z0, z1):
    """Pultová strieška pri stene (nad arkierom, edikulou): zo šírky w a hĺbky d k stene do výšky z1."""
    a, b = h.bod(s - w / 2, d), h.bod(s + w / 2, d)
    c, e = h.bod(s + w / 2 - 0.3, 0.0), h.bod(s - w / 2 + 0.3, 0.0)
    G.plocha(mat, [(*a, z0), (*b, z0), (*c, z1), (*e, z1)])
    G.plocha(mat, [(*e, z0), (*c, z0), (*b, z0), (*a, z0)])
    G.plocha(mat, [(*a, z0), (*e, z1), (*e, z0)])
    G.plocha(mat, [(*b, z0), (*c, z0), (*c, z1)])


def zakriveny_stit(G, M, h, s, w, z0, vyska, d=0.45, hrubka=0.6):
    """Barokový štít s volútovým obrysom nad rímsou: predná plocha d pred stenou, hrúbka dozadu."""
    profil = [(-0.5, 0.0), (-0.5, 0.12), (-0.42, 0.2), (-0.38, 0.38), (-0.33, 0.56), (-0.24, 0.74), (-0.13, 0.9), (0.0, 1.0)]
    profil = profil + [(-x, z) for x, z in reversed(profil[:-1])]
    pred = [(*h.bod(s + x * w, d), z0 + zz * vyska) for x, zz in profil]
    zad = [(*h.bod(s + x * w, d - hrubka), z0 + zz * vyska) for x, zz in profil]
    otoc = _otocit(h, pred)
    G.plocha(M['detail'], pred[::-1] if otoc else pred)
    G.plocha(M['stena'], zad if otoc else zad[::-1])
    for i in range(len(profil) - 1):
        G.plocha(M['detail'], [pred[i + 1], zad[i + 1], zad[i], pred[i]] if otoc else [pred[i], zad[i], zad[i + 1], pred[i + 1]])
    # lem (rímsička) po obryse
    for i in range(len(profil) - 1):
        p, q = pred[i], pred[i + 1]
        n = h.n
        G.tram(M['detail'], (p[0] + n[0] * 0.08, p[1] + n[1] * 0.08, p[2] + 0.05),
               (q[0] + n[0] * 0.08, q[1] + n[1] * 0.08, q[2] + 0.05), 0.2)
    return profil


def _otocit(h, poly):
    """Má sa polygón otočiť, aby jeho normála smerovala von zo steny (h.n)?"""
    ax = ay = az = 0.0
    n = len(poly)
    for i in range(n):
        p, q = poly[i], poly[(i + 1) % n]
        ax += (p[1] - q[1]) * (p[2] + q[2])
        ay += (p[2] - q[2]) * (p[0] + q[0])
        az += (p[0] - q[0]) * (p[1] + q[1])
    return ax * h.n[0] + ay * h.n[1] < 0


def kartusa(G, M, h, s, zc, sirka, vyska, d, mat=None):
    """Štuková kartuša: ovál s rozvilinami po bokoch a hore."""
    ovalna_doska(G, mat or M['detail'], h, s, zc, sirka / 2, vyska / 2, d, seg=14)
    for x in (-1, 1):
        blok(G, M['detail'], h, s + x * sirka * 0.5, sirka * 0.25, 0.14, zc - vyska * 0.2, zc + vyska * 0.25, von0=d - 0.1)
    blok(G, M['detail'], h, s, sirka * 0.3, 0.14, zc + vyska * 0.45, zc + vyska * 0.62, von0=d - 0.1)


# --- fasády --------------------------------------------------------------------------------------------------------

def os_fasady(G, M, h, s, sch, *, ulicna=True, prizemie=True, kaviaren=False, okno1_oblukove=False):
    """Okná jednej osi: prízemie (oblúkové), 1. a 2. poschodie, otvor vo vlyse."""
    w, z0, zp = sch['op']
    if prizemie:
        oblukove_okno(G, M, h, s, w, z0, zp, mat_ram=M['dvere'] if kaviaren else None, kluc=ulicna)
    w1, a1, b1 = sch['o1']
    if okno1_oblukove:
        oblukove_okno(G, M, h, s, w1, a1, b1 - w1 / 2, kluc=False)
    else:
        okno(G, M, h, s, w1, a1, b1)
    w2, a2, b2 = sch['o2']
    okno(G, M, h, s, w2, a2, b2, parapet=False)
    if not ulicna:
        return
    # 1. poschodie: štukový parapetný reliéf a nadokenná rímsa s kartušou
    doska(G, M['detail'], h, s, w1 + 0.3, a1 - 0.75, a1 - 0.22, 0.04)
    blok(G, M['detail'], h, s, w1 + 0.55, 0.22, b1 + 0.16, b1 + 0.32)
    segmentova_rimsa(G, M['detail'], h, s, w1 + 0.55, b1 + 0.32, 0.3, 0.22)
    blok(G, M['detail'], h, s, 0.45, 0.12, b1 + 0.32, b1 + 0.75, von0=0.02)
    # 2. poschodie: rovná rímsička
    blok(G, M['detail'], h, s, w2 + 0.45, 0.18, b2 + 0.16, b2 + 0.3)
    # vlys: ležaté oválne okno (krídla) alebo okrúhle okno (bloky pri Medenej)
    if sch['okulus']:
        ovalne_okno(G, M, h, s, sch['vlys'], 0.42, 0.42)
    else:
        ovalne_okno(G, M, h, s, sch['vlys'], 0.5, 0.3)


def lizena(G, M, h, s, sch, sirka=0.7):
    blok(G, M['detail'], h, s, sirka, 0.12, sch['kordon'], sch['rimsa0'] - 0.35)
    blok(G, M['detail'], h, s, sirka + 0.2, 0.2, sch['rimsa0'] - 0.35, sch['rimsa0'])


def bosaz(G, M, h, z0, z1, krok=0.45):
    z = z0 + krok
    while z < z1 - 0.1:
        G.stena(M['ryha'], h.bod(0, 0.012), h.bod(h.L, 0.012), z - 0.035, z + 0.035)
        z += krok


def vikier(G, M, h, s, z_odkvap, ovalny=True):
    """Vikier v mansarde: predná stena kúsok za rímsou, oválne okno, oblúková strieška z medi."""
    z0, z1 = z_odkvap + 0.9, z_odkvap + 2.8
    blok(G, M['detail'], h, s, 1.4, 2.0, z0, z1, von0=-2.35)
    if ovalny:
        ovalne_okno(G, M, h, s, (z0 + z1) / 2, 0.38, 0.5, von=-0.35)
    else:
        okno(G, M, Hrana(h.bod(0, -0.33), h.bod(h.L, -0.33)), s, 0.8, z0 + 0.3, z1 - 0.35, ram=0.08, parapet=False)
    oblukova_strieska(G, M['med'], h, s, 1.7, z1, 0.45, -0.25, -2.45)


def oblukova_strieska(G, mat, h, s, w, z0, vys, von0, von1, n=6):
    """Segmentová (valená) strieška vikiera od líca von0 dozadu po von1."""
    body = [(s - w / 2 + w * k / n, z0 + vys * math.sin(math.pi * k / n)) for k in range(n + 1)]
    pred = [(*h.bod(x, von0), z) for x, z in body]
    zad = [(*h.bod(x, von1), z) for x, z in body]
    for i in range(n):
        G.plocha(mat, [pred[i], pred[i + 1], zad[i + 1], zad[i]] if _normala_hore(pred[i], pred[i + 1], zad[i]) else
                 [zad[i], zad[i + 1], pred[i + 1], pred[i]])
    G.plocha(mat, pred[::-1] if _otocit(h, pred) else pred)


def _normala_hore(a, b, c):
    """Smeruje normála trojuholníka a, b, c nahor?"""
    ux, uy, uz = b[0] - a[0], b[1] - a[1], b[2] - a[2]
    vx, vy, vz = c[0] - a[0], c[1] - a[1], c[2] - a[2]
    return ux * vy - uy * vx > 0


def volske_oko(G, M, h, s, z0):
    """Oválny vikier (volské oko) na strmej streche JZ bloku so zvonovou striežkou."""
    blok(G, M['detail'], h, s, 1.6, 2.2, z0, z0 + 1.9, von0=-2.6)
    ovalne_okno(G, M, h, s, z0 + 0.95, 0.42, 0.62, von=-0.4)
    c = h.bod(s, -1.3)
    rotacne(G, M['med'], c, [(1.1, z0 + 1.9), (0.95, z0 + 2.15), (0.6, z0 + 2.45), (0.15, z0 + 2.7), (0.0, z0 + 2.75)], seg=10)


def fasada_useku(G, M, meno, body_b, sch):
    hrany, L = retaz(body_b)
    ulicna = meno in ULICNE
    for h in hrany:
        if ulicna:
            bosaz(G, M, h, 0.9, sch['prizemie'])
    osi = OSI.get(meno, 0)
    if osi <= 0:
        return hrany, L
    roz = L / osi
    for k in range(osi):
        h, s = na_retazi(hrany, roz * (k + 0.5))
        s = min(max(s, 1.0), h.L - 1.0) if h.L > 2.0 else h.L / 2
        os_fasady(G, M, h, s, sch, ulicna=ulicna, kaviaren=(meno == 'mostova-jz'),
                  okno1_oblukove=(meno in ('roh-jz', 'roh-sz')))
    if ulicna:
        for k in range(osi + 1):
            h, s = na_retazi(hrany, min(max(roz * k, 0.45), L - 0.45))
            if 0.3 < s < h.L - 0.3:
                lizena(G, M, h, s, sch)
    return hrany, L


# --- jednotlivé časti --------------------------------------------------------------------------------------------

def postav_steny(G, M):
    cw, znacky = obrys_uv()
    blok_useku = {meno: b for meno, b, _ in USEKY}
    obrys = [B(*p) for p in reversed(cw)]                       # proti smeru hodinových ručičiek
    zn = list(reversed(znacky))
    zn = zn[1:] + zn[:1]                                         # hrana i: obrys[i] → obrys[i+1]
    n = len(obrys)
    for i in range(n):
        a, b = obrys[i], obrys[(i + 1) % n]
        sch = SCH[blok_useku[zn[i]]]
        G.stena(M['sokel'], a, b, -1.5, 0.9)
        if zn[i] in ULICNE:
            G.stena(M['rustika'], a, b, 0.9, sch['prizemie'])
            G.stena(M['stena'], a, b, sch['prizemie'], sch['rimsa'])
        else:
            G.stena(M['stena'], a, b, 0.9, sch['rimsa'])
    G.pas(M['sokel'], obrys, -1.5, 0.9, 0.08, spodok=False)
    # rímsy po blokoch
    for meno_bloku, sch in SCH.items():
        idx = [i for i in range(n) if blok_useku[zn[i]] == meno_bloku]
        ul = [i for i in idx if zn[i] in ULICNE]
        G.pas(M['detail'], obrys, sch['prizemie'], sch['kordon'], 0.2, spodok=True, rozsah=ul)
        r0, r1 = sch['rimsa0'], sch['rimsa']
        G.pas(M['detail'], obrys, r0, r0 + 0.25, 0.25, spodok=True, rozsah=idx)
        G.pas(M['detail'], obrys, r0 + 0.25, r1 - 0.35, 0.5, spodok=True, rozsah=idx)
        G.pas(M['detail'], obrys, r1 - 0.35, r1, 0.85, spodok=True, rozsah=idx)
        for i in ul:
            h = Hrana(obrys[i], obrys[(i + 1) % n])
            k = int(h.L / 0.85)
            for j in range(k):
                blok(G, M['detail'], h, (j + 0.5) * h.L / k, 0.16, 0.5, r0 + 0.25, r1 - 0.35, vrch=False, spodok=True)
    # štítová stena JZ bloku nad západným krídlom (16,2 → 20,5 m) a jej rímsa
    a, b = B(2.05, 1.5), B(2.05, -16.4)
    G.stena(M['stena'], a, b, SCH['Z']['rimsa'] - 0.3, SCH['SW']['rimsa'])
    h = Hrana(a, b)
    blok(G, M['detail'], h, h.L / 2, h.L, 0.5, SCH['SW']['rimsa'] - 0.35, SCH['SW']['rimsa'])
    return obrys


def postav_fasady(G, M):
    for meno, blk, body in USEKY:
        if meno in ('pavilon', 'rizalit', 'luk', 'se-stit'):
            continue
        b = [B(*p) for p in reversed(body)]
        hrany, L = fasada_useku(G, M, meno, b, SCH[blk])
        if meno == 'sever-vychod':
            postav_balkon_sever(G, M, hrany[0])
        if meno == 'mostova-jz':
            postav_balkon_mostova(G, M, hrany)
            hreben(G, M, hrany[1], SCH['SW']['rimsa'])
        if meno == 'roh-jz':
            for h in hrany:
                hreben(G, M, h, SCH['SW']['rimsa'])
        # vikiere v mansarde krídel
        if meno in ('mostova-z-juh', 'mostova-z-sever', 'sever-zapad', 'sever-vychod'):
            osi = OSI[meno]
            for k in range(osi):
                if meno == 'sever-vychod' and k in (2, 3):
                    continue
                if k % 2 == 0 or osi == 1:
                    h, s = na_retazi(hrany, L / osi * (k + 0.5))
                    vikier(G, M, h, s, SCH['Z']['rimsa'], ovalny=(k % 4 == 0))


def hreben(G, M, h, z0, krok=2.1):
    """Vlnitý štukový hrebeň (rokajová atika) nad rímsou JZ bloku."""
    k = max(1, int(h.L / krok))
    for j in range(k):
        s0, s1 = j * h.L / k, (j + 1) * h.L / k
        body = []
        for t in range(9):
            f = t / 8
            body.append((f, 0.35 + 0.5 * math.sin(math.pi * f) ** 1.5))
        pred = [(*h.bod(s0 + (s1 - s0) * f, 0.45), z0 + z) for f, z in body] + [(*h.bod(s1, 0.45), z0), (*h.bod(s0, 0.45), z0)]
        zad = [(*h.bod(s0 + (s1 - s0) * f, 0.25), z0 + z) for f, z in body] + [(*h.bod(s1, 0.25), z0), (*h.bod(s0, 0.25), z0)]
        G.plocha(M['detail'], pred[::-1] if _otocit(h, pred) else pred)
        G.plocha(M['detail'], zad if _otocit(h, pred) else zad[::-1])
        for i in range(len(body) - 1):
            p, q, r, t = pred[i], pred[i + 1], zad[i + 1], zad[i]
            G.plocha(M['detail'], [t, r, q, p] if not _otocit(h, pred) else [p, q, r, t])


def postav_balkon_sever(G, M, h):
    """Východná časť severnej fasády: balkón na konzolách nad druhým portálom a dvojosový arkier so strieškou."""
    s = h.L / 2
    w = 6.8
    dvere_oblukove(G, M, h, s, 2.0, 0.9, 3.6)
    for x in (-2.6, 0.0, 2.6):
        blok(G, M['detail'], h, s + x, 0.35, 0.95, 4.9, 5.9, vrch=False, spodok=True)
    blok(G, M['detail'], h, s, w, 1.15, 5.9, 6.25, spodok=True)
    G.pas(M['detail'], [h.bod(s - w / 2 + 0.1, 0.05), h.bod(s - w / 2 + 0.1, 1.0), h.bod(s + w / 2 - 0.1, 1.0),
                        h.bod(s + w / 2 - 0.1, 0.05)], 6.25, 7.25, 0.1, dnu=0.1, uzavreta=False)
    # arkier nad balkónom: dve okná, strieška z medi
    blok(G, M['stena'], h, s, 5.0, 0.55, 6.25, 10.3)
    hp = Hrana(h.bod(s - 2.5, 0.55), h.bod(s + 2.5, 0.55))
    for x in (-1.25, 1.25):
        okno(G, M, hp, 2.5 + x, 1.4, 6.6, 9.5, parapet=False)
    blok(G, M['detail'], h, s, 5.4, 0.8, 10.3, 10.55)
    striezka(G, M['med'], h, s, 5.6, 0.95, 10.55, 11.5)
    # žrde so zástavami (bez symbolov)
    for x in (-1.6, 1.6):
        p0 = (*h.bod(s + x, 0.9), 6.4)
        p1 = (*h.bod(s + x, 2.3), 8.2)
        G.tram(M['zelezo'], p0, p1, 0.06)


def postav_balkon_mostova(G, M, hrany):
    """Dlhý balkón na konzolách JZ bloku (1. poschodie, cez 5 osí)."""
    h = hrany[1]
    L = h.L
    s0, s1 = L * 0.12, L * 0.74
    blok(G, M['detail'], h, (s0 + s1) / 2, s1 - s0, 1.05, 7.7, 8.0, spodok=True)
    k = int((s1 - s0) / 1.4)
    for j in range(k + 1):
        blok(G, M['detail'], h, s0 + 0.2 + j * (s1 - s0 - 0.4) / k, 0.3, 0.95, 6.9, 7.7, vrch=False, spodok=True)
    linia = [h.bod(s0 + 0.1, 0.05), h.bod(s0 + 0.1, 0.92), h.bod(s1 - 0.1, 0.92), h.bod(s1 - 0.1, 0.05)]
    G.pas(M['detail'], linia, 8.0, 8.2, 0.12, dnu=0.12, uzavreta=False)
    G.pas(M['detail'], linia, 8.85, 9.0, 0.14, dnu=0.14, uzavreta=False)
    for i in range(3):
        hh = Hrana(linia[i], linia[i + 1])
        m = int(hh.L / 0.32)
        for j in range(m):
            G.kvader(M['detail'], hh.bod((j + 0.5) * hh.L / m), hh.t, 0.13, 0.13, 8.2, 8.85, vrch=False)


def postav_rizalit(G, M):
    """Severný rizalit: hlavný portál so schodmi, edikula s oválnym oknom, frontón, atika s nápisom a urny."""
    a, b = B(*_riz1), B(*_riz0)
    h0 = Hrana(a, b)
    s = h0.L / 2
    w = h0.L
    sch = SCH['Z']
    # plytký výstupok rizalitu
    blok(G, M['rustika'], h0, s, w, 0.35, 0.9, sch['prizemie'], vrch=False)
    blok(G, M['stena'], h0, s, w, 0.35, sch['prizemie'], sch['rimsa'] - 0.35, vrch=False)
    blok(G, M['sokel'], h0, s, w + 0.1, 0.43, -1.5, 0.9, vrch=True)
    h = Hrana(h0.bod(0, 0.35), h0.bod(w, 0.35))
    bosaz(G, M, h, 0.9, sch['prizemie'])
    G.pas(M['detail'], [h0.bod(0, 0.0), h0.bod(0, 0.35), h0.bod(w, 0.35), h0.bod(w, 0.0)], sch['prizemie'], sch['kordon'],
          0.22, uzavreta=False)
    G.pas(M['detail'], [h0.bod(0, 0.0), h0.bod(0, 0.35), h0.bod(w, 0.35), h0.bod(w, 0.0)], sch['rimsa'] - 0.35, sch['rimsa'],
          0.6, uzavreta=False)
    # portál a schody
    dvere_oblukove(G, M, h, s, 2.6, 0.9, 3.7, mat=M['zelezo'], ram=0.35)
    for j in range(4):
        blok(G, M['sokel'], h, s, 4.4 - j * 0.2, 1.6 - j * 0.4, 0.0, 0.9 * (j + 1) / 4)
    # lampy pri portáli
    for x in (-2.4, 2.4):
        G.kvader(M['zelezo'], h.bod(s + x, 0.35), h.t, 0.12, 0.6, 3.4, 3.5)
        G.kvader(M['svetlo'], h.bod(s + x, 0.6), h.t, 0.32, 0.32, 3.05, 3.55)
    # edikula nad portálom s oválnym oknom s lúčovou priečkou a medenou strieškou
    blok(G, M['detail'], h, s, 3.6, 0.9, 4.9, 9.3)
    he = Hrana(h.bod(s - 1.8, 0.9), h.bod(s + 1.8, 0.9))
    ovalne_okno(G, M, he, 1.8, 7.15, 1.05, 0.9)
    for uhol in range(0, 180, 30):
        r = math.radians(uhol)
        p = (*he.bod(1.8, 0.06), 7.15)
        q = (*he.bod(1.8 + 1.0 * math.cos(r), 0.06), 7.15 + 0.85 * math.sin(r))
        G.tram(M['ram'], p, q, 0.06)
    for x in (-1.55, 1.55):
        blok(G, M['detail'], h, s + x, 0.4, 1.05, 5.3, 8.9, von0=0.0)
    blok(G, M['detail'], h, s, 4.2, 1.2, 9.3, 9.6)
    striezka(G, M['med'], h, s, 4.4, 1.35, 9.6, 10.4)
    kartusa(G, M, he, 1.8, 9.9, 1.2, 0.9, 0.05)
    # 2. poschodie, ovál vo vlyse a lizény s girlandami
    okno(G, M, h, s, 1.8, 10.9, 13.0)
    blok(G, M['detail'], h, s, 2.4, 0.2, 13.16, 13.32)
    ovalne_okno(G, M, h, s, sch['vlys'], 0.55, 0.33)
    for x in (-3.4, 3.4):
        okno(G, M, h, s + x, 1.25, 6.9, 9.4)
        okno(G, M, h, s + x, 1.2, 10.9, 12.9, parapet=False)
    for x in (-4.65, -2.15, 2.15, 4.65):
        blok(G, M['detail'], h, s + x, 0.75, 0.16, sch['kordon'], sch['rimsa0'])
        blok(G, M['detail'], h, s + x, 0.5, 0.24, 11.6, 13.8, von0=0.1)      # girlanda / štukový pás
    # frontón s kartušou
    fronton(G, M['detail'], h, s, w + 0.4, sch['rimsa'], 2.9, 0.55)
    kartusa(G, M, h, s, sch['rimsa'] + 1.1, 2.2, 1.4, 0.6)
    # atika s pozláteným nápisom (len pásiky, bez textu), volúty po bokoch, kartuša a veľká urna
    blok(G, M['stena'], h, s, 5.2, 0.8, 18.0, 21.25, von0=-0.3)
    blok(G, M['detail'], h, s, 5.8, 1.05, 21.25, 21.55, von0=-0.4)
    for x in (-1, 1):
        for j, (dx, z0, z1) in enumerate(((2.75, 18.6, 20.9), (3.1, 18.6, 19.9), (3.4, 18.6, 19.2))):
            blok(G, M['detail'], h, s + x * dx, 0.38, 0.7, z0, z1, von0=-0.2)
    sx = s - 2.05
    for skupina in (9, 11):
        for _ in range(skupina):
            doska(G, M['zlato'], h, sx, 0.13, 20.3, 20.78, 0.52)
            sx += 0.185
        sx += 0.2
    kartusa(G, M, h, s, 19.3, 1.6, 0.8, 0.52)
    c = h.bod(s, 0.05)
    G.kvader(M['detail'], c, h.t, 1.1, 0.9, 21.55, 22.3)
    urna(G, M, c, 22.3, k=3.0)
    for x in (-3.7, 3.7):
        z = sch['rimsa'] + 2.9 * (1 - abs(x) / ((w + 0.4) / 2))
        cc = h.bod(s + x, 0.2)
        G.kvader(M['detail'], cc, h.t, 0.75, 0.75, z - 0.3, z + 0.35)
        urna(G, M, cc, z + 0.35, k=2.0)
    # vysoká valbová strecha pavilónu za štítom s hrotom
    pav = ccw([B(-44.6, -12.5), B(-32.4, -12.5), B(-32.4, -0.5), B(-44.4, -0.5)])
    strecha_podla_vzdialenosti(G, M['med'], pav, [], sch['rimsa'] + 0.04, profil_mansardovy(2.2, 1.0, 1.6, 10.2), krok=0.9)
    stred = B(-38.5, -6.5)
    hrot(G, M, stred, 26.4, 2.6, gula=0.28)


def postav_pavilon(G, M):
    """Stredný pavilón na Mostovej: bočný portál s puttami, oblý arkier, zakrivený štít, čepcová kupola."""
    body = [B(*p) for p in reversed(USEKY[1][2])]
    hrany, _ = retaz(body)
    sch = SCH['Z']
    for h in hrany:
        bosaz(G, M, h, 0.9, sch['prizemie'])
    for h in (hrany[0], hrany[4]):
        if h.L > 1.5:
            okno(G, M, h, h.L / 2, 0.9, 6.9, 9.4)
            okno(G, M, h, h.L / 2, 0.9, 10.9, 12.9, parapet=False)
    h = hrany[2]                                                  # čelo pavilónu (9,5 m)
    s = h.L / 2
    dvere_oblukove(G, M, h, s, 2.4, 0.9, 3.8, ram=0.3)
    for j in range(3):
        blok(G, M['sokel'], h, s, 3.6 - j * 0.2, 1.2 - j * 0.35, 0.0, 0.9 * (j + 1) / 3)
    for x in (-2.45, 2.45):                                       # putti na podstavcoch
        blok(G, M['detail'], h, s + x, 0.8, 0.7, 0.9, 2.3)
        c = h.bod(s + x, 0.4)
        G.valec(M['detail'], c, 0.22, 2.3, 3.1, seg=8, r1=0.16, vrch=False)
        rotacne(G, M['detail'], c, [(0.0, 3.1), (0.17, 3.18), (0.2, 3.35), (0.15, 3.5), (0.0, 3.56)], seg=8)
        G.kvader(M['zelezo'], h.bod(s + x, 0.3), h.t, 0.1, 0.5, 4.2, 4.3)
        G.kvader(M['svetlo'], h.bod(s + x, 0.55), h.t, 0.3, 0.3, 3.85, 4.3)
    for x in (-3.8, 3.8):
        okno(G, M, h, s + x, 1.0, 6.9, 9.4)
        okno(G, M, h, s + x, 1.0, 10.9, 12.9, parapet=False)
        lizena(G, M, h, s + x * 1.2, sch, sirka=0.5)
    # oblý arkier cez obe poschodia
    a0 = (h.bod(s - 2.6)[0], h.bod(s - 2.6)[1])
    obl = [h.bod(s - 2.6 + 5.2 * k / 6, 1.1 * math.sin(math.pi * k / 6)) for k in range(7)]
    for i in range(6):
        hh = Hrana(obl[i], obl[i + 1])
        G.stena(M['stena'], obl[i], obl[i + 1], 5.9, 13.6)
        if i in (1, 2, 3, 4):
            okno(G, M, hh, hh.L / 2, 0.62, 6.8, 9.5, ram=0.08, parapet=False)
            okno(G, M, hh, hh.L / 2, 0.62, 10.8, 12.9, ram=0.08, parapet=False)
    zaklad = [(p[0], p[1]) for p in obl]
    G.plocha(M['detail'], [(*p, 5.9) for p in zaklad])
    G.plocha(M['detail'], [(*p, 13.6) for p in reversed(zaklad)])
    for z0, z1, d in ((5.6, 5.9, 0.2), (9.7, 9.95, 0.12), (13.6, 13.85, 0.25)):
        G.pas(M['detail'], zaklad, z0, z1, d, dnu=0.0, uzavreta=False)
    blok(G, M['detail'], h, s, 3.2, 0.9, 4.6, 5.6, vrch=False, spodok=True)       # konzola pod arkierom
    ovalne_okno(G, M, h, s, sch['vlys'], 0.6, 0.6)
    del a0
    # zakrivený štít s mušľou nad rímsou
    zakriveny_stit(G, M, h, s, 6.2, sch['rimsa'], 3.3, d=0.55)
    kartusa(G, M, h, s, sch['rimsa'] + 1.4, 1.6, 1.2, 0.62)
    # čepcová kupola (osemuholník) – zvonový lem a vypuklý vrch
    c = B(-14.95, -13.6)
    profil = [(5.0, 16.3), (4.75, 17.0), (4.2, 18.0), (3.6, 19.0), (3.3, 19.8), (3.25, 20.3), (3.6, 20.5), (3.6, 20.75),
              (3.4, 21.6), (3.0, 22.8), (2.3, 24.0), (1.4, 25.0), (0.5, 25.7), (0.0, 25.9)]
    rotacne(G, M['med'], c, profil, seg=8, natocenie=math.atan2(U[1], U[0]) + math.pi / 8, rebra=1, mat_rebra=M['lem'])
    for k in range(8):                                            # oválne okienka v lemovom páse
        uh = math.atan2(U[1], U[0]) + math.pi / 4 * k
        p = (c[0] + 3.3 * math.cos(uh), c[1] + 3.3 * math.sin(uh))
        hh = Hrana((p[0] - 0.5 * math.sin(uh), p[1] + 0.5 * math.cos(uh)), (p[0] + 0.5 * math.sin(uh), p[1] - 0.5 * math.cos(uh)))
        if hh.n[0] * math.cos(uh) + hh.n[1] * math.sin(uh) < 0:
            hh = Hrana(hh.b, hh.a)
        ovalna_doska(G, M['sklo'], hh, 0.5, 21.9, 0.3, 0.42, 0.16, seg=10)
    hrot(G, M, c, 25.9, 2.2, gula=0.24)


def postav_luk(G, M):
    """Južný luk JZ bloku: obrovský portál kaviarne, trojdielne okno, ovál, štít s erbom mesta, urna a vázy."""
    body = [B(*p) for p in reversed(LUK)]
    hrany, _ = retaz(body)
    sch = SCH['SW']
    for h in hrany:
        bosaz(G, M, h, 0.9, sch['prizemie'])
    stred = next(h for h in hrany if h.L > 5.5)
    h, s = stred, stred.L / 2
    # obrovský polkruhový portál s kvádrovaným oblúkom a vejárovým zasklením
    oblukova_doska(G, M['detail'], h, s, 6.0, 0.9, 4.6, 0.03, seg=14)
    oblukova_doska(G, M['sklo'], h, s, 4.6, 0.9, 4.6, 0.05, seg=14)
    doska(G, M['dvere'], h, s, 4.6, 0.9, 3.9, 0.06)
    for uhol in range(15, 180, 30):
        r = math.radians(uhol)
        G.tram(M['dvere'], (*h.bod(s, 0.07), 4.6), (*h.bod(s + 2.25 * math.cos(r), 0.07), 4.6 + 2.25 * math.sin(r)), 0.07)
    for k in range(9):                                            # radiálne kvádre oblúka
        r = math.radians(10 + k * 20)
        p = (*h.bod(s + 2.65 * math.cos(r), 0.05), 4.6 + 2.65 * math.sin(r))
        G.kvader(M['detail'], (p[0], p[1]), h.t, 0.35, 0.25, p[2] - 0.2, p[2] + 0.35)
    # plecia luku: pri portáli menšie oblúkové dvere s okulusom, ďalej oblúkové okná; na poschodiach bez okien,
    # len štukové medailóny (vence) a pásy; za lukom (prechod ku koncertnej sieni) bežné okná
    i = hrany.index(stred)
    for k, hp in enumerate(hrany):
        if hp.L < 1.2 or hp is stred:
            continue
        vzd = abs(k - i)
        if vzd == 2:
            dvere_oblukove(G, M, hp, hp.L / 2, 1.1, 0.9, 2.9, ram=0.18)
            ovalne_okno(G, M, hp, hp.L / 2, 5.2, 0.42, 0.42)
        elif vzd == 3:
            oblukove_okno(G, M, hp, hp.L / 2, 1.1, 1.3, 4.6)
        if vzd in (2, 3):
            ovalna_doska(G, M['detail'], hp, hp.L / 2, 10.6, 0.55, 0.55, 0.06, seg=12)
            ovalna_doska(G, M['stena'], hp, hp.L / 2, 10.6, 0.38, 0.38, 0.08, seg=12)
            doska(G, M['detail'], hp, hp.L / 2, 0.9, 13.2, 13.45, 0.05)
            doska(G, M['detail'], hp, hp.L / 2, 0.5, 14.4, 16.6, 0.04)
        elif vzd > 3:
            oblukove_okno(G, M, hp, hp.L / 2, 1.0, 1.3, 4.6)
            okno(G, M, hp, hp.L / 2, 1.0, 8.6, 12.0)
            okno(G, M, hp, hp.L / 2, 1.0, 14.0, 16.0, parapet=False)
    # 1. poschodie: trojdielne oblúkové okno v rokokovom ráme
    doska(G, M['detail'], h, s, 5.4, 7.9, 13.6, 0.02)
    oblukove_okno(G, M, h, s, 2.0, 8.3, 11.6, kluc=False)
    for x in (-1.75, 1.75):
        oblukove_okno(G, M, h, s + x, 0.95, 8.3, 10.9, kluc=False)
    kartusa(G, M, h, s, 13.1, 1.6, 0.9, 0.1)
    for x in (-2.85, 2.85):
        blok(G, M['detail'], h, s + x, 0.5, 0.3, 8.0, 13.4)
    # 2. poschodie: ležaté oválne okno
    ovalne_okno(G, M, h, s, 15.1, 1.2, 0.72)
    kartusa(G, M, h, s, 16.6, 1.0, 0.6, 0.05)
    for x in (-3.4, 3.4):
        lizena(G, M, h, s + x, sch, sirka=0.6)
    # štít s erbom (mestská brána s tromi vežami), urna navrchu, vázy po bokoch
    z0 = sch['rimsa']
    zakriveny_stit(G, M, h, s, 8.6, z0, 4.2, d=0.5)
    ovalna_doska(G, M['detail'], h, s, z0 + 1.9, 1.35, 1.5, 0.6, seg=16)
    doska(G, M['stena'], h, s, 1.5, z0 + 1.05, z0 + 2.6, 0.64)
    for x, vys in ((-0.45, 0.9), (0.0, 1.15), (0.45, 0.9)):
        doska(G, M['detail'], h, s + x, 0.28, z0 + 1.35, z0 + 1.35 + vys, 0.68)
        doska(G, M['zlato'], h, s + x, 0.3, z0 + 1.35 + vys, z0 + 1.45 + vys, 0.69)
    doska(G, M['dvere'], h, s, 0.34, z0 + 1.35, z0 + 1.75, 0.7)
    for x in (-1.5, 1.5):
        blok(G, M['detail'], h, s + x, 0.6, 0.3, z0 + 0.8, z0 + 2.9, von0=0.45)
    c = h.bod(s, 0.0)
    G.kvader(M['detail'], c, h.t, 1.1, 0.9, z0 + 4.15, z0 + 4.6)
    urna(G, M, c, z0 + 4.6, k=2.3)
    for x in (-4.45, 4.45):
        cc = h.bod(s + x, 0.35)
        G.kvader(M['detail'], cc, h.t, 0.7, 0.7, z0, z0 + 0.45)
        urna(G, M, cc, z0 + 0.45, k=1.5)


def postav_strechy(G, M):
    z = SCH['Z']['rimsa'] + 0.02
    strecha_podla_vzdialenosti(G, M['med'], ccw([B(*p) for p in STRECHA_Z]), [], z,
                               profil_mansardovy(2.2, 1.8, 0.58, 6.9), krok=1.2)
    z = SCH['SW']['rimsa'] + 0.02
    h_sw = Z_PLOSINA_SW - z
    profil_sw = profil_mansardovy(4.8, 1.5, 1.7, h_sw)
    sw_a = ccw([B(*p) for p in STRECHA_SW_A])
    strecha_podla_vzdialenosti(G, M['med'], sw_a, [], z, profil_sw, krok=1.0)
    strecha_podla_vzdialenosti(G, M['med'], ccw([B(*p) for p in STRECHA_SW_B]), [], z,
                               profil_mansardovy(4.6, 1.4, 0.3, 4.8), krok=1.0)
    # nárožné rebrá (lemy) strmej strechy JZ bloku
    d_plosiny = 1.5 + (h_sw - 4.8) / 1.7
    plosina = odsad(sw_a, -d_plosiny)
    for p, q in zip(sw_a, plosina):
        G.tram(M['lem'], (p[0], p[1], z + 0.08), (q[0], q[1], Z_PLOSINA_SW + 0.08), 0.16)
    G.pas(M['lem'], plosina, Z_PLOSINA_SW, Z_PLOSINA_SW + 0.25, 0.12, dnu=0.0)
    # volské oká na strmej streche
    hm = Hrana(B(2.05, -17.3), B(29.5, -17.95))
    if hm.n[0] * V[0] + hm.n[1] * V[1] > 0:
        hm = Hrana(hm.b, hm.a)
    for f in (0.2, 0.42, 0.64, 0.86):
        volske_oko(G, M, hm, hm.L * f, SCH['SW']['rimsa'] + 1.3)
    hs = Hrana(B(2.05, 1.5), B(2.05, -17.3))
    for f in (0.3, 0.7):
        volske_oko(G, M, hs, hs.L * f, SCH['SW']['rimsa'] + 1.3)
    # koncertná sieň: valba z medi, plochá strecha a svetlík
    z = SCH['SE']['rimsa'] + 0.02
    se = ccw([B(*p) for p in STRECHA_SE])
    strecha_podla_vzdialenosti(G, M['med'], se, [], z, profil_valbovy(1.1, 5.7), krok=1.2)
    vnutro = ccw([B(4.4, 6.9), B(33.4, 6.9), B(33.4, 16.6), B(4.4, 14.0)])
    G.vodorovna(M['plocha'], vnutro, z + 5.72)
    svetlik = ccw([B(8.0, 8.0), B(28.0, 8.0), B(28.0, 15.0), B(8.0, 15.0)])
    G.hranol(M['ocel'], svetlik, z + 5.7, z + 6.1, vrch=False)
    G.vodorovna(M['sklo_strecha'], svetlik, z + 6.05)
    for k in range(1, 10):
        G.tram(M['ocel'], (*B(8.0 + 2.0 * k, 8.0), z + 6.1), (*B(8.0 + 2.0 * k, 15.0), z + 6.1), 0.08)
    G.tram(M['ocel'], (*B(8.0, 11.5), z + 6.1), (*B(28.0, 11.5), z + 6.1), 0.1)
    # komíny a výduchy na plochých častiach mansárd
    for u, v in ((-35.5, 8.0), (-35.5, 15.5), (-26.0, -6.5), (-8.0, -6.5)):
        G.kvader(M['sokel'], B(u, v), U, 0.7, 1.1, 21.0, 23.9)
        G.kvader(M['detail'], B(u, v), U, 0.9, 1.3, 23.9, 24.1)


def postav_kupolu(G, M):
    """Tambur s 12 elipsovými oknami a rebrovaná medená kupola nad JZ blokom, hrot s guľou."""
    c = B(*KUPOLA_C)
    r = KUPOLA_R
    z0, z1 = Z_PLOSINA_SW, Z_PLOSINA_SW + 2.3
    G.valec(M['med'], c, r + 0.35, z0, z0 + 0.35, seg=24)
    G.valec(M['med'], c, r, z0 + 0.35, z1, seg=24, vrch=False)
    for k in range(12):
        uh = 2 * math.pi * (k + 0.5) / 12
        p = (c[0] + r * math.cos(uh), c[1] + r * math.sin(uh))
        hh = Hrana((p[0] - 0.5 * math.sin(uh), p[1] + 0.5 * math.cos(uh)), (p[0] + 0.5 * math.sin(uh), p[1] - 0.5 * math.cos(uh)))
        if hh.n[0] * math.cos(uh) + hh.n[1] * math.sin(uh) < 0:
            hh = Hrana(hh.b, hh.a)
        ovalna_doska(G, M['lem'], hh, 0.5, (z0 + z1) / 2 + 0.15, 0.42, 0.72, 0.03, seg=12)
        ovalna_doska(G, M['sklo'], hh, 0.5, (z0 + z1) / 2 + 0.15, 0.3, 0.58, 0.06, seg=12)
    G.valec(M['lem'], c, r + 0.3, z1, z1 + 0.3, seg=24)
    profil = [(r + 0.1, z1 + 0.3)]
    for j in range(1, 9):
        th = math.pi / 2 * j / 8
        profil.append(((r + 0.1) * math.cos(th), z1 + 0.3 + 2.75 * math.sin(th)))
    profil[-1] = (0.0, profil[-1][1])
    rotacne(G, M['med'], c, profil, seg=24, rebra=2, mat_rebra=M['lem'], hrubka_rebra=0.12)
    hrot(G, M, c, z1 + 3.0, 2.0, gula=0.28)


def postav_vezicky(G, M):
    """Zvonové medené striežky: SZ nárožie, JV nárožie (koncertná sieň) a vežička schodiska na nádvorí."""
    # SZ nárožie: zakrivený štít s figúrkou a zvonová strieška za ním
    h = Hrana(B(-40.4, -17.0), B(-44.5, -16.0))
    if h.n[0] * V[0] + h.n[1] * V[1] > 0:
        h = Hrana(h.b, h.a)
    zakriveny_stit(G, M, h, h.L / 2, 4.2, SCH['Z']['rimsa'], 3.0, d=0.5)
    kartusa(G, M, h, h.L / 2, SCH['Z']['rimsa'] + 1.3, 1.2, 0.9, 0.58)
    c = h.bod(h.L / 2, 0.2)
    rotacne(G, M['med'], c, [(0.0, 19.2), (0.2, 19.3), (0.22, 19.7), (0.12, 20.1), (0.18, 20.5), (0.0, 20.8)], seg=8)
    c = B(-41.0, -13.0)
    rotacne(G, M['med'], c, [(2.1, 16.25), (1.9, 17.2), (1.4, 18.2), (1.1, 18.8), (1.2, 19.1), (0.9, 19.9), (0.3, 20.6), (0.0, 20.75)],
            seg=12, rebra=2, mat_rebra=M['lem'])
    hrot(G, M, c, 20.75, 1.3)
    # JV nárožie: osemboký tambur s okienkami a zvonová helmica s hrotom
    c = B(37.2, 12.3)
    G.valec(M['stena'], c, 2.1, SCH['SE']['rimsa'] - 0.3, 21.9, seg=8, vrch=False)
    for k in range(8):
        uh = 2 * math.pi * (k + 0.5) / 8
        p = (c[0] + 1.95 * math.cos(uh), c[1] + 1.95 * math.sin(uh))
        hh = Hrana((p[0] - 0.4 * math.sin(uh), p[1] + 0.4 * math.cos(uh)), (p[0] + 0.4 * math.sin(uh), p[1] - 0.4 * math.cos(uh)))
        if hh.n[0] * math.cos(uh) + hh.n[1] * math.sin(uh) < 0:
            hh = Hrana(hh.b, hh.a)
        ovalna_doska(G, M['sklo'], hh, 0.4, 21.0, 0.25, 0.4, 0.06, seg=10)
    rotacne(G, M['med'], c, [(2.35, 21.9), (2.3, 22.3), (1.9, 23.0), (1.35, 23.6), (1.0, 24.0), (1.05, 24.3), (0.75, 25.0),
                             (0.3, 25.6), (0.0, 25.75)], seg=8, rebra=1, mat_rebra=M['lem'])
    hrot(G, M, c, 25.75, 1.6)
    # vežička schodiska na strane nádvoria
    c = B(-15.0, 6.6)
    G.valec(M['stena'], c, 2.0, 13.4, 21.4, seg=8, vrch=False)
    G.valec(M['detail'], c, 2.2, 21.4, 21.7, seg=8)
    rotacne(G, M['med'], c, [(2.2, 21.7), (1.9, 22.6), (1.3, 23.6), (1.0, 24.1), (0.55, 24.8), (0.0, 25.2)], seg=8,
            rebra=1, mat_rebra=M['lem'])
    hrot(G, M, c, 25.2, 1.0)


def postav_nadvorie(G, M):
    """Sklená strecha nádvoria (2011) na oceľovej mriežke vo výške ≈ 13,5 m."""
    poly_uv = NADVORIE + [(-0.7, 18.9)]
    poly = ccw([B(*p) for p in poly_uv])
    z = 13.5
    G.vodorovna(M['sklo_strecha'], poly, z)
    G.vodorovna(M['ocel'], poly, z - 0.05, hore=False)
    G.pas(M['ocel'], poly, z - 0.25, z + 0.08, 0.0, dnu=0.3)
    # nosníky naprieč nádvorím (priamky u = konšt. orezané obrysom)
    u = -26.0
    while u < -1.5:
        priesecniky = []
        n = len(poly_uv)
        for i in range(n):
            a, b = poly_uv[i], poly_uv[(i + 1) % n]
            if (a[0] - u) * (b[0] - u) < 0:
                t = (u - a[0]) / (b[0] - a[0])
                priesecniky.append(a[1] + (b[1] - a[1]) * t)
        priesecniky.sort()
        for j in range(0, len(priesecniky) - 1, 2):
            G.tram(M['ocel'], (*B(u, priesecniky[j]), z + 0.05), (*B(u, priesecniky[j + 1]), z + 0.05), 0.12)
        u += 2.2
    return [B(*p) for p in poly_uv]


def postav():
    """Vracia (Geo, výška, obrys zastrešeného nádvoria v Blenderi)."""
    G = Geo()
    M = {
        'stena': material('omietka-reduta', STENA, drsnost=0.85),
        'detail': material('detail-reduta', DETAIL, drsnost=0.75),
        'rustika': material('rustika-reduta', RUSTIKA, drsnost=0.9),
        'ryha': material('ryha-reduta', RYHA, drsnost=0.95),
        'sokel': material('sokel-reduta', SOKEL, drsnost=0.9),
        'med': material('med-reduta', MED, drsnost=0.55, kov=0.25),
        'lem': material('lem-medi-reduta', MED_LEM, drsnost=0.5, kov=0.3),
        'zlato': material('zlato-reduta', ZLATO, drsnost=0.3, kov=0.8),
        'ram': material('ram-reduta', RAM, drsnost=0.6),
        'dvere': material('dvere-reduta', DVERE, drsnost=0.6),
        'sklo': material('sklo-reduta', SKLO, drsnost=0.1, kov=0.5),
        'sklo_strecha': material('sklo-strechy-reduta', SKLO_STRECHY, drsnost=0.08, kov=0.6),
        'ocel': material('ocel-reduta', OCEL, drsnost=0.5, kov=0.5),
        'zelezo': material('zelezo-reduta', ZELEZO, drsnost=0.5, kov=0.6),
        'svetlo': material('lucerna-reduta', '#f2e6c4', drsnost=0.3),
        'plocha': material('strecha-plocha-reduta', PLOCHA, drsnost=0.9),
    }
    postav_steny(G, M)
    postav_fasady(G, M)
    postav_rizalit(G, M)
    postav_pavilon(G, M)
    postav_luk(G, M)
    postav_strechy(G, M)
    postav_kupolu(G, M)
    postav_vezicky(G, M)
    nadvorie = postav_nadvorie(G, M)
    return G, 39.2, ccw(nadvorie)
