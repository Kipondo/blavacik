# Národná banka Slovenska (2002, Martin Kusý, Pavol Paňák): 33 podlaží, 111,6 m.
# Kompozícia: silná vodorovná podnož (kamenný obklad s pásovými oknami) a z nej rastúca
# presklená veža s dvojplášťovou fasádou; po obvode veže presklená šachta panoramatických
# výťahov. Tvar a výšky častí sú z OSM (building:part, building:levels, building:min_level).

from veze import (Geo, z_hry, zjednodus, rozdel, hladka, urovne, odsad, stred_obrysu, zavesova_stena,
                  kamenna_fasada, strecha, strojovna, vystrazne_svetla, sklo, svetlo, plocha_obrysu, smer_v_bode)
from spolocne import material

PODLAZIE, PRIZEMIE = 3.32, 5.5


def z_urovne(l):
    """Výška hornej hrany l-tého podlažia (l = počet podlaží od zeme)."""
    return PRIZEMIE + (l - 1) * PODLAZIE if l > 0 else 0.0


# id časti OSM: (štýl, podlažia od, podlažia do)
CASTI = {
    '411828068': ('kamen', 0, 3),
    '1278278317': ('kamen', 3, 4),
    '411828074': ('kamen', 0, 4),
    '1278278319': ('kamen', 0, 6),
    '1278278320': ('kamen', 4, 6),
    '1278278316': ('kamen', 6, 8),
    '411828059': ('oblúk', 4, 10),
    '411828062': ('vytahy', 4, 20),
    '411828065': ('vytahy', 4, 20),
    '229588344': ('veza', 4, 33),
}


def postav(obrysy):
    data = obrysy['nbs']
    stred = stred_obrysu(data['hlavne'][0]['body'])

    kamen = material('kamen', '#d6cfc2', drsnost=0.65)
    kamen_t = material('kamen-tmavsi', '#bdb5a7', drsnost=0.7)
    okna = sklo('sklo-okna', '#8fa6aa', drsnost=0.05, kov=0.8)
    plast = sklo('sklo-plast', '#9fbcbd', drsnost=0.04, kov=0.9)
    plast_t = sklo('sklo-plast-tmave', '#88a7aa', drsnost=0.04, kov=0.9)
    vytahy = sklo('sklo-vytahy', '#b3c7c9', drsnost=0.03, kov=0.7)
    lobby = sklo('sklo-lobby', '#a7b6bb', drsnost=0.03, kov=0.75)
    hlinik = material('hlinik', '#b4bbbe', drsnost=0.35, kov=0.75)
    hlinik_d = material('detail-hlinik', '#b4bbbe', drsnost=0.35, kov=0.75)
    rost = material('detail-rost', '#6c7376', drsnost=0.5, kov=0.6)
    strecha_m = material('strecha', '#8d8b86', drsnost=0.95)
    beton = material('beton', '#bdbbb4', drsnost=0.85)
    cervena = svetlo('svetlo-cervene', '#ff2a1a', 6.0)

    G = Geo()
    obrysy_hry, vysky = [], []
    for cast in data['casti']:
        if cast['id'] not in CASTI:
            continue
        styl, od, do = CASTI[cast['id']]
        o = zjednodus(z_hry(cast['body'], stred), 0.4)
        z0, z1 = z_urovne(od), z_urovne(do)
        if od == 0:
            z0 = -1.5
        obrysy_hry.append(o)
        vysky.append(round(z1, 1))
        if styl == 'kamen':
            kz = [z0] + [z_urovne(l) for l in range(max(1, od + 1), do + 1)]
            if od == 0:
                # prízemie podnože presklené, nad ním kameň s pásovými oknami
                zavesova_stena(G, odsad(o, -0.4), [z0, PRIZEMIE], sklo=lobby, ram=hlinik_d, vnor=0.1,
                               stlpik=0.1, priecka=0.15, naklon=0.0, seed=len(o))
                G.pas(kamen_t, odsad(o, -0.4), PRIZEMIE - 0.8, PRIZEMIE, von=0.4)
                kz = kz[1:]
            if len(kz) > 1:
                kamenna_fasada(G, o, kz, kamen=kamen, sklo=okna, ram=hlinik_d, parapet=1.2, preklad=0.45)
            strecha(G, o, z1, strecha_m, kamen, atika=0.9)
        elif styl == 'veza':
            linia, _ = rozdel(o, 1.5)
            kz = urovne(z0, *[(1, PODLAZIE)] * (do - od))

            def vyber(i, k, rnd):
                return plast_t if (i // 2 + k) % 9 == 0 or rnd.random() < 0.08 else plast
            # dvojplášť: vonkajšie sklo a pochôdzne rošty v medzipriestore (tenké pásy na každom podlaží)
            zavesova_stena(G, linia, kz, sklo=vyber, ram=hlinik_d, vnor=0.12, stlpik=0.06, priecka=0.08,
                           parapet=0.25, mat_parapet=rost, naklon=0.004, seed=5, obrys_priecok=o, segment_stlpika=4)
            # koruna: dve technické podlažia za lamelami a strecha
            G.zaluzie(hlinik, odsad(o, 0.05), z1, z1 + 4.2, rozostup=0.3, hlbka=0.16)
            G.hranol(beton, odsad(o, -0.5), z1, z1 + 4.2, vrch=False)
            strecha(G, o, z1 + 4.2, strecha_m, hlinik, atika=0.5)
            sx = sum(p[0] for p in o) / len(o)
            sy = sum(p[1] for p in o) / len(o)
            strojovna(G, (sx, sy), (1, 0), 10, 7, z1 + 4.2, 3.0, beton, hlinik_d, strecha_m)
            for dx in (-3, 3):
                G.valec(hlinik, (sx + dx, sy), 0.2, z1 + 7.2, z1 + 15.0, seg=6, r1=0.08)
            vystrazne_svetla(G, [(sx - 3, sy), (sx + 3, sy)], z1 + 15.0, cervena)
            vysky[-1] = round(z1 + 4.7, 1)
        else:
            # oblúková časť a výťahové šachty – presklené, výťahy svetlejšie sklo s jemnou mriežkou
            linia = hladka(o, 1.4, hustota=10) if styl == 'oblúk' else rozdel(o, 1.4)[0]
            kz = urovne(z0, *[(1, PODLAZIE)] * (do - od))
            mat = vytahy if styl == 'vytahy' else plast
            zavesova_stena(G, linia, kz, sklo=mat, ram=hlinik_d, vnor=0.12, stlpik=0.07, priecka=0.08,
                           parapet=0.0, naklon=0.003, seed=9, segment_stlpika=5)
            strecha(G, o, z1, strecha_m, hlinik, atika=0.6)
    # stredy vonkajších obrysov a celková výška
    poradie = sorted(range(len(obrysy_hry)), key=lambda i: -abs(plocha_obrysu(obrysy_hry[i])))
    return (G, [obrysy_hry[i] for i in poradie], max(vysky), 'nbs',
            {'stred': [round(stred[0], 2), round(stred[1], 2)], 'vysky': [vysky[i] for i in poradie]})
