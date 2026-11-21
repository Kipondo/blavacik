# Manderla (Manderlák, 1935, Ch. Ludwig): prvý bratislavský „mrakodrap“ na Námestí SNP (issue #70).
#   Veža 12 podlaží nad prízemím s obchodmi, nižšie krídlo 7 podlaží do námestia – výšky z laserového
#   skenovania ÚGKK (veža 42,6 m, krídlo 24,9 m), pôdorysy častí z OSM (data/obrysy.json).
#   Fasáda: okrovo-hnedé režné murivo, tmavočervené zvislé piliere (rebrá) na rohoch a medzi poľami okien,
#   nad atikou končia hrotmi; samostatné obdĺžnikové okná s bielymi rámami v pravidelnej mriežke;
#   na streche menšia tehlová nadstavba so stožiarom; v prízemí tmavé výklady a nad nimi červený pás (bez nápisov).

import math

from spolocne import material
from veze import Geo, z_hry, zjednodus, odsad, dlzka, normala, stred_obrysu, sklo, strecha

PRIZEMIE = 4.3
VEZA = 42.6
KRIDLO = 24.9
NADSTAVBA = 46.4


def materialy():
    return {
        'tehla': material('tehla-manderla', '#a8895f', drsnost=0.85),
        'rebro': material('rebro-cervene', '#7a2b25', drsnost=0.6),
        'ram': material('ram-okna-biely', '#ebe8e1', drsnost=0.5),
        'sklo': sklo('sklo-manderla', '#3a4650', drsnost=0.05, kov=0.7),
        'vyklad': sklo('sklo-vyklad-manderla', '#2b3338', drsnost=0.05, kov=0.75),
        'pas': material('pas-cerveny', '#a3262a', drsnost=0.5),
        'biela': material('obklad-biely-manderla', '#e6e3dc', drsnost=0.6),
        'strecha': material('strecha-manderla', '#7f8282', drsnost=0.9),
        'tehla_cervena': material('tehla-cervena-nadstavba', '#8e3b2c', drsnost=0.85),
        'kov': material('detail-kov-manderla', '#4a4d50', drsnost=0.4, kov=0.7),
    }


def bod(a, b, t, von=0.0):
    nx, ny = normala(a, b)
    return (a[0] + (b[0] - a[0]) * t + nx * von, a[1] + (b[1] - a[1]) * t + ny * von)


def okna_hrany(G, M, a, b, z0, z1, podlazi, polia, okien_v_poli):
    """Okná s bielym rámom v poliach medzi rebrami (polia = počet polí na hrane)."""
    L = dlzka(a, b)
    vyska_p = (z1 - z0) / podlazi
    sirka_pola = L / polia
    for p in range(polia):
        for k in range(okien_v_poli):
            t = (p * sirka_pola + (k + 0.5) * sirka_pola / okien_v_poli) / L
            w = min(1.35, sirka_pola / okien_v_poli - 0.7) / L
            if w * L < 0.6:
                continue
            for i in range(podlazi):
                zz = z0 + i * vyska_p + 0.95
                G.stena(M['ram'], bod(a, b, t - w / 2 - 0.08 / L, 0.03), bod(a, b, t + w / 2 + 0.08 / L, 0.03), zz - 0.08, zz + 1.55 + 0.08)
                G.stena(M['sklo'], bod(a, b, t - w / 2, 0.05), bod(a, b, t + w / 2, 0.05), zz, zz + 1.55)
                # priečka okna (krížový rám)
                G.stena(M['ram'], bod(a, b, t - 0.03 / L, 0.06), bod(a, b, t + 0.03 / L, 0.06), zz, zz + 1.55)


def rebro(G, M, p, smer, z0, z1, hrot=True):
    """Tmavočervený pilier 0,85 × 0,85 m, nad atikou zakončený hrotom."""
    G.kvader(M['rebro'], p, smer, 0.85, 0.85, z0, z1)
    if hrot:
        G.kvader(M['rebro'], p, smer, 0.6, 0.6, z1, z1 + 0.6)
        G.valec(M['rebro'], p, 0.42, z1 + 0.6, z1 + 2.2, seg=4, r1=0.0)


