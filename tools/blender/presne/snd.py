# Historická budova Slovenského národného divadla (Fellner & Helmer, 1884–1886), Hviezdoslavovo námestie.
# Presný model exteriéru podľa prieskumu v napady/pamiatky-podklady.md („SND – historická budova“):
#  - pôdorys z OSM (way 34571529, prístavba z r. 1969–72 way 294997446), výšky z laserového skenovania ÚGKK
#    (DMP/DMR, INSPIRE WMS) – rímsa 15,4 m, balustráda 16,9 m, mansarda 21,7–22,6 m, kupola nad priečelím
#    s plošinou 23,0 m a mrežou, vetracia vežička nad hľadiskom 28,4 m, javisková veža s plošinou 28,4 m
#    a vetraním 29,7 m, zadný trakt 22,7–23,7 m, prístavba 16,8 / 19,6 m,
#  - fasády podľa verejných fotografií (Wikimedia Commons, len na porovnanie): rustikované prízemie s mezanínom,
#    veľký pilastrový rád cez dve poschodia, okná 1. poschodia so segmentovými suprafenestrami, 2. poschodia
#    s rovnou rímsičkou, hlavná rímsa a balustráda s vázami; priečelie 3 + 5 + 3 osí, stredný rizalit so
#    zaoblenými nárožiami: portikus so 4 podporami a terasou, lodžia so 6 stĺpmi veľkého rádu, 3 balkónové dvere
#    s frontónmi, 5 oválnych nik s bustami, atika s nápisovou doskou a súsošie múzy so 2 putti,
#  - strechy zo svetlosivého plechu (nie medená patina), omietka svetlá krémová, rustika pieskovo hnedá;
#    plech je o niečo tmavší a chladnejší ako na fotkách (#A9B0B6) – v teplom svetle hry by inak pôsobil béžovo.
# Lokálna sústava: u = dlhá os budovy (azimut 59,3°, dozadu ku Komenského nám.), v = priečna (k Gorkého),
# začiatok v ťažisku pôdorysu (= stred záznamu v pamiatkach). Nula výšky = chodník pri bokoch (138,9 m n. m.).
import math

from veze import Geo, dlzka, normala, odsad, ccw
from spolocne import material
from historicke.strechy import strecha_podla_vzdialenosti, profil_valbovy, profil_mansardovy

STENA, DETAIL, RUSTIKA, RYHA, SOKEL = '#e6dbbc', '#efebe2', '#c9b396', '#8e7e6a', '#a9a497'
PLECH, SOCHY, ZLATO, RAM, SKLO = '#86919c', '#655c50', '#b8963e', '#3e352c', '#3f4652'
TRAVERTIN, ZELEZO = '#d6cfbf', '#3a3a38'

# smer osi u a v v rovine Blendera (x = východ, y = sever)
AZ = math.radians(59.3)
U = (math.sin(AZ), math.cos(AZ))
V = (-U[1], U[0])

# výšky (m nad chodníkom)
Z_SOKEL, Z_KORDON, Z_KORDON2 = 0.6, 5.8, 6.15
Z_HLAVICA, Z_KLADIE, Z_VLYS, Z_RIMSA = 13.0, 13.5, 14.6, 15.4
Z_PODLAHA_STRECHY, Z_BALUSTRADA = 16.7, 16.9
Z_TERASA = 6.8
Z_ATIKA = 17.35


def B(u, v):
    return (U[0] * u + V[0] * v, U[1] * u + V[1] * v)


def oblúk(cu, cv, r, a0, a1, n):
    """Body oblúka v (u, v) – uhly v stupňoch od osi +u."""
    return [(cu + r * math.cos(math.radians(a0 + (a1 - a0) * k / n)), cv + r * math.sin(math.radians(a0 + (a1 - a0) * k / n)))
            for k in range(n + 1)]


# --- pôdorys ------------------------------------------------------------------------------------------------------

R_RIZALIT, C_RIZALIT = 3.1, (-24.85, 5.0)
U_LODZIA = -29.4            # líce stĺporadia a kladia lodžie (pred stenou rizalitu u = −27,95)
U_PORTIK = -33.5


def obrys_hlavny():
    """Hlavný kváder s rizalitmi (u, v) – pravá polovica od osi priečelia po os zadnej strany, potom zrkadlo."""
    pol = [(-27.95, 0.0)]
    pol += oblúk(C_RIZALIT[0], C_RIZALIT[1], R_RIZALIT, 180, 90, 8)
    pol += [(-24.85, 17.2), (-14.2, 17.2), (-14.2, 16.55), (3.8, 16.55), (3.8, 16.95), (8.4, 16.95), (8.4, 16.7),
            (18.75, 16.7), (18.75, 17.0), (23.2, 17.0), (23.2, 16.55), (27.8, 16.55), (27.8, 7.7), (28.85, 7.7), (28.85, 0.0)]
    cely = pol[1:-1] + [(u, -v) for u, v in reversed(pol[1:-1])]
    return cely


def je_rizalit(a, b):
    """Hrana zaobleného rizalitu priečelia (lodžia nad portikom)."""
    return max(a[0], b[0]) < -24.8 and abs(a[1]) <= 8.15 and abs(b[1]) <= 8.15


# --- pomocné prvky na fasáde (hrana a→b v Blenderi, t = smer hrany, n = normála von) -------------------------------

class Hrana:
    def __init__(self, a, b):
        self.a, self.b = a, b
        self.L = dlzka(a, b)
        self.t = ((b[0] - a[0]) / self.L, (b[1] - a[1]) / self.L)
        self.n = normala(a, b)

    def bod(self, s, von=0.0):
        return (self.a[0] + self.t[0] * s + self.n[0] * von, self.a[1] + self.t[1] * s + self.n[1] * von)


def doska(G, mat, h, s, w, z0, z1, von):
    """Plocha rovnobežná so stenou (sklo, výplň) – lícom von."""
    G.stena(mat, h.bod(s - w / 2, von), h.bod(s + w / 2, von), z0, z1)


