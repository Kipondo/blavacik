# Zasypanie zárezov pred cestnými tunelmi pod rovnou ulicou a pred vjazdmi do podzemných garáží (issue #54).
#
# Hra cestné tunely nekreslí (tools/osm/klasifikuj.mjs ich vynechá), laser však vidí otvorený zárez, ktorým
# cesta klesá k portálu. V hre tak cesta zišla do slepej jamy hlbokej až 7 m s oporným múrom (Staromestská pod
# Hodžovým námestím pri Prezidentskom paláci). To isté vjazdy do podzemných garáží (rampa končí v slepej jame pri
# budove) a Žabotova pod traťou pri Hlavnej stanici. Pre každý záznam zo zoznamu tools/mesto/laser/tunely.json sa:
#   1) nájde jama pri portáloch – uzly terénu aspoň 1 m pod mediánom okolia (okno 42 m), súvislá oblasť, ktorá
#      sa portálu dotýka (do 5 m) a nie je väčšia ako 3000 m² (väčšia jama je prírodná – údolie, nie zárez),
#   2) rozšíri sa o 6 m (svahy a múry zárezu),
#   3) vyplní hladkou plochou z okraja (Laplaceova rovnica) – výška okolitej ulice sa plynulo premostí.
# Záznam s „oblast“ (mnohouholník v metroch hry) je stavebná jama, ktorá je dnes zastavaná (laser ju zachytil
# počas výkopu, napr. Sky Park Tower, #129): vyplní sa celá plocha mnohouholníka hladko z jeho okraja – bez hľadania
# jamy a bez limitu MAX_JAMA (okraj má byť na pôvodnom teréne – ulica, park).
# Uzly na spoločnej hrane dlaždíc dostanú v oboch dlaždiciach tú istú výšku (šev ostane zošitý).
# Opakované spustenie už jamu nenájde a nič nemení. Tunely v kopci (Sitina) do zoznamu nepatria – tam cesta ide
# do svahu, nie do jamy.
#
# Spustenie (z koreňa repozitára) po teren.py a pred cesty_teren.py:  python3 tools/mesto/laser/zasyp_tunely.py
# Kontrola: python3 tools/kontrola/regresie.py --len tunely-zasypane
import sys, os, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from scipy import ndimage, sparse
from scipy.sparse.linalg import spsolve
from spolocne import VYSTUP, DLAZDICA
from cesty_teren import nacitaj, uloz

KROK = 2
N = DLAZDICA // KROK          # uzlov na dlaždicu bez spoločnej hrany (dlaždica má N + 1)
OKOLIE = 150                  # m okolo portálov, ktoré sa načíta
PRAH = 1.0                    # m pod mediánom okolia = jama
OKNO = 21                     # uzlov (42 m) – medián okolia
DOTYK = 5                     # m – portál leží v jame (väčší dosah by po zasypaní chytil susedné nízke miesta)
ROZSIRENIE = 3                # uzlov (6 m) – svahy zárezu
MAX_JAMA = 3000               # m² – väčšia súvislá jama sa nezasype (prírodný terén)
KOLA = 4                      # najviac toľkokrát pri jednom zázname


def vypln(M, maska):
    """Laplaceova rovnica na uzloch masky, okrajové podmienky = pôvodné výšky okolo."""
    idx = -np.ones(M.shape, int)
    body = np.argwhere(maska)
    idx[maska] = np.arange(len(body))
    A = sparse.lil_matrix((len(body), len(body)))
    b = np.zeros(len(body))
    for n, (r, c) in enumerate(body):
        susedia = 0
        for dr, dc in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            rr, cc = r + dr, c + dc
            if not (0 <= rr < M.shape[0] and 0 <= cc < M.shape[1]):
                continue
            susedia += 1
            if maska[rr, cc]:
                A[n, idx[rr, cc]] = -1
            else:
                b[n] += M[rr, cc]
        A[n, n] = susedia
    V = M.copy()
    V[maska] = spsolve(A.tocsr(), b)
    return V


def vnutri(XX, ZZ, poly):
    """Maska uzlov (XX, ZZ) vnútri mnohouholníka [[x, z], …] (lúč doprava)."""
    m = np.zeros(XX.shape, bool)
    n = len(poly)
    for i in range(n):
        (x0, z0), (x1, z1) = poly[i], poly[(i + 1) % n]
        if z0 == z1:
            continue
        cez = ((z0 > ZZ) != (z1 > ZZ)) & (XX < (x1 - x0) * (ZZ - z0) / (z1 - z0) + x0)
        m ^= cez
    return m


