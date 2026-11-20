# LOD pre davy: jeden variant postavy (telo + oblečenie + účes) zlúčený do jednej skinnutej siete
# s farbami vo vrcholoch a zredukovaný na zadaný počet trojuholníkov.
#
# Farba vrcholu (COLOR_0, lineárne; alfu exportér nezachová, preto slot ide do G):
#   r = detail * 0.5 – svetlosť textúry voči priemernej svetlosti kusu (1.0 = priemer), aby sa dala prefarbiť
#   g = (slot + 0.5) / 16 – index slotu; hra vynásobí  r * 2 * farba_slotu  (farba_slotu = priemer kusu × farba z palety)
# Zoznam slotov je v extras uzla: sloty = [{kus, objekt, farba (priemerná sRGB), tint (true = prefarbí sa paletou)}].
import json
import numpy as np
import bpy
from scipy.spatial import cKDTree
import blender_util as BU
import vlasy

MAX_SLOTOV = 16


def lin(c):
    c = np.asarray(c, np.float64)
    return np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)


def srgb_hex(c):
    c = np.clip(np.asarray(c, np.float64), 0, 1)
    s = np.where(c <= 0.0031308, c * 12.92, 1.055 * c ** (1 / 2.4) - 0.055)
    return '#' + ''.join(f'{int(round(v * 255)):02x}' for v in s)


def _obrazok_materialu(mat):
    """Obrázok zapojený do Base Color (alebo None) a predvolená farba."""
    nt = mat.node_tree
    bsdf = nt.nodes.get('Principled BSDF')
    vstup = bsdf.inputs['Base Color']
    for l in vstup.links:
        if l.from_node.type == 'TEX_IMAGE':
            return l.from_node.image, None
    return None, np.array(vstup.default_value[:3])


_pixely = {}


def _pixely_obrazka(img):
    if img.name not in _pixely:
        w, h = img.size
        p = np.zeros(w * h * 4, np.float32)
        img.pixels.foreach_get(p)
        _pixely[img.name] = p.reshape(h, w, 4)
    return _pixely[img.name]


def albedo_rohov(ob):
    """sRGB albedo a alfa pre každý roh (loop) siete podľa textúry jeho materiálu."""
    me = ob.data
    nl = len(me.loops)
    lp = np.zeros(nl, np.int32)
    poly_mat = np.zeros(len(me.polygons), np.int32)
    me.polygons.foreach_get('material_index', poly_mat)
    zac = np.zeros(len(me.polygons), np.int32)
    poc = np.zeros(len(me.polygons), np.int32)
    me.polygons.foreach_get('loop_start', zac)
    me.polygons.foreach_get('loop_total', poc)
    for z, n, mi in zip(zac, poc, poly_mat):
        lp[z:z + n] = mi
    uv = np.zeros(nl * 2, np.float32)
    if me.uv_layers:
        me.uv_layers.active.data.foreach_get('uv', uv)
    uv = uv.reshape(-1, 2)
    out = np.ones((nl, 3), np.float32)
    alfa = np.ones(nl, np.float32)
    for mi, mat in enumerate(me.materials):
        sel = lp == mi
        if not sel.any() or mat is None:
            continue
        img, farba = _obrazok_materialu(mat)
        if img is None:
            out[sel] = farba
            continue
        px = _pixely_obrazka(img)
        h, w = px.shape[:2]
        x = np.clip((np.mod(uv[sel, 0], 1) * w).astype(int), 0, w - 1)
        y = np.clip((np.mod(uv[sel, 1], 1) * h).astype(int), 0, h - 1)
        out[sel] = px[y, x, :3]
        alfa[sel] = px[y, x, 3]
    return out, alfa


def kopia(ob, meno):
    c = ob.copy()
    c.data = ob.data.copy()
    c.name = c.data.name = meno
    bpy.context.scene.collection.objects.link(c)
    c.shape_key_clear()
    for mod in list(c.modifiers):
        c.modifiers.remove(mod)
    c.parent = None
    return c