def blok(G, mat, h, s, w, d, z0, z1, von0=0.0, vrch=True, spodok=False):
    """Kváder na stene: šírka w pozdĺž steny, d von zo steny."""
    G.kvader(mat, h.bod(s, von0 + d / 2), h.t, w, d, z0, z1, vrch=vrch, spodok=spodok)


def oblukova_doska(G, mat, h, s, w, z0, z_pata, von, seg=10):
    """Plocha s polkruhovým vrchom (dvere, arkády)."""
    r = w / 2
    body = [(*h.bod(s - r, von), z0), (*h.bod(s + r, von), z0)]
    for k in range(seg + 1):
        fi = math.pi * k / seg
        body.append((*h.bod(s + r * math.cos(fi), von), z_pata + r * math.sin(fi)))
    G.plocha(mat, body)


def ovalna_doska(G, mat, h, s, zc, rw, rh, von, seg=16):
    body = []
    for k in range(seg):
        fi = 2 * math.pi * k / seg
        body.append((*h.bod(s + rw * math.cos(fi), von), zc + rh * math.sin(fi)))
    G.plocha(mat, body)


def fronton(G, mat, h, s, w, z0, vys, d):
    """Trojuholníkový frontón vystupujúci o d zo steny."""
    bl_w, br_w, a_w = (*h.bod(s - w / 2), z0), (*h.bod(s + w / 2), z0), (*h.bod(s), z0 + vys)
    bl_f, br_f, a_f = (*h.bod(s - w / 2, d), z0), (*h.bod(s + w / 2, d), z0), (*h.bod(s, d), z0 + vys)
    G.plocha(mat, [bl_f, br_f, a_f])
    G.plocha(mat, [bl_w, bl_f, a_f, a_w])
    G.plocha(mat, [a_w, a_f, br_f, br_w])
    G.plocha(mat, [bl_w, br_w, br_f, bl_f])


def segmentova_rimsa(G, mat, h, s, w, z0, vys, d):
    """Segmentová (oblúková) suprafenestra nad oknom – oblúk z krátkych trámov."""
    r = (w * w / 4 + vys * vys) / (2 * vys)
    fi0 = math.asin(min(1.0, (w / 2) / r))
    zc = z0 + vys - r
    n = 6
    body = []
    for k in range(n + 1):
        fi = -fi0 + 2 * fi0 * k / n
        body.append((*h.bod(s + r * math.sin(fi), d / 2), zc + r * math.cos(fi)))
    for p, q in zip(body[:-1], body[1:]):
        G.tram(mat, p, q, d)


def okno(G, M, h, s, w, z0, z1, ram=0.14, parapet=True):
    doska(G, M['detail'], h, s, w + 2 * ram, z0 - ram, z1 + ram, 0.02)
    doska(G, M['sklo'], h, s, w, z0, z1, 0.035)
    # priečky okna
    doska(G, M['ram'], h, s, 0.07, z0, z1, 0.045)
    zp = z0 + (z1 - z0) * 0.68
    doska(G, M['ram'], h, s, w, zp - 0.035, zp + 0.035, 0.045)
    if parapet:
        blok(G, M['detail'], h, s, w + 0.5, 0.2, z0 - ram - 0.1, z0 - ram + 0.02)


def pilaster(G, M, h, s, z0=Z_KORDON2, z_hlavica=Z_HLAVICA, z1=Z_KLADIE):
    blok(G, M['detail'], h, s, 1.02, 0.32, z0, z0 + 0.9)
    blok(G, M['detail'], h, s, 0.8, 0.22, z0 + 0.9, z_hlavica)
    blok(G, M['detail'], h, s, 1.0, 0.34, z_hlavica, z_hlavica + 0.22)
    blok(G, M['detail'], h, s, 1.08, 0.38, z_hlavica + 0.22, z1)


def balustrada_linia(G, M, linia, z0, z1, von, uzavreta, rozsah=None, krok=0.33, stlpiky=None):
    """Balustráda: sokel, kuželky a madlo po línii (Blender), od steny posunutá o von."""
    G.pas(M['detail'], linia, z0, z0 + 0.22, von + 0.32, dnu=-(von - 0.3), uzavreta=uzavreta, rozsah=rozsah)
    G.pas(M['detail'], linia, z1 - 0.25, z1, von + 0.36, dnu=-(von - 0.34), uzavreta=uzavreta, rozsah=rozsah)
    n = len(linia)
    indexy = rozsah if rozsah is not None else range(n if uzavreta else n - 1)
    for i in indexy:
        h = Hrana(linia[i], linia[(i + 1) % n])
        k = int(h.L / krok)
        for j in range(k):
            s = (j + 0.5) * h.L / k
            G.kvader(M['detail'], h.bod(s, von), h.t, 0.15, 0.15, z0 + 0.22, z1 - 0.25, vrch=False)


def vaza(G, M, c, z):
    G.kvader(M['detail'], c, (1, 0), 0.42, 0.42, z, z + 0.12)
    G.valec(M['detail'], c, 0.14, z + 0.12, z + 0.2, seg=8, vrch=False)
    G.valec(M['detail'], c, 0.14, z + 0.2, z + 0.42, seg=8, r1=0.22, vrch=False)
    G.valec(M['detail'], c, 0.22, z + 0.42, z + 0.6, seg=8, r1=0.1)


# --- fasáda hrany ----------------------------------------------------------------------------------------------

