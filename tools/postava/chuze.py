# Chôdza, klus, beh a plávanie – podľa tabuliek uhlov počas jedného kroku (biomechanika chôdze/behu).
# Uhly v stupňoch okolo osí armatúry (pozri animacie.py): X = os ľavá–pravá, -X na stehne = dopredu,
# +X na lýtku = pokrčenie kolena, +X na chodidle = špička dole, +X na chrbtici = predklon.
import math
import numpy as np

S, C = math.sin, math.cos


def krivka(f, body):
    """Periodická hladká krivka (Catmull-Rom) cez body [(fáza 0..1, hodnota)], f v 0..1."""
    f = f % 1.0
    xs = [b[0] for b in body]
    ys = [b[1] for b in body]
    n = len(body)
    i = 0
    while i < n - 1 and xs[i + 1] <= f:
        i += 1
    x0, x1 = xs[i], (xs[(i + 1) % n] + (1 if i + 1 >= n else 0))
    t = (f - x0) / max(x1 - x0, 1e-6)
    p0, p1, p2, p3 = ys[(i - 1) % n], ys[i], ys[(i + 1) % n], ys[(i + 2) % n]
    return 0.5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t + (-p0 + 3 * p1 - 3 * p2 + p3) * t ** 3)


# --- chôdza: fáza 0 = dopad ľavej päty, 0.6 = odraz ľavej špičky, 0.6–1 švih ---
CHODZA_BEDRO = [(0.0, 26), (0.15, 20), (0.35, 4), (0.5, -8), (0.6, -10), (0.75, 8), (0.9, 26)]     # + = dopredu
CHODZA_KOLENO = [(0.0, 4), (0.13, 16), (0.4, 4), (0.55, 22), (0.72, 58), (0.88, 18), (0.97, 3)]
CHODZA_CLENOK = [(0.0, 0), (0.07, -6), (0.45, 9), (0.6, -16), (0.72, 0), (0.9, 2)]              # + = špička hore
CHODZA_PRSTY = [(0.0, 0), (0.45, 0), (0.55, 22), (0.62, 10), (0.7, 0)]


def chodza(t, T, sila=1.0, opity=0.0, base=None):
    f = t / T
    p = 2 * math.pi * f
    s = sila
    out = dict(base or {})

    def pridaj(k, v):
        out[k] = tuple(np.add(out.get(k, (0, 0, 0)), v))

    for strana, posun in (('l', 0.0), ('r', 0.5)):
        g = f + posun
        bedro = krivka(g, CHODZA_BEDRO) * s
        koleno = krivka(g, CHODZA_KOLENO) * s
        clenok = krivka(g, CHODZA_CLENOK) * s
        pridaj(f'thigh_{strana}', (-bedro, 0, 0))
        pridaj(f'calf_{strana}', (koleno, 0, 0))
        pridaj(f'foot_{strana}', (-clenok, 0, 0))
        pridaj(f'ball_{strana}', (-krivka(g, CHODZA_PRSTY) * s, 0, 0))
    # panva: najnižšie pri dvojitej opore, bočný presun nad stojnú nohu, natáčanie a pokles na strane švihu
    pridaj('pelvis', (2, 3 * C(4 * math.pi * f - 0.6) * s, -5 * C(p) * s))
    pridaj('spine_01', (2, 0, 2 * C(p) * s))
    pridaj('spine_02', (1.5, -1.5 * C(4 * math.pi * f) * s, 2 * C(p) * s))
    pridaj('spine_03', (0, 0, 3 * C(p) * s))                          # hrudník proti panve
    pridaj('neck_01', (-1, 0, -2 * C(p) * s))
    pridaj('head', (-1, 0, -1.5 * C(p) * s))
    # ruky proti nohám, v lakti viac pokrčené pri švihu dopredu
    for strana, znam in (('l', 1), ('r', -1)):
        k = znam * C(p)
        pridaj(f'upperarm_{strana}', (16 * k * s, 0, 0))
        pridaj(f'lowerarm_{strana}', (-14 * max(0, -k) * s - 4, 0, 0))
        pridaj(f'clavicle_{strana}', (2 * k * s, 0, 0))
    out['@pelvis'] = (0.016 * S(p) * s, 0, -0.008 - 0.016 * C(4 * math.pi * f) * s)
    if opity:
        q = p * 0.5
        for k, v in {
            'spine_02': (6 * opity, 9 * opity * S(q + 0.3), 4 * opity * S(q * 1.7)),
            'spine_03': (0, 6 * opity * S(q * 1.3 + 1), 0),
            'head': (8 * opity, -10 * opity * S(q * 1.1 + 2), 8 * opity * S(q * 0.7)),
            'upperarm_l': (0, -14 * opity, 0), 'upperarm_r': (0, 14 * opity, 0),
            'thigh_l': (0, 0, -6 * opity), 'thigh_r': (0, 0, 6 * opity),
        }.items():
            pridaj(k, v)
        lx, ly, lz = out['@pelvis']
        out['@pelvis'] = (lx + 0.06 * opity * S(q), ly, lz - 0.02 * opity)
    return out


# --- beh: 0 = dopad ľavej nohy, 0.38 = odraz, 0.38–0.5 let, 0.5 dopad pravej ---
BEH_BEDRO = [(0.0, 24), (0.18, 6), (0.38, -16), (0.5, -10), (0.65, 20), (0.85, 42), (0.95, 32)]
BEH_KOLENO = [(0.0, 18), (0.12, 38), (0.3, 22), (0.42, 30), (0.6, 92), (0.75, 105), (0.92, 40)]
BEH_CLENOK = [(0.0, 4), (0.15, 16), (0.38, -26), (0.55, -8), (0.8, 6), (0.95, 6)]


