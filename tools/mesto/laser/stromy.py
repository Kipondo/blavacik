# Stromy z laserového skenovania ÚGKK: vrcholy korún v (DMP − DMR) mimo budov.
# Každý strom = [x, z, mierka, výška, polomer koruny]; zapíše sa do data/mapa/mesto/d/<i>_<j>.json
# namiesto stromov z OSM (tie sa ponechajú len tam, kde laser nič nevidí, napr. malé nové výsadby).
#
# Spustenie (po budovy.py): python3 tools/mesto/laser/stromy.py [--vsetko]
import sys, os, json, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage
from spolocne import Raster, VYSTUP, NULA, DLAZDICA, VYREZ, nacitaj_index, uloz_json

K = 0.5
MIN_VYSKA = 3.0       # m nad terénom
MIN_ROZOSTUP = 3.0    # m medzi vrcholmi korún
MAX_VYSKA = 30.0      # m – vyššie „stromy“ sú takmer vždy strechy alebo steny výškových budov (issue #71)

index = nacitaj_index()
from spolocne import KOREN
PAMIATKY = json.load(open(os.path.join(KOREN, 'data', 'mapa', 'pamiatky.json')))['pamiatky']
dlazdice = [(d[0], d[1]) for d in index['dlazdice']] if '--vsetko' in sys.argv else VYREZ
dmp_r, dmr_r = Raster('dmp'), Raster('dmr')
OKRAJ = 10
spolu = 0
for (i, j) in dlazdice:
    kl = f'{i}_{j}'
    cesta = os.path.join(VYSTUP, 'd', f'{kl}.json')
    d = json.load(open(cesta))
    X0, Z0 = i * DLAZDICA - OKRAJ, j * DLAZDICA - OKRAJ
    W = H = int((DLAZDICA + 2 * OKRAJ) / K)
    dmp = dmp_r.mriezka(X0 + K / 2, Z0 + K / 2, K, W, H, priemer=0)
    dmr = dmr_r.mriezka(X0 + K / 2, Z0 + K / 2, K, W, H, priemer=0)
    if not np.isfinite(dmp).mean() > 0.9: continue
    ndsm = np.nan_to_num(dmp - dmr, nan=0)
    # budovy (aj z okolitých dlaždíc) – stromy nie sú na strechách
    img = Image.new('L', (W, H), 0); dr = ImageDraw.Draw(img)
    for a in range(i - 1, i + 2):
        for b in range(j - 1, j + 2):
            p = os.path.join(VYSTUP, 'd', f'{a}_{b}.json')
            if not os.path.exists(p): continue
            for bu in json.load(open(p))['budovy']:
                dr.polygon([((x - X0) / K, (z - Z0) / K) for x, z in bu['body']], fill=1)
    # pamiatky majú vlastné modely (veža Dómu by inak vyzerala ako 80 m strom)
    for pm in PAMIATKY:
        z_ = pm.get('zaber') or {}
        if 'kruh' in z_:
            r = z_['kruh'] / K
            dr.ellipse([(pm['x'] - X0) / K - r, (pm['z'] - Z0) / K - r, (pm['x'] - X0) / K + r, (pm['z'] - Z0) / K + r], fill=1)
        elif 'obdlznik' in z_:
            w, h_ = z_['obdlznik']; u = pm.get('natocenie', 0); c, s_ = math.cos(u), math.sin(u)
            rohy = [(-w / 2, -h_ / 2), (w / 2, -h_ / 2), (w / 2, h_ / 2), (-w / 2, h_ / 2)]
            # rovnaké natočenie ako vPamiatke v tools/osm/klasifikuj.mjs (lokálne → svet)
            dr.polygon([((pm['x'] + a * c + b * s_ - X0) / K, (pm['z'] - a * s_ + b * c - Z0) / K) for a, b in rohy], fill=1)
    # modely z Blendera (výškové budovy, kostoly…): ich OSM budovy sú z dlaždíc vyradené, preto maska
    # z pôdorysov v assets/pamiatky/<subor>.json (inak by Manderlák mal v sebe 44 m „stromy“, issue #71)
    for pm in PAMIATKY:
        if not pm.get('subor'): continue
        pi = os.path.join(KOREN, 'assets', 'pamiatky', f"{pm['subor']}.json")
        if not os.path.exists(pi): continue
        info = json.load(open(pi))
        u = pm.get('natocenie', 0); c, s_ = math.cos(u), math.sin(u)
        for w in info.get('obrysy', []) + info.get('kolizie', []):
            if len(w) < 3: continue
            dr.polygon([((pm['x'] + a * c + b * s_ - X0) / K, (pm['z'] - a * s_ + b * c - Z0) / K) for a, b in w], fill=1)
    budova = ndimage.binary_dilation(np.array(img, bool), iterations=2)
    # vegetácia: nad terénom, mimo budov, „drsná“ (koruna nie je rovná ako strecha alebo stena)
    hl = ndimage.gaussian_filter(ndsm, 1.5)
    zelen = (ndsm > 2.0) & ~budova
    vrcholy = (hl == ndimage.maximum_filter(hl, size=int(MIN_ROZOSTUP / K) * 2 + 1)) & zelen & (hl > MIN_VYSKA)
    vy, vx = np.nonzero(vrcholy)
    # polomer koruny: vzdialenosť, kde koruna klesne pod polovicu výšky (8 smerov), max. 9 m
    stromy = []
    for y, x in zip(vy, vx):
        h = float(hl[y, x])
        r_ = []
        for dy, dx in ((0, 1), (1, 0), (0, -1), (-1, 0), (1, 1), (1, -1), (-1, 1), (-1, -1)):
            krok = math.hypot(dx, dy) * K
            n = 1
            while n < 18:
                yy, xx = y + dy * n, x + dx * n
                if not (0 <= yy < H and 0 <= xx < W) or ndsm[yy, xx] < h * 0.45 or budova[yy, xx]: break
                n += 1
            r_.append(n * krok)
        r = float(np.median(r_))
        gx, gz = X0 + (x + 0.5) * K, Z0 + (y + 0.5) * K
        if not (i * DLAZDICA <= gx < (i + 1) * DLAZDICA and j * DLAZDICA <= gz < (j + 1) * DLAZDICA): continue
        if r < 1.2: continue                     # stĺpy, lampy, tenké konštrukcie
        if h > MAX_VYSKA: continue               # strecha/stena budovy, nie koruna
        stromy.append([round(gx, 1), round(gz, 1), round(min(2.2, max(0.5, h / 9)), 2), round(h, 1), round(min(9, r), 1)])
    d['stromy'] = stromy
    d['stromyZLasera'] = True
    uloz_json(cesta, d)
    spolu += len(stromy)
    print(f'{kl}: {len(stromy)} stromov', flush=True)
print(f'spolu {spolu} stromov z lasera')
