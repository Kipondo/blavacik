# Spoločné pomôcky pre mosty z Blendera (tools/blender/mosty/*.py).
#
# Most sa modeluje v lokálnych súradniciach: X ide pozdĺž osi mosta od bodu „od“ po „do“ (dĺžka L
# z data/mapa/mesto/index.json), Y doľava, Z hore; vrch mostovky (pod cestou) je z = 0. V hre sa model
# položí na výšku mostovky (vyskopis.mosty[].vrch) a časti v nábehoch sa ohnú podľa výškového profilu
# (js/mapa/pamiatky/most-glb.js) – preto sú všetky pozdĺžne prvky rozdelené na krátke úseky.

import json
import math
import os

from veze import Geo, KOREN

KROK = 5.0          # dĺžka úseku pozdĺžnych prvkov (kvôli ohnutiu v nábehu)


def data_mosta(nazov):
    """Os mosta z index.json + úseky nad riekou [(s0, s1), …] (s = metre od „od“)."""
    with open(os.path.join(KOREN, 'data', 'mapa', 'mesto', 'index.json')) as f:
        idx = json.load(f)
    m = next(x for x in idx['mosty'] if x['nazov'] == nazov)
    (ax, az), (bx, bz) = m['od'], m['do']
    L = math.hypot(bx - ax, bz - az)
    ux, uz = (bx - ax) / L, (bz - az) / L
    rieky = [v['body'] for v in idx['voda'] if v.get('reka')]

    def vo_vode(x, z):
        for b in rieky:
            c, j = False, len(b) - 1
            for i in range(len(b)):
                xi, zi = b[i]
                xj, zj = b[j]
                if (zi > z) != (zj > z) and x < (xj - xi) * (z - zi) / (zj - zi) + xi:
                    c = not c
                j = i
            if c:
                return True
        return False
    useky, zac = [], None
    for s in range(0, int(L) + 1):
        v = vo_vode(ax + ux * s, az + uz * s)
        if v and zac is None:
            zac = s
        if not v and zac is not None:
            useky.append((zac, s - 1))
            zac = None
    if zac is not None:
        useky.append((zac, int(L)))
    return {**m, 'L': L, 'ux': ux, 'uz': uz, 'voda': useky}


def lokalne(d, x, z):
    """Bod hry (x, z) → poloha pozdĺž osi s a bočne y (doľava kladné) v lokálnych súradniciach mosta."""
    ax, az = d['od']
    dx, dz = x - ax, z - az
    s = dx * d['ux'] + dz * d['uz']
    n = dx * (-d['uz']) + dz * d['ux']      # n = smer (−uz, ux) v hre = −Y v Blenderi
    return s, -n


def delenie(x0, x1, krok=KROK):
    n = max(1, math.ceil((x1 - x0) / krok))
    return [x0 + (x1 - x0) * i / n for i in range(n + 1)]


# --- pozdĺžne prvky (rozdelené na úseky) ---------------------------------------------------

def profil(G, mat, x0, x1, body_yz, krok=KROK, uzavriet=False, zdola=None):
    """Pozdĺžny prvok s prierezom body_yz [(y, z), …] proti smeru hodín pri pohľade od +X
    (obrys prierezu). Prierez môže byť funkcia x → body (premenná výška nosníka)."""
    xs = delenie(x0, x1, krok)
    rez = (lambda x: body_yz(x)) if callable(body_yz) else (lambda x: body_yz)
    for a, b in zip(xs[:-1], xs[1:]):
        A, B = rez(a), rez(b)
        n = len(A)
        for i in range(n if uzavriet else n - 1):
            j = (i + 1) % n
            G.plocha(mat, [(a, A[i][0], A[i][1]), (a, A[j][0], A[j][1]), (b, B[j][0], B[j][1]), (b, B[i][0], B[i][1])])
    if uzavriet:
        A, B = rez(x0), rez(x1)
        G.plocha(mat, [(x0, y, z) for y, z in reversed(A)])
        G.plocha(mat, [(x1, y, z) for y, z in B])


def tyc_x(G, mat, x0, x1, y, z, sirka, vyska, krok=KROK):
    """Pozdĺžna tyč (obdĺžnikový prierez) so stredom v (y, z)."""
    w, h = sirka / 2, vyska / 2
    profil(G, mat, x0, x1, [(y - w, z - h), (y + w, z - h), (y + w, z + h), (y - w, z + h)], krok, uzavriet=True)


