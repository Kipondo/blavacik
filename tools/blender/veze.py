# Spoločné pomôcky pre výškové budovy (tools/blender/vyskove/*.py).
#
# Budova sa skladá z plôch zozbieraných v triede Geo (bez zdieľaných vrcholov → ostré hrany),
# na konci sa z nich spraví jeden objekt s materiálmi, zatienenie (AO) sa zapečie do farieb
# vrcholov (bez UV a textúr – na budovu so stovkami metrov fasády to stačí a je to malé)
# a exportuje sa .glb zmenšený cez gltfpack.
#
# Súradnice: obrysy z OSM (tools/blender/osm_obrysy.mjs → data/obrysy.json) sú v metroch hry
# (x východ, z juh). V Blenderi je X = x − stred, Y = −(z − stred), Z hore; obrysy sú proti
# smeru hodinových ručičiek (CCW), takže „von“ je vpravo od smeru obrysu.
#
# Fasády sa skladajú z panelov ako v skutočnosti: obrys sa rozdelí na body po šírke panelu
# (rovné hrany ostanú rovné, oblúky sa vyhladia), sklo je vnorené za líce rámu, stĺpiky stoja
# v každom bode, priečky na každom podlaží. Panely skla sú nepatrne natočené (± pár tisícin
# radiánu) – odraz oblohy sa na nich láme ako na skutočnej závesovej stene.

import json
import math
import os
import random

import bpy

from spolocne import material, zapec_ao_vrcholy, exportuj

KOREN = os.path.normpath(os.path.join(os.path.dirname(__file__), '..', '..'))
GLTFPACK = os.environ.get('GLTFPACK', '/tmp/gp/node_modules/.bin/gltfpack')


# --- 2D geometria obrysov -----------------------------------------------------

def plocha_obrysu(b):
    return sum(b[i - 1][0] * b[i][1] - b[i][0] * b[i - 1][1] for i in range(len(b))) / 2


def ccw(b):
    return list(b) if plocha_obrysu(b) > 0 else list(reversed(b))


def z_hry(body, stred):
    """Obrys z metrov hry [[x, z], …] do roviny Blendera (CCW) okolo stredu."""
    return ccw([(x - stred[0], -(z - stred[1])) for x, z in body])


def do_hry(body):
    """Body Blendera späť do lokálnych metrov hry (pre kolízie a náhradu budov v hre)."""
    return [[round(x, 2), round(-y, 2)] for x, y in body]


def stred_obrysu(b):
    a = plocha_obrysu(b)
    cx = cy = 0.0
    for i in range(len(b)):
        x0, y0 = b[i - 1]
        x1, y1 = b[i]
        k = x0 * y1 - x1 * y0
        cx += (x0 + x1) * k
        cy += (y0 + y1) * k
    return (cx / (6 * a), cy / (6 * a))


def dlzka(a, b):
    return math.hypot(b[0] - a[0], b[1] - a[1])


def normala(a, b):
    """Jednotková normála hrany a→b smerom von (vpravo) pri CCW obryse."""
    d = dlzka(a, b) or 1e-9
    return ((b[1] - a[1]) / d, -(b[0] - a[0]) / d)


def odsad(linia, d, uzavreta=True):
    """Posunie líniu o d von (záporné d = dnu), rohy s pokosom."""
    n = len(linia)
    out = []
    for i in range(n):
        if not uzavreta and i == 0:
            n2 = normala(linia[0], linia[1])
            out.append((linia[0][0] + n2[0] * d, linia[0][1] + n2[1] * d))
            continue
        if not uzavreta and i == n - 1:
            n1 = normala(linia[-2], linia[-1])
            out.append((linia[-1][0] + n1[0] * d, linia[-1][1] + n1[1] * d))
            continue
        a, b, c = linia[i - 1], linia[i], linia[(i + 1) % n]
        n1, n2 = normala(a, b), normala(b, c)
        mx, my = n1[0] + n2[0], n1[1] + n2[1]
        l = math.hypot(mx, my)
        if l < 1e-9:
            mx, my = n1
        else:
            mx, my = mx / l, my / l
        k = max(0.3, mx * n1[0] + my * n1[1])
        out.append((b[0] + mx * d / k, b[1] + my * d / k))
    return out


