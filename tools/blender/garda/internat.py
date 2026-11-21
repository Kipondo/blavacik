# Študentský domov Mladá garda (Emil Belluš a kol., 1953–1955), Račianska 103.
# Prísne súmerný pôdorys: vstupná budova s hodinovou vežou uprostred, od nej spojovacie chodby na sever a juh
# k dvom krídlam v tvare „H“ (bloky I–J–K a B–C–D, štyri podlažia, valbové strechy zo škridly) a štyri menšie
# rohové bloky (A, E, H, L) pripojené trojpodlažnými spojkami. Čelá krídel do predpolia majú pásy lodžií
# so stĺpmi a renesančnú atiku s cimburím; vstupná budova má presklené prízemie, okná medzi pilastrami,
# dva reliéfy a cimburie po celej atike, veža hodiny zo štyroch strán.
# Pôdorysy častí (building:part) z OSM: tools/blender/osm_garda.mjs → data/garda.json.

import math
import random

from veze import Geo, dlzka, normala, odsad, strecha as plocha_strecha, stred_obrysu
from hrad.stavebne import barokova_fasada
from historicke.strechy import strecha_podla_vzdialenosti, profil_valbovy

from garda.zaklad import (data, materialy, obrys_bl, zjednot, najdi_hranu, koncova_hrana, okna_na_hrane, cimburie,
                          lodzie, vetraky, stoziar, ziva_plot, v_bl)

# výšky: prízemie na sokli (vstupy o pár schodov vyššie), tri poschodia, korunná rímsa
KZ_KRIDLO = [-0.6, 4.1, 7.4, 10.7, 14.0]
SKLON_STRECHY = 0.78
KRIDLA = {
    'sever': ['391092115', '1527222313', '1527222308'],    # K, J, I
    'juh': ['1527222310', '1177355168', '1527222309'],     # D, C, B
}
ROHOVE = ['60802819', '60805777', '24030311', '60802120']   # L, H, E, A
SPOJKY = ['391092118', '1527222318', '859753746', '1527222317']
VSTUP, VEZA = '391092110', '1527222304'
JEDALEN, JEDALEN_HORE = '1527222314', '1527222303'
CHODBY = ['1527222315', '1527222316']


def kridlo(G, M, obrys, rnd, lodzie_k=()):
    """Štvorpodlažné krídlo s oknami, rímsami a valbovou strechou; na hranách lodzie_k čelo s lodžiami."""
    kz = KZ_KRIDLO
    H = kz[-1]
    barokova_fasada(G, obrys, kz, stena=M['omietka'], sambrana=M['detail'], sklo_m=M['sklo'], rimsa=M['rimsa'],
                    sokel=M['sokel'], os_okien=3.2, okno=(1.25, 1.55), min_dlzka=2.5, prizemie_okno=(1.25, 1.5),
                    hlavna_rimsa=0.55, seed=rnd.randint(1, 999), preskoc=lambda i: i in lodzie_k,
                    stena_preskocenej=False)
    n = len(obrys)
    for i in lodzie_k:
        lodzie(G, obrys[i], obrys[(i + 1) % n], kz, M, rnd=rnd)
    strecha_podla_vzdialenosti(G, M['strecha'], obrys, [], H, profil_valbovy(SKLON_STRECHY, 6.0), krok=1.0)
    vetraky(G, M['vikier'], obrys, H, SKLON_STRECHY, rnd=rnd)


def plocha_cast(G, M, obrys, vyska, os_okien=3.0, okno=(1.3, 1.6), podlazia=1, strecha='strecha_plocha', atika=0.6, rnd=None,
                cimb=False, stena='omietka'):
    """Nižšia časť s plochou strechou (spojky, chodby, jedáleň)."""
    kz = [-1.0] + [vyska * (k + 1) / podlazia for k in range(podlazia)]
    n = len(obrys)
    for i in range(n):
        a, b = obrys[i], obrys[(i + 1) % n]
        if dlzka(a, b) < 2.2:
            G.stena(M[stena], a, b, kz[0], kz[-1])
        else:
            okna_na_hrane(G, a, b, kz, M, os_okien=os_okien, okno=okno, prizemie_okno=okno, stena=M[stena], rnd=rnd)
    G.pas(M['rimsa'], obrys, vyska - 0.35, vyska, von=0.3, spodok=True)
    G.pas(M['sokel'], obrys, -1.0, 0.6, von=0.1)
    plocha_strecha(G, obrys, vyska, M[strecha], M['rimsa'], atika=atika)
    if cimb:
        for i in range(n):
            cimburie(G, M['rimsa'], obrys[i], obrys[(i + 1) % n], vyska + atika, vyska=0.42, sirka=0.36, rozostup=0.72, hrubka=0.3)