def fasada_hrany(G, M, h, osi, *, rizalit_bocny=False, pilastre=True):
    """Okná po podlažiach (prízemie, mezanín, 1. a 2. poschodie) a pilastre medzi osami."""
    if osi <= 0:
        return
    roz = h.L / osi
    for k in range(osi):
        s = roz * (k + 0.5)
        if rizalit_bocny and k == osi // 2:
            # bočný vchod: polkruhový otvor s dverami
            oblukova_doska(G, M['detail'], h, s, 2.4, 0.0, 3.0, 0.025)
            oblukova_doska(G, M['dvere'], h, s, 2.0, 0.0, 3.0, 0.04)
            blok(G, M['detail'], h, s, 0.45, 0.18, 3.85, 4.35)   # kľúčový kameň
        else:
            okno(G, M, h, s, 1.3, 0.9, 2.6, ram=0.0, parapet=True)
            okno(G, M, h, s, 1.15, 3.75, 4.8, ram=0.0, parapet=False)
        # 1. poschodie: podparapetná výplň, okno so šambránou a segmentová suprafenestra na konzolách
        doska(G, M['detail'], h, s, 1.6, 6.3, 6.85, 0.05)
        okno(G, M, h, s, 1.45, 7.05, 9.3)
        blok(G, M['detail'], h, s - 0.95, 0.18, 0.25, 9.0, 9.6)
        blok(G, M['detail'], h, s + 0.95, 0.18, 0.25, 9.0, 9.6)
        blok(G, M['detail'], h, s, 2.05, 0.3, 9.55, 9.68)
        segmentova_rimsa(G, M['detail'], h, s, 2.05, 9.68, 0.62, 0.3)
        # 2. poschodie: okno s rovnou rímsičkou
        okno(G, M, h, s, 1.35, 11.3, 12.85)
        blok(G, M['detail'], h, s, 1.9, 0.24, 13.02, 13.2)
    if pilastre:
        body = [0.5] + [roz * k for k in range(1, osi)] + [h.L - 0.5]
        for s in body:
            pilaster(G, M, h, s)


def rustika(G, M, h, z0, z1, krok=0.52):
    z = z0 + krok
    while z < z1 - 0.1:
        G.stena(M['ryha'], h.bod(0, 0.012), h.bod(h.L, 0.012), z - 0.03, z + 0.03)
        z += krok


# --- časti budovy ----------------------------------------------------------------------------------------------

def postav_hlavny_kvader(G, M, obrys_b, uv):
    n = len(obrys_b)
    hrany = [Hrana(obrys_b[i], obrys_b[(i + 1) % n]) for i in range(n)]
    riz = [i for i in range(n) if je_rizalit(uv[i], uv[(i + 1) % n])]
    ostatne = [i for i in range(n) if i not in riz]
    for i, h in enumerate(hrany):
        G.stena(M['sokel'], h.a, h.b, -1.5, Z_SOKEL)
        if i in riz:
            G.stena(M['rustika'], h.a, h.b, Z_SOKEL, Z_TERASA)
            G.stena(M['stena'], h.a, h.b, Z_TERASA, Z_PODLAHA_STRECHY)
            rustika(G, M, h, Z_SOKEL, Z_TERASA - 0.3)
        else:
            G.stena(M['rustika'], h.a, h.b, Z_SOKEL, Z_KORDON)
            G.stena(M['stena'], h.a, h.b, Z_KORDON, Z_PODLAHA_STRECHY)
            rustika(G, M, h, Z_SOKEL, Z_KORDON)
    G.vodorovna(M['plech'], obrys_b, Z_PODLAHA_STRECHY)
    G.pas(M['sokel'], obrys_b, -1.5, Z_SOKEL, 0.08, vrch=True, spodok=False)
    # kordónová rímsa, kladie, hlavná rímsa a balustráda (okrem rizalitu – tam je lodžia s atikou)
    G.pas(M['detail'], obrys_b, Z_KORDON, Z_KORDON2, 0.22, spodok=True, rozsah=ostatne)
    G.pas(M['detail'], obrys_b, Z_KLADIE, Z_KLADIE + 0.3, 0.12, spodok=True, rozsah=ostatne)
    G.pas(M['detail'], obrys_b, Z_VLYS, Z_VLYS + 0.3, 0.32, spodok=True, rozsah=ostatne)
    G.pas(M['detail'], obrys_b, Z_VLYS + 0.3, Z_RIMSA - 0.18, 0.55, spodok=True, rozsah=ostatne)
    G.pas(M['detail'], obrys_b, Z_RIMSA - 0.18, Z_RIMSA, 0.85, spodok=True, rozsah=ostatne)
    balustrada_linia(G, M, obrys_b, Z_RIMSA, Z_BALUSTRADA, 0.2, True, rozsah=ostatne)
    # konzoly (modilióny) pod hlavnou rímsou
    for i in ostatne:
        h = hrany[i]
        k = int(h.L / 1.0)
        for j in range(k):
            blok(G, M['detail'], h, (j + 0.5) * h.L / k, 0.18, 0.5, Z_VLYS + 0.3, Z_RIMSA - 0.18, von0=0.0, vrch=False, spodok=True)
    # fasády (osi okien podľa dĺžky hrán)
    for i in ostatne:
        h, a, b = hrany[i], uv[i], uv[(i + 1) % n]
        if h.L < 3.0:
            continue
        bocny = abs(abs(a[1]) - abs(b[1])) < 0.05 and abs(a[1]) > 16 and (
            3.7 < min(a[0], b[0]) < 3.9 or 18.7 < min(a[0], b[0]) < 18.8)
        osi = max(1, round(h.L / 3.1))
        if abs(h.L - 9.1) < 0.2:
            osi = 3                      # nárožné krídla priečelia: 3 osi
        fasada_hrany(G, M, h, osi, rizalit_bocny=bocny)
        # podstavce balustrády nad pilastrami s vázami
        roz = h.L / osi
        for s in [0.5] + [roz * k for k in range(1, osi)] + [h.L - 0.5]:
            blok(G, M['detail'], h, s, 0.7, 0.62, Z_RIMSA, Z_BALUSTRADA + 0.08, von0=-0.11)
            vaza(G, M, h.bod(s, 0.2), Z_BALUSTRADA + 0.08)
    # nástenné lucerny na bokoch
    for i in ostatne:
        h, a, b = hrany[i], uv[i], uv[(i + 1) % n]
        if abs(a[1]) > 16 and abs(b[1]) > 16 and h.L > 9:
            for s in (h.L * 0.25, h.L * 0.75):
                c = h.bod(s, 0.45)
                G.tram(M['zelezo'], (*h.bod(s, 0.0), 3.35), (*c, 3.35), 0.06)
                G.kvader(M['zelezo'], c, h.t, 0.3, 0.3, 2.95, 3.5)
                G.kvader(M['svetlo'], c, h.t, 0.22, 0.32, 3.02, 3.42, vrch=False)
                G.valec(M['zelezo'], c, 0.22, 3.5, 3.72, seg=6, r1=0.03)
    return hrany, riz


