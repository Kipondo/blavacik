# Pomocné funkcie pre Blender (bpy): mesh z numpy, armatúra, váhy, shape keys, materiály, export.
import bpy
import numpy as np
from mathutils import Matrix, Vector


def vycisti_scenu():
    bpy.ops.wm.read_factory_settings(use_empty=True)


def mesh_objekt(meno, P, faces, uv_rohy=None, materialy=None, mat_index=None, hladke=True):
    """P: (n,3), faces: zoznam zoznamov indexov, uv_rohy: (sum rohov,2) v poradí plôch."""
    me = bpy.data.meshes.new(meno)
    me.from_pydata(P.tolist(), [], [list(map(int, f)) for f in faces])
    me.validate(clean_customdata=False)
    if uv_rohy is not None:
        uvl = me.uv_layers.new(name='UVMap')
        uvl.data.foreach_set('uv', np.asarray(uv_rohy, np.float32).ravel())
    if materialy:
        for m in materialy:
            me.materials.append(m)
        if mat_index is not None:
            me.polygons.foreach_set('material_index', np.asarray(mat_index, np.int32))
    me.polygons.foreach_set('use_smooth', np.full(len(me.polygons), hladke, bool))
    me.update()
    ob = bpy.data.objects.new(meno, me)
    bpy.context.scene.collection.objects.link(ob)
    return ob


def armatura(meno, kosti, poradie):
    arm = bpy.data.armatures.new(meno)
    ob = bpy.data.objects.new(meno, arm)
    bpy.context.scene.collection.objects.link(ob)
    bpy.context.view_layer.objects.active = ob
    bpy.ops.object.mode_set(mode='EDIT')
    eb = {}
    for k in poradie:
        b = arm.edit_bones.new(k)
        b.head = Vector(kosti[k]['head'])
        b.tail = Vector(kosti[k]['tail'])
        b.roll = kosti[k]['roll']
        eb[k] = b
    for k in poradie:
        p = kosti[k]['parent']
        if p:
            eb[k].parent = eb[p]
            eb[k].use_connect = False
    bpy.ops.object.mode_set(mode='OBJECT')
    return ob


def nastav_vahy(ob, W, mena_kosti, max_vplyv=4):
    """W: (n_vrcholov, n_kosti) – ponechá max_vplyv najväčších váh na vrchol."""
    n = W.shape[0]
    top = np.argsort(-W, axis=1)[:, :max_vplyv]
    tv = np.take_along_axis(W, top, 1)
    s = tv.sum(1, keepdims=True)
    tv = np.where(s > 0, tv / np.maximum(s, 1e-9), 0)
    skupiny = {}
    for vi in range(n):
        for j in range(max_vplyv):
            w = float(tv[vi, j])
            if w < 1e-4:
                continue
            k = mena_kosti[top[vi, j]]
            if k not in skupiny:
                skupiny[k] = ob.vertex_groups.new(name=k)
            skupiny[k].add([vi], w, 'REPLACE')


def pripoj_k_armature(ob, arm):
    ob.parent = arm
    mod = ob.modifiers.new('Armature', 'ARMATURE')
    mod.object = arm


def shape_keys(ob, P, delty, prah=4e-4):
    """delty: {meno: (n,3)} – pridá len tie, ktoré daný objekt reálne menia."""
    pridane = []
    for meno, d in delty.items():
        if np.abs(d).max() < prah:
            continue
        if ob.data.shape_keys is None:
            ob.shape_key_add(name='Basis', from_mix=False)
        k = ob.shape_key_add(name=meno, from_mix=False)
        k.data.foreach_set('co', (P + d).astype(np.float32).ravel())
        k.slider_min, k.slider_max = 0.0, 1.0
        k.value = 0.0
        pridane.append(meno)
    return pridane


