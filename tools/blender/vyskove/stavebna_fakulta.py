# Stavebná fakulta STU, Radlinského 11 / Imricha Karvaša (Oldřich Černý, projekt 1962, blok A 1967, celok 1974;
# veža obnovená 2009–10, blok B a lomenica 2020–21, blok A 2023). Podklady (opis slovami, s odkazmi):
# napady/pamiatky-podklady.md – prieskum podľa CLAUDE.md, „Pamiatky a významné stavby“ (#127, #130).
# Obrysy z OSM (tools/blender/osm_obrysy_overpass.py → data/obrysy.json, 'stavebna-fakulta'):
#   blok B relation 1181349 (podnož okolo dvoch átrií, východné átrium = vnútorný prstenec, západné = zárez k bloku A),
#   veža C way 77937579 (47,2 × 14,7 m, 24 NP, 77,5 m), blok A way 77937646 (66 × 15 m, 6 NP),
#   časti: spoj B–C 77937543 (4 NP), lomenica 1324890210 (18,1 × 7,7 m), prístrešok pri aule 1324890201.
# Hmoty:
#   – blok B: suterén čiastočne nad terénom + 3 NP, atika ~15,6 m; fasáda z veľkých svetlých panelov s pásovými
#     oknami (okná po 1,5 m v sivých rámoch); stredný blok medzi átriami o podlažie vyšší so 28 pyramídovými
#     svetlíkmi 2,4 × 2,4 m (skupiny 12 + 16); aula vo východnom krídle s vyššou strechou bez okien;
#   – hlavný vstup na SV fasáde (Imricha Karvaša): široké schodisko (10 stupňov), lomenica – lomená doska s 5 hrebeňmi,
#     biely podhľad, tmavosivý oplechovaný okraj; pod ňou tri oranžové portály (stredný oblý s nápisom
#     „STAVEBNÁ FAKULTA“), vľavo hore tabuľa „STU SvF“, vľavo tri stožiare (SR, STU, SvF), vpravo rampa;
#   – veža C: svetlosivé hliníkové panely, pás parapetu 1,25 m a tmavé sklo 1,75 m (raster 1,5 × 3 m), úzke čelá
#     plné, pri koncoch zvislé pásy vodorovných lamiel (schodiská), na streche strojovňa a antény;
#   – blok A: 6 NP, rovnaké panely a pásové okná.
# Názvy univerzity sú pomenovanie verejnej inštitúcie (ako pri UK), nie značka firmy.

import math

import bpy

from veze import Geo, z_hry, stred_obrysu, odsad, dlzka, normala, strecha, sklo, plocha_obrysu, do_hry
from spolocne import material

Z_SOKEL = 1.5          # suterén nad terénom (vstupná úroveň po 10 schodoch)
PODLAZIA_B = [Z_SOKEL, 6.0, 10.2, 14.4]
Z_ATIKA_B = 15.6
Z_STRED = 19.6         # stredný blok medzi átriami (+1 podlažie)
Z_AULA = 19.2
VEZA_PRIZEMIE = 4.5
VEZA_PODLAZIE = 3.0
VEZA_NP = 24
Z_VEZA = VEZA_PRIZEMIE + (VEZA_NP - 1) * VEZA_PODLAZIE      # 73,5 m strop 24. NP
Z_VEZA_ATIKA = Z_VEZA + 1.0
A_PODLAZIA = 6
A_VYSKA = 3.4
Z_DVOR = 1.8           # úroveň východného átria (laser ÚGKK: vnútro dvora +1,4 až +1,8 m nad ulicou pri vstupe)


def materialy():
    return {
        'panel': material('panel-svf-bezovy', '#d8cfbf', drsnost=0.75),
        'panel_tmavy': material('panel-svf-tmavsi', '#c7bdab', drsnost=0.8),
        'sokel': material('sokel-svf', '#62666a', drsnost=0.85),
        'ram': material('detail-ram-svf', '#80868c', drsnost=0.5, kov=0.4),
        'okno': sklo('okna-svf', '#2e3b47', drsnost=0.08, kov=0.7),
        'sklo_hala': sklo('sklo-hala-svf', '#3d4c58', drsnost=0.05, kov=0.6),
        'veza_panel': material('panel-veza-svf', '#d3d7db', drsnost=0.4, kov=0.45),
        'veza_sklo': sklo('veza-sklo-svf', '#3e4f60', drsnost=0.05, kov=0.75),
        'lamely': material('detail-lamely-svf', '#4b5056', drsnost=0.5, kov=0.5),
        'strecha': material('strecha-svf', '#55585b', drsnost=0.95),
        'atika': material('atika-svf', '#bfb6a6', drsnost=0.8),
        'podhlad': material('lomenica-podhlad', '#f1f0ea', drsnost=0.85),
        'oplechovanie': material('lomenica-okraj', '#3d444c', drsnost=0.5, kov=0.5),
        'oranzova': material('portal-oranzovy', '#e8851c', drsnost=0.55),
        'pismo_biele': material('detail-pismo-biele', '#ffffff', drsnost=0.6),
        'pismo_tmave': material('detail-pismo-tmave', '#4a4e53', drsnost=0.6),
        'tabula': material('tabula-stu', '#e9e9e6', drsnost=0.6),
        'schody': material('kamen-schody-svf', '#9b9c98', drsnost=0.85),
        'zabradlie': material('detail-zabradlie-svf', '#1e2022', drsnost=0.5, kov=0.6),
        'stoziar': material('detail-stoziar', '#d9dcde', drsnost=0.4, kov=0.7),
        'vlajka_b': material('detail-vlajka-biela', '#f4f4f4', drsnost=0.8),
        'vlajka_m': material('detail-vlajka-modra', '#1d4fa3', drsnost=0.8),
        'vlajka_c': material('detail-vlajka-cervena', '#d0202d', drsnost=0.8),
        'vlajka_stu': material('detail-vlajka-stu', '#b3202a', drsnost=0.8),
        'vlajka_svf': material('detail-vlajka-svf', '#ee8a1e', drsnost=0.8),
        'svetlik': sklo('sklo-svetlik-svf', '#6f8796', drsnost=0.05, kov=0.5),
        'golier': material('detail-golier-svetlika', '#3f4246', drsnost=0.7),
        'technika': material('technika-svf', '#a3a7ab', drsnost=0.6, kov=0.3),
        'anteny': material('detail-anteny', '#c8c8c8', drsnost=0.4, kov=0.6),
        'stoziar_cerveny': material('detail-stoziar-cerveny', '#c8322a', drsnost=0.5),
        'trava': material('trava-atrium-svf', '#6d8a45', drsnost=1.0),
        'voda': sklo('voda-atrium-svf', '#3c5f69', drsnost=0.04, kov=0.3),
        'drevo': material('detail-lavicka-drevo', '#8a6a48', drsnost=0.8),
        'koruna': material('koruna-atrium', '#52703a', drsnost=1.0),
    }


