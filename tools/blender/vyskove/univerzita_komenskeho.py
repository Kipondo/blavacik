# Univerzita Komenského – historická budova na Šafárikovom nám. 6 (F. Krupka, 1930–1937, „moderný klasicizmus“,
# pôvodne Burzový palác). Podklady: napady/pamiatky-podklady.md a prieskum fotiek (Wikimedia Commons, ortofoto
# ZBGIS – len na pozretie); obrys z OSM (way 1383879681, aula 1340711263).
# Hmoty od východu (Šafárikovo nám.) na západ:
#   – rotunda (polvalec R ≈ 12 m), najnižšia, vrch atiky ≈ 20 m: na schodoch arkáda zo 7 hranolových pilierov,
#     6 okenných osí (pilaster v strednej osi), dolný rad nízkych a horný rad vysokých okien, travertínový obklad,
#     nápisy „UNIVERSITAS COMENIANA BRATISLAVENSIS“ nad arkádou a „UNIVERZITA KOMENSKÉHO“ na hornom vlyse,
#     nízka atika s hranolovými podstavcami;
#   – „plecia“ po stranách rotundy: čelo bez okien, rímsa ≈ 18 m, ustúpené horné podlažie so slepými poľami do ≈ 21 m,
#     na bokoch 2 malé okná na podlažie;
#   – hlavný vysoký blok za rotundou (≈ 14 m hlboký): rímsa ≈ 27,5 m, horné podlažie s osami medzi lizénami
#     (hore slepé pole, dole okno), nízka valbová strecha zo šedozeleného plechu za atikou, dva pylóny
#     s hrdzavou mriežkovou korunou so zubatým okrajom;
#   – stredné krídla s aulou (presklená strecha auly), okná v pravidelnej mriežke, horné podlažie so slepými poľami;
#   – západné krídlo (mladšia prístavba) s pásovými oknami a nadstavbou na streche.
# Travertín na rotunde a prízemí, inde okrovo-béžová omietka; rámy na rotunde tmavý bronz, inde biele.

import math

import bpy

from veze import Geo, z_hry, stred_obrysu, odsad, dlzka, normala, strecha, sklo, ccw
from spolocne import material

# rotunda
R_SOKEL = 0.75
Z_ARKADA = 6.0
Z_PAS_ARKADA = 7.0
Z_ROT_VLYS = (17.3, 18.7)
Z_ROT_RIMSA = 19.0
Z_ROT_ATIKA = 20.3
BAY = 6

# zóny pozdĺž osi Z–V (u = 0 v tetive rotundy, smerom na západ záporné)
PLECIA_HLBKA = 7.0
HLAVNY_HLBKA = 14.0
ZAPAD_HLBKA = 32.0
Z_PRIZEMIE = 5.6


def materialy():
    return {
        # „sokel“ v mene → kvádrový kameň v hre (riadky ~0,5 m ako travertín) – js/mapa/pamiatky/kamen-material.js
        'travertin': material('kamen-travertin-sokel-uk', '#c8b894', drsnost=0.8),
        'omietka': material('omietka-uk', '#a89170', drsnost=0.9),
        'omietka_tmava': material('omietka-uk-polia', '#9e8869', drsnost=0.9),
        'rimsa': material('detail-rimsa-uk', '#b9a27c', drsnost=0.8),
        'ram_bronz': material('detail-ram-bronz', '#3a3129', drsnost=0.5, kov=0.6),
        'ram_biely': material('detail-ram-biely', '#e6e6e2', drsnost=0.5),
        'okno': sklo('okna-uk', '#2f3a40', drsnost=0.15, kov=0.6),
        'dvere': material('dvere-drevo-uk', '#4a3426', drsnost=0.6),
        'strecha': material('strecha-uk', '#b9bab5', drsnost=0.95),
        'plech': material('strecha-plech-uk', '#5e776c', drsnost=0.5, kov=0.4),
        'strecha_rot': material('strecha-rotunda', '#8c8f88', drsnost=0.95),
        'pismo': material('detail-pismo-bronz', '#2e2a24', drsnost=0.45, kov=0.7),
        'aula': sklo('aula-sklo', '#7e9ea6', drsnost=0.05, kov=0.55),
        'ocel': material('detail-ocel', '#3b3f42', drsnost=0.5, kov=0.6),
        'mreza': material('detail-mreza-hrdzava', '#5a3a32', drsnost=0.5, kov=0.6),
        'podhlad': material('podhlad-arkady', '#c2b08c', drsnost=0.9),
        'parapet': material('parapety-pristavba', '#cfc4ad', drsnost=0.8),
    }


