# Trasy vlakov okolo Hlavnej stanice z OpenStreetMap → data/vlaky/trate.json (úloha A2).
#
#   python3 tools/vlaky/trate_osm.py           – stiahne koľaje z OSM (Overpass) do .cache/vlaky/ a vyrobí trasy
#   python3 tools/vlaky/trate_osm.py --cache   – použije uložené .cache/vlaky/trate-osm.json
#
# Postup: koľaje (railway=rail) v kruhu POLOMER okolo stanice → graf uzlov OSM. Na hraniciach kruhu sú vstupy
# (západ = smer Lamač / tunel, východ = smer Vinohrady / Nové Mesto). Ku každému nástupišťu Hlavnej stanice
# (railway=platform, local_ref 1–6) sa nájdu koľaje pozdĺž jeho hrán a pre každú koľaj štyri trasy:
#   z_zapadu  – od západného vstupu po zastavenie pri strede nástupišťa (vlak ide na východ),
#   na_vychod – od zastavenia po východný výstup,
#   z_vychodu / na_zapad – to isté opačným smerom.
# Vlak na výhybke nemôže otočiť smer (ostrý uhol), hlavné koľaje majú prednosť pred vedľajšími a odstavnými.
# Súradnice sú v metroch hry (x východ, z juh, (0,0) = 48.1435 N, 17.1077 E). Úseky v tuneli sú označené (vlak sa skryje).
# Dáta © prispievatelia OpenStreetMap, ODbL.

import heapq
import json
import math
import os
import sys
import urllib.parse
import urllib.request

TU = os.path.dirname(os.path.abspath(__file__))
KOREN = os.path.normpath(os.path.join(TU, '..', '..'))
CACHE = os.path.join(KOREN, '.cache', 'vlaky', 'trate-osm.json')
VYSTUP = os.path.join(KOREN, 'data', 'vlaky', 'trate.json')
LAT0, LON0 = 48.1435, 17.1077
KX = 111320 * math.cos(math.radians(LAT0))
KZ = 111132
STRED_LAT, STRED_LON = 48.1598, 17.1064     # Bratislava hl. st.
POLOMER = 2600.0                             # m – trasy vlakov končia na tomto kruhu (alebo v tuneli)
MAX_ZATOCKA = math.radians(40)               # najväčšia zmena smeru medzi dvoma úsekmi (inak by vlak „otočil“ na výhybke)
VAHA = {None: 1.0, 'crossover': 1.3, 'siding': 1.6, 'yard': 6.0, 'spur': 20.0}


def stiahni():
    q = f"""[out:json][timeout:120];
(
 way["railway"="rail"](around:{POLOMER + 400},{STRED_LAT},{STRED_LON});
 way["railway"="platform"](around:900,{STRED_LAT},{STRED_LON});
);
out body;
>;
out skel qt;"""
    req = urllib.request.Request('https://overpass-api.de/api/interpreter',
                                 data=urllib.parse.urlencode({'data': q}).encode(),
                                 headers={'User-Agent': 'blavacik-mapa/1.0'})
    return json.load(urllib.request.urlopen(req, timeout=240))


def bod(lat, lon):
    return ((lon - LON0) * KX, -(lat - LAT0) * KZ)


def r2(v):
    return round(v, 2)


def zjednodus(body, tol=0.12):
    """Douglas–Peucker (body sú [x, z, s, tunel])."""
    if len(body) < 3:
        return body
    a, b = body[0], body[-1]
    dx, dz = b[0] - a[0], b[1] - a[1]
    d = math.hypot(dx, dz) or 1e-9
    imax, dmax = 0, -1.0
    for i in range(1, len(body) - 1):
        p = body[i]
        dd = abs((p[0] - a[0]) * dz - (p[1] - a[1]) * dx) / d
        if p[3] != a[3]:
            dd = 1e9            # hranicu tunela zachovať
        if dd > dmax:
            imax, dmax = i, dd
    if dmax <= tol:
        return [a, b]
    return zjednodus(body[:imax + 1], tol)[:-1] + zjednodus(body[imax:], tol)


