# Vlasy (ježko, nakrátko, uhladené dozadu), brada a čiapka.
import numpy as np
import bpy
import blender_util as BU
import textury as T
import latky as L
from odev import podmesh, taubin, normaly, napec, kus, napec_alfa

RNG = np.random.default_rng(7)


def uhol_hlavy(ctx, P):
    """0 = spredu, ±π = zozadu (okolo zvislej osi hlavy)."""
    h = ctx.hlava
    return np.arctan2(P[..., 0] - h[0], -(P[..., 1] - h[1]))


def vlasova_ciara(ctx, phi, zdvih=0.0):
    a = np.abs(phi)
    return ctx.oko[2] + np.interp(a, [0, 0.8, 1.25, 1.85, 2.4, np.pi],
                                  [0.062, 0.058, 0.03, 0.034, -0.055, -0.072]) + zdvih


def plochy_vlasov(ctx, zdvih=0.0):
    out = []
    for i, (l, c) in enumerate(zip(ctx.casti, ctx.stredy)):
        if l == 'hlava' and ctx.dom[i] == 'head' and c[2] > vlasova_ciara(ctx, uhol_hlavy(ctx, c), zdvih):
            out.append(i)
    return out


def textura_vlasov(P, N, ctx):
    """Krátke vlasy: tmavá pokožka prerastená chĺpkami ťahanými smerom od čela dozadu."""
    jemne = T.sum3(P * np.array([3.0, 0.4, 3.0]), 900, 41) * 0.6 + T.sum3(P, 2500, 42) * 0.4
    a = T.mix(np.broadcast_to(T.srgb('#3a2a20'), P.shape), T.srgb('#120c09'), T.smooth(0.35, 0.75, jemne))
    return np.clip(a * 1.6, 0, 1), 0.75, jemne * 3   # farba sa doladí cez tint (vzhlad.vlasy)


def ostne(ctx, P, N, dlzka_fn, smer_fn, hustota=7000, hrubka=0.0016, ohyb=0.0, ohyb_smer=lambda Q: np.zeros((len(Q), 3))):
    """Krátke kužeľovité prameňe na ploche (P, N sú vrcholy čiapky). hustota = počet na m²."""
    # vzorkovanie bodov na ploche – náhodne podľa vrcholov s malým rozptylom
    n = int(hustota * plocha_odhad(P))
    idx = RNG.integers(0, len(P), n)
    zak = P[idx] + RNG.normal(0, 0.003, (n, 3))
    nor = N[idx]
    zak = zak - ((zak - P[idx]) * nor).sum(1, keepdims=True) * nor
    dl = dlzka_fn(zak) * RNG.uniform(0.75, 1.2, n)
    sm = smer_fn(zak, nor)
    sm = sm + RNG.normal(0, 0.18, (n, 3))
    sm /= np.linalg.norm(sm, axis=1, keepdims=True)
    # dva vektory kolmé na normálu
    t1 = np.cross(nor, np.array([0, 0, 1.0]) + 1e-3)
    t1 /= np.linalg.norm(t1, axis=1, keepdims=True)
    t2 = np.cross(nor, t1)
    V, F, UV = [], [], []
    for k in range(n):
        b = zak[k] - nor[k] * 0.0015
        r = hrubka * RNG.uniform(0.8, 1.3)
        uhly = (0, 2.1, 4.2)
        e1, e2 = t1[k], t2[k]
        base = [b + r * (np.cos(a) * e1 + np.sin(a) * e2) for a in uhly]
        if ohyb > 0:
            stred = b + sm[k] * dl[k] * 0.5
            ohnute = sm[k] + RNG.normal(0, ohyb, 3) + ohyb_smer(zak[k:k + 1])[0] * ohyb
            ohnute /= np.linalg.norm(ohnute)
            tip = stred + ohnute * dl[k] * 0.5
            mid = [stred + 0.6 * r * (np.cos(a) * e1 + np.sin(a) * e2) for a in uhly]
            o = len(V)
            V += base + mid + [tip]
            for i in range(3):
                j = (i + 1) % 3
                F += [[o + i, o + j, o + 3 + j, o + 3 + i], [o + 3 + i, o + 3 + j, o + 6]]
            UV += [[0.1, 0.05], [0.5, 0.05], [0.9, 0.05], [0.1, 0.5], [0.5, 0.5], [0.9, 0.5], [0.5, 0.95]]
        else:
            tip = b + sm[k] * dl[k]
            o = len(V)
            V += base + [tip]
            F += [[o, o + 1, o + 3], [o + 1, o + 2, o + 3], [o + 2, o, o + 3]]
            UV += [[0.1, 0.05], [0.5, 0.05], [0.9, 0.05], [0.5, 0.95]]
    return np.array(V), F, np.array(UV)


