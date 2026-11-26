# Interiér galérie Eurovea (#131, časť 5) – pasáže pod presklenými klenbami: Eurovea 1 (západná pasáž od rotundy
# pri vajci po hlavné námestie, ~175 m) a Eurovea 2 (pasáž pod hadou strechou, ~165 m). Podklady a zdroje:
# napady/pamiatky-podklady.md, „Eurovea – interiér galérie“ (oficiálna mapa centra, OSM indoor, EIA Eurovea 2,
# texty developera a architektov; bez Google, bez názvov obchodov).
#   – prízemie (0): leštená kamenná podlaha (E1 béžová, E2 krémové terrazzo s terakotovými klinmi),
#   – poschodie (+1) ~5,5 m (E1) / 6,0 m (E2): ochodza ~3,5 m pri výkladoch okolo otvoru (átrium), biela zaoblená
#     hrana s teplým LED pásom, sklenené zábradlie s medovou drevenou madlom; stĺpy na hrane otvoru,
#   – eskalátory (pár hore/dolu) a lávky cez otvor na poschodí,
#   – neutrálne výklady na oboch podlažiach (tmavé sklo, biele rámy, svetlý pás nad výkladom – bez nápisov),
#   – lavičky a kvetináče v strede prízemia.
# Na poschodí sa dá chodiť – pochôdzne plochy („plochy“ v <subor>.json → js/mapa/pamiatky/vyskova-budova.js).
# Podlažie −1 (pod celou galériou) zatiaľ nie je.
# Model je na rovnakom mieste a s rovnakou základňou ako vonkajšok (eurovea-1 / eurovea-2).

import json
import math
import os

from shapely.geometry import Polygon, LineString, Point
from mathutils.geometry import tessellate_polygon

from veze import Geo, hladka, svetlo
from spolocne import material

TU = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

CASTI = {
    'eurovea-1-interier': {'data': 'eurovea.json', 'pasaz': 'w762656642', 'poschodie': 5.5, 'ochodza': 3.5,
                           'podlaha': '#d8cfc0', 'hladka': None},
    'eurovea-2-interier': {'data': 'eurovea-2.json', 'pasaz': 'w1164819251', 'poschodie': 6.0, 'ochodza': 3.5,
                           'podlaha': '#e7e0d4', 'hladka': 1.5},
}
DOSKA = 0.55          # m – hrúbka stropnej dosky poschodia
ZABRADLIE = 1.1
VYKLAD = 8.5          # m – šírka výkladu (prieskum: 7,5–10,5 m)


def materialy(farba_podlahy):
    return {
        'podlaha': material('podlaha-kamen', farba_podlahy, drsnost=0.25),
        'klin': material('podlaha-terakota', '#a35b4c', drsnost=0.3),
        'doska': material('strop-biely', '#f2f0ea', drsnost=0.6),
        'led': svetlo('svetlo-led', '#ffd9a0', 2.5),
        'sklo': material('priehladne-sklo', '#cfe3e6', drsnost=0.05, kov=0.1),
        'madlo': material('madlo-drevo', '#c29a6b', drsnost=0.45),
        'ocel': material('detail-ocel', '#b9bfc3', drsnost=0.35, kov=0.6),
        'stlp': material('stlp-biely', '#efede6', drsnost=0.5),
        'vyklad': material('sklo-vyklad', '#2f3b42', drsnost=0.08, kov=0.6),
        'ram': material('ram-vykladu', '#e9e7e2', drsnost=0.5),
        'pas': svetlo('svetlo-pas-vykladu', '#f4efe4', 0.6),
        'eskalator': material('eskalator', '#8e9498', drsnost=0.4, kov=0.5),
        'schody': material('eskalator-stupne', '#4a4d50', drsnost=0.6, kov=0.3),
        'lavicka': material('lavicka-drevo', '#9a7552', drsnost=0.6),
        'kvetinac': material('kvetinac', '#d9d4c8', drsnost=0.7),
        'zelen': material('zelen-kvetinaca', '#4f7a3c', drsnost=0.9),
    }


def trojuholniky(G, mat, obrys, diery, z, hore=True):
    """Vodorovná plocha mnohouholníka s dierami (tessellate_polygon z Blendera)."""
    kruhy = [[(x, y, z) for x, y in obrys]] + [[(x, y, z) for x, y in d] for d in diery]
    vsetky = [p for k in kruhy for p in k]
    for a, b, c in tessellate_polygon(kruhy):
        tri = [vsetky[a], vsetky[b], vsetky[c]]
        # normála hore
        n = (tri[1][0] - tri[0][0]) * (tri[2][1] - tri[0][1]) - (tri[1][1] - tri[0][1]) * (tri[2][0] - tri[0][0])
        if (n < 0) == hore:
            tri.reverse()
        G.plocha(mat, tri)