# --- pomôcky v rovine (lokálne súradnice Blendera, os u = pozdĺž bloku B, v = kolmo na SV) -----------------

def premietni(body, c, u):
    v = (-u[1], u[0])
    return [((x - c[0]) * u[0] + (y - c[1]) * u[1], (x - c[0]) * v[0] + (y - c[1]) * v[1]) for x, y in body]


def zo_st(s, t, c, u):
    v = (-u[1], u[0])
    return (c[0] + u[0] * s + v[0] * t, c[1] + u[1] * s + v[1] * t)


def obdlznik_st(s0, s1, t0, t1, c, u):
    return [zo_st(s0, t0, c, u), zo_st(s1, t0, c, u), zo_st(s1, t1, c, u), zo_st(s0, t1, c, u)]


def fasada_pasova(G, M, poly, podlazia, z_atika, *, os_okna=1.5, krajne=1.2, uzavreta=True, okna=True, sokel=True, pilier=True):
    """Fasáda z veľkých panelov s pásovými oknami: na každom podlaží plný parapetný pás, pás okien vnorených
    o 0,12 m (rámy po os_okna) a nadokenný pás; dole tmavý sokel, hore atika."""
    n = len(poly)
    for i in range(n if uzavreta else n - 1):
        a, b = poly[i], poly[(i + 1) % n]
        L = dlzka(a, b)
        if L < 0.3:
            continue
        nx, ny = normala(a, b)
        tx, ty = (b[0] - a[0]) / L, (b[1] - a[1]) / L
        if sokel:
            # sokel siaha 4 m pod úroveň ulice pri vstupe – terén pod komplexom klesá o ~3 m (suterén vystupuje)
            G.stena(M['sokel'], a, b, -4.0, PODLAZIA_B[0] if z_atika < 60 else 0.6)
        z_zac = podlazia[0]
        if not okna or L < 2 * krajne + os_okna:
            G.stena(M['panel'], a, b, z_zac, z_atika)
            continue
        pocet = int((L - 2 * krajne) // os_okna)
        okraj = (L - pocet * os_okna) / 2
        A = (a[0] + tx * okraj, a[1] + ty * okraj)
        B = (b[0] - tx * okraj, b[1] - ty * okraj)
        for k in range(len(podlazia) - 1):
            z0, z1 = podlazia[k], podlazia[k + 1]
            zo, zh = z0 + 1.05, z1 - 0.55          # pás okien
            G.stena(M['panel'], a, b, z0, zo)       # parapet
            G.stena(M['panel'], a, b, zh, z1)       # nadokenný pás
            G.stena(M['panel'], a, A, zo, zh)       # krajné plné polia
            G.stena(M['panel'], B, b, zo, zh)
            # vnorený pás skla s ostením
            d = 0.12
            Ai, Bi = (A[0] - nx * d, A[1] - ny * d), (B[0] - nx * d, B[1] - ny * d)
            G.stena(M['okno'], Ai, Bi, zo, zh)
            G.plocha(M['panel_tmavy'], [(A[0], A[1], zo), (B[0], B[1], zo), (Bi[0], Bi[1], zo), (Ai[0], Ai[1], zo)])
            G.plocha(M['panel_tmavy'], [(Ai[0], Ai[1], zh), (Bi[0], Bi[1], zh), (B[0], B[1], zh), (A[0], A[1], zh)])
            G.stena(M['panel_tmavy'], A, Ai, zo, zh)
            G.stena(M['panel_tmavy'], Bi, B, zo, zh)
            for j in range(pocet + 1):
                p = (A[0] + tx * os_okna * j - nx * 0.06, A[1] + ty * os_okna * j - ny * 0.06)
                G.kvader(M['ram'], p, (tx, ty), 0.07, 0.12, zo, zh, vrch=False)
            # okná v skupinách po štyroch, medzi skupinami plný pilier z panelov (ako na fotkách fasády)
            if pilier:
                for j in range(4, pocet, 5):
                    p = (A[0] + tx * os_okna * (j + 0.5) - nx * 0.065, A[1] + ty * os_okna * (j + 0.5) - ny * 0.065)
                    G.kvader(M['panel'], p, (tx, ty), os_okna, 0.13, zo, zh, vrch=False)
            # vodorovná priečka (horné sklopné krídlo)
            G.pas(M['ram'], [Ai, Bi], zh - 0.62, zh - 0.56, von=0.05, dnu=0.0, uzavreta=False)
        G.stena(M['panel'], a, b, podlazia[-1], z_atika)


# --- časti ----------------------------------------------------------------------------------------

def blok_b(G, M, vonk, dvor, c, u):
    """Podnož: vonkajší obrys + východné átrium (diera). Fasády dnu aj von, strecha s dierou."""
    fasada_pasova(G, M, vonk, PODLAZIA_B, Z_ATIKA_B)
    dvor_cw = list(reversed(dvor))                 # steny átria lícom do dvora
    fasada_pasova(G, M, dvor_cw, PODLAZIA_B, Z_ATIKA_B, os_okna=1.5, krajne=1.0)
    strecha_s_dierou(G, M['strecha'], vonk, [dvor], Z_ATIKA_B - 0.4)
    # atika: vonkajšia a okolo dvora
    atika(G, M, vonk, Z_ATIKA_B - 0.4, Z_ATIKA_B)
    atika(G, M, dvor_cw, Z_ATIKA_B - 0.4, Z_ATIKA_B)


def atika(G, M, poly, z0, z1, hrubka=0.3):
    vn = odsad(poly, -hrubka)
    n = len(poly)
    for i in range(n):
        j = (i + 1) % n
        G.stena(M['atika'], vn[j], vn[i], z0, z1)
        G.plocha(M['atika'], [(vn[i][0], vn[i][1], z1), (poly[i][0], poly[i][1], z1), (poly[j][0], poly[j][1], z1), (vn[j][0], vn[j][1], z1)])
        G.pas(M['oplechovanie'], [poly[i], poly[j]], z1, z1 + 0.06, von=0.04, dnu=hrubka, uzavreta=False)


def strecha_s_dierou(G, mat, vonk, diery, z):
    """Plochá strecha nad obrysom s dierami (átriá) – triangulácia mnohouholníka s dierami (mathutils)."""
    from mathutils import Vector
    from mathutils.geometry import tessellate_polygon
    kruhy = [vonk] + list(diery)
    body = [p for k in kruhy for p in k]
    for tri in tessellate_polygon([[Vector((x, y, 0.0)) for x, y in k] for k in kruhy]):
        a, b, c = (body[i] for i in tri)
        tr = [(a[0], a[1], z), (b[0], b[1], z), (c[0], c[1], z)]
        if (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]) < 0:
            tr.reverse()
        G.plocha(mat, tr)


