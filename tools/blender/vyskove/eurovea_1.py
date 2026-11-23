# Eurovea 1 (Pribinova; A1 ReSpect – B. Kaliský, M. Varga, M. Vrábel, konzultant Bose International; 2006–2010) –
# celý komplex okrem vajca a kupoly (tie sú v eurovea_vajce.py) podľa častí budov z OSM (#131, časť 1).
# Podklady: tools/blender/osm_eurovea.py → data/eurovea.json (obrysy častí, podlažia, tvar strechy, materiál, výška
# z lasera, terén, vchody, kvetináče); opis fasád a odkazy v napady/pamiatky-podklady.md (prieskum podľa #130:
# OSM, laser ÚGKK, fotky Wikimedia Commons 2009–2026, články; bez Google).
#   – Central 1 a Central 3 (kancelárie pri Pribinovej): pásové okná – svetlý parapetný pás a zelenosivé sklo;
#   – Sheraton (SZ roh hlavného námestia): béžový kameň s dierovanými zvislými oknami;
#   – byty pri Dunaji: terakotové piliere s bielymi pásmi stropov a lodžiami so sklenými zábradliami, striedané
#     so svetlými kamennými časťami s pásovými oknami; najvyššie podlažie presklené pod tenkou presahujúcou strechou;
#   – východná skupina: krémový kameň s dierovanými oknami a tehlovočervený blok s balkónmi;
#   – galéria: výklady na prízemí, na streche podnože strešné záhrady; k námestiu sklenená stena s grafitovými
#     piliermi, morskozelená sklená kocka a okrová „kinová škatuľa“ z panelov;
#   – presklené valené strechy nad pasážami (roof:shape=round): hrana ~11 m, vrchol ~14,5 m, trojuholníková sieť
#     svetlej ocele; na otvorených koncoch presklený štít, pred vstupmi stĺpy (pri námestí „stromové“);
#   – presklené striešky (Sheraton, Central 3, vjazdy do garáže), kruhové kvetináče a stĺp pri západnom vstupe.
# OSM značí Central 3 (rel 21708449) ako byty – sú to kancelárie. Názvy obchodov, logá a umelecké diela (sochy)
# sa do hry nedávajú.

import json
import math
import os
import random

from veze import Geo, odsad, dlzka, normala, plocha_obrysu, do_hry, sklo, rozdel
from spolocne import material

TU = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

SOKEL = -1.5                        # m – fasády siahajú pod terén (drobné nerovnosti pod komplexom)
KLENBA_HRANA = 11.0                 # m nad terénom – pätka presklených striech na podnoži galérie (laser 10,6–11,5)
KLENBA_VZNOS = 3.5                  # m – vzopätie (vrchol ~14,5 m)
KLENBA_SIET = 3.0                   # m – veľkosť trojuholníka siete

# štýl fasády podľa časti (OSM id); ostatné podľa druhu (galéria, sklo, byty)
STYLY = {
    'r21708445': 'central1', 'w1254386623': 'central1',
    'r21708449': 'central3',
    'w762656648': 'sheraton', 'w1254386636': 'sheraton', 'w1254386637': 'sheraton',
    'w762656660': 'byty_b', 'w1254386621': 'byty_a', 'w1254386624': 'byty_b', 'w1254386620': 'byty_a',
    'w762656659': 'byty_b', 'w1254386625': 'byty_a', 'w1254386630': 'byty_b', 'w1254386628': 'byty_a',
    'w762656655': 'byty_b', 'w1254386632': 'byty_a', 'w1254386629': 'byty_b', 'w1254386631': 'byty_a',
    'w1253804445': 'krem', 'w1253804442': 'krem', 'w1253804443': 'krem',
    'w1253804444': 'tehla', 'w1253804441': 'tehla', 'w762656654': 'tehla', 'w1254305684': 'tehla',
    'r21708454': 'sklo_piliere', 'r21708455': 'kino', 'r21708470': 'zelena',
}
# výšky, ktoré laser nemá alebo ich priradil inej časti (prieskum: Sheraton 30,1 m, vnútorná časť 17,1 m;
# Central 3 a kino bez lasera – odhad podľa podlaží a susedov)
VYSKY = {'w762656648': 30.1, 'w1254386637': 17.1, 'r21708449': 32.0, 'r21708455': 28.0}
PRIZEMIE = {'central1': 6.0, 'central3': 6.0, 'sheraton': 5.0, 'krem': 5.0, 'tehla': 5.0, 'sklo_piliere': 5.0,
            'kino': 5.0, 'zelena': 5.0}
BYTY = ('byty_a', 'byty_b', 'krem', 'tehla')
VSTUP_NAMESTIE = 'r21708453'        # vstup z hlavného námestia – klenba na bielych „stromových“ stĺpoch
VSTUP_ZAPAD = 'r21708446'           # západný vstup pri vajci – pred ním stĺp (totem)


