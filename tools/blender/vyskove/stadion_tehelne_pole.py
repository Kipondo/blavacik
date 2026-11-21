# Národný futbalový štadión na Tehelnom poli (2019): uzavretý štadión s jedným prstencom tribún okolo ihriska,
# biela strecha nad tribúnami s osvetlením pod okrajom, fasáda z bielych lamiel a skla.
# Obrys štadióna z OSM (leisure=stadium), ihrisko 105 × 68 m v strede podľa hlavnej osi obrysu.

import math

from veze import Geo, z_hry, zjednodus, odsad, ccw, svetlo
from spolocne import material

DL, SI = 105.0, 68.0


def hlavna_os_pca(o):
    cx = sum(p[0] for p in o) / len(o)
    cy = sum(p[1] for p in o) / len(o)
    sxx = sum((p[0] - cx) ** 2 for p in o)
    syy = sum((p[1] - cy) ** 2 for p in o)
    sxy = sum((p[0] - cx) * (p[1] - cy) for p in o)
    a = 0.5 * math.atan2(2 * sxy, sxx - syy)
    return (cx, cy), (math.cos(a), math.sin(a))


def luc_polygon(c, d, poly):
    """Vzdialenosť od c v smere d po okraj polygónu (prvý priesečník)."""
    best = None
    n = len(poly)
    for i in range(n):
        a, b = poly[i], poly[(i + 1) % n]
        ex, ey = b[0] - a[0], b[1] - a[1]
        det = d[0] * (-ey) - d[1] * (-ex)
        if abs(det) < 1e-9:
            continue
        rx, ry = a[0] - c[0], a[1] - c[1]
        t = (rx * (-ey) - ry * (-ex)) / det
        s = (d[0] * ry - d[1] * rx) / det
        if t > 0 and 0 <= s <= 1 and (best is None or t < best):
            best = t
    return best or 0.0


def zaobleny_obdlznik(c, u, a, b, r, seg=6):
    v = (-u[1], u[0])
    out = []
    for (sx, sy), a0 in (((1, 1), 0), ((-1, 1), 90), ((-1, -1), 180), ((1, -1), 270)):
        cx, cy = sx * (a - r), sy * (b - r)
        for k in range(seg + 1):
            t = math.radians(a0 + 90 * k / seg)
            x, y = cx + r * math.cos(t), cy + r * math.sin(t)
            out.append((c[0] + u[0] * x + v[0] * y, c[1] + u[1] * x + v[1] * y))
    return out


