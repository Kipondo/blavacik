# Zarovnanie podrobného terénu (2 m, data/mapa/mesto/t/<i>_<j>.bin) pod cestami (issue #54).
#
# Laser (DMR) vidí aj obrubníky, oporné múriky a terénne zlomy pri ceste; os cesty z OSM nesedí na centimeter,
# takže cesta v hre miestami „schodila“. Pre každú cestu z dlaždíc (aj susedných) sa:
#   1) po osi každé 2 m odčíta terén a pozdĺžne vyhladí (medián 14 m + Gauss ~6 m),
#   2) uzly terénu do polovice šírky cesty + 1 m dostanú výšku z vyhladeného profilu (priečne vodorovne),
#      ďalej do 4 m za okraj sa plynulo zlievajú s pôvodným terénom (svah).
# Kde sa cesty stretajú (križovatky, súbežné jazdné pásy), rozhoduje cesta s najväčšou váhou v uzle. Mosty a tunely sa nemenia (nie sú v „cesty“).
#
# Spustenie (z koreňa repozitára, po teren.py): python3 tools/mesto/laser/cesty_teren.py [i_j …]
import sys, os, json, gzip, glob
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from scipy import ndimage
from spolocne import VYSTUP, DLAZDICA

KROK = 2.0
PRIDAVOK = 1.0      # m za okrajom cesty ešte vodorovne (chodník, obrubník)
SVAH = 3.0          # m plynulého prechodu do pôvodného terénu


def nacitaj(cesta):
    with gzip.open(cesta) as f:
        dl = np.frombuffer(f.read(), '<u2').astype(np.int64)
    n = int(round(len(dl) ** 0.5))
    dl = dl.reshape(n, n)
    dl = np.where(dl > 32767, dl - 65536, dl)
    return (np.cumsum(dl, axis=1) & 0xFFFF).astype(np.float64) / 100 + 100


def uloz(cesta, H):
    u = np.clip(np.round((H - 100) * 100), 0, 65535).astype(np.uint16)
    dl = u.astype(np.int32)
    dl[:, 1:] = np.diff(dl, axis=1)
    with gzip.open(cesta, 'wb', compresslevel=9) as f:
        f.write((dl & 0xFFFF).astype('<u2').tobytes())


