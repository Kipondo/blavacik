# Modely vlakov pre Hlavnú stanicu (úloha A2) – Blender ovládaný skriptom:
#   blender -b --factory-startup -P tools/blender/vlaky_blender.py
# Výstup: assets/vlaky/vlaky.glb – jeden súbor, v ňom objekty podľa vozňa (+ zjednodušené „…-lod1“ do diaľky):
#   lok-361      lokomotíva podľa radu 361 (červená s bielym pásom, dve sklá v čele, zberač)
#   voz-ic       osobný vozeň červeno-biely (diaľkové vlaky, Košice)
#   671-celo     riadiaci/hnací vozeň dvojpodlažnej jednotky podľa radu 671 (svetlosivá, červený pás, červené čelo)
#   671-stred    stredný dvojpodlažný vozeň
#   reg-celo     čelný vozeň všeobecnej regionálnej jednotky (biela, červený pás, červená maska, žltý nárazník)
#   reg-stred    stredný vozeň regionálnej jednotky
# Farby približne ako vozidlá ZSSK, BEZ loga a nápisov dopravcu. Rozmery: dĺžky a šírky podľa skutočných radov
# (361: 16,8 m; vozeň 26,4 m; 671: 3 × 26,4 m; regionálna 3 × 21 m), výšky zaokrúhlené.
# Os vozňa: počiatok v strede vozňa na temene koľajnice, čelo smeruje na −Y Blendera (= +z v hre).
# V hre (js/vlaky/modely.js) sa siete zlúčia do farieb vrcholov a kreslia ako inštancie (1 volanie na typ vozňa).

import math
import os
import subprocess
import sys

import bpy
import bmesh

TU = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, TU)
from spolocne import vycisti, material, objekt_z_bmesh, spoj  # noqa: E402

KOREN = os.path.normpath(os.path.join(TU, '..', '..'))
CIEL = os.path.join(KOREN, 'assets', 'vlaky', 'vlaky.glb')
GLTFPACK = os.environ.get('GLTFPACK', '/tmp/gp/node_modules/.bin/gltfpack')

M = {}
ZLOMY = []        # výšky hraníc farebných pásov aktuálneho vozňa – prierez má na bočnici body práve tam


def mat(meno, farba, drsnost=0.6, kov=0.1):
    if meno not in M:
        M[meno] = material(meno, farba, drsnost, kov)
    return M[meno]


def farby():
    mat('lak-biela', '#eef0f1', 0.45, 0.1)
    mat('lak-sediva', '#d9dcdf', 0.45, 0.15)
    mat('lak-cervena', '#c41e2b', 0.42, 0.1)
    mat('lak-cervena-tmava', '#a5161f', 0.45, 0.1)
    mat('spodok', '#3a3e43', 0.8, 0.2)
    mat('strecha', '#9fa4a8', 0.7, 0.3)
    mat('sklo', '#1d2833', 0.08, 0.6)
    mat('dvere', '#5a5f65', 0.5, 0.2)
    mat('podvozok', '#2a2c2f', 0.85, 0.4)
    mat('koleso', '#5b5550', 0.5, 0.7)
    mat('zlta', '#f2c21b', 0.5, 0.1)
    mat('svetlo', '#fff6dc', 0.2, 0.0)
    mat('zberac', '#7d8288', 0.5, 0.6)


# ---------------------------------------------------------------- telo vozňa (lofting prierezov)

