# Zarovnanie hrubého terénu (data/mapa/mesto/teren.bin, mriežka 20 m) pod rýchlymi cestami mimo podrobného
# laserového terénu (issue #54).
#
# Na diaľniciach a hlavných cestách na okraji mesta (kontrolór mapy, kategória „cesta-strma“) cesta pri konci mosta
# alebo nadjazdu na posledných 5–10 m klesla o 2–4 m: laser vidí pod mostom nižšiu zem (cestu, rieku) a mriežka 20 m
# to rozmaže do nájazdu. Pre každú rýchlu cestu (bez mostov a nadjazdov) sa po osi každých 5 m odčíta terén, pozdĺžne
# vyhladí (medián 45 m + Gauss ~10 m) a uzly mriežky do polovice šírky cesty + 2 m dostanú výšku z profilu, ďalej do
# 12 m za okraj sa plynulo zlievajú s pôvodným terénom. Kde si uzol nárokujú dve cesty (pod mostom, mimoúrovňové
# križovatky), vyhrá nižšia – cesta pod mostom sa nezdvihne. Dlaždice s podrobným terénom (t/*.bin, cesty_teren.py)
# sa nemenia. Zmení sa len uzol, kde je rozdiel aspoň 0,2 m – ďalšie spustenie už takmer nič nemení.
#
# Spustenie (z koreňa repozitára) vždy po `npm run teren` a teren.py:  python3 tools/mesto/laser/cesty_teren_hruby.py
# Kontrola: python3 tools/kontrola/kontrola-mapy.py --len cesta-strma
import glob
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from scipy import ndimage
from spolocne import VYSTUP, DLAZDICA

RYCHLE = {'motorway', 'motorway_link', 'trunk', 'trunk_link', 'primary', 'primary_link', 'secondary', 'secondary_link'}
KROK = 5.0            # m – vzorkovanie osi
PRIDAVOK = 2.0        # m za okrajom vozovky ešte presne podľa profilu
SVAH = 12.0           # m plynulého prechodu do pôvodného terénu
MIN_ZMENA = 0.2       # m – menšia zmena sa nezapíše


