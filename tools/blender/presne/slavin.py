# Slavín – pamätník a vojenský cintorín (1957–1960, architekt Ján Svetlík, socha vojaka so zástavou Alexander
# Trizuljak). Presný model podľa verejných fotografií (Wikimedia Commons, kategória „Slavín v Bratislave“, len na
# porovnanie) a OSM (pôdorys pietnej siene 19,9 × 19,9 m, výška pylónu 37 m bez sochy):
#  - kamenná terasa so schodmi okolo, pietna sieň – kváder z bieleho kameňa s plochými lizénami, bronzové dvere
#    v hlavnej osi (na juh, k mestu), reliéfne polia na bokoch, hlavná rímsa a atika,
#  - štíhly štvorhranný pylón, ktorý sa smerom hore zužuje, so žliabkami na každej strane,
#  - na vrchu podstavec a bronzová socha vojaka so zástavou (spolu ~39,5 m nad terasou).
import math

from veze import Geo, dlzka, normala
from spolocne import material

VYSKA_SIENE = 8.4
PYLON_SPODOK, PYLON_VRCH = 6.4, 4.3     # strana pylónu dole a hore (m)
PYLON_DO = 28.6                          # výška vrchu pylónu nad terasou


def postav(obrys):
    """obrys = štvorec siene v rovine Blendera (CCW, okolo 0, 0). Vracia (Geo, výška)."""
    G = Geo()
    kamen = material('obklad-travertin', '#dcd8ce', drsnost=0.75)        # hladké kamenné dosky (bez procedurálneho kameňa)
    dlazba = material('kamen-terasa', '#cfcabe', drsnost=0.9)
    kamen_tmavy = material('kamen-relief', '#c4bfb3', drsnost=0.85)
    zliabok = material('kamen-zliabok', '#a9a498', drsnost=0.9)
    bronz = material('bronz', '#76604a', drsnost=0.45, kov=0.6)
    bronz_svetly = material('bronz-zastava', '#7a5a3c', drsnost=0.5, kov=0.6)

    # osi štvorca: u pozdĺž hrany, v = normála hlavného priečelia (najviac na juh = −Y v Blenderi)
    n = len(obrys)
    i_pred = min(range(n), key=lambda i: normala(obrys[i], obrys[(i + 1) % n])[1])
    a, b = obrys[i_pred], obrys[(i_pred + 1) % n]
    L = dlzka(a, b)
    ux, uy = (b[0] - a[0]) / L, (b[1] - a[1]) / L
    vx, vy = normala(a, b)                 # von z priečelia (na juh)
    S = L                                  # strana siene
    c = (sum(p[0] for p in obrys) / n, sum(p[1] for p in obrys) / n)

    def bod(s, t):
        """s pozdĺž u, t pozdĺž v (+ = k priečeliu) od stredu."""
        return (c[0] + ux * s + vx * t, c[1] + uy * s + vy * t)

    def stvorec(pol, posun=0.0):
        return [bod(-pol, -pol + posun), bod(pol, -pol + posun), bod(pol, pol + posun), bod(-pol, pol + posun)]

    # terasa so štyrmi schodmi dookola (päta modelu je pod terénom, aby terasa sedela aj na svahu)
    G.hranol(dlazba, stvorec(S / 2 + 9.6), -2.5, -0.9)
    for k in range(3):
        G.hranol(dlazba, stvorec(S / 2 + 9.0 - k * 0.45), -0.9 + k * 0.3, -0.6 + k * 0.3)
    # pred priečelím široké schodisko k mestu
    for k in range(6):
        G.kvader(dlazba, bod(0, S / 2 + 9.6 + (6 - k) * 0.5 - 0.25), (ux, uy), 14.0, 0.5, -2.5, -2.5 + (k + 1) * 1.6 / 6)

    # pietna sieň: sokel, steny, lizény, rímsa, atika
    G.hranol(kamen_tmavy, stvorec(S / 2 + 0.25), -0.05, 0.7)
    G.hranol(kamen, stvorec(S / 2), 0.7, VYSKA_SIENE)
    for strana in range(4):
        # strana 0 = priečelie (+v), ďalšie po smere
        uhol = strana * math.pi / 2
        su, sv = math.cos(uhol), math.sin(uhol)      # natočenie lokálnych osí strany

        def b2(s, t):
            # s pozdĺž strany, t von zo steny (od stredu)
            ss, tt = s * su - t * sv, s * sv + t * su
            return bod(ss, tt)
        ou = (ux * su - vx * sv, uy * su - vy * sv)  # smer pozdĺž strany vo svete
        # lizény (6 na stranu)
        for k in range(6):
            s = -S / 2 + 1.2 + k * (S - 2.4) / 5
            G.kvader(kamen, b2(s, S / 2 + 0.2), ou, 0.9, 0.4, 0.7, VYSKA_SIENE - 0.4)
        if strana == 0:
            # bronzové dvere v kamennom ostení
            G.kvader(kamen_tmavy, b2(0, S / 2 + 0.25), ou, 4.6, 0.5, 0.7, 7.2)
            G.kvader(bronz, b2(0, S / 2 + 0.42), ou, 3.4, 0.2, 0.7, 6.4)
            for k in range(4):
                G.kvader(bronz_svetly, b2(0, S / 2 + 0.53), ou, 3.0, 0.05, 1.2 + k * 1.3, 1.9 + k * 1.3)
        else:
            # reliéfne polia medzi lizénami
            for k in range(5):
                s = -S / 2 + 1.2 + (k + 0.5) * (S - 2.4) / 5
                G.kvader(kamen_tmavy, b2(s, S / 2 + 0.06), ou, (S - 2.4) / 5 - 1.4, 0.12, 2.0, 6.2)
    G.pas(kamen, stvorec(S / 2), VYSKA_SIENE - 0.4, VYSKA_SIENE + 0.4, 0.55, dnu=0.0)
    G.hranol(kamen, stvorec(S / 2 - 0.3), VYSKA_SIENE + 0.4, VYSKA_SIENE + 1.3)
    G.hranol(kamen_tmavy, stvorec(PYLON_SPODOK / 2 + 1.0), VYSKA_SIENE + 1.3, VYSKA_SIENE + 1.9)

    # pylón: zrezaný ihlan zo štyroch stien, na každej strane tri žliabky
    z0, z1 = VYSKA_SIENE + 1.9, PYLON_DO
    d0, d1 = PYLON_SPODOK / 2, PYLON_VRCH / 2
    dole, hore = stvorec(d0), stvorec(d1)
    for i in range(4):
        j = (i + 1) % 4
        G.plocha(kamen, [(dole[i][0], dole[i][1], z0), (dole[j][0], dole[j][1], z0),
                         (hore[j][0], hore[j][1], z1), (hore[i][0], hore[i][1], z1)])
        # žliabky: tenké tmavé pásy po celej výške, mierne pred stenou
        for f in (0.3, 0.5, 0.7):
            pa0 = (dole[i][0] + (dole[j][0] - dole[i][0]) * f, dole[i][1] + (dole[j][1] - dole[i][1]) * f)
            pa1 = (hore[i][0] + (hore[j][0] - hore[i][0]) * f, hore[i][1] + (hore[j][1] - hore[i][1]) * f)
            nx, ny = normala(dole[i], dole[j])
            w0, w1 = 0.09, 0.07
            ex, ey = (dole[j][0] - dole[i][0]) / dlzka(dole[i], dole[j]), (dole[j][1] - dole[i][1]) / dlzka(dole[i], dole[j])
            G.plocha(zliabok, [(pa0[0] - ex * w0 + nx * 0.02, pa0[1] - ey * w0 + ny * 0.02, z0 + 0.6),
                               (pa0[0] + ex * w0 + nx * 0.02, pa0[1] + ey * w0 + ny * 0.02, z0 + 0.6),
                               (pa1[0] + ex * w1 + nx * 0.02, pa1[1] + ey * w1 + ny * 0.02, z1 - 0.8),
                               (pa1[0] - ex * w1 + nx * 0.02, pa1[1] - ey * w1 + ny * 0.02, z1 - 0.8)])
    # hlavica pylónu a podstavec sochy
    G.hranol(kamen, stvorec(d1 + 0.35), z1, z1 + 0.7)
    G.hranol(kamen_tmavy, stvorec(1.3), z1 + 0.7, z1 + 1.5)

    # socha vojaka so zástavou (bronz, ~8 m): nohy v kroku, plášť, trup, hlava, zdvihnutá ruka so zástavou
    zs = z1 + 1.5

    def kv(m, s, t, sirka, hlbka, za, zb, u=(ux, uy)):
        G.kvader(m, bod(s, t), u, sirka, hlbka, za, zb)
    kv(bronz, -0.32, 0.25, 0.55, 0.75, zs, zs + 3.0)          # predná noha
    kv(bronz, 0.32, -0.3, 0.55, 0.75, zs, zs + 3.0)           # zadná noha
    G.valec(bronz, bod(0, 0), 1.0, zs + 1.6, zs + 3.4, seg=10, r1=0.78)   # plášť
    G.valec(bronz, bod(0, 0), 0.78, zs + 3.4, zs + 5.4, seg=10, r1=0.68)  # trup
    G.valec(bronz, bod(0, 0), 0.32, zs + 5.4, zs + 5.8, seg=8)            # krk
    G.valec(bronz, bod(0, 0.05), 0.42, zs + 5.8, zs + 6.55, seg=10, r1=0.3)   # hlava (prilba)
    # ľavá ruka dole, pravá hore k žrdi
    G.tram(bronz, (*bod(-0.85, 0.1), zs + 5.1), (*bod(-0.95, 0.3), zs + 3.6), 0.32)
    rameno = (*bod(0.8, 0.0), zs + 5.1)
    ruka = (*bod(1.15, 0.35), zs + 7.0)
    G.tram(bronz, rameno, ruka, 0.32)
    # žrď (šikmo hore) a zástava viajúca dozadu
    zrd_d = (*bod(1.0, 0.2), zs + 3.2)
    zrd_h = (*bod(1.35, 0.55), zs + 9.6)
    G.tram(bronz, zrd_d, zrd_h, 0.14)
    vlny = 8
    for k in range(vlny):
        t0, t1 = k / vlny, (k + 1) / vlny
        def pt(t, dz):
            # látka sa ťahá od žrde dozadu (−v) a nadol, so záhybmi
            s = 1.35 - 0.2 * t
            tt = 0.55 - 3.4 * t
            vln = 0.35 * math.sin(t * 2.6 * math.pi)
            p = bod(s + vln, tt)
            return (p[0], p[1], zs + 9.4 - dz - 0.9 * t)
        G.plocha(bronz_svetly, [pt(t0, 0.0), pt(t1, 0.0), pt(t1, 2.2), pt(t0, 2.2)])
        G.plocha(bronz_svetly, [pt(t0, 2.2), pt(t1, 2.2), pt(t1, 0.0), pt(t0, 0.0)])
    return G, zs + 9.6