def prierez(W, H, dno, hs, zuz=1.0, vrch=None, dole=0.0):
    """Uzavretý prierez (x, z) zľava dole proti smeru hodín: bočnica do výšky hs, oblá strecha do H.
    zuz = zúženie šírky (čelo), vrch = znížená výška strechy (sklon čela), dole = zaoblenie spodku (čelo)."""
    w = W / 2 * zuz
    H2 = H if vrch is None else vrch
    hs2 = min(hs, H2 - 0.15)
    z0 = dno + dole + 0.25
    # rovnaký počet bodov v každom priereze (lofting) – hranice pásov sa len orežú do bočnice
    body = [(-w + dole, dno), (-w, z0)] + [(-w, min(max(z, z0 + 0.01), hs2 - 0.01)) for z in sorted(ZLOMY)] + [(-w, hs2)]
    n = 6
    for i in range(1, n):
        a = math.pi / 2 * i / n
        body.append((-w + (w * 0.82) * (1 - math.cos(a)) * 1.0 + 0 * a, hs2 + (H2 - hs2) * math.sin(a)))
    body.append((0, H2))
    prava = [(-x, z) for x, z in reversed(body[:-1])]
    return body + prava


def pasy_vozna(pasy):
    """Nastaví hranice farebných pásov pre prierezy vozňa (volať pred stavbou prierezov)."""
    ZLOMY[:] = [z for z, _ in pasy[:-1]]
    return pasy


def loft(meno, rezy, pasy, cela=True):
    """Spojí prierezy [(y, [(x, z)…])] do telesa. Materiál plochy podľa výšky stredu (pasy) a smeru normály.
    pasy: zoznam (z_do, materiál) od spodku; strecha (normála hore) = 'strecha'."""
    bm = bmesh.new()
    kruhy = []
    for y, body in rezy:
        kruhy.append([bm.verts.new((x, y, z)) for x, z in body])
    n = len(rezy[0][1])
    for k in range(len(kruhy) - 1):
        for i in range(n):
            j = (i + 1) % n
            bm.faces.new((kruhy[k][i], kruhy[k][j], kruhy[k + 1][j], kruhy[k + 1][i]))
    if cela:
        bm.faces.new(list(reversed(kruhy[0])))
        bm.faces.new(kruhy[-1])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    ob = objekt_z_bmesh(meno, bm)
    mats = []
    for _, m in pasy:
        if m.name not in [x.name for x in mats]:
            mats.append(m)
    for extra in (M['strecha'],):
        if extra not in mats:
            mats.append(extra)
    for m in mats:
        ob.data.materials.append(m)
    idx = {m.name: i for i, m in enumerate(mats)}
    for p in ob.data.polygons:
        z = p.center.z
        m = pasy[-1][1]
        for z_do, mm in pasy:
            if z <= z_do:
                m = mm
                break
        if p.normal.z > 0.75:
            m = M['strecha']
        p.material_index = idx[m.name]
    return ob


def doska(meno, x, y0, y1, z0, z1, m, strana=1, hrubka=0.03):
    """Tenký obdĺžnik na boku vozňa (okno, dvere, pás) – trochu pred povrchom."""
    bm = bmesh.new()
    xa, xb = x, x + strana * hrubka
    v = [bm.verts.new(p) for p in ((xa, y0, z0), (xa, y1, z0), (xa, y1, z1), (xa, y0, z1),
                                   (xb, y0, z0), (xb, y1, z0), (xb, y1, z1), (xb, y0, z1))]
    for f in ((0, 1, 2, 3), (4, 7, 6, 5), (0, 4, 5, 1), (1, 5, 6, 2), (2, 6, 7, 3), (3, 7, 4, 0)):
        bm.faces.new([v[i] for i in f])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return objekt_z_bmesh(meno, bm, m)


def kvad(meno, cx, cy, cz, sx, sy, sz, m):
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    bmesh.ops.scale(bm, vec=(sx, sy, sz), verts=bm.verts)
    bmesh.ops.translate(bm, vec=(cx, cy, cz), verts=bm.verts)
    return objekt_z_bmesh(meno, bm, m)


def valec_x(meno, cx, cy, cz, r, d, m, seg=10):
    """Valec s osou X (koleso, nárazník)."""
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=True, segments=seg, radius1=r, radius2=r, depth=d)
    bmesh.ops.rotate(bm, cent=(0, 0, 0), matrix=__import__('mathutils').Matrix.Rotation(math.pi / 2, 3, 'Y'), verts=bm.verts)
    bmesh.ops.translate(bm, vec=(cx, cy, cz), verts=bm.verts)
    return objekt_z_bmesh(meno, bm, m)


