# Drobné pamiatky: Maximiliánova (Rolandova) fontána na Hlavnom námestí, Brána slobody a Pamätník železnej
# opony pod hradom Devín. Pevné modely (stoja na teréne v strede).

import math

from veze import Geo
from spolocne import material
from pamiatky2.zaklad import data, v_bl, bez_konca, stred_bodov


def postava_rytiera(G, kamen, c, z0, vyska=2.1, smer=0.0):
    """Štylizovaná socha rytiera v brnení (Maximilián/Roland): nohy, trup, ramená, hlava s prilbou,
    štít a zástava. c = stred podstavy, z0 = výška podstavy."""
    s = vyska / 2.1
    ux, uy = math.cos(smer), math.sin(smer)          # dopredu
    vx, vy = -uy, ux                                 # doľava
    def b(du, dv):
        return (c[0] + ux * du * s + vx * dv * s, c[1] + uy * du * s + vy * dv * s)
    # nohy (mierne rozkročené) a čižmy
    for dv in (-0.13, 0.13):
        G.kvader(kamen, b(0.0, dv), (ux, uy), 0.2 * s, 0.17 * s, z0, z0 + 0.95 * s)
        G.kvader(kamen, b(0.04, dv), (ux, uy), 0.28 * s, 0.18 * s, z0, z0 + 0.12 * s)
    # sukňa brnenia a trup (zužuje sa k pásu, širšia hruď)
    G.valec(kamen, b(0, 0), 0.25 * s, z0 + 0.85 * s, z0 + 1.15 * s, seg=10, r1=0.21 * s)
    G.valec(kamen, b(0, 0), 0.21 * s, z0 + 1.15 * s, z0 + 1.6 * s, seg=10, r1=0.26 * s)
    # ramená (náplecníky) a ruky
    for dv in (-0.3, 0.3):
        G.valec(kamen, b(0, dv), 0.11 * s, z0 + 1.48 * s, z0 + 1.62 * s, seg=8, r1=0.09 * s)
        G.tram(kamen, (*b(0, dv), z0 + 1.55 * s), (*b(0.12, dv * 1.05), z0 + 1.1 * s), 0.11 * s)
    # hlava s prilbou a chocholom
    G.valec(kamen, b(0, 0), 0.08 * s, z0 + 1.6 * s, z0 + 1.7 * s, seg=8)
    G.valec(kamen, b(0, 0), 0.13 * s, z0 + 1.7 * s, z0 + 1.93 * s, seg=10, r1=0.11 * s)
    G.valec(kamen, b(0, 0), 0.11 * s, z0 + 1.93 * s, z0 + 2.0 * s, seg=10, r1=0.03 * s)
    G.tram(kamen, (*b(-0.02, 0), z0 + 1.98 * s), (*b(-0.2, 0), z0 + 2.12 * s), 0.07 * s)
    # štít v ľavej ruke (pri nohe) a zástava v pravej
    sc = b(0.2, 0.36)
    G.kvader(kamen, sc, (vx, vy), 0.06 * s, 0.45 * s, z0 + 0.45 * s, z0 + 1.15 * s)
    zp = b(0.15, -0.36)
    G.tram(kamen, (*zp, z0 + 0.05 * s), (*zp, z0 + 2.6 * s), 0.05 * s)
    G.kvader(kamen, (zp[0] - vx * 0.3 * s, zp[1] - vy * 0.3 * s), (vx, vy), 0.6 * s, 0.03 * s, z0 + 2.0 * s, z0 + 2.5 * s)


def medzikruzie(G, mat, c, r_von, r_dnu, z, seg):
    """Vodorovné medzikružie (vrch obruby) – lícom nahor."""
    for k in range(seg):
        a0, a1 = 2 * math.pi * k / seg, 2 * math.pi * (k + 1) / seg
        G.plocha(mat, [(c[0] + r_dnu * math.cos(a0), c[1] + r_dnu * math.sin(a0), z), (c[0] + r_von * math.cos(a0), c[1] + r_von * math.sin(a0), z),
                       (c[0] + r_von * math.cos(a1), c[1] + r_von * math.sin(a1), z), (c[0] + r_dnu * math.cos(a1), c[1] + r_dnu * math.sin(a1), z)])