def postav_rizalit(G, M, hrany, riz, uv):
    """Rizalit priečelia: arkáda za portikom, vchody v zaoblených nárožiach, lodžia so stĺpmi, atika, súsošie."""
    # stena rizalitu: hrany s normálou ~ −u (čelo) a zaoblené nárožia
    for i in riz:
        h = hrany[i]
        a = uv[i]
        b = uv[(i + 1) % len(uv)]
        if abs(a[0] - b[0]) < 0.01:          # čelo rizalitu (u = −27,95)
            for v in (-3.2, 0.0, 3.2):
                s = h.L / 2 + (v if h.t[0] * V[0] + h.t[1] * V[1] > 0 else -v)
                oblukova_doska(G, M['detail'], h, s, 2.6, 0.0, 3.4, 0.025)
                oblukova_doska(G, M['sklo'], h, s, 2.2, 0.3, 3.4, 0.04)
                doska(G, M['ram'], h, s, 0.08, 0.3, 4.5, 0.05)
                # lodžia: balkónové dvere s frontónom
                doska(G, M['detail'], h, s, 1.95, Z_TERASA, 10.45, 0.02)
                doska(G, M['sklo'], h, s, 1.55, Z_TERASA, 10.2, 0.035)
                doska(G, M['ram'], h, s, 0.08, Z_TERASA, 10.2, 0.045)
                blok(G, M['detail'], h, s, 2.4, 0.3, 10.45, 10.65)
                fronton(G, M['detail'], h, s, 2.5, 10.65, 0.85, 0.32)
                # oválna nika s bustou
                ovalna_doska(G, M['detail'], h, s, 12.45, 1.05, 0.78, 0.02)
                ovalna_doska(G, M['nika'], h, s, 12.45, 0.85, 0.6, 0.035)
                c = h.bod(s, 0.35)
                G.valec(M['busta'], c, 0.26, 11.85, 12.3, seg=8, r1=0.18)
                G.valec(M['busta'], c, 0.15, 12.3, 12.72, seg=8, r1=0.13)
                blok(G, M['detail'], h, s, 0.7, 0.5, 11.6, 11.85)
            # polpilastre za stĺpmi
            for v in (-5.0, -1.65, 1.65, 5.0):
                s = h.L / 2 + (v if h.t[0] * V[0] + h.t[1] * V[1] > 0 else -v)
                if 0.3 < s < h.L - 0.3:
                    blok(G, M['detail'], h, s, 0.75, 0.2, Z_TERASA, 14.5)
    # zaoblené nárožia: vchod v prízemí, nika s bustou a balkónové dvere v strede oblúka
    for znamienko in (1, -1):
        stred_obluka = (C_RIZALIT[0] + R_RIZALIT * math.cos(math.radians(135)), znamienko * (C_RIZALIT[1] + R_RIZALIT * math.sin(math.radians(135))))
        i = min(riz, key=lambda i: math.hypot((uv[i][0] + uv[(i + 1) % len(uv)][0]) / 2 - stred_obluka[0],
                                               (uv[i][1] + uv[(i + 1) % len(uv)][1]) / 2 - stred_obluka[1]))
        h = hrany[i]
        s = h.L / 2
        oblukova_doska(G, M['detail'], h, s, 1.9, 0.0, 2.9, 0.025)
        oblukova_doska(G, M['dvere'], h, s, 1.4, 0.0, 2.9, 0.04)
        doska(G, M['sklo'], h, s, 1.2, Z_TERASA, 9.9, 0.035)
        doska(G, M['detail'], h, s, 1.4, 9.9, 10.15, 0.05)
        ovalna_doska(G, M['detail'], h, s, 12.45, 0.6, 0.72, 0.02)
        ovalna_doska(G, M['nika'], h, s, 12.45, 0.42, 0.55, 0.035)
        c = h.bod(s, 0.3)
        G.valec(M['busta'], c, 0.2, 11.95, 12.35, seg=8, r1=0.14)
        G.valec(M['busta'], c, 0.12, 12.35, 12.7, seg=8, r1=0.1)

    # lodžia: podlaha (balkón v nárožiach), stĺpy veľkého rádu, kladie a atika na línii pred stenou
    def obluk_rizalitu(r, a0, a1, zn, n=10):
        return [(C_RIZALIT[0] + r * math.cos(math.radians(a0 + (a1 - a0) * k / n)),
                 zn * (C_RIZALIT[1] + r * math.sin(math.radians(a0 + (a1 - a0) * k / n)))) for k in range(n + 1)]

    # vonkajšia línia lodžie (pred stenou o 1,45 m): od (−24,85; +(5+r)) cez čelo po (−24,85; −(5+r)) –
    # pri tomto smere je vonkajšia strana vpravo (normála von pre pas, balustrádu)
    r_von = R_RIZALIT + (-27.95 - U_LODZIA)
    vonk_uv = obluk_rizalitu(r_von, 90, 180, 1) + obluk_rizalitu(r_von, 180, 90, -1)
    vnut_uv = obluk_rizalitu(R_RIZALIT, 90, 180, -1) + obluk_rizalitu(R_RIZALIT, 180, 90, 1)
    lodzia = ccw([B(*p) for p in vonk_uv + vnut_uv])
    linia = [B(*p) for p in vonk_uv]
    G.hranol(M['detail'], lodzia, 6.4, Z_TERASA, vrch=True, spodok=True)
    # balustráda balkónov v zaoblených nárožiach (mimo terasy portika)
    for zn in (1, -1):
        obl = obluk_rizalitu(r_von, 90, 175, zn, n=6)
        if zn < 0:
            obl = list(reversed(obl))
        balustrada_linia(G, M, [B(*p) for p in obl], Z_TERASA, 7.75, -0.3, False)
    # kladie a atika
    G.hranol(M['detail'], lodzia, 14.5, 15.4, vrch=False, spodok=True)
    G.pas(M['detail'], linia, 15.05, 15.4, 0.4, dnu=0.0, uzavreta=False, spodok=True)
    G.hranol(M['stena'], lodzia, 15.4, Z_ATIKA - 0.25, vrch=False)
    G.pas(M['detail'], linia, 15.4, 15.62, 0.12, dnu=0.0, uzavreta=False)
    G.pas(M['detail'], linia, Z_ATIKA - 0.25, Z_ATIKA, 0.22, dnu=0.0, uzavreta=False, spodok=True)
    G.hranol(M['detail'], lodzia, Z_ATIKA - 0.25, Z_ATIKA, vrch=True)
    # nápisová doska (len pozlátené pásy namiesto písmen) a rozety
    hc = Hrana(B(U_LODZIA, 5.0), B(U_LODZIA, -5.0))
    if normala(hc.a, hc.b)[0] * U[0] + normala(hc.a, hc.b)[1] * U[1] > 0:
        hc = Hrana(hc.b, hc.a)
    doska(G, M['detail'], hc, hc.L / 2, 7.4, 15.8, 16.95, 0.03)
    doska(G, M['stena'], hc, hc.L / 2, 7.0, 15.95, 16.8, 0.05)
    for k in range(15):
        s = hc.L / 2 - 3.2 + 6.4 * (k + 0.5) / 15
        doska(G, M['zlato'], hc, s, 0.28, 16.12, 16.62, 0.07)
    for s in (hc.L / 2 - 4.2, hc.L / 2 + 4.2):
        ovalna_doska(G, M['detail'], hc, s, 16.37, 0.34, 0.34, 0.06, seg=10)
        ovalna_doska(G, M['zlato'], hc, s, 16.37, 0.18, 0.18, 0.08, seg=8)

    # stĺpy lodžie: 4 v čele a po 1 v nárožiach (na oblúku pod 45°)
    stlpy = [(U_LODZIA + 0.45, v) for v in (-5.0, -1.65, 1.65, 5.0)]
    r_st = r_von - 0.45
    for zn in (1, -1):
        stlpy.append((C_RIZALIT[0] + r_st * math.cos(math.radians(135)), zn * (C_RIZALIT[1] + r_st * math.sin(math.radians(135)))))
    for u, v in stlpy:
        c = B(u, v)
        G.kvader(M['detail'], c, U, 1.2, 1.2, Z_TERASA, 7.4)
        G.valec(M['detail'], c, 0.6, 7.4, 7.62, seg=14, r1=0.55, vrch=False)
        G.valec(M['detail'], c, 0.47, 7.62, 13.55, seg=14, r1=0.41, vrch=False)
        G.valec(M['detail'], c, 0.43, 13.55, 14.28, seg=14, r1=0.66, vrch=False)
        G.kvader(M['detail'], c, U, 1.4, 1.4, 14.28, 14.5)
    # súsošie múzy s dvoma putti na atike a sochy géniov na nárožiach atiky
    c = B(U_LODZIA + 1.0, 0.0)
    G.kvader(M['detail'], c, U, 1.5, 3.4, Z_ATIKA, Z_ATIKA + 0.45)
    G.valec(M['socha'], c, 0.5, Z_ATIKA + 0.45, 19.4, seg=10, r1=0.3, vrch=False)
    G.valec(M['socha'], c, 0.3, 19.4, 19.62, seg=10, r1=0.17, vrch=False)
    G.valec(M['socha'], c, 0.17, 19.62, 19.98, seg=8, r1=0.13)
    rameno = B(U_LODZIA + 0.75, 0.42)
    G.tram(M['socha'], (*B(U_LODZIA + 1.0, 0.25), 19.35), (*rameno, 20.55), 0.14)
    G.valec(M['socha'], rameno, 0.22, 20.5, 20.7, seg=8, r1=0.18)            # veniec v zdvihnutej ruke
    G.tram(M['socha'], (*B(U_LODZIA + 1.0, -0.3), 19.3), (*B(U_LODZIA + 0.7, -0.75), 18.4), 0.13)
    for v in (-1.35, 1.35):
        p = B(U_LODZIA + 0.9, v)
        G.valec(M['socha'], p, 0.36, Z_ATIKA + 0.45, 18.55, seg=8, r1=0.22, vrch=False)
        G.valec(M['socha'], p, 0.17, 18.55, 18.9, seg=8, r1=0.13)
        G.kvader(M['socha'], B(U_LODZIA + 0.6, v * 1.18), U, 0.34, 0.12, 18.0, 18.38)   # maska
    for zn in (1, -1):
        p = B(C_RIZALIT[0] + (r_von - 0.6) * math.cos(math.radians(140)), zn * (C_RIZALIT[1] + (r_von - 0.6) * math.sin(math.radians(140))))
        G.kvader(M['detail'], p, U, 0.9, 0.9, Z_ATIKA, Z_ATIKA + 0.35)
        G.valec(M['socha'], p, 0.32, Z_ATIKA + 0.35, 19.3, seg=8, r1=0.2, vrch=False)
        G.valec(M['socha'], p, 0.15, 19.3, 19.62, seg=8, r1=0.12)
        G.tram(M['socha'], (*p, 19.0), (*B(C_RIZALIT[0] - 3.6, zn * 8.4), 19.9), 0.1)   # krídlo / pochodeň


