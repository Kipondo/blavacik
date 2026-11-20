# Michalská brána v Blenderi (issue #31, etapa G3): gotická kamenná veža s prejazdom, biela baroková
# nadstavba s hodinami a ochodzou, medená cibuľa s lucernou a socha archanjela Michala s drakom navrchu.
# Rozmery podľa verejne známych údajov (výška 51 m), tvar podľa fotografií z Wikimedia Commons (len okom).
# Spustenie z koreňa repozitára: python3 tools/blender/michalska_brana.py [cesta/k/gltfpack]
#   → assets/pamiatky/michalska-brana.glb + michalska-brana-ao.jpg (zapečené zatienenie)
import math
import os
import sys

import bpy  # musí byť pred bmesh (bpy ho sprístupní)
import bmesh

sys.path.insert(0, os.path.dirname(__file__))
from spolocne import (exportuj, kvader, material, odober, rotacne, rozbal_uv, spoj, vycisti, zapec_ao, zkos,
                      objekt_z_bmesh)

VYSTUP = os.path.join(os.path.dirname(__file__), '..', '..', 'assets', 'pamiatky')
os.makedirs(VYSTUP, exist_ok=True)
GLTFPACK = sys.argv[1] if len(sys.argv) > 1 else None

vycisti()
KAMEN = material('kamen', '#d9caa6', 0.9)
OMIETKA = material('omietka', '#f1eadb', 0.85)
RIMSA = material('rimsa', '#e4dbc6', 0.8)
MED = material('med', '#6c9f8a', 0.45, 0.35)
ZLATO = material('zlato', '#c9a14a', 0.35, 0.9)
TMAVE = material('tmave', '#1d2226', 0.3)
CIFERNIK = material('cifernik', '#f4f1e8', 0.6)

S = 8.6            # strana veže (m)
casti = []

# --- kamenná gotická časť s prejazdom (0–16 m) ---
sokel = kvader('sokel', S + 0.5, S + 0.5, 1.2, (0, 0, 0), KAMEN)
dolna = kvader('dolna', S, S, 16, (0, 0, 0), KAMEN)
# prejazd v osi Y (sever – juh): obdĺžnik + polkruhový oblúk
prejazd_w, prejazd_h = 4.0, 4.6
for ciel in (dolna, sokel):
    nastroj = kvader('prejazd', prejazd_w, S + 4, prejazd_h, (0, 0, -0.1))
    oblúk = rotacne('oblúk', [(prejazd_w / 2, -S / 2 - 2), (prejazd_w / 2, S / 2 + 2)], segmenty=32)
    oblúk.rotation_euler = (math.pi / 2, 0, 0)
    oblúk.location = (0, 0, prejazd_h - 0.1)
    bpy.context.view_layer.update()
    with bpy.context.temp_override(object=oblúk, active_object=oblúk, selected_objects=[oblúk]):
        bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    odober(ciel, nastroj)
    odober(ciel, oblúk)
casti += [sokel, dolna]
# kamenné ostenie oblúka (profilované): rámy na oboch čelách
for y in (-S / 2 - 0.12, S / 2 + 0.12):
    bm = bmesh.new()
    N = 18
    vonk, vnut = [], []
    for i in range(N + 1):
        a = math.pi * i / N
        for (r, zoznam) in ((prejazd_w / 2 + 0.55, vonk), (prejazd_w / 2 + 0.05, vnut)):
            zoznam.append((r * math.cos(a), prejazd_h + r * math.sin(a)))
    pts = [(prejazd_w / 2 + 0.55, 0)] + vonk + [(-(prejazd_w / 2 + 0.55), 0), (-(prejazd_w / 2 + 0.05), 0)] + list(reversed(vnut)) + [(prejazd_w / 2 + 0.05, 0)]
    v = [bm.verts.new((x, y - 0.12, z)) for x, z in pts]
    v2 = [bm.verts.new((x, y + 0.12, z)) for x, z in pts]
    n = len(pts)
    for i in range(n):
        j = (i + 1) % n
        bm.faces.new((v[i], v[j], v2[j], v2[i]))
    bm.faces.new(v)
    bm.faces.new(list(reversed(v2)))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    rama = objekt_z_bmesh('ostenie', bm, KAMEN)
    # čelá rámu
    casti.append(rama)
