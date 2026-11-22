# Eurovea – „presklené vajce“ (Eurovea Egg, Pribinova 6; Bose International + A1 ReSpect, 2010) a sklenená kupola
# nad vstupom do galérie. Podklady: napady/pamiatky-podklady.md, prieskum fotiek (Wikimedia Commons, ortofoto ZBGIS –
# len na pozretie), OSM relation 21708447 a way 762656643.
#   – vajce: pôdorys elipsa ~38,8 × 19,3 m (dlhá os SZ–JV, JV koniec tupý pri kupole); spodná tretina takmer zvislá,
#     potom sa plášť plynulo zaobľuje dnu (navrchu ~0,8 pôdorysu) a končí plochou oválnou strechou;
#     9 pásov trojuholníkových tabúľ (jeden pás = jedno podlažie, ~3,9 m) + svetlá čiapka, spolu ~36,6 m;
#     diagonálne priečle v oboch smeroch a vodorovná na každom podlaží, strieborný hliník, reflexné modrozelenosivé
#     sklo; prízemie (obchody) tmavšie;
#   – kupola: nízka segmentová (vznos ~4,5 m) na sklenenom bubne vysokom ~2 podlažia galérie (~11 m), okraj kupoly
#     presahuje bubon a pred vchodom ho držia dva tenké biele stĺpy; trojuholníková (geodetická) sieť bielej ocele,
#     vnútorný veniec na ~70 % polomeru. Nápis na bubne (značka obchodného centra) sa do hry nedáva.

import math

from veze import Geo, z_hry, hladka, odsad, stred_obrysu, zavesova_stena, sklo, dlzka
from spolocne import material

PASOV = 9
V_PASU = 3.9
CIAPKA = 1.6
OBVOD = 32              # trojuholníkov v páse po obvode (16 kosoštvorcov)
KUPOLA_ZAKLAD = 11.0
KUPOLA_VZNOS = 4.5
PRESAH = 1.3


def mierka(t):
    """Zúženie vajca vo výške t (0 = zem, 1 = vrch čiapky): spodná tretina zvislá, potom zaoblenie dnu na 0,8."""
    if t <= 0.33:
        return 1.0
    return 1.0 - 0.2 * ((t - 0.33) / 0.67) ** 1.7


def body_obvodu(obrys, pocet, posun=0.0):
    """pocet bodov rovnomerne po dĺžke uzavretého obrysu (posun = zlomok kroku)."""
    n = len(obrys)
    L = [0.0]
    for i in range(n):
        L.append(L[-1] + dlzka(obrys[i], obrys[(i + 1) % n]))
    out = []
    for k in range(pocet):
        s = L[-1] * ((k + posun) / pocet % 1.0)
        i = 0
        while L[i + 1] < s:
            i += 1
        a, b = obrys[i], obrys[(i + 1) % n]
        u = (s - L[i]) / max(1e-9, L[i + 1] - L[i])
        out.append((a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u))
    return out


