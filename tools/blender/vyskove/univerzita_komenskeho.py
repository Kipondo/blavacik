# Univerzita Komenského – historická budova na Šafárikovom nám. 6 (F. Krupka, 1930–1937, „moderný klasicizmus“).
# Podklady: napady/pamiatky-podklady.md (OSM way 1383879681 a aula 1340711263, texty uniba.sk a registra
# architektúry, fotka východnej fasády z Wikimedia Commons – len na pozretie).
#   – blok na lichobežníkovom pôdoryse ~105 × 37–51 m, 7 podlaží, plochá strecha s atikou (~31–32 m);
#     zvislé lizény medzi osami okien, výrazná rímsa v hornej tretine, nad ňou atikové podlažie so štvorcovými oknami;
#   – na Šafárikovo nám. vstupná rotunda (polvalec R ≈ 11,8 m, ~21 m): na schodiskovom sokli arkáda z masívnych
#     hranolových pilierov, nad ňou dva rady pravouhlých okien medzi plochými pilastrami, na vlyse nápis
#     „UNIVERZITA KOMENSKÉHO“, rímsa a atika s kvádrikmi;
#   – po stranách rotundy dva vetracie pylóny s mrežovými hlavicami, aula s presklenou valenou klenbou nad strechou;
#   – obklad pieskovo-okrový (kvádre), okenné rámy tmavý bronz.

import math

import bpy

from veze import Geo, z_hry, stred_obrysu, odsad, dlzka, normala, strecha, sklo
from spolocne import material

Z_PRIZEMIE = 5.6        # m – vrch prízemia (sokel s výkladmi/oknami)
V_PODLAZIA = 4.2        # 2.–6. podlažie
POSCHODI = 5
Z_RIMSA = Z_PRIZEMIE + POSCHODI * V_PODLAZIA   # 26,6 – hlavná rímsa
Z_ATIKA_PODL = Z_RIMSA + 4.0                    # atikové podlažie
Z_STRECHA = Z_ATIKA_PODL
OS_OKNA = 3.7           # m – os okien na bočných fasádach

# rotunda
R_SOKEL = 0.7           # výška schodiskového sokla
Z_ARKADA = 6.4          # vrch arkády
Z_ROT_RIMSA = 19.0
Z_ROT_ATIKA = 21.2
BAY = 9                 # polí arkády po obvode polvalca


def materialy():
    return {
        # „sokel“ v mene → kvádrový kameň v hre (js/mapa/pamiatky/kamen-material.js)
        'obklad': material('kamen-obklad-sokel-uk', '#c9b98c', drsnost=0.85),
        'obklad_tmavy': material('kamen-obklad-sokel-uk-tien', '#b3a479', drsnost=0.85),
        'rimsa': material('detail-rimsa-uk', '#d5c79e', drsnost=0.8),
        'ram': material('detail-ram-bronz', '#3e3528', drsnost=0.5, kov=0.6),
        'okno': sklo('okna-uk', '#2f3a40', drsnost=0.15, kov=0.6),
        'dvere': sklo('dvere-uk', '#3a3f3c', drsnost=0.2, kov=0.5),
        'strecha': material('strecha-uk', '#8a8780', drsnost=0.95),
        'pismo': material('detail-pismo-bronz', '#4a3f30', drsnost=0.45, kov=0.7),
        'aula': sklo('aula-klenba', '#a8bcc4', drsnost=0.05, kov=0.5),
        'ocel': material('detail-ocel', '#3b3f42', drsnost=0.5, kov=0.6),
        'mreza': material('detail-mreza', '#2c2e2c', drsnost=0.5, kov=0.6),
        'podhlad': material('podhlad-arkady', '#bfb08a', drsnost=0.9),
    }


# --- pôdorys: blok a rotunda -------------------------------------------------------

def kruznica(body):
    """Kružnica cez body (algebraicky, metóda najmenších štvorcov) → (cx, cy, r)."""
    n = len(body)
    sx = sum(p[0] for p in body) / n
    sy = sum(p[1] for p in body) / n
    suu = suv = svv = suuu = svvv = suvv = svuu = 0.0
    for x, y in body:
        u, v = x - sx, y - sy
        suu += u * u; suv += u * v; svv += v * v
        suuu += u ** 3; svvv += v ** 3; suvv += u * v * v; svuu += v * u * u
    det = suu * svv - suv * suv or 1e-9
    a = 0.5 * (suuu + suvv)
    b = 0.5 * (svvv + svuu)
    uc = (a * svv - b * suv) / det
    vc = (b * suu - a * suv) / det
    r = math.sqrt(uc * uc + vc * vc + (suu + svv) / n)
    return sx + uc, sy + vc, r


