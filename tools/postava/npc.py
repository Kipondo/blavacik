# Generátor NPC postáv z data/postavy/npc.json – rovnaký postup ako Ďoďo (build.py), iné telo a šatník.
# Pre každý model vyrobí .glb: telo + oblečenie a účesy, ktoré používajú jeho profily (LOD0, morph targety)
# a pre každý variant profilu zlúčené siete lod1_* a lod2_* (davy). Animácie sa berú z dodo.glb.
#   python npc.py <vystupny_priecinok> [model …]
import sys, os, json, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bpy
import blender_util as BU
import telo
import model as MD
import telo_blender
import odev
import lod

TU = os.path.dirname(os.path.abspath(__file__))
KOREN = os.path.abspath(os.path.join(TU, '..', '..'))
NPC = json.load(open(os.path.join(KOREN, 'data/postavy/npc.json'), encoding='utf-8'))
SATNIK = json.load(open(os.path.join(KOREN, 'data/postavy/satnik.json'), encoding='utf-8'))
VYSTUP = sys.argv[1] if len(sys.argv) > 1 else '/tmp/npc'
VYBER = sys.argv[2:]
TEX_TELO = int(os.environ.get('TEX_TELO', 1024))
TEX_ODEV = int(os.environ.get('TEX_ODEV', 512))
os.makedirs(VYSTUP, exist_ok=True)


def log(*a):
    print('[npc]', *a, flush=True)


def obsah_modelu(meno):
    """Ktoré siete model potrebuje: oblečenie, účesy a brady zo všetkých profilov tohto modelu."""
    kusy, ucesy, brady, varianty = set(), set(), set(), []
    for pid, p in NPC['profily'].items():
        if p['model'] != meno:
            continue
        for i, v in enumerate(p['varianty']):
            kusy |= set(v['kusy'])
            ucesy.add(v.get('ucet', 'ziadny'))
            varianty.append((f'{pid}_{i}', v))
        brady |= set(p.get('brady', []))
    objekty = {SATNIK['kusy'][k]['objekt'] for k in kusy}
    objekty |= {'vlasy_' + u for u in ucesy if u != 'ziadny'}
    objekty |= {'brada_' + b for b in brady if b != 'ziadna'}
    return objekty, varianty


for meno, md in NPC['modely'].items():
    if VYBER and meno not in VYBER:
        continue
    t0 = time.time()
    objekty, varianty = obsah_modelu(meno)
    log('model', meno, sorted(objekty))
    BU.vycisti_scenu()
    t = md['telo']
    makro = dict(gender=t['pohlavie'], age=t['vek'], muscle=t['svaly'], weight=t['vaha'])
    prsia = md.get('prsia')
    telo.nastav_zaklad(makro, md.get('detaily', []),
                       prsia and dict(cupsize=prsia['velkost'], firmness=prsia['pevnost']), NPC.get('morphy'))
    m = MD.Model(vyska=md['vyska'])
    tb = telo_blender.postav_telo(m, TEX_TELO, log, t0)
    ctx = odev.vytvor_vsetko(m, tb['arm'], tb['TELO_V'], TEX_ODEV, log, objekty=objekty, latky=NPC.get('latky'),
                            npc=True)
    for vid, v in varianty:
        lod.vyrob(ctx, tb, SATNIK, v, vid, NPC['lod']['trojuholniky'], log)
    tmp = os.path.join(VYSTUP, meno + '.raw.glb')
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.export_scene.gltf(
        filepath=tmp, export_format='GLB', use_selection=False,
        export_yup=True, export_apply=False, export_texcoords=True, export_normals=True,
        export_tangents=False, export_materials='EXPORT', export_image_format=os.environ.get('IMG', 'WEBP'),
        export_skins=True, export_morph=True, export_morph_normal=False, export_animations=False,
        export_def_bones=False, export_extras=True, export_vertex_color='MATERIAL')
    log('export', meno, os.path.getsize(tmp) // 1024, 'KB', round(time.time() - t0, 1), 's')
