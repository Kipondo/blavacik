# Trojica obytných domov za supermarketom na Račianskej (2019 – 2021): dve veže (17 a 20 podlaží)
# spojené nižším osempodlažným blokom. Najvýraznejšia je fasáda: každý byt má pred oknom svetlý rám
# („krabicu“) vystúpený pred tmavú presklenú stenu, rámy sú na každom podlaží posunuté inak, takže
# fasáda pôsobí ako náhodne poskladané kocky. Prízemie je presklené (obchody, lekáreň), strechy sú zelené.
# Pri vežiach stojí zachovaný betónový bunker so sedlovou strechou.
# Pôdorysy a počty podlaží z OSM (tools/blender/osm_garda.mjs → data/garda.json).

import math
import random

from spolocne import material
from veze import Geo, dlzka, normala, odsad, strecha as plocha_strecha, stred_obrysu, sklo

from garda.zaklad import data, obrys_bl

PRIZEMIE = 4.5
PODLAZIE = 3.05
MODUL = 2.9      # šírka rámu (m)
HLBKA = 0.85     # o koľko rám vystupuje pred stenu
HRUBKA = 0.2


def materialy():
    return {
        'ram': material('ram-krabice', '#d7d9d8', drsnost=0.35, kov=0.45),
        'stena': material('stena-tmava-veze', '#2b2f33', drsnost=0.5, kov=0.2),
        'sklo': sklo('sklo-byty', '#33414a', drsnost=0.05, kov=0.75),
        'doska': material('doska-podlazia', '#9ea2a3', drsnost=0.7),
        'zabradlie': material('detail-zabradlie-sklo', '#8fa3ad', drsnost=0.1, kov=0.3),
        'prizemie': material('prizemie-tmave', '#3a3d40', drsnost=0.5, kov=0.3),
        'vyklad': sklo('sklo-vyklad-veze', '#4a5a63', drsnost=0.05, kov=0.7),
        'zelen': material('zelena-strecha', '#5f8a3e', drsnost=0.95),
        'ker': material('ker-strecha', '#3f6b34', drsnost=0.95),
        'atika': material('atika-veze', '#cfd1d0', drsnost=0.5, kov=0.3),
        'beton': material('beton-bunker', '#9c9a94', drsnost=0.9),
        'beton_tmavy': material('beton-bunker-strecha', '#7c7a75', drsnost=0.9),
    }


def ram_krabice(G, M, a, ux, uy, nx, ny, s, w, z0, z1):
    """Jeden vystúpený rám (krabica) šírky w na hrane od bodu a v polohe s, medzi výškami z0 – z1."""
    c = (a[0] + ux * (s + w / 2), a[1] + uy * (s + w / 2))
    d = HLBKA
    cc = (c[0] + nx * d / 2, c[1] + ny * d / 2)
    # horná a dolná doska rámu
    G.kvader(M['ram'], cc, (ux, uy), w, d, z1 - HRUBKA, z1, spodok=True)
    G.kvader(M['ram'], cc, (ux, uy), w, d, z0, z0 + HRUBKA, spodok=True)
    # bočnice
    for t in (-1, 1):
        p = (cc[0] + ux * t * (w / 2 - HRUBKA / 2), cc[1] + uy * t * (w / 2 - HRUBKA / 2))
        G.kvader(M['ram'], p, (ux, uy), HRUBKA, d, z0 + HRUBKA, z1 - HRUBKA, vrch=False)
    # sklenené zábradlie v ráme
    G.kvader(M['zabradlie'], (c[0] + nx * (d - 0.08), c[1] + ny * (d - 0.08)), (ux, uy), w - 2 * HRUBKA, 0.03, z0 + HRUBKA, z0 + HRUBKA + 1.0)


