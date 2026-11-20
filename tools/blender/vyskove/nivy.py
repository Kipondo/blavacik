# Nivy (2021): obchodné centrum s autobusovou stanicou na prízemí a parkom na streche (bežecký ovál, zeleň,
# stromy). Časti z OSM, na najväčšej ploche strechy zelený park s červenou dráhou.

import math

from vyskove.z_osm import postav_z_osm
from veze import odsad, plocha_obrysu, zjednodus
from spolocne import material


def postav(obrysy):
    G, obrysy_hry, vyska, subor, info = postav_z_osm(obrysy, 'nivy', 'nivy', druh='pasy', podlazie=4.5, svetla=False,
                                                     styly={'*': {'farba_obkladu': '#ece6d6', 'sklo': '#6f8796', 'parapet': 0.6}})
    # park na streche: najväčší obrys, zeleň a bežecká dráha (odsadená od okraja)
    if obrysy_hry:
        idx = max(range(len(obrysy_hry)), key=lambda i: abs(plocha_obrysu(obrysy_hry[i])))
        o = zjednodus(obrysy_hry[idx], 1.5)
        z = info['vysky'][idx] + 0.05
        trava = material('nivy-strecha-trava', '#5d7a3c', drsnost=1.0)
        draha = material('nivy-strecha-draha', '#a14a3a', drsnost=0.9)
        G.vodorovna(trava, odsad(o, -2.0), z + 0.4)
        d1, d2 = odsad(o, -9.0), odsad(o, -11.5)
        n = len(o)
        for i in range(n):
            j = (i + 1) % n
            G.plocha(draha, [(d2[i][0], d2[i][1], z + 0.45), (d1[i][0], d1[i][1], z + 0.45), (d1[j][0], d1[j][1], z + 0.45), (d2[j][0], d2[j][1], z + 0.45)])
        # stromy na streche (kužele korún)
        listy = material('nivy-strecha-stromy', '#4e6b34', drsnost=0.95)
        cx = sum(p[0] for p in o) / n
        cy = sum(p[1] for p in o) / n
        for k in range(24):
            a = k * 2.39996
            r = 8 + (k % 6) * 6
            p = (cx + math.cos(a) * r, cy + math.sin(a) * r)
            G.valec(listy, p, 2.2, z + 1.2, z + 6.5, seg=8, r1=0.3)
    return G, obrysy_hry, vyska + 7, subor, info
