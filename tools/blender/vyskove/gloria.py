# Obytný dom Glória (Záhradnícka 60 × Ružová dolina; Peter Gál, Juraj Furdík; 2004–2006): 29 NP, 100 m.
# Prieskum (#128, napady/pamiatky-podklady.md – Glória): OSM časti (changeset 176590232), cenník bytov po podlažiach
# z archívu predajného webu, fotky z Commons 2006–2016, laser v dlaždici hry.
#   – podnož 1.–3. NP (~11,5 m): strieborné hliníkové panely, veľké okná s červenými rámami, zaoblené SZ nárožie
#     (r ≈ 15,7 m) s nápisom „Gloria“ (meno domu) v úrovni 2. NP; ustúpené 4. NP (do ~15,3 m) so strešnou terasou,
#   – veža 5.–20. NP (do 69 m): svetlosivá omietka, okná s červenými rámami, modrošedé zvislé pásy na nárožiach;
#     na severe (Záhradnícka) dva stĺpce sýtožltých oblúkových balkónov s plným parapetom, na SZ zaoblená stena
#     (r ≈ 9,9 m) a JZ stena s priebežnými vlnitými bledožltými balkónmi (dva úseky, medzi nimi modrošedý zárez),
#   – nad 20. NP ustúpená horná hmota (do 96 m) a na terase dva otvorené rámy – žltá doska na bielych okrúhlych
#     stĺpoch (horná hrana ~80 m podľa lasera), na vrchu kocka 29. NP (do 100 m) s vyloženou strešnou doskou
#     a žltým vlysom pod ňou, stožiar s anténami.
# Miestne osi budovy: dlhá východná stena smeruje na azimut 350,7° (x' = východ budovy, y' = sever budovy).

import math

from veze import Geo, z_hry, stred_obrysu, sklo, odsad, ccw, plocha_obrysu
from spolocne import material
from vyskove.stavebna_fakulta import napis_rovny

O_HRA = (2295.80, -1277.97)          # počiatok osí budovy (48,155 N, 17,1386 E) v metroch hry
UX, UY = (0.987, 0.162), (-0.162, 0.987)   # osi x', y' v rovine (východ, sever)

Z_PODNOZ, Z_4NP = 11.5, 15.3         # strecha podnože (1.–3. NP) a ustúpeného 4. NP
Z_20, Z_28, Z_29 = 69.0, 96.0, 99.6   # strecha 20. NP, horná hmota, vrch steny 29. NP (doska do 100 m)
Z_RAM = 79.8                          # horná hrana žltých rámov na terase 20. NP (laser 78,6 – 80,1 m)
STOZIAR = 105.5
PODLAZIA = [Z_4NP + (Z_20 - Z_4NP) * k / 16 for k in range(17)]       # 5.–20. NP po 3,36 m
PODLAZIA_HORE = [Z_20 + (Z_28 - Z_20) * k / 8 for k in range(9)]     # 21.–28. NP po 3,375 m

# veža 5.–20. NP v osiach budovy (podľa OSM 1462633101; zuby na severe sú balkóny, stavajú sa zvlášť)
SZ_STRED, SZ_R = (-3.8, 18.5), 9.9    # zaoblená SZ stena
P_SZ1, P_SZ2 = (-9.6, 26.5), (-13.2, 15.4)
P_JZ = (-0.8, 5.1)
BALKON_A = ((9.5, 24.2), (3.3, 24.2), 2.7)    # tetiva na stene dosky (z východu na západ) a hĺbka
BALKON_B = ((0.6, 26.5), (-5.2, 26.5), 2.1)   # tetiva na stene krídla


def oblukove_body(c, r, a0, a1, n):
    return [(c[0] + r * math.cos(a0 + (a1 - a0) * k / n), c[1] + r * math.sin(a0 + (a1 - a0) * k / n)) for k in range(n + 1)]


def uhly_sz():
    """Uhly začiatku a konca zaoblenej SZ steny (proti smeru hodín, a1 > a0)."""
    a0 = math.atan2(P_SZ1[1] - SZ_STRED[1], P_SZ1[0] - SZ_STRED[0])
    a1 = math.atan2(P_SZ2[1] - SZ_STRED[1], P_SZ2[0] - SZ_STRED[0])
    return a0, a1 + 2 * math.pi if a1 < a0 else a1