def plocha_odhad(P):
    # zhruba: bodov * (priemerná vzdialenosť suseda)^2
    from scipy.spatial import cKDTree
    d, _ = cKDTree(P).query(P, 2)
    return len(P) * np.median(d[:, 1]) ** 2


def zlep(ctx, meno, P_cap, faces_cap, mat_cap_fn, casti):
    """Čiapka vlasov (priehľadné mäkké okraje) + ďalšie časti [(V, F, UV, material)] zlúčené do jedného objektu."""
    cap = BU.mesh_objekt(meno, P_cap, faces_cap)
    BU.smart_uv(cap)
    cap.data.materials.append(napec_alfa(cap, mat_cap_fn, 512, meno))
    for k, (V, F, UV, mat) in enumerate(casti):
        if V is None or not len(V):
            continue
        uvr = np.concatenate([UV[f] for f in F])
        o = BU.mesh_objekt(f'{meno}_{k}', V, F, uvr, [mat])
        bpy.context.view_layer.objects.active = cap
        for x in bpy.context.selected_objects:
            x.select_set(False)
        o.select_set(True)
        cap.select_set(True)
        bpy.ops.object.join()
    Pf, *_ = BU.data_meshu(cap)
    morphy = ctx.prenos.aplikuj(cap, ctx.arm, Pf, pevna_kost='head')
    ctx.log(meno, len(cap.data.vertices), 'vrcholov, morph:', len(morphy))
    return cap


def mat_ostni(meno):
    return BU.material(meno, farba_rgb=(0.32, 0.22, 0.16), drsnost_hodnota=0.55)


def textura_pramenov(S=256):
    """Textúra pre pásiky vlasov: jednotlivé vlásky (alfa), špička sa stráca. Materiál končí na _pramene."""
    u = np.linspace(0, 1, S)[None, :].repeat(S * 2, 0)
    v = np.linspace(1, 0, S * 2)[:, None].repeat(S, 1)
    rng = np.random.default_rng(5)
    a = np.zeros_like(u)
    for _ in range(70):
        x0 = rng.uniform(0.05, 0.95)
        w = rng.uniform(0.006, 0.02)
        dl = rng.uniform(0.6, 1.0)
        vlna = 0.01 * np.sin(v * rng.uniform(6, 14) + rng.uniform(0, 6))
        hustota = np.exp(-((u - x0 - vlna) / w) ** 2) * (v < dl) * np.clip((dl - v) / 0.25, 0, 1)
        a = np.maximum(a, hustota * rng.uniform(0.7, 1.0))
    a *= np.clip(np.minimum(u, 1 - u) / 0.12, 0, 1)
    farba = np.stack([a * 0 + 0.75, a * 0 + 0.62, a * 0 + 0.52], -1) * (0.75 + 0.25 * v)[..., None]
    rgba = np.concatenate([farba, a[..., None]], -1).astype(np.float32)
    img = BU.obrazok('vlasy_pramene_farba', rgba)
    mat = BU.material('vlasy_pramene', img, drsnost_hodnota=0.5, alfa=True)
    mat.use_backface_culling = False
    return mat


def pramene(ctx, P, N, n, dlzka_fn, smer_fn, sirka=0.012, segmenty=4, ohyb=0.22):
    """Pásiky vlasov (hair cards) – zakrivené stuhy s textúrou vláskov."""
    idx = RNG.choice(len(P), n)
    V, F, UV = [], [], []
    for k in idx:
        b, nn = P[k] - N[k] * 0.002, N[k]
        d = smer_fn(P[k:k + 1], N[k:k + 1])[0] + RNG.normal(0, 0.25, 3)
        d /= np.linalg.norm(d)
        L = dlzka_fn(P[k:k + 1])[0] * RNG.uniform(0.8, 1.15)
        w = sirka * RNG.uniform(0.8, 1.2)
        bok = np.cross(d, nn)
        bok /= max(np.linalg.norm(bok), 1e-6)
        bok = bok + RNG.normal(0, 0.15, 3)
        bok /= np.linalg.norm(bok)
        o = len(V)
        p = b.copy()
        for sgm in range(segmenty + 1):
            t = sgm / segmenty
            ww = w * (1 - 0.35 * t)
            V += [p - bok * ww / 2, p + bok * ww / 2]
            UV += [[0, t], [1, t]]
            # ohyb k hlave a náhodne
            d = d - nn * ohyb + RNG.normal(0, 0.12, 3)
            d /= np.linalg.norm(d)
            p = p + d * L / segmenty
        for sgm in range(segmenty):
            a0 = o + sgm * 2
            F.append([a0, a0 + 1, a0 + 3, a0 + 2])
    return np.array(V), F, np.array(UV)


