# Vstup do Átriakov s turniketmi a ploty okolo areálu (issue #72), podľa verejnej fotografie vstupu
# (Wikimedia Commons, 2018) a OSM: tri celovýškové otočné turnikety v sivých kovových rámoch so strieškou
# (poloha z barrier=full-height_turnstile), vedľa sivá vrátnica s okienkom a strieškou s červeným pásom
# (building=guardhouse), vľavo dvojkrídlová kovová brána so značkou zákazu státia, sivá skriňa a betónový múr.
# Ploty a múry z OSM (barrier=fence/wall) po obvode areálu. Model kopíruje terén; cez turnikety sa dá prejsť.

import math

from spolocne import material
from veze import Geo, ccw, dlzka, normala, odsad

from atriaky.bloky import data

V_TURN = 2.45   # výška turniketu


def m_vstup():
    return {
        'kov': material('kov-turniket', '#8c9194', drsnost=0.4, kov=0.7),
        'kov_tmavy': material('detail-kov-tmavy', '#4d5154', drsnost=0.4, kov=0.6),
        'budka': material('budka-siva', '#c9ccce', drsnost=0.6),
        'cervena': material('pas-cerveny-budka', '#9b2433', drsnost=0.5),
        'sklo': material('sklo-budka', '#5d6b73', drsnost=0.1, kov=0.5),
        'beton': material('beton-mur', '#a9a6a0', drsnost=0.9),
        'znacka_modra': material('znacka-modra', '#1f4f9e', drsnost=0.5),
        'znacka_cervena': material('znacka-cervena', '#c42a2a', drsnost=0.5),
        'skrina': material('skrina-siva', '#9a9fa3', drsnost=0.6, kov=0.3),
    }


def bl(p, stred):
    return (p[0] - stred[0], -(p[1] - stred[1]))


def turniket(G, M, c, u, n):
    """Celovýškový turniket 1,6 × 1,5 m: rám so strieškou, otočný stĺp s ramenami, mreža na boku."""
    ux, uy = u
    nx, ny = n
    for su in (-0.8, 0.8):
        for sn in (-0.75, 0.75):
            G.kvader(M['kov'], (c[0] + ux * su + nx * sn, c[1] + uy * su + ny * sn), u, 0.1, 0.1, 0.0, V_TURN)
    G.kvader(M['kov'], c, u, 1.75, 1.65, V_TURN, V_TURN + 0.12)
    # bočná mreža (zvislé tyče) na jednej strane
    for k in range(9):
        t = -0.75 + 1.5 * k / 8
        G.kvader(M['kov_tmavy'], (c[0] + ux * 0.8 + nx * t, c[1] + uy * 0.8 + ny * t), u, 0.04, 0.04, 0.1, V_TURN - 0.1)
    # otočný stĺp a tri krídla z vodorovných tyčí
    G.valec(M['kov'], c, 0.07, 0.0, V_TURN, seg=8)
    for kr in range(3):
        uhol = kr * 2 * math.pi / 3 + 0.3
        d = (math.cos(uhol) * ux - math.sin(uhol) * nx, math.cos(uhol) * uy - math.sin(uhol) * ny)
        for z in [0.35 + 0.16 * i for i in range(12)]:
            G.tram(M['kov_tmavy'], (c[0], c[1], z), (c[0] + d[0] * 0.68, c[1] + d[1] * 0.68, z), 0.035)


def brana(G, M, a, u, n, sirka=4.2):
    """Dvojkrídlová kovová brána so stĺpikmi a značkou zákazu státia."""
    ux, uy = u
    b = (a[0] + ux * sirka, a[1] + uy * sirka)
    for p in (a, b):
        G.kvader(M['kov_tmavy'], p, u, 0.12, 0.12, 0.0, 2.0)
    for k in range(2):
        z0 = (a[0] + ux * (0.1 + k * sirka / 2), a[1] + uy * (0.1 + k * sirka / 2))
        L = sirka / 2 - 0.2
        G.kvader(M['kov'], (z0[0] + ux * L / 2, z0[1] + uy * L / 2), u, L, 0.05, 1.68, 1.75)
        G.kvader(M['kov'], (z0[0] + ux * L / 2, z0[1] + uy * L / 2), u, L, 0.05, 0.1, 0.17)
        for j in range(int(L / 0.25) + 1):
            p = (z0[0] + ux * j * 0.25, z0[1] + uy * j * 0.25)
            G.kvader(M['kov'], p, u, 0.03, 0.03, 0.1, 1.75)
        G.tram(M['kov'], (z0[0], z0[1], 0.17), (z0[0] + ux * L, z0[1] + uy * L, 1.68), 0.04)
    # značka zákazu státia na ľavom krídle (z vonkajšej strany)
    m = (a[0] + ux * sirka * 0.25 + n[0] * 0.06, a[1] + uy * sirka * 0.25 + n[1] * 0.06)
    kruh(G, M['znacka_cervena'], m, n, u, 1.25, 0.32)
    kruh(G, M['znacka_modra'], (m[0] + n[0] * 0.01, m[1] + n[1] * 0.01), n, u, 1.25, 0.25)
    p0 = (m[0] + n[0] * 0.02, m[1] + n[1] * 0.02)
    G.tram(M['znacka_cervena'], (p0[0] - ux * 0.17, p0[1] - uy * 0.17, 1.25 + 0.17), (p0[0] + ux * 0.17, p0[1] + uy * 0.17, 1.25 - 0.17), 0.06)
    return b


