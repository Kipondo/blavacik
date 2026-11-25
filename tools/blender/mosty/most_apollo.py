# Most Apollo (2005, Ing. M. Maťaščík / Dopravoprojekt, Doprastav): údaje a zdroje v napady/pamiatky-podklady.md,
# „Mosty cez Dunaj“.
#   – 854 m: betónová estakáda Petržalka (~110 m) + oceľový spojitý nosník 52,5 + 61 + 61 + 63 + 231 + 49 m
#     (piliere P6 … P12; P10 jediný v rieke pod južnou pätou oblúka, P11 na ľavom brehu pri vode) + betónová
#     estakáda Bratislava (195 m), za ňou ~120 m rampa medzi múrmi do Košickej,
#   – os mosta je v pôdoryse v oblúku – model sa stavia rovno pozdĺž x a hra ho ohne podľa osi (most-glb.js),
#   – šírka 32 m: 2 + 2 pruhy so stredným pásom, hlavné nosníky (tiahla) v rovinách závesov ±10,5 m, mimo nich
#     spoločné chodníky pre peších a cyklistov (~4 m, modré zábradlie); estakády ~22 m bez chodníkov,
#   – oblúk nad 231 m poľom: dve biele rebrá naklonené k sebe, pri pätách ±10,5 m, vo vrchole sa dotýkajú,
#     vrch rebier 187,8 m n. m. (~37 m nad vozovkou); 66 závesov (33 na rebro) do vejára („zapadajúce slnko“),
#   – vozovka z laseru DMP: Petržalka 141,4 → vrchol 150,5 pod oblúkom → Košická ~141,5.

import math

from veze import Geo, svetlo
from spolocne import material
from mostne import (data_mosta, profil, tyc_x, zabradlie, lampa, nosnik, lano, kvader_xyz, uloz_most, obdlznik_xy,
                    ohni_podla_profilu, piliere_estakady, opora, bocne_steny_nasypu, zem_modelu)

ZAVESOV = 33
Y_NOS = 10.5                     # hlavné nosníky (tiahla) a päty rebier od osi
POL = 16.0                       # polovica šírky oceľového mosta
POL_E = 11.0                     # polovica šírky estakád
VRCH_OBLUKA = 187.8 - 139.0      # vrch rebier v hre (y)


