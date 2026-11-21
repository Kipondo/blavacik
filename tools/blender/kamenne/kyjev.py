# Hotel Kyjev (1973, Kamenné námestie): štíhla doska nad nízkou podnožou.
#   Výšky z laserového skenovania ÚGKK (DMP − DMR): podnož 10,5 m, strecha veže 61 m, technika do ~65 m.
#   Pôdorys veže a podnože z OSM (tools/blender/osm_kamenne.mjs → data/kamenne.json).
#   Fasáda: na širších stenách biele a tmavočervené pásy – vonku vodorovné (po pol podlaží), v strede
#   sústredné obdĺžnikové rámy (zvislé pruhy po stranách, vodorovné hore a dole, rohy na uhlopriečke);
#   užšie steny béžové so zvislými škárami, hore tmavočervený veniec, na streche ustúpená technika.
#   Podnož: presklené prízemie za stĺpmi, nad ním travertínový obklad s pásom okien.

import math

from spolocne import material
from veze import Geo, dlzka, normala, odsad, stred_obrysu, sklo, strecha, strojovna

from kamenne.zaklad import data, obrys_bl, cast, bod_na, najdlhsie_hrany

PODNOZ = 10.5      # strecha podnože (laser)
KORUNA = 59.4      # začiatok tmavého venca
VRCH = 61.0        # strecha veže (laser)
PAS = 1.5          # výška vodorovného pásu (pol podlažia)
RIADOK = 0.375     # krok mriežky vzoru na výšku (4 riadky = pás)
RAMY_Y = 4         # výška vodorovnej časti rámu v riadkoch (1,5 m – ako pás)
RAMOV = 7.5        # počet rámov od stredu (šírka pruhu ~1,6 m)
SPODNE_PASY = 7    # vodorovné pásy pod rámami
VRCHNE_PASY = 3    # vodorovné pásy nad rámami


def m_kyjev():
    return {
        'cervena': material('obklad-cerveny', '#8a3a2e', drsnost=0.55),
        'biela': material('obklad-biely-kyjev', '#ece9e2', drsnost=0.5),
        'bezova': material('obklad-bezovy', '#d6cebd', drsnost=0.6),
        'skara': material('detail-skara', '#9d9585', drsnost=0.7),
        'travertin': material('travertin', '#d9d4c8', drsnost=0.7),
        'sklo': sklo('sklo-kyjev', '#3e4c56', drsnost=0.05, kov=0.75),
        'ram': material('detail-ram-kyjev', '#4a4d50', drsnost=0.4, kov=0.6),
        'strecha': material('strecha-kyjev', '#8d8f8f', drsnost=0.9),
        'technika': material('technika-kyjev', '#a7a9a8', drsnost=0.6, kov=0.3),
        'lamely': material('detail-lamely-kyjev', '#6f7375', drsnost=0.5, kov=0.5),
        'stlp': material('stlp-kyjev', '#cfcac0', drsnost=0.6),
    }


def tmavy(u, v, sx):
    """Je panel na mieste (u od stredu fasády, v nad podnožou) tmavočervený?"""
    # rámy sú sústredné okolo zvislej úsečky v strede (stred je vysoký obdĺžnik so zvislými pruhmi)
    sy = RAMY_Y * RIADOK
    v0, v1 = SPODNE_PASY * PAS, (KORUNA - PODNOZ) - VRCHNE_PASY * PAS
    vc, h0 = (v0 + v1) / 2, (v1 - v0) / 2 - RAMOV * sy
    r = max(abs(u) / sx, (abs(v - vc) - h0) / sy)
    if r < RAMOV:
        return int(r) % 2 == 1
    return int(v / PAS) % 2 == 0


def fasada_vzor(G, M, a, b):
    """Široká stena veže: mriežka panelov, súvislé úseky rovnakej farby v riadku sa spoja."""
    L = dlzka(a, b)
    sx = L / round(L / 1.6)
    stlpcov = int(round(2 * L / sx))
    sirka = L / stlpcov
    riadkov = int(round((KORUNA - PODNOZ) / RIADOK))
    vyska = (KORUNA - PODNOZ) / riadkov
    for r in range(riadkov):
        z0, z1 = PODNOZ + r * vyska, PODNOZ + (r + 1) * vyska
        v = (r + 0.5) * vyska
        zac, farba = 0, None
        for c in range(stlpcov + 1):
            f = tmavy((c + 0.5) * sirka - L / 2, v, sx) if c < stlpcov else None
            if c == 0:
                farba = f
                continue
            if f != farba:
                G.stena(M['cervena'] if farba else M['biela'], bod_na(a, b, zac / stlpcov), bod_na(a, b, c / stlpcov), z0, z1)
                zac, farba = c, f


def fasada_bocna(G, M, a, b):
    """Užšia stena: béžové panely so zvislými škárami."""
    L = dlzka(a, b)
    G.stena(M['bezova'], a, b, PODNOZ, KORUNA)
    n = max(2, round(L / 1.25))
    for i in range(1, n):
        t = i / n
        G.stena(M['skara'], bod_na(a, b, t - 0.03 / L, 0.015), bod_na(a, b, t + 0.03 / L, 0.015), PODNOZ, KORUNA)