def beh(t, T, sila=1.0, naklon=11, base=None):
    f = t / T
    p = 2 * math.pi * f
    s = sila
    out = dict(base or {})

    def pridaj(k, v):
        out[k] = tuple(np.add(out.get(k, (0, 0, 0)), v))

    for strana, posun in (('l', 0.0), ('r', 0.5)):
        g = f + posun
        pridaj(f'thigh_{strana}', (-krivka(g, BEH_BEDRO) * s, 0, 0))
        pridaj(f'calf_{strana}', (krivka(g, BEH_KOLENO) * s, 0, 0))
        pridaj(f'foot_{strana}', (-krivka(g, BEH_CLENOK) * s, 0, 0))
        pridaj(f'ball_{strana}', (-18 * max(0, S(2 * math.pi * (g - 0.3))) ** 4 * s, 0, 0))
    pridaj('pelvis', (naklon * 0.3, 4 * C(4 * math.pi * f) * s, -8 * C(p) * s))
    pridaj('spine_01', (naklon * 0.35, 0, 3 * C(p) * s))
    pridaj('spine_02', (naklon * 0.25, 0, 4 * C(p) * s))
    pridaj('spine_03', (naklon * 0.1, 0, 6 * C(p) * s))
    pridaj('neck_01', (-naklon * 0.4, 0, -3 * C(p) * s))
    pridaj('head', (-naklon * 0.3, 0, -2 * C(p) * s))
    for strana, znam in (('l', 1), ('r', -1)):
        k = znam * C(p)
        pridaj(f'upperarm_{strana}', (30 * k * s - 6, -10 * znam * s * 0, 6 * znam * max(0, -k) * s))
        pridaj(f'lowerarm_{strana}', (-58 - 16 * max(0, -k) * s, 0, 0))
        pridaj(f'hand_{strana}', (0, 0, -8 * znam))
    # najvyššie počas letu, najnižšie v strede opory
    out['@pelvis'] = (0.01 * S(p) * s, 0, -0.03 + 0.032 * C(4 * math.pi * (f - 0.44)) * s)
    return out


# --- plávanie ---
def plavanie(t, T, base=None):
    """Prsia: ležiaca postava (hlava nad vodou), ruky ťahajú do strán, nohy žabí kop."""
    f = (t / T) % 1.0
    out = dict(base or {})
    # fázy: 0–0.35 záber rukami, 0.35–0.55 ruky dopredu + kop nohami, 0.55–1 sklz
    zaber = krivka(f, [(0.0, 0), (0.18, 0.7), (0.32, 1.0), (0.45, 0.2), (0.6, 0), (0.9, 0)])
    vpred = 1 - zaber
    kop = krivka(f, [(0.0, 0.2), (0.25, 0.8), (0.38, 1.0), (0.5, 0.1), (0.7, 0), (0.9, 0.05)])
    out.update({
        'pelvis': (86, 0, 0),
        'spine_01': (2, 0, 0), 'spine_02': (-6, 0, 0), 'spine_03': (-4 - 6 * zaber, 0, 0),
        'neck_01': (-30 - 8 * zaber, 0, 0), 'head': (-28, 0, 0),
    })
    for strana, z in (('l', 1), ('r', -1)):
        out[f'clavicle_{strana}'] = (-10 * vpred, 4 * z, 0)
        # najprv pripaží (Y), potom predpaží (X): ruky vystreté dopredu pred hlavou, pri zábere do strán
        out[f'upperarm_{strana}'] = (-112 * vpred - 25 * zaber, (33 - 95 * zaber) * z, 0, 'YXZ')
        out[f'lowerarm_{strana}'] = (-15 - 75 * zaber, 0, 20 * z * zaber)
        out[f'hand_{strana}'] = (0, 0, -15 * z * zaber)
        out[f'thigh_{strana}'] = (-8 - 50 * kop, 0, -22 * z * kop)
        out[f'calf_{strana}'] = (12 + 105 * kop, 0, 0)
        out[f'foot_{strana}'] = (-30 * kop + 30 * (1 - kop), 0, 0)
    out['@pelvis'] = (0, 0, 0.03 * S(2 * math.pi * f))
    return out


def plavanie_stoj(t, T, base=None):
    """Šliapanie vody: zvislo, nohy krúžia, ruky jemne veslujú do strán."""
    f = t / T
    p = 2 * math.pi * f
    out = dict(base or {})
    out.update({
        'pelvis': (8, 0, 0), 'spine_02': (4, 0, 0), 'neck_01': (-6, 0, 0), 'head': (-4, 0, 6 * S(p * 0.5)),
    })
    for strana, z, posun in (('l', 1, 0.0), ('r', -1, math.pi)):
        out[f'thigh_{strana}'] = (-32 - 14 * S(p + posun), 0, -10 * z)
        out[f'calf_{strana}'] = (65 + 30 * S(p + posun + 1.2), 0, 0)
        out[f'foot_{strana}'] = (20, 0, 0)
        out[f'upperarm_{strana}'] = (-40, -6 * z, 0)
        out[f'lowerarm_{strana}'] = (-30, 0, 28 * z * S(2 * p))
        out[f'hand_{strana}'] = (0, 0, 30 * z * S(2 * p))
    out['@pelvis'] = (0, 0, 0.025 * S(2 * p))
    return out
