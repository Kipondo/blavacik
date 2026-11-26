# Mapa plôch nového modelu (variant 3+): čo je na povrchu terénu – vozovka, chodník, cyklotrasa, parkovisko,
# koľajisko, tráva, les, ihrisko, voda – ako obrázok 0,25 m/pixel na každú dlaždicu 256 m (1024 × 1024 px).
# Terén ho nesie ako farbu (model/js/teren.js), takže plochy sú presne „nalepené“ na teréne – nič sa nevznáša
# ani nezapadá. Zdroj: OpenStreetMap (.cache/model/osm.json – tools/model/osm.py), © prispievatelia OSM, ODbL.
#   – cesty: os z OSM, šírka z width / lanes, inak podľa druhu cesty (napr. sekundárna 8 m, obytná 6 m),
#   – plochy: landuse / leisure / natural / amenity=parking / area:highway / place=square (aj multipolygóny s dierami),
#   – mosty a tunely sa na zem nekreslia (pod mostom je to, čo je naozaj na zemi).
# Spustenie: python tools/model/plochy.py  → model/data/plochy/<i>_<j>.png

import json, os, sys
from PIL import Image, ImageDraw

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from spolocne import CACHE, VYSTUP, DLAZDICA, PIX, dlazdice, roh  # noqa: E402

FARBA = {
    'teren': '#d8d2c4', 'trava': '#9fc07a', 'les': '#6f9a58', 'ihrisko': '#c9a77a', 'piesok': '#ddd0a6',
    'pole': '#c8c79a', 'voda': '#6f9fc4', 'spevnena': '#b4b0a8', 'parkovisko': '#8d8b87', 'vozovka': '#55575a',
    'chodnik': '#a9a6a0', 'cyklo': '#b0766a', 'kolaj': '#7a6a5c', 'budova': '#c2bcb0', 'cintorin': '#a7b88c',
}
PALETA = list(FARBA)

SIRKA = {
    'motorway': 11, 'trunk': 10, 'primary': 9, 'secondary': 8, 'tertiary': 7, 'unclassified': 6, 'residential': 6,
    'motorway_link': 6, 'trunk_link': 6, 'primary_link': 6, 'secondary_link': 6, 'tertiary_link': 6,
    'living_street': 5, 'service': 4, 'busway': 6, 'track': 3, 'road': 6,
    'pedestrian': 5, 'footway': 2.2, 'path': 1.8, 'steps': 2.5, 'bridleway': 2, 'cycleway': 2.0, 'platform': 3,
}
CHODNIK = {'pedestrian', 'footway', 'path', 'steps', 'bridleway', 'platform', 'corridor'}


def cislo(v):
    try:
        return float(str(v).replace(',', '.').split()[0])
    except Exception:
        return None


def sirka_cesty(t):
    w = cislo(t.get('width'))
    if w and 1 <= w <= 40:
        return w
    h = t.get('highway')
    lanes = cislo(t.get('lanes'))
    if lanes and h not in CHODNIK and h != 'cycleway':
        return lanes * 3.25 + 1.0
    if h == 'service' and t.get('service') == 'parking_aisle':
        return 5.5
    if h == 'service' and t.get('service') == 'driveway':
        return 3.0
    if h == 'footway' and t.get('footway') == 'sidewalk':
        return 2.5
    return SIRKA.get(h)


def spoj_ringy(casti):
    ringy, otv = [], [list(map(tuple, c)) for c in casti if len(c) > 1]
    while otv:
        r = otv.pop()
        zmena = True
        while zmena and r[0] != r[-1]:
            zmena = False
            for k, c in enumerate(otv):
                if c[0] == r[-1]: r += c[1:]
                elif c[-1] == r[-1]: r += c[::-1][1:]
                elif c[-1] == r[0]: r = c[:-1] + r
                elif c[0] == r[0]: r = c[::-1][:-1] + r
                else: continue
                otv.pop(k); zmena = True; break
        if len(r) >= 4:
            ringy.append(r)
    return ringy


def trieda_plochy(t):
    lu, le, na, am = t.get('landuse'), t.get('leisure'), t.get('natural'), t.get('amenity')
    if na == 'water' or t.get('waterway') in ('riverbank', 'dock') or lu in ('basin', 'reservoir') or am == 'fountain' or le == 'swimming_pool':
        return 'voda', 6
    if am == 'parking' or lu in ('garages',):
        return 'parkovisko', 4
    if t.get('area:highway') in ('footway', 'pedestrian', 'path', 'steps', 'platform') or (t.get('highway') in ('pedestrian', 'footway') and t.get('area') == 'yes') or t.get('place') == 'square':
        return 'chodnik', 5
    if t.get('area:highway') in ('primary', 'secondary', 'tertiary', 'residential', 'service', 'unclassified', 'living_street', 'road', 'trunk', 'motorway'):
        return 'vozovka', 5
    if t.get('area:highway') == 'cycleway':
        return 'cyklo', 5
    if le in ('pitch', 'track', 'playground', 'sports_centre', 'stadium', 'fitness_station'):
        return 'ihrisko', 3
    if na in ('wood', 'scrub') or lu in ('forest',):
        return 'les', 2
    if lu in ('cemetery',) or am == 'grave_yard':
        return 'cintorin', 2
    if na in ('sand', 'beach') or lu in ('construction', 'brownfield') and False:
        return 'piesok', 2
    if lu in ('farmland', 'orchard', 'vineyard', 'allotments', 'plant_nursery'):
        return 'pole', 2
    if lu in ('grass', 'meadow', 'village_green', 'recreation_ground', 'flowerbed') or le in ('park', 'garden', 'dog_park', 'common') or na in ('grassland', 'heath'):
        return 'trava', 1
    if am in ('marketplace',) or lu in ('railway',) and False:
        return 'spevnena', 4
    return None, None