# --- pôdorys -------------------------------------------------------------------------

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
    return sx + uc, sy + vc, math.sqrt(uc * uc + vc * vc + (suu + svv) / n)


def rozdel_rotundu(obrys):
    """Oddelí oblúk rotundy na východe: (blok s rovnou tetivou, stred, R, uhol0, uhol1, konce tetivy)."""
    n = len(obrys)
    xmax = max(p[0] for p in obrys)
    kand = [p for p in obrys if p[0] > xmax - 12.5]
    cx, cy, r = kruznica(kand)
    for _ in range(3):
        kand = [p for p in obrys if abs(dlzka(p, (cx, cy)) - r) < 1.0 and p[0] > cx - 1.5]
        cx, cy, r = kruznica(kand)
    na = {i for i in range(n) if abs(dlzka(obrys[i], (cx, cy)) - r) < 1.2 and obrys[i][0] > cx - 2.0}
    zac = next(i for i in na if (i - 1) % n not in na)
    kon = zac
    while (kon + 1) % n in na:
        kon = (kon + 1) % n
    blok = []
    i = kon
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


def zony(blok, stred_tetivy, e):
    """Rozreže blok na pásy kolmo na os Z–V (u = (p − stred tetivy)·e): plecia, hlavný blok, stred, západ."""
    from shapely.geometry import Polygon as SP
    from shapely.geometry.polygon import orient
    P = SP(blok).buffer(0)
    us = [(p[0] - stred_tetivy[0]) * e[0] + (p[1] - stred_tetivy[1]) * e[1] for p in blok]
    umin = min(us)
    vx, vy = -e[1], e[0]

    def pas(u0, u1):
        q = [(stred_tetivy[0] + e[0] * u + vx * v, stred_tetivy[1] + e[1] * u + vy * v)
             for u, v in ((u0, -200), (u1, -200), (u1, 200), (u0, 200))]
        g = P.intersection(SP(q))
        out = []
        for h in (list(g.geoms) if hasattr(g, 'geoms') else [g]):
            if h.geom_type == 'Polygon' and h.area > 20:
                h = orient(h.simplify(0.05), 1.0)
                out.append(ccw([tuple(c) for c in list(h.exterior.coords)[:-1]]))
        return out
    return {
        'plecia': pas(-PLECIA_HLBKA, 1.0),
        'hlavny': pas(-PLECIA_HLBKA - HLAVNY_HLBKA, -PLECIA_HLBKA),
        'stred': pas(umin + ZAPAD_HLBKA, -PLECIA_HLBKA - HLAVNY_HLBKA),
        'zapad': pas(umin - 1.0, umin + ZAPAD_HLBKA),
    }


# --- fasády -------------------------------------------------------------------------

def otvor(G, mat_steny, mat_vypln, P, t0, t1, z0, z1, hl, ram=None, mriezka=(1, 2)):
    """Zapustený otvor v stene (ostenie + výplň v hĺbke hl), voliteľne s rámom a mriežkou tabúľ."""
    G.plocha(mat_steny, [P(t0, z0), P(t0, z0, hl), P(t0, z1, hl), P(t0, z1)])
    G.plocha(mat_steny, [P(t1, z1), P(t1, z1, hl), P(t1, z0, hl), P(t1, z0)])
    G.plocha(mat_steny, [P(t0, z1), P(t0, z1, hl), P(t1, z1, hl), P(t1, z1)])
    G.plocha(mat_steny, [P(t1, z0), P(t1, z0, hl), P(t0, z0, hl), P(t0, z0)])
    G.plocha(mat_vypln, [P(t0, z0, hl), P(t1, z0, hl), P(t1, z1, hl), P(t0, z1, hl)])
    if ram is None:
        return
    st, ri = mriezka
    for s in range(1, st):
        t = t0 + (t1 - t0) * s / st
        G.plocha(ram, [P(t - 0.035, z0, hl - 0.02), P(t + 0.035, z0, hl - 0.02), P(t + 0.035, z1, hl - 0.02), P(t - 0.035, z1, hl - 0.02)])
    for s in range(1, ri):
        z = z0 + (z1 - z0) * s / ri
        G.plocha(ram, [P(t0, z - 0.03, hl - 0.02), P(t1, z - 0.03, hl - 0.02), P(t1, z + 0.03, hl - 0.02), P(t0, z + 0.03, hl - 0.02)])


