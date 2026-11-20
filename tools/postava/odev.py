# Oblečenie, vlasy a doplnky Ďoďa – samostatné siete odvodené z tela (sedia aj pri zmene postavy v editore).
import math
import numpy as np
import bpy
from scipy.spatial import cKDTree
import blender_util as BU
import textury as T
import latky as L

UP = np.array([0, 0, 1.0])
VPRED = np.array([0, -1.0, 0])


# ---------------- geometria ----------------
def susedia(n, faces):
    s = [set() for _ in range(n)]
    for f in faces:
        for i in range(len(f)):
            a, b = f[i], f[(i + 1) % len(f)]
            s[a].add(b)
            s[b].add(a)
    return s


def okrajove(faces):
    hrany = {}
    for f in faces:
        for i in range(len(f)):
            e = tuple(sorted((f[i], f[(i + 1) % len(f)])))
            hrany[e] = hrany.get(e, 0) + 1
    out = set()
    for e, c in hrany.items():
        if c == 1:
            out.update(e)
    return out


def taubin(P, faces, iteracie, lam=0.5, mu=-0.53, pevne=None, okraj_hlad=True):
    s = susedia(len(P), faces)
    idx = [np.array(sorted(x)) if x else np.array([i]) for i, x in enumerate(s)]
    okraj = okrajove(faces)
    pevne = set(pevne or [])
    P = P.copy()
    for it in range(iteracie * 2):
        f = lam if it % 2 == 0 else mu
        L_ = np.array([P[j].mean(0) for j in idx]) - P
        if okraj_hlad:
            # okrajové vrcholy vyhladzujeme len po okraji (rovný lem)
            for v in okraj:
                ok = [u for u in s[v] if u in okraj]
                L_[v] = (P[ok].mean(0) - P[v]) if ok else 0
        for v in pevne:
            L_[v] = 0
        P += f * L_
    return P


def normaly(P, faces):
    N = np.zeros_like(P)
    for f in faces:
        for k in range(1, len(f) - 1):
            n = np.cross(P[f[k]] - P[f[0]], P[f[k + 1]] - P[f[0]])
            for v in (f[0], f[k], f[k + 1]):
                N[v] += n
    return N / np.maximum(np.linalg.norm(N, axis=1, keepdims=True), 1e-12)


def podmesh(m, fi):
    vs = sorted({v for i in fi for v in m.F[i]})
    mp = {v: i for i, v in enumerate(vs)}
    return np.array(vs), [[mp[v] for v in m.F[i]] for i in fi]


def os_bod(P, a, b):
    """Najbližší bod na úsečke a-b a parameter t."""
    d = b - a
    t = np.clip(((P - a) @ d) / (d @ d), 0, 1)
    return a + t[:, None] * d, t


def min_polomer(P, a, b, r_fn):
    """Odtlačí body od osi končatiny aspoň na polomer r_fn(t, P) (rovné nohavice, manžety)."""
    q, t = os_bod(P, a, b)
    v = P - q
    d = np.linalg.norm(v, axis=1)
    r = r_fn(t, P)
    k = np.where((r > 0) & (d < r), r / np.maximum(d, 1e-6), 1.0)
    return q + v * k[:, None]


def max_polomer(P, a, b, r_fn):
    q, t = os_bod(P, a, b)
    v = P - q
    d = np.linalg.norm(v, axis=1)
    r = r_fn(t, P)
    k = np.where((r > 0) & (d > r), r / np.maximum(d, 1e-6), 1.0)
    return q + v * k[:, None]


# ---------------- prenos váh a tvarov z tela ----------------
class Prenos:
    def __init__(self, m, TELO_V):
        self.m = m
        self.TV = TELO_V
        self.strom = cKDTree(m.P[TELO_V])

    def aplikuj(self, ob, arm, P, k=4, pevna_kost=None):
        m = self.m
        d, i = self.strom.query(P, k)
        w = 1 / np.maximum(d, 1e-4) ** 2
        w /= w.sum(1, keepdims=True)
        src = self.TV[i]
        if pevna_kost:
            W = np.zeros((len(P), len(m.mena_kosti)), np.float32)
            W[:, m.mena_kosti.index(pevna_kost)] = 1
        else:
            W = (m.W[src] * w[..., None]).sum(1)
        BU.nastav_vahy(ob, W, m.mena_kosti)
        BU.pripoj_k_armature(ob, arm)
        delty = {kk: (v[src] * w[..., None]).sum(1) for kk, v in m.D.items() if kk not in ('zmurk',)}
        if not ob.name.startswith(('vlasy', 'brada', 'odev_ciapka')):
            # mimika a tvár sa oblečenia netýka (okrem vecí na hlave)
            for kk in ('usmev', 'usta', 'tvar_uzka', 'tvar_hranata', 'nos_velky', 'nos_maly', 'nos_orli',
                       'brada_vyrazna', 'usi_odstate', 'oci_velke', 'lica_bucate', 'pery_plne'):
                delty.pop(kk, None)
        return BU.shape_keys(ob, P, delty, prah=1e-3)