def kruh(G, mat, c, nrm, u, z, r, seg=16):
    nx, ny = nrm
    # body v smere v = (−ny, nx) a hore → normála von je nrm
    vx, vy = -ny, nx
    G.plocha(mat, [(c[0] + vx * r * math.cos(2 * math.pi * k / seg), c[1] + vy * r * math.cos(2 * math.pi * k / seg),
                    z + r * math.sin(2 * math.pi * k / seg)) for k in range(seg)])


def vratnica(G, M, obrys, vonku):
    """Sivá búdka s okienkom a strieškou s červeným pásom."""
    o = ccw(obrys)
    G.hranol(M['budka'], o, 0.0, 2.7, vrch=False)
    st = odsad(o, 0.45)
    G.hranol(M['cervena'], st, 2.7, 2.95, mat_vrch=M['budka'])
    G.vodorovna(M['budka'], st, 2.7, hore=False)
    n = len(o)
    # okno a dvere na strane do námestia
    i = max(range(n), key=lambda i: normala(o[i], o[(i + 1) % n])[0] * vonku[0] + normala(o[i], o[(i + 1) % n])[1] * vonku[1])
    a, b = o[i], o[(i + 1) % n]
    L = dlzka(a, b)
    nx, ny = normala(a, b)
    t0, t1 = 0.3, 0.7
    G.stena(M['sklo'], (a[0] + (b[0] - a[0]) * t0 + nx * 0.02, a[1] + (b[1] - a[1]) * t0 + ny * 0.02),
            (a[0] + (b[0] - a[0]) * t1 + nx * 0.02, a[1] + (b[1] - a[1]) * t1 + ny * 0.02), 1.0, 2.0)
    j = (i + 1) % n
    a, b = o[j], o[(j + 1) % n]
    nx, ny = normala(a, b)
    G.stena(M['kov_tmavy'], (a[0] + (b[0] - a[0]) * 0.3 + nx * 0.02, a[1] + (b[1] - a[1]) * 0.3 + ny * 0.02),
            (a[0] + (b[0] - a[0]) * 0.65 + nx * 0.02, a[1] + (b[1] - a[1]) * 0.65 + ny * 0.02), 0.0, 2.1)


def plot(G, M, body, uzavrety=False):
    """Kovový plot 1,8 m: stĺpiky po 2,5 m, tri vodorovné tyče, zvislé tyče po 0,5 m."""
    useky = list(zip(body, body[1:] + ([body[0]] if uzavrety else [])))
    for a, b in useky:
        L = dlzka(a, b)
        if L < 0.1:
            continue
        ux, uy = (b[0] - a[0]) / L, (b[1] - a[1]) / L
        k = max(1, round(L / 2.5))
        for j in range(k + 1):
            G.kvader(M['kov_tmavy'], (a[0] + ux * L * j / k, a[1] + uy * L * j / k), (ux, uy), 0.07, 0.07, 0.0, 1.85)
        for z in (0.1, 0.95, 1.75):
            G.kvader(M['kov_tmavy'], ((a[0] + b[0]) / 2, (a[1] + b[1]) / 2), (ux, uy), L, 0.03, z, z + 0.04, vrch=True)
        for j in range(1, int(L / 0.5)):
            G.kvader(M['kov_tmavy'], (a[0] + ux * j * 0.5, a[1] + uy * j * 0.5), (ux, uy), 0.025, 0.025, 0.1, 1.8, vrch=False)


