# 2. dávka pamiatok z Blendera: hrad Devín, mestské hradby, bunkre, Gerulata, Maximiliánova fontána,
# Brána slobody, Pamätník železnej opony. Dáta z OSM:
#   cd tools/mesto && node --max-old-space-size=8000 ../blender/osm_pamiatky2.mjs   → tools/blender/data/pamiatky-2.json
# Spustenie: python3 tools/blender/pamiatky2_blender.py [devin hradby bunkre gerulata drobne]
# Na konci vypíše záznamy pre data/mapa/pamiatky.json do /tmp/pamiatky2-zaznamy.json.

import importlib
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import bpy  # noqa: E402
from veze import uloz  # noqa: E402

MENA = {'devin': 'Hrad Devín', 'hradby': 'Mestské hradby', 'gerulata': 'Antická Gerulata',
        'fontana-maximilianova': 'Maximiliánova fontána', 'brana-slobody': 'Brána slobody', 'zelezna-opona': 'Pamätník železnej opony'}
zaznamy = []
for meno in sys.argv[1:] or ['devin', 'hradby', 'bunkre', 'gerulata', 'drobne']:
    modul = importlib.import_module(f'pamiatky2.{meno}')
    for vysledok in (modul.postav_vsetky() if hasattr(modul, 'postav_vsetky') else [modul.postav]):
        bpy.ops.wm.read_factory_settings(use_empty=True)
        G, obrysy, vyska, subor, info = vysledok()
        uloz(G, subor, obrysy, vyska, info=info, minimum=0.7, vzdialenost=2.0)
        s = info['stred']
        z = {'model': 'vyskova-budova', 'subor': subor, 'nazov': MENA.get(subor, 'Bunker'), 'x': s[0], 'z': s[1], 'dosah': 40}
        zaznamy.append(z)
with open('/tmp/pamiatky2-zaznamy.json', 'w') as f:
    json.dump(zaznamy, f, ensure_ascii=False)
print(len(zaznamy), 'záznamov → /tmp/pamiatky2-zaznamy.json')
