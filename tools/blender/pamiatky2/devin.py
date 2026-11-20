# Hrad Devín: zrúcaniny na skalnom brale nad sútokom Dunaja a Moravy (OSM, data/pamiatky-2.json):
#   – hradby a múry (barrier=wall, wall=castle_wall; aj plošné area=yes) s rozpadnutým vrchom,
#   – zrúcaniny Horného a Stredného hradu a Paláca pánov z Gary: obvodové múry bez striech s oknami,
#   – základy veľkomoravského kostola a kaplnky (nízke múriky),
#   – Panenská veža (Mníška) na samostatnej skale, hradná studňa.
# Model kopíruje terén (podlaTerenu) – z = 0 je terén v danom mieste.

import math
import random

from veze import Geo, dlzka
from spolocne import material
from pamiatky2.zaklad import (data, v_bl, bez_konca, ccw, zrucany_mur, hranol_nerovny, kolizie_muru,
                              kolizia_obrysu, stred_bodov, delenie)

STRED = (-9560.0, -3380.0)
# výška zrúcanín podľa mena (m nad terénom) – horný hrad je na najvyššom bode brala
VYSKY = {'Horný hrad': 11.0, 'Stredný hrad': 8.5, 'Palác pánov z Gary': 10.0, 'Základy veľkomoravského kostola': 0.7,
         'Kaplnka z 11. storočia': 1.2}