def cast(G, M, obrys, z_spodok, z_vrch, podlazi, hroty):
    """Tehlová časť budovy s rebrami na rohoch a v poliach dlhých stien, oknami a plochou strechou."""
    n = len(obrys)
    for i in range(n):
        a, b = obrys[i], obrys[(i + 1) % n]
        G.stena(M['tehla'], a, b, z_spodok, z_vrch)
        L = dlzka(a, b)
        if L < 2.5:
            continue
        polia = max(1, round(L / 6.5))
        okien = 1 if L / polia < 4.2 else 2
        okna_hrany(G, M, a, b, z_spodok, z_vrch - 0.4, podlazi, polia, okien)
        ux, uy = (b[0] - a[0]) / L, (b[1] - a[1]) / L
        for p in range(1, polia):
            rebro(G, M, bod(a, b, p / polia, 0.2), (ux, uy), z_spodok, z_vrch + 0.9, hrot=hroty)
    # rohové rebrá (len na výrazných rohoch)
    for i in range(n):
        a, b, c = obrys[i - 1], obrys[i], obrys[(i + 1) % n]
        if dlzka(a, b) < 2.0 and dlzka(b, c) < 2.0:
            continue
        L = dlzka(b, c) or 1e-9
        rebro(G, M, b, ((c[0] - b[0]) / L, (c[1] - b[1]) / L), z_spodok, z_vrch + 0.9, hrot=hroty)
    strecha(G, obrys, z_vrch, M['strecha'], M['tehla'], atika=0.9)


def prizemie(G, M, obrys):
    """Výklady obchodov, nad nimi červený pás (bez nápisov) a biela rímsa."""
    vnutro = odsad(obrys, -0.25)
    n = len(obrys)
    for i in range(n):
        a, b = vnutro[i], vnutro[(i + 1) % n]
        G.stena(M['vyklad'], a, b, 0.0, 3.2)
        L = dlzka(a, b)
        k = max(1, round(L / 2.2))
        ux, uy = (b[0] - a[0]) / L if L else 1, (b[1] - a[1]) / L if L else 0
        for j in range(k + 1):
            G.kvader(M['kov'], bod(a, b, j / k, 0.03), (ux, uy), 0.1, 0.1, 0.0, 3.2)
    for i in range(n):
        a, b = obrys[i], obrys[(i + 1) % n]
        G.stena(M['pas'], bod(a, b, 0, 0.12), bod(a, b, 1, 0.12), 3.2, 3.95)
        G.stena(M['biela'], a, b, 3.95, PRIZEMIE)
    G.pas(M['biela'], obrys, PRIZEMIE - 0.12, PRIZEMIE, 0.18, dnu=0.3)


def postav(obrysy):
    data = obrysy['manderla']
    hlavne = data['hlavne'][0]
    stred = stred_obrysu(hlavne['body'])
    casti = {c['id']: ccw_obrys(c['body'], stred) for c in data['casti']}
    M = materialy()
    G = Geo()
    veza = casti['243535104']
    kridlo = casti['243535103']
    male = casti['243535100']
    for o in (veza, kridlo, male):
        prizemie(G, M, o)
    cast(G, M, veza, PRIZEMIE, VEZA, 12, True)
    cast(G, M, kridlo, PRIZEMIE, KRIDLO, 6, False)
    cast(G, M, male, PRIZEMIE, KRIDLO, 6, False)
    # tehlová nadstavba so stožiarom na streche veže
    sx = sum(p[0] for p in veza) / len(veza)
    sy = sum(p[1] for p in veza) / len(veza)
    i0 = max(range(len(veza)), key=lambda i: dlzka(veza[i], veza[(i + 1) % len(veza)]))
    a, b = veza[i0], veza[(i0 + 1) % len(veza)]
    L = dlzka(a, b)
    os_ = ((b[0] - a[0]) / L, (b[1] - a[1]) / L)
    G.kvader(M['tehla_cervena'], (sx, sy), os_, 7.0, 5.0, VEZA, NADSTAVBA, mat_vrch=M['strecha'])
    G.valec(M['kov'], (sx, sy), 0.12, NADSTAVBA, NADSTAVBA + 5.0, seg=6)
    G.valec(M['kov'], (sx, sy), 0.05, NADSTAVBA + 5.0, NADSTAVBA + 7.5, seg=4)
    obrysy_hry = [veza, kridlo, male]
    info = {'stred': [round(stred[0], 2), round(stred[1], 2)]}
    return G, obrysy_hry, NADSTAVBA + 7.5, 'manderla', info


def ccw_obrys(body, stred):
    return zjednodus(z_hry(body, stred), 0.2)
