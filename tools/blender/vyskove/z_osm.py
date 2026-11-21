# Všeobecný generátor výškovej budovy z 3D tagov OpenStreetMap (building:part, height, min_height,
# building:levels, building:min_level, building:colour, building:material, roof:shape).
# Každá časť sa postaví zvlášť od svojej spodnej po hornú výšku a dostane fasádu podľa materiálu,
# farby a druhu budovy: závesová stena (sklo), pásové okná (kancelárie, obchod), okná s balkónmi (byty).
# Stĺpy (časti s plochou pár m²) sú valce, ploché strechy majú atiku a techniku, najvyššia časť
# výstražné svetlá. Konkrétna budova môže štýl časti prepísať (slovník `styly` podľa id časti).

import math
import random

from veze import (Geo, z_hry, zjednodus, rozdel, urovne, odsad, stred_obrysu, zavesova_stena, kamenna_fasada,
                  strecha, strojovna, vystrazne_svetla, sklo, svetlo, plocha_obrysu, smer_v_bode, dlzka)
from spolocne import material

FARBY = {
    'white': '#eeeeea', 'silver': '#c4c8cb', 'lightgray': '#cfd1d0', 'lightgrey': '#cfd1d0', 'gray': '#9a9c9c',
    'grey': '#9a9c9c', 'darkgray': '#7d7f80', 'darkslategray': '#3d4b4c', 'black': '#2a2b2d', 'brown': '#7a5338',
    'khaki': '#cdbf92', 'beige': '#ddd2b8', 'crimson': '#a3232f', 'red': '#a3302a', 'aliceblue': '#dfe9f1',
    'lightsteelblue': '#aebccc', 'royalblue': '#4a67b8', 'blue': '#3d5a8c', 'navy': '#27355a', 'green': '#5d7d5a',
    'yellow': '#d9c66a', 'orange': '#c8803c', 'tan': '#c6a882',
}


def farba(t, predvolena):
    c = (t.get('building:colour') or t.get('colour') or '').strip().lower()
    if c.startswith('#') and len(c) == 7:
        return c
    return FARBY.get(c, predvolena)


def cislo(v, predvolene=None):
    try:
        return float(str(v).replace('m', '').strip())
    except (TypeError, ValueError):
        return predvolene


def vysky_casti(t, hlavna_t, podlazie):
    """(spodok, vrch, výška podlažia) časti v metroch."""
    lv = cislo(t.get('building:levels'))
    h = cislo(t.get('height'))
    minlv = cislo(t.get('building:min_level'), 0)
    minh = cislo(t.get('min_height'))
    if h and lv:
        podlazie = h / lv
    if h is None:
        h = (lv or cislo(hlavna_t.get('building:levels'), 3)) * podlazie
    if minh is None:
        minh = minlv * podlazie
    return minh, h, podlazie


class Materialy:
    """Zásoba materiálov podľa farby (rovnaká farba = rovnaký materiál)."""
    def __init__(self, skla=('#8fa3b2', '#7f95a6')):
        self.c = {}
        self.skla = skla

    def m(self, meno, farba_, **k):
        kl = (meno, farba_)
        if kl not in self.c:
            self.c[kl] = material(f'{meno}-{farba_[1:]}', farba_, **k)
        return self.c[kl]

    def sklo(self, odtien=None):
        f = odtien or self.skla[0]
        kl = ('sklo', f)
        if kl not in self.c:
            self.c[kl] = sklo(f'sklo-{f[1:]}', f, drsnost=0.05, kov=0.88)
        return self.c[kl]


def odtien_skla(c):
    """Odtieň skla podľa farby časti (royalblue → modré, aliceblue → svetlé, inak neutrálne)."""
    if not c:
        return '#8fa3b2'
    r, g, b = (int(c[i:i + 2], 16) for i in (1, 3, 5))
    # zmes s neutrálnou šedomodrou, aby sklo nebolo prefarbené ako plast
    mix = lambda a, z: round(a * 0.45 + z * 0.55)
    return '#%02x%02x%02x' % (mix(r, 0x8f), mix(g, 0xa3), mix(b, 0xb2))


