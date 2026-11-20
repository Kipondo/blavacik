# Historická budova Starého Mesta z OSM (pôdorys aj s nádvoriami, podlažia, tvar strechy, časti)
# + doplnky z tabuľky SPEC (farby, veža, portikus s tympanónom, oporné piliere, koruna Dómu).
# Fasády: barokové okná so šambránami a rímsami (hrad/stavebne.py), kostoly vysoké okná a piliere,
# strechy podľa vzdialenosti od okraja (historicke/strechy.py) – fungujú aj pre krídla okolo nádvorí.

import json
import math
import os

from veze import Geo, z_hry, zjednodus, odsad, dlzka, normala, plocha_obrysu, stred_obrysu, ccw, sklo
from spolocne import material
from hrad.stavebne import barokova_fasada, strecha_ihlan
from historicke.strechy import strecha_podla_vzdialenosti, profil_valbovy, profil_mansardovy

KOSTOLY = {'church', 'cathedral', 'chapel', 'monastery'}


def nacitaj():
    with open(os.path.join(os.path.dirname(__file__), '..', 'data', 'pamiatky-sm.json')) as f:
        return json.load(f)


def cislo(v, d=None):
    try:
        return float(str(v).replace('m', '').strip())
    except (TypeError, ValueError):
        return d


def hrana_k_smeru(obrys, smer):
    """Index najdlhšej hrany, ktorej vonkajšia normála najlepšie mieri do smeru (x, z hry → Blender y = −z)."""
    sx, sy = smer[0], -smer[1]
    n = len(obrys)
    return max(range(n), key=lambda i: (normala(obrys[i], obrys[(i + 1) % n])[0] * sx + normala(obrys[i], obrys[(i + 1) % n])[1] * sy)
               * min(1.0, dlzka(obrys[i], obrys[(i + 1) % n]) / 12.0))


def portikus(G, obrys, smer, z_rimsy, mat_stlp, mat_tymp, mat_strecha, stlpy=4, sirka=None, klobuk=None):
    """Stĺpový portikus (polostĺpy pred fasádou) s trojuholníkovým tympanónom nad hlavnou rímsou."""
    i = hrana_k_smeru(obrys, smer)
    a, b = obrys[i], obrys[(i + 1) % len(obrys)]
    L = dlzka(a, b)
    ux, uy = (b[0] - a[0]) / L, (b[1] - a[1]) / L
    nx, ny = normala(a, b)
    m = ((a[0] + b[0]) / 2, (a[1] + b[1]) / 2)
    W = min(sirka or L * 0.4, L * 0.8)
    for k in range(stlpy):
        t = -W / 2 + W * k / max(1, stlpy - 1)
        c = (m[0] + ux * t + nx * 0.6, m[1] + uy * t + ny * 0.6)
        G.valec(mat_stlp, c, 0.5, 0.0, z_rimsy - 1.2, seg=12)
        G.kvader(mat_stlp, c, (ux, uy), 1.3, 1.3, -0.3, 0.6)
        G.kvader(mat_stlp, c, (ux, uy), 1.3, 1.3, z_rimsy - 1.4, z_rimsy - 1.1)
    # kladie a tympanón
    G.kvader(mat_tymp, (m[0] + nx * 0.6, m[1] + ny * 0.6), (ux, uy), W + 2.0, 1.6, z_rimsy - 1.1, z_rimsy + 0.3)
    h = (W + 2.0) * 0.22
    A = (m[0] - ux * (W / 2 + 1.0) + nx * 1.4, m[1] - uy * (W / 2 + 1.0) + ny * 1.4)
    B = (m[0] + ux * (W / 2 + 1.0) + nx * 1.4, m[1] + uy * (W / 2 + 1.0) + ny * 1.4)
    Ai = (A[0] - nx * 1.6, A[1] - ny * 1.6)
    Bi = (B[0] - nx * 1.6, B[1] - ny * 1.6)
    T = ((A[0] + B[0]) / 2, (A[1] + B[1]) / 2)
    Ti = (T[0] - nx * 1.6, T[1] - ny * 1.6)
    z = z_rimsy + 0.3
    G.plocha(mat_tymp, [(A[0], A[1], z), (B[0], B[1], z), (T[0], T[1], z + h)])
    G.plocha(mat_strecha, [(A[0], A[1], z), (T[0], T[1], z + h), (Ti[0], Ti[1], z + h), (Ai[0], Ai[1], z)])
    G.plocha(mat_strecha, [(T[0], T[1], z + h), (B[0], B[1], z), (Bi[0], Bi[1], z), (Ti[0], Ti[1], z + h)])
    if klobuk:
        # kardinálsky klobúk na vrchole tympanónu
        G.valec(klobuk, T, 1.5, z + h + 0.1, z + h + 0.45, seg=16, r1=1.4)
        G.valec(klobuk, T, 0.75, z + h + 0.45, z + h + 1.0, seg=16, r1=0.6)


