# Pamiatky Starého Mesta z Blendera: kostoly, paláce, radnica, divadlo… z OSM (osm_pamiatky.mjs →
# data/pamiatky-sm.json) s doplnkami z historicke/zoznam.py. Výstup assets/pamiatky/sm-<kľúč>.glb.gz + .json
# a zoznam záznamov pre data/mapa/pamiatky.json (vypíše sa na konci).
# Spustenie: python3 tools/blender/historicke_blender.py [kľúč …]

import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import bpy  # noqa: E402
from veze import uloz  # noqa: E402
from historicke.budova import nacitaj, postav_zaznam  # noqa: E402
from historicke.zoznam import SPEC  # noqa: E402

# pamiatky s presným modelom (tools/blender/presne_blender.py) – bez výslovného kľúča sa neprepisujú
PRESNE = {'slavin', 'modry-kostolik', 'snd', 'reduta', 'dom-sv-martina', 'stara-radnica'}

data = nacitaj()
zaznamy_hry = []
for kluc in sys.argv[1:] or [k for k in SPEC if k not in PRESNE]:
    spec = SPEC[kluc]
    vyber = data.get(kluc, [])
    if spec.get('zaznamy'):
        vyber = [z for z in vyber if z['id'] in spec['zaznamy']]
    for i, z in enumerate(vyber):
        bpy.ops.wm.read_factory_settings(use_empty=True)
        G, obrysy, vyska, subor, info = postav_zaznam(kluc, z, spec, i)
        uloz(G, subor, obrysy, vyska, info=info, minimum=0.72, vzdialenost=2.5)
        zaznamy_hry.append({'model': 'vyskova-budova', 'subor': subor, 'nazov': spec['nazov'],
                            'x': info['stred'][0], 'z': info['stred'][1], 'dosah': 40})
with open('/tmp/pamiatky-sm-zaznamy.json', 'w') as f:
    json.dump(zaznamy_hry, f, ensure_ascii=False)
print(len(zaznamy_hry), 'záznamov → /tmp/pamiatky-sm-zaznamy.json')
