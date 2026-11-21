# Tower 115 (Pribinova ul., prestavba 2004–2006): kancelárska doska ~78 × 25 m, 28 podlaží, 104 m,
# s anténou do 115 m. Modrozelený sklenený plášť s jemnou mriežkou, každý štvrtý stĺpik hlbší
# (zvislé členenie), dve horné technické podlažia za lamelami. Pri päte dvojpodlažná podnož
# s kamenným obkladom (časti budovy z OSM).

from veze import (Geo, z_hry, rozdel, zjednodus, urovne, odsad, smer_v_bode, stred_obrysu,
                  zavesova_stena, kamenna_fasada, strecha, strojovna, vystrazne_svetla, sklo, svetlo, dlzka)
from spolocne import material


def postav(obrysy):
    data = obrysy['tower-115']
    stred = stred_obrysu(data['hlavne'][0]['body'])
    casti = {c['id']: zjednodus(z_hry(c['body'], stred), 0.5) for c in data['casti']}
    veza, podnoz = casti['1183045381'], casti['1183045380']

    sklo_m = sklo('sklo-modrozelene', '#87a5ad', drsnost=0.04, kov=0.9)
    sklo_t = sklo('sklo-modrozelene-tmave', '#6f8f99', drsnost=0.04, kov=0.9)
    lobby = sklo('sklo-lobby', '#a7b6bb', drsnost=0.03, kov=0.75)
    okna = sklo('sklo-okna', '#8a9aa2', drsnost=0.05, kov=0.8)
    hlinik = material('hlinik', '#b2b9bd', drsnost=0.35, kov=0.75)
    hlinik_d = material('detail-hlinik', '#b2b9bd', drsnost=0.35, kov=0.75)
    kamen = material('kamen', '#cbc4b7', drsnost=0.7)
    strecha_m = material('strecha', '#8d8b86', drsnost=0.95)
    beton = material('beton', '#bdbbb4', drsnost=0.85)
    tmavy = material('hlinik-tmavy', '#3e4448', drsnost=0.4, kov=0.6)
    cervena = svetlo('svetlo-cervene', '#ff2a1a', 6.0)

    G = Geo()
    # podnož (2 podlažia, kameň s pásmi okien)
    kamenna_fasada(G, podnoz, [-1.5, 5.0, 9.0], kamen=kamen, sklo=okna, ram=hlinik_d, parapet=0.9, preklad=0.6)
    strecha(G, podnoz, 9.0, strecha_m, kamen, atika=0.8)

    # veža
    Z_LOBBY = 6.0
    kz = urovne(Z_LOBBY, (25, 3.5))
    Z_TECH, H, ANTENA = kz[-1], 104.0, 115.0
    linia, rohy = rozdel(veza, 1.35)
    n = len(linia)
    zavesova_stena(G, odsad(linia, -0.6), [-1.5, Z_LOBBY], sklo=lobby, ram=tmavy, vnor=0.1, stlpik=0.12,
                   priecka=0.15, naklon=0.0, seed=1)

    def vyber(i, k, rnd):
        return sklo_t if (k + i // 4) % 7 == 0 else sklo_m
    zavesova_stena(G, linia, kz, sklo=vyber, ram=hlinik_d, vnor=0.14, stlpik=0.07, priecka=0.1, parapet=1.0,
                   mat_parapet=sklo_t, naklon=0.004, seed=2, obrys_priecok=veza, segment_stlpika=4)
    # hlbšie stĺpiky (každý štvrtý) a nárožia
    for i in range(n):
        if i % 4 and not rohy[i]:
            continue
        t = smer_v_bode(linia, i)
        nx, ny = t[1], -t[0]
        c = (linia[i][0] + nx * 0.2, linia[i][1] + ny * 0.2)
        G.kvader(hlinik, c, t, 0.16 if not rohy[i] else 0.5, 0.42, Z_LOBBY, Z_TECH, vrch=True)
    # technické podlažia za lamelami, atika, strecha
    G.zaluzie(hlinik, odsad(veza, 0.05), Z_TECH, H - 0.4, rozostup=0.42, hlbka=0.2)
    G.hranol(beton, odsad(veza, -0.4), Z_TECH, H - 0.4, vrch=False)
    strecha(G, veza, H - 0.4, strecha_m, hlinik, atika=0.4)
    # anténny stožiar
    sx = sum(p[0] for p in veza) / len(veza)
    sy = sum(p[1] for p in veza) / len(veza)
    G.hranol(beton, [(sx - 2.5, sy - 2.5), (sx + 2.5, sy - 2.5), (sx + 2.5, sy + 2.5), (sx - 2.5, sy + 2.5)], H, H + 3.0)
    G.valec(hlinik, (sx, sy), 0.45, H + 3.0, ANTENA - 2.0, seg=10, r1=0.25)
    G.valec(hlinik, (sx, sy), 0.12, ANTENA - 2.0, ANTENA, seg=6, r1=0.06)
    for z in (H + 6, H + 9):
        G.valec(hlinik, (sx, sy), 1.2, z, z + 0.15, seg=10)
    vystrazne_svetla(G, [(sx, sy)], ANTENA, cervena)
    dlha = max(range(len(veza)), key=lambda i: dlzka(veza[i], veza[(i + 1) % len(veza)]))
    a, b = veza[dlha], veza[(dlha + 1) % len(veza)]
    os_x = ((b[0] - a[0]) / dlzka(a, b), (b[1] - a[1]) / dlzka(a, b))
    for s in (-1, 1):
        strojovna(G, (sx + os_x[0] * s * 20, sy + os_x[1] * s * 20), os_x, 10, 8, H - 0.4, 3.0, beton, hlinik_d, strecha_m)
    vystrazne_svetla(G, [veza[0], veza[2]], H, cervena)
    return G, [veza, podnoz], ANTENA, 'tower-115', {'stred': [round(stred[0], 2), round(stred[1], 2)], 'vysky': [H, 9.0]}