def zmaz_plochy(ob, maska):
    """Zmaže plochy, kde maska == True."""
    import bmesh
    bm = bmesh.new()
    bm.from_mesh(ob.data)
    bm.faces.ensure_lookup_table()
    bmesh.ops.delete(bm, geom=[f for f, m in zip(bm.faces, maska) if m], context='FACES')
    bm.to_mesh(ob.data)
    bm.free()
    ob.data.update()


def vnutorne_plochy(ob, strom, telo_N):
    """Vnútorná vrstva oblečenia (zo Solidify) – plochy otočené k telu."""
    me = ob.data
    n = len(me.polygons)
    st = np.zeros(n * 3, np.float32)
    no = np.zeros(n * 3, np.float32)
    me.polygons.foreach_get('center', st)
    me.polygons.foreach_get('normal', no)
    st, no = st.reshape(-1, 3), no.reshape(-1, 3)
    _, i = strom.query(st)
    return (no * telo_N[i]).sum(1) < -0.3


def nastav_farby(ob, detail, slot):
    """detail: (loops,) lineárne 0..1; slot: index."""
    me = ob.data
    for a in list(me.color_attributes):
        me.color_attributes.remove(a)
    attr = me.color_attributes.new('Farba', 'FLOAT_COLOR', 'CORNER')
    n = len(detail)
    rgba = np.stack([detail, np.full(n, (slot + 0.5) / MAX_SLOTOV), np.full(n, 0.5), np.ones(n)], 1).astype(np.float32)
    attr.data.foreach_set('color', rgba.ravel())
    me.color_attributes.active_color = attr
    me.color_attributes.render_color_index = 0


def material_lod():
    mat = bpy.data.materials.get('npc_lod')
    if mat:
        return mat
    mat = bpy.data.materials.new('npc_lod')
    mat.use_nodes = True
    nt = mat.node_tree
    bsdf = nt.nodes['Principled BSDF']
    ca = nt.nodes.new('ShaderNodeVertexColor')
    ca.layer_name = 'Farba'
    nt.links.new(ca.outputs['Color'], bsdf.inputs['Base Color'])
    bsdf.inputs['Roughness'].default_value = 0.8
    return mat


