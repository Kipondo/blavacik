# Presné modely vybraných pamiatok (noc 22. 11.): Slavín, Modrý kostolík; 26. 11.: historická budova SND, Reduta,
# Dóm sv. Martina, Stará radnica; 27. 11.: Primaciálny palác, Jezuitský a Františkánsky kostol. Prepíšu assets/pamiatky/sm-<kľúč>.glb.gz,
# záznamy v data/mapa/pamiatky.json aj obrysy (kolízie) ostávajú. Postup a zdroje sú v hlavičke každého súboru
# v tools/blender/presne/.
# Spustenie: python3 tools/blender/presne_blender.py [slavin] [modry-kostolik] [snd] [reduta] [dom-sv-martina]
#             [stara-radnica] [primacialny-palac] [jezuitsky-kostol] [frantiskansky-kostol]

import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import bpy  # noqa: E402
from veze import uloz, z_hry, ccw  # noqa: E402
from historicke.budova import nacitaj  # noqa: E402
from presne import slavin, modry_kostolik, snd, reduta, dom, radnica, primacialny, jezuiti, frantiskani  # noqa: E402

KOREN = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


def info(subor):
    with open(os.path.join(KOREN, 'assets', 'pamiatky', f'{subor}.json')) as f:
        return json.load(f)


def bez_konca(b):
    return b[:-1] if b and b[0] == b[-1] else b


# argumenty za „--“ (blender -b -P presne_blender.py -- snd) alebo priamo (python3 s modulom bpy)
ARGS = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else sys.argv[1:]
for kluc in ARGS or ['slavin', 'modry-kostolik', 'snd', 'reduta', 'dom-sv-martina', 'stara-radnica', 'primacialny-palac',
                         'jezuitsky-kostol', 'frantiskansky-kostol']:
    bpy.ops.wm.read_factory_settings(use_empty=True)
    subor = f'sm-{kluc}'
    i = info(subor)
    obrysy = [ccw([(x, -z) for x, z in o]) for o in i['obrysy']]   # lokálne metre hry → rovina Blendera
    if kluc == 'slavin':
        G, H = slavin.postav(obrysy[0])
    elif kluc == 'modry-kostolik':
        z = next(z for z in nacitaj()['modry-kostolik'] if z['id'] == '39962221')
        casti = [(z_hry(bez_konca(c['body']), i['stred']), c.get('t', {})) for c in z['casti']]
        G, H = modry_kostolik.postav(casti, z_hry(bez_konca(z['body']), i['stred']))
    elif kluc == 'snd':
        # hlavná budova (pôdorys z OSM) + prístavba z r. 1969–72 (bežná budova z dlaždíc ustúpi modelu);
        # model sa kladie na chodník pri boku (Gorkého), nie na najnižší bod pod obrysmi (vozovka je o 0,6 m nižšie)
        G, H, pristavba = snd.postav()
        obrysy = [obrysy[0], pristavba]
        i['zakladnaBod'] = [-9.19, -15.48]
    elif kluc == 'reduta':
        # budova z OSM + sklená strecha nádvoria (bežná „strecha“ z dlaždíc ustúpi modelu); model sa kladie
        # na chodník Mostovej (pri Medenej je terén o 0,3 m nižší, pri Nám. E. Suchoňa o 0,2 m vyšší)
        G, H, nadvorie = reduta.postav()
        obrysy = [obrysy[0], nadvorie]
        i['zakladnaBod'] = reduta.ZAKLADNA_BOD
    elif kluc == 'dom-sv-martina':
        # celý pôdorys z OSM (relácia 16609274); model sa kladie na dlažbu pred južnou predsieňou
        G, H = dom.postav()
        i['zakladnaBod'] = dom.ZAKLADNA_BOD
    elif kluc == 'stara-radnica':
        # obrys z OSM (relácia 146009) ostáva pre kolízie; model sa kladie na dlažbu Hlavného nám. pred priečelím
        G, H = radnica.postav()
        i['zakladnaBod'] = radnica.ZAKLADNA_BOD
    elif kluc == 'primacialny-palac':
        # obrys z OSM (relácia 189440) ostáva pre kolízie; model sa kladie na dlažbu námestia pred portikom
        G, H = primacialny.postav()
        i['zakladnaBod'] = primacialny.ZAKLADNA_BOD
    elif kluc == 'jezuitsky-kostol':
        # obrys z OSM (way 38539535) ostáva pre kolízie; model (aj s Mariánskym stĺpom) sa kladie na dlažbu pred portálom
        G, H = jezuiti.postav()
        i['zakladnaBod'] = jezuiti.ZAKLADNA_BOD
    elif kluc == 'frantiskansky-kostol':
        # obrys z OSM (way 38539540) ostáva pre kolízie; model sa kladie na dlažbu Františkánskeho nám. pred priečelím
        G, H = frantiskani.postav()
        i['zakladnaBod'] = frantiskani.ZAKLADNA_BOD
    else:
        raise SystemExit(f'neznáma pamiatka {kluc}')
    uloz(G, subor, obrysy, H, info={k: v for k, v in i.items() if k not in ('obrysy', 'vyska')}, minimum=0.72, vzdialenost=2.5)
