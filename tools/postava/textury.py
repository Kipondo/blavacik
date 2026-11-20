# Procedurálne PBR textúry pečené do UV priestoru (numpy). Vstup: 3D poloha a normála každého texelu.
import numpy as np


# ---------- rasterizácia do UV ----------
def rasterizuj(uv, tri, atributy, velkost, okraj=6):
    """uv: (K,2) súradnice rohov, tri: (M,3) indexy do uv/atribútov, atributy: zoznam polí (K,C).
    Vráti (zoznam obrázkov (S,S,C), maska (S,S))."""
    S = velkost
    out = [np.zeros((S, S, a.shape[1]), np.float32) for a in atributy]
    maska = np.zeros((S, S), bool)
    px = uv * S - 0.5
    px[:, 1] = (S - 1) - (uv[:, 1] * S - 0.5)  # obrázok má y zhora
    for t in tri:
        p = px[t]
        x0, y0 = np.floor(p.min(0)).astype(int)
        x1, y1 = np.ceil(p.max(0)).astype(int)
        x0, y0 = max(x0, 0), max(y0, 0)
        x1, y1 = min(x1, S - 1), min(y1, S - 1)
        if x1 < x0 or y1 < y0:
            continue
        xs, ys = np.meshgrid(np.arange(x0, x1 + 1), np.arange(y0, y1 + 1))
        a, b, c = p
        v0, v1 = b - a, c - a
        d = v0[0] * v1[1] - v1[0] * v0[1]
        if abs(d) < 1e-12:
            continue
        wx, wy = xs - a[0], ys - a[1]
        l1 = (wx * v1[1] - v1[0] * wy) / d
        l2 = (v0[0] * wy - wx * v0[1]) / d
        l0 = 1 - l1 - l2
        e = -0.02
        m = (l0 >= e) & (l1 >= e) & (l2 >= e)
        if not m.any():
            continue
        yy, xx = ys[m], xs[m]
        for o, at in zip(out, atributy):
            A = at[t]
            o[yy, xx] = l0[m, None] * A[0] + l1[m, None] * A[1] + l2[m, None] * A[2]
        maska[yy, xx] = True
    # dilatácia okrajov proti švom
    for _ in range(okraj):
        nove = ~maska
        if not nove.any():
            break
        for dy, dx in ((0, 1), (0, -1), (1, 0), (-1, 0)):
            sus = np.roll(np.roll(maska, dy, 0), dx, 1) & nove
            for o in out:
                o[sus] = np.roll(np.roll(o, dy, 0), dx, 1)[sus]
            maska = maska | sus
            nove = ~maska
    return out, maska


# ---------- šum ----------
def _hash(ix, iy, iz, seed):
    h = (ix * 374761393 + iy * 668265263 + iz * 2147483647 + seed * 144269504) & 0xFFFFFFFF
    h = ((h ^ (h >> 13)) * 1274126177) & 0xFFFFFFFF
    return ((h ^ (h >> 16)) & 0xFFFF) / 65535.0


def sum3(P, frekv, seed=0):
    """Hodnotový šum 0..1 v 3D (P v metroch, frekv cyklov na meter)."""
    q = P * frekv
    i = np.floor(q).astype(np.int64)
    f = q - i
    f = f * f * (3 - 2 * f)
    out = 0
    for dx in (0, 1):
        for dy in (0, 1):
            for dz in (0, 1):
                w = (f[..., 0] if dx else 1 - f[..., 0]) * (f[..., 1] if dy else 1 - f[..., 1]) * \
                    (f[..., 2] if dz else 1 - f[..., 2])
                out = out + w * _hash(i[..., 0] + dx, i[..., 1] + dy, i[..., 2] + dz, seed)
    return out


def fbm(P, frekv, oktavy=4, seed=0):
    s, a, n = 0, 1, 0
    for o in range(oktavy):
        s = s + a * sum3(P, frekv * 2 ** o, seed + o)
        n += a
        a *= 0.5
    return s / n


def normal_z_vysky(h, sila):
    """Tangentová normálová mapa z výškovej mapy (UV osi = tangenty)."""
    gx = (np.roll(h, -1, 1) - np.roll(h, 1, 1)) * 0.5 * sila
    gy = (np.roll(h, -1, 0) - np.roll(h, 1, 0)) * 0.5 * sila
    n = np.stack([-gx, gy, np.ones_like(h)], -1)
    n /= np.linalg.norm(n, axis=-1, keepdims=True)
    return n * 0.5 + 0.5


def srgb(hexa):
    hexa = hexa.lstrip('#')
    return np.array([int(hexa[i:i + 2], 16) / 255 for i in (0, 2, 4)], np.float32)


def mix(a, b, t):
    t = np.clip(t, 0, 1)[..., None]
    return a * (1 - t) + b * t


def smooth(e0, e1, x):
    t = np.clip((x - e0) / (e1 - e0), 0, 1)
    return t * t * (3 - 2 * t)


def gula(P, stred, polomer):
    """1 v strede gule, plynule 0 na okraji."""
    d = np.linalg.norm(P - np.asarray(stred), axis=-1) / polomer
    return smooth(1, 0, d)