def veza(G, c, sirka, vyska, mat, mat_strecha, sklo_m, rimsa, typ='barok', osem=None, strecha_h=None, koruna=None, natocenie=(1, 0)):
    """Veža so štvorcovým telom, voliteľnou osembokou nadstavbou a strechou (barok = cibuľa s lucernou,
    ihlan, gotika = vysoký osemboký ihlan)."""
    u = natocenie
    v = (-u[1], u[0])
    h = sirka / 2
    o = [(c[0] - u[0] * h - v[0] * h, c[1] - u[1] * h - v[1] * h), (c[0] + u[0] * h - v[0] * h, c[1] + u[1] * h - v[1] * h),
         (c[0] + u[0] * h + v[0] * h, c[1] + u[1] * h + v[1] * h), (c[0] - u[0] * h + v[0] * h, c[1] - u[1] * h + v[1] * h)]
    if typ == 'gotika':
        # gotická veža: plné murivo, vysoké okná len v zvonovom podlaží
        G.hranol(mat, o, -1.0, vyska - 9.0, vrch=False)
        G.pas(rimsa, o, vyska * 0.5 - 0.3, vyska * 0.5, von=0.25, spodok=True)
        barokova_fasada(G, o, [vyska - 9.0, vyska], stena=mat, sambrana=rimsa, sklo_m=sklo_m, rimsa=rimsa,
                        os_okien=sirka / 2, min_dlzka=3.0, okno=(1.3, 5.6), seed=3)
    else:
        pocet = max(2, round(vyska / 4.5))
        kz = [-1.0] + [vyska * k / pocet for k in range(1, pocet + 1)]
        barokova_fasada(G, o, kz, stena=mat, sambrana=rimsa, sklo_m=sklo_m, rimsa=rimsa, os_okien=sirka, min_dlzka=3.0,
                        okno=(min(1.3, sirka * 0.25), 2.4), seed=3)
    z = vyska
    if osem:
        r, hh = sirka * 0.42, osem
        G.valec(mat, c, r, z, z + hh, seg=8)
        G.pas(rimsa, [(c[0] + r * math.cos(k * math.pi / 4), c[1] + r * math.sin(k * math.pi / 4)) for k in range(8)], z + hh - 0.4, z + hh, von=0.3)
        z += hh
        rr = r
    else:
        rr = sirka * 0.5
    sh = strecha_h or sirka * 1.3
    if typ == 'barok':
        prof = [(rr + 0.3, z), (rr * 0.95, z + sh * 0.25), (rr * 0.6, z + sh * 0.42), (rr * 0.25, z + sh * 0.5),
                (rr * 0.32, z + sh * 0.62), (rr * 0.32, z + sh * 0.75), (rr * 0.12, z + sh * 0.82), (0.05, z + sh)]
        from mostne import rotacne
        rotacne(G, mat_strecha, c, prof, seg=12)
    elif typ == 'gotika':
        G.valec(mat_strecha, c, rr + 0.2, z, z + sh, seg=8, r1=0.15)
    else:
        G.valec(mat_strecha, c, rr * 1.4, z, z + sh, seg=4, r1=0.05)
    z += sh
    if koruna:
        # vankúš a pozlátená koruna (Dóm sv. Martina)
        G.kvader(koruna[1], c, u, 2.4, 2.4, z, z + 0.5)
        G.valec(koruna[0], c, 0.95, z + 0.5, z + 1.8, seg=12, r1=1.05)
        G.valec(koruna[0], c, 1.05, z + 1.8, z + 2.6, seg=12, r1=0.2)
        G.kvader(koruna[0], c, u, 0.15, 0.15, z + 2.6, z + 3.6)
        G.kvader(koruna[0], (c[0], c[1]), u, 0.7, 0.15, z + 3.1, z + 3.25)
        z += 3.6
    else:
        G.kvader(rimsa, c, u, 0.12, 0.12, z, z + 1.6)
    return z


