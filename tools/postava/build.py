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

# ---------------- telo (koža, oči, zuby, armatúra, váhy, morph targety) ----------------
import telo_blender
_t = telo_blender.postav_telo(m, TEX_TELO, log, t0)
arm, TELO_V = _t['arm'], _t['TELO_V']

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