def vstupna_budova(G, M, obrys, veza, rnd):
    """Dvojpodlažná vstupná budova s cimburím; čelo (východná hrana) presklené, okná medzi pilastrami, reliéfy."""
    kz = [-1.0, 4.6, 9.4]
    H = kz[-1]
    n = len(obrys)
    cel = max(range(n), key=lambda i: (obrys[i][0] + obrys[(i + 1) % n][0]) / 2 + (0 if dlzka(obrys[i], obrys[(i + 1) % n]) > 15 else -1e3))
    for i in range(n):
        a, b = obrys[i], obrys[(i + 1) % n]
        if i == cel:
            celo(G, M, a, b, kz, rnd)
        elif dlzka(a, b) < 2.5:
            G.stena(M['omietka_ruzova'], a, b, kz[0], H)
        else:
            okna_na_hrane(G, a, b, kz, M, os_okien=3.4, okno=(1.4, 2.2), prizemie_okno=(1.6, 2.4), stena=M['omietka_ruzova'], rnd=rnd)
    G.pas(M['sokel'], obrys, -1.0, 0.5, von=0.12)
    G.pas(M['rimsa'], obrys, kz[1] - 0.1, kz[1] + 0.12, von=0.15, spodok=True)
    G.pas(M['rimsa'], obrys, H - 0.45, H - 0.2, von=0.3, spodok=True)
    G.pas(M['rimsa'], obrys, H - 0.2, H, von=0.45, spodok=True)
    atika = 1.15
    plocha_strecha(G, obrys, H, M['strecha_plocha'], M['omietka_ruzova'], atika=atika)
    for i in range(n):
        cimburie(G, M['rimsa'], obrys[i], obrys[(i + 1) % n], H + atika, vyska=0.45, sirka=0.34, rozostup=0.68, hrubka=0.3)
    # hodinová veža
    hodinova_veza(G, M, veza, H)
    return H


