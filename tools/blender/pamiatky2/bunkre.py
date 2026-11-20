# Bunkre československého opevnenia z roku 1937 (OSM building=bunker / military=bunker):
#   – ťažké objekty B-S (camouflaged pillbox) v Petržalke: betónový blok ~4,5 m nad terénom, zemný násyp,
#     oceľové pozorovacie zvony na streche, strieľne,
#   – ľahké objekty vz. 37 („řopíky“, pillbox) a ostatné: nízky betónový blok so strieľňami a násypom,
#   – bunkre bez obrysu (len bod): štvorec 5 × 5 m.
# Bunkre sa zoskupia do štvorcov 2 km (jeden súbor = jeden štvorec), model kopíruje terén.

import math
import random

from veze import Geo, dlzka, odsad, zjednodus
from spolocne import material
from pamiatky2.zaklad import data, v_bl, bez_konca, ccw, stred_bodov, kolizia_obrysu

STVOREC = 2000.0


def materialy():
    return {
        'beton': material('bunker-beton', '#8b8a83', drsnost=0.95),
        'beton2': material('bunker-beton-tmavy', '#77766f', drsnost=0.96),
        'zem': material('bunker-nasyp', '#5f6a3f', drsnost=1.0),
        'ocel': material('bunker-ocel', '#4a4740', drsnost=0.6, kov=0.6),
        'tma': material('bunker-strielna', '#1d1c1a', drsnost=1.0),
    }


def bunker(G, M, o, typ, seed):
    """Jeden bunker z obrysu o (CCW, lokálne Blender súradnice)."""
    rnd = random.Random(seed)
    tazky = typ == 'camouflaged pillbox'
    vys = 4.6 if tazky else (2.2 if typ == 'canon_loophole' else 2.8)
    # násyp: zrezaný ihlan okolo bunkra (zem do 55 % výšky)
    nas = odsad(o, 3.5 if tazky else 2.2, True)
    zn = vys * 0.55
    n = len(o)
    for i in range(n):
        j = (i + 1) % n
        G.plocha(M['zem'], [(nas[i][0], nas[i][1], -0.4), (nas[j][0], nas[j][1], -0.4), (o[j][0], o[j][1], zn), (o[i][0], o[i][1], zn)])
    # betónový blok so zrazenými hornými hranami
    G.hranol(M['beton'], o, -0.5, vys - 0.35, vrch=False)
    vnut = odsad(o, -0.35, True)
    for i in range(n):
        j = (i + 1) % n
        G.plocha(M['beton2'], [(o[i][0], o[i][1], vys - 0.35), (o[j][0], o[j][1], vys - 0.35), (vnut[j][0], vnut[j][1], vys), (vnut[i][0], vnut[i][1], vys)])
    G.vodorovna(M['beton2'], vnut, vys)
    # strieľne: tmavé zapustené otvory na dlhších stenách (nad násypom)
    for i in range(n):
        j = (i + 1) % n
        L = dlzka(o[i], o[j])
        if L < 2.5 or rnd.random() < 0.35:
            continue
        ux, uy = (o[j][0] - o[i][0]) / L, (o[j][1] - o[i][1]) / L
        nx, ny = uy, -ux
        for t in ([0.5] if L < 7 else [0.3, 0.7]):
            c = (o[i][0] + ux * L * t + nx * 0.03, o[i][1] + uy * L * t + ny * 0.03)
            w = 0.9 if tazky else 0.6
            G.stena(M['tma'], (c[0] - ux * w / 2, c[1] - uy * w / 2), (c[0] + ux * w / 2, c[1] + uy * w / 2), zn + 0.35, zn + 0.75)
    # ťažký objekt: 1–2 oceľové zvony na streche
    if tazky:
        c = stred_bodov(o)
        for k in range(1 + (seed % 2)):
            cc = (c[0] + (k - 0.5) * 2.2, c[1])
            G.valec(M['ocel'], cc, 0.85, vys, vys + 0.7, seg=14, r1=0.75)
            G.valec(M['ocel'], cc, 0.75, vys + 0.7, vys + 1.05, seg=14, r1=0.2)
            for a in range(3):
                u = a * 2 * math.pi / 3 + rnd.random()
                G.stena(M['tma'], (cc[0] + 0.86 * math.cos(u), cc[1] + 0.86 * math.sin(u)), (cc[0] + 0.86 * math.cos(u + 0.35), cc[1] + 0.86 * math.sin(u + 0.35)), vys + 0.3, vys + 0.48)
    return vys


def postav_vsetky():
    B = data()['bunkre']
    skupiny = {}
    for b in B:
        if b.get('body'):
            o = bez_konca(b['body'])
            if len(o) < 3:
                continue
            c = stred_bodov(o)
        else:
            c = b['bod']
            o = [(c[0] - 2.5, c[1] - 2.5), (c[0] + 2.5, c[1] - 2.5), (c[0] + 2.5, c[1] + 2.5), (c[0] - 2.5, c[1] + 2.5)]
        k = (math.floor(c[0] / STVOREC), math.floor(c[1] / STVOREC))
        skupiny.setdefault(k, []).append((b, o, c))
    for k, zoznam in sorted(skupiny.items()):
        def vysledok(k=k, zoznam=zoznam):
            M = materialy()
            G = Geo()
            stred = stred_bodov([c for _, _, c in zoznam])
            obrysy, kolizie, mena = [], [], []
            for i, (b, o, c) in enumerate(zoznam):
                bl = ccw(zjednodus([v_bl(p, stred) for p in o], 0.25))
                if len(bl) < 3:
                    continue
                bunker(G, M, bl, b.get('typ') or '', int(b['id']) % 97)
                obrysy.append(bl)
                kolizie.append(kolizia_obrysu(bl))
                if b.get('nazov') or b.get('ref'):
                    mena.append({'x': round(c[0], 1), 'z': round(c[1], 1), 'nazov': ' '.join(x for x in (b.get('ref'), b.get('nazov')) if x)})
            subor = f'bunkre-{k[0]}_{k[1]}'
            print(subor, len(zoznam), 'bunkrov')
            return G, obrysy, 5.0, subor, {'stred': [round(stred[0], 2), round(stred[1], 2)], 'podlaTerenu': True,
                                           'kolizie': kolizie, 'bunkre': mena}
        yield vysledok
