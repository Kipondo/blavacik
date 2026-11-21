# Bratislavský hrad – Kráľovský palác (štvorkrídlový palác s nádvorím a štyrmi rohovými vežami).
# Pôdorys krídel a veží a ich výšky sú z OSM (building:part: krídla 22 m so sedlovou strechou 4 m,
# veže 31 m s ihlanovou strechou 5 m, farby #FFFFFF a strechy #99654D). Fasády: biela omietka,
# päť podlaží pravidelných barokových okien so šambránami, kordónové rímsy, mohutná hlavná rímsa,
# kamenný sokel, vikiere v strechách. Na východnom krídle portál čestného vstupu, na nádvorí studňa.

import json
import math
import os

from veze import Geo, z_hry, zjednodus, odsad, dlzka, stred_obrysu, plocha_obrysu, normala, sklo, svetlo
from spolocne import material
from hrad.stavebne import strecha_sedlova, strecha_ihlan, barokova_fasada, vikiere

KRIDLA = ['244267972', '244267974', '244267978', '244267981']
VEZE = {'244267969': 'sv', '244267970': 'jv', '244267971': 'sz', '244267973': 'jz'}   # rohové hranoly 22 m
KORUNNA = '244267973'            # juhozápadná Korunná veža
PODLAZIA = [0.0, 4.6, 8.4, 12.2, 16.1, 20.0]
STRECHA = 8.5                    # strmá valbová/sedlová strecha krídel (OSM udáva 4 m – fotografie ukazujú strmšiu)


def data():
    with open(os.path.join(os.path.dirname(__file__), '..', 'data', 'hrad.json')) as f:
        return {c['id']: c for c in json.load(f)['cesty']}


def obr(c, stred):
    b = c['body'][:-1] if c['body'][0] == c['body'][-1] else c['body']
    return zjednodus(z_hry(b, stred), 0.35)


