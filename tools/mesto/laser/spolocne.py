# Spoločné veci pre spracovanie leteckého laserového skenovania (LLS) ÚGKK SR.
#
# Zdroj: ÚGKK SR, LLS 2. cyklus, LOT08 – DMR 6.0 (terén) a DMP 2.0 (povrch), 0,5 m,
#        súradnice S-JTSK [JTSK03] / Krovak East-North (EPSG:8353), výšky Bpv. Licencia CC BY 4.0.
# Súradnice hry: x = východ, z = juh, metre od 48.1435 N, 17.1077 E (rovnaký prepočet ako tools/mesto/spolocne.mjs).
import json, math, os
import numpy as np

KOREN = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', '..'))
CACHE = os.path.join(KOREN, '.cache', 'laser')
VYSTUP = os.path.join(KOREN, 'data', 'mapa', 'mesto')
LAT0, LON0 = 48.1435, 17.1077
KX = 111320 * math.cos(math.radians(LAT0))
KZ = 111132
NULA = 139.0          # výška 0 v hre (m n. m.)
DLAZDICA = 500

# výrez, na ktorom ladíme (Staré Mesto 1 × 1 km + Hradný kopec = 1,5 × 1 km); --vsetko spracuje celé mesto
VYREZ = [(-2, -1), (-1, -1), (0, -1), (-2, 0), (-1, 0), (0, 0)]
# Mlynská dolina (miesto príbehu, issue #73): internáty Mlyny, Átriaky, Družba, fakulty
MLYNSKA_DOLINA = [(-7, -4), (-6, -4), (-6, -3), (-6, -5), (-5, -4)]
# širšie centrum a okolie Mlynskej doliny (noc 22. 11., #53 / #64): Staré Mesto od Palisád po Landererovu
# a od Hlavnej stanice po Dunaj (i −3…2, j −4…1) a Karlova Ves – Mlynská dolina – Družba (i −8…−4, j −6…−1)
SIRSIE_CENTRUM = ([(i, j) for i in range(-3, 3) for j in range(-3, 2)] + [(i, -4) for i in range(-2, 2)]
                  + [(i, j) for i in range(-8, -3) for j in range(-6, 0)])


def vyber_dlazdic(index):
    """Dlaždice na spracovanie podľa argumentov: --vsetko | --dlazdice i_j,i_j… | --mlynska-dolina | --sirsie-centrum |
    výrez Starého Mesta."""
    import sys
    if '--vsetko' in sys.argv:
        return [(d[0], d[1]) for d in index['dlazdice']]
    if '--mlynska-dolina' in sys.argv:
        return MLYNSKA_DOLINA
    if '--sirsie-centrum' in sys.argv:
        mame = {(d[0], d[1]) for d in index['dlazdice']}
        return [t for t in SIRSIE_CENTRUM if t in mame]
    if '--dlazdice' in sys.argv:
        zoz = sys.argv[sys.argv.index('--dlazdice') + 1]
        return [tuple(int(v) for v in k.split('_')) for k in zoz.split(',')]
    return VYREZ

SUBORY = {
    'dmr': ('LOT08_DMR6_sjtsk03_bpv.zip', 'sjtsk03_bpv/dmr6_08_23_s.tif', 'sjtsk03_bpv/dmr6_08_23_s.tfw'),
    'dmp': ('LOT08_DMP2_sjtsk03_bpv.zip', 'sjtsk03_bpv/dmp2_08_23_s.tif', 'sjtsk03_bpv/dmp2_08_23_s.tfw'),
}
URL = 'https://opendata.skgeodesy.sk/static/LLS/2_cyklus/LOT08/'


def na_stupne(x, z):
    return LON0 + np.asarray(x) / KX, LAT0 - np.asarray(z) / KZ


