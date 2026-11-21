# Televízna veža na Kamzíku (1975, 194 m) na vrchole Malých Karpát: betónový driek nesený tromi šikmými
# nohami, kabína s technickým podlažím, presklenou (otáčavou) reštauráciou a vyhliadkou, nad ňou driek
# a oceľový anténny stožiar s červeno-bielymi pásmi a výstražnými svetlami. Poloha a výška z OSM.

import math

from veze import Geo, z_hry, svetlo
from spolocne import material

H = 194.0


def prstenec(G, mat, c, r0, r1, z, seg=32, hore=True):
    for k in range(seg):
        a0, a1 = 2 * math.pi * k / seg, 2 * math.pi * (k + 1) / seg
        q = [(c[0] + r1 * math.cos(a0), c[1] + r1 * math.sin(a0), z), (c[0] + r0 * math.cos(a0), c[1] + r0 * math.sin(a0), z),
             (c[0] + r0 * math.cos(a1), c[1] + r0 * math.sin(a1), z), (c[0] + r1 * math.cos(a1), c[1] + r1 * math.sin(a1), z)]
        G.plocha(mat, q if hore else q[::-1])


def postav(obrysy):
    h = obrysy['kamzik-veza']['hlavne'][0]
    stred = (sum(p[0] for p in h['body']) / len(h['body']), sum(p[1] for p in h['body']) / len(h['body']))
    beton = material('kamzik-beton', '#c9cbc8', drsnost=0.8)
    beton2 = material('kamzik-beton-tmavy', '#aeb1ae', drsnost=0.85)
    sklo_m = material('kamzik-sklo', '#3f5664', drsnost=0.06, kov=0.7)
    hlinik = material('kamzik-hlinik', '#b9c0c4', drsnost=0.35, kov=0.75)
    cervena = material('kamzik-cervena', '#c23a2c', drsnost=0.5)
    biela = material('kamzik-biela', '#f1f1ee', drsnost=0.5)
    oc = material('kamzik-ocel', '#8b9196', drsnost=0.45, kov=0.7)
    svetlo_c = svetlo('kamzik-svetlo', '#ff2a1a', 6.0)
    G = Geo()
    c = (0.0, 0.0)
    # tri šikmé nohy (dutý betón, rebrá) od päty v kruhu r=14 m po driek vo výške 46 m
    for k in range(3):
        u = math.radians(90 + k * 120)
        a = (c[0] + 14.5 * math.cos(u), c[1] + 14.5 * math.sin(u), -2.0)
        b = (c[0] + 3.2 * math.cos(u), c[1] + 3.2 * math.sin(u), 46.0)
        G.tram(beton, a, b, 4.2)
        G.tram(beton2, (a[0] * 1.02, a[1] * 1.02, a[2]), (b[0] * 1.15, b[1] * 1.15, b[2] - 6), 1.2)
        G.kvader(beton2, (a[0], a[1]), (math.cos(u), math.sin(u)), 7.0, 7.0, -2.0, 1.2)
    # driek: zužujúci sa valec, vstupná budova dole
    G.valec(beton, c, 4.6, -2.0, 70.0, seg=24, r1=3.6)
    G.valec(sklo_m, c, 9.0, 0.0, 4.2, seg=24)
    G.valec(beton2, c, 9.6, 4.2, 5.0, seg=24)
    # kabina: technické podlažie (betón), reštaurácia (sklo), vyhliadka s rímsou
    z0 = 70.0
    G.valec(beton2, c, 6.0, z0, z0 + 3.0, seg=32, r1=12.0)
    G.valec(beton, c, 12.0, z0 + 3.0, z0 + 7.0, seg=32, r1=12.5)
    for k in range(48):
        a = 2 * math.pi * k / 48
        G.kvader(hlinik, (12.6 * math.cos(a), 12.6 * math.sin(a)), (-math.sin(a), math.cos(a)), 0.12, 0.3, z0 + 3.0, z0 + 7.0)
    G.valec(sklo_m, c, 13.2, z0 + 7.0, z0 + 11.0, seg=40, r1=13.6)
    prstenec(G, hlinik, c, 0.0, 14.0, z0 + 11.0, seg=40, hore=False)
    G.valec(hlinik, c, 14.0, z0 + 11.0, z0 + 11.6, seg=40)
    G.valec(sklo_m, c, 12.4, z0 + 11.6, z0 + 14.6, seg=40, r1=12.0)
    G.valec(beton, c, 12.6, z0 + 14.6, z0 + 15.4, seg=40, r1=11.0)
    # zábradlie vyhliadky
    for k in range(64):
        a = 2 * math.pi * k / 64
        G.tram(oc, (13.8 * math.cos(a), 13.8 * math.sin(a), z0 + 11.6), (13.8 * math.cos(a), 13.8 * math.sin(a), z0 + 12.7), 0.05)
    G.valec(oc, c, 13.85, z0 + 12.65, z0 + 12.75, seg=40)
    # horná časť drieku s anténnymi plošinami
    G.valec(beton, c, 3.6, z0 + 15.4, 118.0, seg=20, r1=2.6)
    for z in (100.0, 112.0):
        G.valec(beton2, c, 5.5, z, z + 1.2, seg=20)
    # oceľový stožiar s červeno-bielymi pásmi
    z = 118.0
    r = 1.6
    pas = 0
    while z < H - 0.5:
        dz = min(7.6, H - z)
        G.valec(cervena if pas % 2 == 0 else biela, c, r, z, z + dz, seg=12, r1=max(0.35, r - 0.12))
        r = max(0.35, r - 0.12)
        z += dz
        pas += 1
    # výstražné svetlá
    for z in (88.0, 118.0, 150.0, H - 0.2):
        for k in range(3):
            a = 2 * math.pi * k / 3
            rr = 13.0 if z < 100 else 1.9
            G.kvader(svetlo_c, (rr * math.cos(a), rr * math.sin(a)), (1, 0), 0.35, 0.35, z, z + 0.35)
    return G, [[(-6, -6), (6, -6), (6, 6), (-6, 6)]], H, 'kamzik', {'stred': [round(stred[0], 2), round(stred[1], 2)]}