def main():
    vyber = sys.argv[1:]
    subory = {os.path.basename(p)[:-4]: p for p in glob.glob(os.path.join(VYSTUP, 't', '*.bin'))}
    if vyber:
        subory = {k: v for k, v in subory.items() if k in vyber}
    detaily = {k: nacitaj(v) for k, v in subory.items()}

    def vyska(x, z):
        """Bilineárna výška z podrobného terénu (NaN mimo načítaných dlaždíc)."""
        i, j = int(np.floor(x / DLAZDICA)), int(np.floor(z / DLAZDICA))
        H = detaily.get(f'{i}_{j}')
        if H is None:
            return np.nan
        n = H.shape[0]
        fx = min(n - 1.0001, max(0.0, (x - i * DLAZDICA) / KROK))
        fz = min(n - 1.0001, max(0.0, (z - j * DLAZDICA) / KROK))
        a, b = int(fx), int(fz)
        tx, tz = fx - a, fz - b
        return (H[b, a] * (1 - tx) + H[b, a + 1] * tx) * (1 - tz) + (H[b + 1, a] * (1 - tx) + H[b + 1, a + 1] * tx) * tz

    for kl in sorted(detaily):
        i, j = (int(v) for v in kl.split('_'))
        H = detaily[kl]
        n = H.shape[0]
        T = H.copy()           # cieľová výška z cesty s najväčšou váhou v uzle
        W = np.zeros_like(H)   # najväčšia váha
        X, Z = np.meshgrid(i * DLAZDICA + KROK * np.arange(n), j * DLAZDICA + KROK * np.arange(n))
        cesty = []
        for a in range(i - 1, i + 2):
            for b in range(j - 1, j + 2):
                p = os.path.join(VYSTUP, 'd', f'{a}_{b}.json')
                if os.path.exists(p):
                    # bez mostov a nadjazdov (mostovka je nad terénom)
                    cesty += [c for c in json.load(open(p)).get('cesty', []) if len(c.get('body', [])) >= 2
                              and not c.get('most') and not c.get('nadjazd')]
        pocet = 0
        for c in cesty:
            body = np.array(c['body'], float)
            # prevzorkovanie osi po 2 m
            seg = np.hypot(*np.diff(body, axis=0).T)
            s = np.concatenate([[0], np.cumsum(seg)])
            if s[-1] < 4:
                continue
            ss = np.linspace(0, s[-1], max(2, int(s[-1] / KROK) + 1))
            px, pz = np.interp(ss, s, body[:, 0]), np.interp(ss, s, body[:, 1])
            # len cesty, ktoré zasahujú do tejto dlaždice
            pol = c.get('sirka', 6) / 2 + PRIDAVOK + SVAH
            if px.max() < i * DLAZDICA - pol or px.min() > (i + 1) * DLAZDICA + pol or pz.max() < j * DLAZDICA - pol or pz.min() > (j + 1) * DLAZDICA + pol:
                continue
            h = np.array([vyska(x, z) for x, z in zip(px, pz)])
            if np.isnan(h).all():
                continue
            h = np.where(np.isnan(h), np.nanmedian(h), h)
            if len(h) >= 7:
                h = ndimage.median_filter(h, size=7, mode='nearest')
            h = ndimage.gaussian_filter1d(h, 3.0, mode='nearest')
            # uzly v okolí cesty: najbližší bod osi (po úsekoch prevzorkovanej osi)
            r_vodor = c.get('sirka', 6) / 2 + PRIDAVOK
            m0 = (X > px.min() - pol) & (X < px.max() + pol) & (Z > pz.min() - pol) & (Z < pz.max() + pol)
            if not m0.any():
                continue
            xs, zs = X[m0], Z[m0]
            d_min = np.full(xs.shape, np.inf)
            h_min = np.zeros(xs.shape)
            for k in range(len(px) - 1):
                ax, az, bx, bz = px[k], pz[k], px[k + 1], pz[k + 1]
                dx, dz = bx - ax, bz - az
                L2 = dx * dx + dz * dz or 1e-9
                t = np.clip(((xs - ax) * dx + (zs - az) * dz) / L2, 0, 1)
                d = np.hypot(xs - ax - dx * t, zs - az - dz * t)
                lepsie = d < d_min
                d_min[lepsie] = d[lepsie]
                h_min[lepsie] = h[k] * (1 - t[lepsie]) + h[k + 1] * t[lepsie]
            w = np.clip(1 - (d_min - r_vodor) / SVAH, 0, 1)
            w = w * w * (3 - 2 * w)          # plynulo
            # za okrajom cesty nechaj múry a svahy (rozdiel nad 1 m sa zlieva menej, nad 2,5 m vôbec)
            mimo = d_min > r_vodor
            rozdiel = np.abs(h_min - H[m0])
            w = np.where(mimo, w * np.clip(1 - (rozdiel - 1.0) / 1.5, 0, 1), w)
            if not (w > 0).any():
                continue
            # v uzle rozhoduje najbližšia cesta (priemer súbežných jazdných pásov by robil vlny)
            Wm, Tm = W[m0], T[m0]
            lepsia = w > Wm
            Wm[lepsia] = w[lepsia]
            Tm[lepsia] = h_min[lepsia]
            W[m0], T[m0] = Wm, Tm
            pocet += 1
        maska = W > 0
        novy = H * (1 - W) + T * W
        zmena = np.abs(novy - H)[maska]
        print(f'{kl}: ciest {pocet}, zmenených uzlov {int(maska.sum())}, zmena medián {np.median(zmena) if zmena.size else 0:.2f} m, max {zmena.max() if zmena.size else 0:.2f} m', flush=True)
        uloz(subory[kl], novy)


if __name__ == '__main__':
    main()