def fasada_krabic(G, M, obrys, pocet_podlazi, rnd):
    n = len(obrys)
    vrch = PRIZEMIE + pocet_podlazi * PODLAZIE
    for i in range(n):
        a, b = obrys[i], obrys[(i + 1) % n]
        L = dlzka(a, b)
        if L < 0.3:
            continue
        ux, uy = (b[0] - a[0]) / L, (b[1] - a[1]) / L
        nx, ny = uy, -ux
        # prízemie: výklady medzi tmavými piliermi
        G.stena(M['prizemie'], a, b, -0.5, 0.3)
        G.panel(M['vyklad'], a, b, 0.3, PRIZEMIE - 0.6, rnd, 0.002)
        G.stena(M['prizemie'], a, b, PRIZEMIE - 0.6, PRIZEMIE)
        k = 0.0
        while k <= L + 0.01:
            G.kvader(M['prizemie'], (a[0] + ux * k + nx * 0.1, a[1] + uy * k + ny * 0.1), (ux, uy), 0.3, 0.2, -0.5, PRIZEMIE)
            k += max(2.0, L / max(1, round(L / 4.0)))
        # tmavá presklená stena poschodí (v línii obrysu) a čelá stropných dosiek
        G.panel(M['sklo'], a, b, PRIZEMIE, vrch, rnd, 0.0015)
        for p in range(pocet_podlazi + 1):
            z = PRIZEMIE + p * PODLAZIE
            G.kvader(M['doska'], ((a[0] + b[0]) / 2 + nx * 0.04, (a[1] + b[1]) / 2 + ny * 0.04), (ux, uy), L, 0.08, z - 0.12, z + 0.1)
        if L < MODUL + 0.6:
            continue
        # rámy: na každom podlaží iný posun, medzery medzi rámami 0,2 – 1,4 m
        for p in range(pocet_podlazi):
            z0 = PRIZEMIE + p * PODLAZIE + 0.06
            z1 = z0 + PODLAZIE - 0.12
            s = rnd.uniform(0.0, 1.2)
            while s + MODUL <= L - 0.15:
                if rnd.random() > 0.08:                 # tu a tam rám chýba (lodžia bez rámu)
                    ram_krabice(G, M, a, ux, uy, nx, ny, s, MODUL, z0, z1)
                s += MODUL + rnd.choice((0.25, 0.45, 0.8, 1.3))
    # atika a zelená strecha s kríkmi
    plocha_strecha(G, obrys, vrch, M['zelen'], M['atika'], atika=1.2, hrubka_atiky=0.35)
    st = stred_obrysu(obrys)
    for k in range(7):
        u = rnd.uniform(0, 2 * math.pi)
        r = rnd.uniform(1.5, 5.0)
        c = (st[0] + math.cos(u) * r, st[1] + math.sin(u) * r)
        G.valec(M['ker'], c, rnd.uniform(0.6, 1.1), vrch + 0.05, vrch + rnd.uniform(0.7, 1.6), seg=7, r1=0.3)
    return vrch


def bunker(G, M, obrys):
    """Zachovaný betónový bunker: dvojpodlažný hranol so sedlovou strechou, malé okienka."""
    from hrad.stavebne import strecha_sedlova
    n = len(obrys)
    H = 6.2
    for i in range(n):
        G.stena(M['beton'], obrys[i], obrys[(i + 1) % n], -0.5, H)
    strecha_sedlova(G, obrys, H, 2.6, M['beton_tmavy'], M['beton'], presah=0.3)
    # okienka (tmavé štrbiny) na dlhších stenách
    for i in range(n):
        a, b = obrys[i], obrys[(i + 1) % n]
        L = dlzka(a, b)
        if L < 6:
            continue
        ux, uy = (b[0] - a[0]) / L, (b[1] - a[1]) / L
        nx, ny = uy, -ux
        for t in (0.3, 0.7):
            c = (a[0] + ux * L * t + nx * 0.02, a[1] + uy * L * t + ny * 0.02)
            G.kvader(M['stena'], c, (ux, uy), 1.0, 0.04, 3.6, 4.6)


def postav():
    D = data()
    M = materialy()
    rnd = random.Random(2021)
    G = Geo()
    vsetky = [p for v in D['veze'] for p in v['body']]
    stred = (round(sum(p[0] for p in vsetky) / len(vsetky), 2), round(sum(p[1] for p in vsetky) / len(vsetky), 2))
    obrysy, vyska = [], 0
    for v in D['veze']:
        o = obrys_bl(v['body'], stred, 0.35)
        lv = int(v['t'].get('building:levels', 8))
        vyska = max(vyska, fasada_krabic(G, M, o, lv - 1, rnd))
        obrysy.append(o)
    # bunker (OSM 1136278184) pri veži A
    bo = obrys_bl(D['bunker']['body'], stred, 0.1)
    bunker(G, M, bo)
    obrysy.append(bo)
    info = {'stred': [stred[0], stred[1]], 'nazov': 'Obytné veže na Račianskej', 'dosah': 70, 'ao': False}
    return G, obrysy, vyska + 2, 'veze-racianska', info
