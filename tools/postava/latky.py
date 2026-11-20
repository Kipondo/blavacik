# Procedurálne látky: každá funkcia vráti fn(P, N) -> (albedo, drsnosť, výška).
import numpy as np
import textury as T
from odev_os import uhol_okolo_osi


def _pletenina(P, jemnost=2200, seed=0):
    """Jemná štruktúra pleteniny/tkaniny + väčšie záhyby."""
    h = T.sum3(P * np.array([1, 1, 2.2]), jemnost, seed) * 0.5 + T.sum3(P, jemnost * 0.5, seed + 1) * 0.5
    zahyby = T.fbm(P * np.array([1.5, 1.5, 0.6]), 14, 3, seed + 5)
    return h, zahyby


def bavlna(farba, kepr=False):
    def fn(P, N):
        h, z = _pletenina(P, 2600 if not kepr else 1800, 3)
        if kepr:
            h = 0.5 + 0.5 * np.sin((P[..., 0] + P[..., 2]) * 2 * np.pi * 900) * 0.6 + h * 0.4
        a = np.broadcast_to(T.srgb(farba), P.shape) * (0.9 + 0.1 * z)[..., None] * (0.96 + 0.06 * h)[..., None]
        return a, 0.85, h * 0.8 + z * 6
    return fn


def kosela(farba):
    def fn(P, N):
        a, r, h = bavlna(farba)(P, N)
        # légovka s gombíkmi spredu
        predok = T.smooth(-0.2, -0.6, N[..., 1])
        leg = T.smooth(0.011, 0.008, np.abs(P[..., 0])) * predok
        a = T.mix(a, a * 0.93, leg * 0.6)
        gomb = T.smooth(0.0045, 0.003, np.hypot(P[..., 0], (np.mod(P[..., 2], 0.085) - 0.04))) * predok
        a = T.mix(a, T.srgb('#d8d4cc'), gomb)
        return a, r, h + gomb * 3
    return fn


def flanel():
    def fn(P, N):
        x, z = P[..., 0], P[..., 2]
        pruhy = lambda u, perioda: (np.mod(u, perioda) / perioda)
        a1 = (pruhy(x + 0.3, 0.06) < 0.45).astype(np.float32)
        a2 = (pruhy(z, 0.06) < 0.45).astype(np.float32)
        tenke = ((np.abs(pruhy(x + 0.3, 0.06) - 0.75) < 0.04) | (np.abs(pruhy(z, 0.06) - 0.75) < 0.04)).astype(np.float32)
        cerv, cier, krem = T.srgb('#a3222b'), T.srgb('#1d1a1c'), T.srgb('#d9c9a8')
        a = T.mix(np.broadcast_to(cerv, P.shape), cier, a1 * a2 * 0.9 + (a1 + a2) * 0.15)
        a = T.mix(a, krem, tenke * 0.7)
        h, zz = _pletenina(P, 1600, 9)
        a = a * (0.9 + 0.1 * zz)[..., None] * (0.93 + 0.1 * h)[..., None]
        return a, 0.9, h + zz * 6
    return fn


def vlna(farba, ryha=False):
    def fn(P, N):
        kepr = 0.5 + 0.5 * np.sin((P[..., 0] * 0.7 + P[..., 2] + P[..., 1] * 0.7) * 2 * np.pi * 1200)
        h, z = _pletenina(P, 3000, 4)
        a = np.broadcast_to(T.srgb(farba), P.shape) * (0.9 + 0.12 * z)[..., None] * (0.95 + 0.07 * kepr)[..., None]
        v = kepr * 0.5 + h * 0.3 + z * 5
        if ryha:
            pred = T.smooth(-0.3, -0.7, N[..., 1])
            v = v + pred * 0  # puky sú hlavne v tvare nohavíc
        return a, 0.75, v
    return fn


