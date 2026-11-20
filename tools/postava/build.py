# Hlavný generátor postavy Ďoďa. Spúšťa sa cez bpy:  python build.py <vystup.glb> [--render priečinok]
import sys, os, math, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
import bpy
import blender_util as BU
import textury as T
import koza
import model as MD

ARGS = sys.argv[1:]
VYSTUP = ARGS[0] if ARGS else '/tmp/dodo.glb'
TEX_TELO = int(os.environ.get('TEX_TELO', 2048))
TEX_ODEV = int(os.environ.get('TEX_ODEV', 1024))
LEN_TELO = os.environ.get('LEN_TELO') == '1'


def log(*a):
    print('[postava]', *a, flush=True)


t0 = time.time()
BU.vycisti_scenu()
m = MD.Model()
log('model', round(time.time() - t0, 1), 's')

# ---------------- telo ----------------
casti = m.casti_tela()
body_f = [i for i, g in enumerate(m.G) if g == 'body']
vsetky_v = sorted({v for i in body_f for v in m.F[i]})
mapa = {v: i for i, v in enumerate(vsetky_v)}
TELO_V = np.array(vsetky_v)
faces = [[mapa[v] for v in m.F[i]] for i in body_f]
uv = np.concatenate([m.VT[m.FT[i]] for i in body_f])
labely = sorted({casti[i] for i in body_f})

# textúra kože (pečená z 3D polohy do UV MakeHumanu)
P_telo = m.P[TELO_V]
N_telo = m.N[TELO_V]
rohy_v = np.concatenate([[mapa[v] for v in m.F[i]] for i in body_f])
tri = []
o = 0
for f in faces:
    for k in range(1, len(f) - 1):
        tri.append([o, o + k, o + k + 1])
    o += len(f)
tri = np.array(tri)
(Ptex, Ntex), maska = T.rasterizuj(uv, tri, [P_telo[rohy_v], N_telo[rohy_v]], TEX_TELO)
Ntex /= np.maximum(np.linalg.norm(Ntex, axis=-1, keepdims=True), 1e-9)
alb, drs, nor = koza.textura(Ptex, Ntex, m, TEX_TELO)
log('koža', round(time.time() - t0, 1), 's')
img_a = BU.obrazok('koza_farba', alb)
img_r = BU.obrazok('koza_drsnost', drs, True)
img_n = BU.obrazok('koza_normal', nor, True)
mats = [BU.material('koza_' + l, img_a, img_r, img_n, sila_normaly=0.35) for l in labely]
mi = [labely.index(casti[i]) for i in body_f]
telo = BU.mesh_objekt('telo', P_telo, faces, uv, mats, mi)

# ---------------- oči, zuby, jazyk ----------------
def pomocny(meno_skupiny, meno, mat):
    fi = [i for i, g in enumerate(m.G) if g == meno_skupiny]
    vs = sorted({v for i in fi for v in m.F[i]})
    mp = {v: i for i, v in enumerate(vs)}
    ob = BU.mesh_objekt(meno, m.P[vs], [[mp[v] for v in m.F[i]] for i in fi],
                        np.concatenate([m.VT[m.FT[i]] for i in fi]), [mat])
    return ob, np.array(vs)


def textura_oka(stred, S=256):
    """Jednoduché realistické oko – dúhovka hnedozelená, zrenička, bielko s cievkami."""
    def fn(P, N):
        d = P - stred
        d /= np.maximum(np.linalg.norm(d, axis=-1, keepdims=True), 1e-9)
        uhol = np.degrees(np.arccos(np.clip(-d[..., 1], -1, 1)))
        lucy = T.sum3(np.stack([np.arctan2(d[..., 0], d[..., 2]) * 3, uhol * 0.05, uhol * 0.0], -1), 8, 3)
        biel = T.mix(np.broadcast_to(T.srgb('#efe9e4'), P.shape), T.srgb('#e2b8b0'), T.smooth(40, 80, uhol) * 0.6)
        duh = T.mix(np.broadcast_to(T.srgb('#5b3f22'), P.shape), T.srgb('#7d7a3f'), lucy * T.smooth(4, 26, uhol))
        duh = T.mix(duh, T.srgb('#2a1a0e'), T.smooth(22, 30, uhol) * 0.8)
        a = T.mix(biel, duh, T.smooth(31, 28, uhol))
        a = T.mix(a, np.zeros(3), T.smooth(11.5, 9.5, uhol))
        return a
    return fn


