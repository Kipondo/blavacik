# Twin City Tower (2019, Siebert+Talaš, John Robertson Architects): 89 m, 23 podlaží.
# Pôdorys ako štadión (dve rovné strany a oblúky), sklenený plášť obložený medenými lamelami –
# odkaz na bývalú káblovku Kablo. Lamely majú rôznu hĺbku (vlnenie po obvode aj výške),
# na každom podlaží medená linka, navrchu lamely prečnievajú nad strechu ako koruna.

import math

from veze import (Geo, z_hry, hladka, urovne, odsad, smer_v_bode, stred_obrysu, zavesova_stena,
                  strecha, strojovna, vystrazne_svetla, sklo, svetlo, dlzka)
from spolocne import material


def postav(obrysy):
    zdroj = obrysy['twin-city-tower']['hlavne'][0]['body']
    stred = stred_obrysu(zdroj)
    obrys = hladka(z_hry(zdroj, stred), 1.5)

    sklo_t = sklo('sklo-bronzove', '#8e8d88', drsnost=0.05, kov=0.9)
    sklo_s = sklo('sklo-bronzove-svetle', '#a19d93', drsnost=0.05, kov=0.9)
    lobby = sklo('sklo-lobby', '#aab4b6', drsnost=0.03, kov=0.75)
    med = material('med', '#b06a42', drsnost=0.42, kov=0.85)
    med_tmava = material('med-tmava', '#7e4a30', drsnost=0.5, kov=0.8)
    ram = material('detail-ram', '#4a4440', drsnost=0.4, kov=0.6)
    strecha_m = material('strecha', '#8d8b86', drsnost=0.95)
    beton = material('beton', '#b9b7b0', drsnost=0.85)
    cervena = svetlo('svetlo-cervene', '#ff2a1a', 6.0)

    G = Geo()
    Z_LOBBY, Z_STRECHA, H = 6.0, 86.3, 89.5
    n = len(obrys)

    # prízemie – ustúpené sklo pod medeným podhľadom
    zavesova_stena(G, odsad(obrys, -1.2), [-1.5, Z_LOBBY], sklo=lobby, ram=ram, vnor=0.1, stlpik=0.1,
                   priecka=0.15, naklon=0.0, seed=1)
    G.pas(med_tmava, obrys, Z_LOBBY - 0.6, Z_LOBBY, von=0.3, dnu=1.3)

    # podlažia: sklo (dva odtiene), medená linka čela dosky
    kanc = urovne(Z_LOBBY, (22, 3.65))

    def vyber(i, k, rnd):
        return sklo_s if (i // 3 + k) % 5 == 0 or rnd.random() < 0.15 else sklo_t
    zavesova_stena(G, obrys, kanc, sklo=vyber, ram=ram, vnor=0.12, stlpik=0.05, priecka=0.08, parapet=0.45,
                   mat_parapet=med_tmava, naklon=0.004, seed=2, priecky=False, segment_stlpika=4)
    for z in kanc:
        G.pas(med, obrys, z - 0.25, z + 0.12, von=0.12, dnu=0.0)

    # medené lamely: hĺbka sa vlní po obvode aj výške, na korune prečnievajú
    for i in range(0, n, 1):
        p = obrys[i]
        t = smer_v_bode(obrys, i)
        nx, ny = t[1], -t[0]
        for k in range(len(kanc) - 1):
            z0, z1 = kanc[k] + 0.12, kanc[k + 1] - 0.25
            v = 0.5 + 0.5 * math.sin(2 * math.pi * 3 * i / n + k * 0.42)
            hl = 0.18 + 0.5 * v * v if i % 2 == 0 else 0.12 + 0.15 * v
            c = (p[0] + nx * (hl / 2), p[1] + ny * (hl / 2))
            G.kvader(med, c, t, 0.14, hl, z0, z1 + 0.37, vrch=False, spodok=False)
        # koruna
        c = (p[0] + nx * 0.25, p[1] + ny * 0.25)
        G.kvader(med, c, t, 0.14, 0.5, Z_STRECHA, H - 0.3 if i % 2 == 0 else H - 1.4)

    # strecha, horný medený veniec koruny, technika
    strecha(G, odsad(obrys, -0.12), Z_STRECHA, strecha_m, med_tmava, atika=1.2)
    G.pas(med, obrys, H - 0.3, H, von=0.55, dnu=0.0)
    dlha = max(range(n), key=lambda i: dlzka(obrys[i], obrys[(i + 1) % n]))
    a, b = obrys[dlha], obrys[(dlha + 1) % n]
    os_x = ((b[0] - a[0]) / dlzka(a, b), (b[1] - a[1]) / dlzka(a, b))
    strojovna(G, (0.0, 0.0), os_x, 18, 8, Z_STRECHA, 3.4, beton, ram, strecha_m)
    vystrazne_svetla(G, [obrys[0], obrys[n // 2]], H, cervena)
    return G, [obrys], H, 'twin-city-tower', {'stred': [round(stred[0], 2), round(stred[1], 2)]}