def materialy():
    return {
        # Central 1 / 3 – pásové okná
        'pas': material('pas-central-svetly', '#c9cccc', drsnost=0.5, kov=0.4),
        'sklo_c1': sklo('sklo-central1', '#6f8b88', drsnost=0.05, kov=0.8),
        'sklo_c3': sklo('sklo-central3', '#4f5a60', drsnost=0.05, kov=0.8),
        'rimsa': material('rimsa-eurovea-biela', '#e4e4e0', drsnost=0.6),
        # Sheraton, východná skupina
        'bezovy': material('obklad-sheraton-bezovy', '#d8ccb6', drsnost=0.8),
        'krem': material('obklad-eurovea-kremovy', '#e3d9c6', drsnost=0.8),
        'tehla': material('obklad-eurovea-tehlovy', '#a65a45', drsnost=0.85),
        # byty pri Dunaji
        'terakota': material('obklad-eurovea-terakota', '#b0604c', drsnost=0.85),
        'biela': material('pas-eurovea-biely', '#e6e4de', drsnost=0.7),
        'svetly': material('obklad-eurovea-svetly', '#e3e1da', drsnost=0.8),
        'sklo_byty': sklo('sklo-eurovea-byty', '#7c9690', drsnost=0.05, kov=0.75),
        'zabradlie': sklo('sklo-zabradlie-eurovea', '#b5c8cc', drsnost=0.05, kov=0.4),
        # galéria
        'vyklad': sklo('sklo-eurovea-vyklady', '#5b6c77', drsnost=0.05, kov=0.5),
        'grafit': material('piliere-galeria-grafit', '#4a4e54', drsnost=0.6, kov=0.3),
        'zelena': sklo('sklo-galeria-morskozelene', '#a8cfc4', drsnost=0.1, kov=0.3),
        'kino1': material('panely-kino-1', '#e2d2a6', drsnost=0.8),
        'kino2': material('panely-kino-2', '#d4bc8a', drsnost=0.8),
        'kino3': material('panely-kino-3', '#eadfc4', drsnost=0.8),
        # spoločné
        'sokel': material('sokel-eurovea', '#8e8e8b', drsnost=0.9),
        'ram': material('detail-ram-eurovea', '#5f666c', drsnost=0.5, kov=0.5),
        'klenba': sklo('sklo-eurovea-klenba', '#b9cdd6', drsnost=0.05, kov=0.45),
        'ocel': material('ocel-eurovea-svetla', '#d9dcdd', drsnost=0.45, kov=0.5),
        'strecha': material('strecha-eurovea', '#6d6f70', drsnost=0.95),
        'atika': material('atika-eurovea', '#cfc9bd', drsnost=0.8),
        'zelen': material('zahrada-strecha-eurovea', '#6e9b47', drsnost=1.0),
        'obruba': material('obruba-kvetinac-eurovea', '#e2ddd0', drsnost=0.8),
        'kriky': material('kriky-kvetinac-eurovea', '#55753a', drsnost=1.0),
        'totem': material('totem-eurovea', '#c8662f', drsnost=0.6),
    }


# --- pomôcky ----------------------------------------------------------------------------------------

def stred(b):
    return sum(p[0] for p in b) / len(b), sum(p[1] for p in b) / len(b)


def vnutri(x, y, b):
    c = False
    j = len(b) - 1
    for i in range(len(b)):
        xi, yi = b[i]
        xj, yj = b[j]
        if (yi > y) != (yj > y) and x < (xj - xi) * (y - yi) / (yj - yi) + xi:
            c = not c
        j = i
    return c


def vzdialenost_usecky(x, y, a, b):
    dx, dy = b[0] - a[0], b[1] - a[1]
    l2 = dx * dx + dy * dy or 1e-9
    t = max(0.0, min(1.0, ((x - a[0]) * dx + (y - a[1]) * dy) / l2))
    return math.hypot(x - a[0] - t * dx, y - a[1] - t * dy)


def od_okraja(x, y, b):
    return min(vzdialenost_usecky(x, y, b[i - 1], b[i]) for i in range(len(b)))


def podlazia(t):
    try:
        return max(1, int(float(t.get('building:levels', 1))))
    except ValueError:
        return 1


def posun(p, n, d):
    return (p[0] + n[0] * d, p[1] + n[1] * d)


# --- časti ----------------------------------------------------------------------------------------

