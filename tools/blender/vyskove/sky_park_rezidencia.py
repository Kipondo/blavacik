# Sky Park Residence (2020–2024, Zaha Hadid Architects + GFI): štyri rovnaké bytové veže, 31 podlaží, ~105 m,
# eliptický pôdorys (OSM). Podľa fotiek (Wikimedia Commons; research_notes – len na pozretie):
#   – mierny „súdok“: elipsa sa od prízemia rozširuje (max ~+5 % v 35–50 % výšky), potom zužuje, posledné
#     4–5 podlaží má výrazne zaoblené „ramená“ (hrana strechy ~0,8 najväčšej šírky);
#   – biely exoskelet z GRC: rovné vodorovné prstence nie na každom podlaží – zhora po 1, 1, 1, 1, 2, 3, 4, 5, 6
#     a ~7 podlaží (nižšie redšie), a ~10 rovných zvislých línií (po jednej na koncoch dlhej osi, po 4 na dlhých
#     stranách) od zeme po vrch; medzi nimi nepriehľadné bronzové panely striedané so sklom;
#   – navrchu pás svetlosivých vodorovných lamiel medzi zvislicami, ktoré sa nad hranou strechy ohýbajú dnu
#     ako rebrá kupoly; pod ním ustúpené lodžie penthousov;
#   – prízemie ~7 m presklené, zvislice zostupujú až k zemi.

import math

from veze import (Geo, z_hry, hladka, urovne, odsad, stred_obrysu, zavesova_stena, strecha, strojovna,
                  vystrazne_svetla, sklo, svetlo)
from spolocne import material

Z_LOBBY = 7.0
PODLAZI = 30
V_PODL = 3.25
H = 105.0
# prstence zhora: medzery v podlažiach (zhora nadol), posledný až po prízemie
MEDZERY_ZHORA = [1, 1, 1, 1, 2, 3, 4, 5, 6]


def mierka(t):
    """Zväčšenie pôdorysu v pomernej výške t (0 = vrch prízemia, 1 = strecha): súdok so zaoblenými ramenami."""
    if t <= 0.42:
        return 1.0 + 0.05 * math.sin(math.pi / 2 * t / 0.42)
    if t <= 0.85:
        return 1.05 - 0.05 * ((t - 0.42) / 0.43) ** 2
    return 1.0 - 0.16 * ((t - 0.85) / 0.15) ** 2


def zvacsi(obrys, s):
    return [(x * s, y * s) for x, y in obrys]