def kvader_xyz(G, mat, x, y, z0, z1, sx, sy):
    G.hranol(mat, [(x - sx / 2, y - sy / 2), (x + sx / 2, y - sy / 2), (x + sx / 2, y + sy / 2), (x - sx / 2, y + sy / 2)], z0, z1)


def zabradlie(G, mat, x0, x1, y, z, vyska=1.1, krok_stlpika=2.0, priecky=(0.45,), stlpik=0.08):
    """Zábradlie pozdĺž mosta: stĺpiky, madlo a priečky."""
    tyc_x(G, mat, x0, x1, y, z + vyska, 0.07, 0.07)
    for p in priecky:
        tyc_x(G, mat, x0, x1, y, z + p, 0.04, 0.04)
    n = max(1, round((x1 - x0) / krok_stlpika))
    for i in range(n + 1):
        x = x0 + (x1 - x0) * i / n
        kvader_xyz(G, mat, x, y, z, z + vyska, stlpik, stlpik)


def lampa(G, mat, mat_svetlo, x, y, z, vyska=9.0, rameno=1.6, smer=-1):
    """Stĺp verejného osvetlenia s ramenom nad cestou (smer = ±1 v osi Y)."""
    G.valec(mat, (x, y), 0.11, z, z + vyska, seg=8, r1=0.07)
    G.tram(mat, (x, y, z + vyska - 0.2), (x, y + smer * rameno, z + vyska), 0.08)
    yl = y + smer * rameno
    G.kvader(mat, (x, yl), (1, 0), 0.7, 0.32, z + vyska - 0.12, z + vyska + 0.06)
    G.vodorovna(mat_svetlo, [(x - 0.3, yl - 0.13), (x - 0.3, yl + 0.13), (x + 0.3, yl + 0.13), (x + 0.3, yl - 0.13)], z + vyska - 0.13)


def pilier_rieka(G, mat, mat_hlava, x, z_hore, sirka_y, hrubka_x, z_dole=-40.0, seg=8, hlava=1.0):
    """Riečny pilier: pôdorys štadión (dlhý naprieč mostom = po prúde), hlavica navrchu."""
    r = hrubka_x / 2
    dl = max(0.0, sirka_y / 2 - r)
    obrys = []
    for k in range(seg + 1):
        a = math.pi * k / seg
        obrys.append((x + r * math.cos(a), dl + r * math.sin(a)))
    for k in range(seg + 1):
        a = math.pi + math.pi * k / seg
        obrys.append((x + r * math.cos(a), -dl + r * math.sin(a)))
    G.hranol(mat, obrys, z_dole, z_hore - hlava, vrch=False)
    hl = [(x + (px - x) * 1.12, py * 1.06) for px, py in obrys]
    G.hranol(mat_hlava, hl, z_hore - hlava, z_hore)


def rotacne(G, mat, stred, profil_rz, seg=32):
    """Rotačné teleso okolo zvislej osi z profilu [(r, z), …] zdola nahor (bez viek)."""
    cx, cy = stred
    for k in range(len(profil_rz) - 1):
        (r0, z0), (r1, z1) = profil_rz[k], profil_rz[k + 1]
        for i in range(seg):
            a0, a1 = 2 * math.pi * i / seg, 2 * math.pi * (i + 1) / seg
            G.plocha(mat, [(cx + r0 * math.cos(a0), cy + r0 * math.sin(a0), z0), (cx + r0 * math.cos(a1), cy + r0 * math.sin(a1), z0),
                           (cx + r1 * math.cos(a1), cy + r1 * math.sin(a1), z1), (cx + r1 * math.cos(a0), cy + r1 * math.sin(a0), z1)])


def nosnik(G, mat, a, b, w0, h0, w1=None, h1=None, hore=(0, 0, 1)):
    """Zužujúci sa nosník s obdĺžnikovým prierezom (w × h) z bodu a do b (3D)."""
    w1 = w0 if w1 is None else w1
    h1 = h0 if h1 is None else h1
    d = [b[i] - a[i] for i in range(3)]
    L = math.sqrt(sum(c * c for c in d)) or 1e-9
    d = [c / L for c in d]
    u = [d[1] * hore[2] - d[2] * hore[1], d[2] * hore[0] - d[0] * hore[2], d[0] * hore[1] - d[1] * hore[0]]
    lu = math.sqrt(sum(c * c for c in u)) or 1e-9
    u = [c / lu for c in u]
    v = [d[1] * u[2] - d[2] * u[1], d[2] * u[0] - d[0] * u[2], d[0] * u[1] - d[1] * u[0]]

    def rez(p, w, h):
        return [tuple(p[k] + s * u[k] * w / 2 + t * v[k] * h / 2 for k in range(3)) for s, t in ((1, -1), (1, 1), (-1, 1), (-1, -1))]
    A, B = rez(a, w0, h0), rez(b, w1, h1)
    for i in range(4):
        j = (i + 1) % 4
        G.plocha(mat, [A[i], A[j], B[j], B[i]])
    G.plocha(mat, list(reversed(A)))
    G.plocha(mat, B)