def vsetky(ctx):
    m = ctx.m
    up = np.array([0, 0, 1.0])
    vpred = np.array([0, -1.0, 0])

    def cap_alfa(zdvih):
        def fn(P, N):
            a, _, _ = textura_vlasov(P, N, ctx)
            ciara = vlasova_ciara(ctx, uhol_hlavy(ctx, P), zdvih)
            alfa = T.smooth(ciara - 0.003, ciara + 0.014, P[..., 2])
            jemne = T.sum3(P, 2500, 43)
            return a, alfa * (0.75 + 0.25 * jemne), 0.7
        return fn

    def cap(zdvih, odsad):
        fi = plochy_vlasov(ctx, zdvih - 0.012)
        vs, faces = podmesh(m, fi)
        P = taubin(m.P[vs] + m.N[vs] * odsad, faces, 2)
        return P, faces, normaly(P, faces)

    # --- ježko: krátke postavené vlasy ---
    P, faces, Nc = cap(0, 0.0022)
    vrch = lambda Q: T.smooth(ctx.oko[2] + 0.03, ctx.oko[2] + 0.1, Q[:, 2])
    ciara = lambda Q: T.smooth(0.0, 0.025, Q[:, 2] - vlasova_ciara(ctx, uhol_hlavy(ctx, Q)))
    dlzka = lambda Q: (0.004 + 0.013 * vrch(Q)) * (0.35 + 0.65 * ciara(Q))
    smer = lambda Q, Nn: Nn + up * 0.7 * vrch(Q)[:, None] + vpred * 0.1
    vyber = ciara(P) > 0.05
    V, F, UV = ostne(ctx, P[vyber], Nc[vyber], dlzka, smer, hustota=55000)
    zlep(ctx, 'vlasy_jezko', P, faces, cap_alfa(0), [(V, F, UV, mat_ostni('vlasy_jezko_ostne'))])

    # --- strapaté: hore dlhšie rozstrapatené pramene, po bokoch nakrátko ---
    P, faces, Nc = cap(0, 0.0025)
    vrch = lambda Q: T.smooth(ctx.oko[2] + 0.03, ctx.oko[2] + 0.09, Q[:, 2])
    vyber = (ciara(P) > 0.3) & (vrch(P) > 0.05)
    dlzka = lambda Q: (0.012 + 0.03 * vrch(Q)) * (0.5 + 0.5 * ciara(Q))
    def smer(Q, Nn):
        # pramene idú hore a mierne dopredu (rozstrapatené), vzadu dozadu
        dopredu = np.where((Q[:, 1] - ctx.hlava[1]) < 0.02, 1.0, -0.6)[:, None]
        return Nn * 0.55 + up * 0.35 + vpred * 0.45 * dopredu
    mat_p = textura_pramenov()
    V1, F1, UV1 = pramene(ctx, P[vyber], Nc[vyber], 1100, dlzka, smer)
    V2, F2, UV2 = ostne(ctx, P[ciara(P) > 0.05], Nc[ciara(P) > 0.05], lambda Q: 0.004 + 0.004 * vrch(Q),
                        lambda Q, Nn: Nn + up * 0.3, hustota=40000)
    zlep(ctx, 'vlasy_strapate', P, faces, cap_alfa(0), [(V1, F1, UV1, mat_p), (V2, F2, UV2, mat_ostni('vlasy_strapate_ostne'))])

    # --- nakrátko (strojček) ---
    P, faces, Nc = cap(0, 0.0016)
    zlep(ctx, 'vlasy_nakratko', P, faces, cap_alfa(0), [])

    # --- uhladené dozadu ---
    P, faces, Nc = cap(-0.004, 0.005)
    vyber = ciara(P) > 0.2
    V, F, UV = pramene(ctx, P[vyber], Nc[vyber], 1300, lambda Q: 0.035 + 0.03 * vrch(Q),
                       lambda Q, Nn: Nn * 0.15 - vpred * 1.0 + up * 0.15, sirka=0.014, ohyb=0.3)
    zlep(ctx, 'vlasy_dozadu', P, faces, cap_alfa(-0.004), [(V, F, UV, mat_p)])

    # --- brada: hustota ako hladká funkcia polohy → mäkké okraje ---
    ust, oko = ctx.usta, ctx.oko

    def hustota_brady(P, typ):
        phi = np.abs(uhol_hlavy(ctx, P))
        z = P[..., 2]
        dx = P[..., 0] - ust[0]
        dz = z - ust[2]
        pery = T.smooth(1.0, 0.75, np.sqrt((dx / 0.027) ** 2 + ((dz + 0.001) / 0.012) ** 2))
        fuzy = T.smooth(0.034, 0.024, np.abs(dx)) * T.smooth(0.004, 0.009, dz) * T.smooth(0.026, 0.018, dz)
        if typ == 'fuzy':
            return fuzy * (1 - pery)
        spodok = T.smooth(ust[2] - 0.085, ust[2] - 0.06, z)          # pod bradou na krk
        lice = T.smooth(oko[2] - 0.02 - 0.03 * (1 - T.smooth(1.0, 1.4, phi)), oko[2] - 0.045 - 0.03 * (1 - T.smooth(1.0, 1.4, phi)), z)
        bok = T.smooth(1.75, 1.5, phi)
        h = spodok * lice * bok
        h = np.maximum(h * (1 - T.smooth(0.0, 0.01, dz - 0.004) * T.smooth(0.03, 0.02, np.abs(dx))), fuzy)
        return np.clip(h, 0, 1) * (1 - pery)

    def brada_tex(typ, sila):
        def fn(P, N):
            h = hustota_brady(P, typ)
            chlpy = T.sum3(P, 2600, 51) * 0.6 + T.sum3(P, 6000, 52) * 0.4
            alfa = h * T.smooth(0.25, 0.65, chlpy * 0.7 + h * 0.4) * sila
            a = np.broadcast_to(T.srgb('#c9a68a'), P.shape) * (0.8 + 0.2 * chlpy)[..., None]
            return a, alfa, 0.8
        return fn

    def plochy_brady():
        out = []
        for i, (l, c) in enumerate(zip(ctx.casti, ctx.stredy)):
            if l == 'hlava' and c[2] < oko[2] - 0.0 and c[2] > ust[2] - 0.11 and abs(uhol_hlavy(ctx, c)) < 1.85:
                out.append(i)
        return out

    fi = plochy_brady()
    vs, faces = podmesh(m, fi)
    P = m.P[vs] + m.N[vs] * 0.0009
    Nc = normaly(P, faces)
    zlep(ctx, 'brada_strnisko', P, faces, brada_tex('plna', 0.72), [])
    h = hustota_brady(P, 'plna')
    V, F, UV = ostne(ctx, P[h > 0.6], Nc[h > 0.6], lambda Q: np.full(len(Q), 0.008), lambda Q, Nn: Nn - up * 0.7,
                     hustota=90000, hrubka=0.001)
    zlep(ctx, 'brada_plnobrada', P + Nc * 0.0012, faces, brada_tex('plna', 1.2), [(V, F, UV, mat_ostni('brada_plnobrada_ostne'))])
    zlep(ctx, 'brada_fuzy', P + Nc * 0.0006, faces, brada_tex('fuzy', 1.3), [])


def ciapka(ctx):
    m = ctx.m
    fi = plochy_vlasov(ctx, -0.012)
    vs, faces = podmesh(m, fi)
    P0, N0 = m.P[vs], m.N[vs]
    vrch = T.smooth(ctx.oko[2] + 0.02, ctx.oko[2] + 0.14, P0[:, 2])
    P = P0 + N0 * (0.024 + 0.012 * vrch)[:, None]
    P = taubin(P, faces, 6)
    ob = BU.mesh_objekt('odev_ciapka', P, faces)
    BU.smart_uv(ob)
    ob.data.materials.append(napec(ob, L.pletena_ciapka(), 512, 'odev_ciapka', 256))
    mod = ob.modifiers.new('hrubka', 'SOLIDIFY')
    mod.thickness = 0.006
    mod.offset = -1
    BU.aplikuj_modifikator(ob, 'hrubka')
    Pf, *_ = BU.data_meshu(ob)
    ctx.prenos.aplikuj(ob, ctx.arm, Pf, pevna_kost='head')
    ctx.log('odev_ciapka', len(ob.data.vertices))