def obrazok(meno, pole, nefarebny=False):
    """pole: (S,S,3|4) 0..1 s riadkami zhora – uloží ako zabalený obrázok v Blenderi."""
    H, W = pole.shape[:2]
    if pole.shape[2] == 3:
        pole = np.concatenate([pole, np.ones((H, W, 1), np.float32)], 2)
    img = bpy.data.images.new(meno, W, H, alpha=bool(pole[..., 3].min() < 1))
    if nefarebny:
        img.colorspace_settings.name = 'Non-Color'
    img.pixels.foreach_set(np.ascontiguousarray(pole[::-1]).astype(np.float32).ravel())
    img.pack()
    return img


def material(meno, farba=None, drsnost=None, normal=None, kov=0.0, farba_rgb=None, drsnost_hodnota=0.7,
             sila_normaly=1.0, alfa=False):
    m = bpy.data.materials.new(meno)
    m.use_nodes = True
    m.use_backface_culling = True
    nt = m.node_tree
    bsdf = nt.nodes['Principled BSDF']
    bsdf.inputs['Metallic'].default_value = kov
    if farba is not None:
        t = nt.nodes.new('ShaderNodeTexImage')
        t.image = farba
        nt.links.new(t.outputs['Color'], bsdf.inputs['Base Color'])
        if alfa:
            nt.links.new(t.outputs['Alpha'], bsdf.inputs['Alpha'])
            if hasattr(m, 'surface_render_method'):
                m.surface_render_method = 'BLENDED'
            elif hasattr(m, 'blend_method'):
                m.blend_method = 'BLEND'
    elif farba_rgb is not None:
        bsdf.inputs['Base Color'].default_value = (*farba_rgb, 1)
    if drsnost is not None:
        t = nt.nodes.new('ShaderNodeTexImage')
        t.image = drsnost
        nt.links.new(t.outputs['Color'], bsdf.inputs['Roughness'])
    else:
        bsdf.inputs['Roughness'].default_value = drsnost_hodnota
    if normal is not None:
        t = nt.nodes.new('ShaderNodeTexImage')
        t.image = normal
        nm = nt.nodes.new('ShaderNodeNormalMap')
        nm.inputs['Strength'].default_value = sila_normaly
        nt.links.new(t.outputs['Color'], nm.inputs['Color'])
        nt.links.new(nm.outputs['Normal'], bsdf.inputs['Normal'])
    return m


def aplikuj_modifikator(ob, meno):
    bpy.context.view_layer.objects.active = ob
    for o in bpy.context.selected_objects:
        o.select_set(False)
    ob.select_set(True)
    bpy.ops.object.modifier_apply(modifier=meno)


def smart_uv(ob, okraj=0.01):
    bpy.context.view_layer.objects.active = ob
    for o in bpy.context.selected_objects:
        o.select_set(False)
    ob.select_set(True)
    bpy.ops.object.mode_set(mode='EDIT')
    bpy.ops.mesh.select_all(action='SELECT')
    bpy.ops.uv.smart_project(angle_limit=1.15, island_margin=okraj)
    bpy.ops.object.mode_set(mode='OBJECT')


def data_meshu(ob):
    """Vráti vrcholy (n,3), trojuholníky (m,3) indexy rohov, uv rohov (k,2), index vrcholu pre roh (k,)."""
    me = ob.data
    n = len(me.vertices)
    P = np.zeros(n * 3, np.float32)
    me.vertices.foreach_get('co', P)
    P = P.reshape(-1, 3)
    me.calc_loop_triangles()
    nt = len(me.loop_triangles)
    tri = np.zeros(nt * 3, np.int32)
    me.loop_triangles.foreach_get('loops', tri)
    tri = tri.reshape(-1, 3)
    nl = len(me.loops)
    lv = np.zeros(nl, np.int32)
    me.loops.foreach_get('vertex_index', lv)
    uv = np.zeros(nl * 2, np.float32)
    me.uv_layers.active.data.foreach_get('uv', uv)
    ln = np.zeros(nl * 3, np.float32)
    me.loops.foreach_get('normal', ln) if hasattr(me.loops[0], 'normal') else None
    return P, tri, uv.reshape(-1, 2), lv, ln.reshape(-1, 3)