def vyrob(ctx, tb, satnik, variant, meno, troj, log):
    """Vyrobí LOD siete variantu: lod1_<meno>, lod2_<meno> (troj = [počet trojuholníkov LOD1, LOD2])."""
    m = ctx.m
    kusy = [k for k in variant['kusy'] if k in satnik['kusy']]
    skryte = set()
    bez_vlasov = False
    for k in kusy:
        skryte |= set(satnik['kusy'][k].get('skryva', []))
        bez_vlasov |= bool(satnik['kusy'][k].get('skryvaVlasy'))
    telo_P = m.P[ctx.prenos.TV]
    telo_N = m.N[ctx.prenos.TV]
    strom = cKDTree(telo_P)

    sloty = [{'kus': 'plet', 'objekt': 'telo', 'tint': True}, {'kus': 'vlasy', 'objekt': 'vlasy', 'tint': True},
             {'kus': 'oci', 'objekt': 'oci', 'tint': False}]
    casti = []  # (objekt, slot)

    # telo bez častí pod oblečením
    t = kopia(tb['telo'], f'lod_{meno}_telo')
    mats = [mm.name.replace('koza_', '') for mm in t.data.materials]
    pm = np.zeros(len(t.data.polygons), np.int32)
    t.data.polygons.foreach_get('material_index', pm)
    zmaz_plochy(t, np.array([mats[i] in skryte for i in pm]))
    casti.append((t, 0))
    for ob, _ in tb['pomocne']:
        if ob.name.startswith('oko_'):
            casti.append((kopia(ob, f'lod_{meno}_{ob.name}'), 2))

    # oblečenie
    for k in kusy:
        objekt = satnik['kusy'][k]['objekt']
        src = bpy.data.objects.get(objekt)
        if src is None:
            log('LOD: chýba', objekt)
            continue
        c = kopia(src, f'lod_{meno}_{objekt}')
        if objekt not in ('odev_retiazka', 'odev_igelitka'):
            zmaz_plochy(c, vnutorne_plochy(c, strom, telo_N))
        sloty.append({'kus': k, 'objekt': objekt, 'tint': True})
        casti.append((c, len(sloty) - 1))

    # vlasy – zjednodušený obrys (pásiky s priehľadnosťou by z diaľky nefungovali)
    ucet = variant.get('ucet')
    farba_vlasov = None
    if not bez_vlasov and ucet and ucet != 'ziadny':
        obr = vlasy.obrys_vlasov(ctx, ucet)
        if obr is not None:
            P, faces = obr
            v = BU.mesh_objekt(f'lod_{meno}_vlasy', P, faces)
            W = np.zeros((len(P), len(m.mena_kosti)), np.float32)
            W[:, m.mena_kosti.index('head')] = 1
            BU.nastav_vahy(v, W, m.mena_kosti)
            casti.append((v, 1))
            # priemerná farba skutočných vlasov (textúra × biela) – kde nie sú priehľadné
            src = bpy.data.objects.get('vlasy_' + ucet)
            if src is not None:
                a, al = albedo_rohov(src)
                if (al > 0.5).any():
                    farba_vlasov = lin(a[al > 0.5]).mean(0)

    # farby: detail voči priemeru kusu, priemer do zoznamu slotov
    for ob, slot in casti:
        if slot == 1:
            prem = farba_vlasov if farba_vlasov is not None else lin([0.55, 0.45, 0.38])
            detail = np.full(len(ob.data.loops), 0.5, np.float32)
        else:
            a, _ = albedo_rohov(ob)
            la = lin(a)
            prem = la.mean(0)
            jas = la @ np.array([0.2126, 0.7152, 0.0722])
            detail = np.clip(jas / max(jas.mean(), 1e-4) * 0.5, 0, 1)
        sloty[slot]['farba'] = srgb_hex(prem)
        nastav_farby(ob, detail, slot)
        for uvl in list(ob.data.uv_layers):
            ob.data.uv_layers.remove(uvl)
        ob.data.materials.clear()
    if 'farba' not in sloty[1]:
        sloty[1]['farba'] = srgb_hex(lin([0.55, 0.45, 0.38]))

    # zlúčenie
    bpy.ops.object.select_all(action='DESELECT')
    for ob, _ in casti:
        ob.select_set(True)
    hlavny = casti[0][0]
    bpy.context.view_layer.objects.active = hlavny
    bpy.ops.object.join()
    hlavny.data.materials.append(material_lod())
    me = hlavny.data
    pred = sum(len(p.vertices) - 2 for p in me.polygons)

    vysledky = []
    for uroven, ciel in enumerate(troj, start=1):
        ob = kopia(hlavny, f'lod{uroven}_{meno}')
        # zlúčenie blízkych vrcholov (švy UV) – decimácia potom lepšie drží tvar
        mod = ob.modifiers.new('spoj', 'WELD')
        mod.merge_threshold = 0.00002
        BU.aplikuj_modifikator(ob, 'spoj')
        n = sum(len(p.vertices) - 2 for p in ob.data.polygons)
        if n > ciel:
            mod = ob.modifiers.new('redukcia', 'DECIMATE')
            mod.decimate_type = 'COLLAPSE'
            mod.ratio = ciel / n
            mod.use_collapse_triangulate = True
            BU.aplikuj_modifikator(ob, 'redukcia')
        mod = ob.modifiers.new('troj', 'TRIANGULATE')
        BU.aplikuj_modifikator(ob, 'troj')
        ob.data.validate(clean_customdata=False)   # zdegenerované plochy po silnej redukcii
        BU.pripoj_k_armature(ob, tb['arm'])
        ob['npc_lod'] = uroven
        ob['variant'] = meno
        ob['sloty'] = json.dumps(sloty, ensure_ascii=False)
        vysledky.append(ob)
        log('LOD', uroven, meno, pred, '→', len(ob.data.polygons), 'trojuholníkov')
    bpy.data.objects.remove(hlavny, do_unlink=True)
    return vysledky