def postav_portikus(G, M):
    """Vstupný portikus: 2 nárožné piliere a 2 stĺpy v čele, stĺpy po bokoch, terasa s balustrádou."""
    obrys = ccw([B(U_PORTIK, -4.95), B(-27.95, -4.95), B(-27.95, 4.95), B(U_PORTIK, 4.95)])
    G.hranol(M['sokel'], ccw([B(U_PORTIK - 0.9, -5.3), B(-27.95, -5.3), B(-27.95, 5.3), B(U_PORTIK - 0.9, 5.3)]), -1.5, 0.15)
    G.hranol(M['sokel'], ccw([B(U_PORTIK - 0.1, -5.05), B(-27.95, -5.05), B(-27.95, 5.05), B(U_PORTIK - 0.1, 5.05)]), 0.15, 0.32)
    # strop a terasa
    G.hranol(M['detail'], obrys, 5.85, 6.55, vrch=False, spodok=True)
    G.hranol(M['detail'], ccw([B(U_PORTIK - 0.25, -5.2), B(-27.95, -5.2), B(-27.95, 5.2), B(U_PORTIK - 0.25, 5.2)]), 6.55, Z_TERASA, spodok=True,
             mat_vrch=M['dlazba'])
    # piliere s polstĺpmi v čele, stĺpy v čele a po bokoch
    for v in (-4.45, 4.45):
        c = B(U_PORTIK + 0.45, v)
        G.kvader(M['rustika'], c, V, 1.0, 1.0, 0.32, 5.85)
        G.kvader(M['detail'], c, V, 1.15, 1.15, 5.5, 5.85)
        G.valec(M['detail'], B(U_PORTIK - 0.08, v), 0.3, 0.32, 5.5, seg=10, vrch=False)
        for u in (-30.7, -28.6):
            c2 = B(u, v)
            if u > -29:
                G.kvader(M['rustika'], c2, V, 0.9, 0.9, 0.32, 5.85)
            else:
                stlp_toskansky(G, M, c2)
    for v in (-1.5, 1.5):
        stlp_toskansky(G, M, B(U_PORTIK + 0.45, v))
    # balustráda terasy (čelo a boky)
    linia = [B(-29.0, -5.05), B(U_PORTIK - 0.1, -5.05), B(U_PORTIK - 0.1, 5.05), B(-29.0, 5.05)]
    # smer línie: normála von má mieriť od portika (vpravo od smeru pri obchádzaní CCW)
    if normala(linia[1], linia[2])[0] * U[0] + normala(linia[1], linia[2])[1] * U[1] > 0:
        linia = list(reversed(linia))
    balustrada_linia(G, M, linia, Z_TERASA, 7.7, -0.3, False)
    for p in linia[1:3]:
        G.kvader(M['detail'], p, U, 0.62, 0.62, Z_TERASA, 7.82)
        vaza(G, M, p, 7.82)
    for v in (-1.5, 1.5):
        p = B(U_PORTIK + 0.2, v)
        G.kvader(M['detail'], p, U, 0.55, 0.55, Z_TERASA, 7.82)
    # kladie portika (vlys a rímsa po obvode)
    hr = [Hrana(linia[k], linia[k + 1]) for k in range(3)]
    for h in hr:
        G.stena(M['detail'], h.bod(0, 0.15), h.bod(h.L, 0.15), 5.85, 6.55)
    G.pas(M['detail'], linia, 6.3, 6.55, 0.38, dnu=0.0, uzavreta=False, spodok=True)
    # schod pred portikom
    G.hranol(M['sokel'], ccw([B(U_PORTIK - 1.4, -5.5), B(U_PORTIK - 0.9, -5.5), B(U_PORTIK - 0.9, 5.5), B(U_PORTIK - 1.4, 5.5)]), -1.5, 0.0)