def valec_y(meno, cx, cy, cz, r, d, m, seg=8):
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=True, segments=seg, radius1=r, radius2=r, depth=d)
    bmesh.ops.rotate(bm, cent=(0, 0, 0), matrix=__import__('mathutils').Matrix.Rotation(math.pi / 2, 3, 'X'), verts=bm.verts)
    bmesh.ops.translate(bm, vec=(cx, cy, cz), verts=bm.verts)
    return objekt_z_bmesh(meno, bm, m)


def celo_panel(casti, L, strana, z0, z1, sirka, m, x=0.0, hlbka=0.04):
    """Tenký panel na čelnej stene vozňa (sklo, maska, pás, svetlo) – tesne pred špicou na strane −1 / +1."""
    casti.append(kvad('čelo', x, strana * (L / 2 + hlbka / 2), (z0 + z1) / 2, sirka, hlbka, z1 - z0, m))


def podvozok(casti, y, rozvor=2.6, r=0.46, sirka=1.435):
    casti.append(kvad('rám', 0, y, 0.62, 2.2, rozvor + 0.9, 0.34, M['podvozok']))
    for dy in (-rozvor / 2, rozvor / 2):
        for sx in (-1, 1):
            casti.append(valec_x('koleso', sx * sirka / 2, y + dy, r, r, 0.14, M['koleso'], 10))
        casti.append(kvad('náprava', 0, y + dy, r, sirka, 0.12, 0.12, M['podvozok']))


def narazniky(casti, y, smer):
    for sx in (-0.875, 0.875):
        casti.append(valec_y('nárazník', sx, y + smer * 0.25, 1.06, 0.19, 0.5, M['podvozok'], 8))


def zberac(casti, y, H):
    z0 = H + 0.15
    casti.append(kvad('základ zberača', 0, y, H + 0.07, 1.4, 1.6, 0.14, M['zberac']))
    for a, b in ((-0.6, 0.3), (0.3, -0.5)):
        casti.append(kvad('rameno', 0, y + (a + b) / 2, z0 + 0.45, 0.06, abs(b - a) + 0.1, 0.06, M['zberac']))
    casti.append(kvad('rameno2', 0, y - 0.15, z0 + 0.3, 0.06, 0.08, 0.7, M['zberac']))
    casti.append(kvad('lyžina', 0, y - 0.1, z0 + 0.75, 1.9, 0.12, 0.05, M['zberac']))