def veniec(G, M, obrys):
    """Tmavočervený veniec pod strechou so svetlými zvislými škárami."""
    n = len(obrys)
    for i in range(n):
        a, b = obrys[i], obrys[(i + 1) % n]
        G.stena(M['cervena'], a, b, KORUNA, VRCH + 0.6)
        L = dlzka(a, b)
        k = max(2, round(L / 0.9))
        for j in range(1, k):
            t = j / k
            G.stena(M['biela'], bod_na(a, b, t - 0.025 / L, 0.012), bod_na(a, b, t + 0.025 / L, 0.012), KORUNA + 0.1, VRCH + 0.5)


def vyklad(G, M, linia, z0, z1, krok=2.4, uzavreta=True):
    """Presklená stena so stĺpikmi (výklady prízemia)."""
    n = len(linia)
    for i in range(n if uzavreta else n - 1):
        a, b = linia[i], linia[(i + 1) % n]
        L = dlzka(a, b)
        if L < 0.2:
            continue
        G.stena(M['sklo'], a, b, z0, z1)
        k = max(1, round(L / krok))
        ux, uy = (b[0] - a[0]) / L, (b[1] - a[1]) / L
        for j in range(k + 1):
            p = bod_na(a, b, j / k, 0.04)
            G.kvader(M['ram'], p, (ux, uy), 0.08, 0.1, z0, z1)
        G.kvader(M['ram'], bod_na(a, b, 0.5, 0.04), (ux, uy), L, 0.1, z1 - 0.12, z1)


def podnoz(G, M, obrys):
    """Podnož: presklené prízemie 1,2 m za stĺpmi, travertín s pásom okien, plochá strecha s atikou."""
    PR = 4.2
    vnutro = odsad(obrys, -1.2)
    vyklad(G, M, vnutro, 0.0, PR)
    n = len(obrys)
    for i in range(n):
        a, b = obrys[i], obrys[(i + 1) % n]
        L = dlzka(a, b)
        if L < 0.3:
            continue
        ux, uy = (b[0] - a[0]) / L, (b[1] - a[1]) / L
        k = max(1, round(L / 6.0))
        for j in range(k + 1):
            G.kvader(M['stlp'], bod_na(a, b, j / k, -0.3), (ux, uy), 0.5, 0.5, 0.0, PR)
    G.vodorovna(M['travertin'], obrys, PR, hore=False)
    # travertín s pásom okien (sklo trochu zapustené)
    okno = odsad(obrys, -0.12)
    for i in range(n):
        a, b = obrys[i], obrys[(i + 1) % n]
        G.stena(M['travertin'], a, b, PR, 5.7)
        G.stena(M['travertin'], a, b, 7.7, PODNOZ)
        G.stena(M['sklo'], okno[i], okno[(i + 1) % n], 5.7, 7.7)
    G.pas(M['travertin'], obrys, 5.62, 5.7, 0.0, dnu=0.12, vrch=True, spodok=False)
    G.pas(M['travertin'], obrys, 7.7, 7.78, 0.0, dnu=0.12, vrch=False, spodok=True)
    G.pas(M['travertin'], obrys, PR - 0.35, PR, 0.12, dnu=0.0)
    strecha(G, obrys, PODNOZ, M['strecha'], M['travertin'], atika=0.9)


def postav():
    D = data()
    M = m_kyjev()
    G = Geo()
    stred = stred_obrysu([(p[0], p[1]) for p in D['kyjev']['obrys']['body']])
    stred = (round(stred[0], 2), round(stred[1], 2))
    zaklad = obrys_bl(D['kyjev']['obrys']['body'], stred, 0.3)
    veza = obrys_bl(cast(D, 'kyjev', '229586082')['body'], stred, 0.3)
    podnoz(G, M, zaklad)
    # veža: dve najdlhšie hrany so vzorom, ostatné béžové
    siroke = set(najdlhsie_hrany(veza, 2))
    n = len(veza)
    for i in range(n):
        a, b = veza[i], veza[(i + 1) % n]
        if i in siroke:
            fasada_vzor(G, M, a, b)
        else:
            fasada_bocna(G, M, a, b)
    veniec(G, M, veza)
    G.vodorovna(M['strecha'], odsad(veza, -0.25), VRCH)
    G.pas(M['cervena'], veza, VRCH, VRCH + 0.6, 0.0, dnu=0.25, vrch=True, spodok=False)
    # ustúpená technika na streche a dva stožiare
    i0 = max(range(n), key=lambda i: dlzka(veza[i], veza[(i + 1) % n]))
    a, b = veza[i0], veza[(i0 + 1) % n]
    L = dlzka(a, b)
    os_ = ((b[0] - a[0]) / L, (b[1] - a[1]) / L)
    sx = sum(p[0] for p in veza) / n
    sy = sum(p[1] for p in veza) / n
    hlbka = min(dlzka(veza[j], veza[(j + 1) % n]) for j in range(n))
    strojovna(G, (sx, sy), os_, L * 0.55, hlbka - 5.0, VRCH, 3.4, M['technika'], M['lamely'], M['strecha'])
    for s in (-1, 1):
        p = (sx + os_[0] * s * L * 0.2, sy + os_[1] * s * L * 0.2)
        G.valec(M['ram'], p, 0.09, VRCH + 3.4, VRCH + 7.5, seg=6)
    info = {'stred': [stred[0], stred[1]], 'nazov': 'Hotel Kyjev', 'dosah': 70,
            'nahradit': [[[round(x, 2), round(-y, 2)] for x, y in zaklad]]}
    # kolízie: presklená stena prízemia (popod stĺpy po obvode sa dá prejsť)
    return G, [odsad(zaklad, -1.2)], VRCH + 7.5, 'hotel-kyjev', info
