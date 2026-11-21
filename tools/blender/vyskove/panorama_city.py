# Panorama City (2015–2016, Ricardo Bofill + P-T / J. Hermann): dve bytové veže, 34 podlaží, ~108 m.
# Pôdorys je trojuholník s orezanými rohmi (OSM); veže sú rovnaké, model sa v hre postaví dvakrát.
# Biela mriežka z prefabrikátov: zvislé piliere a vodorovné pásy na každom podlaží, medzi nimi
# tmavé sklo; na orezanom rohu presklené balkóny. Navrchu piliere prečnievajú a nesú bielu
# rámovú korunu (pergolu) nad strešnou terasou.

from veze import (Geo, z_hry, rozdel, urovne, odsad, smer_v_bode, stred_obrysu, zavesova_stena,
                  strecha, strojovna, vystrazne_svetla, sklo, svetlo, dlzka, normala)
from spolocne import material


def postav(obrysy):
    zdroj = obrysy['panorama-city']['hlavne'][0]['body']        # Tower 1 (Tower 2 je takmer zhodná)
    stred = stred_obrysu(zdroj)
    obrys = z_hry(zdroj, stred)
    n0 = len(obrys)

    sklo_t = sklo('sklo-tmave', '#7f8c95', drsnost=0.05, kov=0.88)
    sklo_s = sklo('sklo-svetlejsie', '#909fa8', drsnost=0.05, kov=0.88)
    zabradlie = sklo('sklo-zabradlie', '#b5c4ca', drsnost=0.03, kov=0.6)
    lobby = sklo('sklo-lobby', '#a7b5ba', drsnost=0.03, kov=0.75)
    biela = material('biely-prefabrikat', '#efeee9', drsnost=0.6)
    ram = material('detail-ram', '#3e4347', drsnost=0.4, kov=0.6)
    strecha_m = material('strecha', '#8d8b86', drsnost=0.95)
    beton = material('beton', '#bdbbb4', drsnost=0.85)
    cervena = svetlo('svetlo-cervene', '#ff2a1a', 6.0)

    G = Geo()
    Z_LOBBY, H = 5.0, 108.0
    kz = urovne(Z_LOBBY, (33, 3.07))
    Z_STRECHA = kz[-1]

    # najdlhšia z krátkych hrán = orezaný roh s balkónmi
    dlzky = [dlzka(obrys[i], obrys[(i + 1) % n0]) for i in range(n0)]
    roh = max((i for i in range(n0) if 6 < dlzky[i] < 20), key=lambda i: dlzky[i])

    linia, rohy = rozdel(obrys, 1.5)
    n = len(linia)
    # ku ktorej hrane obrysu patrí bod línie
    hrana, h = [], -1
    for r in rohy:
        h += r
        hrana.append(h)
    balkon = {i for i in range(n) if hrana[i] == roh}

    # prízemie
    zavesova_stena(G, odsad(linia, -0.8), [-1.5, Z_LOBBY], sklo=lobby, ram=ram, vnor=0.1, stlpik=0.1,
                   priecka=0.15, naklon=0.0, seed=1)
    # podlažia: sklo za mriežkou
    def vyber(i, k, rnd):
        return sklo_s if (i * 7 + k * 3) % 11 == 0 else sklo_t
    zavesova_stena(G, linia, kz, sklo=vyber, ram=ram, vnor=0.45, stlpik=0.05, priecka=0.06, parapet=0.9,
                   mat_parapet=sklo_t, naklon=0.003, seed=2, priecky=False, segment_stlpika=6)

    # biela mriežka: pásy na každom podlaží, piliere každý druhý bod (≈ 3 m), hrubšie na rohoch
    for z in kz:
        G.pas(biela, linia, z - 0.22, z + 0.28, von=0.05, dnu=0.45, uzavreta=True)
    for i in range(n):
        if i in balkon and not rohy[i]:
            continue
        if i % 2 and not rohy[i]:
            continue
        t = smer_v_bode(linia, i)
        nx, ny = t[1], -t[0]
        s = 0.75 if rohy[i] else 0.42
        c = (linia[i][0] + nx * 0.02, linia[i][1] + ny * 0.02)
        for k0 in range(0, len(kz) - 1, 4):
            k1 = min(len(kz) - 1, k0 + 4)
            G.kvader(biela, c, t, s, 0.92, kz[k0], kz[k1], vrch=False)
        # nad strechou piliere nesú korunu
        G.kvader(biela, c, t, s, 0.92, Z_STRECHA, H)

    # balkóny na orezanom rohu: doska, sklenené zábradlie
    i_bal = sorted(balkon)
    if i_bal:
        a, b = i_bal[0], (i_bal[-1] + 1) % n
        A, B = linia[a], linia[b]
        nx, ny = normala(A, B)
        for z in kz[1:]:
            A2 = (A[0] + nx * 1.6, A[1] + ny * 1.6)
            B2 = (B[0] + nx * 1.6, B[1] + ny * 1.6)
            G.hranol(biela, [A, A2, B2, B], z - 0.22, z + 0.06, spodok=True)
            G.panel(zabradlie, A2, B2, z + 0.06, z + 1.1)
            G.panel(zabradlie, B2, A2, z + 0.06, z + 1.1)

    # koruna: vodorovné rámy medzi piliermi nad strechou (pergola) a atika
    strecha(G, odsad(linia, -0.45), Z_STRECHA, strecha_m, biela, atika=1.1)
    for z in (H - 0.6, Z_STRECHA + 3.3):
        G.pas(biela, linia, z, z + 0.6 if z > Z_STRECHA + 4 else z + 0.45, von=0.05, dnu=0.45)
    vnut = odsad(obrys, -6.0)
    sx = sum(p[0] for p in vnut) / len(vnut)
    sy = sum(p[1] for p in vnut) / len(vnut)
    strojovna(G, (sx, sy), (1, 0), 9, 7, Z_STRECHA, 3.6, beton, ram, strecha_m)
    for i in range(0, n, 4):
        p = linia[i]
        G.tram(biela, (p[0], p[1], H - 0.3), (p[0] * 0.15 + sx * 0.85, p[1] * 0.15 + sy * 0.85, H - 0.3), 0.35)

    vystrazne_svetla(G, [linia[i] for i in range(n) if rohy[i]][:3], H, cervena)
    return G, [obrys], H, 'panorama-city', {'stred': [round(stred[0], 2), round(stred[1], 2)]}
