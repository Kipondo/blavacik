# Spoločné pre 2. dávku pamiatok: dáta z OSM (data/pamiatky-2.json), prevod súradníc,
# zrúcané múry s nerovným vrchom, nerovné hranoly, kolízie.
# Súradnice: hra (x východ, z juh) → Blender (x, y = −z) vzhľadom na stred modelu.

import json
import math
import os
import random

from veze import dlzka

_DATA = None


def data():
    global _DATA
    if _DATA is None:
        with open(os.path.join(os.path.dirname(os.path.dirname(__file__)), 'data', 'pamiatky-2.json')) as f:
            _DATA = json.load(f)
    return _DATA


def v_bl(p, stred):
    return (p[0] - stred[0], -(p[1] - stred[1]))


def stred_bodov(body):
    return (sum(p[0] for p in body) / len(body), sum(p[1] for p in body) / len(body))


def bez_konca(body):
    """Uzavretý obrys z OSM má posledný bod = prvý – odstráni ho."""
    return body[:-1] if len(body) > 2 and tuple(body[0]) == tuple(body[-1]) else body


def plocha(b):
    return sum(b[i][0] * b[(i + 1) % len(b)][1] - b[(i + 1) % len(b)][0] * b[i][1] for i in range(len(b))) / 2


def ccw(b):
    return b if plocha(b) > 0 else list(reversed(b))


def delenie(body, krok, uzavreta=False):
    pts = list(body) + ([body[0]] if uzavreta else [])
    out = [pts[0]]
    for a, b in zip(pts[:-1], pts[1:]):
        n = max(1, math.ceil(dlzka(a, b) / krok))
        for k in range(1, n + 1):
            out.append((a[0] + (b[0] - a[0]) * k / n, a[1] + (b[1] - a[1]) * k / n))
    return out[:-1] if uzavreta else out


def sum1(x, seed):
    """Hladký 1D šum v rozsahu −1..1 (súčet sínusov)."""
    return (math.sin(x * 0.37 + seed) * 0.5 + math.sin(x * 0.91 + seed * 1.7) * 0.3 + math.sin(x * 2.3 + seed * 2.9) * 0.2)


def zrucany_mur(G, mats, body, vyska, hrubka, *, seed=0, krok=1.6, dole=-2.5, rozpad=0.35, kryt=None, uzavreta=False):
    """Múr pozdĺž čiary s nerovným (rozpadnutým) vrcholom: výška kolíše o ±rozpad, materiály sa striedajú
    po úsekoch (kamene rôznej farby). Ak je kryt, navrch sa dá krycia doska (zachovalé hradby)."""
    body = delenie(body, krok, uzavreta)
    n = len(body)
    if n < 2:
        return
    L, R, H = [], [], []
    for i in range(n):
        if uzavreta:
            a, b = body[(i - 1) % n], body[(i + 1) % n]
        else:
            a, b = body[max(0, i - 1)], body[min(n - 1, i + 1)]
        d = dlzka(a, b) or 1e-9
        nx, ny = (b[1] - a[1]) / d, -(b[0] - a[0]) / d
        L.append((body[i][0] - nx * hrubka / 2, body[i][1] - ny * hrubka / 2))
        R.append((body[i][0] + nx * hrubka / 2, body[i][1] + ny * hrubka / 2))
        H.append(vyska * (1 - rozpad * (0.5 + 0.5 * sum1(i * krok, seed))) if rozpad else vyska)
    rnd = random.Random(seed)
    useky = range(n) if uzavreta else range(n - 1)
    for i in useky:
        j = (i + 1) % n
        m = mats[rnd.randrange(len(mats))]
        G.plocha(m, [(R[i][0], R[i][1], dole), (R[j][0], R[j][1], dole), (R[j][0], R[j][1], H[j]), (R[i][0], R[i][1], H[i])])
        G.plocha(m, [(L[j][0], L[j][1], dole), (L[i][0], L[i][1], dole), (L[i][0], L[i][1], H[i]), (L[j][0], L[j][1], H[j])])
        G.plocha(kryt or m, [(L[i][0], L[i][1], H[i]), (R[i][0], R[i][1], H[i]), (R[j][0], R[j][1], H[j]), (L[j][0], L[j][1], H[j])])
    if not uzavreta:
        G.plocha(mats[0], [(L[0][0], L[0][1], dole), (R[0][0], R[0][1], dole), (R[0][0], R[0][1], H[0]), (L[0][0], L[0][1], H[0])])
        G.plocha(mats[0], [(R[-1][0], R[-1][1], dole), (L[-1][0], L[-1][1], dole), (L[-1][0], L[-1][1], H[-1]), (R[-1][0], R[-1][1], H[-1])])
    return body, L, R, H


def cimburie(G, mat, body, z, hrubka, *, zub=1.0, medzera=0.8, vyska=1.1, uzavreta=False):
    """Zuby cimburia (merlóny) navrchu múru pozdĺž čiary."""
    pts = list(body) + ([body[0]] if uzavreta else [])
    for a, b in zip(pts[:-1], pts[1:]):
        L = dlzka(a, b)
        if L < 0.5:
            continue
        ux, uy = (b[0] - a[0]) / L, (b[1] - a[1]) / L
        t = medzera / 2
        while t + zub <= L:
            c = (a[0] + ux * (t + zub / 2), a[1] + uy * (t + zub / 2))
            G.kvader(mat, c, (ux, uy), zub, hrubka, z, z + vyska)
            t += zub + medzera


def kolizie_muru(body_bl, hrubka):
    """Obdĺžniky kolízií pre úseky múru (v lokálnych metroch hry: x, z = −y Blendera)."""
    out = []
    h = hrubka / 2 + 0.1
    for a, b in zip(body_bl[:-1], body_bl[1:]):
        d = dlzka(a, b) or 1e-9
        nx, ny = (b[1] - a[1]) / d, -(b[0] - a[0]) / d
        q = [(a[0] - nx * h, a[1] - ny * h), (b[0] - nx * h, b[1] - ny * h), (b[0] + nx * h, b[1] + ny * h), (a[0] + nx * h, a[1] + ny * h)]
        out.append([[round(x, 2), round(-y, 2)] for x, y in q])
    return out


def kolizia_obrysu(obrys_bl):
    return [[round(x, 2), round(-y, 2)] for x, y in obrys_bl]


def hranol_nerovny(G, mats, obrys, z0, vysky, mat_vrch=None, seed=0):
    """Hranol s rôznou výškou v každom vrchole (vrch je vejár trojuholníkov zo stredu)."""
    n = len(obrys)
    rnd = random.Random(seed)
    for i in range(n):
        j = (i + 1) % n
        m = mats[rnd.randrange(len(mats))]
        G.plocha(m, [(obrys[i][0], obrys[i][1], z0), (obrys[j][0], obrys[j][1], z0), (obrys[j][0], obrys[j][1], vysky[j]), (obrys[i][0], obrys[i][1], vysky[i])])
    cx, cy = stred_bodov(obrys)
    cz = sum(vysky) / n
    for i in range(n):
        j = (i + 1) % n
        G.plocha(mat_vrch or mats[0], [(cx, cy, cz), (obrys[i][0], obrys[i][1], vysky[i]), (obrys[j][0], obrys[j][1], vysky[j])])
