# Nivy (2021, HB Reavis; #132) – nákupné centrum s autobusovou stanicou v podzemí a parkom na streche.
# Prieskum (napady/pamiatky-podklady.md – Nivy): obrys ~349 × 151 m (OSM 829898609), 3 obchodné podlažia,
# strešný park na úrovni ~21 m (laser), východná tretina strechy je otvorené parkovisko. Fasáda nad prízemím je
# takmer slepá – veľké béžové panely nepravidelných šírok; na Mlynských nivách tri presklené výbežky (reštaurácie
# na 2. podlaží) s bielym zaobleným pásom nad sklom. Západný hlavný vstup: tenká biela strieška ~50 × 25 m
# s presklenou trojuholníkovou mriežkou na 4 šikmých stĺpoch v tvare Y a celopresklená vstupná hala.
# Na streche: bežecká dráha 533 m (OSM 1579717717 = os overená leteckou fotkou; ~2 m, tmavočervená), popri nej
# dláždený chodník 3–4 m, trávnik, >130 stromov, svetlík v tvare J (~105 × 12 m rameno, oblúk a ~55 m severné
# rameno), pílovitá strecha nad halou (6 šedov, presklené na sever, fotovoltika), zapustený dvor (~75 × 37 m)
# s drevenými sedacími schodmi, drevené valcové pavilóny, hrdzavé kabíny výťahov, technika, ihrisko so „slnkom“.
# Podklady z OSM: tools/blender/osm_nivy.py → tools/blender/data/nivy.json. Nápisy (logo „nivy“) sa nemodelujú.

import json
import math
import os
import random

import shapely
from shapely.geometry import Polygon

from veze import Geo, z_hry, ccw, odsad, dlzka, stred_obrysu, zavesova_stena, rozdel, sklo
from spolocne import material

TU = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LAT0, LON0 = 48.1435, 17.1077
KX = 111320 * math.cos(math.radians(LAT0))
KZ = 111132

Z_PARK = 21.0                 # strešný park (laser ~21 m nad Mlynskými nivami)
Z_PRIZEMIE = 4.5              # tmavý pás prízemia
Z_DVOR = 8.4                  # podlaha zapusteného dvora (2. podlažie)
Z_VYB = (8.4, 12.6)           # sklo výbežkov (reštaurácie na 2. podlaží), nad ním biely pás po strechu
Z_STRIESKA = 18.0             # spodok západnej striešky
VYSKY = {'pas': 25.5, 'technika': 25.2, 'technika-siva': 28.8, 'kabina': 25.0, 'pavilon': 25.5}
# svetlík v tvare J (letecká fotka, ±1,5 m): západný koniec osi ramena, vnútorný roh J (západný okraj severného
# ramena) a severný koniec
SVETLIK = {'zapad': (48.146635, 17.127795), 'roh': (48.146535, 17.129216), 'sever': (48.146899, 17.129454)}
SVETLIK_SIRKA = (11.6, 13.0)  # m – rameno, severné rameno
# presklený otvor striešky (rohy z leteckej fotky)
OTVOR = [(48.146624, 17.126993), (48.146525, 17.126896), (48.146406, 17.127200), (48.146492, 17.127284)]


def hra(lat, lon):
    return [(lon - LON0) * KX, -(lat - LAT0) * KZ]


def trojuholniky(G, mat, poly, z):
    """Vodorovná plocha z mnohouholníka (aj s otvormi) – zviazaná Delaunayho triangulácia."""
    for t in shapely.constrained_delaunay_triangles(poly).geoms:
        b = list(t.exterior.coords)[:3]
        if (b[1][0] - b[0][0]) * (b[2][1] - b[0][1]) - (b[1][1] - b[0][1]) * (b[2][0] - b[0][0]) < 0:
            b = [b[0], b[2], b[1]]
        G.plocha(mat, [(p[0], p[1], z) for p in b])


def pruh(G, mat, c, w0, w1, z):
    """Pás pozdĺž uzavretej CCW krivky c medzi odsadením w0 a w1 (kladné = von), normála nahor."""
    I, O = odsad(c, w0), odsad(c, w1)
    n = len(c)
    for i in range(n):
        j = (i + 1) % n
        G.plocha(mat, [(O[i][0], O[i][1], z), (O[j][0], O[j][1], z), (I[j][0], I[j][1], z), (I[i][0], I[i][1], z)])


