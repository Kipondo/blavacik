# Sky Park Offices (2020/21, Vietzke & Borstelmann + GFI – nie Zaha Hadid Architects): kancelárie s 18-podlažnou
# vežou (~80 m), 8-podlažným a 4-podlažným krídlom (časti budovy z OSM). Podľa fotiek (Commons, stránka architektov):
#   – pôdorys zaoblený obdĺžnik s mierne vypuklými fasádami;
#   – veža je zložená z vodorovných blokov (zhora ~7, 6, 3 a 4 podlažia), každý posunutý o 1–2 m (terasy);
#   – hrubé biele pásy len na stykoch blokov, ostatné podlažia majú tenký béžovosivý parapet;
#   – zasklenie striedané s tmavými zvislými lamelami, technika na streche za bielou rebrovanou clonou.

from veze import (Geo, z_hry, hladka, urovne, odsad, stred_obrysu, zavesova_stena, strecha, sklo)
from spolocne import material

CASTI = {          # id časti OSM: počet podlaží
    '739656750': 18,
    '739656751': 8,
    '746623501': 4,
}
# bloky veže zhora (podlažia nad halou) a ich posun líca (m, + von)
BLOKY_VEZE = [(6, 0.0), (5, 1.4), (3, 0.3), (3, 1.2)]


def postav(obrysy):
    data = obrysy['sky-park']
    hlavna = next(h for h in data['hlavne'] if h['id'] == '739656752')
    stred = stred_obrysu(hlavna['body'])

    sklo_m = sklo('sklo-kancelarie', '#5f6f7a', drsnost=0.04, kov=0.9)
    sklo_t = sklo('sklo-kancelarie-tmave', '#4f5e69', drsnost=0.04, kov=0.9)
    lobby = sklo('sklo-lobby', '#8d9aa1', drsnost=0.03, kov=0.75)
    lamela = material('lamely-tmave', '#3b3d3f', drsnost=0.5, kov=0.5)
    grc = material('biely-grc', '#ecebe7', drsnost=0.55)
    parapet = material('parapet-bezovosivy', '#b9b2a5', drsnost=0.6)
    ram = material('detail-ram', '#4a4744', drsnost=0.45, kov=0.6)
    strecha_m = material('strecha', '#8d8b86', drsnost=0.95)
    beton = material('beton', '#bdbbb4', drsnost=0.85)

    G = Geo()
    obrysy_hry, vysky = [], []
    Z_LOBBY, PODLAZIE = 5.0, 3.7

    def vyber(i, k, rnd):
        if i % 3 == 1:
            return lamela
        return sklo_t if rnd.random() < 0.25 else sklo_m

    for cast in data['casti']:
        pocet = CASTI.get(cast['id'])
        if not pocet:
            continue
        surovy = z_hry(cast['body'], stred)
        obrys = hladka(surovy, 2.4, hustota=12)
        kz = urovne(Z_LOBBY, (pocet - 1, PODLAZIE))
        obrysy_hry.append(surovy)
        vysky.append(round(kz[-1] + 1.4, 1))
        zavesova_stena(G, odsad(obrys, -0.5), [-1.5, Z_LOBBY], sklo=lobby, ram=ram, vnor=0.1, stlpik=0.1,
                       priecka=0.14, naklon=0.0, seed=pocet)
        # bloky (len veža ich má viac; krídla sú jeden blok)
        bloky = BLOKY_VEZE if pocet == 18 else [(pocet - 1, 0.0)]
        k = len(kz) - 1                       # index najvyššej úrovne
        hrana_bloku = []
        for (podl, posun) in bloky:
            k0 = max(0, k - podl)
            linia = odsad(obrys, posun) if posun else obrys
            zavesova_stena(G, linia, kz[k0:k + 1], sklo=vyber, ram=ram, vnor=0.25, stlpik=0.06, priecka=0.06,
                           naklon=0.003, seed=pocet * 3 + k, priecky=False, segment_stlpika=2, stlpik_kazdy=2)
            for kk in range(k0 + 1, k):
                G.pas(parapet, linia, kz[kk] - 0.15, kz[kk] + 0.25, von=0.05, dnu=0.25)
            hrana_bloku.append((kz[k], linia))
            hrana_bloku.append((kz[k0], linia))
            k = k0
            if k <= 0:
                break
        # hrubé biele pásy na stykoch blokov (podlaha/strop terasy – širší z oboch blokov)
        for z, linia in hrana_bloku:
            G.pas(grc, linia, z - 0.45, z + 0.65, von=0.4, dnu=0.3)
        vrch = kz[-1]
        horna = odsad(obrys, BLOKY_VEZE[0][1]) if pocet == 18 else obrys
        strecha(G, odsad(horna, -0.25), vrch + 0.65, strecha_m, grc, atika=0.9)
        if pocet >= 8:
            sx = sum(p[0] for p in obrys) / len(obrys)
            sy = sum(p[1] for p in obrys) / len(obrys)
            # technika za bielou rebrovanou clonou
            G.kvader(beton, (sx, sy), (1, 0), 9 if pocet > 10 else 6, 5, vrch + 0.65, vrch + 3.6, vrch=True)
            sirka, hlbka = (12 if pocet > 10 else 8), 7
            clona = [(sx - sirka / 2, sy - hlbka / 2), (sx + sirka / 2, sy - hlbka / 2), (sx + sirka / 2, sy + hlbka / 2), (sx - sirka / 2, sy + hlbka / 2)]
            G.zaluzie(grc, clona, vrch + 0.8, vrch + 4.2, rozostup=0.5, hlbka=0.2)
    return G, obrysy_hry, max(vysky), 'sky-park-offices', {'stred': [round(stred[0], 2), round(stred[1], 2)], 'vysky': vysky}