def okenna_fasada(G, obrys, kz, *, stena, sklo_m, ram, okno=1.6, rozostup=3.0, parapet=0.9, preklad=0.45,
                  vnor=0.2, balkony=None, mat_balkon=None, seed=3):
    """Murovaná/panelová fasáda s oknami (byty): steny v líci, okná vnorené, voliteľne balkóny."""
    rnd = random.Random(seed)
    n = len(obrys)
    for k in range(len(kz) - 1):
        z0, z1 = kz[k], kz[k + 1]
        a, b = z0 + parapet, z1 - preklad
        G.pas(stena, odsad(obrys, -vnor), z0, a, von=vnor, spodok=(k == 0))
        G.pas(stena, odsad(obrys, -vnor), b, z1, von=vnor, vrch=False)
        for i in range(n):
            p, q = obrys[i], obrys[(i + 1) % n]
            L = dlzka(p, q)
            pocet = max(1, int(L // rozostup))
            krok = L / pocet
            ux, uy = (q[0] - p[0]) / L, (q[1] - p[1]) / L
            nx, ny = uy, -ux
            for j in range(pocet):
                s0 = j * krok + (krok - okno) / 2
                s1 = s0 + okno
                A = (p[0] + ux * s0, p[1] + uy * s0)
                B = (p[0] + ux * s1, p[1] + uy * s1)
                # piliere medzi oknami
                P0 = (p[0] + ux * j * krok, p[1] + uy * j * krok)
                G.stena(stena, P0, A, a, b)
                if j == pocet - 1:
                    G.stena(stena, B, q, a, b)
                # ostenie a sklo
                Ai = (A[0] - nx * vnor, A[1] - ny * vnor)
                Bi = (B[0] - nx * vnor, B[1] - ny * vnor)
                G.stena(stena, Ai, A, a, b)
                G.stena(stena, B, Bi, a, b)
                G.panel(sklo_m, Ai, Bi, a, b, rnd, 0.002)
                if balkony and balkony(i, j, k) and k > 0:
                    C0 = (p[0] + ux * (s0 - 0.6), p[1] + uy * (s0 - 0.6))
                    C1 = (p[0] + ux * (s1 + 0.6), p[1] + uy * (s1 + 0.6))
                    D0 = (C0[0] + nx * 1.4, C0[1] + ny * 1.4)
                    D1 = (C1[0] + nx * 1.4, C1[1] + ny * 1.4)
                    G.hranol(mat_balkon or stena, [C0, D0, D1, C1], z0 - 0.2, z0 + 0.05, spodok=True)
                    G.panel(mat_balkon or stena, D0, D1, z0 + 0.05, z0 + 1.0)
                    G.panel(mat_balkon or stena, D1, D0, z0 + 0.05, z0 + 1.0)


def postav_z_osm(obrysy, kluc, subor, *, druh=None, styly=None, podlazie=3.5, prizemie=None, svetla=True,
                 hlavne_bez_casti=True, vynechaj=()):
    data = obrysy[kluc]
    hlavne = data['hlavne']
    # stred = vážený stred obrysov (pre viac budôv v jednom modeli)
    S = sum(abs(plocha_obrysu(h['body'])) for h in hlavne)
    stredy = [stred_obrysu(h['body']) for h in hlavne]
    stred = (sum(c[0] * abs(plocha_obrysu(h['body'])) for c, h in zip(stredy, hlavne)) / S,
             sum(c[1] * abs(plocha_obrysu(h['body'])) for c, h in zip(stredy, hlavne)) / S)
    styly = styly or {}
    M = Materialy()
    hlinik_d = material('detail-hlinik', '#aab1b5', drsnost=0.4, kov=0.7)
    strecha_m = material('strecha', '#8d8b86', drsnost=0.95)
    beton = material('beton', '#bdbbb4', drsnost=0.85)
    cervena = svetlo('svetlo-cervene', '#ff2a1a', 6.0)

    # zoznam častí: building:part vnútri obrysov; obrys bez častí je jedna časť
    casti = [c for c in data['casti'] if c['id'] not in vynechaj]
    if hlavne_bez_casti:
        for h in hlavne:
            hb = z_hry(h['body'], stred)
            # obrys pridaj ako časť, ak ho časti vnútri pokrývajú menej ako z 60 %
            pokryte = sum(abs(plocha_obrysu(z_hry(c['body'], stred))) for c in casti
                          if _vnutri(z_hry(c['body'], stred), hb))
            if pokryte < 0.6 * abs(plocha_obrysu(hb)):
                casti.append({'id': h['id'], 't': h['t'], 'body': h['body']})
    hlavna_t = hlavne[0]['t']
    G = Geo()
    obrysy_hry, vysky = [], []
    najvyssia = None
    for c in casti:
        t = c['t']
        o = z_hry(c['body'], stred)
        if len(o) > 6:
            o = zjednodus(o, 0.3)
        pl = abs(plocha_obrysu(o))
        z0, z1, pz = vysky_casti(t, hlavna_t, podlazie)
        if z1 - z0 < 1.0:
            continue
        styl = styly.get(c['id']) or styly.get('*') or {}
        if pl < 6:
            # stĺp (pilotis)
            cx = sum(p[0] for p in o) / len(o)
            cy = sum(p[1] for p in o) / len(o)
            G.valec(beton, (cx, cy), max(0.25, math.sqrt(pl / math.pi)), z0 - (1.5 if z0 < 0.5 else 0), z1, seg=10)
            continue
        if pl < 25 and z1 - z0 < 8:
            continue
        obrysy_hry.append(o)
        vysky.append(round(z1, 1))
        if najvyssia is None or z1 > najvyssia[1]:
            najvyssia = (o, z1)
        f = farba(t, styl.get('farba') or None)
        mat_t = (t.get('building:material') or hlavna_t.get('building:material') or '').lower()
        typ = styl.get('typ') or ('sklo' if mat_t == 'glass' or (f is None and (druh or '') == 'kancelarie') else (druh or 'pasy'))
        dole = z0 - 1.5 if z0 < 0.5 else z0
        pocet = max(1, round((z1 - z0) / pz))
        if typ == 'sklo':
            kz = [dole] + [z0 + (z1 - z0) * i / pocet for i in range(1, pocet + 1)]
            odt = styl.get('sklo') or odtien_skla(f)
            sk = M.sklo(odt)
            sk2 = M.sklo(styl.get('sklo2') or odtien_skla(f and _tmavsia(f)) if f else '#7f95a6')
            linia, _ = rozdel(o, styl.get('panel', 1.5))
            zavesova_stena(G, linia, kz, sklo=lambda i, k, r: sk2 if r.random() < 0.18 else sk, ram=hlinik_d,
                           vnor=0.14, stlpik=0.06, priecka=0.1, parapet=styl.get('parapet', 0.35),
                           mat_parapet=M.m('parapet', styl.get('parapet_farba') or _tmavsia(odt, 0.55), drsnost=0.4, kov=0.5),
                           seed=hash(c['id']) % 1000, obrys_priecok=o, segment_stlpika=4)
            for z in (kz[1:-1:styl['linka_kazde']] if styl.get('linka_kazde') else []):
                G.pas(M.m('linka', styl.get('linka_farba', '#d9dcdd'), drsnost=0.5, kov=0.4), o, z - 0.18, z + 0.18, von=0.12)
            atika_m = M.m('atika', f or '#c9cdcf', drsnost=0.6)
        elif typ == 'byty':
            kz = [dole] + [z0 + (z1 - z0) * i / pocet for i in range(1, pocet + 1)]
            st = M.m('omietka', f or '#e9e6df', drsnost=0.85)
            okenna_fasada(G, o, kz, stena=st, sklo_m=M.sklo('#7d8c96'), ram=hlinik_d,
                          balkony=styl.get('balkony'), mat_balkon=M.m('balkon', styl.get('balkon_farba', '#f2f2ef'), drsnost=0.7),
                          seed=hash(c['id']) % 1000)
            atika_m = st
        else:
            kz = [dole] + [z0 + (z1 - z0) * i / pocet for i in range(1, pocet + 1)]
            kamen = M.m('obklad', f or styl.get('farba_obkladu', '#d0ccc4'), drsnost=0.7)
            kamenna_fasada(G, o, kz, kamen=kamen, sklo=M.sklo(styl.get('sklo') or '#7f93a2'), ram=hlinik_d,
                           parapet=styl.get('parapet', 1.0), preklad=styl.get('preklad', 0.45))
            atika_m = kamen
        strecha(G, o, z1, strecha_m, atika_m, atika=styl.get('atika', 0.9))
    # technika a výstražné svetlá na najvyššej časti
    if najvyssia:
        o, z = najvyssia
        sx = sum(p[0] for p in o) / len(o)
        sy = sum(p[1] for p in o) / len(o)
        dlha = max(range(len(o)), key=lambda i: dlzka(o[i], o[(i + 1) % len(o)]))
        a, b = o[dlha], o[(dlha + 1) % len(o)]
        os_x = ((b[0] - a[0]) / dlzka(a, b), (b[1] - a[1]) / dlzka(a, b))
        sir = min(14.0, math.sqrt(abs(plocha_obrysu(o))) * 0.5)
        strojovna(G, (sx, sy), os_x, sir, sir * 0.6, z, 3.0, beton, hlinik_d, strecha_m)
        if svetla and z > 45:
            rohy = sorted(o, key=lambda p: -((p[0] - sx) ** 2 + (p[1] - sy) ** 2))[:2]
            vystrazne_svetla(G, [(sx + (p[0] - sx) * 0.9, sy + (p[1] - sy) * 0.9) for p in rohy], z + 0.9, cervena)
    return G, obrysy_hry, max(vysky) if vysky else 10, subor, {'stred': [round(stred[0], 2), round(stred[1], 2)], 'vysky': vysky}


def _vnutri(a, b):
    """Leží stred obrysu a vnútri obrysu b?"""
    x = sum(p[0] for p in a) / len(a)
    z = sum(p[1] for p in a) / len(a)
    c, j = False, len(b) - 1
    for i in range(len(b)):
        xi, zi = b[i]
        xj, zj = b[j]
        if (zi > z) != (zj > z) and x < (xj - xi) * (z - zi) / (zj - zi) + xi:
            c = not c
        j = i
    return c


def _tmavsia(f, k=0.8):
    r, g, b = (int(f[i:i + 2], 16) for i in (1, 3, 5))
    return '#%02x%02x%02x' % (int(r * k), int(g * k), int(b * k))
