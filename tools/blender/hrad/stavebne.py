# Stavebné prvky historických budov pre generátory hradu a pamiatok Starého Mesta:
# sedlová/valbová strecha nad ľubovoľným štvoruholníkom (orezaním polygónu podľa hrebeňa),
# ihlanová strecha veže, baroková fasáda (okná s šambránami, parapetné rímsy, kordónové rímsy,
# hlavná rímsa, sokel) a vikiere. Súradnice ako v tools/blender/veze.py (CCW obrysy v rovine XY).

import math
import random

from veze import odsad, normala, dlzka, plocha_obrysu, smer_v_bode


def hlavna_os(obrys):
    """Jednotkový smer dlhšej osi obrysu (podľa najdlhšej hrany a k nej rovnobežných)."""
    n = len(obrys)
    best, smer = 0.0, (1.0, 0.0)
    for i in range(n):
        a, b = obrys[i], obrys[(i + 1) % n]
        L = dlzka(a, b)
        if L > best:
            best, smer = L, ((b[0] - a[0]) / L, (b[1] - a[1]) / L)
    return smer


def _orez(poly, f):
    """Sutherland–Hodgman: časť polygónu, kde f(p) >= 0 (f je lineárna)."""
    out = []
    n = len(poly)
    for i in range(n):
        a, b = poly[i], poly[(i + 1) % n]
        fa, fb = f(a), f(b)
        if fa >= 0:
            out.append(a)
        if (fa >= 0) != (fb >= 0):
            t = fa / (fa - fb)
            out.append((a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t))
    return out


def strecha_sedlova(G, obrys, z0, vyska, mat_strecha, mat_stit, os=None, presah=0.5, valbova=False):
    """Sedlová strecha nad obrysom: hrebeň v strede pozdĺž dlhšej osi, štíty na koncoch
    (valbova=True: namiesto štítov valby). Vracia (smer osi, polovičná šírka, stred)."""
    u = os or hlavna_os(obrys)
    v = (-u[1], u[0])
    O = odsad(obrys, presah) if presah else obrys
    pv = [p[0] * v[0] + p[1] * v[1] for p in obrys]
    pu = [p[0] * u[0] + p[1] * u[1] for p in obrys]
    v0, v1 = min(pv), max(pv)
    u0, u1 = min(pu), max(pu)
    vc, pol = (v0 + v1) / 2, (v1 - v0) / 2 + presah
    def z(p):
        dv = abs(p[0] * v[0] + p[1] * v[1] - vc)
        h = vyska * max(0.0, 1 - dv / pol)
        if valbova:
            du = min(p[0] * u[0] + p[1] * u[1] - (u0 - presah), (u1 + presah) - (p[0] * u[0] + p[1] * u[1]))
            h = min(h, vyska * max(0.0, du / pol))
        return z0 + h
    for s in (1, -1):
        cast = _orez(O, lambda p: s * (p[0] * v[0] + p[1] * v[1] - vc))
        if len(cast) < 3:
            continue
        if valbova:
            # valby: rozdeľ ešte podľa koncov (štyri roviny) – stačí jemnejšie rozdelenie trojuholníkmi
            c = (sum(p[0] for p in cast) / len(cast), sum(p[1] for p in cast) / len(cast))
            for i in range(len(cast)):
                a, b = cast[i], cast[(i + 1) % len(cast)]
                G.plocha(mat_strecha, [(a[0], a[1], z(a)), (b[0], b[1], z(b)), (c[0], c[1], z(c))])
        else:
            G.plocha(mat_strecha, [(p[0], p[1], z(p)) for p in cast])
        G.plocha(mat_strecha, [(p[0], p[1], z(p) - 0.25) for p in reversed(cast)])
    if not valbova:
        # štíty: zvislé steny od odkvapu po strechu nad hranami obrysu
        n = len(obrys)
        for i in range(n):
            a, b = obrys[i], obrys[(i + 1) % n]
            body = [a]
            fa = a[0] * v[0] + a[1] * v[1] - vc
            fb = b[0] * v[0] + b[1] * v[1] - vc
            if (fa > 0) != (fb > 0):
                t = fa / (fa - fb)
                body.append((a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t))
            body.append(b)
            hr = [z(p) - z0 for p in body]
            if max(hr) < 0.3:
                continue
            for p, q in zip(body[:-1], body[1:]):
                G.plocha(mat_stit, [(p[0], p[1], z0), (q[0], q[1], z0), (q[0], q[1], z(q)), (p[0], p[1], z(p))])
    return u, pol, vc