def nadstavba(G, M, poly, z0, z1, okna=True):
    """Vyššia časť bloku B (stredný blok, aula): fasáda od strechy podnože po novú atiku."""
    if okna:
        fasada_pasova(G, M, poly, [z0, z1 - 0.6], z1, sokel=False)
    else:
        n = len(poly)
        for i in range(n):
            a, b = poly[i], poly[(i + 1) % n]
            G.stena(M['panel_tmavy'], a, b, z0, z1)
            # zvislé rebrá na plnej stene auly
            L = dlzka(a, b)
            nx, ny = normala(a, b)
            tx, ty = (b[0] - a[0]) / max(L, 1e-6), (b[1] - a[1]) / max(L, 1e-6)
            for k in range(1, int(L // 3.0)):
                p = (a[0] + tx * 3.0 * k + nx * 0.1, a[1] + ty * 3.0 * k + ny * 0.1)
                G.kvader(M['panel'], p, (tx, ty), 0.25, 0.2, z0, z1 - 0.3, vrch=False)
    G.vodorovna(M['strecha'], poly, z1 - 0.3)
    atika(G, M, poly, z1 - 0.3, z1)


def svetliky(G, M, poly_st, c, u, z):
    """28 pyramídových svetlíkov 2,4 × 2,4 m (skupiny 12 + 16, šachovnicovo) na streche stredného bloku."""
    s0, s1, t0, t1 = poly_st
    skupiny = [(3, 4), (4, 4)]
    sirka_skupin = s1 - s0
    for g_i, (rady, stlpce) in enumerate(skupiny):
        sg0 = s0 + 3.0 + g_i * sirka_skupin / 2
        for r in range(rady):
            for k in range(stlpce):
                s = sg0 + k * 4.4 + (2.2 if r % 2 else 0)
                t = (t0 + t1) / 2 - (rady - 1) * 2.1 + r * 4.2
                if s + 1.5 > s1:
                    continue
                st = zo_st(s, t, c, u)
                G.kvader(M['golier'], st, u, 2.6, 2.6, z, z + 0.35)
                h = 0.65
                rohy = [zo_st(s - 1.2, t - 1.2, c, u), zo_st(s + 1.2, t - 1.2, c, u), zo_st(s + 1.2, t + 1.2, c, u), zo_st(s - 1.2, t + 1.2, c, u)]
                vrch = (st[0], st[1], z + 0.35 + h)
                for i in range(4):
                    a, b = rohy[i], rohy[(i + 1) % 4]
                    G.plocha(M['svetlik'], [(a[0], a[1], z + 0.35), (b[0], b[1], z + 0.35), vrch])


def atrium(G, M, dvor, c, u):
    """Východné (veľké) átrium: trávnik, pri fasádach anglické dvorce (zapustený pás so zábradlím – laser tam
    ukazuje terén o ~1,5–2,5 m nižšie), v strede dláždená oddychová plocha s plytkou nádržou, lavičky a stromy.
    Nádrž a lavičky sú podľa opisu majiteľa v #127 (vo verejných zdrojoch neoverené – tvar a poloha sú odhad)."""
    # materiály: dlažba a obruby ako kameň schodiska, kmene ako drevo lavičiek (menej volaní kreslenia)
    d = dvor if plocha_obrysu(dvor) > 0 else list(reversed(dvor))
    vnut = odsad(d, -2.5)
    n = len(d)
    for i in range(n):
        j = (i + 1) % n
        G.plocha(M['schody'], [(d[i][0], d[i][1], -0.1), (d[j][0], d[j][1], -0.1),
                               (vnut[j][0], vnut[j][1], -0.1), (vnut[i][0], vnut[i][1], -0.1)])
    G.hranol(M['schody'], vnut, -0.1, Z_DVOR, mat_vrch=M['trava'])
    # zábradlie nad anglickými dvorcami: madlo a stĺpiky po 2 m
    G.pas(M['zabradlie'], vnut, Z_DVOR + 0.95, Z_DVOR + 1.0, von=0.03, dnu=0.03)
    for i in range(n):
        a, b = vnut[i], vnut[(i + 1) % n]
        L = dlzka(a, b)
        for k in range(int(L // 2.0) + 1):
            t = min(k * 2.0, L) / max(L, 1e-6)
            G.valec(M['zabradlie'], (a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t), 0.025, Z_DVOR, Z_DVOR + 0.95, seg=5)
    st = premietni(d, c, u)
    s0, s1 = min(p[0] for p in st), max(p[0] for p in st)
    t0, t1 = min(p[1] for p in st), max(p[1] for p in st)
    sm, tm = (s0 + s1) / 2, (t0 + t1) / 2
    hore = lambda q: q if plocha_obrysu(q) > 0 else list(reversed(q))
    z = Z_DVOR + 0.04
    G.hranol(M['schody'], hore(obdlznik_st(sm - 14, sm + 14, tm - 6, tm + 6, c, u)), Z_DVOR - 0.2, z)
    # plytká nádrž s betónovou obrubou
    nadrz = hore(obdlznik_st(sm - 1, sm + 9, tm - 2, tm + 2, c, u))
    G.pas(M['schody'], nadrz, z, z + 0.4, von=0.0, dnu=0.3)
    G.vodorovna(M['voda'], odsad(nadrz, -0.3), z + 0.28)
    # lavičky po dlhých stranách dlažby, sedákom k nádrži
    for s_l in (sm - 10, sm - 5, sm + 12):
        for strana in (-1, 1):
            t_l = tm + strana * 4.8
            p = zo_st(s_l, t_l, c, u)
            G.kvader(M['drevo'], p, u, 1.8, 0.45, z + 0.42, z + 0.48)
            for k in (-0.75, 0.75):
                G.kvader(M['zabradlie'], zo_st(s_l + k, t_l, c, u), u, 0.08, 0.4, z, z + 0.42, vrch=False)
            G.kvader(M['drevo'], zo_st(s_l, t_l + strana * 0.22, c, u), u, 1.8, 0.06, z + 0.5, z + 0.85)
    # stromy na trávniku (jednoduchá koruna – zblízka ich zakryjú múry átria)
    for k, (ds, dt, v) in enumerate(((-19, -5, 1.0), (-19, 5, 0.85), (19, -5, 0.9), (19, 5, 1.05),
                                     (-6, -8.3, 0.8), (6, 8.3, 0.9), (-15, 0, 0.75))):
        p = zo_st(sm + ds, tm + dt, c, u)
        G.valec(M['drevo'], p, 0.16 * v, Z_DVOR, Z_DVOR + 3.0 * v, seg=6, r1=0.11 * v)
        G.valec(M['koruna'], p, 0.4 * v, Z_DVOR + 2.4 * v, Z_DVOR + 4.8 * v, seg=8, r1=2.4 * v, vrch=False)
        G.valec(M['koruna'], p, 2.4 * v, Z_DVOR + 4.8 * v, Z_DVOR + 7.6 * v, seg=8, r1=0.25 * v)


def veza(G, M, obrys_v, u):
    """Veža C: dlhé fasády – pás parapetu a skla, raster 1,5 m; úzke čelá plné; lamely pri koncoch."""
    # obdĺžnik veže v osiach (s pozdĺž, t naprieč)
    c = (sum(p[0] for p in obrys_v) / len(obrys_v), sum(p[1] for p in obrys_v) / len(obrys_v))
    st = premietni(obrys_v, c, u)
    s0, s1 = min(p[0] for p in st), max(p[0] for p in st)
    t0, t1 = min(p[1] for p in st), max(p[1] for p in st)
    roh = [zo_st(s0, t0, c, u), zo_st(s1, t0, c, u), zo_st(s1, t1, c, u), zo_st(s0, t1, c, u)]
    if plocha_obrysu(roh) < 0:
        roh = list(reversed(roh))
    # prízemie: ustúpená presklená hala pod vyloženými podlažiami
    pr = odsad(roh, -1.5)
    for i in range(4):
        a, b = pr[i], pr[(i + 1) % 4]
        G.stena(M['sklo_hala'], a, b, 0.0, VEZA_PRIZEMIE)
        G.stena(M['sokel'], a, b, -4.0, 0.0)
    G.plocha(M['podhlad'], [(p[0], p[1], VEZA_PRIZEMIE) for p in reversed(roh)])
    urovne = [VEZA_PRIZEMIE + VEZA_PODLAZIE * k for k in range(VEZA_NP)]   # 2.–24. NP
    for i in range(4):
        a, b = roh[i], roh[(i + 1) % 4]
        L = dlzka(a, b)
        tx, ty = (b[0] - a[0]) / L, (b[1] - a[1]) / L
        nx, ny = normala(a, b)
        dlha = L > 30
        if not dlha:
            G.stena(M['veza_panel'], a, b, VEZA_PRIZEMIE, Z_VEZA_ATIKA)
            # škáry panelov po podlažiach
            for z in urovne[1:]:
                G.pas(M['lamely'], [a, b], z - 0.02, z + 0.02, von=0.01, dnu=0.0, uzavreta=False, vrch=False, spodok=False)
            continue
        # pás lamiel (schodisko) na jednom konci každej dlhej fasády – striedavo
        lam = 2.4
        A_l, B_l = (a, (a[0] + tx * lam, a[1] + ty * lam)) if i % 2 else ((b[0] - tx * lam, b[1] - ty * lam), b)
        G.stena(M['lamely'], (A_l[0] - nx * 0.25, A_l[1] - ny * 0.25), (B_l[0] - nx * 0.25, B_l[1] - ny * 0.25), VEZA_PRIZEMIE, Z_VEZA)
        G.zaluzie(M['lamely'], [A_l, B_l], VEZA_PRIZEMIE + 0.2, Z_VEZA - 0.2, rozostup=0.35, hlbka=0.18, uzavreta=False)
        a2, b2 = (B_l, b) if i % 2 else (a, A_l)
        L2 = dlzka(a2, b2)
        pocet = max(1, round(L2 / 1.5))
        krok = L2 / pocet
        d = 0.1
        for k in range(len(urovne) - 1):
            z0, z1 = urovne[k], urovne[k + 1]
            zs = z0 + 1.255
            G.stena(M['veza_panel'], a2, b2, z0, zs)
            G.stena(M['veza_sklo'], (a2[0] - nx * d, a2[1] - ny * d), (b2[0] - nx * d, b2[1] - ny * d), zs, z1)
        # stĺpiky rastra a pásy priečok
        for j in range(pocet + 1):
            p = (a2[0] + tx * krok * j, a2[1] + ty * krok * j)
            G.kvader(M['veza_panel'], p, (tx, ty), 0.34, 0.2, urovne[0], urovne[-1], vrch=False)
        G.stena(M['veza_panel'], a2, b2, urovne[-1], Z_VEZA_ATIKA)
        # ostenie skla hore a dole (aby nevznikla štrbina)
        for k in range(len(urovne) - 1):
            z0, z1 = urovne[k], urovne[k + 1]
            G.pas(M['veza_panel'], [a2, b2], z1 - 0.05, z1, von=0.0, dnu=d, uzavreta=False, vrch=False)
    G.vodorovna(M['strecha'], odsad(roh, -0.3), Z_VEZA_ATIKA - 0.8)
    atika(G, M, roh, Z_VEZA_ATIKA - 0.8, Z_VEZA_ATIKA)
    # strojovňa výťahov a technika, antény (rámy, paraboly), červeno-biely stožiar na rohu
    G.kvader(M['technika'], c, u, 14.0, 8.0, Z_VEZA_ATIKA - 0.8, Z_VEZA_ATIKA + 2.6, mat_vrch=M['strecha'])
    for s in (-1, 1):
        p = zo_st(s * 17.0, 0.0, c, u)
        G.valec(M['anteny'], p, 0.08, Z_VEZA_ATIKA - 0.8, Z_VEZA_ATIKA + 4.0, seg=6)
        for k in range(3):
            q = zo_st(s * 17.0 + (k - 1) * 0.9, 0.4, c, u)
            G.valec(M['anteny'], q, 0.3, Z_VEZA_ATIKA + 1.0 + k * 0.8, Z_VEZA_ATIKA + 1.08 + k * 0.8, seg=8)
    roh_st = zo_st(s0 + 1.0, t1 - 1.0, c, u)
    for k in range(6):
        G.valec(M['stoziar_cerveny'] if k % 2 == 0 else M['anteny'], roh_st, 0.18, Z_VEZA_ATIKA + k * 0.7, Z_VEZA_ATIKA + (k + 1) * 0.7, seg=6)
    return roh


def blok_a(G, M, obrys_a):
    podl = [Z_SOKEL] + [Z_SOKEL + 3.5 + A_VYSKA * k for k in range(A_PODLAZIA)]
    z_atika = podl[-1] + 1.0
    fasada_pasova(G, M, obrys_a, podl, z_atika)
    G.vodorovna(M['strecha'], odsad(obrys_a, -0.3), z_atika - 0.4)
    atika(G, M, obrys_a, z_atika - 0.4, z_atika)
    return z_atika


def lomenica(G, M, c_vstup, u, n_von, z_hore):
    """Lomená doska 18,1 × 7,7 m: profil v rovine fasády – 2 krajné polroviny, 5 hrebeňov, 4 úžľabia."""
    L, D = 18.1, 7.7
    z_dol, z_hreb, z_kraj = z_hore - 3.2, z_hore, z_hore - 2.0
    xs = [-L / 2]
    zs = [z_kraj]
    krok = L / 10
    for k in range(10):
        xs.append(-L / 2 + krok * (k + 1))
    # body: 0 kraj, 1 hrebeň, 2 úžľabie, 3 hrebeň … 9 hrebeň, 10 kraj
    zs = [z_kraj] + [z_hreb if k % 2 == 0 else z_dol for k in range(9)] + [z_kraj]
    tx, ty = u
    hrubka = 0.22
    def bod(x, d, z):
        return (c_vstup[0] + tx * x + n_von[0] * d, c_vstup[1] + ty * x + n_von[1] * d, z)
    for k in range(10):
        x0, x1, z0, z1 = xs[k], xs[k + 1], zs[k], zs[k + 1]
        # spodná plocha (podhľad) a vrchná (oplechovaná) – lícom dole/hore
        spod = [bod(x0, 0, z0), bod(x0, D, z0), bod(x1, D, z1), bod(x1, 0, z1)]
        vrch = [bod(x0, 0, z0 + hrubka), bod(x1, 0, z1 + hrubka), bod(x1, D, z1 + hrubka), bod(x0, D, z0 + hrubka)]
        celo = [bod(x0, D, z0), bod(x0, D, z0 + hrubka), bod(x1, D, z1 + hrubka), bod(x1, D, z1)]
        # obojstranne – smer líca závisí od natočenia; zospodu je vždy bližšie biely podhľad, zhora tmavý plech
        for poly, mat in ((spod, M['podhlad']), (vrch, M['oplechovanie']), (celo, M['oplechovanie'])):
            G.plocha(mat, poly)
            G.plocha(mat, poly[::-1])
    for x, z in ((xs[0], zs[0]), (xs[-1], zs[-1])):
        q = [bod(x, 0, z), bod(x, D, z), bod(x, D, z + hrubka), bod(x, 0, z + hrubka)]
        G.plocha(M['oplechovanie'], q)
        G.plocha(M['oplechovanie'], q[::-1])


def napis_rovny(G, mat, text, stred, smer, n_von, z0, vyska, hlbka=0.03, medzera=0.12):
    """Písmená z písma Blendera na rovnej stene (stred v rovine steny, smer = os písania)."""
    dg = bpy.context.evaluated_depsgraph_get
    pismena = []
    for ch in text:
        if ch == ' ':
            pismena.append((None, vyska * 0.5))
            continue
        cu = bpy.data.curves.new('pismeno', 'FONT')
        cu.body = ch
        cu.size = vyska * 1.35
        cu.extrude = hlbka
        cu.align_x = 'CENTER'
        ob = bpy.data.objects.new('pismeno', cu)
        bpy.context.scene.collection.objects.link(ob)
        ev = ob.evaluated_get(dg())
        me = ev.to_mesh()
        v = [tuple(x.co) for x in me.vertices]
        f = [tuple(p.vertices) for p in me.polygons]
        sirka = (max(x[0] for x in v) - min(x[0] for x in v)) if v else vyska * 0.5
        pismena.append(((v, f), sirka))
        ev.to_mesh_clear()
        bpy.data.objects.remove(ob)
        bpy.data.curves.remove(cu)
    med = vyska * medzera
    W = sum(s for _, s in pismena) + med * (len(pismena) - 1)
    s = -W / 2
    for geo, sir in pismena:
        cx = s + sir / 2
        s += sir + med
        if not geo:
            continue
        v, f = geo
        ymin = min(x[1] for x in v)
        body = [(stred[0] + smer[0] * (cx + lx) + n_von[0] * (0.03 + lz), stred[1] + smer[1] * (cx + lx) + n_von[1] * (0.03 + lz), z0 + (ly - ymin))
                for lx, ly, lz in v]
        for poly in f:
            G.plocha(mat, [body[i] for i in poly])
    return W


def vstup(G, M, c_vstup, u, n_von):
    """Schodisko, lomenica, portály, nápisy, stožiare, rampa. c_vstup = bod na fasáde (stred vstupu).
    x = vpravo z pohľadu človeka pred vstupom (r), d = von od fasády (n_von)."""
    r = (-n_von[1], n_von[0])
    u = r
    tx, ty = r
    def bod(x, d):
        return (c_vstup[0] + tx * x + n_von[0] * d, c_vstup[1] + ty * x + n_von[1] * d)
    # schodisko: 10 stupňov po 0,15 m, stupeň 0,4 m, šírka 22 m; podesta pod lomenicou (7,7 m hlboká)
    SIR, POD = 22.0, 7.7
    G.kvader(M['schody'], bod(0, POD / 2), u, SIR, POD, 0.0, Z_SOKEL)
    for k in range(9):                       # 10 výšok stupňa: podesta 1,5 m → 9 stupňov → ulica
        d0 = POD + k * 0.4
        G.kvader(M['schody'], bod(0, d0 + 0.2), u, SIR, 0.4, 0.0, Z_SOKEL - 0.15 * (k + 1))
    D_SCH = POD + 9 * 0.4
    # zábradlie: dve krajné a dve stredné madlá po schodoch
    for x in (-SIR / 2 + 0.2, -4.0, 4.0, SIR / 2 - 0.2):
        a, b = bod(x, POD + 0.1), bod(x, D_SCH)
        for d, h in ((POD + 0.1, Z_SOKEL), (D_SCH, 0.0)):
            p = bod(x, d)
            G.kvader(M['zabradlie'], p, u, 0.06, 0.06, h, h + 1.0, vrch=True)
        G.tram(M['zabradlie'], (a[0], a[1], Z_SOKEL + 1.0), (b[0], b[1], 1.0), 0.06)
    # rampa vpravo: mierny sklon popri fasáde
    r0, r1 = bod(SIR / 2 + 1.0, 1.2), bod(SIR / 2 + 19.0, 1.2)
    nx, ny = n_von
    rampa = [(r0[0] - nx * 1.0, r0[1] - ny * 1.0, Z_SOKEL), (r0[0] + nx * 1.0, r0[1] + ny * 1.0, Z_SOKEL),
             (r1[0] + nx * 1.0, r1[1] + ny * 1.0, 0.05), (r1[0] - nx * 1.0, r1[1] - ny * 1.0, 0.05)]
    G.plocha(M['schody'], rampa)
    G.plocha(M['schody'], rampa[::-1])
    G.tram(M['zabradlie'], (r0[0] + nx * 1.0, r0[1] + ny * 1.0, Z_SOKEL + 1.0), (r1[0] + nx * 1.0, r1[1] + ny * 1.0, 1.05), 0.06)
    # lomenica nad podestou
    lomenica(G, M, c_vstup, u, n_von, PODLAZIA_B[1] + 2.4)
    # presklená vstupná stena pod lomenicou (prízemie)
    a, b = bod(-SIR / 2, 0.05), bod(SIR / 2, 0.05)
    G.stena(M['sklo_hala'], b, a, Z_SOKEL, PODLAZIA_B[1])
    # tri oranžové portály: stredný oblý (otočné dvere), krajné hranaté
    for x, oble in ((-4.6, False), (0.0, True), (4.6, False)):
        p = bod(x, 0.35)
        if oble:
            G.valec(M['oranzova'], p, 1.75, Z_SOKEL + 2.6, Z_SOKEL + 3.4, seg=16, vrch=True)
            G.valec(M['sklo_hala'], p, 1.6, Z_SOKEL, Z_SOKEL + 2.6, seg=16, vrch=False)
            napis_rovny(G, M['pismo_biele'], 'STAVEBNÁ', bod(0, 2.1), r, n_von, Z_SOKEL + 3.02, 0.22)
            napis_rovny(G, M['pismo_biele'], 'FAKULTA', bod(0, 2.1), r, n_von, Z_SOKEL + 2.74, 0.22)
        else:
            G.kvader(M['oranzova'], bod(x - 1.35, 0.3), u, 0.35, 0.6, Z_SOKEL, Z_SOKEL + 3.3)
            G.kvader(M['oranzova'], bod(x + 1.35, 0.3), u, 0.35, 0.6, Z_SOKEL, Z_SOKEL + 3.3)
            G.kvader(M['oranzova'], bod(x, 0.3), u, 3.05, 0.6, Z_SOKEL + 2.9, Z_SOKEL + 3.3)
    # tabuľa „STU SvF“ vľavo nad koncom lomenice vo výške 3. NP – len text (grafické logo univerzity nie)
    tab = bod(-(SIR / 2 - 1.0), 0.08)
    G.kvader(M['tabula'], tab, u, 3.2, 0.12, PODLAZIA_B[2] + 0.4, PODLAZIA_B[2] + 2.0)
    stred_textu = (tab[0] + nx * 0.07, tab[1] + ny * 0.07)
    napis_rovny(G, M['pismo_tmave'], 'STU', stred_textu, r, n_von, PODLAZIA_B[2] + 1.25, 0.38)
    napis_rovny(G, M['pismo_tmave'], 'SvF', stred_textu, r, n_von, PODLAZIA_B[2] + 0.72, 0.38)
    # tri stožiare vľavo od schodiska (SR, STU, SvF) s vlajkami
    for k, farby in enumerate((('vlajka_b', 'vlajka_m', 'vlajka_c'), ('vlajka_stu',), ('vlajka_svf',))):
        p = bod(-(SIR / 2 + 2.0 + k * 1.8), POD + 2.0)
        G.valec(M['stoziar'], p, 0.06, 0.0, 9.0, seg=6)
        h = 1.2 / len(farby)
        for i, f in enumerate(farby):
            z1 = 8.8 - i * h
            a, b = (p[0] + tx * 0.08, p[1] + ty * 0.08), (p[0] + tx * 1.9, p[1] + ty * 1.9)
            G.stena(M[f], a, b, z1 - h, z1)
            G.stena(M[f], b, a, z1 - h, z1)
        if len(farby) == 3:
            stit(G, M, (p[0] + tx * 0.75, p[1] + ty * 0.75), (tx, ty), 8.2)
    # pôdorys schodiska (+ okraj) – z dlaždíc sa vyhodia schody z OSM na tom mieste
    return [bod(-SIR / 2 - 1.0, POD - 0.5), bod(SIR / 2 + 1.0, POD - 0.5), bod(SIR / 2 + 1.0, D_SCH + 1.5), bod(-SIR / 2 - 1.0, D_SCH + 1.5)]


def stit(G, M, stred, smer, zc):
    """Zjednodušený štátny znak na vlajke (obe strany): biely lem, červený štít, biely dvojkríž, modré trojvršie."""
    tx, ty = smer
    def q(x0, x1, z0, z1, mat, d):
        a = (stred[0] + tx * x0, stred[1] + ty * x0)
        b = (stred[0] + tx * x1, stred[1] + ty * x1)
        nx, ny = -ty * d, tx * d
        A, B = (a[0] + nx, a[1] + ny), (b[0] + nx, b[1] + ny)
        G.stena(mat, A, B, z0, z1)
        G.stena(mat, (B[0] - 2 * nx, B[1] - 2 * ny), (A[0] - 2 * nx, A[1] - 2 * ny), z0, z1)
    q(-0.24, 0.24, zc - 0.32, zc + 0.3, M['vlajka_b'], 0.004)
    q(-0.21, 0.21, zc - 0.29, zc + 0.27, M['vlajka_c'], 0.008)
    q(-0.03, 0.03, zc - 0.16, zc + 0.22, M['vlajka_b'], 0.012)
    q(-0.12, 0.12, zc + 0.10, zc + 0.15, M['vlajka_b'], 0.012)
    q(-0.16, 0.16, zc - 0.02, zc + 0.04, M['vlajka_b'], 0.012)
    q(-0.21, 0.21, zc - 0.29, zc - 0.15, M['vlajka_m'], 0.012)


def postav(obrysy):
    zdroj = obrysy['stavebna-fakulta']
    B = next(h for h in zdroj['hlavne'] if h['id'] == '1181349')
    C = next(h for h in zdroj['hlavne'] if h['id'] == '77937579')
    A = next(h for h in zdroj['hlavne'] if h['id'] == '77937646')
    casti = {k['id']: k for k in zdroj['casti']}
    stred = stred_obrysu(B['body'])
    M = materialy()
    G = Geo()
    vonk = z_hry(B['body'], stred)
    dvor = z_hry(B['dvory'][0], stred)
    obrys_c = z_hry(C['body'], stred)
    obrys_a = z_hry(A['body'], stred)
    spoj = z_hry(casti['77937543']['body'], stred)
    lom = z_hry(casti['1324890210']['body'], stred)
    pristresok = z_hry(casti['1324890201']['body'], stred)
    # os bloku B = dlhá strana veže (rovnobežná s Imricha Karvaša)
    best = max(range(len(obrys_c)), key=lambda i: dlzka(obrys_c[i - 1], obrys_c[i]))
    a, b = obrys_c[best - 1], obrys_c[best]
    L = dlzka(a, b)
    u = ((b[0] - a[0]) / L, (b[1] - a[1]) / L)
    # u nech smeruje na VJV (k Radlinského): v Blenderi X na východ
    if u[0] < 0:
        u = (-u[0], -u[1])
    c0 = (0.0, 0.0)
    # vstup: stred lomenice na fasáde (strana lomenice najbližšia k bloku B)
    cl = (sum(p[0] for p in lom) / len(lom), sum(p[1] for p in lom) / len(lom))
    st_lom = premietni(lom, c0, u)
    # normála SV fasády: od stredu bloku k lomenici (kolmo na u)
    v = (-u[1], u[0])
    sgn = 1 if (cl[0] * v[0] + cl[1] * v[1]) > 0 else -1
    n_von = (v[0] * sgn, v[1] * sgn)
    t_fasady = min(p[1] * sgn for p in st_lom) * sgn          # t-súradnica fasády (bližšia strana lomenice)
    s_vstup = (min(p[0] for p in st_lom) + max(p[0] for p in st_lom)) / 2
    c_vstup = zo_st(s_vstup, t_fasady, c0, u)
    print(f'SvF: u = ({u[0]:.3f}, {u[1]:.3f}), vstup s = {s_vstup:.1f}, fasáda t = {t_fasady:.1f}')

    blok_b(G, M, vonk, dvor, c0, u)
    atrium(G, M, dvor, c0, u)
    # stredný blok medzi átriami a aula vo V krídle (rozsahy v s podľa átria a zárezu)
    st_b = premietni(vonk, c0, u)
    st_d = premietni(dvor, c0, u)
    sb0, sb1 = min(p[0] for p in st_b), max(p[0] for p in st_b)
    tb0, tb1 = min(p[1] for p in st_b), max(p[1] for p in st_b)
    sd0, sd1 = min(p[0] for p in st_d), max(p[0] for p in st_d)
    s_stred0 = sd0 - 43.0
    stredny = obdlznik_st(s_stred0, sd0, tb0 + 0.6, tb1 - 0.6, c0, u)
    nadstavba(G, M, stredny if plocha_obrysu(stredny) > 0 else list(reversed(stredny)), Z_ATIKA_B, Z_STRED)
    svetliky(G, M, (s_stred0 + 4.0, sd0 - 4.0, tb0 + 8.0, tb1 - 8.0), c0, u, Z_STRED - 0.3)
    aula = obdlznik_st(sb1 - 29.0, sb1 - 1.0, tb0 + 8.0, tb0 + 8.0 + 27.4, c0, u)
    nadstavba(G, M, aula if plocha_obrysu(aula) > 0 else list(reversed(aula)), Z_ATIKA_B, Z_AULA, okna=False)
    # pásový prístrešok pri aule (doska na stĺpoch)
    G.hranol(M['podhlad'], pristresok, 3.6, 3.9, mat_vrch=M['oplechovanie'])
    st_p = premietni(pristresok, c0, u)
    for k in range(6):
        sp = min(p[0] for p in st_p) + 2 + k * (max(p[0] for p in st_p) - min(p[0] for p in st_p) - 4) / 5
        tp = sum(p[1] for p in st_p) / len(st_p)
        G.valec(M['ram'], zo_st(sp, tp, c0, u), 0.12, 0.0, 3.6, seg=8)
    # veža, spoj, blok A
    veza(G, M, obrys_c, u)
    fasada_pasova(G, M, spoj, [Z_SOKEL, 5.0, 8.5, 12.0], 15.0)
    G.vodorovna(M['strecha'], spoj, 14.7)
    z_a = blok_a(G, M, obrys_a)
    schodisko = vstup(G, M, c_vstup, u, n_von)
    if plocha_obrysu(schodisko) < 0:
        schodisko = list(reversed(schodisko))

    # kolízie: krídla bloku B bez átria (obdĺžniky v osiach), veža, blok A, spoj; obrysy na nahradenie budov dlaždíc
    st_b_t = [(min(p[1] for p in st_d)), (max(p[1] for p in st_d))]
    kol = [
        obdlznik_st(sb0, sb1, tb0, st_b_t[0], c0, u),          # krídlo pri jednej dlhej strane
        obdlznik_st(sb0, sb1, st_b_t[1], tb1, c0, u),          # krídlo pri druhej
        obdlznik_st(sd1, sb1, st_b_t[0], st_b_t[1], c0, u),    # východné krídlo (aula)
        obdlznik_st(sd0 - 43.0, sd0, st_b_t[0], st_b_t[1], c0, u),   # stredný blok
    ]
    kol += [obrys_c, obrys_a, spoj]
    kol = [k if plocha_obrysu(k) > 0 else list(reversed(k)) for k in kol]
    # schodisko pred vstupom ako pochôdzna plocha (výšky nad základňou modelu): z ulice hore na podestu
    def lok(p):
        return [round(p[0], 2), round(-p[1], 2)]
    bod_ulica = zo_st(s_vstup, t_fasady + (7.7 + 4.4) * sgn, c0, u)
    bod_hore = zo_st(s_vstup, t_fasady + 7.6 * sgn, c0, u)
    bod_dvere = zo_st(s_vstup, t_fasady + 0.4 * sgn, c0, u)
    plochy = [
        {'body': [lok(bod_ulica) + [0.0], lok(bod_hore) + [Z_SOKEL]], 'sirka': 21.6},
        {'body': [lok(bod_hore) + [Z_SOKEL], lok(bod_dvere) + [Z_SOKEL]], 'sirka': 21.6},
    ]
    info = {
        'stred': [round(stred[0], 2), round(stred[1], 2)],
        # model sa položí na terén v tomto bode (ulica pri spodnom stupni schodiska), nie na najnižší terén pod obrysom
        'zakladnaBod': lok(bod_ulica),
        'bezKoliziiObrysov': True,
        'kolizie': [do_hry(k) for k in kol],
        'plochy': plochy,
        # lomenica a prístrešok sú v OSM samostatné „budovy“ (building=roof) – z dlaždíc sa vyhodia, model ich má
        'nahradit': [do_hry(lom), do_hry(pristresok), do_hry(schodisko)],
        # vchody na neskoršie „zavesenie“ interiéru (lokálne metre hry + výška podlahy nad základňou)
        'vchody': [
            {'id': 'hlavny', 'nazov': 'Hlavný vstup (Imricha Karvaša)', 'bod': lok(bod_dvere), 'vyska': Z_SOKEL},
        ],
    }
    print(f'SvF: blok A atika {z_a:.1f} m, veža {Z_VEZA_ATIKA + 2.6:.1f} m')
    return G, [vonk, obrys_c, obrys_a, spoj], Z_VEZA_ATIKA + 2.6, 'stavebna-fakulta', info