def kravata():
    def fn(P, N):
        u = P[..., 0] + P[..., 2]
        pruh = (np.mod(u, 0.03) < 0.006).astype(np.float32)
        a = T.mix(np.broadcast_to(T.srgb('#6e1424'), P.shape), T.srgb('#b8a37a'), pruh * 0.8)
        return a, 0.45, pruh * 2
    return fn


def teplaky(ctx, nohy):
    """Tmavomodré tepláky s dvoma bielymi pruhmi po vonkajšej strane (bez značky)."""
    def fn(P, N):
        h, z = _pletenina(P, 2400, 6)
        a = np.broadcast_to(T.srgb('#22386b'), P.shape) * (0.88 + 0.16 * z)[..., None] * (0.95 + 0.08 * h)[..., None]
        pruh = np.zeros(P.shape[:2], np.float32)
        for (b0, b1) in nohy:
            s = np.sign(b0[0])
            q, oblúk = uhol_okolo_osi(P, b0, b1, np.array([s, 0, 0]))
            strana = (np.sign(P[..., 0]) == s)
            p = ((np.abs(oblúk) > 0.0035) & (np.abs(oblúk) < 0.0145)).astype(np.float32)
            pruh = np.maximum(pruh, p * strana)
        a = T.mix(a, T.srgb('#e9e9e6'), pruh * 0.95)
        # gumička v páse
        top = P[..., 2].max()
        guma = T.smooth(top - 0.04, top - 0.03, P[..., 2])
        rebra = 0.5 + 0.5 * np.sin(P[..., 0] * 2 * np.pi * 300 + P[..., 1] * 2 * np.pi * 300)
        return a, 0.8 - 0.1 * pruh, h * 0.8 + z * 7 + guma * rebra * 1.5
    return fn


def teplakovina_bunda(ctx, ruky):
    def fn(P, N):
        h, z = _pletenina(P, 2400, 8)
        a = np.broadcast_to(T.srgb('#22386b'), P.shape) * (0.88 + 0.16 * z)[..., None] * (0.95 + 0.08 * h)[..., None]
        pruh = np.zeros(P.shape[:2], np.float32)
        for strana in ('l', 'r'):
            k = ctx.kost
            s = np.sign(k[f'upperarm_{strana}']['head'][0])
            smer0 = np.array([s, 0, 0.8]) / np.hypot(1, 0.8)
            best_d = np.full(P.shape[:2], 1e9)
            best_o = np.zeros(P.shape[:2])
            for b0, b1 in ((k[f'upperarm_{strana}']['head'], k[f'lowerarm_{strana}']['head']),
                           (k[f'lowerarm_{strana}']['head'], k[f'hand_{strana}']['head'])):
                q, oblúk = uhol_okolo_osi(P, b0, b1, smer0)
                d = np.linalg.norm(P - q, axis=-1)
                lepsie = d < best_d
                best_d = np.where(lepsie, d, best_d)
                best_o = np.where(lepsie, oblúk, best_o)
            b0 = k[f'upperarm_{strana}']['head']
            ruka = (np.sign(P[..., 0]) == s) & (np.abs(P[..., 0]) > abs(b0[0]) - 0.03)
            p = ((np.abs(best_o) > 0.0035) & (np.abs(best_o) < 0.0145)).astype(np.float32)
            pruh = np.maximum(pruh, p * ruka)
        a = T.mix(a, T.srgb('#e9e9e6'), pruh * 0.95)
        # zips pozdĺž otvoru (najbližšie k stredu spredu)
        predok = T.smooth(-0.2, -0.6, N[..., 1])
        zips = T.smooth(0.0, 0.008, 0.03 + 0.07 * np.clip((ctx.krk_z + 0.05 - P[..., 2]) / 0.6, 0, 1) + 0.008 - np.abs(P[..., 0]))
        zuby = 0.5 + 0.5 * np.sign(np.sin(P[..., 2] * 2 * np.pi * 300))
        a = T.mix(a, T.srgb('#9a9ca0') * (0.7 + 0.3 * zuby)[..., None], zips * predok * 0.9)
        return a, 0.75 - 0.4 * zips * predok, h * 0.8 + z * 7 + zips * predok * zuby
    return fn


