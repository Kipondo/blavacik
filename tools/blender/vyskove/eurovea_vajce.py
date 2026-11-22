# Eurovea – „presklené vajce“ (Eurovea Egg, Pribinova 6; Bose International + A1 ReSpect, 2010) a sklenená kupola
# nad vstupom do galérie. Podklady: napady/pamiatky-podklady.md (OSM relation 21708447 – office, 8 podlaží,
# sklo, plochá strecha; kupola way 762656643 – roof:shape dome, glass, ~26 × 27 m).
#   – vajce: pôdorys zrezaného vajíčka ~38,7 × 19,3 m, dlhá os SZ–JV; obchody na prízemí, 7 podlaží kancelárií;
#     celosklenená fasáda so stĺpikmi a pásmi stropných dosiek, plochá strecha s atikou a technikou;
#   – kupola: nízka sklenená kupola na kruhovom pôdoryse s oceľovými poludníkmi a rovnobežkami.
# Výška vajca nie je zistená – 8 podlaží (prízemie 5 m + 7 × 3,6 m) ≈ 30 m.

import math

from veze import (Geo, z_hry, hladka, urovne, odsad, smer_v_bode, stred_obrysu, zavesova_stena, strecha,
                  strojovna, sklo, dlzka)
from spolocne import material

Z_PRIZEMIE = 5.0
PODLAZI = 7
V_PODL = 3.6
KUPOLA_ZAKLAD = 9.6      # m – kupola na streche dvojpodlažnej galérie (OSM building:levels 2)
KUPOLA_VZNOS = 5.5


def postav(obrysy):
    zaznam = obrysy['eurovea-vajce']
    zdroj = zaznam['hlavne'][0]['body']
    stred = stred_obrysu(zdroj)
    zaklad = hladka(z_hry(zdroj, stred), 1.6)

    sklo_v = sklo('sklo-vajce', '#7f97a3', drsnost=0.04, kov=0.85)
    sklo_t = sklo('sklo-vajce-tmave', '#6c8592', drsnost=0.04, kov=0.85)
    sklo_p = sklo('sklo-vajce-prizemie', '#9fb3bb', drsnost=0.04, kov=0.6)
    sklo_k = sklo('sklo-kupola', '#b9cbd2', drsnost=0.03, kov=0.5)
    ram = material('detail-ram-hlinik', '#a9b0b4', drsnost=0.35, kov=0.75)
    doska = material('doska-svetla', '#d9dcdc', drsnost=0.5)
    strecha_m = material('strecha-vajce', '#8f8d88', drsnost=0.95)
    tech = material('technika', '#b5b7b6', drsnost=0.6)
    ocel = material('detail-ocel-kupola', '#e4e6e5', drsnost=0.4, kov=0.6)

    G = Geo()
    kz = urovne(Z_PRIZEMIE, (PODLAZI, V_PODL))
    Z_STRECHA = kz[-1]

    # prízemie: obchody – výklady za tenkými stĺpikmi, ustúpené pod konzolou prvého podlažia
    prizemie = odsad(zaklad, -0.8)
    zavesova_stena(G, prizemie, [0.0, Z_PRIZEMIE - 0.6], sklo=sklo_p, ram=ram, vnor=0.1, stlpik=0.12,
                   priecka=0.12, naklon=0.0, seed=3)
    G.pas(doska, zaklad, Z_PRIZEMIE - 0.6, Z_PRIZEMIE, von=0.05, dnu=0.85)
    # kancelárie: celosklenená fasáda, stĺpiky po paneloch, pásy stropných dosiek
    def vyber(i, k, rnd):
        return sklo_t if (i * 7 + k * 3) % 11 == 0 else sklo_v
    zavesova_stena(G, zaklad, kz, sklo=vyber, ram=ram, vnor=0.14, stlpik=0.06, priecka=0.08,
                   naklon=0.003, seed=11, stlpiky=True, priecky=False, segment_stlpika=2)
    for z in kz[1:-1]:
        G.pas(doska, zaklad, z - 0.18, z + 0.12, von=0.06, dnu=0.12)
    strecha(G, zaklad, Z_STRECHA, strecha_m, doska, atika=1.1)
    # technika na streche v strede pôdorysu
    hrany = max(range(len(zaklad)), key=lambda i: dlzka((0, 0), zaklad[i]))
    p = zaklad[hrany]
    L = math.hypot(*p) or 1
    strojovna(G, (0.0, 0.0), (p[0] / L, p[1] / L), 9.0, 5.0, Z_STRECHA, 2.6, tech, ram, strecha_m)

    # sklenená kupola nad vstupom do galérie
    obrysy_hry = [zaklad]
    for cst in zaznam.get('casti', []):
        if cst['t'].get('roof:shape') != 'dome':
            continue
        kruh = z_hry(cst['body'], stred)
        cx = sum(q[0] for q in kruh) / len(kruh)
        cy = sum(q[1] for q in kruh) / len(kruh)
        r = sum(math.hypot(q[0] - cx, q[1] - cy) for q in kruh) / len(kruh)
        POL, ROV = 24, 6
        # dvojpodlažný presklený valec vstupu (OSM building:levels 2) – kupola sedí na ňom
        valec = [(cx + math.cos(2 * math.pi * i / POL) * r, cy + math.sin(2 * math.pi * i / POL) * r) for i in range(POL)]
        zavesova_stena(G, valec, [0.0, KUPOLA_ZAKLAD / 2, KUPOLA_ZAKLAD], sklo=sklo_p, ram=ram, vnor=0.1,
                       stlpik=0.1, priecka=0.12, naklon=0.0, seed=5)
        G.pas(doska, valec, KUPOLA_ZAKLAD / 2 - 0.25, KUPOLA_ZAKLAD / 2 + 0.1, von=0.08, dnu=0.1)
        G.pas(doska, valec, KUPOLA_ZAKLAD - 0.5, KUPOLA_ZAKLAD, von=0.25, dnu=0.3)
        obrysy_hry.append(valec)

        def bod(u, v):
            # u = uhol okolo, v = 0 (pätka) … 1 (vrchol) – nízka kupola (segment gule)
            rr = r * math.cos(v * math.pi / 2) ** 0.85
            return (cx + math.cos(u) * rr, cy + math.sin(u) * rr, KUPOLA_ZAKLAD + KUPOLA_VZNOS * math.sin(v * math.pi / 2))
        for i in range(POL):
            u0, u1 = 2 * math.pi * i / POL, 2 * math.pi * (i + 1) / POL
            for j in range(ROV):
                v0, v1 = j / ROV, (j + 1) / ROV
                q = [bod(u0, v0), bod(u1, v0), bod(u1, v1), bod(u0, v1)]
                if j == ROV - 1:
                    q = q[:3]
                G.plocha(sklo_k, q)
                G.plocha(sklo_k, q[::-1])
            # poludníky
            for j in range(ROV):
                G.tram(ocel, bod(u0, j / ROV), bod(u0, (j + 1) / ROV), 0.14)
        # rovnobežky a prstenec pätky
        for j in range(ROV):
            for i in range(POL):
                u0, u1 = 2 * math.pi * i / POL, 2 * math.pi * (i + 1) / POL
                G.tram(ocel, bod(u0, j / ROV), bod(u1, j / ROV), 0.12 if j else 0.3)
        print(f'kupola: stred ({cx:.1f}, {cy:.1f}), r = {r:.1f} m')
    return G, obrysy_hry, Z_STRECHA + 2.6, 'eurovea-vajce', {'stred': [round(stred[0], 2), round(stred[1], 2)]}
