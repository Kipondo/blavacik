#!/usr/bin/env python3
"""Reliéf Slovenska pre obrazovku načítavania (issue #101).

Stiahne Copernicus DEM GLO-90 (verejné dlaždice 1° × 1° na AWS, © DLR/Airbus, licencia Copernicus – voľné použitie
s uvedením zdroja), poskladá ich, vypočíta tieňovanie terénu a vyreže tvar Slovenska (obrys Natural Earth,
public domain – v tools/ui/slovensko-obrys.json v súradniciach obrazovky 1600 × 900).

Projekcia je rovnaká ako v SVG obrazovky načítavania (js/ui/nacitavanie/): x = 217,5·(lon − 17,1077) + 228,4,
y = −329,0·(lat − 48,1486) + 645,0 (1° zemepisnej dĺžky je o cos 48,6° kratší ako 1° šírky).

Výstup: assets/ui/nacitavanie/slovensko.webp – priehľadný obrázok (len kraj so Slovenskom, tieňom a žiarou),
jeho poloha v súradniciach 1600 × 900 je v assets/ui/nacitavanie/slovensko.json.

Spustenie (z koreňa repozitára): python3 tools/ui/relief_slovenska.py
Potrebuje: numpy, Pillow, tifffile + imagecodecs (pip install --break-system-packages tifffile imagecodecs).
"""
import io, json, os, sys, urllib.request
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
import tifffile

KOREN = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
CACHE = os.path.expanduser('~/.cache/blavacik/dem90')
VYSTUP = os.path.join(KOREN, 'assets', 'ui', 'nacitavanie')
OBRYS = os.path.join(KOREN, 'tools', 'ui', 'slovensko-obrys.json')
URL = 'https://copernicus-dem-90m.s3.amazonaws.com/{m}/{m}.tif'

# projekcia obrazovky (súradnice 1600 × 900)
AX, BX, LON0 = 217.5, 228.4, 17.1077
AY, BY, LAT0 = -329.0, 645.0, 48.1486
MIERKA = 2            # obrázok má 2× viac pixelov ako súradnice SVG (ostrý aj na veľkej obrazovke)
OKRAJ = 46            # rezerva okolo obrysu pre tieň a žiaru (v súradniciach SVG)