# ---------------- textúry ----------------
def napec(ob, fn, S, meno, normal_S=None, drsnost=True):
    """fn(P, N) -> (albedo, drsnost (S,S) alebo číslo, výška (S,S) alebo None). Vráti material."""
    P, tri, uv, lv, _ = BU.data_meshu(ob)
    me = ob.data
    N = np.zeros(len(me.vertices) * 3, np.float32)
    me.vertices.foreach_get('normal', N)
    N = N.reshape(-1, 3)
    (Pt, Nt), _ = T.rasterizuj(uv, tri, [P[lv], N[lv]], S)
    Nt /= np.maximum(np.linalg.norm(Nt, axis=-1, keepdims=True), 1e-9)
    alb, drs, vys = fn(Pt, Nt)
    img_a = BU.obrazok(meno + '_farba', np.clip(alb, 0, 1))
    img_r = img_n = None
    hodnota = 0.8
    if np.ndim(drs) == 0:
        hodnota = float(drs)
    else:
        img_r = BU.obrazok(meno + '_drsnost', np.clip(drs, 0.03, 1)[..., None].repeat(3, -1), True)
    if vys is not None:
        n = T.normal_z_vysky(vys, 1.0)
        if normal_S and normal_S != S:
            from PIL import Image
            n = np.asarray(Image.fromarray((n * 255).astype(np.uint8)).resize((normal_S, normal_S), Image.LANCZOS),
                           np.float32) / 255
        img_n = BU.obrazok(meno + '_normal', n, True)
    return BU.material(meno, img_a, img_r, img_n, drsnost_hodnota=hodnota, sila_normaly=1.0)


# ---------------- generátor kusu oblečenia ----------------
class Kontext:
    def __init__(self, m, TELO_V, arm, S, log):
        self.m, self.arm, self.S, self.log = m, arm, S, log
        self.casti = m.casti_tela()
        self.prenos = Prenos(m, TELO_V)
        F = m.F
        self.stredy = np.array([m.P[f].mean(0) for f in F])
        self.dom = []  # dominantná kosť plochy
        for f in F:
            self.dom.append(m.mena_kosti[int(m.W[f].sum(0).argmax())])
        k = m.kosti
        self.oko = (m.klb('joint-l-eye') + m.klb('joint-r-eye')) / 2
        # stred pier podľa masky pier v UV (joint-mouth je vnútri úst, nie na perách)
        import koza
        mk = koza.maska('mpfb_lips.jpg', 512)
        body = []
        for f, ft, g in zip(m.F, m.FT, m.G):
            if g != 'body':
                continue
            for v, t in zip(f, ft):
                u, w = m.VT[t]
                if mk[int((1 - w) * 511), int(u * 511)] > 0.5:
                    body.append(m.P[v])
        self.usta = np.mean(body, 0)
        log('stred pier', self.usta.round(3), 'joint-mouth', m.klb('joint-mouth').round(3))
        self.hlava = k['head']['head']
        self.krk_z = k['neck_01']['head'][2]
        self.clenok_z = k['foot_l']['head'][2]
        self.koleno_z = k['calf_l']['head'][2]
        self.kost = k

    def plochy(self, labely, podmienka=None):
        out = []
        for i, (l, c) in enumerate(zip(self.casti, self.stredy)):
            if l is None:
                continue
            if (l in labely) or (podmienka and podmienka(l, c, self.dom[i])):
                out.append(i)
        return out

    def noha(self, s):
        return self.kost[f'thigh_{s}']['head'], self.kost[f'calf_{s}']['tail']

    def ruka(self, s):
        return self.kost[f'upperarm_{s}']['head'], self.kost[f'hand_{s}']['head']