def main():
    if '--cache' in sys.argv and os.path.exists(CACHE):
        osm = json.load(open(CACHE, encoding='utf-8'))
    else:
        osm = stiahni()
        os.makedirs(os.path.dirname(CACHE), exist_ok=True)
        json.dump(osm, open(CACHE, 'w', encoding='utf-8'))
    uzly = {e['id']: bod(e['lat'], e['lon']) for e in osm['elements'] if e['type'] == 'node'}
    cesty = [e for e in osm['elements'] if e['type'] == 'way']
    sx, sz = bod(STRED_LAT, STRED_LON)

    # --- graf koľají ---
    sus = {}            # uzol → [(sused, dĺžka, váha, tunel, way)]
    def hrana(a, b, w, tunel, wid):
        pa, pb = uzly[a], uzly[b]
        d = math.hypot(pb[0] - pa[0], pb[1] - pa[1])
        if d < 1e-3:
            return
        sus.setdefault(a, []).append((b, d, w, tunel, wid))
        sus.setdefault(b, []).append((a, d, w, tunel, wid))
    koleje = {}
    for c in cesty:
        t = c.get('tags', {})
        if t.get('railway') != 'rail' or t.get('service') == 'spur' and t.get('usage') != 'main':
            continue
        w = VAHA.get(t.get('service'), 3.0)
        if t.get('usage') == 'main':
            w = 1.0
        tunel = t.get('tunnel') not in (None, 'no', 'building_passage')
        nd = [n for n in c['nodes'] if n in uzly]
        for a, b in zip(nd, nd[1:]):
            hrana(a, b, w, tunel, c['id'])
        koleje[c['id']] = c
    def vnutri(n):
        p = uzly[n]
        return math.hypot(p[0] - sx, p[1] - sz) <= POLOMER

    # vstupy: hrany, ktoré pretínajú kruh (uzol vnútri, sused vonku); strana podľa polohy voči stanici
    vstupy = {'zapad': set(), 'vychod': set()}
    for a, ss in sus.items():
        if not vnutri(a):
            continue
        for b, *_ in ss:
            if not vnutri(b):
                p = uzly[a]
                strana = 'zapad' if p[0] < sx else 'vychod'
                vstupy[strana].add(a)

    # --- nástupištia Hlavnej stanice a koľaje pri nich ---
    nastupistia = []
    for c in cesty:
        t = c.get('tags', {})
        if t.get('railway') != 'platform' or 'hl.st' not in (t.get('name') or ''):
            continue
        body = [uzly[n] for n in c['nodes'] if n in uzly]
        nastupistia.append({'ref': t.get('local_ref') or t.get('ref'), 'body': body, 'id': c['id']})
    nastupistia.sort(key=lambda n: str(n['ref']))

    def vzdialenost_k_useku(p, a, b):
        dx, dz = b[0] - a[0], b[1] - a[1]
        L2 = dx * dx + dz * dz or 1e-9
        u = max(0.0, min(1.0, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dz) / L2))
        q = (a[0] + u * dx, a[1] + u * dz)
        return math.hypot(p[0] - q[0], p[1] - q[1]), u, q

    # hrany grafu ako zoznam (a, b) bez duplicít
    hrany = []
    videne = set()
    for a, ss in sus.items():
        for b, d, w, tun, wid in ss:
            k = (min(a, b), max(a, b))
            if k not in videne:
                videne.add(k)
                hrany.append((a, b, wid))

    vysledok_koleji = {}
    for n in nastupistia:
        body = n['body']
        # os nástupišťa: najdlhší rozmer – vzorky po 10 m pozdĺž obrysu, priemer = stred
        cx = sum(p[0] for p in body) / len(body)
        cz = sum(p[1] for p in body) / len(body)
        # koľaje: hrany s vrcholom do 7 m od obrysu nástupišťa, zoskupené podľa cesty OSM
        kand = {}
        for a, b, wid in hrany:
            pa, pb = uzly[a], uzly[b]
            if math.hypot(pa[0] - cx, pa[1] - cz) > 500:
                continue
            best = 99.0
            for i in range(len(body)):
                p, q = body[i], body[(i + 1) % len(body)]
                for x in (pa, pb):
                    dd, _, _ = vzdialenost_k_useku(x, p, q)
                    best = min(best, dd)
            # stred hrany tiež (dlhé hrany)
            m = ((pa[0] + pb[0]) / 2, (pa[1] + pb[1]) / 2)
            for i in range(len(body)):
                dd, _, _ = vzdialenost_k_useku(m, body[i], body[(i + 1) % len(body)])
                best = min(best, dd)
            if best < 4.2:
                kand.setdefault(wid, []).append((best, a, b))
        # pre každú koľaj (cestu OSM) bod zastavenia = priemet stredu nástupišťa na najbližšiu hranu
        for wid, hh in kand.items():
            if len(hh) < 2:
                continue
            t = koleje[wid].get('tags', {})
            ref = t.get('railway:track_ref') or str(wid)
            naj = None
            for _, a, b in hh:
                dd, u, q = vzdialenost_k_useku((cx, cz), uzly[a], uzly[b])
                if naj is None or dd < naj[0]:
                    naj = (dd, a, b, u, q)
            dd, a, b, u, q = naj
            if dd > 25:
                continue
            vysledok_koleji.setdefault(ref, {'nastupiste': n['ref'], 'hrana': (a, b, u), 'bod': q, 'way': wid})

    print('nástupištia:', [(n['ref'], n['id']) for n in nastupistia])
    print('koľaje pri nástupištiach:', {k: (v['nastupiste'], v['way']) for k, v in vysledok_koleji.items()})
    print('vstupy:', {k: len(v) for k, v in vstupy.items()})

    # --- hľadanie trás (stav = (predchádzajúci uzol, uzol)) ---
    def zatocka_ok(p0, p1, p2):
        a = (p1[0] - p0[0], p1[1] - p0[1])
        b = (p2[0] - p1[0], p2[1] - p1[1])
        la, lb = math.hypot(*a), math.hypot(*b)
        if la < 1e-6 or lb < 1e-6:
            return True
        c = max(-1.0, min(1.0, (a[0] * b[0] + a[1] * b[1]) / (la * lb)))
        return math.acos(c) <= MAX_ZATOCKA

    def najdi(zaciatky, ciel_hrana, smer_ciela):
        """Najlacnejšia cesta z ktoréhokoľvek uzla zo `zaciatky` na hranu (a, b) v smere a→b (smer_ciela=+1) alebo b→a."""
        a, b, _ = ciel_hrana
        ciel_z, ciel_do = (a, b) if smer_ciela > 0 else (b, a)
        pq = []
        najlepsie = {}
        pred = {}
        for z in zaciatky:
            st = (None, z)
            najlepsie[st] = 0.0
            heapq.heappush(pq, (0.0, z, None))
        while pq:
            cena, n, p = heapq.heappop(pq)
            st = (p, n)
            if cena > najlepsie.get(st, 1e18):
                continue
            if p == ciel_z and n == ciel_do:
                cesta = [n]
                s = st
                while s in pred:
                    s = pred[s]
                    cesta.append(s[1])
                return list(reversed(cesta))
            for m, d, w, tun, wid in sus.get(n, []):
                if m == p or not vnutri(m):
                    continue
                if p is not None and not zatocka_ok(uzly[p], uzly[n], uzly[m]):
                    continue
                nc = cena + d * w
                ns = (n, m)
                if nc < najlepsie.get(ns, 1e18):
                    najlepsie[ns] = nc
                    pred[ns] = st
                    heapq.heappush(pq, (nc, m, n))
        return None

    def tunel_hrany(a, b):
        for m, d, w, tun, wid in sus.get(a, []):
            if m == b:
                return tun
        return False

    def polyline(uzly_cesty, zaciatok_bod=None, koniec_bod=None):
        body = [list(uzly[n]) for n in uzly_cesty]
        tun = [False] + [tunel_hrany(a, b) for a, b in zip(uzly_cesty, uzly_cesty[1:])]
        if zaciatok_bod is not None:
            body[0] = list(zaciatok_bod)
        if koniec_bod is not None:
            body[-1] = list(koniec_bod)
        out, s = [], 0.0
        for i, p in enumerate(body):
            if i:
                s += math.hypot(p[0] - body[i - 1][0], p[1] - body[i - 1][1])
            out.append([p[0], p[1], s, tun[i]])
        out = zjednodus(out)
        return [[r2(x), r2(z), 1 if t else 0] for x, z, s, t in out]

    trasy = {}
    for ref, k in sorted(vysledok_koleji.items()):
        a, b, u = k['hrana']
        pa, pb = uzly[a], uzly[b]
        # smer hrany a→b: na východ (x rastie) = +1
        vychodne = pb[0] > pa[0]
        smer_na_vychod = 1 if vychodne else -1
        q = k['bod']
        out = {'nastupiste': k['nastupiste'], 'bod': [r2(q[0]), r2(q[1])]}
        # príchod zo západu: cesta na hranu v smere na východ, posledný bod nahradíme bodom zastavenia
        for nazov, zac, smer in (('z_zapadu', vstupy['zapad'], smer_na_vychod), ('z_vychodu', vstupy['vychod'], -smer_na_vychod)):
            c = najdi(zac, k['hrana'], smer)
            if c:
                # posledný uzol je za bodom zastavenia – trasa končí v bode q
                out[nazov] = polyline(c[:-1]) + [[r2(q[0]), r2(q[1]), 0]]
        # odchod: z bodu zastavenia ďalej rovnakým smerom – hľadáme cestu z „konca hrany“ k výstupu
        for nazov, ciele, smer in (('na_vychod', vstupy['vychod'], smer_na_vychod), ('na_zapad', vstupy['zapad'], -smer_na_vychod)):
            zac_uzol = b if smer > 0 else a
            pred_uzol = a if smer > 0 else b
            najlepsia = None
            for cil in ciele:
                # spätné hľadanie: z výstupu k hrane opačným smerom, potom otočiť
                c = najdi([cil], k['hrana'], -smer)
                if c and (najlepsia is None or len(c) < len(najlepsia)):
                    najlepsia = c
            if najlepsia:
                c = list(reversed(najlepsia))      # začína pri hrane (pred_uzol/zac_uzol), končí vo výstupe
                if c[0] == pred_uzol:
                    c = c[1:]
                out[nazov] = [[r2(q[0]), r2(q[1]), 0]] + polyline(c)
        trasy[ref] = out
        print(ref, 'nást.', k['nastupiste'], {n: len(v) for n, v in out.items() if isinstance(v, list) and n not in ('bod',)})

    os.makedirs(os.path.dirname(VYSTUP), exist_ok=True)
    data = {
        'popis': 'Trasy vlakov okolo Bratislava hl. st. (tools/vlaky/trate_osm.py). Body [x, z, tunel]; '
                 'z_zapadu/z_vychodu končia v bode zastavenia, na_vychod/na_zapad v ňom začínajú. © prispievatelia OpenStreetMap, ODbL.',
        'stanica': [r2(sx), r2(sz)],
        'polomer': POLOMER,
        'kolaje': trasy,
    }
    json.dump(data, open(VYSTUP, 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
    print('zapísané', VYSTUP, os.path.getsize(VYSTUP), 'B')


if __name__ == '__main__':
    main()