def stlp_toskansky(G, M, c):
    G.kvader(M['detail'], c, U, 0.95, 0.95, 0.32, 0.55)
    G.valec(M['detail'], c, 0.46, 0.55, 0.75, seg=12, r1=0.4, vrch=False)
    G.valec(M['detail'], c, 0.37, 0.75, 5.25, seg=12, r1=0.32, vrch=False)
    G.valec(M['detail'], c, 0.34, 5.25, 5.55, seg=12, r1=0.48, vrch=False)
    G.kvader(M['detail'], c, U, 1.0, 1.0, 5.55, 5.85)


def zaobleny_obdlznik(cu, hu, hv, r, k=5):
    """Body zaobleného obdĺžnika v (u, v) – CCW, rovnaký počet bodov pre ľubovoľné rozmery."""
    rohy = [(cu + hu - r, hv - r, 0), (cu - hu + r, hv - r, 90), (cu - hu + r, -hv + r, 180), (cu + hu - r, -hv + r, 270)]
    body = []
    for uu, vv, a0 in rohy:
        for j in range(k + 1):
            a = math.radians(a0 + 90 * j / k)
            body.append((uu + r * math.cos(a), vv + r * math.sin(a)))
    return body


def postav_kupolu(G, M):
    """Nízka kupola nad priečelím na zaoblenom obdĺžniku: pätka 17,35 m, plošina 23,0 m, mreža a 2 vikiere."""
    z0, z1 = Z_ATIKA - 0.05, 23.0
    zaklad = zaobleny_obdlznik(-22.95, 4.85, 8.0, 3.0)
    vrch = zaobleny_obdlznik(-22.4, 2.6, 4.5, 1.2)
    kruhy = []
    N = 9
    for j in range(N + 1):
        th = math.pi / 2 * j / N
        f = 1 - math.cos(th)
        z = z0 + (z1 - z0) * math.sin(th)
        kruhy.append([(*B(a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f), z) for a, b in zip(zaklad, vrch)])
    n = len(zaklad)
    for j in range(N):
        A, C = kruhy[j], kruhy[j + 1]
        for i in range(n):
            k = (i + 1) % n
            G.plocha(M['plech'], [A[i], A[k], C[k], C[i]])
    G.plocha(M['plech'], kruhy[-1])
    # zvislé lemy plechu
    for i in range(0, n, 2):
        for j in range(N):
            p, q = kruhy[j][i], kruhy[j + 1][i]
            G.tram(M['lem'], (p[0], p[1], p[2] + 0.04), (q[0], q[1], q[2] + 0.04), 0.09)
    # okraj plošiny a kovaná mreža
    hore = [(p[0], p[1]) for p in kruhy[-1]]
    G.pas(M['plech'], hore, z1, z1 + 0.22, 0.12, dnu=0.1)
    for i in range(n):
        a, b = hore[i], hore[(i + 1) % n]
        L = dlzka(a, b)
        m = max(1, int(L / 0.9))
        for j in range(m):
            t = j / m
            p = (a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t)
            G.kvader(M['zelezo'], p, (1, 0), 0.06, 0.06, z1 + 0.22, z1 + 1.15, vrch=False)
    G.pas(M['zelezo'], hore, z1 + 1.1, z1 + 1.18, 0.04, dnu=0.04)
    G.pas(M['zelezo'], hore, z1 + 0.62, z1 + 0.67, 0.03, dnu=0.03)
    for v in (-2.6, 2.6):
        p = B(-24.7, v)
        G.valec(M['zelezo'], p, 0.07, z1 + 0.2, z1 + 2.0, seg=6)
        G.valec(M['zlato'], p, 0.14, z1 + 2.0, z1 + 2.2, seg=8, r1=0.05)
    # 2 oválne vikiere (volské oká) v kamenných kartušiach na čele kupoly
    for v in (-2.7, 2.7):
        c = B(-26.6, v)
        G.kvader(M['detail'], c, V, 1.9, 1.6, 17.6, 20.1)
        G.valec(M['plech'], c, 0.95, 20.1, 20.75, seg=10, r1=0.15)
        h = Hrana(B(-27.4, v + 0.95), B(-27.4, v - 0.95))
        if h.n[0] * U[0] + h.n[1] * U[1] > 0:
            h = Hrana(h.b, h.a)
        ovalna_doska(G, M['detail'], h, h.L / 2, 18.85, 0.62, 0.8, 0.02, seg=14)
        ovalna_doska(G, M['sklo'], h, h.L / 2, 18.85, 0.42, 0.6, 0.04, seg=14)


