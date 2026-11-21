# Terén z laserového skenovania ÚGKK (DMR 6.0) pre hru.
#
# 1) celé mesto: data/mapa/mesto/teren.bin (mriežka 20 m, Int16 decimetre nad 139 m n. m.) –
#    kde laser nie je (okraj mapy mimo LOT08), ostane Copernicus DEM s plynulým prechodom;
# 2) detail: data/mapa/mesto/t/<i>_<j>.bin – mriežka 2 m pre vybrané dlaždice (251 × 251 uzlov,
#    uint16 = (výška − 100 m) · 100, po riadkoch rozdiely susedov, celé zabalené gzipom).
#
# Spustenie (z koreňa repozitára, po tools/mesto/dlazdice.mjs a teren.mjs):
#   python3 tools/mesto/laser/teren.py            – celé mesto 20 m + detail pre výrez Starého Mesta
#   python3 tools/mesto/laser/teren.py --vsetko   – detail pre všetky dlaždice
import sys, os, json, gzip, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from scipy import ndimage
from spolocne import Raster, VYSTUP, NULA, DLAZDICA, VYREZ, nacitaj_index, uloz_json, vyber_dlazdic

KROK_DETAIL = 2
N_DETAIL = DLAZDICA // KROK_DETAIL + 1

dmr = Raster('dmr')
meta = json.load(open(os.path.join(VYSTUP, 'teren.json')))
W, D, K = meta['sirka'], meta['hlbka'], meta['krok']
stary = np.fromfile(os.path.join(VYSTUP, 'teren.bin'), dtype='<i2').reshape(D, W).astype(np.float32) / 10
len_detail = '--len-detail' in sys.argv or meta.get('zdroj') == 'laser'
if len_detail:
    print('teren.bin je už z lasera – počítam len detailné dlaždice (pre nový celok spusti najprv npm run teren v tools/mesto)')

# --- 1) celé mesto po blokoch ---
def cele_mesto():
    t0 = time.time()
    t0 = time.time()
    novy = np.full((D, W), np.nan, np.float32)
    B = 100
    for j0 in range(0, D, B):
        for i0 in range(0, W, B):
            nx, nz = min(B, W - i0), min(B, D - j0)
            novy[j0:j0 + nz, i0:i0 + nx] = dmr.mriezka(meta['minX'] + i0 * K, meta['minZ'] + j0 * K, K, nx, nz, priemer=K)
        print(f'  riadky {j0}/{D}, {time.time() - t0:.0f} s', flush=True)
    platne = np.isfinite(novy)
    print(f'laser pokrýva {platne.mean() * 100:.1f} % mriežky')
    # váha lasera: 1 vnútri, plynulo k 0 na okraji pokrytia (≈ 200 m)
    vaha = ndimage.uniform_filter(platne.astype(np.float32), size=11)
    vaha = np.where(platne, np.clip((vaha - 0.5) * 2, 0, 1), 0)
    vysledok = np.where(platne, np.nan_to_num(novy - NULA) * vaha + stary * (1 - vaha), stary)
    rozdiel = (vysledok - stary)[platne]
    print(f'zmena oproti Copernicus: medián {np.median(rozdiel):+.2f} m, 5–95 % {np.percentile(rozdiel, 5):+.1f} … {np.percentile(rozdiel, 95):+.1f} m')
    np.round(vysledok * 10).astype('<i2').tofile(os.path.join(VYSTUP, 'teren.bin'))
    meta.update({
        'popis': 'Výšky terénu (Int16, decimetre nad nábrežím = 139 m n. m.), mriežka 20 m. Zdroj: letecké laserové skenovanie ÚGKK SR (DMR 6.0), na okraji mimo pokrytia Copernicus DEM GLO-30. Spracované tools/mesto/laser/teren.py',
        'licencia': 'DMR 6.0 © ÚGKK SR, CC BY 4.0; Copernicus DEM © DLR e.V. 2010-2014 a © Airbus Defence and Space GmbH 2014-2018, poskytnuté v rámci programu COPERNICUS Európskou úniou a ESA',
        'zdroj': 'laser',
    })
    uloz_json(os.path.join(VYSTUP, 'teren.json'), meta)


if not len_detail:
    cele_mesto()

# --- 2) detail 2 m ---
index = nacitaj_index()
dlazdice = vyber_dlazdic(index)   # --vsetko | --dlazdice i_j,… | --mlynska-dolina | výrez Starého Mesta
os.makedirs(os.path.join(VYSTUP, 't'), exist_ok=True)
hotove = []
for (i, j) in dlazdice:
    v = dmr.mriezka(i * DLAZDICA, j * DLAZDICA, KROK_DETAIL, N_DETAIL, N_DETAIL, priemer=2)
    if not np.isfinite(v).all():
        continue
    u = np.clip(np.round((v - 100) * 100), 0, 65535).astype(np.uint16)
    dl = u.astype(np.int32); dl[:, 1:] = np.diff(dl, axis=1)
    with gzip.open(os.path.join(VYSTUP, 't', f'{i}_{j}.bin'), 'wb', compresslevel=9) as f:
        f.write((dl & 0xFFFF).astype('<u2').tobytes())
    hotove.append(f'{i}_{j}')
index['terenDetail'] = {'krok': KROK_DETAIL, 'uzly': N_DETAIL, 'dlazdice': sorted(set(index.get('terenDetail', {}).get('dlazdice', [])) | set(hotove))}
uloz_json(os.path.join(VYSTUP, 'index.json'), index)
velkost = sum(os.path.getsize(os.path.join(VYSTUP, 't', f'{k}.bin')) for k in hotove)
print(f'detail 2 m: {len(hotove)} dlaždíc, spolu {velkost / 1024:.0f} kB')