def postav(obrysy):
    zaznam = obrysy['eurovea-vajce']
    zdroj = zaznam['hlavne'][0]['body']
    stred = stred_obrysu(zdroj)
    zaklad = hladka(z_hry(zdroj, stred), 1.6)

    sklo_v = sklo('sklo-vajce', '#4f626a', drsnost=0.04, kov=0.85)
    sklo_z = sklo('sklo-vajce-zelenkave', '#5e7a78', drsnost=0.04, kov=0.85)
    sklo_p = sklo('sklo-vajce-prizemie', '#2f3230', drsnost=0.05, kov=0.6)
    sklo_k = sklo('sklo-kupola', '#a8c4cc', drsnost=0.03, kov=0.5)
    sklo_b = sklo('sklo-bubon', '#8298a2', drsnost=0.04, kov=0.6)
    hlinik = material('detail-hlinik-priecle', '#a9afb3', drsnost=0.35, kov=0.75)
    ciapka = material('ciapka-panely', '#929495', drsnost=0.5, kov=0.3)
    atika = material('atika-svetla', '#d5d6d4', drsnost=0.6)
    strecha_m = material('strecha-vajce', '#c9c8c2', drsnost=0.95)
    ocel = material('detail-ocel-kupola', '#e6e8ea', drsnost=0.4, kov=0.5)
    stlp_m = material('stlpy-biele', '#d8dadc', drsnost=0.4, kov=0.4)

    G = Geo()
    H_PASY = PASOV * V_PASU
    H = H_PASY + CIAPKA

    # prstence: na každom podlaží body po obvode, každý druhý prstenec posunutý o pol kroku (diagrid)
    def prstenec(k):
        z = k * V_PASU
        s = mierka(z / H)
        return [(x * s, y * s, z) for x, y in body_obvodu(zaklad, OBVOD, 0.5 * (k % 2))]
    kruhy = [prstenec(k) for k in range(PASOV + 1)]
    for k in range(PASOV):
        A, B = kruhy[k], kruhy[k + 1]
        mat_k = sklo_p if k == 0 else None
        for i in range(OBVOD):
            j = (i + 1) % OBVOD
            # pri párnom k je horný prstenec posunutý doprava, pri nepárnom doľava
            if k % 2 == 0:
                t1 = [A[i], A[j], B[i]]
                t2 = [B[i], A[j], B[j]]
            else:
                t1 = [A[i], A[j], B[j]]
                t2 = [A[i], B[j], B[i]]
            for t, m in ((t1, (i + k) % 5), (t2, (i + 2 * k) % 7)):
                G.plocha(mat_k or (sklo_z if m == 0 else sklo_v), t)
            # diagonálne priečle: obe šikmé hrany trojuholníka t1 (hrot hore) – susedné t1 pokryjú celý diagrid
            G.tram(hlinik, t1[0], t1[2], 0.07)
            G.tram(hlinik, t1[1], t1[2], 0.07)
        # vodorovná priečla na podlaží
        for i in range(OBVOD):
            G.tram(hlinik, A[i], A[(i + 1) % OBVOD], 0.09)
    # čiapka: svetlé nepriehľadné panely, plochá oválna strecha s atikou
    vrch = kruhy[-1]
    s_top = mierka(1.0)
    hore = [(x * s_top, y * s_top, H) for x, y in body_obvodu(zaklad, OBVOD, 0.5 * (PASOV % 2))]
    for i in range(OBVOD):
        j = (i + 1) % OBVOD
        G.plocha(ciapka, [vrch[i], vrch[j], hore[j], hore[i]])
        G.tram(hlinik, vrch[i], vrch[j], 0.09)
    strecha_obrys = [(p[0], p[1]) for p in hore]
    G.vodorovna(strecha_m, odsad(strecha_obrys, -0.3), H - 0.3)
    G.pas(atika, strecha_obrys, H - 0.2, H + 0.4, von=0.05, dnu=0.3)
    G.valec(hlinik, (0.0, 0.0), 0.05, H, H + 4.0, seg=6)

    # sklenená kupola na bubne
    obrysy_hry = [zaklad]
    for cst in zaznam.get('casti', []):
        if cst['t'].get('roof:shape') != 'dome':
            continue
        kruh = z_hry(cst['body'], stred)
        cx = sum(q[0] for q in kruh) / len(kruh)
        cy = sum(q[1] for q in kruh) / len(kruh)
        r = sum(math.hypot(q[0] - cx, q[1] - cy) for q in kruh) / len(kruh) - PRESAH
        POL = 24
        valec = [(cx + math.cos(2 * math.pi * i / POL) * r, cy + math.sin(2 * math.pi * i / POL) * r) for i in range(POL)]
        urovne_b = [0.0, 3.2] + [3.2 + (KUPOLA_ZAKLAD - 3.2) * k / 5 for k in range(1, 6)]
        zavesova_stena(G, odsad(valec, -1.2), [0.0, 3.2], sklo=sklo_p, ram=hlinik, vnor=0.1, stlpik=0.1,
                       priecka=0.12, naklon=0.0, seed=4)
        zavesova_stena(G, valec, urovne_b[1:], sklo=sklo_b, ram=hlinik, vnor=0.1, stlpik=0.08,
                       priecka=0.1, naklon=0.0, seed=5)
        G.pas(atika, valec, 3.0, 3.5, von=0.2, dnu=1.3)          # markíza nad ustúpeným prízemím
        obrysy_hry.append(valec)
        # kupola: segment gule nad kruhom r + presah, trojuholníková sieť (prstence s posunom o pol kroku)
        RK = r + PRESAH
        ROV = 5

        def bod(i, j):
            v = j / ROV
            rr = RK * math.cos(v * math.pi / 2)
            u = 2 * math.pi * (i + 0.5 * (j % 2)) / POL
            return (cx + math.cos(u) * rr, cy + math.sin(u) * rr, KUPOLA_ZAKLAD + KUPOLA_VZNOS * math.sin(v * math.pi / 2))
        vrchol = (cx, cy, KUPOLA_ZAKLAD + KUPOLA_VZNOS)
        for j in range(ROV):
            for i in range(POL):
                a, b = bod(i, j), bod(i + 1, j)
                if j == ROV - 1:
                    t = [a, b, vrchol]
                    G.plocha(sklo_k, t); G.plocha(sklo_k, t[::-1])
                    G.tram(ocel, a, vrchol, 0.12)
                    continue
                c = bod(i, j + 1) if j % 2 == 0 else bod(i + 1, j + 1)
                d = bod(i - 1, j + 1) if j % 2 == 0 else bod(i, j + 1)
                for t in ([a, b, c], [a, c, d]):
                    G.plocha(sklo_k, t); G.plocha(sklo_k, t[::-1])
                G.tram(ocel, a, c, 0.1)
                G.tram(ocel, b, c, 0.1)
            for i in range(POL):
                G.tram(ocel, bod(i, j), bod(i + 1, j), 0.3 if j == 0 else (0.22 if j == 2 else 0.1))
        # dva tenké biele stĺpy pod presahom pred vchodom (strana k námestiu = sever, +Y)
        for s in (-1, 1):
            p = (cx + s * 3.2, cy + RK - 0.4)
            G.valec(stlp_m, p, 0.14, 0.0, KUPOLA_ZAKLAD, seg=8)
        print(f'kupola: stred ({cx:.1f}, {cy:.1f}), r bubna = {r:.1f} m')
    return G, obrysy_hry, H + 0.4, 'eurovea-vajce', {'stred': [round(stred[0], 2), round(stred[1], 2)]}