def postav_strechy(G, M):
    """Mansarda stredného traktu, vetracia vežička, javisková veža, zadný trakt, komíny."""
    mans = ccw([B(-18.3, -12.0), B(6.6, -12.0), B(6.6, 12.0), B(-18.3, 12.0)])
    strecha_podla_vzdialenosti(G, M['plech'], mans, [], Z_PODLAHA_STRECHY, profil_mansardovy(4.95, 1.5, 0.09, 5.95), krok=1.2)
    # vikiere na strmej časti mansardy (bočné)
    for zn in (1, -1):
        for u in (-12.0, -6.0, 0.0):
            c = B(u, zn * 11.6)
            G.kvader(M['stena'], c, U, 1.3, 1.2, 17.6, 19.6)
            G.kvader(M['plech'], c, U, 1.5, 1.4, 19.6, 19.85)
            h = Hrana(B(u - 0.55, zn * 12.2), B(u + 0.55, zn * 12.2))
            if h.n[0] * V[0] * zn + h.n[1] * V[1] * zn < 0:
                h = Hrana(h.b, h.a)
            doska(G, M['sklo'], h, h.L / 2, 0.8, 17.9, 19.3, 0.02)
    # vetracia vežička (lucerna) nad hľadiskom
    luc = ccw([B(-5.6, -1.6), B(-0.6, -1.6), B(-0.6, 1.6), B(-5.6, 1.6)])
    G.hranol(M['stena'], luc, 21.8, 25.8, vrch=False)
    G.zaluzie(M['ram'], luc, 22.8, 25.4, rozostup=0.35, hlbka=0.1, von=0.05)
    G.pas(M['detail'], luc, 25.8, 26.05, 0.22, spodok=True)
    strecha_podla_vzdialenosti(G, M['plech'], luc, [], 26.05, profil_valbovy(0.9, 1.35), krok=0.6)
    G.valec(M['zelezo'], B(-3.1, 0.0), 0.06, 27.3, 28.4, seg=6)
    G.valec(M['zlato'], B(-3.1, 0.0), 0.14, 27.9, 28.15, seg=8, r1=0.14)
    # javisková veža: steny nad strechou, rímsa, valbová mansarda s plošinou, vetranie na vrchole
    veza = ccw([B(6.5, -10.5), B(20.0, -10.5), B(20.0, 10.5), B(6.5, 10.5)])
    G.hranol(M['stena'], veza, Z_PODLAHA_STRECHY, 24.4, vrch=False)
    for i in range(4):
        h = Hrana(veza[i], veza[(i + 1) % 4])
        k = max(1, round(h.L / 4.2))
        for j in range(k):
            s = h.L * (j + 0.5) / k
            okno(G, M, h, s, 1.1, 19.4, 21.6, ram=0.12)
        for j in range(k + 1):
            blok(G, M['detail'], h, min(max(0.4, h.L * j / k), h.L - 0.4), 0.7, 0.16, Z_PODLAHA_STRECHY, 23.9)
    G.pas(M['detail'], veza, 23.9, 24.4, 0.45, spodok=True)
    strecha_podla_vzdialenosti(G, M['plech'], veza, [], 24.4, profil_valbovy(1.08, 4.0), krok=1.0)
    vet = ccw([B(12.3, -4.0), B(13.8, -4.0), B(13.8, 4.0), B(12.3, 4.0)])
    G.hranol(M['plech'], vet, 28.3, 29.4, vrch=False)
    G.zaluzie(M['ram'], vet, 28.4, 29.3, rozostup=0.3, hlbka=0.08, von=0.04)
    strecha_podla_vzdialenosti(G, M['plech'], vet, [], 29.4, profil_valbovy(0.5, 0.3), krok=0.5)
    # zadný trakt za javiskom: plochá strecha 22,7 m s vyšším stredom 23,7 m
    zad = ccw([B(20.0, -10.5), B(28.85, -10.5), B(28.85, 10.5), B(20.0, 10.5)])
    G.hranol(M['stena'], zad, Z_PODLAHA_STRECHY, 22.5, vrch=False)
    for i in range(4):
        h = Hrana(zad[i], zad[(i + 1) % 4])
        if h.L > 15:
            continue
        k = max(1, round(h.L / 3.2))
        for j in range(k):
            okno(G, M, h, h.L * (j + 0.5) / k, 1.1, 18.4, 20.8, ram=0.12)
    G.pas(M['detail'], zad, 22.2, 22.75, 0.3, spodok=True)
    G.vodorovna(M['plech'], zad, 22.7)
    G.hranol(M['plech'], ccw([B(20.6, -7.5), B(25.0, -7.5), B(25.0, 7.5), B(20.6, 7.5)]), 22.7, 23.7)
    # komíny / výlezy na rizalitoch (laser ≈ 18,6–19,4 m)
    for u, v in ((24.5, 13.5), (19.5, -12.6), (24.0, -12.6), (-8.0, 13.8), (-8.0, -13.8), (12.0, 13.8), (12.0, -13.8)):
        c = B(u, v)
        G.kvader(M['stena'], c, U, 1.0, 1.4, Z_PODLAHA_STRECHY, 18.6)
        G.kvader(M['detail'], c, U, 1.2, 1.6, 18.6, 18.8)