def smer_v_bode(linia, i):
    """Jednotková dotyčnica línie v bode i (priemer susedných hrán)."""
    n = len(linia)
    a, b, c = linia[i - 1], linia[i], linia[(i + 1) % n]
    d1, d2 = dlzka(a, b) or 1e-9, dlzka(b, c) or 1e-9
    tx = (b[0] - a[0]) / d1 + (c[0] - b[0]) / d2
    ty = (b[1] - a[1]) / d1 + (c[1] - b[1]) / d2
    l = math.hypot(tx, ty) or 1e-9
    return (tx / l, ty / l)


def zjednodus(b, tol=0.5):
    """Douglas–Peucker pre uzavretý obrys (zahodí drobné zúbky z OSM)."""
    def dp(body):
        if len(body) < 3:
            return body
        a, z = body[0], body[-1]
        dmax, imax = 0.0, 0
        L = dlzka(a, z) or 1e-9
        for i in range(1, len(body) - 1):
            p = body[i]
            dd = abs((z[0] - a[0]) * (a[1] - p[1]) - (a[0] - p[0]) * (z[1] - a[1])) / L
            if dd > dmax:
                dmax, imax = dd, i
        if dmax <= tol:
            return [a, z]
        return dp(body[:imax + 1])[:-1] + dp(body[imax:])
    # začni v najvzdialenejšom bode od prvého (stabilné rozdelenie uzavretého obrysu)
    k = max(range(len(b)), key=lambda i: dlzka(b[0], b[i]))
    prva = dp(b[:k + 1])
    druha = dp(b[k:] + [b[0]])
    return prva[:-1] + druha[:-1]


def rozdel(obrys, krok):
    """Body po obryse po ~krok metroch; vracia (body, rohy) – rohy[i] = bod je pôvodný vrchol."""
    body, rohy = [], []
    n = len(obrys)
    for i in range(n):
        a, b = obrys[i], obrys[(i + 1) % n]
        k = max(1, round(dlzka(a, b) / krok))
        for j in range(k):
            t = j / k
            body.append((a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t))
            rohy.append(j == 0)
    return body, rohy


def hladka(obrys, krok, hustota=24):
    """Vyhladený uzavretý obrys (centripetálny Catmull–Rom) rozdelený rovnomerne po ~krok metroch."""
    n = len(obrys)
    hust = []
    for i in range(n):
        p0, p1, p2, p3 = obrys[i - 1], obrys[i], obrys[(i + 1) % n], obrys[(i + 2) % n]
        t0 = 0.0
        t1 = t0 + max(1e-4, dlzka(p0, p1)) ** 0.5
        t2 = t1 + max(1e-4, dlzka(p1, p2)) ** 0.5
        t3 = t2 + max(1e-4, dlzka(p2, p3)) ** 0.5
        for s in range(hustota):
            t = t1 + (t2 - t1) * s / hustota
            def lerp(a, b, ta, tb):
                return tuple(a[k] * (tb - t) / (tb - ta) + b[k] * (t - ta) / (tb - ta) for k in range(2))
            a1, a2, a3 = lerp(p0, p1, t0, t1), lerp(p1, p2, t1, t2), lerp(p2, p3, t2, t3)
            b1, b2 = lerp(a1, a2, t0, t2), lerp(a2, a3, t1, t3)
            hust.append(lerp(b1, b2, t1, t2))
    # rovnomerné prevzorkovanie po dĺžke
    L = [0.0]
    for i in range(len(hust)):
        L.append(L[-1] + dlzka(hust[i], hust[(i + 1) % len(hust)]))
    pocet = max(8, round(L[-1] / krok))
    out, j = [], 0
    for k in range(pocet):
        s = L[-1] * k / pocet
        while L[j + 1] < s:
            j += 1
        a, b = hust[j], hust[(j + 1) % len(hust)]
        t = (s - L[j]) / max(1e-9, L[j + 1] - L[j])
        out.append((a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t))
    return out


