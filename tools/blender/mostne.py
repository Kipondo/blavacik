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
OHYB_DO, OHYB_NAD = 12.0, 22.0   # ako js/mapa/pamiatky/most-glb.js: časti pri mostovke sa ohnú s profilom celé, vysoké nie


def data_mosta(nazov):
    """Os mosta z index.json (+ celá dĺžka a výškový profil z data/mapa/mosty-dunaj.json, tools/mesto/mosty-dunaj.mjs)
    + úseky nad riekou [(s0, s1), …] (s = metre od „od“)."""
    with open(os.path.join(KOREN, 'data', 'mapa', 'mesto', 'index.json'), encoding='utf8') as f:
        idx = json.load(f)
    m = next(x for x in idx['mosty'] if x['nazov'] == nazov)
    cesta = os.path.join(KOREN, 'data', 'mapa', 'mosty-dunaj.json')
    if os.path.exists(cesta):
        with open(cesta, encoding='utf8') as f:
            presne = {x['nazov']: x for x in json.load(f)['mosty']}
        m = {**m, **presne.get(nazov, {})}
    (ax, az), (bx, bz) = m['od'], m['do']
    # os: lomená čiara (most v oblúku – Most Apollo; model sa stavia rovno pozdĺž x a hra ho ohne podľa osi) alebo úsečka
    body_osi = m.get('os') or [m['od'], m['do']]
    S = [0.0]
    for p, q in zip(body_osi[:-1], body_osi[1:]):
        S.append(S[-1] + math.hypot(q[0] - p[0], q[1] - p[1]))
    L = S[-1]
    ux, uz = (bx - ax) / math.hypot(bx - ax, bz - az), (bz - az) / math.hypot(bx - ax, bz - az)

    def bod(s):
        i = 1
        while i < len(body_osi) - 1 and s > S[i]:
            i += 1
        t = (s - S[i - 1]) / max(1e-9, S[i] - S[i - 1])
        p, q = body_osi[i - 1], body_osi[i]
        return p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t
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
        v = vo_vode(*bod(s))
        if v and zac is None:
            zac = s
        if not v and zac is not None:
            useky.append((zac, s - 1))
            zac = None
    if zac is not None:
        useky.append((zac, int(L)))
    d = {**m, 'L': L, 'ux': ux, 'uz': uz, 'voda': useky, 'os_body': body_osi, 'os_s': S}
    body = m.get('profil')
    d['vrch'] = m.get('vrch', max(b[1] for b in body) if body else 0.0)
    d['zm'] = (lambda x: vyska_profilu(body, x) - d['vrch']) if body else (lambda x: 0.0)
    teren = m.get('teren')
    d['teren'] = (lambda x: _linearne(teren, x) - d['vrch']) if teren else (lambda x: -30.0)
    return d


def _linearne(body, x):
    """Lineárna interpolácia v zozname [(s, y), …] zoradenom podľa s."""
    if x <= body[0][0]:
        return body[0][1]
    for (s0, y0), (s1, y1) in zip(body[:-1], body[1:]):
        if x <= s1:
            return y0 + (y1 - y0) * (x - s0) / max(1e-9, s1 - s0)
    return body[-1][1]


def vyska_profilu(body, s):
    """Výška mostovky (hra) v polohe s – rovnaká krivka ako js/mapa/teren/mosty-vyskopisu.js (bod na zemi = odhad y)."""
    B = [(b[0], b[1]) for b in body]
    n = len(B)
    if s <= B[0][0]:
        return B[0][1]
    if s >= B[-1][0]:
        return B[-1][1]
    k = 0
    while k < n - 2 and s > B[k + 1][0]:
        k += 1
    ix = [max(0, k - 1), k, k + 1, min(n - 1, k + 2)]
    P = [B[i] for i in ix]
    y = [p[1] for p in P]
    h = P[2][0] - P[1][0]
    d = (y[2] - y[1]) / h if h > 0 else 0.0

    def dot(ya, yb, yc, sa, sb, sc):
        d0 = (yb - ya) / (sb - sa) if sb > sa else 0.0
        d1 = (yc - yb) / (sc - sb) if sc > sb else 0.0
        return 0.0 if d0 * d1 <= 0 else 2 * d0 * d1 / (d0 + d1)
    t1 = d if ix[0] == ix[1] else dot(y[0], y[1], y[2], P[0][0], P[1][0], P[2][0])
    t2 = d if ix[3] == ix[2] else dot(y[1], y[2], y[3], P[1][0], P[2][0], P[3][0])
    t = (s - P[1][0]) / h
    t2_, t3 = t * t, t * t * t
    return (2 * t3 - 3 * t2_ + 1) * y[1] + (t3 - 2 * t2_ + t) * h * t1 + (-2 * t3 + 3 * t2_) * y[2] + (t3 - t2_) * h * t2


def ohni_podla_profilu(G, d):
    """Model postavený vodorovne (mostovka z = 0) ohne podľa výškového profilu: časti pri mostovke celé, vysoké
    (pylón, oblúk) nie – ako ohýbanie v hre. V hre sa potom ohýba už len na koncoch (rozdiel terénu)."""
    zm = d['zm']
    d['ohnute'] = True
    out = []
    for x, y, z in G.v:
        w = 1.0 if z <= OHYB_DO else 0.0 if z >= OHYB_NAD else (OHYB_NAD - z) / (OHYB_NAD - OHYB_DO)
        out.append((x, y, z + w * zm(x)) if w > 0 else (x, y, z))
    G.v = out


def zem_modelu(d, x):
    """Terén pod osou vo vodorovnom modeli (mostovka z = 0 – pred ohnutím podľa profilu)."""
    return d['teren'](x) - d['zm'](x)


