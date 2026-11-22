# Eurovea Tower (2023, GFI): prvý slovenský mrakodrap, 168 m, 46 podlaží, byty.
# Podľa fotiek (Wikimedia Commons, prieskum v napady/pamiatky-podklady.md a research_notes – len na pozretie):
#   – pôdorys zaoblený trojuholník (OSM), každé podlažie má súvislý balkón okolo celej veže (prerušený len rebrami),
#     čelá dosiek sú zaoblené kovové „nosy“ (~0,4 m, striebrosivé), pod nimi svetlé podhľady, sklenené zábradlie;
#   – tmavé sklo na celú výšku podlažia s takmer čiernymi rámami;
#   – 12 bielych rebier (4 na každej strane, ~7–8 m od seba, zaoblené rohy bez rebra), ~0,9 m široké a ~2,3 m hlboké,
#     od zeme až po vrch koruny;
#   – od ~37. podlažia sa hmota zužuje (navrchu ~0,88 šírky);
#   – koruna je otvorená klietka: rebrá pokračujú rovno nahor, všetky do rovnakej výšky, spájajú ich 3 tmavé prstence;
#   – prízemie: ustúpená presklená hala na ~2 podlažia a pohľadové betónové stĺpy tvaru V (hrot dole) v rohoch.

import math

from veze import (Geo, z_hry, hladka, urovne, odsad, smer_v_bode, stred_obrysu, zavesova_stena,
                  strecha, strojovna, vystrazne_svetla, sklo, svetlo, dlzka)
from spolocne import material

Z_LOBBY = 10.0
PODLAZI = 45
V_PODL = 3.22
H = 168.0
BALKON = 1.6            # hĺbka balkóna (sklo je za ním)
ZUZENIE = 2.8           # m – o koľko je najvyššie podlažie ustúpené
REBRA_NA_STRANU = 4