def postav_zaznam(kluc, zaznam, spec, poradie=0):
    t = zaznam['t']
    druh = t.get('building', 'yes')
    kostol = spec.get('typ') == 'kostol' or (druh in KOSTOLY and spec.get('typ') != 'palac')
    stred = stred_obrysu(zaznam['body'][:-1] if zaznam['body'][0] == zaznam['body'][-1] else zaznam['body'])
    def obr(b):
        b = b[:-1] if b[0] == b[-1] else b
        return zjednodus(z_hry(b, stred), 0.9 if kostol else spec.get('zjednodus', 0.8))
    obrys = obr(zaznam['body'])
    diery = [ccw(obr(d))[::-1] for d in zaznam.get('diery', []) if len(d) > 3]

    farba = spec.get('farba', '#efe3c9')
    stena = material(f'omietka-{farba[1:]}', farba, drsnost=0.85)
    detail = material(f'detail-{spec.get("detaily", "#f6f1e6")[1:]}', spec.get('detaily', '#f6f1e6'), drsnost=0.8)
    sokel = material('sokel', '#b9b0a0', drsnost=0.9)
    strecha_m = material(f'strecha-{spec.get("strecha", "#8c4b32")[1:]}', spec.get('strecha', '#8c4b32'), drsnost=0.8)
    sklo_o = sklo('sklo-okna', '#5f6f78', drsnost=0.08, kov=0.6)
    G = Geo()
    lv = int(cislo(t.get('building:levels'), spec.get('podlazia', 3)) or 3)
    lv = spec.get('podlazia', lv)
    if kostol:
        H = spec.get('vyska', 14.0)
        kz = [-1.5, H]
        for o in [obrys] + diery:
            barokova_fasada(G, o, kz, stena=stena, sambrana=detail, sklo_m=sklo_o, rimsa=detail, sokel=sokel,
                            os_okien=spec.get('os_okien', 6.5), okno=spec.get('okno', (1.8, H * 0.55)), min_dlzka=6.0,
                            hlavna_rimsa=0.6, seed=7)
        if spec.get('piliere'):
            n = len(obrys)
            for i in range(n):
                a, b = obrys[i], obrys[(i + 1) % n]
                L = dlzka(a, b)
                if L < 8:
                    continue
                ux, uy = (b[0] - a[0]) / L, (b[1] - a[1]) / L
                nx, ny = normala(a, b)
                pocet = max(1, round(L / 6.5))
                for k in range(pocet + 1):
                    s = L * k / pocet
                    c = (a[0] + ux * s + nx * 0.8, a[1] + uy * s + ny * 0.8)
                    G.kvader(sokel, c, (ux, uy), 1.1, 1.6, -1.5, H * 0.78)
                    G.kvader(sokel, (c[0] - nx * 0.25, c[1] - ny * 0.25), (ux, uy), 1.1, 1.1, H * 0.78, H * 0.9)
        strecha_podla_vzdialenosti(G, strecha_m, obrys, diery, H, profil_valbovy(spec.get('sklon', 1.25), spec.get('strecha_h', 12.0)))
        vrch_strechy = H
    else:
        prizemie = spec.get('prizemie', 4.6)
        poschodie = spec.get('poschodie', 4.0)
        kz = [-1.5] + [prizemie + poschodie * k for k in range(lv)]
        H = kz[-1]
        for o in [obrys] + diery:
            barokova_fasada(G, o, kz, stena=stena, sambrana=detail, sklo_m=sklo_o, rimsa=detail, sokel=sokel,
                            os_okien=spec.get('os_okien', 3.6), okno=(1.3, min(2.4, poschodie - 1.3)), min_dlzka=4.5,
                            prizemie_okno=(1.35, min(2.6, prizemie - 1.4)), seed=hash(kluc) % 97)
        tvar = (spec.get('tvar_strechy') or t.get('roof:shape') or 'hipped').lower()
        if tvar == 'flat':
            from veze import strecha
            strecha(G, obrys, H, strecha_m, stena, atika=0.9)
        elif tvar == 'mansard':
            strecha_podla_vzdialenosti(G, strecha_m, obrys, diery, H, profil_mansardovy(max_h=spec.get('strecha_h', 6.0)))
        else:
            strecha_podla_vzdialenosti(G, strecha_m, obrys, diery, H, profil_valbovy(spec.get('sklon', 0.95), spec.get('strecha_h', 7.0)))
        vrch_strechy = H
    # doplnky
    if spec.get('portikus'):
        p = spec['portikus']
        klobuk = material('klobuk', '#8b1e2c', drsnost=0.6) if p.get('klobuk') else None
        portikus(G, obrys, p['smer'], vrch_strechy, detail, detail, strecha_m, stlpy=p.get('stlpy', 4), sirka=p.get('sirka'), klobuk=klobuk)
    vyska_max = vrch_strechy + 8
    for v in spec.get('veze', []):
        if 'cast' in v:
            casti = {c['id']: c for c in zaznam.get('casti', [])}
            cb = casti[v['cast']]['body']
            cb = cb[:-1] if cb[0] == cb[-1] else cb
            o = z_hry(cb, stred)
            c = (sum(p[0] for p in o) / len(o), sum(p[1] for p in o) / len(o))
            sirka = math.sqrt(abs(plocha_obrysu(o)))
        else:
            c = (v['x'] - stred[0], -(v['z'] - stred[1]))
            sirka = v['sirka']
        mat_v = material(f'strecha-veze-{v.get("farba_strechy", "#5f7d70")[1:]}', v.get('farba_strechy', '#5f7d70'), drsnost=0.5, kov=0.3)
        kor = None
        if v.get('koruna'):
            kor = (material('zlato', '#e3b23c', drsnost=0.3, kov=0.9), material('vankus', '#9b2335', drsnost=0.7))
        vyska_max = max(vyska_max, veza(G, c, sirka, v['vyska'], stena if not kostol else stena, mat_v, sklo_o, detail,
                                        typ=v.get('typ', 'barok'), osem=v.get('osem'), strecha_h=v.get('strecha_h'), koruna=kor))
    # ďalšie časti z OSM (napr. Modrý kostolík, Slavín) – jednoduché telesá s výškou z OSM
    if spec.get('casti_osm'):
        for c in zaznam.get('casti', []):
            ct = c['t']
            h = cislo(ct.get('height'))
            if not h:
                continue
            mh = cislo(ct.get('min_height'), 0.0)
            o = obr(c['body'])
            if len(o) < 3:
                continue
            G.hranol(stena, ccw(o), mh, h, mat_vrch=detail)
            if ct.get('roof:shape') in ('pyramidal', 'conical', 'spire'):
                rh = cislo(ct.get('roof:height'), 4.0)
                strecha_ihlan(G, ccw(o), h, rh, strecha_m, presah=0.2)
                vyska_max = max(vyska_max, h + rh)
            vyska_max = max(vyska_max, h)
    subor = f"sm-{kluc}" + (f"-{poradie + 1}" if poradie else '')
    return G, [obrys], vyska_max, subor, {'stred': [round(stred[0], 2), round(stred[1], 2)]}