def piliere_estakady(G, mat, mat_hlava, d, x0, x1, rozostup, sirka, hrubka=1.6, stlpy=2, vynechaj=(), hlbka=2.0,
                     nad_zemou=4.0, okruhle=True, kolizie=None):
    """Piliere estakády na brehu (stĺpy s hlavicou) každých ~rozostup m tam, kde je mostovka vyššie ako nad_zemou nad
    terénom; nie nad riekou a v podjazdoch (vynechaj = [(s0, s1)]). Päta 2 m pod terénom (odhad z
    data/mapa/mosty-dunaj.json). Súradnice sú vo vodorovnom modeli (pred ohnutím). Vracia zoznam polôh."""
    out = []
    n = max(1, round((x1 - x0) / rozostup))
    for i in range(0, n + 1):
        x = x0 + (x1 - x0) * i / n
        if any(a - 3 <= x <= b + 3 for a, b in vynechaj) or any(a - 2 <= x <= b + 2 for a, b in d['voda']):
            continue
        zem = zem_modelu(d, x)
        if -zem < nad_zemou:
            continue
        for k in range(stlpy):
            yy = 0.0 if stlpy == 1 else (k / (stlpy - 1) - 0.5) * sirka * 0.6
            if okruhle:
                G.valec(mat, (x, yy), hrubka / 2, zem - 2.0, -hlbka - 0.8, seg=12)
            else:
                G.hranol(mat, obdlznik_xy(x, yy, hrubka, hrubka * 1.6), zem - 2.0, -hlbka - 0.8)
            if kolizie is not None:
                kolizie.append(obdlznik_xy(x, yy, hrubka + 0.2, hrubka * (1.6 if not okruhle else 1.0) + 0.2))
        G.hranol(mat_hlava, obdlznik_xy(x, 0, hrubka + 0.6, sirka * (0.8 if stlpy > 1 else 0.5)), -hlbka - 0.9, -hlbka + 0.02)
        out.append(x)
    return out


def opora(G, mat, d, x, smer, sirka, hlbka=2.0):
    """Opora na konci mosta: čelná stena od mostovky pod terén a krídla do strán (smer = +1 most pokračuje k +x)."""
    dno = min(zem_modelu(d, x) - 1.5, -hlbka - 1.0)
    G.hranol(mat, obdlznik_xy(x - smer * 1.0, 0, 2.0, sirka + 1.2), dno, -0.05)
    for s in (1, -1):
        y = s * (sirka / 2 + 0.3)
        a, b = sorted((x - smer * 1.8, x + smer * 6.0))
        G.hranol(mat, [(a, y - 0.3), (b, y - 0.3), (b, y + 0.3), (a, y + 0.3)], dno, 0.6)


def bocne_steny_nasypu(G, mat, d, x0, x1, sirka, krok=KROK):
    """Násyp pod nájazdom: betónové steny od okraja mostovky do terénu (zakryjú medzeru pod rampou)."""
    xs = delenie(x0, x1, krok)
    for a, b in zip(xs[:-1], xs[1:]):
        za, zb = zem_modelu(d, a) - 1.0, zem_modelu(d, b) - 1.0
        for s in (1, -1):
            y = s * sirka / 2
            if s > 0:
                G.plocha(mat, [(b, y, zb), (a, y, za), (a, y, -0.05), (b, y, -0.05)])
            else:
                G.plocha(mat, [(a, y, za), (b, y, zb), (b, y, -0.05), (a, y, -0.05)])


def lokalne(d, x, z):
    """Bod hry (x, z) → poloha pozdĺž osi s a bočne y (doľava kladné) v lokálnych súradniciach mosta (aj lomená os)."""
    B, S = d['os_body'], d['os_s']
    naj = None
    for i in range(1, len(B)):
        (ax, az), (bx, bz) = B[i - 1], B[i]
        l = S[i] - S[i - 1] or 1e-9
        ux, uz = (bx - ax) / l, (bz - az) / l
        dx, dz = x - ax, z - az
        t = dx * ux + dz * uz
        tt = min(max(t, 0 if i > 1 else -1e9), l if i < len(B) - 1 else 1e9)
        n = dx * (-uz) + dz * ux      # n = smer (−uz, ux) v hre = −Y v Blenderi
        d2 = (t - tt) ** 2 + n * n
        if naj is None or d2 < naj[0]:
            naj = (d2, S[i - 1] + t, -n)
    return naj[1], naj[2]


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


def uloz_most(G, meno, d, kolizie=(), ao=True, lavky=()):
    """Objekt → AO vo vrcholoch → assets/pamiatky/<meno>.glb.gz + <meno>.json (dĺžka, kolízie v lokálnych X, Y)."""
    import gzip
    from spolocne import zapec_ao_vrcholy, exportuj
    from veze import GLTFPACK
    if d.get('profil') and not d.get('ohnute'):
        ohni_podla_profilu(G, d)
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
    if d.get('profil'):
        # model je už ohnutý podľa profilu – hra ohýba len o rozdiel (terén na koncoch, js/mapa/pamiatky/most-glb.js)
        info['vrch'] = round(d['vrch'], 2)
        info['profil'] = [[round(x, 1), round(d['zm'](x), 3)] for x in delenie(0.0, d['L'], 5.0)]
    if lavky:
        # pochôdzne lávky pod mostovkou: { y (os lávky v lokálnom Y), sirka, od, do, pod (m pod vozovkou) } –
        # hra z nich urobí pochôdzne plochy (js/mapa/pamiatky/most-glb.js → js/mapa/mosty/pochodzne-pamiatok.js)
        info['lavky'] = [{k: round(v, 2) for k, v in l.items()} for l in lavky]
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
