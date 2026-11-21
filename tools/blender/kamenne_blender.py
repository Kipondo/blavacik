# Kamenné námestie: Hotel Kyjev, obchodný dom, doplnky námestia.
# Dáta z OSM:  cd tools/mesto && node --max-old-space-size=8000 ../blender/osm_kamenne.mjs → tools/blender/data/kamenne.json
# Spustenie:   python3 tools/blender/kamenne_blender.py [kyjev prior doplnky]
# Na konci vypíše záznamy pre data/mapa/pamiatky.json do /tmp/kamenne-zaznamy.json.

import importlib
import json
import os
import sys
import time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import bpy  # noqa: E402
from veze import uloz  # noqa: E402

zaznamy = []
for meno in sys.argv[1:] or ['kyjev', 'prior', 'doplnky']:
    modul = importlib.import_module(f'kamenne.{meno}')
    for vysledok in (modul.postav_vsetky() if hasattr(modul, 'postav_vsetky') else [modul.postav]):
        t0 = time.time()
        bpy.ops.wm.read_factory_settings(use_empty=True)
        G, obrysy, vyska, subor, info = vysledok()
        nazov = info.pop('nazov', subor)
        dosah = info.pop('dosah', 60)
        ao = info.pop('ao', True)
        uloz(G, subor, obrysy, vyska, ao=ao, info=info, minimum=0.55, vzdialenost=3.0, vzorky=16)
        s = info['stred']
        zaznamy.append({'model': 'vyskova-budova', 'subor': subor, 'nazov': nazov, 'x': s[0], 'z': s[1], 'dosah': dosah})
        print(f'{subor}: {time.time() - t0:.0f} s')
with open('/tmp/kamenne-zaznamy.json', 'w') as f:
    json.dump(zaznamy, f, ensure_ascii=False)
print(len(zaznamy), 'záznamov → /tmp/kamenne-zaznamy.json')