def napec_pomocny(ob, fn, S, meno, filtr=None):
    P, tri, uvr, lv, _ = BU.data_meshu(ob)
    if filtr is not None:
        tri = tri[filtr(P[lv][tri]).all(1)]
    (Pt,), _ = T.rasterizuj(uvr, tri, [P[lv]], S, okraj=S)
    return BU.obrazok(meno, fn(Pt, None))


oci = []
for strana in ('l', 'r'):
    ob, vs = pomocny(f'helper-{strana}-eye', f'oko_{strana}', None)
    st = m.P[vs].mean(0)
    # vlastné UV: predná pologuľa premietnutá spredu (pôvodné UV sa prekrývajú), zadná do rohu
    Pe, _, _, lv, _ = BU.data_meshu(ob)
    d = Pe[lv] - st
    r = np.linalg.norm(d, axis=1).max()
    uvn = 0.5 + np.stack([d[:, 0], d[:, 2]], 1) / (2.05 * r)
    uvn[d[:, 1] > 0.004] = 0.03
    ob.data.uv_layers.active.data.foreach_set('uv', uvn.astype(np.float32).ravel())
    img = napec_pomocny(ob, textura_oka(st), 256, f'oko_{strana}_farba', lambda p: p[..., 1] - st[1] < 0.004)
    ob.data.materials[0] = BU.material(f'oko_{strana}', img, drsnost_hodnota=0.08)
    oci.append((ob, vs))
zuby_mat = BU.material('zuby', farba_rgb=(0.85, 0.82, 0.74), drsnost_hodnota=0.25)
jazyk_mat = BU.material('jazyk', farba_rgb=(0.62, 0.3, 0.3), drsnost_hodnota=0.4)
pomocne = oci + [pomocny('helper-upper-teeth', 'zuby_horne', zuby_mat),
                 pomocny('helper-lower-teeth', 'zuby_dolne', zuby_mat),
                 pomocny('helper-tongue', 'jazyk', jazyk_mat)]

# ---------------- armatúra, váhy, morph targety ----------------
arm = BU.armatura('kostra', m.kosti, m.mena_kosti)
BU.nastav_vahy(telo, m.W[TELO_V], m.mena_kosti)
BU.pripoj_k_armature(telo, arm)
morph_telo = BU.shape_keys(telo, P_telo, {k: v[TELO_V] for k, v in m.D.items()})
hlava_idx = m.mena_kosti.index('head')
for ob, vs in pomocne:
    W = np.zeros((len(vs), len(m.mena_kosti)), np.float32)
    W[:, hlava_idx] = 1
    BU.nastav_vahy(ob, W, m.mena_kosti)
    BU.pripoj_k_armature(ob, arm)
    BU.shape_keys(ob, m.P[vs], {k: v[vs] for k, v in m.D.items()})
log('telo hotové', round(time.time() - t0, 1), 's', 'morph:', morph_telo)

# ---------------- oblečenie, vlasy, doplnky ----------------
if not LEN_TELO:
    import odev
    odev.vytvor_vsetko(m, arm, TELO_V, TEX_ODEV, log)
    log('oblečenie hotové', round(time.time() - t0, 1), 's')

# ---------------- animácie ----------------
if not LEN_TELO and os.environ.get('BEZ_ANIM') != '1':
    import animacie
    animacie.vytvor(arm, m, log)

# ---------------- export ----------------
bpy.ops.object.select_all(action='SELECT')
bpy.ops.export_scene.gltf(
    filepath=VYSTUP, export_format='GLB', use_selection=False,
    export_yup=True, export_apply=False, export_texcoords=True, export_normals=True,
    export_tangents=False, export_materials='EXPORT', export_image_format=os.environ.get('IMG', 'WEBP'),
    export_skins=True, export_morph=True, export_morph_normal=False,
    export_animations=not LEN_TELO, export_animation_mode='ACTIONS', export_force_sampling=True,
    export_def_bones=False, export_extras=False)
log('export', VYSTUP, os.path.getsize(VYSTUP) // 1024, 'KB', round(time.time() - t0, 1), 's')
bpy.ops.wm.save_as_mainfile(filepath=VYSTUP.replace('.glb', '.blend'))