def lano(G, mat, a, b, r=0.15):
    """Lano/záves – tenký osemhranný valec medzi bodmi."""
    nosnik(G, mat, a, b, r * 2, r * 2)


def uloz_most(G, meno, d, kolizie=(), ao=True):
    """Objekt → AO vo vrcholoch → assets/pamiatky/<meno>.glb.gz + <meno>.json (dĺžka, kolízie v lokálnych X, Y)."""
    import gzip
    from spolocne import zapec_ao_vrcholy, exportuj
    from veze import GLTFPACK
    print(f'{meno}: {G.trojuholniky} trojuholníkov, {len(G.mat)} materiálov')
    ob = G.objekt(meno)
    if ao:
        zapec_ao_vrcholy(ob, vzorky=24, vzdialenost=5.0, minimum=0.35)
    ciel = os.path.join(KOREN, 'assets', 'pamiatky', f'{meno}.glb')
    exportuj(ob, ciel, GLTFPACK, farby_vrcholov=ao, bity_pozicii=16)
    with open(ciel, 'rb') as f, gzip.open(ciel + '.gz', 'wb', compresslevel=9) as g:
        g.write(f.read())
    os.remove(ciel)
    info = {'most': d['nazov'], 'dlzka': round(d['L'], 2),
            'kolizie': [[[round(x, 2), round(y, 2)] for x, y in k] for k in kolizie]}
    with open(os.path.join(KOREN, 'assets', 'pamiatky', f'{meno}.json'), 'w') as f:
        json.dump(info, f, separators=(',', ':'))
    print(f'{meno}.glb.gz: {os.path.getsize(ciel + ".gz") // 1024} kB')


def obdlznik_xy(x, y, sx, sy):
    return [(x - sx / 2, y - sy / 2), (x + sx / 2, y - sy / 2), (x + sx / 2, y + sy / 2), (x - sx / 2, y + sy / 2)]


def komorovy_nosnik(G, mat, x0, x1, pol, hlbka, spodok=None, konzola=0.9, obrubnik=0.25, sirka_obrubnika=0.5, krok=KROK):
    """Mostovka ako komorový nosník: konzoly do ±pol, šikmé steny k spodnej doske (±spodok/2),
    hlbka = číslo alebo funkcia x → hĺbka nosníka (náběhy pri pilieroch)."""
    sp = (spodok if spodok is not None else pol * 1.1) / 2
    stena = sp + (pol - sp) * 0.45

    def rez(x):
        D = hlbka(x) if callable(hlbka) else hlbka
        return [(-sp, -D), (sp, -D), (stena, -konzola), (pol, -konzola), (pol, obrubnik), (pol - sirka_obrubnika, obrubnik),
                (pol - sirka_obrubnika, -0.03), (-pol + sirka_obrubnika, -0.03), (-pol + sirka_obrubnika, obrubnik),
                (-pol, obrubnik), (-pol, -konzola), (-stena, -konzola)]
    profil(G, mat, x0, x1, rez, krok, uzavriet=True)


def piliere_pevniny(G, mat, x0, x1, rozostup, z_hore, sirka, hrubka=1.6, vynechaj=()):
    """Piliere estakády (na súši) – dva stĺpy s hlavicou, každých ~rozostup metrov."""
    out = []
    n = max(1, round((x1 - x0) / rozostup))
    for i in range(1, n):
        x = x0 + (x1 - x0) * i / n
        if any(a - 6 <= x <= b + 6 for a, b in vynechaj):
            continue
        for s in (1, -1):
            G.valec(mat, (x, s * sirka * 0.28), hrubka / 2, -30.0, z_hore - 1.0, seg=10)
        G.hranol(mat, obdlznik_xy(x, 0, hrubka + 0.6, sirka * 0.8), z_hore - 1.2, z_hore)
        out.append(x)
    return out