def strecha_ihlan(G, obrys, z0, vyska, mat, presah=0.4, vrch=None):
    O = odsad(obrys, presah) if presah else obrys
    c = vrch or (sum(p[0] for p in obrys) / len(obrys), sum(p[1] for p in obrys) / len(obrys))
    n = len(O)
    for i in range(n):
        a, b = O[i], O[(i + 1) % n]
        G.plocha(mat, [(a[0], a[1], z0), (b[0], b[1], z0), (c[0], c[1], z0 + vyska)])
    G.plocha(mat, [(p[0], p[1], z0) for p in reversed(O)])


def barokova_fasada(G, obrys, kz, *, stena, sambrana, sklo_m, rimsa, sokel=None, os_okien=3.6, okno=(1.35, 2.3),
                    min_dlzka=5.0, prizemie_okno=None, hlavna_rimsa=0.55, seed=1, preskoc=None, stena_preskocenej=True):
    """Omietnutá fasáda s pravidelnými oknami: šambrány (rámy), parapety, nadokenné rímsy,
    kordónové rímsy medzi podlažiami, hlavná rímsa pod strechou, kamenný sokel.
    kz = výšky podlaží [z0, z1, …]; okná len na hranách dlhších ako min_dlzka."""
    rnd = random.Random(seed)
    n = len(obrys)
    z_dole, z_hore = kz[0], kz[-1]
    VNOR = 0.25
    # steny
    for i in range(n):
        a, b = obrys[i], obrys[(i + 1) % n]
        L = dlzka(a, b)
        if L < 0.05:
            continue
        ux, uy = (b[0] - a[0]) / L, (b[1] - a[1]) / L
        nx, ny = uy, -ux
        if preskoc and preskoc(i):
            if stena_preskocenej:           # inak si hranu kreslí volajúci sám (napr. lodžie na čele krídla)
                G.stena(stena, a, b, z_dole, z_hore)
            continue
        if L < min_dlzka:
            G.stena(stena, a, b, z_dole, z_hore)
            continue
        pocet = max(1, round(L / os_okien))
        krok = L / pocet
        for k in range(len(kz) - 1):
            z0, z1 = kz[k], kz[k + 1]
            w, h = (prizemie_okno or okno) if k == 0 else okno
            h = min(h, (z1 - z0) - 1.0)
            zo = z0 + max(0.8, (z1 - z0 - h) * 0.45)
            # pás pod oknami a nad oknami cez celú hranu
            G.stena(stena, a, b, z0, zo)
            G.stena(stena, a, b, zo + h, z1)
            for j in range(pocet):
                s0 = j * krok + (krok - w) / 2
                A = (a[0] + ux * s0, a[1] + uy * s0)
                B = (A[0] + ux * w, A[1] + uy * w)
                P0 = (a[0] + ux * j * krok, a[1] + uy * j * krok)
                P1 = (a[0] + ux * (j + 1) * krok, a[1] + uy * (j + 1) * krok)
                G.stena(stena, P0, A, zo, zo + h)
                G.stena(stena, B, P1, zo, zo + h)
                Ai = (A[0] - nx * VNOR, A[1] - ny * VNOR)
                Bi = (B[0] - nx * VNOR, B[1] - ny * VNOR)
                # ostenie, nadpražie, parapet okna
                G.stena(stena, Ai, A, zo, zo + h)
                G.stena(stena, B, Bi, zo, zo + h)
                G.plocha(stena, [(A[0], A[1], zo + h), (B[0], B[1], zo + h), (Bi[0], Bi[1], zo + h), (Ai[0], Ai[1], zo + h)])
                G.plocha(stena, [(Ai[0], Ai[1], zo), (Bi[0], Bi[1], zo), (B[0], B[1], zo), (A[0], A[1], zo)])
                G.panel(sklo_m, Ai, Bi, zo, zo + h, rnd, 0.003)
                # šambrána (rám okolo okna), parapetná doska a nadokenná rímsa
                r = 0.16
                Ar = (A[0] - ux * r, A[1] - uy * r)
                Br = (B[0] + ux * r, B[1] + uy * r)
                for (p, q) in ((Ar, A), (B, Br)):
                    G.kvader(sambrana, ((p[0] + q[0]) / 2 + nx * 0.05, (p[1] + q[1]) / 2 + ny * 0.05), (ux, uy), r, 0.1, zo - r, zo + h + r)
                G.kvader(sambrana, ((A[0] + B[0]) / 2 + nx * 0.05, (A[1] + B[1]) / 2 + ny * 0.05), (ux, uy), w, 0.1, zo + h, zo + h + r)
                G.kvader(rimsa, ((A[0] + B[0]) / 2 + nx * 0.12, (A[1] + B[1]) / 2 + ny * 0.12), (ux, uy), w + 2 * r + 0.3, 0.24, zo - 0.12, zo, spodok=True)
                if k > 0:
                    G.kvader(rimsa, ((A[0] + B[0]) / 2 + nx * 0.14, (A[1] + B[1]) / 2 + ny * 0.14), (ux, uy), w + 2 * r + 0.4, 0.28, zo + h + r, zo + h + r + 0.16, spodok=True)
    # kordónové rímsy, hlavná rímsa, sokel
    for z in kz[1:-1]:
        G.pas(rimsa, obrys, z - 0.12, z + 0.08, von=0.12, spodok=True)
    G.pas(rimsa, obrys, z_hore - hlavna_rimsa, z_hore - hlavna_rimsa * 0.5, von=0.25, spodok=True)
    G.pas(rimsa, obrys, z_hore - hlavna_rimsa * 0.5, z_hore, von=0.55, spodok=True)
    if sokel:
        G.pas(sokel, obrys, z_dole, kz[0] + 1.1 if kz[0] > -0.5 else 1.1, von=0.12, vrch=True)


