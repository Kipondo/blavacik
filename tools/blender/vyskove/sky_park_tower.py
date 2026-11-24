# Sky Park Tower (Landererova × Čulenova; Zaha Hadid Architects; stav k novembru 2026): rozostavaná hrubá stavba
# budúcej 33-podlažnej veže (atika ~119,5 m, anténa ~124,8 m; dokončenie 2027/2028). Prieskum (#129,
# napady/pamiatky-podklady.md – Sky Park Tower): ASB a YIM.BA 10/2026, Liebherr 6/2025, OSM way 1503417607.
#   – pôdorys: jedna budova z dvoch oblých lalokov spojených užším pásom (arašid), jedno jadro; 1.–8. NP terasovito
#     rozšírená podnož, vyššie štíhlejší obrys (~64 × 36 m),
#   – 13. 10. 2026 boli stropy na 14. NP (tempo ~10–20 dní na podlažie) → model: stropy po 17. NP (~58 m),
#     jadro ~4 podlažia nad stropmi so žltým samošplhacím debnením a červeným betónovacím stožiarom,
#   – vrchné ~3 podlažia obopína pás žltých ochranných panelov; nižšie holé stropy, biele obvodové stĺpy, modré
#     zábradlia, modré siete okolo 5.–9. NP, oranžové murivo po 8. NP; 1.–3. NP už zasklené (zelenkavé sklo),
#     biela oblá markíza nad parterom, sivé rúrkové lešenie okolo oblých častí podnože,
#   – dva vežové žeriavy: na Z/SZ sklopný (žltý stožiar, červený výložník), na V/SV celý žltý s vodorovným výložníkom,
#   – oplotenie staveniska (bez názvov a log), buňky.
# Obrys je z OSM (way 1503417607, cez dlaždicu hry 2_0), súradnice v metroch hry.

import math

from veze import Geo, z_hry, zjednodus, ccw, odsad, dlzka, sklo
from spolocne import material
from vyskove.istropolis import zeriav

OBRYS_HRA = [(1305.9, 51.7), (1311.8, 52.6), (1316.2, 55.6), (1319.3, 59.6), (1321.2, 64.6), (1321.7, 70.2),
             (1320.5, 75.4), (1317.7, 79.9), (1314.6, 82.5), (1311.0, 84.5), (1307.2, 85.6), (1302.3, 86.2),
             (1293.2, 85.0), (1288.1, 82.6), (1283.5, 81.7), (1280.6, 81.6), (1273.5, 83.2), (1269.0, 82.7),
             (1263.9, 80.2), (1259.1, 75.5), (1253.9, 68.6), (1251.5, 63.6), (1250.1, 58.2), (1249.8, 52.8),
             (1250.9, 48.4), (1252.9, 45.2), (1256.7, 41.9), (1261.1, 40.1), (1266.5, 39.5), (1270.0, 40.1),
             (1273.1, 41.6), (1276.0, 43.8), (1282.2, 51.1), (1284.6, 53.2), (1287.8, 54.9), (1290.3, 55.1)]

STROPY = 17                     # posledný hotový strop (17. NP)


def vyska_stropu(k):
    """Horná hrana stropu nad k-tym NP (1.–3. NP obchody 4,5 / 4,0 / 4,0 m, byty po 3,25 m)."""
    if k <= 0:
        return 0.0
    if k == 1:
        return 4.5
    if k <= 3:
        return 4.5 + 4.0 * (k - 1)
    return 12.5 + 3.25 * (k - 3)


def body_po(obrys, krok):
    """Body po obvode uzavretého obrysu približne po `krok` m."""
    out = []
    n = len(obrys)
    for i in range(n):
        a, b = obrys[i], obrys[(i + 1) % n]
        L = dlzka(a, b)
        m = max(1, int(round(L / krok)))
        for j in range(m):
            out.append((a[0] + (b[0] - a[0]) * j / m, a[1] + (b[1] - a[1]) * j / m))
    return out