def fasada(G, M, poly, podlazia, os_okna=3.5, typ_hrany=None, lizeny=None, preskoc=()):
    """Fasáda časti: podlažia = [(z0, z1, typ)], typ okna podľa podlažia (typ_hrany(n, typ) ho môže zmeniť,
    napr. čelo pliec bez okien). Typy: 'prizemie', 'okno', 'okno_male', 'slepe', 'slepe_okno', 'pas', 'plna'."""
    n = len(poly)
    for i in range(n):
        if i in preskoc:
            continue
        a, b = poly[i], poly[(i + 1) % n]
        L = dlzka(a, b)
        if L < 0.4:
            continue
        ux, uy = (b[0] - a[0]) / L, (b[1] - a[1]) / L
        nx, ny = normala(a, b)

        def P(t, z, d=0.0):
            return (a[0] + ux * t - nx * d, a[1] + uy * t - ny * d, z)
        for (z0, z1, typ) in podlazia:
            typ = typ_hrany((nx, ny), typ) if typ_hrany else typ
            stena = M['travertin'] if typ == 'prizemie' else M['omietka']
            if typ == 'plna':
                G.plocha(stena, [P(0, z0), P(L, z0), P(L, z1), P(0, z1)])
                continue
            if typ == 'pas':
                # pásové okno cez celú hranu, parapetný pás pod ním
                od, do = z0 + 1.0, z1 - 0.45
                G.plocha(M['parapet'], [P(0, z0), P(L, z0), P(L, od), P(0, od)])
                G.plocha(M['parapet'], [P(0, do), P(L, do), P(L, z1), P(0, z1)])
                G.plocha(M['okno'], [P(0, od, 0.15), P(L, od, 0.15), P(L, do, 0.15), P(0, do, 0.15)])
                for k in range(1, int(L / 1.6)):
                    t = L * k / int(L / 1.6)
                    G.plocha(M['ram_biely'], [P(t - 0.04, od, 0.13), P(t + 0.04, od, 0.13), P(t + 0.04, do, 0.13), P(t - 0.04, do, 0.13)])
                continue
            osi = os_okna if typ != 'okno_male' else max(2.6, os_okna * 0.8)
            k = int((L - 0.6) // osi)
            if k < 1:
                G.plocha(stena, [P(0, z0), P(L, z0), P(L, z1), P(0, z1)])
                continue
            stredy = [(L - k * osi) / 2 + osi * (j + 0.5) for j in range(k)]
            if typ == 'prizemie':
                sir, od, do, vypln, ram, mr = 1.8, z0 + 1.0, z1 - 0.8, M['okno'], M['ram_biely'], (2, 3)
            elif typ == 'okno':
                sir, od, do, vypln, ram, mr = 1.3, z0 + 0.9, z1 - 0.7, M['okno'], M['ram_biely'], (2, 3)
            elif typ == 'okno_male':
                sir, od, do, vypln, ram, mr = 1.0, z0 + 1.0, z1 - 0.9, M['okno'], M['ram_biely'], (2, 2)
            else:   # slepé polia (horné podlažie) – zapustená plocha, pri 'slepe_okno' dole okno
                sir, od, do, vypln, ram, mr = osi * 0.62, z0 + 0.45, z1 - 0.35, M['omietka_tmava'], None, (1, 1)
            x = 0.0
            for t in stredy:
                t0, t1 = t - sir / 2, t + sir / 2
                G.plocha(stena, [P(x, z0), P(t0, z0), P(t0, z1), P(x, z1)])
                G.plocha(stena, [P(t0, z0), P(t1, z0), P(t1, od), P(t0, od)])
                G.plocha(stena, [P(t0, do), P(t1, do), P(t1, z1), P(t0, z1)])
                if typ == 'slepe_okno':
                    zo = od + 1.7
                    otvor(G, stena, M['okno'], P, t - 0.55, t + 0.55, od, zo, 0.25, M['ram_biely'], (2, 2))
                    G.plocha(stena, [P(t0, od), P(t - 0.55, od), P(t - 0.55, zo), P(t0, zo)])
                    G.plocha(stena, [P(t + 0.55, od), P(t1, od), P(t1, zo), P(t + 0.55, zo)])
                    otvor(G, stena, M['omietka_tmava'], P, t0, t1, zo + 0.25, do, 0.12)
                    G.plocha(stena, [P(t0, zo), P(t1, zo), P(t1, zo + 0.25), P(t0, zo + 0.25)])
                else:
                    otvor(G, stena, vypln, P, t0, t1, od, do, 0.3 if ram else 0.12, ram, mr)
                x = t1
            G.plocha(stena, [P(x, z0), P(L, z0), P(L, z1), P(x, z1)])
            # lizény medzi osami (len nad prízemím pri pravidelných oknách a slepých poliach)
            if lizeny and typ in lizeny:
                for j in range(k + 1):
                    t = stredy[0] - osi / 2 + osi * j
                    if 0.3 < t < L - 0.3:
                        c = (a[0] + ux * t + nx * 0.07, a[1] + uy * t + ny * 0.07)
                        G.kvader(M['omietka'], c, (ux, uy), 0.5, 0.14, z0, z1, vrch=(typ in ('slepe', 'slepe_okno')))


def rimsy(G, M, poly, z, von=0.6):
    G.pas(M['rimsa'], poly, z - 0.45, z - 0.15, von=von * 0.4)
    G.pas(M['rimsa'], poly, z - 0.15, z + 0.12, von=von)


def valba(G, mat, poly, z, vyska, vnor):
    I = odsad(poly, -vnor)
    n = len(poly)
    for i in range(n):
        j = (i + 1) % n
        G.plocha(mat, [(poly[i][0], poly[i][1], z), (poly[j][0], poly[j][1], z), (I[j][0], I[j][1], z + vyska), (I[i][0], I[i][1], z + vyska)])
    G.vodorovna(mat, I, z + vyska)


# --- rotunda ------------------------------------------------------------------------

def rotunda(G, M, C, R, a0, a1):
    seg = BAY * 3

    def bod(t, r, z):
        u = a0 + (a1 - a0) * t
        return (C[0] + math.cos(u) * r, C[1] + math.sin(u) * r, z)

    def oblukovy_pas(mat, r0, r1, z0, z1, vrch=True):
        for k in range(seg):
            t0, t1 = k / seg, (k + 1) / seg
            G.plocha(mat, [bod(t0, r1, z0), bod(t1, r1, z0), bod(t1, r1, z1), bod(t0, r1, z1)])
            if vrch:
                G.plocha(mat, [bod(t0, r1, z1), bod(t1, r1, z1), bod(t1, r0, z1), bod(t0, r0, z1)])

    T = M['travertin']
    for s in range(5):    # schody cez celú šírku
        oblukovy_pas(T, R - 3.2, R + 1.8 - s * 0.4, -0.6, (s + 1) * R_SOKEL / 5)
    R_ZAD = R - 3.0
    oblukovy_pas(M['dvere'], R_ZAD - 0.1, R_ZAD, R_SOKEL, Z_ARKADA - 0.5, vrch=False)
    for k in range(seg):
        t0, t1 = k / seg, (k + 1) / seg
        G.plocha(M['podhlad'], [bod(t1, R_ZAD, Z_ARKADA), bod(t0, R_ZAD, Z_ARKADA), bod(t0, R, Z_ARKADA), bod(t1, R, Z_ARKADA)])
    for j in range(BAY + 1):
        t = j / BAY
        p = bod(t, R - 0.8, 0)
        u = a0 + (a1 - a0) * t
        G.kvader(T, (p[0], p[1]), (-math.sin(u), math.cos(u)), 1.6, 1.6, R_SOKEL, Z_ARKADA)
    # pás nad arkádou (menší nápis) a rímsa
    oblukovy_pas(T, R - 1.0, R + 0.2, Z_ARKADA, Z_PAS_ARKADA)
    oblukovy_pas(M['rimsa'], R - 0.5, R + 0.4, Z_PAS_ARKADA, Z_PAS_ARKADA + 0.3)
    # okná: v strede každého poľa (stredná os je pilaster) – dolný rad nízky, horný vysoký
    rady = [(Z_PAS_ARKADA + 0.9, Z_PAS_ARKADA + 3.7, (3, 2)), (Z_PAS_ARKADA + 5.1, Z_ROT_VLYS[0] - 0.4, (3, 4))]
    for k in range(seg):
        t0, t1 = k / seg, (k + 1) / seg
        z = Z_PAS_ARKADA + 0.3
        if k % 3 == 1:
            for (od, do, mr) in rady:
                G.plocha(T, [bod(t0, R, z), bod(t1, R, z), bod(t1, R, od), bod(t0, R, od)])
                hl = 0.4
                G.plocha(T, [bod(t0, R, od), bod(t0, R - hl, od), bod(t0, R - hl, do), bod(t0, R, do)][::-1])
                G.plocha(T, [bod(t1, R, do), bod(t1, R - hl, do), bod(t1, R - hl, od), bod(t1, R, od)][::-1])
                G.plocha(T, [bod(t0, R, do), bod(t1, R, do), bod(t1, R - hl, do), bod(t0, R - hl, do)])
                G.plocha(T, [bod(t1, R, od), bod(t0, R, od), bod(t0, R - hl, od), bod(t1, R - hl, od)])
                G.plocha(M['okno'], [bod(t0, R - hl, od), bod(t1, R - hl, od), bod(t1, R - hl, do), bod(t0, R - hl, do)])
                st, ri = mr
                for s in range(1, ri):
                    zf = od + (do - od) * s / ri
                    G.tram(M['ram_bronz'], bod(t0, R - hl + 0.03, zf), bod(t1, R - hl + 0.03, zf), 0.07)
                for s in range(1, st):
                    tt = t0 + (t1 - t0) * s / st
                    G.tram(M['ram_bronz'], bod(tt, R - hl + 0.03, od), bod(tt, R - hl + 0.03, do), 0.07)
                z = do
        G.plocha(T, [bod(t0, R, z), bod(t1, R, z), bod(t1, R, Z_ROT_VLYS[0]), bod(t0, R, Z_ROT_VLYS[0])])
        G.plocha(T, [bod(t0, R + 0.1, Z_ROT_VLYS[0]), bod(t1, R + 0.1, Z_ROT_VLYS[0]), bod(t1, R + 0.1, Z_ROT_VLYS[1]), bod(t0, R + 0.1, Z_ROT_VLYS[1])])
        G.plocha(T, [bod(t0, R, Z_ROT_VLYS[1]), bod(t1, R, Z_ROT_VLYS[1]), bod(t1, R, Z_ROT_RIMSA), bod(t0, R, Z_ROT_RIMSA)])
    # široké ploché pilastre na osiach pilierov
    for j in range(BAY + 1):
        p = bod(j / BAY, R + 0.08, 0)
        u = a0 + (a1 - a0) * j / BAY
        G.kvader(T, (p[0], p[1]), (-math.sin(u), math.cos(u)), 2.3, 0.18, Z_PAS_ARKADA + 0.3, Z_ROT_VLYS[0])
    # rímsa, nízka plná atika s hranolovými podstavcami, plochá strecha
    oblukovy_pas(M['rimsa'], 0.0, R + 0.75, Z_ROT_RIMSA, Z_ROT_RIMSA + 0.4)
    oblukovy_pas(T, R - 0.4, R, Z_ROT_RIMSA + 0.4, Z_ROT_ATIKA)
    for j in range(BAY + 1):
        p = bod(j / BAY, R - 0.3, 0)
        u = a0 + (a1 - a0) * j / BAY
        G.kvader(T, (p[0], p[1]), (-math.sin(u), math.cos(u)), 1.0, 1.0, Z_ROT_ATIKA, Z_ROT_ATIKA + 0.8)
    G.plocha(M['strecha_rot'], [(C[0], C[1], Z_ROT_ATIKA - 0.6)] + [bod(k / seg, R - 0.4, Z_ROT_ATIKA - 0.6) for k in range(seg + 1)])


def napis_na_obluku(G, mat, text, C, R, uhol_stred, z0, vyska, medzera=0.22):
    """Bronzové písmená po oblúku (z písma Blendera, každé písmeno natočené k oblúku)."""
    dg = bpy.context.evaluated_depsgraph_get
    pismena = []
    for ch in text:
        if ch == ' ':
            pismena.append((None, vyska * 0.45))
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
        pismena.append(((v, f), sirka))
        ev.to_mesh_clear()
        bpy.data.objects.remove(ob)
        bpy.data.curves.remove(cu)
    med = vyska * medzera
    W = sum(s for _, s in pismena) + med * (len(pismena) - 1)
    s = -W / 2
    for geo, sir in pismena:
        stred_s = s + sir / 2
        s += sir + med
        if not geo:
            continue
        u = uhol_stred + stred_s / R
        N = (math.cos(u), math.sin(u))
        Tt = (-math.sin(u), math.cos(u))
        v, f = geo
        ymin = min(x[1] for x in v)
        body = [(C[0] + N[0] * (R + 0.14 + lz) + Tt[0] * lx, C[1] + N[1] * (R + 0.14 + lz) + Tt[1] * lx, z0 + (ly - ymin))
                for lx, ly, lz in v]
        for poly in f:
            G.plocha(mat, [body[i] for i in poly])


def pylon(G, M, c, smer, z0, z_vrch_driek):
    """Pylón: omietaný hranol 2,1 m so zapustenými poľami, dve odstupňované dosky, hrdzavá mriežková koruna
    so zubatým okrajom (4 zuby na stranu)."""
    ux, uy = smer
    vx, vy = -uy, ux
    G.kvader(M['omietka'], c, smer, 2.1, 2.1, z0, z_vrch_driek)
    for (dx, dy) in ((ux, uy), (-ux, -uy), (vx, vy), (-vx, -vy)):
        p = (c[0] + dx * 1.06, c[1] + dy * 1.06)
        G.kvader(M['omietka_tmava'], p, (-dy, dx), 1.0, 0.02, z0 + 1.0, z_vrch_driek - 0.6, vrch=False)
    G.kvader(M['rimsa'], c, smer, 2.4, 2.4, z_vrch_driek, z_vrch_driek + 0.15)
    G.kvader(M['rimsa'], c, smer, 2.1, 2.1, z_vrch_driek + 0.15, z_vrch_driek + 0.3)
    z = z_vrch_driek + 0.3
    G.kvader(M['mreza'], c, smer, 1.8, 1.8, z, z + 1.2, vrch=False)
    for s in range(-5, 6):
        o = s * 0.16
        for (dx, dy, ox, oy) in ((ux, uy, vx, vy), (vx, vy, ux, uy)):
            for strana in (-0.9, 0.9):
                p = (c[0] + ox * strana + dx * o, c[1] + oy * strana + dy * o)
                G.kvader(M['mreza'], p, (dx, dy), 0.05, 0.05, z, z + 1.2, vrch=False)
    for (dx, dy, ox, oy) in ((ux, uy, vx, vy), (vx, vy, ux, uy)):
        for strana in (-0.88, 0.88):
            for zub in range(4):
                o = -0.68 + zub * 0.45
                p = (c[0] + ox * strana + dx * o, c[1] + oy * strana + dy * o)
                G.kvader(M['mreza'], p, (dx, dy), 0.22, 0.08, z + 1.2, z + 1.5)


def aula(G, M, obrys, z0):
    """Presklená strecha auly: nízka sedlová/segmentová, hrebeň pozdĺž dlhšej strany, husté priečne rebrá."""
    if len(obrys) < 4:
        return
    hrany = sorted(((dlzka(obrys[i], obrys[(i + 1) % len(obrys)]), i) for i in range(len(obrys))), reverse=True)
    i = hrany[0][1]
    a, b = obrys[i], obrys[(i + 1) % len(obrys)]
    c, d = obrys[(i + 2) % len(obrys)], obrys[(i + 3) % len(obrys)]
    vznos, seg = 2.6, 8
    oblukov = max(8, round(dlzka(a, b) / 1.4))

    def P(t, s):
        x0 = (a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t)
        x1 = (d[0] + (c[0] - d[0]) * t, d[1] + (c[1] - d[1]) * t)
        return (x0[0] + (x1[0] - x0[0]) * s, x0[1] + (x1[1] - x0[1]) * s, z0 + 0.5 + vznos * math.sin(math.pi * s))
    for k in range(seg):
        s0, s1 = k / seg, (k + 1) / seg
        q = [P(0, s0), P(1, s0), P(1, s1), P(0, s1)]
        G.plocha(M['aula'], q[::-1])
        G.plocha(M['aula'], q)
    for j in range(oblukov + 1):
        t = j / oblukov
        for k in range(seg):
            G.tram(M['ocel'], P(t, k / seg), P(t, (k + 1) / seg), 0.07)
    G.tram(M['ocel'], P(0, 0.5), P(1, 0.5), 0.12)
    for t in (0, 1):
        body = [P(t, k / seg) for k in range(seg + 1)]
        G.plocha(M['aula'], body)
        G.plocha(M['aula'], body[::-1])
    G.hranol(M['omietka'], obrys, z0, z0 + 0.5, vrch=False)


def postav(obrysy):
    zdroj = obrysy['univerzita-komenskeho']['hlavne'][0]['body']
    stred = stred_obrysu(zdroj)
    obrys = z_hry(zdroj, stred)
    M = materialy()
    G = Geo()
    blok, C, R, a0, a1, (pz, pk) = rozdel_rotundu(obrys)
    st = ((pz[0] + pk[0]) / 2, (pz[1] + pk[1]) / 2)
    # os Z–V = kolmica na tetivu smerom k vrcholu rotundy (stred polkruhu leží na tetive, preto nie C − st)
    lt = dlzka(pz, pk) or 1
    e = (-(pk[1] - pz[1]) / lt, (pk[0] - pz[0]) / lt)
    uv = (a0 + a1) / 2
    vrchol = (C[0] + math.cos(uv) * R, C[1] + math.sin(uv) * R)
    if (vrchol[0] - st[0]) * e[0] + (vrchol[1] - st[1]) * e[1] < 0:
        e = (-e[0], -e[1])
    Z = zony(blok, st, e)
    print(f'UK: rotunda R = {R:.2f} m, zóny ' + ', '.join(f'{k} {len(v)}' for k, v in Z.items()))

    def cela_na_vychod(nrm, typ):
        return 'plna' if nrm[0] * e[0] + nrm[1] * e[1] > 0.7 and typ != 'prizemie' else typ

    # plecia: prízemie z travertínu, čelo bez okien, boky 2 malé okná na podlažie, rímsa 18 m, horné podlažie
    for p in Z['plecia']:
        pod = [(0.0, Z_PRIZEMIE, 'prizemie')] + [(Z_PRIZEMIE + 3.1 * k, Z_PRIZEMIE + 3.1 * (k + 1), 'okno_male') for k in range(4)]
        fasada(G, M, p, pod, os_okna=3.2, typ_hrany=cela_na_vychod)
        rimsy(G, M, p, 18.0, von=0.55)
        horne = odsad(p, -0.8)
        fasada(G, M, horne, [(18.0, 20.8, 'slepe')], os_okna=2.6, lizeny=('slepe',))
        G.pas(M['rimsa'], horne, 20.8, 21.1, von=0.2)
        strecha(G, horne, 21.1, M['strecha'], M['omietka'], atika=0.4)
    # hlavný blok: mriežka okien, horné podlažie (slepé pole + okno), rímsa 27,5 m, valba z plechu, pylóny
    for p in Z['hlavny']:
        pod = [(0.0, Z_PRIZEMIE, 'prizemie')] + [(Z_PRIZEMIE + 3.6 * k, Z_PRIZEMIE + 3.6 * (k + 1), 'okno') for k in range(5)] \
            + [(Z_PRIZEMIE + 18.0, 27.5, 'slepe_okno')]
        fasada(G, M, p, pod, os_okna=2.8, lizeny=('okno', 'slepe_okno'))
        rimsy(G, M, p, 27.5, von=0.5)
        strecha(G, p, 27.5, M['strecha'], M['omietka'], atika=0.9)
        valba(G, M['plech'], odsad(p, -0.8), 27.6, 1.8, 4.0)
    # pylóny na východnom okraji hlavného bloku, na severnom a južnom konci (pri spoji rotundy a pliec)
    tx, ty = (pk[0] - pz[0]) / dlzka(pz, pk), (pk[1] - pz[1]) / dlzka(pz, pk)
    for s in (-1, 1):
        c = (st[0] + tx * s * (R + 2.0) - e[0] * (PLECIA_HLBKA + 1.3), st[1] + ty * s * (R + 2.0) - e[1] * (PLECIA_HLBKA + 1.3))
        pylon(G, M, c, (tx, ty), 27.5, 29.9)
    # stredné krídla: mriežka okien, horné podlažie so slepými poľami, rímsa 24,5 m
    for p in Z['stred']:
        pod = [(0.0, Z_PRIZEMIE, 'prizemie')] + [(Z_PRIZEMIE + 3.5 * k, Z_PRIZEMIE + 3.5 * (k + 1), 'okno') for k in range(4)] \
            + [(Z_PRIZEMIE + 14.0, 24.5, 'slepe')]
        fasada(G, M, p, pod, os_okna=3.5, lizeny=('slepe',))
        rimsy(G, M, p, 24.5, von=0.5)
        strecha(G, p, 24.5, M['strecha'], M['omietka'], atika=0.9)
    # západná prístavba: pásové okná, nadstavba na streche
    for p in Z['zapad']:
        pod = [(0.0, 4.2, 'pas')] + [(4.2 + 3.3 * k, 4.2 + 3.3 * (k + 1), 'pas') for k in range(6)]
        fasada(G, M, p, pod)
        strecha(G, p, 24.0, M['strecha'], M['parapet'], atika=0.8)
        cx = sum(q[0] for q in p) / len(p)
        cy = sum(q[1] for q in p) / len(p)
        G.kvader(M['parapet'], (cx, cy), (tx, ty), 30.0, 11.0, 24.0, 27.2)
    # rotunda s nápismi
    rotunda(G, M, C, R, a0, a1)
    uc = (a0 + a1) / 2
    napis_na_obluku(G, M['pismo'], 'UNIVERZITA KOMENSKÉHO', C, R, uc, Z_ROT_VLYS[0] + 0.25, 0.95)
    napis_na_obluku(G, M['pismo'], 'UNIVERSITAS COMENIANA BRATISLAVENSIS', C, R + 0.12, uc, Z_ARKADA + 0.32, 0.42)
    # anténa/bleskozvod za rotundou
    G.valec(M['ocel'], (st[0] - e[0] * 3, st[1] - e[1] * 3), 0.06, 27.5, 31.5, seg=6)
    # aula
    for cst in obrysy['univerzita-komenskeho'].get('casti', []):
        if 'Aula' in cst['t'].get('name', ''):
            aula(G, M, z_hry(cst['body'], stred), 24.5)
    return G, [obrys], 31.6, 'univerzita-komenskeho', {'stred': [round(stred[0], 2), round(stred[1], 2)]}