# gotické okná v kamennej časti (zapustené) a nárožné kvádre
for z0 in (8.0, 12.0):
    for (x, y, rot) in ((0, -S / 2, 0), (0, S / 2, 0), (-S / 2, 0, math.pi / 2), (S / 2, 0, math.pi / 2)):
        if abs(y) > 0 and z0 < 9:
            continue                                      # nad prejazdom na čelách len horné okno
        okno = kvader('okno', 1.1, 0.6, 2.2, (x, y, z0), rot_z=rot)
        odober(dolna, okno)
        sklo = kvader('sklo', 1.1, 0.05, 2.2, (x * 0.94, y * 0.94, z0), TMAVE, rot_z=rot)
        casti.append(sklo)
for sx in (-1, 1):
    for sy in (-1, 1):
        for k in range(6):
            casti.append(kvader('roh', 0.9 if k % 2 else 0.6, 0.6 if k % 2 else 0.9, 1.2, (sx * (S / 2 - 0.25), sy * (S / 2 - 0.25), 1.6 + k * 2.4), KAMEN))
casti.append(kvader('rimsa1', S + 0.6, S + 0.6, 0.5, (0, 0, 16), RIMSA))

# --- biela baroková nadstavba (16.5–31 m) ---
horna = kvader('horna', S - 0.4, S - 0.4, 14.5, (0, 0, 16.5), OMIETKA)
for z0, h in ((18.5, 2.6), (23.0, 2.6)):
    for (x, y, rot) in ((0, -(S - 0.4) / 2, 0), (0, (S - 0.4) / 2, 0), (-(S - 0.4) / 2, 0, math.pi / 2), ((S - 0.4) / 2, 0, math.pi / 2)):
        odober(horna, kvader('okno', 1.2, 0.5, h, (x, y, z0), rot_z=rot))
        casti.append(kvader('sklo', 1.2, 0.05, h, (x * 0.95, y * 0.95, z0), TMAVE, rot_z=rot))
        casti.append(kvader('parapet', 1.6, 0.25, 0.15, (x * 1.0 + (0 if rot else 0), y * 1.0, z0 - 0.15), RIMSA, rot_z=rot))
        casti.append(kvader('nadokno', 1.7, 0.2, 0.25, (x, y, z0 + h + 0.05), RIMSA, rot_z=rot))
casti.append(horna)
# nárožné lizény
for sx in (-1, 1):
    for sy in (-1, 1):
        casti.append(kvader('lizena', 0.7, 0.7, 14.5, (sx * ((S - 0.4) / 2 - 0.25), sy * ((S - 0.4) / 2 - 0.25), 16.5), RIMSA))
# hodiny na štyroch stranách
for (x, y, rot) in ((0, -(S - 0.4) / 2 - 0.08, 0), (0, (S - 0.4) / 2 + 0.08, 0), (-(S - 0.4) / 2 - 0.08, 0, math.pi / 2), ((S - 0.4) / 2 + 0.08, 0, math.pi / 2)):
    c = rotacne('cifernik', [(0, -0.08), (1.25, -0.08), (1.25, 0.08), (0, 0.08)], segmenty=24, poz=(0, 0, 0), mat=CIFERNIK)
    c.rotation_euler = (math.pi / 2, 0, rot)
    c.location = (x, y, 28.2)
    ram = rotacne('ram', [(1.25, -0.1), (1.42, -0.1), (1.42, 0.1), (1.25, 0.1)], segmenty=24, mat=ZLATO, uzavriet_hore=False, uzavriet_dole=False)
    ram.rotation_euler = (math.pi / 2, 0, rot)
    ram.location = (x, y, 28.2)
    tx, ty = (1, 0) if rot == 0 else (0, 1)                    # dotyčnica k stene
    ruc1 = kvader('rucicka', 0.12, 0.06, 0.8, (x * 1.025, y * 1.025, 28.2), TMAVE, rot_z=rot)
    ruc2 = kvader('rucicka2', 0.95, 0.06, 0.09, (x * 1.03 + tx * 0.47, y * 1.03 + ty * 0.47, 28.15), TMAVE, rot_z=rot)
    casti += [c, ram, ruc1, ruc2]
# hlavná rímsa a ochodza s balustrádou
casti.append(kvader('rimsa2', S + 0.4, S + 0.4, 0.6, (0, 0, 31.0), RIMSA))
casti.append(kvader('ochodza', S + 1.2, S + 1.2, 0.3, (0, 0, 31.6), RIMSA))
for strana in range(4):
    rot = strana * math.pi / 2
    ca, sa = math.cos(rot), math.sin(rot)
    d = S / 2 + 0.45
    for k in range(9):
        t = (k - 4) / 4.4 * (S / 2 + 0.3)
        x0, y0 = t, -d                                        # strana pri rot = 0 je na −Y
        x, y = x0 * ca - y0 * sa, x0 * sa + y0 * ca
        casti.append(rotacne('baluster', [(0.13, 0), (0.18, 0.15), (0.1, 0.45), (0.16, 0.7), (0.12, 0.85), (0.15, 0.95)], segmenty=8, poz=(x, y, 31.9), mat=RIMSA))
    cx, cy = d * sa, -d * ca
    casti.append(kvader('madlo', S + 1.1, 0.3, 0.15, (cx, cy, 32.85), RIMSA, rot_z=rot))