def main():
    zoznam = json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'tunely.json'), encoding='utf-8'))
    detail = set(json.load(open(os.path.join(VYSTUP, 'index.json'), encoding='utf-8')).get('terenDetail', {}).get('dlazdice', []))
    for tunel in zoznam['tunely']:
        P = np.array(tunel.get('oblast') or tunel['portaly'], float)
        gx0 = int(np.floor((P[:, 0].min() - OKOLIE) / KROK)); gx1 = int(np.ceil((P[:, 0].max() + OKOLIE) / KROK))
        gz0 = int(np.floor((P[:, 1].min() - OKOLIE) / KROK)); gz1 = int(np.ceil((P[:, 1].max() + OKOLIE) / KROK))
        M = np.full((gz1 - gz0 + 1, gx1 - gx0 + 1), np.nan)
        dlazdice = {}
        for i in range(gx0 // N, gx1 // N + 1):
            for j in range(gz0 // N, gz1 // N + 1):
                kl = f'{i}_{j}'
                if kl not in detail:
                    continue
                H = nacitaj(os.path.join(VYSTUP, 't', f'{kl}.bin'))
                dlazdice[kl] = H
                a0, a1 = max(gx0, i * N), min(gx1, i * N + N)
                b0, b1 = max(gz0, j * N), min(gz1, j * N + N)
                if a1 < a0 or b1 < b0:
                    continue
                M[b0 - gz0:b1 - gz0 + 1, a0 - gx0:a1 - gx0 + 1] = H[b0 - j * N:b1 - j * N + 1, a0 - i * N:a1 - i * N + 1]
        if np.isnan(M).all():
            print(f'{tunel["nazov"]}: bez podrobného terénu, preskakujem')
            continue
        platne = ~np.isnan(M)
        Mv = np.where(platne, M, np.nanmedian(M))
        X = (gx0 + np.arange(M.shape[1])) * KROK
        Z = (gz0 + np.arange(M.shape[0])) * KROK
        XX, ZZ = np.meshgrid(X, Z)
        blizko = np.zeros(M.shape, bool)
        for px, pz in P:
            blizko |= np.hypot(XX - px, ZZ - pz) < DOTYK
        # opakovať, kým pri portáli ostáva jama (po zasypaní hlbokého zárezu sa okolie zmení) – ďalšie spustenie
        # skriptu potom už nič nemení
        maska = np.zeros(M.shape, bool)
        V = Mv.copy()
        kola = 0
        if tunel.get('oblast'):
            # zastavaná stavebná jama: celá plocha hladko z okraja (opakované spustenie dá ten istý výsledok)
            m = vnutri(XX, ZZ, tunel['oblast']) & platne
            m[0, :] = m[-1, :] = m[:, 0] = m[:, -1] = False
            V2 = vypln(V, m)
            if np.abs(V2 - V)[m].max() >= 0.05:
                V, maska, kola = V2, m, 1
        for _ in range(0 if tunel.get('oblast') else KOLA):
            R = V - ndimage.median_filter(V, size=OKNO)
            lab, _ = ndimage.label((R < -PRAH) & platne)
            vybrane = set(np.unique(lab[blizko & (lab > 0)]))
            velke = {l for l in vybrane if (lab == l).sum() * KROK * KROK > MAX_JAMA}
            if velke:
                print(f'{tunel["nazov"]}: jama nad {MAX_JAMA} m² sa nezasype (prírodný terén)')
                vybrane -= velke
            if not vybrane:
                break
            jama = np.isin(lab, list(vybrane))
            m = ndimage.binary_dilation(jama, iterations=ROZSIRENIE) & platne
            # okraj výrezu ostáva pevný
            m[0, :] = m[-1, :] = m[:, 0] = m[:, -1] = False
            V2 = vypln(V, m)
            if np.abs(V2 - V)[m].max() < 0.05:
                break          # okraj je rovnako nízko – ďalej už nie je čo zasypať (svah, nie jama)
            V = V2
            maska |= m
            kola += 1
        if not maska.any():
            print(f'{tunel["nazov"]}: jama nenájdená (už zasypaná)')
            continue
        zmena = (V - Mv)[maska]
        print(f'{tunel["nazov"]}: zasypané {int(maska.sum()) * KROK * KROK} m² ({kola}×), '
              f'zdvihnuté najviac o {zmena.max():.1f} m (medián {np.median(zmena):.1f} m)')
        for kl, H in dlazdice.items():
            i, j = (int(v) for v in kl.split('_'))
            a0, a1 = max(gx0, i * N), min(gx1, i * N + N)
            b0, b1 = max(gz0, j * N), min(gz1, j * N + N)
            if a1 < a0 or b1 < b0:
                continue
            m = maska[b0 - gz0:b1 - gz0 + 1, a0 - gx0:a1 - gx0 + 1]
            if not m.any():
                continue
            cast = H[b0 - j * N:b1 - j * N + 1, a0 - i * N:a1 - i * N + 1]
            cast[m] = V[b0 - gz0:b1 - gz0 + 1, a0 - gx0:a1 - gx0 + 1][m]
            uloz(os.path.join(VYSTUP, 't', f'{kl}.bin'), H)
            print(f'  {kl}: {int(m.sum())} uzlov')


if __name__ == '__main__':
    main()