class Cast:
    def __init__(self, c, st, z_ref):
        t = c['t']
        self.id, self.t = c['id'], t
        self.body = [(x - st[0], -(z - st[1])) for x, z in c['body']]
        if plocha_obrysu(self.body) < 0:
            self.body.reverse()
        self.zem = round(c['teren'][0] - z_ref, 2)           # terén pod časťou voči základni modelu
        self.druh = t.get('building:part') or t.get('building') or 'yes'
        self.podlazi = podlazia(t)
        self.strieska = t.get('building') == 'roof'
        self.klenba = t.get('roof:shape') == 'round' and t.get('roof:material') == 'glass'
        sklenena = t.get('building:material') == 'glass'
        if self.id in STYLY:
            self.styl = STYLY[self.id]
        elif sklenena:
            self.styl = 'sklo'
        elif self.druh in ('apartments', 'residential'):
            self.styl = 'byty_b'
        else:
            self.styl = 'galeria'
        min_l = float(t.get('building:min_level', 0) or 0)
        self.z0 = self.zem + 3.3 * min_l                      # podlubie (časť visí nad promenádou)
        if self.strieska:
            self.z1 = self.zem + (3.6 if t.get('roof:shape') == 'skillion' else 4.2)
        elif self.klenba:
            self.z1 = self.zem + KLENBA_HRANA
        else:
            h = VYSKY.get(self.id) or c.get('vyskaLaser') or (4.6 + (self.podlazi - 1) * 3.6)
            self.z1 = self.zem + h
        # plné časti (kolízia, zakrývajú steny susedov); pasáže pod klenbou a striešky nie
        self.plna = not self.strieska and not self.klenba

    def urovne(self):
        """Výšky podláh: prízemie podľa štýlu, ďalšie podlažia rovnomerne po vrch časti."""
        if self.z0 > self.zem + 0.5:
            n = max(1, self.podlazi - 1)
            h = (self.z1 - self.z0) / n
            return [self.z0 + h * k for k in range(n)] + [self.z1]
        priz = PRIZEMIE.get(self.styl, 4.6)
        if self.z1 - self.zem < priz + 2.5:
            return [self.zem, self.z1]
        n = max(1, self.podlazi - 1)
        h = (self.z1 - self.zem - priz) / n
        if h < 2.6:                                   # laser nižší než podlažia v OSM
            n = max(1, int((self.z1 - self.zem - priz) // 3.2))
            h = (self.z1 - self.zem - priz) / n
        return [self.zem] + [self.zem + priz + h * k for k in range(n)] + [self.z1]


def susedna_vyska(casti, ja, x, y):
    """Najvyššia plná susedná časť v bode (x, y) – po túto výšku je stena vnútorná (nekreslí sa)."""
    h = None
    for c in casti:
        if c is ja or not c.plna or c.z0 > ja.z0 + 0.5:
            continue
        if vnutri(x, y, c.body):
            h = c.z1 if h is None else max(h, c.z1)
    return h


def fasada(G, M, c, casti):
    """Steny časti po hranách: vnútorné úseky (sused je vyšší) vynechá; balkóny tehlového bloku súvislým pásom."""
    n = len(c.body)
    od = [None] * n
    for i in range(n):
        a, b = c.body[i], c.body[(i + 1) % n]
        if dlzka(a, b) < 0.2:
            continue
        nn = normala(a, b)
        # vzorka 0,4 m pred stenou v troch bodoch hrany – sused tam určuje, odkiaľ je stena vonkajšia
        hs = []
        for t in (0.2, 0.5, 0.8):
            px, py = a[0] + (b[0] - a[0]) * t + nn[0] * 0.4, a[1] + (b[1] - a[1]) * t + nn[1] * 0.4
            hs.append(susedna_vyska(casti, c, px, py))
        z_od = max(c.z0, min(hs)) if all(h is not None for h in hs) else c.z0
        if z_od >= c.z1 - 0.2:
            continue
        od[i] = z_od
        stena(G, M, c, a, b, nn, z_od, i)
    if c.z0 > c.zem + 0.5:
        G.vodorovna(M['biela'], c.body, c.z0, hore=False)          # podhľad podlubia
    if c.styl == 'tehla':
        balkony(G, M, c, od)


def stena(G, M, c, a, b, n, z_od, i):
    """Jedna hrana fasády od z_od po vrch časti podľa štýlu."""
    if z_od <= c.zem + 0.01:
        G.stena(M['sokel'], a, b, c.zem + SOKEL, c.zem)
    s = c.styl
    if s in ('sklo_piliere', 'kino', 'zelena'):
        return stena_celistva(G, M, c, a, b, n, z_od, i)
    urovne = [z for z in c.urovne() if z > z_od + 0.3]
    urovne = [z_od] + urovne
    if len(urovne) < 2:
        return
    posledne = len(urovne) - 2
    for k in range(len(urovne) - 1):
        za, zb = urovne[k], urovne[k + 1]
        if za <= c.zem + 0.01 and zb - za > 3.0:
            prizemie(G, M, c, a, b, n, za, zb)
        elif s in BYTY and k == posledne and c.podlazi >= 5:
            penthaus(G, M, a, b, n, za, zb)
        elif s == 'central1':
            pas_okien(G, M, a, b, n, za, zb, M['sklo_c1'], parapet=1.0, mat=M['pas'], krok=1.5)
        elif s == 'central3':
            pas_okien(G, M, a, b, n, za, zb, M['sklo_c3'], parapet=0.9, mat=M['pas'], krok=1.5)
        elif s == 'sheraton':
            dierovane(G, M, a, b, n, za, zb, M['bezovy'], os_okna=2.8, sirka=1.4, seed=i * 31 + k)
        elif s == 'krem':
            dierovane(G, M, a, b, n, za, zb, M['krem'], os_okna=3.0, sirka=1.7, seed=i * 17 + k)
        elif s == 'byty_a':
            lodzie(G, M, a, b, n, za, zb)
        elif s == 'byty_b':
            pas_okien(G, M, a, b, n, za, zb, M['sklo_byty'], parapet=0.9, nadokno=0.45, mat=M['svetly'], krok=1.8)
        elif s == 'tehla':
            pas_okien(G, M, a, b, n, za, zb, M['sklo_byty'], parapet=1.0, nadokno=0.4, mat=M['tehla'], krok=1.8)
        elif s == 'sklo':
            pas_okien(G, M, a, b, n, za, zb, M['sklo_c3'], parapet=0.35, mat=M['ram'], krok=1.5)
        else:   # galéria – svetlý obklad s pásom okien
            pas_okien(G, M, a, b, n, za, zb, M['sklo_byty'], parapet=1.2, nadokno=0.8, mat=M['svetly'], krok=3.0)


def prizemie(G, M, c, a, b, n, z0, z1):
    """Výklady v tmavých rámoch (stĺpiky po 3 m), nad nimi rímsový pás vo farbe fasády."""
    pas = {'central1': M['rimsa'], 'central3': M['rimsa'], 'sheraton': M['bezovy'], 'krem': M['krem'],
           'tehla': M['tehla'], 'byty_a': M['biela'], 'byty_b': M['svetly']}.get(c.styl, M['svetly'])
    zr = z1 - (1.0 if c.styl in ('central1', 'central3') else 0.8)
    pas_okien(G, M, a, b, n, z0, zr, M['vyklad'], parapet=0.0, mat=M['ram'], krok=3.0)
    G.stena(pas, a, b, zr, z1)


def pas_okien(G, M, a, b, n, z0, z1, mat_sklo, *, parapet, mat, krok=1.5, nadokno=0.0):
    """Podlažie: plný parapet, pás skla vnorený 0,15 m (s ostením), nadokenný pás, stĺpiky po `krok`."""
    L = dlzka(a, b)
    d = 0.15
    ai, bi = posun(a, n, -d), posun(b, n, -d)
    tx, ty = (b[0] - a[0]) / L, (b[1] - a[1]) / L
    zo, zh = z0 + parapet, z1 - nadokno
    if zh - zo < 0.4:
        G.stena(mat, a, b, z0, z1)
        return
    if parapet > 0:
        G.stena(mat, a, b, z0, zo)
    if nadokno > 0:
        G.stena(mat, a, b, zh, z1)
    G.stena(mat_sklo, ai, bi, zo, zh)
    G.plocha(mat, [(a[0], a[1], zo), (b[0], b[1], zo), (bi[0], bi[1], zo), (ai[0], ai[1], zo)])
    G.plocha(mat, [(ai[0], ai[1], zh), (bi[0], bi[1], zh), (b[0], b[1], zh), (a[0], a[1], zh)])
    # stĺpiky: jedna plocha otočená von pred sklom (2 trojuholníky – komplex má tisíce okien)
    pocet = max(1, round(L / krok))
    for j in range(1, pocet):
        p = posun((a[0] + tx * L * j / pocet, a[1] + ty * L * j / pocet), n, -0.07)
        G.stena(M['ram'], (p[0] - tx * 0.04, p[1] - ty * 0.04), (p[0] + tx * 0.04, p[1] + ty * 0.04), zo, zh)


def dierovane(G, M, a, b, n, z0, z1, mat, *, os_okna, sirka, seed):
    """Kamenná stena s jednotlivými zvislými oknami (parapet 0,9 m, nadokenný pás 0,7 m), okná vnorené 0,2 m
    s ostením; rytmus mierne nepravidelný (ako na Sheratone)."""
    L = dlzka(a, b)
    zo, zh = z0 + 0.9, z1 - 0.7
    G.stena(mat, a, b, z0, zo)
    G.stena(mat, a, b, zh, z1)
    pocet = int(L // os_okna)
    if pocet < 1 or zh - zo < 0.8:
        G.stena(mat, a, b, zo, zh)
        return
    rnd = random.Random(seed)
    tx, ty = (b[0] - a[0]) / L, (b[1] - a[1]) / L
    okraj = (L - pocet * os_okna) / 2
    s_pred = 0.0
    d = 0.2
    for k in range(pocet):
        stredo = okraj + os_okna * (k + 0.5) + rnd.uniform(-0.25, 0.25)
        s0, s1 = stredo - sirka / 2, stredo + sirka / 2
        p0, p1 = (a[0] + tx * s0, a[1] + ty * s0), (a[0] + tx * s1, a[1] + ty * s1)
        q = (a[0] + tx * s_pred, a[1] + ty * s_pred)
        G.stena(mat, q, p0, zo, zh)                            # pilier pred oknom
        p0i, p1i = posun(p0, n, -d), posun(p1, n, -d)
        G.stena(M['sklo_byty'], p0i, p1i, zo, zh)
        G.stena(mat, p0i, p0, zo, zh)                          # ostenie
        G.stena(mat, p1, p1i, zo, zh)
        G.plocha(mat, [(p0[0], p0[1], zo), (p1[0], p1[1], zo), (p1i[0], p1i[1], zo), (p0i[0], p0i[1], zo)])
        G.plocha(mat, [(p0i[0], p0i[1], zh), (p1i[0], p1i[1], zh), (p1[0], p1[1], zh), (p0[0], p0[1], zh)])
        s_pred = s1
    G.stena(mat, (a[0] + tx * s_pred, a[1] + ty * s_pred), b, zo, zh)


def lodzie(G, M, a, b, n, z0, z1):
    """Byty typu A: biely pás stropu, za ním lodžia (sklo 0,4 m dnu, sklené zábradlie v líci) a terakotové
    piliere na celú výšku podlažia po ~3,6 m."""
    L = dlzka(a, b)
    G.pas(M['biela'], [a, b], z0, z0 + 0.4, von=0.1, dnu=0.4, uzavreta=False)
    zo = z0 + 0.4
    G.stena(M['sklo_byty'], posun(a, n, -0.4), posun(b, n, -0.4), zo, z1)
    G.stena(M['zabradlie'], posun(a, n, -0.03), posun(b, n, -0.03), zo, zo + 1.0)
    tx, ty = (b[0] - a[0]) / L, (b[1] - a[1]) / L
    pocet = max(1, round(L / 3.6))
    for j in range(pocet + 1):
        s = min(max(L * j / pocet, 0.6), L - 0.6) if L > 1.2 else L / 2
        p = posun((a[0] + tx * s, a[1] + ty * s), n, -0.2)
        G.kvader(M['terakota'], p, (tx, ty), min(1.2, L), 0.42, zo, z1, vrch=False)


def penthaus(G, M, a, b, n, z0, z1):
    """Najvyššie podlažie bytov: presklené, ustúpené 1 m za terasou so skleným zábradlím."""
    G.pas(M['biela'], [a, b], z0, z0 + 0.35, von=0.05, dnu=1.0, uzavreta=False)
    zo = z0 + 0.35
    G.stena(M['sklo_byty'], posun(a, n, -1.0), posun(b, n, -1.0), zo, z1)
    G.stena(M['zabradlie'], posun(a, n, -0.03), posun(b, n, -0.03), zo, zo + 1.0)


def stena_celistva(G, M, c, a, b, n, z_od, i):
    """Galéria k námestiu: sklenená stena s grafitovými piliermi, morskozelená kocka alebo okrová kinová škatuľa."""
    L = dlzka(a, b)
    tx, ty = (b[0] - a[0]) / L, (b[1] - a[1]) / L
    z1 = c.z1
    if c.styl == 'sklo_piliere':
        G.stena(M['vyklad'], posun(a, n, -0.1), posun(b, n, -0.1), z_od, z1)
        for z in c.urovne()[1:-1]:
            G.pas(M['ram'], [posun(a, n, -0.1), posun(b, n, -0.1)], z - 0.15, z + 0.15, von=0.05, uzavreta=False)
        pocet = max(1, round(L / 4.5))
        for j in range(pocet + 1):
            s = min(max(L * j / pocet, 0.3), L - 0.3)
            G.kvader(M['grafit'], posun((a[0] + tx * s, a[1] + ty * s), n, 0.3), (tx, ty), 0.6, 1.0, z_od, z1)
    elif c.styl == 'zelena':
        G.stena(M['zelena'], a, b, z_od, z1)
        for z in c.urovne()[1:-1]:
            G.pas(M['ram'], [a, b], z - 0.06, z + 0.06, von=0.04, uzavreta=False)
    else:   # kino – mozaika veľkých panelov bez okien, prízemie výklady
        rnd = random.Random(i * 7 + 3)
        z = z_od
        if z_od <= c.zem + 0.01:
            prizemie(G, M, c, a, b, n, c.zem, c.zem + 5.0)
            z = c.zem + 5.0
        while z < z1 - 0.3:
            zz = min(z1, z + 3.5)
            s = 0.0
            while s < L - 0.1:
                s2 = min(L, s + rnd.uniform(2.5, 5.0))
                if L - s2 < 1.5:
                    s2 = L
                mat = M[rnd.choice(('kino1', 'kino2', 'kino3'))]
                G.stena(mat, (a[0] + tx * s, a[1] + ty * s), (a[0] + tx * s2, a[1] + ty * s2), z, zz)
                s = s2
            z = zz


def balkony(G, M, c, od):
    """Tehlový blok: balkónové dosky so sklenými zábradliami súvislým pásom po vonkajších hranách."""
    n = len(c.body)
    if all(z is not None for z in od):
        useky = [(list(range(n)), True)]
    else:
        useky, aktualny = [], []
        i0 = next(i for i in range(n) if od[i] is None)
        for k in range(1, n + 1):
            i = (i0 + k) % n
            if od[i] is None:
                if aktualny:
                    useky.append((aktualny, False))
                aktualny = []
            else:
                aktualny.append(i)
    urovne = c.urovne()
    for hrany, uzavreta in useky:
        linia = [c.body[i] for i in hrany] + ([] if uzavreta else [c.body[(hrany[-1] + 1) % n]])
        z_min = min(od[i] for i in hrany)
        for z in urovne[2:-2]:
            if z > z_min + 0.5:
                G.pas(M['biela'], linia, z - 0.15, z + 0.1, von=1.2, dnu=0.0, uzavreta=uzavreta)
                vonku = odsad(linia, 1.15, uzavreta)
                for i in range(len(linia) if uzavreta else len(linia) - 1):
                    G.stena(M['zabradlie'], vonku[i], vonku[(i + 1) % len(linia)], z + 0.1, z + 1.1)


def strecha_casti(G, M, c):
    """Plochá strecha s atikou; podnož galérie so strešnou záhradou, byty s tenkou presahujúcou strechou."""
    vn = odsad(c.body, -0.3)
    if c.styl in BYTY and c.podlazi >= 5:
        G.vodorovna(M['strecha'], c.body, c.z1)
        G.pas(M['biela'], c.body, c.z1, c.z1 + 0.25, von=0.9, dnu=0.0)
        return
    zahrada = c.styl == 'galeria' and c.z1 - c.zem < 16
    G.vodorovna(M['zelen'] if zahrada else M['strecha'], vn, c.z1 - 0.1)
    n = len(c.body)
    for i in range(n):
        j = (i + 1) % n
        G.stena(M['atika'], c.body[i], c.body[j], c.z1 - 0.1, c.z1 + 0.9)
        G.stena(M['atika'], vn[j], vn[i], c.z1 - 0.1, c.z1 + 0.9)
        G.plocha(M['atika'], [(vn[i][0], vn[i][1], c.z1 + 0.9), (c.body[i][0], c.body[i][1], c.z1 + 0.9),
                              (c.body[j][0], c.body[j][1], c.z1 + 0.9), (vn[j][0], vn[j][1], c.z1 + 0.9)])


def klenba(G, M, c, casti):
    """Presklená valená strecha nad pasážou: trojuholníková sieť v obryse časti, výška podľa vzdialenosti
    od bočných hrán (tam, kde pasáž susedí s budovou) – sploštený oblúk aj na zalomenej pasáži; na otvorených
    koncoch zvislý presklený štít a pred vstupom stĺpy. Priečle sú pásiky na hranách siete."""
    from mathutils import Vector
    from mathutils.geometry import delaunay_2d_cdt
    n = len(c.body)
    boky = []
    for i in range(n):
        a, b = c.body[i], c.body[(i + 1) % n]
        if dlzka(a, b) < 0.2:
            continue
        nx, ny = normala(a, b)
        px, py = (a[0] + b[0]) / 2 + nx * 0.5, (a[1] + b[1]) / 2 + ny * 0.5
        if any(q.plna and q.z1 > c.z1 - 1.0 and vnutri(px, py, q.body) for q in casti if q is not c):
            boky.append(i)
    if not boky:
        boky = list(range(n))
    bocne = [(c.body[i], c.body[(i + 1) % n]) for i in boky]

    def od_bokov(x, y):
        return min(vzdialenost_usecky(x, y, a, b) for a, b in bocne)
    hrana, rohy = rozdel(c.body, KLENBA_SIET)
    xs = [p[0] for p in c.body]
    ys = [p[1] for p in c.body]
    body = list(hrana)
    krok = KLENBA_SIET
    y = min(ys) + krok / 2
    rad = 0
    while y < max(ys):
        x = min(xs) + (krok / 2 if rad % 2 else 0)
        while x < max(xs):
            if vnutri(x, y, c.body) and od_okraja(x, y, c.body) > krok * 0.45:
                body.append((x, y))
            x += krok
        y += krok * 0.866
        rad += 1
    m = len(hrana)
    vys = delaunay_2d_cdt([Vector(p) for p in body], [(i, (i + 1) % m) for i in range(m)], [], 2, 1e-4)
    v2, trojuh = vys[0], vys[2]
    w = max(od_bokov(p.x, p.y) for p in v2) or 1.0
    vznos = min(KLENBA_VZNOS, 0.6 * w)

    def z(p):
        x, y = (p.x, p.y) if hasattr(p, 'x') else p
        t = min(1.0, od_bokov(x, y) / w)
        return c.z1 + vznos * math.sqrt(max(0.0, 1 - (1 - t) ** 2))
    V = [(p.x, p.y, z(p)) for p in v2]
    videne = set()
    for tr in trojuh:
        if len(tr) != 3:
            continue
        a, b, d = (V[i] for i in tr)
        if not vnutri((a[0] + b[0] + d[0]) / 3, (a[1] + b[1] + d[1]) / 3, c.body):
            continue
        if (b[0] - a[0]) * (d[1] - a[1]) - (b[1] - a[1]) * (d[0] - a[0]) < 0:
            b, d = d, b
        G.plocha(M['klenba'], [a, b, d])
        G.plocha(M['klenba'], [a, d, b])                  # zospodu (z pasáže)
        for p, q in ((a, b), (b, d), (d, a)):
            k = (min(p, q), max(p, q))
            if k not in videne:
                videne.add(k)
                priecla(G, M['ocel'], p, q)
    # obvodový nosník
    for i in range(n):
        G.stena(M['ocel'], c.body[i], c.body[(i + 1) % n], c.z1 - 0.5, c.z1)
    # štíty na otvorených koncoch (hrany, ktoré nie sú bočné) a stĺpy pred vstupmi
    vrcholy = [k for k in range(m) if rohy[k]] + [m]
    for e in range(n):
        if e in boky:
            continue
        pts = [hrana[k % m] for k in range(vrcholy[e], vrcholy[e + 1] + 1)]
        if len(pts) < 2 or dlzka(pts[0], pts[-1]) < 0.5:
            continue
        stit = [(p[0], p[1], c.z1) for p in pts] + [(p[0], p[1], z(p)) for p in reversed(pts)]
        G.plocha(M['klenba'], stit)
        G.plocha(M['klenba'], list(reversed(stit)))
        if c.druh == 'roof' and dlzka(pts[0], pts[-1]) > 6.0 and len(boky) < n:
            stlpy_vstupu(G, M, c, pts[0], pts[-1])


def stlpy_vstupu(G, M, c, a, b):
    """Dva stĺpy pod prednou hranou klenby vstupu; pri námestí biele „stromové“ (driek sa vetví na 4 vzpery)."""
    L = dlzka(a, b)
    tx, ty = (b[0] - a[0]) / L, (b[1] - a[1]) / L
    nx, ny = normala(a, b)
    for t in (0.25, 0.75):
        p = (a[0] + tx * L * t - nx * 0.6, a[1] + ty * L * t - ny * 0.6)
        if c.id == VSTUP_NAMESTIE:
            zv = c.zem + (c.z1 - c.zem) * 0.62
            G.valec(M['ocel'], p, 0.24, c.zem, zv, seg=8)
            for dx, dy in ((tx * 2.2, ty * 2.2), (-tx * 2.2, -ty * 2.2), (-nx * 1.8, -ny * 1.8), (nx * 0.8, ny * 0.8)):
                G.tram(M['ocel'], (p[0], p[1], zv), (p[0] + dx, p[1] + dy, c.z1 - 0.3), 0.16)
        else:
            G.valec(M['ocel'], p, 0.16, c.zem, c.z1 - 0.3, seg=8)


def priecla(G, mat, p, q, sirka=0.1):
    """Priečľa siete: úzky pásik nad sklom, kolmo na hranu v rovine skla."""
    dx, dy = q[0] - p[0], q[1] - p[1]
    L = math.sqrt(dx * dx + dy * dy) or 1e-9
    ox, oy = -dy / L * sirka / 2, dx / L * sirka / 2
    h = 0.04
    G.plocha(mat, [(p[0] - ox, p[1] - oy, p[2] + h), (q[0] - ox, q[1] - oy, q[2] + h),
                   (q[0] + ox, q[1] + oy, q[2] + h), (p[0] + ox, p[1] + oy, p[2] + h)])


def strieska(G, M, c):
    """Presklená strieška: doska skla s oceľovým rámom na tenkých stĺpikoch; pultová (vjazd do garáže) klesá na V."""
    sklon = c.t.get('roof:shape') == 'skillion'
    b = c.body
    st = stred(b)
    zz = [c.z1 - ((p[0] - st[0]) * 0.06 if sklon else 0.0) for p in b]
    G.plocha(M['klenba'], [(p[0], p[1], zz[i]) for i, p in enumerate(b)])
    G.plocha(M['klenba'], [(p[0], p[1], zz[i]) for i, p in reversed(list(enumerate(b)))])
    n = len(b)
    for i in range(n):
        j = (i + 1) % n
        G.plocha(M['ocel'], [(b[i][0], b[i][1], zz[i] - 0.25), (b[j][0], b[j][1], zz[j] - 0.25),
                             (b[j][0], b[j][1], zz[j] + 0.05), (b[i][0], b[i][1], zz[i] + 0.05)])
        if dlzka(b[i], b[j]) > 1.5:
            G.valec(M['ocel'], b[i], 0.09, c.zem, zz[i] - 0.25, seg=6)


def kvetinac(G, M, p, r, z):
    """Kruhový kvetináč: nízky svetlý okraj a strihané kríky."""
    G.valec(M['obruba'], p, r, z, z + 0.45, seg=16)
    G.valec(M['kriky'], p, r - 0.3, z + 0.45, z + 0.85, seg=12)


def totem(G, M, c):
    """Stĺp pred západným vstupom (~1,5 × 0,5 × 8 m, hrdzavooranžový, bez loga) – 5 m pred najdlhšou hranou."""
    n = len(c.body)
    best = max(range(n), key=lambda i: dlzka(c.body[i], c.body[(i + 1) % n]))
    a, b = c.body[best], c.body[(best + 1) % n]
    nx, ny = normala(a, b)
    m = ((a[0] + b[0]) / 2 + nx * 5.0, (a[1] + b[1]) / 2 + ny * 5.0)
    L = dlzka(a, b)
    G.kvader(M['totem'], m, ((b[0] - a[0]) / L, (b[1] - a[1]) / L), 1.5, 0.5, c.zem, c.zem + 8.0)


# --- celok ----------------------------------------------------------------------------------------

def postav(_obrysy):
    with open(os.path.join(TU, 'data', 'eurovea.json'), encoding='utf-8') as f:
        data = json.load(f)
    vsetky = [b for c in data['casti'] for b in c['body']]
    st = (round(sum(p[0] for p in vsetky) / len(vsetky), 2), round(sum(p[1] for p in vsetky) / len(vsetky), 2))
    # základňa = terén pri vstupe do galérie (data['zakladna']); časti sa kladú na svoj terén voči nej
    zb, z_ref = data['zakladna']['bod'], data['zakladna']['teren']
    casti = [Cast(c, st, z_ref) for c in data['casti']]
    M = materialy()
    G = Geo()
    for c in casti:
        if c.strieska:
            strieska(G, M, c)
        elif c.klenba:
            klenba(G, M, c, casti)
        else:
            fasada(G, M, c, casti)
            strecha_casti(G, M, c)
    zapad = next((c for c in casti if c.id == VSTUP_ZAPAD), None)
    if zapad:
        totem(G, M, zapad)
    for k in data.get('kvetinace', []):
        x, z = k['bod']
        kvetinac(G, M, (x - st[0], -(z - st[1])), k['polomer'], 0.0)
    plne = [c for c in casti if c.plna and c.z0 <= c.zem + 0.01]
    vchody = []
    for v in data['vchody']:
        x, z = v['bod']
        vchody.append({'id': v['id'], 'bod': [round(x - st[0], 2), round(z - st[1], 2)], 'vyska': 0.0,
                       **({'nazov': v['nazov']} if 'nazov' in v else {})})
    info = {
        'stred': list(st),
        'zakladnaBod': [round(zb[0] - st[0], 2), round(zb[1] - st[1], 2)],
        'bezKoliziiObrysov': True,
        'kolizie': [do_hry(c.body) for c in plne],
        'vchody': vchody,
    }
    print(f'Eurovea 1: {len(casti)} častí ({sum(c.klenba for c in casti)} presklených striech, '
          f'{sum(c.strieska for c in casti)} striešok), stred {st}, základňa {z_ref:.2f} m n. m.')
    pocty = {}
    for f, m in zip(G.f, G.fm):
        pocty[G.mat[m].name] = pocty.get(G.mat[m].name, 0) + len(f) - 2
    print('Eurovea 1 – trojuholníky podľa materiálu:', ', '.join(f'{k} {v}' for k, v in sorted(pocty.items(), key=lambda q: -q[1])))
    vyska = max(c.z1 for c in casti)
    return G, [c.body for c in casti], vyska, 'eurovea-1', info