def postav():
    d = data_mosta('Most Apollo')
    L = d['L']
    p6, p7, p8, p9, p10, p11, p12 = d['piliere']
    koniec_estakady = d['nasypy'][0][0]               # ďalej rampa medzi múrmi
    zm = d['zm']
    biela = material('ocel-biela', '#e6e9eb', drsnost=0.4, kov=0.45)
    biela_d = material('detail-ocel-biela', '#e6e9eb', drsnost=0.4, kov=0.45)
    lana = material('zavesy', '#dfe3e6', drsnost=0.35, kov=0.7)
    mostovka = material('mostovka', '#8f8c86', drsnost=0.9)
    chodnik = material('chodnik', '#7d7a75', drsnost=0.9)
    beton = material('beton', '#aaa69d', drsnost=0.9)
    modra = material('detail-zabradlie-modre', '#3a64a8', drsnost=0.45, kov=0.5)
    zabr = material('detail-zabradlie', '#c9ced1', drsnost=0.4, kov=0.6)
    lampy = material('detail-lampa', '#9aa0a4', drsnost=0.4, kov=0.6)
    svetla = svetlo('svetlo-lampy', '#fff2d0', 1.5)

    G = Geo()
    kolizie = []

    # --- oceľový most P6 … P12: ortotropná doska, hlavné nosníky v rovinách závesov, chodníky mimo nich ---
    profil(G, mostovka, p6, p12, [(-Y_NOS + 0.8, -1.2), (Y_NOS - 0.8, -1.2), (Y_NOS - 0.8, 0.0), (-Y_NOS + 0.8, 0.0)], uzavriet=True)
    for s in (1, -1):
        tyc_x(G, biela, p6, p12, s * Y_NOS, -1.6, 1.6, 3.8)                          # hlavný nosník (tiahlo)
        a, b = sorted((s * (Y_NOS + 0.8), s * POL))
        profil(G, chodnik, p6 + 2, p12 - 2, [(a, -0.5), (b, -0.5), (b, 0.1), (a, 0.1)], uzavriet=True)
        tyc_x(G, biela, p6 + 2, p12 - 2, s * (POL - 0.15), -0.7, 0.3, 0.9)           # okrajový nosník konzoly
        zabradlie(G, modra, p6 + 2, p12 - 2, s * (POL - 0.2), 0.1, vyska=1.2, krok_stlpika=2.0, priecky=(0.4, 0.8))
        zabradlie(G, zabr, p6, p12, s * (Y_NOS - 1.0), 0.0, vyska=0.9, krok_stlpika=3.0)   # zvodidlo pri nosníku
    # priečniky pod doskou
    x = p6
    while x <= p12:
        kvader_xyz(G, biela_d, x, 0, -2.6, -1.2, 0.5, 2 * Y_NOS)
        x += 12.0

    # --- betónové estakády (komorový nosník s konzolami) a rampa medzi múrmi ---
    for a, b in ((0.0, p6), (p12, koniec_estakady)):
        profil(G, beton, a, b, [(-6.0, -2.4), (6.0, -2.4), (8.0, -0.6), (POL_E, -0.6), (POL_E, 0.2), (-POL_E, 0.2),
                               (-POL_E, -0.6), (-8.0, -0.6)], uzavriet=True)
        for s in (1, -1):
            zabradlie(G, zabr, a, b, s * (POL_E - 0.2), 0.2, vyska=1.1, krok_stlpika=2.5, priecky=(0.5,))
    profil(G, beton, koniec_estakady, L, [(-POL_E, -0.6), (POL_E, -0.6), (POL_E, 0.0), (-POL_E, 0.0)], uzavriet=True)
    bocne_steny_nasypu(G, beton, d, koniec_estakady, L, 2 * POL_E)
    for s in (1, -1):
        tyc_x(G, beton, koniec_estakady, L, s * (POL_E + 0.25), 0.5, 0.5, 1.2)        # múr nad rampou (parapet)
    opora(G, beton, d, 0.0, 1, 2 * POL_E, hlbka=2.4)
    opora(G, beton, d, koniec_estakady, -1, 2 * POL_E, hlbka=2.4)
    pod = [(a, b) for a, b, *_ in d.get('podjazdy', [])]
    piliere_estakady(G, beton, beton, d, 0.0, p6, 27.0, 2 * POL_E, hrubka=1.6, vynechaj=pod, hlbka=2.4, nad_zemou=3.0, kolizie=kolizie)
    piliere_estakady(G, beton, beton, d, p12, koniec_estakady, 24.4, 2 * POL_E, hrubka=1.6, vynechaj=pod, hlbka=2.4, nad_zemou=3.0, kolizie=kolizie)

    # --- piliere oceľového mosta: P10 v rieke (mohutný), P11 na brehu, ostatné steny pod nosníkmi ---
    for x, (dlz, sir) in ((p10, (9.0, 35.0)), (p11, (8.0, 33.0))):
        zem = min(zem_modelu(d, x), -12.0)
        obrys = [(x - dlz / 2, -sir / 2 + 3), (x - dlz / 2 + 1.5, -sir / 2), (x + dlz / 2 - 1.5, -sir / 2), (x + dlz / 2, -sir / 2 + 3),
                 (x + dlz / 2, sir / 2 - 3), (x + dlz / 2 - 1.5, sir / 2), (x - dlz / 2 + 1.5, sir / 2), (x - dlz / 2, sir / 2 - 3)]
        G.hranol(beton, [(px, py * 0.8) for px, py in obrys], zem - 25.0, -12.0)
        G.hranol(beton, obrys, -12.0, -3.6)
        kolizie.append(obdlznik_xy(x, 0, dlz, sir * 0.8))
    for x in (p6, p7, p8, p9, p12):
        zem = zem_modelu(d, x)
        for s in (1, -1):
            G.hranol(beton, obdlznik_xy(x, s * Y_NOS, 2.4, 4.0), zem - 2.0, -3.4)
            kolizie.append(obdlznik_xy(x, s * Y_NOS, 2.4, 4.0))
        G.hranol(beton, obdlznik_xy(x, 0, 2.8, 2 * Y_NOS + 5.0), -4.6, -3.4)

    # lampy v strednom páse
    x = 8.0
    while x < L - 4:
        if not (p10 - 6 < x < p11 + 6):
            lampa(G, lampy, svetla, x, 0.0, 0.0, vyska=10.0, rameno=1.6, smer=1)
        x += 34.0

    # všetko pri mostovke sa ohne podľa profilu – oblúk a závesy sa pridajú rovné v skutočnej výške
    ohni_podla_profilu(G, d)

    # --- oblúkové rebrá: päty pri P10 a P11, vrchol 187,8 m n. m., rebrá naklonené k sebe, vo vrchole sa dotýkajú ---
    xa, xb = p10, p11
    xc = (xa + xb) / 2
    pol = (xb - xa) / 2
    z_pata_a, z_pata_b = zm(xa) + 1.0, zm(xb) + 1.0
    z_vrch = VRCH_OBLUKA - d['vrch'] - 1.4             # os rebra pod vrchom

    def rebro(t, s):
        x = xa + (xb - xa) * t
        dd = abs(x - xc) / pol
        zp = z_pata_a + (z_pata_b - z_pata_a) * t
        return (x, s * (1.8 + (Y_NOS - 1.8) * dd * dd), zp + (z_vrch - zp) * (1 - dd * dd))
    N = 48
    for s in (1, -1):
        for k in range(N):
            a, b = rebro(k / N, s), rebro((k + 1) / N, s)
            nosnik(G, biela, a, b, 3.0, 2.8, hore=(0, 0, 1))
        # päty oblúka – oceľové kliny vyrastajúce z mostovky
        for x, zp in ((xa, z_pata_a), (xb, z_pata_b)):
            G.hranol(biela, obdlznik_xy(x, s * Y_NOS, 9.0, 3.4), zp - 3.0, zp + 2.0)
    # spoj rebier vo vrchole
    G.hranol(biela, obdlznik_xy(xc, 0, 26.0, 1.0), z_vrch - 1.2, z_vrch + 1.2)

    # --- závesy do vejára: na moste rovnomerne, na rebre bližšie k vrcholu (lúče „zapadajúceho slnka“) ---
    for s in (1, -1):
        for k in range(ZAVESOV):
            t = (k + 1) / (ZAVESOV + 1)
            xd = xa + (xb - xa) * t
            tr = 0.5 + (t - 0.5) * 1.18
            hore = rebro(min(0.97, max(0.03, tr)), s)
            lano(G, lana, (hore[0], hore[1], hore[2] - 1.3), (xd, s * Y_NOS, zm(xd) + 0.6), r=0.09)
    return G, d, kolizie


def main():
    G, d, kolizie = postav()
    uloz_most(G, 'most-apollo', d, kolizie)