def dlazdica(lat, lon):
    meno = f'Copernicus_DSM_COG_30_N{lat:02d}_00_E{lon:03d}_00_DEM'
    cesta = os.path.join(CACHE, meno + '.tif')
    if not os.path.exists(cesta):
        os.makedirs(CACHE, exist_ok=True)
        try:
            with urllib.request.urlopen(URL.format(m=meno), timeout=120) as r:
                data = r.read()
        except Exception as e:
            print('  bez dlaždice', meno, e)
            return None
        with open(cesta, 'wb') as f:
            f.write(data)
        print('  stiahnutá', meno, len(data) // 1024, 'kB')
    return tifffile.imread(cesta).astype(np.float32)


def mozaika(lat0, lat1, lon0, lon1):
    """Výšky v mriežke 3″ (1200 px na stupeň), riadok 0 = sever."""
    n = 1200
    vys = np.zeros(((lat1 - lat0) * n, (lon1 - lon0) * n), np.float32)
    for lat in range(lat0, lat1):
        for lon in range(lon0, lon1):
            d = dlazdica(lat, lon)
            if d is None:
                continue
            h, w = d.shape
            if w != n:   # vyššie zemepisné šírky majú v GLO-90 užšie dlaždice – roztiahneme
                d = np.array(Image.fromarray(d).resize((n, h), Image.BILINEAR))
            r = (lat1 - 1 - lat) * n
            c = (lon - lon0) * n
            vys[r:r + n, c:c + n] = d[:n, :n]
    return vys


def main():
    obrys = json.load(open(OBRYS))
    xs = [p[0] for p in obrys]; ys = [p[1] for p in obrys]
    x0, x1 = min(xs) - OKRAJ, max(xs) + OKRAJ
    y0, y1 = min(ys) - OKRAJ, max(ys) + OKRAJ + 20
    W, H = int((x1 - x0) * MIERKA), int((y1 - y0) * MIERKA)
    print('výrez', round(x0), round(y0), round(x1), round(y1), '→', W, '×', H, 'px')

    lat0, lat1, lon0, lon1 = 47, 50, 16, 23
    print('DEM GLO-90…')
    vys = mozaika(lat0, lat1, lon0, lon1)

    # pre každý pixel výstupu: zemepisné súradnice → výška (bilineárne)
    gx = x0 + (np.arange(W) + 0.5) / MIERKA
    gy = y0 + (np.arange(H) + 0.5) / MIERKA
    lon = (gx - BX) / AX + LON0
    lat = (gy - BY) / AY + LAT0
    ci = (lon - lon0) * 1200 - 0.5
    ri = (lat1 - lat) * 1200 - 0.5
    C, R = np.meshgrid(ci, ri)
    C = np.clip(C, 0, vys.shape[1] - 2); R = np.clip(R, 0, vys.shape[0] - 2)
    c0 = np.floor(C).astype(int); r0 = np.floor(R).astype(int)
    fc = C - c0; fr = R - r0
    z = (vys[r0, c0] * (1 - fc) * (1 - fr) + vys[r0, c0 + 1] * fc * (1 - fr)
         + vys[r0 + 1, c0] * (1 - fc) * fr + vys[r0 + 1, c0 + 1] * fc * fr)

    # tieňovanie: svetlo zo severozápadu, prevýšenie 2,2×
    m_px = 111132 / (-AY * MIERKA)          # metrov na pixel (sever – juh)
    dzdy, dzdx = np.gradient(z * 2.2, m_px)
    az, alt = np.radians(315), np.radians(38)
    sklon = np.arctan(np.hypot(dzdx, dzdy))
    smer = np.arctan2(-dzdx, dzdy)
    tien = np.sin(alt) * np.cos(sklon) + np.cos(alt) * np.sin(sklon) * np.cos(az - smer)
    tien = np.clip(tien, 0, 1)
    # výška: nížiny tmavomodré, hory svetlejšie a modrošedé
    v = np.clip((z - 100) / 1900, 0, 1) ** 0.7
    zaklad = np.array([0.13, 0.20, 0.37])
    hory = np.array([0.30, 0.38, 0.58])
    farba = zaklad[None, None, :] * (1 - v[..., None]) + hory[None, None, :] * v[..., None]
    svetlo = 0.52 + 0.75 * tien[..., None]
    rgb = np.clip(farba * svetlo, 0, 1)

    # maska Slovenska
    poly = [((x - x0) * MIERKA, (y - y0) * MIERKA) for x, y in obrys]
    maska = Image.new('L', (W, H), 0)
    ImageDraw.Draw(maska).polygon(poly, fill=255)
    hrana = maska.filter(ImageFilter.GaussianBlur(1.2))

    vysledok = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    # tieň pod „doskou“
    tien_m = Image.new('L', (W, H), 0)
    tien_m.paste(maska, (0, int(16 * MIERKA)))
    tien_m = tien_m.filter(ImageFilter.GaussianBlur(14 * MIERKA)).point(lambda a: int(a * 0.62))
    vysledok.paste(Image.new('RGBA', (W, H), (5, 10, 26, 255)), (0, 0), tien_m)
    # bok dosky (hrúbka ~6 px)
    for k in range(6 * MIERKA, 0, -1):
        bok = Image.new('L', (W, H), 0); bok.paste(maska, (0, k))
        odtien = 28 + int(10 * (1 - k / (6 * MIERKA)))
        vysledok.paste(Image.new('RGBA', (W, H), (odtien - 14, odtien - 4, odtien + 30, 255)), (0, 0), bok)
    # žiara okraja
    ziara = maska.filter(ImageFilter.MaxFilter(5)).filter(ImageFilter.GaussianBlur(5 * MIERKA)).point(lambda a: int(a * 0.55))
    vysledok.alpha_composite(Image.merge('RGBA', (Image.new('L', (W, H), 120), Image.new('L', (W, H), 150),
                                                   Image.new('L', (W, H), 230), ziara)))
    # povrch s reliéfom
    povrch = Image.fromarray((rgb * 255).astype(np.uint8), 'RGB').convert('RGBA')
    povrch.putalpha(hrana)
    vysledok.alpha_composite(povrch)
    # svetlá linka okraja
    linka = maska.filter(ImageFilter.FIND_EDGES).filter(ImageFilter.MaxFilter(3)).filter(ImageFilter.GaussianBlur(0.8))
    vysledok.alpha_composite(Image.merge('RGBA', (Image.new('L', (W, H), 150), Image.new('L', (W, H), 172),
                                                   Image.new('L', (W, H), 228), linka.point(lambda a: int(a * 0.9)))))

    os.makedirs(VYSTUP, exist_ok=True)
    cesta = os.path.join(VYSTUP, 'slovensko.webp')
    vysledok.save(cesta, 'WEBP', quality=80, method=6)
    json.dump({'x': round(x0, 1), 'y': round(y0, 1), 'w': round(x1 - x0, 1), 'h': round(y1 - y0, 1),
               'zdroj': 'Copernicus DEM GLO-90 (© DLR e.V. 2010–2014 a © Airbus 2017–2018, ESA), obrys Natural Earth'},
              open(os.path.join(VYSTUP, 'slovensko.json'), 'w'), ensure_ascii=False, indent=1)
    print('uložené', cesta, os.path.getsize(cesta) // 1024, 'kB')


if __name__ == '__main__':
    sys.exit(main())
