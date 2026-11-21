# Bratislavský hrad s okolím z Blendera: palác (pevný model), brány (pevné) a okolie, ktoré
# kopíruje terén (hradby, živé ploty barokovej záhrady, fontána). Dáta z OSM:
#   cd tools/mesto && node --max-old-space-size=8000 ../blender/osm_hrad.mjs   → tools/blender/data/hrad.json
# Spustenie: python3 tools/blender/hrad_blender.py [palac okolie brany]

import importlib
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import bpy  # noqa: E402
from veze import uloz  # noqa: E402

for meno in sys.argv[1:] or ['palac', 'okolie', 'brany']:
    modul = importlib.import_module(f'hrad.{meno}')
    for vysledok in (modul.postav_vsetky() if hasattr(modul, 'postav_vsetky') else [modul.postav]):
        bpy.ops.wm.read_factory_settings(use_empty=True)
        G, obrysy, vyska, subor, info = vysledok() if callable(vysledok) else vysledok
        uloz(G, subor, obrysy, vyska, info=info, minimum=0.72, vzdialenost=2.5)
