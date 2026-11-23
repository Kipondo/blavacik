# Zošitie švov medzi dlaždicami podrobného terénu (data/mapa/mesto/t/<i>_<j>.bin, 2 m) – issue #54.
#
# Na spoločnej hrane dvoch susedných dlaždíc sa výška miestami líšila až o 7 m (kontrolór mapy, kategória
# „sev-terenu“, 19 miest 23. 11. 2026). Sú dva druhy chýb:
#   – úzky pás 1–4 uzlov pri hrane má inú výšku ako zvyšok dlaždice aj sused (výplň pri okraji spracovaného výrezu
#     lasera) → pás sa nahradí pokračovaním svahu z vnútra dlaždice;
#   – celá dlaždica je pri hrane posunutá o meter až päť (dlaždice z rôznych behov teren.py) → rozdiel sa rozdelí
#     napoly a posun plynulo (kosínusom) doznie do vzdialenosti úmernej rozdielu (sklon posunu najviac ~12 %,
#     najďalej 50 m od hrany).
# Mení sa len tam, kde sa hrany líšia; zošité hrany pri ďalšom spustení zostanú (skript je idempotentný).
#
# Spustenie (z koreňa repozitára) vždy po teren.py a cesty_teren.py:  python3 tools/mesto/laser/svy_terenu.py
# Kontrola: python3 tools/kontrola/kontrola-mapy.py --len sev-terenu (a regresná kontrola „teren-bez-svov“).
import glob
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from scipy import ndimage
from cesty_teren import nacitaj, uloz, KROK
from spolocne import VYSTUP

SKLON = 0.12          # najväčší sklon, ktorý pridá posun (m/m)
MAX_RIADKOV = 25      # posun doznie najďalej po 25 uzloch (50 m)
TOLERANCIA = 0.02     # m – menší rozdiel na hrane sa nerieši (zaokrúhlenie na cm)


def pas_pri_hrane(A, B, smer, S=4, prah=1.0):
    """Úzky pás (najviac S uzlov) pri hrane, ktorý nesedí s vnútrom vlastnej dlaždice, kým sused s ním áno, sa
    nahradí pokračovaním svahu z vnútra dlaždice. Vráti počet opravených uzlov hrany."""
    if smer == 'x':
        A, B = A.T, B.T
    n = A.shape[0]
    ka = (A[n - 1 - S] - A[n - 4 - S]) / 3              # sklon na uzol smerom k hrane
    kb = (B[S] - B[S + 3]) / 3
    pa, pb = A[n - 1 - S] + ka * S, B[S] + kb * S        # hrana predpovedaná z vnútra A a z vnútra B
    ea, eb = A[n - 1].copy(), B[0].copy()
    zle_a = (np.abs(ea - pa) > prah) & (np.abs(eb - pa) < np.abs(ea - pa) / 2)
    zle_b = (np.abs(eb - pb) > prah) & (np.abs(ea - pb) < np.abs(eb - pb) / 2)
    zle_a = ndimage.maximum_filter1d(zle_a.astype(np.uint8), 5).astype(bool)
    zle_b = ndimage.maximum_filter1d(zle_b.astype(np.uint8), 5).astype(bool)
    for k in range(S):
        A[n - S + k, zle_a] = (A[n - 1 - S] + ka * (k + 1))[zle_a]
        B[S - 1 - k, zle_b] = (B[S] + kb * (k + 1))[zle_b]
    return int(zle_a.sum() + zle_b.sum())


def zosi(A, B, smer, prah):
    """Zošije hranu A|B. smer 'z' = A nad B (posledný riadok A = prvý riadok B), 'x' = A vľavo od B (stĺpce).
    Vráti najväčší rozdiel na hrane pred zošitím (menší ako `prah` sa nerieši)."""
    if smer == 'x':                       # stĺpce → riadky (pohľad na tie isté polia, zápis sa prejaví v A, B)
        A, B = A.T, B.T
    d = B[0, :] - A[-1, :]
    m = float(np.abs(d).max())
    if m < prah:
        return m
    h = d / 2
    # dĺžka doznievania: kosínus h·(1 + cos(πr/K))/2 má najväčší sklon h·π/(2K·KROK) ≤ SKLON
    K = int(np.clip(math.ceil(np.abs(h).max() * math.pi / (2 * SKLON * KROK)), 3, MAX_RIADKOV))
    for r in range(K):
        f = 0.5 * (1 + math.cos(math.pi * r / K))
        A[-1 - r, :] += h * f
        B[r, :] -= h * f
    return m


def hrany(H):
    for kl in sorted(H):
        i, j = (int(v) for v in kl.split('_'))
        for smer, sused in (('x', f'{i + 1}_{j}'), ('z', f'{i}_{j + 1}')):
            if sused in H:
                yield kl, sused, smer


def main():
    subory = {os.path.basename(p)[:-4]: p for p in glob.glob(os.path.join(VYSTUP, 't', '*.bin'))}
    H = {k: nacitaj(p) for k, p in subory.items()}
    zle = [(a, b, s) for a, b, s in hrany(H)
           if float(np.abs((H[b][0, :] - H[a][-1, :]) if s == 'z' else (H[b][:, 0] - H[a][:, -1])).max()) >= TOLERANCIA]
    if not zle:
        print(f'švy: žiadna hrana sa nelíši o {TOLERANCIA} m a viac – nič sa nemení')
        return
    zmenene = set()
    # najprv úzke chybné pásy pri hranách (výplň pri okraji výrezu lasera)
    for kl, sused, smer in zle:
        if pas_pri_hrane(H[kl], H[sused], smer):
            zmenene.update((kl, sused))
    # opakované prechody: roh dlaždice patrí dvom hranám, ďalší prechod dorovná zvyšok (zbehne za pár prechodov)
    for prechod in range(12):
        najviac = 0.0
        for kl, sused, smer in hrany(H):
            m = zosi(H[kl], H[sused], smer, 0.001)
            if m >= 0.001:
                zmenene.update((kl, sused))
                if prechod == 0 and m > 0.3:
                    print(f'  šev {kl} | {sused}: {m:.2f} m')
            najviac = max(najviac, m)
        print(f'prechod {prechod + 1}: najväčší rozdiel na hrane pred zošitím {najviac:.3f} m')
        if najviac < 0.002:
            break
    for kl in sorted(zmenene):
        uloz(subory[kl], H[kl])
    print(f'zošité dlaždice: {len(zmenene)} z {len(H)}')


if __name__ == '__main__':
    main()