def celo(G, M, a, b, kz, rnd):
    """Hlavné čelo vstupnej budovy (podľa fotografie): presklené prízemie so vstupom pod rímsou,
    na poschodí päť okien s pilastrami uprostred a dva reliéfy po stranách."""
    L = dlzka(a, b)
    ux, uy = (b[0] - a[0]) / L, (b[1] - a[1]) / L
    nx, ny = uy, -ux
    z0, z1, z2 = kz
    st = M['omietka_ruzova']
    P = lambda s: (a[0] + ux * s, a[1] + uy * s)
    # prízemie: výklady cez 80 % šírky, okraje plné
    v0, v1 = L * 0.1, L * 0.9
    G.stena(st, a, P(v0), z0, z1)
    G.stena(st, P(v1), b, z0, z1)
    G.stena(st, P(v0), P(v1), z0, 0.55)
    G.stena(st, P(v0), P(v1), 3.6, z1)
    vnor = 0.3
    I0 = (P(v0)[0] - nx * vnor, P(v0)[1] - ny * vnor)
    I1 = (P(v1)[0] - nx * vnor, P(v1)[1] - ny * vnor)
    G.stena(st, I0, P(v0), 0.55, 3.6)
    G.stena(st, P(v1), I1, 0.55, 3.6)
    G.plocha(st, [(P(v0)[0], P(v0)[1], 3.6), (P(v1)[0], P(v1)[1], 3.6), (I1[0], I1[1], 3.6), (I0[0], I0[1], 3.6)])
    G.panel(M['sklo'], I0, I1, 0.55, 3.6, rnd, 0.002)
    pocet = 10
    for k in range(pocet + 1):
        s = v0 + (v1 - v0) * k / pocet
        c = (a[0] + ux * s - nx * (vnor - 0.05), a[1] + uy * s - ny * (vnor - 0.05))
        G.kvader(M['ram'], c, (ux, uy), 0.12, 0.1, 0.55, 3.6)
    G.kvader(M['ram'], ((I0[0] + I1[0]) / 2 + nx * 0.05, (I0[1] + I1[1]) / 2 + ny * 0.05), (ux, uy), v1 - v0, 0.1, 2.7, 2.8)
    # tenká markíza (rímsa) nad prízemím
    G.kvader(M['rimsa'], ((P(v0)[0] + P(v1)[0]) / 2 + nx * 0.4, (P(v0)[1] + P(v1)[1]) / 2 + ny * 0.4), (ux, uy), v1 - v0 + 0.6, 0.8, 3.75, 3.95, spodok=True)
    # schodík pred vstupom
    G.kvader(M['kamen'], ((a[0] + b[0]) / 2 + nx * 1.2, (a[1] + b[1]) / 2 + ny * 1.2), (ux, uy), L * 0.5, 2.4, -1.0, 0.3)
    # poschodie: 5 okien uprostred, medzi nimi pilastre s ozdobným pásom; reliéfy vľavo a vpravo
    okno_w, okno_h, zo = 1.15, 2.0, z1 + 1.0
    roz = 1.85
    stred_s = L / 2
    okna_s = [stred_s + (k - 2) * roz for k in range(5)]
    hrany = [0.0]
    for s in okna_s:
        hrany += [s - okno_w / 2, s + okno_w / 2]
    hrany.append(L)
    # plná stena medzi oknami a pás pod a nad oknami
    G.stena(st, a, b, z1, zo)
    G.stena(st, a, b, zo + okno_h, z2)
    for k in range(0, len(hrany), 2):
        G.stena(st, P(hrany[k]), P(hrany[k + 1]), zo, zo + okno_h)
    for s in okna_s:
        A, B = P(s - okno_w / 2), P(s + okno_w / 2)
        Ai = (A[0] - nx * 0.25, A[1] - ny * 0.25)
        Bi = (B[0] - nx * 0.25, B[1] - ny * 0.25)
        G.stena(st, Ai, A, zo, zo + okno_h)
        G.stena(st, B, Bi, zo, zo + okno_h)
        G.plocha(st, [(A[0], A[1], zo + okno_h), (B[0], B[1], zo + okno_h), (Bi[0], Bi[1], zo + okno_h), (Ai[0], Ai[1], zo + okno_h)])
        G.plocha(st, [(Ai[0], Ai[1], zo), (Bi[0], Bi[1], zo), (B[0], B[1], zo), (A[0], A[1], zo)])
        G.panel(M['sklo'], Ai, Bi, zo, zo + okno_h, rnd, 0.003)
        c = ((Ai[0] + Bi[0]) / 2 + nx * 0.03, (Ai[1] + Bi[1]) / 2 + ny * 0.03)
        G.kvader(M['ram'], c, (ux, uy), 0.07, 0.06, zo, zo + okno_h)
        G.kvader(M['ram'], c, (ux, uy), okno_w, 0.06, zo + 1.4, zo + 1.46)
    # pilastre s ornamentom (medzi oknami a na okrajoch skupiny)
    for k in range(6):
        s = okna_s[0] - roz / 2 + k * roz
        c = (a[0] + ux * s + nx * 0.06, a[1] + uy * s + ny * 0.06)
        G.kvader(M['relief_svetly'], c, (ux, uy), 0.5, 0.12, zo - 0.2, zo + okno_h + 0.2)
        for j in range(4):
            zz = zo + 0.1 + j * 0.5
            G.kvader(M['relief'], (c[0] + nx * 0.05, c[1] + ny * 0.05), (ux, uy), 0.26, 0.08, zz, zz + 0.26)
    # reliéfy (výjavy budovateľov) – rámované dosky s vystúpenými postavami
    for s in (okna_s[0] - roz / 2 - 2.6, okna_s[-1] + roz / 2 + 2.6):
        c = (a[0] + ux * s + nx * 0.05, a[1] + uy * s + ny * 0.05)
        G.kvader(M['relief_svetly'], c, (ux, uy), 3.3, 0.1, zo - 0.35, zo + okno_h + 0.35)
        G.kvader(M['relief'], (c[0] + nx * 0.05, c[1] + ny * 0.05), (ux, uy), 3.0, 0.08, zo - 0.2, zo + okno_h + 0.2)
        for j in range(4):
            t = -1.1 + j * 0.73
            cc = (c[0] + ux * t + nx * 0.12, c[1] + uy * t + ny * 0.12)
            vys = 1.6 + 0.25 * ((j * 7) % 3)
            G.kvader(M['relief_svetly'], cc, (ux, uy), 0.42, 0.1, zo + 0.05, zo + 0.05 + vys)          # telo
            G.kvader(M['relief_svetly'], cc, (ux, uy), 0.26, 0.1, zo + 0.1 + vys, zo + 0.36 + vys)      # hlava