def bod_na_linii(linia, t):
    """Bod a dotyčnica na uzavretej línii v parametri t ∈ <0, 1) (podľa dĺžky)."""
    n = len(linia)
    L = [0.0]
    for i in range(n):
        L.append(L[-1] + dlzka(linia[i], linia[(i + 1) % n]))
    s = (t % 1.0) * L[-1]
    i = 0
    while i < n - 1 and L[i + 1] < s:
        i += 1
    a, b = linia[i], linia[(i + 1) % n]
    u = (s - L[i]) / max(1e-9, L[i + 1] - L[i])
    d = dlzka(a, b) or 1e-9
    return (a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u), ((b[0] - a[0]) / d, (b[1] - a[1]) / d)


def urovne(z0, *skupiny):
    """Výšky podlaží: urovne(0, (1, 6.0), (28, 3.8)) → [0, 6, 9.8, …]."""
    z = [z0]
    for pocet, v in skupiny:
        for _ in range(pocet):
            z.append(z[-1] + v)
    return z


# --- zberač geometrie -----------------------------------------------------------

class Geo:
    def __init__(self):
        self.v, self.f, self.fm, self.mat = [], [], [], []

    def _mi(self, mat):
        for i, m in enumerate(self.mat):
            if m is mat:
                return i
        self.mat.append(mat)
        return len(self.mat) - 1

    def plocha(self, mat, body):
        i0 = len(self.v)
        self.v.extend((float(b[0]), float(b[1]), float(b[2])) for b in body)
        self.f.append(tuple(range(i0, i0 + len(body))))
        self.fm.append(self._mi(mat))

    def stena(self, mat, a, b, z0, z1):
        """Zvislý obdĺžnik nad úsečkou a→b, lícom von (vpravo od smeru a→b)."""
        self.plocha(mat, [(a[0], a[1], z0), (b[0], b[1], z0), (b[0], b[1], z1), (a[0], a[1], z1)])

    def panel(self, mat, a, b, z0, z1, rnd=None, naklon=0.0):
        """Ako stena, ale nepatrne natočená okolo stredu (lom odrazu na sklenenej fasáde)."""
        if not rnd or not naklon:
            return self.stena(mat, a, b, z0, z1)
        nx, ny = normala(a, b)
        w, h = dlzka(a, b), z1 - z0
        au, av = rnd.uniform(-naklon, naklon), rnd.uniform(-naklon, naklon)

        def bod(p, u, v, z):
            o = au * (u - 0.5) * w + av * (v - 0.5) * h
            return (p[0] + nx * o, p[1] + ny * o, z)
        self.plocha(mat, [bod(a, 0, 0, z0), bod(b, 1, 0, z0), bod(b, 1, 1, z1), bod(a, 0, 1, z1)])

    def vodorovna(self, mat, obrys, z, hore=True):
        body = [(p[0], p[1], z) for p in obrys]
        self.plocha(mat, body if hore else list(reversed(body)))

    def hranol(self, mat, obrys, z0, z1, vrch=True, spodok=False, mat_vrch=None):
        n = len(obrys)
        for i in range(n):
            self.stena(mat, obrys[i], obrys[(i + 1) % n], z0, z1)
        if vrch:
            self.vodorovna(mat_vrch or mat, obrys, z1)
        if spodok:
            self.vodorovna(mat, obrys, z0, hore=False)

    def kvader(self, mat, stred, smer, sirka, hlbka, z0, z1, vrch=True, spodok=False, mat_vrch=None):
        """Kváder: stred podstavy (x, y), smer = jednotková os šírky v rovine XY."""
        ux, uy = smer
        vx, vy = -uy, ux
        hs, hh = sirka / 2, hlbka / 2
        c = stred
        obrys = [(c[0] - ux * hs - vx * hh, c[1] - uy * hs - vy * hh),
                 (c[0] + ux * hs - vx * hh, c[1] + uy * hs - vy * hh),
                 (c[0] + ux * hs + vx * hh, c[1] + uy * hs + vy * hh),
                 (c[0] - ux * hs + vx * hh, c[1] - uy * hs + vy * hh)]
        self.hranol(mat, obrys, z0, z1, vrch=vrch, spodok=spodok, mat_vrch=mat_vrch)

    def pas(self, mat, linia, z0, z1, von, dnu=0.0, vrch=True, spodok=True, uzavreta=True, rozsah=None):
        """Vodorovný pás okolo línie (rímsa, okraj stropnej dosky, priečka): od −dnu po +von."""
        O, I = odsad(linia, von, uzavreta), odsad(linia, -dnu, uzavreta)
        n = len(linia)
        indexy = rozsah if rozsah is not None else range(n if uzavreta else n - 1)
        for i in indexy:
            j = (i + 1) % n
            self.stena(mat, O[i], O[j], z0, z1)
            if vrch:
                self.plocha(mat, [(I[i][0], I[i][1], z1), (O[i][0], O[i][1], z1), (O[j][0], O[j][1], z1), (I[j][0], I[j][1], z1)])
            if spodok:
                self.plocha(mat, [(I[j][0], I[j][1], z0), (O[j][0], O[j][1], z0), (O[i][0], O[i][1], z0), (I[i][0], I[i][1], z0)])
        if not uzavreta:
            for i, s in ((0, -1), (n - 1, 1)):
                a, b = (O[i], I[i]) if s < 0 else (I[i], O[i])
                self.stena(mat, a, b, z0, z1)

    def valec(self, mat, stred, r, z0, z1, seg=12, vrch=True, r1=None):
        r1 = r if r1 is None else r1
        for i in range(seg):
            a0, a1 = 2 * math.pi * i / seg, 2 * math.pi * (i + 1) / seg
            p = [(stred[0] + r * math.cos(a0), stred[1] + r * math.sin(a0), z0),
                 (stred[0] + r * math.cos(a1), stred[1] + r * math.sin(a1), z0),
                 (stred[0] + r1 * math.cos(a1), stred[1] + r1 * math.sin(a1), z1),
                 (stred[0] + r1 * math.cos(a0), stred[1] + r1 * math.sin(a0), z1)]
            self.plocha(mat, p)
        if vrch and r1 > 1e-4:
            self.plocha(mat, [(stred[0] + r1 * math.cos(2 * math.pi * i / seg), stred[1] + r1 * math.sin(2 * math.pi * i / seg), z1) for i in range(seg)])

    def tram(self, mat, a, b, hrubka):
        """Šikmý trám (štvorhranný) medzi bodmi a, b (x, y, z)."""
        dx, dy, dz = b[0] - a[0], b[1] - a[1], b[2] - a[2]
        L = math.sqrt(dx * dx + dy * dy + dz * dz) or 1e-9
        d = (dx / L, dy / L, dz / L)
        pom = (0, 0, 1) if abs(d[2]) < 0.9 else (1, 0, 0)
        u = (d[1] * pom[2] - d[2] * pom[1], d[2] * pom[0] - d[0] * pom[2], d[0] * pom[1] - d[1] * pom[0])
        lu = math.sqrt(sum(c * c for c in u))
        u = tuple(c / lu * hrubka / 2 for c in u)
        v = (d[1] * u[2] - d[2] * u[1], d[2] * u[0] - d[0] * u[2], d[0] * u[1] - d[1] * u[0])
        rohy = [(1, 1), (-1, 1), (-1, -1), (1, -1)]
        A = [tuple(a[k] + s * u[k] + t * v[k] for k in range(3)) for s, t in rohy]
        B = [tuple(b[k] + s * u[k] + t * v[k] for k in range(3)) for s, t in rohy]
        for i in range(4):
            j = (i + 1) % 4
            self.plocha(mat, [A[i], A[j], B[j], B[i]])
        self.plocha(mat, list(reversed(A)))
        self.plocha(mat, B)

    def zaluzie(self, mat, linia, z0, z1, rozostup=0.3, hlbka=0.12, hrubka=0.04, von=0.0, uzavreta=True):
        """Vodorovné lamely (technické podlažie, žalúzie) okolo línie."""
        z = z0 + rozostup / 2
        while z < z1:
            self.pas(mat, linia, z - hrubka / 2, z + hrubka / 2, von + hlbka / 2, dnu=hlbka / 2 - von, uzavreta=uzavreta)
            z += rozostup

    def objekt(self, meno):
        me = bpy.data.meshes.new(meno)
        me.from_pydata(self.v, [], self.f)
        me.update()
        ob = bpy.data.objects.new(meno, me)
        bpy.context.scene.collection.objects.link(ob)
        for m in self.mat:
            me.materials.append(m)
        me.polygons.foreach_set('material_index', self.fm)
        me.update()
        return ob

    @property
    def trojuholniky(self):
        return sum(len(f) - 2 for f in self.f)


