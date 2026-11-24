# Nivy Tower (2017–2020, Benoy + Siebert+Talaš; #132): 125 m, 30 nadzemných podlaží, celá zo skla.
# Prieskum (napady/pamiatky-podklady.md – Nivy Tower): obdĺžnik ~52 × 27 m (OSM way 662313148), dlhou osou ~98,8°
# (južná strana pozdĺž Mlynských nív). Hmotu na troch stranách delia šikmé tmavé zárezy („stuhy“, ~1 m) – veža
# pôsobí ako tri posunuté sklenené dosky:
#   A – severná doska po celej dĺžke (~12 m hlboká), navrchu ~7 m tmavých protidažďových žalúzií (technika),
#   B – juhovýchodný blok (od južného po východný zárez), presklený až po 125 m,
#   C – juhozápadný blok (od západného po južný zárez) končí ~113 m; na ňom ustúpená presklená reštaurácia
#       (29. NP, 3 m od juhu, 2,5 m od západu) a terasa so zábradlím na juhozápad.
# Južný zárez sa nakláňa od 15 m od JZ rohu (pri zemi, schodík v pôdoryse) po ~33 m (pri streche), východný od 16 m
# po 12 m od JV rohu, západný ~11,5–12 m od JZ rohu. Sklo v dvoch odtieňoch (zelenkavé a modravé, odrazivosť len
# 13–26 % – nie zrkadlo), vložené potlačené nepriehľadné polia, prízemie a reštaurácia priehľadné.
# Východne od veže samostatná vstupná strieška (OSM way 829898611, ~34 × 32 m, päťuholník): biely podhľad,
# presklený stred, sivé rozvetvené stĺpy v tvare Y. Logo nájomcu na fasáde sa nemodeluje (značka).

import math

from veze import (Geo, z_hry, rozdel, urovne, odsad, dlzka, stred_obrysu, zavesova_stena, strojovna,
                  vystrazne_svetla, sklo, svetlo)
from spolocne import material

H, H_SW, Z_REST, Z_LOBBY = 125.0, 113.0, 118.1, 6.5
ZALUZIE = 118.1             # od tejto výšky má severná doska tmavé žalúzie
HLBKA_SEVER = 12.0          # m – severná doska
REZ_JUH = (15.0, 33.0)      # m od JZ rohu po južnej strane – pri zemi, pri streche (125 m)
REZ_VYCHOD = (16.0, 12.0)   # m od JV rohu po východnej strane
REZ_ZAPAD = (11.5, 12.0)    # m od JZ rohu po západnej strane
USTUP_REST = (3.0, 2.5)     # m – reštaurácia ustúpená od juhu a od západu
# vstupná strieška východne od veže (OSM way 829898611, metre hry)
STRIESKA = [[1683.78, -285.53], [1682.65, -285.72], [1685.05, -301.02], [1686.61, -310.99], [1691.93, -313.43],
            [1697.87, -315.45], [1704.86, -305.01], [1711.35, -303.53], [1712.16, -302.01], [1716.66, -292.24],
            [1708.26, -288.15], [1697.67, -283.12]]
Z_STRIESKA = 9.5


