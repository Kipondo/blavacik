# Eurovea 2 (Pribinova; GFI – R. Grečmal, P. Franko; verejné priestory Beth Galí; 2019–2023) – rozšírenie
# nákupného centra s hadou presklenou strechou, kancelárie Pribinova 34 a 40, byty Eurovea Riverside a socha
# z farebných gúľ v parku pred vstupom (#131, časť 2). Eurovea Tower má vlastný model (eurovea_tower.py).
# Podklady: tools/blender/osm_eurovea.py --cast 2 → data/eurovea-2.json (časti budov z OSM, výška z lasera, terén,
# vchody, poloha sochy); výšky podľa dokumentácie EIA (2017), opis fasád a odkazy v napady/pamiatky-podklady.md
# (prieskum podľa #130: OSM, laser ÚGKK, EIA, stránky architekta, Wikimedia Commons, články; bez Google).
#   – nákupné centrum: teleso 12,4 m so zelenou (rozchodníkovou) strechou, v nej hadia presklená strecha (OSM
#     way 1164819251, ~165 m, 9–20 m široká) – trojuholníková sieť, klenba sa v „bublinách“ mení na plochú kupolu,
#     okolo svetlý obvodový lem so skrinkami; na východnom konci presklený valec vstupnej haly;
#   – Pribinova 34: východná 9-podlažná časť tmavé zrkadlové sklo s čiernymi pásmi a béžovými štvorcami, parter
#     s bronzovými lamelami; západná 8-podlažná bronzový rám so štvorcovými oknami; horné podlažia ustúpené; do
#     dvora (nad strechou centra) biele pásy s pásovými oknami;
#   – Riverside: terakotové bloky s vysunutými balkónmi, biele „krčky“ s lodžiami, krémová sekcia E na nároží;
#   – Pribinova 40: podnož z perforovaných panelov, kancelárie tmavé sklo so šampanskými pásmi a lamelami,
#     posledné 3 podlažia ustupujú od Dunaja;
#   – blok s plnou béžovo-okrovou fasádou pri Sklade č. 7 (kiná / technika) s chladičmi na streche.
# Socha v parku je vlastné zjednodušené stvárnenie „molekuly“ z farebných gúľ a priehradových nosníkov (nie kópia
# skutočného diela). Názvy obchodov, nápisy a logá sa do hry nedávajú.

import copy
import json
import math
import os
import random

from veze import Geo, odsad, dlzka, normala, plocha_obrysu, do_hry, sklo, hladka, strojovna
from spolocne import material
from vyskove import eurovea_1 as e1

TU = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

NC = 'r15756118'                    # teleso nákupného centra (multipolygón, diera = hadia strecha)
HAD = 'w1164819251'                 # hadia presklená strecha
P40 = 'w1164819253'                 # kancelárie Pribinova 40 (6.–15. NP)
BUBEN_X = 1385.0                    # m (x hry) – východne odtiaľto je okraj centra presklený valec vstupnej haly
VYSKA_NC = 12.4                     # m – atika centra (EIA +12,425, laser 12,4)
LEM = 2.8                           # m – svetlý obvodový lem okolo sklenej strechy

STYLY_E2 = {
    'r21708456': 'okrova',
    'r21708457': 'p34_zapad', 'r21708458': 'p34_vychod',
    NC: 'nc',
    'r21708464': 'terakota', 'r21708462': 'terakota',
    'r21708463': 'krcok', 'r21708461': 'krcok',
    'r21708460': 'sekcia_e',
    'r22198600': 'p40_podnoz', 'r22198599': 'p40_podnoz',
    P40: 'p40',
}
# výšky (bez atiky 0,9 m): EIA 2017 – P34 38,7 / 41,0 m, Riverside A–D 28,7 m, sekcia E 31,8 m, P40 podnož 20,1 m
# a kancelárie 57,6 m; krčky Riverside z lasera; blok pri Sklade č. 7 odhad 28 m (fotka, rez EIA)
VYSKY_E2 = {
    'r21708456': 27.5, 'r21708457': 37.8, 'r21708458': 40.1, NC: VYSKA_NC,
    'r21708464': 27.8, 'r21708462': 27.8, 'r21708460': 30.9,
    'r22198600': 20.1, 'r22198599': 9.0, P40: 56.7,
}
PRIZEMIE_E2 = {'okrova': 6.0, 'p34_zapad': 7.0, 'p34_vychod': 8.0, 'terakota': 6.3, 'krcok': 6.3, 'sekcia_e': 7.0}

_nc = None                           # obrys centra (pomôcka pre fasády do dvora)