def kus(ctx, meno, fi, odsadenie, material_fn, hrubka=0.003, hladenie=8, uprav=None, S=None,
        normal_S=512, odstran=None, pevna_kost=None):
    """Vytvorí kus oblečenia z plôch tela fi: odsadenie po normále, vyhladenie, hrúbka, textúra, váhy, morphy."""
    m = ctx.m
    if odstran is not None:
        fi = [i for i in fi if not odstran(ctx.stredy[i])]
    vs, faces = podmesh(m, fi)
    P0 = m.P[vs]
    N0 = m.N[vs]
    off = odsadenie(P0, N0) if callable(odsadenie) else np.full(len(P0), odsadenie)
    P = P0 + N0 * off[:, None]
    if uprav:
        P = uprav(P, P0)
    if hladenie:
        P = taubin(P, faces, hladenie)
    ob = BU.mesh_objekt(meno, P, faces)
    BU.smart_uv(ob)
    mat = napec(ob, material_fn, S or ctx.S, meno, normal_S)
    ob.data.materials.append(mat)
    if hrubka:
        mod = ob.modifiers.new('hrubka', 'SOLIDIFY')
        mod.thickness = hrubka
        mod.offset = -1
        mod.use_rim = True
        mod.use_even_offset = False
        mod.use_quality_normals = True
        BU.aplikuj_modifikator(ob, 'hrubka')
    Pf, *_ = BU.data_meshu(ob)
    morphy = ctx.prenos.aplikuj(ob, ctx.arm, Pf, pevna_kost=pevna_kost)
    ctx.log(meno, len(ob.data.vertices), 'vrcholov, morph:', len(morphy))
    return ob