def main():
    osm = json.load(open(os.path.join(CACHE, 'osm.json'), encoding='utf8'))['prvky']
    plochy, cesty, kolaje, budovy = [], [], [], []
    for p in osm:
        t = p['t']
        if 'building' in t and p['typ'] == 'w' and len(p['b']) >= 4:
            budovy.append([p['b']])
            continue
        trieda, poradie = trieda_plochy(t)
        if trieda and (p['typ'] == 'w' and len(p['b']) >= 4 and p['b'][0] == p['b'][-1] or p['typ'] == 'r'):
            if p['typ'] == 'w':
                von, dnu = [p['b']], []
            else:
                von = spoj_ringy([c['b'] for c in p['casti'] if c['rola'] != 'inner'])
                dnu = spoj_ringy([c['b'] for c in p['casti'] if c['rola'] == 'inner'])
            plochy.append((poradie, trieda, von, dnu))
            continue
        if p['typ'] != 'w' or len(p['b']) < 2:
            continue
        if t.get('tunnel') in ('yes', 'building_passage', 'culvert') or (cislo(t.get('layer')) or 0) < 0 or t.get('indoor') == 'yes':
            continue
        if t.get('bridge') and t.get('bridge') != 'no':
            continue                      # most – na zemi nie je (variant 4: mostovka)
        h = t.get('highway')
        if h and t.get('area') != 'yes':
            w = sirka_cesty(t)
            if w:
                trieda = 'chodnik' if h in CHODNIK else 'cyklo' if h == 'cycleway' else 'vozovka'
                cesty.append((trieda, w, p['b']))
        r = t.get('railway')
        if r in ('rail', 'tram', 'light_rail', 'narrow_gauge', 'subway') and t.get('area') != 'yes':
            kolaje.append((3.2 if r == 'tram' else 4.0, p['b']))
    plochy.sort(key=lambda x: x[0])
    poradie_ciest = {'vozovka': 0, 'cyklo': 1, 'chodnik': 2}
    cesty.sort(key=lambda c: (poradie_ciest[c[0]], -c[1]))
    print(f'plôch {len(plochy)}, ciest {len(cesty)}, koľají {len(kolaje)}, budov {len(budovy)}')

    ciel = os.path.join(VYSTUP, 'plochy')
    os.makedirs(ciel, exist_ok=True)
    N = int(round(DLAZDICA / PIX))
    paleta_rgb = []
    for k in PALETA:
        h = FARBA[k].lstrip('#')
        paleta_rgb += [int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16)]
    idx = {k: i for i, k in enumerate(PALETA)}
    spolu = 0
    for i, j in dlazdice():
        x0, z0 = roh(i, j)
        okraj = 30
        vnutri = lambda b: any(x0 - okraj <= x <= x0 + DLAZDICA + okraj and z0 - okraj <= z <= z0 + DLAZDICA + okraj for x, z in b) or (
            min(x for x, _ in b) < x0 and max(x for x, _ in b) > x0 + DLAZDICA and min(z for _, z in b) < z0 + DLAZDICA and max(z for _, z in b) > z0)
        px = lambda b: [((x - x0) / PIX, (z - z0) / PIX) for x, z in b]
        img = Image.new('P', (N, N), idx['teren'])
        img.putpalette(paleta_rgb + [0] * (768 - len(paleta_rgb)))
        d = ImageDraw.Draw(img)
        for _, trieda, von, dnu in plochy:
            if not any(vnutri(r) for r in von):
                continue
            maska = Image.new('L', (N, N), 0)
            dm = ImageDraw.Draw(maska)
            for r in von:
                if len(r) >= 3: dm.polygon(px(r), fill=255)
            for r in dnu:
                if len(r) >= 3: dm.polygon(px(r), fill=0)
            img.paste(idx[trieda], (0, 0, N, N), maska)
        for b in budovy:
            if vnutri(b[0]):
                d.polygon(px(b[0]), fill=idx['budova'])
        for trieda, w, b in cesty:
            if not vnutri(b):
                continue
            pb = px(b)
            sirka = max(1, int(round(w / PIX)))
            d.line(pb, fill=idx[trieda], width=sirka, joint='curve')
            r = sirka / 2
            for x, y in (pb[0], pb[-1]):
                d.ellipse((x - r, y - r, x + r, y + r), fill=idx[trieda])
        for w, b in kolaje:
            if vnutri(b):
                d.line(px(b), fill=idx['kolaj'], width=max(1, int(round(w / PIX))), joint='curve')
        cesta = os.path.join(ciel, f'{i}_{j}.png')
        img.save(cesta, optimize=True)
        spolu += os.path.getsize(cesta)
    print(f'Hotovo: {len(dlazdice())} dlaždíc, {spolu / 1e6:.1f} MB')


if __name__ == '__main__':
    main()