class Raster:
    """Veľký GeoTIFF ÚGKK (dlaždicovaný, LZW) – čítanie výrezov bez načítania celého súboru."""

    def __init__(self, druh):
        import tifffile, zarr
        _, tif, tfw = SUBORY[druh]
        cesta = os.path.join(CACHE, os.path.basename(tif))
        a, _, _, e, c, f = [float(v) for v in open(os.path.join(CACHE, os.path.basename(tfw))).read().split()]
        self.a, self.e, self.c, self.f = a, e, c, f        # c, f = stred ľavého horného pixla
        self.tf = tifffile.TiffFile(cesta)
        self.z = zarr.open(self.tf.pages[0].aszarr(), mode='r')
        self.h, self.w = self.z.shape
        from pyproj import Transformer
        self.t = Transformer.from_crs('EPSG:4326', 'EPSG:8353', always_xy=True)

    def pixel(self, x, z):
        """Súradnice hry → (stĺpec, riadok) v rastri (desatinné)."""
        lon, lat = na_stupne(x, z)
        E, N = self.t.transform(lon, lat)
        return (np.asarray(E) - self.c) / self.a, (np.asarray(N) - self.f) / self.e

    def mriezka(self, x0, z0, krok, nx, nz, priemer=1):
        """Hodnoty v mriežke hry (uzly x0 + i·krok, z0 + j·krok). priemer = polomer okna v pixeloch
        (0 = bilineárne, n = priemer okna (2n)×(2n) pixlov okolo uzla). Mimo dát → NaN."""
        # prepočet súradníc stačí na hrubej mriežke, medzi bodmi je lineárny
        hx = np.linspace(x0, x0 + krok * (nx - 1), min(nx, 21)); hz = np.linspace(z0, z0 + krok * (nz - 1), min(nz, 21))
        HX, HZ = np.meshgrid(hx, hz)
        C, R = self.pixel(HX, HZ)
        from scipy.interpolate import RegularGridInterpolator as RGI
        xs = x0 + krok * np.arange(nx); zs = z0 + krok * np.arange(nz)
        ZZ, XX = np.meshgrid(zs, xs, indexing='ij')
        col = RGI((hz, hx), C)((ZZ, XX)); row = RGI((hz, hx), R)((ZZ, XX))
        okraj = priemer + 2
        c0 = max(0, int(np.floor(col.min())) - okraj); c1 = min(self.w, int(np.ceil(col.max())) + okraj + 1)
        r0 = max(0, int(np.floor(row.min())) - okraj); r1 = min(self.h, int(np.ceil(row.max())) + okraj + 1)
        if c1 <= c0 or r1 <= r0:
            return np.full((nz, nx), np.nan, np.float32)
        okno = np.asarray(self.z[r0:r1, c0:c1]).astype(np.float32)
        okno[(okno < 50) | (okno > 3000)] = np.nan
        if priemer > 0:
            from scipy import ndimage
            platne = np.isfinite(okno)
            s = ndimage.uniform_filter(np.where(platne, okno, 0), size=2 * priemer)
            n = ndimage.uniform_filter(platne.astype(np.float32), size=2 * priemer)
            okno = np.where(n > 0.5, s / np.maximum(n, 1e-6), np.nan)
        cc = col - c0; rr = row - r0
        ci = np.clip(np.floor(cc).astype(int), 0, okno.shape[1] - 2); ri = np.clip(np.floor(rr).astype(int), 0, okno.shape[0] - 2)
        fx = cc - ci; fy = rr - ri
        v = (okno[ri, ci] * (1 - fx) * (1 - fy) + okno[ri, ci + 1] * fx * (1 - fy)
             + okno[ri + 1, ci] * (1 - fx) * fy + okno[ri + 1, ci + 1] * fx * fy)
        mimo = (col < 0) | (row < 0) | (col > self.w - 1) | (row > self.h - 1)
        v[mimo] = np.nan
        return v.astype(np.float32)


def nacitaj_index():
    return json.load(open(os.path.join(VYSTUP, 'index.json')))


def uloz_json(cesta, data):
    with open(cesta, 'w') as f:
        json.dump(data, f, ensure_ascii=False, separators=(',', ':'))