def main():
    meta = json.load(open(os.path.join(VYSTUP, 'teren.json'), encoding='utf-8'))
    W, D, K = meta['sirka'], meta['hlbka'], meta['krok']
    x0, z0 = meta['minX'], meta['minZ']
    cesta_bin = os.path.join(VYSTUP, 'teren.bin')
    H = np.fromfile(cesta_bin, dtype='<i2').reshape(D, W).astype(np.float64) / 10
    index = json.load(open(os.path.join(VYSTUP, 'index.json'), encoding='utf-8'))
    detail = {tuple(int(v) for v in k.split('_')) for k in index.get('terenDetail', {}).get('dlazdice', [])}
    # uzly mriežky v dlaždiciach s podrobným terénom (tie sa nemenia)
    gi = ((x0 + K * np.arange(W)) // DLAZDICA).astype(int)
    gj = ((z0 + K * np.arange(D)) // DLAZDICA).astype(int)
    v_detaile = np.zeros((D, W), bool)
    for (a, b) in detail:
        v_detaile[np.ix_(gj == b, gi == a)] = True

    def vyska(x, z):
        fx = np.clip((x - x0) / K, 0, W - 1.0001)
        fz = np.clip((z - z0) / K, 0, D - 1.0001)
        i, j = fx.astype(int), fz.astype(int)
        tx, tz = fx - i, fz - j
        return (H[j, i] * (1 - tx) + H[j, i + 1] * tx) * (1 - tz) + (H[j + 1, i] * (1 - tx) + H[j + 1, i + 1] * tx) * tz

    T = np.full_like(H, np.nan)      # cieľová výška (pri viacerých cestách nižšia)
    Wt = np.zeros_like(H)            # váha
    pocet = 0
    for p in sorted(glob.glob(os.path.join(VYSTUP, 'd', '*.json'))):
        d = json.load(open(p, encoding='utf-8'))
        for c in d.get('cesty', []):
            if c.get('typ') not in RYCHLE or c.get('most') or c.get('nadjazd') or len(c.get('body', [])) < 2:
                continue
            body = np.array(c['body'], float)
            seg = np.hypot(*np.diff(body, axis=0).T)
            s = np.concatenate([[0], np.cumsum(seg)])
            if s[-1] < 15:
                continue
            ss = np.linspace(0, s[-1], max(2, int(s[-1] / KROK) + 1))
            px, pz = np.interp(ss, s, body[:, 0]), np.interp(ss, s, body[:, 1])
            # len mimo dlaždíc s podrobným terénom
            dl = set(zip((px // DLAZDICA).astype(int), (pz // DLAZDICA).astype(int)))
            if dl <= detail:
                continue
            h = vyska(px, pz)
            if len(h) >= 9:
                h = ndimage.median_filter(h, size=9, mode='nearest')
            h = ndimage.gaussian_filter1d(h, 2.0, mode='nearest')
            pol = c.get('sirka', 8) / 2
            dosah = pol + PRIDAVOK + SVAH
            i0 = max(0, int((px.min() - dosah - x0) // K)); i1 = min(W - 1, int((px.max() + dosah - x0) // K) + 1)
            j0 = max(0, int((pz.min() - dosah - z0) // K)); j1 = min(D - 1, int((pz.max() + dosah - z0) // K) + 1)
            if i1 <= i0 or j1 <= j0:
                continue
            X, Z = np.meshgrid(x0 + K * np.arange(i0, i1 + 1), z0 + K * np.arange(j0, j1 + 1))
            dmin = np.full(X.shape, np.inf)
            hmin = np.zeros(X.shape)
            for k in range(len(px) - 1):
                ax, az, bx, bz = px[k], pz[k], px[k + 1], pz[k + 1]
                dx, dz = bx - ax, bz - az
                L2 = dx * dx + dz * dz or 1e-9
                t = np.clip(((X - ax) * dx + (Z - az) * dz) / L2, 0, 1)
                dd = np.hypot(X - ax - dx * t, Z - az - dz * t)
                lepsie = dd < dmin
                dmin[lepsie] = dd[lepsie]
                hmin[lepsie] = (h[k] * (1 - t) + h[k + 1] * t)[lepsie]
            w = np.clip(1 - (dmin - pol - PRIDAVOK) / SVAH, 0, 1)
            w = w * w * (3 - 2 * w)
            # uzly v dlaždiciach s podrobným terénom vynechať
            w[v_detaile[j0:j1 + 1, i0:i1 + 1]] = 0
            if not (w > 0).any():
                continue
            Tv, Wv = T[j0:j1 + 1, i0:i1 + 1], Wt[j0:j1 + 1, i0:i1 + 1]
            # silnejšia váha vyhráva; pri plnej váhe oboch vyhrá nižšia cesta (pod mostom)
            prvy = np.isnan(Tv)
            lepsia = (w > Wv + 0.05) | prvy | ((w >= Wv - 0.05) & (hmin < Tv))
            lepsia &= w > 0
            Tv[lepsia] = hmin[lepsia]
            Wv[lepsia] = np.maximum(Wv[lepsia], w[lepsia])
            pocet += 1
    maska = Wt > 0
    novy = np.where(maska, H * (1 - Wt) + np.nan_to_num(T) * Wt, H)
    zmena = np.abs(novy - H)
    zapis = maska & (zmena >= MIN_ZMENA)
    vysledok = np.where(zapis, novy, H)
    print(f'ciest {pocet}, uzlov s cestou {int(maska.sum())}, zmenených {int(zapis.sum())}, '
          f'medián zmeny {np.median(zmena[zapis]) if zapis.any() else 0:.2f} m, max {zmena[zapis].max() if zapis.any() else 0:.2f} m')
    if zapis.any():
        np.round(vysledok * 10).astype('<i2').tofile(cesta_bin)


if __name__ == '__main__':
    main()