def obrysy(geom):
    """Shapely (Multi)Polygon → [(obrys, [diery])]."""
    if geom.is_empty:
        return []
    polys = [geom] if geom.geom_type == 'Polygon' else list(geom.geoms)
    return [(list(p.exterior.coords)[:-1], [list(i.coords)[:-1] for i in p.interiors]) for p in polys if p.area > 1]


def stena(G, mat, a, b, z0, z1):
    G.plocha(mat, [(a[0], a[1], z0), (b[0], b[1], z0), (b[0], b[1], z1), (a[0], a[1], z1)])


def tyc(G, mat, a, b, z, s, v):
    """Pozdĺžna tyč nad úsečkou a–b (šírka s, výška v)."""
    dx, dy = b[0] - a[0], b[1] - a[1]
    L = math.hypot(dx, dy) or 1
    nx, ny = -dy / L * s / 2, dx / L * s / 2
    p = [(a[0] + nx, a[1] + ny), (b[0] + nx, b[1] + ny), (b[0] - nx, b[1] - ny), (a[0] - nx, a[1] - ny)]
    G.hranol(mat, p, z, z + v)


def po_krokoch(linia, krok):
    """Body po obvode lomenej čiary každých ~krok metrov."""
    out, zvysok = [], 0.0
    for a, b in zip(linia[:-1], linia[1:]):
        L = math.hypot(b[0] - a[0], b[1] - a[1])
        t = zvysok
        while t < L:
            out.append((a[0] + (b[0] - a[0]) * t / L, a[1] + (b[1] - a[1]) * t / L, (b[0] - a[0]) / L, (b[1] - a[1]) / L))
            t += krok
        zvysok = t - L
    return out