def postav(obrysy):
    zdroj = obrysy['nivy-tower']['hlavne'][0]['body']
    stred = stred_obrysu(zdroj)
    obrys = z_hry(zdroj, stred)

    zelene = sklo('sklo-zelenkave', '#6f8a86', drsnost=0.05, kov=0.88)
    modre = sklo('sklo-modrave', '#5f7f95', drsnost=0.05, kov=0.88)
    potlac = material('sklo-potlac', '#9aa4a6', drsnost=0.3, kov=0.25)
    lobby = sklo('sklo-lobby', '#a7b6bb', drsnost=0.03, kov=0.8)
    hlinik = material('detail-hlinik', '#aeb5b9', drsnost=0.35, kov=0.75)
    tmavy = material('hlinik-tmavy', '#22262a', drsnost=0.45, kov=0.5)
    strecha = material('strecha', '#8d8b86', drsnost=0.95)
    terasa = material('terasa', '#b7b1a6', drsnost=0.9)
    beton = material('beton', '#b9b7b0', drsnost=0.85)
    biela = material('strieska-biela', '#eeece6', drsnost=0.6)
    ocel = material('ocel-siva', '#8d9296', drsnost=0.4, kov=0.6)
    cervena = svetlo('svetlo-cervene', '#ff2a1a', 6.0)

    # lokálne osi: u pozdĺž dlhej strany (na východ), v naprieč (na sever, v Blenderi +y)
    n = len(obrys)
    dlha = max(range(n), key=lambda i: dlzka(obrys[i], obrys[(i + 1) % n]))
    a, b = obrys[dlha], obrys[(dlha + 1) % n]
    U = ((b[0] - a[0]) / dlzka(a, b), (b[1] - a[1]) / dlzka(a, b))
    if U[0] < 0:
        U = (-U[0], -U[1])
    V = (-U[1], U[0])
    if V[1] < 0:
        V = (-V[0], -V[1])
    uv = lambda p: (p[0] * U[0] + p[1] * U[1], p[0] * V[0] + p[1] * V[1])
    xy = lambda u, v: (u * U[0] + v * V[0], u * U[1] + v * V[1])
    us, vs = [uv(p)[0] for p in obrys], [uv(p)[1] for p in obrys]
    uW, uE, vS, vN = min(us), max(us), min(vs), max(vs)
    lerp = lambda ab, z, h: ab[0] + (ab[1] - ab[0]) * max(0.0, min(1.0, z / h))
    rez_juh = lambda z: uW + lerp(REZ_JUH, z, H)

    def blok(u, v, z):
        """A = severná doska, B = juhovýchodný blok, C = juhozápadný blok (podľa zárezov vo výške z)."""
        if u > uE - 0.6:                                   # východná strana: zárez od JV rohu
            return 'B' if v - vS < lerp(REZ_VYCHOD, z, H) else 'A'
        if vN - v < HLBKA_SEVER:
            return 'A'
        return 'C' if u < rez_juh(z) else 'B'

    G = Geo()
    linia, _ = rozdel(obrys, 1.4)

    # prízemie: vysoké priehľadné sklo s priečkou v polovici
    zavesova_stena(G, linia, [-1.5, 3.25, Z_LOBBY], sklo=lobby, ram=tmavy, vnor=0.25, stlpik=0.12,
                   priecka=0.18, naklon=0.0, seed=2, obrys_priecok=obrys)

    # podlažia 2–30: blok podľa polohy panelu; C končí na 113 m, A má navrchu žalúzie
    Z = urovne(Z_LOBBY, (28, 3.8)) + [Z_REST, H]

    def vyber(i, k, rnd):
        p, q = linia[i], linia[(i + 1) % len(linia)]
        u, v = uv(((p[0] + q[0]) / 2, (p[1] + q[1]) / 2))
        z0, z1 = Z[k], Z[k + 1]
        bl = blok(u, v, (z0 + z1) / 2)
        if bl == 'C' and z0 >= H_SW - 0.2:
            return None
        if bl == 'A' and z0 >= ZALUZIE - 0.01:
            return tmavy
        if (i * 3 + k * 5) % 19 < 2:
            return potlac
        if bl == 'A':
            return modre
        if bl == 'B':
            return zelene
        return modre if (i + k) % 7 < 3 else zelene

    zavesova_stena(G, linia, Z, sklo=vyber, ram=hlinik, vnor=0.16, stlpik=0.06, priecka=0.12, parapet=0.3,
                   mat_parapet=tmavy, naklon=0.004, seed=3, obrys_priecok=obrys, segment_stlpika=4)

    # vnútorné steny tvaru L nad juhozápadným blokom (113 – 125 m) – od západu po južný zárez
    u_rez = rez_juh(H_SW)
    P1, P2, P3 = (uW, vN - HLBKA_SEVER), (u_rez, vN - HLBKA_SEVER), (u_rez, vS)

    def delene(body, krok=1.4):
        out = []
        for (ua, va), (ub, vb) in zip(body[:-1], body[1:]):
            m = max(1, round(math.hypot(ub - ua, vb - va) / krok))
            out += [xy(ua + (ub - ua) * t / m, va + (vb - va) * t / m) for t in range(m)]
        return out + [xy(*body[-1])]

    vnutorna = delene([P1, P2, P3])
    zavesova_stena(G, vnutorna, [H_SW, Z_REST, H], sklo=lambda i, k, r: modre if k else lobby, ram=hlinik, vnor=0.16,
                   stlpik=0.06, priecka=0.12, naklon=0.004, seed=6, uzavreta=False)

    # strecha veže (tvar L) s rímsou, technika s fotovoltikou
    L = [xy(uE, vS), xy(uE, vN), xy(uW, vN), xy(*P1), xy(*P2), xy(*P3)]
    G.vodorovna(strecha, odsad(L, -0.3), H - 0.3)
    G.pas(tmavy, L, H - 0.35, H, von=0.05, dnu=0.35)
    strojovna(G, xy((uW + uE) / 2, vN - HLBKA_SEVER / 2), U, 22, 7, H - 0.3, 3.8, beton, tmavy, strecha)

    # juhozápadný blok: terasa na 113 m, ustúpená presklená reštaurácia, zábradlie
    C = [xy(uW, vS + 1.39), xy(*P3), xy(*P2), xy(*P1)]
    G.vodorovna(terasa, C, H_SW + 0.05)
    du, dv = USTUP_REST[1], USTUP_REST[0]
    R = [xy(uW + du, vS + dv), xy(u_rez, vS + dv), xy(*P2), xy(uW + du, vN - HLBKA_SEVER)]
    rest = delene([(uW + du, vN - HLBKA_SEVER), (uW + du, vS + dv), (u_rez, vS + dv)])
    zavesova_stena(G, rest, [H_SW + 0.05, Z_REST], sklo=lobby, ram=hlinik, vnor=0.1, stlpik=0.07, priecka=0.12,
                   naklon=0.0, seed=7, uzavreta=False)
    G.vodorovna(strecha, R, Z_REST)
    G.pas(hlinik, R, Z_REST - 0.25, Z_REST + 0.15, von=0.15, dnu=0.0)
    for (ua, va), (ub, vb) in [((uW, vS + 1.39), (u_rez, vS + 0.6)), ((uW, vS + 1.39), (uW, vN - HLBKA_SEVER))]:
        A, B = xy(ua, va), xy(ub, vb)
        G.pas(hlinik, [A, B], H_SW + 1.0, H_SW + 1.08, von=0.04, dnu=0.04, uzavreta=False)
        m = max(1, round(dlzka(A, B) / 1.5))
        for t in range(m + 1):
            p = (A[0] + (B[0] - A[0]) * t / m, A[1] + (B[1] - A[1]) * t / m)
            G.kvader(hlinik, p, U, 0.05, 0.05, H_SW + 0.05, H_SW + 1.05)

    # šikmé tmavé zárezy (~1 m) tesne pred fasádou – z oboch strán, nech sú vidieť z každého uhla
    def zarez(body):
        G.plocha(tmavy, body)
        G.plocha(tmavy, list(reversed(body)))

    for (u0, u1, z1) in [(uW + REZ_JUH[0], rez_juh(H_SW), H_SW)]:
        v = vS - 0.08
        p = lambda u, z: (*xy(u, v), z)
        zarez([p(u0 - 0.5, 0.0), p(u0 + 0.5, 0.0), p(u1 + 0.5, z1), p(u1 - 0.5, z1)])
    u = uE + 0.08
    q = lambda v, z: (*xy(u, vS + v), z)
    zarez([q(REZ_VYCHOD[0] - 0.5, 0.0), q(REZ_VYCHOD[0] + 0.5, 0.0), q(REZ_VYCHOD[1] + 0.5, H), q(REZ_VYCHOD[1] - 0.5, H)])
    u = uW - 0.08
    w = lambda v, z: (*xy(u, vS + v), z)
    zarez([w(REZ_ZAPAD[0] - 0.5, 0.0), w(REZ_ZAPAD[0] + 0.5, 0.0), w(REZ_ZAPAD[1] + 0.5, H_SW), w(REZ_ZAPAD[1] - 0.5, H_SW)])

    # vstupná strieška východne od veže: biela doska s presklenýn stredom na rozvetvených stĺpoch Y
    s = z_hry(STRIESKA, stred)
    G.hranol(biela, s, Z_STRIESKA, Z_STRIESKA + 0.8, vrch=True, spodok=True)
    stred_s = (sum(p[0] for p in s) / len(s), sum(p[1] for p in s) / len(s))
    vnutro = [(stred_s[0] + (p[0] - stred_s[0]) * 0.55, stred_s[1] + (p[1] - stred_s[1]) * 0.55) for p in s]
    G.vodorovna(lobby, vnutro, Z_STRIESKA + 0.82)
    for k in range(0, len(s), 2):
        p = s[k]
        noha = (stred_s[0] + (p[0] - stred_s[0]) * 0.62, stred_s[1] + (p[1] - stred_s[1]) * 0.62)
        vetva = (stred_s[0] + (p[0] - stred_s[0]) * 0.8, stred_s[1] + (p[1] - stred_s[1]) * 0.8)
        kmen = (noha[0], noha[1], 5.2)
        G.tram(ocel, (noha[0], noha[1], 0.0), kmen, 0.45)
        smer = (-(p[1] - stred_s[1]), p[0] - stred_s[0])
        dl = math.hypot(*smer) or 1
        for sgn in (-1, 1):
            G.tram(ocel, kmen, (vetva[0] + sgn * smer[0] / dl * 2.6, vetva[1] + sgn * smer[1] / dl * 2.6, Z_STRIESKA), 0.32)

    vystrazne_svetla(G, [xy(uE - 1, vS + 1), xy(uE - 1, vN - 1), xy(uW + 1, vN - 1)], H, cervena)
    return G, [obrys], H, 'nivy-tower', {'stred': [round(stred[0], 2), round(stred[1], 2)]}