# ---------------- konkrétne kusy ----------------
def vytvor_vsetko(m, arm, TELO_V, S, log):
    ctx = Kontext(m, arm=arm, TELO_V=TELO_V, S=S, log=log)
    import vlasy, doplnky
    pas = m.pas_z
    nohy = [ctx.noha('l'), ctx.noha('r')]
    ruky = [ctx.ruka('l'), ctx.ruka('r')]

    def na_nohy(P, fn):
        for (a, b) in nohy:
            strana = np.sign(a[0])
            mask = np.sign(P[:, 0]) == strana
            if mask.any():
                P[mask] = fn(P[mask], a, b)
        return P

    def na_ruky(P, fn):
        for (a, b) in ruky:
            strana = np.sign(a[0])
            mask = (np.sign(P[:, 0]) == strana) & (np.abs(P[:, 0]) > abs(a[0]) - 0.01)
            if mask.any():
                P[mask] = fn(P[mask], a, b)
        return P

    NOHAVICE = {'panva_h', 'panva', 'stehno_h', 'stehno_d', 'lytko', 'clenok'}
    TRUP = {'hrud', 'brucho'}
    RUKAV_DLHY = {'rameno_h', 'rameno_d', 'predlaktie'}

    def pod_pasom(dz):
        return lambda l, c, d: l in ('brucho',) and c[2] < pas + dz

    # --- tepláky ---
    def teplaky_tvar(P, P0):
        def r(t, Q):
            z = Q[:, 2]
            rr = np.where(t > 0.45, 0.058, 0)                       # voľnejšie od kolena dole
            rr = np.where(z < ctx.clenok_z + 0.1, 0.06, rr)         # nad manžetou sa nahrnú
            return rr
        P = na_nohy(P, lambda Q, a, b: min_polomer(Q, a, b, r))
        # manžeta pri členku sa stiahne
        P = na_nohy(P, lambda Q, a, b: max_polomer(Q, a, b, lambda t, Q2: np.where(Q2[:, 2] < ctx.clenok_z + 0.035, 0.047, 0)))
        return P
    teplaky_f = ctx.plochy(NOHAVICE, pod_pasom(0.02))
    teplaky = kus(ctx, 'odev_teplaky', teplaky_f,
                  lambda P, N: 0.011 + 0.006 * T.smooth(pas, pas - 0.25, P[:, 2]),
                  L.teplaky(ctx, nohy), hrubka=0.003, hladenie=10, uprav=teplaky_tvar,
                  odstran=lambda c: c[2] < ctx.clenok_z + 0.008)

    # --- tričko ---
    tricko_f = ctx.plochy(TRUP | {'rameno_h'}, lambda l, c, d: l in ('panva_h', 'panva') and c[2] > pas - 0.07)
    kus(ctx, 'odev_tricko', tricko_f, lambda P, N: 0.0065 + 0.004 * T.smooth(pas + 0.05, pas - 0.06, P[:, 2]),
        L.tricko_potlac('#efefec', ctx), hrubka=0.0025, hladenie=8)

    # --- tepláková bunda (otvorená) ---
    def otvor_bundy(c, sirka_hore=0.03, sirka_dole=0.1):
        t = np.clip((ctx.krk_z + 0.05 - c[2]) / 0.6, 0, 1)
        return c[1] < ctx.kost['spine_03']['head'][1] - 0.02 and abs(c[0]) < sirka_hore + (sirka_dole - sirka_hore) * t

    def golier(vyska):
        return lambda l, c, d: l == 'hlava' and d in ('neck_01', 'spine_03') and c[2] < ctx.krk_z + vyska

    def rukav_odsad(zaklad, manzeta):
        def f(P, N):
            o = np.full(len(P), zaklad)
            for (a, b) in ruky:
                q, t = os_bod(P, a, b)
                bok = (np.sign(P[:, 0]) == np.sign(a[0])) & (np.abs(P[:, 0]) > abs(a[0]))
                o = np.where(bok, zaklad * 0.85 - (zaklad * 0.85 - manzeta) * T.smooth(0.85, 0.99, t), o)
            return o
        return f

    bunda_f = ctx.plochy(TRUP | RUKAV_DLHY, lambda l, c, d: (l in ('panva_h', 'panva') and c[2] > pas - 0.1)
                         or golier(0.045)(l, c, d))
    bunda = kus(ctx, 'odev_bunda', bunda_f, rukav_odsad(0.022, 0.011), L.teplakovina_bunda(ctx, ruky),
                hrubka=0.0035, hladenie=8, odstran=otvor_bundy)

    # --- tenisky ---
    def topanka_tvar(podrazka):
        def f(P, P0):
            P = P.copy()
            # podrážka: spodok sploštiť a jemne rozšíriť
            for s in (-1, 1):
                mask = np.sign(P[:, 0]) == s
                st = np.array([P[mask, 0].mean(), P[mask, 1].mean(), 0])
                spod = mask & (P[:, 2] < podrazka + 0.012)
                v = P[spod] - st
                v[:, 2] = 0
                P[spod, :2] += (v[:, :2] / np.maximum(np.linalg.norm(v[:, :2], axis=1, keepdims=True), 1e-6)) * 0.004
                P[spod, 2] = np.minimum(P[spod, 2], podrazka) * 0.3
                # špička trochu dopredu a zaoblená
                spic = mask & (P[:, 1] < P[mask, 1].min() + 0.06)
                P[spic, 1] -= 0.008
            return P
        return f
    topanky_f = ctx.plochy({'chodidlo'}, lambda l, c, d: l == 'clenok' and c[2] < ctx.clenok_z + 0.045)
    topanka(ctx, 'odev_tenisky', topanky_f, 0.011, 0.024, L.tenisky())

    # --- retiazka a igelitka ---
    doplnky.retiazka(ctx)
    doplnky.igelitka(ctx)

    # --- vlasy a brada ---
    vlasy.vsetky(ctx)

    # ================= ďalší šatník =================
    # košeľa s dlhým rukávom (oblek) a flanelka (bratislavský štýl) – rovnaký strih, iná látka
    kosela_f = ctx.plochy(TRUP | RUKAV_DLHY, lambda l, c, d: (l in ('panva_h', 'panva') and c[2] > pas - 0.08)
                          or golier(0.03)(l, c, d))
    kus(ctx, 'odev_kosela', kosela_f, rukav_odsad(0.008, 0.007), L.kosela('#f4f5f7'), hrubka=0.0025,
        odstran=lambda c: c[1] < -0.0 and abs(c[0]) < 0.012 and c[2] > ctx.krk_z - 0.02)
    kus(ctx, 'odev_flanelka', kosela_f, rukav_odsad(0.011, 0.009), L.flanel(), hrubka=0.003,
        odstran=lambda c: c[1] < -0.0 and abs(c[0]) < 0.012 and c[2] > ctx.krk_z - 0.02)

    # sako – otvorené do V, dlhšie
    def v_vystrih(c):
        t = np.clip((ctx.krk_z + 0.05 - c[2]) / 0.3, 0, 1)
        w = 0.05 * (1 - t) + 0.015
        return c[1] < ctx.kost['spine_03']['head'][1] - 0.02 and abs(c[0]) < w and c[2] > pas + 0.12
    sako_f = ctx.plochy(TRUP | RUKAV_DLHY, lambda l, c, d: (l in ('panva_h', 'panva') and c[2] > pas - 0.17)
                        or golier(0.04)(l, c, d))
    kus(ctx, 'odev_sako', sako_f, rukav_odsad(0.024, 0.016), L.vlna('#2c3036'), hrubka=0.004, odstran=v_vystrih)

    # kravata – pás spredu
    def kravata_vyber(l, c, d):
        z0, z1 = pas + 0.02, ctx.krk_z - 0.01
        t = np.clip((z1 - c[2]) / (z1 - z0), 0, 1)
        return l in ('hrud', 'brucho', 'hlava') and c[1] < 0 and z0 < c[2] < z1 and abs(c[0]) < 0.012 + 0.03 * t ** 0.7
    kus(ctx, 'odev_kravata', ctx.plochy(set(), kravata_vyber), 0.014, L.kravata(), hrubka=0.003, hladenie=4, S=256,
        normal_S=256)

    # nohavice k obleku – rovné
    def rovne(r_dole):
        def f(P, P0):
            P = na_nohy(P, lambda Q, a, b: min_polomer(Q, a, b, lambda t, Q2: np.where(t > 0.4, r_dole, 0)))
            return P
        return f
    nohavice_f = ctx.plochy(NOHAVICE, pod_pasom(0.03))
    kus(ctx, 'odev_nohavice', nohavice_f, 0.010, L.vlna('#2c3036', ryha=True), hrubka=0.003, hladenie=10,
        uprav=rovne(0.062), odstran=lambda c: c[2] < ctx.clenok_z - 0.01)
    kus(ctx, 'odev_rifle', nohavice_f, 0.008, L.rifle(nohy), hrubka=0.003, hladenie=10,
        uprav=rovne(0.055), odstran=lambda c: c[2] < ctx.clenok_z + 0.0)
    # kraťasy
    kratasy_f = ctx.plochy({'panva_h', 'panva', 'stehno_h'}, lambda l, c, d: (l == 'stehno_d' and c[2] > ctx.koleno_z + 0.09)
                           or pod_pasom(0.02)(l, c, d))
    kus(ctx, 'odev_kratasy', kratasy_f, 0.014, L.bavlna('#b39d74', kepr=True), hrubka=0.003, hladenie=10,
        uprav=lambda P, P0: na_nohy(P, lambda Q, a, b: min_polomer(Q, a, b, lambda t, Q2: np.where(t > 0.15, 0.085, 0))))

    # polobotky
    topanka(ctx, 'odev_polobotky', topanky_f, 0.008, 0.015, L.koza_topanky(), plocha=True)

    # reflexná vesta (brigáda kuriér)
    vesta_f = ctx.plochy(TRUP, lambda l, c, d: (l in ('panva_h', 'panva') and c[2] > pas - 0.06))
    kus(ctx, 'odev_vesta', vesta_f, 0.032, L.reflexna_vesta(ctx), hrubka=0.003, hladenie=8,
        odstran=lambda c: abs(c[0]) > 0.16 and c[2] > ctx.krk_z - 0.16)

    # párty košeľa s krátkym rukávom
    party_f = ctx.plochy(TRUP | {'rameno_h'}, lambda l, c, d: (l in ('panva_h', 'panva') and c[2] > pas - 0.07)
                         or golier(0.02)(l, c, d))
    kus(ctx, 'odev_party_kosela', party_f, lambda P, N: 0.010 + 0.004 * T.smooth(pas + 0.05, pas - 0.06, P[:, 2]),
        L.party(), hrubka=0.0025,
        odstran=lambda c: c[1] < -0.0 and abs(c[0]) < 0.03 and c[2] > ctx.krk_z - 0.07)

    # zimná páperová bunda
    zimna_f = ctx.plochy(TRUP | RUKAV_DLHY, lambda l, c, d: (l in ('panva_h', 'panva') and c[2] > pas - 0.13)
                         or golier(0.07)(l, c, d))
    kus(ctx, 'odev_zimna_bunda', zimna_f, rukav_odsad(0.045, 0.02), L.paperova(ctx), hrubka=0.004, hladenie=10)

    # čiapka
    vlasy.ciapka(ctx)


