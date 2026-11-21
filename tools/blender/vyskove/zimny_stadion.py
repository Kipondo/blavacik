# Zimný štadión na Trnavskej ceste (aréna, rekonštrukcia 2011): presklený parter, strieborný plech s rebrami
# a klenutá strecha nad hracou plochou. Obrys z OSM, strecha podľa hlavnej osi.

import math

from veze import Geo, z_hry, zjednodus, ccw
from spolocne import material
from vyskove.stadion_tehelne_pole import hlavna_os_pca

VYSKA = 17.0
KLENBA = 7.5


def postav(obrysy):
    h = obrysy['zimny-stadion']['hlavne'][0]
    stred = (sum(p[0] for p in h['body']) / len(h['body']), sum(p[1] for p in h['body']) / len(h['body']))
    o = ccw(zjednodus(z_hry(h['body'], stred), 0.5))
    c, u = hlavna_os_pca(o)
    v = (-u[1], u[0])
    sklo_m = material('zimny-sklo', '#4e6371', drsnost=0.08, kov=0.6)
    plech = material('zimny-plech', '#c3c8cc', drsnost=0.4, kov=0.6)
    rebra = material('zimny-rebra', '#9aa1a6', drsnost=0.45, kov=0.6)
    strecha = material('zimny-strecha', '#aeb4b8', drsnost=0.5, kov=0.5)
    G = Geo()
    n = len(o)
    for i in range(n):
        j = (i + 1) % n
        G.stena(sklo_m, o[i], o[j], -1.0, 4.5)
        G.stena(plech, o[i], o[j], 4.5, VYSKA)
        L = math.hypot(o[j][0] - o[i][0], o[j][1] - o[i][1])
        ux, uy = (o[j][0] - o[i][0]) / L, (o[j][1] - o[i][1]) / L
        for m in range(int(L / 3.0)):
            p = (o[i][0] + ux * (m + 0.5) * 3.0 + uy * 0.2, o[i][1] + uy * (m + 0.5) * 3.0 - ux * 0.2)
            G.kvader(rebra, p, (ux, uy), 0.25, 0.4, 4.5, VYSKA)
    # klenutá strecha: oblúk naprieč (os v), pozdĺž hlavnej osi u
    a_s = [(p[0] - c[0]) * u[0] + (p[1] - c[1]) * u[1] for p in o]
    b_s = [(p[0] - c[0]) * v[0] + (p[1] - c[1]) * v[1] for p in o]
    a0, a1, b0, b1 = min(a_s), max(a_s), min(b_s), max(b_s)
    S = 16
    def bod(a, b, z):
        return (c[0] + u[0] * a + v[0] * b, c[1] + u[1] * a + v[1] * b, z)
    prof = [(b0 + (b1 - b0) * k / S, VYSKA + KLENBA * math.sin(math.pi * k / S)) for k in range(S + 1)]
    for k in range(S):
        (bA, zA), (bB, zB) = prof[k], prof[k + 1]
        G.plocha(strecha, [bod(a0, bA, zA), bod(a0, bB, zB), bod(a1, bB, zB), bod(a1, bA, zA)][::-1])
    for a in (a0, a1):
        G.plocha(plech, [bod(a, b, z) for b, z in (prof if a == a0 else prof[::-1])])
    return G, [o], VYSKA + KLENBA, 'zimny-stadion', {'stred': [round(stred[0], 2), round(stred[1], 2)]}
