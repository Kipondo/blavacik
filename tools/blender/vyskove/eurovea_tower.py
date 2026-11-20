# Eurovea Tower (2023, GFI): prvý slovenský mrakodrap, 168 m, 46 podlaží, byty.
# Pôdorys je zaoblený trojuholník (OSM). Fasádu členia lodžie a zvislé biele pásy („elegantný
# vertikalizmus“), od 38. podlažia sa hmota smerom hore zužuje a končí „tiarou“ vyvýšených
# rebier fasády. Na prízemí nesú vežu masívne betónové stĺpy v tvare V.

import math

from veze import (Geo, z_hry, hladka, urovne, odsad, smer_v_bode, stred_obrysu, zavesova_stena,
                  strecha, strojovna, vystrazne_svetla, sklo, svetlo, dlzka, normala)
from spolocne import material

RYTMUS = [1, 0, 0, 1, 0, 1, 0, 0]          # kde stojí zvislý biely pás (po paneloch)


def postav(obrysy):
    zdroj = obrysy['eurovea-tower']['hlavne'][0]['body']
    stred = stred_obrysu(zdroj)
    zaklad = hladka(z_hry(zdroj, stred), 1.55)
    n = len(zaklad)

    sklo_m = sklo('sklo-svetle', '#9fb1bd', drsnost=0.04, kov=0.9)
    sklo_t = sklo('sklo-tmavsie', '#8a9cab', drsnost=0.04, kov=0.9)
    zabradlie = sklo('sklo-zabradlie', '#b9c8cf', drsnost=0.03, kov=0.6)
    lobby = sklo('sklo-lobby', '#a9b8bd', drsnost=0.03, kov=0.75)
    biela = material('biela-fasada', '#eceeec', drsnost=0.55)
    ram = material('detail-ram', '#7d868c', drsnost=0.4, kov=0.7)
    beton = material('beton', '#c4c2bb', drsnost=0.8)
    strecha_m = material('strecha', '#8d8b86', drsnost=0.95)
    cervena = svetlo('svetlo-cervene', '#ff2a1a', 6.0)

    G = Geo()
    Z_LOBBY = 8.5
    kz = urovne(Z_LOBBY, (45, 3.3))           # 1. až 45. bytové podlažie
    Z_STRECHA = kz[-1]
    H = 168.0

    def ustup(k):
        """O koľko je podlažie k (0 = prvé nad lobby) ustúpené – zužovanie od 38. podlažia."""
        return 0.0 if k < 37 else 3.4 * ((k - 36) / 9) ** 1.4

    # lodžie: tri zvislé pásy lodží (v strede každej strany trojuholníka), každá 3 panely
    vzdial = [math.hypot(*p) for p in zaklad]
    rohy = sorted(range(n), key=lambda i: -vzdial[i])
    vrcholy = []
    for i in rohy:
        if all(min(abs(i - j), n - abs(i - j)) > n // 6 for j in vrcholy):
            vrcholy.append(i)
        if len(vrcholy) == 3:
            break
    vrcholy.sort()
    lodzie = set()
    for a in range(3):
        i0, i1 = vrcholy[a], vrcholy[(a + 1) % 3]
        dlz = (i1 - i0) % n
        for s in (0.3, 0.7):
            m = (i0 + round(dlz * s)) % n
            lodzie.update({(m - 1) % n, m, (m + 1) % n})

    for k in range(len(kz) - 1):
        z0, z1 = kz[k], kz[k + 1]
        linia = odsad(zaklad, -ustup(k)) if ustup(k) > 0 else zaklad

        def vyber(i, kk, rnd, k=k):
            if i in lodzie:
                return None
            return sklo_t if (i + k // 3) % 6 == 0 else sklo_m
        zavesova_stena(G, linia, [z0, z1], sklo=vyber, ram=ram, vnor=0.18, stlpik=0.05, priecka=0.08,
                       naklon=0.003, seed=k, stlpiky=True, priecky=False, stlpik_kazdy=2)
        # čelo stropnej dosky – tenký biely pás
        G.pas(biela, linia, z1 - 0.15, z1 + 0.15, von=0.05, dnu=0.18)
        # lodžie: zadné sklo, bočné steny, podlaha/strop, sklenené zábradlie
        hlb = 1.5
        zadna = odsad(linia, -hlb)
        for i in lodzie:
            j = (i + 1) % n
            G.panel(sklo_m, zadna[i], zadna[j], z0, z1 - 0.3)
            G.vodorovna(biela, [linia[i], linia[j], zadna[j], zadna[i]], z0 + 0.02)
            G.vodorovna(biela, [linia[i], linia[j], zadna[j], zadna[i]], z1 - 0.3, hore=False)
            G.panel(zabradlie, linia[i], linia[j], z0, z0 + 1.1)
            G.panel(zabradlie, linia[j], linia[i], z0, z0 + 1.1)
            for a, b in ((i, (i - 1) % n), (j, (j + 1) % n)):
                if b not in lodzie:
                    if a == i:
                        G.stena(biela, linia[a], zadna[a], z0, z1)
                    else:
                        G.stena(biela, zadna[a], linia[a], z0, z1)
        # zvislé biele pásy (rebrá) – v rytme, na hranách lodží vždy
        for i in range(n):
            if not (RYTMUS[i % len(RYTMUS)] or i in lodzie and (i - 1) % n not in lodzie):
                continue
            t = smer_v_bode(linia, i)
            nx, ny = t[1], -t[0]
            c = (linia[i][0] + nx * 0.22, linia[i][1] + ny * 0.22)
            G.kvader(biela, c, t, 0.32, 0.62, z0, z1, vrch=False, spodok=False)

    # tiara: rebrá nad strechou, najvyššie pri vrcholoch trojuholníka
    horna = odsad(zaklad, -ustup(45))
    r = [math.hypot(*p) for p in horna]
    rmin, rmax = min(r), max(r)
    for i in range(n):
        if not RYTMUS[i % len(RYTMUS)] and i % 2:
            continue
        v = ((r[i] - rmin) / (rmax - rmin)) ** 2
        h = Z_STRECHA + 2.2 + (H - Z_STRECHA - 2.6) * v
        t = smer_v_bode(horna, i)
        nx, ny = t[1], -t[0]
        c = (horna[i][0] + nx * 0.22, horna[i][1] + ny * 0.22)
        G.kvader(biela, c, t, 0.32, 0.62, Z_STRECHA, h)
        G.kvader(biela, (horna[i][0] - nx * 0.6, horna[i][1] - ny * 0.6), t, 0.2, 1.0, h - 0.6, h - 0.3)
    strecha(G, odsad(horna, -0.18), Z_STRECHA, strecha_m, biela, atika=1.6)
    strojovna(G, (0.0, 0.0), (1, 0), 12, 10, Z_STRECHA, 4.0, beton, ram, strecha_m)

    # prízemie: ustúpená presklená hala a betónové stĺpy tvaru V
    hala = odsad(zaklad, -2.6)
    zavesova_stena(G, hala, [-1.5, 4.25, Z_LOBBY], sklo=lobby, ram=ram, vnor=0.1, stlpik=0.12,
                   priecka=0.15, naklon=0.0, seed=99)
    G.pas(beton, zaklad, Z_LOBBY - 1.2, Z_LOBBY, von=0.25, dnu=2.7)
    for m in range(0, n, max(1, n // 15)):
        p = zaklad[m]
        t = smer_v_bode(zaklad, m)
        nx, ny = t[1], -t[0]
        pata = (p[0] - nx * 0.5, p[1] - ny * 0.5, -1.0)
        for s in (-1, 1):
            hore = (p[0] - nx * 0.5 + t[0] * s * 1.9, p[1] - ny * 0.5 + t[1] * s * 1.9, Z_LOBBY - 1.0)
            G.tram(beton, pata, hore, 0.7)

    vystrazne_svetla(G, [horna[i] for i in vrcholy], H, cervena)
    return G, [zaklad], H, 'eurovea-tower', {'stred': [round(stred[0], 2), round(stred[1], 2)]}
