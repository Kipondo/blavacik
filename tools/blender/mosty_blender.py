# Mosty z Blendera: každý most je súbor tools/blender/mosty/<meno>.py s funkciou main().
# Os, šírka a úseky nad riekou sú z data/mapa/mesto/index.json (z OSM), tvar konštrukcie podľa
# verejných technických údajov mostov. Výsledok: assets/pamiatky/<meno>.glb.gz + <meno>.json.
#
# Spustenie: python3 tools/blender/mosty_blender.py [most_snp stary_most …]

import importlib
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import bpy  # noqa: E402

VSETKY = ['most_snp', 'stary_most', 'most_apollo', 'pristavny_most', 'most_lafranconi']

for meno in sys.argv[1:] or VSETKY:
    bpy.ops.wm.read_factory_settings(use_empty=True)
    importlib.import_module(f'mosty.{meno}').main()