def obrys_veze():
    a0, a1 = uhly_sz()
    return [(13.0, -4.8), (13.0, 24.2), (2.6, 24.2), (2.6, 26.5)] + oblukove_body(SZ_STRED, SZ_R, a0, a1, 10) \
        + [P_JZ, (-0.7, 2.1), (-0.3, -5.2)]


def postav(obrysy):
    data = obrysy['gloria']
    hlavny = data['hlavne'][0]
    stred = stred_obrysu(hlavny['body'])
    casti = {c['id']: z_hry(c['body'], stred) for c in data['casti']}
    o0 = (O_HRA[0] - stred[0], -(O_HRA[1] - stred[1]))

    def B(p):
        """Bod v osiach budovy (x', y') → rovina Blendera."""
        return (o0[0] + UX[0] * p[0] + UY[0] * p[1], o0[1] + UX[1] * p[0] + UY[1] * p[1])

    omietka = material('gloria-omietka', '#c9cbc6', drsnost=0.85)
    modrosiva = material('gloria-modrosiva', '#8e9dad', drsnost=0.8)
    zlta = material('gloria-zlta', '#f2cf2c', drsnost=0.55)
    bledozlta = material('gloria-bledozlta', '#f4ecc4', drsnost=0.6)
    podhlad = material('gloria-podhlad', '#e6e4de', drsnost=0.85)
    ram = material('gloria-ram', '#c0222e', drsnost=0.45, kov=0.15)
    okna = sklo('sklo-gloria', '#3d4b54', drsnost=0.05, kov=0.8)
    panely = material('gloria-panely', '#c8cdcb', drsnost=0.32, kov=0.65)
    strecha_m = material('gloria-strecha', '#8f8e8a', drsnost=0.95)
    terasa = material('gloria-terasa', '#b9b4aa', drsnost=0.9)
    biela = material('gloria-biela', '#f0f0ec', drsnost=0.6)
    hlinik = material('gloria-zabradlie', '#d8dadb', drsnost=0.35, kov=0.7)
    doska = material('gloria-doska', '#9a9b98', drsnost=0.8)
    pismo = material('gloria-pismo', '#5b5f64', drsnost=0.35, kov=0.6)
    G = Geo()

    def stena_s_oknami(a, b, urovne, krok=3.3, sirka_okna=1.7, vyska_okna=1.55, parapet=0.95, mat=omietka):
        """Rovná stena a→b (líce von vpravo) s oknami s červenými rámami v každom podlaží."""
        L = math.hypot(b[0] - a[0], b[1] - a[1])
        if L < 1e-6:
            return
        tx, ty = (b[0] - a[0]) / L, (b[1] - a[1]) / L
        nx, ny = ty, -tx                           # von (vpravo od smeru)
        n = int(L // krok)
        if n < 1 or L < sirka_okna + 1.0:
            G.stena(mat, a, b, urovne[0], urovne[-1])
            return
        P = lambda s, d=0.0: (a[0] + tx * s - nx * d, a[1] + ty * s - ny * d)
        stredy = [L * (k + 0.5) / n for k in range(n)]
        for k in range(len(urovne) - 1):
            z0, z1 = urovne[k], urovne[k + 1]
            za, zb = z0 + parapet, min(z1 - 0.3, z0 + parapet + vyska_okna)
            G.stena(mat, a, b, z0, za)
            G.stena(mat, a, b, zb, z1)
            s = 0.0
            for c in stredy:
                s0, s1 = c - sirka_okna / 2, c + sirka_okna / 2
                G.stena(mat, P(s), P(s0), za, zb)
                # ostenie (0,18 m), rám a sklo (sklo pred rámom, užšie → červený okraj)
                A0, A1, D0, D1 = P(s0), P(s1), P(s0, 0.18), P(s1, 0.18)
                G.plocha(mat, [(A0[0], A0[1], za), (D0[0], D0[1], za), (D0[0], D0[1], zb), (A0[0], A0[1], zb)])
                G.plocha(mat, [(D1[0], D1[1], za), (A1[0], A1[1], za), (A1[0], A1[1], zb), (D1[0], D1[1], zb)])
                G.plocha(mat, [(A0[0], A0[1], zb), (D0[0], D0[1], zb), (D1[0], D1[1], zb), (A1[0], A1[1], zb)])
                G.plocha(mat, [(A1[0], A1[1], za), (D1[0], D1[1], za), (D0[0], D0[1], za), (A0[0], A0[1], za)])
                G.stena(ram, D0, D1, za, zb)
                G.stena(okna, P(s0 + 0.12, 0.15), P(s1 - 0.12, 0.15), za + 0.11, zb - 0.11)
                s = s1
            G.stena(mat, P(s), b, za, zb)

    def hmota(obrys, urovne, krok=3.3):
        for i in range(len(obrys)):
            stena_s_oknami(obrys[i], obrys[(i + 1) % len(obrys)], urovne, krok=krok)

    def zabradlie(obrys, z, vynechat_kratke=0.0):
        """Nízka atika a biele zábradlie terasy po obvode strechy."""
        G.pas(strecha_m, obrys, z, z + 0.3, von=0.0, dnu=0.25, spodok=False)
        G.pas(hlinik, obrys, z + 1.0, z + 1.06, von=0.0, dnu=0.06)
        for i in range(len(obrys)):
            a, b = obrys[i], obrys[(i + 1) % len(obrys)]
            L = math.hypot(b[0] - a[0], b[1] - a[1])
            for k in range(int(L // 1.6) + 1):
                t = k * 1.6 / L if L else 0
                p = (a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t)
                G.kvader(hlinik, p, ((b[0] - a[0]) / (L or 1), (b[1] - a[1]) / (L or 1)), 0.05, 0.05, z + 0.3, z + 1.0, vrch=False)

    def strecha_doska(obrys, z_vrch, presah, hrubka=0.35, vlys=0.9):
        """Vyložená plochá strešná doska so žltým vlysom pod ňou."""
        G.pas(zlta, obrys, z_vrch - vlys, z_vrch, von=0.05, dnu=0.0, spodok=True, vrch=False)
        D = odsad(obrys, presah)
        G.hranol(doska, D, z_vrch, z_vrch + hrubka, vrch=True, spodok=True, mat_vrch=strecha_m)

    # --- podnož: 1.–3. NP strieborné panely, okná s červenými rámami ---
    podnoz = casti['1462633094']
    from veze import kamenna_fasada
    kamenna_fasada(G, podnoz, [0.0, 4.3, 7.9, Z_PODNOZ], kamen=panely, sklo=okna, ram=ram,
                   parapet=1.0, preklad=1.0, vnor=0.25, krok=1.4, seed=3)
    pas2 = casti['1462633093']
    kamenna_fasada(G, pas2, [0.0, 4.3, 7.6], kamen=panely, sklo=okna, ram=ram, parapet=0.7, preklad=0.7,
                   vnor=0.2, krok=1.4, seed=4)
    G.vodorovna(strecha_m, pas2, 7.6)
    G.vodorovna(terasa, podnoz, Z_PODNOZ)
    zabradlie(podnoz, Z_PODNOZ)
    # nápis „Gloria“ (meno domu) na zaoblenom SZ nároží podnože v úrovni 2. NP
    c_podnoz, r_podnoz = B((-1.9, 18.6)), 15.7
    uhol = math.radians(118 + 9.3)            # SSZ časť oblúka (v osiach Blendera)
    n_von = (math.cos(uhol), math.sin(uhol))
    stred_n = (c_podnoz[0] + n_von[0] * (r_podnoz + 0.05), c_podnoz[1] + n_von[1] * (r_podnoz + 0.05))
    napis_rovny(G, pismo, 'Gloria', stred_n, (-n_von[1], n_von[0]), n_von, 5.0, 1.0, hlbka=0.08)

    # --- 4. NP: ustúpené, biela omietka, pásové okná ---
    np4 = casti['1462633092']
    kamenna_fasada(G, np4, [Z_PODNOZ, Z_4NP], kamen=omietka, sklo=okna, ram=ram, parapet=0.9, preklad=0.55,
                   vnor=0.2, krok=1.5, seed=5)
    G.vodorovna(terasa, np4, Z_4NP)
    zabradlie(np4, Z_4NP)

    # --- veža 5.–20. NP ---
    veza = ccw([B(p) for p in obrys_veze()])
    hmota(veza, PODLAZIA)
    G.vodorovna(terasa, veza, Z_20)
    zabradlie(veza, Z_20)
    G.pas(podhlad, veza, Z_4NP - 0.25, Z_4NP, von=0.1, dnu=0.0)
    # modrošedé zvislé pásy na nárožiach a pri zárezoch (1,2 m, mierne pred omietkou)
    for p, d in [((13.0, 24.2), (-1, 0)), ((13.0, 24.2), (0, -1)), ((13.0, -4.8), (0, 1)), ((2.6, 24.2), (1, 0)),
                 ((-0.3, -5.2), (0, 1)), (P_SZ2, (0.769, -0.639)), (P_JZ, (-0.769, 0.639)), (P_SZ1, (1, 0))]:
        a = B(p)
        smer = (UX[0] * d[0] + UY[0] * d[1], UX[1] * d[0] + UY[1] * d[1])
        stred_p = (a[0] + smer[0] * 0.6, a[1] + smer[1] * 0.6)
        G.kvader(modrosiva, stred_p, smer, 1.2, 0.16, Z_4NP, Z_20, vrch=True)

    # žlté oblúkové balkóny (segment kruhu s plným parapetom 1,1 m) – dva stĺpce na severe
    def balkon_oblukovy(a, b, hlbka, z, mat_par):
        L = math.hypot(b[0] - a[0], b[1] - a[1])
        tx, ty = (b[0] - a[0]) / L, (b[1] - a[1]) / L
        nx, ny = ty, -tx
        r = (L * L / 4 + hlbka * hlbka) / (2 * hlbka)
        c = ((a[0] + b[0]) / 2 - nx * (r - hlbka), (a[1] + b[1]) / 2 - ny * (r - hlbka))
        # oblúk cez vrchol (smer von od steny): od bodu a po bod b
        vrchol = math.atan2(ny, nx)
        pol = math.asin(min(1.0, (L / 2) / r))
        u_a = vrchol + pol if math.hypot(c[0] + r * math.cos(vrchol + pol) - a[0], c[1] + r * math.sin(vrchol + pol) - a[1]) < 0.01 else vrchol - pol
        u_b = 2 * vrchol - u_a
        obl = oblukove_body(c, r, u_a, u_b, 9)                       # a → b okolo vonkajšej strany
        vnut = oblukove_body(c, r - 0.14, u_a, u_b, 9)
        dno = [(p[0], p[1]) for p in obl]
        G.plocha(podhlad, [(p[0], p[1], z - 0.2) for p in dno])      # spodok (normála dole – poradie hodín)
        G.plocha(terasa, [(p[0], p[1], z) for p in reversed(dno)])
        for i in range(len(obl) - 1):
            G.stena(mat_par, obl[i + 1], obl[i], z - 0.2, z + 1.1)
            G.stena(mat_par, vnut[i], vnut[i + 1], z, z + 1.1)
            G.plocha(mat_par, [(obl[i][0], obl[i][1], z + 1.1), (obl[i + 1][0], obl[i + 1][1], z + 1.1),
                               (vnut[i + 1][0], vnut[i + 1][1], z + 1.1), (vnut[i][0], vnut[i][1], z + 1.1)])

    for (a, b, h) in (BALKON_A, BALKON_B):
        for z in PODLAZIA[:-1]:
            balkon_oblukovy(B(a), B(b), h, z + 0.02, zlta)

    # vlnité bledožlté balkóny po SZ oblúku a JZ stene (dva úseky, medzi nimi modrošedý zárez pri P_SZ2)
    a0, a1 = uhly_sz()
    useky = [oblukove_body(SZ_STRED, SZ_R, a0 + 0.12, a1 - 0.07, 14)]
    dl = math.hypot(P_JZ[0] - P_SZ2[0], P_JZ[1] - P_SZ2[1])
    useky.append([(P_SZ2[0] + (P_JZ[0] - P_SZ2[0]) * t, P_SZ2[1] + (P_JZ[1] - P_SZ2[1]) * t)
                  for t in [(0.8 + k * (dl - 1.6) / 18) / dl for k in range(19)]])
    for usek in useky:
        L = [0.0]
        for i in range(1, len(usek)):
            L.append(L[-1] + math.hypot(usek[i][0] - usek[i - 1][0], usek[i][1] - usek[i - 1][1]))
        hl = [0.5 + 1.2 * (0.5 - 0.5 * math.cos(2 * math.pi * s / 6.4)) for s in L]
        vonk, vnut = [], []
        for i, p in enumerate(usek):
            q0, q1 = usek[max(0, i - 1)], usek[min(len(usek) - 1, i + 1)]
            tx, ty = q1[0] - q0[0], q1[1] - q0[1]
            d = math.hypot(tx, ty) or 1
            nx, ny = ty / d, -tx / d
            vonk.append(B((p[0] + nx * hl[i], p[1] + ny * hl[i])))
            vnut.append(B((p[0] + nx * (hl[i] - 0.14), p[1] + ny * (hl[i] - 0.14))))
        stena_b = [B(p) for p in usek]
        for z in PODLAZIA[:-1]:
            z += 0.02
            for i in range(len(usek) - 1):
                A, Bv, Cv, D = stena_b[i], stena_b[i + 1], vonk[i + 1], vonk[i]
                G.plocha(terasa, [(A[0], A[1], z), (Bv[0], Bv[1], z), (Cv[0], Cv[1], z), (D[0], D[1], z)])
                G.plocha(podhlad, [(D[0], D[1], z - 0.2), (Cv[0], Cv[1], z - 0.2), (Bv[0], Bv[1], z - 0.2), (A[0], A[1], z - 0.2)])
                G.stena(bledozlta, vonk[i + 1], vonk[i], z - 0.2, z + 1.1)
                G.stena(bledozlta, vnut[i], vnut[i + 1], z, z + 1.1)
                G.plocha(bledozlta, [(vonk[i][0], vonk[i][1], z + 1.1), (vonk[i + 1][0], vonk[i + 1][1], z + 1.1),
                                     (vnut[i + 1][0], vnut[i + 1][1], z + 1.1), (vnut[i][0], vnut[i][1], z + 1.1)])
            # bočné čelá
            for i in (0, len(usek) - 1):
                G.stena(bledozlta, stena_b[i], vonk[i], z - 0.2, z + 1.1) if i else G.stena(bledozlta, vonk[i], stena_b[i], z - 0.2, z + 1.1)

    # --- horná hmota 21.–28. NP (do 96 m) a kocka 29. NP ---
    horna = casti['1462633095']
    hmota(horna, PODLAZIA_HORE, krok=3.4)
    strecha_doska(horna, Z_28, 1.2)
    # žlté vyložené dosky balkónov na severe hornej hmoty (každé druhé podlažie)
    sever = [B((4.4, 23.9)), B((12.6, 24.3))]
    for z in PODLAZIA_HORE[1:-1:2]:
        G.pas(zlta, sever, z - 0.25, z + 0.35, von=1.6, dnu=0.0, uzavreta=False)
    kocka = casti['1462633088']
    hmota(kocka, [Z_28 + 0.35, Z_29], krok=3.0)
    strecha_doska(kocka, Z_29, 1.3, hrubka=0.4)
    # stožiar s anténami na východnej časti kocky
    sk = B((9.6, 10.2))
    G.valec(hlinik, sk, 0.14, Z_29 + 0.4, STOZIAR, seg=8)
    for k, (dx, dy) in enumerate(((1, 0), (0, 1), (-1, 0))):
        G.kvader(hlinik, (sk[0] + dx * 0.35, sk[1] + dy * 0.35), (dy, -dx) if dx or dy else (1, 0), 0.28, 0.08,
                 STOZIAR - 2.4 - k * 0.5, STOZIAR - 1.2 - k * 0.5)
    for dx, dy, z in ((0.9, -0.6, Z_29 + 1.2), (-0.8, 0.7, Z_29 + 1.6)):
        G.valec(biela, (sk[0] + dx, sk[1] + dy), 0.45, z, z + 0.12, seg=10)

    # --- otvorené rámy na terase 20. NP: žltá doska na bielych okrúhlych stĺpoch ---
    for cid in ('1462633086', '1462633087'):
        o = casti[cid]
        G.hranol(zlta, o, Z_RAM - 0.65, Z_RAM, vrch=True, spodok=True, mat_vrch=strecha_m)
        cx = sum(p[0] for p in o) / len(o)
        cy = sum(p[1] for p in o) / len(o)
        for p in o:
            q = (p[0] + (cx - p[0]) * 0.12, p[1] + (cy - p[1]) * 0.12)
            G.valec(biela, q, 0.22, Z_20, Z_RAM - 0.65, seg=10, vrch=False)

    obrysy_hry = [podnoz, np4, veza, horna, kocka]
    vysky = [Z_PODNOZ, Z_4NP, Z_20, Z_28 + 0.35, 100.0]
    return (G, obrysy_hry, 100.0, 'gloria',
            {'stred': [round(stred[0], 2), round(stred[1], 2)], 'vysky': vysky})