def kupola(G, mat, c, r, z, vyska=None, seg=10, prs=5):
    """Pologuľa (elipsoid) z obdĺžnikov – koruna stromu, slnko na ihrisku."""
    vyska = vyska or r
    for a in range(prs):
        t0, t1 = a / prs * math.pi / 2, (a + 1) / prs * math.pi / 2
        for s in range(seg):
            f0, f1 = s / seg * 2 * math.pi, (s + 1) / seg * 2 * math.pi
            p = lambda t, f: (c[0] + r * math.cos(t) * math.cos(f), c[1] + r * math.cos(t) * math.sin(f), z + vyska * math.sin(t))
            G.plocha(mat, [p(t0, f0), p(t0, f1), p(t1, f1), p(t1, f0)])


def postav(_obrysy):
    with open(os.path.join(TU, 'data', 'nivy.json'), encoding='utf-8') as f:
        d = json.load(f)
    stred = stred_obrysu(d['hlavny'])
    lok = lambda b: z_hry(b, stred)                                       # obrys → CCW v Blenderi
    bod = lambda p: (p[0] - stred[0], -(p[1] - stred[1]))
    rnd = random.Random(132)

    bezova = material('nivy-panely', '#ddd0b4', drsnost=0.75)
    skara = material('nivy-skara', '#a99d86', drsnost=0.8)
    tmava = material('nivy-prizemie', '#5f5c57', drsnost=0.7)
    biela = material('nivy-biela', '#f1f0eb', drsnost=0.5)
    sklo_v = sklo('nivy-sklo', '#9fbccc', drsnost=0.04, kov=0.85)
    sklo_h = sklo('nivy-sklo-hala', '#a8bcc4', drsnost=0.03, kov=0.8)
    ram = material('nivy-ram', '#3d4245', drsnost=0.4, kov=0.6)
    plosina = material('nivy-plosina', '#9a9894', drsnost=0.95)
    trava = material('nivy-trava', '#5f7f3c', drsnost=1.0)
    draha_m = material('nivy-draha', '#8a3328', drsnost=0.9)
    dlazba = material('nivy-dlazba', '#c9c6be', drsnost=0.9)
    drevo = material('nivy-drevo', '#a66a35', drsnost=0.85)
    hrdza = material('nivy-kabina', '#8b4a2b', drsnost=0.8)
    zelen_s = material('nivy-zelena-strecha', '#6f8a46', drsnost=1.0)
    technika = material('nivy-technika', '#3a4447', drsnost=0.6, kov=0.3)
    siva = material('nivy-technika-siva', '#9a9c9c', drsnost=0.5, kov=0.4)
    plech = material('nivy-plech', '#cfd2d2', drsnost=0.45, kov=0.5)
    fv = material('nivy-fotovoltika', '#283547', drsnost=0.2, kov=0.5)
    zlta = material('nivy-zlta', '#e6b12a', drsnost=0.6)
    ocel = material('nivy-ocel', '#8f9498', drsnost=0.4, kov=0.6)
    koruna = material('nivy-koruna', '#4f6b33', drsnost=0.95)
    kmen = material('nivy-kmen', '#5a4636', drsnost=0.95)

    G = Geo()
    H = lok(d['hlavny'])
    dvor = lok(d['dvor'])
    vybezky = [lok(v) for v in d['vybezky']]
    strieska = lok(d['strieska_z'])
    # os budovy (dlhá strana)
    n = len(H)
    dl = max(range(n), key=lambda i: dlzka(H[i], H[(i + 1) % n]))
    U = ((H[(dl + 1) % n][0] - H[dl][0]) / dlzka(H[dl], H[(dl + 1) % n]), (H[(dl + 1) % n][1] - H[dl][1]) / dlzka(H[dl], H[(dl + 1) % n]))
    if U[0] < 0:
        U = (-U[0], -U[1])
    V = (-U[1], U[0])

    def blizko(p, poly, r):
        return Polygon(poly).exterior.distance(shapely.Point(p)) < r

    # --- fasáda: prízemie, béžové panely so škárami, výbežky (sklo + biely pás), vstupná hala pod strieškou ---
    for i in range(n):
        a, b = H[i], H[(i + 1) % n]
        L = dlzka(a, b)
        if L < 0.05:
            continue
        m = ((a[0] + b[0]) / 2, (a[1] + b[1]) / 2)
        vyb = any(blizko(m, v, 0.8) for v in vybezky)
        hala = Polygon(strieska).buffer(4.0).contains(shapely.Point(m))
        if hala:
            G.stena(sklo_h, a, b, -1.0, Z_STRIESKA)
            G.stena(bezova, a, b, Z_STRIESKA, Z_PARK + 1.1)
        elif vyb:
            G.stena(tmava, a, b, -1.0, Z_VYB[0])
            G.stena(sklo_v, a, b, Z_VYB[0], Z_VYB[1])
            G.stena(biela, a, b, Z_VYB[1], Z_PARK + 1.1)
        else:
            G.stena(tmava, a, b, -1.0, Z_PRIZEMIE)
            G.stena(bezova, a, b, Z_PRIZEMIE, Z_PARK + 1.1)
        # zvislé škáry panelov nepravidelnej šírky (1,2 – 3,2 m), mierne pred stenou
        nx, ny = (b[1] - a[1]) / L, -(b[0] - a[0]) / L
        z0 = Z_VYB[1] if vyb else (Z_STRIESKA if hala else Z_PRIZEMIE)
        s = rnd.uniform(0.6, 2.0)
        while s < L - 0.4:
            p = (a[0] + (b[0] - a[0]) * s / L + nx * 0.02, a[1] + (b[1] - a[1]) * s / L + ny * 0.02)
            q = (p[0] + (b[0] - a[0]) / L * 0.06, p[1] + (b[1] - a[1]) / L * 0.06)
            G.stena(biela if vyb else skara, p, q, z0, Z_PARK + 1.0)
            s += rnd.uniform(1.2, 3.2)
    # rímsa / zábradlie strešného parku
    G.pas(biela, H, Z_PARK + 1.1, Z_PARK + 1.25, von=0.05, dnu=0.25)
    # výbežky: biely zaoblený pás nad sklom a spodný biely lem
    for v in vybezky:
        G.pas(biela, v, Z_VYB[1] - 0.15, Z_VYB[1] + 0.25, von=0.35, dnu=0.0)
        G.pas(biela, v, Z_VYB[0] - 0.3, Z_VYB[0], von=0.45, dnu=0.0)

    # --- strecha: plošina s otvorom dvora, park (trávnik), dráha a chodník ---
    plocha = Polygon(H).difference(Polygon(dvor))
    trojuholniky(G, plosina, plocha, Z_PARK)
    park = Polygon(lok(d['park_von']))
    for dnu in d['park_dnu']:
        park = park.difference(Polygon(lok(dnu)))
    park = park.intersection(plocha).buffer(0)
    trojuholniky(G, trava, park, Z_PARK + 0.05)
    drah = ccw([bod(p) for p in d['draha']])
    chod = ccw([bod(p) for p in d['chodnik']])
    pruh(G, dlazba, chod, -1.75, 1.75, Z_PARK + 0.08)
    pruh(G, draha_m, drah, -1.0, 1.0, Z_PARK + 0.11)
    # biele okraje dráhy
    for w in (-1.0, 0.92):
        pruh(G, biela, drah, w, w + 0.08, Z_PARK + 0.12)

    # --- zapustený dvor: podlaha, vnútorné steny, drevené sedacie schody ---
    trojuholniky(G, dlazba, Polygon(dvor), Z_DVOR)
    for i in range(len(dvor)):
        G.stena(bezova, dvor[(i + 1) % len(dvor)], dvor[i], Z_DVOR, Z_PARK)
    du = [p[0] * U[0] + p[1] * U[1] for p in dvor]
    dv = [p[0] * V[0] + p[1] * V[1] for p in dvor]
    u0, v0, v1 = min(du), min(dv), max(dv)
    xy = lambda u, v: (u * U[0] + v * V[0], u * U[1] + v * V[1])
    for k in range(8):
        G.kvader(drevo, xy(u0 + 1.5 + k * 1.1, (v0 + v1) / 2), V, (v1 - v0) * 0.6, 1.1, Z_DVOR, Z_DVOR + 0.45 * (k + 1))

    # --- svetlík v tvare J: rameno na východ, oblúk, rameno na sever; nízka klenba so sklom ---
    W = bod(hra(*SVETLIK['zapad']))
    Rh = bod(hra(*SVETLIK['roh']))
    S = bod(hra(*SVETLIK['sever']))
    uv = lambda p: (p[0] * U[0] + p[1] * U[1], p[0] * V[0] + p[1] * V[1])
    (wu, wv), (ru, rv), (su, sv) = uv(W), uv(Rh), uv(S)
    os_v = wv                                   # os ramena prechádza západným koncom
    os_u = ru + SVETLIK_SIRKA[1] / 2            # os severného ramena (vnútorný roh = jeho západný okraj)
    R = 18.0
    os_j = [(wu + 2.0, os_v)]
    os_j += [(os_u - R + R * math.sin(a), os_v + R - R * math.cos(a)) for a in [k * math.pi / 2 / 8 for k in range(9)]]
    os_j += [(os_u, sv - 2.0)]
    for i in range(len(os_j) - 1):
        (ua, va), (ub, vb) = os_j[i], os_j[i + 1]
        L = math.hypot(ub - ua, vb - va) or 1
        nu, nv = -(vb - va) / L, (ub - ua) / L
        sir = SVETLIK_SIRKA[0] if i < len(os_j) // 2 else SVETLIK_SIRKA[1]
        prierez = [(t, 1.3 * (1 - (2 * t - 1) ** 2)) for t in [k / 6 for k in range(7)]]
        for k in range(len(prierez) - 1):
            (t0, h0), (t1, h1) = prierez[k], prierez[k + 1]
            pa = lambda u, v, t: xy(u + nu * (t - 0.5) * sir, v + nv * (t - 0.5) * sir)
            A0, A1, B0, B1 = pa(ua, va, t0), pa(ua, va, t1), pa(ub, vb, t0), pa(ub, vb, t1)
            G.plocha(sklo_v, [(*A0, Z_PARK + 0.6 + h0), (*B0, Z_PARK + 0.6 + h0), (*B1, Z_PARK + 0.6 + h1), (*A1, Z_PARK + 0.6 + h1)])
        for sgn in (-0.5, 0.5):
            pa = xy(ua + nu * sgn * sir, va + nv * sgn * sir)
            pb = xy(ub + nu * sgn * sir, vb + nv * sgn * sir)
            G.stena(ram, pa, pb, Z_PARK, Z_PARK + 0.6)
            G.stena(ram, pb, pa, Z_PARK, Z_PARK + 0.6)

    # --- pílovitá strecha: 6 šedov (sklo na sever), fotovoltika na južnom ---
    P = lok(d['pilova'])
    pu = [uv(p)[0] for p in P]
    pv = [uv(p)[1] for p in P]
    pu0, pu1, pv0, pv1 = min(pu), max(pu), min(pv), max(pv)
    krok = (pv1 - pv0) / 6
    for k in range(6):
        va, vb = pv0 + k * krok, pv0 + (k + 1) * krok
        A, B, C, D = xy(pu0, va), xy(pu1, va), xy(pu1, vb), xy(pu0, vb)
        G.plocha(plech, [(*A, Z_PARK), (*B, Z_PARK), (*C, Z_PARK + 3.0), (*D, Z_PARK + 3.0)])
        G.plocha(sklo_v, [(*D, Z_PARK + 3.0), (*C, Z_PARK + 3.0), (*C, Z_PARK), (*D, Z_PARK)])
        G.plocha(plech, [(*A, Z_PARK), (*D, Z_PARK + 3.0), (*D, Z_PARK)])
        G.plocha(plech, [(*B, Z_PARK), (*C, Z_PARK), (*C, Z_PARK + 3.0)])
        if k == 0:
            for j in range(15):
                c = xy(pu0 + 3 + j * (pu1 - pu0 - 6) / 14, va + krok * 0.5)
                G.kvader(fv, c, U, 1.7, 1.0, Z_PARK + 1.5, Z_PARK + 1.6)

    # --- nadstavby: severný pás, technika, kabíny výťahov, drevené pavilóny ---
    for nd in d['nadstavby']:
        o = lok(nd['body'])
        druh = nd['druh']
        h = VYSKY[druh]
        if druh == 'pas':
            G.hranol(bezova, o, Z_PARK, h, mat_vrch=plosina)
        elif druh == 'technika':
            G.hranol(technika, o, Z_PARK, h, mat_vrch=plosina)
            G.zaluzie(technika, o, Z_PARK + 0.5, h - 0.2, rozostup=0.35, hlbka=0.15, von=0.05)
        elif druh == 'technika-siva':
            G.hranol(siva, o, Z_PARK, h, mat_vrch=plosina)
        elif druh == 'kabina':
            G.hranol(hrdza, o, Z_PARK, h, mat_vrch=biela)
            G.pas(biela, o, h - 0.25, h, von=0.25, dnu=0.0)
        else:
            G.hranol(drevo, o, Z_PARK, h, mat_vrch=zelen_s)

    # --- ihrisko: žlté „slnko“ s prstencom ---
    c = bod(d['ihrisko'])
    kupola(G, zlta, c, 3.2, Z_PARK + 0.1, vyska=3.0, seg=14, prs=6)
    kruh = [(c[0] + 5.0 * math.cos(a * math.pi / 12), c[1] + 5.0 * math.sin(a * math.pi / 12)) for a in range(24)]
    G.pas(zlta, kruh, Z_PARK + 1.6, Z_PARK + 1.8, von=0.12, dnu=0.12)

    # --- stromy v parku (mimo dráhy a chodníka) ---
    obmedz = shapely.LineString(drah + [drah[0]]).buffer(2.6).union(shapely.LineString(chod + [chod[0]]).buffer(2.6))
    volne = park.difference(obmedz).buffer(-1.5)
    minx, miny, maxx, maxy = volne.bounds
    stromy = 0
    for _ in range(3000):
        if stromy >= 110:
            break
        p = (rnd.uniform(minx, maxx), rnd.uniform(miny, maxy))
        if not volne.contains(shapely.Point(p)):
            continue
        r = rnd.uniform(1.8, 2.8)
        G.valec(kmen, p, 0.15, Z_PARK, Z_PARK + 2.0, seg=6)
        kupola(G, koruna, (p[0], p[1]), r, Z_PARK + 1.6, vyska=r * 1.3, seg=8, prs=3)
        volne = volne.difference(shapely.Point(p).buffer(r * 1.6))
        stromy += 1

    # --- západná vstupná strieška: biela doska, presklený otvor s mriežkou, 4 stĺpy Y ---
    G.hranol(biela, strieska, Z_STRIESKA, Z_STRIESKA + 0.9, vrch=True, spodok=True)
    otvor = ccw([bod(hra(*p)) for p in OTVOR])
    G.vodorovna(sklo_h, otvor, Z_STRIESKA + 0.95)
    ou = sorted(otvor, key=lambda p: uv(p)[0])
    for k in range(1, 6):
        t = k / 6
        a = (ou[0][0] + (ou[2][0] - ou[0][0]) * t, ou[0][1] + (ou[2][1] - ou[0][1]) * t)
        b = (ou[1][0] + (ou[3][0] - ou[1][0]) * t, ou[1][1] + (ou[3][1] - ou[1][1]) * t)
        G.tram(ocel, (*a, Z_STRIESKA + 1.0), (*b, Z_STRIESKA + 1.0), 0.25)
        if k < 5:
            t2 = (k + 1) / 6
            b2 = (ou[1][0] + (ou[3][0] - ou[1][0]) * t2, ou[1][1] + (ou[3][1] - ou[1][1]) * t2)
            G.tram(ocel, (*a, Z_STRIESKA + 1.0), (*b2, Z_STRIESKA + 1.0), 0.18)
    sc = (sum(p[0] for p in otvor) / 4, sum(p[1] for p in otvor) / 4)
    for p in otvor:
        noha = (p[0] + (p[0] - sc[0]) * 0.25, p[1] + (p[1] - sc[1]) * 0.25)
        vrch = (noha[0] + (sc[0] - noha[0]) * 0.2, noha[1] + (sc[1] - noha[1]) * 0.2, 9.0)
        G.tram(ocel, (*noha, 0.0), vrch, 0.6)
        smer = (-(p[1] - sc[1]), p[0] - sc[0])
        L = math.hypot(*smer) or 1
        for sgn in (-1, 1):
            G.tram(ocel, vrch, (p[0] + sgn * smer[0] / L * 3.5, p[1] + sgn * smer[1] / L * 3.5, Z_STRIESKA), 0.42)

    vchody = [{'id': v['id'], 'bod': [round(v['bod'][0] - stred[0], 2), round(v['bod'][1] - stred[1], 2)], 'vyska': 0.0,
               **({'nazov': v['nazov']} if 'nazov' in v else {})} for v in d['vchody']]
    return G, [H], max(VYSKY.values()), 'nivy', {'stred': [round(stred[0], 2), round(stred[1], 2)], 'vchody': vchody}