# --- fasády ------------------------------------------------------------------------

def zavesova_stena(G, linia, urovne_z, *, sklo, ram, vnor=0.15, parapet=0.0, mat_parapet=None,
                   stlpik=0.07, priecka=0.1, naklon=0.003, seed=1, stlpiky=True, priecky=True,
                   indexy=None, uzavreta=True, stlpik_kazdy=1, segment_stlpika=3, obrys_priecok=None):
    """Závesová stena: sklo vnorené `vnor` za líniu (vonkajšie líce rámu), stĺpiky v bodoch línie,
    priečky na úrovniach. `sklo` je materiál alebo funkcia (i, k, rnd) → materiál
    (i = panel po obvode, k = podlažie). Parapet = nepriehľadný pás na spodku podlažia."""
    rnd = random.Random(seed)
    S = odsad(linia, -vnor, uzavreta)
    n = len(linia)
    rozsah = list(indexy) if indexy is not None else list(range(n if uzavreta else n - 1))
    for k in range(len(urovne_z) - 1):
        z0, z1 = urovne_z[k], urovne_z[k + 1]
        for i in rozsah:
            j = (i + 1) % n
            mat = sklo(i, k, rnd) if callable(sklo) else sklo
            if mat is None:
                continue
            zp = z0 + parapet
            if parapet > 0:
                G.panel(mat_parapet or ram, S[i], S[j], z0, zp, rnd, naklon)
            G.panel(mat, S[i], S[j], zp, z1, rnd, naklon)
    z_dole, z_hore = urovne_z[0], urovne_z[-1]
    if stlpiky:
        if uzavreta:
            body = sorted(set(rozsah) | {(i + 1) % n for i in rozsah})
        else:
            body = sorted(set(rozsah) | {i + 1 for i in rozsah})
        for i in body:
            if i % stlpik_kazdy:
                continue
            if uzavreta or 0 < i < n - 1:
                t = smer_v_bode(linia, i)
            else:
                a, b = (linia[0], linia[1]) if i == 0 else (linia[-2], linia[-1])
                d = dlzka(a, b) or 1e-9
                t = ((b[0] - a[0]) / d, (b[1] - a[1]) / d)
            p, s = linia[i], S[i]
            stred = ((p[0] + s[0]) / 2, (p[1] + s[1]) / 2)
            hl = dlzka(p, s) + 0.04
            for k0 in range(0, len(urovne_z) - 1, segment_stlpika):
                k1 = min(len(urovne_z) - 1, k0 + segment_stlpika)
                G.kvader(ram, stred, t, stlpik, hl, urovne_z[k0], urovne_z[k1], vrch=(k1 == len(urovne_z) - 1))
    if priecky:
        # priečky po hrubom obryse (rovné hrany jedným kusom), inak po bodoch línie
        P = odsad(obrys_priecok, -vnor, uzavreta) if obrys_priecok else S
        rz = None if obrys_priecok else rozsah
        for z in urovne_z:
            G.pas(ram, P, z - priecka / 2, z + priecka / 2, von=vnor * 0.8, dnu=0.0,
                  uzavreta=uzavreta, rozsah=rz, spodok=z > z_dole + 0.1)