def okna_v_mure(G, mat, obrys, z_od, z_do, hrubka, rozostup=4.0, sirka=1.1, vyska=1.8, seed=0):
    """Tmavé otvory okien na vonkajšom líci obvodového múru zrúcaniny (vnorené ostenie)."""
    rnd = random.Random(seed)
    n = len(obrys)
    for i in range(n):
        a, b = obrys[i], obrys[(i + 1) % n]
        L = dlzka(a, b)
        if L < rozostup:
            continue
        ux, uy = (b[0] - a[0]) / L, (b[1] - a[1]) / L
        nx, ny = uy, -ux                        # von (pre CCW obrys)
        k = int(L // rozostup)
        for j in range(k):
            if rnd.random() < 0.3:
                continue
            t = (j + 0.5) * L / k
            for z in (z_od, z_do):
                if z + vyska > z_do + vyska * 0.2 or z < 1.0:
                    continue
                c = (a[0] + ux * t, a[1] + uy * t)
                p0 = (c[0] - ux * sirka / 2 + nx * 0.02, c[1] - uy * sirka / 2 + ny * 0.02)
                p1 = (c[0] + ux * sirka / 2 + nx * 0.02, c[1] + uy * sirka / 2 + ny * 0.02)
                # otvor: tmavá plocha posunutá dnu + ostenie
                d = hrubka * 0.6
                q0 = (p0[0] - nx * d, p0[1] - ny * d)
                q1 = (p1[0] - nx * d, p1[1] - ny * d)
                G.stena(mat['tma'], q0, q1, z, z + vyska)
                G.plocha(mat['kamen'][0], [(p0[0], p0[1], z), (q0[0], q0[1], z), (q0[0], q0[1], z + vyska), (p0[0], p0[1], z + vyska)])
                G.plocha(mat['kamen'][0], [(q1[0], q1[1], z), (p1[0], p1[1], z), (p1[0], p1[1], z + vyska), (q1[0], q1[1], z + vyska)])
                G.plocha(mat['kamen'][1], [(p0[0], p0[1], z + vyska), (q0[0], q0[1], z + vyska), (q1[0], q1[1], z + vyska), (p1[0], p1[1], z + vyska)])
                G.plocha(mat['kamen'][1], [(q0[0], q0[1], z), (p0[0], p0[1], z), (p1[0], p1[1], z), (q1[0], q1[1], z)])


def postav():
    D = data()['devin']
    kamen = [material('devin-kamen-a', '#b8ad97', drsnost=0.94), material('devin-kamen-b', '#a89d88', drsnost=0.95),
             material('devin-kamen-c', '#c2b8a3', drsnost=0.93)]
    tma = material('devin-otvor', '#2a2723', drsnost=1.0)
    skala = material('devin-skala', '#9d9686', drsnost=0.97)
    voda_m = material('devin-studna-voda', '#26323a', drsnost=0.2)
    drevo = material('devin-drevo', '#5a4532', drsnost=0.9)
    M = {'kamen': kamen, 'tma': tma}
    G = Geo()
    kolizie = []
    obrysy = []
    pocet = 0
    for i, m in enumerate(D['mury']):
        body = [v_bl(p, STRED) for p in m['body']]
        if m['plocha']:
            # plošný múr (hrubý múr zakreslený ako plocha): nerovný hranol
            o = ccw(bez_konca(body))
            if len(o) < 3:
                continue
            rnd = random.Random(i)
            vys = 5.5 if m['mesto'] else 7.0
            vysky = [vys * (0.7 + 0.3 * rnd.random()) for _ in o]
            hranol_nerovny(G, kamen, o, -3.0, vysky, seed=i)
            kolizie.append(kolizia_obrysu(o))
        else:
            vys = 6.5 if m['mesto'] else 5.0
            zrucany_mur(G, kamen, body, vys, 1.5, seed=i * 7 + 1, rozpad=0.3)
            kolizie += kolizie_muru(body, 1.5)
        pocet += 1
    # zrúcaniny hradov a paláca: obvodový múr bez strechy, vnútri tma (nádvorie je terén)
    for i, z in enumerate(D['zruc']):
        o = ccw(bez_konca([v_bl(p, STRED) for p in z['body']]))
        if len(o) < 3:
            continue
        vys = VYSKY.get(z['nazov'] or '', 3.0 if len(o) < 8 else 4.5)
        hrubka = 1.6 if vys > 5 else 0.9
        zrucany_mur(G, kamen, o, vys, hrubka, seed=100 + i, rozpad=0.28 if vys > 2 else 0.15, uzavreta=True)
        if vys > 6:
            okna_v_mure(G, M, o, vys * 0.35, vys * 0.65, hrubka, seed=i)
        kolizie += kolizie_muru(o + [o[0]], hrubka)
        if z['budova']:
            obrysy.append(o)                      # generická budova z dlaždice sa vynechá
    # Panenská veža (Mníška) na skalnom pilieri
    v = D['veza']
    if v:
        o = ccw(bez_konca([v_bl(p, STRED) for p in v['body']]))
        c = stred_bodov(o)
        r = max(1.6, sum(math.hypot(p[0] - c[0], p[1] - c[1]) for p in o) / len(o))
        # skala: nepravidelný kužeľ
        rnd = random.Random(5)
        seg = 10
        prstene = [(-22.0, r * 2.6), (-8.0, r * 1.9), (0.0, r * 1.45), (4.5, r * 1.15)]
        kruhy = []
        for z0, rr in prstene:
            kruhy.append([(c[0] + rr * (0.8 + 0.35 * rnd.random()) * math.cos(2 * math.pi * k / seg),
                           c[1] + rr * (0.8 + 0.35 * rnd.random()) * math.sin(2 * math.pi * k / seg), z0) for k in range(seg)])
        for a, b in zip(kruhy[:-1], kruhy[1:]):
            for k in range(seg):
                kk = (k + 1) % seg
                G.plocha(skala, [a[k], a[kk], b[kk], b[k]])
        G.plocha(skala, kruhy[-1])
        # veža: štvorboká, kamenná, cimburie
        z0 = 4.5
        G.kvader(kamen[2], c, (1, 0), r * 1.6, r * 1.6, z0 - 0.5, z0 + 8.5)
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            for t in (-0.32, 0.32):
                cc = (c[0] + dx * r * 0.8 + (dy and t * r * 1.6), c[1] + dy * r * 0.8 + (dx and t * r * 1.6))
                G.kvader(kamen[0], cc, (1, 0), 0.5 if dy else 0.42, 0.42 if dy else 0.5, z0 + 8.5, z0 + 9.4)
        # okienko a strieľne
        G.kvader(tma, (c[0] + r * 0.81, c[1]), (0, 1), 0.5, 0.05, z0 + 4.0, z0 + 5.3, vrch=False)
        kolizie.append(kolizia_obrysu([(c[0] + r * 1.4 * math.cos(a), c[1] + r * 1.4 * math.sin(a)) for a in [k * math.pi / 4 for k in range(8)]]))
    # hradná studňa
    s = D.get('studna')
    if s:
        c = stred_bodov([v_bl(p, STRED) for p in bez_konca(s['body'])])
        G.valec(kamen[1], c, 1.9, -0.5, 0.9, seg=20)
        G.valec(voda_m, c, 1.5, 0.9, 0.9, seg=20)
        for a in (0, math.pi):
            G.kvader(drevo, (c[0] + 1.6 * math.cos(a), c[1]), (1, 0), 0.2, 0.2, 0.9, 2.8)
        G.tram(drevo, (c[0] - 1.6, c[1], 2.7), (c[0] + 1.6, c[1], 2.7), 0.18)
    print('Devín: múrov', pocet, 'zrúcanín', len(D['zruc']))
    return G, obrysy, 12.0, 'devin', {'stred': [STRED[0], STRED[1]], 'podlaTerenu': True, 'kolizie': kolizie}
