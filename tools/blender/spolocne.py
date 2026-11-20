# Spoločné pomôcky pre generátory pamiatok v Blenderi (bpy bez okna, pip install bpy).
# Súradnice: Blender Z hore; glTF export ich prevedie na Y hore (os Y Blendera = os Z v hre).
# Postup modelu: postav časti (bmesh / primitíva), spoj ich do jedného objektu po materiáloch,
# rozbaľ UV, zapeč zatienenie (AO) do textúry, exportuj .glb a zmenši ho cez gltfpack (meshopt).
import math
import os
import subprocess

import bpy  # musí byť pred bmesh (bpy ho sprístupní)
import bmesh
from mathutils import Matrix, Vector


def vycisti():
    bpy.ops.wm.read_factory_settings(use_empty=True)


def material(meno, farba, drsnost=0.85, kov=0.0):
    m = bpy.data.materials.get(meno) or bpy.data.materials.new(meno)
    m.use_nodes = True
    p = m.node_tree.nodes.get('Principled BSDF')
    r, g, b = (int(farba[i:i + 2], 16) / 255 for i in (1, 3, 5))
    lin = lambda c: c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4
    p.inputs['Base Color'].default_value = (lin(r), lin(g), lin(b), 1)
    p.inputs['Roughness'].default_value = drsnost
    p.inputs['Metallic'].default_value = kov
    return m


def objekt_z_bmesh(meno, bm, mat=None):
    me = bpy.data.meshes.new(meno)
    bm.to_mesh(me)
    bm.free()
    ob = bpy.data.objects.new(meno, me)
    bpy.context.scene.collection.objects.link(ob)
    if mat:
        ob.data.materials.append(mat)
    return ob


def kvader(meno, sx, sy, sz, poz=(0, 0, 0), mat=None, rot_z=0.0):
    """Kváder so stredom podstavy v poz (z = spodok)."""
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    bmesh.ops.scale(bm, vec=(sx, sy, sz), verts=bm.verts)
    bmesh.ops.translate(bm, vec=(0, 0, sz / 2), verts=bm.verts)
    if rot_z:
        bmesh.ops.rotate(bm, cent=(0, 0, 0), matrix=Matrix.Rotation(rot_z, 3, 'Z'), verts=bm.verts)
    bmesh.ops.translate(bm, vec=poz, verts=bm.verts)
    return objekt_z_bmesh(meno, bm, mat)


def rotacne(meno, profil, segmenty=24, poz=(0, 0, 0), mat=None, uzavriet_hore=True, uzavriet_dole=True):
    """Rotačné teleso z profilu [(r, z), …] zdola nahor (cibuľa, valec, lucerna)."""
    bm = bmesh.new()
    kruhy = []
    for r, z in profil:
        kruh = []
        for i in range(segmenty):
            a = 2 * math.pi * i / segmenty
            kruh.append(bm.verts.new((poz[0] + r * math.cos(a), poz[1] + r * math.sin(a), poz[2] + z)))
        kruhy.append(kruh)
    for k in range(len(kruhy) - 1):
        for i in range(segmenty):
            j = (i + 1) % segmenty
            bm.faces.new((kruhy[k][i], kruhy[k][j], kruhy[k + 1][j], kruhy[k + 1][i]))
    if uzavriet_dole and profil[0][0] > 1e-4:
        bm.faces.new(list(reversed(kruhy[0])))
    if uzavriet_hore and profil[-1][0] > 1e-4:
        bm.faces.new(kruhy[-1])
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-4)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return objekt_z_bmesh(meno, bm, mat)


def odober(ciel, nastroj):
    """Boolean rozdiel (nastroj sa zmaže)."""
    mod = ciel.modifiers.new('odober', 'BOOLEAN')
    mod.operation = 'DIFFERENCE'
    mod.solver = 'EXACT'
    mod.object = nastroj
    if hasattr(mod, 'material_mode'):
        mod.material_mode = 'INDEX'      # nástroj nepridá prázdne materiálové sloty
    with bpy.context.temp_override(object=ciel, active_object=ciel, selected_objects=[ciel]):
        bpy.ops.object.modifier_apply(modifier=mod.name)
    bpy.data.objects.remove(nastroj, do_unlink=True)