def kamenna_fasada(G, obrys, urovne_z, *, kamen, sklo, ram, parapet=1.15, preklad=0.4, vnor=0.25,
                   krok=1.6, naklon=0.002, seed=7):
    """Kamenný obklad s pásovými oknami: na každom podlaží kamenný parapet a preklad v líci obrysu,
    medzi nimi pás okien vnorený o `vnor` (so spodným a horným ostením) a okenné stĺpiky."""
    rnd = random.Random(seed)
    I = odsad(obrys, -vnor)
    linia, _ = rozdel(I, krok)
    n = len(linia)
    for k in range(len(urovne_z) - 1):
        z0, z1 = urovne_z[k], urovne_z[k + 1]
        a, b = z0 + parapet, z1 - preklad
        G.pas(kamen, I, z0, a, von=vnor, spodok=(k == 0), vrch=True)
        G.pas(kamen, I, b, z1, von=vnor, spodok=True, vrch=False)
        for i in range(n):
            G.panel(sklo, linia[i], linia[(i + 1) % n], a, b, rnd, naklon)
        for i in range(n):
            G.kvader(ram, linia[i], smer_v_bode(linia, i), 0.07, 0.12, a, b, vrch=False)


def cast_budovy(G, obrys, z_od, z_do, styl, M, strecha_na=True, atika=1.0):
    """Jedna časť budovy (building:part) daným štýlom fasády + plochá strecha s atikou.
    styl: ('sklo', urovne) | ('kamen', urovne); M = slovník materiálov."""
    druh, urovne_z = styl
    if druh == 'sklo':
        linia, _ = rozdel(obrys, 1.5)
        zavesova_stena(G, linia, urovne_z, sklo=M['sklo'], ram=M['detail'], vnor=0.15, stlpik=0.06,
                       priecka=0.1, parapet=0.35, mat_parapet=M['parapet'], seed=len(obrys) * 7 + int(z_do),
                       obrys_priecok=obrys)
    else:
        kamenna_fasada(G, obrys, urovne_z, kamen=M['kamen'], sklo=M['sklo_okna'], ram=M['detail'])
    if strecha_na:
        strecha(G, obrys, z_do, M['strecha'], M['atika'], atika=atika)