def fontana():
    F = data()['body']['fontana']
    o = bez_konca(F['body'])
    stred = stred_bodov(o)
    r = sum(math.hypot(p[0] - stred[0], p[1] - stred[1]) for p in o) / len(o)
    kamen = material('fontana-kamen', '#d6ccb8', drsnost=0.85)
    kamen2 = material('fontana-kamen-tmavy', '#c2b8a3', drsnost=0.88)
    socha = material('fontana-socha', '#d9d2c4', drsnost=0.8)
    voda = material('fontana-voda', '#4a6e7a', drsnost=0.08, kov=0.2)
    G = Geo()
    c = (0.0, 0.0)
    seg = 40
    # nádrž: obruba so zaobleným vencom a profilovaným soklom
    G.valec(kamen2, c, r + 0.15, -0.3, 0.12, seg=seg)
    G.valec(kamen, c, r, 0.12, 0.72, seg=seg, vrch=False)
    G.valec(kamen2, c, r + 0.12, 0.72, 0.88, seg=seg, vrch=False)
    medzikruzie(G, kamen2, c, r + 0.12, r - 0.45, 0.88, seg)
    # vnútorná stena nádrže (lícom dnu)
    for k in range(seg):
        a0, a1 = 2 * math.pi * k / seg, 2 * math.pi * (k + 1) / seg
        ri = r - 0.45
        G.plocha(kamen, [(c[0] + ri * math.cos(a1), c[1] + ri * math.sin(a1), 0.3), (c[0] + ri * math.cos(a0), c[1] + ri * math.sin(a0), 0.3),
                         (c[0] + ri * math.cos(a0), c[1] + ri * math.sin(a0), 0.88), (c[0] + ri * math.cos(a1), c[1] + ri * math.sin(a1), 0.88)])
    # balustráda na obrube (stĺpiky so zábradlím)
    n = int(2 * math.pi * r / 0.32)
    for k in range(n):
        a = 2 * math.pi * k / n
        p = (c[0] + (r - 0.15) * math.cos(a), c[1] + (r - 0.15) * math.sin(a))
        G.valec(kamen, p, 0.07, 0.88, 1.45, seg=6, r1=0.05)
    G.valec(kamen2, c, r - 0.02, 1.45, 1.55, seg=seg, vrch=False)
    medzikruzie(G, kamen2, c, r - 0.02, r - 0.28, 1.55, seg)
    for k in range(seg):
        a0, a1 = 2 * math.pi * k / seg, 2 * math.pi * (k + 1) / seg
        ri = r - 0.28
        G.plocha(kamen2, [(c[0] + ri * math.cos(a1), c[1] + ri * math.sin(a1), 1.45), (c[0] + ri * math.cos(a0), c[1] + ri * math.sin(a0), 1.45),
                          (c[0] + ri * math.cos(a0), c[1] + ri * math.sin(a0), 1.55), (c[0] + ri * math.cos(a1), c[1] + ri * math.sin(a1), 1.55)])
    # voda
    G.plocha(voda, [(c[0] + (r - 0.45) * math.cos(2 * math.pi * k / seg), c[1] + (r - 0.45) * math.sin(2 * math.pi * k / seg), 0.55) for k in range(seg)])
    # stredný podstavec: osemboký so štyrmi miskami a chrličmi
    G.valec(kamen2, c, 1.35, 0.0, 1.1, seg=8)
    G.valec(kamen, c, 1.15, 1.1, 1.35, seg=8, r1=1.0)
    for k in range(4):
        a = math.pi / 4 + k * math.pi / 2
        p = (c[0] + 1.25 * math.cos(a), c[1] + 1.25 * math.sin(a))
        G.valec(kamen, p, 0.45, 0.9, 1.15, seg=12, r1=0.6)
        G.valec(voda, p, 0.55, 1.13, 1.13, seg=12)
        G.tram(kamen2, (c[0] + 0.7 * math.cos(a), c[1] + 0.7 * math.sin(a), 2.2), (p[0] * 0.95, p[1] * 0.95, 1.6), 0.12)
    # stĺp s hlavicou
    G.valec(kamen, c, 0.55, 1.35, 1.7, seg=12, r1=0.42)
    G.valec(kamen, c, 0.36, 1.7, 4.7, seg=14, r1=0.3)
    G.kvader(kamen2, c, (1, 0), 0.95, 0.95, 4.7, 4.95)
    G.kvader(kamen, c, (1, 0), 0.8, 0.8, 4.95, 5.1)
    postava_rytiera(G, socha, c, 5.1, vyska=2.1, smer=-math.pi / 2)
    print('fontána: polomer', round(r, 2))
    return G, [], 7.8, 'fontana-maximilianova', {'stred': [round(stred[0], 2), round(stred[1], 2)]}


