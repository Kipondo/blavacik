# Brány Bratislavského hradu (Viedenská, Leopoldova, Žigmundova, Mikulášska): pôdorys a podlažia
# z OSM, kamenné/omietnuté telo s prejazdom (tmavý oblúkový otvor na oboch čelách), rímsa
# a strecha (Žigmundova ihlanová, ostatné sedlové). Každá brána je samostatný pevný model.

import math

from veze import Geo, z_hry, zjednodus, odsad, dlzka, stred_obrysu, plocha_obrysu, normala
from spolocne import material
from hrad.palac import data
from hrad.stavebne import strecha_sedlova, strecha_ihlan, hlavna_os

BRANY = {
    '37409828': ('hrad-brana-viedenska', 'Viedenská brána'),
    '37409839': ('hrad-brana-leopoldova', 'Leopoldova brána'),
    '37409838': ('hrad-brana-zigmundova', 'Žigmundova brána'),
    '950103752': ('hrad-brana-mikulasska', 'Mikulášska brána'),
}


def brana(id_, subor):
    D = data()
    c = D[id_]
    b = c['body'][:-1] if c['body'][0] == c['body'][-1] else c['body']
    stred = stred_obrysu(b)
    o = zjednodus(z_hry(b, stred), 0.4)
    t = c['t']
    lv = float(t.get('building:levels') or 2)
    H = 2.5 + lv * 3.6
    kamen = material('kamen-brany', '#cfc5b0', drsnost=0.9)
    omietka = material('omietka-brany', '#ece6d8', drsnost=0.85)
    skridla = material('skridla', '#99654d', drsnost=0.8)
    tma = material('prejazd', '#2d2925', drsnost=0.95)
    G = Geo()
    # telo brány: kamenný sokel, omietka, rímsa
    G.hranol(kamen, o, -3.0, 2.0, vrch=False)
    G.hranol(omietka, odsad(o, -0.05), 2.0, H, vrch=False)
    G.pas(kamen, o, H - 0.5, H, von=0.35, spodok=True)
    # prejazd: na dvoch protiľahlých dlhších čelách priečne na hlavnú os tmavý oblúkový otvor
    u = hlavna_os(o)
    n = len(o)
    hrany = sorted(range(n), key=lambda i: -dlzka(o[i], o[(i + 1) % n]))
    cela = [i for i in hrany if abs(normala(o[i], o[(i + 1) % n])[0] * u[0] + normala(o[i], o[(i + 1) % n])[1] * u[1]) > 0.7][:2]
    if len(cela) < 2:
        cela = hrany[:2]
    for i in cela:
        a, bb = o[i], o[(i + 1) % n]
        L = dlzka(a, bb)
        ux, uy = (bb[0] - a[0]) / L, (bb[1] - a[1]) / L
        nx, ny = normala(a, bb)
        m = ((a[0] + bb[0]) / 2 + nx * 0.03, (a[1] + bb[1]) / 2 + ny * 0.03)
        w = min(4.2, L * 0.6) / 2
        hp = min(4.5, H * 0.55)
        G.panel(tma, (m[0] - ux * w, m[1] - uy * w), (m[0] + ux * w, m[1] + uy * w), 0.0, hp - w)
        seg = 10
        for k in range(seg):
            t0, t1 = math.pi * k / seg, math.pi * (k + 1) / seg
            p0 = (m[0] - ux * w * math.cos(t0), m[1] - uy * w * math.cos(t0))
            p1 = (m[0] - ux * w * math.cos(t1), m[1] - uy * w * math.cos(t1))
            G.plocha(tma, [(p0[0], p0[1], hp - w), (p1[0], p1[1], hp - w), (p1[0], p1[1], hp - w + w * math.sin(t1)), (p0[0], p0[1], hp - w + w * math.sin(t0))])
        # kamenný rám okolo prejazdu
        for s in (-1, 1):
            G.kvader(kamen, (m[0] + ux * s * (w + 0.35) + nx * 0.1, m[1] + uy * s * (w + 0.35) + ny * 0.1), (ux, uy), 0.7, 0.3, 0.0, hp)
        G.kvader(kamen, (m[0] + nx * 0.1, m[1] + ny * 0.1), (ux, uy), 2 * w + 1.4, 0.3, hp, hp + 0.6)
    if (t.get('roof:shape') or '') == 'pyramidal':
        strecha_ihlan(G, o, H, max(4.0, math.sqrt(abs(plocha_obrysu(o))) * 0.6), skridla, presah=0.5)
    else:
        strecha_sedlova(G, o, H, max(2.5, math.sqrt(abs(plocha_obrysu(o))) * 0.35), skridla, omietka, presah=0.5)
    return G, [o], H + 4, subor, {'stred': [round(stred[0], 2), round(stred[1], 2)]}


def postav_vsetky():
    return [(lambda i=i, s=s: brana(i, s)) for i, (s, _) in BRANY.items()]