def rozdel_rotundu(obrys):
    """Z obrysu (Blender, CCW) oddelí oblúk rotundy na východe: (blok s rovnou tetivou, stred, R, uhol0, uhol1)."""
    n = len(obrys)
    xmax = max(p[0] for p in obrys)
    kand = [p for p in obrys if p[0] > xmax - 12.5]
    cx, cy, r = kruznica(kand)
    for _ in range(3):
        kand = [p for p in obrys if abs(dlzka(p, (cx, cy)) - r) < 1.0 and p[0] > cx - 1.5]
        cx, cy, r = kruznica(kand)
    na = [i for i in range(n) if abs(dlzka(obrys[i], (cx, cy)) - r) < 1.2 and obrys[i][0] > cx - 2.0]
    # súvislý úsek oblúka (indexy idú za sebou, prípadne cez koniec poľa)
    na_set = set(na)
    zac = next(i for i in na if (i - 1) % n not in na_set)
    kon = zac
    while (kon + 1) % n in na_set:
        kon = (kon + 1) % n
    # blok: obrys bez vnútorných bodov oblúka (zac → kon spojí rovná tetiva)
    blok = []
    i = (kon) % n
    while True:
        blok.append(obrys[i])
        if i == zac:
            break
        i = (i + 1) % n
    a0 = math.atan2(obrys[zac][1] - cy, obrys[zac][0] - cx)
    a1 = math.atan2(obrys[kon][1] - cy, obrys[kon][0] - cx)
    while a1 < a0:
        a1 += 2 * math.pi
    return blok, (cx, cy), r, a0, a1, (obrys[zac], obrys[kon])


# --- fasáda bloku -------------------------------------------------------------------

