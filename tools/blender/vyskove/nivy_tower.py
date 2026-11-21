# Nivy Tower (2020, Benoy + Siebert+Talaš): 125 m, 29 kancelárskych podlaží, celá sklenená.
# Fasáda z raumhohých sklenených prvkov v dvoch odtieňoch (zelenkavý a modravý lesk), do mriežky
# sú v rytme vložené nepriehľadné potlačené polia. Navrchu reštaurácia so sklenenou korunou,
# ktorá obopína strešnú terasu. Pôdorys je obdĺžnik ~56 × 35 m (OSM).

import math

from veze import (Geo, z_hry, zjednodus, rozdel, urovne, odsad, normala, dlzka, stred_obrysu,
                  zavesova_stena, strojovna, vystrazne_svetla, sklo, svetlo)
from spolocne import material


def postav(obrysy):
    zdroj = obrysy['nivy-tower']['hlavne'][0]['body']
    stred = stred_obrysu(zdroj)
    obrys = zjednodus(z_hry(zdroj, stred), 0.8)

    zelene = sklo('sklo-zelenkave', '#93aca6', drsnost=0.04, kov=0.92)
    modre = sklo('sklo-modrave', '#8ea2ba', drsnost=0.04, kov=0.92)
    potlac = material('sklo-potlac', '#b4bcbe', drsnost=0.3, kov=0.25)
    lobby = sklo('sklo-lobby', '#a7b6bb', drsnost=0.03, kov=0.8)
    hlinik = material('detail-hlinik', '#aeb5b9', drsnost=0.35, kov=0.75)
    tmavy = material('hlinik-tmavy', '#3a4045', drsnost=0.4, kov=0.6)
    tmavy_detail = material('detail-tmavy', '#3a4045', drsnost=0.4, kov=0.6)
    hlinik_hruby = material('hlinik', '#aeb5b9', drsnost=0.35, kov=0.75)
    strecha = material('strecha', '#8d8b86', drsnost=0.95)
    beton = material('beton', '#b9b7b0', drsnost=0.85)
    cervena = svetlo('svetlo-cervene', '#ff2a1a', 6.0)

    G = Geo()
    linia, _ = rozdel(obrys, 1.5)
    Z_LOBBY, Z_RESTAURACIA, Z_STRECHA, H = 6.5, 112.9, 118.1, 125.0

    # prízemie: vysoké svetlejšie sklo s priečkou v polovici, hrubšie stĺpiky
    zavesova_stena(G, linia, [-1.5, 3.25, Z_LOBBY], sklo=lobby, ram=tmavy_detail, vnor=0.25, stlpik=0.12,
                   priecka=0.18, naklon=0.0, seed=2, obrys_priecok=obrys)

    # kancelárske podlažia: dva odtiene skla v pomalých vlnách + rytmus potlačených polí
    def vyber(i, k, rnd):
        if (i * 3 + k * 5) % 17 < 2:
            return potlac
        v = math.sin(i * 0.19 + k * 0.11) + 0.8 * math.sin(i * 0.053 - k * 0.27) + rnd.uniform(-0.5, 0.5)
        return zelene if v > 0 else modre
    kancelarie = urovne(Z_LOBBY, (28, 3.8))
    # dolný tmavý pásik každého panelu = čelo stropnej dosky za sklom
    zavesova_stena(G, linia, kancelarie, sklo=vyber, ram=hlinik, vnor=0.16, stlpik=0.06, priecka=0.12,
                   parapet=0.3, mat_parapet=tmavy, naklon=0.004, seed=3, obrys_priecok=obrys, segment_stlpika=4)

    # reštaurácia (vyššie podlažie) a sklenená koruna nad strechou
    zavesova_stena(G, linia, [Z_RESTAURACIA, Z_STRECHA], sklo=lobby, ram=hlinik, vnor=0.2, stlpik=0.08,
                   priecka=0.2, naklon=0.003, seed=4, obrys_priecok=obrys)
    zavesova_stena(G, linia, [Z_STRECHA, H - 0.35], sklo=modre, ram=hlinik, vnor=0.1, stlpik=0.09,
                   priecka=0.15, naklon=0.003, seed=5, obrys_priecok=obrys)
    # vnútorná strana koruny (z terasy) a jej horná hrana
    vnutro = odsad(obrys, -0.12)
    n = len(vnutro)
    for i in range(n):
        G.stena(modre, vnutro[(i + 1) % n], vnutro[i], Z_STRECHA, H - 0.35)
    G.pas(hlinik_hruby, obrys, H - 0.35, H, von=0.05, dnu=0.35)

    # strešná terasa: dlažba, technická nadstavba s lamelami, pergola nad časťou terasy
    G.vodorovna(strecha, odsad(obrys, -0.3), Z_STRECHA + 0.1)
    dlha = max(range(len(obrys)), key=lambda i: dlzka(obrys[i], obrys[(i + 1) % len(obrys)]))
    a, b = obrys[dlha], obrys[(dlha + 1) % len(obrys)]
    os_x = ((b[0] - a[0]) / dlzka(a, b), (b[1] - a[1]) / dlzka(a, b))
    strojovna(G, (0.0, 0.0), os_x, 22, 9, Z_STRECHA + 0.1, 4.2, beton, tmavy, strecha)
    for k in range(-6, 7):
        if abs(k) < 4:
            continue
        x = k * 2.0
        c = (os_x[0] * x - os_x[1] * 9.5, os_x[1] * x + os_x[0] * 9.5)
        G.kvader(tmavy, c, (-os_x[1], os_x[0]), 7.0, 0.22, Z_STRECHA + 3.6, Z_STRECHA + 3.9)
    for s in (-1, 1):
        for x in (-12, 12):
            c = (os_x[0] * x - os_x[1] * 9.5 + os_x[1] * s * 3.2, os_x[1] * x + os_x[0] * 9.5 - os_x[0] * s * 3.2)
            G.kvader(tmavy, c, os_x, 0.25, 0.25, Z_STRECHA + 0.1, Z_STRECHA + 3.6)

    # prístrešok nad vchodom na južnej (najdlhšej južnej) strane
    juh = min(range(len(obrys)), key=lambda i: normala(obrys[i], obrys[(i + 1) % len(obrys)])[1]
              - 0.01 * dlzka(obrys[i], obrys[(i + 1) % len(obrys)]))
    a, b = obrys[juh], obrys[(juh + 1) % len(obrys)]
    nx, ny = normala(a, b)
    m = ((a[0] + b[0]) / 2 + nx * 1.6, (a[1] + b[1]) / 2 + ny * 1.6)
    d = ((b[0] - a[0]) / dlzka(a, b), (b[1] - a[1]) / dlzka(a, b))
    G.kvader(tmavy, m, d, 16, 3.4, 4.6, 5.0, spodok=True)

    vystrazne_svetla(G, [(p[0] * 0.98, p[1] * 0.98) for p in obrys[:4]], H, cervena)
    return G, [obrys], H, 'nivy-tower', {'stred': [round(stred[0], 2), round(stred[1], 2)]}