# --- osemboká atika, medená cibuľa, lucerna, ihla ---
casti.append(rotacne('atika', [(3.7, 31.9), (3.7, 33.6), (3.95, 33.6), (3.95, 34.0)], segmenty=8, mat=OMIETKA))
casti.append(rotacne('cibula', [(4.0, 34.0), (4.6, 35.2), (4.55, 36.6), (3.8, 38.3), (2.4, 39.7), (1.35, 40.8), (1.05, 41.5)], segmenty=8, mat=MED))
casti.append(rotacne('lucerna', [(1.05, 41.5), (1.05, 43.9), (1.3, 43.9), (1.3, 44.2)], segmenty=8, mat=OMIETKA))
for i in range(8):
    a = 2 * math.pi * (i + 0.5) / 8
    casti.append(kvader('okienko', 0.5, 0.06, 1.5, (math.cos(a) * 1.03, math.sin(a) * 1.03, 42.1), TMAVE, rot_z=a + math.pi / 2))
casti.append(rotacne('cibula2', [(1.35, 44.2), (1.5, 44.8), (1.05, 45.7), (0.4, 46.3), (0.2, 46.7)], segmenty=8, mat=MED))
casti.append(rotacne('ihla', [(0.13, 46.7), (0.09, 48.0), (0.3, 48.2), (0.33, 48.5), (0.25, 48.75), (0.06, 48.9), (0.05, 49.1)], segmenty=12, mat=ZLATO))

# --- socha archanjela Michala s drakom (štylizovaná, medená) ---
Z = 48.95
socha = []
socha.append(rotacne('drak', [(0.55, Z), (0.62, Z + 0.25), (0.35, Z + 0.45), (0.1, Z + 0.55)], segmenty=10, mat=MED))
socha.append(rotacne('telo', [(0.28, Z + 0.45), (0.34, Z + 1.0), (0.24, Z + 1.7), (0.3, Z + 2.0), (0.16, Z + 2.15)], segmenty=10, mat=MED))
socha.append(rotacne('hlava', [(0.0, Z + 2.15), (0.16, Z + 2.25), (0.17, Z + 2.4), (0.1, Z + 2.55), (0.0, Z + 2.6)], segmenty=10, mat=MED))
for s in (-1, 1):                                        # krídla
    bm = bmesh.new()
    pts = [(0.15, Z + 1.3), (0.9, Z + 2.2), (1.2, Z + 3.0), (0.8, Z + 2.6), (0.6, Z + 2.0), (0.25, Z + 1.7)]
    v1 = [bm.verts.new((s * x, 0.15, z)) for x, z in pts]
    v2 = [bm.verts.new((s * x, 0.25, z)) for x, z in pts]
    bm.faces.new(v1 if s > 0 else list(reversed(v1)))
    bm.faces.new(list(reversed(v2)) if s > 0 else v2)
    for i in range(len(pts)):
        j = (i + 1) % len(pts)
        bm.faces.new((v1[i], v1[j], v2[j], v2[i]) if s > 0 else (v1[j], v1[i], v2[i], v2[j]))
    socha.append(objekt_z_bmesh('kridlo', bm, MED))
mec = kvader('mec', 0.06, 0.06, 1.6, (0, 0, 0), ZLATO)
mec.rotation_euler = (0.35, 0, 0)              # natočenie okolo vlastnej päty, potom posun k ruke
mec.location = (0.38, -0.1, Z + 1.7)
socha.append(mec)
socha.append(kvader('ruka', 0.12, 0.12, 0.6, (0.33, -0.05, Z + 1.55), MED))
casti += socha

# --- spojenie, zkosenie hrán, UV, AO, export ---
ob = spoj(casti, 'michalska-brana')
for p in ob.data.polygons:
    p.use_smooth = False
rozbal_uv(ob)
zapec_ao(ob, os.path.join(VYSTUP, 'michalska-brana-ao.jpg'), velkost=1024, vzorky=40, vzdialenost=5.0)
velkost = exportuj(ob, os.path.join(VYSTUP, 'michalska-brana.glb'), GLTFPACK)
print(f'hotovo: assets/pamiatky/michalska-brana.glb ({velkost / 1024:.0f} kB), trojuholníkov {sum(len(p.vertices) - 2 for p in ob.data.polygons)}')