def postav_pristavbu(G, M):
    """Prístavba z rokov 1969–72 (Komenského nám.): travertínový obklad, pásové okná, stred 19,6 m, boky 16,8 m."""
    stred = ccw([B(27.8, -10.5), B(44.0, -10.5), B(44.0, -4.0), B(45.1, -4.0), B(45.1, 4.0), B(44.0, 4.0),
                 B(44.0, 10.5), B(27.8, 10.5)])
    boky = [ccw([B(31.2, 10.5), B(44.0, 10.5), B(44.0, 16.6), B(31.2, 16.6)]),
            ccw([B(31.2, -16.6), B(44.0, -16.6), B(44.0, -10.5), B(31.2, -10.5)])]
    for o, H in [(stred, 19.6)] + [(b, 16.8) for b in boky]:
        G.hranol(M['travertin'], o, -1.5, H, vrch=True, mat_vrch=M['strecha_plocha'])
        G.pas(M['travertin'], o, H - 0.05, H + 0.5, 0.05, dnu=0.3)
        n = len(o)
        for i in range(n):
            h = Hrana(o[i], o[(i + 1) % n])
            if h.L < 2.0:
                continue
            for z0, z1 in ((1.0, 3.6), (5.2, 7.2), (9.0, 11.0), (12.8, 14.8)) + (((16.9, 18.7),) if H > 19 else ()):
                doska(G, M['sklo2'], h, h.L / 2, h.L - 0.8, z0, z1, 0.03)
                m = max(1, int((h.L - 0.8) / 1.5))
                for j in range(m + 1):
                    doska(G, M['ram'], h, 0.4 + (h.L - 0.8) * j / m, 0.06, z0, z1, 0.04)
                doska(G, M['detail'], h, h.L / 2, h.L - 0.6, z0 - 0.15, z0, 0.05)


def postav():
    """Vracia (Geo, výška, obrysy prístavby v Blenderi)."""
    G = Geo()
    M = {
        'stena': material('omietka-snd', STENA, drsnost=0.85),
        'detail': material('detail-snd', DETAIL, drsnost=0.75),
        'rustika': material('rustika-snd', RUSTIKA, drsnost=0.9),
        'ryha': material('ryha-snd', RYHA, drsnost=0.95),
        'sokel': material('sokel-snd', SOKEL, drsnost=0.9),
        'plech': material('plech-snd', PLECH, drsnost=0.6, kov=0.1),   # matný zinok – pri väčšom kove odráža teplú oblohu
        'lem': material('lem-plechu-snd', '#a4adb6', drsnost=0.5, kov=0.3),
        'socha': material('socha-snd', SOCHY, drsnost=0.6, kov=0.2),
        'busta': material('busta-snd', '#d9d2c3', drsnost=0.7),
        'nika': material('nika-snd', '#cbbf9f', drsnost=0.9),
        'zlato': material('zlato-snd', ZLATO, drsnost=0.3, kov=0.8),
        'ram': material('ram-snd', RAM, drsnost=0.6),
        'dvere': material('dvere-snd', '#4a3a2c', drsnost=0.6),
        'sklo': material('sklo-snd', SKLO, drsnost=0.1, kov=0.5),
        'sklo2': material('sklo-pristavba-snd', '#2e3640', drsnost=0.08, kov=0.6),
        'zelezo': material('zelezo-snd', ZELEZO, drsnost=0.5, kov=0.6),
        'svetlo': material('lucerna-snd', '#f2e6c4', drsnost=0.3),
        'travertin': material('travertin-snd', TRAVERTIN, drsnost=0.85),
        'strecha_plocha': material('strecha-plocha-snd', '#8c8f8f', drsnost=0.9),
        'dlazba': material('dlazba-terasy-snd', '#c8c0b0', drsnost=0.9),
    }
    uv = ccw_uv(obrys_hlavny())
    obrys_b = [B(*p) for p in uv]
    hrany, riz = postav_hlavny_kvader(G, M, obrys_b, uv)
    postav_rizalit(G, M, hrany, riz, uv)
    postav_portikus(G, M)
    postav_kupolu(G, M)
    postav_strechy(G, M)
    postav_pristavbu(G, M)
    obrys_pristavby = ccw([B(27.8, -16.6), B(44.0, -16.6), B(44.0, -4.0), B(45.1, -4.0), B(45.1, 4.0), B(44.0, 4.0),
                           B(44.0, 16.6), B(27.8, 16.6)])
    return G, 29.7, obrys_pristavby


def ccw_uv(body):
    """Obrys v (u, v) otočený proti smeru hodinových ručičiek (sústava u, v je pravotočivá ako x, y Blendera)."""
    A = sum(a[0] * b[1] - b[0] * a[1] for a, b in zip(body, body[1:] + body[:1]))
    return body if A > 0 else list(reversed(body))