def fasada_bloku(G, M, poly, preskoc=()):
    """Okenné osi po OS_OKNA, lizény medzi osami (2.–6. podlažie), prízemie s vyššími oknami, hlavná rímsa,
    atikové podlažie so štvorcovými oknami. Okná vnorené s ostením."""
    n = len(poly)
    urovne = [0.0, Z_PRIZEMIE] + [Z_PRIZEMIE + V_PODLAZIA * (k + 1) for k in range(POSCHODI)] + [Z_ATIKA_PODL]
    for i in range(n):
        if i in preskoc:
            continue
        a, b = poly[i], poly[(i + 1) % n]
        L = dlzka(a, b)
        if L < 0.3:
            continue
        ux, uy = (b[0] - a[0]) / L, (b[1] - a[1]) / L
        nx, ny = normala(a, b)

        def P(t, z, d=0.0):
            return (a[0] + ux * t - nx * d, a[1] + uy * t - ny * d, z)
        k = int((L - 0.8) // OS_OKNA)
        stredy = [(L - k * OS_OKNA) / 2 + OS_OKNA * (j + 0.5) for j in range(k)] if k >= 1 else []
        for r in range(len(urovne) - 1):
            z0, z1 = urovne[r], urovne[r + 1]
            if r == 0:
                sir, od, do = 2.0, 1.1, Z_PRIZEMIE - 1.0           # prízemie: väčšie okná
            elif r == len(urovne) - 2:
                sir, od, do = 1.3, z0 + 1.2, z0 + 2.5               # atikové podlažie: štvorcové okná
            else:
                sir, od, do = 1.5, z0 + 0.95, z1 - 0.75
            otv = sorted((t - sir / 2, t + sir / 2) for t in stredy)
            x = 0.0
            mat = M['obklad'] if r > 0 else M['obklad_tmavy']
            for (t0, t1) in otv:
                if t0 > x:
                    G.plocha(mat, [P(x, z0), P(t0, z0), P(t0, z1), P(x, z1)])
                G.plocha(mat, [P(t0, z0), P(t1, z0), P(t1, od), P(t0, od)])
                G.plocha(mat, [P(t0, do), P(t1, do), P(t1, z1), P(t0, z1)])
                hl = 0.35
                G.plocha(mat, [P(t0, od), P(t0, od, hl), P(t0, do, hl), P(t0, do)])
                G.plocha(mat, [P(t1, do), P(t1, do, hl), P(t1, od, hl), P(t1, od)])
                G.plocha(mat, [P(t0, do), P(t0, do, hl), P(t1, do, hl), P(t1, do)])
                G.plocha(mat, [P(t1, od), P(t1, od, hl), P(t0, od, hl), P(t0, od)])
                G.plocha(M['okno'], [P(t0, od, hl), P(t1, od, hl), P(t1, do, hl), P(t0, do, hl)])
                # rám: zvislá a vodorovné priečky (mriežka tabúľ)
                tm = (t0 + t1) / 2
                G.plocha(M['ram'], [P(tm - 0.04, od, hl - 0.02), P(tm + 0.04, od, hl - 0.02), P(tm + 0.04, do, hl - 0.02), P(tm - 0.04, do, hl - 0.02)])
                for f in ((0.5,) if r == len(urovne) - 2 else (0.33, 0.66)):
                    zf = od + (do - od) * f
                    G.plocha(M['ram'], [P(t0, zf - 0.03, hl - 0.02), P(t1, zf - 0.03, hl - 0.02), P(t1, zf + 0.03, hl - 0.02), P(t0, zf + 0.03, hl - 0.02)])
                x = t1
            if x < L:
                G.plocha(mat, [P(x, z0), P(L, z0), P(L, z1), P(x, z1)])
        # lizény medzi osami okien (2.–6. podlažie) – ploché, mierne vystupujúce
        for j in range(len(stredy) + 1):
            t = (stredy[0] - OS_OKNA / 2 + OS_OKNA * j) if stredy else L / 2
            if 0.3 < t < L - 0.3:
                c = (a[0] + ux * t + nx * 0.09, a[1] + uy * t + ny * 0.09)
                G.kvader(M['obklad'], c, (ux, uy), 0.55, 0.18, Z_PRIZEMIE, Z_RIMSA - 0.6, vrch=True)
    # rímsy: nad prízemím, hlavná rímsa (výrazná), koruna atiky
    G.pas(M['rimsa'], poly, Z_PRIZEMIE - 0.25, Z_PRIZEMIE, von=0.25)
    G.pas(M['rimsa'], poly, Z_RIMSA - 0.6, Z_RIMSA - 0.25, von=0.3)
    G.pas(M['rimsa'], poly, Z_RIMSA - 0.25, Z_RIMSA + 0.1, von=0.75)
    G.pas(M['rimsa'], poly, Z_ATIKA_PODL - 0.2, Z_ATIKA_PODL + 0.15, von=0.25)
    strecha(G, poly, Z_STRECHA, M['strecha'], M['obklad'], atika=0.9)


# --- rotunda ------------------------------------------------------------------------

def rotunda(G, M, C, R, a0, a1):
    """Polvalec rotundy: sokel so schodmi, arkáda z pilierov, dva rady okien medzi pilastrami, vlys, rímsa, atika."""
    seg = BAY * 3

    def bod(t, r, z):
        u = a0 + (a1 - a0) * t
        return (C[0] + math.cos(u) * r, C[1] + math.sin(u) * r, z)

    def oblukovy_pas(mat, r0, r1, z0, z1, vrch=True):
        # pás po oblúku: vonkajšie líce r1, vrch medzi r0 a r1
        for k in range(seg):
            t0, t1 = k / seg, (k + 1) / seg
            G.plocha(mat, [bod(t1, r1, z0), bod(t0, r1, z0), bod(t0, r1, z1), bod(t1, r1, z1)][::-1])
            if vrch:
                G.plocha(mat, [bod(t0, r0, z1), bod(t1, r0, z1), bod(t1, r1, z1), bod(t0, r1, z1)][::-1])

    # schodiskový sokel: 4 stupne okolo polvalca
    for s in range(4):
        r = R + 1.6 - s * 0.4
        oblukovy_pas(M['obklad_tmavy'], R - 3.2, r, -0.6 + s * R_SOKEL / 4 - (0.0 if s else 0.0), s * R_SOKEL / 4 + R_SOKEL / 4)
    # arkáda: zadná stena (vstupy) v hĺbke 3 m, piliere v líci, strop lodžie
    R_ZAD = R - 3.0
    oblukovy_pas(M['dvere'], R_ZAD - 0.1, R_ZAD, R_SOKEL, Z_ARKADA - 0.4, vrch=False)
    for k in range(seg):
        t0, t1 = k / seg, (k + 1) / seg
        G.plocha(M['podhlad'], [bod(t0, R_ZAD, Z_ARKADA), bod(t1, R_ZAD, Z_ARKADA), bod(t1, R, Z_ARKADA), bod(t0, R, Z_ARKADA)])
    for j in range(BAY + 1):
        t = j / BAY
        p = bod(t, R - 0.7, 0)
        u = a0 + (a1 - a0) * t
        G.kvader(M['obklad'], (p[0], p[1]), (-math.sin(u), math.cos(u)), 1.5, 1.4, R_SOKEL, Z_ARKADA)
    # nad arkádou: rímsový pás, stena s dvoma radmi okien, vlys, rímsa, atika
    oblukovy_pas(M['rimsa'], R - 1.0, R + 0.35, Z_ARKADA, Z_ARKADA + 0.6)
    z_okna = [(Z_ARKADA + 1.4, Z_ARKADA + 3.8), (Z_ARKADA + 5.2, Z_ARKADA + 9.6)]
    z_vlys = (Z_ROT_RIMSA - 1.9, Z_ROT_RIMSA - 0.3)
    for k in range(seg):
        t0, t1 = k / seg, (k + 1) / seg
        okno = k % 3 == 1
        z = Z_ARKADA + 0.6
        rady = z_okna if okno else []
        for (od, do) in rady:
            G.plocha(M['obklad'], [bod(t1, R, z), bod(t0, R, z), bod(t0, R, od), bod(t1, R, od)][::-1])
            # ostenie a sklo
            hl = 0.4
            G.plocha(M['obklad'], [bod(t0, R, od), bod(t0, R - hl, od), bod(t0, R - hl, do), bod(t0, R, do)])
            G.plocha(M['obklad'], [bod(t1, R, do), bod(t1, R - hl, do), bod(t1, R - hl, od), bod(t1, R, od)])
            G.plocha(M['obklad'], [bod(t0, R, do), bod(t1, R, do), bod(t1, R - hl, do), bod(t0, R - hl, do)][::-1])
            G.plocha(M['obklad'], [bod(t0, R, od), bod(t1, R, od), bod(t1, R - hl, od), bod(t0, R - hl, od)])
            G.plocha(M['okno'], [bod(t1, R - hl, od), bod(t0, R - hl, od), bod(t0, R - hl, do), bod(t1, R - hl, do)][::-1])
            tm = (t0 + t1) / 2
            for f in (0.33, 0.66):
                zf = od + (do - od) * f
                G.plocha(M['ram'], [bod(t1, R - hl + 0.02, zf - 0.03), bod(t0, R - hl + 0.02, zf - 0.03), bod(t0, R - hl + 0.02, zf + 0.03), bod(t1, R - hl + 0.02, zf + 0.03)][::-1])
            for tt in (t0 + (t1 - t0) / 3, t0 + 2 * (t1 - t0) / 3):
                G.tram(M['ram'], bod(tt, R - hl + 0.03, od), bod(tt, R - hl + 0.03, do), 0.06)
            z = do
        G.plocha(M['obklad'], [bod(t1, R, z), bod(t0, R, z), bod(t0, R, z_vlys[0]), bod(t1, R, z_vlys[0])][::-1])
        # vlys (mierne vystúpený) – nápis naň
        G.plocha(M['rimsa'], [bod(t1, R + 0.12, z_vlys[0]), bod(t0, R + 0.12, z_vlys[0]), bod(t0, R + 0.12, z_vlys[1]), bod(t1, R + 0.12, z_vlys[1])][::-1])
        G.plocha(M['obklad'], [bod(t1, R, z_vlys[1]), bod(t0, R, z_vlys[1]), bod(t0, R, Z_ROT_RIMSA), bod(t1, R, Z_ROT_RIMSA)][::-1])
    # ploché pilastre medzi oknami (v osi pilierov)
    for j in range(BAY + 1):
        t = j / BAY
        p = bod(t, R + 0.08, 0)
        u = a0 + (a1 - a0) * t
        G.kvader(M['obklad'], (p[0], p[1]), (-math.sin(u), math.cos(u)), 1.1, 0.2, Z_ARKADA + 0.6, z_vlys[0])
    # hlavná rímsa a atika s kvádrikmi
    oblukovy_pas(M['rimsa'], 0.0, R + 0.8, Z_ROT_RIMSA, Z_ROT_RIMSA + 0.45)
    oblukovy_pas(M['obklad'], R - 0.4, R, Z_ROT_RIMSA + 0.45, Z_ROT_ATIKA)
    for j in range(BAY + 1):
        p = bod(j / BAY, R - 0.2, 0)
        u = a0 + (a1 - a0) * j / BAY
        G.kvader(M['rimsa'], (p[0], p[1]), (-math.sin(u), math.cos(u)), 0.9, 0.7, Z_ROT_ATIKA, Z_ROT_ATIKA + 0.7)
    # strecha rotundy (plochá) – polkruh
    stred_body = [bod(k / seg, R - 0.4, Z_ROT_ATIKA - 0.6) for k in range(seg + 1)]
    G.plocha(M['strecha'], [(C[0], C[1], Z_ROT_ATIKA - 0.6)] + stred_body)
    return z_vlys


def napis_na_obluku(G, mat, text, C, R, uhol_stred, z0, vyska):
    """Bronzové písmená nápisu po oblúku (z písma Blendera, každé písmeno natočené k oblúku)."""
    dg = bpy.context.evaluated_depsgraph_get
    pismena = []
    for ch in text:
        if ch == ' ':
            pismena.append((ch, None, vyska * 0.45))
            continue
        cu = bpy.data.curves.new('pismeno', 'FONT')
        cu.body = ch
        cu.size = vyska * 1.35
        cu.extrude = 0.025
        cu.align_x = 'CENTER'
        ob = bpy.data.objects.new('pismeno', cu)
        bpy.context.scene.collection.objects.link(ob)
        ev = ob.evaluated_get(dg())
        me = ev.to_mesh()
        v = [tuple(x.co) for x in me.vertices]
        f = [tuple(p.vertices) for p in me.polygons]
        sirka = (max(x[0] for x in v) - min(x[0] for x in v)) if v else vyska * 0.5
        pismena.append((ch, (v, f), sirka))
        ev.to_mesh_clear()
        bpy.data.objects.remove(ob)
        bpy.data.curves.remove(cu)
    medzera = vyska * 0.22
    W = sum(s for _, _, s in pismena) + medzera * (len(pismena) - 1)
    # čítané zvonka zľava doprava = pozdĺž rastúceho uhla (proti smeru hodín)
    s = -W / 2
    for ch, geo, sir in pismena:
        stred_s = s + sir / 2
        s += sir + medzera
        if not geo:
            continue
        u = uhol_stred + stred_s / R
        N = (math.cos(u), math.sin(u))
        T = (-math.sin(u), math.cos(u))
        v, f = geo
        ymin = min(x[1] for x in v)
        body = [(C[0] + N[0] * (R + 0.14 + lz) + T[0] * lx, C[1] + N[1] * (R + 0.14 + lz) + T[1] * lx, z0 + (ly - ymin))
                for lx, ly, lz in v]
        for poly in f:
            G.plocha(mat, [body[i] for i in poly])


def pylon(G, M, c, smer, z0, vyska=5.2):
    """Vetrací pylón na streche: hranol z obkladu, mrežová hlavica a krycia doska."""
    G.kvader(M['obklad'], c, smer, 2.5, 2.5, z0, z0 + vyska - 1.4)
    G.kvader(M['mreza'], c, smer, 2.3, 2.3, z0 + vyska - 1.4, z0 + vyska - 0.3, vrch=False)
    ux, uy = smer
    vx, vy = -uy, ux
    for s in (-0.8, -0.4, 0.0, 0.4, 0.8):
        for (dx, dy) in ((ux, uy), (vx, vy)):
            px, py = c[0] - dy * s, c[1] + dx * s
            G.kvader(M['rimsa'], (px, py), (dx, dy), 2.55, 0.08, z0 + vyska - 1.4, z0 + vyska - 0.3, vrch=False)
    G.kvader(M['rimsa'], c, smer, 2.9, 2.9, z0 + vyska - 0.3, z0 + vyska)


def aula(G, M, obrys, z0):
    """Presklená valená klenba auly nad strechou (oceľové oblúky, sklo), os pozdĺž dlhšej strany."""
    if len(obrys) < 4:
        return
    hrany = sorted(((dlzka(obrys[i], obrys[(i + 1) % len(obrys)]), i) for i in range(len(obrys))), reverse=True)
    i = hrany[0][1]
    a, b = obrys[i], obrys[(i + 1) % len(obrys)]
    c, d = obrys[(i + 2) % len(obrys)], obrys[(i + 3) % len(obrys)]
    sirka = dlzka(b, c)
    vznos = min(3.6, sirka * 0.28)
    seg = 10
    oblukov = max(6, round(dlzka(a, b) / 2.4))

    def P(t, s):
        # t pozdĺž (a→b), s naprieč (0 = hrana a-b, 1 = hrana d-c)
        x0 = (a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t)
        x1 = (d[0] + (c[0] - d[0]) * t, d[1] + (c[1] - d[1]) * t)
        z = z0 + 0.6 + vznos * math.sin(math.pi * s)
        return (x0[0] + (x1[0] - x0[0]) * s, x0[1] + (x1[1] - x0[1]) * s, z)
    for k in range(seg):
        s0, s1 = k / seg, (k + 1) / seg
        q = [P(0, s0), P(1, s0), P(1, s1), P(0, s1)]
        G.plocha(M['aula'], q[::-1])
        G.plocha(M['aula'], q)
    for j in range(oblukov + 1):
        t = j / oblukov
        for k in range(seg):
            G.tram(M['ocel'], P(t, k / seg), P(t, (k + 1) / seg), 0.09)
    G.tram(M['ocel'], P(0, 0.5), P(1, 0.5), 0.12)
    # čelá klenby (sklo) a nízky múrik pod ňou
    for t in (0, 1):
        body = [P(t, k / seg) for k in range(seg + 1)]
        G.plocha(M['aula'], body)
        G.plocha(M['aula'], body[::-1])
    G.hranol(M['obklad'], obrys, z0, z0 + 0.6, vrch=False)


def postav(obrysy):
    zdroj = obrysy['univerzita-komenskeho']['hlavne'][0]['body']
    stred = stred_obrysu(zdroj)
    obrys = z_hry(zdroj, stred)
    M = materialy()
    G = Geo()
    blok, C, R, a0, a1, (pz, pk) = rozdel_rotundu(obrys)
    print(f'UK: blok {len(blok)} bodov, rotunda R = {R:.2f} m, uhol {math.degrees(a1 - a0):.0f}°')
    # blok (tetiva pri rotunde je hrana pk → pz; jej spodok zakryje rotunda, nad ňou je fasáda)
    fasada_bloku(G, M, blok)
    # rotunda
    z_vlys = rotunda(G, M, C, R, a0, a1)
    napis_na_obluku(G, M['pismo'], 'UNIVERZITA KOMENSKÉHO', C, R, (a0 + a1) / 2, z_vlys[0] + 0.3, 0.95)
    # pylóny po stranách rotundy na streche bloku (4 m dnu od tetivy)
    tx, ty = (pk[0] - pz[0]) / dlzka(pz, pk), (pk[1] - pz[1]) / dlzka(pz, pk)
    nx, ny = -ty, tx    # dnu do bloku (tetiva ide pz → pk pozdĺž oblúka proti smeru hodín)
    if (C[0] + nx * 5 - C[0]) * (sum(p[0] for p in blok) / len(blok) - C[0]) + (ny * 5) * (sum(p[1] for p in blok) / len(blok) - C[1]) < 0:
        nx, ny = -nx, -ny
    for s in (-1, 1):
        p = (C[0] + tx * s * (R + 3.2) + nx * 3.5, C[1] + ty * s * (R + 3.2) + ny * 3.5)
        pylon(G, M, p, (tx, ty), Z_STRECHA)
    # aula
    for cst in obrysy['univerzita-komenskeho'].get('casti', []):
        if 'Aula' in cst['t'].get('name', ''):
            aula(G, M, z_hry(cst['body'], stred), Z_STRECHA)
    return G, [obrys], Z_STRECHA + 5.2, 'univerzita-komenskeho', {'stred': [round(stred[0], 2), round(stred[1], 2)]}