def strecha(G, obrys, z, mat_strecha, mat_atika, atika=1.1, hrubka_atiky=0.3, von=0.0):
    """Plochá strecha s atikou (obrys = vonkajšie líce)."""
    vnutro = odsad(obrys, -hrubka_atiky)
    G.vodorovna(mat_strecha, vnutro, z + 0.05)
    O = odsad(obrys, von) if von else obrys
    n = len(obrys)
    for i in range(n):
        j = (i + 1) % n
        G.stena(mat_atika, O[i], O[j], z, z + atika)
        G.stena(mat_atika, vnutro[j], vnutro[i], z, z + atika)
        G.plocha(mat_atika, [(vnutro[i][0], vnutro[i][1], z + atika), (O[i][0], O[i][1], z + atika),
                             (O[j][0], O[j][1], z + atika), (vnutro[j][0], vnutro[j][1], z + atika)])


def strojovna(G, stred, smer, sirka, hlbka, z, vyska, mat_steny, mat_lamely, mat_strecha):
    """Technická nadstavba na streche: kváder obalený lamelami."""
    G.kvader(mat_steny, stred, smer, sirka - 0.3, hlbka - 0.3, z, z + vyska, mat_vrch=mat_strecha)
    ux, uy = smer
    vx, vy = -uy, ux
    hs, hh = sirka / 2, hlbka / 2
    c = stred
    obrys = [(c[0] - ux * hs - vx * hh, c[1] - uy * hs - vy * hh), (c[0] + ux * hs - vx * hh, c[1] + uy * hs - vy * hh),
             (c[0] + ux * hs + vx * hh, c[1] + uy * hs + vy * hh), (c[0] - ux * hs + vx * hh, c[1] - uy * hs + vy * hh)]
    G.zaluzie(mat_lamely, obrys, z + 0.2, z + vyska - 0.2, rozostup=0.28, hlbka=0.14)