def hodinova_veza(G, M, obrys, z_strechy):
    """Štvorcová veža nad vstupom: hladký driek, ciferníky zo štyroch strán, cimburie a tyč s krížikom."""
    H0, H1 = z_strechy, z_strechy + 10.2
    n = len(obrys)
    for i in range(n):
        G.stena(M['omietka_ruzova'], obrys[i], obrys[(i + 1) % n], H0 - 1.0, H1)
    G.pas(M['rimsa'], obrys, H1 - 0.15, H1 + 0.2, von=0.3, spodok=True)
    G.vodorovna(M['strecha_plocha'], obrys, H1 + 0.05)
    s = stred_obrysu(obrys)
    for i in range(n):
        a, b = obrys[i], obrys[(i + 1) % n]
        L = dlzka(a, b)
        if L < 2:
            continue
        ux, uy = (b[0] - a[0]) / L, (b[1] - a[1]) / L
        nx, ny = uy, -ux
        m = ((a[0] + b[0]) / 2, (a[1] + b[1]) / 2)
        zc = H1 - 2.4
        # ozdobný rám ciferníka a ciferník
        G.kvader(M['relief'], (m[0] + nx * 0.04, m[1] + ny * 0.04), (ux, uy), min(L - 0.5, 3.0), 0.08, zc - 1.5, zc + 1.5)
        G.kvader(M['relief_svetly'], (m[0] + nx * 0.08, m[1] + ny * 0.08), (ux, uy), min(L - 0.9, 2.6), 0.08, zc - 1.3, zc + 1.3)
        disk(G, M['cifernik'], (m[0] + nx * 0.13, m[1] + ny * 0.13), (nx, ny), 1.0, zc)
        # ručičky (10:10)
        for uhol, dl in ((math.radians(-60), 0.55), (math.radians(60), 0.8)):
            ex, ez = math.sin(uhol) * dl, math.cos(uhol) * dl
            c = (m[0] + nx * 0.2 + ux * ex / 2, m[1] + ny * 0.2 + uy * ex / 2)
            G.tram(M['kov'], (m[0] + nx * 0.2, m[1] + ny * 0.2, zc), (m[0] + nx * 0.2 + ux * ex, m[1] + ny * 0.2 + uy * ex, zc + ez), 0.07)
        # štrbinové okienka pod hodinami
        for j in (-0.6, 0.6):
            c = (m[0] + ux * j + nx * 0.02, m[1] + uy * j + ny * 0.02)
            G.kvader(M['sklo'], c, (ux, uy), 0.32, 0.05, H0 + 1.5, H0 + 3.6)
        cimburie(G, M['rimsa'], a, b, H1 + 0.2, vyska=0.6, sirka=0.45, rozostup=0.9, hrubka=0.35, von=0.2)
    G.valec(M['kov'], s, 0.05, H1, H1 + 2.6, seg=6)
    G.tram(M['kov'], (s[0] - 0.35, s[1], H1 + 2.1), (s[0] + 0.35, s[1], H1 + 2.1), 0.06)
    return H1 + 2.6


def disk(G, mat, c, n, r, z, seg=24):
    """Zvislý kruh (ciferník) so stredom c, normálou n (x, y), vo výške z."""
    tx, ty = -n[1], n[0]
    body = [(c[0] + tx * r * math.cos(2 * math.pi * k / seg), c[1] + ty * r * math.cos(2 * math.pi * k / seg),
             z + r * math.sin(2 * math.pi * k / seg)) for k in range(seg)]
    G.plocha(mat, body)