def postav_interier(meno):
    k = CASTI[meno]
    with open(os.path.join(TU, 'data', k['data']), encoding='utf-8') as f:
        data = json.load(f)
    vsetky = [b for c in data['casti'] for b in c['body']]
    st = (round(sum(p[0] for p in vsetky) / len(vsetky), 2), round(sum(p[1] for p in vsetky) / len(vsetky), 2))
    zb, z_ref = data['zakladna']['bod'], data['zakladna']['teren']
    c = next(x for x in data['casti'] if x['id'] == k['pasaz'])
    body = [(x - st[0], -(z - st[1])) for x, z in c['body']]
    if k['hladka']:
        body = hladka(body, k['hladka'])
    zem = round(c['teren'][0] - z_ref, 2)
    P = Polygon(body).buffer(0)
    hp = zem + k['poschodie']                        # podlaha poschodia
    ocho = k['ochodza']
    otvor = P.buffer(-ocho, join_style=2)            # átrium – otvor v podlahe poschodia
    otvor = otvor.buffer(-0.5, join_style=1).buffer(0.5, join_style=1)   # bez úzkych výbežkov
    doska = P.difference(otvor)
    # plné časti komplexu (steny pasáže = výklady), ostatné hrany sú vstupy
    plne = [Polygon([(x - st[0], -(z - st[1])) for x, z in d['body']]).buffer(0) for d in data['casti']
            if d['id'] != k['pasaz'] and not (d['t'].get('roof:shape') == 'round' and d['t'].get('roof:material') == 'glass')
            and d['t'].get('building') != 'roof']
    M = materialy(k['podlaha'])
    G = Geo()
    kolizie = []

    # --- poschodie: doska s otvorom, hrana, LED, zábradlie, stĺpy ---
    plochy = []
    for o, d in obrysy(doska):
        trojuholniky(G, M['doska'], o, d, hp)                   # podlaha poschodia (zvrchu)
        trojuholniky(G, M['doska'], o, d, hp - DOSKA, hore=False)   # podhľad
    for o, _ in obrysy(otvor):
        kruh = o + [o[0]]
        for a, b in zip(kruh[:-1], kruh[1:]):
            stena(G, M['doska'], a, b, hp - DOSKA, hp)
            tyc(G, M['led'], a, b, hp - DOSKA - 0.06, 0.12, 0.06)
            G.plocha(M['sklo'], [(a[0], a[1], hp), (b[0], b[1], hp), (b[0], b[1], hp + ZABRADLIE - 0.08), (a[0], a[1], hp + ZABRADLIE - 0.08)])
            tyc(G, M['madlo'], a, b, hp + ZABRADLIE - 0.08, 0.1, 0.08)
        for x, y, ux, uy in po_krokoch(kruh, 1.6):
            G.kvader(M['ocel'], (x, y), (ux, uy), 0.05, 0.05, hp, hp + ZABRADLIE)
        # stĺpy na hrane otvoru (pod doskou, 0,8 m do ochodze)
        for x, y, ux, uy in po_krokoch(kruh, 9.0):
            # strana mimo otvoru (smer obrysu zo shapely nie je istý) – na ochodzi, pod doskou
            kandidati = [(x + uy * 0.8, y - ux * 0.8), (x - uy * 0.8, y + ux * 0.8)]
            platne = [(px, py) for px, py in kandidati if P.contains(Point(px, py)) and otvor.distance(Point(px, py)) > 0.5]
            if platne:
                px, py = platne[0]
                G.valec(M['stlp'], (px, py), 0.35, zem - 0.6, hp - DOSKA, seg=14)
                kolizie.append([(px - 0.35, py - 0.35), (px + 0.35, py - 0.35), (px + 0.35, py + 0.35), (px - 0.35, py + 0.35)])
    # pochôdzna ochodza: os v strede ochodze
    for o, d in obrysy(P.buffer(-ocho / 2, join_style=2)):
        kruh = o + [o[0]]
        plochy.append({'body': [[round(x, 2), round(-y, 2), round(hp, 2)] for x, y in kruh], 'sirka': round(ocho, 2)})

    # --- eskalátory a lávky v najväčšom otvore ---
    otvory = sorted([Polygon(o, d) for o, d in obrysy(otvor)], key=lambda q: -q.area)
    for q in otvory[:2]:
        r = list(q.minimum_rotated_rectangle.exterior.coords)[:4]
        hrany = [(r[i], r[(i + 1) % 4]) for i in range(4)]
        dlha = max(hrany, key=lambda h: math.hypot(h[1][0] - h[0][0], h[1][1] - h[0][1]))
        L = math.hypot(dlha[1][0] - dlha[0][0], dlha[1][1] - dlha[0][1])
        if L < 22:
            continue
        ux, uy = (dlha[1][0] - dlha[0][0]) / L, (dlha[1][1] - dlha[0][1]) / L
        nx, ny = -uy, ux
        cx, cy = q.centroid.x, q.centroid.y
        sirka_otvoru = q.area / L
        # lávka cez otvor (kolmo na pasáž) v tretine a eskalátor k nej
        for frak, eskalator in ((-0.22, True), (0.25, False)):
            bx, by = cx + ux * L * frak, cy + uy * L * frak
            dl = sirka_otvoru + 2 * ocho
            a, b = (bx - nx * dl / 2, by - ny * dl / 2), (bx + nx * dl / 2, by + ny * dl / 2)
            w = 3.0
            prof = [(a[0] - ux * w / 2, a[1] - uy * w / 2), (b[0] - ux * w / 2, b[1] - uy * w / 2), (b[0] + ux * w / 2, b[1] + uy * w / 2), (a[0] + ux * w / 2, a[1] + uy * w / 2)]
            G.hranol(M['doska'], prof, hp - DOSKA, hp)
            for s in (-1, 1):
                p1 = (a[0] + ux * s * w / 2, a[1] + uy * s * w / 2); p2 = (b[0] + ux * s * w / 2, b[1] + uy * s * w / 2)
                G.plocha(M['sklo'], [(p1[0], p1[1], hp), (p2[0], p2[1], hp), (p2[0], p2[1], hp + ZABRADLIE - 0.08), (p1[0], p1[1], hp + ZABRADLIE - 0.08)])
                tyc(G, M['madlo'], p1, p2, hp + ZABRADLIE - 0.08, 0.1, 0.08)
                tyc(G, M['led'], p1, p2, hp - DOSKA - 0.06, 0.12, 0.06)
            plochy.append({'body': [[round(a[0], 2), round(-a[1], 2), round(hp, 2)], [round(b[0], 2), round(-b[1], 2), round(hp, 2)]], 'sirka': w})
            if not eskalator:
                continue
            # pár eskalátorov: z prízemia hore k lávke (sklon 30°)
            dlzka_esk = (hp - zem) / math.tan(math.radians(30))
            for s in (-0.75, 0.75):
                ex, ey = bx + nx * s - ux * (w / 2), by + ny * s - uy * (w / 2)       # horný koniec pri lávke
                dx, dy = ex - ux * dlzka_esk, ey - uy * dlzka_esk                  # dolný koniec
                for t in range(12):
                    t0, t1 = t / 12, (t + 1) / 12
                    x0, y0 = dx + (ex - dx) * t0, dy + (ey - dy) * t0
                    x1, y1 = dx + (ex - dx) * t1, dy + (ey - dy) * t1
                    z0, z1 = zem + (hp - zem) * t0, zem + (hp - zem) * t1
                    for sb in (-0.55, 0.55):
                        G.plocha(M['eskalator'], [(x0 + nx * sb, y0 + ny * sb, z0 - 1.0), (x1 + nx * sb, y1 + ny * sb, z1 - 1.0),
                                                  (x1 + nx * sb, y1 + ny * sb, z1 + 0.95), (x0 + nx * sb, y0 + ny * sb, z0 + 0.95)])
                    G.plocha(M['schody'], [(x0 - nx * 0.5, y0 - ny * 0.5, z0 + 0.02), (x1 - nx * 0.5, y1 - ny * 0.5, z1 + 0.02),
                                           (x1 + nx * 0.5, y1 + ny * 0.5, z1 + 0.02), (x0 + nx * 0.5, y0 + ny * 0.5, z0 + 0.02)])
                    G.plocha(M['eskalator'], [(x0 - nx * 0.55, y0 - ny * 0.55, z0 - 1.0), (x0 + nx * 0.55, y0 + ny * 0.55, z0 - 1.0),
                                              (x1 + nx * 0.55, y1 + ny * 0.55, z1 - 1.0), (x1 - nx * 0.55, y1 - ny * 0.55, z1 - 1.0)])
            plochy.append({'body': [[round(cx_, 2), round(-cy_, 2), round(h_, 2)] for cx_, cy_, h_ in
                                    ((bx - ux * (w / 2 + dlzka_esk + 1.0), by - uy * (w / 2 + dlzka_esk + 1.0), zem + 0.35),
                                     (bx - ux * (w / 2 + dlzka_esk), by - uy * (w / 2 + dlzka_esk), zem + 0.35),
                                     (bx - ux * (w / 2), by - uy * (w / 2), hp))], 'sirka': 2.4})

    # --- výklady na oboch podlažiach (len pri plných častiach – nie na vstupoch) ---
    kruh = list(P.exterior.coords)
    for a, b in zip(kruh[:-1], kruh[1:]):
        L = math.hypot(b[0] - a[0], b[1] - a[1])
        if L < 2:
            continue
        ux, uy = (b[0] - a[0]) / L, (b[1] - a[1]) / L
        nx, ny = uy, -ux                                   # von z pasáže (obrys proti smeru hodín)
        if P.exterior.is_ccw is False:
            nx, ny = -nx, -ny
        mx, my = (a[0] + b[0]) / 2 + nx * 1.0, (a[1] + b[1]) / 2 + ny * 1.0
        if not any(q.contains(Point(mx, my)) for q in plne):
            continue
        n = max(1, round(L / VYKLAD))
        o = 0.06
        for i in range(n):
            p1 = (a[0] + (b[0] - a[0]) * i / n - nx * o, a[1] + (b[1] - a[1]) * i / n - ny * o)
            p2 = (a[0] + (b[0] - a[0]) * (i + 1) / n - nx * o, a[1] + (b[1] - a[1]) * (i + 1) / n - ny * o)
            for z0, z1 in ((zem - 0.6, zem + 4.1), (hp + 0.05, hp + 3.6)):
                G.plocha(M['vyklad'], [(p1[0], p1[1], z0), (p2[0], p2[1], z0), (p2[0], p2[1], z1), (p1[0], p1[1], z1)])
                G.plocha(M['pas'], [(p1[0], p1[1], z1), (p2[0], p2[1], z1), (p2[0], p2[1], z1 + 0.55), (p1[0], p1[1], z1 + 0.55)])
                G.kvader(M['ram'], (p1[0] - nx * 0.05, p1[1] - ny * 0.05), (ux, uy), 0.18, 0.1, z0, z1 + 0.55)

    info = {
        'stred': list(st),
        # pasáž bez trávy a stromov dlaždíc (podlaha je v modeli <meno>-podlaha)
        'bezTravy': [[[round(x, 2), round(-y, 2)] for x, y in body]],
        'zakladnaBod': [round(zb[0] - st[0], 2), round(zb[1] - st[1], 2)],
        'bezKoliziiObrysov': True,
        'kolizie': [[[round(x, 2), round(-y, 2)] for x, y in k_] for k_ in kolizie],
        'plochy': plochy,
    }
    print(f'{meno}: pasáž {P.area:.0f} m², otvor {otvor.area:.0f} m², ochodza {doska.area:.0f} m², {len(plochy)} pochôdznych plôch, {len(kolizie)} kolízií')
    # obrysy pre hru: len pasáž (náhrada budov dlaždíc vnútri – žiadne nie sú)
    return G, [body], hp + 6.0, meno, info