def materialy():
    M = e1.materialy()
    M.update({
        # Pribinova 34
        'zrkadlo': sklo('sklo-p34-zrkadlove', '#2e3439', drsnost=0.03, kov=0.9),
        'sklo_p34': sklo('sklo-p34', '#4a565c', drsnost=0.05, kov=0.8),
        'cierna': material('pas-p34-cierny', '#1e1f21', drsnost=0.3, kov=0.4),
        'sampan': material('stvorce-p34-sampan', '#c9b48f', drsnost=0.5, kov=0.3),
        'lamely': material('lamely-p34-bronz', '#b88d66', drsnost=0.5, kov=0.4),
        'bronz': material('ram-p34-bronzovy', '#6e5a47', drsnost=0.55, kov=0.35),
        'tmavosivy': material('obklad-p34-tmavosivy', '#3c3f43', drsnost=0.6, kov=0.2),
        'biela2': material('pas-eurovea2-biely', '#e6e6e2', drsnost=0.7),
        # blok pri Sklade č. 7
        'bezovy2': material('panely-eurovea2-bezove', '#e2dccb', drsnost=0.75),
        'okrovy': material('panely-eurovea2-okrove', '#c9ae6f', drsnost=0.7, kov=0.15),
        'chladic': material('chladice-strecha', '#b9bcbe', drsnost=0.6, kov=0.4),
        # Riverside
        'terakota2': material('obklad-riverside-terakota', '#a95a3e', drsnost=0.8),
        'balkon_svetly': material('balkon-riverside-svetly', '#d5d8da', drsnost=0.5, kov=0.4),
        'balkon_cierny': material('balkon-riverside-cierny', '#2a2c2f', drsnost=0.5, kov=0.3),
        'antracit': material('obklad-riverside-antracit', '#474b50', drsnost=0.6, kov=0.2),
        'krem_e': material('ram-riverside-kremovy', '#dad4c6', drsnost=0.75),
        # Pribinova 40
        'sklo_p40': sklo('sklo-p40', '#4d565c', drsnost=0.04, kov=0.85),
        'pas_p40': material('pas-p40-sampan', '#bdb29c', drsnost=0.45, kov=0.45),
        'perfor': material('panely-p40-perforovane', '#ada592', drsnost=0.6, kov=0.5),
        # centrum a strecha
        'zelen2': material('strecha-rozchodnik', '#7d8a4e', drsnost=1.0),
        'lem': material('lem-sklenej-strechy', '#c9c8c2', drsnost=0.85),
        'skrinka': material('detail-skrinky-strecha', '#edede8', drsnost=0.7),
        'buben': sklo('sklo-vstupna-hala', '#9fb8be', drsnost=0.04, kov=0.6),
        'ram_hala': material('detail-ram-vstupna-hala', '#2f3336', drsnost=0.5, kov=0.5),
        'nerez': material('striezka-nerez', '#c4c8cb', drsnost=0.25, kov=0.85),
        # socha
        'strk': material('strk-pod-sochou', '#d8ccb2', drsnost=1.0),
        'trus': material('nosnik-socha-strieborny', '#c8cdd2', drsnost=0.35, kov=0.8),
        'trus_d': material('detail-nosnik-socha', '#c8cdd2', drsnost=0.35, kov=0.8),
    })
    return M


# --- pomôcky ----------------------------------------------------------------------------------------

class Cast2(e1.Cast):
    """Časť Eurovea 2: ako v Eurovea 1, navyše vlastné výšky podláh (ustúpené podlažia, kancelárie P40)."""

    def __init__(self, c, st, z_ref):
        super().__init__(c, st, z_ref)
        self.urovne_z = None
        self.cudzia = False

    def urovne(self):
        return self.urovne_z if self.urovne_z else super().urovne()


def nova(c, **kw):
    d = copy.copy(c)
    d.__dict__.update(kw)
    return d


def ustup(c, pocet, d, styl):
    """Rozdelí časť na spodok a horných `pocet` podlaží odsadených o d m (strešné terasy)."""
    u = c.urovne()
    if len(u) < pocet + 3:
        return [c]
    z_rez = u[-1 - pocet]
    dole = nova(c, z1=z_rez, urovne_z=u[:-pocet])
    hore = nova(c, id=c.id + '-ustup', body=odsad(c.body, -d), z0=z_rez, styl=styl, urovne_z=u[-1 - pocet:])
    return [dole, hore]


def orez_juh(body, y_rez):
    """Polygón orezaný na časť severne od y_rez (y = sever) – Sutherland–Hodgman."""
    out = []
    n = len(body)
    for i in range(n):
        a, b = body[i], body[(i + 1) % n]
        ina, inb = a[1] >= y_rez, b[1] >= y_rez
        if ina:
            out.append(a)
        if ina != inb:
            t = (y_rez - a[1]) / (b[1] - a[1])
            out.append((a[0] + (b[0] - a[0]) * t, y_rez))
    return out


def bod_na(a, b, s):
    L = dlzka(a, b) or 1e-9
    return (a[0] + (b[0] - a[0]) * s / L, a[1] + (b[1] - a[1]) * s / L)


def do_dvora(c, a, b, n):
    """Stena hľadí na strechu nákupného centra (dvor medzi P34 a Riverside)?"""
    if _nc is None or c.id == NC:
        return False
    m = ((a[0] + b[0]) / 2 + n[0] * 0.6, (a[1] + b[1]) / 2 + n[1] * 0.6)
    return e1.vnutri(m[0], m[1], _nc.body)


def plocha_s_dierou(G, mat, obrys, diera, z):
    """Vodorovná plocha s dierou (strecha centra okolo sklenej strechy) – triangulácia s obmedzenými hranami."""
    from mathutils import Vector
    from mathutils.geometry import delaunay_2d_cdt
    body = list(obrys) + list(diera)
    n1, n2 = len(obrys), len(diera)
    hrany = [(i, (i + 1) % n1) for i in range(n1)] + [(n1 + i, n1 + (i + 1) % n2) for i in range(n2)]
    vys = delaunay_2d_cdt([Vector(p) for p in body], hrany, [], 2, 1e-4)
    V, F = vys[0], vys[2]
    for tr in F:
        if len(tr) != 3:
            continue
        a, b, d = (V[i] for i in tr)
        cx, cy = (a.x + b.x + d.x) / 3, (a.y + b.y + d.y) / 3
        if not e1.vnutri(cx, cy, obrys) or e1.vnutri(cx, cy, diera):
            continue
        pts = [(a.x, a.y, z), (b.x, b.y, z), (d.x, d.y, z)]
        if (b.x - a.x) * (d.y - a.y) - (b.y - a.y) * (d.x - a.x) < 0:
            pts.reverse()
        G.plocha(mat, pts)