def predpolie(G, M, celo_a, celo_b):
    """Stožiare pred vstupom, socha na podstavci so živými plotmi na konci predpolia."""
    L = dlzka(celo_a, celo_b)
    ux, uy = (celo_b[0] - celo_a[0]) / L, (celo_b[1] - celo_a[1]) / L
    nx, ny = uy, -ux
    m = ((celo_a[0] + celo_b[0]) / 2, (celo_a[1] + celo_b[1]) / 2)
    for s in (-1, 1):
        for k in range(3):
            t = s * (L / 2 + 1.5 + k * 2.2)
            stoziar(G, M['stoziar'], (m[0] + ux * t + nx * 4.0, m[1] + uy * t + ny * 4.0), 10.5)
    # socha (stojaca žena s kvetmi) na podstavci, živé ploty po stranách
    c = (m[0] + nx * 33, m[1] + ny * 33)
    G.kvader(M['kamen'], c, (ux, uy), 1.1, 1.1, 0.0, 1.5)
    G.valec(M['kamen'], c, 0.42, 1.5, 2.9, seg=10, r1=0.28)
    G.valec(M['kamen'], c, 0.22, 2.9, 3.35, seg=10, r1=0.16)
    G.valec(M['kamen'], (c[0], c[1]), 0.15, 3.35, 3.65, seg=8, r1=0.1)
    for s in (-1, 1):
        a = (c[0] + ux * s * 1.2, c[1] + uy * s * 1.2)
        b = (c[0] + ux * s * 9.5, c[1] + uy * s * 9.5)
        ziva_plot(G, M['ker'], a, b, 1.25, 1.1)


def postav():
    D = data()
    M = materialy()
    rnd = random.Random(1955)
    G = Geo()
    hlavny = D['garda']['obrys']['body']
    from veze import z_hry
    stred = stred_obrysu([(p[0], p[1]) for p in hlavny])
    stred = (round(stred[0], 2), round(stred[1], 2))
    casti = {c['id']: c for c in D['garda']['casti']}
    O = {k: obrys_bl(c['body'], stred, 0.25) for k, c in casti.items()}

    # krídla v tvare H (zjednotené časti) s lodžiami na čelách do predpolia a k vstupnej budove
    for meno, ids in KRIDLA.items():
        for obrys in zjednot([O[i] for i in ids]):
            smer = (0, -1) if meno == 'sever' else (0, 1)      # k stredu komplexu (sever je +y)
            lodzie_k = []
            for i in (ids[0], ids[2]):                          # čelá krídel K/I, D/B pri vstupnej budove
                bod = koncova_hrana(O[i], smer)
                if bod:
                    lodzie_k.append(najdi_hranu(obrys, bod, max_dlzka=16))
            kridlo(G, M, obrys, rnd, set(lodzie_k))
    for i in ROHOVE:
        kridlo(G, M, O[i], rnd)
    for i in SPOJKY:
        plocha_cast(G, M, O[i], 10.6, os_okien=2.6, podlazia=3, rnd=rnd, strecha='strecha_plocha', atika=0.5)
    for i in CHODBY:
        plocha_cast(G, M, O[i], 4.4, os_okien=2.8, okno=(1.6, 1.8), podlazia=1, rnd=rnd, atika=0.5)
    plocha_cast(G, M, O[JEDALEN], 5.8, os_okien=3.2, okno=(2.0, 2.8), podlazia=1, strecha='strecha_svetla', rnd=rnd, atika=0.7, cimb=True,
                stena='omietka_ruzova')
    plocha_cast(G, M, O[JEDALEN_HORE], 8.6, os_okien=3.2, okno=(1.6, 2.2), podlazia=2, strecha='strecha_plocha', rnd=rnd, atika=0.8, cimb=True,
                stena='omietka_ruzova')
    # svetlíky na streche jedálne
    oj = O[JEDALEN]
    sj = stred_obrysu(oj)
    for k in (-1, 1):
        G.kvader(M['sklo'], (sj[0] - 6 + k * 2.2, sj[1] - 4), (0, 1), 1.4, 9.0, 5.85, 6.5, mat_vrch=M['sklo'])
    H = vstupna_budova(G, M, O[VSTUP], O[VEZA], rnd)
    # predpolie pred čelom vstupnej budovy
    ov = O[VSTUP]
    n = len(ov)
    cel = max(range(n), key=lambda i: (ov[i][0] + ov[(i + 1) % n][0]) / 2 + (0 if dlzka(ov[i], ov[(i + 1) % n]) > 15 else -1e3))
    predpolie(G, M, ov[cel], ov[(cel + 1) % n])

    obrysy = [obrys_bl(hlavny, stred, 0.2)]
    return G, obrysy, H + 13.0, 'mlada-garda', {'stred': [stred[0], stred[1]], 'nazov': 'Mladá garda', 'dosah': 90}