def postav(obrysy):
    zdroj = obrysy['eurovea-tower']['hlavne'][0]['body']
    stred = stred_obrysu(zdroj)
    zaklad = hladka(z_hry(zdroj, stred), 3.0)    # ~3 m panely (okná na celú výšku podlažia)
    n = len(zaklad)

    sklo_m = sklo('sklo-tmave', '#3a4756', drsnost=0.04, kov=0.9)
    sklo_m2 = sklo('sklo-tmave-2', '#33404d', drsnost=0.04, kov=0.9)
    zabradlie = sklo('sklo-zabradlie', '#6f8090', drsnost=0.03, kov=0.6)
    lobby = sklo('sklo-lobby', '#5d6c78', drsnost=0.03, kov=0.75)
    rebro_m = material('rebra-biele', '#e6e7e4', drsnost=0.5)
    nos = material('detail-nos-dosky', '#a7adb3', drsnost=0.35, kov=0.7)
    podhlad = material('podhlad-balkona', '#d8dad8', drsnost=0.7)
    ram = material('detail-ram-tmavy', '#1f2326', drsnost=0.4, kov=0.6)
    beton = material('beton-pohladovy', '#c9c7c0', drsnost=0.8)
    prstenec = material('prstence-koruny', '#34383c', drsnost=0.45, kov=0.6)
    strecha_m = material('strecha', '#8d8b86', drsnost=0.95)
    cervena = svetlo('svetlo-cervene', '#ff2a1a', 6.0)

    G = Geo()
    kz = urovne(Z_LOBBY, (PODLAZI, V_PODL))
    Z_STRECHA = kz[-1]

    def ustup(k):
        """O koľko je podlažie k (0 = prvé nad halou) ustúpené – zužovanie od 37. podlažia."""
        return 0.0 if k < 36 else ZUZENIE * ((k - 35) / (PODLAZI - 35)) ** 1.3

    # tri rohy zaobleného trojuholníka (najďalej od stredu) a rebrá: 4 na každej strane, rohy bez rebra
    vzdial = [math.hypot(*p) for p in zaklad]
    rohy = []
    for i in sorted(range(n), key=lambda i: -vzdial[i]):
        if all(min(abs(i - j), n - abs(i - j)) > n // 6 for j in rohy):
            rohy.append(i)
        if len(rohy) == 3:
            break
    rohy.sort()
    rebra = []
    for a in range(3):
        i0, i1 = rohy[a], rohy[(a + 1) % 3]
        dlz = (i1 - i0) % n
        for s in range(REBRA_NA_STRANU):
            f = 0.2 + 0.6 * s / (REBRA_NA_STRANU - 1)
            rebra.append((i0 + round(dlz * f)) % n)

    def linia_k(k):
        u = ustup(min(k, PODLAZI - 1))
        return odsad(zaklad, -u) if u > 0 else zaklad

    # podlažia: sklo za balkónom, balkónová doska so zaobleným čelom, podhľad, sklenené zábradlie
    for k in range(len(kz) - 1):
        z0, z1 = kz[k], kz[k + 1]
        hrana = linia_k(k)
        fasada = odsad(hrana, -BALKON)

        def vyber(i, kk, rnd, k=k):
            return sklo_m2 if (i + k) % 7 == 0 else sklo_m
        zavesova_stena(G, fasada, [z0, z1 - 0.35], sklo=vyber, ram=ram, vnor=0.05, stlpik=0.06, priecka=0.06,
                       naklon=0.002, seed=k, stlpiky=False, priecky=False)
        # doska balkóna (vrch nad podlažím = podlaha balkóna vyššieho podlažia)
        G.pas(nos, hrana, z1 - 0.35, z1 + 0.05, von=0.0, dnu=BALKON + 0.1, spodok=False)
        G.pas(podhlad, hrana, z1 - 0.37, z1 - 0.35, von=-0.05, dnu=BALKON + 0.1, vrch=False)
        # sklenené zábradlie na hrane balkóna
        for i in range(n):
            j = (i + 1) % n
            if i in rebra:
                continue
            G.panel(zabradlie, hrana[i], hrana[j], z0 + 0.05, z0 + 1.1)

    # rebrá: biele plutvy od zeme po vrch koruny (po podlažiach sledujú zužovanie)
    for i in rebra:
        for k in range(-1, len(kz) - 1):
            z0 = 0.0 if k < 0 else kz[k]
            z1 = kz[k + 1] if k >= 0 else kz[0]
            hrana = linia_k(max(0, k))
            t = smer_v_bode(hrana, i)
            nx, ny = t[1], -t[0]
            c = (hrana[i][0] + nx * 0.7 - nx * 1.15, hrana[i][1] + ny * 0.7 - ny * 1.15)
            G.kvader(rebro_m, c, t, 0.9, 2.3, z0, z1, vrch=False, spodok=False)
        # nad strechou rovno nahor až po vrchol (koruna)
        hrana = linia_k(PODLAZI - 1)
        t = smer_v_bode(hrana, i)
        nx, ny = t[1], -t[0]
        c = (hrana[i][0] + nx * 0.7 - nx * 1.15, hrana[i][1] + ny * 0.7 - ny * 1.15)
        G.kvader(rebro_m, c, t, 0.9, 2.3, Z_STRECHA, H)

    # koruna: 3 tmavé prstence spájajúce rebrá (otvorená klietka), plochá strecha s technikou vnútri
    horna = linia_k(PODLAZI - 1)
    for z in (Z_STRECHA + 3.5, Z_STRECHA + 7.5, H - 0.6):
        G.pas(prstenec, odsad(horna, 0.1), z - 0.35, z + 0.35, von=0.35, dnu=0.35)
    strecha(G, odsad(horna, -BALKON), Z_STRECHA, strecha_m, nos, atika=1.2)
    strojovna(G, (0.0, 0.0), (1, 0), 12, 10, Z_STRECHA, 4.5, beton, ram, strecha_m)

    # prízemie: ustúpená presklená hala (~2 podlažia) a tri stĺpy tvaru V v rohoch (hrot dole)
    hala = odsad(zaklad, -3.0)
    zavesova_stena(G, hala, [-1.5, Z_LOBBY / 2, Z_LOBBY - 0.4], sklo=lobby, ram=ram, vnor=0.1, stlpik=0.12,
                   priecka=0.15, naklon=0.0, seed=99)
    G.pas(nos, zaklad, Z_LOBBY - 0.5, Z_LOBBY + 0.05, von=0.0, dnu=3.1)
    G.vodorovna(podhlad, zaklad, Z_LOBBY - 0.5, hore=False)
    for i in rohy:
        p = zaklad[i]
        t = smer_v_bode(zaklad, i)
        nx, ny = t[1], -t[0]
        pata = (p[0] - nx * 1.2, p[1] - ny * 1.2, -1.0)
        for s in (-1, 1):
            hore = (p[0] - nx * 1.0 + t[0] * s * 3.0, p[1] - ny * 1.0 + t[1] * s * 3.0, Z_LOBBY - 0.5)
            G.tram(beton, pata, hore, 0.8)

    vystrazne_svetla(G, [horna[i] for i in rohy], H, cervena)
    return G, [zaklad], H, 'eurovea-tower', {'stred': [round(stred[0], 2), round(stred[1], 2)]}
