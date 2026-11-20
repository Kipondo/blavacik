# Doplnky: zlatá retiazka a igelitka s rezňami.
import numpy as np
import bpy
import blender_util as BU
import textury as T
from odev import napec


def torus(stred, tangenta, normala, R, r, nu=10, nv=5):
    b = np.cross(tangenta, normala)
    V, F = [], []
    for i in range(nu):
        a = 2 * np.pi * i / nu
        c = stred + R * (np.cos(a) * normala + np.sin(a) * tangenta)
        rad = np.cos(a) * normala + np.sin(a) * tangenta
        for j in range(nv):
            bb = 2 * np.pi * j / nv
            V.append(c + r * (np.cos(bb) * rad + np.sin(bb) * b))
    for i in range(nu):
        for j in range(nv):
            a, b_ = i * nv + j, ((i + 1) % nu) * nv + j
            F.append([a, b_, ((i + 1) % nu) * nv + (j + 1) % nv, i * nv + (j + 1) % nv])
    return np.array(V), F


def retiazka(ctx):
    m = ctx.m
    k = ctx.kost
    os_xy = np.array([0, k['neck_01']['head'][1]])
    z0 = ctx.krk_z - 0.004
    telo = m.P[ctx.prenos.TV]
    body = []
    for th in np.linspace(0, 2 * np.pi, 120, endpoint=False):
        d = np.array([np.sin(th), -np.cos(th)])
        z = z0 - 0.085 * max(0, np.cos(th)) ** 1.6
        okolo = telo[np.abs(telo[:, 2] - z) < 0.012]
        rel = okolo[:, :2] - os_xy
        uh = np.arctan2(rel[:, 0], -rel[:, 1])
        bl = okolo[np.abs(np.angle(np.exp(1j * (uh - th)))) < 0.2]
        r = ((bl[:, :2] - os_xy) @ d).max() if len(bl) else 0.06
        body.append([os_xy[0] + d[0] * (r + 0.009), os_xy[1] + d[1] * (r + 0.009), z])
    body = np.array(body)
    # rovnomerné rozmiestnenie článkov
    seg = np.linalg.norm(np.roll(body, -1, 0) - body, axis=1)
    s = np.concatenate([[0], np.cumsum(seg)])
    celkom = s[-1]
    n = int(celkom / 0.009)
    V, F = [], []
    for i in range(n):
        u = i / n * celkom
        j = np.searchsorted(s, u, 'right') - 1
        t = (u - s[j]) / seg[j]
        p = body[j] * (1 - t) + body[(j + 1) % len(body)] * t
        tan = body[(j + 1) % len(body)] - body[j]
        tan /= np.linalg.norm(tan)
        von = np.array([p[0] - os_xy[0], p[1] - os_xy[1], 0])
        von /= np.linalg.norm(von)
        nor = np.cross(tan, von) if i % 2 else von
        nor = nor - (nor @ tan) * tan
        nor /= np.linalg.norm(nor)
        v, f = torus(p, tan, nor, 0.0048, 0.0015)
        o = len(V)
        V += list(v)
        F += [[x + o for x in ff] for ff in f]
    V = np.array(V)
    mat = BU.material('odev_retiazka', farba_rgb=(0.93, 0.72, 0.32), kov=1.0, drsnost_hodnota=0.22)
    ob = BU.mesh_objekt('odev_retiazka', V, F, np.zeros((sum(len(f) for f in F), 2)), [mat])
    ctx.prenos.aplikuj(ob, ctx.arm, V)
    ctx.log('odev_retiazka', len(V), 'vrcholov', n, 'článkov')


def igelitka(ctx):
    k = ctx.kost
    lakt, zap = k['lowerarm_r']['head'], k['hand_r']['head']
    dole = zap - lakt
    dole /= np.linalg.norm(dole)
    vpred = np.array([0, -1.0, 0]) - (np.array([0, -1.0, 0]) @ dole) * dole
    vpred /= np.linalg.norm(vpred)
    bok = np.cross(dole, vpred)
    uchop = zap + dole * 0.075
    rng = np.random.default_rng(3)
    nu, nw = 28, 18
    V = []
    for j in range(nw + 1):
        w = j / nw                            # 0 hore, 1 dole
        sirka = 0.055 + 0.105 * T.smooth(0.0, 0.35, w)  # hore zhrnuté k ušiam
        hlbka = 0.03 + 0.055 * np.sin(np.clip(w, 0, 1) * np.pi * 0.9) ** 0.7
        for i in range(nu):
            a = 2 * np.pi * i / nu
            cx, cy = np.cos(a), np.sin(a)
            # zaoblený obdĺžnik
            ex = np.sign(cx) * np.abs(cx) ** 0.6 * sirka
            ey = np.sign(cy) * np.abs(cy) ** 0.6 * hlbka
            p = uchop + dole * (0.04 + 0.34 * w) + bok * ex + vpred * ey
            V.append(p)
    V = np.array(V)
    F = [[j * nu + i, j * nu + (i + 1) % nu, (j + 1) * nu + (i + 1) % nu, (j + 1) * nu + i]
         for j in range(nw) for i in range(nu)]
    # dno
    c = len(V)
    V = np.vstack([V, uchop + dole * 0.385])
    F += [[nw * nu + (i + 1) % nu, nw * nu + i, c] for i in range(nu)]
    # pokrčenie igelitu
    stred = uchop + dole * 0.2
    rad = V - stred
    rad -= (rad @ dole)[:, None] * dole
    rad /= np.maximum(np.linalg.norm(rad, axis=1, keepdims=True), 1e-6)
    V += rad * (T.fbm(V, 25, 3, 5)[:, None] - 0.5) * 0.007
    # uši igelitky
    for s in (-1, 1):
        for i in range(12):
            a = np.pi * i / 11
            p = uchop + bok * (s * 0.04 + 0.03 * np.cos(a) * s * 0) + dole * (0.04 - 0.07 * np.sin(a)) + \
                bok * s * 0.035 * np.cos(a) * 0
            V = np.vstack([V, p + vpred * 0.004 * s, p - vpred * 0.004 * s])
        base = len(V) - 24
        F += [[base + 2 * i, base + 2 * i + 2, base + 2 * i + 3, base + 2 * i + 1] for i in range(11)]
    ob = BU.mesh_objekt('odev_igelitka', V, F)
    BU.smart_uv(ob)

    def fn(P, N):
        h = T.fbm(P, 60, 4, 8)
        a = np.broadcast_to(T.srgb('#f4f4f1'), P.shape) * (0.93 + 0.08 * h)[..., None]
        w = ((P - uchop) @ dole)
        pruh = T.smooth(0.004, 0.0, np.abs(w - 0.11) - 0.012)
        a = T.mix(a, T.srgb('#c8323a'), pruh)
        return a, 0.38, h * 5
    mat = napec(ob, fn, 512, 'odev_igelitka', 256)
    mat.use_backface_culling = False
    ob.data.materials.append(mat)
    Pf, *_ = BU.data_meshu(ob)
    ctx.prenos.aplikuj(ob, ctx.arm, Pf, pevna_kost='hand_r')
    ctx.log('odev_igelitka', len(Pf))
