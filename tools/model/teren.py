# Terén nového modelu: laserové skenovanie ÚGKK SR, DMR 6.0 (holý terén, 0,5 m, CC BY 4.0) → model/data/teren/.
#
# Každá dlaždica 256 × 256 m je mriežka 513 × 513 uzlov po 0,5 m (okraj spoločný so susedom). Výšky v cm nad
# minimom dlaždice (uint16), po riadkoch rozdiely (mod 65536) a gzip – formát číta model/js/teren.js.
# Chýbajúce body (mimo dát) sa doplnia najbližším platným.
#
# Spustenie (z koreňa repozitára, laser v .cache/laser/ – tools/mesto/laser/stiahni.py dmr):
#   python tools/model/teren.py

import gzip, os, sys, time
import numpy as np
from scipy import ndimage

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from spolocne import VYSTUP, KROK, UZLY, NULA, dlazdice, roh, uloz_json, DLAZDICA, X0, Z0, NI, NJ  # noqa: E402
from spolocne import KOREN, laser  # noqa: E402


def main():
    r = laser().Raster('dmr')
    ciel = os.path.join(VYSTUP, 'teren')
    os.makedirs(ciel, exist_ok=True)
    meta = {'popis': 'Terén – laserové skenovanie ÚGKK SR, DMR 6.0 (0,5 m), © ÚGKK SR, CC BY 4.0. Vyrába tools/model/teren.py.',
            'dlazdica': DLAZDICA, 'krok': KROK, 'uzly': UZLY, 'x0': X0, 'z0': Z0, 'ni': NI, 'nj': NJ, 'nula': NULA, 'dlazdice': []}
    spolu = 0
    t0 = time.time()
    for i, j in dlazdice():
        x0, z0 = roh(i, j)
        v = r.mriezka(x0, z0, KROK, UZLY, UZLY, priemer=0)        # m n. m., riadky = z, stĺpce = x
        chyba = ~np.isfinite(v)
        if chyba.all():
            print(f'{i}_{j}: bez dát'); continue
        if chyba.any():
            idx = ndimage.distance_transform_edt(chyba, return_distances=False, return_indices=True)
            v = v[tuple(idx)]
        v = v - NULA
        mn = float(np.floor(v.min() * 100) / 100)
        cm = np.round((v - mn) * 100).astype(np.int64)
        assert cm.max() < 65536
        d = cm.astype(np.uint16)
        rozdiely = np.empty_like(d)
        rozdiely[:, 0] = d[:, 0]
        rozdiely[:, 1:] = (d[:, 1:].astype(np.int64) - d[:, :-1].astype(np.int64)) % 65536
        data = gzip.compress(rozdiely.astype('<u2').tobytes(), 9)
        with open(os.path.join(ciel, f'{i}_{j}.bin'), 'wb') as f:
            f.write(data)
        spolu += len(data)
        meta['dlazdice'].append({'i': i, 'j': j, 'min': mn, 'max': round(float(v.max()), 2), 'chyba': int(chyba.sum())})
        print(f'{i}_{j}: {mn + NULA:.1f}–{v.max() + NULA:.1f} m n. m., {len(data) // 1024} kB, doplnených {int(chyba.sum())} ({time.time() - t0:.0f} s)', flush=True)
    uloz_json(os.path.join(ciel, 'index.json'), meta)
    print(f'Hotovo: {len(meta["dlazdice"])} dlaždíc, {spolu / 1e6:.1f} MB')


if __name__ == '__main__':
    main()