def postav(obrysy):
    h = obrysy['stadion-tehelne-pole']['hlavne'][0]
    sx = sum(p[0] for p in h['body']) / len(h['body'])
    sz = sum(p[1] for p in h['body']) / len(h['body'])
    stred = (sx, sz)
    o = ccw(zjednodus(z_hry(h['body'], stred), 0.8))
    c, u = hlavna_os_pca(o)
    v = (-u[1], u[0])
    G = Geo()
    sedadla = [material('stadion-sedadla-a', '#2f5fa8', drsnost=0.6), material('stadion-sedadla-b', '#264d8c', drsnost=0.6)]
    beton = material('stadion-beton', '#b9b8b2', drsnost=0.85)
    biela = material('stadion-strecha', '#eef0f1', drsnost=0.5)
    lamely = material('stadion-lamely', '#f2f3f3', drsnost=0.45, kov=0.2)
    sklo_m = material('stadion-sklo', '#4f6573', drsnost=0.08, kov=0.6)
    trava = [material('stadion-trava-a', '#3f7a33', drsnost=0.95), material('stadion-trava-b', '#4a8a3b', drsnost=0.95)]
    ciary = material('stadion-ciary', '#f4f4f0', drsnost=0.8)
    okolie = material('stadion-okolie', '#3d5e35', drsnost=0.95)
    svetla = svetlo('stadion-svetla', '#fff6e8', 5.0)
    # ihrisko: pruhy, okolie
    N = 18
    def bod(a, b, z):
        return (c[0] + u[0] * a + v[0] * b, c[1] + u[1] * a + v[1] * b, z)
    G.plocha(okolie, [bod(-DL / 2 - 7, -SI / 2 - 6, 0.03), bod(DL / 2 + 7, -SI / 2 - 6, 0.03), bod(DL / 2 + 7, SI / 2 + 6, 0.03), bod(-DL / 2 - 7, SI / 2 + 6, 0.03)])
    for k in range(N):
        a0, a1 = -DL / 2 + DL * k / N, -DL / 2 + DL * (k + 1) / N
        G.plocha(trava[k % 2], [bod(a0, -SI / 2, 0.06), bod(a1, -SI / 2, 0.06), bod(a1, SI / 2, 0.06), bod(a0, SI / 2, 0.06)])
    def ciara(p, q, w=0.12):
        dx, dy = q[0] - p[0], q[1] - p[1]
        L = math.hypot(dx, dy) or 1
        nx, ny = -dy / L * w / 2, dx / L * w / 2
        G.plocha(ciary, [bod(p[0] - nx, p[1] - ny, 0.08), bod(q[0] - nx, q[1] - ny, 0.08), bod(q[0] + nx, q[1] + ny, 0.08), bod(p[0] + nx, p[1] + ny, 0.08)])
    A, B = DL / 2, SI / 2
    for p, q in (((-A, -B), (A, -B)), ((A, -B), (A, B)), ((A, B), (-A, B)), ((-A, B), (-A, -B)), ((0, -B), (0, B))):
        ciara(p, q)
    kruh = [(9.15 * math.cos(2 * math.pi * k / 40), 9.15 * math.sin(2 * math.pi * k / 40)) for k in range(41)]
    for p, q in zip(kruh[:-1], kruh[1:]):
        ciara(p, q)
    for s in (-1, 1):
        for d, w in ((16.5, 20.15), (5.5, 9.15)):
            ciara((s * A, -w), (s * (A - d), -w)); ciara((s * (A - d), -w), (s * (A - d), w)); ciara((s * (A - d), w), (s * A, w))
        # brány
        for b in (-3.66, 3.66):
            G.tram(ciary, bod(s * A, b, 0), bod(s * A, b, 2.44), 0.12)
        G.tram(ciary, bod(s * A, -3.66, 2.44), bod(s * A, 3.66, 2.44), 0.12)
    # tribúny: lúče zo stredu medzi vnútorným zaobleným obdĺžnikom a vonkajším obrysom
    vnutro = zaobleny_obdlznik(c, u, A + 8, B + 7, 9)
    vonku = odsad(o, -4.0)
    M = 112
    lucy = []
    for k in range(M):
        t = 2 * math.pi * k / M
        d = (math.cos(t), math.sin(t))
        ri, ro = luc_polygon(c, d, vnutro), luc_polygon(c, d, vonku)
        ro = max(ro, ri + 8)
        lucy.append((d, ri, ro))
    R = 12
    def bod_t(k, t):
        d, ri, ro = lucy[k % M]
        r = ri + (ro - ri) * t
        z = 1.6 + 21.0 * t ** 1.05
        return (c[0] + d[0] * r, c[1] + d[1] * r, z)
    for r in range(R):
        t0, t1 = r / R, (r + 1) / R
        for k in range(M):
            p00, p01 = bod_t(k, t0), bod_t(k + 1, t0)
            p10, p11 = bod_t(k, t1), bod_t(k + 1, t1)
            # stupeň: vodorovná sedacia časť a zvislý schod (vytvára rady)
            mid0 = (p10[0], p10[1], p00[2])
            mid1 = (p11[0], p11[1], p01[2])
            G.plocha(sedadla[(r + (k // 7)) % 2], [p00, p01, mid1, mid0])
            G.plocha(beton, [mid0, mid1, p11, p10])
    # predná stena tribúny (pri ihrisku)
    for k in range(M):
        a, b = bod_t(k, 0), bod_t(k + 1, 0)
        G.plocha(beton, [(a[0], a[1], 0.0), (b[0], b[1], 0.0), (b[0], b[1], a[2]), (a[0], a[1], a[2])])
    # zadná hrana tribún → fasáda z obrysu
    for k in range(M):
        a, b = bod_t(k, 1), bod_t(k + 1, 1)
        d, ri, ro = lucy[k]
        d2 = lucy[(k + 1) % M][0]
        rf = luc_polygon(c, d, o)
        rf2 = luc_polygon(c, d2, o)
        fa = (c[0] + d[0] * rf, c[1] + d[1] * rf)
        fb = (c[0] + d2[0] * rf2, c[1] + d2[1] * rf2)
        G.plocha(beton, [a, b, (fb[0], fb[1], 22.6), (fa[0], fa[1], 22.6)])
    n = len(o)
    for i in range(n):
        j = (i + 1) % n
        G.stena(sklo_m, o[i], o[j], -1.0, 5.0)
        G.stena(lamely, o[i], o[j], 5.0, 27.0)
    # lamely fasády (zvislé rebrá)
    for i in range(n):
        j = (i + 1) % n
        L = math.hypot(o[j][0] - o[i][0], o[j][1] - o[i][1])
        k = max(1, int(L / 2.2))
        ux, uy = (o[j][0] - o[i][0]) / L, (o[j][1] - o[i][1]) / L
        nx, ny = uy, -ux
        for m in range(k):
            p = (o[i][0] + ux * L * (m + 0.5) / k + nx * 0.35, o[i][1] + uy * L * (m + 0.5) / k + ny * 0.35)
            G.kvader(lamely, p, (ux, uy), 0.18, 0.7, 4.5, 27.0)
    # strecha: prstenec od fasády (z 27) po vnútorný okraj nad prvými radmi (z 25)
    def bod_s(k, t, z):
        d, ri, ro = lucy[k % M]
        rf = luc_polygon(c, d, o)
        r = rf + (ri - 4 - rf) * t
        return (c[0] + d[0] * r, c[1] + d[1] * r, z)
    for k in range(M):
        G.plocha(biela, [bod_s(k, 0, 27.4), bod_s(k + 1, 0, 27.4), bod_s(k + 1, 1, 25.6), bod_s(k, 1, 25.6)])
        G.plocha(biela, [bod_s(k + 1, 0, 26.6), bod_s(k, 0, 26.6), bod_s(k, 1, 24.6), bod_s(k + 1, 1, 24.6)])
        G.plocha(biela, [bod_s(k, 1, 24.6), bod_s(k, 1, 25.6), bod_s(k + 1, 1, 25.6), bod_s(k + 1, 1, 24.6)][::-1])
        # osvetlenie pod okrajom strechy
        G.plocha(svetla, [bod_s(k + 1, 0.93, 24.5), bod_s(k, 0.93, 24.5), bod_s(k, 0.97, 24.5), bod_s(k + 1, 0.97, 24.5)])
    return G, [o], 27.5, 'stadion-tehelne-pole', {'stred': [round(stred[0], 2), round(stred[1], 2)]}