def brana_slobody():
    B = data()['body']['branaSlobody']
    stred = tuple(B['xz'])
    beton = material('brana-beton', '#a9a69e', drsnost=0.9)
    zelezo = material('brana-zelezo', '#5b4636', drsnost=0.65, kov=0.55)
    G = Geo()
    # kamenná podesta
    G.kvader(beton, (0, 0), (1, 0), 6.0, 2.4, -0.4, 0.25)
    # dva betónové piliere brány
    for dx in (-1.9, 1.9):
        G.kvader(beton, (dx, 0), (1, 0), 0.8, 0.6, 0.25, 5.2)
    # železný preklad a mreža z prútov (niektoré ohnuté – pretrhnutá opona)
    G.kvader(zelezo, (0, 0), (1, 0), 4.6, 0.25, 4.6, 4.95)
    for k in range(11):
        x = -1.35 + k * 0.27
        if k in (5, 6):
            G.tram(zelezo, (x, 0, 0.3), (x + (0.45 if k == 6 else -0.45), 0.35, 2.4), 0.05)
            G.tram(zelezo, (x, 0, 4.6), (x + (0.35 if k == 6 else -0.35), -0.3, 3.0), 0.05)
        else:
            G.tram(zelezo, (x, 0, 0.3), (x, 0, 4.6), 0.05)
    for z in (1.4, 3.1):
        G.tram(zelezo, (-1.5, 0, z), (-0.2, 0, z), 0.06)
        G.tram(zelezo, (0.2, 0, z), (1.5, 0, z), 0.06)
    return G, [], 5.2, 'brana-slobody', {'stred': [stred[0], stred[1]]}


def zelezna_opona():
    B = data()['body']['zeleznaOpona']
    stred = tuple(B['xz'])
    zelezo = material('opona-zelezo', '#6b4a33', drsnost=0.7, kov=0.5)
    kamen = material('opona-kamen', '#9e978a', drsnost=0.9)
    G = Geo()
    G.kvader(kamen, (0, 0), (1, 0), 2.2, 1.4, -0.3, 0.3)
    # stĺpy ostnatého plotu a zvislé plechy
    for k, dx in enumerate((-0.8, -0.27, 0.27, 0.8)):
        G.kvader(zelezo, (dx, 0), (1, 0), 0.32, 0.08, 0.3, 3.1 - (k % 2) * 0.35)
    for z in (0.9, 1.5, 2.1, 2.7):
        G.tram(zelezo, (-1.0, -0.06, z), (1.0, -0.06, z - 0.15), 0.025)
    return G, [], 3.1, 'zelezna-opona', {'stred': [stred[0], stred[1]]}


def postav_vsetky():
    return [fontana, brana_slobody, zelezna_opona]