def postav():
    D = data()
    palac = D['8160490']
    stred = stred_obrysu(palac['body'][:-1])
    obrys_palaca = obr(palac, stred)

    omietka = material('omietka-biela', '#f2efe7', drsnost=0.85)
    sambrana = material('sambrany', '#e2dccd', drsnost=0.8)
    rimsa = material('rimsy', '#ebe6da', drsnost=0.8)
    sokel = material('sokel-kamen', '#bdb4a2', drsnost=0.9)
    skridla = material('skridla', '#99654d', drsnost=0.8)
    sklo_o = sklo('sklo-okna', '#5f6f78', drsnost=0.08, kov=0.6)
    dlazba = material('dlazba-nadvoria', '#c9c1b0', drsnost=0.9)
    portal = material('portal-kamen', '#d6cdb9', drsnost=0.75)
    dvere = material('dvere', '#4a3a2c', drsnost=0.7)
    kominy = material('kominy', '#d8d2c6', drsnost=0.9)

    G = Geo()
    # nádvorie a terén pod palácom (dlažba po celom pôdoryse – krídla ju zakryjú)
    G.vodorovna(dlazba, odsad(obrys_palaca, -0.2), 0.04)
    G.hranol(sokel, odsad(obrys_palaca, 0.6), -4.0, 0.0, vrch=False)

    # krídla
    for k in KRIDLA:
        o = obr(D[k], stred)
        barokova_fasada(G, o, [-3.0] + PODLAZIA[1:], stena=omietka, sambrana=sambrana, sklo_m=sklo_o, rimsa=rimsa,
                        sokel=sokel, min_dlzka=8.0, prizemie_okno=(1.35, 2.0), seed=int(k) % 97)
        u, pol, vc = strecha_sedlova(G, o, PODLAZIA[-1], STRECHA, skridla, omietka, presah=0.55)
        vikiere(G, u, pol, vc, o, PODLAZIA[-1], STRECHA, omietka, skridla, sklo_o, rozostup=8.0, sirka=1.0)
        # komíny
        pu = [p[0] * u[0] + p[1] * u[1] for p in o]
        for t in (0.25, 0.75):
            uu = min(pu) + (max(pu) - min(pu)) * t
            c = (u[0] * uu + (-u[1]) * vc, u[1] * uu + u[0] * vc)
            G.kvader(kominy, c, u, 0.9, 0.7, PODLAZIA[-1] + STRECHA - 1.5, PODLAZIA[-1] + STRECHA + 1.6)

    # rohové veže: hranoly z OSM, nad krídla o jedno podlažie, ihlanová strecha
    for k, kde in VEZE.items():
        o = obr(D[k], stred)
        if plocha_obrysu(o) < 0:
            o = o[::-1]
        # veže prečnievajú nad hrebeň strechy krídel o dve podlažia („obrátený stôl“), Korunná je najvyššia (~47 m)
        vys = 33.0 if k == KORUNNA else 31.5
        kz = [-3.0] + PODLAZIA[1:] + [24.2, 28.0, vys]
        barokova_fasada(G, o, kz, stena=omietka, sambrana=sambrana, sklo_m=sklo_o, rimsa=rimsa, sokel=sokel,
                        os_okien=3.2, min_dlzka=4.0, okno=(1.15, 2.0), seed=7)
        vs = 10.5 if k == KORUNNA else 9.0
        strecha_ihlan(G, o, vys, vs, skridla, presah=0.6)
        c = (sum(p[0] for p in o) / len(o), sum(p[1] for p in o) / len(o))
        G.valec(rimsa, c, 0.09, vys + vs, vys + vs + (3.5 if k == KORUNNA else 2.0), seg=6)
        G.valec(rimsa, c, 0.35, vys + vs + 0.6, vys + vs + 1.2, seg=8, r1=0.2)

    # portál čestného vstupu na východnom krídle (stred najdlhšej hrany obráteného na východ)
    vych = obr(D['244267974'], stred)
    n = len(vych)
    i = max(range(n), key=lambda i: normala(vych[i], vych[(i + 1) % n])[0] * dlzka(vych[i], vych[(i + 1) % n]))
    a, b = vych[i], vych[(i + 1) % n]
    nx, ny = normala(a, b)
    L = dlzka(a, b)
    ux, uy = (b[0] - a[0]) / L, (b[1] - a[1]) / L
    m = ((a[0] + b[0]) / 2, (a[1] + b[1]) / 2)
    for s in (-1, 1):
        # pilastre portálu
        G.kvader(portal, (m[0] + ux * s * 2.6 + nx * 0.35, m[1] + uy * s * 2.6 + ny * 0.35), (ux, uy), 0.9, 0.7, -0.5, 6.2)
    G.kvader(portal, (m[0] + nx * 0.4, m[1] + ny * 0.4), (ux, uy), 6.6, 0.8, 6.2, 7.4)
    G.kvader(portal, (m[0] + nx * 0.55, m[1] + ny * 0.55), (ux, uy), 7.4, 1.1, 7.4, 7.8)
    # dvere – tmavá výplň s polkruhovým záklenkom
    A = (m[0] - ux * 2.0 + nx * 0.02, m[1] - uy * 2.0 + ny * 0.02)
    B = (m[0] + ux * 2.0 + nx * 0.02, m[1] + uy * 2.0 + ny * 0.02)
    G.panel(dvere, A, B, 0.0, 4.2)
    seg = 10
    for k in range(seg):
        t0, t1 = math.pi * k / seg, math.pi * (k + 1) / seg
        p0 = (m[0] - ux * 2.0 * math.cos(t0) + nx * 0.02, m[1] - uy * 2.0 * math.cos(t0) + ny * 0.02)
        p1 = (m[0] - ux * 2.0 * math.cos(t1) + nx * 0.02, m[1] - uy * 2.0 * math.cos(t1) + ny * 0.02)
        G.plocha(dvere, [(p0[0], p0[1], 4.2), (p1[0], p1[1], 4.2), (p1[0], p1[1], 4.2 + 2.0 * math.sin(t1)), (p0[0], p0[1], 4.2 + 2.0 * math.sin(t0))])

    # studňa na nádvorí (osemhranná, kamenná, so strieškou na stĺpikoch)
    cx = sum(p[0] for p in obrys_palaca) / len(obrys_palaca)
    cy = sum(p[1] for p in obrys_palaca) / len(obrys_palaca)
    G.valec(sokel, (cx, cy), 1.4, 0.0, 0.9, seg=8)
    for k in range(4):
        a = math.pi / 4 + k * math.pi / 2
        G.valec(dvere, (cx + 1.1 * math.cos(a), cy + 1.1 * math.sin(a)), 0.07, 0.9, 3.0, seg=6)
    G.valec(skridla, (cx, cy), 1.8, 3.0, 4.1, seg=8, r1=0.05)

    obrysy = [obrys_palaca]
    return G, obrysy, 47.0, 'hrad-palac', {'stred': [round(stred[0], 2), round(stred[1], 2)]}
