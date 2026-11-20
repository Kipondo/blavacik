# Strecha nad ľubovoľným pôdorysom (aj s nádvoriami) podľa vzdialenosti od okraja: výška strechy
# v bode = profil(vzdialenosť od najbližšej obvodovej steny). Pre obdĺžnik vznikne valbová strecha,
# pre štvorec ihlan, pre krídla okolo nádvoria valby po oboch stranách, široké časti majú plochý vrch.
# Trojuholníky z obmedzenej Delaunayho triangulácie (mathutils) s vnútornými bodmi v mriežke.

import math

from mathutils import Vector
from mathutils.geometry import delaunay_2d_cdt

from veze import dlzka


def _vzd_k_usecke(p, a, b):
    dx, dy = b[0] - a[0], b[1] - a[1]
    l2 = dx * dx + dy * dy or 1e-12
    t = max(0.0, min(1.0, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / l2))
    return math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dy)


def _v_polygone(x, y, b):
    c, j = False, len(b) - 1
    for i in range(len(b)):
        xi, yi = b[i]
        xj, yj = b[j]
        if (yi > y) != (yj > y) and x < (xj - xi) * (y - yi) / (yj - yi) + xi:
            c = not c
        j = i
    return c


def profil_valbovy(sklon, max_h):
    return lambda d: min(sklon * d, max_h)


def profil_mansardovy(dolny=3.6, sirka_dolneho=1.5, horny_sklon=0.45, max_h=6.0):
    """Mansarda: strmá spodná časť (dolny m na sirka_dolneho m), potom miernejšia."""
    def f(d):
        if d <= sirka_dolneho:
            return dolny * d / sirka_dolneho
        return min(max_h, dolny + horny_sklon * (d - sirka_dolneho))
    return f


def strecha_podla_vzdialenosti(G, mat, obrys, diery, z0, profil, krok=1.6, presah=0.0):
    """obrys = vonkajší polygón (CCW), diery = vnútorné polygóny (nádvoria)."""
    okraje = [obrys] + list(diery)
    hrany = [(r[i], r[(i + 1) % len(r)]) for r in okraje for i in range(len(r))]
    # body: obvody (zjemnené) + mriežka vnútri
    body, tvary = [], []
    for r in okraje:
        idx = []
        for i in range(len(r)):
            a, b = r[i], r[(i + 1) % len(r)]
            n = max(1, math.ceil(dlzka(a, b) / krok))
            for k in range(n):
                idx.append(len(body))
                body.append((a[0] + (b[0] - a[0]) * k / n, a[1] + (b[1] - a[1]) * k / n))
        tvary.append(idx)
    def vzd(p):
        return min(_vzd_k_usecke(p, a, b) for a, b in hrany)

    def vnutri(x, y):
        return _v_polygone(x, y, obrys) and not any(_v_polygone(x, y, d) for d in diery)
    # rady bodov rovnobežné s okrajmi (odsadené obvody) – svahy strechy vyjdú rovné, bez zubov
    d_plochy = None
    for d_test in [k * 0.25 for k in range(1, 400)]:
        if profil(d_test) >= profil(1e6) - 1e-6:
            d_plochy = d_test
            break
    d_max = (d_plochy or 30.0) + krok
    from veze import odsad as _odsad
    for r in okraje:
        d = krok
        while d <= d_max:
            off = _odsad(r, -d)
            for i in range(len(off)):
                a, b = off[i], off[(i + 1) % len(off)]
                n = max(1, math.ceil(dlzka(a, b) / krok))
                for k in range(n):
                    p = (a[0] + (b[0] - a[0]) * k / n, a[1] + (b[1] - a[1]) * k / n)
                    if vnutri(*p) and abs(vzd(p) - d) < krok * 0.3:
                        body.append(p)
            d += krok
    # plochý vrch (široké časti) – mriežka tam, kde je strecha už vo vrchole
    xs = [p[0] for p in obrys]
    ys = [p[1] for p in obrys]
    x = min(xs) + krok / 2
    while x < max(xs):
        y = min(ys) + krok / 2
        while y < max(ys):
            if vnutri(x, y) and vzd((x, y)) > d_max:
                body.append((x, y))
            y += krok
        x += krok
    # príliš blízke body zlúčiť (Delaunay by inak robil zbytočné črepiny)
    mriezka, vyber = {}, []
    pocet_okraja = sum(len(t) for t in tvary)
    for i, p in enumerate(body):
        k = (round(p[0] / (krok * 0.4)), round(p[1] / (krok * 0.4)))
        if i < pocet_okraja or k not in mriezka:
            mriezka[k] = True
            vyber.append(p)
    body = vyber
    V = [Vector(p) for p in body]
    vys = delaunay_2d_cdt(V, [], tvary, 2, 1e-5)
    vs, fs = vys[0], vys[2]
    z = []
    for v in vs:
        z.append(z0 + profil(vzd((v.x, v.y))))
    for f in fs:
        pts = [(vs[i].x, vs[i].y, z[i]) for i in f]
        # trojuholník musí smerovať nahor
        (x0, y0, _), (x1, y1, _), (x2, y2, _) = pts[0], pts[1], pts[2]
        if (x1 - x0) * (y2 - y0) - (x2 - x0) * (y1 - y0) < 0:
            pts = pts[::-1]
        G.plocha(mat, pts)
    return len(fs)
