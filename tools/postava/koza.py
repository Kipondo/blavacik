# Procedurálna koža Ďoďa: svetlá pleť, červené líca, obočie, pery, nechty, póry.
import os
import numpy as np
from PIL import Image
import textury as T
import mh


def maska(meno, S):
    im = Image.open(os.path.join(mh.MH, 'textures', meno)).convert('L').resize((S, S), Image.BILINEAR)
    return np.asarray(im, np.float32) / 255


def textura(P, N, m, S, plet='#e8b493'):
    """P, N: (S,S,3) poloha a normála texelu. m: Model (orientačné body). Vráti (albedo, drsnost, normal)."""
    oL, oR = m.klb('joint-l-eye'), m.klb('joint-r-eye')
    usta = m.klb('joint-mouth') + np.array([0, -0.09, -0.038])  # joint-mouth je vnútri úst → stred pier
    hlava = m.kosti['head']['head']
    zaklad = T.srgb(plet)
    a = np.broadcast_to(zaklad, P.shape).copy()

    # jemné škvrny a nerovnomernosť pleti
    s1 = T.fbm(P, 18, 4, 1)
    s2 = T.fbm(P, 90, 3, 7)
    a *= (0.94 + 0.1 * s1 + 0.04 * s2)[..., None]
    cervena = T.srgb('#d98a80')
    # líca, nos, uši, kĺby – prekrvenie (Ďoďo má červené líca)
    lice = np.zeros(P.shape[:2])
    for o in (oL, oR):
        st = o + np.array([np.sign(o[0]) * 0.012, -0.012, -0.035])
        lice = np.maximum(lice, T.gula(P, st, 0.032))
    nos = T.gula(P, usta + np.array([0, -0.01, 0.03]), 0.02)
    usi = np.maximum(T.gula(P, hlava + np.array([0.075, 0.0, 0.035]), 0.035),
                     T.gula(P, hlava + np.array([-0.075, 0.0, 0.035]), 0.035))
    kolena = sum(T.gula(P, m.kosti[k]['head'] + np.array([0, -0.04, 0]), 0.05) for k in ('calf_l', 'calf_r'))
    lakte = sum(T.gula(P, m.kosti[k]['head'] + np.array([0, 0.03, 0]), 0.035) for k in ('lowerarm_l', 'lowerarm_r'))
    prekrvenie = np.clip(lice * (0.55 + 0.3 * s1) + nos * 0.35 + usi * 0.3 + kolena * 0.25 + lakte * 0.2, 0, 1)
    a = T.mix(a, cervena, prekrvenie)

    # pery
    pery = maska('mpfb_lips.jpg', S)
    a = T.mix(a, T.srgb('#c27c74'), pery * 0.85)
    # nechty
    nechty = np.maximum(maska('mpfb_fingernails.jpg', S), maska('mpfb_toenails.jpg', S))
    a = T.mix(a, T.srgb('#f0d2c8'), nechty * 0.8)
    # očné viečka – jemne tmavšie, okraj ako riasy
    viecka = maska('mpfb_eyelids.jpg', S)
    a = T.mix(a, a * 0.82, viecka * 0.6)

    # obočie: oblúk nad okom, chĺpky ako pretiahnutý šum
    obocie = np.zeros(P.shape[:2])
    for o in (oL, oR):
        bok = np.sign(o[0])
        dx = (P[..., 0] - o[0]) * bok  # + do strany
        oblúk = 0.022 + 0.004 * np.cos(np.clip(dx / 0.03, -1.5, 1.5) * 1.3) - 0.003 * (dx > 0.01) * (dx - 0.01) / 0.02
        dz = P[..., 2] - o[2] - oblúk
        hrubka = 0.0055 - 0.0025 * np.clip((dx - 0.0) / 0.03, 0, 1)
        tvar = T.smooth(1, 0.55, np.abs(dz) / hrubka) * T.smooth(-0.022, -0.012, dx) * T.smooth(0.034, 0.024, dx)
        predok = T.smooth(-0.1, -0.5, N[..., 1])
        obocie = np.maximum(obocie, tvar * predok)
    chlpy = T.sum3(P * np.array([0.15, 1.0, 1.0]), 900, 11) * 0.6 + T.sum3(P, 300, 12) * 0.4
    obocie *= T.smooth(0.25, 0.75, chlpy * 0.6 + obocie * 0.6)
    a = T.mix(a, T.srgb('#2e2018'), obocie * 0.9)
    # tieň po holení (hladko oholený, len náznak)
    brada = T.smooth(usta[2] + 0.01, usta[2] - 0.015, P[..., 2]) * T.smooth(-0.05, -0.3, N[..., 1]) * \
        T.smooth(hlava[2] - 0.11, hlava[2] - 0.07, P[..., 2]) * (1 - pery)
    a = T.mix(a, a * np.array([0.9, 0.88, 0.9]), brada * 0.12)  # mladý – takmer bez tieňa po holení

    # drsnosť: čelo a nos sa lesknú, pery vlhké, obočie matné
    r = 0.52 + 0.08 * s2
    celo = T.gula(P, hlava + np.array([0, -0.09, 0.08]), 0.05)
    r = r - 0.12 * celo - 0.12 * nos - 0.18 * pery + 0.25 * obocie - 0.1 * nechty
    # póry a mikroreliéf
    h = T.sum3(P, 1400, 21) * 0.6 + T.sum3(P, 600, 22) * 0.4
    h = h * (1 - pery * 0.6) - pery * 0.3 * T.sum3(P * np.array([4, 1, 0.3]), 700, 23)
    n = T.normal_z_vysky(h, 0.5)
    return np.clip(a, 0, 1), np.clip(r, 0.05, 1)[..., None].repeat(3, -1), n