def topanka(ctx, meno, fi, odsad, podrazka, material_fn, plocha=False):
    """Topánka = vyhladený konvexný obal chodidla (prsty zmiznú, klenba sa vyplní), plochá podrážka."""
    from scipy.spatial import ConvexHull
    m = ctx.m
    vs, faces = podmesh(m, fi)
    P = m.P[vs] + m.N[vs] * odsad
    V, F = [], []
    for s in (-1, 1):
        Q = P[np.sign(P[:, 0]) == s].copy()
        Q[:, 2] = np.maximum(Q[:, 2], 0.0)
        # špička dopredu a podrážka trochu širšia
        pred = Q[:, 1] < Q[:, 1].min() + 0.05
        Q[pred, 1] -= 0.01
        Q[pred, 2] = np.maximum(Q[pred, 2], 0.004)
        stred = Q[:, :2].mean(0)
        spod = Q[:, 2] < podrazka
        Q[spod, :2] += (Q[spod, :2] - stred) * 0.06
        if plocha:
            hore = Q[:, 2] > podrazka + 0.03
            Q[hore & ~pred, 2] -= 0.01
        h = ConvexHull(Q)
        o = len(V)
        V += list(Q)
        F += [[int(a) + o for a in tri] for tri in h.simplices]
    V = np.array(V)
    pouzite = sorted({v for f in F for v in f})
    mp = {v: i for i, v in enumerate(pouzite)}
    V = V[pouzite]
    F = [[mp[v] for v in f] for f in F]
    ob = BU.mesh_objekt(meno, V, F)
    # konzistentná orientácia plôch a zaoblenie
    bpy.context.view_layer.objects.active = ob
    for o in bpy.context.selected_objects:
        o.select_set(False)
    ob.select_set(True)
    bpy.ops.object.mode_set(mode='EDIT')
    bpy.ops.mesh.select_all(action='SELECT')
    bpy.ops.mesh.normals_make_consistent(inside=False)
    bpy.ops.object.mode_set(mode='OBJECT')
    mod = ob.modifiers.new('zaoblenie', 'SUBSURF')
    mod.levels = 2
    BU.aplikuj_modifikator(ob, 'zaoblenie')
    # podrážka znova rovná
    me = ob.data
    Pv = np.zeros(len(me.vertices) * 3, np.float32)
    me.vertices.foreach_get('co', Pv)
    Pv = Pv.reshape(-1, 3)
    Pv[:, 2] = np.where(Pv[:, 2] < 0.006, 0.0, Pv[:, 2])
    me.vertices.foreach_set('co', Pv.ravel())
    me.update()
    BU.smart_uv(ob)
    ob.data.materials.append(napec(ob, material_fn, ctx.S, meno, 512))
    Pf, *_ = BU.data_meshu(ob)
    ctx.prenos.aplikuj(ob, ctx.arm, Pf)
    ctx.log(meno, len(Pf), 'vrcholov')
    return ob


def napec_alfa(ob, fn, S, meno, obojstranny=False):
    """fn(P, N) -> (albedo (S,S,3), alfa (S,S), drsnost). Materiál s priehľadnosťou (mäkké okraje vlasov, brady)."""
    P, tri, uv, lv, _ = BU.data_meshu(ob)
    me = ob.data
    N = np.zeros(len(me.vertices) * 3, np.float32)
    me.vertices.foreach_get('normal', N)
    N = N.reshape(-1, 3)
    (Pt, Nt), _ = T.rasterizuj(uv, tri, [P[lv], N[lv]], S)
    Nt /= np.maximum(np.linalg.norm(Nt, axis=-1, keepdims=True), 1e-9)
    alb, alfa, drs = fn(Pt, Nt)
    img = BU.obrazok(meno + '_farba', np.concatenate([np.clip(alb, 0, 1), np.clip(alfa, 0, 1)[..., None]], -1))
    mat = BU.material(meno, img, drsnost_hodnota=drs, alfa=True)
    mat.use_backface_culling = not obojstranny
    return mat
