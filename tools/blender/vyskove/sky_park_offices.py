# Sky Park Offices (2021, Zaha Hadid Architects + GFI): kancelárie s 18-podlažnou vežou,
# 8-podlažným a 4-podlažným krídlom (časti budovy z OSM). Sklenený plášť s bielymi vodorovnými
# pásmi na každom podlaží, zaoblené rohy; pásy sa na rohoch jemne vlnia ako na rezidenciách.

from veze import (Geo, z_hry, hladka, urovne, odsad, stred_obrysu, zavesova_stena, strecha,
                  strojovna, sklo, svetlo)
from spolocne import material

CASTI = {          # id časti OSM: počet podlaží
    '739656750': 18,
    '739656751': 8,
    '746623501': 4,
}


def postav(obrysy):
    data = obrysy['sky-park']
    hlavna = next(h for h in data['hlavne'] if h['id'] == '739656752')
    stred = stred_obrysu(hlavna['body'])

    sklo_m = sklo('sklo-kancelarie', '#93a3ad', drsnost=0.04, kov=0.9)
    sklo_t = sklo('sklo-kancelarie-tmave', '#7f8e98', drsnost=0.04, kov=0.9)
    lobby = sklo('sklo-lobby', '#aab4b6', drsnost=0.03, kov=0.75)
    grc = material('biely-grc', '#f2f1ec', drsnost=0.55)
    ram = material('detail-ram', '#5e5a55', drsnost=0.45, kov=0.6)
    strecha_m = material('strecha', '#8d8b86', drsnost=0.95)
    beton = material('beton', '#bdbbb4', drsnost=0.85)

    G = Geo()
    obrysy_hry, vysky = [], []
    Z_LOBBY, PODLAZIE = 5.0, 3.7
    for cast in data['casti']:
        pocet = CASTI.get(cast['id'])
        if not pocet:
            continue
        surovy = z_hry(cast['body'], stred)
        obrys = hladka(surovy, 1.5, hustota=12)
        kz = urovne(Z_LOBBY, (pocet - 1, PODLAZIE))
        obrysy_hry.append(surovy)
        vysky.append(round(kz[-1] + 1.4, 1))
        zavesova_stena(G, odsad(obrys, -0.5), [-1.5, Z_LOBBY], sklo=lobby, ram=ram, vnor=0.1, stlpik=0.1,
                       priecka=0.14, naklon=0.0, seed=pocet)

        def vyber(i, k, rnd):
            return sklo_t if rnd.random() < 0.25 else sklo_m
        zavesova_stena(G, obrys, kz, sklo=vyber, ram=ram, vnor=0.25, stlpik=0.06, priecka=0.06,
                       parapet=0.0, naklon=0.003, seed=pocet * 3, priecky=False, segment_stlpika=4)
        for z in kz:
            G.pas(grc, obrys, z - 0.35, z + 0.55, von=0.35, dnu=0.25)
        strecha(G, odsad(obrys, -0.25), kz[-1] + 0.55, strecha_m, grc, atika=0.9)
        if pocet >= 8:
            sx = sum(p[0] for p in obrys) / len(obrys)
            sy = sum(p[1] for p in obrys) / len(obrys)
            strojovna(G, (sx, sy), (1, 0), 10 if pocet > 10 else 7, 6, kz[-1] + 0.6, 3.0, beton, ram, strecha_m)
    return G, obrysy_hry, max(vysky), 'sky-park-offices', {'stred': [round(stred[0], 2), round(stred[1], 2)], 'vysky': vysky}