def postav(obrysy):
    zdroj = obrysy['sky-park']['hlavne'][0]['body']           # Residence 1 (ostatné sú rovnaké)
    stred = stred_obrysu(zdroj)
    obrys = hladka(z_hry(zdroj, stred), 2.2)
    n = len(obrys)

    sklo_m = sklo('sklo-sky-park', '#44505a', drsnost=0.05, kov=0.85)
    lobby = sklo('sklo-lobby', '#56636c', drsnost=0.03, kov=0.75)
    bronz_p = material('bronzove-panely', '#7d7569', drsnost=0.45, kov=0.65)
    grc = material('biely-grc', '#e2e2df', drsnost=0.55)
    ram = material('detail-ram', '#54504c', drsnost=0.45, kov=0.6)
    lamely = material('lamely-svetlosive', '#c9cac7', drsnost=0.5, kov=0.3)
    strecha_m = material('strecha', '#8d8b86', drsnost=0.95)
    beton = material('beton', '#bdbbb4', drsnost=0.85)
    cervena = svetlo('svetlo-cervene', '#ff2a1a', 6.0)

    G = Geo()
    kz = urovne(Z_LOBBY, (PODLAZI, V_PODL))
    Z_STRECHA = kz[-1]
    t_k = [(z - Z_LOBBY) / (Z_STRECHA - Z_LOBBY) for z in kz]
    linie = [zvacsi(obrys, mierka(t)) for t in t_k]
    # prstence: indexy podlaží (zhora)
    prstence = {PODLAZI}
    k = PODLAZI
    for m in MEDZERY_ZHORA:
        k -= m
        if k > 0:
            prstence.add(k)
    prstence.add(0)

    # hlavná os elipsy (najdlhší priemer) – zvislice na jej koncoch a po 4 na dlhých stranách
    i_os = max(range(n), key=lambda i: math.hypot(*obrys[i]))
    ux, uy = obrys[i_os][0], obrys[i_os][1]
    L = math.hypot(ux, uy) or 1
    ux, uy = ux / L, uy / L

    def index_uhla(th):
        # bod obrysu v smere uhla th (meraného od hlavnej osi)
        dx, dy = ux * math.cos(th) - uy * math.sin(th), uy * math.cos(th) + ux * math.sin(th)
        return max(range(n), key=lambda i: (obrys[i][0] * dx + obrys[i][1] * dy) / (math.hypot(*obrys[i]) or 1))
    zvislice = sorted({index_uhla(th) for th in
                       [0.0, math.pi] + [math.pi / 2 + d for d in (-0.95, -0.32, 0.32, 0.95)]
                       + [3 * math.pi / 2 + d for d in (-0.95, -0.32, 0.32, 0.95)]})

    # podlažia: bronzové panely striedané so sklom (rytmus po paneloch), tenké čelo dosky
    def vyber(i, kk, rnd):
        return bronz_p if (i % 3 == 0) else sklo_m
    for k in range(PODLAZI):
        z0, z1 = kz[k], kz[k + 1]
        if k >= PODLAZI - 2:
            # lodžie penthousov – ustúpené sklo
            zavesova_stena(G, odsad(linie[k], -1.4), [z0, z1], sklo=sklo_m, ram=ram, vnor=0.05, stlpik=0.06,
                           priecka=0.06, seed=50 + k, stlpiky=True, priecky=False, stlpik_kazdy=2, segment_stlpika=1)
            G.vodorovna(grc, linie[k], z0 + 0.02)
        else:
            zavesova_stena(G, linie[k], [z0, z1], sklo=vyber, ram=ram, vnor=0.3, stlpik=0.06, priecka=0.06,
                           naklon=0.002, seed=2 + k, stlpiky=True, priecky=False, stlpik_kazdy=3, segment_stlpika=1)
        if k + 1 not in prstence:
            G.pas(ram, linie[k + 1], z1 - 0.12, z1 + 0.12, von=0.05, dnu=0.3)

    # biele prstence (vodorovné, rovné)
    for k in sorted(prstence):
        z = kz[k]
        G.pas(grc, linie[k], z - 0.45, z + 0.75, von=0.55, dnu=0.35)
    # zvislice: rovné od zeme po strechu (po podlažiach sledujú súdok)
    vonk = [odsad(l, 0.3) for l in linie]
    for i in zvislice:
        p0 = obrys[i]
        G.tram(grc, (p0[0] * 1.0, p0[1] * 1.0, 0.0), (vonk[0][i][0], vonk[0][i][1], Z_LOBBY), 0.75)
        for k in range(PODLAZI):
            a, b = vonk[k][i], vonk[k + 1][i]
            G.tram(grc, (a[0], a[1], kz[k]), (b[0], b[1], kz[k + 1]), 0.6)
        # nad strechou sa ohýbajú dnu ako rebrá kupoly
        a = vonk[-1][i]
        m = (a[0] * 0.82, a[1] * 0.82, Z_STRECHA + 2.6)
        v = (a[0] * 0.55, a[1] * 0.55, Z_STRECHA + 3.8)
        G.tram(grc, (a[0], a[1], Z_STRECHA + 0.6), m, 0.5)
        G.tram(grc, m, v, 0.45)
    # pás svetlosivých lamiel medzi zvislicami na vrchu
    G.zaluzie(lamely, odsad(linie[-1], -0.2), Z_STRECHA + 0.8, Z_STRECHA + 3.2, rozostup=0.42, hlbka=0.16)
    strecha(G, odsad(linie[-1], -0.3), Z_STRECHA, strecha_m, grc, atika=0.8)
    strojovna(G, (0.0, 0.0), (ux, uy), 12, 6, Z_STRECHA, 3.0, beton, ram, strecha_m)

    # prízemie – presklené na ~7 m
    zavesova_stena(G, odsad(obrys, -0.6), [-1.5, 3.5, Z_LOBBY - 0.4], sklo=lobby, ram=ram, vnor=0.1,
                   stlpik=0.1, priecka=0.14, naklon=0.0, seed=1)
    vystrazne_svetla(G, [linie[-1][zvislice[0]], linie[-1][zvislice[len(zvislice) // 2]]], Z_STRECHA + 3.9, cervena)
    return G, [obrys], H, 'sky-park-rezidencia', {'stred': [round(stred[0], 2), round(stred[1], 2)]}