def tenisky():
    def fn(P, N):
        z = P[..., 2]
        h, zz = _pletenina(P, 1500, 12)
        a = np.broadcast_to(T.srgb('#f1f1ee'), P.shape) * (0.95 + 0.05 * zz)[..., None]
        podrazka = T.smooth(0.027, 0.022, z)
        drazky = 0.5 + 0.5 * np.sin(P[..., 1] * 2 * np.pi * 120)
        a = T.mix(a, T.srgb('#d6d6d1'), podrazka)
        a = T.mix(a, a * 0.8, podrazka * T.smooth(0.004, 0.0, z))
        # švy (prešívanie) – vodorovné línie
        sev = T.smooth(0.0008, 0.0, np.abs(np.mod(z - 0.03, 0.022) - 0.011) - 0.0095)
        a = T.mix(a, T.srgb('#c9c9c4'), sev * (1 - podrazka) * 0.8)
        # sivá päta
        pata = T.smooth(0.0, 0.02, P[..., 1] - (P[..., 1].max() - 0.06)) * (1 - podrazka)
        a = T.mix(a, T.srgb('#b9bcc0'), pata * 0.8)
        drs = 0.55 + 0.3 * podrazka
        return a, drs, h * 0.6 + podrazka * drazky * 2 + sev * 1.5
    return fn


def koza_topanky(farba='#16110e'):
    def fn(P, N):
        z = P[..., 2]
        h, zz = _pletenina(P, 900, 13)
        a = np.broadcast_to(T.srgb(farba), P.shape) * (0.9 + 0.2 * zz)[..., None]
        podrazka = T.smooth(0.018, 0.014, z)
        a = T.mix(a, T.srgb('#2a211b'), podrazka)
        drs = 0.28 + 0.2 * zz + 0.4 * podrazka
        return a, drs, h * 0.3
    return fn


def rifle(nohy):
    def fn(P, N):
        kepr = 0.5 + 0.5 * np.sin((P[..., 0] + P[..., 2] * 1.0 + P[..., 1]) * 2 * np.pi * 700)
        h, z = _pletenina(P, 2000, 14)
        a = T.mix(np.broadcast_to(T.srgb('#26406a'), P.shape), T.srgb('#5b77a3'), kepr * 0.35 + z * 0.4)
        # vyšúchané miesta na stehnách a kolenách
        predok = T.smooth(-0.3, -0.8, N[..., 1])
        a = T.mix(a, T.srgb('#7e95ba'), predok * T.fbm(P, 9, 3, 2) * 0.35)
        sev = np.zeros(P.shape[:2], np.float32)
        for (b0, b1) in nohy:
            s = np.sign(b0[0])
            q, oblúk = uhol_okolo_osi(P, b0, b1, np.array([s, 0, 0]))
            sev = np.maximum(sev, T.smooth(0.002, 0.0006, np.abs(oblúk)) * (np.sign(P[..., 0]) == s))
        a = T.mix(a, T.srgb('#c79a4a'), sev * 0.7)
        return a, 0.85, kepr * 0.6 + z * 6 + sev
    return fn


def reflexna_vesta(ctx):
    def fn(P, N):
        z = P[..., 2]
        h, zz = _pletenina(P, 1500, 15)
        a = np.broadcast_to(T.srgb('#d4ee1e'), P.shape) * (0.92 + 0.1 * zz)[..., None]
        pas = ctx.m.pas_z
        pruh = ((np.abs(z - (pas + 0.07)) < 0.025) | (np.abs(z - (pas + 0.24)) < 0.025)).astype(np.float32)
        a = T.mix(a, T.srgb('#c4c8cc'), pruh)
        return a, np.where(pruh > 0.5, 0.25, 0.8), h * 0.5 + zz * 5 + pruh
    return fn


