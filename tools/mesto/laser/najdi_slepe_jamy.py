# Prehľad slepých jám pod cestami v podrobnom teréne (issue #54) – kandidáti do tools/mesto/laser/tunely.json.
#
# Slepá jama = cesta končí (bez nadväznosti na inú cestu či chodník) v záreze: terén vpredu aj po oboch bokoch je
# vyšší a koniec je aspoň 1,5 m pod mediánom okolia (okno 42 m). Takto vyzerá nájazd do tunela alebo vjazd do
# podzemnej garáže, ktoré hra nekreslí. Skript nič nemení – vypíše kandidátov; o každom treba rozhodnúť (náhľad
# v kontrolóre mapy / snímka) a skutočné zárezy pridať do tunely.json. Nepatria tam:
#   – tunely v kopci (Sitina – diaľnica vchádza do svahu, nie do jamy) a vjazdy do garáží v svahu (Slávičie údolie,
#     Údolná, Mlynská dolina): zasypanie by z konca cesty urobilo strmý kopec. Po pridaní záznamu a zasypaní preto
#     spusti kontrolór mapy (--len cesta-strma) – keď pri portáli pribudne strmá cesta, záznam do zoznamu nepatrí,
#   – cesty pod mostom (most / nadjazd je v hre, cesta pod ním je správne nižšie),
#   – úvozy a ulice v záreze do svahu (napr. Hlboká cesta, Partizánska) – nie sú slepé, idú ďalej.
# Pozor: na nájazdoch, ktoré už sú v tunely.json, zasypané nevypíše (jama tam už nie je).
#
# Spustenie (z koreňa repozitára):  python3 tools/mesto/laser/najdi_slepe_jamy.py
import sys, os, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from spolocne import VYSTUP, DLAZDICA
from cesty_teren import nacitaj

KROK = 2


def main():
    det = set(json.load(open(os.path.join(VYSTUP, 'index.json'), encoding='utf-8'))['terenDetail']['dlazdice'])
    T = {k: nacitaj(os.path.join(VYSTUP, 't', f'{k}.bin')) for k in det}

    def h(x, z):
        i, j = int(np.floor(x / DLAZDICA)), int(np.floor(z / DLAZDICA))
        H = T.get(f'{i}_{j}')
        if H is None:
            return np.nan
        return H[int(round((z - j * DLAZDICA) / KROK)), int(round((x - i * DLAZDICA) / KROK))]

    def okolie(x, z):
        return np.nanmedian([h(x + a, z + b) for a in range(-42, 43, 4) for b in range(-42, 43, 4)])

    kluce = set(det)
    for k in det:
        i, j = map(int, k.split('_'))
        kluce |= {f'{a}_{b}' for a in range(i - 1, i + 2) for b in range(j - 1, j + 2)}
    cesty, pesie = [], []
    for k in kluce:
        p = os.path.join(VYSTUP, 'd', f'{k}.json')
        if os.path.exists(p):
            d = json.load(open(p, encoding='utf-8'))
            cesty += d.get('cesty', [])
            pesie += d.get('chodniky', [])
    pocet = {}
    for c in cesty + pesie:
        for x, z in c['body']:
            pocet[(x, z)] = pocet.get((x, z), 0) + 1
    out = []
    for c in cesty:
        if c.get('most') or c.get('nadjazd') or len(c['body']) < 2:
            continue
        b = c['body']
        for E, P in ((b[0], b[1]), (b[-1], b[-2])):
            if pocet[tuple(E)] > 1:
                continue
            he = h(*E)
            if np.isnan(he):
                continue
            u = np.array(E, float) - P
            L = np.hypot(*u)
            if L < 1e-6:
                continue
            u /= L
            w = c.get('sirka', 5) / 2
            vpred = np.nanmax([h(E[0] + u[0] * s, E[1] + u[1] * s) for s in (6, 10, 16, 24)]) - he
            boky = [h(E[0] - u[1] * s * q, E[1] + u[0] * s * q) - he for s in (w + 5, w + 9) for q in (-1, 1)]
            if vpred > 1.5 and np.nanmax(boky[0::2]) > 1.5 and np.nanmax(boky[1::2]) > 1.5:
                jama = okolie(*E) - he
                if jama > 1.5:
                    out.append((round(float(jama), 1), E[0], E[1], c['typ'], c.get('nazov') or ''))
    out.sort(reverse=True)
    print(f'kandidátov: {len(out)}  (hĺbka m, x, z, typ cesty, názov)')
    for o in out:
        print('  %.1f  %.1f, %.1f  %s %s' % o)


if __name__ == '__main__':
    main()