def okna(casti, W, y0, y1, z0, z1, krok, sirka, m=None):
    m = m or M['sklo']
    n = max(1, int((y1 - y0) // krok))
    zvysok = (y1 - y0) - n * krok
    for i in range(n):
        yc = y0 + zvysok / 2 + krok * (i + 0.5)
        for s in (-1, 1):
            casti.append(doska('okno', s * W / 2, yc - sirka / 2, yc + sirka / 2, z0, z1, m, s))


def dvere(casti, W, yc, z0, z1, sirka=1.3, m=None):
    for s in (-1, 1):
        casti.append(doska('dvere', s * W / 2, yc - sirka / 2, yc + sirka / 2, z0, z1, m or M['dvere'], s))
        casti.append(doska('okno dverí', s * (W / 2 + 0.03), yc - sirka / 2 + 0.15, yc + sirka / 2 - 0.15, z0 + 0.9, z1 - 0.25, M['sklo'], s, 0.015))


def cele_rezy(W, H, dno, hs, L, dlzka_cela, sklon, celo_hore=True, oble=0.45):
    """Prierezy vozňa s čelom na −Y: dlzka_cela = úsek, kde sa čelo zošikmuje (sklon = zníženie strechy na špici)."""
    rezy = []
    y0 = -L / 2
    if celo_hore:
        kroky = 6
        for i in range(kroky + 1):
            t = i / kroky                       # 0 = špica, 1 = koniec čela
            y = y0 + dlzka_cela * t
            e = 1 - (1 - t) ** 2
            rezy.append((y, prierez(W, H, dno + (1 - e) * 0.1, hs, zuz=0.86 + 0.14 * e,
                                    vrch=H - sklon * (1 - e), dole=oble * (1 - e))))
    else:
        rezy.append((y0, prierez(W, H, dno, hs)))
    return rezy


# ---------------------------------------------------------------- vozne

def lok_361(lod=False):
    L, W, H, dno, hs = 16.8, 2.94, 4.25, 1.15, 3.55
    pasy = pasy_vozna([(1.35, M['spodok']), (1.75, M['lak-biela']), (1.83, M['lak-sediva']), (9, M['lak-cervena'])])
    rezy = cele_rezy(W, H, dno, hs, L, 1.9, 0.75, oble=0.3)
    rezy += [(y, prierez(W, H, dno, hs)) for y in (-L / 2 + 2.6, L / 2 - 2.6)]
    zadne = cele_rezy(W, H, dno, hs, L, 1.9, 0.75, oble=0.3)
    rezy += [(-y, b) for y, b in reversed(zadne)]
    casti = [loft('telo', rezy, pasy)]
    if lod:
        return casti
    for s in (-1, 1):                         # čelá na oboch koncoch: dve sklá, biely pás, svetlá
        for x in (-0.58, 0.58):
            celo_panel(casti, L, s, 2.5, 3.35, 1.0, M['sklo'], x)
        celo_panel(casti, L, s, 1.35, 1.75, 2.4, M['lak-biela'])
        for x in (-0.95, 0.95):
            celo_panel(casti, L, s, 1.48, 1.62, 0.24, M['svetlo'], x, 0.08)
        narazniky(casti, s * L / 2 - s * 0.05, s)
    okna(casti, W + 0.01, -L / 2 + 2.3, -L / 2 + 3.4, 2.65, 3.3, 1.1, 0.8)      # okná kabín
    okna(casti, W + 0.01, L / 2 - 3.4, L / 2 - 2.3, 2.65, 3.3, 1.1, 0.8)
    okna(casti, W + 0.01, -4.5, 4.5, 2.95, 3.35, 1.5, 0.9, M['dvere'])          # mriežky strojovne
    for y in (-4.15, 4.15):
        podvozok(casti, y, 2.9, 0.625)
    zberac(casti, -3.6, H)
    zberac(casti, 3.6, H)
    casti.append(kvad('strešná výstroj', 0, 0, H + 0.1, 1.6, 5.0, 0.25, M['strecha']))
    return casti


def voz_ic(lod=False):
    L, W, H, dno, hs = 26.4, 2.82, 4.05, 1.05, 3.35
    pasy = pasy_vozna([(1.25, M['spodok']), (1.8, M['lak-biela']), (9, M['lak-cervena'])])
    rezy = [(-L / 2 + 0.3, prierez(W, H, dno, hs, zuz=0.97, vrch=H - 0.15)), (-L / 2 + 0.6, prierez(W, H, dno, hs)),
            (L / 2 - 0.6, prierez(W, H, dno, hs)), (L / 2 - 0.3, prierez(W, H, dno, hs, zuz=0.97, vrch=H - 0.15))]
    casti = [loft('telo', rezy, pasy)]
    if lod:
        return casti
    okna(casti, W + 0.005, -L / 2 + 2.6, L / 2 - 2.6, 2.05, 2.95, 2.0, 1.45)
    for y in (-L / 2 + 1.3, L / 2 - 1.3):
        dvere(casti, W + 0.005, y, 1.3, 3.15, 0.95)
    for y in (-9.5, 9.5):
        podvozok(casti, y, 2.5, 0.46)
    for s in (-1, 1):
        narazniky(casti, s * L / 2, s)
        casti.append(kvad('mech', 0, s * (L / 2 - 0.1), 2.2, 1.8, 0.35, 2.0, M['podvozok']))
    return casti


def jednotka_671(celo, lod=False):
    L, W, H, dno, hs = 26.4, 2.82, 4.62, 0.45, 3.85
    pasy = pasy_vozna([(0.9, M['spodok']), (2.15, M['lak-cervena']), (9, M['lak-sediva'])])
    if celo:
        rezy = cele_rezy(W, H, dno + 0.5, hs, L, 3.0, 1.2, oble=0.5)
        rezy += [(-L / 2 + 4.2, prierez(W, H, dno + 0.5, hs)), (-L / 2 + 4.6, prierez(W, H, dno, hs))]
    else:
        rezy = [(-L / 2 + 0.3, prierez(W, H, dno + 0.5, hs, zuz=0.97, vrch=H - 0.2)), (-L / 2 + 3.2, prierez(W, H, dno + 0.5, hs)),
                (-L / 2 + 3.6, prierez(W, H, dno, hs))]
    rezy += [(L / 2 - 3.6, prierez(W, H, dno, hs)), (L / 2 - 3.2, prierez(W, H, dno + 0.5, hs)),
             (L / 2 - 0.3, prierez(W, H, dno + 0.5, hs, zuz=0.97, vrch=H - 0.2))]
    casti = [loft('telo', rezy, pasy)]
    if lod:
        return casti
    y0 = -L / 2 + (4.8 if celo else 3.8)
    y1 = L / 2 - 3.8
    okna(casti, W + 0.005, y0, y1, 1.05, 1.95, 1.75, 1.45)        # dolné podlažie
    okna(casti, W + 0.005, y0, y1, 2.95, 3.85, 1.75, 1.45)        # horné podlažie
    for y in (-L / 2 + 2.4, L / 2 - 2.4):
        if celo and y < 0:
            continue
        okna(casti, W + 0.005, y - 0.7, y + 0.7, 2.2, 3.0, 1.4, 1.1)   # nástupný priestor nad podvozkom
    for yc in (y0 + 0.9, y1 - 0.9):
        dvere(casti, W + 0.01, yc, 0.95, 3.0, 1.5)
    for s in ((1,) if celo else (-1, 1)):
        casti.append(kvad('mech', 0, s * (L / 2 - 0.15), 2.1, 1.3, 0.3, 2.3, M['podvozok']))
    if celo:
        # červené čelo s veľkým sklom, svetlá; červený „ťah“ z pásu hore k čelu
        celo_panel(casti, L, -1, 1.05, 3.4, 2.36, M['lak-cervena'])
        celo_panel(casti, L, -1, 2.3, 3.3, 2.0, M['sklo'], 0, 0.07)
        for x in (-0.85, 0.85):
            celo_panel(casti, L, -1, 1.62, 1.8, 0.26, M['svetlo'], x, 0.08)
        for s in (-1, 1):
            for i in range(6):
                t0, t1 = i / 6, (i + 1) / 6
                ya, yb = -L / 2 + 4.0 + t0 * 4.5, -L / 2 + 4.0 + t1 * 4.5
                z1 = 3.9 - 1.7 * (t0 + t1) / 2
                casti.append(doska('ťah', s * (W / 2 + 0.004), ya, yb, 2.1, z1, M['lak-cervena'], s, 0.012))
        casti.append(kvad('spriahadlo', 0, -L / 2 - 0.15, 1.05, 0.5, 0.5, 0.35, M['podvozok']))
        zberac(casti, L / 2 - 6.0, H)
    for y in (-L / 2 + 2.4, L / 2 - 2.4):
        podvozok(casti, y, 2.6, 0.46)
    return casti


def jednotka_reg(celo, lod=False):
    L, W, H, dno, hs = 21.0, 2.82, 3.95, 0.35, 3.2
    pasy = pasy_vozna([(0.7, M['spodok']), (1.15, M['lak-biela']), (1.45, M['lak-cervena']), (9, M['lak-biela'])])
    if celo:
        rezy = cele_rezy(W, H, dno + 0.3, hs, L, 2.6, 1.1, oble=0.6)
        rezy += [(-L / 2 + 3.2, prierez(W, H, dno, hs))]
    else:
        rezy = [(-L / 2 + 0.3, prierez(W, H, dno, hs, zuz=0.97, vrch=H - 0.15)), (-L / 2 + 0.6, prierez(W, H, dno, hs))]
    rezy += [(L / 2 - 0.6, prierez(W, H, dno, hs)), (L / 2 - 0.3, prierez(W, H, dno, hs, zuz=0.97, vrch=H - 0.15))]
    casti = [loft('telo', rezy, pasy)]
    if lod:
        return casti
    y0 = -L / 2 + (3.4 if celo else 0.9)
    okna(casti, W + 0.005, y0, L / 2 - 0.9, 1.55, 2.45, 1.5, 1.38)
    for yc in ((-L / 2 + 4.4, 4.0) if celo else (-4.0, 4.0)):
        dvere(casti, W + 0.01, yc, 0.55, 2.6, 1.3, M['lak-cervena'])
    casti.append(kvad('strešná výstroj', 0, 1.5, H + 0.15, 1.5, 6.0, 0.3, M['strecha']))
    for s in ((1,) if celo else (-1, 1)):
        casti.append(kvad('mech', 0, s * (L / 2 - 0.15), 1.6, 1.3, 0.3, 2.0, M['podvozok']))
    if celo:
        celo_panel(casti, L, -1, 0.75, 2.83, 2.36, M['lak-cervena'])
        celo_panel(casti, L, -1, 1.7, 2.75, 2.1, M['sklo'], 0, 0.07)
        celo_panel(casti, L, -1, 0.58, 0.92, 2.5, M['zlta'], 0, 0.22)
        for x in (-0.9, 0.9):
            celo_panel(casti, L, -1, 1.3, 1.45, 0.28, M['svetlo'], x, 0.08)
        zberac(casti, -L / 2 + 6.0, H)
    for y in ((-L / 2 + 2.2, L / 2 - 1.6) if celo else (-L / 2 + 1.6, L / 2 - 1.6)):
        podvozok(casti, y, 2.3, 0.4)
    return casti


VOZNE = {
    'lok-361': lambda lod: lok_361(lod),
    'voz-ic': lambda lod: voz_ic(lod),
    '671-celo': lambda lod: jednotka_671(True, lod),
    '671-stred': lambda lod: jednotka_671(False, lod),
    'reg-celo': lambda lod: jednotka_reg(True, lod),
    'reg-stred': lambda lod: jednotka_reg(False, lod),
}


def main():
    vycisti()
    farby()
    objekty = []
    for meno, f in VOZNE.items():
        for lod in (False, True):
            casti = f(lod)
            ob = spoj(casti, meno + ('-lod1' if lod else ''))
            troj = sum(len(p.vertices) - 2 for p in ob.data.polygons)
            print(f'{ob.name}: {troj} trojuholníkov')
            objekty.append(ob)
    os.makedirs(os.path.dirname(CIEL), exist_ok=True)
    for o in bpy.context.scene.objects:
        o.select_set(o in objekty)
    docasne = CIEL.replace('.glb', '.surove.glb')
    bpy.ops.export_scene.gltf(filepath=docasne, export_format='GLB', use_selection=True, export_yup=True,
                              export_texcoords=False, export_normals=True, export_apply=True)
    if os.path.exists(GLTFPACK):
        subprocess.run([GLTFPACK, '-i', docasne, '-o', CIEL, '-cc', '-kn', '-km', '-vp', '14'], check=True)
        os.remove(docasne)
    else:
        os.replace(docasne, CIEL)
    print('uložené', CIEL, os.path.getsize(CIEL), 'B')


main()