def zeriav_sklopny(G, M, p, smer, vyska, uhol=62.0, vylozenie=48.0):
    """Žeriav so sklopným výložníkom: žltý príhradový stožiar, červený výložník šikmo hore, hák s kontajnerom."""
    ux, uy = smer
    s = 1.1
    rohy = [(p[0] + dx * s, p[1] + dy * s) for dx, dy in ((-1, -1), (1, -1), (1, 1), (-1, 1))]
    for r in rohy:
        G.tram(M['zlta'], (r[0], r[1], 0.0), (r[0], r[1], vyska), 0.18)
    z = 0.0
    while z < vyska - 2.5:
        for i in range(4):
            a, b = rohy[i], rohy[(i + 1) % 4]
            G.tram(M['zlta'], (a[0], a[1], z), (b[0], b[1], z + 2.5), 0.08)
        z += 2.5
    G.kvader(M['beton'], p, (1, 0), 7.0, 7.0, -0.5, 1.0)
    # otočná časť s kabínou a protiváhou
    G.kvader(M['cervena'], p, (ux, uy), 4.5, 3.5, vyska, vyska + 3.0)
    G.kvader(M['biela'], (p[0] + ux * 2.0 - uy * 1.6, p[1] + uy * 2.0 + ux * 1.6), (ux, uy), 1.8, 1.6, vyska + 0.6, vyska + 2.8)
    G.kvader(M['beton'], (p[0] - ux * 6.5, p[1] - uy * 6.5), (ux, uy), 2.6, 3.0, vyska + 0.5, vyska + 3.0)
    G.tram(M['cervena'], (p[0], p[1], vyska + 3.0), (p[0] - ux * 6.0, p[1] - uy * 6.0, vyska + 2.5), 0.5)
    # výložník šikmo hore (dva pásy príhradoviny)
    u = math.radians(uhol)
    a = (p[0], p[1], vyska + 2.0)
    b = (p[0] + ux * vylozenie * math.cos(u), p[1] + uy * vylozenie * math.cos(u), vyska + 2.0 + vylozenie * math.sin(u))
    for dv in (-0.6, 0.6):
        G.tram(M['cervena'], (a[0] - uy * dv, a[1] + ux * dv, a[2]), (b[0] - uy * dv, b[1] + ux * dv, b[2]), 0.16)
    n = 14
    for m in range(n):
        q0 = [a[i] + (b[i] - a[i]) * m / n for i in range(3)]
        q1 = [a[i] + (b[i] - a[i]) * (m + 1) / n for i in range(3)]
        G.tram(M['cervena'], (q0[0] - uy * 0.6, q0[1] + ux * 0.6, q0[2]), (q1[0] + uy * 0.6, q1[1] - ux * 0.6, q1[2]), 0.06)
    # A-rám a laná k hlave výložníka
    G.tram(M['cervena'], (p[0], p[1], vyska + 3.0), (p[0] - ux * 1.5, p[1] - uy * 1.5, vyska + 12.0), 0.3)
    G.tram(M['kov'], (p[0] - ux * 1.5, p[1] - uy * 1.5, vyska + 12.0), b, 0.05)
    # lano s kontajnerom na betón
    G.tram(M['kov'], b, (b[0], b[1], vyska * 0.75), 0.04)
    G.valec(M['oranzova'], (b[0], b[1]), 0.8, vyska * 0.75 - 1.6, vyska * 0.75, seg=8, r1=0.5)