def party():
    def fn(P, N):
        n1 = T.fbm(P, 11, 3, 31)
        n2 = T.fbm(P + 3.1, 13, 3, 32)
        a = np.broadcast_to(T.srgb('#1d8f8c'), P.shape).copy()
        a = T.mix(a, T.srgb('#f2558b'), T.smooth(0.56, 0.6, n1))
        a = T.mix(a, T.srgb('#f6d65a'), T.smooth(0.6, 0.64, n2) * (1 - T.smooth(0.56, 0.6, n1)))
        a = T.mix(a, T.srgb('#103b3a'), T.smooth(0.02, 0.0, np.abs(n1 - 0.5)) * 0.8)
        h, zz = _pletenina(P, 2600, 16)
        return a * (0.92 + 0.1 * zz)[..., None], 0.5, h * 0.5 + zz * 5
    return fn


def paperova(ctx, farba='#34402f'):
    def fn(P, N):
        z = P[..., 2]
        perioda = 0.085
        f = np.mod(z, perioda) / perioda
        prešitie = T.smooth(0.08, 0.0, np.minimum(f, 1 - f))
        vank = np.sin(f * np.pi)
        a = np.broadcast_to(T.srgb(farba), P.shape) * (0.8 + 0.25 * vank)[..., None]
        predok = T.smooth(-0.2, -0.6, N[..., 1])
        zips = T.smooth(0.006, 0.003, np.abs(P[..., 0])) * predok
        a = T.mix(a, T.srgb('#1a1a1a'), zips)
        return a, 0.45 + 0.2 * prešitie, vank * 18 + zips * 2
    return fn


def pletena_ciapka():
    def fn(P, N):
        uhol = np.arctan2(P[..., 0], P[..., 1])
        rebra = 0.5 + 0.5 * np.sin(uhol * 60)
        h, zz = _pletenina(P, 2000, 17)
        a = np.broadcast_to(T.srgb('#7a2430'), P.shape) * (0.85 + 0.2 * rebra)[..., None] * (0.95 + 0.08 * h)[..., None]
        return a, 0.92, rebra * 2 + h * 0.5
    return fn


def _napis(text, w=1024, h=256):
    from PIL import Image, ImageDraw, ImageFont
    im = Image.new('L', (w, h), 0)
    d = ImageDraw.Draw(im)
    f = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', int(h * 0.62))
    bb = d.textbbox((0, 0), text, font=f)
    d.text(((w - bb[2] - bb[0]) / 2, (h - bb[3] - bb[1]) / 2), text, fill=255, font=f)
    return np.asarray(im, np.float32) / 255


def tricko_potlac(farba, ctx, text='VÝCHOD'):
    """Tričko s nápisom na hrudi (Ďoďo je hrdý východniar)."""
    zaklad = bavlna(farba)
    napis = _napis(text)
    def fn(P, N):
        a, r, h = zaklad(P, N)
        sirka, vyska = 0.115, 0.03
        stred_z = ctx.krk_z - 0.13
        u = (P[..., 0] / sirka + 0.5)
        v = (stred_z + vyska / 2 - P[..., 2]) / vyska
        predok = (N[..., 1] < -0.25) & (P[..., 1] < 0)
        vnutri = predok & (u >= 0) & (u < 1) & (v >= 0) & (v < 1)
        H, W = napis.shape
        # pri pohľade spredu je +X vpravo od diváka → text ide v smere +X
        ui = np.clip((u * W).astype(int), 0, W - 1)
        vi = np.clip((v * H).astype(int), 0, H - 1)
        m = np.where(vnutri, napis[vi, ui], 0)
        sum_ = T.sum3(P, 900, 77)
        m = m * (0.8 + 0.2 * sum_)  # mierne opraná potlač
        a = T.mix(a, T.srgb('#b3262f'), m)
        return a, r, h + m * 0.6
    return fn