def vikiere(G, u, pol, vc, obrys, z0, vyska_strechy, mat_steny, mat_strechy, sklo_m, rozostup=4.5, sirka=1.2):
    """Vikiere na oboch stranách sedlovej strechy (u = os hrebeňa, pol = polovičná šírka)."""
    v = (-u[1], u[0])
    pu = [p[0] * u[0] + p[1] * u[1] for p in obrys]
    u0, u1 = min(pu) + 2.5, max(pu) - 2.5
    pocet = int((u1 - u0) // rozostup)
    if pocet < 1:
        return
    sklon = vyska_strechy / pol
    for s in (1, -1):
        dv = pol * 0.55
        zb = z0 + vyska_strechy * (1 - dv / pol)          # výška strechy v mieste čela vikiera
        for k in range(pocet + 1):
            uu = u0 + (u1 - u0) * k / max(1, pocet)
            stred = (u[0] * uu + v[0] * (vc + s * dv), u[1] * uu + v[1] * (vc + s * dv))
            nx, ny = v[0] * s, v[1] * s
            hl = 1.6
            c = (stred[0] - nx * hl / 2, stred[1] - ny * hl / 2)
            G.kvader(mat_steny, c, u, sirka, hl, zb - 0.2, zb + 1.3, vrch=False)
            # okno na čele
            A = (stred[0] - u[0] * sirka * 0.32 + nx * 0.01, stred[1] - u[1] * sirka * 0.32 + ny * 0.01)
            B = (stred[0] + u[0] * sirka * 0.32 + nx * 0.01, stred[1] + u[1] * sirka * 0.32 + ny * 0.01)
            if s < 0:
                A, B = B, A
            G.panel(sklo_m, A, B, zb + 0.1, zb + 1.0)
            # strieška vikiera (malá sedlová)
            obr = [(c[0] - u[0] * (sirka / 2 + 0.15) - nx * (hl / 2 + 0.2), c[1] - u[1] * (sirka / 2 + 0.15) - ny * (hl / 2 + 0.2)),
                   (c[0] + u[0] * (sirka / 2 + 0.15) - nx * (hl / 2 + 0.2), c[1] + u[1] * (sirka / 2 + 0.15) - ny * (hl / 2 + 0.2)),
                   (c[0] + u[0] * (sirka / 2 + 0.15) + nx * (hl / 2 + 0.2), c[1] + u[1] * (sirka / 2 + 0.15) + ny * (hl / 2 + 0.2)),
                   (c[0] - u[0] * (sirka / 2 + 0.15) + nx * (hl / 2 + 0.2), c[1] - u[1] * (sirka / 2 + 0.15) + ny * (hl / 2 + 0.2))]
            if plocha_obrysu(obr) < 0:
                obr = obr[::-1]
            strecha_sedlova(G, obr, zb + 1.3, 0.6, mat_strechy, mat_steny, os=(nx, ny), presah=0.0)