def zkos(ob, sirka=0.03, segmenty=2):
    mod = ob.modifiers.new('zkosenie', 'BEVEL')
    mod.width = sirka
    mod.segments = segmenty
    mod.limit_method = 'ANGLE'
    with bpy.context.temp_override(object=ob, active_object=ob, selected_objects=[ob]):
        bpy.ops.object.modifier_apply(modifier=mod.name)


def spoj(objekty, meno):
    """Spojí objekty do jedného (materiály ostanú ako sloty)."""
    for o in bpy.context.scene.objects:
        o.select_set(False)
    for o in objekty:
        o.select_set(True)
    bpy.context.view_layer.objects.active = objekty[0]
    with bpy.context.temp_override(active_object=objekty[0], selected_editable_objects=objekty, selected_objects=objekty):
        bpy.ops.object.join()
    ob = objekty[0]
    ob.name = meno
    # prázdne sloty (z nástrojov bez materiálu) → prvý materiál, nepoužité sloty preč
    prvy = next((i for i, s in enumerate(ob.material_slots) if s.material), 0)
    for p in ob.data.polygons:
        if not ob.material_slots[p.material_index].material:
            p.material_index = prvy
    with bpy.context.temp_override(object=ob, active_object=ob, selected_objects=[ob]):
        bpy.ops.object.material_slot_remove_unused()
    return ob


def rozbal_uv(ob, okraj=0.004):
    bpy.context.view_layer.objects.active = ob
    ob.select_set(True)
    with bpy.context.temp_override(active_object=ob, object=ob, selected_objects=[ob], edit_object=ob):
        bpy.ops.object.mode_set(mode='EDIT')
        bpy.ops.mesh.select_all(action='SELECT')
        bpy.ops.uv.smart_project(angle_limit=math.radians(60), island_margin=okraj, area_weight=0.0, scale_to_bounds=False)
        bpy.ops.object.mode_set(mode='OBJECT')


def zapec_ao(ob, cesta, velkost=1024, vzorky=48, vzdialenost=6.0):
    """Zapečie zatienenie okolia (AO) do textúry (rovnaké UV pre všetky materiály) a uloží ju ako JPG."""
    sc = bpy.context.scene
    sc.render.engine = 'CYCLES'
    sc.cycles.device = 'CPU'
    sc.cycles.samples = vzorky
    sc.world = sc.world or bpy.data.worlds.new('svet')
    sc.world.light_settings.distance = vzdialenost
    img = bpy.data.images.new('ao', velkost, velkost, alpha=False, float_buffer=False)
    img.colorspace_settings.name = 'Non-Color'
    for slot in ob.material_slots:
        nt = slot.material.node_tree
        n = nt.nodes.new('ShaderNodeTexImage')
        n.image = img
        nt.nodes.active = n
    for o in sc.objects:
        o.select_set(o == ob)
    bpy.context.view_layer.objects.active = ob
    with bpy.context.temp_override(active_object=ob, object=ob, selected_objects=[ob]):
        bpy.ops.object.bake(type='AO', margin=8, use_clear=True)
    img.filepath_raw = cesta
    img.file_format = 'JPEG'
    img.save()
    try:                                   # menší súbor (Blender ukladá JPG v plnej kvalite)
        from PIL import Image
        Image.open(cesta).convert('L').save(cesta, quality=82)
    except ImportError:
        pass
    # textúru z materiálov odstránime (do glTF ide len farba, AO sa načíta v hre ako aoMap)
    for slot in ob.material_slots:
        nt = slot.material.node_tree
        for n in [n for n in nt.nodes if n.type == 'TEX_IMAGE']:
            nt.nodes.remove(n)


def exportuj(ob, cesta_glb, gltfpack=None):
    for o in bpy.context.scene.objects:
        o.select_set(o == ob)
    docasne = cesta_glb.replace('.glb', '.surove.glb')
    bpy.ops.export_scene.gltf(filepath=docasne, export_format='GLB', use_selection=True, export_yup=True,
                              export_texcoords=True, export_normals=True, export_apply=True)
    if gltfpack and os.path.exists(gltfpack):
        subprocess.run([gltfpack, '-i', docasne, '-o', cesta_glb, '-cc', '-kv', '-km', '-vp', '14', '-vt', '12'], check=True)
        os.remove(docasne)
    else:
        os.replace(docasne, cesta_glb)
    return os.path.getsize(cesta_glb)