def mur(G, M, body, vyska=1.9):
    for a, b in zip(body, body[1:]):
        L = dlzka(a, b)
        if L < 0.1:
            continue
        G.kvader(M['beton'], ((a[0] + b[0]) / 2, (a[1] + b[1]) / 2), ((b[0] - a[0]) / L, (b[1] - a[1]) / L), L + 0.25, 0.25, 0.0, vyska)


def postav():
    D, _ = data()
    M = m_vstup()
    G = Geo()
    stred = (round(D['turniket'][0], 2), round(D['turniket'][1], 2))
    plot_vstupu = next(p for p in D['ploty'] if p['id'] == '1509500794')
    pv = [bl(p, stred) for p in plot_vstupu['body']]
    a, b = pv[0], pv[-1]
    L = dlzka(a, b)
    u = ((b[0] - a[0]) / L, (b[1] - a[1]) / L)          # smer plota (na juh → k vrátnici)
    n = normala(a, b)                                    # jedna strana plota
    vratnica_bl = [bl(p, stred) for p in D['vratnica']['body']]
    vc = (sum(p[0] for p in vratnica_bl) / len(vratnica_bl), sum(p[1] for p in vratnica_bl) / len(vratnica_bl))
    # vrátnica je vnútri areálu → vonkajšia strana plota je opačná
    if vc[0] * n[0] + vc[1] * n[1] > 0:
        n = (-n[0], -n[1])
    vonku = n
    dnu = (-n[0], -n[1])
    # tri turnikety okolo bodu z OSM (stred modelu), spolu 5 m
    for s in (-1.75, 0.0, 1.75):
        turniket(G, M, (u[0] * s + dnu[0] * 0.2, u[1] * s + dnu[1] * 0.2), u, n)
    # brána, skriňa a múr na sever (proti smeru u)
    zac = (-u[0] * 2.7, -u[1] * 2.7)
    koniec = brana(G, M, zac, (-u[0], -u[1]), n)
    G.kvader(M['skrina'], (koniec[0] - u[0] * 1.0 + vonku[0] * 0.2, koniec[1] - u[1] * 1.0 + vonku[1] * 0.2), u, 1.4, 0.6, 0.0, 1.7)
    mur(G, M, [(koniec[0] - u[0] * 1.8, koniec[1] - u[1] * 1.8), (koniec[0] - u[0] * 12.0, koniec[1] - u[1] * 12.0)])
    vratnica(G, M, vratnica_bl, vonku)
    # plot od turniketov k vrátnici
    plot(G, M, [(u[0] * 2.6, u[1] * 2.6), (vc[0] - u[0] * 1.6, vc[1] - u[1] * 1.6)])
    kolizie = []
    for p in D['ploty']:
        if p['id'] == '1509500794':
            continue
        body = [bl(q, stred) for q in p['body']]
        if p['druh'] == 'wall':
            mur(G, M, body)
        else:
            plot(G, M, body)
        for q, r in zip(body, body[1:]):
            Lq = dlzka(q, r)
            if Lq < 0.1:
                continue
            nx, ny = normala(q, r)
            kolizie.append([[round(x, 2), round(-y, 2)] for x, y in
                            [(q[0] - nx * 0.15, q[1] - ny * 0.15), (r[0] - nx * 0.15, r[1] - ny * 0.15),
                             (r[0] + nx * 0.15, r[1] + ny * 0.15), (q[0] + nx * 0.15, q[1] + ny * 0.15)]])
    # kolízie: vrátnica, brána a múr (turnikety sú priechodné)
    kolizie.append([[round(x, 2), round(-y, 2)] for x, y in ccw(vratnica_bl)])
    for p0, p1 in ((zac, (koniec[0] - u[0] * 12.0, koniec[1] - u[1] * 12.0)),):
        nx, ny = n
        kolizie.append([[round(x, 2), round(-y, 2)] for x, y in
                        [(p0[0] - nx * 0.2, p0[1] - ny * 0.2), (p1[0] - nx * 0.2, p1[1] - ny * 0.2),
                         (p1[0] + nx * 0.2, p1[1] + ny * 0.2), (p0[0] + nx * 0.2, p0[1] + ny * 0.2)]])
    info = {'stred': [stred[0], stred[1]], 'podlaTerenu': True, 'kolizie': kolizie,
            'nahradit': [[[round(x, 2), round(-y, 2)] for x, y in ccw(vratnica_bl)]]}
    return G, [], 3.0, 'atriaky-vstup', info


def postav_vsetky():
    from atriaky.bloky import postav as bloky
    return [bloky, postav]