def ramova(G, M, a, b, n, z0, z1, mat, sklo_m, *, os, sirka, parapet, nadokno, vnor=0.25, lodzie=0, zabradlie=None):
    """Pravidelný rám (piliere + parapety) s oknami vnorenými o `vnor`; každá `lodzie`-tá os je hlboká lodžia
    so skleným zábradlím v líci."""
    L = dlzka(a, b)
    zo, zh = z0 + parapet, z1 - nadokno
    G.stena(mat, a, b, z0, zo)
    G.stena(mat, a, b, zh, z1)
    pocet = int(L // os)
    if pocet < 1 or zh - zo < 0.6:
        G.stena(mat, a, b, zo, zh)
        return
    okraj = (L - pocet * os) / 2
    s_pred = 0.0
    for k in range(pocet):
        lod = lodzie and k % lodzie == lodzie // 2
        sir = os - 0.5 if lod else sirka
        st = okraj + os * (k + 0.5)
        s0, s1 = st - sir / 2, st + sir / 2
        p0, p1 = bod_na(a, b, s0), bod_na(a, b, s1)
        G.stena(mat, bod_na(a, b, s_pred), p0, zo, zh)
        d = 1.3 if lod else vnor
        zd = z0 if lod else zo
        p0i, p1i = e1.posun(p0, n, -d), e1.posun(p1, n, -d)
        G.stena(sklo_m, p0i, p1i, zd, zh)
        G.stena(mat, p0i, p0, zd, zh)
        G.stena(mat, p1, p1i, zd, zh)
        if not lod:
            G.plocha(mat, [(p0[0], p0[1], zo), (p1[0], p1[1], zo), (p1i[0], p1i[1], zo), (p0i[0], p0i[1], zo)])
        else:
            G.stena(zabradlie or M['zabradlie'], e1.posun(p0, n, -0.05), e1.posun(p1, n, -0.05), z0, z0 + 1.05)
        G.plocha(mat, [(p0i[0], p0i[1], zh), (p1i[0], p1i[1], zh), (p1[0], p1[1], zh), (p0[0], p0[1], zh)])
        s_pred = s1
    G.stena(mat, bod_na(a, b, s_pred), b, zo, zh)


def vyklady(G, M, a, b, n, z0, z1, krok=3.0, mat_ram=None):
    """Presklený parter: výklady v tmavých rámoch, nad nimi pás."""
    e1.pas_okien(G, M, a, b, n, z0, z1, M['vyklad'], parapet=0.0, nadokno=0.8, mat=mat_ram or M['ram'], krok=krok)


# --- fasády (e1.FASADY: funkcia(G, M, c, a, b, n, za, zb, i, k)) --------------------------------------

def je_prizemie(c, za):
    return za <= c.zem + 0.01


def f_okrova(G, M, c, a, b, n, za, zb, i, k):
    """Plná fasáda z veľkých béžových a okrových panelov v šikmých pásoch, tenké štrbiny; parter presklený."""
    if je_prizemie(c, za):
        return vyklady(G, M, a, b, n, za, zb)
    G.stena(M['ram'], a, b, za, za + 0.12)
    L = dlzka(a, b)
    stlpcov = max(1, round(L / 4.0))
    radov = 2
    hz = (zb - za - 0.12) / radov
    for r in range(radov):
        for s in range(stlpcov):
            mat = M['okrovy'] if ((s + k * radov + r) // 2) % 3 == 0 else M['bezovy2']
            G.stena(mat, bod_na(a, b, L * s / stlpcov), bod_na(a, b, L * (s + 1) / stlpcov),
                    za + 0.12 + hz * r, za + 0.12 + hz * (r + 1))


def f_dvor(G, M, a, b, n, za, zb):
    """Do dvora (nad strechou centra): biele vodorovné pásy a pásové okná."""
    e1.pas_okien(G, M, a, b, n, za, zb, M['sklo_p34'], parapet=1.0, nadokno=0.35, mat=M['biela2'], krok=1.5)


def f_p34_vychod(G, M, c, a, b, n, za, zb, i, k):
    if do_dvora(c, a, b, n):
        return f_dvor(G, M, a, b, n, za, zb)
    L = dlzka(a, b)
    tx, ty = (b[0] - a[0]) / L, (b[1] - a[1]) / L
    if je_prizemie(c, za):
        # dvojpodlažný parter: tmavé sklo za radom bronzových lamiel, nad nimi čierna lesklá rímsa
        G.stena(M['zrkadlo'], e1.posun(a, n, -0.5), e1.posun(b, n, -0.5), za, zb - 1.0)
        G.pas(M['cierna'], [a, b], zb - 1.0, zb, von=0.2, dnu=0.5, uzavreta=False)
        pocet = int(L // 1.4)
        for j in range(pocet):
            p = e1.posun(bod_na(a, b, (L - pocet * 1.4) / 2 + 1.4 * (j + 0.5)), n, -0.1)
            G.kvader(M['lamely'], p, (tx, ty), 0.3, 0.6, za, zb - 1.0, vrch=False)
        return
    # zrkadlové sklo, čierny pás na úrovni stropu, béžové štvorce pod oknami šachovnicovo
    G.stena(M['zrkadlo'], a, b, za + 0.55, zb)
    G.stena(M['cierna'], a, b, za, za + 0.55)
    pocet = int(L // 2.4)
    for j in range(pocet):
        if (j + k) % 2:
            continue
        s = (L - pocet * 2.4) / 2 + 2.4 * j + 0.7
        G.stena(M['sampan'], e1.posun(bod_na(a, b, s), n, 0.03), e1.posun(bod_na(a, b, s + 1.0), n, 0.03),
                za + 0.6, za + 1.6)


def f_p34_zapad(G, M, c, a, b, n, za, zb, i, k):
    if do_dvora(c, a, b, n):
        return f_dvor(G, M, a, b, n, za, zb)
    if je_prizemie(c, za):
        vyklady(G, M, a, b, n, za, zb, mat_ram=M['bronz'])
        L = dlzka(a, b)
        tx, ty = (b[0] - a[0]) / L, (b[1] - a[1]) / L
        pocet = max(1, round(L / 6.0))
        for j in range(1, pocet):
            G.kvader(M['bronz'], e1.posun(bod_na(a, b, L * j / pocet), n, 0.25), (tx, ty), 0.6, 0.5, za, zb - 0.8, vrch=False)
        return
    ramova(G, M, a, b, n, za, zb, M['bronz'], M['sklo_p34'], os=2.4, sirka=1.6, parapet=0.9, nadokno=0.7)


def f_ustup_tmavy(G, M, c, a, b, n, za, zb, i, k):
    e1.pas_okien(G, M, a, b, n, za, zb, M['sklo_p34'], parapet=0.9, nadokno=0.5, mat=M['tmavosivy'], krok=1.5)


def balkon(G, M, a, b, n, s, za, zb, mat_ram):
    """Vysunutý balkón v ráme (bočnice a strop svetlé alebo čierne), sklené zábradlie."""
    L = dlzka(a, b)
    tx, ty = (b[0] - a[0]) / L, (b[1] - a[1]) / L
    p = bod_na(a, b, s)
    c = e1.posun(p, n, 0.55)
    G.kvader(M['biela2'], c, (tx, ty), 2.4, 1.1, za, za + 0.25)
    G.stena(M['zabradlie'], e1.posun(bod_na(a, b, s - 1.15), n, 1.1), e1.posun(bod_na(a, b, s + 1.15), n, 1.1),
            za + 0.25, za + 1.25)
    for sgn in (-1, 1):
        G.kvader(mat_ram, e1.posun(bod_na(a, b, s + sgn * 1.15), n, 0.55), n, 1.1, 0.12, za, zb, vrch=False)
    G.kvader(mat_ram, c, (tx, ty), 2.42, 1.1, zb - 0.18, zb)


def f_terakota(G, M, c, a, b, n, za, zb, i, k):
    """Terakotový keramický obklad, okná v tmavých rámoch, biele rímsy, vysunuté balkóny striedavo svetlé a čierne."""
    if je_prizemie(c, za):
        return vyklady(G, M, a, b, n, za, zb)
    G.pas(M['biela2'], [a, b], za, za + 0.25, von=0.12, uzavreta=False)
    ramova(G, M, a, b, n, za + 0.25, zb, M['terakota2'], M['sklo_byty'], os=3.0, sirka=1.5, parapet=0.6, nadokno=0.45)
    L = dlzka(a, b)
    if do_dvora(c, a, b, n) or L < 4.0:
        return
    pocet = int(L // 3.0)
    okraj = (L - pocet * 3.0) / 2
    for j in range(pocet):
        if (j + k) % 3 == 0:
            mat = M['balkon_svetly'] if (j // 3 + i) % 2 else M['balkon_cierny']
            balkon(G, M, a, b, n, okraj + 3.0 * (j + 0.5), za, zb, mat)


def f_krcok(G, M, c, a, b, n, za, zb, i, k):
    """Biele „krčky“ medzi blokmi: hlboké lodžie so sklenými zábradliami a bielymi piliermi."""
    if je_prizemie(c, za):
        return vyklady(G, M, a, b, n, za, zb)
    M2 = dict(M, terakota=M['biela2'], biela=M['biela2'])
    e1.lodzie(G, M2, a, b, n, za, zb)


def f_sekcia_e(G, M, c, a, b, n, za, zb, i, k):
    """Nárožná sekcia E: krémový rám s pravidelnou mriežkou okien a lodžiami, dvojpodlažný presklený parter."""
    if je_prizemie(c, za):
        e1.pas_okien(G, M, a, b, n, za, zb, M['vyklad'], parapet=0.0, nadokno=0.6, mat=M['ram'], krok=2.7)
        G.stena(M['ram'], e1.posun(a, n, -0.1), e1.posun(b, n, -0.1), za + 3.9, za + 4.1)
        return
    ramova(G, M, a, b, n, za, zb, M['krem_e'], M['sklo_byty'], os=3.0, sirka=1.8, parapet=0.5, nadokno=0.45, lodzie=3)


def f_ustup_antracit(G, M, c, a, b, n, za, zb, i, k):
    """Ustúpené mezonety: presklenie po celej výške v antracitových rámoch."""
    e1.pas_okien(G, M, a, b, n, za, zb, M['sklo_byty'], parapet=0.1, nadokno=0.35, mat=M['antracit'], krok=1.8)


def f_p40_podnoz(G, M, c, a, b, n, za, zb, i, k):
    """Podnož P40: ustúpené presklené prízemie, nad ním dva pásy perforovaných panelov s tmavou štrbinou."""
    z = za
    if je_prizemie(c, za):
        z = za + 5.0
        G.stena(M['vyklad'], e1.posun(a, n, -1.2), e1.posun(b, n, -1.2), za, z)
        ai, bi = e1.posun(a, n, -1.2), e1.posun(b, n, -1.2)
        G.plocha(M['perfor'], [(bi[0], bi[1], z), (b[0], b[1], z), (a[0], a[1], z), (ai[0], ai[1], z)][::-1])
    if c.z1 - z < 1.0:
        G.stena(M['perfor'], a, b, z, c.z1)
        return
    stredna = z + (c.z1 - z) * 0.48
    if stredna - z > 1.0:
        e1.pas_okien(G, M, a, b, n, z, stredna - 0.3, M['perfor'], parapet=0.0, mat=M['perfor'], krok=1.2)
        G.stena(M['ram'], e1.posun(a, n, -0.2), e1.posun(b, n, -0.2), stredna - 0.3, stredna + 0.3)
        e1.pas_okien(G, M, a, b, n, stredna + 0.3, c.z1, M['perfor'], parapet=0.0, mat=M['perfor'], krok=1.2)
    else:
        e1.pas_okien(G, M, a, b, n, z, c.z1, M['perfor'], parapet=0.0, mat=M['perfor'], krok=1.2)


def f_p40(G, M, c, a, b, n, za, zb, i, k):
    """Kancelárie P40: tmavé sklo, šampanský pás na úrovni stropu, predsadené zvislé lamely po 1,35 m."""
    e1.pas_okien(G, M, a, b, n, za, zb, M['sklo_p40'], parapet=0.7, mat=M['pas_p40'], krok=99.0)
    if k:
        return
    L = dlzka(a, b)
    if L < 0.6:
        return
    pocet = max(1, round(L / 1.35))
    for j in range(pocet):
        p = bod_na(a, b, L * (j + 0.5) / pocet)
        q = e1.posun(p, n, 0.35)
        G.plocha(M['pas_p40'], [(p[0], p[1], za), (q[0], q[1], za), (q[0], q[1], c.z1), (p[0], p[1], c.z1)])
        G.plocha(M['pas_p40'], [(p[0], p[1], c.z1), (q[0], q[1], c.z1), (q[0], q[1], za), (p[0], p[1], za)])


e1.FASADY.update({
    'okrova': f_okrova, 'p34_vychod': f_p34_vychod, 'p34_zapad': f_p34_zapad, 'ustup_tmavy': f_ustup_tmavy,
    'terakota': f_terakota, 'krcok': f_krcok, 'sekcia_e': f_sekcia_e, 'ustup_antracit': f_ustup_antracit,
    'p40_podnoz': f_p40_podnoz, 'p40': f_p40,
})


# --- nákupné centrum a hadia strecha -----------------------------------------------------------------------

def zakryta(casti, ja, x, y):
    """Leží bod v inej (vyššej) plnej časti – stena centra je tam schovaná v budove nad ním."""
    return any(q is not ja and q.plna and q.z1 > ja.z1 + 0.5 and q.z0 <= ja.zem + 0.5 and e1.vnutri(x, y, q.body)
               for q in casti)


def centrum(G, M, nc, had, casti, st):
    """Teleso centra: odhalené steny (presklený valec haly na východe, inde výklady), zelená strecha s dierou
    pre sklenú strechu, svetlý lem a skrinky okolo nej, steny pasáže pod sklom (výklady do pasáže)."""
    b = nc.body
    n = len(b)
    for i in range(n):
        a, q = b[i], b[(i + 1) % n]
        L = dlzka(a, q)
        if L < 0.2:
            continue
        nn = normala(a, q)
        skryte = 0
        for t in (0.2, 0.5, 0.8):
            px, py = a[0] + (q[0] - a[0]) * t, a[1] + (q[1] - a[1]) * t
            if zakryta(casti, nc, px - nn[0] * 0.4, py - nn[1] * 0.4) or zakryta(casti, nc, px + nn[0] * 0.4, py + nn[1] * 0.4):
                skryte += 1
        if skryte >= 2:
            continue
        G.stena(M['sokel'], a, q, nc.zem + e1.SOKEL, nc.zem)
        x_hry = (a[0] + q[0]) / 2 + st[0]
        if x_hry > BUBEN_X:
            # presklený valec vstupnej haly (~13,5 m): stĺpiky po ~2,7 m, dva priečne pásy, čierna rímsa
            z1 = nc.z1 + 1.1
            G.stena(M['buben'], a, q, nc.zem, z1)
            for z in (nc.zem + 4.1, nc.zem + 8.85):
                G.stena(M['ram_hala'], e1.posun(a, nn, 0.03), e1.posun(q, nn, 0.03), z - 0.08, z + 0.08)
            pocet = max(1, round(L / 2.7))
            for j in range(pocet + 1):
                p = e1.posun(bod_na(a, q, L * j / pocet), nn, 0.03)
                tx, ty = (q[0] - a[0]) / L, (q[1] - a[1]) / L
                G.stena(M['ram_hala'], (p[0] - tx * 0.06, p[1] - ty * 0.06), (p[0] + tx * 0.06, p[1] + ty * 0.06), nc.zem, z1)
            G.pas(M['cierna'], [a, q], z1 - 0.6, z1, von=0.1, uzavreta=False)
        else:
            vyklady(G, M, a, q, nn, nc.zem, nc.zem + 6.0)
            e1.pas_okien(G, M, a, q, nn, nc.zem + 6.0, nc.z1, M['vyklad'], parapet=1.2, nadokno=0.9, mat=M['svetly'], krok=3.0)
        G.stena(M['atika'], a, q, nc.z1, nc.z1 + 0.9)
    # strecha s dierou pre sklenú strechu
    plocha_s_dierou(G, M['zelen2'], b, had.body, nc.z1)
    # lem okolo skla a skrinky na ňom (odvody dymu)
    G.pas(M['lem'], had.body, nc.z1, nc.z1 + 0.15, von=LEM, dnu=0.0, spodok=False)
    obvod = [0.0]
    hb = had.body
    for i in range(len(hb)):
        obvod.append(obvod[-1] + dlzka(hb[i], hb[(i + 1) % len(hb)]))
    s = 3.0
    j = 0
    while s < obvod[-1]:
        while obvod[j + 1] < s:
            j += 1
        a, q = hb[j], hb[(j + 1) % len(hb)]
        p = bod_na(a, q, s - obvod[j])
        nn = normala(a, q)
        L = dlzka(a, q) or 1e-9
        G.kvader(M['skrinka'], e1.posun(p, nn, 1.7), ((q[0] - a[0]) / L, (q[1] - a[1]) / L), 1.0, 0.7,
                 nc.z1 + 0.15, nc.z1 + 0.65)
        s += 6.5
    # steny pasáže pod sklom (lícom do pasáže): dve podlažia výkladov
    for i in range(len(hb)):
        a, q = hb[(i + 1) % len(hb)], hb[i]
        if dlzka(a, q) < 0.2:
            continue
        nn = normala(a, q)
        vyklady(G, M, a, q, nn, nc.zem, nc.zem + 5.5, krok=4.0)
        vyklady(G, M, a, q, nn, nc.zem + 5.5, nc.z1, krok=4.0)
    # vetracie kocky na zelenej streche
    rnd = random.Random(7)
    pocet = 0
    for _ in range(400):
        if pocet >= 10:
            break
        x = rnd.uniform(min(p[0] for p in b), max(p[0] for p in b))
        y = rnd.uniform(min(p[1] for p in b), max(p[1] for p in b))
        if (not e1.vnutri(x, y, b) or e1.vnutri(x, y, hb) or e1.od_okraja(x, y, hb) < LEM + 2.0
                or e1.od_okraja(x, y, b) < 2.0 or zakryta(casti, nc, x, y)):
            continue
        G.kvader(M['atika'], (x, y), (1.0, 0.0), 2.0, 2.0, nc.z1, nc.z1 + 1.2)
        pocet += 1


def striezky_vstupov(G, M, vchody, st, z):
    """Ploché nerezové striežky nad vstupmi do haly (otočné dvere)."""
    for v in vchody:
        x, y = v['bod'][0] - st[0], -(v['bod'][1] - st[1])
        if v['bod'][0] < BUBEN_X or v.get('typ') not in ('main', 'yes'):
            continue
        G.kvader(M['nerez'], (x, y), (1.0, 0.0), 4.2, 2.6, z + 3.0, z + 3.25)


# --- strechy ----------------------------------------------------------------------------------------------

def strecha_e2(G, M, c):
    if c.styl == 'ustup_antracit':
        # tenká presahujúca strecha mezonetov
        G.vodorovna(M['strecha'], c.body, c.z1)
        G.pas(M['biela2'], c.body, c.z1, c.z1 + 0.25, von=0.9, dnu=0.0)
        return
    e1.strecha_casti(G, M, c)
    xs, ys = [p[0] for p in c.body], [p[1] for p in c.body]
    st = ((min(xs) + max(xs)) / 2, (min(ys) + max(ys)) / 2)
    if c.styl == 'okrova':
        # pole chladičov
        for gx in range(-2, 3):
            for gy in range(-3, 4):
                x, y = st[0] + gx * 3.2, st[1] + gy * 2.2
                if e1.vnutri(x, y, c.body) and e1.od_okraja(x, y, c.body) > 2.5:
                    G.kvader(M['chladic'], (x, y), (1.0, 0.0), 2.4, 1.3, c.z1, c.z1 + 1.6)
    elif c.id.endswith('-ustup') and c.styl == 'ustup_tmavy' or c.styl in ('p40',) and c.id.endswith('-15'):
        if e1.vnutri(st[0], st[1], c.body):
            w = min(max(xs) - min(xs), max(ys) - min(ys))
            strojovna(G, st, (1.0, 0.0), min(18.0, w * 0.5), min(10.0, w * 0.4), c.z1, 2.6,
                      M['tmavosivy'], M['ram'], M['strecha'])


# --- socha ------------------------------------------------------------------------------------------------

def gula(G, mat, c, r, seg=16, kruhy=10):
    def p(t, f):
        return (c[0] + r * math.sin(t) * math.cos(f), c[1] + r * math.sin(t) * math.sin(f), c[2] + r * math.cos(t))
    for i in range(kruhy):
        t0, t1 = math.pi * i / kruhy, math.pi * (i + 1) / kruhy
        for j in range(seg):
            f0, f1 = 2 * math.pi * j / seg, 2 * math.pi * (j + 1) / seg
            if i == 0:
                G.plocha(mat, [p(t0, f0), p(t1, f0), p(t1, f1)])
            elif i == kruhy - 1:
                G.plocha(mat, [p(t0, f0), p(t1, f0), p(t0, f1)])
            else:
                G.plocha(mat, [p(t0, f0), p(t1, f0), p(t1, f1), p(t0, f1)])


def priehradovy(G, M, a, ra, b, rb, sirka=0.45):
    """Priehradový nosník štvorcového prierezu medzi guľami (pásy + šikmé priečky – detail)."""
    d = [b[k] - a[k] for k in range(3)]
    L = math.sqrt(sum(v * v for v in d)) or 1e-9
    d = [v / L for v in d]
    pom = (0, 0, 1) if abs(d[2]) < 0.9 else (1, 0, 0)
    u = (d[1] * pom[2] - d[2] * pom[1], d[2] * pom[0] - d[0] * pom[2], d[0] * pom[1] - d[1] * pom[0])
    lu = math.sqrt(sum(v * v for v in u))
    u = [v / lu * sirka / 2 for v in u]
    v = (d[1] * u[2] - d[2] * u[1], d[2] * u[0] - d[0] * u[2], d[0] * u[1] - d[1] * u[0])
    a0 = [a[k] + d[k] * (ra * 0.85) for k in range(3)]
    b0 = [b[k] - d[k] * (rb * 0.85) for k in range(3)]
    dl = math.sqrt(sum((b0[k] - a0[k]) ** 2 for k in range(3)))
    rohy = [(1, 1), (-1, 1), (-1, -1), (1, -1)]

    def bod(t, s, w):
        return tuple(a0[k] + (b0[k] - a0[k]) * t + s * u[k] + w * v[k] for k in range(3))
    for s, w in rohy:
        G.tram(M['trus'], bod(0, s, w), bod(1, s, w), 0.07)
    kroky = max(2, int(dl / sirka))
    for f in range(4):
        s0, w0 = rohy[f]
        s1, w1 = rohy[(f + 1) % 4]
        for k in range(kroky):
            t0, t1 = k / kroky, (k + 1) / kroky
            if k % 2:
                G.tram(M['trus_d'], bod(t0, s0, w0), bod(t1, s1, w1), 0.035)
            else:
                G.tram(M['trus_d'], bod(t0, s1, w1), bod(t1, s0, w0), 0.035)


def socha(G, M, data, st, z_ref):
    """Vlastná „molekula“: tri gule na zemi, stredná, trojica vyššie a jedna navrchu (~13 m), spojené
    priehradovými nosníkmi; štrková kruhová plocha kopíruje terén."""
    sx, sz = data['bod']
    c = (sx - st[0], -(sz - st[1]))
    z0 = data['teren'] - z_ref
    kruh = [((x - st[0]), -(z - st[1]), h - z_ref + 0.05) for x, z, h in data['kruh']]
    if plocha_obrysu([(p[0], p[1]) for p in kruh]) < 0:
        kruh.reverse()
    stred = (c[0], c[1], z0 + 0.05)
    for i in range(len(kruh)):
        a, b = kruh[i], kruh[(i + 1) % len(kruh)]
        G.plocha(M['strk'], [stred, a, b])
        G.stena(M['strk'], a, b, min(a[2], b[2]) - 0.3, min(a[2], b[2]))
    farby = {
        'zelena': '#4baa3c', 'modra': '#1e2b47', 'fialova': '#7a3f86', 'antracit': '#3b3e44',
        'cervena': '#d8424c', 'zlta': '#e2b437', 'svetlomodra': '#7fb2d6', 'oranzova': '#e07b39',
    }
    mat = {k: material(f'gula-{k}', v, drsnost=0.45, kov=0.1) for k, v in farby.items()}

    def pol(r, uhol, z):
        a = math.radians(uhol)
        return (c[0] + r * math.cos(a), c[1] + r * math.sin(a), z0 + z)
    dole = [(pol(3.8, 90, 1.15), 1.15, 'zelena'), (pol(3.8, 210, 1.15), 1.15, 'modra'), (pol(3.8, 330, 1.15), 1.15, 'fialova')]
    jadro = (pol(0, 0, 5.6), 1.3, 'antracit')
    hore = [(pol(3.4, 30, 9.0), 1.1, 'cervena'), (pol(3.4, 150, 9.0), 1.1, 'zlta'), (pol(3.4, 270, 9.0), 1.1, 'svetlomodra')]
    vrch = (pol(0.5, 300, 12.0), 1.2, 'oranzova')
    for p, r, f in dole + [jadro] + hore + [vrch]:
        gula(G, mat[f], p, r)
    for p, r, _ in dole:
        priehradovy(G, M, p, r, jadro[0], jadro[1])
    for p, r, _ in hore:
        priehradovy(G, M, jadro[0], jadro[1], p, r)
        priehradovy(G, M, p, r, vrch[0], vrch[1])
    # kolízie: spodné gule
    return [[(p[0] + r * math.cos(2 * math.pi * k / 8), p[1] + r * math.sin(2 * math.pi * k / 8)) for k in range(8)]
            for p, r, _ in dole]


# --- celok ------------------------------------------------------------------------------------------------

def postav(_obrysy):
    global _nc
    e1.STYLY.update(STYLY_E2)
    e1.VYSKY.update(VYSKY_E2)
    e1.PRIZEMIE.update(PRIZEMIE_E2)
    e1.HRANA_KLENBY[HAD] = VYSKA_NC
    e1.VZNOS_KLENBY[HAD] = 4.6          # vrchol v úzkych častiach ~16 m, v bublinách ~17 m
    e1.SIET_KLENBY[HAD] = 2.2           # trojuholníky ~1,5–2 m (letecká fotka)
    with open(os.path.join(TU, 'data', 'eurovea-2.json'), encoding='utf-8') as f:
        data = json.load(f)
    vsetky = [b for c in data['casti'] for b in c['body']]
    st = (round(sum(p[0] for p in vsetky) / len(vsetky), 2), round(sum(p[1] for p in vsetky) / len(vsetky), 2))
    zb, z_ref = data['zakladna']['bod'], data['zakladna']['teren']
    casti = []
    for d in data['casti']:
        c = Cast2(d, st, z_ref)
        if c.id == HAD:
            c.body = hladka(c.body, 1.5)
        elif c.id == P40:
            # kancelárie od 6. NP (podnož +20,1 m), 10 podlaží; posledné 3 ustupujú od Dunaja (orezané z juhu)
            c.z0 = c.zem + VYSKY_E2['r22198600']
            h = (c.z1 - c.z0) / 10
            u = [c.z0 + h * k for k in range(11)]
            ymin = min(p[1] for p in c.body)
            casti.append(nova(c, z1=u[7], urovne_z=u[:8]))
            for j in range(3):
                telo = orez_juh(c.body, ymin + 8.0 * (j + 1))
                if len(telo) >= 3:
                    casti.append(nova(c, id=f'{P40}-{13 + j}', body=telo, z0=u[7 + j], z1=u[8 + j], urovne_z=u[7 + j:9 + j]))
            continue
        if c.styl in ('p34_zapad', 'p34_vychod'):
            casti += ustup(c, 2 if c.styl == 'p34_zapad' else 1, 2.5, 'ustup_tmavy')
            continue
        if c.styl == 'terakota':
            casti += ustup(c, 2, 2.0, 'ustup_antracit')
            continue
        casti.append(c)
    nc = next(c for c in casti if c.id == NC)
    had = next(c for c in casti if c.id == HAD)
    _nc = nc
    # susedné časti Eurovea 1 (len na skrývanie stien, nekreslia sa)
    with open(os.path.join(TU, 'data', 'eurovea.json'), encoding='utf-8') as f:
        e1data = json.load(f)
    cudzie = []
    for d in e1data['casti']:
        if max(p[0] for p in d['body']) > 1150:
            c = Cast2(d, st, z_ref)
            c.cudzia = True
            cudzie.append(c)
    vsetky_casti = casti + cudzie

    M = materialy()
    G = Geo()
    for c in casti:
        if c is nc:
            centrum(G, M, nc, had, vsetky_casti, st)
        elif c is had:
            e1.klenba(G, M, c, vsetky_casti)
        else:
            e1.fasada(G, M, c, vsetky_casti)
            strecha_e2(G, M, c)
    striezky_vstupov(G, M, data['vchody'], st, nc.zem)
    kolizie_sochy = socha(G, M, data['socha'], st, z_ref)

    plne = [c for c in casti if c.plna and c.z0 <= c.zem + 0.01]
    vchody = [{'id': v['id'], 'bod': [round(v['bod'][0] - st[0], 2), round(v['bod'][1] - st[1], 2)], 'vyska': 0.0,
               **({'nazov': v['nazov']} if 'nazov' in v else {})} for v in data['vchody']]
    sx, sz = data['socha']['bod']
    sc = (sx - st[0], -(sz - st[1]))
    kruh_sochy = do_hry([(sc[0] + 7.0 * math.cos(2 * math.pi * k / 16), sc[1] + 7.0 * math.sin(2 * math.pi * k / 16))
                         for k in range(16)])
    info = {
        'stred': list(st),
        'zakladnaBod': [round(zb[0] - st[0], 2), round(zb[1] - st[1], 2)],
        'bezKoliziiObrysov': True,
        'kolizie': [do_hry(c.body) for c in plne] + [do_hry(k) for k in kolizie_sochy],
        # štrková plocha pod sochou – bez stromov dlaždíc a bez všeobecnej sochy z OSM (sochy-modul)
        'nahradit': [kruh_sochy],
        'nahraditSochy': [kruh_sochy],
        'vchody': vchody,
    }
    print(f'Eurovea 2: {len(casti)} častí, stred {st}, základňa {z_ref:.2f} m n. m.')
    pocty = {}
    for f, m in zip(G.f, G.fm):
        pocty[G.mat[m].name] = pocty.get(G.mat[m].name, 0) + len(f) - 2
    print('Eurovea 2 – trojuholníky podľa materiálu:', ', '.join(f'{k} {v}' for k, v in sorted(pocty.items(), key=lambda q: -q[1])))
    vyska = max(c.z1 for c in casti)
    return G, [c.body for c in casti if c.z0 <= c.zem + 0.01], vyska, 'eurovea-2', info