def vystrazne_svetla(G, body, z, mat):
    """Červené výstražné svetlá pre lietadlá (malé kocky so svietiacim materiálom)."""
    for p in body:
        G.kvader(mat, p, (1, 0), 0.35, 0.35, z, z + 0.35)


# --- materiály ----------------------------------------------------------------------

def svetlo(meno, farba, sila=4.0):
    m = material(meno, farba, drsnost=0.5)
    p = m.node_tree.nodes.get('Principled BSDF')
    r, g, b = (int(farba[i:i + 2], 16) / 255 for i in (1, 3, 5))
    p.inputs['Emission Color'].default_value = (r, g, b, 1)
    p.inputs['Emission Strength'].default_value = sila
    return m


def sklo(meno, farba, drsnost=0.06, kov=0.85):
    """Sklo fasády: v hre nepriehľadné, lesklé – odráža oblohu (envMap). Meno začína „sklo“."""
    return material(meno if meno.startswith('sklo') else 'sklo-' + meno, farba, drsnost=drsnost, kov=kov)


# --- uloženie ---------------------------------------------------------------------

def uloz(G, meno, obrysy_hry, vyska, ao=True, vzorky=24, vzdialenost=4.0, minimum=0.35, info=None):
    """Spraví objekt, zapečie AO do vrcholov, exportuje assets/pamiatky/<meno>.glb a k nemu
    <meno>.json (obrysy v lokálnych metroch hry – pre kolízie a vynechanie budov z dlaždíc)."""
    print(f'{meno}: {G.trojuholniky} trojuholníkov, {len(G.mat)} materiálov')
    ob = G.objekt(meno)
    if ao:
        zapec_ao_vrcholy(ob, vzorky=vzorky, vzdialenost=vzdialenost, minimum=minimum)
    ciel = os.path.join(KOREN, 'assets', 'pamiatky', f'{meno}.glb')
    exportuj(ob, ciel, GLTFPACK, farby_vrcholov=ao)
    # meshopt sa ďalej dobre zbalí gzipom (5–8×); GitHub Pages .glb sám nebalí → ukladáme .glb.gz
    import gzip
    with open(ciel, 'rb') as f, gzip.open(ciel + '.gz', 'wb', compresslevel=9) as g:
        g.write(f.read())
    os.remove(ciel)
    velkost = os.path.getsize(ciel + '.gz')
    data = {'obrysy': [do_hry(o) for o in obrysy_hry], 'vyska': round(vyska, 1)}
    if info:
        data.update(info)
    with open(os.path.join(KOREN, 'assets', 'pamiatky', f'{meno}.json'), 'w') as f:
        json.dump(data, f, separators=(',', ':'))
    print(f'{meno}.glb.gz: {velkost // 1024} kB')
    return ob


def nacitaj_obrysy():
    with open(os.path.join(os.path.dirname(__file__), 'data', 'obrysy.json')) as f:
        return json.load(f)