def postav_podlahu(meno):
    """Podlaha prízemia pasáže ako model podľa terénu (každý vrchol na teréne + lokálna výška): mriežka 2 m
    orezaná obrysom pasáže, kamenná dlažba, v Eurovei 2 terakotové kliny; lavičky a kvetináče v strede."""
    from shapely.geometry import box
    k = CASTI[meno.replace('-podlaha', '-interier')]
    with open(os.path.join(TU, 'data', k['data']), encoding='utf-8') as f:
        data = json.load(f)
    vsetky = [b for c in data['casti'] for b in c['body']]
    st = (round(sum(p[0] for p in vsetky) / len(vsetky), 2), round(sum(p[1] for p in vsetky) / len(vsetky), 2))
    c = next(x for x in data['casti'] if x['id'] == k['pasaz'])
    body = [(x - st[0], -(z - st[1])) for x, z in c['body']]
    if k['hladka']:
        body = hladka(body, k['hladka'])
    P = Polygon(body).buffer(0)
    M = materialy(k['podlaha'])
    G = Geo()
    x0, y0, x1, y1 = P.bounds
    KR = 2.0
    for i in range(int((x1 - x0) // KR) + 1):
        for j in range(int((y1 - y0) // KR) + 1):
            bunka = box(x0 + i * KR, y0 + j * KR, x0 + (i + 1) * KR, y0 + (j + 1) * KR).intersection(P)
            for o, d in obrysy(bunka):
                trojuholniky(G, M['podlaha'], o, d, 0.05)
    kolizie = []
    if meno == 'eurovea-2-podlaha':
        for i, (x, y, ux, uy) in enumerate(po_krokoch(list(P.exterior.coords), 14.0)):
            if i % 2:
                continue
            cx, cy = P.centroid.x + (x - P.centroid.x) * 0.55, P.centroid.y + (y - P.centroid.y) * 0.55
            klin = [(cx, cy), (cx + ux * 5 - uy * 1.2, cy + uy * 5 + ux * 1.2), (cx + ux * 5 + uy * 1.2, cy + uy * 5 - ux * 1.2)]
            if Polygon(klin).within(P):
                G.vodorovna(M['klin'], klin, 0.06)
    otvor = P.buffer(-k['ochodza'], join_style=2)
    stred = otvor if otvor.geom_type == 'Polygon' else max(otvor.geoms, key=lambda q: q.area)
    for i, (x, y, ux, uy) in enumerate(po_krokoch(list(stred.exterior.coords), 16.0)):
        px, py = stred.centroid.x + (x - stred.centroid.x) * 0.15, stred.centroid.y + (y - stred.centroid.y) * 0.15
        if not P.contains(Point(px, py)):
            continue
        if i % 2 == 0:
            G.valec(M['kvetinac'], (px, py), 0.9, -0.2, 0.6, seg=14)
            G.valec(M['zelen'], (px, py), 0.75, 0.6, 1.4, seg=10)
            kolizie.append([(px - 0.9, py - 0.9), (px + 0.9, py - 0.9), (px + 0.9, py + 0.9), (px - 0.9, py + 0.9)])
        else:
            G.kvader(M['lavicka'], (px, py), (ux, uy), 2.0, 0.5, 0.4, 0.48)
            G.kvader(M['ocel'], (px, py), (ux, uy), 1.8, 0.4, -0.2, 0.4)
    info = {
        'stred': list(st),
        'podlaTerenu': True,
        'bezKoliziiObrysov': True,
        'kolizie': [[[round(x, 2), round(-y, 2)] for x, y in k_] for k_ in kolizie],
        'vyskyKolizii': [1.4] * len(kolizie),
        'nahradit': [[[round(x, 2), round(-y, 2)] for x, y in body]],
        'bezTravy': [[[round(x, 2), round(-y, 2)] for x, y in body]],
    }
    print(f'{meno}: podlaha {P.area:.0f} m², {G.trojuholniky} trojuholníkov')
    return G, [body], 1.5, meno, info
