# Sky Park Residence (2020–2021, Zaha Hadid Architects + GFI): štyri rovnaké bytové veže, 31 podlaží,
# 105 m, eliptický pôdorys (OSM). Exoskelet z bieleho sklovláknobetónu (GRC): vodorovné pásy na
# každom podlaží a zvislé línie, ktoré sa po výške plynulo posúvajú – fasáda „tečie“. Medzi nimi
# sklo s bronzovými rámami (odtieň „SKY PARK Bronze“). Navrchu plná biela koruna s vlnou.

import math

from veze import (Geo, z_hry, hladka, urovne, odsad, stred_obrysu, zavesova_stena, bod_na_linii,
                  strecha, strojovna, vystrazne_svetla, sklo, svetlo)
from spolocne import material

ZVISLE = 26          # počet zvislých línií exoskeletu po obvode


def postav(obrysy):
    zdroj = obrysy['sky-park']['hlavne'][0]['body']           # Residence 1 (ostatné sú rovnaké)
    stred = stred_obrysu(zdroj)
    obrys = hladka(z_hry(zdroj, stred), 1.45)
    n = len(obrys)

    sklo_b = sklo('sklo-bronzove', '#9a9286', drsnost=0.05, kov=0.88)
    sklo_t = sklo('sklo-bronzove-tmave', '#857e74', drsnost=0.05, kov=0.88)
    lobby = sklo('sklo-lobby', '#aab4b6', drsnost=0.03, kov=0.75)
    grc = material('biely-grc', '#f2f1ec', drsnost=0.55)
    bronz = material('detail-bronz', '#5e4b3c', drsnost=0.45, kov=0.7)
    bronz_h = material('bronz', '#6a5544', drsnost=0.45, kov=0.7)
    strecha_m = material('strecha', '#8d8b86', drsnost=0.95)
    beton = material('beton', '#bdbbb4', drsnost=0.85)
    cervena = svetlo('svetlo-cervene', '#ff2a1a', 6.0)

    G = Geo()
    Z_LOBBY = 6.0
    kz = urovne(Z_LOBBY, (30, 3.2))
    Z_STRECHA, H = kz[-1], 105.0

    # prízemie – vyššie sklo za bielym pásom
    zavesova_stena(G, odsad(obrys, -0.6), [-1.5, 3.0, Z_LOBBY], sklo=lobby, ram=bronz, vnor=0.1,
                   stlpik=0.1, priecka=0.14, naklon=0.0, seed=1)
    # podlažia – bronzové sklo
    def vyber(i, k, rnd):
        return sklo_t if rnd.random() < 0.3 else sklo_b
    zavesova_stena(G, obrys, kz, sklo=vyber, ram=bronz, vnor=0.35, stlpik=0.06, priecka=0.06,
                   parapet=0.0, naklon=0.003, seed=2, priecky=False, segment_stlpika=5, stlpik_kazdy=1)

    # vodorovné biele pásy exoskeletu (čelo dosky + zábradlový pás)
    for k, z in enumerate(kz):
        hore = 0.72 if k < len(kz) - 1 else 0.8
        G.pas(grc, obrys, z - 0.42, z + hore, von=0.5, dnu=0.35)
    # zvislé línie: poloha na obvode sa po výške plynule posúva (šikmé úseky medzi pásmi)
    def poloha(j, k):
        return (j + 0.42 * math.sin(2 * math.pi * k / 21 + j * 1.7) + 0.18 * math.sin(2 * math.pi * k / 9 + j * 0.6)) / ZVISLE
    vonkajsia = odsad(obrys, 0.26)
    for j in range(ZVISLE):
        for k in range(len(kz) - 1):
            (a, _), (b, _) = bod_na_linii(vonkajsia, poloha(j, k)), bod_na_linii(vonkajsia, poloha(j, k + 1))
            G.tram(grc, (a[0], a[1], kz[k] + 0.72), (b[0], b[1], kz[k + 1] - 0.42), 0.4)
    # vonkajšia hrana pásov nadol k prízemiu
    G.pas(grc, odsad(obrys, -0.6), Z_LOBBY - 0.6, Z_LOBBY - 0.3, von=1.0, dnu=0.0)

    # koruna: plný biely pás s vlnou (vyšší na jednej strane)
    vonk = odsad(obrys, 0.5)
    vnut = odsad(obrys, -0.35)
    vrch = []
    for i in range(n):
        uhol = math.atan2(obrys[i][1], obrys[i][0])
        vrch.append(Z_STRECHA + 1.6 + (H - Z_STRECHA - 1.6) * (0.5 + 0.5 * math.cos(uhol - 0.6)) ** 1.5)
    for i in range(n):
        j = (i + 1) % n
        G.plocha(grc, [(vonk[i][0], vonk[i][1], Z_STRECHA + 0.6), (vonk[j][0], vonk[j][1], Z_STRECHA + 0.6),
                       (vonk[j][0], vonk[j][1], vrch[j]), (vonk[i][0], vonk[i][1], vrch[i])])
        G.plocha(grc, [(vnut[j][0], vnut[j][1], Z_STRECHA), (vnut[i][0], vnut[i][1], Z_STRECHA),
                       (vnut[i][0], vnut[i][1], vrch[i]), (vnut[j][0], vnut[j][1], vrch[j])])
        G.plocha(grc, [(vnut[i][0], vnut[i][1], vrch[i]), (vonk[i][0], vonk[i][1], vrch[i]),
                       (vonk[j][0], vonk[j][1], vrch[j]), (vnut[j][0], vnut[j][1], vrch[j])])
    G.vodorovna(strecha_m, vnut, Z_STRECHA + 0.05)
    strojovna(G, (0.0, 0.0), (0, 1), 14, 7, Z_STRECHA, 3.2, beton, bronz, strecha_m)
    vystrazne_svetla(G, [vnut[0], vnut[n // 2]], max(vrch[0], vrch[n // 2]), cervena)
    return G, [obrys], H, 'sky-park-rezidencia', {'stred': [round(stred[0], 2), round(stred[1], 2)]}