def postav(obrysy):
    stred = (sum(p[0] for p in OBRYS_HRA) / len(OBRYS_HRA), sum(p[1] for p in OBRYS_HRA) / len(OBRYS_HRA))
    O = ccw(zjednodus(z_hry(OBRYS_HRA, stred), 0.3))
    M = {
        'beton': material('skypark-beton', '#a9a8a2', drsnost=0.9), 'strop': material('skypark-strop', '#b8b6ae', drsnost=0.9),
        'biela': material('skypark-biela', '#eeeeea', drsnost=0.55), 'zlta': material('skypark-zeriav', '#e8b828', drsnost=0.5, kov=0.4),
        'okrova': material('skypark-debnenie', '#d9a531', drsnost=0.6), 'cervena': material('skypark-cervena', '#c4312a', drsnost=0.5, kov=0.3),
        'kov': material('skypark-kov', '#4a4d50', drsnost=0.5, kov=0.7), 'modra': material('skypark-siete', '#2f5f9e', drsnost=0.8),
        'zabradlie': material('skypark-zabradlie', '#2f63b0', drsnost=0.5, kov=0.3), 'tehla': material('skypark-murivo', '#c8743e', drsnost=0.9),
        'lesenie': material('skypark-lesenie', '#8c9094', drsnost=0.5, kov=0.6), 'plot': material('skypark-plot', '#7d8a7e', drsnost=0.6),
        'zem': material('skypark-zem', '#7b6c58', drsnost=1.0), 'bunka': material('skypark-bunka', '#c9ccd0', drsnost=0.6),
        'oranzova': material('skypark-kontajner', '#e07b24', drsnost=0.6), 'ram': material('skypark-ram', '#3b3631', drsnost=0.5, kov=0.4),
    }
    okna = sklo('sklo-skypark', '#5d7b74', drsnost=0.05, kov=0.75)
    G = Geo()

    # obrys podlaží: 1.–3. NP celý obrys, 4.–7. NP mierne ustúpené terasy, od 8. NP štíhly arašid (~64 × 36 m)
    def obrys_np(k):
        if k <= 3:
            return O
        if k <= 7:
            return odsad(O, -1.2 - 0.5 * (k - 4))
        return odsad(O, -4.2)

    # stavenisko: hnedá zem, plot zo zelenosivých panelov (bez názvov), buňky
    plot = odsad(O, 6.0)
    G.vodorovna(M['zem'], plot, 0.04)
    for a, b in zip(plot, plot[1:] + plot[:1]):
        L = dlzka(a, b)
        m = max(1, int(L / 3.5))
        for j in range(m):
            p0 = (a[0] + (b[0] - a[0]) * j / m, a[1] + (b[1] - a[1]) * j / m)
            p1 = (a[0] + (b[0] - a[0]) * (j + 1) / m, a[1] + (b[1] - a[1]) * (j + 1) / m)
            G.stena(M['plot'], p0, p1, 0.0, 2.2)
            G.stena(M['plot'], p1, p0, 0.0, 2.2)
    juh = max(plot, key=lambda p: -p[1])                # najjužnejší bod plotu (Landererova)
    for r in range(3):
        for s in range(2):
            G.kvader(M['bunka'], (juh[0] - 14 + r * 2.6, juh[1] + 4.0), (0, 1), 6.0, 2.5, s * 2.7, s * 2.7 + 2.6)

    # stropy a stĺpy
    for k in range(1, STROPY + 1):
        z0, z1 = vyska_stropu(k - 1), vyska_stropu(k)
        o = obrys_np(k)
        G.hranol(M['strop'], odsad(o, 0.25), z1 - 0.3, z1, vrch=True, spodok=True)
        # biele obvodové stĺpy (prefabrikáty) po ~4,5 m
        for p in body_po(odsad(o, -0.6), 4.5):
            G.valec(M['biela'], p, 0.3, z0, z1 - 0.3, seg=8, vrch=False)
        if k <= 3:
            # parter a 1.–3. NP: zelenkavé sklo v tmavých rámoch, biele rebrá exoskeletu
            sk = odsad(o, -0.9)
            for a, b in zip(body_po(sk, 1.6), body_po(sk, 1.6)[1:] + body_po(sk, 1.6)[:1]):
                G.stena(okna, a, b, z0, z1 - 0.3)
            for p in body_po(odsad(o, 0.05), 3.0):
                G.kvader(M['biela'], p, (1, 0), 0.35, 0.35, z0, z1, vrch=False)
        elif k <= 8:
            # oranžové murivo a okenné otvory v časti obvodu
            body = body_po(odsad(o, -0.7), 2.25)
            for i, (a, b) in enumerate(zip(body, body[1:] + body[:1])):
                if (i + k) % 3 == 0:
                    continue
                G.stena(M['tehla'], a, b, z0, z1 - 0.3)
        # modré zábradlie na hrane stropu (otvorené podlažia nad murivom)
        if 8 <= k <= STROPY - 1:
            G.pas(M['zabradlie'], odsad(o, 0.1), z1 + 0.95, z1 + 1.05, von=0.05, dnu=0.0)
        # modré záchytné siete v páse okolo 5.–9. NP
        if 5 <= k <= 9:
            G.pas(M['modra'], odsad(o, 0.6), z0 + 0.2, z1 - 0.2, von=0.03, dnu=0.0, vrch=False, spodok=False)

    # biela oblá markíza nad parterom (severná a západná strana) a sivé rúrkové lešenie okolo oblých častí podnože
    markiza = odsad(O, 2.2)
    for i in range(len(markiza)):
        a, b = markiza[i], markiza[(i + 1) % len(markiza)]
        if (a[1] + b[1]) / 2 > 2.0:                  # len na severe (k parku)
            c = O[i], O[(i + 1) % len(O)]
            G.plocha(M['biela'], [(c[0][0], c[0][1], 4.6), (c[1][0], c[1][1], 4.6), (b[0], b[1], 4.6), (a[0], a[1], 4.6)])
            G.stena(M['biela'], b, a, 4.25, 4.6)
    les = odsad(O, 1.3)
    for i, p in enumerate(body_po(les, 2.0)):
        if p[0] > -12:                               # západný lalok
            continue
        G.tram(M['lesenie'], (p[0], p[1], 0.0), (p[0], p[1], vyska_stropu(3) + 1.0), 0.06)
    for z in (2.0, 4.0, 6.0, 8.0, 10.0, 12.0, 13.5):
        body = [p for p in body_po(les, 2.0) if p[0] <= -12]
        for a, b in zip(body, body[1:]):
            if dlzka(a, b) < 3.0:
                G.tram(M['lesenie'], (a[0], a[1], z), (b[0], b[1], z), 0.05)

    # vrch hrubej stavby: pás žltých ochranných panelov okolo ~3 vrchných podlaží
    top = odsad(obrys_np(STROPY), 0.6)
    z_hore = vyska_stropu(STROPY)
    for a, b in zip(top, top[1:] + top[:1]):
        G.stena(M['okrova'], a, b, vyska_stropu(STROPY - 3), z_hore + 2.0)
        G.stena(M['okrova'], b, a, vyska_stropu(STROPY - 3), z_hore + 2.0)
    G.pas(M['kov'], top, z_hore + 2.0, z_hore + 2.15, von=0.1, dnu=0.1)

    # jadro (výťahy a schodiská) v strednom páse: ~4 podlažia nad stropmi, samošplhacie debnenie navrchu
    c = (sum(p[0] for p in O) / len(O), sum(p[1] for p in O) / len(O))
    z_jadro = z_hore + 4 * 3.25
    G.kvader(M['beton'], c, (0.9397, -0.342), 14.0, 9.0, 0.0, z_jadro - 5.0)
    G.kvader(M['okrova'], c, (0.9397, -0.342), 15.6, 10.6, z_jadro - 6.0, z_jadro + 1.2, mat_vrch=M['kov'])
    for dz in (z_jadro - 3.5, z_jadro - 1.0):
        G.kvader(M['kov'], c, (0.9397, -0.342), 16.6, 11.6, dz, dz + 0.15, vrch=True)
    # betónovací stožiar (červený) s ramenom
    pz = (c[0] + 3.0, c[1] - 1.0)
    G.valec(M['cervena'], pz, 0.35, z_jadro + 1.2, z_jadro + 8.0, seg=8)
    G.tram(M['cervena'], (pz[0], pz[1], z_jadro + 8.0), (pz[0] - 16.0, pz[1] + 5.0, z_jadro + 6.5), 0.35)
    G.tram(M['cervena'], (pz[0] - 16.0, pz[1] + 5.0, z_jadro + 6.5), (pz[0] - 19.0, pz[1] + 6.0, z_jadro + 1.5), 0.2)

    # žeriavy: Z/SZ sklopný (žltý stožiar, červený výložník), V/SV celý žltý s vodorovným výložníkom
    xs = [p[0] for p in O]
    zapad = min(O, key=lambda p: p[0])
    vychod = max(O, key=lambda p: p[0])
    zeriav_sklopny(G, M, (zapad[0] - 4.5, zapad[1] + 6.0), (math.cos(0.35), math.sin(0.35)), 86.0)
    zeriav(G, M, (vychod[0] + 4.5, vychod[1] + 6.0), (math.cos(3.6), math.sin(3.6)), vyska=80.0, vylozenie=45.0)

    vyska = vyska_stropu(STROPY)
    return (G, [O], vyska, 'sky_park_tower',
            {'stred': [round(stred[0], 2), round(stred[1], 2)], 'vysky': [round(vyska, 1)]})
